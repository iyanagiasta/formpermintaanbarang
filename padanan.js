/* T159: Padanan Kode (admin > Data & Sistem > Padanan Kode).
   Satu barang bisa punya kode berbeda di sistem gudang dan di Accurate (mis. J1-CBM-MEK di gudang, J1-CBM-MKL di Accurate).
   Sistem mengusulkan pasangan; admin memilih Setuju atau Tolak. Padanan yang disetujui membuat semua laporan
   membaca kode Accurate sebagai kode gudang (satu barang, satu baris). Usulan tidak pernah dipakai sebelum disetujui. */
(function (root) {
  'use strict';
  var S = {res: null, q: '', v: 'usul', busy: false};
  var el = null, api = null, toast = function () {};
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
  function arr(x) { return Array.isArray(x) ? x : []; }
  function cocok(o) {
    var q = S.q.toLowerCase().trim(); if (!q) return true;
    return [o.gud, o.gudNama, o.acc, o.accNama, o.nama].join(' ').toLowerCase().indexOf(q) >= 0;
  }
  function gaya() {
    if (document.getElementById('pdnGaya')) return;
    var st = document.createElement('style'); st.id = 'pdnGaya';
    st.textContent = '.pdn-t{width:100%;border-collapse:collapse;font-size:13.5px}.pdn-t th,.pdn-t td{border-bottom:1px solid #e3e8ee;padding:7px 8px;text-align:left;vertical-align:top}' +
      '.pdn-t th{background:#1a6cab;color:#fff;font-weight:600}.pdn-k{font-family:ui-monospace,Consolas,monospace;font-size:12.5px}.pdn-eq{color:#7f8c8d;padding:0 4px}' +
      '.pdn-chip{display:inline-block;font-size:11px;padding:0 6px;border-radius:9px;border:1px solid currentColor;margin:1px 3px 1px 0;white-space:nowrap}' +
      '.pdn-g{color:#1e8449}.pdn-b{color:#2471a3}.pdn-y{color:#b9770e}.pdn-v{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0}.pdn-v button[aria-pressed=true]{background:#1a6cab!important;color:#fff!important;border-color:#1a6cab!important}' +
      '.pdn-bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.pdn-bar input{min-width:220px}.pdn-aksi{white-space:nowrap}.pdn-aksi button{margin:2px 4px 2px 0}' +
      '@media(max-width:760px){.pdn-t thead{display:none}.pdn-t tr{display:block;border:1px solid #e3e8ee;border-radius:8px;margin:8px 0;padding:6px}.pdn-t td{display:block;border:0;padding:3px 4px}}';
    document.head.appendChild(st);
  }
  function kerangka() {
    el.innerHTML = '<div class="card"><h2 style="margin-top:0">Padanan Kode</h2>' +
      '<p class="note">Satu barang kadang punya kode berbeda di sistem gudang dan di Accurate, misalnya <b>J1-CBM-MEK</b> di gudang dan <b>J1-CBM-MKL</b> di Accurate. ' +
      'Akibatnya laporan memecah satu barang menjadi dua baris atau tidak menemukan harga IA-nya. Setujui pasangan yang benar; setelah itu <b>semua laporan</b> (Rekap PPBJ, Order Accurate, Telusur, Komparasi, Mutasi Accurate, dan lainnya) membaca kode Accurate sebagai kode gudang. ' +
      'Usulan dibuat otomatis dan <b>tidak dipakai sebelum Anda setujui</b>. Data asli Accurate di sheet tidak diubah.</p>' +
      '<div class="pdn-bar"><input type="search" id="pdnQ" placeholder="Cari kode atau nama barang"><button class="gh" id="pdnMuat">Muat ulang</button><span class="note" id="pdnWaktu"></span></div>' +
      '<div class="pdn-v" id="pdnV"></div><div id="pdnIsi"><p class="note">Memuat usulan... (menghitung dari data Accurate dan BPB, bisa beberapa detik)</p></div>' +
      '<details style="margin-top:14px"><summary><b>Tambah padanan manual</b></summary><div class="pdn-bar" style="margin-top:8px">' +
      '<input id="pdnG" placeholder="Kode gudang (Master Barang)"><span class="pdn-eq">=</span><input id="pdnA" placeholder="Kode di Accurate"><button class="sv" id="pdnTambah">Setujui</button></div>' +
      '<p class="note">Kode gudang harus ada di Master Barang. Kode Accurate yang juga terdaftar sebagai barang tersendiri di Master Barang ditolak, supaya dua barang gudang tidak tergabung.</p></details></div>';
    var q = el.querySelector('#pdnQ'); q.value = S.q;
    q.addEventListener('input', function () { S.q = q.value; isi(); });
    el.querySelector('#pdnMuat').addEventListener('click', function () { muat(); });
    el.querySelector('#pdnTambah').addEventListener('click', function () {
      var g = el.querySelector('#pdnG').value.trim(), a = el.querySelector('#pdnA').value.trim();
      if (!g || !a) { toast('Isi kode gudang dan kode Accurate.', true); return; }
      simpan({gud: g, acc: a, status: 'Disetujui', sumber: 'Manual'}, this);
    });
    el.addEventListener('click', function (ev) {
      var b = ev.target.closest('button[data-pa]'); if (!b) return;
      var o = JSON.parse(b.getAttribute('data-o'));
      var st = b.getAttribute('data-pa');
      if (st === 'Hapus' && S.v === 'setuju' && !confirm('Hapus padanan ' + o.gud + ' = ' + o.acc + '?\n\nLaporan kembali memperlakukan kedua kode sebagai barang berbeda (kecuali BPB dan IA yang tertaut, yang tetap dicocokkan lewat nama dan jumlah).')) return;
      simpan({gud: o.gud, acc: o.acc, status: st, sumber: o.sumber || (arr(o.dasar).join(', ') || 'Manual'), nama: o.gudNama || o.nama || ''}, b);
    });
  }
  function tab() {
    var r = S.res || {}, n = {usul: arr(r.usul).length, setuju: arr(r.setuju).length, tolak: arr(r.tolak).length};
    el.querySelector('#pdnV').innerHTML = [['usul', 'Usulan (' + n.usul + ')'], ['setuju', 'Disetujui (' + n.setuju + ')'], ['tolak', 'Ditolak (' + n.tolak + ')']].map(function (x) {
      return '<button class="gh" data-v="' + x[0] + '" aria-pressed="' + (S.v === x[0]) + '">' + x[1] + '</button>';
    }).join('');
    Array.prototype.forEach.call(el.querySelectorAll('#pdnV button'), function (b) { b.addEventListener('click', function () { S.v = b.getAttribute('data-v'); tab(); isi(); }); });
  }
  function tombol(o, st, label, kelas) { return '<button class="' + (kelas || 'gh') + '" data-pa="' + st + '" data-o="' + esc(JSON.stringify(o)) + '">' + label + '</button>'; }
  function isi() {
    var box = el.querySelector('#pdnIsi'), r = S.res; if (!r) return;
    var h = '';
    if (S.v === 'usul') {
      var L = arr(r.usul).filter(cocok);
      if (!L.length) { box.innerHTML = '<p class="note">' + (arr(r.usul).length ? 'Tidak ada usulan yang cocok dengan pencarian.' : 'Tidak ada usulan. Semua kode gudang yang namanya ada di data Accurate sudah sama kodenya atau sudah diputuskan.') + '</p>'; return; }
      h = '<p class="note">Urutan: yang terkuat dulu. <span class="pdn-chip pdn-g">BPB-IA</span> = BPB dan IA sudah tertaut di tab Accurate dengan nama dan jumlah sama (hampir pasti benar). ' +
        '<span class="pdn-chip pdn-b">Kode mirip</span> = awal kodenya sama. <span class="pdn-chip pdn-y">Nama sama</span> saja = periksa dulu sebelum menyetujui.</p>' +
        '<table class="pdn-t"><thead><tr><th>Kode gudang</th><th></th><th>Kode Accurate</th><th>Dasar</th><th>Aksi</th></tr></thead><tbody>' +
        L.slice(0, 300).map(function (o) {
          return '<tr><td><span class="pdn-k">' + esc(o.gud) + '</span><div>' + esc(o.gudNama) + '</div></td><td class="pdn-eq">=</td>' +
            '<td><span class="pdn-k">' + esc(o.acc) + '</span><div>' + esc(o.accNama) + '</div>' + (arr(o.ada).length ? '<div class="note">Ada di: ' + esc(arr(o.ada).join(', ')) + '</div>' : '') + '</td>' +
            '<td>' + (o.kuat ? '<span class="pdn-chip pdn-g">BPB-IA</span>' : '') + (o.mirip ? '<span class="pdn-chip pdn-b">Kode mirip</span>' : '') + (arr(o.dasar).indexOf('Nama sama') >= 0 ? '<span class="pdn-chip pdn-y">Nama sama</span>' : '') +
            (arr(o.bukti).length ? '<div class="note">' + esc(arr(o.bukti).join('; ')) + '</div>' : '') + '</td>' +
            '<td class="pdn-aksi">' + tombol(o, 'Disetujui', 'Setuju', 'sv') + tombol(o, 'Ditolak', 'Tolak') + '</td></tr>';
        }).join('') + '</tbody></table>' + (L.length > 300 ? '<p class="note">Menampilkan 300 dari ' + L.length + '. Persempit dengan pencarian.</p>' : '');
    } else {
      var D = arr(S.v === 'setuju' ? r.setuju : r.tolak).filter(cocok);
      if (!D.length) { box.innerHTML = '<p class="note">' + (S.v === 'setuju' ? 'Belum ada padanan yang disetujui.' : 'Belum ada usulan yang ditolak.') + '</p>'; return; }
      h = '<table class="pdn-t"><thead><tr><th>Kode gudang</th><th></th><th>Kode Accurate</th><th>Dasar</th><th>Oleh / waktu</th><th>Aksi</th></tr></thead><tbody>' +
        D.map(function (o) {
          return '<tr><td><span class="pdn-k">' + esc(o.gud) + '</span><div>' + esc(o.gudNama || o.nama) + '</div></td><td class="pdn-eq">=</td><td><span class="pdn-k">' + esc(o.acc) + '</span></td>' +
            '<td>' + esc(o.sumber) + '</td><td>' + esc(o.oleh) + '<div class="note">' + esc(o.waktu) + '</div></td>' +
            '<td class="pdn-aksi">' + (S.v === 'tolak' ? tombol(o, 'Disetujui', 'Setujui', 'sv') : '') + tombol(o, 'Hapus', S.v === 'tolak' ? 'Usulkan lagi' : 'Hapus') + '</td></tr>';
        }).join('') + '</tbody></table>';
    }
    box.innerHTML = h;
  }
  async function simpan(d, btn) {
    if (S.busy) return; S.busy = true; if (btn) btn.disabled = true;
    try {
      var r = await api(Object.assign({action: 'adminPadananSimpan'}, d));
      if (!r || !r.ok) { toast((r && r.msg) || 'Gagal menyimpan.', true); return; }
      toast(r.msg);
      if (d.status === 'Disetujui' && el.querySelector('#pdnG')) { el.querySelector('#pdnG').value = ''; el.querySelector('#pdnA').value = ''; }
      S.busy = false; await muat();
    } catch (e) { toast('Gagal terhubung ke server.', true); }
    finally { S.busy = false; if (btn) btn.disabled = false; }
  }
  async function muat() {
    var box = el.querySelector('#pdnIsi'); if (box && !S.res) box.innerHTML = '<p class="note">Memuat usulan...</p>';
    var b = el.querySelector('#pdnMuat'); if (b) b.disabled = true;
    try {
      var r = await api({action: 'adminPadananDaftar'});
      if (!r || !r.ok) { if (box) box.innerHTML = '<p class="note">' + esc((r && r.msg) || 'Gagal memuat.') + '</p>'; return; }
      S.res = r; el.querySelector('#pdnWaktu').textContent = 'Dihitung ' + (r.waktu || ''); tab(); isi();
    } catch (e) { if (box) box.innerHTML = '<p class="note">Gagal terhubung ke server.</p>'; }
    finally { if (b) b.disabled = false; }
  }
  function mount(pane, apiFn, toastFn) { el = pane; api = apiFn; toast = toastFn || toast; gaya(); kerangka(); if (S.res) { tab(); isi(); } muat(); }
  root.PDK = {mount: mount, _uji: {S: S, cocok: cocok}};
})(typeof window !== 'undefined' ? window : this);
