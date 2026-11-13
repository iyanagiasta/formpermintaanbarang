/* Tambahan 103: Riwayat Mutasi Accurate. Admin mengunggah Excel "Mutasi per Gudang" dari Accurate (awal: riwayat lengkap, lalu tiap bulan).
   Data disimpan terpisah (sheet MutasiAcc), TIDAK mengubah stok sistem gudang. PPBJ dicocokkan otomatis dari keterangan.
   Bagian murni (bacaXlsx, parse) bisa diuji tanpa browser. Bergantung: JSZip (dimuat saat perlu), xlsx-tulis.js (XT) untuk unduh Excel. */
(function (root) {
  'use strict';
  var MC = {};
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
  function dex(s) { return String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, function (m, n) { return String.fromCharCode(Number(n)); }).replace(/&#x([0-9a-f]+);/ig, function (m, n) { return String.fromCharCode(parseInt(n, 16)); }).replace(/&amp;/g, '&'); }
  function kolIdx(ref) { var m = /^([A-Z]+)/.exec(ref || ''), n = 0; if (!m) return -1; for (var i = 0; i < m[1].length; i++) n = n * 26 + (m[1].charCodeAt(i) - 64); return n - 1; }

  /* ---------- 1. pembaca .xlsx kecil (JSZip + regex), sheet pertama -> array baris ---------- */
  MC.bacaXlsx = function (JSZip, buf) {
    return JSZip.loadAsync(buf).then(function (z) {
      var f = function (p) { var x = z.file(p); return x ? x.async('string') : Promise.resolve(''); };
      return Promise.all([f('xl/workbook.xml'), f('xl/_rels/workbook.xml.rels'), f('xl/sharedStrings.xml')]).then(function (a) {
        var wb = a[0], rels = a[1], ss = a[2], path = 'xl/worksheets/sheet1.xml';
        var sm = /<sheet\b[^>]*\br:id="([^"]+)"/.exec(wb) || /<sheet\b[^>]*\bid="([^"]+)"/.exec(wb);
        if (sm && rels) { var re = new RegExp('<Relationship\\b[^>]*Id="' + sm[1] + '"[^>]*>'), rm = re.exec(rels); if (rm) { var t = /Target="([^"]+)"/.exec(rm[0]); if (t) path = t[1].charAt(0) === '/' ? t[1].slice(1) : 'xl/' + t[1].replace(/^\.\//, ''); } }
        var shared = []; if (ss) { var sre = /<si\b[^>]*>([\s\S]*?)<\/si>/g, m; while ((m = sre.exec(ss))) shared.push(teks(m[1])); }
        return f(path).then(function (xml) { if (!xml) throw new Error('Isi sheet Excel tidak ditemukan.'); return MC.sheetKeBaris(xml, shared); });
      });
    });
  };
  function teks(x) { var out = '', re = /<t\b[^>]*>([\s\S]*?)<\/t>/g, m; while ((m = re.exec(x))) out += m[1]; return dex(out); }
  MC.sheetKeBaris = function (xml, shared) {
    var rows = [], rre = /<row\b([^>]*)>([\s\S]*?)<\/row>/g, m, auto = 0;
    while ((m = rre.exec(xml))) {
      var rn = /\br="(\d+)"/.exec(m[1]), ri = rn ? Number(rn[1]) - 1 : auto; auto = ri + 1;
      var row = [], cre = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g, c, ci = 0;
      while ((c = cre.exec(m[2]))) {
        var at = c[1], body = c[2] || '', r = /\br="([A-Z]+\d+)"/.exec(at), t = (/\bt="([^"]+)"/.exec(at) || [])[1] || 'n', idx = r ? kolIdx(r[1]) : ci; ci = idx + 1;
        var v = (/<v>([\s\S]*?)<\/v>/.exec(body) || [])[1], val = null;
        if (t === 'inlineStr') val = teks(body); else if (t === 's') val = v == null ? null : shared[Number(v)]; else if (t === 'str' || t === 'e') val = v == null ? null : dex(v); else if (t === 'b') val = v === '1'; else val = v == null || v === '' ? null : Number(v);
        if (val !== null && val !== '') row[idx] = val;
      }
      rows[ri] = row;
    }
    for (var i = 0; i < rows.length; i++) if (!rows[i]) rows[i] = [];
    return rows;
  };

  /* ---------- 2. baca isi laporan "Mutasi per Gudang" ---------- */
  var BLN = {jan: 1, feb: 2, mar: 3, apr: 4, mei: 5, may: 5, jun: 6, jul: 7, agt: 8, agu: 8, aug: 8, sep: 9, okt: 10, oct: 10, nov: 11, des: 12, dec: 12};
  function p2(n) { return ('0' + n).slice(-2); }
  /** "30 Nov 2025" / "01 Des 2025" / serial Excel / Date -> "yyyy-mm-dd" ('' bila gagal). */
  function tglIso(v) {
    if (v == null || v === '') return '';
    if (v instanceof Date) return v.getFullYear() + '-' + p2(v.getMonth() + 1) + '-' + p2(v.getDate());
    if (typeof v === 'number') { if (!(v > 20000 && v < 80000)) return ''; var d = new Date(Math.round((v - 25569) * 86400000)); return d.getUTCFullYear() + '-' + p2(d.getUTCMonth() + 1) + '-' + p2(d.getUTCDate()); }
    var s = String(v).trim(), m = /^(\d{1,2})\s+([A-Za-z]{3})[A-Za-z]*\.?\s+(\d{4})$/.exec(s);
    if (m && BLN[m[2].toLowerCase()]) return m[3] + '-' + p2(BLN[m[2].toLowerCase()]) + '-' + p2(Number(m[1]));
    m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s); if (m) return m[0];
    m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s); if (m) return m[3] + '-' + p2(Number(m[2])) + '-' + p2(Number(m[1]));
    return '';
  }
  MC.tglIso = tglIso;
  function angka(v) { if (typeof v === 'number') return v; var s = String(v == null ? '' : v).trim(); if (!s) return 0; if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.'); else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, ''); var n = Number(s); return isFinite(n) ? n : 0; }
  var KOL = {kode: /^Kode\s*Barang/i, nama: /^Nama\s*Barang/i, tgl: /^Tanggal$/i, nomor: /^Nomor/i, ref: /^No\.?\s*Referensi/i, tipe: /^Tipe\s*Transaksi/i, masuk: /^Masuk$/i, keluar: /^Keluar$/i, desk: /^Deskripsi$/i, ket: /^Keterangan/i};
  /** rows = array baris (hasil bacaXlsx). Hasil {dari, sampai, gudang:[], saldoTgl, saldo:[], rows:[], warn:[]} atau {err}. */
  MC.parse = function (rows) {
    var dari = '', sampai = '', gud = 'Utama', gudL = [], H = null, saldo = [], out = [], warn = [], saldoTgl = '', lewat = 0, urut = {}, judul = false;
    function sel(r, k) { return H && H[k] != null ? r[H[k]] : null; }
    function tx(v) { return v == null ? '' : String(v).replace(/\s+/g, ' ').trim(); }
    (rows || []).forEach(function (r) {
      var vals = []; (r || []).forEach(function (v, i) { if (v != null && String(v).trim() !== '') vals.push({i: i, v: v}); });
      if (!vals.length) return;
      var v0 = tx(vals[0].v);
      if (/^Mutasi per Gudang$/i.test(v0)) { judul = true; return; }
      var pm = /Dari\s+(.+?)\s+s\/d\s+(.+)$/i.exec(v0); if (pm && !dari) { dari = tglIso(pm[1].trim()); sampai = tglIso(pm[2].trim()); return; }
      if (/^Gudang$/i.test(v0)) { var g = vals.slice(1).map(function (x) { return tx(x.v); }).filter(function (x) { return x && x !== ':'; })[0]; gud = g && !/^Alamat$/i.test(g) ? g : gud; if (gudL.indexOf(gud) < 0) gudL.push(gud); return; }
      if (KOL.kode.test(v0)) { H = {}; vals.forEach(function (x) { var t = tx(x.v); Object.keys(KOL).forEach(function (k) { if (H[k] == null && KOL[k].test(t)) H[k] = x.i; }); }); return; }
      if (!H) return;
      var kode = tx(sel(r, 'kode')); if (!kode) return;   // judul grup / subtotal
      var tg = tglIso(sel(r, 'tgl')), desk = tx(sel(r, 'desk'));
      if (!tg) {
        var sm = /^Saldo Barang per\s+(.+)$/i.exec(desk);
        if (sm) { var st = tglIso(sm[1]); if (st && !saldoTgl) saldoTgl = st; saldo.push({gudang: gud, kode: kode, nama: tx(sel(r, 'nama')), qty: angka(sel(r, 'masuk')) - angka(sel(r, 'keluar'))}); }
        else lewat++;
        return;
      }
      var no = tx(sel(r, 'nomor')); if (!no) { lewat++; return; }
      var uk = no + '|' + kode; urut[uk] = (urut[uk] || 0) + 1;
      out.push({gudang: gud, kode: kode, nama: tx(sel(r, 'nama')), tgl: tg, nomor: no, ref: tx(sel(r, 'ref')), tipe: tx(sel(r, 'tipe')), masuk: angka(sel(r, 'masuk')), keluar: angka(sel(r, 'keluar')), desk: desk, ket: tx(sel(r, 'ket')), urut: urut[uk]});
    });
    if (!H) return {err: 'Format Excel tidak dikenali: judul kolom "Kode Barang" tidak ditemukan. Pastikan ini ekspor Excel laporan "Mutasi per Gudang" dari Accurate.'};
    if (!dari || !sampai) return {err: 'Periode laporan (baris "Dari ... s/d ...") tidak terbaca.'};
    if (!out.length && !saldo.length) return {err: 'Tidak ada baris transaksi terbaca.'};
    if (!judul) warn.push('Judul "Mutasi per Gudang" tidak ditemukan; pastikan laporannya benar.');
    if (lewat) warn.push(lewat + ' baris dilewati (tanpa tanggal atau nomor).');
    var luar = out.filter(function (x) { return x.tgl < dari || x.tgl > sampai; }).length; if (luar) warn.push(luar + ' transaksi di luar periode laporan.');
    if (!gudL.length) gudL.push(gud);
    return {dari: dari, sampai: sampai, gudang: gudL, saldoTgl: saldoTgl, saldo: saldo, rows: out, warn: warn};
  };

  /* ---------- 3. tampilan (admin.html, tab Mutasi Accurate) ---------- */
  var el, api, toast, S = {tab: 'cari', ring: null, cari: {}, kartu: '', cekJenis: 'cek', hari: 180, last: {}};
  function rp(n) { return n ? 'Rp ' + Math.round(Number(n)).toLocaleString('id-ID') : '-'; }
  function qy(n) { return Number(n || 0).toLocaleString('id-ID', {maximumFractionDigits: 3}); }
  var BL = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
  function dmy(t) { t = String(t || ''); return /^\d{4}-\d{2}-\d{2}/.test(t) ? Number(t.slice(8, 10)) + ' ' + BL[Number(t.slice(5, 7)) - 1] + ' ' + t.slice(0, 4) : t; }
  var STL = {yakin: 'Yakin', cek: 'Perlu dicek', kosong: 'Tanpa PPBJ', bukan: 'Bukan proyek'};
  var SBL = {nomor: 'nomor di keterangan', po: 'lewat nomor PO', keterangan: 'keterangan sama', nama: 'nama pekerjaan', koreksi: 'koreksi admin', reklas: 'reklas', rutin: 'pemakaian rutin'};
  function badge(st, sb) { var w = {yakin: '#1e8449', cek: '#d68910', kosong: '#7f8c8d', bukan: '#5d6d7e'}[st] || '#7f8c8d'; return '<span class="mac-tag" style="border-color:' + w + ';color:' + w + '" title="' + esc(SBL[sb] || '') + '">' + esc(STL[st] || st || '-') + '</span>'; }
  function gaya() {
    if (document.getElementById('macGaya')) return;
    var st = document.createElement('style'); st.id = 'macGaya';
    st.textContent = '.mac-sum{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}.mac-sum div{border:1px solid var(--line,#ccd);border-radius:8px;padding:6px 10px;min-width:110px}.mac-sum b{display:block;font-size:18px}.mac-sum span{font-size:12px;opacity:.8}' +
      '.mac-tabs{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 8px}.mac-tabs button[aria-pressed="true"]{outline:2px solid var(--gold,#c9a227);font-weight:700}' +
      '.mac-f{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:6px;margin-bottom:6px}.mac-f label{display:flex;flex-direction:column;font-size:12px;gap:2px}.mac-f input,.mac-f select{width:100%;box-sizing:border-box}' +
      '.mac-wrap{overflow-x:auto}.mac-tb{width:100%;border-collapse:collapse;font-size:13px}.mac-tb td,.mac-tb th{border-bottom:1px solid var(--line,#dde);padding:4px;vertical-align:top;text-align:left}.mac-tb .nm{text-align:right;white-space:nowrap}' +
      '.mac-tag{display:inline-block;font-size:11px;padding:0 6px;border-radius:9px;border:1px solid;white-space:nowrap}.mac-ingat{background:rgba(214,137,16,.15);border-left:3px solid #d68910;padding:6px 8px;margin:6px 0;border-radius:4px}' +
      '.mac-cek{border:1px solid var(--line,#ccd);border-radius:8px;padding:8px;margin:6px 0}.mac-cek .fr{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:4px}.mac-link{background:none;border:0;padding:0;color:inherit;text-decoration:underline;cursor:pointer;font:inherit}' +
      '@media (max-width:700px){.mac-tb,.mac-tb tbody,.mac-tb tr,.mac-tb td{display:block;width:100%;box-sizing:border-box}.mac-tb thead{display:none}.mac-tb tr{border:1px solid var(--line,#ccd);border-radius:8px;margin:6px 0;padding:4px}.mac-tb td{border:0}.mac-tb td[data-l]:before{content:attr(data-l) ": ";opacity:.7;font-size:12px}.mac-tb .nm{text-align:left}}';
    document.head.appendChild(st);
  }
  function muatJSZip() { if (root.JSZip) return Promise.resolve(root.JSZip); return new Promise(function (ok, no) { var s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'; s.onload = function () { ok(root.JSZip); }; s.onerror = function () { no(new Error('JSZip gagal dimuat. Periksa internet.')); }; document.head.appendChild(s); }); }
  function unduh(bytes, nama) { var blob = new Blob([bytes], {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}), a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nama; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }
  /** kol = [{t:'Judul', k:'field' | fn, w:lebar, f:'#,##0' | 'tgl'}]. */
  function unduhTabel(nama, judul, ket, kol, rows) {
    if (!root.XT) { toast('Penulis Excel belum termuat.', true); return Promise.resolve(); }
    return muatJSZip().then(function (Z) {
      var b = root.XT.buku(), s = b.sheet(nama.slice(0, 31)), hd = {font: {b: true, color: 'FFFFFF'}, fill: '0A2A43', border: {l: 1, r: 1, t: 1, b: 1}, al: {wrap: true, v: 'center'}}, bd = {border: {l: 1, r: 1, t: 1, b: 1}, al: {v: 'top', wrap: true}};
      s.set(1, 1, judul, {font: {b: true, sz: 12}}); s.set(2, 1, ket, {font: {i: true, sz: 9}});
      kol.forEach(function (c, j) { s.set(4, j + 1, c.t, hd); s.lebar[j + 1] = c.w || 14; });
      rows.forEach(function (x, i) { kol.forEach(function (c, j) { var v = typeof c.k === 'function' ? c.k(x) : x[c.k]; if (c.f === 'tgl') v = dmy(v); s.set(5 + i, j + 1, v == null ? '' : v, c.f && c.f !== 'tgl' ? {border: bd.border, al: {v: 'top'}, fmt: c.f} : bd); }); });
      s.beku = [5, 1];
      return b.simpan(Z);
    }).then(function (u) { if (u) unduh(u, nama + '.xlsx'); }).catch(function (e) { toast('Gagal membuat Excel: ' + (e && e.message ? e.message : e), true); });
  }

  MC.mount = function (box, api0, toast0) { el = box; api = api0; toast = toast0; gaya(); muatRingkas(); };
  function muatRingkas(pesan) {
    el.innerHTML = '<div class="card"><b>Mutasi Accurate</b><div class="note">Memuat...</div></div>';
    api({action: 'adminMacRingkas'}).then(function (r) { if (!r.ok) { el.innerHTML = '<div class="card">' + esc(r.msg || 'Gagal memuat.') + '</div>'; return; } S.ring = r; gambar(pesan); });
  }
  function gambar(pesan) {
    var r = S.ring, st = r.status || {}, h = '<div class="card"><h3 style="margin:0">Riwayat Mutasi Accurate</h3>' +
      '<div class="note">Unggah Excel laporan Accurate <b>Mutasi per Gudang</b>. Pertama kali: riwayat lengkap. Selanjutnya: tiap bulan. Data pada periode file diganti dengan isi file (transaksi yang diedit atau dihapus di Accurate ikut terbarui). <b>Stok di sistem gudang tidak berubah.</b></div>' +
      (r.ingat ? '<div class="mac-ingat" id="macIngat">' + esc(r.ingat) + '</div>' : '') + (r.terputus ? '<div class="mac-ingat" style="border-color:#c0392b">' + esc(r.terputus) + '</div>' : '') +
      (!r.adaPpa ? '<div class="note">Laporan PPBJ (Item Requisition) belum diunggah di tab BAST, jadi pencocokan PPBJ hanya memakai nomor yang tertulis di keterangan.</div>' : '') +
      '<div class="mac-sum"><div><b>' + qy(r.nTrans) + '</b><span>Transaksi</span></div><div><b>' + qy(r.nBarang) + '</b><span>Barang</span></div><div><b>' + (r.min ? dmy(r.min) + ' – ' + dmy(r.max) : '-') + '</b><span>Periode data</span></div>' +
      '<div><b>' + qy(st.yakin) + '</b><span>PPBJ yakin</span></div><div><b><button class="mac-link" data-go="cek">' + qy(st.cek) + '</button></b><span>PPBJ perlu dicek</span></div><div><b>' + qy(st.kosong) + '</b><span>Tanpa PPBJ</span></div><div><b>' + qy(st.bukan) + '</b><span>Bukan proyek (reklas/rutin)</span></div></div>' +
      '<div class="fr" style="gap:6px;flex-wrap:wrap"><input type="file" id="macF" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden><button class="sv" id="macUp">Unggah Excel Mutasi per Gudang</button>' +
      (r.periode && r.periode.length ? '<details><summary>Riwayat unggah (' + r.periode.length + ')</summary><div class="note">' + r.periode.map(function (p) { return esc(dmy(p.dari) + ' s/d ' + dmy(p.sampai) + ' · ' + p.n + ' baris · ' + p.waktu); }).join('<br>') + '</div></details>' : '') +
      '</div><div class="note" id="macInfo">' + (pesan || '') + '</div></div>';
    h += '<div class="card"><div class="mac-tabs" role="group" aria-label="Bagian">' + [['cari', 'Cari transaksi'], ['kartu', 'Kartu stok'], ['cek', 'Perlu dicek'], ['belumia', 'Barang proyek belum di-IA'], ['mati', 'Barang mati'], ['rapi', 'Kerapian keterangan']].map(function (t) { return '<button data-t="' + t[0] + '" aria-pressed="' + (S.tab === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div><div id="macIsi"></div></div>';
    el.innerHTML = h;
    el.querySelector('#macUp').onclick = function () { el.querySelector('#macF').click(); };
    el.querySelector('#macF').onchange = function () { var f = this.files[0]; this.value = ''; if (f) unggah(f); };
    el.onclick = function (e) {
      var t = e.target.closest('[data-t]'); if (t && el.contains(t) && t.parentNode.classList.contains('mac-tabs')) { S.tab = t.getAttribute('data-t'); el.querySelectorAll('.mac-tabs button').forEach(function (b) { b.setAttribute('aria-pressed', String(b === t)); }); isi(); return; }
      var g = e.target.closest('[data-go]'); if (g) { S.tab = g.getAttribute('data-go'); el.querySelectorAll('.mac-tabs button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-t') === S.tab)); }); isi(); return; }
      var k = e.target.closest('[data-kartu]'); if (k) { S.kartu = k.getAttribute('data-kartu'); S.tab = 'kartu'; el.querySelectorAll('.mac-tabs button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-t') === 'kartu')); }); isi(); el.querySelector('#macIsi').scrollIntoView({block: 'start'}); }
    };
    isi();
  }
  function isi() { var f = {cari: tabCari, kartu: tabKartu, cek: tabCek, belumia: tabBelumIa, mati: tabMati, rapi: tabRapi}[S.tab] || tabCari; f(el.querySelector('#macIsi')); }

  /* unggah bertahap */
  function unggah(file) {
    var info = el.querySelector('#macInfo'); info.textContent = 'Membaca Excel...';
    Promise.all([muatJSZip(), file.arrayBuffer ? file.arrayBuffer() : new Response(file).arrayBuffer()]).then(function (a) { return MC.bacaXlsx(a[0], a[1]); }).then(function (rows) {
      var o = MC.parse(rows); if (o.err) { info.textContent = ''; toast(o.err, true); return; }
      var msg = 'Periode ' + dmy(o.dari) + ' s/d ' + dmy(o.sampai) + ': ' + o.rows.length + ' transaksi, ' + o.saldo.length + ' saldo awal, gudang ' + o.gudang.join(', ') + '.' + (o.warn.length ? ' Catatan: ' + o.warn.join(' ') : '');
      if (!confirm(msg + '\n\nData Accurate pada periode ini akan diganti dengan isi file. Lanjutkan?')) { info.textContent = ''; return; }
      var tok = 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), N = 700, parts = [];
      for (var i = 0; i < o.rows.length; i += N) parts.push(o.rows.slice(i, i + N)); if (!parts.length) parts.push([]);
      var p = Promise.resolve({ok: true});
      parts.forEach(function (rows2, j) {
        p = p.then(function (r) {
          if (!r.ok) return r; info.textContent = 'Menyimpan bagian ' + (j + 1) + ' dari ' + parts.length + '...' + (j === parts.length - 1 ? ' (lalu mencocokkan PPBJ)' : '');
          var q = {action: 'adminMacImpor', token: tok, dari: o.dari, sampai: o.sampai, rows: rows2, mulai: j === 0, selesai: j === parts.length - 1};
          if (j === 0) { q.gudang = o.gudang; q.saldo = o.saldo; q.saldoTgl = o.saldoTgl; }
          return api(q);
        });
      });
      return p.then(function (r) { toast(r.msg || (r.ok ? 'Tersimpan.' : 'Gagal.'), !r.ok); if (r.ok) { S.last = {}; muatRingkas(esc(r.msg || '')); } else info.textContent = r.msg || 'Gagal.'; });
    }).catch(function (e) { info.textContent = ''; toast('Excel gagal dibaca: ' + (e && e.message ? e.message : e), true); });
  }

  /* --- Cari --- */
  var KOL_CARI = [{t: 'Tanggal', k: 'tgl', f: 'tgl', w: 12}, {t: 'Nomor', k: 'no', w: 18}, {t: 'Tipe', k: 'tipe', w: 18}, {t: 'Kode', k: 'kode', w: 20}, {t: 'Nama barang', k: 'nama', w: 34}, {t: 'Masuk', k: 'masuk', f: '#,##0.###', w: 9}, {t: 'Keluar', k: 'keluar', f: '#,##0.###', w: 9}, {t: 'Harga satuan', k: 'harga', f: '#,##0', w: 13}, {t: 'Sumber harga', k: 'hs', w: 11}, {t: 'Nilai', k: 'nilai', f: '#,##0', w: 14}, {t: 'PPBJ', k: 'ppbj', w: 18}, {t: 'Status PPBJ', k: function (x) { return STL[x.status] || ''; }, w: 12}, {t: 'Cara cocok', k: function (x) { return SBL[x.sumber] || ''; }, w: 16}, {t: 'Deskripsi', k: 'desk', w: 30}, {t: 'Keterangan', k: 'ket', w: 50}];
  function tabCari(box) {
    var c = S.cari;
    box.innerHTML = '<div class="mac-f"><label>Kata kunci<input id="mcQ" placeholder="nama barang, proyek, vendor..." value="' + esc(c.q || '') + '"></label><label>PPBJ<input id="mcP" placeholder="007/PB/XI/2026" value="' + esc(c.ppbj || '') + '"></label><label>Nomor IA/RI<input id="mcN" value="' + esc(c.nomor || '') + '"></label>' +
      '<label>Jenis<select id="mcJ"><option value="">Semua</option><option value="IA"' + (c.jenis === 'IA' ? ' selected' : '') + '>IA (penyesuaian)</option><option value="RI"' + (c.jenis === 'RI' ? ' selected' : '') + '>RI (penerimaan)</option><option value="PRT"' + (c.jenis === 'PRT' ? ' selected' : '') + '>Retur</option></select></label>' +
      '<label>Arah<select id="mcA"><option value="">Masuk dan keluar</option><option value="masuk"' + (c.arah === 'masuk' ? ' selected' : '') + '>Masuk</option><option value="keluar"' + (c.arah === 'keluar' ? ' selected' : '') + '>Keluar</option></select></label>' +
      '<label>Status PPBJ<select id="mcS"><option value="">Semua</option>' + Object.keys(STL).map(function (k) { return '<option value="' + k + '"' + (c.status === k ? ' selected' : '') + '>' + STL[k] + '</option>'; }).join('') + '</select></label>' +
      '<label>Dari<input type="date" id="mcD" value="' + esc(c.dari || '') + '"></label><label>Sampai<input type="date" id="mcT" value="' + esc(c.sampai || '') + '"></label></div>' +
      '<div class="fr" style="gap:6px;flex-wrap:wrap"><button class="sv" id="mcGo">Cari</button><button id="mcXl">Unduh Excel</button><button id="mcRs">Kosongkan</button></div><div id="mcOut" class="note">Isi saringan lalu tekan Cari. Kosongkan semua untuk melihat transaksi terbaru.</div>';
    function baca() { S.cari = {q: box.querySelector('#mcQ').value.trim(), ppbj: box.querySelector('#mcP').value.trim(), nomor: box.querySelector('#mcN').value.trim(), jenis: box.querySelector('#mcJ').value, arah: box.querySelector('#mcA').value, status: box.querySelector('#mcS').value, dari: box.querySelector('#mcD').value, sampai: box.querySelector('#mcT').value}; return S.cari; }
    function go() { var q = baca(), out = box.querySelector('#mcOut'); out.textContent = 'Mencari...'; api(Object.assign({action: 'adminMacCari'}, q)).then(function (r) { if (!r.ok) { out.textContent = r.msg || 'Gagal.'; return; } S.last.cari = r; tampilCari(out, r); }); }
    box.querySelector('#mcGo').onclick = go;
    box.querySelectorAll('.mac-f input').forEach(function (i) { i.onkeydown = function (e) { if (e.key === 'Enter') go(); }; });
    box.querySelector('#mcRs').onclick = function () { S.cari = {}; tabCari(box); };
    box.querySelector('#mcXl').onclick = function () { var b = this, q = baca(); b.disabled = true; api(Object.assign({action: 'adminMacCari', semua: true}, q)).then(function (r) { if (!r.ok) { toast(r.msg || 'Gagal.', true); return; } return unduhTabel('Mutasi Accurate', 'Riwayat Mutasi Accurate', 'Saringan: ' + (Object.keys(q).filter(function (k) { return q[k]; }).map(function (k) { return k + '=' + q[k]; }).join(', ') || 'semua') + ' · ' + r.rows.length + ' baris · nilai = jumlah × harga satuan (perkiraan)', KOL_CARI, r.rows); }).then(function () { b.disabled = false; }); };
    if (S.last.cari) tampilCari(box.querySelector('#mcOut'), S.last.cari); else if (Object.keys(c).some(function (k) { return c[k]; })) go();
  }
  function tampilCari(out, r) {
    var t = r.total || {};
    out.className = '';
    out.innerHTML = '<div class="mac-sum"><div><b>' + qy(t.n) + '</b><span>Baris</span></div><div><b>' + qy(t.masuk) + '</b><span>Jumlah masuk</span></div><div><b>' + qy(t.keluar) + '</b><span>Jumlah keluar</span></div><div><b>' + rp(t.nMasuk) + '</b><span>Nilai masuk</span></div><div><b>' + rp(t.nKeluar) + '</b><span>Nilai keluar</span></div></div>' +
      (r.potong ? '<div class="note">Menampilkan 300 baris terbaru. Unduh Excel untuk semua baris.</div>' : '') +
      '<div class="mac-wrap"><table class="mac-tb"><thead><tr><th>Tanggal</th><th>Nomor</th><th>Barang</th><th class="nm">Masuk</th><th class="nm">Keluar</th><th class="nm">Nilai</th><th>PPBJ</th><th>Keterangan</th></tr></thead><tbody>' +
      (r.rows.length ? r.rows.map(function (x) {
        return '<tr><td data-l="Tanggal">' + esc(dmy(x.tgl)) + '</td><td data-l="Nomor">' + esc(x.no) + '<br><small>' + esc(x.tipe) + '</small></td><td data-l="Barang"><button class="mac-link" data-kartu="' + esc(x.kode) + '" title="Lihat kartu stok">' + esc(x.nama) + '</button><br><small>' + esc(x.kode) + '</small></td>' +
          '<td class="nm" data-l="Masuk">' + (x.masuk ? qy(x.masuk) : '') + '</td><td class="nm" data-l="Keluar">' + (x.keluar ? qy(x.keluar) : '') + '</td><td class="nm" data-l="Nilai" title="' + esc(x.hs ? 'Harga ' + x.hs : 'Harga belum ada') + '">' + rp(x.nilai) + '</td>' +
          '<td data-l="PPBJ">' + esc(x.ppbj || '') + ' ' + badge(x.status, x.sumber) + '</td><td data-l="Keterangan"><small>' + esc(x.ket || x.desk) + '</small></td></tr>';
      }).join('') : '<tr><td colspan="8">Tidak ada transaksi yang cocok.</td></tr>') + '</tbody></table></div>';
  }

  /* --- Kartu stok --- */
  function tabKartu(box) {
    box.innerHTML = '<div class="fr" style="gap:6px;flex-wrap:wrap"><input id="mkK" placeholder="Kode barang" value="' + esc(S.kartu) + '" style="min-width:200px;flex:1"><button class="sv" id="mkGo">Tampilkan</button><button id="mkXl">Unduh Excel</button></div><div class="note">Kode barang bisa dicari dulu di bagian Cari transaksi, lalu klik nama barangnya. Sisa dihitung menurut Accurate, bukan stok sistem gudang.</div><div id="mkOut"></div>';
    var out = box.querySelector('#mkOut');
    function go() { var k = box.querySelector('#mkK').value.trim(); if (!k) { toast('Isi kode barang.', true); return; } S.kartu = k; out.textContent = 'Memuat...'; api({action: 'adminMacKartu', kode: k}).then(function (r) { if (!r.ok) { out.textContent = r.msg || 'Gagal.'; return; } S.last.kartu = r; tampil(r); }); }
    function tampil(r) {
      if (!r.rows.length && !r.adaSaldo) { out.innerHTML = '<div class="note">Kode ' + esc(r.kode) + ' tidak ada di data mutasi Accurate.</div>'; return; }
      out.innerHTML = '<h4 style="margin:8px 0 2px">' + esc(r.nama) + ' <small>(' + esc(r.kode) + ')</small></h4><div class="mac-sum"><div><b>' + qy(r.awal) + '</b><span>Saldo awal' + (r.awalTgl ? ' ' + esc(dmy(r.awalTgl)) : '') + '</span></div><div><b>' + qy(r.masuk) + '</b><span>Masuk</span></div><div><b>' + qy(r.keluar) + '</b><span>Keluar</span></div><div><b>' + qy(r.sisa) + '</b><span>Sisa (Accurate)</span></div><div><b>' + rp(r.nilaiSisa) + '</b><span>Nilai sisa</span></div></div>' +
        '<div class="mac-wrap"><table class="mac-tb"><thead><tr><th>Tanggal</th><th>Nomor</th><th>Keterangan</th><th class="nm">Masuk</th><th class="nm">Keluar</th><th class="nm">Sisa</th><th>PPBJ</th></tr></thead><tbody>' +
        (r.awalTgl ? '<tr><td data-l="Tanggal">' + esc(dmy(r.awalTgl)) + '</td><td data-l="Nomor">-</td><td data-l="Keterangan">Saldo awal</td><td class="nm"></td><td class="nm"></td><td class="nm" data-l="Sisa"><b>' + qy(r.awal) + '</b></td><td></td></tr>' : '') +
        r.rows.map(function (x) { return '<tr><td data-l="Tanggal">' + esc(dmy(x.tgl)) + '</td><td data-l="Nomor">' + esc(x.no) + '</td><td data-l="Keterangan"><small>' + esc(x.desk) + (x.ket && x.ket !== x.desk ? '<br>' + esc(x.ket) : '') + '</small></td><td class="nm" data-l="Masuk">' + (x.masuk ? qy(x.masuk) : '') + '</td><td class="nm" data-l="Keluar">' + (x.keluar ? qy(x.keluar) : '') + '</td><td class="nm" data-l="Sisa"><b>' + qy(x.sisa) + '</b></td><td data-l="PPBJ">' + esc(x.ppbj) + '</td></tr>'; }).join('') + '</tbody></table></div>';
    }
    box.querySelector('#mkGo').onclick = go; box.querySelector('#mkK').onkeydown = function (e) { if (e.key === 'Enter') go(); };
    box.querySelector('#mkXl').onclick = function () {
      var r = S.last.kartu; if (!r || kunciK(r.kode) !== kunciK(box.querySelector('#mkK').value)) { toast('Tampilkan kartu stoknya dulu.', true); return; }
      var rows = (r.awalTgl ? [{tgl: r.awalTgl, no: '-', desk: 'Saldo awal', ket: '', masuk: '', keluar: '', sisa: r.awal, ppbj: ''}] : []).concat(r.rows);
      unduhTabel('Kartu stok ' + String(r.kode).replace(/[\\\/:*?"<>|\[\]]/g, '-'), 'Kartu Stok Accurate: ' + r.nama + ' (' + r.kode + ')', 'Saldo awal ' + qy(r.awal) + ', masuk ' + qy(r.masuk) + ', keluar ' + qy(r.keluar) + ', sisa ' + qy(r.sisa) + ' · menurut data Accurate', [{t: 'Tanggal', k: 'tgl', f: 'tgl', w: 12}, {t: 'Nomor', k: 'no', w: 18}, {t: 'Deskripsi', k: 'desk', w: 34}, {t: 'Keterangan', k: 'ket', w: 50}, {t: 'Masuk', k: 'masuk', f: '#,##0.###', w: 9}, {t: 'Keluar', k: 'keluar', f: '#,##0.###', w: 9}, {t: 'Sisa', k: 'sisa', f: '#,##0.###', w: 9}, {t: 'PPBJ', k: 'ppbj', w: 18}], rows);
    };
    if (S.kartu) go();
  }
  function kunciK(k) { return String(k || '').trim().toUpperCase(); }

  /* --- Perlu dicek --- */
  function tabCek(box) {
    box.innerHTML = '<div class="fr" style="gap:6px;flex-wrap:wrap"><select id="mxJ"><option value="cek"' + (S.cekJenis === 'cek' ? ' selected' : '') + '>Perlu dicek (PPBJ belum pasti)</option><option value="kosong"' + (S.cekJenis === 'kosong' ? ' selected' : '') + '>IA tanpa PPBJ</option></select><span class="note" id="mxN"></span></div>' +
      '<div class="note">Pilih usulan PPBJ, ketik nomor yang benar, atau tandai "Tanpa PPBJ". Koreksi disimpan dan tetap berlaku walaupun file yang sama diunggah ulang. Centang "keterangan sama" untuk menerapkan ke semua transaksi berketerangan sama di daftar ini.</div><div id="mxOut">Memuat...</div>';
    box.querySelector('#mxJ').onchange = function () { S.cekJenis = this.value; tabCek(box); };
    var out = box.querySelector('#mxOut');
    api({action: 'adminMacCek', jenis: S.cekJenis, ia: true}).then(function (r) {
      if (!r.ok) { out.textContent = r.msg || 'Gagal.'; return; }
      var L = r.rows; box.querySelector('#mxN').textContent = r.n + ' transaksi' + (r.n > L.length ? ' (tampil ' + L.length + ')' : '');
      if (!L.length) { out.innerHTML = '<div class="note">Tidak ada. Semua transaksi sudah punya PPBJ yang pasti.</div>'; return; }
      out.innerHTML = L.map(function (g, i) {
        var kand = String(g.kand || '').split(/;\s*/).filter(function (k) { return /\//.test(k); });
        return '<div class="mac-cek" data-i="' + i + '"><b>' + esc(g.no) + '</b> · ' + esc(dmy(g.tgl)) + ' · ' + esc(g.tipe) + ' · ' + g.n + ' barang · ' + rp(g.nilai) + '<div>' + esc(g.ket || '(keterangan kosong)') + '</div><small>' + esc(g.barang.join(', ')) + (g.n > g.barang.length ? ', ...' : '') + '</small>' +
          (g.ppbj ? '<div><small>Tertulis: <b>' + esc(g.ppbj) + '</b>' + (g.kand && !kand.length ? ' (' + esc(g.kand) + ')' : '') + '</small></div>' : '') +
          '<div class="fr">' + (kand.length ? '<span class="note">Usulan:</span>' + kand.map(function (k) { return '<button class="sv" data-pilih="' + esc(k) + '">' + esc(k) + '</button>'; }).join('') : '') +
          '<input data-man placeholder="Nomor PPBJ" style="width:150px"><button data-simpan>Simpan</button><button data-tanpa>Tanpa PPBJ</button><label style="font-size:12px"><input type="checkbox" data-sama> keterangan sama</label></div></div>';
      }).join('');
      out.onclick = function (e) {
        var card = e.target.closest('.mac-cek'); if (!card) return; var g = L[Number(card.getAttribute('data-i'))], p = null;
        if (e.target.closest('[data-pilih]')) p = e.target.closest('[data-pilih]').getAttribute('data-pilih');
        else if (e.target.closest('[data-simpan]')) { p = card.querySelector('[data-man]').value.trim(); if (!p) { toast('Ketik nomor PPBJ.', true); return; } }
        else if (e.target.closest('[data-tanpa]')) p = '-';
        if (p == null) return;
        var nos = [g.no]; if (card.querySelector('[data-sama]').checked) L.forEach(function (x) { if (x.no !== g.no && x.ket && x.ket === g.ket) nos.push(x.no); });
        card.querySelectorAll('button').forEach(function (b) { b.disabled = true; });
        api({action: 'adminMacKoreksi', nomor: nos, ppbj: p}).then(function (r) { toast(r.msg || (r.ok ? 'Tersimpan.' : 'Gagal.'), !r.ok); if (r.ok) { S.last = {}; if (S.ring && r.c) S.ring.status = r.c; tabCek(box); } else card.querySelectorAll('button').forEach(function (b) { b.disabled = false; }); });
      };
    });
  }

  /* --- Barang proyek belum di-IA --- */
  function tabBelumIa(box) {
    box.innerHTML = '<div class="note">Barang yang sudah diterima (RI) untuk suatu PPBJ tetapi belum dikeluarkan lewat IA dengan PPBJ yang sama. Hanya transaksi yang PPBJ-nya yakin. Bisa juga berarti IA-nya tidak menulis PPBJ: periksa di bagian Perlu dicek.</div><div class="fr"><button id="mbXl">Unduh Excel</button></div><div id="mbOut">Memuat...</div>';
    var out = box.querySelector('#mbOut');
    api({action: 'adminMacLaporan', jenis: 'belumia'}).then(function (r) {
      if (!r.ok) { out.textContent = r.msg || 'Gagal.'; return; } S.last.belumia = r;
      out.innerHTML = '<div class="mac-sum"><div><b>' + r.n + '</b><span>PPBJ</span></div><div><b>' + r.nBaris + '</b><span>Baris barang</span></div><div><b>' + rp(r.nilai) + '</b><span>Perkiraan nilai</span></div></div>' +
        (r.rows.length ? r.rows.map(function (p) {
          return '<details class="mac-cek"><summary><b>' + esc(p.ppbj) + '</b> · ' + esc(p.proyek || '-') + ' · ' + p.n + ' barang · ' + rp(p.nilai) + ' · terima terakhir ' + esc(dmy(p.tRi)) + '</summary><div class="mac-wrap"><table class="mac-tb"><thead><tr><th>Barang</th><th class="nm">Diterima</th><th class="nm">Di-IA</th><th class="nm">Sisa</th><th class="nm">Nilai</th></tr></thead><tbody>' +
            p.barang.map(function (b) { return '<tr><td data-l="Barang"><button class="mac-link" data-kartu="' + esc(b.kode) + '">' + esc(b.nama) + '</button><br><small>' + esc(b.kode) + '</small></td><td class="nm" data-l="Diterima">' + qy(b.terima) + '</td><td class="nm" data-l="Di-IA">' + qy(b.pakai) + '</td><td class="nm" data-l="Sisa"><b>' + qy(b.sisa) + '</b></td><td class="nm" data-l="Nilai">' + rp(b.nilai) + '</td></tr>'; }).join('') + '</tbody></table></div></details>';
        }).join('') : '<div class="note">Tidak ada. Semua barang yang diterima untuk PPBJ sudah di-IA.</div>');
    });
    box.querySelector('#mbXl').onclick = function () {
      var r = S.last.belumia; if (!r) return; var rows = []; r.rows.forEach(function (p) { p.barang.forEach(function (b) { rows.push({ppbj: p.ppbj, proyek: p.proyek, tRi: p.tRi, kode: b.kode, nama: b.nama, terima: b.terima, pakai: b.pakai, sisa: b.sisa, harga: b.harga, nilai: b.nilai}); }); });
      unduhTabel('Barang proyek belum di-IA', 'Barang Proyek Belum di-IA (Accurate)', r.n + ' PPBJ, ' + r.nBaris + ' baris, perkiraan nilai ' + rp(r.nilai), [{t: 'PPBJ', k: 'ppbj', w: 18}, {t: 'Proyek', k: 'proyek', w: 40}, {t: 'Terima terakhir', k: 'tRi', f: 'tgl', w: 13}, {t: 'Kode', k: 'kode', w: 20}, {t: 'Nama barang', k: 'nama', w: 34}, {t: 'Diterima', k: 'terima', f: '#,##0.###', w: 9}, {t: 'Di-IA', k: 'pakai', f: '#,##0.###', w: 9}, {t: 'Sisa', k: 'sisa', f: '#,##0.###', w: 9}, {t: 'Harga', k: 'harga', f: '#,##0', w: 12}, {t: 'Nilai', k: 'nilai', f: '#,##0', w: 14}], rows);
    };
  }

  /* --- Barang mati --- */
  function tabMati(box) {
    box.innerHTML = '<div class="fr" style="gap:6px;flex-wrap:wrap;align-items:center"><label>Tidak keluar selama <select id="mmH">' + [90, 180, 365].map(function (h) { return '<option value="' + h + '"' + (S.hari === h ? ' selected' : '') + '>' + h + ' hari</option>'; }).join('') + '</select></label><button id="mmXl">Unduh Excel</button></div><div class="note">Barang yang menurut Accurate masih ada sisanya tetapi tidak pernah keluar dalam jangka itu. Nilai memakai harga rata-rata di sistem.</div><div id="mmOut">Memuat...</div>';
    box.querySelector('#mmH').onchange = function () { S.hari = Number(this.value); tabMati(box); };
    var out = box.querySelector('#mmOut');
    api({action: 'adminMacLaporan', jenis: 'mati', hari: S.hari}).then(function (r) {
      if (!r.ok) { out.textContent = r.msg || 'Gagal.'; return; } S.last.mati = r;
      out.innerHTML = '<div class="mac-sum"><div><b>' + r.n + '</b><span>Barang mati</span></div><div><b>' + r.nStok + '</b><span>Barang bersisa</span></div><div><b>' + rp(r.nilai) + '</b><span>Perkiraan nilai</span></div>' + (r.tanpaHarga ? '<div><b>' + r.tanpaHarga + '</b><span>Tanpa harga</span></div>' : '') + '</div>' +
        '<div class="mac-wrap"><table class="mac-tb"><thead><tr><th>Barang</th><th class="nm">Sisa</th><th>Keluar terakhir</th><th>Masuk terakhir</th><th class="nm">Nilai</th></tr></thead><tbody>' +
        (r.rows.length ? r.rows.slice(0, 500).map(function (b) { return '<tr><td data-l="Barang"><button class="mac-link" data-kartu="' + esc(b.kode) + '">' + esc(b.nama) + '</button><br><small>' + esc(b.kode) + '</small></td><td class="nm" data-l="Sisa">' + qy(b.saldo) + '</td><td data-l="Keluar terakhir">' + (b.kKeluar ? esc(dmy(b.kKeluar)) : 'belum pernah') + '</td><td data-l="Masuk terakhir">' + (b.kMasuk ? esc(dmy(b.kMasuk)) : '-') + '</td><td class="nm" data-l="Nilai">' + rp(b.nilai) + '</td></tr>'; }).join('') : '<tr><td colspan="5">Tidak ada barang mati.</td></tr>') + '</tbody></table></div>' + (r.rows.length > 500 ? '<div class="note">Tampil 500 teratas (nilai terbesar). Unduh Excel untuk semua.</div>' : '');
    });
    box.querySelector('#mmXl').onclick = function () { var r = S.last.mati; if (!r) return; unduhTabel('Barang mati Accurate', 'Barang Mati (tidak keluar ' + r.hari + ' hari)', r.n + ' barang, perkiraan nilai ' + rp(r.nilai) + ' · sisa menurut data Accurate', [{t: 'Kode', k: 'kode', w: 20}, {t: 'Nama barang', k: 'nama', w: 40}, {t: 'Sisa', k: 'saldo', f: '#,##0.###', w: 9}, {t: 'Keluar terakhir', k: function (b) { return b.kKeluar ? dmy(b.kKeluar) : 'belum pernah'; }, w: 14}, {t: 'Masuk terakhir', k: 'kMasuk', f: 'tgl', w: 14}, {t: 'Harga rata-rata', k: 'harga', f: '#,##0', w: 13}, {t: 'Nilai', k: 'nilai', f: '#,##0', w: 14}], r.rows); };
  }

  /* --- Kerapian keterangan --- */
  function tabRapi(box) {
    box.innerHTML = '<div class="note">Persentase transaksi yang menulis nomor PPBJ (IA) atau nomor PPBJ/PO (RI) dengan benar di keterangan, per bulan. Reklas dan pemakaian rutin tidak dihitung. Makin tinggi, makin rapi.</div><div class="fr"><button id="mrXl">Unduh Excel</button></div><div id="mrOut">Memuat...</div>';
    var out = box.querySelector('#mrOut');
    function pc(n) { return n == null ? '-' : String(n).replace('.', ',') + '%'; }
    function bln(b) { return BL[Number(b.slice(5, 7)) - 1] + ' ' + b.slice(0, 4); }
    api({action: 'adminMacLaporan', jenis: 'kerapian'}).then(function (r) {
      if (!r.ok) { out.textContent = r.msg || 'Gagal.'; return; } S.last.rapi = r; var t = r.total;
      out.innerHTML = '<div class="mac-sum"><div><b>' + pc(t.pIa) + '</b><span>IA menulis PPBJ (' + t.iaTulis + '/' + t.ia + ')</span></div><div><b>' + pc(t.pRi) + '</b><span>RI menulis PPBJ/PO (' + t.riTulis + '/' + t.ri + ')</span></div></div>' +
        '<div class="mac-wrap"><table class="mac-tb"><thead><tr><th>Bulan</th><th class="nm">IA</th><th class="nm">IA menulis PPBJ</th><th class="nm">%</th><th class="nm">RI</th><th class="nm">RI menulis PPBJ/PO</th><th class="nm">%</th></tr></thead><tbody>' +
        r.rows.map(function (e) { var w = function (p) { return p == null ? '' : p >= 90 ? 'color:#1e8449' : p >= 70 ? 'color:#d68910' : 'color:#c0392b'; }; return '<tr><td data-l="Bulan">' + esc(bln(e.bln)) + '</td><td class="nm" data-l="IA">' + e.ia + '</td><td class="nm" data-l="IA menulis PPBJ">' + e.iaTulis + '</td><td class="nm" data-l="% IA" style="' + w(e.pIa) + '"><b>' + pc(e.pIa) + '</b></td><td class="nm" data-l="RI">' + e.ri + '</td><td class="nm" data-l="RI menulis PPBJ/PO">' + e.riTulis + '</td><td class="nm" data-l="% RI" style="' + w(e.pRi) + '"><b>' + pc(e.pRi) + '</b></td></tr>'; }).join('') + '</tbody></table></div>';
    });
    box.querySelector('#mrXl').onclick = function () { var r = S.last.rapi; if (!r) return; unduhTabel('Kerapian keterangan', 'Kerapian Keterangan IA dan RI (Accurate)', 'Persentase transaksi yang menulis nomor PPBJ/PO di keterangan', [{t: 'Bulan', k: function (e) { return bln(e.bln); }, w: 12}, {t: 'IA', k: 'ia', w: 8}, {t: 'IA menulis PPBJ', k: 'iaTulis', w: 14}, {t: '% IA', k: 'pIa', f: '0.0', w: 8}, {t: 'RI', k: 'ri', w: 8}, {t: 'RI menulis PPBJ/PO', k: 'riTulis', w: 16}, {t: '% RI', k: 'pRi', f: '0.0', w: 8}], r.rows); };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = MC; else root.MACM = MC;
})(typeof window !== 'undefined' ? window : globalThis);
