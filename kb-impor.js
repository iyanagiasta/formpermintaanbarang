/* Impor kebutuhan proyek (RAB) dari PDF PPBJ atau Excel. Dipakai bersama oleh proyek.html, kebutuhan.html, dan admin.html.
   Bagian pembaca (parsePdfHalaman, parseSheet) murni: tidak menyentuh halaman, sehingga dapat diuji tersendiri.
   Hasil bacaan SELALU ditampilkan dulu sebagai tabel pratinjau; tidak ada yang tersimpan sebelum pengguna menekan Simpan. */
(function (root) {
  'use strict';
  var KBI = {};
  var PDFJS_VER = '3.11.174';
  var PDFJS_SRC = ['https://cdn.jsdelivr.net/npm/pdfjs-dist@' + PDFJS_VER + '/build/pdf.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/' + PDFJS_VER + '/pdf.min.js'];
  var PDFJS_WORKER = ['https://cdn.jsdelivr.net/npm/pdfjs-dist@' + PDFJS_VER + '/build/pdf.worker.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/' + PDFJS_VER + '/pdf.worker.min.js'];

  /* ---------- alat kecil ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
  function fmtN(n) { n = Number(n) || 0; return (Math.round(n * 1000) / 1000).toString().replace('.', ','); }
  function rp(n) { return n === '' || n == null || isNaN(n) ? '' : 'Rp ' + Math.round(n).toLocaleString('id-ID'); }
  function norm(s) { return String(s == null ? '' : s).toLowerCase().replace(/\s+/g, ' ').trim(); }
  /** Angka dari teks: mengerti "1.316.575", "137.510,5", "3,5", "1,316,575", "3.5", dan angka Excel asli. Tidak terbaca -> NaN. */
  function angka(v) {
    if (typeof v === 'number') return v;
    var s = String(v == null ? '' : v).replace(/Rp\.?/gi, '').replace(/\s+/g, '');
    if (!s) return NaN;
    if (/^-?\d+$/.test(s)) return Number(s);
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) return Number(s.replace(/\./g, '').replace(',', '.'));
    if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) return Number(s.replace(/,/g, ''));
    if (/^-?\d+,\d+$/.test(s)) return Number(s.replace(',', '.'));
    if (/^-?\d+\.\d+$/.test(s)) return Number(s);
    return NaN;
  }
  var BULAN = {januari: 1, jan: 1, februari: 2, feb: 2, pebruari: 2, maret: 3, mar: 3, april: 4, apr: 4, mei: 5, juni: 6, jun: 6, juli: 7, jul: 7, agustus: 8, agu: 8, agt: 8, aug: 8, september: 9, sep: 9, sept: 9, oktober: 10, okt: 10, oct: 10, november: 11, nov: 11, nopember: 11, desember: 12, des: 12, dec: 12};
  function p2(n) { return String(n).length < 2 ? '0' + n : String(n); }
  /** Tanggal -> "YYYY-MM-DD" atau "". Mengerti "14 Oktober 2026", "2026-10-14", "14/10/2026", dan objek Date. */
  function tanggal(v) {
    if (v instanceof Date && !isNaN(v)) return v.getFullYear() + '-' + p2(v.getMonth() + 1) + '-' + p2(v.getDate());
    var s = String(v == null ? '' : v).trim(), m;
    if (!s) return '';
    if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return m[1] + '-' + p2(m[2]) + '-' + p2(m[3]);
    if ((m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/))) return m[3] + '-' + p2(m[2]) + '-' + p2(m[1]);
    if ((m = s.match(/(\d{1,2})\s+([A-Za-z]+)\.?\s+(\d{4})/))) { var b = BULAN[m[2].toLowerCase()]; if (b) return m[3] + '-' + p2(b) + '-' + p2(m[1]); }
    return '';
  }
  function kategoriDari(v) {
    var s = norm(v);
    if (!s) return '';
    if (/aset|capex/.test(s)) return 'Capex';
    return 'Opex';
  }
  function statusDari(v) {
    var s = norm(v);
    if (/order|pesan|beli/.test(s)) return 'ORDER';
    if (/stock|stok/.test(s)) return 'STOCK';
    return '';
  }

  /* ---------- pembaca PDF (murni) ----------
     pages: [{w,h,items:[{s,x,y,w,h}]}] dalam koordinat tampilan (y ke bawah), diperoleh dari pdf.js lewat Util.transform(viewport.transform, item.transform). */
  function pusatKolom(it) { return it.x + it.w / 2; }
  function parsePdfHalaman(pages) {
    var warn = [], out = {sumber: 'PDF', ppbj: '', nama: '', dept: '', kategori: '', tglButuh: '', tglBuat: '', rows: [], cek: null, warn: warn};
    if (!pages || !pages.length) return {err: 'PDF kosong.'};
    var P = pages.map(function (pg) { return {w: pg.w, items: (pg.items || []).filter(function (i) { return String(i.s).trim(); }).map(function (i) { return {s: String(i.s).trim(), x: i.x, y: i.y, w: i.w || 0, h: i.h || 0}; })}; });
    function cariHeader(pg) {
      var h = pg.items.filter(function (i) { return /^NAMA\s*BARANG/i.test(i.s); })[0];
      return h || null;
    }
    // kolom: pusat judul kolom dari halaman yang punya judul tabel
    var kol = null, pgHead = [];
    P.forEach(function (pg, pi) {
      var h = cariHeader(pg); pgHead[pi] = null; if (!h) return;
      var baris = pg.items.filter(function (i) { return Math.abs(i.y - h.y) <= 3; }), sub = pg.items.filter(function (i) { return i.y > h.y + 3 && i.y < h.y + 14; });
      function ambil(list, re) { var z = list.filter(function (i) { return re.test(i.s); })[0]; return z ? pusatKolom(z) : null; }
      var k = {no: ambil(baris, /^NO\.?$/i), nama: pusatKolom(h), merk: ambil(baris, /^MERK/i), spek: ambil(baris, /^SPESIFIKASI/i), harga: ambil(baris, /^HARGA/i), total: ambil(baris, /^TOTAL/i), status: ambil(baris, /^STATUS/i), qty: ambil(sub.concat(baris), /^JUMLAH|^QTY/i), satuan: ambil(sub.concat(baris), /^SATUAN/i)};
      var batas = Math.max.apply(null, [h.y].concat(sub.map(function (i) { return i.y; })));
      pgHead[pi] = {y: batas + 4, yJudul: h.y};
      if (!kol) kol = k;
    });
    if (!kol || kol.nama == null || kol.qty == null || kol.satuan == null || kol.no == null) return {err: 'Format PDF tidak dikenali: judul tabel (NO, NAMA BARANG/JASA, JUMLAH, SATUAN) tidak ditemukan. Gunakan PDF "Pengajuan Permintaan Barang/Jasa" dari sistem, atau impor lewat Excel.'};
    var kunciKol = Object.keys(kol).filter(function (k) { return kol[k] != null; });
    function kolomDari(it) {
      var c = pusatKolom(it), best = null, bd = 1e9;
      kunciKol.forEach(function (k) { var d = Math.abs(c - kol[k]); if (d < bd) { bd = d; best = k; } });
      return best;
    }
    // ---- blok keterangan di atas tabel (halaman pertama yang punya judul) ----
    var p0 = -1; pgHead.forEach(function (h, i) { if (h && p0 < 0) p0 = i; });
    var it0 = P[p0].items, yTab = pgHead[p0].yJudul;
    var yPerm = (it0.filter(function (i) { return /^PERMINTAAN$/i.test(i.s) && i.y < yTab; })[0] || {y: yTab}).y;
    var atas = it0.filter(function (i) { return i.y < yPerm - 2; });
    var LABEL = [['ppbj', /^no\.?\s*ppbj$/i], ['peruntukan', /^peruntukan$/i], ['kategori', /^kategori$/i], ['butuh', /^tanggal\s*dibutuhkan/i], ['buat', /^tanggal\s*dibuat/i], ['dept', /^departemen$/i]];
    var lab = {};
    atas.forEach(function (i) { LABEL.forEach(function (L) { if (!lab[L[0]] && L[1].test(i.s)) lab[L[0]] = i; }); });
    function nilai(key, banyakBaris) {
      var l = lab[key]; if (!l) return '';
      var kanan = atas.filter(function (i) { return Math.abs(i.y - l.y) <= 3 && i.x > l.x + 1; }).map(function (i) { return i.x; });
      // batas kanan = awal label berikutnya pada baris yang sama
      var lainX = []; Object.keys(lab).forEach(function (k) { if (k !== key && Math.abs(lab[k].y - l.y) <= 3 && lab[k].x > l.x + 1) lainX.push(lab[k].x); });
      atas.forEach(function (i) { if (Math.abs(i.y - l.y) <= 3 && i.x > l.x + 1 && /^(Jenis Kegiatan|Lokasi Kegiatan|Kategori|Departemen|No\.?\s*PPBJ)$/i.test(i.s) && i !== l) lainX.push(i.x); });
      var xMax = lainX.length ? Math.min.apply(null, lainX) : 1e9;
      var dlm = atas.filter(function (i) { return Math.abs(i.y - l.y) <= 3 && i.x >= l.x + l.w - 1 && i.x < xMax - 1 && i !== l && !/^:$/.test(i.s); });
      var xAwal = dlm.length ? Math.min.apply(null, dlm.map(function (i) { return i.x; })) : null;
      var teks = dlm.sort(function (a, b) { return a.x - b.x; }).map(function (i) { return i.s; }).join(' ');
      if (banyakBaris && xAwal != null) {   // nilai bisa turun ke beberapa baris (mis. Peruntukan)
        var lanjut = atas.filter(function (i) { return i.y > l.y + 3 && i.x >= xAwal - 6 && i.x < xMax - 1; }).sort(function (a, b) { return a.y - b.y || a.x - b.x; });
        var lastY = l.y;
        lanjut.forEach(function (i) { if (i.y - lastY > 16) return; if (Math.abs(i.y - lastY) > 3) lastY = i.y; teks += ' ' + i.s; });
      }
      return teks.replace(/\s+/g, ' ').trim();
    }
    out.ppbj = nilai('ppbj'); out.nama = nilai('peruntukan', true); out.kategori = lab.kategori ? kategoriDari(nilai('kategori')) : '';
    out.tglButuh = tanggal(nilai('butuh')); out.tglBuat = tanggal(nilai('buat')); out.deptFile = nilai('dept');
    if (!out.ppbj) warn.push('No PPBJ tidak terbaca dari PDF. Isi manual di bawah.');
    if (!out.nama) warn.push('Peruntukan (nama proyek) tidak terbaca dari PDF. Isi manual di bawah.');
    if (!lab.kategori) warn.push('Kategori tidak terbaca dari PDF. Pilih Capex atau Opex di bawah.');
    // ---- baris tabel ----
    var rows = [], cur = null, lastY = null, lastPg = -1, totalPdf = null;
    P.forEach(function (pg, pi) {
      var awal = pgHead[pi] ? pgHead[pi].y : 0;
      var its = pg.items.filter(function (i) { return i.y >= awal; }).sort(function (a, b) { return a.y - b.y || a.x - b.x; });
      var garis = [];
      its.forEach(function (i) { var g = garis[garis.length - 1]; if (g && Math.abs(g.y - i.y) <= 2.5) g.its.push(i); else garis.push({y: i.y, its: [i]}); });
      if (pi !== lastPg) { lastY = null; if (!pgHead[pi]) cur = cur; }
      lastPg = pi;
      var mulaiBaru = pgHead[pi] && cur;   // halaman lanjutan bertabel: baris lanjutan di puncak halaman masih milik baris terakhir
      garis.forEach(function (g, gi) {
        var kolom = {}; g.its.sort(function (a, b) { return a.x - b.x; }).forEach(function (i) { var k = kolomDari(i); (kolom[k] = kolom[k] || []).push(i); });
        function gabung(k) { var l = kolom[k] || []; var s = ''; l.forEach(function (i, n) { var pr = l[n - 1]; s += (n && (i.x - (pr.x + pr.w)) > 1.2 ? ' ' : (n ? '' : '')) + i.s; }); return s.trim(); }
        var noT = gabung('no'), adaNo = /^\d{1,4}$/.test(noT) && kolom.no && kolom.no.length === 1 && Object.keys(kolom).length > 1;
        if (adaNo) {
          cur = {no: Number(noT), nama: gabung('nama'), merk: gabung('merk'), spek: gabung('spek'), qtyT: gabung('qty'), satuan: gabung('satuan'), hargaT: gabung('harga'), totalT: gabung('total'), status: gabung('status')};
          rows.push(cur); lastY = g.y; return;
        }
        var ks = Object.keys(kolom);
        // baris tunggal berisi angka di kolom total, tanpa nomor = total keseluruhan
        if (ks.length === 1 && ks[0] === 'total' && !isNaN(angka(gabung('total')))) { totalPdf = angka(gabung('total')); return; }
        // lanjutan nama / merk / spesifikasi (nama panjang yang terpotong ke baris berikutnya)
        var hanyaTeks = ks.every(function (k) { return k === 'nama' || k === 'merk' || k === 'spek'; });
        var dekat = cur && ((lastY != null && g.y - lastY <= 14) || (lastY == null && gi === 0 && mulaiBaru));
        if (hanyaTeks && dekat) {
          if (kolom.nama) cur.nama = (cur.nama + ' ' + gabung('nama')).trim();
          if (kolom.merk) cur.merk = (cur.merk + ' ' + gabung('merk')).trim();
          if (kolom.spek) cur.spek = (cur.spek + ' ' + gabung('spek')).trim();
          lastY = g.y;
        } else { lastY = null; }
      });
    });
    var salah = [], sum = 0;
    rows.forEach(function (r) {
      r.qty = angka(r.qtyT); r.harga = angka(r.hargaT); r.total = angka(r.totalT); r.status = statusDari(r.status);
      var bacaok = !isNaN(r.qty) && !isNaN(r.total);
      if (!bacaok || !(r.qty > 0)) salah.push(r.no);
      else {
        sum += r.total;
        if (!isNaN(r.harga) && Math.abs(r.qty * r.harga - r.total) > Math.max(1, Math.abs(r.total) * 0.0005)) salah.push(r.no);
      }
      r.kode = ''; delete r.qtyT; delete r.hargaT; delete r.totalT;
      if (isNaN(r.harga)) r.harga = '';
    });
    if (!rows.length) return {err: 'Tidak ada baris barang yang terbaca dari PDF.'};
    var selisih = totalPdf == null ? null : Math.round((sum - totalPdf) * 100) / 100;
    out.rows = rows;
    out.cek = {nBaris: rows.length, jumlah: Math.round(sum * 100) / 100, totalPdf: totalPdf, selisih: selisih, barisSalah: salah, ok: totalPdf != null && Math.abs(selisih) <= 1 && !salah.length};
    if (totalPdf == null) warn.push('Total keseluruhan di PDF tidak ditemukan, jadi hanya hitungan per baris yang diperiksa.');
    return out;
  }

  /* ---------- pembaca Excel (murni) ---------- */
  function sel(v) { if (v instanceof Date) return v; return v == null ? '' : v; }
  function teks(v) { if (v instanceof Date) return tanggal(v); return String(v == null ? '' : v).trim(); }
  var KOL_RE = [['kode', /kode/], ['total', /total|jumlah\s*harga/], ['harga', /harga/], ['merk', /merk|merek|type|tipe/], ['spek', /spesifikasi|spek/], ['satuan', /^satuan|^sat\.?$|^uom$|^unit$/], ['no', /^no\.?$|^nomor$|^no\.?\s*urut$/], ['status', /status/], ['nama', /nama|uraian|deskripsi|material|barang|item/], ['qty', /^qty|^jumlah|^kuantitas|^volume|kebutuhan|butuh/]];
  var LABEL_X = [['ppbj', /^(no\.?\s*)?ppbj\b/], ['nama', /^peruntukan|^nama\s*proyek|^proyek\b/], ['kategori', /^kategori/], ['butuh', /^(tanggal|tgl\.?)\s*dibutuhkan/], ['buat', /^(tanggal|tgl\.?)\s*dibuat/], ['dept', /^departemen|^dept\b/]];
  /** aoa: array of array (sheet_to_json header:1, raw:true, cellDates). nama: nama sheet. Mengembalikan dokumen, null (sheet bukan tabel kebutuhan), atau {err}. */
  function parseSheet(aoa, namaSheet, bolehTanpaJudul) {
    var hi = -1, kol = null, i;
    for (i = 0; i < Math.min(aoa.length, 40); i++) {
      var t = {}, n = 0;
      (aoa[i] || []).forEach(function (x, j) {
        var s = norm(teks(x)); if (!s || s.length > 40) return;
        for (var k = 0; k < KOL_RE.length; k++) if (KOL_RE[k][1].test(s)) { if (t[KOL_RE[k][0]] == null) { t[KOL_RE[k][0]] = j; n++; } return; }
      });
      if (t.qty != null && (t.nama != null || t.kode != null)) { hi = i; kol = t; break; }
    }
    var tanpaJudul = false;
    if (hi < 0) {
      if (!bolehTanpaJudul) return null;
      hi = -1; kol = {kode: 0, nama: 1, qty: 2}; tanpaJudul = true;
    }
    var doc = {sumber: 'Excel', sheet: namaSheet || '', ppbj: '', nama: '', dept: '', kategori: '', tglButuh: '', tglBuat: '', rows: [], cek: null, warn: []};
    // blok keterangan di atas judul tabel: label di satu sel, nilai di sel berikutnya yang terisi
    for (i = 0; i < hi; i++) {
      var row = aoa[i] || [];
      for (var j = 0; j < row.length; j++) {
        var c = norm(teks(row[j])); if (!c) continue;
        for (var k = 0; k < LABEL_X.length; k++) {
          if (!LABEL_X[k][1].test(c)) continue;
          var key = LABEL_X[k][0], val = '', raw = '';
          var kt = c.indexOf(':'); if (kt > 0 && kt < c.length - 1 && teks(row[j]).slice(kt + 1).trim()) { raw = teks(row[j]).slice(teks(row[j]).indexOf(':') + 1).trim(); }
          if (!raw) for (var m = j + 1; m < row.length; m++) { var z = row[m]; if (teks(z) && teks(z) !== ':') { raw = z; break; } }
          val = raw;
          if (key === 'butuh' || key === 'buat') { if (!doc[key === 'butuh' ? 'tglButuh' : 'tglBuat']) doc[key === 'butuh' ? 'tglButuh' : 'tglBuat'] = tanggal(val); }
          else if (key === 'kategori') { if (!doc.kategori) doc.kategori = kategoriDari(teks(val)); }
          else if (key === 'dept') doc.deptFile = teks(val);
          else if (!doc[key]) doc[key] = teks(val);
          break;
        }
      }
    }
    for (i = hi + 1; i < aoa.length; i++) {
      var x = aoa[i] || [];
      var g = function (k) { return kol[k] == null ? '' : x[kol[k]]; };
      var nm = teks(g('nama')), kd = teks(g('kode'));
      if (!nm && !kd) continue;
      if (/^(total|jumlah total|grand total|sub\s*total)\b/i.test(nm)) continue;
      var q = angka(sel(g('qty'))), h = kol.harga == null ? '' : angka(sel(g('harga'))), tt = kol.total == null ? '' : angka(sel(g('total')));
      doc.rows.push({no: kol.no == null ? '' : teks(g('no')), kode: kd, nama: nm, merk: teks(g('merk')), spek: teks(g('spek')), qty: q, satuan: teks(g('satuan')), harga: isNaN(h) ? '' : h, total: isNaN(tt) ? '' : tt, status: statusDari(teks(g('status')))});
    }
    if (tanpaJudul && !doc.rows.some(function (r) { return !isNaN(r.qty); })) return {err: 'Tabel kebutuhan tidak ditemukan. Beri judul kolom "Nama Barang" dan "Jumlah" (atau "Qty"), atau pakai template.'};
    if (!doc.rows.length) return tanpaJudul ? {err: 'Tidak ada baris data di file.'} : null;
    if (tanpaJudul) doc.warn.push('File tanpa judul kolom dibaca sebagai A=Kode, B=Nama, C=Qty.');
    if (kol.qty == null) return {err: 'Kolom Qty/Jumlah tidak ditemukan.'};
    return doc;
  }
  /** Seluruh buku kerja -> daftar dokumen (satu sheet = satu PPBJ). XLSX = pustaka SheetJS. */
  function parseBuku(wb, XL, namaFile) {
    var docs = [], err = null, first = null;
    wb.SheetNames.forEach(function (sn, idx) {
      var aoa = XL.utils.sheet_to_json(wb.Sheets[sn], {header: 1, defval: '', raw: true});
      if (idx === 0) first = {sn: sn, aoa: aoa};
      var d = parseSheet(aoa, sn, false);
      if (d && d.err) err = d.err; else if (d) { d.file = namaFile; docs.push(d); }
    });
    if (!docs.length && first) {
      var d2 = parseSheet(first.aoa, first.sn, true);
      if (d2 && d2.err) return {docs: [], err: d2.err};
      if (d2) { d2.file = namaFile; docs.push(d2); }
    }
    if (!docs.length) return {docs: [], err: err || 'Tidak ada tabel kebutuhan di file. Pastikan ada judul kolom "Nama Barang" dan "Jumlah" (atau "Qty").'};
    return {docs: docs};
  }
  KBI.muatPdfjs = muatPdfjs; KBI.bacaBuf = bacaBuf; KBI.pdfKeHalaman = pdfKeHalaman;
  KBI.parsePdfHalaman = parsePdfHalaman; KBI.parseSheet = parseSheet; KBI.parseBuku = parseBuku; KBI.angka = angka; KBI.tanggal = tanggal;

  /* ---------- pemuat pustaka (hanya di browser) ---------- */
  function muatSkrip(urls, ok) {
    return new Promise(function (res, rej) {
      var i = 0;
      (function coba() {
        if (ok()) return res();
        if (i >= urls.length) return rej(new Error('Pustaka tidak dapat dimuat.'));
        var s = document.createElement('script'); s.src = urls[i++]; s.async = true;
        s.onload = function () { ok() ? res() : coba(); }; s.onerror = function () { s.remove(); coba(); };
        document.head.appendChild(s);
      })();
    });
  }
  function muatPdfjs() {
    return muatSkrip(PDFJS_SRC, function () { return !!root.pdfjsLib; }).then(function () {
      var L = root.pdfjsLib;
      if (L.GlobalWorkerOptions && !L.GlobalWorkerOptions.workerSrc) L.GlobalWorkerOptions.workerSrc = PDFJS_WORKER[0];
      return L;
    });
  }
  function bacaBuf(file) {
    return new Promise(function (res, rej) { var fr = new FileReader(); fr.onload = function (e) { res(e.target.result); }; fr.onerror = function () { rej(new Error('File tidak bisa dibaca.')); }; fr.readAsArrayBuffer(file); });
  }
  function pdfKeHalaman(L, buf) {
    return L.getDocument({data: new Uint8Array(buf)}).promise.then(function (doc) {
      var out = [], p = Promise.resolve();
      for (var n = 1; n <= doc.numPages; n++) (function (no) {
        p = p.then(function () { return doc.getPage(no); }).then(function (page) {
          var vp = page.getViewport({scale: 1});
          return page.getTextContent().then(function (tc) {
            out.push({w: vp.width, h: vp.height, items: tc.items.filter(function (i) { return typeof i.str === 'string'; }).map(function (i) {
              var t = L.Util.transform(vp.transform, i.transform), hz = Math.abs(t[0]) > Math.abs(t[1]);
              return {s: i.str, x: t[4], y: t[5], w: hz ? i.width : i.height, h: hz ? i.height : i.width};
            })});
          });
        });
      })(n);
      return p.then(function () { return out; });
    });
  }
  KBI._pdfKeHalaman = pdfKeHalaman;

  /* ---------- tampilan ---------- */
  var CSS = '.kbi-w{position:fixed;inset:0;z-index:9000;background:rgba(10,20,28,.55);display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:14px}' +
    '.kbi{--k-bg:#fff;--k-ink:#0d1f2d;--k-line:#cfd8de;--k-mut:#5b7a8c;--k-red:#8a1c28;--k-redbg:#fde8e8;--k-amb:#fff3cd;--k-ambt:#7a5b00;--k-grn:#14612b;--k-grnbg:#dff3e4;--k-navy:#17588f;background:var(--k-bg);color:var(--k-ink);border-radius:12px;max-width:1100px;width:100%;padding:16px;font:14px "Segoe UI",Roboto,Arial,sans-serif;box-shadow:0 10px 40px rgba(0,0,0,.35)}' +
    '@media (prefers-color-scheme:dark){html:not([data-tema="terang"]) .kbi{--k-bg:#1a252c;--k-ink:#e6eef2;--k-line:#33444e;--k-mut:#9db0bc;--k-red:#f2b8bf;--k-redbg:#3a1d22;--k-amb:#3a321a;--k-ambt:#f0d98a;--k-grn:#a5e6b8;--k-grnbg:#1d3a27}}' +
    'html[data-tema="gelap"] .kbi{--k-bg:#1a252c;--k-ink:#e6eef2;--k-line:#33444e;--k-mut:#9db0bc;--k-red:#f2b8bf;--k-redbg:#3a1d22;--k-amb:#3a321a;--k-ambt:#f0d98a;--k-grn:#a5e6b8;--k-grnbg:#1d3a27}' +
    '.kbi *{box-sizing:border-box}.kbi h3{margin:0 0 4px;font-size:17px}.kbi .m{color:var(--k-mut);font-size:12px}' +
    '.kbi input,.kbi select{padding:8px;font:inherit;border:1px solid var(--k-line);border-radius:8px;background:var(--k-bg);color:var(--k-ink);max-width:100%}' +
    '.kbi button{font:600 13px "Segoe UI",Roboto,Arial,sans-serif;padding:9px 13px;border:0;border-radius:8px;color:#fff;background:var(--k-navy);cursor:pointer}.kbi button:disabled{opacity:.45;cursor:default}' +
    '.kbi button.g{background:transparent;color:var(--k-ink);border:1px solid var(--k-line)}.kbi button.s{background:#1b8a3a}' +
    '.kbi .fr{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0}' +
    '.kbi .bx{border-radius:9px;padding:9px 11px;margin:8px 0;font-size:13px;border:1px solid var(--k-line)}.kbi .bx.a{background:var(--k-amb);color:var(--k-ambt);border-color:transparent}.kbi .bx.r{background:var(--k-redbg);color:var(--k-red);border-color:transparent}.kbi .bx.o{background:var(--k-grnbg);color:var(--k-grn);border-color:transparent}' +
    '.kbi .tw{overflow:auto;max-height:46vh;border:1px solid var(--k-line);border-radius:9px;margin-top:6px}.kbi table{width:100%;border-collapse:collapse}.kbi th{background:var(--k-navy);color:#fff;text-align:left;padding:7px;font-size:12px;position:sticky;top:0;white-space:nowrap}' +
    '.kbi td{border-top:1px solid var(--k-line);padding:6px 7px;vertical-align:top}.kbi td small{display:block;color:var(--k-mut);font-size:11px}.kbi tr.bad td{background:var(--k-redbg)}.kbi tr.skip td{opacity:.5}.kbi td.n{text-align:right;white-space:nowrap}' +
    '.kbi .tag{display:inline-block;border-radius:20px;padding:1px 8px;font-size:11px;font-weight:700;background:var(--k-amb);color:var(--k-ambt)}.kbi .tag.g{background:var(--k-grnbg);color:var(--k-grn)}.kbi .tag.r{background:var(--k-redbg);color:var(--k-red)}' +
    '.kbi td input.q{width:80px;padding:5px}.kbi td select{max-width:340px;padding:5px}.kbi details{margin:6px 0}.kbi summary{cursor:pointer;color:var(--k-mut)}';
  function pasangCss() { if (document.getElementById('kbi-css')) return; var s = document.createElement('style'); s.id = 'kbi-css'; s.textContent = CSS; document.head.appendChild(s); }

  var W = null;   // lapisan modal aktif
  function tutup() { if (W) { W.remove(); W = null; } }
  function kotak(html) {
    pasangCss();
    if (!W) { W = document.createElement('div'); W.className = 'kbi-w'; W.setAttribute('role', 'dialog'); W.setAttribute('aria-modal', 'true'); document.body.appendChild(W); }
    W.innerHTML = '<div class="kbi">' + html + '</div>';
    return W.firstChild;
  }
  function kabar(m, bad) { try { if (typeof root.toast === 'function') return root.toast(m, !!bad); } catch (e) {} if (!bad) return; try { root.alert(m); } catch (e) {} }

  /** Daftar barang final dari pratinjau: gabung kode yang sama, buang yang dilewati. */
  function susun(D) {
    var items = [], rinci = [], idx = {}, tak = 0, nol = 0, nlewat = 0;
    D.cek.rows.forEach(function (o) {
      var r = D.doc.rows[o.i], pil = D.pilih[o.i];
      if (o.jasa || (o.jasaDugaan && !D.bukanJasa[o.i])) return;
      var kode = '', nm = '', st = '', q = Number(String(D.qty[o.i] != null ? D.qty[o.i] : r.qty).replace(',', '.'));
      if (o.ok) { if (pil === 'skip') { nlewat++; return; } kode = o.kode; nm = o.nama; st = o.satuan; }
      else {
        if (pil === 'skip') { nlewat++; return; } if (!pil) { tak++; return; } kode = pil;
        (o.saran || []).forEach(function (z) { if (z.kode === pil) { nm = z.nama; st = z.satuan; } });
      }
      if (!(q > 0)) { nol++; return; }
      var k = String(kode).toUpperCase();
      if (idx[k] == null) {
        idx[k] = items.length; items.push({kode: kode, qty: q, nama: nm, satuan: st});
        rinci.push({kode: kode, status: r.status || '', harga: r.harga === '' || r.harga == null ? '' : r.harga, merk: r.merk || '', spek: r.spek || ''});
      } else {
        items[idx[k]].qty = Math.round((items[idx[k]].qty + q) * 1000) / 1000;
        if (r.status === 'ORDER') rinci[idx[k]].status = 'ORDER';
      }
    });
    return {items: items, rinci: rinci, tak: tak, nol: nol, nlewat: nlewat};
  }

  function mulaiAntri(opt, docs) {
    var i = 0, hasil = {disimpan: 0, diisi: 0};
    function lanjut() { i++; if (i >= docs.length) { tutup(); if (opt.onSelesai) opt.onSelesai(hasil); } else tampil(); }
    function tampil() {
      var doc = docs[i], D = {doc: doc, cek: null, pilih: {}, qty: {}, bukanJasa: {}, ppbj: doc.ppbj || '', nama: doc.nama || '', kategori: doc.kategori || ''};
      var judul = 'Impor ' + (doc.sumber === 'PDF' ? 'PDF PPBJ' : 'Excel') + (docs.length > 1 ? ' · dokumen ' + (i + 1) + ' dari ' + docs.length : '');
      kotak('<h3>' + esc(judul) + '</h3><div class="m">' + esc(doc.file || '') + (doc.sheet ? ' · sheet ' + esc(doc.sheet) : '') + '</div><div class="bx">Mencocokkan barang dengan database...</div>');
      periksa(D, judul);
    }
    function periksa(D, judul) {
      var rows = D.doc.rows.map(function (r) { return {kode: r.kode, nama: r.nama, qty: r.qty, satuan: r.satuan}; });
      opt.api({action: 'kbImporCek', ppbj: D.ppbj, rows: rows}).then(function (r) {
        if (!r.ok) { kotak('<h3>' + esc(judul) + '</h3><div class="bx r">' + esc(r.msg || 'Gagal memeriksa.') + '</div><div class="fr"><button class="g" id="kbx">Tutup</button></div>'); document.getElementById('kbx').onclick = tutup; return; }
        D.cek = r; gambar(D, judul);
      }).catch(function () { kotak('<h3>' + esc(judul) + '</h3><div class="bx r">Gagal terhubung ke server.</div><div class="fr"><button class="g" id="kbx">Tutup</button></div>'); document.getElementById('kbx').onclick = tutup; });
    }
    function gambar(D, judul) {
      var doc = D.doc, c = D.cek, S = susun(D), sisa = S.tak;
      var jasa = c.rows.filter(function (o) { return o.jasa; }), dugaan = c.rows.filter(function (o) { return o.jasaDugaan && !D.bukanJasa[o.i]; });
      var h = '<h3>' + esc(judul) + '</h3><div class="m">' + esc(doc.file || '') + (doc.sheet ? ' · sheet ' + esc(doc.sheet) : '') + '</div>';
      h += '<div class="fr"><input id="kbp" placeholder="No PPBJ" value="' + esc(D.ppbj) + '" style="width:210px"><input id="kbn" placeholder="Nama proyek" value="' + esc(D.nama) + '" style="flex:1;min-width:220px"><select id="kbk"><option value="">Kategori: pilih</option><option value="Opex"' + (D.kategori === 'Opex' ? ' selected' : '') + '>Opex</option><option value="Capex"' + (D.kategori === 'Capex' ? ' selected' : '') + '>Capex</option></select></div>';
      h += '<div class="m">Departemen tidak diambil dari file' + (doc.deptFile ? ' (di file: ' + esc(doc.deptFile) + ')' : '') + '; atur sendiri di Isi Kebutuhan Proyek bila perlu.' + (doc.tglButuh ? ' Tanggal dibutuhkan: <b>' + esc(doc.tglButuh) + '</b> (hanya dicatat sebagai info).' : '') + '</div>';
      (doc.warn || []).forEach(function (w) { h += '<div class="bx a">' + esc(w) + '</div>'; });
      if (doc.cek) {
        var k = doc.cek;
        if (k.ok) h += '<div class="bx o"><b>Pemeriksa total: cocok.</b> ' + k.nBaris + ' baris, jumlah total ' + rp(k.jumlah) + ' sama dengan total di PDF, dan jumlah &times; harga = total di setiap baris.</div>';
        else {
          var al = [];
          if (k.totalPdf != null && Math.abs(k.selisih) > 1) al.push('jumlah total baris yang terbaca ' + rp(k.jumlah) + ' berbeda ' + rp(Math.abs(k.selisih)) + ' dari total PDF ' + rp(k.totalPdf) + ' (kemungkinan ada baris yang terlewat atau salah baca)');
          if (k.barisSalah.length) al.push('baris no ' + k.barisSalah.slice(0, 12).join(', ') + (k.barisSalah.length > 12 ? ' dan lainnya' : '') + ': jumlah &times; harga tidak sama dengan total, atau angka tidak terbaca');
          h += '<div class="bx r"><b>Pemeriksa total: ada yang tidak cocok.</b> ' + al.join('; ') + '. Bandingkan tabel di bawah dengan PDF aslinya sebelum menyimpan.</div>';
        }
      }
      if (c.revisi && c.revisi.ada) {
        var rv = c.revisi;
        h += '<div class="bx a"><b>PPBJ ini sudah punya RAB tersimpan</b> (' + rv.nLama + ' barang' + (rv.diubah ? ', terakhir diubah ' + esc(rv.diubah) + (rv.oleh ? ' oleh ' + esc(rv.oleh) : '') : '') + '). Jika disimpan, daftar lama <b>diganti seluruhnya</b> (versi lama tetap ada di riwayat). Beda dengan file ini: <b>' + rv.nTambah + '</b> barang baru, <b>' + rv.nHapus + '</b> barang hilang, <b>' + rv.nUbah + '</b> jumlah berubah, ' + rv.sama + ' sama.' +
          (rv.nTambah + rv.nHapus + rv.nUbah ? '<details><summary>Lihat rincian beda</summary>' +
            rv.tambah.slice(0, 40).map(function (x) { return '+ ' + esc(x.nama) + ' (' + fmtN(x.qty) + ')'; }).concat(rv.hapus.slice(0, 40).map(function (x) { return '&minus; ' + esc(x.nama) + ' (' + fmtN(x.qty) + ')'; })).concat(rv.ubah.slice(0, 40).map(function (x) { return '&asymp; ' + esc(x.nama) + ': ' + fmtN(x.dari) + ' &rarr; ' + fmtN(x.ke); })).join('<br>') + '</details>' : '') + '<div class="m">Perbandingan memakai barang yang sudah cocok; ikut berubah bila Anda memilih barang di tabel.</div></div>';
      }
      (c.mirip || []).forEach(function (m) {
        h += '<div class="bx a"><b>Mirip dengan RAB proyek lain:</b> PPBJ ' + esc(m.ppbj) + (m.nama ? ' (' + esc(m.nama) + ')' : '') + ' punya ' + m.same + ' barang dengan jumlah yang sama persis (' + m.persen + '% dari daftar yang lebih kecil). Kemungkinan daftar ini disalin dari proyek tersebut. Pastikan memang sama.</div>';
      });
      if (c.sl && c.sl.nCocok > 0) {
        if (D.slTandai === undefined) D.slTandai = !!(c.sl.sudahSL || c.sl.persen >= 60);
        h += '<div class="bx a"><b>Diduga proyek Sambungan Langsung (SL):</b> ' + c.sl.nCocok + ' dari ' + c.sl.nItem + ' barang di daftar ini adalah isi paket ' + esc(c.sl.paket.join(', ')) + ' (' + c.sl.persen + '%).' + (c.sl.sudahSL ? ' Proyek ini sudah ditandai SL.' : '') +
          (c.sl.boleh ? '<div class="fr" style="margin:6px 0 0"><label><input type="checkbox" id="kbsl"' + (D.slTandai ? ' checked' : '') + '> Tandai proyek ini sebagai SL saat disimpan</label></div>' : '<div class="m">Penandaan SL dilakukan admin.</div>') + '</div>';
      }
      if (c.proyek && !c.proyek.ada && D.ppbj) h += '<div class="bx">PPBJ ini belum terdaftar sebagai proyek; akan didaftarkan otomatis saat RAB disimpan.</div>';
      h += '<div class="m"><b>' + c.nCocok + '</b> barang cocok' + ((jasa.length + dugaan.length) ? ', <b>' + (jasa.length + dugaan.length) + '</b> jasa/pekerjaan dilewati otomatis' : '') + (sisa ? ', <b class="err" style="color:var(--k-red)">' + sisa + ' perlu Anda pilih</b>' : '') + (S.nlewat ? ', ' + S.nlewat + ' dilewati' : '') + '.</div>';
      h += '<div class="tw"><table><thead><tr><th>#</th><th>Di file</th><th>Barang di database</th><th>Qty</th><th>Satuan</th><th>Status</th><th>Harga anggaran</th><th></th></tr></thead><tbody>';
      c.rows.forEach(function (o) {
        var r = doc.rows[o.i], pil = D.pilih[o.i];
        if (o.jasa || (o.jasaDugaan && !D.bukanJasa[o.i])) return;
        var bad = !o.ok && !pil, skip = pil === 'skip';
        var dbCell;
        if (o.ok) dbCell = '<b>' + esc(o.nama) + '</b><small>' + esc(o.kode) + (o.via && o.via !== 'kode' && o.via !== 'nama' ? ' · ' + esc(o.via) : '') + '</small>' + (o.satuanBeda ? '<small class="err" style="color:var(--k-red)">satuan di file: ' + esc(o.satuanBeda) + '</small>' : '');
        else {
          var ops = '<option value="">— pilih barang —</option>' + (o.saran || []).map(function (s) { return '<option value="' + esc(s.kode) + '"' + (pil === s.kode ? ' selected' : '') + '>' + esc(s.nama) + (s.satuan ? ' · ' + esc(s.satuan) : '') + '</option>'; }).join('') + '<option value="skip"' + (skip ? ' selected' : '') + '>Lewati baris ini</option>';
          dbCell = '<span class="tag r">TIDAK ADA di database</span><br><select data-kp="' + o.i + '">' + ops + '</select>' + ((o.saran || []).length ? '' : '<small>Tidak ada saran. Lewati, atau daftarkan barangnya dulu di Master Barang.</small>');
        }
        var q = D.qty[o.i] != null ? D.qty[o.i] : fmtN(r.qty);
        var qBad = !(Number(String(q).replace(',', '.')) > 0);
        h += '<tr class="' + (bad || (qBad && !skip) ? 'bad' : '') + (skip ? ' skip' : '') + '"><td class="n">' + esc(r.no || (o.i + 1)) + '</td><td>' + esc(o.namaFile || r.nama) + (r.merk || r.spek ? '<small>' + esc([r.merk, r.spek].filter(Boolean).join(' · ')) + '</small>' : '') + '</td><td>' + dbCell + '</td>' +
          '<td><input class="q" inputmode="decimal" data-kq="' + o.i + '" value="' + esc(q) + '"></td><td>' + esc(r.satuan || '') + '</td><td>' + (r.status ? '<span class="tag ' + (r.status === 'ORDER' ? '' : 'g') + '">' + r.status + '</span>' : '') + '</td><td class="n">' + (r.harga === '' ? '' : esc(rp(r.harga))) + '</td>' +
          '<td>' + (o.ok ? '<button class="g" data-kl="' + o.i + '">' + (skip ? 'Ikutkan' : 'Lewati') + '</button>' : '') + '</td></tr>';
      });
      h += '</tbody></table></div>';
      if (jasa.length || dugaan.length) h += '<details><summary>' + (jasa.length + dugaan.length) + ' jasa/pekerjaan dilewati (bukan barang gudang)</summary><div class="m">' + jasa.map(function (o) { return esc(o.namaFile); }).join('<br>') + (jasa.length && dugaan.length ? '<br>' : '') + dugaan.map(function (o) { return esc(o.namaFile) + ' <i>(tidak ada di database, dianggap jasa dari namanya)</i> <button class="g" data-bj="' + o.i + '">Ini barang, bukan jasa</button>'; }).join('<br>') + '</div></details>';
      var siap = !!(D.ppbj.trim() && D.nama.trim() && D.kategori && S.items.length && !sisa && !S.nol);
      var why = !D.ppbj.trim() ? 'Isi No PPBJ.' : !D.nama.trim() ? 'Isi nama proyek.' : !D.kategori ? 'Pilih kategori Capex atau Opex.' : sisa ? 'Pilih barang untuk baris merah, atau lewati barisnya.' : S.nol ? 'Ada qty yang belum benar (harus lebih dari 0).' : !S.items.length ? 'Belum ada barang.' : '';
      h += '<div class="m" id="kbw" style="margin-top:6px">' + (why ? esc(why) : '<b>' + S.items.length + ' barang</b> siap disimpan.') + '</div><div class="fr">';
      if (opt.simpan !== false) h += '<button class="s" id="kbs"' + (siap ? '' : ' disabled') + '>Simpan RAB</button>';
      if (opt.isi) h += '<button id="kbi"' + (siap ? '' : ' disabled') + '>' + esc(opt.isiLabel || 'Isi ke formulir') + '</button>';
      h += (docs.length > 1 && i < docs.length - 1 ? '<button class="g" id="kbl">Lewati dokumen ini</button>' : '') + '<button class="g" id="kbx">' + (docs.length > 1 ? 'Batal semua' : 'Batal') + '</button></div>';
      kotak(h);
      var P = document.getElementById('kbp'), N = document.getElementById('kbn'), K = document.getElementById('kbk');
      N.oninput = function () { D.nama = N.value; ulangStatus(D, S); };
      var SLc = document.getElementById('kbsl'); if (SLc) SLc.onchange = function () { D.slTandai = SLc.checked; };
      K.onchange = function () { D.kategori = K.value; gambar(D, judul); };
      P.onchange = function () { D.ppbj = P.value.trim(); D.nama = N.value; periksa(D, judul); };
      var pindah = function () { D.ppbj = P.value; D.nama = N.value; };
      Array.prototype.forEach.call(W.querySelectorAll('[data-kp]'), function (s) { s.onchange = function () { pindah(); D.pilih[s.getAttribute("data-kp")] = s.value; gambar(D, judul); }; });
      Array.prototype.forEach.call(W.querySelectorAll('[data-kl]'), function (b) { b.onclick = function () { pindah(); var n = b.getAttribute("data-kl"); D.pilih[n] = D.pilih[n] === 'skip' ? '' : 'skip'; gambar(D, judul); }; });
      Array.prototype.forEach.call(W.querySelectorAll('[data-kq]'), function (e) { e.onchange = function () { pindah(); D.qty[e.getAttribute("data-kq")] = e.value; gambar(D, judul); }; });
      document.getElementById('kbx').onclick = function () { tutup(); if (opt.onSelesai) opt.onSelesai(hasil, true); };
      Array.prototype.forEach.call(W.querySelectorAll('[data-bj]'), function (b) { b.onclick = function () { pindah(); D.bukanJasa[b.getAttribute('data-bj')] = true; gambar(D, judul); }; });
      var kl = document.getElementById('kbl'); if (kl) kl.onclick = lanjut;
      var payload = function () { pindah(); var S2 = susun(D); return {ppbj: D.ppbj.trim(), nama: D.nama.trim(), dept: '', kategori: D.kategori, items: S2.items, rinci: S2.rinci, meta: {tglButuh: doc.tglButuh || '', tglBuat: doc.tglBuat || '', sumber: doc.sumber}, jagaDept: true, sl: (c.sl && c.sl.boleh && D.slTandai !== undefined && !!D.slTandai !== !!c.sl.sudahSL) ? (D.slTandai ? 'SL' : 'Reguler') : ''}; };
      var bs = document.getElementById('kbs');
      if (bs) bs.onclick = function () { simpanDok(payload(), bs, false, function () { hasil.disimpan++; lanjut(); }); };
      var bi = document.getElementById('kbi');
      if (bi) bi.onclick = function () { var p = payload(); opt.isi(p, doc); hasil.diisi++; lanjut(); };
    }
    function ulangStatus() { }
    function simpanDok(p, tombol, ganti, sudah) {
      tombol.disabled = true; tombol.textContent = 'Menyimpan...';
      var b = {action: 'kbSimpan', ppbj: p.ppbj, nama: p.nama, dept: '', jagaDept: true, kategori: p.kategori, items: p.items.map(function (x) { return {kode: x.kode, qty: x.qty}; }), rinci: p.rinci, meta: p.meta, ganti: ganti === true};
      opt.api(b).then(function (r) {
        if (r.perlu === 'ganti') {
          var ya = root.confirm('PPBJ ' + p.ppbj + ' sudah punya kebutuhan (' + r.ada + ' barang).\n\nGanti SELURUHNYA dengan daftar impor ini (' + p.items.length + ' barang)? Versi lama tersimpan di riwayat.');
          if (ya) return simpanDok(p, tombol, true, sudah);
          tombol.disabled = false; tombol.textContent = 'Simpan RAB'; return;
        }
        if (!r.ok) { kabar(r.msg || 'Gagal menyimpan.', true); tombol.disabled = false; tombol.textContent = 'Simpan RAB'; return; }
        kabar(r.msg || 'Tersimpan.');
        if (opt.onSimpan) try { opt.onSimpan(r, p); } catch (e) {}
        if (p.sl) { opt.api({action: 'adminProyekJenis', ppbj: p.ppbj, jenis: p.sl}).then(function (j) { kabar(j.msg || 'Jenis proyek diperbarui.', !j.ok); }).catch(function () {}).then(sudah); return; }
        sudah();
      }).catch(function () { kabar('Gagal terhubung ke server.', true); tombol.disabled = false; tombol.textContent = 'Simpan RAB'; });
    }
    tampil();
  }

  /** Mulai impor. opt: {jenis:'excel'|'pdf', api:fn(body)->Promise<json>, isi:fn(payload,doc)|null, isiLabel, simpan:true|false, onSimpan:fn, onSelesai:fn}.
      Harus dipanggil langsung dari klik tombol (membuka pemilih file). */
  KBI.mulai = function (opt) {
    var inp = document.createElement('input'); inp.type = 'file'; inp.multiple = true; inp.style.display = 'none';
    inp.accept = opt.jenis === 'pdf' ? '.pdf,application/pdf' : '.xlsx,.xls,.csv';
    document.body.appendChild(inp);
    inp.onchange = function () {
      var files = Array.prototype.slice.call(inp.files || []); inp.remove();
      if (!files.length) return;
      pasangCss();
      kotak('<h3>Membaca file...</h3><div class="bx">Mohon tunggu, ' + files.length + ' file sedang dibaca.</div>');
      var docs = [], gagal = [];
      var urut = files.reduce(function (p, f) {
        return p.then(function () {
          return bacaBuf(f).then(function (buf) {
            if (opt.jenis === 'pdf') {
              return muatPdfjs().then(function (L) { return pdfKeHalaman(L, buf); }).then(function (pages) {
                var d = parsePdfHalaman(pages); if (d.err) gagal.push(f.name + ': ' + d.err); else { d.file = f.name; docs.push(d); }
              });
            }
            if (typeof root.XLSX === 'undefined') { gagal.push(f.name + ': pembaca Excel belum termuat. Periksa internet lalu muat ulang halaman.'); return; }
            var wb = root.XLSX.read(new Uint8Array(buf), {type: 'array', cellDates: true});
            var r = parseBuku(wb, root.XLSX, f.name); if (r.err) gagal.push(f.name + ': ' + r.err); else r.docs.forEach(function (d) { docs.push(d); });
          }).catch(function (e) {
            gagal.push(f.name + ': ' + (opt.jenis === 'pdf' ? (/password|encrypt/i.test(String(e && e.message)) ? 'PDF terkunci password.' : (/dimuat/.test(String(e && e.message)) ? 'pembaca PDF gagal dimuat dari internet. Periksa koneksi lalu coba lagi, atau pakai impor Excel.' : 'PDF tidak bisa dibaca.')) : 'file tidak bisa dibaca. Gunakan .xlsx atau .csv.'));
          });
        });
      }, Promise.resolve());
      urut.then(function () {
        if (!docs.length) { kotak('<h3>Impor tidak bisa dilanjutkan</h3>' + gagal.map(function (g) { return '<div class="bx r">' + esc(g) + '</div>'; }).join('') + '<div class="fr"><button class="g" id="kbx">Tutup</button></div>'); document.getElementById('kbx').onclick = tutup; return; }
        if (gagal.length) kabar(gagal.length + ' file tidak terbaca: ' + gagal.join(' | '), true);
        mulaiAntri(opt, docs);
      });
    };
    inp.click();
  };

  /* ---------- template dan ekspor Excel ---------- */
  var HEAD_TABEL = ['No', 'Nama Barang', 'Kode Barang (opsional)', 'Merk/Type', 'Spesifikasi', 'Jumlah', 'Satuan', 'Harga Satuan', 'Status (ORDER/STOCK)'];
  function bukuForm(ppbj, nama, kategori, tgl, baris, XL) {
    var a = [['No PPBJ', ppbj || ''], ['Peruntukan (Nama Proyek)', nama || ''], ['Kategori (Capex/Opex)', kategori || ''], ['Tanggal Dibutuhkan', tgl || ''], ['Departemen (tidak dibaca; atur di sistem)', ''], [], HEAD_TABEL].concat(baris);
    var ws = XL.utils.aoa_to_sheet(a); ws['!cols'] = [{wch:8},{wch:44},{wch:22},{wch:18},{wch:26},{wch:10},{wch:10},{wch:14},{wch:20}];
    return ws;
  }
  KBI.templat = function () {
    var XL = root.XLSX; if (!XL) { root.alert('Pembuat Excel belum termuat. Periksa internet lalu muat ulang halaman.'); return; }
    var ws = bukuForm('024/PB/X/2026', 'Contoh: Pekerjaan Pengembangan Jaringan', 'Capex', '2026-10-14', [[1, 'TEE REDUCER HDPE dn 250 x 110 mm', '', '', '', 1, 'PCS', 1316575, 'STOCK'], [2, 'FLANGE PN 10 dn 10 Inch -- 250 mm', '', '', 'Type Long', 2, 'PCS', 1100000, 'ORDER'], [3, 'KARET PACKING M', '', '', '', 3.5, 'METER', 200000, 'ORDER']], XL);
    var pt = XL.utils.aoa_to_sheet([['Petunjuk template kebutuhan proyek'], [''], ['1. Satu sheet = satu No PPBJ. Untuk beberapa PPBJ, salin sheet "Kebutuhan" lalu isi masing-masing.'], ['2. Isi No PPBJ, Peruntukan, dan Kategori di bagian atas. Kolom dibaca dari JUDUL kolomnya, jadi urutan kolom boleh berubah asal judulnya tetap.'], ['3. Nama Barang sebaiknya sama dengan nama di database. Bila Kode Barang diisi, kode itu dipakai lebih dulu.'], ['4. Harga Satuan hanya harga anggaran RAB; TIDAK mengubah harga stok.'], ['5. Status ORDER = barang akan dibeli; STOCK = diambil dari stok. Dicatat sebagai info.'], ['6. Departemen tidak dibaca dari file. Atur di tab Isi Kebutuhan Proyek.'], ['7. Setelah dipilih, tabel pratinjau selalu ditampilkan dulu; tidak ada yang tersimpan sebelum Anda menekan Simpan.']]);
    pt['!cols'] = [{wch: 120}];
    var wb = XL.utils.book_new(); XL.utils.book_append_sheet(wb, ws, 'Kebutuhan'); XL.utils.book_append_sheet(wb, pt, 'Petunjuk'); XL.writeFile(wb, NB.buat('xlsx', 'Template Kebutuhan Proyek'));
  };
  /** Ekspor RAB tersimpan ke format template. */
  KBI.ekspor = function (api, ppbj) {
    var XL = root.XLSX; if (!XL) { root.alert('Pembuat Excel belum termuat. Periksa internet lalu muat ulang halaman.'); return Promise.resolve(); }
    ppbj = String(ppbj || '').trim(); if (!ppbj) { kabar('Isi No PPBJ dulu.', true); return Promise.resolve(); }
    return api({action: 'kbGet', ppbj: ppbj}).then(function (r) {
      if (!r.ok) { kabar(r.msg || 'Gagal.', true); return; }
      if (!r.items || !r.items.length) { kabar('PPBJ ini belum punya RAB tersimpan.', true); return; }
      var baris = r.items.map(function (x, n) { return [n + 1, x.nama, x.kode, x.merk || '', x.spek || '', x.qty, x.satuan || '', x.harga === '' || x.harga == null ? '' : x.harga, x.status || 'STOCK']; });
      var wb = XL.utils.book_new(); XL.utils.book_append_sheet(wb, bukuForm(r.ppbj || ppbj, r.nama || '', r.kategori || '', r.tglButuh || '', baris, XL), 'Kebutuhan');
      XL.writeFile(wb, NB.buat('xlsx', 'RAB PPBJ', r.ppbj || ppbj, r.nama || ''));
    }).catch(function () { kabar('Gagal terhubung ke server.', true); });
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = KBI;
  root.KBI = KBI;
})(typeof window !== 'undefined' ? window : globalThis);
