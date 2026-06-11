import { NextResponse } from 'next/server';

// Helper: Extract ytInitialData JSON object from YouTube HTML
function extractYtInitialData(html) {
  const match = html.match(/ytInitialData\s*=\s*({.*?});/);
  if (match) {
    try {
      return JSON.parse(match[1]);
    } catch (e) {
      // Ignore
    }
  }
  
  // Try with scripting tags
  const scriptMatch = html.match(/<script[^>]*>[\s\S]*?ytInitialData\s*=\s*({[\s\S]*?});[\s\S]*?<\/script>/);
  if (scriptMatch) {
    try {
      return JSON.parse(scriptMatch[1]);
    } catch (e) {
      // Ignore
    }
  }
  
  // Fallback substring matching
  const startStr = 'ytInitialData = ';
  const startIdx = html.indexOf(startStr);
  if (startIdx !== -1) {
    const subset = html.substring(startIdx + startStr.length);
    let openBraces = 0;
    let endIdx = -1;
    for (let i = 0; i < subset.length; i++) {
      if (subset[i] === '{') openBraces++;
      else if (subset[i] === '}') {
        openBraces--;
        if (openBraces === 0) {
          endIdx = i + 1;
          break;
        }
      }
    }
    if (endIdx !== -1) {
      try {
        return JSON.parse(subset.substring(0, endIdx));
      } catch (e) {
        // Ignore
      }
    }
  }
  return null;
}

// Helper: Recursively search JSON object for videoRenderers
function findVideoRenderers(obj, results = []) {
  if (!obj || typeof obj !== 'object') return results;
  
  if (obj.videoRenderer) {
    const r = obj.videoRenderer;
    const videoId = r.videoId;
    const title = r.title?.runs?.[0]?.text || r.title?.accessibility?.accessibilityData?.label || '';
    const thumbnail = r.thumbnail?.thumbnails?.[0]?.url || '';
    const viewsText = r.viewCountText?.simpleText || r.shortViewCountText?.simpleText || '';
    const publishedText = r.publishedTimeText?.simpleText || '';
    if (videoId) {
      results.push({
        videoId,
        title,
        thumbnail: thumbnail.startsWith('//') ? `https:${thumbnail}` : thumbnail,
        viewsText,
        publishedText,
        videoUrl: `https://www.youtube.com/embed/${videoId}`,
        watchUrl: `https://www.youtube.com/watch?v=${videoId}`
      });
    }
  } else if (obj.gridVideoRenderer) {
    const r = obj.gridVideoRenderer;
    const videoId = r.videoId;
    const title = r.title?.runs?.[0]?.text || r.title?.accessibility?.accessibilityData?.label || '';
    const thumbnail = r.thumbnail?.thumbnails?.[0]?.url || '';
    const viewsText = r.viewCountText?.simpleText || r.shortViewCountText?.simpleText || '';
    const publishedText = r.publishedTimeText?.simpleText || '';
    if (videoId) {
      results.push({
        videoId,
        title,
        thumbnail: thumbnail.startsWith('//') ? `https:${thumbnail}` : thumbnail,
        viewsText,
        publishedText,
        videoUrl: `https://www.youtube.com/embed/${videoId}`,
        watchUrl: `https://www.youtube.com/watch?v=${videoId}`
      });
    }
  }
  
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'object') {
      findVideoRenderers(obj[key], results);
    }
  }
  return results;
}

