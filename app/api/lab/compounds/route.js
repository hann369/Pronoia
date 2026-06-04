// app/api/lab/compounds/route.js
import { NextResponse } from 'next/server';
import { compounds, interactions } from '@/lib/compoundData';

export async function GET(request) {
  // Return the compound list and interaction maps with CORS headers for the Chrome Extension
  const response = NextResponse.json({
    compounds,
    interactions
  });

  // Enable CORS
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

  return response;
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}
