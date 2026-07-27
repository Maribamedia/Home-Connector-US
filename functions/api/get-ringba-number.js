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
        if (response.status === 204) {
            return new Response(JSON.stringify({ number: null }), { 
                headers: { 'Content-Type': 'application/json' } 
            });
        }
        const data = await response.json();
        return new Response(JSON.stringify(data), { 
            headers: { 'Content-Type': 'application/json' } 
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Failed to connect to Ringba dispatch' }), { 
            status: 500, headers: { 'Content-Type': 'application/json' } 
        });
    }
}