// Helper: Recursively search JSON object for channelRenderers
function extractChannels(ytData) {
  const channels = [];
  try {
    const findChannelRenderers = (obj, list = []) => {
      if (!obj || typeof obj !== 'object') return list;
      if (obj.channelRenderer) {
        list.push(obj.channelRenderer);
      }
      for (const key of Object.keys(obj)) {
        if (typeof obj[key] === 'object') {
          findChannelRenderers(obj[key], list);
        }
      }
      return list;
    };
    
    const renderers = findChannelRenderers(ytData);
    for (const r of renderers) {
      const title = r.title?.simpleText || r.title?.runs?.[0]?.text || '';
      const channelId = r.channelId;
      const subCountText = r.subscriberCountText?.simpleText || r.subscriberCountText?.runs?.[0]?.text || '';
      const videoCountText = r.videoCountText?.simpleText || '';
      const thumbnail = r.thumbnail?.thumbnails?.[0]?.url || '';
      const canonicalBaseUrl = r.navigationEndpoint?.browseEndpoint?.canonicalBaseUrl || '';
      const verified = r.ownerBadges?.some(b => b.metadataBadgeRenderer?.style === 'BADGE_STYLE_TYPE_VERIFIED') || false;
      
      // Parse subscribers number (e.g. "1.2M subscribers" or "450K Abonnenten")
      let subscribers = 0;
      if (subCountText) {
        const cleaned = subCountText.replace(/[.,\s]/g, '').replace(/&nbsp;/g, '');
        const match = cleaned.match(/(\d+(?:\.\d+)?)(M|K|mio|tsd|mln|k)?/i);
        if (match) {
          let val = parseFloat(match[1]);
          const suffix = match[2]?.toLowerCase();
          if (suffix === 'm' || suffix === 'mio' || suffix === 'mln') val *= 1000000;
          else if (suffix === 'k' || suffix === 'tsd') val *= 1000;
          subscribers = val;
        }
      }
      
      if (channelId) {
        channels.push({
          title,
          channelId,
          handle: canonicalBaseUrl || `@${title.replace(/\s+/g, '')}`,
          subscribers,
          subscribersText: subCountText,
          videoCountText,
          thumbnail: thumbnail.startsWith('//') ? `https:${thumbnail}` : thumbnail,
          verified
        });
      }
    }
  } catch (e) {
    console.error("Error extracting channels:", e);
  }
  
  // De-duplicate
  const seen = new Set();
  return channels.filter(c => {
    if (seen.has(c.channelId)) return false;
    seen.add(c.channelId);
    return true;
  });
}

// Helper: Score channel title against user search query
function scoreChannel(channelTitle, queryText) {
  const q = queryText.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
  const c = channelTitle.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
  
  if (q === c) return 100;
  if (c.includes(q) || q.includes(c)) return 80;
  
  // Word matching
  const qWords = queryText.toLowerCase().split(/\s+/).filter(Boolean);
  const cWords = channelTitle.toLowerCase().split(/\s+/).filter(Boolean);
  let matches = 0;
  for (const qw of qWords) {
    if (cWords.includes(qw)) matches++;
  }
  
  if (matches > 0) {
    return (matches / Math.max(qWords.length, cWords.length)) * 70;
  }
  
  return 0;
}

