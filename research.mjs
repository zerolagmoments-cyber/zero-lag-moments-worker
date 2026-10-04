const MAX_SOURCES = 6;
const MAX_CHARS_PER_SOURCE = 12000;

function cleanText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export async function researchTopic(topic) {
  const links = [...new Set((topic.sourceLinks || []).filter(Boolean))].slice(0, MAX_SOURCES);
  const sources = [];

  for (const url of links) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'user-agent': 'ZeroLagMomentsResearch/1.0 (+https://zerolagmomentagent.netlify.app)' }
      });
      clearTimeout(timeout);
      if (!response.ok) continue;
      const type = response.headers.get('content-type') || '';
      if (!type.includes('text/html') && !type.includes('text/plain')) continue;
      const raw = await response.text();
      const text = cleanText(raw).slice(0, MAX_CHARS_PER_SOURCE);
      if (text.length >= 200) sources.push({ url, text });
    } catch (error) {
      console.warn(`Research fetch failed for ${url}: ${error.message}`);
    }
  }

  return sources;
}
