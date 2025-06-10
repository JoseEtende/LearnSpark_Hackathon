const { createClient } = require('@supabase/supabase-js');

exports.handler = async function (event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { videoId, transcriptText } = JSON.parse(event.body);
        if (!videoId || !transcriptText) { throw new Error("Missing videoId or transcriptText."); }

        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

        await supabase.from('videos').update({
            full_transcript: transcriptText,
            status: 'ready'
        }).eq('id', videoId);

        console.log(`Successfully saved transcript for videoId ${videoId}.`);
        return { statusCode: 200, body: JSON.stringify({ message: "Success" }) };

    } catch (error) {
        console.error(`Error in save-transcript for videoId ${videoId}:`, error.message);
        // Update status to failed
        if (videoId) {
            const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
            await supabase.from('videos').update({ status: 'failed', error_message: error.message }).eq('id', videoId);
        }
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};