export async function onRequestGet(context) {
    const { request } = context;
    const url = new URL(request.url);
    const zip = url.searchParams.get('zip');

    if (!zip || zip.length !== 5) {
        return new Response(JSON.stringify({ error: 'Valid 5-digit zip code required' }), { 
            status: 400, headers: { 'Content-Type': 'application/json' } 
        });
    }

    const ringbaSegmentId = 'c12ade49474d4310add3acec851fbb45';
    const ringbaUrl = `https://rtb.ringba.com/v1/segments/${ringbaSegmentId}/callback.json?zip=${zip}`;

    try {
        const response = await fetch(ringbaUrl);
        
        // Read the response as text first, so it doesn't crash if it's not JSON
        const responseText = await response.text();

        // If Ringba returns no content (204) or empty text, return null
        if (response.status === 204 || !responseText) {
            return new Response(JSON.stringify({ number: null }), { 
                headers: { 'Content-Type': 'application/json' } 
            });
        }

        // Try to parse the text as JSON safely
        try {
            const data = JSON.parse(responseText);
            return new Response(JSON.stringify(data), { 
                headers: { 'Content-Type': 'application/json' } 
            });
        } catch (parseError) {
            // If Ringba sent back HTML or an error text, log it so we can see it
            console.error('Ringba did not return valid JSON. Response was:', responseText);
            return new Response(JSON.stringify({ 
                number: null, 
                error: 'Ringba returned non-JSON response', 
                rawResponse: responseText.substring(0, 100) // Show the first 100 chars of what Ringba sent
            }), { 
                headers: { 'Content-Type': 'application/json' } 
            });
        }
    } catch (error) {
        console.error('Network error fetching from Ringba:', error);
        return new Response(JSON.stringify({ error: 'Failed to connect to Ringba dispatch' }), { 
            status: 500, headers: { 'Content-Type': 'application/json' } 
        });
    }
}
