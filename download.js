// Tiap platform = satu fungsi provider. Mau nambah platform, cukup tambah di PROVIDERS.
const PROVIDERS = {
  tiktok: async (url) => {
    const r = await fetch('https://www.tikwm.com/api/?hd=1&url=' + encodeURIComponent(url));
    const j = await r.json();
    if (j.code !== 0 || !j.data) throw new Error('Link tidak valid atau video tidak bisa diambil.');
    const d = j.data;
    const images = Array.isArray(d.images) ? d.images : [];
    return {
      type: images.length ? 'photo' : 'video',
      title: d.title, author: d.author && d.author.nickname,
      cover: d.cover, video: images.length ? null : d.play,
      videoHd: images.length ? null : d.hdplay, audio: d.music, images,
    };
  },
  // instagram: async (url) => { ... },
  // facebook: async (url) => { ... },
};

const HOSTS = { tiktok: /(^|\.)tiktok\.com$/i, instagram: /(^|\.)instagram\.com$/i, facebook: /(^|\.)(facebook\.com|fb\.watch)$/i };

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const link = (req.query && req.query.url || '').trim();
  let host;
  try { host = new URL(link).hostname; } catch { return res.status(400).json({ error: 'Link tidak valid.' }); }
  const platform = Object.keys(HOSTS).find((k) => HOSTS[k].test(host));
  if (!platform) return res.status(400).json({ error: 'Platform ini belum didukung.' });
  if (!PROVIDERS[platform]) return res.status(501).json({ error: platform + ' belum diaktifkan.' });
  try {
    const data = await PROVIDERS[platform](link);
    res.status(200).json({ platform, ...data });
  } catch (e) {
    res.status(502).json({ error: e.message || 'Gagal mengambil data.' });
  }
};
