// app/api/connectors/notion/route.js — real Notion API integration.
//
// The user supplies their own Notion integration token (stored in
// profile.connectors.notionToken) and target database/page id. We proxy the
// call server-side to avoid CORS and keep a single contract for the UI + agent.
//
// Actions:
//   create_page      { token, parentPageId, title, content }
//   export_protocol  { token, databaseId, date, blocks: [{title,startTime,pillar}] }

import { NextResponse } from 'next/server';

const NOTION_VERSION = '2022-06-28';

function notionHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Notion-Version': NOTION_VERSION,
  };
}

function paragraph(text) {
  return {
    object: 'block',
    type: 'paragraph',
    paragraph: { rich_text: [{ type: 'text', text: { content: String(text).slice(0, 1900) } }] },
  };
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { action, token } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Notion: Kein Integration-Token hinterlegt. Bitte im Konnektoren-Tab eintragen.' },
        { status: 400 }
      );
    }

    if (action === 'create_page') {
      const { parentPageId, title, content } = body;
      if (!parentPageId) {
        return NextResponse.json(
          { success: false, message: 'Notion: parentPageId fehlt (Ziel-Seite).' },
          { status: 400 }
        );
      }
      const res = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: notionHeaders(token),
        body: JSON.stringify({
          parent: { page_id: parentPageId },
          properties: { title: { title: [{ text: { content: title || 'Pronoia Page' } }] } },
          children: content ? [paragraph(content)] : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return NextResponse.json(
          { success: false, message: `Notion API: ${data.message || res.status}` },
          { status: res.status }
        );
      }
      return NextResponse.json({ success: true, message: `Notion: "${title}" erstellt.`, data: { id: data.id, url: data.url } });
    }

    if (action === 'export_protocol') {
      const { databaseId, date, blocks = [] } = body;
      if (!databaseId) {
        return NextResponse.json(
          { success: false, message: 'Notion: databaseId fehlt (Ziel-Datenbank).' },
          { status: 400 }
        );
      }
      const children = blocks.map((b) =>
        paragraph(`• ${b.startTime || ''} ${b.title || ''} [${b.pillar || b.type || ''}]`.trim())
      );
      const res = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: notionHeaders(token),
        body: JSON.stringify({
          parent: { database_id: databaseId },
          properties: { Name: { title: [{ text: { content: `Pronoia Protokoll ${date || ''}`.trim() } }] } },
          children,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return NextResponse.json(
          { success: false, message: `Notion API: ${data.message || res.status}` },
          { status: res.status }
        );
      }
      return NextResponse.json({
        success: true,
        message: `Notion: Tagesprotokoll für ${date} (${blocks.length} Blöcke) übertragen.`,
        data: { id: data.id, url: data.url },
      });
    }

    return NextResponse.json({ success: false, message: `Notion: Unbekannte Aktion "${action}".` }, { status: 400 });
  } catch (err) {
    console.error('[Notion Connector] error:', err);
    return NextResponse.json({ success: false, message: `Notion: ${err.message}` }, { status: 500 });
  }
}
