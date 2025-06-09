import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import axios from 'axios'; // Using axios to handle redirects and streams

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

        // Get Video URL and Update Status
        console.log(`Starting processing for videoId: ${videoId}`);
        const { data: videoData, error: findError } = await supabase
            .from('videos')
            .select('id, original_url')
            .eq('id', videoId)
            .single();
        if (findError || !videoData) { throw new Error(`Video with id ${videoId} not found.`); }

        await supabase.from('videos').update({ status: 'transcribing' }).eq('id', videoId);
        console.log(`Status for ${videoId} updated to 'transcribing'.`);

        // Fetch Audio and Transcribe with OpenAI Whisper
        const videoUrl = videoData.original_url;
        console.log(`Fetching audio from URL with axios: ${videoUrl}`);

        const audioResponse = await axios({
            method: 'get',
            url: videoUrl,
            responseType: 'stream'
        });
        if (audioResponse.status !== 200) { throw new Error(`Failed to fetch audio file. Status: ${audioResponse.status}`); }

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        console.log("Sending audio to OpenAI Whisper...");
        console.log("Type of audioResponse.data:", typeof audioResponse.data);
        const transcription = await openai.audio.transcriptions.create({
            file: audioResponse.data, // Use .data for the stream from axios
            model: 'whisper-1',
        });

        const transcriptText = transcription.text;
        console.log("Transcription successful! Preview:", transcriptText.substring(0, 100));

        // Store the transcript
        await supabase.from('videos').update({ full_transcript: transcriptText }).eq('id', videoId);
        console.log("Stored full transcript in database.");

        // Final Update
        await supabase.from('videos').update({ status: 'ready' }).eq('id', videoId);
        console.log(`Processing for ${videoId} complete.`);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: `Successfully processed video ${videoId}` })
        };

    } catch (error) {
        console.error(`An error occurred during ingestion for videoId ${videoId}:`, error.message);
        if (videoId) {
            const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
            await supabase.from('videos').update({ status: 'failed', error_message: error.message }).eq('id', videoId);
        }
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};