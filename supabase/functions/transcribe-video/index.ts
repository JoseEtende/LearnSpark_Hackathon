import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface TranscribeRequest {
  videoId: string;
  storagePath?: string;
  videoUrl?: string;
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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { videoId, storagePath, videoUrl }: TranscribeRequest = await req.json();

    if (!videoId) {
      return new Response('Missing videoId', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Update video status to processing
    await supabaseClient
      .from('videos')
      .update({ status: 'processing' })
      .eq('id', videoId);

    // Get video file URL
    let audioUrl: string;
    
    if (storagePath) {
      const { data } = supabaseClient.storage
        .from('videos')
        .getPublicUrl(storagePath);
      audioUrl = data.publicUrl;
    } else if (videoUrl) {
      audioUrl = videoUrl;
    } else {
      throw new Error('No video source provided');
    }

    // Update status to transcribing
    await supabaseClient
      .from('videos')
      .update({ status: 'transcribing' })
      .eq('id', videoId);

    // Call OpenAI Whisper API for transcription
    const formData = new FormData();
    
    // Fetch the video/audio file
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      throw new Error('Failed to fetch video file');
    }
    
    const audioBlob = await audioResponse.blob();
    formData.append('file', audioBlob, 'audio.mp4');
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json');
    formData.append('timestamp_granularities[]', 'segment');

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: formData,
    });

    if (!whisperResponse.ok) {
      throw new Error('Transcription failed');
    }

    const transcriptionData = await whisperResponse.json();
    const fullTranscript = transcriptionData.text;
    const segments = transcriptionData.segments || [];

    // Update video with full transcript
    await supabaseClient
      .from('videos')
      .update({ 
        full_transcript: fullTranscript,
        status: 'chunking',
        duration_seconds: segments.length > 0 ? Math.round(segments[segments.length - 1].end) : null
      })
      .eq('id', videoId);

    // Create chunks from segments (group 2-3 segments per chunk for better context)
    const chunks = [];
    let chunkIndex = 0;

    for (let i = 0; i < segments.length; i += 2) {
      const segmentGroup = segments.slice(i, i + 2);
      const chunkText = segmentGroup.map((s: any) => s.text).join(' ').trim();
      
      if (chunkText.length > 10) {
        const startTime = segmentGroup[0].start;
        const endTime = segmentGroup[segmentGroup.length - 1].end;

        // Generate embedding for this chunk
        const embeddingResponse = await supabaseClient.functions.invoke('embed-text', {
          body: { text: chunkText }
        });

        if (embeddingResponse.error) {
          console.error('Failed to generate embedding:', embeddingResponse.error);
          continue;
        }

        const embedding = embeddingResponse.data.embedding;

        chunks.push({
          video_id: videoId,
          chunk_text: chunkText,
          start_time_seconds: startTime,
          end_time_seconds: endTime,
          chunk_index: chunkIndex,
          embedding: embedding
        });

        chunkIndex++;
      }
    }

    // Insert all chunks
    if (chunks.length > 0) {
      const { error: chunksError } = await supabaseClient
        .from('transcript_chunks')
        .insert(chunks);

      if (chunksError) {
        throw new Error(`Failed to insert chunks: ${chunksError.message}`);
      }
    }

    // Update video status to ready
    await supabaseClient
      .from('videos')
      .update({ status: 'ready' })
      .eq('id', videoId);

    return new Response(JSON.stringify({ 
      success: true, 
      videoId,
      chunksCreated: chunks.length 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Transcription error:', error);
    
    // Try to update video status to failed
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      const { videoId } = await req.json();
      if (videoId) {
        await supabaseClient
          .from('videos')
          .update({ 
            status: 'failed',
            error_message: error.message 
          })
          .eq('id', videoId);
      }
    } catch (updateError) {
      console.error('Failed to update video status:', updateError);
    }

    return new Response(
      JSON.stringify({ error: 'Transcription failed' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});