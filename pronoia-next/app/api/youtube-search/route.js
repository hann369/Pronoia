import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    
    if (!query) {
      return NextResponse.json({ error: 'Missing search query (q)' }, { status: 400 });
    }

    // Append educational terms to guide search to relevant tutorials
    const searchQuery = `${query} tutorial deliberate practice`;
    let videoId = null;

    // 1. Try YouTube results scraping
    try {
      const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
      console.log(`[YouTube Search] Querying YouTube: "${searchQuery}"`);
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
          'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
          'Cache-Control': 'no-cache'
        }
      });
      if (response.ok) {
        const html = await response.text();
        const videoIdRegex = /"videoId"\s*:\s*"([a-zA-Z0-9_-]{11})"/g;
        const matches = [...html.matchAll(videoIdRegex)];
        const forbiddenIds = ['dQw4w9WgXcQ'];
        for (const match of matches) {
          const candidate = match[1];
          if (candidate && !forbiddenIds.includes(candidate)) {
            videoId = candidate;
            break;
          }
        }
      }
    } catch (e) {
      console.warn(`[YouTube Search] YouTube scraping failed, trying DuckDuckGo:`, e.message);
    }

    // 2. Try DuckDuckGo scraping as fallback (more robust, doesn't block as easily)
    if (!videoId) {
      try {
        const ddgUrl = `https://html.duckduckgo.com/html/?q=site:youtube.com+${encodeURIComponent(searchQuery)}`;
        console.log(`[YouTube Search] Querying DuckDuckGo fallback: "${searchQuery}"`);
        const ddgResponse = await fetch(ddgUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
          }
        });
        if (ddgResponse.ok) {
          const html = await ddgResponse.text();
          const regex = /(?:youtube\.com\/watch\?v=|v%3D|v=)([a-zA-Z0-9_-]{11})/g;
          const matches = [...html.matchAll(regex)];
          const forbiddenIds = ['dQw4w9WgXcQ'];
          for (const match of matches) {
            const candidate = match[1];
            if (candidate && !forbiddenIds.includes(candidate)) {
              videoId = candidate;
              break;
            }
          }
        }
      } catch (e) {
        console.error(`[YouTube Search] DuckDuckGo scraping failed:`, e.message);
      }
    }

    if (!videoId) {
      console.warn(`[YouTube Search] No video ID found for query: "${query}". Using study skills fallback.`);
      videoId = '5eW6Eagr9XM'; // Marty Lobdell - Study Less Study Smart deliberate learning fallback
    } else {
      console.log(`[YouTube Search] Resolved query "${query}" to video: ${videoId}`);
    }

    return NextResponse.json({
      videoId,
      videoUrl: `https://www.youtube.com/embed/${videoId}`
    });

  } catch (error) {
    console.error('[YouTube Search API Error]:', error);
    return NextResponse.json({
      videoId: '5eW6Eagr9XM',
      videoUrl: 'https://www.youtube.com/embed/5eW6Eagr9XM',
      error: error.message
    });
  }
}
