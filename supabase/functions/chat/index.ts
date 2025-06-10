import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ChatRequest {
  videoId: string;
  message: string;
}

interface ChatResponse {
  answer: string;
  sources: Array<{
    timestamp: number;
    text: string;
  }>;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
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

    // Parse request body
    const { videoId, message }: ChatRequest = await req.json();

    if (!videoId || !message) {
      return new Response('Missing videoId or message', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Verify user owns the video
    const { data: video, error: videoError } = await supabaseClient
      .from('videos')
      .select('id, status')
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

    // Generate embedding for the user's question
    const embeddingResponse = await supabaseClient.functions.invoke('embed-text', {
      body: { text: message }
    });

    if (embeddingResponse.error) {
      throw new Error('Failed to generate embedding for question');
    }

    const questionEmbedding = embeddingResponse.data.embedding;

    // Search for relevant chunks using vector similarity
    const { data: chunks, error: searchError } = await supabaseClient.rpc(
      'match_transcript_chunks',
      {
        video_id: videoId,
        query_embedding: questionEmbedding,
        match_threshold: 0.7,
        match_count: 5
      }
    );

    if (searchError) {
      console.error('Vector search error:', searchError);
      throw new Error('Failed to search transcript chunks');
    }

    if (!chunks || chunks.length === 0) {
      return new Response(
        JSON.stringify({
          answer: "I couldn't find relevant information in the video to answer your question.",
          sources: []
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Prepare context for the LLM
    const context = chunks
      .map((chunk: any) => `[${chunk.start_time_seconds}s-${chunk.end_time_seconds}s] ${chunk.chunk_text}`)
      .join('\n\n');

    // Call OpenAI for the chat response
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
            content: `You are an AI assistant that answers questions based ONLY on the provided video transcript excerpts. 
            Do not use any external knowledge. If the information is not in the excerpts, say you cannot answer based on the provided content.
            When referencing information, mention the timestamp from the excerpts.`
          },
          {
            role: 'user',
            content: `Based on these video transcript excerpts, answer the following question:

Video Excerpts:
${context}

Question: ${message}

Answer:`
          }
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (!openaiResponse.ok) {
      throw new Error('Failed to get response from OpenAI');
    }

    const openaiData = await openaiResponse.json();
    const answer = openaiData.choices[0].message.content;

    // Prepare sources
    const sources = chunks.map((chunk: any) => ({
      timestamp: chunk.start_time_seconds,
      text: chunk.chunk_text.substring(0, 100) + '...'
    }));

    const response: ChatResponse = {
      answer,
      sources
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Chat function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});