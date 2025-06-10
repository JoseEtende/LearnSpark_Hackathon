const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
const axios = require('axios');

exports.handler = async function (event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    console.log("Ingestion function triggered.");
    let videoId;

    try {
        const body = JSON.parse(event.body);
        videoId = body.videoId;
        if (!videoId) { throw new Error("No videoId provided."); }

        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

        const { data: videoData } = await supabase.from('videos').select('original_url').eq('id', videoId).single();
        if (!videoData) { throw new Error(`Video with id ${videoId} not found.`); }

        await supabase.from('videos').update({ status: 'transcribing' }).eq('id', videoId);
        console.log(`Status for ${videoId} updated to 'transcribing'.`);

        const videoUrl = videoData.original_url;
        const audioResponse = await axios({ method: 'get', url: videoUrl, responseType: 'stream' });
        if (audioResponse.status !== 200) { throw new Error(`Failed to fetch audio file.`); }

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        console.log("Sending audio to OpenAI Whisper...");
        const transcription = await openai.audio.transcriptions.create({
            file: audioResponse.data,
            model: 'whisper-1',
        });

        const transcriptText = transcription.text;
        console.log("Transcription successful!");

        await supabase.from('videos').update({
            full_transcript: transcriptText,
            status: 'ready'
        }).eq('id', videoId);

        console.log(`Processing for ${videoId} complete.`);

        return { statusCode: 200, body: JSON.stringify({ message: `Success` }) };

    } catch (error) {
        console.error(`Error in ingest-video for ${videoId}:`, error.message);
        if (videoId) {
            const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
            await supabase.from('videos').update({ status: 'failed', error_message: error.message }).eq('id', videoId);
        }
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};