import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid'; // A library to generate unique IDs
import fetch from 'node-fetch'; // To trigger our other function

exports.handler = async function (event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // TODO: Add user authentication check here later

    try {
        const { videoUrl, title } = JSON.parse(event.body);

        if (!videoUrl || !title) {
            throw new Error("Missing required fields: videoUrl and title must be provided.");
        }

        // Initialize Supabase client
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY
        );

        // 1. Create a new video record in our database
        const videoId = uuidv4();
        console.log(`Generated new videoId: ${videoId}`);

        const { data, error: insertError } = await supabase
            .from('videos')
            .insert({
                id: videoId,
                user_id: null, // Placeholder for user auth later
                title: title,
                original_url: videoUrl,
                status: 'submitted'
            })
            .select()
            .single();

        if (insertError) {
            throw insertError;
        }

        console.log(`Successfully created video record for ${title}`);

        // 2. Trigger the ingest-video function asynchronously
        // We do this by making an HTTP POST request to its URL.
        // This is a "fire-and-forget" call. We don't wait for it to finish.
        //const ingestionUrl = `${process.env.URL}/.netlify/functions/ingest-video`;
        const ingestionUrl = `${process.env.URL}/api/ingest-video`;

        console.log(`Triggering ingestion function at: ${ingestionUrl}`);

        // We don't wait for this fetch to complete.
        fetch(ingestionUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoId: videoId })
        });

        // 3. Immediately return the new video ID to the user.
        return {
            statusCode: 202, // 202 Accepted: The request has been accepted for processing
            body: JSON.stringify({
                message: "Video submitted for processing.",
                videoId: videoId
            })
        };

    } catch (error) {
        console.error("Error in start-ingestion function:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};