// ── Official YouTube Data API v3 (preferred when YOUTUBE_API_KEY is set) ──────
async function youtubeDataApi(query, channelId) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return null;

  const mapItem = (id, snippet) => ({
    videoId: id,
    title: snippet?.title || '',
    thumbnail: snippet?.thumbnails?.medium?.url || snippet?.thumbnails?.default?.url || '',
    viewsText: '',
    publishedText: snippet?.publishedAt ? new Date(snippet.publishedAt).toLocaleDateString('de-DE') : '',
    videoUrl: `https://www.youtube.com/embed/${id}`,
    watchUrl: `https://www.youtube.com/watch?v=${id}`,
  });

  // Channel videos by id: resolve uploads playlist, then list items.
  if (channelId) {
    const chRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${key}`
    );
    if (!chRes.ok) throw new Error(`YouTube API channels ${chRes.status}`);
    const chData = await chRes.json();
    const uploads = chData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploads) return { mode: 'channel', channelId, videos: [] };
    const plRes = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=5&playlistId=${uploads}&key=${key}`
    );
    if (!plRes.ok) throw new Error(`YouTube API playlistItems ${plRes.status}`);
    const plData = await plRes.json();
    const videos = (plData.items || [])
      .map((it) => mapItem(it.snippet?.resourceId?.videoId, it.snippet))
      .filter((v) => v.videoId);
    return { mode: 'channel', channelId, videos };
  }

  // Keyword search.
  const sRes = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=10&q=${encodeURIComponent(query)}&key=${key}`
  );
  if (!sRes.ok) throw new Error(`YouTube API search ${sRes.status}`);
  const sData = await sRes.json();
  const videos = (sData.items || [])
    .map((it) => mapItem(it.id?.videoId, it.snippet))
    .filter((v) => v.videoId);
  return { mode: 'keyword', videos };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const channelId = searchParams.get('channelId');

    // 0. Preferred path: official YouTube Data API v3 (stable, quota-based).
    //    Falls through to the scraping heuristics below on missing key or error.
    if (query || channelId) {
      try {
        const apiResult = await youtubeDataApi(query, channelId);
        if (apiResult && apiResult.videos && apiResult.videos.length > 0) {
          return NextResponse.json(apiResult);
        }
      } catch (apiErr) {
        console.warn('[YouTube Search] Data API failed, falling back to scraping:', apiErr.message);
      }
    }

    // 1. Explicit Channel Fetch (by ID)
    if (channelId) {
      console.log(`[YouTube Search] Explicit channel videos request: channelId=${channelId}`);
      const channelUrl = `https://www.youtube.com/channel/${channelId}/videos`;
      const res = await fetch(channelUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
          'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
          'Cache-Control': 'no-cache'
        }
      });
      if (!res.ok) {
        throw new Error(`YouTube API returned status ${res.status}`);
      }
      
      const html = await res.text();
      const ytData = extractYtInitialData(html);
      if (!ytData) {
        throw new Error("Could not extract ytInitialData from YouTube response");
      }
      
      const videos = findVideoRenderers(ytData).slice(0, 5);
      return NextResponse.json({
        mode: 'channel',
        channelId,
        videos
      });
    }

    if (!query) {
      return NextResponse.json({ error: 'Missing search query (q)' }, { status: 400 });
    }

    const queryLower = query.toLowerCase().trim();
    
    // 2. Creator Search Heuristic: Run channel search
    const channelSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAg%253D%253D`;
    console.log(`[YouTube Search] Searching channels for: "${query}"`);
    
    let channels = [];
    try {
      const res = await fetch(channelSearchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
          'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7'
        }
      });
      if (res.ok) {
        const html = await res.text();
        const ytData = extractYtInitialData(html);
        if (ytData) {
          channels = extractChannels(ytData);
        }
      }
    } catch (e) {
      console.warn("[YouTube Search] Channel search failed, falling back to keywords:", e.message);
    }

    const topChannel = channels[0];
    let isCreator = false;
    let multipleMatches = [];
    
    if (topChannel) {
      const score = scoreChannel(topChannel.title, query);
      const subCount = topChannel.subscribers;
      const isVerified = topChannel.verified;
      
      const stopWords = ['tutorial', 'how to', 'how', 'learn', 'guide', 'tips', 'review', 'news', 'course', 'best', 'top', 'vs', 'comparison', 'motivation', 'workout', 'music', 'asmr', 'lofi', 'podcast'];
      const hasStopWord = stopWords.some(w => queryLower.includes(w));
      
      // Determine if creator query
      if (queryLower.startsWith('@')) {
        isCreator = true;
      } else if (score >= 90) {
        if (isVerified) {
          isCreator = true;
        } else if (subCount >= 10000) {
          isCreator = true;
        } else if (!hasStopWord && subCount >= 2000) {
          isCreator = true;
        }
      } else if (score >= 70 && subCount >= 100000) {
        isCreator = true;
      }
      
      // Check for multiple close matches
      if (isCreator) {
        multipleMatches = channels.filter(c => {
          const s = scoreChannel(c.title, query);
          return s >= 85 && c.subscribers >= 50000;
        });
      }
    }

    // 3. Modus 2: Creator Mode activated
    if (isCreator && topChannel) {
      // If multiple close matches and user didn't specify via @handle, return selection
      if (multipleMatches.length > 1 && !queryLower.startsWith('@')) {
        return NextResponse.json({
          mode: 'multiple_channels',
          channels: multipleMatches
        });
      }
      
      // Fetch channel videos
      try {
        console.log(`[YouTube Search] Channel recognized: "${topChannel.title}" (ID: ${topChannel.channelId}). Fetching latest videos.`);
        const channelVideosUrl = `https://www.youtube.com/channel/${topChannel.channelId}/videos`;
        const vres = await fetch(channelVideosUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
            'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
            'Cache-Control': 'no-cache'
          }
        });
        if (vres.ok) {
          const vhtml = await vres.text();
          const vytData = extractYtInitialData(vhtml);
          if (vytData) {
            const videos = findVideoRenderers(vytData).slice(0, 5);
            return NextResponse.json({
              mode: 'channel',
              channel: topChannel,
              videos
            });
          }
        }
      } catch (err) {
        console.error("[YouTube Search] Failed to fetch channel videos:", err);
      }
    }

    // 4. Modus 1: Keyword Search (Default / Fallback)
    console.log(`[YouTube Search] Keyword Search Mode for: "${query}"`);
    let videos = [];
    
    // Search YouTube results
    try {
      const keywordSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      const res = await fetch(keywordSearchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
          'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7'
        }
      });
      if (res.ok) {
        const html = await res.text();
        const ytData = extractYtInitialData(html);
        if (ytData) {
          videos = findVideoRenderers(ytData).slice(0, 10);
        }
      }
    } catch (e) {
      console.warn("[YouTube Search] Keyword search failed, trying DuckDuckGo fallback:", e.message);
    }
    
    // DuckDuckGo fallback if no videos found
    if (videos.length === 0) {
      try {
        const ddgUrl = `https://html.duckduckgo.com/html/?q=site:youtube.com+${encodeURIComponent(query)}`;
        const ddgResponse = await fetch(ddgUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        if (ddgResponse.ok) {
          const html = await ddgResponse.text();
          const regex = /(?:youtube\.com\/watch\?v=|v%3D|v=)([a-zA-Z0-9_-]{11})/g;
          const matches = [...html.matchAll(regex)].map(m => m[1]).slice(0, 5);
          videos = matches.map(id => ({
            videoId: id,
            title: query,
            thumbnail: `https://img.youtube.com/vi/${id}/mqdefault.jpg`,
            viewsText: '',
            publishedText: '',
            videoUrl: `https://www.youtube.com/embed/${id}`,
            watchUrl: `https://www.youtube.com/watch?v=${id}`
          }));
        }
      } catch (e) {
        console.error("[YouTube Search] DDG scraping failed:", e);
      }
    }

    // If still empty, return default learning fallback video
    if (videos.length === 0) {
      videos = [{
        videoId: '5eW6Eagr9XM',
        title: 'Marty Lobdell - Study Less Study Smart',
        thumbnail: 'https://img.youtube.com/vi/5eW6Eagr9XM/mqdefault.jpg',
        viewsText: '11M views',
        publishedText: '11 years ago',
        videoUrl: 'https://www.youtube.com/embed/5eW6Eagr9XM',
        watchUrl: 'https://www.youtube.com/watch?v=5eW6Eagr9XM'
      }];
    }

    // Uncertain Mode: Keyword search results + suggest channels
    if (channels.length > 0) {
      return NextResponse.json({
        mode: 'uncertain',
        videos,
        suggestedChannels: channels.slice(0, 3)
      });
    }

    return NextResponse.json({
      mode: 'keyword',
      videos
    });

  } catch (error) {
    console.error('[YouTube Search API Error]:', error);
    return NextResponse.json({
      error: error.message,
      videos: [{
        videoId: '5eW6Eagr9XM',
        title: 'Marty Lobdell - Study Less Study Smart',
        thumbnail: 'https://img.youtube.com/vi/5eW6Eagr9XM/mqdefault.jpg',
        viewsText: '',
        publishedText: '',
        videoUrl: 'https://www.youtube.com/embed/5eW6Eagr9XM',
        watchUrl: 'https://www.youtube.com/watch?v=5eW6Eagr9XM'
      }]
    });
  }
}
