const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const OpenAI = require('openai');
const axios = require('axios');

exports.handler = async function (event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    console.log("--- Transcribe function started ---");
    let videoId;

    try {
        const { videoUrl, title } = JSON.parse(event.body);
        if (!videoUrl || !title) { throw new Error("Missing videoUrl or title."); }

        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        // Step 1: Create the record
        videoId = uuidv4();
        await supabase.from('videos').insert({ 
            id: videoId, 
            title: title, 
            original_url: videoUrl, 
            status: 'submitted' 
        });
        console.log(`[1/6] Created video record: ${videoId}`);

        // Step 2: Update status to 'transcribing'
        await supabase.from('videos').update({ status: 'transcribing' }).eq('id', videoId);
        console.log(`[2/6] Status updated to 'transcribing'.`);

        // Step 3: Fetch audio file
        console.log(`[3/6] Fetching audio from: ${videoUrl}`);
        const audioResponse = await axios({ method: 'get', url: videoUrl, responseType: 'stream' });
        if (audioResponse.status !== 200) { throw new Error(`Failed to fetch audio file.`); }
        console.log(`[3/6] Audio fetched successfully.`);

        // Step 4: Transcribe with Whisper
        console.log(`[4/6] Sending audio to OpenAI Whisper...`);
        const transcription = await openai.audio.transcriptions.create({ 
            file: audioResponse.data, 
            model: 'whisper-1',
            response_format: 'verbose_json',
            timestamp_granularities: ['segment']
        });
        
        const transcriptText = transcription.text;
        const segments = transcription.segments || [];
        console.log(`[4/6] Transcription successful! Preview: ${transcriptText.substring(0, 50)}...`);

        // Step 5: Chunk and embed transcript
        await supabase.from('videos').update({ status: 'chunking' }).eq('id', videoId);
        console.log(`[5/6] Starting chunking and embedding...`);

        const chunks = [];
        let chunkIndex = 0;

        // Create chunks from segments (group 2-3 segments per chunk for better context)
        for (let i = 0; i < segments.length; i += 2) {
            const segmentGroup = segments.slice(i, i + 2);
            const chunkText = segmentGroup.map(s => s.text).join(' ').trim();
            
            if (chunkText.length > 10) { // Only process meaningful chunks
                const startTime = segmentGroup[0].start;
                const endTime = segmentGroup[segmentGroup.length - 1].end;

                // Generate embedding for this chunk
                const embeddingResponse = await openai.embeddings.create({
                    model: 'text-embedding-ada-002',
                    input: chunkText,
                });

                const embedding = embeddingResponse.data[0].embedding;

                chunks.push({
                    id: uuidv4(),
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
            const { error: chunksError } = await supabase
                .from('transcript_chunks')
                .insert(chunks);

            if (chunksError) {
                throw new Error(`Failed to insert chunks: ${chunksError.message}`);
            }
        }

        console.log(`[5/6] Created ${chunks.length} chunks with embeddings.`);

        // Step 6: Save result and set status to 'ready'
        await supabase.from('videos').update({ 
            full_transcript: transcriptText, 
            status: 'ready',
            duration_seconds: Math.round(segments[segments.length - 1]?.end || 0)
        }).eq('id', videoId);
        console.log(`[6/6] Processing complete for ${videoId}.`);

        return { statusCode: 200, body: JSON.stringify({ videoId: videoId, message: `Success` }) };

    } catch (error) {
        console.error(`ERROR for videoId ${videoId}:`, error.message);
        if (videoId) {
            const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
            await supabase.from('videos').update({ status: 'failed', error_message: error.message }).eq('id', videoId);
        }
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};