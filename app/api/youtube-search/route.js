import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    
    if (!query) {
      return NextResponse.json({ error: 'Missing search query (q)' }, { status: 400 });
    }

    // Decide search mode: keyword search (default) or channel mode (if input likely a creator/channel)
    const normalize = (s='') => s.trim().replace(/[^0-9a-zA-Z\s@#_-]/g,'').toLowerCase();
    const isShort = (s) => s.split(/\s+/).filter(Boolean).length <= 3;
    const containsStopWords = (s) => /tutorial|how to|how|learn|guide|tips|review|news|tutorials|course|best|top/i.test(s);

    const likelyChannelHeuristic = () => {
      if (!query) return false;
      const n = normalize(query);
      if (!isShort(n)) return false;
      if (containsStopWords(n)) return false;
      if (/^@/.test(query.trim())) return true;
      const words = query.trim().split(/\s+/).filter(Boolean);
      const capitalized = words.filter(w => /[A-ZÄÖÜ]/.test(w[0] || '')).length;
      if (capitalized >= Math.min(2, words.length)) return true;
      return true;
    };

    const forbiddenIds = ['dQw4w9WgXcQ'];

    const tryFetchChannelVideos = async (channelUrl) => {
      try {
        const videosUrl = channelUrl.endsWith('/') ? `${channelUrl}videos` : `${channelUrl}/videos`;
        const res = await fetch(videosUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        if (!res.ok) return null;
        const html = await res.text();
        const videoIdRegex = /"videoId"\s*:\s*"([a-zA-Z0-9_-]{11})"/g;
        const matches = [...html.matchAll(videoIdRegex)].map(m => m[1]).filter(Boolean).filter(id => !forbiddenIds.includes(id));
        const unique = [...new Set(matches)];
        if (unique.length === 0) return null;
        return unique.slice(0,5);
      } catch (e) {
        return null;
      }
    };

    // Attempt Channel Mode if heuristic suggests it
    if (likelyChannelHeuristic()) {
      try {
        // Search DuckDuckGo for potential channel pages (more stable for scraping)
        const ddgUrl = `https://html.duckduckgo.com/html/?q=site:youtube.com+${encodeURIComponent(query)}`;
        const ddgResp = await fetch(ddgUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (ddgResp.ok) {
          const ddgHtml = await ddgResp.text();
          const linkRegex = /https?:\/\/(?:www\.)?youtube\.com\/(channel\/[A-Za-z0-9_-]+|@[^\s"'<>\/]+)/g;
          const candidates = [];
          for (const m of ddgHtml.matchAll(linkRegex)) {
            const path = m[1];
            if (path.startsWith('channel/')) {
              candidates.push(`https://www.youtube.com/${path}`);
            } else if (path.startsWith('@')) {
              candidates.push(`https://www.youtube.com/${path}`);
            }
          }

          const uniqCandidates = [...new Set(candidates)];

          for (const cand of uniqCandidates) {
            const vids = await tryFetchChannelVideos(cand);
            if (vids && vids.length > 0) {
              const videoList = vids.map(id => ({ videoId: id, videoUrl: `https://www.youtube.com/embed/${id}`, watchUrl: `https://www.youtube.com/watch?v=${id}` }));
              return NextResponse.json({
                mode: 'channel',
                channelUrl: cand,
                videos: videoList
              });
            }
          }
        }
      } catch (e) {
        console.warn('[YouTube Search] Channel detection failed:', e.message);
      }
      // If channel detection fails, fall through to keyword search
    }

    // --- KEYWORD SEARCH (existing logic, preserved) ---
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
      mode: 'keyword',
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
