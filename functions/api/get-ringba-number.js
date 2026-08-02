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
    // Ringba RTB requires a POST to the /bid endpoint
    const ringbaUrl = `https://rtb.ringba.com/v1/segments/${ringbaSegmentId}/bid`;

    // Standard OpenRTB 2.5 Payload for Ringba
    const rtbPayload = {
        id: "homeconnector-" + Date.now(),
        imp: [
            {
                id: "1",
                phone: {
                    ext: {
                        zip: zip
                    }
                }
            }
        ]
    };

    try {
        const response = await fetch(ringbaUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(rtbPayload)
        });

        const responseText = await response.text();

        // If Ringba returns no content (204) or empty text, return null
        if (response.status === 204 || !responseText) {
            return new Response(JSON.stringify({ number: null }), { 
                headers: { 'Content-Type': 'application/json' } 
            });
        }

        try {
            const data = JSON.parse(responseText);
            
            // Parse the OpenRTB Response to find the phone number
            let phoneNumber = null;
            if (data && data.seatbid && data.seatbid.length > 0) {
                for (const seat of data.seatbid) {
                    if (seat.bid && seat.bid.length > 0) {
                        for (const bid of seat.bid) {
                            if (bid.phone) {
                                phoneNumber = bid.phone;
                                break;
                            }
                        }
                    }
                    if (phoneNumber) break;
                }
            }

            return new Response(JSON.stringify({ 
                number: phoneNumber,
                rawResponse: data // Included so you can see exactly what Ringba sends back
            }), { 
                headers: { 'Content-Type': 'application/json' } 
            });

        } catch (parseError) {
            console.error('Ringba did not return valid JSON. Response was:', responseText);
            return new Response(JSON.stringify({ 
                number: null, 
                error: 'Ringba returned non-JSON response', 
                rawResponse: responseText.substring(0, 500) 
            }), { 
                headers: { 'Content-Type': 'application/json' } 
            });
        }
    } catch (error) {
        console.error('Network error fetching from Ringba:', error);
        return new Response(JSON.stringify({ error: 'Failed to connect to Ringba dispatch: ' + error.message }), { 
            status: 500, headers: { 'Content-Type': 'application/json' } 
        });
    }
}
