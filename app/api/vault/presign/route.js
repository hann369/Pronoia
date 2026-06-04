import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { fileName, fileType, userId } = await req.json();

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      // Server fallback/mock mode if Supabase is not configured
      const simulatedURL = `/api/vault/upload/mock-upload-session-${Date.now()}`;
      return NextResponse.json({ signedUrl: simulatedURL, mock: true });
    }

    const bucket = 'vault';
    const filePath = `${userId || 'shared'}/${fileName}`;
    const signUrl = `${supabaseUrl}/storage/v1/object/upload/sign/${bucket}/${filePath}`;

    const res = await fetch(signUrl, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to generate signed upload URL: ${res.status} ${errText}`);
    }

    const data = await res.json();
    let absoluteSignedUrl = data.signedUrl;
    
    if (absoluteSignedUrl && absoluteSignedUrl.startsWith('/')) {
      absoluteSignedUrl = `${supabaseUrl}${absoluteSignedUrl}`;
    }

    return NextResponse.json({ signedUrl: absoluteSignedUrl });
  } catch (error) {
    console.error("Presign URL error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
