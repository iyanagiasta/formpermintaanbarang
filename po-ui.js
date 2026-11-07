/* Tampilan Unggah PO, Daftar PO, dan Vendor untuk halaman Pengadaan (Tambahan 51).
   Memakai fungsi halaman: api, esc, rp, toast, app, bisa, siapFile, blobB64, muat, tampilList.
   Hasil bacaan PDF SELALU tampil dulu sebagai pratinjau; tidak ada yang tersimpan sebelum tombol Simpan ditekan. */
(function (root) {
  'use strict';
  var U = {}, S = {tab: 'beli', pv: null, po: null, file: null, pil: [], mode: 'baru', busy: false, lst: null, ven: null, det: null};
  var BR = null;

  function $(id) { return document.getElementById(id); }
  function tgl(s) { var m = /^(\d{4})-(\d\d)-(\d\d)/.exec(String(s || '')); return m ? m[3] + '/' + m[2] + '/' + m[1] : String(s || ''); }
  function angka(n) { return Math.round(Number(n) || 0).toLocaleString('id-ID'); }

  var BD = {}, TABGRUP = {po_tunggu: 'daftar', po_jalan: 'daftar', po_kirim: 'daftar', po_datang: 'daftar', klaim: 'klaim', umo_ppbj: 'umo', umo_real: 'umo', umo_ttd: 'umo', umo_tolak: 'umo', revisi: 'revisi', termin: 'termin', harga_mahal: 'harga'};
  var NAVGRP = [['Kerja', [['antrean', 'Antrean'], ['papan', 'Papan PPBJ']]], ['PO', [['unggah', 'Unggah PO'], ['daftar', 'Daftar PO'], ['harga', 'Harga di atas anggaran'], ['rekap', 'Rekap dan laporan']]],
    ['Barang datang', [['beli', 'Pembelian'], ['akan', 'Akan datang'], ['klaim', 'Klaim vendor'], ['jalan', 'Perjalanan PPBJ'], ['menipis', 'Stok menipis']]], ['Uang dan proyek', [['umo', 'UMO'], ['termin', 'Jasa termin'], ['revisi', 'Revisi PPBJ'], ['boq', 'BOQ SL']]], ['Data', [['vendor', 'Vendor']]]];
  function gaya() {
    if ($('pogaya')) return; var s = document.createElement('style'); s.id = 'pogaya';
    s.textContent = '#potabs{display:flex;flex-wrap:wrap;gap:6px;align-items:center}#potabs .gl{font-size:10.5px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--mut);margin:0 2px 0 10px}#potabs .bd{font-style:normal;background:#c0392b;color:#fff;border-radius:9px;padding:0 6px;font-size:11px;margin-left:4px}.po-alat{margin:6px 0}.po-alat input{flex:1;min-width:180px}#trkm{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:80;display:flex;align-items:center;justify-content:center;padding:12px}#trkm>div{background:var(--card);color:var(--ink);border-radius:10px;padding:16px;max-width:560px;width:100%;max-height:90vh;overflow:auto}';
    s.textContent += '@media(min-width:900px){#app:has(>#potabs.pside){display:grid;grid-template-columns:208px minmax(0,1fr);column-gap:14px;align-items:start}#app:has(>#potabs.pside)>*{grid-column:2;min-width:0}#app>#potabs.pside{grid-column:1;grid-row:1/span 60;position:sticky;top:8px;max-height:calc(100vh - 16px);overflow-y:auto;overscroll-behavior:contain;flex-direction:column;flex-wrap:nowrap;align-items:stretch;gap:2px;padding:6px;border:1px solid var(--line,#c3ccd3);border-radius:6px;background:var(--card,#fff)}#potabs.pside .gl{margin:12px 4px 3px}#potabs.pside .gl:first-of-type{margin-top:4px}#potabs.pside button{text-align:left;width:100%;border-radius:4px}#potabs.pside input#pocq{max-width:none;min-width:0;width:100%;box-sizing:border-box;margin-bottom:4px}}@media print{body.cetak-jalan #jh>.fr,body.cetak-jalan #jh textarea,body.cetak-jalan #jc,body.cetak-jalan .hdr,body.cetak-jalan header{display:none!important}body.cetak-jalan{font-size:11px}@page{size:A4;margin:10mm}#potabs,#mnadm,#mnbuka,.po-alat,#toast{display:none!important}#app>#potabs.pside{display:none!important}#app:has(>#potabs.pside){display:block}}';
    document.head.appendChild(s);
  }
  U.nav = function (tab) {
    var g;
    if (bisa('input')) { g = NAVGRP.slice(); if (typeof PERAN !== 'undefined' && PERAN === 'Admin') g = g.concat([['Admin', [['pantau', 'Pantau'], ['sehat', 'Cek kesehatan'], ['atur', 'Pengaturan'], ['jejak', 'Jejak aktivitas']]]]); }
    else if (bisa('terima') || bisa('lihat')) g = [['Barang datang', [['beli', 'Pembelian'], ['akan', 'Akan datang']].concat(typeof PERAN !== 'undefined' && PERAN === 'Manager Gudang' ? [['menipis', 'Stok menipis']] : [])]];   /* Manager Gudang boleh membaca Stok menipis */
    else return '';
    return '<div class="tabs' + (bisa('input') ? ' pside' : '') + '" id="potabs">' + (bisa('input') ? '<input type="text" id="pocq" placeholder="Cari PO, PPBJ, barang, vendor..." style="min-width:200px;flex:1;max-width:320px">' : '') +
      g.map(function (gr) { return '<span class="gl">' + gr[0] + '</span>' + gr[1].map(function (x) { var n = BD[x[0]]; return '<button data-t="' + x[0] + '" class="' + (x[0] === tab ? 'on' : '') + '">' + x[1] + (n ? ' <i class="bd">' + n + '</i>' : '') + '</button>'; }).join(''); }).join('') + '</div>';
  };
  U.pasangNav = function () {
    gaya(); var b = $('potabs'); if (!b) return;
    b.onclick = function (e) { var el = e.target, t = null; while (el && el !== b && !t) { t = el.getAttribute && el.getAttribute('data-t'); el = el.parentNode; } if (t) U.tampil(t); };
    var q = $('pocq'); if (q) q.onkeydown = function (e) { if (e.key === 'Enter' && q.value.trim().length >= 2) cari(q.value.trim()); };
    if (!S.obs && typeof MutationObserver !== 'undefined') { S.obs = new MutationObserver(function () { clearTimeout(S.ot); S.ot = setTimeout(U.alat, 60); }); S.obs.observe(app, {childList: true, subtree: true}); }
    U.alat();
  };
  function setBadge(r) { BD = {antrean: r.total || 0}; (r.grup || []).forEach(function (g) { var t = TABGRUP[g.kunci]; if (t) BD[t] = (BD[t] || 0) + g.n; }); }
  U.muatBadge = async function () {
    if (!bisa('input')) return;
    try {
      var r = await api({action: 'pengAntrean'}); if (!r.ok) return; setBadge(r); var nb = $('potabs');
      if (nb) { var on = nb.querySelector('button.on'), tmp = document.createElement('div'); tmp.innerHTML = U.nav(on ? on.getAttribute('data-t') : ''); if (tmp.firstChild) { nb.parentNode.replaceChild(tmp.firstChild, nb); U.pasangNav(); } }
    } catch (e) { /* angka di tab bersifat tambahan */ }
  };
  U.tampil = function (tab) {
    tab = ({hargamahal: 'harga'})[tab] || tab; S.tab = tab;
    if (tab === 'beli') { tampilList(); return; }
    var f = {antrean: antrean, papan: papan, unggah: unggah, daftar: daftar, harga: harga, rekap: rekap, akan: akan, klaim: klaim, jalan: function () { return jalan(''); }, umo: umo, termin: termin, revisi: revisi, boq: function () { return boq(''); }, vendor: vendor, atur: atur, jejak: jejak, pantau: pantau, sehat: sehat, menipis: menipis}[tab];
    if (f) return f();
  };

  /* ---------- Unggah PO ---------- */
  function unggah() {
    S.pv = null; S.po = null; S.file = null; S.pil = [];
    app.innerHTML = U.nav('unggah') + '<div class="card"><h3 style="margin-top:0">Unggah PO dari Accurate</h3>' +
      '<div class="note">Pilih PDF "Surat Pembelian (Purchase Order)" dari Accurate. Sistem membaca isinya dan menampilkannya dulu untuk Anda periksa; belum ada yang tersimpan sebelum Anda menekan Simpan. Satu PO hanya boleh berisi satu No PPBJ.</div>' +
      '<div class="fr"><input type="file" id="pof" accept="application/pdf,.pdf"><button id="pob">Baca PO</button></div><div id="pos" class="note"></div></div><div id="pov"></div>';
    U.pasangNav();
    $('pob').onclick = baca;
  }
  async function baca() {
    var f = $('pof').files && $('pof').files[0]; if (!f) { toast('Pilih file PDF PO dulu.', true); return; }
    if (!/\.pdf$/i.test(f.name) && f.type !== 'application/pdf') { toast('File harus PDF.', true); return; }
    $('pob').disabled = true; $('pos').textContent = 'Membaca PDF...'; $('pov').innerHTML = '';
    try {
      var r = await POB.bacaFile(f);
      if (r.err) { $('pos').innerHTML = '<span class="err">' + esc(r.err) + '</span>'; $('pob').disabled = false; return; }
      S.po = r; S.file = f;
      $('pos').textContent = 'Memeriksa ke database...';
      var pv = await api({action: 'poPratinjau', po: r});
      if (!pv.ok) { $('pos').innerHTML = '<span class="err">' + esc(pv.msg || 'Gagal.') + '</span>'; $('pob').disabled = false; return; }
      if (!BR) { try { var b = await api({action: 'pbBarang'}); BR = (b && b.items) || []; } catch (e) { BR = []; } }
      S.pv = pv; S.mode = 'baru';
      S.pil = pv.rows.map(function (x) { return {jenis: x.jenis, kode: x.cocok === 'persis' || x.cocok === 'mirip' ? (x.cocok === 'persis' ? x.kode : '') : '', tanpa: false}; });
      $('pos').textContent = ''; gambarPv();
    } catch (e) { $('pos').innerHTML = '<span class="err">' + esc(e.message || 'Gagal membaca PDF.') + '</span>'; }
    $('pob').disabled = false;
  }
  function belumLengkap() {
    var n = 0; S.pv.rows.forEach(function (x, i) { var p = S.pil[i]; if (p.jenis === 'Barang' && !p.kode && !p.tanpa) n++; }); return n;
  }
  function gambarPv() {
    var pv = S.pv, po = pv.po, rg = po.ringkas || {};
    var h = '<div class="card blk"><h3>PO ' + esc(po.no) + '</h3><div class="dt">' +
      '<div><label>Tanggal</label>' + esc(tgl(po.tgl)) + '</div><div><label>Vendor</label><b>' + esc(po.vendor) + '</b>' + (pv.vendorBaru ? ' <span class="tag w">vendor baru, akan didaftarkan</span>' : '') + '<br><small>' + esc((po.attn ? 'Attn ' + po.attn : '') + (po.telepon ? ' · ' + po.telepon : '')) + '</small></div>' +
      '<div><label>No PPBJ</label>' + esc(po.ppbj) + '<br><small>' + (po.terdaftar ? esc(po.proyek) : '<span class="err">PPBJ ini belum terdaftar di sistem</span>') + '</small></div>' +
      '<div><label>Harga jual</label>' + rp(rg.hargaJual) + '</div><div><label>PPN</label>' + rp(rg.ppn) + '</div><div><label>Total</label><b>' + rp(rg.total) + '</b></div></div>';
    if (pv.duplikat && pv.duplikat.ada) h += '<div class="card" style="border-left:4px solid #b8975a;margin:8px 0"><b>PO ini sudah pernah diunggah.</b> Menyimpan sekarang = <b>revisi PO</b>: versi lama diarsipkan, pembelian lama dibatalkan (hanya bila belum ada barang diterima), pembelian baru dibuat, dan persetujuan diminta ulang.<div class="fr"><input type="text" id="poalasan" placeholder="Alasan revisi (wajib)" style="flex:1;min-width:220px"></div></div>';
    (pv.warn || []).forEach(function (w) { h += '<div class="note">⚠ ' + esc(w) + '</div>'; });
    h += '<div class="note">Rumus PO diperiksa: qty × harga = total tiap baris, jumlah baris = total, dan harga jual − diskon + PPN + biaya lain = total. Harga di sistem disimpan <b>sebelum PPN</b> (harga PO ÷ ' + (1 / (pv.po.faktor || 1)).toFixed(3).replace('.', ',') + ').</div></div>';
    h += '<div class="card"><div class="tw"><table><thead><tr><th>No</th><th>Nama di PO</th><th class="nm">Qty</th><th class="nm">Harga PO</th><th class="nm">Sebelum PPN</th><th>Jenis</th><th>Barang di database</th></tr></thead><tbody>';
    pv.rows.forEach(function (x, i) { h += '<tr data-i="' + i + '"><td>' + x.no + '</td><td>' + esc(x.nama) + '</td><td class="nm">' + esc(String(x.qty).replace('.', ',')) + ' ' + esc(x.satuan || '') + '</td><td class="nm">' + angka(x.harga) + '</td><td class="nm">' + angka(x.hargaNet) + '</td><td id="pj' + i + '"></td><td id="pk' + i + '"></td></tr>'; });
    h += '</tbody></table></div><datalist id="podl">' + (BR || []).map(function (b) { return '<option value="' + esc(b.nama) + '">' + esc(b.kode) + '</option>'; }).join('') + '</datalist>';
    h += (pv.duplikat && pv.duplikat.ada) ? '' : '<div class="fr"><label><input type="radio" name="pomd" value="baru" checked> PO baru (barang belum datang)</label><label><input type="radio" name="pomd" value="lama"> PO lama (barang sudah datang, stok tidak ditambah)</label></div>';
    h += '<div id="poinfo" class="note"></div><div class="fr"><button class="sv" id="posv">' + ((pv.duplikat && pv.duplikat.ada) ? 'Simpan revisi PO' : 'Simpan PO') + '</button><button class="gh" id="pobt">Batal</button></div></div>';
    $('pov').innerHTML = h;
    pv.rows.forEach(function (x, i) { barisUi(i); });
    $('pobt').onclick = unggah; $('posv').onclick = simpan; if ($('poalasan')) $('poalasan').oninput = status;
    Array.prototype.forEach.call(document.getElementsByName('pomd'), function (r) { r.onchange = function () { S.mode = this.value; }; });
    status();
  }
  function status() {
    var n = belumLengkap(), pv = S.pv, dup = pv.duplikat && pv.duplikat.ada, bt = $('posv');
    $('poinfo').innerHTML = n ? '<span class="err">' + n + ' baris barang belum dipilih: pilih dari database, tandai Jasa, atau tandai "belum terdaftar".</span>' : '';
    var al = $('poalasan'); bt.disabled = !!(n || S.busy || !pv.po.terdaftar || (dup && !(al && al.value.trim())));
  }
  function barisUi(i) {
    var x = S.pv.rows[i], p = S.pil[i], j = $('pj' + i), k = $('pk' + i);
    j.innerHTML = '<select><option value="Barang"' + (p.jenis === 'Barang' ? ' selected' : '') + '>Barang</option><option value="Jasa"' + (p.jenis === 'Jasa' ? ' selected' : '') + '>Jasa</option></select>';
    j.firstChild.onchange = function () { p.jenis = this.value; barisUi(i); status(); };
    if (p.jenis === 'Jasa') { k.innerHTML = '<span class="note">Jasa: tidak masuk stok</span>'; return; }
    var cur = p.kode ? (BR || []).filter(function (b) { return b.kode === p.kode; })[0] : null;
    var nm = cur ? cur.nama : (p.kode ? p.kode : '');
    var tag = p.kode ? '<span class="tag ok">' + (x.cocok === 'persis' && p.kode === x.kode ? 'cocok persis' : 'dipilih') + '</span> ' : (p.tanpa ? '<span class="tag w">belum terdaftar</span> ' : (x.cocok === 'mirip' ? '<span class="tag w">mirip, mohon pilih</span> ' : '<span class="tag bad">belum dipilih</span> '));
    k.innerHTML = tag + '<input type="text" list="podl" placeholder="Ketik nama barang" value="' + esc(nm) + '" style="width:100%;margin-top:3px">' +
      (x.cocok === 'mirip' && x.opsi && x.opsi.length ? '<div class="note">Usulan: ' + x.opsi.map(function (o) { return '<a href="#" data-k="' + esc(o.kode) + '">' + esc(o.nama) + '</a>'; }).join(' · ') + '</div>' : '') +
      (x.ref ? '<div class="note">Harga terakhir dibayar Rp ' + angka(x.ref.terakhir.harga) + ' (' + esc(x.ref.terakhir.vendor) + '); termurah Rp ' + angka(x.ref.murah.harga) + ' (' + esc(x.ref.murah.vendor) + ')' + (x.ref.naikPersen != null && x.ref.naikPersen > 0 ? ' · harga PO ini <span class="tag ' + (x.ref.tingkat === 'merah' ? 'bad' : x.ref.tingkat === 'kuning' ? 'w' : 'n') + '">naik ' + String(x.ref.naikPersen).replace('.', ',') + '%</span>' : '') + '</div>' : '') +
      (x.stok && x.stok.pesan ? '<div class="note"><span class="tag ' + (x.stok.tingkat === 'merah' ? 'bad' : x.stok.tingkat === 'kuning' ? 'w' : 'n') + '">' + (x.stok.tingkat === 'merah' ? 'stok sudah cukup' : x.stok.tingkat === 'kuning' ? 'sudah dipesan' : 'info stok') + '</span> ' + esc(x.stok.pesan) + '</div>' : '') +
      '<label class="note"><input type="checkbox"' + (p.tanpa ? ' checked' : '') + '> belum terdaftar di database (tanpa kode)</label>';
    var inp = k.querySelector('input[type=text]');
    inp.onchange = function () { var h = (BR || []).filter(function (b) { return b.nama === inp.value; })[0]; p.kode = h ? h.kode : ''; if (h) p.tanpa = false; barisUi(i); status(); };
    k.querySelector('input[type=checkbox]').onchange = function () { p.tanpa = this.checked; if (this.checked) p.kode = ''; barisUi(i); status(); };
    Array.prototype.forEach.call(k.querySelectorAll('a[data-k]'), function (a) { a.onclick = function (e) { e.preventDefault(); p.kode = a.getAttribute('data-k'); p.tanpa = false; barisUi(i); status(); }; });
  }
  async function simpan() {
    if (S.busy) return; if (belumLengkap()) { toast('Masih ada baris barang yang belum dipilih.', true); return; }
    var pv = S.pv, rev = !!(pv.duplikat && pv.duplikat.ada);
    if (S.mode === 'lama' && !confirm('PO ini dicatat sebagai SUDAH DATANG LENGKAP. Stok tidak ditambah (dianggap sudah tercatat). Lanjutkan?')) return;
    var mirip = 0; pv.rows.forEach(function (x, i) { if (x.cocok === 'mirip' && S.pil[i].jenis === 'Barang' && S.pil[i].kode && S.pil[i].kode !== x.kode) mirip++; });
    S.busy = true; status(); $('poinfo').textContent = 'Menyiapkan file...';
    try {
      var fl = await siapFile([S.file]); $('poinfo').textContent = 'Menyimpan...';
      var baris = S.pil.map(function (p) { return p.jenis === 'Jasa' ? {jenis: 'Jasa'} : (p.kode ? {jenis: 'Barang', kode: p.kode} : {jenis: 'Barang', tanpaKode: true}); });
      var r = rev ? await api({action: 'poRevisi', po: S.po, baris: baris, files: fl, alasan: $('poalasan').value.trim()}) : await api({action: 'poSimpan', po: S.po, baris: baris, files: fl, mode: S.mode});
      if (!r.ok) { toast(r.msg || 'Gagal menyimpan.', true); $('poinfo').innerHTML = '<span class="err">' + esc(r.msg || 'Gagal menyimpan.') + '</span>'; }
      else { toast(r.msg || 'PO tersimpan.'); S.busy = false; await muat(); U.tampil('daftar'); return; }
    } catch (e) { toast(e.message || 'Gagal.', true); }
    S.busy = false; if ($('posv')) status();
  }

  function stPo(s) { return /Ditolak|Dibatalkan/.test(s) ? 'bad' : /Diterima lengkap/.test(s) ? 'ok' : /Menunggu|Berjalan/.test(s) ? 'w' : 'n'; }
  /* ---------- Daftar PO ---------- */
  async function daftar() {
    app.innerHTML = U.nav('daftar') + '<div class="msg">Memuat...</div>'; U.pasangNav();
    try { var r = await api({action: 'poList'}); if (!r.ok) { toast(r.msg || 'Gagal.', true); return; } S.lst = r.data || []; } catch (e) { toast('Gagal terhubung ke server.', true); return; }
    gambarDaftar('');
  }
  function gambarDaftar(q) {
    var l = S.lst.filter(function (x) { return !q || (x.no + ' ' + x.vendor + ' ' + x.ppbj + ' ' + x.proyek + ' ' + x.nomorPm).toLowerCase().indexOf(q.toLowerCase()) >= 0; });
    app.innerHTML = U.nav('daftar') + '<div class="card"><div class="fl"><input type="text" id="poq" placeholder="Cari No PO, vendor, PPBJ, proyek" value="' + esc(q) + '" style="flex:1;min-width:180px"><button class="gh" id="por">Muat ulang</button></div>' +
      (l.length ? '<div class="tw"><table><thead><tr><th>No PO</th><th>Tanggal</th><th>Vendor</th><th>PPBJ / Proyek</th><th>Isi</th><th class="nm">Total</th><th>Status</th><th></th></tr></thead><tbody>' + l.map(function (x, i) { return '<tr><td><b>' + esc(x.no) + '</b></td><td>' + esc(tgl(x.tgl)) + '</td><td>' + esc(x.vendor) + '</td><td>' + esc(x.ppbj) + '<small>' + esc(x.proyek) + '</small></td><td>' + x.nBarang + ' barang' + (x.nJasa ? ', ' + x.nJasa + ' jasa' : '') + '</td><td class="nm">' + rp(x.total) + '</td><td><span class="tag ' + stPo(x.status) + '">' + esc(x.status) + (x.versi > 1 ? ' · v' + x.versi : '') + '</span>' + (x.stPembelian ? '<small>Pembelian: ' + esc(x.stPembelian) + '</small>' : '') + (x.jenis && /Lama/.test(x.jenis) ? '<small>PO lama</small>' : '') + '<small>' + esc(x.nomorPm) + '</small></td><td><button class="gh" data-no="' + esc(x.no) + '">Buka</button></td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="msg">Belum ada PO.</div>') + '</div><div id="pod"></div>';
    U.pasangNav();
    $('poq').oninput = function () { var v = this.value; clearTimeout(gambarDaftar.h); gambarDaftar.h = setTimeout(function () { gambarDaftar(v); var e = $('poq'); if (e) { e.focus(); e.setSelectionRange(v.length, v.length); } }, 250); };
    $('por').onclick = daftar;
    Array.prototype.forEach.call(app.querySelectorAll('button[data-no]'), function (b) { b.onclick = function () { detail(b.getAttribute('data-no')); }; });
  }
  async function detail(no) {
    var box = $('pod'); box.innerHTML = '<div class="msg">Memuat...</div>';
    try { var r = await api({action: 'poDetail', no: no}); if (!r.ok) { toast(r.msg || 'Gagal.', true); box.innerHTML = ''; return; } S.det = r; } catch (e) { toast('Gagal terhubung ke server.', true); return; }
    var m = S.det.po, rg = S.det.ringkas || {};
    box.innerHTML = '<div class="card blk"><h3>PO ' + esc(m.no) + ' · ' + esc(m.vendor) + '</h3><div class="note">PPBJ ' + esc(m.ppbj) + ' · ' + esc(m.proyek) + ' · diunggah ' + esc(m.oleh) + ' ' + esc(m.waktu) + (m.nomorPm ? ' · Pembelian ' + esc(m.nomorPm) : '') + '</div>' +
      '<div class="fr"><span class="tag ' + stPo(m.status) + '">' + esc(m.status) + '</span> <span class="note">Versi ' + m.versi + (m.penyetuju ? ' · penyetuju ' + esc(m.penyetuju) : '') + (m.wPutus ? ' · diputuskan ' + esc(m.wPutus) : '') + (m.cPutus ? ' · catatan: ' + esc(m.cPutus) : '') + (m.tglKirim ? ' · dikirim ke vendor ' + esc(tgl(m.tglKirim)) : '') + (m.izin ? ' · berjalan atas izin ' + esc(m.izin) : '') + '</span></div>' + aksiPo(m) +
      '<div class="tw"><table><thead><tr><th>No</th><th>Nama di PO</th><th>Jenis</th><th>Kode</th><th class="nm">Qty</th><th class="nm">Harga PO</th><th class="nm">Harga PPBJ</th><th class="nm">Selisih</th><th class="nm">Sebelum PPN</th><th class="nm">Total</th></tr></thead><tbody>' + S.det.rows.map(function (x) { return '<tr><td>' + x.no + '</td><td>' + esc(x.nama) + (x.namaSistem && x.namaSistem !== x.nama ? '<small>Di sistem: ' + esc(x.namaSistem) + '</small>' : '') + '</td><td>' + esc(x.jenis) + '</td><td>' + esc(x.kode || '-') + '</td><td class="nm">' + esc(String(x.qty).replace('.', ',')) + ' ' + esc(x.satuan) + '</td><td class="nm">' + angka(x.harga) + '</td><td class="nm">' + (x.hargaAng ? angka(x.hargaAng) : '-') + '</td><td class="nm">' + (x.selisih === null || x.selisih === undefined ? '-' : '<span style="' + (x.selisih > 0 ? 'color:#a82424;font-weight:700' : '') + '">' + (x.selisih > 0 ? '+' : '') + String(x.selisih).replace('.', ',') + '%</span>') + '</td><td class="nm">' + angka(x.hargaNet) + '</td><td class="nm">' + angka(x.total) + '</td></tr>'; }).join('') + '</tbody></table></div>' +
      (S.det.versiLama && S.det.versiLama.length ? '<div class="note"><b>Riwayat revisi:</b> ' + S.det.versiLama.map(function (v) { return 'versi ' + v.versi + ' diganti ' + esc(v.waktu) + ' oleh ' + esc(v.oleh) + ' (' + esc(v.alasan) + ')'; }).join('; ') + '</div>' : '') +
      '<div class="note">Harga jual ' + rp(rg.hargaJual) + ' · PPN ' + rp(rg.ppn) + ' · <b>Total ' + rp(rg.total) + '</b></div>' +
      '<h3 style="margin:10px 0 4px">File PO</h3><div>' + (S.det.files.length ? S.det.files.map(function (f) { return '<div class="at"><span>' + esc(f.nama) + '<br><small>' + esc(f.oleh || '') + ' ' + esc(f.waktu || '') + '</small></span><button class="gh" data-f="' + esc(f.id) + '">Unduh</button></div>'; }).join('') : '<div class="note">Belum ada file.</div>') + '</div>' +
      '<div class="fr"><input type="file" id="pol" accept="application/pdf,.pdf"><button class="gh" id="polb">Tambah PDF</button></div></div>';
    Array.prototype.forEach.call(box.querySelectorAll('button[data-f]'), function (b) { b.onclick = function () { unduh(m.no, b.getAttribute('data-f'), b); }; });
    Array.prototype.forEach.call(box.querySelectorAll('button[data-a]'), function (b) { b.onclick = function () { aksi(m, b.getAttribute('data-a'), b); }; });
    var rb = document.createElement('div'); rb.className = 'fr'; rb.innerHTML = '<button class="gh" id="rwl">Riwayat lengkap PO ini</button>'; box.firstChild.appendChild(rb); $('rwl').onclick = function () { riwayat('po', m.no); };
    $('polb').onclick = async function () {
      var f = $('pol').files && $('pol').files[0]; if (!f) { toast('Pilih PDF dulu.', true); return; } this.disabled = true;
      try { var fl = await siapFile([f]); var r = await api({action: 'poLampir', no: m.no, files: fl}); toast(r.msg || (r.ok ? 'Tersimpan.' : 'Gagal.'), !r.ok); if (r.ok) detail(m.no); } catch (e) { toast(e.message || 'Gagal.', true); }
      this.disabled = false;
    };
    box.scrollIntoView && box.scrollIntoView({behavior: 'smooth', block: 'start'});
  }
  function aksiPo(m) {
    var b = '';
    if (m.status === 'Menunggu persetujuan' || /^Berjalan/.test(m.status)) b += '<button class="gh" data-a="minta">Kirim ulang permintaan persetujuan</button> ';
    if (m.status === 'Menunggu persetujuan') b += '<button class="gh" data-a="jalan">Jalankan tanpa tanda tangan</button> ';
    if (m.status === 'Disetujui' || (/^Berjalan/.test(m.status) && !m.tglKirim)) b += '<button class="sv" data-a="kirim">Tandai dikirim ke vendor</button> ';
    if (!/Ditolak|Dibatalkan/.test(m.status)) b += '<button class="gh" data-a="batal">Batalkan PO</button> ';
    if (!/Lama/.test(m.jenis || '') && m.status !== 'Diterima lengkap') b += '<span class="note">Revisi: unggah PDF PO yang direvisi di tab Unggah PO (No PO yang sama).</span>';
    return b ? '<div class="fr">' + b + '</div>' : '';
  }
  async function aksi(m, a, btn) {
    var body;
    if (a === 'minta') body = {action: 'poMinta', no: m.no};
    else if (a === 'jalan') { var iz = prompt('PO akan berjalan dulu tanpa tanda tangan penyetuju. Siapa yang mengizinkan?'); if (!iz) return; body = {action: 'poIzinJalan', no: m.no, izin: iz}; }
    else if (a === 'kirim') { var t = prompt('Tanggal dikirim ke vendor (YYYY-MM-DD):', new Date().toISOString().slice(0, 10)); if (!t) return; body = {action: 'poKirimVendor', no: m.no, tgl: t}; }
    else if (a === 'batal') { var al = prompt('Alasan membatalkan PO ' + m.no + ' (wajib):'); if (!al || !al.trim()) return; if (!confirm('Batalkan PO ' + m.no + '? Pembelian terkait juga dibatalkan dan tidak bisa dipulihkan.')) return; body = {action: 'poBatal', no: m.no, alasan: al}; }
    btn.disabled = true;
    try { var r = await api(body); toast(r.msg || (r.ok ? 'Selesai.' : 'Gagal.'), !r.ok); if (r.ok) { await daftar(); detail(m.no); return; } } catch (e) { toast('Gagal terhubung ke server.', true); }
    btn.disabled = false;
  }
  async function unduh(no, fid, btn) {
    btn.disabled = true;
    try {
      var r = await api({action: 'poFile', no: no, fileId: fid}); if (!r.ok) { toast(r.msg || 'Gagal.', true); btn.disabled = false; return; }
      var bin = atob(r.data), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([u], {type: r.mime || 'application/pdf'})); a.download = (function () { var asli = String(r.nama || 'po.pdf'), em = /\.([A-Za-z0-9]{2,5})$/.exec(asli); return NB.buat(em ? em[1] : 'pdf', 'PO ' + no, asli.replace(/^\d+-/, '').replace(/\.[A-Za-z0-9]{2,5}$/, '')); })(); document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
    } catch (e) { toast('Gagal mengunduh.', true); }
    btn.disabled = false;
  }

  /* ---------- UMO dan realisasi ---------- */
  function tglId(s) { var m = /^(\d{4})-(\d\d)-(\d\d)/.exec(String(s || '')); return m ? m[3] + '/' + m[2] + '/' + m[1] : String(s || ''); }
  /** Susunan baris Form Realisasi Pengajuan Uang Muka (array-of-arrays; angka tetap angka). */
  U.formAoa = function (d) {
    var a = [['FORM REALISASI PENGAJUAN UANG MUKA'], [], ['Nomor pengajuan', d.nomor], ['Diajukan oleh / departemen', d.pengaju + (d.dept ? ' / ' + d.dept : '')], ['Keperluan', d.perihal], ['No PPBJ', d.ppbj || '-'], ['Proyek', d.proyek || '-'], [],
      ['Uang Muka', d.uangMuka], ['Aktual', d.aktual], ['Lebih / (kurang)', d.selisih], ['Keterangan', 'Terlampir realisasi dalam format excel'], [], ['Rincian realisasi'], ['Tanggal', 'Uraian', 'No Akun', 'No Bukti', 'Nilai']];
    d.entries.forEach(function (e) { a.push([tglId(e.tgl), e.uraian, e.akun || '', e.bukti || '', e.nilai]); });
    a.push(['', '', '', 'Total', d.aktual], [], ['Yang mengajukan', '', 'Kepala Departemen / Direktur', '', 'Keuangan'], [], [], [d.penandatangan.pengaju, '', '', '', '']);
    return a;
  };
  /** Susunan baris Laporan Kas Kecil: kas masuk = uang muka, pengeluaran = tiap baris realisasi, saldo di akhir. */
  U.kasAoa = function (d) {
    var a = [['LAPORAN KAS KECIL PURCHASING'], ['Pengajuan ' + d.nomor + ' · ' + d.pengaju], [], ['Tanggal', 'No PPBJ', 'Uraian', 'Keterangan', 'Penerimaan', 'Pengeluaran', 'Kode Akun', 'Keterangan']];
    a.push([tglId(d.tglSetuju ? d.tglSetuju.split('/').reverse().join('-') : ''), d.ppbj || '', 'Kas Masuk', d.perihal, d.uangMuka, '', '', '']);
    var saldo = d.uangMuka;
    d.entries.forEach(function (e) { saldo = Math.round((saldo - e.nilai) * 100) / 100; a.push([tglId(e.tgl), d.ppbj || '', e.uraian, e.bukti || '', '', e.nilai, e.akun || '', e.cat || '']); });
    a.push(['', '', 'Saldo akhir', '', '', saldo, '', ''], [], ['Dibuat', 'Diperiksa', 'Disetujui'], [], [], [d.penandatangan.dibuat, d.penandatangan.diperiksa, d.penandatangan.disetujui]);
    return a;
  };
  function unduhAoa(aoa, nama, lembar) {
    if (typeof XLSX === 'undefined' || !XLSX.utils) { toast('Pembuat Excel belum termuat, coba lagi sebentar.', true); return; }
    var ws = XLSX.utils.aoa_to_sheet(aoa), wb = XLSX.utils.book_new(); ws['!cols'] = [{wch: 26}, {wch: 40}, {wch: 20}, {wch: 24}, {wch: 16}, {wch: 16}, {wch: 14}, {wch: 30}];
    XLSX.utils.book_append_sheet(wb, ws, lembar); XLSX.writeFile(wb, nama);
  }
  var UM = {f: 'semua', data: []};
  async function umo() {
    app.innerHTML = U.nav('umo') + '<div class="msg">Memuat...</div>'; U.pasangNav();
    try { var r = await api({action: 'umoList'}); if (!r.ok) { toast(r.msg || 'Gagal.', true); return; } UM.data = r.data || []; } catch (e) { toast('Gagal terhubung ke server.', true); return; }
    gambarUmo();
  }
  function gambarUmo() {
    var l = UM.data.filter(function (x) { return UM.f === 'semua' || (UM.f === 'ppbj' && x.menungguPpbj) || (UM.f === 'real' && x.status === 'Disetujui' && !x.selesai) || (UM.f === 'ttd' && x.selesai && x.tanda.status !== 'Disetujui'); });
    var nP = UM.data.filter(function (x) { return x.menungguPpbj; }).length;
    app.innerHTML = U.nav('umo') + '<div class="card"><h3 style="margin-top:0">UMO <span class="tag ' + (nP ? 'bad' : 'ok') + '">' + nP + ' menunggu PPBJ</span></h3><div class="note">UMO harus memiliki PPBJ. Untuk UMO tanpa PPBJ, kirim pesan pengingat ke pemohon (tombol Salin pesan, lalu tempel di aplikasi pesan Anda), lalu isi No PPBJ-nya di sini.</div>' +
      '<div class="fr"><select id="umf"><option value="semua">Semua UMO</option><option value="ppbj">Menunggu PPBJ</option><option value="real">Realisasi belum ditutup</option><option value="ttd">Menunggu tanda tangan realisasi</option></select></div>' +
      (l.length ? '<div class="tw"><table><thead><tr><th>Nomor / Pengaju</th><th>Perihal</th><th>PPBJ</th><th class="nm">Uang muka</th><th class="nm">Aktual</th><th>Status</th><th></th></tr></thead><tbody>' + l.map(function (x) { return '<tr><td><b>' + esc(x.nomor) + '</b><small>' + esc(x.pengaju) + (x.dept ? ' · ' + esc(x.dept) : '') + '</small></td><td>' + esc(x.perihal) + '</td><td>' + (x.menungguPpbj ? '<span class="tag bad">Menunggu PPBJ · ' + x.hari + ' hari</span>' : esc(x.ppbj)) + '</td><td class="nm">' + rp(x.total) + '</td><td class="nm">' + rp(x.realisasi) + '</td><td><span class="tag ' + (x.status === 'Disetujui' ? 'n' : 'w') + '">' + esc(x.status) + '</span><small>Realisasi: ' + esc(x.stReal) + '</small>' + (x.selesai ? '<small>Tanda tangan: ' + esc(x.tanda.status) + '</small>' : '') + '</td><td>' + (x.menungguPpbj ? '<button class="gh" data-m="' + esc(x.id) + '">Pesan ke pemohon</button> <button class="gh" data-pp="' + esc(x.id) + '">Isi PPBJ</button> ' : '') + (x.status === 'Disetujui' ? '<button class="gh" data-r="' + esc(x.id) + '">Realisasi</button>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="msg">Tidak ada UMO.</div>') + '</div><div id="umod"></div>';
    U.pasangNav(); $('umf').value = UM.f; $('umf').onchange = function () { UM.f = this.value; gambarUmo(); };
    Array.prototype.forEach.call(app.querySelectorAll('button[data-m]'), function (b) { b.onclick = function () { var x = UM.data.filter(function (z) { return z.id === b.getAttribute('data-m'); })[0]; pesanUmo(x); }; });
    Array.prototype.forEach.call(app.querySelectorAll('button[data-pp]'), function (b) { b.onclick = async function () {
      var v = prompt('No PPBJ untuk UMO ini:'); if (!v) return; b.disabled = true;
      try { var r = await api({action: 'umoSetPpbj', id: b.getAttribute('data-pp'), ppbj: v}); toast(r.msg || (r.ok ? 'Tersimpan.' : 'Gagal.'), !r.ok); if (r.ok) umo(); } catch (e) { toast('Gagal terhubung ke server.', true); }
      b.disabled = false; }; });
    Array.prototype.forEach.call(app.querySelectorAll('button[data-r]'), function (b) { b.onclick = function () { realisasi(b.getAttribute('data-r')); }; });
  }
  function salin(id) { var t = $(id); t.select(); var ok = false; try { ok = document.execCommand('copy'); } catch (e) { /* abaikan */ } try { if (navigator.clipboard) navigator.clipboard.writeText(t.value); ok = true; } catch (e2) { /* abaikan */ } toast(ok ? 'Pesan disalin.' : 'Blok teks lalu salin manual.', !ok); }
  function pesanUmo(x) {
    $('umod').innerHTML = '<div class="card blk"><h3 style="margin-top:0">Pesan ke pemohon (' + esc(x.nomor) + ')</h3><textarea id="umt" style="width:100%;min-height:150px;padding:9px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--ink);font:inherit">' + esc(x.pesan) + '</textarea><div class="fr"><button class="sv" id="umc">Salin pesan</button></div></div>';
    $('umc').onclick = function () { salin('umt'); }; $('umod').scrollIntoView && $('umod').scrollIntoView({behavior: 'smooth', block: 'start'});
  }
  async function realisasi(id) {
    var box = $('umod'); box.innerHTML = '<div class="msg">Memuat...</div>'; var dt, lp;
    try { dt = await api({action: 'rlDetail', id: id}); lp = await api({action: 'rlLaporan', id: id}); } catch (e) { toast('Gagal terhubung ke server.', true); return; }
    if (!dt.ok || !lp.ok) { toast((dt.msg || lp.msg) || 'Gagal.', true); box.innerHTML = ''; return; }
    var m = dt.meta, d = lp.data, ps = d.persetujuan, tutup = m.selesai;
    box.innerHTML = '<div class="card blk"><h3 style="margin-top:0">Realisasi ' + esc(m.nomor) + ' · ' + esc(m.pengaju) + '</h3><div class="note">' + esc(m.perihal) + ' · PPBJ ' + esc(m.ppbj || '-') + '</div>' +
      '<div class="sum"><div><b>' + rp(m.total) + '</b><span>Uang muka</span></div><div><b>' + rp(m.realisasi) + '</b><span>Aktual</span></div><div><b>' + rp(m.realisasi - m.total) + '</b><span>Lebih / (kurang)</span></div><div><b>' + esc(m.stReal) + '</b><span>Status realisasi</span></div></div>' +
      (tutup ? '<div id="rbpanel"></div>' : '') +
      (dt.entries.filter(function (e) { return e.jenis === 'Realisasi'; }).length ? '<div class="tw"><table><thead><tr><th>Tanggal</th><th>Uraian</th><th>No Akun</th><th>No Bukti</th><th>Nota</th><th class="nm">Nilai</th><th></th></tr></thead><tbody>' + dt.entries.filter(function (e) { return e.jenis === 'Realisasi'; }).map(function (e) { return '<tr class="' + (e.status !== 'Aktif' ? 'can' : '') + '"><td>' + esc(tglId(e.tgl)) + '</td><td>' + esc(e.uraian) + (e.cat ? '<small>' + esc(e.cat) + '</small>' : '') + (e.status !== 'Aktif' ? '<small>Dibatalkan: ' + esc(e.batalAlasan) + '</small>' : '') + '</td><td>' + esc(e.akun || '-') + '</td><td>' + esc(e.bukti || '-') + '</td><td>' + (e.nota || []).map(function (f, i) { return '<a href="#" data-n="' + esc(e.id) + '|' + esc(f.id) + '|' + esc(f.nama) + '">foto ' + (i + 1) + '</a>'; }).join(' ') + '</td><td class="nm">' + rp(e.nilai) + '</td><td>' + (e.status === 'Aktif' && !tutup ? '<button class="gh" data-x="' + esc(e.id) + '">Batalkan</button>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="note">Belum ada catatan realisasi.</div>') +
      (tutup ? '<div class="note">Realisasi sudah ditutup. Untuk mengubah, minta admin membuka kembali.</div>' : '<h3 style="margin:12px 0 4px">Tambah catatan realisasi</h3><div class="pgf"><div><label>Tanggal</label><input type="text" id="rtg" placeholder="YYYY-MM-DD" value="' + hariIni() + '"></div><div style="grid-column:span 2"><label>Uraian (apa yang dibelanjakan)</label><input type="text" id="rur"></div><div><label>Nilai</label><input type="text" inputmode="decimal" id="rni"></div><div><label>No Akun (isi manual)</label><input type="text" id="rak" placeholder="mis. 5132.005"></div><div><label>No Bukti / Nota</label><input type="text" id="rbu"></div><div style="grid-column:1/-1"><label>Catatan (wajib bila melebihi toleransi)</label><input type="text" id="rca"></div></div><div class="fr"><label class="gh" style="padding:9px 13px;border:1px solid var(--line);border-radius:8px;cursor:pointer">Foto nota<input type="file" id="rfo" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,image/*,application/pdf" style="display:none"></label><span class="note" id="rfn"></span><button class="sv" id="rsv">Simpan catatan</button><button class="gh" id="rtp">Tutup realisasi</button></div>') +
      '<div class="fr"><button class="gh" id="rfm">Unduh Form Realisasi (Excel)</button><button class="gh" id="rkk">Unduh Laporan Kas Kecil (Excel)</button></div></div>';
    $('rfm').onclick = function () { unduhAoa(U.formAoa(d), NB.buat('xlsx', 'Form Realisasi UMO', d.nomor, d.pengaju), 'Form Realisasi'); };
    $('rkk').onclick = function () { unduhAoa(U.kasAoa(d), NB.buat('xlsx', 'Laporan Kas Kecil', d.nomor, d.pengaju), 'Kas Kecil'); };
    if ($('rmin')) $('rmin').onclick = async function () { this.disabled = true; try { var r = await api({action: 'rlMinta', id: id}); toast(r.msg || (r.ok ? 'Terkirim.' : 'Gagal.'), !r.ok); } catch (e) { toast('Gagal terhubung ke server.', true); } this.disabled = false; };
    Array.prototype.forEach.call(box.querySelectorAll('a[data-n]'), function (a) { a.onclick = async function (ev) { ev.preventDefault(); var p = a.getAttribute('data-n').split('|');
      try { var r = await api({action: 'rlNota', rid: p[0], fileId: p[1]}); if (!r.ok) { toast(r.msg || 'Gagal.', true); return; } var bin = atob(r.data), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); var l = document.createElement('a'); l.href = URL.createObjectURL(new Blob([u], {type: r.mime})); l.download = r.nama || 'nota'; document.body.appendChild(l); l.click(); setTimeout(function () { URL.revokeObjectURL(l.href); l.remove(); }, 4000); } catch (e) { toast('Gagal mengunduh.', true); } }; });
    Array.prototype.forEach.call(box.querySelectorAll('button[data-x]'), function (b) { b.onclick = async function () { var al = prompt('Alasan membatalkan catatan ini?'); if (!al) return; b.disabled = true;
      try { var r = await api({action: 'rlHapus', rid: b.getAttribute('data-x'), alasan: al}); toast(r.msg || (r.ok ? 'Dibatalkan.' : 'Gagal.'), !r.ok); if (r.ok) realisasi(id); } catch (e) { toast('Gagal terhubung ke server.', true); } b.disabled = false; }; });
    if ($('rfo')) { var FL = []; $('rfo').onchange = function () { FL = Array.prototype.slice.call(this.files); $('rfn').textContent = FL.length + ' file dipilih'; };
      $('rsv').onclick = async function () {
        var nilai = numIn($('rni').value), ur = $('rur').value.trim(); if (!ur || !(nilai > 0)) { toast('Isi uraian dan nilai lebih dari 0.', true); return; } this.disabled = true;
        try { var fl = FL.length ? await siapFile(FL) : []; var r = await api({action: 'rlSimpan', id: id, tgl: $('rtg').value.trim(), uraian: ur, nilai: nilai, akun: $('rak').value.trim(), bukti: $('rbu').value.trim(), catatan: $('rca').value.trim(), files: fl}); toast(r.msg || (r.ok ? 'Tersimpan.' : 'Gagal.'), !r.ok); if (r.ok) { realisasi(id); return; } } catch (e) { toast(e.message || 'Gagal.', true); }
        this.disabled = false; };
      $('rtp').onclick = async function () { var c = prompt('Catatan penutupan (kosongkan bila selisih kecil dan sudah sesuai):', ''); if (c === null) return; if (!confirm('Tutup realisasi? Setelah ditutup, gabungkan PDF-nya lalu kirim ke ' + d.penandatangan.disetujui + ' untuk tanda tangan.')) return; this.disabled = true;
        try { var r = await api({action: 'rlTutup', id: id, catatan: c}); toast(r.msg || (r.ok ? 'Ditutup.' : 'Gagal.'), !r.ok); if (r.ok) { umo().then(function () { realisasi(id); }); return; } } catch (e) { toast('Gagal terhubung ke server.', true); } this.disabled = false; };
    }
    if (tutup && $('rbpanel') && window.RealBerkas) window.RealBerkas.pasang($('rbpanel'), {id: id, d: d, dt: dt, api: api, esc: esc, rp: rp, toast: toast});
    box.scrollIntoView && box.scrollIntoView({behavior: 'smooth', block: 'start'});
  }

  /* ---------- Klaim vendor ---------- */
  var KL = {semua: false, data: []};
  async function klaim() {
    app.innerHTML = U.nav('klaim') + '<div class="msg">Memuat...</div>'; U.pasangNav();
    try { var r = await api({action: 'klaimList'}); if (!r.ok) { toast(r.msg || 'Gagal.', true); return; } KL.data = r.data || []; } catch (e) { toast('Gagal terhubung ke server.', true); return; }
    gambarKlaim();
  }
  function gambarKlaim() {
    var l = KL.data.filter(function (x) { return KL.semua || x.status === 'Terbuka'; }), ter = KL.data.filter(function (x) { return x.status === 'Terbuka'; }).length;
    app.innerHTML = U.nav('klaim') + '<div class="card"><h3 style="margin-top:0">Klaim vendor <span class="tag ' + (ter ? 'w' : 'ok') + '">' + ter + ' terbuka</span></h3><div class="note">Barang rusak atau salah kirim yang dicatat gudang saat penerimaan. Tidak masuk stok dan tidak dihitung diterima, sehingga PO tetap menunggu penggantian.</div>' +
      '<div class="fr"><label><input type="checkbox" id="klall"' + (KL.semua ? ' checked' : '') + '> tampilkan yang sudah selesai</label></div>' +
      (l.length ? '<div class="tw"><table><thead><tr><th>Waktu</th><th>PO / Vendor</th><th>Barang</th><th class="nm">Qty</th><th>Jenis</th><th>Status</th><th></th></tr></thead><tbody>' + l.map(function (x) { return '<tr><td>' + esc(x.waktu) + '<small>' + esc(x.oleh) + '</small></td><td><b>' + esc(x.po) + '</b><small>' + esc(x.vendor) + '</small></td><td>' + esc(x.nama) + (x.ket ? '<small>' + esc(x.ket) + '</small>' : '') + '</td><td class="nm">' + esc(String(x.qty).replace('.', ',')) + ' ' + esc(x.satuan) + '</td><td>' + esc(x.jenis) + '</td><td><span class="tag ' + (x.status === 'Terbuka' ? 'w' : 'ok') + '">' + esc(x.status) + '</span>' + (x.cSelesai ? '<small>' + esc(x.cSelesai) + '</small>' : '') + '</td><td>' + (x.status === 'Terbuka' ? '<button class="gh" data-p="' + esc(x.id) + '">Pesan ke vendor</button> <button class="gh" data-s="' + esc(x.id) + '">Tutup klaim</button>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="msg">Tidak ada klaim.</div>') + '</div><div id="klpesan"></div>';
    U.pasangNav();
    $('klall').onchange = function () { KL.semua = this.checked; gambarKlaim(); };
    Array.prototype.forEach.call(app.querySelectorAll('button[data-p]'), function (b) { b.onclick = function () { pesanKlaim(b.getAttribute('data-p')); }; });
    Array.prototype.forEach.call(app.querySelectorAll('button[data-s]'), function (b) { b.onclick = async function () {
      var c = prompt('Catatan penyelesaian (mis. diganti vendor, dikreditkan, ditarik):'); if (!c) return; b.disabled = true;
      try { var r = await api({action: 'klaimSelesai', id: b.getAttribute('data-s'), catatan: c}); toast(r.msg || (r.ok ? 'Selesai.' : 'Gagal.'), !r.ok); if (r.ok) klaim(); } catch (e) { toast('Gagal terhubung ke server.', true); }
      b.disabled = false; }; });
  }
  async function pesanKlaim(id) {
    var box = $('klpesan'); box.innerHTML = '<div class="msg">Menyusun pesan...</div>';
    try { var r = await api({action: 'klaimPesan', id: id}); if (!r.ok) { toast(r.msg || 'Gagal.', true); box.innerHTML = ''; return; }
      box.innerHTML = '<div class="card blk"><h3 style="margin-top:0">Pesan ke vendor (' + r.jumlah + ' barang)</h3><textarea id="klt" style="width:100%;min-height:170px;padding:9px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--ink);font:inherit">' + esc(r.teks) + '</textarea><div class="fr"><button class="sv" id="klc">Salin pesan</button></div></div>';
      $('klc').onclick = function () { var t = $('klt'); t.select(); var ok = false; try { ok = document.execCommand('copy'); } catch (e) { /* abaikan */ } try { if (navigator.clipboard) navigator.clipboard.writeText(t.value); ok = true; } catch (e) { /* abaikan */ } toast(ok ? 'Pesan disalin.' : 'Blok teks lalu salin manual.', !ok); };
      box.scrollIntoView && box.scrollIntoView({behavior: 'smooth', block: 'start'});
    } catch (e) { toast('Gagal terhubung ke server.', true); }
  }

  /* ---------- Perjalanan PPBJ ---------- */
  async function jalan(ppbj) {
    if (!S.lst) { try { var rl = await api({action: 'poList'}); S.lst = (rl && rl.data) || []; } catch (e) { S.lst = []; } }
    var pp = {}; S.lst.forEach(function (x) { if (x.ppbj) pp[x.ppbj] = x.proyek; });
    app.innerHTML = U.nav('jalan') + '<div class="card"><h3 style="margin-top:0">Perjalanan PPBJ</h3><div class="note">Dari barang ORDER di PPBJ sampai PO dan barang tiba di gudang.</div><div class="fr"><input type="text" id="jp" list="jdl" placeholder="No PPBJ" value="' + esc(ppbj) + '" style="flex:1;min-width:200px"><button id="jb">Lihat</button></div><datalist id="jdl">' + Object.keys(pp).map(function (k) { return '<option value="' + esc(k) + '">' + esc(pp[k]) + '</option>'; }).join('') + '</datalist></div><div id="jh"></div>';
    U.pasangNav(); $('jb').onclick = function () { cariJalan($('jp').value.trim(), pp); }; $('jp').onkeydown = function (e) { if (e.key === 'Enter') $('jb').click(); };
    if (ppbj) jalanTampil(ppbj);
  }
  /** Cari pintar: ketik No PPBJ, sebagian No PPBJ, atau nama proyek. Satu hasil langsung dibuka, beberapa hasil jadi pilihan. */
  async function cariJalan(q, pp) {
    if (!q) { toast('Isi No PPBJ atau nama proyek.', true); return; }
    if (pp && pp[q]) { jalanTampil(q); return; }
    var h = $('jh'); h.innerHTML = '<div class="msg">Mencari...</div>'; var r;
    try { r = await api({action: 'trackCari', q: q}); } catch (e) { toast('Gagal terhubung ke server.', true); h.innerHTML = ''; return; }
    var hs = (r && r.ok && r.hasil) || [];
    if (!hs.length) { jalanTampil(q); return; }
    if (hs.length === 1) { $('jp').value = hs[0].ppbj; jalanTampil(hs[0].ppbj); return; }
    h.innerHTML = '<div class="card"><b>' + hs.length + ' proyek cocok dengan "' + esc(q) + '"</b>. Pilih salah satu:' + hs.map(function (x) { return '<div class="fr"><button class="gh" data-jp="' + esc(x.ppbj) + '">' + esc(x.ppbj) + '</button> <span>' + esc(x.proyek || '') + (x.dept ? ' · ' + esc(x.dept) : '') + '</span></div>'; }).join('') + '</div>';
    Array.prototype.forEach.call(h.querySelectorAll('button[data-jp]'), function (b) { b.onclick = function () { $('jp').value = b.getAttribute('data-jp'); jalanTampil(b.getAttribute('data-jp')); }; });
  }
  /** PDF lewat dialog cetak peramban: nama berkas usulan = judul halaman (jenis dokumen - No PPBJ - proyek, tanpa tanggal unduh). */
  function cetakJalan(r) {
    var lama = document.title, nm = (window.NB && NB.buat ? NB.buat('', 'Perjalanan PPBJ', r.ppbj, r.proyek) : 'Perjalanan PPBJ ' + r.ppbj).replace(/\.$/, '');
    document.title = nm; document.body.classList.add('cetak-jalan');
    var sel = function () { document.title = lama; document.body.classList.remove('cetak-jalan'); window.removeEventListener('afterprint', sel); };
    window.addEventListener('afterprint', sel); try { window.print(); } catch (e) { sel(); }
  }
  async function jalanTampil(ppbj) {
    if (!ppbj) { toast('Isi No PPBJ.', true); return; } var h = $('jh'); h.innerHTML = '<div class="msg">Memuat...</div>';
    try { var r = await api({action: 'poPerjalanan', ppbj: ppbj}); if (!r.ok) { h.innerHTML = '<div class="card err">' + esc(r.msg || 'Gagal.') + '</div>'; return; }
      var rg = r.ringkas;
      h.innerHTML = (r.tanpaPo ? '<div class="note"><span class="tag n">Tidak perlu PO</span> ' + esc(r.tanpaPo.alasan) + ' <small>Ditandai ' + esc(r.tanpaPo.oleh) + (r.tanpaPo.waktu ? ' · ' + esc(r.tanpaPo.waktu) : '') + '</small></div>' : '') + '<div class="card blk"><b>' + esc(r.ppbj) + '</b> · ' + esc(r.proyek) + '<div class="sum"><div><b>' + rg.barang + '</b><span>Barang</span></div><div><b>' + rg.belumPo + '</b><span>Belum dibuatkan PO</span></div><div><b>' + rg.lengkap + '</b><span>Sudah datang lengkap</span></div><div><b>' + r.po.length + '</b><span>PO</span></div></div>' +
        '<div class="tw"><table><thead><tr><th>Barang</th><th class="nm">RAB</th><th class="nm">Dipesan</th><th class="nm">Datang</th><th class="nm">Sisa</th><th>Status</th><th>PO</th></tr></thead><tbody>' + r.rows.map(function (x) { return '<tr><td>' + esc(x.nama) + '<small>' + esc(x.kode || 'tanpa kode') + '</small></td><td class="nm">' + (x.qtyRab ? esc(String(x.qtyRab).replace('.', ',')) : '-') + '</td><td class="nm">' + esc(String(x.qPo).replace('.', ',')) + '</td><td class="nm">' + esc(String(x.qTerima).replace('.', ',')) + '</td><td class="nm">' + esc(String(x.sisa).replace('.', ',')) + '</td><td><span class="tag ' + (x.status === 'Sudah datang lengkap' ? 'ok' : x.status === 'Belum dibuatkan PO' ? 'bad' : 'w') + '">' + esc(x.status) + '</span></td><td>' + x.po.map(function (p) { return esc(p.no) + '<small>' + esc(p.vendor) + '</small>'; }).join('') + '</td></tr>'; }).join('') + '</tbody></table></div></div>' +
        (r.pesan ? '<div class="card"><b>Pesan untuk pemohon (barang yang sudah tiba)</b><textarea id="jt" style="width:100%;min-height:150px;margin-top:6px;padding:9px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--ink);font:inherit">' + esc(r.pesan) + '</textarea><div class="fr"><button class="sv" id="jc">Salin pesan</button></div></div>' : '<div class="note">Belum ada barang yang tiba, jadi belum ada pesan untuk pemohon.</div>');
      h.insertAdjacentHTML('afterbegin', '<div class="card" id="jgr"><b>Posisi dan garis waktu</b>' + garisHtml(r) + '</div>');
      h.insertAdjacentHTML('afterbegin', '<div class="fr"><button class="gh" id="jpdf">Cetak / simpan PDF</button></div>'); $('jpdf').onclick = function () { cetakJalan(r); };
      h.insertAdjacentHTML('afterbegin', '<div class="fr"><button class="gh" id="jlk">Tautan pelacakan untuk pemohon</button></div>'); $('jlk').onclick = function () { lacakDialog(ppbj); }; h.insertAdjacentHTML('afterbegin', '<div class="fr"><button class="gh" id="jrw">Riwayat lengkap PPBJ</button></div>'); $('jrw').onclick = function () { riwayat('ppbj', ppbj); };
      if ($('jc')) $('jc').onclick = function () { var t = $('jt'); t.select(); var ok = false; try { ok = document.execCommand('copy'); } catch (e) { /* abaikan */ } try { if (navigator.clipboard) navigator.clipboard.writeText(t.value); ok = true; } catch (e) { /* abaikan */ } toast(ok ? 'Pesan disalin.' : 'Blok teks lalu salin manual.', !ok); };
    } catch (e) { toast('Gagal terhubung ke server.', true); h.innerHTML = ''; }
  }

  /* ---------- Vendor ---------- */
  async function vendor() {
    app.innerHTML = U.nav('vendor') + '<div class="msg">Memuat...</div>'; U.pasangNav();
    try { var r = await api({action: 'venList'}); if (!r.ok) { toast(r.msg || 'Gagal.', true); return; } S.ven = r.data || []; } catch (e) { toast('Gagal terhubung ke server.', true); return; }
    try { var kv = await api({action: 'vendorKartu'}); S.kartu = kv.ok ? kv.data : []; } catch (e) { S.kartu = []; }
    gambarVendor('');
  }
  function gambarVendor(q) {
    var l = S.ven.filter(function (x) { return !q || (x.nama + ' ' + x.attn + ' ' + x.telepon + ' ' + x.email).toLowerCase().indexOf(q.toLowerCase()) >= 0; });
    app.innerHTML = U.nav('vendor') + '<div class="card"><h3 style="margin-top:0">Tambah / ubah vendor</h3><div class="pgf"><div><label>Nama vendor</label><input type="text" id="vn"></div><div><label>Attn / kontak</label><input type="text" id="va"></div><div><label>Telepon</label><input type="text" id="vt"></div><div><label>Email</label><input type="text" id="ve"></div><div><label>Alamat</label><input type="text" id="vl"></div></div>' +
      '<div class="fr"><button class="sv" id="vs">Simpan vendor</button><span class="note">Nama yang sama (huruf besar/kecil diabaikan) diperbarui, isian kosong tidak menghapus data lama.</span></div>' +
      '<div class="fr"><input type="file" id="vf" accept=".xlsx,.xls,.csv"><button class="gh" id="vi">Unggah daftar vendor (Excel)</button></div><div class="note">Kolom yang dikenali: Nama / Vendor / Supplier, Attn / Kontak / PIC, Telepon / Phone / HP, Email, Alamat. Baris pertama = judul kolom.</div></div>' +
      '<div class="card"><div class="fl"><input type="text" id="vq" placeholder="Cari vendor" value="' + esc(q) + '" style="flex:1;min-width:180px"></div>' +
      (l.length ? '<div class="tw"><table><thead><tr><th>Vendor</th><th>Attn</th><th>Telepon</th><th>Email</th><th>Alamat</th><th class="nm">PO</th><th class="nm">Rata-rata tunggu</th><th>Sumber</th></tr></thead><tbody>' + l.map(function (x) { return '<tr><td><b>' + esc(x.nama) + '</b></td><td>' + esc(x.attn) + '</td><td>' + esc(x.telepon) + '</td><td>' + esc(x.email) + '</td><td>' + esc(x.alamat) + '</td><td class="nm">' + x.nPo + '</td><td class="nm">' + (x.tunggu === null || x.tunggu === undefined ? '-' : String(x.tunggu).replace('.', ',') + ' hari<small>' + x.nTerima + ' penerimaan</small>') + '</td><td>' + esc(x.sumber) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="msg">Belum ada vendor. Vendor otomatis terdaftar saat PO diunggah.</div>') + '</div>';
    (S.kartu && S.kartu.length ? app.insertAdjacentHTML('beforeend', kartuVendorHtml(q)) : 0); U.pasangNav();
    $('vq').oninput = function () { var v = this.value; clearTimeout(gambarVendor.h); gambarVendor.h = setTimeout(function () { gambarVendor(v); var e = $('vq'); if (e) { e.focus(); e.setSelectionRange(v.length, v.length); } }, 250); };
    $('vs').onclick = async function () {
      var nm = $('vn').value.trim(); if (!nm) { toast('Isi nama vendor.', true); return; } this.disabled = true;
      try { var r = await api({action: 'venSimpan', nama: nm, attn: $('va').value, telepon: $('vt').value, email: $('ve').value, alamat: $('vl').value}); toast(r.msg || (r.ok ? 'Tersimpan.' : 'Gagal.'), !r.ok); if (r.ok) vendor(); } catch (e) { toast('Gagal terhubung ke server.', true); }
      this.disabled = false;
    };
    $('vi').onclick = impor;
  }
  function kolom(h) {
    var s = String(h || '').toLowerCase().replace(/[^a-z]/g, '');
    if (/^(nama|namavendor|vendor|supplier|namasupplier|perusahaan)$/.test(s)) return 'nama';
    if (/^(attn|kontak|pic|up|namakontak|contact)$/.test(s)) return 'attn';
    if (/^(telepon|telp|tlp|phone|hp|nohp|notelepon|notelp|telepon)$/.test(s)) return 'telepon';
    if (/^(email|mail|surel)$/.test(s)) return 'email';
    if (/^(alamat|address)$/.test(s)) return 'alamat';
    return '';
  }
  U.bacaVendor = function (aoa) {
    var h = (aoa[0] || []).map(kolom), out = [];
    if (h.indexOf('nama') < 0) return {err: 'Kolom nama vendor tidak ditemukan. Judul kolom harus ada di baris pertama (Nama / Vendor / Supplier).'};
    for (var i = 1; i < aoa.length; i++) { var o = {}, a = false; h.forEach(function (k, j) { if (k) { var v = String(aoa[i][j] == null ? '' : aoa[i][j]).trim(); if (v) { o[k] = v; a = true; } } }); if (a) out.push(o); }
    return {rows: out};
  };
  async function impor() {
    var f = $('vf').files && $('vf').files[0]; if (!f) { toast('Pilih file Excel dulu.', true); return; }
    if (typeof XLSX === 'undefined') { toast('Pembaca Excel belum termuat, coba lagi sebentar.', true); return; }
    this.disabled = true;
    try {
      var wb = XLSX.read(await f.arrayBuffer(), {type: 'array'}), aoa = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {header: 1, defval: ''}), b = U.bacaVendor(aoa);
      if (b.err) { toast(b.err, true); this.disabled = false; return; }
      if (!b.rows.length) { toast('Tidak ada baris vendor.', true); this.disabled = false; return; }
      if (!confirm(b.rows.length + ' baris vendor akan diunggah. Lanjutkan?')) { this.disabled = false; return; }
      var r = await api({action: 'venImpor', rows: b.rows}); toast(r.msg || (r.ok ? 'Selesai.' : 'Gagal.'), !r.ok); if (r.ok) vendor();
    } catch (e) { toast(e.message || 'Gagal membaca Excel.', true); }
    this.disabled = false;
  }


  /* ---------- Antrean kerja harian (Tambahan 55) ---------- */
  async function antrean() {
    app.innerHTML = U.nav('antrean') + '<div class="msg">Memuat...</div>'; U.pasangNav();
    var r; try { r = await api({action: 'pengAntrean'}); } catch (e) { toast('Gagal terhubung ke server.', true); return; }
    if (!r.ok) { toast(r.msg || 'Gagal.', true); return; }
    setBadge(r); var h = '<div class="card"><h3 style="margin-top:0">Antrean kerja Pengadaan <span class="tag ' + (r.total ? 'bad' : 'ok') + '">' + r.total + ' perlu tindakan</span></h3><div class="note">Daftar ini dihitung ulang setiap dibuka. Tekan "Buka" untuk menuju layar yang sesuai.</div></div>';
    r.grup.forEach(function (g) {
      if (!g.n) return;
      h += '<div class="card"><h3 style="margin-top:0">' + esc(g.judul) + ' <span class="tag w">' + g.n + '</span> <button class="gh" data-ab="' + esc(g.tab) + '">Buka</button></h3>' + (g.info ? '<div class="note">' + esc(g.info) + '</div>' : '') +
        '<div class="tw"><table><tbody>' + g.items.map(function (x) { return '<tr><td><b>' + esc(x.judul) + '</b>' + (x.tingkat ? ' <span class="tag ' + (x.tingkat === 'merah' ? 'bad' : 'w') + '">' + (x.tingkat === 'merah' ? 'terlambat' : 'perlu dipantau') + '</span>' : '') + '<div class="note">' + esc(x.ket || '') + '</div></td><td class="nm">' + (x.hari ? x.hari + ' hari' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>' + (g.n > g.items.length ? '<div class="note">Menampilkan ' + g.items.length + ' dari ' + g.n + '.</div>' : '') + '</div>';
    });
    if (!r.grup.some(function (g) { return g.n; })) h += '<div class="card"><div class="note">Tidak ada pekerjaan tertunda. Semua beres.</div></div>';
    app.innerHTML = U.nav('antrean') + h; U.pasangNav();
    Array.prototype.forEach.call(app.querySelectorAll('button[data-ab]'), function (b) { b.onclick = function () { U.tampil(b.getAttribute('data-ab')); }; });
  }
  /* ---------- Rekap PO (Tambahan 55) ---------- */
  var RK = {f: {dari: '', sampai: '', vendor: '', ppbj: '', status: '', detail: false}, r: null};
  U.rekapAoa = function (r, detail) {
    if (detail) return [['No PO', 'Tanggal', 'Vendor', 'No PPBJ', 'Status PO', 'No', 'Barang / Jasa', 'Jenis', 'Kode', 'Satuan', 'Qty PO', 'Harga PO (incl PPN)', 'Harga sebelum PPN', 'Total', 'Qty diterima']].concat((r.detail || []).map(function (x) { return [x.no, x.tgl, x.vendor, x.ppbj, x.statusPo, x.urut, x.nama, x.jenis, x.kode, x.satuan, x.qty, x.harga, x.hargaNet, x.total, x.diterima == null ? '' : x.diterima]; }));
    return [['No PO', 'Tanggal', 'Vendor', 'No PPBJ', 'Proyek', 'Jenis', 'Status PO', 'Status penerimaan', 'Total', 'Tgl dikirim ke vendor']].concat((r.data || []).map(function (m) { return [m.no, m.tgl, m.vendor, m.ppbj, m.proyek, m.jenis, m.status, m.stPembelian, m.total, m.tglKirim]; }));
  };
  async function rekap() {
    app.innerHTML = U.nav('rekap') + periodeKartu() + '<div class="card"><h3 style="margin-top:0">Rekap PO (saring)</h3><div class="note">Saring lalu unduh sebagai Excel. "Rincian per barang" menghasilkan satu baris untuk setiap barang pada PO (maksimal 120 PO).</div>' +
      '<div class="pgf"><div><label>Dari tanggal</label><input type="text" id="rk1" placeholder="YYYY-MM-DD"></div><div><label>Sampai tanggal</label><input type="text" id="rk2" placeholder="YYYY-MM-DD"></div><div><label>Vendor</label><input type="text" id="rk3"></div><div><label>No PPBJ / proyek</label><input type="text" id="rk4"></div>' +
      '<div><label>Status PO</label><select id="rk5"><option value="">Semua</option><option>Menunggu persetujuan</option><option>Disetujui</option><option>Ditolak</option><option>Dibatalkan</option><option>Dikirim ke vendor</option><option>Berjalan (tanda tangan menyusul)</option><option>Diterima lengkap (lama)</option></select></div>' +
      '<div><label><input type="checkbox" id="rk6"> Rincian per barang</label></div></div><div class="fr"><button id="rkc">Tampilkan</button><button class="gh" id="rkx">Unduh Excel</button></div></div><div id="rkh"></div>';
    U.pasangNav(); periodeSiap();
    var F = RK.f; $('rk1').value = F.dari; $('rk2').value = F.sampai; $('rk3').value = F.vendor; $('rk4').value = F.ppbj; $('rk5').value = F.status; $('rk6').checked = F.detail;
    function ambil() { F.dari = $('rk1').value.trim(); F.sampai = $('rk2').value.trim(); F.vendor = $('rk3').value.trim(); F.ppbj = $('rk4').value.trim(); F.status = $('rk5').value; F.detail = $('rk6').checked; }
    async function tarik() {
      ambil(); $('rkc').disabled = true;
      try { var r = await api({action: 'poRekap', dari: F.dari, sampai: F.sampai, vendor: F.vendor, ppbj: F.ppbj, status: F.status, detail: F.detail}); if (!r.ok) { toast(r.msg || 'Gagal.', true); } else { RK.r = r; tampil(); } } catch (e) { toast('Gagal terhubung ke server.', true); }
      $('rkc').disabled = false;
    }
    function tampil() {
      var r = RK.r; if (!r) return;
      $('rkh').innerHTML = '<div class="card"><div class="sum"><div><b>' + r.jumlah + '</b><span>PO</span></div><div><b>' + rp(r.total) + '</b><span>Total nilai</span></div></div>' + (r.terpotong ? '<div class="note">Hasil dibatasi; persempit saringan untuk melihat semuanya.</div>' : '') +
        (r.data.length ? '<div class="tw"><table><thead><tr><th>No PO</th><th>Tanggal</th><th>Vendor</th><th>PPBJ</th><th>Status</th><th class="nm">Total</th></tr></thead><tbody>' + r.data.slice(0, 200).map(function (m) { return '<tr><td>' + esc(m.no) + '</td><td>' + tgl(m.tgl) + '</td><td>' + esc(m.vendor) + '</td><td>' + esc(m.ppbj) + '</td><td>' + esc(m.status) + '</td><td class="nm">' + angka(m.total) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="note">Tidak ada PO yang cocok.</div>') + '</div>';
    }
    $('rkc').onclick = tarik;
    $('rkx').onclick = async function () { await tarik(); if (RK.r && RK.r.data.length) unduhAoa(U.rekapAoa(RK.r, F.detail), NB.buat('xlsx', 'Rekap PO', F.detail ? 'per barang' : ''), 'Rekap PO'); else toast('Tidak ada data untuk diunduh.', true); };
    if (RK.r) tampil();
  }


  /* ---------- Revisi PPBJ (Tambahan 56) ---------- */
  var RV = {semua: false, data: []};
  async function revisi() {
    app.innerHTML = U.nav('revisi') + '<div class="msg">Memuat...</div>'; U.pasangNav();
    try { var r = await api({action: 'revisiList'}); if (!r.ok) { toast(r.msg || 'Gagal.', true); return; } RV.data = r.data || []; } catch (e) { toast('Gagal terhubung ke server.', true); return; }
    gambarRevisi();
  }
  function salinTeks(t) { var ok = false, ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { ok = document.execCommand('copy'); } catch (e) { /* abaikan */ } ta.remove(); try { if (navigator.clipboard) { navigator.clipboard.writeText(t); ok = true; } } catch (e) { /* abaikan */ } toast(ok ? 'Pesan disalin.' : 'Salin manual dari kotak teks.', !ok); }
  /** Catatan tindakan revisi: pilihan cepat + kolom bebas. */
  function catatanRevisi(petunjuk, kirim) {
    var d = document.createElement('div'), cepat = ['PO direvisi', 'Vendor dihubungi', 'Tidak perlu diubah']; d.id = 'trkm';
    d.innerHTML = '<div><h3 style="margin-top:0">Tandai revisi sudah ditangani</h3>' + (petunjuk ? '<div class="note">' + esc(petunjuk) + '</div>' : '') + '<div class="fr">' + cepat.map(function (c) { return '<button class="gh" data-cc="' + esc(c) + '">' + esc(c) + '</button>'; }).join('') + '</div><input type="text" id="rvc" maxlength="190" placeholder="Catatan tindakan (wajib; pilih di atas atau ketik sendiri)" style="width:100%;box-sizing:border-box"><div class="fr"><button class="sv" id="rvs">Simpan</button><button class="gh" id="rvx">Batal</button></div></div>';
    document.body.appendChild(d); d.onclick = function (e) { if (e.target === d) d.remove(); };
    Array.prototype.forEach.call(d.querySelectorAll('button[data-cc]'), function (b) { b.onclick = function () { var t = $('rvc'); t.value = (t.value ? t.value.replace(/[\s.]+$/, '') + '. ' : '') + b.getAttribute('data-cc'); t.focus(); }; });
    $('rvx').onclick = function () { d.remove(); }; $('rvs').onclick = function () { var v = $('rvc').value.trim(); if (!v) { toast('Isi catatan tindakan.', true); return; } d.remove(); kirim(v); }; $('rvc').focus();
  }
  function gambarRevisi() {
    var q = (RV.q || '').toLowerCase(), cocok = function (x) { return !q || (x.ppbj + ' ' + x.nama + ' ' + x.kode + ' ' + (x.alasan || '') + ' ' + (x.po || '')).toLowerCase().indexOf(q) >= 0; };
    var l = RV.data.filter(function (x) { return (RV.semua || x.status === 'Perlu tindakan') && cocok(x); }), n = RV.data.filter(function (x) { return x.status === 'Perlu tindakan'; }).length, G = {}, urutG = [];
    l.forEach(function (x) { var k = x.kelompok || (x.ppbj + '|' + String(x.waktu).slice(0, 16)); if (!G[k]) { G[k] = {k: k, ppbj: x.ppbj, waktu: x.waktu, oleh: x.oleh, alasan: x.alasan, umur: x.umur || 0, tingkat: '', rows: []}; urutG.push(k); } var g = G[k]; g.rows.push(x); if (x.tingkat === 'merah' || (x.tingkat === 'kuning' && g.tingkat !== 'merah')) g.tingkat = x.tingkat; });
    RV.list = l;
    var grup = urutG.map(function (k) {
      var g = G[k], perlu = g.rows.filter(function (x) { return x.status === 'Perlu tindakan'; }).length;
      return '<div class="card"><b>Revisi PPBJ ' + esc(g.ppbj) + '</b> · ' + g.rows.length + ' barang berubah · ' + perlu + ' perlu tindakan ' + (perlu ? '<span class="tag ' + (g.tingkat === 'merah' ? 'bad' : g.tingkat === 'kuning' ? 'w' : 'n') + '">' + (g.umur || 0) + ' hari</span>' : '<span class="tag ok">selesai</span>') +
        '<div class="note">' + esc(g.waktu) + ' oleh ' + esc(g.oleh) + (g.alasan ? ' · <b>Alasan:</b> ' + esc(g.alasan) : ' · <i>alasan tidak dicatat (revisi lama)</i>') + '</div>' +
        '<div class="tw"><table><thead><tr><th>Barang</th><th>Perubahan</th><th>PO terkait dan petunjuk</th><th>Status</th><th></th></tr></thead><tbody>' + g.rows.map(function (x) {
          var idx = RV.list.indexOf(x), pos = String(x.po || '').split(',').map(function (t) { return t.trim(); }).filter(Boolean);
          return '<tr><td><b>' + esc(x.nama) + '</b><small>' + (x.jenis === 'Jasa' ? 'Jasa' : esc(x.kode)) + '</small></td><td>' + esc(x.ubah) + (x.jenis === 'Jasa' ? '' : '<small>' + String(x.qLama).replace('.', ',') + ' &rarr; ' + String(x.qBaru).replace('.', ',') + '</small>') + '</td><td>' + (pos.length ? pos.map(function (no) { return '<button class="gh" data-bpo="' + esc(no) + '">Buka PO ' + esc(no) + '</button>'; }).join(' ') + (x.jenis === 'Jasa' ? '' : '<small>qty di PO ' + String(x.qPo).replace('.', ',') + (x.sudahDatang ? ' · sudah datang ' + String(x.sudahDatang).replace('.', ',') : '') + '</small>') : '-') + (x.petunjuk ? '<small' + (x.lewat ? ' style="color:var(--bad,#c0392b);font-weight:700"' : '') + '>' + esc(x.petunjuk) + '</small>' : '') + '</td><td><span class="tag ' + (x.status === 'Perlu tindakan' ? 'bad' : 'ok') + '">' + esc(x.status) + '</span>' + (x.cSelesai ? '<small>' + esc(x.cSelesai) + '</small>' : '') + '</td><td>' + (x.status === 'Perlu tindakan' ? '<button class="gh" data-rv="' + esc(x.id) + '" data-ri="' + idx + '">Tandai ditangani</button>' : '') + (x.pesan ? ' <button class="gh" data-rp="' + idx + '">Salin pesan ke vendor</button>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
    }).join('');
    app.innerHTML = U.nav('revisi') + '<div class="card"><h3 style="margin-top:0">Revisi PPBJ <span class="tag ' + (n ? 'bad' : 'ok') + '">' + n + ' perlu tindakan</span></h3><div class="note">Setiap kali kebutuhan (RAB) suatu PPBJ diganti, sistem membandingkan per barang. Barang yang sudah masuk PO <b>tidak diubah otomatis</b>; ditandai "Perlu tindakan" beserta petunjuknya supaya Pengadaan memeriksa PO-nya (revisi PO, hubungi vendor, atau abaikan). Perubahan pada barang yang belum di PO hanya dicatat. Tiap unggahan ulang wajib membawa alasan.</div>' +
      '<div class="fr"><input type="search" id="rvq" placeholder="Cari PPBJ, barang, alasan, atau No PO" value="' + esc(RV.q || '') + '" style="flex:1;min-width:200px"><label><input type="checkbox" id="rvall"' + (RV.semua ? ' checked' : '') + '> tampilkan semua catatan</label></div></div>' +
      (grup || '<div class="card"><div class="note">' + (RV.semua || q ? 'Tidak ada catatan yang cocok.' : 'Tidak ada revisi yang perlu tindakan.') + '</div></div>');
    U.pasangNav(); $('rvall').onchange = function () { RV.semua = this.checked; gambarRevisi(); };
    $('rvq').onkeydown = function (e) { if (e.key === 'Enter') { RV.q = this.value.trim(); gambarRevisi(); var e2 = $('rvq'); if (e2) { e2.focus(); e2.setSelectionRange(e2.value.length, e2.value.length); } } };
    Array.prototype.forEach.call(app.querySelectorAll('button[data-bpo]'), function (b) { b.onclick = function () { lompat('daftar', b.getAttribute('data-bpo')); }; });
    Array.prototype.forEach.call(app.querySelectorAll('button[data-rp]'), function (b) { b.onclick = function () { salinTeks(RV.list[Number(b.getAttribute('data-rp'))].pesan); }; });
    Array.prototype.forEach.call(app.querySelectorAll('button[data-rv]'), function (b) { b.onclick = function () {
      var x = RV.list[Number(b.getAttribute('data-ri'))] || {};
      catatanRevisi(x.petunjuk || '', async function (c) {
        b.disabled = true;
        try { var r = await api({action: 'revisiSelesai', id: b.getAttribute('data-rv'), catatan: c}); toast(r.msg || (r.ok ? 'Tersimpan.' : 'Gagal.'), !r.ok); if (r.ok) revisi(); } catch (e) { toast('Gagal terhubung ke server.', true); }
        b.disabled = false; }); }; });
  }
  /* ---------- Jasa termin (Tambahan 56) ---------- */
  async function termin() {
    app.innerHTML = U.nav('termin') + '<div class="msg">Memuat...</div>'; U.pasangNav();
    var r; try { r = await api({action: 'terminList'}); } catch (e) { toast('Gagal terhubung ke server.', true); return; }
    if (!r.ok) { toast(r.msg || 'Gagal.', true); return; }
    app.innerHTML = U.nav('termin') + '<div class="card"><h3 style="margin-top:0">Jasa termin <span class="tag ' + (r.belumLunas ? 'w' : 'ok') + '">' + r.belumLunas + ' belum lunas</span></h3><div class="note">Pekerjaan jasa pada PO dibayar bertahap. Catat termin secara manual, lalu tandai sudah dibayar. Jumlah termin tidak boleh melebihi nilai jasa.</div></div>' +
      (r.data.length ? r.data.map(function (x) { return '<div class="card"><b>' + esc(x.nama) + '</b> <span class="note">PO ' + esc(x.po) + ' · ' + esc(x.vendor) + '</span>' +
        '<div class="sum"><div><b>' + rp(x.nilai) + '</b><span>Nilai jasa</span></div><div><b>' + rp(x.dijadwalkan) + '</b><span>Terjadwal</span></div><div><b>' + rp(x.dibayar) + '</b><span>Sudah dibayar</span></div><div><b>' + rp(x.sisa) + '</b><span>Sisa</span></div></div>' +
        (x.termin.length ? '<div class="tw"><table><tbody>' + x.termin.map(function (t) { return '<tr><td><b>' + esc(t.termin) + '</b><small>' + esc(t.ket) + '</small></td><td class="nm">' + angka(t.nilai) + '</td><td><span class="tag ' + (t.status === 'Dibayar' ? 'ok' : 'w') + '">' + esc(t.status) + '</span>' + (t.tgl ? '<small>' + tgl(t.tgl) + '</small>' : '') + '</td><td>' + (t.status === 'Dibayar' ? '<button class="gh" data-tb="' + esc(t.id) + '|0">Batal bayar</button>' : '<button class="gh" data-tb="' + esc(t.id) + '|1">Tandai dibayar</button> <button class="gh" data-th="' + esc(t.id) + '">Hapus</button>') + '</td></tr>'; }).join('') + '</tbody></table></div>' : '') +
        '<div class="fr"><input type="text" placeholder="Nama termin" data-tn="' + esc(x.po + '|' + x.urut) + '"><input type="text" placeholder="Nilai" inputmode="numeric" data-tv="' + esc(x.po + '|' + x.urut) + '"><button data-ta="' + esc(x.po + '|' + x.urut) + '">Tambah termin</button></div></div>'; }).join('') : '<div class="card"><div class="note">Belum ada baris jasa pada PO.</div></div>');
    U.pasangNav();
    Array.prototype.forEach.call(app.querySelectorAll('button[data-ta]'), function (b) { b.onclick = async function () {
      var k = b.getAttribute('data-ta'), p = k.split('|'), nm = app.querySelector('input[data-tn="' + k + '"]').value.trim(), nl = numIn(app.querySelector('input[data-tv="' + k + '"]').value); b.disabled = true;
      try { var r2 = await api({action: 'terminSimpan', no: p[0], urut: Number(p[1]), termin: nm, nilai: nl}); toast(r2.msg || (r2.ok ? 'Tersimpan.' : 'Gagal.'), !r2.ok); if (r2.ok) termin(); } catch (e) { toast('Gagal terhubung ke server.', true); }
      b.disabled = false; }; });
    Array.prototype.forEach.call(app.querySelectorAll('button[data-tb]'), function (b) { b.onclick = async function () {
      var p = b.getAttribute('data-tb').split('|'); b.disabled = true;
      try { var r2 = await api({action: 'terminBayar', id: p[0], bayar: p[1] === '1'}); toast(r2.msg || (r2.ok ? 'Tersimpan.' : 'Gagal.'), !r2.ok); if (r2.ok) termin(); } catch (e) { toast('Gagal terhubung ke server.', true); }
      b.disabled = false; }; });
    Array.prototype.forEach.call(app.querySelectorAll('button[data-th]'), function (b) { b.onclick = async function () {
      if (!confirm('Hapus termin ini?')) return; b.disabled = true;
      try { var r2 = await api({action: 'terminBayar', id: b.getAttribute('data-th'), hapus: true}); toast(r2.msg || (r2.ok ? 'Dihapus.' : 'Gagal.'), !r2.ok); if (r2.ok) termin(); } catch (e) { toast('Gagal terhubung ke server.', true); }
      b.disabled = false; }; });
  }
  /* ---------- BOQ proyek SL (Tambahan 56) ---------- */
  /** Baca tempelan/Excel BOQ: kolom Uraian | Satuan | Qty | Harga | Kode (opsional). Baris judul dikenali dan dilewati. */
  U.bacaBoq = function (aoa) {
    var out = [], salah = [];
    (aoa || []).forEach(function (r, i) {
      var c = (r || []).map(function (v) { return String(v == null ? '' : v).trim(); }); if (!c.some(Boolean)) return;
      if (i === 0 && /uraian|nama|pekerjaan|barang/i.test(c[0]) && !(Number(String(c[2]).replace(/\./g, '').replace(',', '.')) > 0)) return;
      var q = Number(String(c[2]).replace(/\./g, '').replace(',', '.')), h = Number(String(c[3]).replace(/[^\d,-]/g, '').replace(/\./g, '').replace(',', '.'));
      if (!c[0] || !(q > 0) || isNaN(h)) { salah.push('baris ' + (i + 1)); return; }
      out.push({uraian: c[0], satuan: c[1], qty: q, harga: h, kode: c[4] || ''});
    });
    return {rows: out, salah: salah};
  };
  U.boqAoa = function (r) {
    return [['No', 'Uraian', 'Satuan', 'Qty', 'Harga rencana', 'Total rencana', 'Harga aktual (PO, sebelum PPN)', 'Total aktual', 'Selisih', 'Selisih %', 'No PO']].concat(r.rows.map(function (x) { return [x.no, x.uraian, x.satuan, x.qty, x.harga, x.rencana, x.aktualHarga == null ? '' : x.aktualHarga, x.aktual == null ? '' : x.aktual, x.selisih == null ? '' : x.selisih, x.persen == null ? '' : x.persen, x.po]; }))
      .concat([['', 'TOTAL', '', '', '', r.totalRencana, '', r.totalAktual, r.selisih, '', '']]);
  };
  async function boq(nama) {
    app.innerHTML = U.nav('boq') + '<div class="msg">Memuat...</div>'; U.pasangNav();
    var r; try { r = await api({action: 'boqList', proyek: nama}); } catch (e) { toast('Gagal terhubung ke server.', true); return; }
    if (!r.ok) { toast(r.msg || 'Gagal.', true); return; }
    if (nama) { boqDetail(r); return; }
    app.innerHTML = U.nav('boq') + '<div class="card"><h3 style="margin-top:0">BOQ proyek SL</h3><div class="note">BOQ berdiri sendiri (terpisah dari PPBJ): daftar uraian, volume, dan harga rencana. Harga aktual diisi otomatis dari PO yang dibuat untuk barang yang sama. Tempel dari Excel dengan kolom <b>Uraian, Satuan, Qty, Harga, Kode (opsional)</b>.</div>' +
      '<div class="pgf"><div><label>Nama proyek SL</label><input type="text" id="bqp"></div><div><label>No PPBJ terkait (opsional)</label><input type="text" id="bqj"></div></div>' +
      '<textarea id="bqt" placeholder="Tempel di sini (salin dari Excel), satu baris per uraian" style="width:100%;min-height:120px;padding:9px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--ink);font:inherit"></textarea>' +
      '<div class="fr"><input type="file" id="bqf" accept=".xlsx,.xls,.csv"><button id="bqs">Simpan BOQ</button></div><div id="bqm" class="note"></div></div>' +
      '<div class="card"><h3 style="margin-top:0">BOQ tersimpan</h3>' + (r.daftar.length ? '<div class="tw"><table><thead><tr><th>Proyek</th><th>PPBJ</th><th class="nm">Baris</th><th class="nm">Total rencana</th><th></th></tr></thead><tbody>' + r.daftar.map(function (d) { return '<tr><td><b>' + esc(d.proyek) + '</b></td><td>' + esc(d.ppbj || '-') + '</td><td class="nm">' + d.baris + '</td><td class="nm">' + angka(d.total) + '</td><td><button class="gh" data-bq="' + esc(d.proyek) + '">Buka</button></td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="note">Belum ada BOQ.</div>') + '</div>';
    U.pasangNav();
    Array.prototype.forEach.call(app.querySelectorAll('button[data-bq]'), function (b) { b.onclick = function () { boq(b.getAttribute('data-bq')); }; });
    $('bqs').onclick = async function () {
      var pr = $('bqp').value.trim(); if (!pr) { toast('Isi nama proyek SL.', true); return; } this.disabled = true;
      try {
        var aoa, f = $('bqf').files && $('bqf').files[0];
        if (f) { if (typeof XLSX === 'undefined') { toast('Pembaca Excel belum termuat.', true); this.disabled = false; return; } var wb = XLSX.read(await f.arrayBuffer(), {type: 'array'}); aoa = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {header: 1, defval: ''}); }
        else aoa = $('bqt').value.split(/\r?\n/).map(function (l) { return l.split(/\t|;/); });
        var b = U.bacaBoq(aoa); if (b.salah.length) { toast('Baris tidak terbaca: ' + b.salah.slice(0, 5).join(', ') + '. Periksa kolom Qty dan Harga.', true); this.disabled = false; return; } if (!b.rows.length) { toast('Tidak ada baris BOQ.', true); this.disabled = false; return; }
        var x = await api({action: 'boqSimpan', proyek: pr, ppbj: $('bqj').value.trim(), rows: b.rows});
        if (x.perlu === 'ganti') { if (confirm('BOQ proyek ini sudah ada. Ganti seluruhnya?')) x = await api({action: 'boqSimpan', proyek: pr, ppbj: $('bqj').value.trim(), rows: b.rows, ganti: true}); else { this.disabled = false; return; } }
        toast(x.msg || (x.ok ? 'Tersimpan.' : 'Gagal.'), !x.ok); if (x.ok) boq(pr);
      } catch (e) { toast(e.message || 'Gagal.', true); }
      this.disabled = false; };
  }
  function boqDetail(r) {
    app.innerHTML = U.nav('boq') + '<div class="card"><h3 style="margin-top:0">BOQ ' + esc(r.proyek) + '</h3><div class="note">PPBJ terkait: ' + esc(r.ppbj || '-') + '. Harga aktual dari PO (sebelum PPN) untuk ' + r.terisi + ' dari ' + r.rows.length + ' baris.</div>' +
      '<div class="sum"><div><b>' + rp(r.totalRencana) + '</b><span>Total rencana</span></div><div><b>' + rp(r.totalAktual) + '</b><span>Total aktual (baris ber-PO)</span></div><div><b>' + rp(r.selisih) + '</b><span>Selisih (baris ber-PO)</span></div></div>' +
      '<div class="tw"><table><thead><tr><th>No</th><th>Uraian</th><th class="nm">Qty</th><th class="nm">Harga rencana</th><th class="nm">Harga aktual</th><th class="nm">Selisih</th><th>PO</th></tr></thead><tbody>' + r.rows.map(function (x) { return '<tr><td>' + x.no + '</td><td>' + esc(x.uraian) + '<small>' + esc(x.satuan) + '</small></td><td class="nm">' + String(x.qty).replace('.', ',') + '</td><td class="nm">' + angka(x.harga) + '</td><td class="nm">' + (x.aktualHarga == null ? '-' : angka(x.aktualHarga)) + '</td><td class="nm">' + (x.selisih == null ? '-' : angka(x.selisih) + ' (' + String(x.persen).replace('.', ',') + '%)') + '</td><td>' + esc(x.po || '') + '</td></tr>'; }).join('') + '</tbody></table></div>' +
      '<div class="fr"><button class="gh" id="bqx">Unduh Excel</button><button class="gh" id="bqk">Kembali</button></div></div>';
    U.pasangNav(); $('bqk').onclick = function () { boq(''); };
    $('bqx').onclick = function () { unduhAoa(U.boqAoa(r), NB.buat('xlsx', 'BOQ', r.proyek), 'BOQ'); };
  }

  /* ---------- Alat umum: cari di tabel, Excel, PDF (Tambahan 57) ---------- */
  function normT(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
  /** Isi tabel yang sedang tampil (kolom tanpa judul, yaitu tombol aksi, dibuang). Baris yang disaring ikut tersaring. */
  U.tabelAoa = function (tb) {
    var ths = Array.prototype.slice.call(tb.querySelectorAll('thead th')), pakai = [], head = [];
    ths.forEach(function (th, i) { var t = (th.textContent || '').trim(); if (t) { pakai.push(i); head.push(t); } });
    var rows = Array.prototype.slice.call(tb.querySelectorAll('tbody tr')).filter(function (tr) { return tr.style.display !== 'none'; }).map(function (tr) {
      var td = tr.children; return pakai.map(function (i) { return td[i] ? String(td[i].innerText || td[i].textContent || '').replace(/\s*\n+\s*/g, ' ').trim() : ''; }); });
    return {head: head, rows: rows};
  };
  U.alat = function () {
    if (!app) return;
    Array.prototype.forEach.call(app.querySelectorAll('.tw'), function (w) {
      if (w.getAttribute('data-alat') || (w.closest && w.closest('#tb'))) return; var tb = w.querySelector('table'); if (!tb) return; w.setAttribute('data-alat', '1');
      var judul = ((w.closest && w.closest('.card') && w.closest('.card').querySelector('h3')) || {textContent: 'Daftar'}).textContent.replace(/\s+/g, ' ').trim().slice(0, 60) || 'Daftar';
      var n = tb.querySelectorAll('tbody tr').length, bar = document.createElement('div'); bar.className = 'fr po-alat';
      bar.innerHTML = (n > 4 ? '<input type="text" class="poq" placeholder="Cari di tabel ini...">' : '') + '<button class="gh" data-ex="x">Excel</button><button class="gh" data-ex="p">PDF</button>';
      w.parentNode.insertBefore(bar, w);
      var inp = bar.querySelector('.poq'); if (inp) inp.oninput = function () { var t = normT(inp.value).split(' ').filter(Boolean); Array.prototype.forEach.call(tb.querySelectorAll('tbody tr'), function (tr) { var tx = normT(tr.textContent); tr.style.display = t.every(function (k) { return tx.indexOf(k) >= 0; }) ? '' : 'none'; }); };
      bar.onclick = function (e) {
        var j = e.target && e.target.getAttribute && e.target.getAttribute('data-ex'); if (!j) return; var d = U.tabelAoa(tb); if (!d.rows.length) { toast('Tidak ada baris untuk diunduh.', true); return; }
        var nama = NB.buat('', judul);
        if (j === 'x') unduhAoa([d.head].concat(d.rows), nama + '.xlsx', judul.slice(0, 28));
        else U.unduhPdf(judul, 'Dicetak ' + new Date().toLocaleDateString('id-ID') + (inp && inp.value ? ' · saringan: ' + inp.value : ''), [{judul: '', kolom: d.head, baris: d.rows}], nama + '.pdf');
      };
    });
  };
  function muatPdf() {
    return new Promise(function (ok, gagal) {
      if (window.jspdf && window.jspdf.jsPDF) { ok(); return; }
      function skrip(u, cb) { var s = document.createElement('script'); s.src = u; s.onload = cb; s.onerror = function () { gagal(new Error('Pembuat PDF tidak bisa dimuat. Periksa koneksi internet.')); }; document.head.appendChild(s); }
      skrip('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', function () { skrip('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js', ok); });
    });
  }
  /** seksi = [{judul, kolom:[], baris:[[]]}]. Dibuat di peramban; tidak ada data yang dikirim ke pihak lain. */
  U.unduhPdf = async function (judul, sub, seksi, nama) {
    try { await muatPdf(); } catch (e) { toast(e.message, true); return false; }
    try {
      var J = window.jspdf.jsPDF, lebar = Math.max.apply(null, seksi.map(function (s) { return s.kolom.length; })), doc = new J({orientation: lebar > 6 ? 'landscape' : 'portrait', unit: 'pt', format: 'a4'}), y = 44;
      doc.setFontSize(14); doc.text(String(judul), 40, y); doc.setFontSize(9); doc.text(String(sub || ''), 40, y + 14); y += 30;
      seksi.forEach(function (s) {
        if (s.judul) { doc.setFontSize(11); doc.text(String(s.judul), 40, y + 8); y += 14; }
        doc.autoTable({head: [s.kolom], body: s.baris.map(function (r) { return r.map(function (c) { return c == null ? '' : String(c); }); }), startY: y, margin: {left: 40, right: 40, bottom: 36}, styles: {fontSize: 8, cellPadding: 3}, headStyles: {fillColor: [26, 108, 171]}});
        y = (doc.lastAutoTable && doc.lastAutoTable.finalY ? doc.lastAutoTable.finalY : y) + 20;
      });
      var n = doc.getNumberOfPages ? doc.getNumberOfPages() : 1;
      for (var i = 1; i <= n; i++) { doc.setPage(i); doc.setFontSize(8); doc.text('Halaman ' + i + ' dari ' + n + '  -  Dicetak ' + new Date().toLocaleString('id-ID'), 40, doc.internal.pageSize.getHeight() - 18); }
      doc.save(nama); return true;
    } catch (e) { toast('Gagal membuat PDF: ' + (e.message || e), true); return false; }
  };
  function unduhBanyak(seksi, nama) {
    if (typeof XLSX === 'undefined' || !XLSX.utils) { toast('Pembuat Excel belum termuat, coba lagi sebentar.', true); return; }
    var wb = XLSX.utils.book_new(); seksi.forEach(function (s, i) { var ws = XLSX.utils.aoa_to_sheet([s.kolom].concat(s.baris)); ws['!cols'] = s.kolom.map(function () { return {wch: 22}; }); XLSX.utils.book_append_sheet(wb, ws, (s.judul || 'Data ' + (i + 1)).replace(/[\\\/\?\*\[\]:]/g, ' ').slice(0, 30)); });
    XLSX.writeFile(wb, nama);
  }
  /* ---------- Pencarian lintas dokumen ---------- */
  async function cari(q) {
    app.innerHTML = U.nav('') + '<div class="msg">Mencari...</div>'; U.pasangNav(); if ($('pocq')) $('pocq').value = q;
    var r; try { r = await api({action: 'pengCari', q: q}); } catch (e) { toast('Gagal terhubung ke server.', true); return; } if (!r.ok) { toast(r.msg || 'Gagal.', true); return; }
    app.innerHTML = U.nav('') + '<div class="card"><h3 style="margin-top:0">Hasil pencarian "' + esc(q) + '" <span class="tag n">' + r.total + '</span></h3><div class="note">Toleran salah ketik dan penulisan nomor ("022 pb x" menemukan 022/PB/X/2026).</div></div>' +
      (r.grup.length ? r.grup.map(function (g) { return '<div class="card"><b>' + esc(g.jenis) + '</b> <span class="tag n">' + g.hasil.length + '</span>' + g.hasil.map(function (x) { return '<div class="at"><span><b>' + esc(x.judul) + '</b><br><small>' + esc(x.ket) + '</small></span><button class="gh" data-cj="' + esc(g.tab) + '" data-cr="' + esc(x.ref) + '">Buka</button></div>'; }).join('') + '</div>'; }).join('') : '<div class="card"><div class="note">Tidak ada yang cocok. Coba kata yang lebih pendek.</div></div>');
    U.pasangNav(); if ($('pocq')) $('pocq').value = q;
    Array.prototype.forEach.call(app.querySelectorAll('button[data-cj]'), function (b) { b.onclick = function () { lompat(b.getAttribute('data-cj'), b.getAttribute('data-cr')); }; });
  }
  function lompat(tab, ref) { if (tab === 'daftar') { daftar().then(function () { detail(ref); }); } else if (tab === 'jalan') jalan(ref); else U.tampil(tab); }
  /* ---------- Papan: mengapa belum datang ---------- */
  var PN = {f: 'macet', b: '', data: [], admin: false};
  var BOLAKLS = {Pengadaan: 'w', Penyetuju: 'n', Vendor: 'bad', Gudang: 'w'};
  function bolaTag(x) { return x.bola ? '<span class="tag ' + (BOLAKLS[x.bola] || 'n') + '">' + esc(x.bola) + '</span>' : '<small>-</small>'; }
  async function papan() {
    app.innerHTML = U.nav('papan') + '<div class="msg">Memuat...</div>'; U.pasangNav();
    try { var r = await api({action: 'papanList'}); if (!r.ok) { toast(r.msg || 'Gagal.', true); return; } PN.data = r.data || []; PN.admin = !!r.admin; } catch (e) { toast('Gagal terhubung ke server.', true); return; }
    gambarPapan();
  }
  function gambarPapan() {
    var l = PN.data.filter(function (x) { return (PN.f === 'semua' || (x.kode !== 'lengkap' && x.kode !== 'tanpapo')) && (!PN.b || x.bola === PN.b); }), mac = PN.data.filter(function (x) { return x.kode !== 'lengkap' && x.kode !== 'tanpapo' && x.tingkat; }).length;
    app.innerHTML = U.nav('papan') + '<div class="card"><h3 style="margin-top:0">Mengapa belum datang <span class="tag ' + (mac ? 'bad' : 'ok') + '">' + mac + ' tersangkut</span></h3><div class="note">Satu baris per PPBJ dengan alasan utamanya, diurutkan dari yang paling mendesak. Terisi otomatis dari data PO, penerimaan, klaim, dan revisi.</div>' +
      '<div class="fr"><select id="pnf"><option value="macet">Yang belum lengkap</option><option value="semua">Semua PPBJ</option></select> <select id="pnb" aria-label="Pemegang bola"><option value="">Semua pemegang bola</option><option>Pengadaan</option><option>Penyetuju</option><option>Vendor</option><option>Gudang</option></select></div>' +
      (l.length ? '<div class="tw"><table><thead><tr><th>PPBJ / Proyek</th><th>Alasan</th><th>Pemegang bola</th><th class="nm">Hari</th><th></th></tr></thead><tbody>' + l.map(function (x) { return '<tr><td><b>' + esc(x.ppbj) + '</b><small>' + esc(x.proyek) + (x.dept ? ' · ' + esc(x.dept) : '') + '</small></td><td><span class="tag ' + (x.tingkat === 'merah' ? 'bad' : x.tingkat === 'kuning' ? 'w' : x.kode === 'lengkap' ? 'ok' : 'n') + '">' + esc(x.alasan) + '</span>' + (x.tpo ? '<small>Ditandai ' + esc(x.tpo.oleh) + (x.tpo.waktu ? ' · ' + esc(x.tpo.waktu) : '') + '</small>' : '') + '</td><td>' + bolaTag(x) + '</td><td class="nm">' + (x.hari || '') + '</td><td><button class="gh" data-dt="' + esc(x.ppbj) + '">Detail</button> <button class="gh" data-pj="' + esc(x.ppbj) + '">Perjalanan</button> <button class="gh" data-pl="' + esc(x.ppbj) + '">Tautan pemohon</button>' + (PN.admin && x.kode === 'belumpo' ? ' <button class="gh" data-tp="' + esc(x.ppbj) + '">Tidak perlu PO</button>' : '') + (PN.admin && x.kode === 'tanpapo' ? ' <button class="gh" data-tl="' + esc(x.ppbj) + '">Batalkan tanda</button>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="note">Tidak ada PPBJ yang tersangkut.</div>') + '</div>';
    U.pasangNav(); $('pnf').value = PN.f; $('pnf').onchange = function () { PN.f = this.value; gambarPapan(); }; $('pnb').value = PN.b; $('pnb').onchange = function () { PN.b = this.value; gambarPapan(); };
    Array.prototype.forEach.call(app.querySelectorAll('button[data-dt]'), function (b) { b.onclick = function () { detailPapan(b.getAttribute('data-dt')); }; });
    Array.prototype.forEach.call(app.querySelectorAll('button[data-pj]'), function (b) { b.onclick = function () { jalan(b.getAttribute('data-pj')); }; });
    Array.prototype.forEach.call(app.querySelectorAll('button[data-pl]'), function (b) { b.onclick = function () { lacakDialog(b.getAttribute('data-pl')); }; });
    Array.prototype.forEach.call(app.querySelectorAll('button[data-tp]'), function (b) { b.onclick = function () { tandaiTanpaPo(b.getAttribute('data-tp')); }; });
    Array.prototype.forEach.call(app.querySelectorAll('button[data-tl]'), function (b) { b.onclick = function () { lepasTanpaPo(b.getAttribute('data-tl')); }; });
  }
  /* ---------- Garis waktu dan detail PPBJ (dipakai Papan dan Perjalanan) ---------- */
  function tglWkt(w) { var m = /^(\d{4})-(\d\d)-(\d\d)(?: (\d\d:\d\d))?/.exec(String(w || '')); return m ? m[3] + '/' + m[2] + '/' + m[1] + (m[4] ? ' ' + m[4] : '') : String(w || ''); }
  function garisHtml(d) {
    var po = d.posisi ? '<div class="note"><b>Posisi sekarang:</b> ' + esc(d.posisi.alasan || '') + (d.posisi.bola ? ' · pemegang bola <b>' + esc(d.posisi.bola) + '</b>' : '') + (d.perkiraanTiba ? ' · perkiraan tiba <b>' + tgl(d.perkiraanTiba) + '</b>' : '') + (d.klaimTerbuka ? ' · <span class="tag bad">' + d.klaimTerbuka + ' klaim vendor terbuka</span>' : '') + '</div>' : '';
    var g = d.garis || [];
    return po + (g.length ? '<ol class="garis" style="list-style:none;margin:8px 0;padding:0 0 0 14px;border-left:3px solid var(--line,#c3ccd3)">' + g.map(function (e) { return '<li style="margin:0 0 9px;padding-left:8px"><b>' + esc(e.jenis) + '</b> <small>' + tglWkt(e.waktu) + '</small><br><span class="note" style="margin:0">' + esc(e.ket) + '</span></li>'; }).join('') + '</ol>' : '<div class="note">Belum ada kejadian tercatat untuk PPBJ ini (belum ada PO).</div>');
  }
  async function detailPapan(ppbj) {
    var r; try { r = await api({action: 'poPerjalanan', ppbj: ppbj}); } catch (e) { toast('Gagal terhubung ke server.', true); return; }
    if (!r.ok) { if (r.tanpaPo) { r = {ok: true}; } else { toast(r.msg || 'Gagal.', true); return; } }
    var d = document.createElement('div'); d.id = 'trkm';
    d.innerHTML = '<div><h3 style="margin-top:0">Detail ' + esc(ppbj) + (r.proyek ? ' · ' + esc(r.proyek) : '') + '</h3>' + garisHtml(r) + '<div class="fr"><button class="gh" id="dtp">Buka Perjalanan lengkap</button><button class="gh" id="dtx">Tutup</button></div></div>';
    document.body.appendChild(d); d.onclick = function (e) { if (e.target === d) d.remove(); }; $('dtx').onclick = function () { d.remove(); }; $('dtp').onclick = function () { d.remove(); jalan(ppbj); };
  }
  /** Admin utama: PPBJ yang memang tidak butuh PO (mis. barang dari stok). Alasan wajib; PO yang diunggah kemudian melepas tanda otomatis. */
  async function tandaiTanpaPo(ppbj) {
    var al = prompt('Alasan PPBJ ' + ppbj + ' tidak perlu PO (wajib):', ''); if (al === null) return; al = al.trim();
    if (!al) { toast('Alasan wajib diisi.', true); return; }
    if (!confirm('Tandai PPBJ ' + ppbj + ' sebagai "Tidak perlu PO"?\nAlasan: ' + al + '\n\nPPBJ keluar dari daftar belum lengkap, tetap tampil di Semua PPBJ. Bisa dibatalkan kapan saja.')) return;
    try { var r = await api({action: 'tpoSet', ppbj: ppbj, alasan: al}); toast(r.msg || (r.ok ? 'Tersimpan.' : 'Gagal.'), !r.ok); if (r.ok) papan(); } catch (e) { toast('Gagal terhubung ke server.', true); }
  }
  async function lepasTanpaPo(ppbj) {
    if (!confirm('Batalkan tanda "Tidak perlu PO" untuk PPBJ ' + ppbj + '? PPBJ kembali masuk daftar belum dibuatkan PO.')) return;
    try { var r = await api({action: 'tpoLepas', ppbj: ppbj}); toast(r.msg || (r.ok ? 'Dibatalkan.' : 'Gagal.'), !r.ok); if (r.ok) papan(); } catch (e) { toast('Gagal terhubung ke server.', true); }
  }
  /** Tautan pelacakan baca-saja untuk pemohon: tanpa harga dan nama vendor, tanpa login. */
  async function lacakDialog(ppbj) {
    var r; try { r = await api({action: 'trackLink', ppbj: ppbj}); } catch (e) { toast('Gagal terhubung ke server.', true); return; } if (!r.ok) { toast(r.msg || 'Gagal.', true); return; }
    var u = new URL('lacak.html', location.href); u.search = ''; u.hash = ''; var url = u.toString() + '?p=' + encodeURIComponent(r.ppbj) + '&t=' + r.token, teks = r.pesanAwal + url + '\n\nTerima kasih.';
    var d = document.createElement('div'); d.id = 'trkm';
    d.innerHTML = '<div><h3 style="margin-top:0">Tautan pelacakan ' + esc(r.ppbj) + '</h3><div class="note">Pemohon dapat memantau progres barang tanpa login. Isinya hanya status dan jumlah barang (tanpa harga dan vendor). Tautan berlaku selama PPBJ berjalan dan sampai 30 hari setelah selesai.</div><textarea id="trkt" style="width:100%;min-height:150px;padding:9px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--ink);font:inherit">' + esc(teks) + '</textarea><div class="fr"><button class="sv" id="trkc">Salin pesan</button><button class="gh" id="trkx">Tutup</button></div></div>';
    document.body.appendChild(d); $('trkx').onclick = function () { d.remove(); };
    $('trkc').onclick = function () { var t = $('trkt'); t.select(); var ok = false; try { ok = document.execCommand('copy'); } catch (e) { /* abaikan */ } try { if (navigator.clipboard) navigator.clipboard.writeText(t.value); ok = true; } catch (e2) { /* abaikan */ } toast(ok ? 'Pesan disalin.' : 'Blok teks lalu salin manual.', !ok); };
  }
  /* ---------- Harga di atas anggaran ---------- */
  async function harga() {
    app.innerHTML = U.nav('harga') + '<div class="msg">Memuat...</div>'; U.pasangNav();
    var r; try { r = await api({action: 'hargaMahalList'}); } catch (e) { toast('Gagal terhubung ke server.', true); return; } if (!r.ok) { toast(r.msg || 'Gagal.', true); return; }
    app.innerHTML = U.nav('harga') + '<div class="card"><h3 style="margin-top:0">Harga PO di atas anggaran PPBJ <span class="tag ' + (r.merah ? 'bad' : r.kuning ? 'w' : 'ok') + '">' + r.merah + ' merah · ' + r.kuning + ' kuning</span></h3><div class="note">Harga PO (termasuk PPN) dibandingkan dengan harga anggaran di PPBJ. Kuning mulai ' + r.batas.k + '%, merah mulai ' + r.batas.m + '%. Batas dapat diubah admin di Pengaturan.</div>' +
      (r.data.length ? '<div class="tw"><table><thead><tr><th>PO / Vendor</th><th>Barang</th><th class="nm">Qty</th><th class="nm">Harga PO</th><th class="nm">Anggaran</th><th class="nm">Selisih</th><th class="nm">Lebih bayar</th></tr></thead><tbody>' + r.data.map(function (x) { return '<tr><td><b>' + esc(x.po) + '</b><small>' + esc(x.vendor) + '</small></td><td>' + esc(x.nama) + '<small>PPBJ ' + esc(x.ppbj) + '</small></td><td class="nm">' + String(x.qty).replace('.', ',') + '</td><td class="nm">' + angka(x.harga) + '</td><td class="nm">' + angka(x.hargaAng) + '</td><td class="nm"><span class="tag ' + (x.tingkat === 'merah' ? 'bad' : 'w') + '">+' + String(x.persen).replace('.', ',') + '%</span></td><td class="nm">' + angka(x.lebih) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="note">Tidak ada PO yang melewati batas.</div>') + '</div>';
    U.pasangNav();
  }
  /* ---------- Akan datang (untuk gudang) ---------- */
  async function akan() {
    app.innerHTML = U.nav('akan') + '<div class="msg">Memuat...</div>'; U.pasangNav();
    var r; try { r = await api({action: 'akanDatang'}); } catch (e) { toast('Gagal terhubung ke server.', true); return; } if (!r.ok) { toast(r.msg || 'Gagal.', true); return; }
    app.innerHTML = U.nav('akan') + '<div class="card"><h3 style="margin-top:0">Barang yang akan datang <span class="tag n">' + r.data.length + ' PO</span></h3><div class="note">PO yang sudah dikirim ke vendor. Perkiraan tiba dihitung dari rata-rata waktu tunggu vendor itu sebelumnya, jadi hanya perkiraan.</div></div>' +
      (r.data.length ? r.data.map(function (x) { return '<div class="card"><b>PO ' + esc(x.po) + '</b> · ' + esc(x.vendor) + '<div class="note">' + esc(x.proyek || x.ppbj) + ' · dikirim ' + tgl(x.tglKirim) + (x.hari != null ? ' (' + x.hari + ' hari lalu)' : '') + (x.perkiraanTiba ? ' · perkiraan tiba <b>' + tgl(x.perkiraanTiba) + '</b>' : '') + '</div><div class="tw"><table><thead><tr><th>Barang</th><th class="nm">Sisa datang</th></tr></thead><tbody>' + x.items.map(function (i) { return '<tr><td>' + esc(i.nama) + '</td><td class="nm">' + String(i.sisa).replace('.', ',') + ' ' + esc(i.satuan) + '</td></tr>'; }).join('') + '</tbody></table></div>' + (r.bisaTerima && x.id && typeof window.buka === 'function' ? '<div class="fr"><button class="sv" data-tb="' + esc(x.id) + '">Terima barang</button></div>' : '') + '</div>'; }).join('') : '<div class="card"><div class="note">Belum ada barang yang sedang dalam perjalanan.</div></div>');
    Array.prototype.forEach.call(app.querySelectorAll('button[data-tb]'), function (b) { b.onclick = function () { window.__dariAkan = true; window.buka(b.getAttribute('data-tb')); }; });
    U.pasangNav();
  }
  /* ---------- Rekap periode (bulanan, tahunan, rentang tanggal) ---------- */
  var RP = {r: null};
  function periodeKartu() {
    var h = new Date().toISOString().slice(0, 10);
    return '<div class="card"><h3 style="margin-top:0">Rekap periode</h3><div class="note">Pembelian (PO), klaim vendor, realisasi UMO, dan jasa termin yang dibayar. Pilih bulan, tahun, atau rentang tanggal bebas; unduh sebagai Excel atau PDF.</div>' +
      '<div class="pgf"><div><label>Periode</label><select id="rpm"><option value="bulan">Bulanan</option><option value="tahun">Tahunan</option><option value="rentang">Rentang tanggal</option></select></div>' +
      '<div class="rpf" data-m="bulan"><label>Bulan</label><input type="month" id="rpb" value="' + h.slice(0, 7) + '"></div><div class="rpf" data-m="tahun"><label>Tahun</label><input type="number" id="rpt" value="' + h.slice(0, 4) + '" min="2020" max="2100"></div>' +
      '<div class="rpf" data-m="rentang"><label>Dari</label><input type="date" id="rpd" value="' + h.slice(0, 8) + '01"></div><div class="rpf" data-m="rentang"><label>Sampai</label><input type="date" id="rps" value="' + h + '"></div></div>' +
      '<div class="fr"><button id="rpc">Tampilkan</button><button class="gh" id="rpx">Excel</button><button class="gh" id="rpp">PDF</button></div><div id="rph"></div></div>';
  }
  U.periodeSeksi = function (r) {
    var s = r.ringkas;
    return [{judul: 'Ringkasan', kolom: ['Hal', 'Nilai'], baris: [['Periode', r.judul], ['Jumlah PO', s.po], ['Nilai PO', s.nilaiPo], ['Klaim vendor (terbuka)', s.klaim + ' (' + s.klaimTerbuka + ')'], ['UMO', s.umo], ['Uang muka UMO', s.umoUangMuka], ['Realisasi aktual UMO', s.umoAktual], ['Termin jasa dibayar', s.terminDibayar]]},
      {judul: 'Per vendor', kolom: ['Vendor', 'Jumlah PO', 'Total'], baris: r.vendor.map(function (v) { return [v.vendor, v.n, Math.round(v.total)]; })},
      {judul: 'Per PPBJ', kolom: ['No PPBJ', 'Proyek', 'Jumlah PO', 'Total'], baris: r.ppbj.map(function (p) { return [p.ppbj, p.proyek, p.n, Math.round(p.total)]; })},
      {judul: 'Daftar PO', kolom: ['No PO', 'Tanggal', 'Vendor', 'No PPBJ', 'Status', 'Total'], baris: r.po.map(function (m) { return [m.no, m.tgl, m.vendor, m.ppbj, m.status, Math.round(m.total)]; })},
      {judul: 'Klaim vendor', kolom: ['Tanggal', 'No PO', 'Vendor', 'Barang', 'Qty', 'Jenis', 'Status'], baris: r.klaim.map(function (k) { return [k.tgl, k.po, k.vendor, k.nama, k.qty, k.jenis, k.status]; })},
      {judul: 'UMO', kolom: ['Nomor', 'Pengaju', 'Perihal', 'No PPBJ', 'Tanggal', 'Uang muka', 'Aktual'], baris: r.umo.map(function (u) { return [u.nomor, u.pengaju, u.perihal, u.ppbj, u.tgl, Math.round(u.uangMuka), Math.round(u.aktual)]; })},
      {judul: 'Termin dibayar', kolom: ['No PO', 'Jasa', 'Termin', 'Tanggal bayar', 'Nilai'], baris: r.termin.map(function (t) { return [t.po, t.jasa, t.termin, t.tgl, t.nilai]; })}];
  };
  function periodeSiap() {
    function mode() { var m = $('rpm').value; Array.prototype.forEach.call(app.querySelectorAll('.rpf'), function (e) { e.style.display = e.getAttribute('data-m') === m ? '' : 'none'; }); }
    $('rpm').onchange = mode; mode();
    async function tarik() {
      var m = $('rpm').value, b = {action: 'rekapPeriode', mode: m, bulan: $('rpb').value, tahun: $('rpt').value, dari: $('rpd').value, sampai: $('rps').value}; $('rpc').disabled = true;
      try { var r = await api(b); if (!r.ok) { toast(r.msg || 'Gagal.', true); RP.r = null; } else { RP.r = r; var s = r.ringkas;
        $('rph').innerHTML = '<div class="sum"><div><b>' + s.po + '</b><span>PO</span></div><div><b>' + rp(s.nilaiPo) + '</b><span>Nilai PO</span></div><div><b>' + s.klaim + '</b><span>Klaim (' + s.klaimTerbuka + ' terbuka)</span></div><div><b>' + s.umo + '</b><span>UMO</span></div><div><b>' + rp(s.umoAktual) + '</b><span>Realisasi UMO</span></div><div><b>' + rp(s.terminDibayar) + '</b><span>Termin dibayar</span></div></div>' +
          '<div class="note">' + esc(r.judul) + '</div><div class="tw"><table><thead><tr><th>Vendor</th><th class="nm">PO</th><th class="nm">Total</th></tr></thead><tbody>' + r.vendor.map(function (v) { return '<tr><td>' + esc(v.vendor) + '</td><td class="nm">' + v.n + '</td><td class="nm">' + angka(v.total) + '</td></tr>'; }).join('') + '</tbody></table></div>'; } } catch (e) { toast('Gagal terhubung ke server.', true); }
      $('rpc').disabled = false; return RP.r;
    }
    $('rpc').onclick = tarik;
    $('rpx').onclick = async function () { var r = await tarik(); if (r) unduhBanyak(U.periodeSeksi(r), NB.buat('xlsx', 'Rekap Pengadaan', r.judul)); };
    $('rpp').onclick = async function () { var r = await tarik(); if (r) U.unduhPdf('Rekap Pengadaan - ' + r.judul, 'Dicetak ' + new Date().toLocaleDateString('id-ID'), U.periodeSeksi(r), NB.buat('pdf', 'Rekap Pengadaan', r.judul)); };
  }

  function kartuVendorHtml(q) {
    var l = (S.kartu || []).filter(function (x) { return !q || x.vendor.toLowerCase().indexOf(q.toLowerCase()) >= 0; });
    if (!l.length) return '';
    return '<div class="card"><h3 style="margin-top:0">Kartu vendor</h3><div class="note">Hanya fakta dari catatan sistem, tanpa nilai atau peringkat. Selisih harga = rata-rata harga PO dibanding anggaran PPBJ.</div><div class="tw"><table><thead><tr><th>Vendor</th><th class="nm">PO aktif</th><th class="nm">Total PO</th><th>PO terakhir</th><th class="nm">Rata-rata tunggu</th><th class="nm">Barang bermasalah</th><th class="nm">Selisih harga vs anggaran</th></tr></thead><tbody>' + l.map(function (x) {
      return '<tr><td><b>' + esc(x.vendor) + '</b></td><td class="nm">' + x.nPo + '</td><td class="nm">' + rp(x.total) + '</td><td>' + esc(x.tglTerakhir) + '</td><td class="nm">' + (x.tunggu == null ? '-' : String(x.tunggu).replace('.', ',') + ' hari') + '</td><td class="nm">' + (x.persenMasalah == null ? '-' : String(x.persenMasalah).replace('.', ',') + '%') + '</td><td class="nm">' + (x.selisihAnggaran == null ? '-' : (x.selisihAnggaran > 0 ? '+' : '') + String(x.selisihAnggaran).replace('.', ',') + '% (' + x.nBaris + ' baris)') + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
  }
  /* ---------- Riwayat lengkap ---------- */
  async function riwayat(tipe, id) {
    var ov = document.createElement('div'); ov.id = 'rwov'; ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;overflow:auto;padding:16px';
    ov.innerHTML = '<div class="card" style="max-width:720px;margin:0 auto"><div class="msg">Memuat riwayat...</div></div>'; document.body.appendChild(ov);
    ov.onclick = function (e) { if (e.target === ov) ov.remove(); };
    var r; try { r = await api({action: 'riwayatLengkap', tipe: tipe, id: id}); } catch (e) { ov.remove(); toast('Gagal terhubung ke server.', true); return; }
    if (!r.ok) { ov.remove(); toast(r.msg || 'Gagal.', true); return; }
    var wr = {'PO': 'n', 'Keputusan': 'ok', 'Kontrol': 'bad', 'Vendor': 'n', 'Barang datang': 'ok', 'Klaim': 'w', 'Revisi PO': 'w', 'Revisi PPBJ': 'w', 'Termin': 'n', 'Jejak': 'n'};
    ov.firstChild.innerHTML = '<div class="fr"><h3 style="margin:0;flex:1">Riwayat lengkap · ' + esc(r.judul) + '</h3><button class="gh" id="rwx">Tutup</button></div><div class="note">' + r.events.length + ' kejadian, urut dari yang paling awal.</div>' +
      (r.events.length ? r.events.map(function (e) { return '<div class="card" style="margin:6px 0"><span class="tag ' + (wr[e.jenis] || 'n') + '">' + esc(e.jenis) + '</span> <b>' + esc(e.judul) + '</b><div class="note">' + esc(e.waktu) + (e.oleh ? ' · ' + esc(e.oleh) : '') + (e.ket ? ' · ' + esc(e.ket) : '') + '</div></div>'; }).join('') : '<div class="note">Belum ada catatan.</div>');
    $('rwx').onclick = function () { ov.remove(); };
  }
  /* ---------- Stok menipis ---------- */
  /* ---------- Stok menipis: kekurangan material dari PPBJ terdaftar (hanya lihat dan unduh) ---------- */
  var MN = {v: 'proyek', q: '', r: null};
  function qs(n) { return String(n == null ? '' : n).replace('.', ','); }
  async function menipis() {
    app.innerHTML = U.nav('menipis') + '<div class="msg">Memuat...</div>'; U.pasangNav();
    var r; try { r = await api({action: 'stokMenipis'}); } catch (e) { toast('Gagal terhubung ke server.', true); return; } if (!r.ok) { toast(r.msg || 'Gagal.', true); app.innerHTML = U.nav('menipis') + '<div class="card err">' + esc(r.msg || 'Gagal.') + '</div>'; U.pasangNav(); return; }
    MN.r = r; gambarMenipis();
  }
  function seksiProyek(P) { return {judul: 'PPBJ ' + P.ppbj, kolom: ['Kode', 'Barang', 'Satuan', 'Dibutuhkan', 'Stok bebas', 'Kurang', 'Status', 'Pesanan'], baris: P.items.map(function (i) { return [i.kode, i.nama, i.satuan, i.butuh, i.bebas, i.kurang, i.status === 'Rebutan' ? 'Rebutan antar proyek' : 'Kurang', i.pesanan]; })}; }
  function seksiBeli(r) { return {judul: 'Total beli', kolom: ['Kode', 'Barang', 'Satuan', 'Total dibutuhkan', 'Stok bebas', 'Perlu dibeli', 'Perkiraan nilai', 'Catatan'], baris: r.beli.map(function (b) { return [b.kode, b.nama, b.satuan, b.total, b.bebas, b.kurang, b.nilai == null ? '' : b.nilai, b.rebutan ? 'Rebutan antar proyek' : '']; })}; }
  function gambarMenipis() {
    var r = MN.r, q = (MN.q || '').toLowerCase(), g = r.ringkas;
    var pr = r.proyek.filter(function (P) { return !q || (P.ppbj + ' ' + P.ket + ' ' + P.dept + ' ' + P.items.map(function (i) { return i.nama; }).join(' ')).toLowerCase().indexOf(q) >= 0; });
    var bl = r.beli.filter(function (b) { return !q || (b.nama + ' ' + b.kode).toLowerCase().indexOf(q) >= 0; });
    var tagS = function (st) { return st === 'Rebutan' ? '<span class="tag w">Rebutan</span>' : '<span class="tag bad">Kurang</span>'; }, tagP = function (t) { return '<span class="tag ' + (t === 'Sudah dipesan' || t === 'Sudah datang' ? 'ok' : t === 'Sebagian datang' ? 'w' : 'n') + '">' + esc(t) + '</span>'; };
    var isi = MN.v === 'proyek'
      ? (pr.length ? pr.map(function (P, ix) { return '<div class="card"><b>' + esc(P.ppbj) + '</b> · ' + esc(P.ket) + (P.dept ? ' <small>' + esc(P.dept) + '</small>' : '') + ' <span class="tag bad">' + P.nKurang + ' kurang</span>' + (P.nRebutan ? ' <span class="tag w">' + P.nRebutan + ' rebutan</span>' : '') +
          '<div class="tw"><table><thead><tr><th>Barang</th><th class="nm">Dibutuhkan</th><th class="nm">Stok bebas</th><th class="nm">Kurang</th><th>Status</th><th>Pesanan</th></tr></thead><tbody>' + P.items.map(function (i) { return '<tr><td>' + esc(i.nama) + '<small>' + esc(i.kode) + '</small></td><td class="nm">' + qs(i.butuh) + ' ' + esc(i.satuan) + '</td><td class="nm">' + qs(i.bebas) + '</td><td class="nm"><b>' + qs(i.kurang) + '</b></td><td>' + tagS(i.status) + '</td><td>' + tagP(i.pesanan) + '</td></tr>'; }).join('') + '</tbody></table></div>' +
          '<div class="fr"><button class="gh" data-mx="' + ix + '">Unduh Excel</button><button class="gh" data-mp="' + ix + '">Unduh PDF</button></div></div>'; }).join('') : '<div class="card"><div class="note">' + (q ? 'Tidak ada proyek yang cocok.' : 'Tidak ada proyek aktif yang kekurangan material.') + '</div></div>')
      : '<div class="card">' + (bl.length ? '<div class="tw"><table><thead><tr><th>Barang</th><th class="nm">Total dibutuhkan</th><th class="nm">Stok bebas</th><th class="nm">Perlu dibeli</th><th class="nm">Perkiraan nilai</th><th>Catatan</th></tr></thead><tbody>' + bl.map(function (b) { return '<tr><td>' + esc(b.nama) + '<small>' + esc(b.kode) + '</small></td><td class="nm">' + qs(b.total) + ' ' + esc(b.satuan) + '</td><td class="nm">' + qs(b.bebas) + '</td><td class="nm"><b>' + qs(b.kurang) + '</b></td><td class="nm">' + (b.nilai == null ? '-' : rp(b.nilai)) + '</td><td>' + (b.rebutan ? '<span class="tag w">Rebutan antar proyek</span>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="note">Tidak ada barang yang perlu dibeli.</div>') + '</div>';
    app.innerHTML = U.nav('menipis') + '<div class="card"><h3 style="margin-top:0">Stok menipis <span class="tag ' + (g.barang ? 'bad' : 'ok') + '">' + g.barang + ' barang perlu dibeli</span></h3><div class="note">Kekurangan material dari PPBJ yang terdaftar (status Aktif atau Ditunda Sebentar): kebutuhan proyek dikurangi yang sudah diserahkan dan dialokasikan, dibandingkan dengan stok bebas. Tab ini hanya untuk melihat dan mengunduh; pembelian tetap diproses lewat PPBJ dan PO. <b>Rebutan</b> = stok cukup untuk satu proyek tetapi tidak untuk semua proyek yang membutuhkan.</div>' +
      '<div class="sum"><div><b>' + g.proyek + '</b><span>Proyek kurang</span></div><div><b>' + g.barang + '</b><span>Barang perlu dibeli</span></div><div><b>' + g.rebutan + '</b><span>Rebutan</span></div><div><b>' + rp(g.nilai) + '</b><span>Perkiraan nilai' + (g.tanpaHarga ? ' (' + g.tanpaHarga + ' barang tanpa harga)' : '') + '</span></div></div>' +
      '<div class="fr"><select id="mnv"><option value="proyek">Per proyek</option><option value="beli">Total beli</option></select><input type="search" id="mnq" placeholder="Cari proyek, PPBJ, atau barang" value="' + esc(MN.q) + '" style="flex:1;min-width:180px"><button class="gh" id="mnxa">Unduh Excel (semua)</button><button class="gh" id="mnpa">Unduh PDF (total beli)</button><button class="sv" id="mnsl"' + (r.pesan ? '' : ' disabled') + '>Salin pesan untuk tim gudang</button></div></div>' + isi;
    U.pasangNav(); $('mnv').value = MN.v; $('mnv').onchange = function () { MN.v = this.value; gambarMenipis(); };
    $('mnq').onkeydown = function (e) { if (e.key === 'Enter') { MN.q = this.value.trim(); gambarMenipis(); var e2 = $('mnq'); if (e2) { e2.focus(); e2.setSelectionRange(e2.value.length, e2.value.length); } } };
    $('mnsl').onclick = function () { salinTeks(r.pesan); };
    $('mnxa').onclick = function () { unduhBanyak([seksiBeli(r)].concat(r.proyek.map(seksiProyek)), NB.buat('xlsx', 'Kebutuhan Material', 'Semua PPBJ Aktif')); };
    $('mnpa').onclick = function () { U.unduhPdf('Kebutuhan Material - Total Beli', 'Barang yang perlu dibeli dari semua PPBJ aktif', [seksiBeli(r)], NB.buat('pdf', 'Kebutuhan Material', 'Total Beli')); };
    Array.prototype.forEach.call(app.querySelectorAll('button[data-mx]'), function (b) { b.onclick = function () { var P = pr[Number(b.getAttribute('data-mx'))]; unduhBanyak([seksiProyek(P)], NB.buat('xlsx', 'Kebutuhan Material', 'PPBJ ' + P.ppbj, P.ket)); }; });
    Array.prototype.forEach.call(app.querySelectorAll('button[data-mp]'), function (b) { b.onclick = function () { var P = pr[Number(b.getAttribute('data-mp'))]; U.unduhPdf('Kebutuhan Material - PPBJ ' + P.ppbj, P.ket, [seksiProyek(P)], NB.buat('pdf', 'Kebutuhan Material', 'PPBJ ' + P.ppbj, P.ket)); }; });
  }
  /* ---------- Pantau (admin utama) ---------- */
  var PT = {dari: '', sampai: ''};
  async function pantau() {
    app.innerHTML = U.nav('pantau') + '<div class="msg">Memuat...</div>'; U.pasangNav();
    var r; try { r = await api({action: 'pantau', dari: PT.dari, sampai: PT.sampai}); } catch (e) { toast('Gagal terhubung ke server.', true); return; } if (!r.ok) { toast(r.msg || 'Hanya admin utama.', true); return; }
    PT.dari = r.dari; PT.sampai = r.sampai; var g = r.ringkas, k = r.kecepatan, mx = 1; r.harian.forEach(function (h) { if (h.n > mx) mx = h.n; });
    var tg = {merah: 'bad', kuning: 'w'};
    app.innerHTML = U.nav('pantau') + '<div class="card"><h3 style="margin-top:0">Pantau pengadaan</h3><div class="note">Ringkasan pekerjaan Pengadaan dan tanda yang perlu Anda lihat. Khusus admin utama.</div><div class="fl"><label>Dari</label><input type="date" id="ptd" value="' + esc(r.dari) + '"><label>Sampai</label><input type="date" id="pts" value="' + esc(r.sampai) + '"><button class="gh" id="ptg">Tampilkan</button></div>' +
      '<div class="sum"><div><b>' + g.poDibuat + '</b><span>PO dibuat</span></div><div><b>' + rp(g.nilai) + '</b><span>Nilai PO</span></div><div><b>' + g.batal + '</b><span>Dibatalkan</span></div><div><b>' + g.ditolak + '</b><span>Ditolak</span></div><div><b>' + g.revisi + '</b><span>Revisi PO</span></div><div><b>' + g.tanpaTtd + '</b><span>Jalan tanpa tanda tangan</span></div><div><b>' + g.hargaMerah + '</b><span>Harga merah tetap jalan</span></div><div><b>' + g.aktivitas + '</b><span>Aktivitas tercatat</span></div></div>' +
      '<div class="note">Rata-rata waktu PO sampai diputuskan: ' + (k.setujuHari == null ? '-' : String(k.setujuHari).replace('.', ',') + ' hari (' + k.nSetuju + ' PO)') + ' · keputusan sampai dikirim ke vendor: ' + (k.kirimHari == null ? '-' : String(k.kirimHari).replace('.', ',') + ' hari (' + k.nKirim + ' PO)') + '</div></div>' +
      '<div class="card"><h3 style="margin-top:0">Tanda dari pengawal otomatis <span class="tag n">' + r.tanda.length + '</span></h3>' + (r.tanda.length ? r.tanda.map(function (x) { return '<div class="card" style="margin:6px 0"><span class="tag ' + (tg[x.tingkat] || 'n') + '">' + (x.tingkat === 'merah' ? 'periksa' : 'perhatikan') + '</span> <b>' + esc(x.judul) + '</b><div class="note">' + esc(x.rincian) + '</div></div>'; }).join('') : '<div class="note">Tidak ada tanda pada periode ini.</div>') + '<div class="note">Tanda adalah petunjuk untuk ditanyakan, bukan tuduhan: kadang ada alasan yang sah.</div></div>' +
      '<div class="card"><h3 style="margin-top:0">Hal yang perlu perhatian</h3>' + (r.perhatian.length ? '<div class="tw"><table><thead><tr><th>Waktu</th><th>Siapa</th><th>Kejadian</th><th>Referensi</th><th>Hasil</th></tr></thead><tbody>' + r.perhatian.map(function (x) { return '<tr><td>' + esc(x.waktu) + '</td><td>' + esc(x.siapa) + '</td><td>' + esc(x.label) + '</td><td>' + esc(x.ref) + (x.ref ? ' <a href="#" data-rw="' + esc(x.ref) + '">riwayat</a>' : '') + '</td><td>' + esc(x.hasil) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="note">Tidak ada.</div>') + '</div>' +
      '<div class="card"><h3 style="margin-top:0">Aktivitas harian</h3>' + (r.harian.length ? r.harian.map(function (h) { return '<div class="fr" style="gap:8px"><span style="width:90px;font-size:12px">' + esc(h.tgl) + '</span><span style="display:inline-block;height:10px;border-radius:5px;background:var(--acc,#2b6cb0);width:' + Math.max(4, Math.round(h.n / mx * 60)) + '%"></span><span class="note">' + h.n + '</span></div>'; }).join('') + '<div class="note">Jenis aksi: ' + r.aksi.slice(0, 8).map(function (a) { return esc(a.aksi) + ' ' + a.n; }).join(' · ') + '</div>' : '<div class="note">Belum ada aktivitas.</div>') + '</div>';
    U.pasangNav();
    $('ptg').onclick = function () { PT.dari = $('ptd').value; PT.sampai = $('pts').value; pantau(); };
    Array.prototype.forEach.call(app.querySelectorAll('a[data-rw]'), function (a) { a.onclick = function (e) { e.preventDefault(); riwayat('po', a.getAttribute('data-rw')); }; });
  }
  /* ---------- Cek kesehatan (admin utama) ---------- */
  async function sehat() {
    app.innerHTML = U.nav('sehat') + '<div class="msg">Memeriksa sistem...</div>'; U.pasangNav();
    var r; try { r = await api({action: 'cekSehat'}); } catch (e) { toast('Gagal terhubung ke server.', true); return; } if (!r.ok) { toast(r.msg || 'Hanya admin utama.', true); return; }
    app.innerHTML = U.nav('sehat') + '<div class="card"><h3 style="margin-top:0">Cek kesehatan sistem</h3><div class="fr"><span class="tag ' + (r.sehat ? 'ok' : 'bad') + '">' + (r.sehat ? 'Tidak ada masalah serius' : r.merah + ' masalah serius') + '</span><span class="tag ' + (r.kuning ? 'w' : 'ok') + '">' + r.kuning + ' catatan</span> <button class="gh" id="shu">Periksa ulang</button></div><div class="note">Diperiksa: ' + r.diperiksa.po + ' PO, ' + r.diperiksa.pembelian + ' pembelian, ' + r.diperiksa.barangStok + ' barang di stok. Pemeriksaan hanya membaca, tidak mengubah data.</div></div>' +
      (r.temuan.length ? r.temuan.map(function (x) { return '<div class="card"><span class="tag ' + (x.level === 'merah' ? 'bad' : 'w') + '">' + (x.level === 'merah' ? 'serius' : 'catatan') + '</span> <b>' + esc(x.judul) + '</b><div class="note">' + esc(x.rincian) + '</div></div>'; }).join('') : '<div class="card"><div class="note">Semua pemeriksaan lolos.</div></div>');
    U.pasangNav(); $('shu').onclick = function () { sehat(); };
  }
  /* ---------- Pengaturan dan jejak (khusus admin utama) ---------- */
  async function atur() {
    app.innerHTML = U.nav('atur') + '<div class="msg">Memuat...</div>'; U.pasangNav();
    var r; try { r = await api({action: 'pengAturList'}); } catch (e) { toast('Gagal terhubung ke server.', true); return; } if (!r.ok) { toast(r.msg || 'Hanya admin utama.', true); return; }
    app.innerHTML = U.nav('atur') + '<div class="card"><h3 style="margin-top:0">Pengaturan pengadaan</h3><div class="note">Hanya admin utama. Perubahan langsung berlaku. Kosongkan batas lonjakan harga untuk menonaktifkannya.</div>' +
      r.data.map(function (x) { return '<div class="card" style="margin:8px 0"><b>' + esc(x.kunci) + '</b><div class="note">' + esc(x.ket) + '</div><div class="fr"><input type="text" data-ak="' + esc(x.kunci) + '" value="' + esc(x.nilai) + '" placeholder="bawaan: ' + esc(x.bawaan) + '"><button class="gh" data-as="' + esc(x.kunci) + '">Simpan</button></div></div>'; }).join('') + '</div>';
    U.pasangNav();
    Array.prototype.forEach.call(app.querySelectorAll('button[data-as]'), function (b) { b.onclick = async function () { var k = b.getAttribute('data-as'), v = app.querySelector('input[data-ak="' + k + '"]').value; b.disabled = true;
      try { var x = await api({action: 'pengAturSimpan', kunci: k, nilai: v}); toast(x.msg || (x.ok ? 'Tersimpan.' : 'Gagal.'), !x.ok); } catch (e) { toast('Gagal terhubung ke server.', true); } b.disabled = false; }; });
  }
  async function jejak() {
    app.innerHTML = U.nav('jejak') + '<div class="msg">Memuat...</div>'; U.pasangNav();
    var r; try { r = await api({action: 'jejakList', perhatian: !!S.jp}); } catch (e) { toast('Gagal terhubung ke server.', true); return; } if (!r.ok) { toast(r.msg || 'Hanya admin utama.', true); return; }
    app.innerHTML = U.nav('jejak') + '<div class="card"><h3 style="margin-top:0">Jejak aktivitas pengadaan</h3><div class="note">Siapa melakukan apa (300 catatan terakhir): pembatalan PO, kirim ke vendor, revisi, termin, pengaturan, dan lainnya.</div><label class="note"><input type="checkbox" id="jpf"' + (S.jp ? ' checked' : '') + '> hanya yang perlu perhatian</label>' +
      (r.data.length ? '<div class="tw"><table><thead><tr><th>Waktu</th><th>Siapa</th><th>Aksi</th><th>Referensi</th><th>Hasil</th></tr></thead><tbody>' + r.data.map(function (x) { return '<tr><td>' + esc(x.waktu) + '</td><td>' + esc(x.siapa) + '</td><td>' + (x.tanda ? '<span class="tag w">!</span> ' : '') + esc(x.aksi) + '</td><td>' + esc(x.ref) + '</td><td>' + esc(x.hasil) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="note">Belum ada catatan.</div>') + '</div>';
    U.pasangNav(); $('jpf').onchange = function () { S.jp = this.checked; jejak(); };
  }

  root.POUI = U; if (typeof module !== 'undefined') module.exports = U;
})(typeof window !== 'undefined' ? window : this);
