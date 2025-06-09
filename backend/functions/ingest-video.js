import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import fetch from 'node-fetch';

// This is the main handler for our Netlify serverless function.
exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    console.log("Ingestion function triggered.");

    let videoId; // Define videoId here to be accessible in the catch block

    try {
        const body = JSON.parse(event.body);
        videoId = body.videoId;

        if (!videoId) {
            throw new Error("No videoId provided in the event body.");
        }

        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY
        );

        // --- Step 1: Get Video URL and Update Status ---
        console.log(`Starting processing for videoId: ${videoId}`);

        const { data: videoData, error: findError } = await supabase
            .from('videos')
            .select('id, original_url')
            .eq('id', videoId)
            .single();

        if (findError || !videoData) {
            throw new Error(`Video with id ${videoId} not found.`);
        }
        
        await supabase
            .from('videos')
            .update({ status: 'transcribing', error_message: null })
            .eq('id', videoId);
        
        console.log(`Status for ${videoId} updated to 'transcribing'.`);

        // --- Step 2: Transcribe with OpenAI Whisper ---
        const videoUrl = videoData.original_url;
        console.log(`Fetching audio from URL: ${videoUrl}`);
        
        // We need to fetch the audio file into a buffer to send to Whisper
        const audioResponse = await fetch(videoUrl);
        if (!audioResponse.ok) {
            throw new Error(`Failed to fetch audio file from URL. Status: ${audioResponse.statusText}`);
        }

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        console.log("Sending audio to OpenAI Whisper for transcription...");

        // Whisper API needs the file data, not just the URL.
        // We pass the response from fetch directly.
        const transcription = await openai.audio.transcriptions.create({
            file: audioResponse,
            model: 'whisper-1',
        });
        
        const transcriptText = transcription.text;
        console.log("Transcription successful!");
        console.log("Transcript preview:", transcriptText.substring(0, 100));
        
        // --- Step 3: Store the transcript ---
        // For now, let's just update the video record with the full transcript.
        // We will add chunking and embedding next.
        await supabase
            .from('videos')
            .update({ full_transcript: transcriptText }) // Assumes you add a 'full_transcript' column (type: text) to your 'videos' table.
            .eq('id', videoId);
        
        console.log("Stored full transcript in database.");

        // --- Final Step: Update status to "ready" ---
        await supabase
            .from('videos')
            .update({ status: 'ready' })
            .eq('id', videoId);
        
        console.log(`Processing for ${videoId} complete. Status set to 'ready'.`);
        
        return {
            statusCode: 200,
            body: JSON.stringify({ message: `Successfully processed video ${videoId}`, transcript: transcriptText })
        };

    } catch (error) {
        console.error(`An error occurred during ingestion for videoId ${videoId}:`, error.message);
        
        // Update the video status to 'failed' in the database.
        if (videoId) {
            const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
            await supabase
                .from('videos')
                .update({ status: 'failed', error_message: error.message })
                .eq('id', videoId);
        }

        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};