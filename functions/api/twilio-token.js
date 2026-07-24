function base64url(obj) {
    return btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function createTwilioToken(env) {
    const { TWILIO_ACCOUNT_SID, TWILIO_API_KEY, TWILIO_API_SECRET, TWILIO_TWIML_APP_SID } = env;
    
    const header = { alg: 'HS256', typ: 'JWT', cty: 'twilio-fpa;v=1' };
    const now = Math.floor(Date.now() / 1000);
    
    const payload = {
        jti: TWILIO_API_KEY + '-' + now,
        grants: {
            identity: 'user_' + Math.random().toString(36).substring(7),
            voice: { outgoing: { application_sid: TWILIO_TWIML_APP_SID } }
        },
        iss: TWILIO_API_KEY,
        exp: now + 3600,
        sub: TWILIO_ACCOUNT_SID
    };
    
    const data = `${base64url(header)}.${base64url(payload)}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', encoder.encode(TWILIO_API_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
    let sigStr = '';
    const bytes = new Uint8Array(signature);
    for (let i = 0; i < bytes.length; i++) sigStr += String.fromCharCode(bytes[i]);
    const encodedSignature = btoa(sigStr).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    
    return `${data}.${encodedSignature}`;
}

export async function onRequestGet(context) {
    const { env } = context;
    try {
        if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_API_KEY || !env.TWILIO_API_SECRET || !env.TWILIO_TWIML_APP_SID) {
            return new Response(JSON.stringify({ error: 'Missing Twilio env vars' }), { status: 500 });
        }
        const token = await createTwilioToken(env);
        return new Response(JSON.stringify({ token }), { headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
