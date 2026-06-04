import { NextResponse } from 'next/server';
import { storage } from '@/lib/firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

export async function POST(req) {
  try {
    const { fileName, fileType, base64Data, userId } = await req.json();

    if (!base64Data) {
      return NextResponse.json({ error: "Missing file data" }, { status: 400 });
    }

    if (!storage) {
      // Server fallback/mock mode if storage is null (e.g. build time or missing credentials)
      const simulatedURL = `https://firebasestorage.googleapis.com/v0/b/mock-bucket/o/vault%2F${userId || 'shared'}%2F${fileName}?alt=media`;
      return NextResponse.json({ downloadURL: simulatedURL, mock: true });
    }

    const fileRef = ref(storage, `vault/${userId || 'shared'}/${fileName}`);
    
    // Upload base64 string to Firebase Storage
    await uploadString(fileRef, base64Data, 'base64', {
      contentType: fileType
    });

    const downloadURL = await getDownloadURL(fileRef);
    return NextResponse.json({ downloadURL });
  } catch (error) {
    console.error("Server upload error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
