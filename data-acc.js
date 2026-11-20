/* T148: DATA ACCURATE. Satu tempat unggah laporan Accurate (Excel atau PDF); jenis laporan dikenali dari judulnya:
   Item Requisition Detail (PPBJ, barang, PO, Ordered Qty), Purchase Order Detail (PO, tanggal, vendor, harga),
   Purchase Flow History (PO -> penerimaan RI -> faktur), Penyesuaian Stok Barang (IA; nomor yang hilang dipulihkan), Mutasi per Gudang.
   Lalu: Status order per PPBJ, PO yang belum tertaut PPBJ, faktur tanpa penerimaan.
   Bagian murni (DACC.kenali, parse*, pulihkanIa) bisa diuji di Node. Bergantung (tampilan): mutasi-acc.js (MC: baca xlsx, Mutasi), bast.js (BA: PDF IA/PPBJ),
   harga-po.js (HP: PDF PO Detail), kb-impor.js (KBI: pdf.js). */
(function (root) {
  'use strict';
  var D = {};
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
  function MCx() { return root.MACM || root.MC || null; }
  var BLN = {jan: 1, feb: 2, mar: 3, apr: 4, mei: 5, may: 5, jun: 6, jul: 7, agt: 8, agu: 8, aug: 8, sep: 9, okt: 10, oct: 10, nov: 11, des: 12, dec: 12};
  function p2(n) { return ('0' + n).slice(-2); }
  function tglIso(v) {
    if (v == null || v === '') return '';
    if (v instanceof Date) return v.getFullYear() + '-' + p2(v.getMonth() + 1) + '-' + p2(v.getDate());
    if (typeof v === 'number' || /^\d{5}(\.\d+)?$/.test(String(v))) { v = Number(v); if (!(v > 20000 && v < 80000)) return ''; var d = new Date(Math.round((v - 25569) * 86400000)); return d.getUTCFullYear() + '-' + p2(d.getUTCMonth() + 1) + '-' + p2(d.getUTCDate()); }
    var s = String(v).trim(), m = /^(\d{1,2})\s+([A-Za-z]{3})[A-Za-z]*\.?\s+(\d{4})$/.exec(s);
    if (m && BLN[m[2].toLowerCase()]) return m[3] + '-' + p2(BLN[m[2].toLowerCase()]) + '-' + p2(Number(m[1]));
    m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s); if (m) return m[0];
    m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s); if (m) return m[3] + '-' + p2(Number(m[2])) + '-' + p2(Number(m[1]));
    return '';
  }
  function angka(v) { if (typeof v === 'number') return v; var s = String(v == null ? '' : v).trim(); if (!s || s === '-') return null; if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.'); var n = Number(s); return isFinite(n) ? n : null; }
  function t(v) { return v == null ? '' : String(v).trim(); }
  function isiBaris(r) { var o = []; (r || []).forEach(function (v, i) { if (v != null && t(v) !== '') o.push({i: i, v: v}); }); return o; }
  D.tglIso = tglIso;

  /** Jenis laporan dari judul di baris-baris awal. */
  D.kenali = function (rows) {
    var teks = (rows || []).slice(0, 10).map(function (r) { return isiBaris(r).map(function (c) { return t(c.v); }).join(' '); }).join(' | ');
    var jenis = /Item Requisition Detail/i.test(teks) ? 'ppbj' : /Purchase Order Detail/i.test(teks) ? 'po' : /Purchase Flow History/i.test(teks) ? 'alur' : /Penyesuaian Stok Barang/i.test(teks) ? 'ia' : /Mutasi per Gudang|Mutasi Gudang/i.test(teks) ? 'mutasi' : '';
    var m = /Dari\s+(.+?)\s+s\/d\s+(.+?)(?:\s*\||$)/i.exec(teks);
    return {jenis: jenis, dari: m ? tglIso(m[1].trim()) : '', sampai: m ? tglIso(m[2].trim()) : ''};
  };
  D.NAMA = {ppbj: 'Item Requisition Detail (PPBJ)', po: 'Purchase Order Detail (PO)', alur: 'Purchase Flow History (alur pembelian)', ia: 'Penyesuaian Stok Barang (IA)', mutasi: 'Mutasi per Gudang'};
  function kolomJudul(rows, wajib) {
    for (var r = 0; r < Math.min(rows.length, 40); r++) {
      var m = {}; (rows[r] || []).forEach(function (v, i) { var s = t(v); if (s && m[s] == null) m[s] = i; });
      if (wajib.every(function (w) { return m[w] != null; })) return {baris: r, k: m};
    }
    return null;
  }

  /** Item Requisition Detail -> [{no, items:[{tgl,kode,nama,qty,harga,total,po,oqty,proyek}]}] (bentuk adminPpbjAccImpor). */
  D.parsePpbj = function (rows) {
    var J = kolomJudul(rows, ['Code#', 'Item Name', 'Quantity', 'Number', 'Date']); if (!J) return {err: 'Judul kolom Item Requisition Detail (Code#, Item Name, Quantity, Number, Date) tidak ditemukan.'};
    var k = J.k, G = {}, urut = [], warn = [], salah = 0, n = 0;
    for (var r = J.baris + 1; r < rows.length; r++) {
      var x = rows[r] || [], kode = t(x[k['Code#']]), no = t(x[k['Number']]); if (!kode || !no) continue;
      var q = angka(x[k['Quantity']]); if (q == null) { salah++; continue; }
      var po = k['PO Number'] != null ? t(x[k['PO Number']]) : ''; if (po === '0' || po === '-') po = '';
      var oq = k['Ordered Qty'] != null ? angka(x[k['Ordered Qty']]) : null;
      var g = G[no]; if (!g) { g = G[no] = {no: no, items: []}; urut.push(no); }
      g.items.push({tgl: tglIso(x[k['Date']]), kode: kode, nama: t(x[k['Item Name']]).replace(/\s+/g, ' '), qty: q, harga: angka(x[k['Hrg Estimasi']]) || 0, total: angka(x[k['Total Hrg Estimasi']]) || 0, po: po, oqty: oq, proyek: k['Nama Proyek'] != null ? t(x[k['Nama Proyek']]).replace(/\s+/g, ' ') : ''});
      n++;
    }
    if (!n) return {err: 'Tidak ada baris PPBJ yang terbaca.'};
    if (salah) warn.push(salah + ' baris tanpa qty dilewati.');
    var ppbj = urut.map(function (no) { return G[no]; }), nPo = 0, nBelum = 0; ppbj.forEach(function (g) { g.items.forEach(function (i) { if (i.po) nPo++; else nBelum++; }); });
    return {ppbj: ppbj, nBaris: n, nPo: nPo, nBelum: nBelum, warn: warn};
  };
  /** Purchase Order Detail -> rows [{po,tgl,kode,nama,qty,harga,total,supplier}]. */
  D.parsePo = function (rows) {
    var J = kolomJudul(rows, ['Code#', 'Item Name', 'Quantity', '@Price', 'Number', 'Supplier']); if (!J) return {err: 'Judul kolom Purchase Order Detail (Code#, Item Name, Quantity, @Price, Number, Supplier) tidak ditemukan.'};
    var k = J.k, out = [], salah = 0, po = {}, warn = [];
    for (var r = J.baris + 1; r < rows.length; r++) {
      var x = rows[r] || [], kode = t(x[k['Code#']]), no = t(x[k['Number']]); if (!kode || !no) continue;
      var q = angka(x[k['Quantity']]), h = angka(x[k['@Price']]), tot = k['Total Price'] != null ? angka(x[k['Total Price']]) : null;
      if (q == null || h == null) { salah++; continue; }
      po[no] = 1; out.push({po: no, tgl: tglIso(x[k['Date']]), kode: kode, nama: t(x[k['Item Name']]).replace(/\s+/g, ' '), qty: q, harga: h, total: tot == null ? q * h : tot, supplier: t(x[k['Supplier']])});
    }
    if (!out.length) return {err: 'Tidak ada baris PO yang terbaca.'};
    if (salah) warn.push(salah + ' baris tanpa angka dilewati.');
    return {rows: out, nPo: Object.keys(po).length, warn: warn};
  };
  /** Purchase Flow History -> rows [{ir,po,ri,dp,pi,ret,pay}]. */
  var ALUR = [['ir', 'Item Requisition'], ['po', 'Purchase Order'], ['ri', 'Receive Item'], ['dp', 'Purchase Down Payment'], ['pi', 'Purchase Invoice'], ['ret', 'Purchase Return'], ['pay', 'Purchase Payment']];
  D.parseAlur = function (rows) {
    var J = kolomJudul(rows, ['Item Requisition', 'Purchase Order', 'Receive Item']); if (!J) return {err: 'Judul kolom Purchase Flow History (Item Requisition, Purchase Order, Receive Item) tidak ditemukan.'};
    var out = [];
    for (var r = J.baris + 1; r < rows.length; r++) {
      var x = rows[r] || [], o = {}, ada = false;
      ALUR.forEach(function (a) { var i = J.k[a[1]], v = i == null ? '' : t(x[i]); if (v === '-') v = ''; o[a[0]] = v; if (v) ada = true; });
      if (ada) out.push(o);
    }
    if (!out.length) return {err: 'Tidak ada baris alur yang terbaca.'};
    var st = {ri: 0, tanpaRi: 0, belumPo: 0};
    out.forEach(function (o) { if (o.po && o.ri) st.ri++; else if (o.po && o.pi) st.tanpaRi++; if (o.ir && !o.po) st.belumPo++; });
    return {rows: out, st: st, warn: []};
  };
  function ppbjTeks(ket) {
    if (root.BA && root.BA.ppbjTeks) return root.BA.ppbjTeks(ket);
    var re = /(\d{1,3}[A-Z]?)\s*\/\s*([A-Z]{2,4}(?:\s*\/\s*[A-Z]{2,4})?)\s*\/\s*([IVX]{1,4})\s*\/\s*(\d{4})([A-Z]?)(?!\d)/g, m, out = [];
    ket = String(ket || '').toUpperCase(); while ((m = re.exec(ket))) { if (/SCTK|INV/.test(m[2])) continue; var p = m[1] + '/' + m[2].replace(/\s+/g, '') + '/' + m[3] + '/' + m[4] + m[5]; if (out.indexOf(p) < 0) out.push(p); }
    return out;
  }
  /** Penyesuaian Stok Barang -> [{no, tgl, ket, ppbj, nilai, akun, items:[{kode,nama,qty,satuan,harga,total,akun}]}]; IA tanpa baris "Nomor #" diberi no '' (dipulihkan dengan pulihkanIa). */
  var IA_F = ['kode', 'nama', 'qty', 'satuan', 'harga', 'total', 'ket', 'jumlah', 'akun'];
  D.parseIa = function (rows) {
    var docs = [], doc = null, pos = null, warn = [], tanpaBlok = 0;
    function jadiDok(c, no) {
      var ket = '', ik = -1; c.forEach(function (z, j) { if (t(z.v) === 'Keterangan' && ik < 0) ik = j; });
      if (ik >= 0) for (var j = ik + 1; j < c.length; j++) { var s = t(c[j].v); if (s === ':') continue; ket = s; break; }
      doc = {no: no, tgl: '', ket: ket.replace(/\s+/g, ' ').trim(), items: [], jumlah: null}; docs.push(doc);
    }
    for (var r = 0; r < rows.length; r++) {
      var c = isiBaris(rows[r]); if (!c.length) continue;
      var v0 = t(c[0].v), semua = c.map(function (z) { return t(z.v); });
      if (semua.indexOf('Nomor #') >= 0) { var no = ''; semua.forEach(function (s) { if (!no && /^IA\./i.test(s)) no = s; }); jadiDok(c, no); continue; }
      if (v0 === 'Keterangan') { jadiDok(c, ''); continue; }
      if (v0 === 'Tanggal') { if (doc && !doc.tgl) { var tg = ''; c.slice(1).forEach(function (z) { if (!tg && t(z.v) !== ':') tg = tglIso(z.v); }); doc.tgl = tg; } continue; }
      var nAngka = c.filter(function (z) { return typeof z.v === 'number' || /^-?[\d.,]+$/.test(t(z.v)); }).length;
      if (c.length < 5 || nAngka < 3) continue;   // judul, cabang, dll.
      if (!doc) { tanpaBlok++; continue; }
      if (!pos && c.length === 9) pos = c.map(function (z) { return z.i; });
      var it = {};
      c.forEach(function (z, j) {
        var f;
        if (pos) { var best = 0, bd = 1e9; pos.forEach(function (p, q) { var d = Math.abs(p - z.i); if (d < bd) { bd = d; best = q; } }); f = IA_F[best]; }
        else f = IA_F[j];
        if (f && it[f] == null) it[f] = z.v;
      });
      var q = angka(it.qty), h = angka(it.harga), tot = angka(it.total), jml = angka(it.jumlah);
      if (q == null || tot == null) { if (warn.length < 6) warn.push('Baris barang tidak lengkap dilewati: ' + semua.slice(0, 3).join(' ')); continue; }
      if (jml != null) doc.jumlah = jml;
      doc.items.push({kode: t(it.kode), nama: t(it.nama).replace(/\s+/g, ' '), qty: q, satuan: t(it.satuan), harga: h == null ? 0 : h, total: tot, akun: t(it.akun)});
    }
    var out = [], salah = 0;
    docs.forEach(function (d) {
      if (!d.items.length || !d.tgl) { salah++; return; }
      var akun = []; d.items.forEach(function (i) { if (i.akun && akun.indexOf(i.akun) < 0) akun.push(i.akun); });
      var nil = d.jumlah != null ? d.jumlah : -d.items.reduce(function (a, i) { return a + i.total; }, 0);
      out.push({no: d.no, tgl: d.tgl, ket: d.ket, ppbj: ppbjTeks(d.ket), nilai: nil, akun: akun.join(', '), items: d.items});
    });
    if (!out.length) return {err: 'Tidak ada IA yang terbaca.'};
    if (salah) warn.push(salah + ' IA tanpa tanggal/barang dilewati.');
    if (tanpaBlok) warn.push(tanpaBlok + ' baris barang di luar IA dilewati.');
    return {ia: out, warn: warn, tanpaNomor: out.filter(function (x) { return !x.no; }).length};
  };
  /** Isi nomor IA yang kosong dari URUTAN: di antara dua nomor yang diketahui (bulan sama) dengan jumlah celah yang pas. Mengisi x.tebak. */
  D.pulihkanIa = function (ia) {
    function urai(no) { var m = /^(IA\.(?:\d{2}|\d{4})\.\d{2}\.)(\d+)$/i.exec(no || ''); return m ? {pre: m[1], n: Number(m[2]), w: m[2].length} : null; }
    var known = []; ia.forEach(function (x, i) { var u = x.no ? urai(x.no) : null; if (u) known.push({i: i, u: u}); });
    var pasti = 0;
    for (var k = 0; k + 1 < known.length; k++) {
      var a = known[k], b = known[k + 1], gap = b.i - a.i - 1; if (!gap) continue;
      if (a.u.pre === b.u.pre && b.u.n - a.u.n - 1 === gap) {
        for (var j = 1; j <= gap; j++) { var x = ia[a.i + j]; if (!x.no) { x.tebak = a.u.pre + ('0000000' + (a.u.n + j)).slice(-a.u.w); pasti++; } }
      }
    }
    return {dariUrutan: pasti, kosong: ia.filter(function (x) { return !x.no; }).length};
  };

  /* ======================= TAMPILAN (tab Data Accurate) ======================= */
  var CSS = '.da-t{display:flex;gap:6px;flex-wrap:wrap;margin:4px 0 10px}.da-t button{border:1px solid var(--line,#c8d2da);background:var(--card,#fff);padding:6px 12px;border-radius:6px;cursor:pointer}.da-t button.on{background:var(--acc,#0a2a43);color:#fff;border-color:transparent}' +
    '.da-lap{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;margin:8px 0}.da-lap div{border:1px solid var(--line,#c8d2da);border-radius:6px;padding:8px;font-size:13px}.da-lap b{display:block}.da-lap small{color:var(--mut,#4a5b68)}' +
    '.da-prev{border:2px solid var(--gold,#c79a2b);border-radius:8px;padding:10px;margin:10px 0}.da-prev h4{margin:0 0 6px}.da-w{color:#8a5a00;font-size:13px}' +
    '.da-ch{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0}.da-ch button{border:1px solid transparent;border-radius:14px;padding:4px 10px;cursor:pointer;font-size:12.5px}.da-ch button.on{outline:2px solid var(--acc,#0a2a43)}' +
    '.da-s{display:inline-block;border-radius:10px;padding:1px 8px;font-size:12px;white-space:nowrap}' +
    '.da-belum{background:#fde2e2;color:#8a1c1c}.da-sebagian{background:#ffe9cc;color:#7a4300}.da-tunggu{background:#fff4c2;color:#6b5200}.da-datangSebagian{background:#e3f0ff;color:#0d4a8a}.da-ri{background:#e8eef3;color:#334}' +
    '.da-faktur{background:#f3e1ff;color:#5b2382}.da-jasa{background:#eef0f2;color:#4a5b68}.da-lengkap{background:#dff3e4;color:#1d6b35}' +
    '.da-f{display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;margin:6px 0}.da-f label{display:flex;flex-direction:column;font-size:12.5px;gap:2px}.da-rinci td{background:var(--bg2,#f6f8fa)}.da-rinci table{margin:4px 0 8px}';
  function gaya() { if (document.getElementById('da-css')) return; var s = document.createElement('style'); s.id = 'da-css'; s.textContent = CSS; document.head.appendChild(s); }
  function nf(n) { return n == null || n === '' ? '-' : (Math.round(Number(n) * 1000) / 1000).toLocaleString('id-ID'); }
  function rp(n) { return n == null ? '-' : 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID'); }
  function dmy(s) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '')); return m ? m[3] + '/' + m[2] + '/' + m[1] : (s || '-'); }
  function lbl(st, L) { return '<span class="da-s da-' + esc(st) + '">' + esc((L && L[st]) || st) + '</span>'; }
  var JENIS_LOG = {ppbj: 'Item Requisition Detail', po: 'Purchase Order Detail', alur: 'Purchase Flow History', ia: 'Penyesuaian Stok Barang', mutasi: 'Mutasi per Gudang'};
  var GUNA = {ppbj: 'PPBJ, barang, PO, qty yang sudah diorder', po: 'Tanggal PO, vendor, harga beli', alur: 'PO sampai penerimaan (RI) dan faktur', ia: 'IA untuk BAST dan komparasi (nomor yang hilang dipulihkan)', mutasi: 'Qty datang (RI) dan keluar (IA) per barang'};

  D.mount = function (el, api, toast) {
    gaya();
    var S = {tab: 'unggah', q: '', st: '', hari: '', L: null, buka: {}};
    el.innerHTML = '<div class="card"><h3 style="margin-top:0">Data Accurate</h3><div class="note">Satu tempat unggah laporan Accurate. Jenis laporan dikenali otomatis dari judulnya; isi diperiksa dulu sebelum disimpan. Stok sistem gudang tidak diubah.</div>' +
      '<div class="da-t" role="tablist"><button data-dt="unggah">Unggah</button><button data-dt="order">Status order per PPBJ</button><button data-dt="perlu">PO belum tertaut PPBJ</button><button data-dt="faktur">Faktur tanpa penerimaan</button></div><div id="daBox"></div></div>';
    el.querySelector('.da-t').onclick = function (e) { var b = e.target.closest('[data-dt]'); if (!b) return; S.tab = b.getAttribute('data-dt'); gambar(); };
    function box() { return el.querySelector('#daBox'); }
    function gambar() { el.querySelectorAll('[data-dt]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-dt') === S.tab); }); ({unggah: tabUnggah, order: tabOrder, perlu: tabPerlu, faktur: tabFaktur})[S.tab](box()); }

    /* ---------- Unggah ---------- */
    function tabUnggah(b) {
      b.innerHTML = '<div class="fr" style="gap:8px;align-items:center;flex-wrap:wrap"><button class="sv" id="daPilih">Unggah laporan Accurate (Excel/PDF)</button><input type="file" id="daF" accept=".xlsx,.pdf" multiple style="display:none"><span class="note" id="daInfo"></span></div>' +
        '<div class="note">Excel: kelima laporan. PDF: Penyesuaian Stok Barang, Item Requisition Detail, Purchase Order Detail (Purchase Flow History dan Mutasi per Gudang versi PDF menyusul; pakai Excel dulu). Boleh pilih beberapa file sekaligus.</div>' +
        '<div class="da-lap" id="daLap"></div><div id="daPrev"></div><h4 style="margin:14px 0 4px">Riwayat unggah</h4><div id="daRiw" class="note">Memuat...</div>';
      b.querySelector('#daPilih').onclick = function () { b.querySelector('#daF').click(); };
      b.querySelector('#daF').onchange = function () { var fs = Array.prototype.slice.call(this.files || []); this.value = ''; antre(fs); };
      riwayat();
    }
    function riwayat() {
      api({action: 'adminAccRiwayat'}).then(function (r) {
        var lap = el.querySelector('#daLap'), riw = el.querySelector('#daRiw'); if (!lap || !r.ok) return;
        lap.innerHTML = Object.keys(JENIS_LOG).map(function (k) { var a = r.akhir[JENIS_LOG[k]]; return '<div><b>' + esc(JENIS_LOG[k]) + '</b><small>' + esc(GUNA[k]) + '</small><br>' + (a ? 'Terakhir: ' + esc(a.waktu) + (a.periode ? '<br><small>periode ' + esc(a.periode) + '</small>' : '') : '<small style="color:#8a1c1c">belum pernah diunggah di sini</small>') + '</div>'; }).join('');
        riw.innerHTML = r.rows.length ? '<div class="tw"><table><thead><tr><th>Waktu</th><th>Laporan</th><th>Periode</th><th class="n">Baris</th><th>Catatan</th><th>Oleh</th></tr></thead><tbody>' + r.rows.slice(0, 30).map(function (x) { return '<tr><td>' + esc(x.waktu) + '</td><td>' + esc(x.jenis) + '</td><td>' + esc(x.periode || '-') + '</td><td class="n">' + nf(x.baris) + '</td><td>' + esc(x.catatan) + '</td><td>' + esc(x.oleh) + '</td></tr>'; }).join('') + '</tbody></table></div>' : 'Belum ada.';
      });
    }
    function info(t) { var i = el.querySelector('#daInfo'); if (i) i.textContent = t || ''; }
    function antre(files) { var p = Promise.resolve(); files.forEach(function (f) { p = p.then(function () { return satu(f); }); }); return p; }
    function muatZip() { var M = MCx(); return M && M.muatJSZip ? M.muatJSZip() : (root.JSZip ? Promise.resolve(root.JSZip) : Promise.reject(new Error('Pembaca Excel belum termuat.'))); }
    function bacaBuf(f) { return f.arrayBuffer ? f.arrayBuffer() : new Response(f).arrayBuffer(); }
    function satu(file) {
      info('Membaca ' + file.name + '...');
      var pdf = /\.pdf$/i.test(file.name);
      var p = pdf ? bacaPdf(file) : Promise.all([muatZip(), bacaBuf(file)]).then(function (a) { return MCx().bacaXlsx(a[0], a[1]); }).then(bacaExcel);
      return p.then(function (o) { info(''); if (o.err) { toast(file.name + ': ' + o.err, true); return; } return pratinjau(file.name, o); }).catch(function (e) { info(''); toast(file.name + ' gagal dibaca: ' + (e && e.message ? e.message : e), true); });
    }
    function bacaExcel(rows) {
      var k = D.kenali(rows), o;
      if (!k.jenis) return {err: 'Jenis laporan tidak dikenali. Yang bisa: ' + Object.keys(D.NAMA).map(function (x) { return D.NAMA[x]; }).join(', ') + '.'};
      if (k.jenis === 'mutasi') { o = MCx().parse(rows); if (o.err) return o; return {jenis: 'mutasi', dari: o.dari, sampai: o.sampai, mut: o, warn: o.warn || []}; }
      o = k.jenis === 'ppbj' ? D.parsePpbj(rows) : k.jenis === 'po' ? D.parsePo(rows) : k.jenis === 'alur' ? D.parseAlur(rows) : D.parseIa(rows);
      if (o.err) return o; o.jenis = k.jenis; o.dari = k.dari; o.sampai = k.sampai; return o;
    }
    function bacaPdf(file) {
      var K = root.KBI; if (!K || !K.muatPdfjs) return Promise.resolve({err: 'Pembaca PDF belum termuat. Muat ulang halaman.'});
      return K.muatPdfjs().then(function (L) { return K.bacaBuf(file).then(function (buf) { return K.pdfKeHalaman(L, buf); }); }).then(function (pages) {
        var teks = (pages[0] && pages[0].items || []).map(function (i) { return i.s; }).join(' ');
        var per = /Dari\s+(\d{1,2}\s+\w{3}\s+\d{4})\s+s\/d\s+(\d{1,2}\s+\w{3}\s+\d{4})/i.exec(teks), dari = per ? tglIso(per[1]) : '', sampai = per ? tglIso(per[2]) : '';
        var o;
        if (/Penyesuaian Stok Barang/i.test(teks)) { o = root.BA.bacaLaporan(pages); if (o.err) return o; return {jenis: 'ia', ia: o.ia, warn: o.warn || [], tanpaNomor: 0, dari: dari, sampai: sampai, pdf: true}; }
        if (/Item Requisition Detail/i.test(teks)) { o = root.BA.bacaPpbj(pages); if (o.err) return o; var nP = 0, nB = 0, nb = 0; o.ppbj.forEach(function (g) { g.items.forEach(function (i) { nb++; if (i.po) nP++; else nB++; }); }); return {jenis: 'ppbj', ppbj: o.ppbj, nBaris: nb, nPo: nP, nBelum: nB, warn: o.warn || [], dari: dari, sampai: sampai, pdf: true}; }
        if (/Purchase Order Detail/i.test(teks)) { o = root.HP.parse(pages); if (o.err) return o; var po = {}; var rows = o.rows.map(function (x) { po[x.nomor] = 1; return {po: x.nomor, tgl: x.iso, kode: x.kode, nama: x.nama, qty: x.qty, harga: x.harga, total: x.total, supplier: x.vendor}; }); return {jenis: 'po', rows: rows, nPo: Object.keys(po).length, warn: o.warn || [], dari: dari, sampai: sampai, pdf: true}; }
        if (/Purchase Flow History|Mutasi per Gudang/i.test(teks)) return {err: 'Versi PDF laporan ini belum bisa dibaca. Unggah versi Excel-nya.'};
        return {err: 'Jenis laporan PDF tidak dikenali.'};
      });
    }
    function pratinjau(nama, o) {
      var pv = el.querySelector('#daPrev'); if (!pv) return;
      var per = o.dari && o.sampai ? dmy(o.dari) + ' s/d ' + dmy(o.sampai) : '', h = '', siap = Promise.resolve();
      var card = document.createElement('div'); card.className = 'da-prev'; pv.insertBefore(card, pv.firstChild);
      function tulis(isi, bisa) {
        card.innerHTML = '<h4>' + esc(D.NAMA[o.jenis]) + (o.pdf ? ' (PDF)' : '') + '</h4><div class="note">' + esc(nama) + (per ? ' &middot; periode ' + per : '') + '</div>' + isi +
          (o.warn && o.warn.length ? '<div class="da-w">Catatan: ' + esc(o.warn.join(' ')) + '</div>' : '') +
          '<div class="fr" style="gap:8px;margin-top:8px">' + (bisa ? '<button class="sv" data-da="simpan">Simpan</button>' : '') + '<button class="gh" data-da="batal">' + (bisa ? 'Batal' : 'Tutup') + '</button><span class="note" data-da="st"></span></div>';
      }
      if (o.jenis === 'ppbj') { tulis('<p><b>' + nf(o.ppbj.length) + ' PPBJ</b>, ' + nf(o.nBaris) + ' baris barang: ' + nf(o.nPo) + ' sudah ada nomor PO, ' + nf(o.nBelum) + ' belum diorder. PPBJ yang ada di file diganti seluruh barisnya; PPBJ lain tetap.</p>', true); }
      else if (o.jenis === 'po') { var v = {}, nil = 0; o.rows.forEach(function (x) { v[x.supplier] = 1; nil += x.total || 0; }); tulis('<p><b>' + nf(o.nPo) + ' PO</b>, ' + nf(o.rows.length) + ' baris barang, ' + nf(Object.keys(v).length) + ' vendor, nilai ' + rp(nil) + '. Data PO pada periode ini diganti; periode lain tetap.</p>', true); }
      else if (o.jenis === 'alur') { tulis('<p><b>' + nf(o.rows.length) + ' baris alur</b>: ' + nf(o.st.ri) + ' dengan penerimaan barang (RI), ' + nf(o.st.belumPo) + ' PPBJ belum ada PO. Data alur lama diganti seluruhnya (laporan ini tidak bertanggal; unggah dengan rentang tanggal panjang).</p>', true); }
      else if (o.jenis === 'mutasi') { tulis('<p><b>' + nf(o.mut.rows.length) + ' transaksi</b>, ' + nf(o.mut.saldo.length) + ' saldo awal, gudang ' + esc(o.mut.gudang.join(', ')) + '. Data Mutasi Accurate pada periode ini diganti.</p>', true); }
      else if (o.jenis === 'ia') {
        if (!o.tanpaNomor) tulis('<p><b>' + nf(o.ia.length) + ' IA</b>, semua bernomor.</p>', true);
        else {
          var r0 = D.pulihkanIa(o.ia); tulis('<p>' + nf(o.ia.length) + ' IA, <b>' + nf(o.tanpaNomor) + ' tanpa nomor</b> (Accurate tidak menulis baris "Nomor #"). ' + nf(r0.dariUrutan) + ' bisa dipastikan dari urutan; sedang mencocokkan semuanya ke Mutasi Accurate...</p>', false);
          var kos = [], ada = []; o.ia.forEach(function (x, i) { if (x.no) ada.push(x.no); else kos.push({i: i, tgl: x.tgl, tebak: x.tebak || '', items: x.items.map(function (it) { return {kode: it.kode, qty: it.qty}; })}); });
          siap = api({action: 'adminAccIaCocok', ia: kos, ada: ada}).then(function (r) {
            if (!r.ok) { tulis('<p class="err">' + esc(r.msg || 'Gagal mencocokkan.') + '</p>', false); return; }
            var c = {urutan: 0, mutasi: 0, 'urutan+mutasi': 0}, ragu = [];
            r.hasil.forEach(function (h2) { var x = o.ia[h2.i]; if (h2.no) { x.no = h2.no; x.cara = h2.cara; c[h2.cara]++; } else { x.ragu = h2.ragu; ragu.push(x); } });
            o.simpanIa = o.ia.filter(function (x) { return x.no; });
            tulis('<p>' + nf(o.ia.length) + ' IA: ' + nf(ada.length) + ' bernomor di file, <b>' + nf(c.urutan + c.mutasi + c['urutan+mutasi']) + ' dipulihkan</b> (' + nf(c['urutan+mutasi']) + ' urutan dan Mutasi cocok, ' + nf(c.urutan) + ' dari urutan, ' + nf(c.mutasi) + ' dari Mutasi Accurate)' +
              (ragu.length ? ', <b>' + nf(ragu.length) + ' ragu dan TIDAK disimpan</b>. Untuk yang ragu, unggah PDF Penyesuaian Stok Barang periode yang sama (nomornya selalu lengkap).' : '.') + (r.adaMutasi ? '' : ' <span class="da-w">Mutasi Accurate belum ada di sistem, jadi hanya urutan yang dipakai.</span>') + '</p>' +
              (ragu.length ? '<details><summary>Lihat ' + nf(ragu.length) + ' IA yang ragu</summary><div class="tw"><table><thead><tr><th>Tanggal</th><th>Keterangan</th><th class="n">Barang</th><th>Alasan</th></tr></thead><tbody>' + ragu.map(function (x) { return '<tr><td>' + dmy(x.tgl) + '</td><td>' + esc(x.ket) + '</td><td class="n">' + x.items.length + '</td><td>' + esc(x.ragu) + '</td></tr>'; }).join('') + '</tbody></table></div></details>' : ''), o.simpanIa.length > 0);
          });
        }
      }
      card.onclick = function (e) {
        var b = e.target.closest('[data-da]'); if (!b) return; var a = b.getAttribute('data-da'); if (a === 'st') return;
        if (a === 'batal') { card.remove(); return; }
        b.disabled = true; var st = card.querySelector('[data-da="st"]'), kabar = function (m) { if (st) st.textContent = m; }; kabar('Menyimpan...');
        simpan(o, kabar).then(function (r) {
          toast(r.msg || (r.ok ? 'Tersimpan.' : 'Gagal.'), !r.ok);
          if (!r.ok) { b.disabled = false; kabar(r.msg || 'Gagal.'); return; }
          card.innerHTML = '<b>' + esc(D.NAMA[o.jenis]) + ':</b> ' + esc(r.msg || 'tersimpan.'); card.style.borderColor = 'var(--ok,#1d6b35)';
          S.L = null; riwayat();
        }, function (e2) { b.disabled = false; kabar('Gagal terhubung ke server.'); toast('Gagal terhubung ke server.', true); });
      };
      return siap;
    }
    function simpan(o, kabar) {
      var per = o.dari && o.sampai ? dmy(o.dari) + ' s/d ' + dmy(o.sampai) : '';
      function catat(r, baris, cat) { if (r && r.ok) api({action: 'adminAccCatat', jenis: JENIS_LOG[o.jenis], periode: per, baris: baris, catatan: cat}); return r; }
      if (o.jenis === 'ppbj') return api({action: 'adminPpbjAccImpor', ppbj: o.ppbj}).then(function (r) { return catat(r, o.nBaris, o.ppbj.length + ' PPBJ'); });
      if (o.jenis === 'po') return api({action: 'adminAccPoImpor', rows: o.rows, dari: o.dari, sampai: o.sampai});
      if (o.jenis === 'alur') return api({action: 'adminAccAlurImpor', rows: o.rows, dari: o.dari, sampai: o.sampai});
      if (o.jenis === 'mutasi') return MCx().simpan(o.mut, api, kabar).then(function (r) { return catat(r, o.mut.rows.length, o.mut.gudang.join(', ')); });
      var L = o.simpanIa || o.ia.filter(function (x) { return x.no; });
      var bersih = L.map(function (x) { return {no: x.no, tgl: x.tgl, ket: x.ket, ppbj: x.ppbj, nilai: x.nilai, akun: x.akun, items: x.items}; });
      return api({action: 'adminIaImpor', ia: bersih}).then(function (r) { return catat(r, bersih.length, (o.ia.length - bersih.length) ? (o.ia.length - bersih.length) + ' IA ragu tidak disimpan' : 'lengkap'); });
    }

    /* ---------- Status order ---------- */
    function tabOrder(b) {
      b.innerHTML = '<div class="da-f"><label>Cari (PPBJ, proyek, barang, PO, vendor)<input id="daQ" value="' + esc(S.q) + '" placeholder="mis. fonusa / 01/pb/x / pipa hdpe"></label><label>Status barang<select id="daS"><option value="">Semua</option></select></label>' +
        '<label>Umur order minimal (hari)<input id="daH" type="number" min="0" style="width:90px" value="' + esc(S.hari) + '"></label><button class="gh" id="daX">Unduh Excel</button></div><div class="da-ch" id="daCh"></div><div id="daOut" class="note">Memuat...</div>';
      var tm = null;
      b.querySelector('#daQ').oninput = function () { S.q = this.value.trim(); clearTimeout(tm); tm = setTimeout(muatOrder, 450); };
      b.querySelector('#daS').onchange = function () { S.st = this.value; muatOrder(); };
      b.querySelector('#daH').onchange = function () { S.hari = this.value; muatOrder(); };
      b.querySelector('#daX').onclick = unduhOrder;
      muatOrder();
    }
    function muatOrder() {
      var out = el.querySelector('#daOut'); if (!out) return; out.className = 'note'; out.textContent = 'Memuat...';
      api({action: 'adminAccOrder', q: S.q, status: S.st, hari: S.hari}).then(function (r) {
        out = el.querySelector('#daOut'); if (!out) return;
        if (!r.ok) { out.textContent = r.msg || 'Gagal.'; return; }
        S.L = r.label;
        var sel = el.querySelector('#daS'); if (sel && sel.options.length < 2) { r.urut.forEach(function (s) { var op = document.createElement('option'); op.value = s; op.textContent = r.label[s]; sel.appendChild(op); }); sel.value = S.st; }
        el.querySelector('#daCh').innerHTML = r.urut.filter(function (s) { return r.total[s]; }).map(function (s) { return '<button class="da-' + s + (S.st === s ? ' on' : '') + '" data-dch="' + s + '">' + esc(r.label[s]) + ': ' + nf(r.total[s]) + ' barang</button>'; }).join('');
        el.querySelector('#daCh').onclick = function (e) { var c = e.target.closest('[data-dch]'); if (!c) return; S.st = S.st === c.getAttribute('data-dch') ? '' : c.getAttribute('data-dch'); var s2 = el.querySelector('#daS'); if (s2) s2.value = S.st; muatOrder(); };
        var kurang = []; if (!r.data.ppbj) kurang.push('Item Requisition Detail'); if (!r.data.po) kurang.push('Purchase Order Detail (tanggal & vendor)'); if (!r.data.alur) kurang.push('Purchase Flow History (penerimaan RI)'); if (!r.data.mutasi) kurang.push('Mutasi per Gudang (qty datang)');
        out.className = '';
        out.innerHTML = (kurang.length ? '<div class="da-w">Belum ada: ' + esc(kurang.join(', ')) + '. Unggah di tab Unggah agar status lebih lengkap.</div>' : '') +
          '<div class="note">' + nf(r.n) + ' PPBJ' + (r.n > r.rows.length ? ' (ditampilkan ' + r.rows.length + '; persempit dengan pencarian)' : '') + '. Klik Rincian untuk melihat tiap barang dan PO-nya.</div>' +
          '<div class="tw"><table><thead><tr><th>PPBJ</th><th>Proyek</th><th class="n">Barang</th><th>Status barang</th><th class="n">Terlama</th><th></th></tr></thead><tbody>' +
          r.rows.map(function (x) {
            return '<tr data-pp="' + esc(x.ppbj) + '"><td data-l="PPBJ"><b>' + esc(x.ppbj) + '</b><br><small>' + dmy(x.tgl) + '</small></td><td data-l="Proyek">' + esc(x.proyek || '-') + (x.statusProyek ? '<br><small>' + esc(x.statusProyek) + '</small>' : '') + '</td><td class="n" data-l="Barang">' + nf(x.n) + '</td>' +
              '<td data-l="Status">' + r.urut.filter(function (s) { return x.per[s]; }).map(function (s) { return '<span class="da-s da-' + s + '" title="' + esc(r.label[s]) + '">' + esc(r.label[s]) + ' ' + x.per[s] + '</span>'; }).join(' ') + '</td>' +
              '<td class="n" data-l="Terlama">' + (x.terlama != null ? x.terlama + ' hari' : '-') + '</td><td><button class="gh" data-rinci="' + esc(x.ppbj) + '">Rincian</button></td></tr>';
          }).join('') + '</tbody></table></div>';
        out.querySelector('tbody').onclick = function (e) { var b2 = e.target.closest('[data-rinci]'); if (b2) rinci(b2.getAttribute('data-rinci'), b2.closest('tr')); };
      });
    }
    function rinci(pp, tr) {
      var nx = tr.nextElementSibling; if (nx && nx.classList.contains('da-rinci')) { nx.remove(); return; }
      var r0 = document.createElement('tr'); r0.className = 'da-rinci'; r0.innerHTML = '<td colspan="6">Memuat...</td>'; tr.parentNode.insertBefore(r0, tr.nextSibling);
      api({action: 'adminAccOrderRinci', ppbj: pp}).then(function (r) {
        if (!r.ok) { r0.firstChild.textContent = r.msg || 'Gagal.'; return; }
        var x = r.data, L = r.label;
        r0.firstChild.innerHTML = '<div class="tw"><table><thead><tr><th>Barang</th><th class="n">Di PPBJ</th><th class="n">Dipesan</th><th class="n">Datang</th><th class="n">Sisa order</th><th>PO</th><th>Tgl PO</th><th>Vendor</th><th>Status</th></tr></thead><tbody>' +
          x.items.map(function (i) { return '<tr><td data-l="Barang"><b>' + esc(i.nama) + '</b><br><small>' + esc(i.kode) + (root.OLH ? ' ' + root.OLH(i.kode) : '') + '</small></td><td class="n" data-l="Di PPBJ">' + nf(i.qty) + '</td><td class="n" data-l="Dipesan">' + nf(i.dipesan) + '</td><td class="n" data-l="Datang">' + (i.datang == null ? '-' : nf(i.datang)) + '</td><td class="n" data-l="Sisa order">' + (i.sisaOrder ? '<b>' + nf(i.sisaOrder) + '</b>' : '0') + '</td>' +
            '<td data-l="PO">' + esc(i.po.join(', ') || '-') + (i.bersama ? '<br><small>PO dipakai bersama PPBJ lain</small>' : '') + '</td><td data-l="Tgl PO">' + dmy(i.tglPo) + (i.hari != null ? '<br><small>' + i.hari + ' hari</small>' : '') + '</td><td data-l="Vendor">' + esc(i.supplier || '-') + '</td><td data-l="Status">' + lbl(i.st, L) + '</td></tr>'; }).join('') + '</tbody></table></div>' +
          (x.poRinci.length ? '<b>PO untuk PPBJ ini</b><div class="tw"><table><thead><tr><th>PO</th><th>Tanggal</th><th>Vendor</th><th class="n">Nilai</th><th>Penerimaan (RI)</th><th>Faktur</th><th></th></tr></thead><tbody>' +
            x.poRinci.map(function (p) { return '<tr><td>' + esc(p.po) + '</td><td>' + dmy(p.tgl) + '</td><td>' + esc(p.supplier || '-') + '</td><td class="n">' + rp(p.nilai) + '</td><td>' + esc(p.ri.join(', ') || '-') + '</td><td>' + esc(p.faktur.join(', ') || '-') + '</td><td>' + (p.manual ? '<small>ditautkan manual</small>' : '') + (p.bersama.length ? '<small>juga untuk ' + esc(p.bersama.join(', ')) + '</small>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="note">Belum ada PO untuk PPBJ ini.</div>');
      });
    }
    function unduhOrder() {
      var b = el.querySelector('#daX'); b.disabled = true;
      api({action: 'adminAccOrder', q: S.q, status: S.st, hari: S.hari, rinci: true}).then(function (r) {
        b.disabled = false; if (!r.ok) { toast(r.msg || 'Gagal.', true); return; }
        var rows = [['No PPBJ', 'Tgl PPBJ', 'Proyek', 'Kode', 'Nama Barang', 'Di PPBJ', 'Dipesan', 'Datang', 'Sisa Order', 'Sisa Datang', 'PO', 'Tgl PO', 'Umur (hari)', 'Vendor', 'Penerimaan (RI)', 'Status']];
        r.rows.forEach(function (x) { x.items.forEach(function (i) { if (S.st && i.st !== S.st) return; rows.push([x.ppbj, x.tgl, x.proyek, i.kode, i.nama, i.qty, i.dipesan, i.datang == null ? '' : i.datang, i.sisaOrder, i.sisaDatang == null ? '' : i.sisaDatang, i.po.join(', '), i.tglPo, i.hari == null ? '' : i.hari, i.supplier, i.ri.join(', '), i.label]); }); });
        if (typeof root.unduhBanyak === 'function') root.unduhBanyak('status_order_accurate_' + new Date().toISOString().slice(0, 10) + '.xlsx', [{n: 'Status Order', rows: rows, w: [18, 11, 34, 22, 40, 9, 9, 9, 9, 9, 28, 11, 8, 24, 22, 26]}]);
      }, function () { b.disabled = false; toast('Gagal terhubung ke server.', true); });
    }

    /* ---------- PO belum tertaut & faktur tanpa RI ---------- */
    function tabPerlu(b) {
      b.innerHTML = '<div class="note">Memuat...</div>';
      api({action: 'adminAccPerlu'}).then(function (r) {
        if (!r.ok) { b.textContent = r.msg || 'Gagal.'; return; }
        if (!r.data.po) { b.innerHTML = '<div class="note">Unggah Purchase Order Detail dulu.</div>'; return; }
        b.innerHTML = '<div class="note"><b>' + nf(r.nTanpa) + ' PO</b> (' + rp(r.nilaiTanpa) + ') tidak tertaut ke PPBJ mana pun: tidak tercatat di Item Requisition, tidak ada di alur, dan nomornya bukan nomor PPBJ. Pilih PPBJ-nya sekali; pilihan diingat untuk unggahan berikutnya. Saran diambil dari PPBJ yang memuat barang yang sama dan dibuat sebelum PO.' + (r.nLuar ? ' ' + nf(r.nLuar) + ' di antaranya bernomor PPBJ yang dibuat sebelum periode laporan Item Requisition.' : '') + '</div>' +
          (r.tanpaPpbj.length ? '<div class="tw"><table><thead><tr><th>PO</th><th>Vendor</th><th class="n">Nilai</th><th>Barang</th><th>Saran PPBJ</th><th>Tautkan ke PPBJ</th></tr></thead><tbody>' +
          r.tanpaPpbj.map(function (x) {
            return '<tr><td data-l="PO"><b>' + esc(x.po) + '</b><br><small>' + dmy(x.tgl) + (x.ri.length ? ' &middot; RI ' + esc(x.ri.join(', ')) : '') + '</small></td><td data-l="Vendor">' + esc(x.supplier || '-') + '</td><td class="n" data-l="Nilai">' + rp(x.nilai) + '</td><td data-l="Barang">' + nf(x.nBarang) + ' barang<br><small>' + esc(x.contoh.join('; ')) + '</small></td>' +
              '<td data-l="Saran">' + (x.luarPeriode ? '<small>Nomor PO menunjuk PPBJ <b>' + esc(x.ppbjNomor) + '</b>, tetapi PPBJ itu tidak ada di Item Requisition yang diunggah (kemungkinan dibuat sebelum periode laporan). Unggah Item Requisition Detail dengan tanggal awal lebih lama.</small>' : (x.saran || []).map(function (s) { return '<button class="gh" style="margin:2px 0" data-tentu="' + esc(x.po) + '" data-pp="' + esc(s.ppbj) + '">' + esc(s.ppbj) + '</button> <small>' + s.cocok + '/' + s.dari + ' barang sama' + (s.proyek ? ', ' + esc(s.proyek) : '') + '</small>'; }).join('<br>') || '<small>tidak ada saran</small>') + '</td>' +
              '<td data-l="Tautkan"><input data-pin="' + esc(x.po) + '" placeholder="No PPBJ" style="width:140px"> <button class="sv" data-tentu="' + esc(x.po) + '">Simpan</button></td></tr>';
          }).join('') + '</tbody></table></div>' : '<div class="msg">Semua PO sudah tertaut ke PPBJ.</div>');
        b.onclick = function (e) {
          var t2 = e.target.closest('[data-tentu]'); if (!t2) return; var po = t2.getAttribute('data-tentu'), pp = t2.getAttribute('data-pp');
          if (!pp) { var inp = b.querySelector('[data-pin="' + po.replace(/"/g, '') + '"]'); pp = inp ? inp.value.trim() : ''; }
          if (!pp) { toast('Isi nomor PPBJ.', true); return; }
          if (!confirm('Tautkan PO ' + po + ' ke PPBJ ' + pp + '?')) return;
          t2.disabled = true; api({action: 'adminAccPpbjTentukan', po: po, ppbj: pp}).then(function (r2) { toast(r2.msg || (r2.ok ? 'Tersimpan.' : 'Gagal.'), !r2.ok); if (r2.ok) tabPerlu(b); else t2.disabled = false; });
        };
      });
    }
    function tabFaktur(b) {
      b.innerHTML = '<div class="note">Memuat...</div>';
      api({action: 'adminAccPerlu'}).then(function (r) {
        if (!r.ok) { b.textContent = r.msg || 'Gagal.'; return; }
        if (!r.data.alur) { b.innerHTML = '<div class="note">Unggah Purchase Flow History dulu.</div>'; return; }
        b.innerHTML = '<div class="note"><b>' + nf(r.nFaktur) + ' PO</b> (' + rp(r.nilaiFaktur) + ') sudah difakturkan tetapi belum ada penerimaan barang (RI) di Accurate (PO yang seluruhnya jasa tidak dihitung). <b>Perlu dicek ke Purchasing</b>: barang sudah masuk gudang tetapi RI belum dibuat, atau dikirim langsung ke lokasi proyek.</div>' +
          (r.fakturTanpaRi.length ? '<div class="tw"><table><thead><tr><th>PO</th><th>PPBJ</th><th>Vendor</th><th class="n">Nilai</th><th>Faktur</th><th>Barang</th></tr></thead><tbody>' + r.fakturTanpaRi.map(function (x) { return '<tr><td><b>' + esc(x.po) + '</b><br><small>' + dmy(x.tgl) + '</small></td><td>' + esc(x.ppbj.join(', ') || '-') + '</td><td>' + esc(x.supplier || '-') + '</td><td class="n">' + rp(x.nilai) + '</td><td>' + esc(x.faktur.join(', ')) + '</td><td>' + nf(x.nBarang) + '<br><small>' + esc(x.contoh.join('; ')) + '</small></td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="msg">Tidak ada.</div>');
      });
    }
    gambar();
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = D; return; }
  root.DACC = D;
})(typeof window !== 'undefined' ? window : this);
