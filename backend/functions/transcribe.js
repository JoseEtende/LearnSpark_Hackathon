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

        // Step 1: Create the record
        videoId = uuidv4();
        await supabase.from('videos').insert({ id: videoId, title: title, original_url: videoUrl, status: 'submitted' });
        console.log(`[1/5] Created video record: ${videoId}`);

        // Step 2: Update status to 'transcribing'
        await supabase.from('videos').update({ status: 'transcribing' }).eq('id', videoId);
        console.log(`[2/5] Status updated to 'transcribing'.`);

        // Step 3: Fetch audio file
        console.log(`[3/5] Fetching audio from: ${videoUrl}`);
        const audioResponse = await axios({ method: 'get', url: videoUrl, responseType: 'stream' });
        if (audioResponse.status !== 200) { throw new Error(`Failed to fetch audio file.`); }
        console.log(`[3/5] Audio fetched successfully.`);

        // Step 4: Transcribe with Whisper
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        console.log(`[4/5] Sending audio to OpenAI Whisper...`);
        const transcription = await openai.audio.transcriptions.create({ file: audioResponse.data, model: 'whisper-1' });
        const transcriptText = transcription.text;
        console.log(`[4/5] Transcription successful! Preview: ${transcriptText.substring(0, 50)}...`);

        // Step 5: Save result and set status to 'ready'
        await supabase.from('videos').update({ full_transcript: transcriptText, status: 'ready' }).eq('id', videoId);
        console.log(`[5/5] Processing complete for ${videoId}.`);

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