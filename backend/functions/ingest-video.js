import { createClient } from '@supabase/supabase-js';

// This is the main handler for our Netlify serverless function.
exports.handler = async function(event, context) {
    // We only allow POST requests to this function
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    console.log("Ingestion function triggered.");

    try {
        const { videoId } = JSON.parse(event.body);

        if (!videoId) {
            throw new Error("No videoId provided in the event body.");
        }

        // Initialize the Supabase client using environment variables
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY
        );

        // --- Step 1: Update video status to "processing" ---
        console.log(`Starting processing for videoId: ${videoId}`);
        await supabase
            .from('videos')
            .update({ status: 'processing', error_message: null })
            .eq('id', videoId);
        
        console.log(`Status for ${videoId} updated to 'processing'.`);

        // --- Core Logic Placeholder ---
        // In a real app, this is where you'd call Whisper, do chunking, etc.
        // For now, we simulate success.
        console.log("Simulating transcription and embedding process...");
        // --- End Core Logic Placeholder ---

        // --- Final Step: Update status to "ready" ---
        await supabase
            .from('videos')
            .update({ status: 'ready' })
            .eq('id', videoId);
        
        console.log(`Processing for ${videoId} complete. Status set to 'ready'.`);
        
        return {
            statusCode: 200,
            body: JSON.stringify({ message: `Successfully processed video ${videoId}` })
        };

    } catch (error) {
        console.error(`An error occurred during ingestion:`, error);
        // In a real app, we would also update the video's status to 'failed' here.
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};