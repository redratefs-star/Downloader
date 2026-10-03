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

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function show(d) {
  let html = '';
  if (d.type === 'photo') {
    html += '<p class="warn">Link ini berisi foto, bukan video.</p>';
    if (d.previews && d.previews.length) html += '<div class="grid">' + d.previews.map((u, i) => '<img src="' + esc(u) + '" alt="Foto ' + (i + 1) + '">').join('') + '</div>';
  } else if (d.cover) {
    html += '<img class="cover" src="' + esc(d.cover) + '" alt="Preview">';
  }
  html += '<p class="title">' + esc(d.title || 'Tanpa judul') + '</p><p class="by">' + esc(d.author ? d.author + ' - ' : '') + esc(d.platform) + '</p>';
  html += '<div class="btns">' + d.items.map((it) => {
    const href = it.direct ? it.url : '/api/file?u=' + encodeURIComponent(it.url) + '&name=' + encodeURIComponent(it.filename);
    return '<a class="dl" href="' + esc(href) + '" download="' + esc(it.filename) + '">' + esc(it.label) + '</a>';
  }).join('') + '</div>';
  result.innerHTML = html; result.hidden = false;
}
