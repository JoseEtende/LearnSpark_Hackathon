const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const fetch = require('node-fetch'); // Using require

exports.handler = async function (event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { videoUrl, title } = JSON.parse(event.body);
        if (!videoUrl || !title) { throw new Error("Missing videoUrl and title."); }

        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

        // Create video record
        const videoId = uuidv4();
        await supabase.from('videos').insert({
            id: videoId,
            title: title,
            original_url: videoUrl,
            status: 'submitted'
        });
        console.log(`Created video record for ${videoId}`);

        // Trigger the ingestion function
        const ingestionUrl = `${process.env.URL}/api/ingest-video`;
        const triggerResponse = await fetch(ingestionUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoId: videoId })
        });

        if (!triggerResponse.ok) {
            const errorBody = await triggerResponse.text();
            throw new Error(`Failed to trigger ingest-video. Status: ${triggerResponse.status}. Body: ${errorBody}`);
        }
        console.log('Successfully triggered ingest-video function.');

        return {
            statusCode: 202,
            body: JSON.stringify({ videoId: videoId })
        };

    } catch (error) {
        console.error("Error in start-ingestion:", error.message);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};