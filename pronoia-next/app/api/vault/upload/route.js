import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { fileName, fileType, base64Data, userId } = await req.json();

    if (!base64Data) {
      return NextResponse.json({ error: "Missing file data" }, { status: 400 });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      // Server fallback/mock mode if Supabase is not configured
      const simulatedURL = `https://supabase-mock-bucket.co/storage/v1/object/public/vault/${userId || 'shared'}/${fileName}`;
      return NextResponse.json({ downloadURL: simulatedURL, mock: true });
    }

    // Convert base64 back to binary Buffer
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Upload to Supabase Storage bucket 'vault'
    const bucket = 'vault';
    const filePath = `${userId || 'shared'}/${fileName}`;
    const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${filePath}`;

    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': fileType
      },
      body: buffer
    });

    if (!uploadRes.ok) {
      const errorText = await uploadRes.text();
      throw new Error(`Supabase Storage upload failed: ${uploadRes.status} ${errorText}`);
    }

    // Get the public URL for the uploaded file
    const publicURL = `${supabaseUrl}/storage/v1/object/public/${bucket}/${filePath}`;

    return NextResponse.json({ downloadURL: publicURL });
  } catch (error) {
    console.error("Server upload error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
