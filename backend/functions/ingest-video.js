const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
const axios = require('axios');
const fetch = require('node-fetch');

// This function now starts the job but DOES NOT wait for it to finish.
exports.handler = async function (event, context) {
    if (event.httpMethod !== 'POST') { return { statusCode: 405, body: 'Method Not Allowed' }; }

    let videoId;
    try {
        const body = JSON.parse(event.body);
        videoId = body.videoId;
        if (!videoId) { throw new Error("No videoId provided."); }

        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

        // Get video URL and update status
        const { data: videoData } = await supabase.from('videos').select('original_url').eq('id', videoId).single();
        if (!videoData) { throw new Error(`Video with id ${videoId} not found.`); }

        await supabase.from('videos').update({ status: 'transcribing' }).eq('id', videoId);
        console.log(`Status for ${videoId} updated to 'transcribing'.`);

        // --- THIS IS THE CORE CHANGE ---
        // We call the long-running transcription process but DO NOT await it.
        transcribeAndSave(videoData.original_url, videoId);
        // --------------------------------

        // Return immediately to avoid the 10-second timeout.
        console.log(`Transcription process for ${videoId} started in the background.`);
        return {
            statusCode: 202, // 202 Accepted, job is running.
            body: JSON.stringify({ message: "Transcription process started." })
        };

    } catch (error) {
        console.error(`Error starting ingestion for ${videoId}:`, error.message);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};

// This is our long-running process. It runs outside the main handler's await chain.
async function transcribeAndSave(videoUrl, videoId) {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    try {
        console.log(`[Background Job] Fetching audio for ${videoId}`);
        const audioResponse = await axios({ method: 'get', url: videoUrl, responseType: 'stream' });

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        console.log(`[Background Job] Sending audio to Whisper for ${videoId}`);
        const transcription = await openai.audio.transcriptions.create({
            file: audioResponse.data,
            model: 'whisper-1',
        });

        const transcriptText = transcription.text;
        console.log(`[Background Job] Transcription successful for ${videoId}`);

        // Now, trigger the 'save-transcript' function to save the data
        const saveUrl = `${process.env.URL}/api/save-transcript`;
        await fetch(saveUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoId: videoId, transcriptText: transcriptText })
        });
        console.log(`[Background Job] Triggered save-transcript for ${videoId}`);

    } catch (error) {
        console.error(`[Background Job] Error during transcription for ${videoId}:`, error.message);
        // If the background job fails, update the status.
        await supabase.from('videos').update({ status: 'failed', error_message: error.message }).eq('id', videoId);
    }
}