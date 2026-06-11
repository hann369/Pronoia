import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL ist erforderlich' }, { status: 400 });
    }

    // Basic URL validation
    let targetUrl;
    try {
      targetUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: 'Ungültige URL-Format' }, { status: 400 });
    }

    const response = await fetch(targetUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      next: { revalidate: 300 } // cache 5 min
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Fehler beim Abrufen der Seite: ${response.statusText}` }, { status: 502 });
    }

    const html = await response.text();

    // Regex extraction for OG tags
    const titleRegex = /<meta\s+property="og:title"\s+content="([^"]+)"/i;
    const descRegex = /<meta\s+property="og:description"\s+content="([^"]+)"/i;
    const imageRegex = /<meta\s+property="og:image"\s+content="([^"]+)"/i;
    const priceRegex = /<meta\s+property="(?:og|product):price:amount"\s+content="([^"]+)"/i;
    const fallbackTitleRegex = /<title>([^<]+)<\/title>/i;
    const fallbackDescRegex = /<meta\s+name="description"\s+content="([^"]+)"/i;

    const titleMatch = html.match(titleRegex) || html.match(fallbackTitleRegex);
    const descMatch = html.match(descRegex) || html.match(fallbackDescRegex);
    const imageMatch = html.match(imageRegex);
    const priceMatch = html.match(priceRegex);

    const title = titleMatch ? titleMatch[1].trim() : '';
    const description = descMatch ? descMatch[1].trim() : '';
    const image = imageMatch ? imageMatch[1].trim() : '';
    const priceStr = priceMatch ? priceMatch[1].trim() : '';
    
    // Parse price if float exists
    let price = null;
    if (priceStr) {
      const parsedPrice = parseFloat(priceStr.replace(/[^0-9.,]/g, '').replace(',', '.'));
      if (!isNaN(parsedPrice)) {
        price = parsedPrice;
      }
    } else {
      // Try parsing price from title or description body as a fallback
      const priceTextRegex = /(?:(\d{1,5}(?:[.,]\d{2})?)\s*(?:€|EUR|Euro|USD|\$))/i;
      const textPriceMatch = html.match(priceTextRegex);
      if (textPriceMatch) {
        const parsedPrice = parseFloat(textPriceMatch[1].replace(',', '.'));
        if (!isNaN(parsedPrice)) {
          price = parsedPrice;
        }
      }
    }

    return NextResponse.json({
      success: true,
      metadata: {
        title: title || targetUrl.hostname,
        description: description || 'Keine Beschreibung gefunden.',
        image: image || '',
        price: price || null
      }
    });

  } catch (err) {
    console.error('[Read Link API] Scraper error:', err);
    return NextResponse.json({ error: err.message || 'Interner Serverfehler' }, { status: 500 });
  }
}
