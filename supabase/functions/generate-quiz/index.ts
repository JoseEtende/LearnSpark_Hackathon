import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface QuizRequest {
  videoId: string;
}

interface QuizQuestion {
  question_text: string;
  options: string[];
  correct_answer_index: number;
  source_timestamp_seconds: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    // Get Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get user from auth
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response('Unauthorized', { 
        status: 401, 
        headers: corsHeaders 
      });
    }

    const { videoId }: QuizRequest = await req.json();

    if (!videoId) {
      return new Response('Missing videoId', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Verify user owns the video
    const { data: video, error: videoError } = await supabaseClient
      .from('videos')
      .select('id, status, full_transcript')
      .eq('id', videoId)
      .eq('user_id', user.id)
      .single();

    if (videoError || !video) {
      return new Response('Video not found', { 
        status: 404, 
        headers: corsHeaders 
      });
    }

    if (video.status !== 'ready') {
      return new Response('Video is still processing', { 
        status: 409, 
        headers: corsHeaders 
      });
    }

    // Create a new quiz record
    const { data: quiz, error: quizInsertError } = await supabaseClient
      .from('quizzes')
      .insert({
        video_id: videoId,
        status: 'generating'
      })
      .select()
      .single();

    if (quizInsertError || !quiz) {
      throw new Error('Failed to create quiz record');
    }

    try {
      // Get transcript chunks for context
      const { data: chunks, error: chunksError } = await supabaseClient
        .from('transcript_chunks')
        .select('chunk_text, start_time_seconds, end_time_seconds')
        .eq('video_id', videoId)
        .order('chunk_index');

      if (chunksError) {
        throw new Error('Failed to fetch transcript chunks');
      }

      // Prepare transcript context (limit to avoid token limits)
      const transcriptContext = chunks
        ?.slice(0, 20) // Limit to first 20 chunks
        .map(chunk => `[${chunk.start_time_seconds}s] ${chunk.chunk_text}`)
        .join('\n') || video.full_transcript?.substring(0, 4000) || '';

      // Generate quiz using OpenAI
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are a quiz generator. Create exactly 5 multiple-choice questions based ONLY on the provided video transcript.
              
              Return your response as a JSON array of objects with this exact structure:
              [
                {
                  "question_text": "Question here?",
                  "options": ["Option A", "Option B", "Option C", "Option D"],
                  "correct_answer_index": 0,
                  "source_timestamp_seconds": 120
                }
              ]
              
              Rules:
              - Each question must have exactly 4 options
              - correct_answer_index is 0-based (0, 1, 2, or 3)
              - source_timestamp_seconds should be the approximate time when this topic is discussed
              - Questions should test understanding, not just recall
              - Make incorrect options plausible but clearly wrong`
            },
            {
              role: 'user',
              content: `Generate 5 multiple-choice questions based on this video transcript:

${transcriptContext}

Return only the JSON array, no other text.`
            }
          ],
          max_tokens: 1500,
          temperature: 0.7,
        }),
      });

      if (!openaiResponse.ok) {
        throw new Error('Failed to generate quiz from OpenAI');
      }

      const openaiData = await openaiResponse.json();
      let quizQuestions: QuizQuestion[];

      try {
        quizQuestions = JSON.parse(openaiData.choices[0].message.content);
      } catch (parseError) {
        console.error('Failed to parse quiz JSON:', openaiData.choices[0].message.content);
        throw new Error('Failed to parse generated quiz');
      }

      // Validate and insert quiz questions
      const questionsToInsert = quizQuestions.map(q => ({
        quiz_id: quiz.id,
        question_text: q.question_text,
        options: q.options,
        correct_answer_index: q.correct_answer_index,
        source_timestamp_seconds: q.source_timestamp_seconds
      }));

      const { error: questionsInsertError } = await supabaseClient
        .from('quiz_questions')
        .insert(questionsToInsert);

      if (questionsInsertError) {
        throw new Error('Failed to save quiz questions');
      }

      // Update quiz status to ready
      await supabaseClient
        .from('quizzes')
        .update({ status: 'ready' })
        .eq('id', quiz.id);

      return new Response(JSON.stringify({
        quizId: quiz.id,
        questions: quizQuestions
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      // Update quiz status to failed
      await supabaseClient
        .from('quizzes')
        .update({ 
          status: 'failed',
          error_message: error.message 
        })
        .eq('id', quiz.id);
      
      throw error;
    }

  } catch (error) {
    console.error('Quiz generation error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate quiz' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});