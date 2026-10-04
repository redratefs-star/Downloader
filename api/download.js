// TikTok pakai tikwm (support foto/slideshow). Platform lain lewat server cobalt (env COBALT_API_URL).
const PLATFORMS = [
  ['tiktok', /(^|\.)tiktok\.com$/i],
  ['instagram', /(^|\.)instagram\.com$/i],
  ['facebook', /(^|\.)(facebook\.com|fb\.watch|fb\.com)$/i],
  ['youtube', /(^|\.)(youtube\.com|youtu\.be)$/i],
  ['twitter', /(^|\.)(twitter\.com|x\.com)$/i],
  ['threads', /(^|\.)threads\.(net|com)$/i],
  ['reddit', /(^|\.)(reddit\.com|redd\.it)$/i],
  ['pinterest', /(^|\.)(pinterest\.[a-z.]+|pin\.it)$/i],
  ['soundcloud', /(^|\.)soundcloud\.com$/i],
];

const slug = (t) => String(t || 'ambil').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'ambil';
const kind = (name) => /\.(mp3|m4a|ogg|opus|wav)$/i.test(name) ? 'audio' : /\.(jpe?g|png|webp|gif)$/i.test(name) ? 'photo' : 'video';
const LABEL = { audio: 'Unduh audio', photo: 'Unduh foto', video: 'Unduh video' };

async function tiktok(url) {
  const r = await fetch('https://www.tikwm.com/api/?hd=1&url=' + encodeURIComponent(url));
  const j = await r.json();
  if (j.code !== 0 || !j.data) throw new Error('Link tidak valid atau video tidak bisa diambil.');
  const d = j.data, base = slug(d.title);
  const images = Array.isArray(d.images) ? d.images : [];
  const items = [];
  if (images.length) images.forEach((u, i) => items.push({ label: 'Unduh foto ' + (i + 1), url: u, filename: base + '-' + (i + 1) + '.jpg' }));
  else {
    if (d.hdplay) items.push({ label: 'Unduh video HD', url: d.hdplay, filename: base + '-hd.mp4' });
    if (d.play) items.push({ label: 'Unduh video', url: d.play, filename: base + '.mp4' });
  }
  if (d.music) items.push({ label: 'Unduh audio MP3', url: d.music, filename: base + '.mp3' });
  return { type: images.length ? 'photo' : 'video', title: d.title, author: d.author && d.author.nickname, cover: d.cover, previews: images, items };
}

async function cobalt(url) {
  const api = process.env.COBALT_API_URL;
  if (!api) {
    const e = new Error('Saat ini hanya link TikTok yang didukung.');
    e.status = 501; throw e;
  }
  const headers = { Accept: 'application/json', 'Content-Type': 'application/json' };
  if (process.env.COBALT_API_KEY) headers.Authorization = 'Api-Key ' + process.env.COBALT_API_KEY;
  const r = await fetch(api, { method: 'POST', headers, body: JSON.stringify({ url, videoQuality: '1080', downloadMode: 'auto', filenameStyle: 'basic' }) });
  let j;
  try { j = await r.json(); } catch { throw new Error('Server cobalt tidak membalas dengan benar.'); }

  const instHost = new URL(api).hostname;
  const direct = (u) => { try { return new URL(u).hostname === instHost; } catch { return false; } };

  if (j.status === 'tunnel' || j.status === 'redirect') {
    const k = kind(j.filename || '');
    return { type: k === 'photo' ? 'photo' : 'video', title: (j.filename || '').replace(/\.[^.]+$/, ''), items: [{ label: LABEL[k], url: j.url, filename: j.filename || 'file', direct: direct(j.url) }] };
  }
  if (j.status === 'picker') {
    const items = [], previews = []; let n = 0;
    (j.picker || []).forEach((p) => {
      n++;
      const ext = p.type === 'photo' ? 'jpg' : p.type === 'gif' ? 'gif' : 'mp4';
      if (p.type === 'photo') previews.push(p.thumb || p.url);
      items.push({ label: (p.type === 'photo' ? 'Unduh foto ' : 'Unduh video ') + n, url: p.url, filename: 'ambil-' + n + '.' + ext, direct: direct(p.url) });
    });
    if (j.audio) items.push({ label: 'Unduh audio', url: j.audio, filename: j.audioFilename || 'audio.mp3', direct: direct(j.audio) });
    const allPhoto = (j.picker || []).length && (j.picker || []).every((p) => p.type === 'photo');
    return { type: allPhoto ? 'photo' : 'video', title: '', previews, items };
  }
  if (j.status === 'error') throw new Error('Gagal: ' + ((j.error && j.error.code) || 'tidak diketahui'));
  throw new Error('Respons cobalt tidak dikenali.');
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const link = ((req.query && req.query.url) || '').trim();
  let host;
  try { host = new URL(link).hostname; } catch { return res.status(400).json({ error: 'Link tidak valid.' }); }
  const found = PLATFORMS.find(([, re]) => re.test(host));
  const platform = found ? found[0] : host.replace(/^www\./, '');
  try {
    const data = platform === 'tiktok' ? await tiktok(link) : await cobalt(link);
    res.status(200).json({ platform, ...data });
  } catch (e) {
    res.status(e.status || 502).json({ error: e.message || 'Gagal mengambil data.' });
  }
};
