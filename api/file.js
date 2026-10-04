const { Readable } = require('stream');

// Hanya host CDN yang dikenal yang boleh di-proxy, biar endpoint ini gak bisa disalahgunakan.
const ALLOW = /(^|\.)(tikwm\.com|tiktok\.com|tiktokcdn[a-z-]*\.com|tiktokv\.(com|us)|byteoversea\.com|ibytedtos\.com|ibyteimg\.com|muscdn\.com|musical\.ly|cdninstagram\.com|fbcdn\.net|twimg\.com|redd\.it|redditmedia\.com|pinimg\.com|sndcdn\.com|ytimg\.com)$/i;

module.exports = async (req, res) => {
  const u = (req.query && req.query.u) || '';
  const name = String((req.query && req.query.name) || 'file').replace(/[^\w.-]+/g, '_').slice(0, 80);
  try {
    const p = new URL(u);
    if (p.protocol !== 'https:' || !ALLOW.test(p.hostname)) return res.status(403).end('Host tidak diizinkan.');
    const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://www.tiktok.com/' } });
    if (!r.ok || !r.body) return res.status(502).end('Gagal mengambil file.');
    if (!ALLOW.test(new URL(r.url).hostname)) return res.status(403).end('Host tidak diizinkan.');
    res.setHeader('Content-Type', r.headers.get('content-type') || 'application/octet-stream');
    const len = r.headers.get('content-length');
    if (len && !r.headers.get('content-encoding')) res.setHeader('Content-Length', len);
    res.setHeader('Content-Disposition', 'attachment; filename="' + name + '"');
    Readable.fromWeb(r.body).pipe(res);
  } catch (e) {
    res.status(400).end('Link tidak valid.');
  }
};
