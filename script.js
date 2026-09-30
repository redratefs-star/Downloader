const $ = (id) => document.getElementById(id);
const urlEl = $('url'), msg = $('msg'), result = $('result'), go = $('go');

function say(text, isErr) { msg.textContent = text; msg.className = isErr ? 'err' : ''; }

$('paste').onclick = async () => {
  try { urlEl.value = await navigator.clipboard.readText(); }
  catch { say('Izin clipboard ditolak. Tempel manual di kolom.', true); }
};

go.onclick = async () => {
  const link = urlEl.value.trim();
  if (!link) return say('Tempel link dulu.', true);
  go.disabled = true; result.hidden = true; say('Mengambil data...');
  try {
    const r = await fetch('/api/download?url=' + encodeURIComponent(link));
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal mengambil data.');
    show(d); say('');
  } catch (e) { say(e.message, true); }
  go.disabled = false;
};

function esc(s) { const p = document.createElement('p'); p.textContent = s || ''; return p.innerHTML; }

function show(d) {
  let html = '';
  if (d.type === 'photo') {
    html += '<p class="warn">Link ini berisi foto, bukan video. Yang bisa diunduh: foto (' + d.images.length + ') dan audio.</p>';
    html += '<div class="grid">' + d.images.map((u, i) =>
      '<a href="' + u + '" target="_blank" rel="noopener" aria-label="Foto ' + (i + 1) + '"><img src="' + u + '" alt="Foto ' + (i + 1) + '"></a>').join('') + '</div>';
  } else if (d.cover) {
    html += '<img class="cover" src="' + d.cover + '" alt="Preview">';
  }
  html += '<p class="title">' + esc(d.title || 'Tanpa judul') + '</p><p class="by">' + esc(d.author) + ' - ' + esc(d.platform) + '</p>';
  html += '<div class="btns">';
  if (d.type === 'photo') d.images.forEach((u, i) => html += '<a class="dl" href="' + u + '" target="_blank" rel="noopener">Unduh foto ' + (i + 1) + '</a>');
  if (d.videoHd) html += '<a class="dl" href="' + d.videoHd + '" target="_blank" rel="noopener">Unduh video HD</a>';
  if (d.video) html += '<a class="dl" href="' + d.video + '" target="_blank" rel="noopener">Unduh video</a>';
  if (d.audio) html += '<a class="dl" href="' + d.audio + '" target="_blank" rel="noopener">Unduh audio MP3</a>';
  html += '</div><p class="by" style="margin-top:12px">Kalau file cuma terbuka di tab baru, tahan lama lalu pilih Simpan.</p>';
  result.innerHTML = html; result.hidden = false;
}
