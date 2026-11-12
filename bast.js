/* Tambahan 99: BAST (Berita Acara Serah Terima Pekerjaan) otomatis. Admin > Laporan > BAST (khusus admin).
   Alur: unggah laporan IA Accurate "Penyesuaian Stok Barang" (banyak IA) -> dibaca di peramban -> server menyimpan IA,
   memperbarui nilai IA lama, lalu membuat draf BAST (satu per PPBJ / proyek sama). Admin mengubah di layar, unduh Excel/PDF.
   Bergantung: kb-impor.js (KBI: pdf.js), xlsx-tulis.js (XT) + JSZip, pdf-lib (PDFLib), bast-logo.js (BAST_LOGO). */
(function (root) {
  'use strict';
  var BA = {};
  var BULAN3 = {Jan: 1, Feb: 2, Mar: 3, Apr: 4, Mei: 5, Jun: 6, Jul: 7, Agt: 8, Agu: 8, Sep: 9, Okt: 10, Nov: 11, Des: 12};
  var HARI = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
  var BULAN = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember'];
  var ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  var SAT = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
  var KATEGORI = [['1.1', 'Line Pipe SUTET'], ['1.2', 'Intake'], ['1.3', 'WTP'], ['2.1', 'Intake & Pra-sedimentasi'], ['2.2', 'Pipa Air Baku'], ['2.3', 'Pompa air baku & panel2'], ['3.1', 'IPA Cijeruk (UP2)'], ['4.1', 'Pipa Distribusi Utama'], ['4.2', 'Pipa Retikulasi'], ['4.3', 'Sambungan Langsung'], ['4.4', 'Sarana pendukung lainnya'], ['5.1', 'Reservoir'], ['6.1', 'Mekanikal & Elektrikal'], ['7.1', 'Cut & Fill'], ['7.2', 'Jalan akses, jembatan pipa'], ['7.3', 'Bangunan Kimia dan Laboratorium'], ['7.4', 'Bangunan Gudang'], ['7.5', 'Bangunan Kantor'], ['7.6', 'Rumah Genset'], ['7.7', 'Pengolahan Lumpur'], ['8.1', 'Appraisal & Legal Fees'], ['8.2', 'Commitment Fee'], ['8.3', 'Administration Fee + Others'], ['9', 'Perijinan'], ['10', 'Design & Supervision']];
  var KATN = {}; KATEGORI.forEach(function (k) { KATN[k[0]] = k[1]; });
  var LOKASI = ['Pelanggan', 'Intake', 'Kantor Modern', 'Kantor Cijeruk', 'WTP'], AKUN = ['CIP - Aset Konsesi', 'Perbaikan'];
  var TTD = [['teknik', 'Teknik'], ['pengadaan', 'Pengadaan'], ['legal', 'Legal'], ['gudang', 'Gudang'], ['keuangan', 'Keuangan']];
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
  function kata(n) {
    if (n < 12) return SAT[n]; if (n < 20) return kata(n - 10) + ' belas';
    if (n < 100) return kata(Math.floor(n / 10)) + ' puluh' + (n % 10 ? ' ' + kata(n % 10) : '');
    if (n < 200) return 'seratus' + (n > 100 ? ' ' + kata(n - 100) : '');
    if (n < 1000) return kata(Math.floor(n / 100)) + ' ratus' + (n % 100 ? ' ' + kata(n % 100) : '');
    if (n < 2000) return 'seribu' + (n > 1000 ? ' ' + kata(n - 1000) : '');
    return kata(Math.floor(n / 1000)) + ' ribu' + (n % 1000 ? ' ' + kata(n % 1000) : '');
  }
  function tglD(s) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null; }
  function dmy(s, sep) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? m[3] + (sep || '/') + m[2] + (sep || '/') + m[1] : (s || ''); }
  function kalimat(s) { var d = tglD(s); if (!d) return ''; return 'Pada hari ini ' + HARI[d.getDay()] + ', tanggal ' + kata(d.getDate()) + ' bulan ' + BULAN[d.getMonth()] + ' tahun ' + kata(d.getFullYear()) + ' (' + dmy(s, '-') + '), telah diadakan Pemeriksaan'; }
  function nomorAuto(no, tgl) { var d = tglD(tgl) || new Date(); return ('00' + (Number(no) || 0)).slice(-3) + '/UMO-CIP-GD/' + ROMAWI[d.getMonth()] + '/' + d.getFullYear(); }
  function rpTeks(n) { n = Number(n) || 0; var s = Math.abs(n).toLocaleString('id-ID', {maximumFractionDigits: 2}); return (n < 0 ? '-' : '') + s; }
  BA.kata = kata; BA.kalimat = kalimat; BA.nomorAuto = nomorAuto; BA.KATN = KATN;

  /* ================= 1. baca laporan IA (PDF "Penyesuaian Stok Barang") ================= */
  var NUM = /^-?[\d.,]+$/;
  function angka(t) { t = String(t || '').trim(); if (!NUM.test(t) || !/\d/.test(t)) return null; var n = Number(t.replace(/\./g, '').replace(',', '.')); return isFinite(n) ? n : null; }
  function kolom(i, t) {
    var x = i.x, r = i.x + (i.w || 0);
    if (x < 130) return 'kode';
    if (NUM.test(t)) {
      if (x >= 262 && r <= 345) return 'qty';
      if (x >= 345 && r <= 520) return 'harga';
      if (x >= 520 && r <= 625) return 'total';
      if (r >= 840 && r <= 925) return 'jumlah';
    }
    if (x < 345) return 'nama'; if (x < 460) return 'satuan'; if (x < 860) return 'ket'; return 'akun';
  }
  function ppbjTeks(k) {
    var re = /(\d{1,3}[A-Z]?)\s*\/\s*([A-Z]{2,4}(?:\s*\/\s*[A-Z]{2,4})?)\s*\/\s*([IVX]{1,4})\s*\/\s*(\d{4})([A-Z]?)(?!\d)/g, m, out = [];
    k = String(k || '');
    while ((m = re.exec(k))) {
      if (m.index > 0 && /\d/.test(k.charAt(m.index - 1))) continue;
      var g = m[2].replace(/\s/g, ''); if (/INV/i.test(g)) continue;
      var x = m[1] + '/' + g + '/' + m[3] + '/' + m[4] + m[5]; if (out.indexOf(x) < 0) out.push(x);
    }
    return out;
  }
  BA.ppbjTeks = ppbjTeks;
  /** pages dari KBI.pdfKeHalaman -> {ia:[{no,tgl,ket,ppbj,nilai,akun,items}], warn} atau {err}. */
  BA.bacaLaporan = function (pages) {
    if (!pages || !pages.length) return {err: 'PDF kosong.'};
    var all = [], off = 0, judul = false;
    pages.forEach(function (pg) { (pg.items || []).forEach(function (i) { var s = String(i.s == null ? '' : i.s).trim(); if (!s) return; if (/^Penyesuaian Stok Barang$/i.test(s)) judul = true; all.push({s: s, x: i.x, y: i.y + off, w: i.w || 0}); }); off += pg.h || 0; });
    if (!judul) {
      if (all.some(function (i) { return /^Penyesuaian Persediaan$/i.test(i.s); })) return {err: 'Ini cetakan satu IA (Penyesuaian Persediaan) tanpa harga. Untuk membuat BAST, unggah LAPORAN "Penyesuaian Stok Barang" dari Accurate (banyak IA, ada harga).'};
      return {err: 'Format PDF tidak dikenali. Unggah laporan Accurate "Penyesuaian Stok Barang".'};
    }
    all.sort(function (a, b) { return a.y - b.y || a.x - b.x; });
    var lines = [], cur = null;
    all.forEach(function (i) { if (!cur || i.y - cur.y > 1.5) { cur = {y: i.y, it: []}; lines.push(cur); } cur.it.push(i); });
    var docs = [], doc = null, it = null, warn = [];
    lines.forEach(function (ln) {
      ln.it.sort(function (a, b) { return a.x - b.x; });
      var teks = ln.it.map(function (i) { return i.s; }).join(' ').replace(/\s+/g, ' ').trim();
      var m = /^Nomor #\s*(IA\.\S+)\s*(?:Keterangan\s*(.*))?$/.exec(teks);
      if (m) { doc = {no: m[1], ket: m[2] || '', tgl: '', items: []}; docs.push(doc); it = null; return; }
      if (/^Nomor #/.test(teks)) { if (warn.length < 5) warn.push('Nomor IA tidak terbaca: ' + teks.slice(0, 60)); doc = null; return; }
      if (!doc) return;
      var tI = ln.it.filter(function (i) { return i.s === 'Tanggal' && i.x < 100; })[0];
      if (tI && !doc.tgl) {   // baris Tanggal (kadang satu baris dengan sambungan keterangan di kanan)
        var tg = ln.it.filter(function (i) { return i.x >= 100 && i.x < 300; }).map(function (i) { return i.s; }).join(' ');
        ln.it.filter(function (i) { return i.x >= 540; }).forEach(function (i) { doc.ket = (doc.ket + ' ' + i.s).trim(); });
        teks = 'Tanggal ' + tg;
      }
      var mt = /^Tanggal\s+(\d{1,2}) ([A-Za-z]{3}) (\d{4})$/.exec(teks);
      if (mt) { doc.tgl = mt[3] + '-' + ('0' + (BULAN3[mt[2]] || 0)).slice(-2) + '-' + ('0' + mt[1]).slice(-2); return; }
      var d = {};
      ln.it.forEach(function (i) { var k = kolom(i, i.s); d[k] = (d[k] ? d[k] + ' ' : '') + i.s; });
      if (d.qty != null && d.harga != null && d.total != null) {
        it = {kode: d.kode || '', nama: d.nama || '', qty: d.qty, satuan: d.satuan || '', harga: d.harga, total: d.total, jumlah: d.jumlah || '', akun: d.akun || ''};
        doc.items.push(it); return;
      }
      if (!doc.items.length) { doc.ket = (doc.ket + ' ' + teks).trim(); return; }   // keterangan IA berlanjut
      if (it) {
        it.kode += d.kode || ''; it.nama = (it.nama + ' ' + (d.nama || '')).trim(); it.satuan = (it.satuan + ' ' + (d.satuan || '')).trim();
        if (d.akun) it.akun = (it.akun + ' ' + d.akun).trim();
      }
    });
    var out = [], salah = 0;
    docs.forEach(function (x) {
      var items = [], ok = x.items.length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(x.tgl), jml = null;
      x.items.forEach(function (i) {
        var q = angka(i.qty), h = angka(i.harga), t = angka(i.total), j = angka(i.jumlah);
        if (q == null || h == null || t == null) { ok = false; return; }
        if (j != null) jml = j;
        items.push({kode: i.kode.trim(), nama: i.nama.replace(/\s+/g, ' ').trim(), qty: q, satuan: i.satuan.trim(), harga: h, total: t, akun: i.akun.replace(/\s+/g, ' ').trim()});
      });
      if (!ok || jml == null) { salah++; if (warn.length < 5) warn.push(x.no + ' tidak lengkap terbaca, dilewati.'); return; }
      var sum = items.reduce(function (a, i) { return a + i.total; }, 0);
      if (Math.abs(Math.abs(sum) - Math.abs(jml)) > 1 && warn.length < 8) warn.push(x.no + ': jumlah baris ' + rpTeks(sum) + ' beda dengan nilai IA ' + rpTeks(jml) + '.');
      var akun = []; items.forEach(function (i) { if (i.akun && akun.indexOf(i.akun) < 0) akun.push(i.akun); });
      var ket = x.ket.replace(/\s+/g, ' ').trim();
      out.push({no: x.no, tgl: x.tgl, ket: ket, ppbj: ppbjTeks(ket), nilai: jml, akun: akun.join(', '), items: items});
    });
    if (!out.length) return {err: 'Tidak ada IA yang terbaca dari PDF ini.'};
    return {ia: out, warn: warn, salah: salah};
  };

  /* ================= 2. Excel (bentuk template BAST) ================= */
  var RP = '_-"Rp"* #,##0_-;\\-"Rp"* #,##0_-;_-"Rp"* "-"??_-;_-@_-', RP2 = '_-"Rp"* #,##0.##_-;\\-"Rp"* #,##0.##_-;_-"Rp"* "-"??_-;_-@_-';
  function rpf(v) { return Math.abs(v - Math.round(v)) > 1e-9 ? RP2 : RP; }
  function b64ke(b) { if (typeof atob === 'function') { var s = atob(b), u = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; } return new Uint8Array(Buffer.from(b, 'base64')); }
  function F(o) { return Object.assign({name: 'Arial', sz: 10}, o || {}); }
  function bd(l, r, t, b) { return {l: !!l, r: !!r, t: !!t, b: !!b}; }
  /** list = data BAST dari adminBastRinci; ia = peta IA. Hasil: Buku XT. */
  BA.excel = function (list, ia, logo, komp) {
    var wb = root.XT.buku(), lg = logo ? b64ke(logo) : null;
    var D = wb.sheet('Daftar BAST', {}), B = wb.sheet('Bantu', {sembunyi: true});
    LOKASI.forEach(function (x, i) { B.set(i + 1, 1, x); }); AKUN.forEach(function (x, i) { B.set(i + 1, 2, x); });
    KATEGORI.forEach(function (k, i) { B.set(i + 1, 3, k[0]); B.set(i + 1, 4, k[1]); });
    var hd = {font: F({b: true}), fill: 'D9E1F2', border: bd(1, 1, 1, 1)}, sel = {font: F(), border: bd(1, 1, 1, 1)};
    D.set(1, 1, 'Daftar BAST', {font: F({sz: 12, b: true})});
    ['No BAST', 'Sheet', 'Tanggal', 'Nama pekerjaan', 'Proyek', 'No PPBJ', 'Jumlah baris', 'Total (Rp)', 'Kategori'].forEach(function (h, i) { D.set(3, i + 1, h, hd); });
    [24, 10, 12, 50, 40, 30, 8, 16, 14].forEach(function (w, i) { D.kolom(i + 1, w); }); D.bekukan(4, 1);
    var W = {1: 1.3, 2: 1.6, 3: 4.5, 4: 18.5, 5: 32.1, 6: 15.5, 7: 5, 8: 3.1, 9: 22.8, 10: 5.6, 11: 12.6, 12: 12.1, 13: 2.6, 14: 3};
    var nama = {};
    list.forEach(function (b, ix) {
      var nm = ('BAST ' + ('00' + b.noUrut).slice(-3)), k = 1; while (nama[nm]) nm = 'BAST ' + ('00' + b.noUrut).slice(-3) + ' (' + (++k) + ')'; nama[nm] = 1;
      var s = wb.sheet(nm, {garis: false}), baris = (b.data && b.data.baris) || [], tt = (b.data && b.data.ttd) || {};
      Object.keys(W).forEach(function (c) { s.kolom(Number(c), W[c]); });
      var tinggi = {2: 23, 3: 13, 4: 10, 5: 14, 6: 14, 7: 6, 11: 18, 12: 6.75, 13: 12, 14: 15, 15: 15.75, 17: 30, 18: 15.75, 19: 15.75, 20: 16.5, 21: 13};
      Object.keys(tinggi).forEach(function (r) { s.baris(Number(r), tinggi[r]); });
      if (lg) s.gambar(lg, 2, 4, 46, 45);
      s.gabung(2, 5, 2, 14); s.set(2, 5, 'PT. SARANA CATUR TIRTAKELOLA', {font: F({sz: 18, b: true}), al: {h: 'center'}});
      s.set(5, 4, 'Divisi (User)', {font: F({b: true}), al: {v: 'center'}}); s.set(5, 5, ':', {font: F(), al: {h: 'right'}});
      s.set(6, 4, 'Proyek', {font: F({b: true}), al: {v: 'center'}}); s.set(6, 5, ':', {font: F(), al: {h: 'right'}});
      [5, 6].forEach(function (r) { s.gabung(r, 6, r, 9); for (var c = 6; c <= 9; c++) s.gaya(r, c, {font: F(), border: bd(c === 6, c === 9, 1, 1), al: {v: 'center', shrink: true}}); });
      s.set(5, 6, (b.data && b.data.divisi) || 'TEKNIK', {font: F(), border: bd(1, 0, 1, 1), al: {v: 'center', shrink: true}});
      s.set(6, 6, String(b.proyek || '').toUpperCase(), {font: F(), border: bd(1, 0, 1, 1), al: {v: 'center', shrink: true}});
      s.gabung(5, 10, 5, 11); s.set(5, 10, 'Kategori :', {font: F({b: true}), al: {h: 'right'}});
      [[5, 'Asset Konsesi'], [6, 'Perbaikan']].forEach(function (x) {
        s.gabung(x[0], 12, x[0], 13); s.set(x[0], 12, x[1], {font: F(), border: bd(1, 0, 1, 1), al: {v: 'center'}}); s.gaya(x[0], 13, {border: bd(0, 1, 1, 1)});
        s.set(x[0], 14, b.kat === x[1] ? 'ü' : '', {font: {name: 'Wingdings', sz: 10, b: true}, border: bd(1, 1, 1, 1), al: {h: 'center'}});
      });
      s.gabung(11, 3, 11, 14); s.set(11, 3, 'BERITA  ACARA SERAH TERIMA PEKERJAAN', {font: F({sz: 14, b: true}), al: {h: 'center'}, border: bd(1, 0, 1, 1)});
      for (var c0 = 4; c0 <= 14; c0++) s.gaya(11, c0, {border: bd(0, c0 === 14, 1, 1)});
      s.gabung(13, 3, 14, 14); s.set(13, 3, b.nama, {font: F({b: true}), al: {h: 'center', wrap: true}});
      s.gabung(15, 3, 15, 14); s.set(15, 3, 'No : ' + b.nomor, {font: F(), al: {h: 'center'}});
      s.gabung(17, 3, 17, 14); s.set(17, 3, kalimat(b.tgl), {font: F(), al: {h: 'left', wrap: true}});
      s.gabung(18, 3, 19, 14); s.set(18, 3, b.nama, {font: F({b: true}), al: {h: 'center', wrap: true}});
      s.set(20, 3, 'dengan resume pekerjaan sesuai dengan jenis / kategori, sebagai berikut (perincian terlampir):', {font: F()});
      [[3, 3, 'No.'], [4, 5, 'Vendor'], [6, 6, 'Lokasi'], [7, 9, 'Jenis Kelompok / Kategori'], [10, 11, 'Jumlah Harga']].forEach(function (h) { if (h[0] !== h[1]) s.gabung(22, h[0], 22, h[1]); s.set(22, h[0], h[2], {font: F(), al: {h: 'center'}, border: bd(1, 1, 1, 1)}); });
      for (var c1 = 3; c1 <= 11; c1++) s.gaya(22, c1, {font: F(), al: {h: 'center'}, border: bd(1, 1, 1, 1)});
      var V = {3: [1, 1], 4: [1, 0], 5: [0, 1], 6: [1, 1], 7: [1, 0], 8: [0, 0], 9: [0, 1], 10: [1, 0], 11: [0, 1]};
      function garis(r) { Object.keys(V).forEach(function (c) { if (!s.sel[r + ':' + c]) s.gaya(r, Number(c), {border: bd(V[c][0], V[c][1], 0, 0)}); }); }
      function sg(r, c, v, g) { var v2 = V[c]; g = Object.assign({}, g); g.border = bd(v2 ? v2[0] : 0, v2 ? v2[1] : 0, 0, 0); s.set(r, c, v, g); }
      garis(23);
      var r = 24, first = 24, ents = baris.concat([{kosong: 1}, {kosong: 1}]);
      ents.forEach(function (x) {
        for (var k2 = 0; k2 < 4; k2++) s.baris(r + k2, 14);
        for (var k3 = 0; k3 < 3; k3++) { s.gabung(r + k3, 4, r + k3, 5); s.gabung(r + k3, 8, r + k3, 9); }
        s.gabung(r, 10, r, 11);
        sg(r, 3, {f: 'IF(J' + r + '="","",COUNT($J$' + first + ':J' + r + '))'}, {font: F(), al: {h: 'center'}});
        if (!x.kosong) {
          sg(r, 4, x.akun || '', {font: F({b: true}), al: {h: 'center'}});
          sg(r + 1, 4, x.ppbj || '', {font: F(), al: {h: 'center'}});
          sg(r + 2, 4, (x.no || '') + (x.tgl ? ' (' + dmy(x.tgl) + ')' : ''), {font: F(), al: {h: 'center'}});
          sg(r, 6, x.lokasi || '', {font: F(), al: {h: 'center'}});
          sg(r, 7, x.kode || '', {font: {name: 'Arial Narrow', sz: 11}, al: {h: 'center'}});
          sg(r, 10, Number(x.nilai) || 0, {font: F(), fmt: rpf(Number(x.nilai) || 0)});
        } else sg(r, 10, null, {font: F(), fmt: RP});
        sg(r, 8, {f: 'IFERROR(VLOOKUP(G' + r + '&"",Bantu!$C$1:$D$' + KATEGORI.length + ',2,FALSE),"")'}, {font: {name: 'Arial Narrow', sz: 11}});
        s.pilihan('F' + r, 'Bantu!$A$1:$A$' + LOKASI.length); s.pilihan('D' + r, 'Bantu!$B$1:$B$' + AKUN.length); s.pilihan('G' + r, 'Bantu!$C$1:$C$' + KATEGORI.length);
        for (var k4 = 0; k4 < 4; k4++) garis(r + k4);
        r += 4;
      });
      var last = r - 1; garis(r); r++;
      var tr = r, tot = baris.reduce(function (a, x) { return a + (Number(x.nilai) || 0); }, 0);
      s.gabung(tr, 4, tr, 5); s.gabung(tr, 7, tr, 9); s.gabung(tr, 10, tr, 11);
      for (var c2 = 3; c2 <= 11; c2++) s.gaya(tr, c2, {font: F({b: true}), border: bd([3, 4, 6, 7, 10].indexOf(c2) >= 0, [3, 5, 6, 9, 11].indexOf(c2) >= 0, 1, 1), al: {h: 'center'}});
      s.set(tr, 7, 'TOTAL', {font: F({b: true}), border: bd(1, 0, 1, 1), al: {h: 'center'}});
      s.set(tr, 10, {f: 'SUM(J' + first + ':J' + last + ')'}, {font: F({b: true}), border: bd(1, 0, 1, 1), fmt: rpf(tot)});
      r = tr + 2;
      s.gabung(r, 3, r, 14); s.set(r, 3, 'Sebagaimana tersebut di atas, pekerjaan telah diselesaikan 100%, dalam kondisi baik, dan dapat dipergunakan sesuai fungsinya.', {font: F(), al: {h: 'justify'}});
      r += 2; s.gabung(r, 3, r, 14); s.set(r, 3, 'Sebagai   kelengkapan   dari  Berita  Acara  Serah  Terima  Pekerjaan ini, turut dilampirkan:', {font: F(), al: {h: 'justify'}});
      s.set(r + 1, 3, 1, {font: F(), al: {h: 'center'}}); s.set(r + 1, 4, 'Daftar penerimaan barang dan/ atau', {font: F()});
      s.set(r + 2, 3, 2, {font: F(), al: {h: 'center'}}); s.set(r + 2, 4, 'Daftar Penyesuaian Persediaan', {font: F()});
      r += 5; s.gabung(r, 3, r, 14); s.baris(r, 30);
      s.set(r, 3, 'Demikian Berita Acara Serah Terima Pekerjaan ini dibuat dan ditanda tangani di Serang pada tanggal tersebut diatas oleh kedua belah pihak, diperiksa dan diketahui oleh atasan langsung, untuk dapat dipergunakan sebagai mana mestinya.', {font: F(), al: {h: 'justify', wrap: true}});
      r++; s.gabung(r, 3, r, 8); s.set(r, 3, 'Dibuat oleh,', {font: F(), al: {h: 'center'}}); s.gabung(r, 9, r, 14); s.set(r, 9, 'Diterima Oleh,', {font: F(), al: {h: 'center'}});
      r += 6;
      [[3, 4, 'teknik'], [5, 5, 'pengadaan'], [6, 6, 'legal'], [7, 8, 'gudang'], [9, 14, 'keuangan']].forEach(function (x) {
        if (x[0] !== x[1]) { s.gabung(r, x[0], r, x[1]); s.gabung(r + 1, x[0], r + 1, x[1]); }
        var lb = TTD.filter(function (t) { return t[0] === x[2]; })[0][1];
        s.set(r, x[0], lb, {font: F({b: true}), al: {h: 'center'}}); s.set(r + 1, x[0], tt[x[2]] || '', {font: F(), al: {h: 'center'}});
      });
      var akhir = r + 2; s.pindah(akhir);
      // lampiran: daftar penyesuaian persediaan
      r = akhir + 2;
      s.gabung(r, 3, r, 14); s.set(r, 3, 'LAMPIRAN - DAFTAR PENYESUAIAN PERSEDIAAN', {font: F({sz: 12, b: true}), al: {h: 'center'}});
      r++; s.gabung(r, 3, r, 14); s.set(r, 3, 'Berita Acara Serah Terima Pekerjaan ' + b.nomor, {font: F(), al: {h: 'center'}});
      r++; s.gabung(r, 3, r, 14); s.set(r, 3, b.nama, {font: F({b: true}), al: {h: 'center', wrap: true}});
      r += 2; var subs = [];
      baris.filter(function (x) { return x.jenis === 'IA' && ia[x.no]; }).forEach(function (x) {
        var d = ia[x.no];
        s.gabung(r, 3, r, 14); s.set(r, 3, d.no + '  |  ' + dmy(d.tgl) + '  |  ' + (d.ppbj && d.ppbj.length ? 'PPBJ ' + d.ppbj.join(', ') : 'tanpa PPBJ'), {font: F({b: true})}); r++;
        s.gabung(r, 3, r, 14); s.baris(r, d.ket.length > 110 ? 26 : 14); s.set(r, 3, 'Keterangan: ' + d.ket, {font: F({sz: 9, i: true}), al: {h: 'left', wrap: true}}); r++;
        [[3, 3, 'No'], [4, 4, 'Kode Barang'], [5, 5, 'Nama Barang'], [6, 6, 'Qty'], [7, 8, 'Satuan'], [9, 9, 'Harga Satuan'], [10, 11, 'Total']].forEach(function (h) { if (h[0] !== h[1]) s.gabung(r, h[0], r, h[1]); s.set(r, h[0], h[2], hd); });
        for (var c3 = 3; c3 <= 11; c3++) s.gaya(r, c3, hd).set(r, 3, 'No', hd);
        [[4, 'Kode Barang'], [5, 'Nama Barang'], [6, 'Qty'], [7, 'Satuan'], [9, 'Harga Satuan'], [10, 'Total']].forEach(function (h) { s.set(r, h[0], h[1], Object.assign({}, hd, {al: {h: 'center'}})); });
        r++; var f0 = r;
        d.items.forEach(function (it, i) {
          s.gabung(r, 7, r, 8); s.gabung(r, 10, r, 11);
          s.set(r, 3, i + 1, Object.assign({}, sel, {al: {h: 'center'}})); s.set(r, 4, it.kode, {font: F({sz: 8}), border: bd(1, 1, 1, 1), al: {wrap: true}});
          s.set(r, 5, it.nama, {font: F({sz: 9}), border: bd(1, 1, 1, 1), al: {wrap: true}}); s.set(r, 6, it.qty, Object.assign({}, sel, {fmt: '#,##0.###'}));
          s.set(r, 7, it.satuan, Object.assign({}, sel, {al: {h: 'center'}})); s.gaya(r, 8, sel);
          s.set(r, 9, it.harga, Object.assign({}, sel, {fmt: rpf(it.harga)})); s.set(r, 10, it.total, Object.assign({}, sel, {fmt: rpf(it.total)})); s.gaya(r, 11, sel);
          r++;
        });
        s.gabung(r, 3, r, 9); s.gabung(r, 10, r, 11);
        for (var c4 = 3; c4 <= 11; c4++) s.gaya(r, c4, {font: F({b: true}), border: bd(1, 1, 1, 1)});
        s.set(r, 3, 'Jumlah ' + d.no, {font: F({b: true}), border: bd(1, 1, 1, 1), al: {h: 'right'}});
        s.set(r, 10, {f: 'SUM(J' + f0 + ':J' + (r - 1) + ')'}, {font: F({b: true}), border: bd(1, 1, 1, 1), fmt: rpf(d.nilai)});
        subs.push(r); r += 2;
      });
      if (subs.length) {
        s.gabung(r, 3, r, 9); s.gabung(r, 10, r, 11);
        for (var c5 = 3; c5 <= 11; c5++) s.gaya(r, c5, {font: F({b: true}), border: bd(1, 1, 1, 1)});
        s.set(r, 3, 'TOTAL LAMPIRAN', {font: F({b: true}), border: bd(1, 1, 1, 1), al: {h: 'right'}});
        s.set(r, 10, {f: subs.map(function (x) { return 'J' + x; }).join('+')}, {font: F({b: true}), border: bd(1, 1, 1, 1), fmt: RP});
      }
      s.atur({area: 'C1:N' + (r + 1), fitW: 1, kertas: 9, tengah: true});
      var rr = 4 + ix;
      [b.nomor, nm, tglD(b.tgl), b.nama, b.proyek, baris.map(function (x) { return x.ppbj; }).filter(String).filter(function (v, i, a) { return a.indexOf(v) === i; }).join('; '), baris.length, tot, b.kat].forEach(function (v, i) {
        D.set(rr, i + 1, v, Object.assign({}, sel, i === 2 ? {fmt: 'dd/mm/yyyy'} : i === 7 ? {fmt: '#,##0'} : {}));
      });
      D.set(rr, 2, nm, {font: F({color: '0563C1', u: true}), border: bd(1, 1, 1, 1)}); D.tautan(rr, 2, "'" + nm + "'!A1");
    });
    var j = 4 + list.length; D.set(j, 7, 'TOTAL', {font: F({b: true})}); D.set(j, 8, {f: 'SUM(H4:H' + (j - 1) + ')'}, {font: F({b: true}), fmt: '#,##0'});
    if (komp && Object.keys(komp).length) excelKomparasi(wb, list, komp);
    return wb;
  };

  /* ================= 3. PDF (pdf-lib) ================= */
  function aman(t) { return String(t == null ? '' : t).replace(/[–—]/g, '-').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/…/g, '...').replace(/[^\x20-\x7E\xA0-\xFF]/g, '?'); }
  BA.pdf = function (list, ia, PDFLib, logo) {
    var L = PDFLib, doc, f, fb, fi, img, W = 595.28, H = 841.89, M = 36, CW = W - 2 * M, page, y;
    function baru() { page = doc.addPage([W, H]); y = H - M; }
    function tw(t, font, sz) { return font.widthOfTextAtSize(aman(t), sz); }
    function teks(t, x, yy, font, sz, opt) { t = aman(t); opt = opt || {}; var w = font.widthOfTextAtSize(t, sz), xx = opt.h === 'center' ? x + ((opt.w || 0) - w) / 2 : opt.h === 'right' ? x + (opt.w || 0) - w : x; page.drawText(t, {x: xx, y: yy, size: sz, font: font}); }
    function bungkus(t, font, sz, w) { var out = [], kal = aman(t).split(/\s+/), cur = ''; kal.forEach(function (k) { var c = cur ? cur + ' ' + k : k; if (font.widthOfTextAtSize(c, sz) <= w || !cur) cur = c; else { out.push(cur); cur = k; } }); if (cur) out.push(cur); var r2 = []; out.forEach(function (l) { while (font.widthOfTextAtSize(l, sz) > w && l.length > 1) { var n = l.length; while (n > 1 && font.widthOfTextAtSize(l.slice(0, n), sz) > w) n--; r2.push(l.slice(0, n)); l = l.slice(n); } r2.push(l); }); return r2.length ? r2 : ['']; }
    function garis(x1, y1, x2, y2) { page.drawLine({start: {x: x1, y: y1}, end: {x: x2, y: y2}, thickness: 0.6, color: L.rgb(0, 0, 0)}); }
    function kotak(x, yy, w, h) { page.drawRectangle({x: x, y: yy, width: w, height: h, borderWidth: 0.6, borderColor: L.rgb(0, 0, 0)}); }
    function cek(x, yy) { page.drawLine({start: {x: x + 2, y: yy + 4}, end: {x: x + 4.5, y: yy + 1.5}, thickness: 1.1, color: L.rgb(0, 0, 0)}); page.drawLine({start: {x: x + 4.5, y: yy + 1.5}, end: {x: x + 9, y: yy + 8}, thickness: 1.1, color: L.rgb(0, 0, 0)}); }
    function rp(n) { return rpTeks(n); }
    return L.PDFDocument.create().then(function (d) {
      doc = d; return Promise.all([doc.embedFont(L.StandardFonts.Helvetica), doc.embedFont(L.StandardFonts.HelveticaBold), doc.embedFont(L.StandardFonts.HelveticaOblique), logo ? doc.embedJpg(b64ke(logo)) : null]);
    }).then(function (a) {
      f = a[0]; fb = a[1]; fi = a[2]; img = a[3];
      // kolom tabel (proporsi dari template)
      var cw = [4.5, 50.6, 15.5, 30.9, 18.2], tot0 = cw.reduce(function (p, c) { return p + c; }, 0), X = [M], k;
      for (k = 0; k < cw.length; k++) X.push(X[k] + cw[k] / tot0 * CW);
      list.forEach(function (b) {
        var baris = (b.data && b.data.baris) || [], tt = (b.data && b.data.ttd) || {};
        baru();
        if (img) page.drawImage(img, {x: M + 34, y: y - 40, width: 40, height: 40});
        teks('PT. SARANA CATUR TIRTAKELOLA', M + 90, y - 26, fb, 15, {h: 'center', w: CW - 90});
        y -= 56;
        var xL = M + 34, xV = M + 150, wV = 220, xK = M + 395;
        [['Divisi (User)', (b.data && b.data.divisi) || 'TEKNIK', 'Asset Konsesi'], ['Proyek', String(b.proyek || '').toUpperCase(), 'Perbaikan']].forEach(function (r0) {
          teks(r0[0], xL, y + 3, fb, 8.5); teks(':', xV - 8, y + 3, f, 8.5);
          kotak(xV, y, wV, 12); var v = aman(r0[1]), sz = 8; while (sz > 5 && f.widthOfTextAtSize(v, sz) > wV - 4) sz -= 0.5; teks(v, xV + 2, y + 3, f, sz);
          kotak(xK + 50, y, 62, 12); teks(r0[2], xK + 52, y + 3, f, 8); kotak(xK + 112, y, 12, 12); if (b.kat === r0[2]) cek(xK + 113, y + 1);
          y -= 12;
        });
        teks('Kategori :', xK + 4, y + 15, fb, 8.5);
        y -= 18; kotak(M, y - 4, CW, 16); teks('BERITA  ACARA SERAH TERIMA PEKERJAAN', M, y + 1, fb, 11.5, {h: 'center', w: CW}); y -= 22;
        bungkus(b.nama, fb, 9, CW - 40).forEach(function (l) { teks(l, M, y, fb, 9, {h: 'center', w: CW}); y -= 11; });
        y -= 2; teks('No : ' + b.nomor, M, y, f, 9, {h: 'center', w: CW}); y -= 18;
        bungkus(kalimat(b.tgl), f, 9, CW).forEach(function (l) { teks(l, M, y, f, 9); y -= 11; });
        y -= 4; bungkus(b.nama, fb, 9, CW - 40).forEach(function (l) { teks(l, M, y, fb, 9, {h: 'center', w: CW}); y -= 11; });
        y -= 4; teks('dengan resume pekerjaan sesuai dengan jenis / kategori, sebagai berikut (perincian terlampir):', M, y, f, 9); y -= 10;
        function kepala() { var h = 14; kotak(M, y - h, CW, h); for (var i = 1; i < 5; i++) garis(X[i], y, X[i], y - h); ['No.', 'Vendor', 'Lokasi', 'Jenis Kelompok / Kategori', 'Jumlah Harga'].forEach(function (t, i) { teks(t, X[i], y - 10, f, 8.5, {h: 'center', w: X[i + 1] - X[i]}); }); y -= h; }
        function sisiTegak(y1, y2) { [0, 1, 2, 3, 4, 5].forEach(function (i) { garis(X[i], y1, X[i], y2); }); }
        kepala(); var no = 0, tot = 0;
        baris.forEach(function (x) {
          var h = 48; if (y - h < M + 20) { sisiTegak(y, y); garis(M, y, X[5], y); baru(); kepala(); }
          no++; tot += Number(x.nilai) || 0;
          sisiTegak(y, y - h);
          teks(String(no), X[0], y - 13, f, 8.5, {h: 'center', w: X[1] - X[0]});
          teks(x.akun || '', X[1], y - 13, fb, 8.5, {h: 'center', w: X[2] - X[1]});
          var pp = bungkus(x.ppbj || '', f, 8, X[2] - X[1] - 6)[0]; teks(pp, X[1], y - 24, f, 8, {h: 'center', w: X[2] - X[1]});
          teks((x.no || '') + (x.tgl ? ' (' + dmy(x.tgl) + ')' : ''), X[1], y - 35, f, 8, {h: 'center', w: X[2] - X[1]});
          teks(x.lokasi || '', X[2], y - 13, f, 8.5, {h: 'center', w: X[3] - X[2]});
          if (x.kode) { teks(x.kode, X[3] + 3, y - 13, f, 8.5); teks(bungkus(x.knama || KATN[x.kode] || '', f, 8, X[4] - X[3] - 28)[0], X[3] + 24, y - 13, f, 8); }
          teks('Rp', X[4] + 3, y - 13, f, 8.5); teks(rp(x.nilai), X[4], y - 13, f, 8.5, {h: 'right', w: X[5] - X[4] - 4});
          y -= h;
        });
        sisiTegak(y, y - 6); y -= 6;
        kotak(M, y - 14, CW, 14); garis(X[1], y, X[1], y - 14); garis(X[2], y, X[2], y - 14); garis(X[3], y, X[3], y - 14); garis(X[4], y, X[4], y - 14);
        teks('TOTAL', X[3], y - 10, fb, 8.5, {h: 'center', w: X[4] - X[3]}); teks('Rp', X[4] + 3, y - 10, fb, 8.5); teks(rp(tot), X[4], y - 10, fb, 8.5, {h: 'right', w: X[5] - X[4] - 4}); y -= 30;
        if (y < M + 200) baru();
        teks('Sebagaimana tersebut di atas, pekerjaan telah diselesaikan 100%, dalam kondisi baik, dan dapat dipergunakan sesuai fungsinya.', M, y, f, 9); y -= 22;
        teks('Sebagai kelengkapan dari Berita Acara Serah Terima Pekerjaan ini, turut dilampirkan:', M, y, f, 9); y -= 12;
        teks('1', M + 4, y, f, 9); teks('Daftar penerimaan barang dan/ atau', M + 20, y, f, 9); y -= 11;
        teks('2', M + 4, y, f, 9); teks('Daftar Penyesuaian Persediaan', M + 20, y, f, 9); y -= 26;
        bungkus('Demikian Berita Acara Serah Terima Pekerjaan ini dibuat dan ditanda tangani di Serang pada tanggal tersebut diatas oleh kedua belah pihak, diperiksa dan diketahui oleh atasan langsung, untuk dapat dipergunakan sebagai mana mestinya.', f, 9, CW).forEach(function (l) { teks(l, M, y, f, 9); y -= 11; });
        y -= 4; teks('Dibuat oleh,', M, y, f, 9, {h: 'center', w: CW * 0.68}); teks('Diterima Oleh,', M + CW * 0.68, y, f, 9, {h: 'center', w: CW * 0.32}); y -= 62;
        var pos = [[0, 0.17], [0.17, 0.17], [0.34, 0.17], [0.51, 0.17], [0.68, 0.32]];
        TTD.forEach(function (t, i) { teks(t[1], M + CW * pos[i][0], y, fb, 9, {h: 'center', w: CW * pos[i][1]}); teks(tt[t[0]] || '', M + CW * pos[i][0], y - 12, f, 9, {h: 'center', w: CW * pos[i][1]}); });
        // lampiran
        var iaL = baris.filter(function (x) { return x.jenis === 'IA' && ia[x.no]; });
        if (!iaL.length) return;
        baru();
        teks('LAMPIRAN - DAFTAR PENYESUAIAN PERSEDIAAN', M, y - 10, fb, 11.5, {h: 'center', w: CW}); y -= 24;
        teks('Berita Acara Serah Terima Pekerjaan ' + b.nomor, M, y, f, 9, {h: 'center', w: CW}); y -= 12;
        bungkus(b.nama, fb, 9, CW).forEach(function (l) { teks(l, M, y, fb, 9, {h: 'center', w: CW}); y -= 11; }); y -= 10;
        var lw = [4, 15, 33, 8, 8, 15, 17], lt = lw.reduce(function (p, c) { return p + c; }, 0), LX = [M]; for (k = 0; k < lw.length; k++) LX.push(LX[k] + lw[k] / lt * CW);
        function kepL() { var h = 13; page.drawRectangle({x: M, y: y - h, width: CW, height: h, color: L.rgb(0.85, 0.88, 0.95), borderWidth: 0.6, borderColor: L.rgb(0, 0, 0)}); for (var i = 1; i < 7; i++) garis(LX[i], y, LX[i], y - h); ['No', 'Kode Barang', 'Nama Barang', 'Qty', 'Satuan', 'Harga Satuan', 'Total'].forEach(function (t, i) { teks(t, LX[i], y - 9.5, fb, 8, {h: 'center', w: LX[i + 1] - LX[i]}); }); y -= h; }
        var totL = 0;
        iaL.forEach(function (x) {
          var d = ia[x.no], ketL = bungkus('Keterangan: ' + d.ket, fi, 7.5, CW);
          if (y - 40 - ketL.length * 9 < M) baru();
          teks(d.no + '  |  ' + dmy(d.tgl) + '  |  ' + (d.ppbj && d.ppbj.length ? 'PPBJ ' + d.ppbj.join(', ') : 'tanpa PPBJ'), M, y - 9, fb, 8.5); y -= 12;
          ketL.forEach(function (l) { teks(l, M, y - 8, fi, 7.5); y -= 9; }); y -= 2;
          kepL();
          d.items.forEach(function (it, i) {
            var kd = bungkus(it.kode, f, 7, LX[2] - LX[1] - 4), nm = bungkus(it.nama, f, 7.5, LX[3] - LX[2] - 4), n = Math.max(kd.length, nm.length), h = 4 + n * 9;
            if (y - h < M) { baru(); kepL(); }
            page.drawRectangle({x: M, y: y - h, width: CW, height: h, borderWidth: 0.6, borderColor: L.rgb(0, 0, 0)}); for (var j = 1; j < 7; j++) garis(LX[j], y, LX[j], y - h);
            teks(String(i + 1), LX[0], y - 9, f, 7.5, {h: 'center', w: LX[1] - LX[0]});
            kd.forEach(function (l, j) { teks(l, LX[1] + 2, y - 9 - j * 9, f, 7); }); nm.forEach(function (l, j) { teks(l, LX[2] + 2, y - 9 - j * 9, f, 7.5); });
            teks(rpTeks(it.qty), LX[3], y - 9, f, 7.5, {h: 'right', w: LX[4] - LX[3] - 3}); teks(it.satuan, LX[4], y - 9, f, 7.5, {h: 'center', w: LX[5] - LX[4]});
            teks(rp(it.harga), LX[5], y - 9, f, 7.5, {h: 'right', w: LX[6] - LX[5] - 3}); teks(rp(it.total), LX[6], y - 9, f, 7.5, {h: 'right', w: LX[7] - LX[6] - 3});
            y -= h;
          });
          if (y - 13 < M) baru();
          kotak(M, y - 13, CW, 13); garis(LX[6], y, LX[6], y - 13); teks('Jumlah ' + d.no, M, y - 9.5, fb, 8, {h: 'right', w: LX[6] - M - 4}); teks(rp(d.nilai), LX[6], y - 9.5, fb, 8, {h: 'right', w: LX[7] - LX[6] - 3});
          totL += Number(d.nilai) || 0; y -= 22;
        });
        if (y - 14 < M) baru();
        kotak(M, y - 14, CW, 14); garis(LX[6], y, LX[6], y - 14); teks('TOTAL LAMPIRAN', M, y - 10, fb, 8.5, {h: 'right', w: LX[6] - M - 4}); teks(rp(totL), LX[6], y - 10, fb, 8.5, {h: 'right', w: LX[7] - LX[6] - 3});
      });
      return doc.save();
    });
  };

  /* ================= 1b. baca laporan PPBJ Accurate "Item Requisition Detail" (Tambahan 101) ================= */
  function kolomIr(i) {
    var x = i.x, r = i.x + (i.w || 0), t = String(i.s).trim(), n = NUM.test(t);
    if (x < 130) return 'kode';
    if (x < 280 && !(n && r > 270)) return 'nama';
    if (n && r <= 322) return 'qty';
    if (x >= 330 && x < 470) return 'no';
    if (x >= 470 && x < 550) return 'tgl';
    if (n && r <= 620) return 'harga';
    if (n && r <= 730) return 'total';
    if (x >= 735 && x < 860) return 'po';
    if (n && r <= 925) return 'oqty';
    if (x >= 930) return 'proyek';
    return 'lain';
  }
  /** -> {ppbj:[{no, items:[{kode,nama,qty,tgl,harga,total,po,oqty,proyek}], total}], grand, warn} atau {err} */
  BA.bacaPpbj = function (pages) {
    if (!pages || !pages.length) return {err: 'PDF kosong.'};
    var all = [], off = 0, judul = false;
    pages.forEach(function (pg) { (pg.items || []).forEach(function (i) { var s = String(i.s == null ? '' : i.s).trim(); if (!s) return; if (/^Item Requisition Detail$/i.test(s)) judul = true; all.push({s: s, x: i.x, y: i.y + off, w: i.w || 0}); }); off += pg.h || 0; });
    if (!judul) return {err: 'Format PDF tidak dikenali. Unggah laporan Accurate "Item Requisition Detail".'};
    all.sort(function (a, b) { return a.y - b.y || a.x - b.x; });
    var lines = [], cur = null;
    all.forEach(function (i) { if (!cur || i.y - cur.y > 1.5) { cur = {y: i.y, it: []}; lines.push(cur); } cur.it.push(i); });
    var out = [], g = null, it = null, mulai = false, grand = null, warn = [];
    lines.forEach(function (ln) {
      var d = {}; ln.it.sort(function (a, b) { return a.x - b.x; }).forEach(function (i) { var k = kolomIr(i); d[k] = (d[k] ? d[k] + ' ' : '') + i.s; });
      var ks = Object.keys(d);
      if (d.kode === 'Code#') { mulai = true; return; }
      if (!mulai) return;
      if (/ACCURATE|Tercetak|Halaman \d/.test(ks.map(function (k) { return d[k]; }).join(' '))) return;
      if (ks.length === 1 && ks[0] === 'kode' && /\//.test(d.kode) && !it) { g = {no: d.kode, items: [], sub: null}; out.push(g); return; }
      if (it && ks.length === 1 && ks[0] === 'harga') { it.hs += d.harga; it.harga = angka(it.hs); return; }
      if (d.no && d.tgl && d.qty != null) {
        if (!g) return;
        it = {kode: d.kode || '', nama: d.nama || '', qty: angka(d.qty), no: d.no, tgl: d.tgl, hs: d.harga || '', harga: d.harga != null ? angka(d.harga) : null, total: d.total != null ? angka(d.total) : null, po: d.po || '', oqty: d.oqty != null ? angka(d.oqty) : null, proyek: d.proyek || ''};
        g.items.push(it); return;
      }
      if (!d.kode && !d.nama && d.qty != null && d.total != null && !d.no) { if (g && g.sub) grand = angka(d.total); else if (g) g.sub = angka(d.total); it = null; return; }
      if (it) { it.kode += d.kode || ''; if (d.nama) it.nama += ' ' + d.nama; if (d.proyek) it.proyek += ' ' + d.proyek; if (d.po) it.po += ' ' + d.po; return; }
      if (g && ks.length === 1 && ks[0] === 'kode') { g.no += d.kode; return; }
    });
    var res = [], salah = 0;
    out.forEach(function (x) {
      var items = [];
      x.items.forEach(function (i) {
        var mt = RE_TGL2.exec(String(i.tgl).trim());
        if (i.qty == null || i.total == null || !mt) { salah++; return; }
        items.push({kode: i.kode.trim(), nama: i.nama.replace(/\s+/g, ' ').trim(), qty: i.qty, tgl: mt[3] + '-' + ('0' + (BULAN3[mt[2]] || 0)).slice(-2) + '-' + ('0' + mt[1]).slice(-2), harga: i.harga == null ? 0 : i.harga, total: i.total, po: i.po.replace(/\s+/g, '').trim(), oqty: i.oqty, proyek: i.proyek.replace(/\s+/g, ' ').trim()});
      });
      var tot = items.reduce(function (a, i) { return a + i.total; }, 0);
      if (x.sub != null && Math.abs(tot - x.sub) > 1 && warn.length < 8) warn.push(x.no + ': jumlah baris beda dengan subtotal.');
      if (items.length) res.push({no: x.no.replace(/\s+/g, ''), items: items, total: Math.round(tot * 100) / 100});
    });
    if (!res.length) return {err: 'Tidak ada PPBJ yang terbaca.'};
    if (salah) warn.push(salah + ' baris tidak terbaca, dilewati.');
    var jum = res.reduce(function (a, x) { return a + x.total; }, 0);
    if (grand != null && Math.abs(jum - grand) > 2) warn.push('Total semua PPBJ (' + rpTeks(jum) + ') beda dengan total laporan (' + rpTeks(grand) + ').');
    return {ppbj: res, grand: grand, warn: warn};
  };
  var RE_TGL2 = /^(\d{1,2}) ([A-Za-z]{3}) (\d{4})$/;

  /* ================= 3c. komparasi PPBJ vs BAST (Tambahan 101) ================= */
  function pctTeks(p) { return p == null ? '-' : String(p).replace('.', ',') + '%'; }
  BA.pctTeks = pctTeks;
  /** Halaman lampiran komparasi (pdf-lib) -> Uint8Array */
  BA.pdfKomparasi = function (b, k, L) {
    var doc, f, fb, page, y, W = 595.28, H = 841.89, M = 32, CW = W - 2 * M;
    function baru() { page = doc.addPage([W, H]); y = H - M; }
    function t(x0, s0, xx, yy, font, sz, h, w) { s0 = aman(s0); var tw0 = font.widthOfTextAtSize(s0, sz); while (w && tw0 > w - 3 && s0.length > 3) { s0 = s0.slice(0, -2) + '.'; tw0 = font.widthOfTextAtSize(s0, sz); } page.drawText(s0, {x: h === 'r' ? xx + w - tw0 - 2 : h === 'c' ? xx + (w - tw0) / 2 : xx + 2, y: yy, size: sz, font: font}); }
    function tabel(cols, rows, opt) {
      var tot = cols.reduce(function (a, c) { return a + c[1]; }, 0), X = [M]; cols.forEach(function (c, i) { X.push(X[i] + c[1] / tot * CW); });
      function kep() { page.drawRectangle({x: M, y: y - 13, width: CW, height: 13, color: L.rgb(0.85, 0.88, 0.95), borderWidth: 0.5, borderColor: L.rgb(0, 0, 0)}); cols.forEach(function (c, i) { t(0, c[0], X[i], y - 9.5, fb, 7, 'c', X[i + 1] - X[i]); }); y -= 13; }
      kep();
      rows.forEach(function (r0) {
        if (y - 12 < M) { baru(); kep(); }
        var bold = r0.tebal, warna = r0.warna;
        if (warna) page.drawRectangle({x: M, y: y - 12, width: CW, height: 12, color: warna});
        page.drawRectangle({x: M, y: y - 12, width: CW, height: 12, borderWidth: 0.5, borderColor: L.rgb(0, 0, 0)});
        cols.forEach(function (c, i) { if (i) page.drawLine({start: {x: X[i], y: y}, end: {x: X[i], y: y - 12}, thickness: 0.5, color: L.rgb(0, 0, 0)}); t(0, r0.v[i] == null ? '' : r0.v[i], X[i], y - 8.8, bold ? fb : f, 7, c[2], X[i + 1] - X[i]); });
        y -= 12;
      });
    }
    function warnaPct(p) { return p == null ? null : p > 100 ? L.rgb(0.98, 0.83, 0.83) : p >= 90 ? L.rgb(1, 0.95, 0.8) : null; }
    return L.PDFDocument.create().then(function (d) { doc = d; return Promise.all([doc.embedFont(L.StandardFonts.Helvetica), doc.embedFont(L.StandardFonts.HelveticaBold)]); }).then(function (a) {
      f = a[0]; fb = a[1]; baru();
      t(0, 'LAMPIRAN - KOMPARASI PPBJ (HARGA ESTIMASI) DAN REALISASI', M, y - 10, fb, 11, 'c', CW); y -= 24;
      t(0, 'Berita Acara Serah Terima Pekerjaan ' + b.nomor, M, y, f, 8.5, 'c', CW); y -= 11;
      t(0, b.nama, M, y, fb, 8.5, 'c', CW); y -= 18;
      t(0, 'Ringkasan per PPBJ (barang dibandingkan dengan IA; jasa/biaya dibandingkan dengan RI)', M, y, fb, 8.5); y -= 6;
      var rows = k.ring.map(function (x) { return {v: [x.ppbj + (x.ada ? '' : ' (tidak ada di data PPBJ)'), rpTeks(x.estBarang), rpTeks(x.ia), pctTeks(x.pct), rpTeks(x.iaLain), pctTeks(x.pctTotal), rpTeks(x.estJasa), rpTeks(x.ri)], warna: warnaPct(x.pct)}; });
      var T = k.total; rows.push({tebal: true, v: ['TOTAL', rpTeks(T.estBarang), rpTeks(T.ia), pctTeks(T.pct), '', '', rpTeks(T.estJasa), rpTeks(T.ri)], warna: warnaPct(T.pct)});
      tabel([['PPBJ', 22, ''], ['Estimasi barang', 14, 'r'], ['Realisasi IA (BAST ini)', 15, 'r'], ['%', 7, 'r'], ['IA di BAST lain', 13, 'r'], ['% PPBJ total', 8, 'r'], ['Estimasi jasa', 12, 'r'], ['RI', 11, 'r']], rows);
      y -= 8;
      [['Keseluruhan (barang + jasa)', 'Estimasi Rp ' + rpTeks(T.estTotal) + '  |  Realisasi (IA + RI) Rp ' + rpTeks(T.realTotal) + '  |  ' + pctTeks(T.pctAll)],
       ['Barang di luar PPBJ', 'Rp ' + rpTeks(T.luar) + ' (kode barang di IA tidak ada di PPBJ)'], ['Tanpa PPBJ', 'Rp ' + rpTeks(T.tanpaPpbj)]].forEach(function (x) { t(0, x[0] + ':', M, y, fb, 7.5); t(0, x[1], M + 120, y, f, 7.5); y -= 10; });
      t(0, 'Warna: kuning 90-100%, merah di atas 100% dari estimasi barang.', M, y, f, 7); y -= 16;
      if (y < M + 60) baru();
      t(0, 'Rincian per barang', M, y, fb, 8.5); y -= 6;
      tabel([['Kode', 15, ''], ['Nama barang', 27, ''], ['Status', 9, ''], ['Qty est.', 7, 'r'], ['Nilai estimasi', 12, 'r'], ['Qty IA', 7, 'r'], ['Nilai IA', 12, 'r'], ['Selisih', 11, 'r'], ['Keterangan', 14, '']],
        k.rinci.map(function (x) { var sel = x.nilaiIa - x.nilaiEst; return {v: [x.kode, x.nama, x.status, rpTeks(x.qtyEst), rpTeks(x.nilaiEst), rpTeks(x.qtyIa), rpTeks(x.nilaiIa), rpTeks(sel), x.ket], warna: x.ket === 'di luar PPBJ' ? L.rgb(0.98, 0.83, 0.83) : (x.nilaiEst && x.nilaiIa > x.nilaiEst * 1.0001 ? L.rgb(1, 0.95, 0.8) : null)}; }));
      return doc.save();
    });
  };
  /** Sheet "Komparasi" di Excel. */
  function excelKomparasi(wb, list, K) {
    var s = wb.sheet('Komparasi', {}), hd = {font: F({b: true}), fill: 'D9E1F2', border: bd(1, 1, 1, 1), al: {h: 'center', wrap: true}}, sel = {font: F(), border: bd(1, 1, 1, 1)}, r = 1;
    [26, 34, 16, 16, 9, 16, 9, 16, 16, 30].forEach(function (w, i) { s.kolom(i + 1, w); });
    s.set(r, 1, 'Komparasi PPBJ (harga estimasi Accurate) dan realisasi BAST', {font: F({sz: 12, b: true})}); r += 2;
    ['No BAST', 'Pekerjaan', 'PPBJ', 'Estimasi barang', '%', 'Realisasi IA', '% PPBJ total', 'Estimasi jasa', 'RI', 'Catatan'].forEach(function (h, i) { s.set(r, i + 1, h, hd); }); s.baris(r, 28); s.bekukan(r + 1, 1); r++;
    var M1 = Object.assign({}, sel, {fmt: '#,##0'}), MP = Object.assign({}, sel, {fmt: '0.0"%"'});
    list.forEach(function (b) {
      var k = K[b.id]; if (!k) return;
      k.ring.forEach(function (x) {
        s.set(r, 1, b.nomor, sel); s.set(r, 2, b.nama, sel); s.set(r, 3, x.ppbj, sel); s.set(r, 4, x.estBarang, M1);
        s.set(r, 5, x.pct == null ? '' : x.pct, Object.assign({}, MP, x.pct > 100 ? {fill: 'F8CBAD'} : x.pct >= 90 ? {fill: 'FFF2CC'} : {}));
        s.set(r, 6, x.ia, M1); s.set(r, 7, x.pctTotal == null ? '' : x.pctTotal, MP); s.set(r, 8, x.estJasa, M1); s.set(r, 9, x.ri, M1); s.set(r, 10, x.ada ? (x.iaLain ? 'IA di BAST lain: ' + rpTeks(x.iaLain) : '') : 'tidak ada di data PPBJ', sel); r++;
      });
    });
    r += 2; s.set(r, 1, 'Rincian per barang', {font: F({sz: 11, b: true})}); r++;
    ['No BAST', 'Kode', 'Nama barang', 'Status', 'Qty estimasi', 'Nilai estimasi', 'Qty IA', 'Nilai IA', 'Selisih', 'Keterangan'].forEach(function (h, i) { s.set(r, i + 1, h, hd); }); r++;
    list.forEach(function (b) {
      var k = K[b.id]; if (!k) return;
      k.rinci.forEach(function (x) {
        var g = x.ket === 'di luar PPBJ' ? {fill: 'F8CBAD'} : {};
        s.set(r, 1, b.nomor, sel); s.set(r, 2, x.kode, sel); s.set(r, 3, x.nama, sel); s.set(r, 4, x.status, sel); s.set(r, 5, x.qtyEst, Object.assign({}, sel, {fmt: '#,##0.###'}));
        s.set(r, 6, x.nilaiEst, M1); s.set(r, 7, x.qtyIa, Object.assign({}, sel, {fmt: '#,##0.###'})); s.set(r, 8, x.nilaiIa, M1); s.set(r, 9, {f: 'H' + r + '-F' + r}, M1); s.set(r, 10, x.ket, Object.assign({}, sel, g)); r++;
      });
    });
  }

  /* ================= 3b. lampiran (Tambahan 100) ================= */
  /** Cetakan satu IA "Penyesuaian Persediaan" -> {no} atau {err}. */
  BA.bacaCetakan = function (pages) {
    var t = (pages || []).map(function (pg) { return (pg.items || []).map(function (i) { return i.s; }).join(' '); }).join(' ');
    if (/Penyesuaian Stok Barang/i.test(t)) return {err: 'ini laporan banyak IA, bukan cetakan satu IA'};
    if (!/Penyesuaian Persediaan/i.test(t)) return {err: 'bukan cetakan Penyesuaian Persediaan Accurate'};
    var m = /Nomor\s*:?\s*(IA\.[A-Za-z0-9.]+?)(?=\s|$)/.exec(t);
    if (m) return {no: m[1].replace(/\.$/, '')};
    var all = (t.match(/\bIA\.\d{2,4}\.\d{2}\.\d{4,5}\b/g) || []).filter(function (v, i, a) { return a.indexOf(v) === i; });
    return all.length === 1 ? {no: all[0]} : {err: 'nomor IA tidak terbaca'};
  };
  function keB64(u8) { var s = '', n = 0x8000; for (var i = 0; i < u8.length; i += n) s += String.fromCharCode.apply(null, u8.subarray(i, i + n)); return btoa(s); }
  function dariB64(b) { return b64ke(b); }
  BA.keB64 = keB64;
  /** Gabungkan PDF/gambar menjadi satu PDF. parts: [{bytes, mime, nama}] */
  BA.gabung = function (L, parts) {
    return L.PDFDocument.create().then(function (out) {
      var p = Promise.resolve(), lewat = [];
      parts.forEach(function (x) {
        p = p.then(function () {
          var m = String(x.mime || ''), nm = String(x.nama || '');
          if (/pdf/i.test(m) || /\.pdf$/i.test(nm)) return L.PDFDocument.load(x.bytes, {ignoreEncryption: true}).then(function (src) { return out.copyPages(src, src.getPageIndices()).then(function (pg) { pg.forEach(function (q) { out.addPage(q); }); }); });
          var jpg = /jpe?g/i.test(m) || /\.jpe?g$/i.test(nm), png = /png/i.test(m) || /\.png$/i.test(nm);
          if (!jpg && !png) { lewat.push(nm); return; }
          return (jpg ? out.embedJpg(x.bytes) : out.embedPng(x.bytes)).then(function (img) {
            var W = 595.28, H = 841.89, lands = img.width > img.height; if (lands) { var t0 = W; W = H; H = t0; }
            var k = Math.min((W - 40) / img.width, (H - 40) / img.height, 1), w = img.width * k, h = img.height * k, pg = out.addPage([W, H]);
            pg.drawImage(img, {x: (W - w) / 2, y: (H - h) / 2, width: w, height: h});
          });
        }).catch(function (e) { lewat.push(x.nama + ' (' + (e && e.message ? e.message : e) + ')'); });
      });
      return p.then(function () { return out.save(); }).then(function (u) { return {bytes: u, lewat: lewat}; });
    });
  };
  /** PDF lengkap satu BAST: BAST + rincian, cetakan IA (urut baris), BPB (+BPB manual), file lain. */
  BA.pdfLengkap = function (b, ia, info) {
    var L = root.PDFLib, parts = [], lamp = info.lamp || [], urutIa = {}, catatan = [];
    (b.data.baris || []).forEach(function (x, i) { if (x.jenis === 'IA') urutIa[x.no] = i; });
    return BA.pdf([b], ia, L, root.BAST_LOGO).then(function (u) {
      parts.push({bytes: u, mime: 'application/pdf', nama: 'BAST'});
      return info.komp && b.data.kompPdf !== false ? BA.pdfKomparasi(b, info.komp, L).then(function (u2) { parts.push({bytes: u2, mime: 'application/pdf', nama: 'Komparasi'}); }) : null;
    }).then(function () {
      var iaL = lamp.filter(function (x) { return x.jenis === 'IA'; }).sort(function (a, c) { return (urutIa[a.noIa] || 0) - (urutIa[c.noIa] || 0); });
      var belum = (b.data.baris || []).filter(function (x) { return x.jenis === 'IA' && !iaL.some(function (y) { return y.noIa === x.no; }); });
      if (belum.length) catatan.push(belum.length + ' cetakan IA belum diunggah');
      return ambilBerkas(iaL);
    }).then(function (arr) {
      arr.forEach(function (x) { parts.push(x); });
      var lepas = {}; ((b.data.bpb || {}).lepas || []).forEach(function (k) { lepas[k] = 1; });
      var ids = (info.bpb || []).filter(function (x) { return !x.batal && !lepas[x.id] && (info.modeAktif === 'ia' ? x.ia.length : x.ppbjCocok); }).map(function (x) { return x.id; });
      return bpbBytes(ids, catatan);
    }).then(function (u) {
      if (u) parts.push({bytes: u, mime: 'application/pdf', nama: 'BPB'});
      return ambilBerkas(lamp.filter(function (x) { return x.jenis === 'BPB manual'; }));
    }).then(function (arr) {
      arr.forEach(function (x) { parts.push(x); });
      return ambilBerkas(lamp.filter(function (x) { return x.jenis === 'Lain'; }));
    }).then(function (arr) {
      arr.forEach(function (x) { parts.push(x); });
      return BA.gabung(L, parts);
    }).then(function (h) { if (h.lewat.length) catatan.push('dilewati: ' + h.lewat.join(', ')); return {bytes: h.bytes, catatan: catatan}; });
  };
  function ambilBerkas(list) {
    var out = [], p = Promise.resolve();
    list.forEach(function (x) { p = p.then(function () { return api({action: 'adminBastLampAmbil', lid: x.id}).then(function (r) { if (r.ok) out.push({bytes: dariB64(r.b64), mime: r.mime, nama: r.nama}); else toast(r.msg || 'Lampiran gagal diambil.', true); }); }); });
    return p.then(function () { return out; });
  }
  function bpbBytes(ids, catatan) {
    if (!ids.length) return Promise.resolve(null);
    if (!root.BuktiPdf) { catatan.push('pembuat BPB belum termuat'); return Promise.resolve(null); }
    var docs = [], sig = {}, p = Promise.resolve();
    for (var i = 0; i < ids.length; i += 25) (function (sl) { p = p.then(function () { return api({action: 'adminArsipBukti', ids: sl}).then(function (r) { if (!r.ok) return; (r.docs || []).forEach(function (d) { docs.push(d); }); Object.keys(r.sig || {}).forEach(function (k) { sig[k] = r.sig[k]; }); (r.lewat || []).forEach(function (x) { catatan.push(x); }); }); }); })(ids.slice(i, i + 25));
    return p.then(function () { return docs.length ? root.BuktiPdf.buatGabungan(docs, sig) : null; });
  }

  /* ================= 4. tampilan (admin.html) ================= */
  var S = {rows: [], st: {}, q: '', f: '', pil: {}, ed: null, ia: {}, kotor: false}, el, api, toast;
  function unduh(bytes, nama, mime) {
    var blob = new Blob([bytes], {type: mime}), a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nama; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  function namaFile(b, ext) { return ('BAST ' + String(b.nomor || '').replace(/[\\\/:*?"<>|]/g, '-') + ' - ' + String(b.nama || '').replace(/[\\\/:*?"<>|]/g, '-')).slice(0, 110) + '.' + ext; }
  function muatJSZip() { if (root.JSZip) return Promise.resolve(root.JSZip); return new Promise(function (ok, no) { var s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'; s.onload = function () { ok(root.JSZip); }; s.onerror = function () { no(new Error('JSZip gagal dimuat. Periksa internet.')); }; document.head.appendChild(s); }); }
  function muatPdfLib() { if (root.PDFLib) return Promise.resolve(root.PDFLib); return new Promise(function (ok, no) { var s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js'; s.onload = function () { ok(root.PDFLib); }; s.onerror = function () { no(new Error('pdf-lib gagal dimuat. Periksa internet.')); }; document.head.appendChild(s); }); }
  BA.unduhExcel = function (ids, satu) {
    return api({action: 'adminBastRinci', ids: ids}).then(function (r) {
      if (!r.ok) { toast(r.msg || 'Gagal.', true); return; }
      var list = r.bast.sort(function (a, b) { return a.noUrut - b.noUrut; });
      if (satu && S.ed && list.length === 1 && list[0].id === S.ed.id) list = [S.ed];
      return api({action: 'adminBastKomparasi', ids: ids}).catch(function () { return {}; }).then(function (kr) { return muatJSZip().then(function (Z) { return BA.excel(list, r.ia, root.BAST_LOGO, kr && kr.ok && kr.adaData ? kr.k : null).simpan(Z); }); }).then(function (u) {
        unduh(u, list.length === 1 ? namaFile(list[0], 'xlsx') : 'BAST ' + list[0].nomor.slice(0, 3) + '-' + list[list.length - 1].nomor.slice(0, 3) + ' (' + list.length + ' BAST).xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        toast('Excel ' + list.length + ' BAST diunduh.');
      });
    }).catch(function (e) { toast('Excel gagal dibuat: ' + (e && e.message ? e.message : e), true); });
  };
  BA.unduhPdf = function (ids, satu) {
    return api({action: 'adminBastRinci', ids: ids}).then(function (r) {
      if (!r.ok) { toast(r.msg || 'Gagal.', true); return; }
      var list = r.bast.sort(function (a, b) { return a.noUrut - b.noUrut; });
      if (satu && S.ed && list.length === 1 && list[0].id === S.ed.id) list = [S.ed];
      return muatPdfLib().then(function (L) { return BA.pdf(list, r.ia, L, root.BAST_LOGO); }).then(function (u) {
        unduh(u, list.length === 1 ? namaFile(list[0], 'pdf') : 'BAST ' + list[0].nomor.slice(0, 3) + '-' + list[list.length - 1].nomor.slice(0, 3) + ' (' + list.length + ' BAST).pdf', 'application/pdf');
        toast('PDF ' + list.length + ' BAST diunduh.');
      });
    }).catch(function (e) { toast('PDF gagal dibuat: ' + (e && e.message ? e.message : e), true); });
  };
  function gaya() {
    if (document.getElementById('bastGaya')) return;
    var st = document.createElement('style'); st.id = 'bastGaya';
    st.textContent = '.bst-sum{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}.bst-sum div{border:1px solid var(--line,#ccd);border-radius:8px;padding:6px 10px;min-width:110px}.bst-sum b{display:block;font-size:18px}.bst-sum span{font-size:12px;opacity:.8}' +
      '.bst-ed{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px}.bst-ed label{display:flex;flex-direction:column;font-size:12px;gap:2px}.bst-ed label.lebar{grid-column:1/-1}.bst-ed input,.bst-ed select,.bst-ed textarea{width:100%;box-sizing:border-box}' +
      '.bst-tb{width:100%;border-collapse:collapse;font-size:13px}.bst-tb td,.bst-tb th{border-bottom:1px solid var(--line,#dde);padding:4px;vertical-align:top}.bst-tb input,.bst-tb select{width:100%;box-sizing:border-box;min-width:70px}' +
      '.bst-ub{background:rgba(214,137,16,.15);border-left:3px solid #d68910}.bst-tag{display:inline-block;font-size:11px;padding:1px 6px;border-radius:9px;background:rgba(214,137,16,.18);margin:1px}.bst-wrap{overflow-x:auto}.bst-ia{border:1px solid var(--line,#ccd);border-radius:8px;padding:6px;margin-top:6px;max-height:260px;overflow:auto}' +
      '@media (max-width:700px){.bst-tb{min-width:0!important;width:100%!important;max-width:100%}.bst-tb,.bst-tb tbody,.bst-tb tfoot,.bst-tb tr,.bst-tb td{display:block;width:100%;box-sizing:border-box}.bst-tb thead{display:none}.bst-tb tr{border:1px solid var(--line,#ccd);border-radius:8px;margin:6px 0;padding:4px}.bst-tb td{border:0}.bst-tb tfoot td{text-align:left!important}}';
    document.head.appendChild(st);
  }
  BA.mount = function (box, api0, toast0) { el = box; api = api0; toast = toast0; gaya(); S.ed = null; muatDaftar(); };
  function muatDaftar() {
    el.innerHTML = '<div class="card"><b>BAST</b><div class="note">Memuat...</div></div>';
    api({action: 'adminBastList'}).then(function (r) { if (!r.ok) { el.innerHTML = '<div class="card">' + esc(r.msg || 'Gagal memuat.') + '</div>'; return; } S.rows = r.rows || []; S.st = r; gambarDaftar(); });
  }
  function gambarDaftar() {
    var st = S.st, h = '<div class="card"><h3 style="margin:0">BAST (Berita Acara Serah Terima Pekerjaan)</h3>' +
      '<div class="note">Unggah laporan Accurate <b>Penyesuaian Stok Barang</b> (PDF, banyak IA). IA baru disimpan, IA lama diperbarui ke nilai terbaru (BAST yang memuatnya ikut berubah dan diberi tanda). Lalu buat draf BAST otomatis dan periksa satu per satu.</div>' +
      '<div class="bst-sum"><div><b>' + S.rows.length + '</b><span>BAST</span></div><div><b>' + (st.nIa || 0) + '</b><span>IA tersimpan</span></div><div><b>' + (st.belum || 0) + '</b><span>IA keluar belum ber-BAST</span></div><div><b>' + S.rows.filter(function (x) { return x.ubah; }).length + '</b><span>BAST nilai IA berubah</span></div></div>' +
      '<div class="fr" style="gap:6px;flex-wrap:wrap"><input type="file" id="bstF" accept=".pdf,application/pdf" hidden><button class="sv" id="bstUp">Unggah laporan IA (PDF)</button>' +
      '<input type="file" id="bstFC" accept=".pdf,application/pdf" multiple hidden><button id="bstUpC">Unggah cetakan IA (banyak PDF)</button>' +
      '<input type="file" id="bstFP" accept=".pdf,application/pdf" hidden><button id="bstUpP">Unggah laporan PPBJ (Item Requisition)</button>' +
      (st.belum ? '<button class="sv" id="bstDraf">Buat draf BAST otomatis (' + st.belum + ' IA)</button>' : '') +
      (st.awal ? '<button id="bstAwal">Masukkan data awal BAST 031-' + (30 + (st.nAwal || 0)) + '</button>' : '') +
      '<button id="bstBaru">BAST baru (manual)</button></div><div class="note" id="bstInfo"></div></div>';
    h += '<div class="card"><div class="fr" style="gap:6px;flex-wrap:wrap"><input id="bstQ" placeholder="Saring nomor, PPBJ, pekerjaan, proyek" value="' + esc(S.q) + '" style="min-width:220px;flex:1">' +
      '<select id="bstFl"><option value="">Semua</option><option value="cek"' + (S.f === 'cek' ? ' selected' : '') + '>Perlu dicek</option><option value="ubah"' + (S.f === 'ubah' ? ' selected' : '') + '>Nilai IA berubah</option></select>' +
      '<button id="bstXl">Unduh Excel terpilih</button><button id="bstPd">Unduh PDF terpilih</button><button id="bstPdL">Unduh PDF lengkap + lampiran</button></div>' +
      '<div class="bst-wrap"><table class="bst-tb"><thead><tr><th><input type="checkbox" id="bstAll" aria-label="Pilih semua"></th><th>No BAST</th><th>Tanggal</th><th>Pekerjaan / Proyek</th><th>PPBJ</th><th class="nm">Total</th><th class="nm" title="Realisasi IA dibanding estimasi barang PPBJ">% barang</th><th>Catatan</th><th></th></tr></thead><tbody id="bstTb"></tbody></table></div></div>';
    el.innerHTML = h; isiTabel();
    el.querySelector('#bstUp').onclick = function () { el.querySelector('#bstF').click(); };
    el.querySelector('#bstUpC').onclick = function () { el.querySelector('#bstFC').click(); };
    el.querySelector('#bstUpP').onclick = function () { el.querySelector('#bstFP').click(); };
    el.querySelector('#bstFP').onchange = function () { var f = this.files[0]; this.value = ''; if (f) unggahPpbj(f); };
    el.querySelector('#bstFC').onchange = function () { var fs = [].slice.call(this.files); this.value = ''; if (fs.length) unggahCetakan(fs, el.querySelector('#bstInfo'), function () { muatDaftarTetap(el.querySelector('#bstInfo').innerHTML); }); };
    el.querySelector('#bstPdL').onclick = function () { var ids = Object.keys(S.pil); if (!ids.length) { toast('Centang BAST yang mau diunduh.', true); return; } var b = this; b.disabled = true; unduhLengkap(ids, b).then(function () { b.disabled = false; }); };
    el.querySelector('#bstF').onchange = function () { var f = this.files[0]; this.value = ''; if (f) unggah(f); };
    var dr = el.querySelector('#bstDraf'); if (dr) dr.onclick = function () { if (!confirm('Buat draf BAST otomatis untuk ' + st.belum + ' IA keluar yang belum punya BAST?')) return; dr.disabled = true; api({action: 'adminBastDraf'}).then(function (r) { toast(r.msg || (r.ok ? 'Selesai.' : 'Gagal.'), !r.ok); muatDaftar(); }); };
    var aw = el.querySelector('#bstAwal'); if (aw) aw.onclick = function () { if (!confirm('Masukkan ' + st.nAwal + ' BAST data awal (031-' + (30 + st.nAwal) + ')? IA-nya harus sudah diunggah.')) return; aw.disabled = true; api({action: 'adminBastDataAwal'}).then(function (r) { toast(r.msg || (r.ok ? 'Selesai.' : 'Gagal.'), !r.ok); muatDaftar(); }); };
    el.querySelector('#bstBaru').onclick = function () { var mx = S.rows.reduce(function (a, x) { return Math.max(a, x.noUrut || 0); }, 30), t = new Date(), iso = t.getFullYear() + '-' + ('0' + (t.getMonth() + 1)).slice(-2) + '-' + ('0' + t.getDate()).slice(-2); bukaEditor({id: '', noUrut: mx + 1, nomor: nomorAuto(mx + 1, iso), tgl: iso, nama: '', proyek: '', kat: 'Perbaikan', data: {divisi: 'TEKNIK', ttd: {teknik: 'AS', pengadaan: 'MI', legal: 'OR', gudang: 'MR', keuangan: 'NES + BR'}, baris: []}}, {}); };
    el.querySelector('#bstQ').oninput = function () { S.q = this.value; isiTabel(); };
    el.querySelector('#bstFl').onchange = function () { S.f = this.value; isiTabel(); };
    el.querySelector('#bstAll').onchange = function () { var on = this.checked; terlihat().forEach(function (x) { if (on) S.pil[x.id] = 1; else delete S.pil[x.id]; }); isiTabel(); };
    el.querySelector('#bstXl').onclick = function () { var ids = Object.keys(S.pil); if (!ids.length) { toast('Centang BAST yang mau diunduh.', true); return; } this.disabled = true; var b = this; BA.unduhExcel(ids).then(function () { b.disabled = false; }); };
    el.querySelector('#bstPd').onclick = function () { var ids = Object.keys(S.pil); if (!ids.length) { toast('Centang BAST yang mau diunduh.', true); return; } this.disabled = true; var b = this; BA.unduhPdf(ids).then(function () { b.disabled = false; }); };
  }
  function terlihat() {
    var q = S.q.toLowerCase().split(/\s+/).filter(String);
    return S.rows.filter(function (x) {
      if (S.f === 'cek' && !x.cek) return false; if (S.f === 'ubah' && !x.ubah) return false;
      var t = (x.nomor + ' ' + x.nama + ' ' + x.proyek + ' ' + x.ppbj).toLowerCase(); return q.every(function (w) { return t.indexOf(w) >= 0; });
    });
  }
  function isiTabel() {
    var tb = el.querySelector('#bstTb'); if (!tb) return; var L = terlihat();
    tb.innerHTML = L.length ? L.map(function (x) {
      return '<tr' + (x.ubah ? ' class="bst-ub"' : '') + '><td><input type="checkbox" data-p="' + esc(x.id) + '"' + (S.pil[x.id] ? ' checked' : '') + ' aria-label="Pilih ' + esc(x.nomor) + '"></td><td data-l="No BAST"><b>' + esc(x.nomor) + '</b></td><td data-l="Tanggal">' + esc(dmy(x.tgl)) + '</td><td data-l="Pekerjaan">' + esc(x.nama) + (x.proyek && x.proyek !== x.nama ? '<br><small>' + esc(x.proyek) + '</small>' : '') + '</td><td data-l="PPBJ"><small>' + esc(x.ppbj || '-') + '</small></td><td class="nm" data-l="Total">' + esc(rpTeks(x.total)) + '<br><small>' + x.nBaris + ' baris</small></td><td class="nm" data-l="% barang"' + (x.pct > 100 ? ' style="color:var(--red,#c0392b);font-weight:700"' : x.pct >= 90 ? ' style="color:#b7791f;font-weight:700"' : '') + '>' + pctTeks(x.pct) + '</td><td data-l="Catatan">' + (x.cek ? x.cek.split('; ').map(function (c) { return '<span class="bst-tag">' + esc(c) + '</span>'; }).join('') : '') + (x.nLamp ? '<br><small>' + x.nLamp + ' lampiran</small>' : '') + '</td><td><button data-b="' + esc(x.id) + '">Buka</button></td></tr>';
    }).join('') : '<tr><td colspan="9">Belum ada BAST' + (S.q || S.f ? ' yang cocok.' : '. Unggah laporan IA lalu buat draf.') + '</td></tr>';
    tb.onclick = function (e) {
      var b = e.target.closest('[data-b]'); if (b) { buka(b.getAttribute('data-b')); return; }
      var c = e.target.closest('[data-p]'); if (c) { var id = c.getAttribute('data-p'); if (c.checked) S.pil[id] = 1; else delete S.pil[id]; }
    };
  }
  function unggah(file) {
    var info = el.querySelector('#bstInfo'); info.textContent = 'Membaca PDF...';
    var K = root.KBI;
    K.muatPdfjs().then(function (L) { return K.bacaBuf(file).then(function (buf) { return K.pdfKeHalaman(L, buf); }); }).then(function (pages) {
      var o = BA.bacaLaporan(pages); if (o.err) { info.textContent = ''; toast(o.err, true); return; }
      var kel = o.ia.filter(function (x) { return x.nilai < 0; }).length;
      info.textContent = o.ia.length + ' IA terbaca (' + kel + ' keluar). Menyimpan...' + (o.warn.length ? ' Catatan: ' + o.warn.join(' ') : '');
      return api({action: 'adminIaImpor', ia: o.ia}).then(function (r) {
        toast(r.msg || (r.ok ? 'Tersimpan.' : 'Gagal.'), !r.ok);
        if (r.ok && r.berubah && r.berubah.length) info.innerHTML = '<b>Nilai IA berubah:</b> ' + r.berubah.slice(0, 20).map(function (x) { return esc(x.no + ' ' + rpTeks(-x.lama) + ' -> ' + rpTeks(-x.baru)); }).join('; ') + (r.berubah.length > 20 ? ' ...' : '');
        muatDaftarTetap(info.innerHTML);
      });
    }).catch(function (e) { info.textContent = ''; toast('PDF gagal dibaca: ' + (e && e.message ? e.message : e), true); });
  }
  function muatDaftarTetap(pesan) { api({action: 'adminBastList'}).then(function (r) { if (r.ok) { S.rows = r.rows || []; S.st = r; gambarDaftar(); if (pesan) el.querySelector('#bstInfo').innerHTML = pesan; } }); }
  function unggahPpbj(file) {
    var info = el.querySelector('#bstInfo'), K = root.KBI; info.textContent = 'Membaca laporan PPBJ...';
    K.muatPdfjs().then(function (L) { return K.bacaBuf(file).then(function (buf) { return K.pdfKeHalaman(L, buf); }); }).then(function (pages) {
      var o = BA.bacaPpbj(pages); if (o.err) { info.textContent = ''; toast(o.err, true); return; }
      var n = o.ppbj.reduce(function (a, x) { return a + x.items.length; }, 0);
      info.textContent = o.ppbj.length + ' PPBJ (' + n + ' baris) terbaca. Menyimpan...' + (o.warn.length ? ' Catatan: ' + o.warn.join(' ') : '');
      return api({action: 'adminPpbjAccImpor', ppbj: o.ppbj}).then(function (r) { toast(r.msg || (r.ok ? 'Tersimpan.' : 'Gagal.'), !r.ok); muatDaftarTetap(esc(r.msg || '')); });
    }).catch(function (e) { info.textContent = ''; toast('PDF gagal dibaca: ' + (e && e.message ? e.message : e), true); });
  }
  /** Unggah banyak cetakan IA: baca nomor IA tiap file, kirim satu per satu, laporkan hasil. */
  function unggahCetakan(files, info, selesai) {
    var K = root.KBI, cocok = [], tidak = [], bukan = [], gagal = [], p = K.muatPdfjs();
    files.forEach(function (f, i) {
      p = p.then(function (L) {
        info.textContent = 'Membaca cetakan IA ' + (i + 1) + '/' + files.length + ': ' + f.name;
        return K.bacaBuf(f).then(function (buf) {
          var u8 = new Uint8Array(buf).slice();
          return K.pdfKeHalaman(L, buf).then(function (pages) {
            var o = BA.bacaCetakan(pages); if (o.err) { bukan.push(f.name + ' (' + o.err + ')'); return L; }
            return api({action: 'adminBastLampIa', files: [{no: o.no, nama: f.name, b64: keB64(u8)}]}).then(function (r) {
              if (!r.ok) { gagal.push(f.name + ': ' + (r.msg || 'gagal')); return L; }
              (r.cocok || []).forEach(function (x) { cocok.push(x.no + ' -> BAST ' + x.nomor); }); (r.tidak || []).forEach(function (x) { tidak.push(x); }); (r.gagal || []).forEach(function (x) { gagal.push(x); });
              return L;
            });
          });
        }).catch(function (e) { gagal.push(f.name + ': ' + (e && e.message ? e.message : e)); return L; });
      });
    });
    return p.then(function () {
      var h = '<b>Cetakan IA:</b> ' + cocok.length + ' terlampir ke BAST' + (tidak.length ? '; <b>' + tidak.length + ' IA belum ada di BAST mana pun</b>: ' + esc(tidak.join(', ')) : '') + (bukan.length ? '; <b>' + bukan.length + ' file dilewati</b>: ' + esc(bukan.join('; ')) : '') + (gagal.length ? '; <b>gagal</b>: ' + esc(gagal.join('; ')) : '') + '.';
      info.innerHTML = h; toast(cocok.length + ' cetakan IA terlampir' + (tidak.length + bukan.length + gagal.length ? ', ' + (tidak.length + bukan.length + gagal.length) + ' tidak.' : '.'), !!(tidak.length || bukan.length || gagal.length) && !cocok.length);
      if (selesai) selesai();
    });
  }
  var KOMP = {};
  function unduhLengkap(ids, btn) {
    var L0 = btn ? btn.textContent : '', semua = [], catatan = [], p;
    p = muatPdfLib().then(function () { return api({action: 'adminBastRinci', ids: ids}); }).then(function (r) {
      if (!r.ok) throw new Error(r.msg || 'Gagal.');
      var list = r.bast.sort(function (a, b) { return a.noUrut - b.noUrut; }); if (S.ed && list.length === 1 && list[0].id === S.ed.id) list = [S.ed];
      var q = api({action: 'adminBastKomparasi', ids: ids}).catch(function () { return {}; }).then(function (kr) { KOMP = kr && kr.ok && kr.adaData ? kr.k : {}; });
      list.forEach(function (b, i) {
        q = q.then(function () { if (btn) btn.textContent = 'Menyusun ' + (i + 1) + '/' + list.length + '...'; return api({action: 'adminBastLampList', id: b.id}); }).then(function (info) {
          if (!info.ok) throw new Error(info.msg || 'Gagal.');
          info.komp = KOMP[b.id] || null;
          return BA.pdfLengkap(b, r.ia, info).then(function (h) { semua.push({bytes: h.bytes, mime: 'application/pdf', nama: b.nomor}); h.catatan.forEach(function (c) { catatan.push(b.nomor + ': ' + c); }); });
        });
      });
      return q.then(function () { return list; });
    }).then(function (list) {
      return (semua.length === 1 ? Promise.resolve({bytes: semua[0].bytes}) : BA.gabung(root.PDFLib, semua)).then(function (h) {
        unduh(h.bytes, list.length === 1 ? namaFile(list[0], 'pdf').replace(/\.pdf$/, ' (lengkap).pdf') : 'BAST ' + list[0].nomor.slice(0, 3) + '-' + list[list.length - 1].nomor.slice(0, 3) + ' lengkap (' + list.length + ' BAST).pdf', 'application/pdf');
        toast('PDF lengkap ' + list.length + ' BAST diunduh.' + (catatan.length ? ' Catatan: ' + catatan.slice(0, 3).join('; ') + (catatan.length > 3 ? ' ...' : '') : ''), false);
      });
    }).catch(function (e) { toast('PDF lengkap gagal: ' + (e && e.message ? e.message : e), true); });
    return p.then(function () { if (btn) btn.textContent = L0; });
  }
  function buka(id) {
    el.innerHTML = '<div class="card">Memuat BAST...</div>';
    api({action: 'adminBastRinci', id: id}).then(function (r) { if (!r.ok) { toast(r.msg || 'Gagal.', true); muatDaftar(); return; } bukaEditor(r.bast[0], r.ia); });
  }
  function bukaEditor(b, ia) {
    S.ed = JSON.parse(JSON.stringify(b)); S.ia = ia || {}; S.kotor = false; var d = S.ed.data; d.baris = d.baris || []; d.ttd = d.ttd || {};
    var dl = '<datalist id="bstLok">' + LOKASI.map(function (x) { return '<option value="' + esc(x) + '">'; }).join('') + '</datalist><datalist id="bstAkun">' + AKUN.map(function (x) { return '<option value="' + esc(x) + '">'; }).join('') + '</datalist>';
    var h = '<div class="card">' + dl + '<div class="fr" style="gap:6px;flex-wrap:wrap;justify-content:space-between"><button id="bstKembali">&larr; Daftar BAST</button><span><button class="sv" id="bstSimpan">Simpan</button> <button id="bstEx">Unduh Excel</button> <button id="bstPdf">Unduh PDF</button> <button id="bstPdfL">PDF lengkap</button></span></div>' +
      '<h3 style="margin:8px 0">' + (S.ed.id ? 'BAST ' + esc(S.ed.nomor) : 'BAST baru') + '</h3>' +
      '<div class="bst-ed"><label>No urut<input type="number" min="1" id="beNo" value="' + esc(S.ed.noUrut) + '"></label><label>Tanggal BAST<input type="date" id="beTgl" value="' + esc(S.ed.tgl) + '"></label>' +
      '<label>Nomor BAST<input id="beNomor" value="' + esc(S.ed.nomor) + '"></label><label>Kategori<select id="beKat"><option>Asset Konsesi</option><option>Perbaikan</option></select></label>' +
      '<label>Divisi (User)<input id="beDiv" value="' + esc(d.divisi || 'TEKNIK') + '"></label>' +
      '<label class="lebar">Nama pekerjaan<input id="beNama" value="' + esc(S.ed.nama) + '"></label><label class="lebar">Proyek<input id="beProyek" value="' + esc(S.ed.proyek) + '"></label></div>' +
      '<div class="note" id="beKal">' + esc(kalimat(S.ed.tgl)) + '</div>' +
      '<b>Penandatangan</b><div class="bst-ed">' + TTD.map(function (t) { return '<label>' + t[1] + '<input data-ttd="' + t[0] + '" value="' + esc(d.ttd[t[0]] || '') + '"></label>'; }).join('') + '</div></div>' +
      '<div class="card"><div class="fr" style="gap:6px;flex-wrap:wrap;justify-content:space-between"><b>Baris resume</b><span><button id="beRI">+ Baris RI / dokumen lain</button> <button id="beIA">+ Tambah IA</button> <button id="beSemua">Isi semua baris dari baris 1</button></span></div>' +
      '<div id="beCariIA" hidden><input id="beQ" placeholder="Ketik nomor IA, PPBJ, atau keterangan" style="width:100%;margin-top:6px"><div class="bst-ia" id="beHasil"></div></div>' +
      '<div class="bst-wrap"><table class="bst-tb"><thead><tr><th>No</th><th>Dokumen</th><th>PPBJ / SPK</th><th>Akun</th><th>Lokasi</th><th>Kode kategori</th><th class="nm">Jumlah harga</th><th></th></tr></thead><tbody id="beTb"></tbody>' +
      '<tfoot><tr><td colspan="6" style="text-align:right"><b>TOTAL</b></td><td class="nm"><b id="beTot"></b></td><td></td></tr></tfoot></table></div></div>' +
      (S.ed.id ? '<div class="card" id="beKomp"><b>Komparasi PPBJ vs BAST</b><div class="note">Memuat...</div></div>' : '') +
      (S.ed.id ? '<div class="card" id="beLamp"><b>Lampiran</b><div class="note">Memuat lampiran...</div></div>' : '<div class="card note">Simpan BAST dulu untuk menambah lampiran.</div>') +
      (S.ed.id ? '<div class="card"><details id="beJejak"><summary>Riwayat perubahan</summary><div class="note">Memuat...</div></details><div class="bar"><button id="beHapus" style="color:var(--red,#c0392b)">Hapus BAST ini</button></div></div>' : '');
    el.innerHTML = h;
    el.querySelector('#beKat').value = S.ed.kat === 'Asset Konsesi' ? 'Asset Konsesi' : 'Perbaikan';
    gambarBaris();
    function ubah() { S.kotor = true; }
    var no = el.querySelector('#beNo'), tg = el.querySelector('#beTgl'), nmr = el.querySelector('#beNomor');
    function nomorIkut() { var auto0 = nomorAuto(S.ed.noUrut, S.ed.tgl); S.ed.noUrut = Number(no.value) || 0; S.ed.tgl = tg.value; if (nmr.value === auto0 || !nmr.value) nmr.value = nomorAuto(S.ed.noUrut, S.ed.tgl); S.ed.nomor = nmr.value; el.querySelector('#beKal').textContent = kalimat(S.ed.tgl); ubah(); }
    no.oninput = nomorIkut; tg.oninput = nomorIkut; tg.onchange = nomorIkut;
    nmr.oninput = function () { S.ed.nomor = nmr.value; ubah(); };
    el.querySelector('#beKat').onchange = function () { S.ed.kat = this.value; ubah(); };
    el.querySelector('#beDiv').oninput = function () { d.divisi = this.value; ubah(); };
    el.querySelector('#beNama').oninput = function () { S.ed.nama = this.value; ubah(); };
    el.querySelector('#beProyek').oninput = function () { S.ed.proyek = this.value; ubah(); };
    el.querySelectorAll('[data-ttd]').forEach(function (i) { i.oninput = function () { d.ttd[i.getAttribute('data-ttd')] = i.value; ubah(); }; });
    el.querySelector('#bstKembali').onclick = function () { if (S.kotor && !confirm('Ada perubahan yang belum disimpan. Tinggalkan?')) return; S.ed = null; muatDaftar(); };
    el.querySelector('#bstSimpan').onclick = simpan;
    el.querySelector('#bstEx').onclick = function () { if (!S.ed.id) { toast('Simpan dulu BAST ini.', true); return; } var b2 = this; b2.disabled = true; (S.kotor ? simpan() : Promise.resolve(true)).then(function (ok) { if (ok) return BA.unduhExcel([S.ed.id], true); }).then(function () { b2.disabled = false; }); };
    el.querySelector('#bstPdf').onclick = function () { if (!S.ed.id) { toast('Simpan dulu BAST ini.', true); return; } var b2 = this; b2.disabled = true; (S.kotor ? simpan() : Promise.resolve(true)).then(function (ok) { if (ok) return BA.unduhPdf([S.ed.id], true); }).then(function () { b2.disabled = false; }); };
    el.querySelector('#beRI').onclick = function () { var x0 = d.baris[0] || {}; d.baris.push({jenis: 'RI', no: '', tgl: '', ppbj: x0.ppbj || '', akun: x0.akun || '', lokasi: x0.lokasi || '', kode: x0.kode || '', knama: x0.knama || '', nilai: 0}); ubah(); gambarBaris(); };
    el.querySelector('#beSemua').onclick = function () { var x0 = d.baris[0]; if (!x0) return; d.baris.forEach(function (x) { x.akun = x0.akun; x.lokasi = x0.lokasi; x.kode = x0.kode; x.knama = x0.knama; }); ubah(); gambarBaris(); toast('Akun, lokasi, dan kode semua baris disamakan dengan baris 1.'); };
    el.querySelector('#beIA').onclick = function () { var c = el.querySelector('#beCariIA'); c.hidden = !c.hidden; if (!c.hidden) { el.querySelector('#beQ').focus(); cariIA(''); } };
    var tmr; el.querySelector('#beQ').oninput = function () { var v = this.value; clearTimeout(tmr); tmr = setTimeout(function () { cariIA(v); }, 250); };
    el.querySelector('#bstPdfL').onclick = function () { if (!S.ed.id) { toast('Simpan dulu BAST ini.', true); return; } var b2 = this; b2.disabled = true; (S.kotor ? simpan() : Promise.resolve(true)).then(function (ok) { if (ok) return unduhLengkap([S.ed.id], b2); }).then(function () { b2.disabled = false; }); };
    if (S.ed.id) { muatLampiran(); muatKomparasi(); }
    var hp = el.querySelector('#beHapus'); if (hp) hp.onclick = function () { if (!confirm('Hapus BAST ' + S.ed.nomor + '? IA-nya akan kembali bisa dibuatkan BAST.')) return; api({action: 'adminBastHapus', id: S.ed.id}).then(function (r) { toast(r.msg || (r.ok ? 'Dihapus.' : 'Gagal.'), !r.ok); if (r.ok) { S.ed = null; muatDaftar(); } }); };
    var jj = el.querySelector('#beJejak'); if (jj) jj.ontoggle = function () { if (!jj.open || jj.dataset.ok) return; api({action: 'adminBastJejakBaca', id: S.ed.id}).then(function (r) { jj.dataset.ok = 1; jj.querySelector('.note').innerHTML = r.ok && r.rows.length ? r.rows.map(function (x) { return '<div><b>' + esc(x.waktu) + '</b> ' + esc(x.oleh) + ': ' + esc(x.teks) + '</div>'; }).join('') : 'Belum ada catatan.'; }); };
  }
  function muatKomparasi() {
    var box = el.querySelector('#beKomp'); if (!box) return;
    api({action: 'adminBastKomparasi', id: S.ed.id}).then(function (r) {
      if (!r || !r.ok) { box.innerHTML = '<b>Komparasi PPBJ vs BAST</b><div class="note">' + esc((r && r.msg) || 'Belum tersedia.') + '</div>'; return; }
      if (!r.adaData) { box.innerHTML = '<b>Komparasi PPBJ vs BAST</b><div class="note">Belum ada data PPBJ. Unggah laporan Accurate <b>Item Requisition Detail</b> di daftar BAST.</div>'; return; }
      var k = r.k[S.ed.id], T = k.total, d = S.ed.data;
      function wr(p) { return p > 100 ? ' style="color:var(--red,#c0392b);font-weight:700"' : p >= 90 ? ' style="color:#b7791f;font-weight:700"' : ''; }
      box.innerHTML = '<div class="fr" style="justify-content:space-between;flex-wrap:wrap;gap:6px"><b>Komparasi PPBJ vs BAST</b><label><input type="checkbox" id="beKompPdf"' + (d.kompPdf === false ? '' : ' checked') + '> Sertakan komparasi di PDF lengkap</label></div>' +
        '<div class="note">Barang dibandingkan dengan IA, jasa/biaya dengan baris RI. Harga PPBJ = harga estimasi Accurate.</div>' +
        '<div class="bst-wrap"><table class="bst-tb"><thead><tr><th>PPBJ</th><th class="nm">Estimasi barang</th><th class="nm">Realisasi IA</th><th class="nm">%</th><th class="nm">IA di BAST lain</th><th class="nm">% PPBJ total</th><th class="nm">Estimasi jasa</th><th class="nm">RI</th></tr></thead><tbody>' +
        k.ring.map(function (x) { return '<tr><td data-l="PPBJ">' + esc(x.ppbj) + (x.ada ? (x.acc.length > 1 || x.acc[0] !== x.ppbj ? '<br><small>' + esc(x.acc.join(', ')) + '</small>' : '') : '<br><span class="bst-tag">tidak ada di data PPBJ</span>') + '</td><td class="nm" data-l="Estimasi barang">' + rpTeks(x.estBarang) + '</td><td class="nm" data-l="Realisasi IA">' + rpTeks(x.ia) + '</td><td class="nm" data-l="%"' + wr(x.pct) + '>' + pctTeks(x.pct) + '</td><td class="nm" data-l="IA di BAST lain">' + rpTeks(x.iaLain) + '</td><td class="nm" data-l="% PPBJ total"' + wr(x.pctTotal) + '>' + pctTeks(x.pctTotal) + '</td><td class="nm" data-l="Estimasi jasa">' + rpTeks(x.estJasa) + '</td><td class="nm" data-l="RI">' + rpTeks(x.ri) + '</td></tr>'; }).join('') +
        '<tr><td><b>TOTAL</b></td><td class="nm"><b>' + rpTeks(T.estBarang) + '</b></td><td class="nm"><b>' + rpTeks(T.ia) + '</b></td><td class="nm"' + wr(T.pct) + '><b>' + pctTeks(T.pct) + '</b></td><td></td><td></td><td class="nm"><b>' + rpTeks(T.estJasa) + '</b></td><td class="nm"><b>' + rpTeks(T.ri) + '</b></td></tr></tbody></table></div>' +
        '<div class="note">Keseluruhan: estimasi Rp ' + rpTeks(T.estTotal) + ', realisasi (IA + RI) Rp ' + rpTeks(T.realTotal) + ' (' + pctTeks(T.pctAll) + '). Barang di luar PPBJ Rp ' + rpTeks(T.luar) + '. Tanpa PPBJ Rp ' + rpTeks(T.tanpaPpbj) + '.</div>' +
        '<details><summary>Rincian per barang (' + k.rinci.length + ')</summary><div class="bst-wrap"><table class="bst-tb"><thead><tr><th>Kode</th><th>Nama</th><th>Status</th><th class="nm">Qty est.</th><th class="nm">Nilai est.</th><th class="nm">Qty IA</th><th class="nm">Nilai IA</th><th>Keterangan</th></tr></thead><tbody>' +
        k.rinci.map(function (x) { return '<tr' + (x.ket === 'di luar PPBJ' ? ' class="bst-ub"' : '') + '><td data-l="Kode"><small>' + esc(x.kode) + '</small></td><td data-l="Nama">' + esc(x.nama) + '</td><td data-l="Status"><small>' + esc(x.status) + '</small></td><td class="nm" data-l="Qty est.">' + rpTeks(x.qtyEst) + '</td><td class="nm" data-l="Nilai est.">' + rpTeks(x.nilaiEst) + '</td><td class="nm" data-l="Qty IA">' + rpTeks(x.qtyIa) + '</td><td class="nm" data-l="Nilai IA">' + rpTeks(x.nilaiIa) + '</td><td data-l="Keterangan"><small>' + esc(x.ket) + '</small></td></tr>'; }).join('') + '</tbody></table></div></details>';
      box.querySelector('#beKompPdf').onchange = function () { if (this.checked) delete d.kompPdf; else d.kompPdf = false; S.kotor = true; };
    }).catch(function () { box.innerHTML = '<b>Komparasi PPBJ vs BAST</b><div class="note">Belum tersedia (perbarui Code.gs).</div>'; });
  }
  function muatLampiran() {
    var box = el.querySelector('#beLamp'); if (!box) return;
    api({action: 'adminBastLampList', id: S.ed.id}).then(function (r) {
      if (!r.ok) { box.innerHTML = '<b>Lampiran</b><div class="note">' + esc(r.msg || 'Gagal memuat.') + '</div>'; return; }
      S.lamp = r; gambarLampiran();
    });
  }
  function gambarLampiran() {
    var box = el.querySelector('#beLamp'), r = S.lamp, d = S.ed.data, bp = d.bpb || {mode: r.mode || 'auto', lepas: r.lepas || []}; d.bpb = bp;
    var aktif = bp.mode === 'auto' ? (r.semuaIa ? 'ia' : 'ppbj') : bp.mode, lepas = {}; (bp.lepas || []).forEach(function (k) { lepas[k] = 1; });
    var iaRows = d.baris.filter(function (x) { return x.jenis === 'IA'; }), byIa = {}; r.lamp.forEach(function (x) { if (x.jenis === 'IA') byIa[x.noIa] = x; });
    function fileBaris(x) { return '<div>' + esc(x.nama) + ' <small>(' + Math.max(1, Math.round(x.ukuran / 1024)) + ' KB, ' + esc(x.waktu) + ')</small> <button data-lh="' + esc(x.id) + '">Hapus</button></div>'; }
    var bpbL = r.bpb.filter(function (x) { return aktif === 'ia' ? x.ia.length : x.ppbjCocok; });
    var h = '<b>Lampiran</b> <span class="note">Urutan di PDF lengkap: BAST, rincian harga, cetakan IA, BPB, BPB manual, file lain.</span>' +
      '<h4 style="margin:8px 0 4px">1. Cetakan IA Accurate (' + iaRows.filter(function (x) { return byIa[x.no]; }).length + '/' + iaRows.length + ')</h4>' +
      (iaRows.length ? iaRows.map(function (x) { var f = byIa[x.no]; return '<div style="padding:2px 0"><b>' + esc(x.no) + '</b> ' + (f ? '&#10003; ' + esc(f.nama) + ' <button data-lh="' + esc(f.id) + '">Hapus</button>' : '<span class="bst-tag">belum</span> <button data-lia="' + esc(x.no) + '">Unggah</button>') + '</div>'; }).join('') : '<div class="note">Tidak ada baris IA.</div>') +
      '<input type="file" id="beFIa" accept=".pdf,application/pdf" hidden><div class="note">Bisa juga unggah banyak cetakan sekaligus dari daftar BAST.</div>' +
      '<h4 style="margin:10px 0 4px">2. BPB dari sistem</h4><div class="fr" style="gap:6px;flex-wrap:wrap"><select id="beBpbM"><option value="auto">Otomatis (' + (r.semuaIa ? 'lewat nomor IA' : 'semua BPB per PPBJ') + ')</option><option value="ia">Lewat nomor IA</option><option value="ppbj">Semua BPB per PPBJ</option></select>' +
      (r.semuaIa ? '' : '<small>Belum semua IA punya pasangan BPB di tab Accurate.</small>') + '</div>' +
      (bpbL.length ? '<div class="bst-ia">' + bpbL.map(function (x) { return '<label style="display:block"><input type="checkbox" data-bp="' + esc(x.id) + '"' + (lepas[x.id] || x.batal ? '' : ' checked') + (x.batal ? ' disabled' : '') + '> <b>' + esc(x.doc) + '</b> ' + esc(dmy(x.tgl)) + ' &middot; ' + esc(x.ppbj || '-') + ' &middot; ' + esc(x.status) + (x.ia.length ? ' &middot; ' + esc(x.ia.join(', ')) : '') + '</label>'; }).join('') + '</div>' : '<div class="note">Tidak ada BPB di sistem untuk ' + (aktif === 'ia' ? 'nomor IA' : 'PPBJ') + ' BAST ini. Untuk permintaan manual, unggah sebagai BPB manual.</div>') +
      '<h4 style="margin:10px 0 4px">3. BPB manual (permintaan kertas)</h4>' + r.lamp.filter(function (x) { return x.jenis === 'BPB manual'; }).map(fileBaris).join('') +
      '<input type="file" id="beFBm" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" multiple hidden><button id="beBm">+ BPB manual (PDF/foto)</button>' +
      '<h4 style="margin:10px 0 4px">4. File lain (RI, foto, dokumen pendukung)</h4>' + r.lamp.filter(function (x) { return x.jenis === 'Lain'; }).map(fileBaris).join('') +
      '<input type="file" id="beFLn" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" multiple hidden><button id="beLn">+ File lain (PDF/foto)</button>' +
      '<div class="note" id="beLampInfo"></div>';
    box.innerHTML = h;
    box.querySelector('#beBpbM').value = bp.mode || 'auto';
    box.querySelector('#beBpbM').onchange = function () { bp.mode = this.value; S.kotor = true; gambarLampiran(); };
    box.onchange = function (e) { var c = e.target.closest('[data-bp]'); if (!c) return; var k = c.getAttribute('data-bp'), i = bp.lepas.indexOf(k); if (c.checked && i >= 0) bp.lepas.splice(i, 1); if (!c.checked && i < 0) bp.lepas.push(k); S.kotor = true; };
    var noIa = '';
    box.onclick = function (e) {
      var hz = e.target.closest('[data-lh]'); if (hz) { if (!confirm('Hapus lampiran ini?')) return; hz.disabled = true; api({action: 'adminBastLampHapus', lid: hz.getAttribute('data-lh')}).then(function (r2) { toast(r2.msg || '', !r2.ok); muatLampiran(); }); return; }
      var ui = e.target.closest('[data-lia]'); if (ui) { noIa = ui.getAttribute('data-lia'); box.querySelector('#beFIa').click(); }
    };
    box.querySelector('#beFIa').onchange = function () {
      var f = this.files[0]; this.value = ''; if (!f) return; var info = box.querySelector('#beLampInfo'), K = root.KBI; info.textContent = 'Membaca ' + f.name + '...';
      K.muatPdfjs().then(function (L) { return K.bacaBuf(f).then(function (buf) { var u8 = new Uint8Array(buf).slice(); return K.pdfKeHalaman(L, buf).then(function (pages) {
        var o = BA.bacaCetakan(pages);
        if (o.err) { info.textContent = ''; toast(f.name + ': ' + o.err + '.', true); return; }
        if (o.no !== noIa && !confirm('File ini berisi ' + o.no + ', bukan ' + noIa + '. Tetap lampirkan sebagai cetakan ' + noIa + '?')) { info.textContent = ''; return; }
        return api({action: 'adminBastLampUnggah', id: S.ed.id, jenis: 'IA', noIa: noIa, nama: f.name, b64: keB64(u8), mime: 'application/pdf'}).then(function (r2) { info.textContent = ''; toast(r2.msg || '', !r2.ok); muatLampiran(); });
      }); }); }).catch(function (e2) { info.textContent = ''; toast('Gagal: ' + (e2 && e2.message ? e2.message : e2), true); });
    };
    function unggahBebas(inp, jenis) {
      var fs = [].slice.call(inp.files); inp.value = ''; if (!fs.length) return; var info = box.querySelector('#beLampInfo'), p = Promise.resolve(), n = 0;
      fs.forEach(function (f, i) { p = p.then(function () { info.textContent = 'Mengunggah ' + (i + 1) + '/' + fs.length + ': ' + f.name; return root.KBI.bacaBuf(f).then(function (buf) { return api({action: 'adminBastLampUnggah', id: S.ed.id, jenis: jenis, nama: f.name, b64: keB64(new Uint8Array(buf)), mime: f.type || ''}); }).then(function (r2) { if (r2.ok) n++; else toast(f.name + ': ' + (r2.msg || 'gagal'), true); }); }); });
      p.then(function () { info.textContent = ''; toast(n + ' file ' + jenis + ' tersimpan.'); muatLampiran(); });
    }
    box.querySelector('#beBm').onclick = function () { box.querySelector('#beFBm').click(); };
    box.querySelector('#beLn').onclick = function () { box.querySelector('#beFLn').click(); };
    box.querySelector('#beFBm').onchange = function () { unggahBebas(this, 'BPB manual'); };
    box.querySelector('#beFLn').onchange = function () { unggahBebas(this, 'Lain'); };
  }
  function gambarBaris() {
    var d = S.ed.data, tb = el.querySelector('#beTb'), opsiKode = '<option value=""></option>' + KATEGORI.map(function (k) { return '<option value="' + k[0] + '">' + k[0] + ' ' + esc(k[1]) + '</option>'; }).join('');
    tb.innerHTML = d.baris.length ? d.baris.map(function (x, i) {
      return '<tr' + (x.ubah ? ' class="bst-ub"' : '') + ' data-i="' + i + '"><td>' + (i + 1) + '</td>' +
        '<td data-l="Dokumen">' + (x.jenis === 'IA' ? '<b>' + esc(x.no) + '</b><br><small>' + esc(dmy(x.tgl)) + '</small>' : '<input data-k="no" value="' + esc(x.no) + '" placeholder="RI.2026.xx.xxxxx" aria-label="Nomor dokumen"><input type="date" data-k="tgl" value="' + esc(x.tgl) + '" aria-label="Tanggal dokumen">') +
        (x.ubah ? '<br><span class="bst-tag">nilai berubah ' + esc(rpTeks(x.ubah.lama)) + ' &rarr; ' + esc(rpTeks(x.ubah.baru)) + '</span> <button data-ok="' + i + '">Oke</button>' : '') + '</td>' +
        '<td data-l="PPBJ"><input data-k="ppbj" value="' + esc(x.ppbj) + '" aria-label="PPBJ atau SPK"></td>' +
        '<td data-l="Akun"><input data-k="akun" list="bstAkun" value="' + esc(x.akun) + '" aria-label="Akun"></td>' +
        '<td data-l="Lokasi"><input data-k="lokasi" list="bstLok" value="' + esc(x.lokasi) + '" aria-label="Lokasi"></td>' +
        '<td data-l="Kode"><select data-k="kode" aria-label="Kode kategori">' + opsiKode.replace('value="' + esc(x.kode) + '"', 'value="' + esc(x.kode) + '" selected') + '</select></td>' +
        '<td class="nm" data-l="Jumlah"><input type="number" step="0.01" data-k="nilai" value="' + esc(x.nilai) + '" aria-label="Jumlah harga"' + (x.jenis === 'IA' && !x.manual ? ' title="Dari laporan IA. Bila diubah, nilai ini tidak lagi ikut pembaruan laporan."' : '') + '></td>' +
        '<td><button data-h="' + i + '" aria-label="Hapus baris ' + (i + 1) + '">Hapus</button></td></tr>';
    }).join('') : '<tr><td colspan="8">Belum ada baris. Tambah IA atau baris RI.</td></tr>';
    hitungTotal();
    tb.oninput = tb.onchange = function (e) {
      var t = e.target, k = t.getAttribute('data-k'), tr = t.closest('[data-i]'); if (!k || !tr) return;
      var x = d.baris[Number(tr.getAttribute('data-i'))];
      if (k === 'nilai') { x.nilai = Number(t.value) || 0; if (x.jenis === 'IA') x.manual = true; hitungTotal(); }
      else if (k === 'kode') { x.kode = t.value; x.knama = KATN[t.value] || ''; }
      else x[k] = t.value;
      S.kotor = true;
    };
    tb.onclick = function (e) {
      var h = e.target.closest('[data-h]'); if (h) { d.baris.splice(Number(h.getAttribute('data-h')), 1); S.kotor = true; gambarBaris(); return; }
      var o = e.target.closest('[data-ok]'); if (o) { delete d.baris[Number(o.getAttribute('data-ok'))].ubah; S.kotor = true; gambarBaris(); }
    };
  }
  function hitungTotal() { var t = S.ed.data.baris.reduce(function (a, x) { return a + (Number(x.nilai) || 0); }, 0), e = el.querySelector('#beTot'); if (e) e.textContent = 'Rp ' + rpTeks(t); }
  function cariIA(q) {
    var box = el.querySelector('#beHasil'); box.innerHTML = '<div class="note">Mencari...</div>';
    api({action: 'adminIaCari', q: q}).then(function (r) {
      if (!r.ok) { box.innerHTML = esc(r.msg || 'Gagal.'); return; }
      var ada = {}; S.ed.data.baris.forEach(function (x) { if (x.jenis === 'IA') ada[x.no] = 1; });
      box.innerHTML = r.rows.length ? r.rows.map(function (x, i) {
        var lain = x.bast && x.bast !== S.ed.nomor;
        return '<div style="padding:4px 0;border-bottom:1px solid var(--line,#eee)"><b>' + esc(x.no) + '</b> ' + esc(dmy(x.tgl)) + ' &middot; Rp ' + esc(rpTeks(x.nilai)) + (x.ppbj.length ? ' &middot; PPBJ ' + esc(x.ppbj.join(', ')) : '') + '<br><small>' + esc(x.ket) + '</small><br>' +
          (ada[x.no] ? '<small>sudah di BAST ini</small>' : lain ? '<small>sudah di BAST ' + esc(x.bast) + '</small>' : '<button data-t="' + i + '">Tambah</button>') + (x.rutin ? ' <small>(pemakaian rutin)</small>' : '') + '</div>';
      }).join('') + (r.total > r.rows.length ? '<div class="note">' + r.total + ' cocok, tampil ' + r.rows.length + '. Perjelas pencarian.</div>' : '') : '<div class="note">Tidak ada IA keluar yang cocok.</div>';
      box.onclick = function (e) {
        var b = e.target.closest('[data-t]'); if (!b) return; var x = r.rows[Number(b.getAttribute('data-t'))], x0 = S.ed.data.baris[0] || {};
        S.ed.data.baris.push({jenis: 'IA', no: x.no, tgl: x.tgl, ppbj: x.ppbj.length ? 'PPBJ ' + x.ppbj.join(', ') : '', akun: x0.akun || (S.ed.kat === 'Asset Konsesi' ? 'CIP - Aset Konsesi' : 'Perbaikan'), lokasi: x0.lokasi || '', kode: x0.kode || '', knama: x0.knama || '', nilai: x.nilai});
        S.ia[x.no] = S.ia[x.no] || {no: x.no, tgl: x.tgl, ket: x.ket, ppbj: x.ppbj, nilai: x.nilai, items: []};
        S.kotor = true; gambarBaris(); b.outerHTML = '<small>ditambahkan</small>';
      };
    });
  }
  function simpan() {
    var b = S.ed; b.nomor = el.querySelector('#beNomor').value.trim();
    if (!b.nama.trim()) { toast('Nama pekerjaan wajib diisi.', true); return Promise.resolve(false); }
    var bt = el.querySelector('#bstSimpan'); bt.disabled = true;
    return api({action: 'adminBastSimpan', bast: b}).then(function (r) {
      bt.disabled = false; toast(r.msg || (r.ok ? 'Tersimpan.' : 'Gagal.'), !r.ok);
      if (r.ok) { var baru = !b.id; b.id = r.id; b.nomor = r.nomor; S.kotor = false; if (baru) buka(r.id); }
      return !!r.ok;
    });
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = BA; else root.BASTM = BA;
})(typeof window !== 'undefined' ? window : globalThis);
