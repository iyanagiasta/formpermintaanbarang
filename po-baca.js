/* Pembaca PDF "Surat Pembelian (Purchase Order)" cetakan Accurate (Tambahan 51).
   Murni (tidak menyentuh halaman) agar dapat diuji. Masukan: pages = [{w,h,items:[{s,x,y,w,h}]}] dari pdf.js (sama dengan pembaca PDF PPBJ).
   Keluaran: {no, tgl, vendor:{nama,attn,telepon}, lokasi, rows:[{no,nama,spek,ppbj,qty,unit,harga,total,hargaNet}], ringkas:{...}, cek:{ok,pesan,barisSalah,faktor}, warn:[]} atau {err}.
   PEMERIKSA RUMUS: qty x harga = total tiap baris; jumlah baris = Total; Harga Jual - Diskon + PPN + Biaya Lain = Total. Tidak cocok -> cek.ok=false (tidak boleh disimpan). */
(function (root) {
  'use strict';
  var POB = {};
  function angka(v) {
    var s = String(v == null ? '' : v).replace(/Rp\.?/gi, '').replace(/\s+/g, '');
    if (!s) return NaN;
    if (/^-?\d+$/.test(s)) return Number(s);
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) return Number(s.replace(/\./g, '').replace(',', '.'));
    if (/^-?\d+,\d+$/.test(s)) return Number(s.replace(',', '.'));
    if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) return Number(s.replace(/,/g, ''));
    if (/^-?\d+\.\d+$/.test(s)) return Number(s);
    return NaN;
  }
  var BULAN = {januari: 1, februari: 2, pebruari: 2, maret: 3, april: 4, mei: 5, juni: 6, juli: 7, agustus: 8, september: 9, oktober: 10, november: 11, nopember: 11, desember: 12};
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  function tanggal(s) {
    var m = /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/.exec(String(s || '')); if (!m) return '';
    var b = BULAN[m[2].toLowerCase()]; return b ? m[3] + '-' + p2(b) + '-' + p2(Number(m[1])) : '';
  }
  function bulat2(n) { return Math.round(n * 100) / 100; }
  var RE_PPBJ = /\d+\s*\/\s*PB\s*\/\s*[IVX]+\s*\/\s*\d{4}/i;

  function parsePo(pages) {
    var warn = [];
    if (!pages || !pages.length) return {err: 'PDF kosong.'};
    var P = pages.map(function (pg) { return (pg.items || []).filter(function (i) { return String(i.s).trim(); }).map(function (i) { return {s: String(i.s).trim(), x: +i.x, y: +i.y, w: +i.w || 0}; }); });
    var all = [].concat.apply([], P);
    if (!all.some(function (i) { return /PURCHASE ORDER|SURAT PEMBELIAN/i.test(i.s); })) return {err: 'Bukan PDF Surat Pembelian (Purchase Order) dari Accurate: judul "SURAT PEMBELIAN (PURCHASE ORDER)" tidak ditemukan.'};
    var out = {no: '', tgl: '', vendor: {nama: '', attn: '', telepon: ''}, lokasi: '', rows: [], ringkas: {}, cek: null, warn: warn};
    var p0 = P[0];
    function sebaris(list, y, tol) { return list.filter(function (i) { return Math.abs(i.y - y) <= (tol || 3); }).sort(function (a, b) { return a.x - b.x; }); }
    // --- kepala (halaman 1) ---
    var lNo = p0.filter(function (i) { return /^No\.?\s*PO$/i.test(i.s); })[0];
    if (lNo) { var v = sebaris(p0, lNo.y, 4).filter(function (i) { return i.x > lNo.x + 20 && i.s !== ':' && !/^No\.?\s*PO/i.test(i.s); })[0]; if (v) out.no = v.s.replace(/^:\s*/, '').trim(); }
    if (!out.no) { var m = all.map(function (i) { return /No\.?\s*PO\s*:?\s*(\S+)/i.exec(i.s); }).filter(Boolean)[0]; if (m) out.no = m[1]; }
    if (!out.no) return {err: 'No. PO tidak ditemukan di PDF.'};
    var kep = p0.filter(function (i) { return /^Kepada Yth/i.test(i.s); })[0], diT = p0.filter(function (i) { return /^Di Tempat/i.test(i.s); })[0];
    if (kep) {
      var kiri = p0.filter(function (i) { return i.x < 230 && i.y > kep.y + 3 && (!diT || i.y < diT.y - 3); }).sort(function (a, b) { return a.y - b.y || a.x - b.x; });
      out.vendor.nama = kiri.map(function (i) { return i.s; }).join(' ').replace(/\s+/g, ' ').trim();
    }
    var attn = p0.filter(function (i) { return /^Attn$/i.test(i.s) && i.x < 100; })[0], tel = p0.filter(function (i) { return /^Phone$/i.test(i.s) && i.x < 100; })[0];
    if (attn) { var a = sebaris(p0, attn.y, 4).filter(function (i) { return i.x > attn.x + 30 && i.x < 230 && i.s !== ':'; })[0]; if (a) out.vendor.attn = a.s.replace(/^:\s*/, ''); }
    if (tel) { var t = sebaris(p0, tel.y, 4).filter(function (i) { return i.x > tel.x + 30 && i.x < 230 && i.s !== ':'; })[0]; if (t) out.vendor.telepon = t.s.replace(/^:\s*/, ''); }
    if (!out.vendor.nama) warn.push('Nama vendor tidak terbaca; isi manual di pratinjau.');
    var lok = all.map(function (i) { return /gudang\s+([A-Za-z0-9\-]+)/i.exec(i.s); }).filter(Boolean)[0]; if (lok) out.lokasi = lok[1];
    var tgl = all.filter(function (i) { return /^(?:[A-Za-z .]+,\s*)?\d{1,2}\s+[A-Za-z]+\s+\d{4}$/.test(i.s) && tanggal(i.s); }); if (tgl.length) out.tgl = tanggal(tgl[tgl.length - 1].s);
    if (!out.tgl) warn.push('Tanggal PO tidak terbaca; isi manual di pratinjau.');
    // --- kolom tabel ---
    var kol = null;
    P.forEach(function (pg) {
      if (kol) return;
      var q = pg.filter(function (i) { return /^QTY$/i.test(i.s); })[0]; if (!q) return;
      var y = q.y, h = sebaris(pg, y, 4);
      function ambil(re) { var z = h.filter(function (i) { return re.test(i.s); })[0]; return z || null; }
      var u = ambil(/^UNIT$/i), hg = ambil(/^@?HARGA/i), tt = ambil(/^TOTAL/i), no = h.filter(function (i) { return /^NO\b/i.test(i.s); })[0], pp = h.filter(function (i) { return /NO PPBJ$/i.test(i.s) || /^PPBJ$/i.test(i.s); })[0];
      if (u && hg && tt) kol = {qtyR: q.x + q.w, unitC: u.x + u.w / 2, hargaR: hg.x + hg.w, totalR: tt.x + tt.w, nameX: no ? no.x + 20 : 50, ppbjX: pp ? pp.x + pp.w - 56 : 270, y: y};
    });
    if (!kol) return {err: 'Format tabel PO tidak dikenali (judul QTY, UNIT, @HARGA, TOTAL HARGA tidak ditemukan).'};
    // --- baris tiap halaman ---
    var baris = [];
    P.forEach(function (pg, pn) {
      var hd = pg.filter(function (i) { return /^QTY$/i.test(i.s); })[0], y0 = hd ? hd.y + 6 : 0;
      var foot = pg.filter(function (i) { return /^(Syarat Pembayaran|Harga Jual)/i.test(i.s) || (/^Total$/i.test(i.s) && i.x > 340); }).map(function (i) { return i.y; });
      var terb = pg.filter(function (i) { return i.x < 45 && i.y > y0 && !/^\d+$/.test(i.s); }).map(function (i) { return i.y; });
      var yAkhir = Math.min.apply(null, foot.concat(terb).concat([1e9])) - 1;
      var awal = pg.filter(function (i) { return i.x < 45 && /^\d{1,4}$/.test(i.s) && i.y > y0 && i.y < yAkhir; }).sort(function (a, b) { return a.y - b.y; });
      awal.forEach(function (n, k) {
        var yB = k + 1 < awal.length ? awal[k + 1].y - 2 : yAkhir;
        var cells = pg.filter(function (i) { return i !== n && i.y >= n.y - 3 && i.y < yB; });
        var r = {no: Number(n.s), nama: '', ppbj: '', qty: NaN, unit: '', harga: NaN, total: NaN}, namaBag = [];
        cells.forEach(function (i) {
          var kanan = i.x + i.w, utama = Math.abs(i.y - n.y) <= 3;
          if (utama && RE_PPBJ.test(i.s)) { r.ppbj = RE_PPBJ.exec(i.s)[0].replace(/\s+/g, ''); return; }
          if (utama && !isNaN(angka(i.s))) {
            if (Math.abs(kanan - kol.qtyR) <= 8) { r.qty = angka(i.s); return; }
            if (Math.abs(kanan - kol.totalR) <= 8) { r.total = angka(i.s); return; }
            if (Math.abs(kanan - kol.hargaR) <= 8) { r.harga = angka(i.s); return; }
          }
          if (utama && Math.abs(i.x + i.w / 2 - kol.unitC) <= 22 && i.x > kol.qtyR + 3 && i.x < kol.hargaR - 40) { r.unit = i.s; return; }
          namaBag.push(i);
        });
        // nama + lanjutan baris yang pecah (urut y lalu x); kolom spesifikasi tidak dipakai
        namaBag.sort(function (a, b) { return a.y - b.y || a.x - b.x; });
        r.nama = namaBag.map(function (i) { return i.s; }).join(' ').replace(/\s+/g, ' ').trim();
        r.hal = pn + 1; baris.push(r);
      });
    });
    out.rows = baris;
    if (!baris.length) return {err: 'Tidak ada baris barang yang terbaca di tabel PO.'};
    // --- ringkasan ---
    var R = {hargaJual: NaN, diskon: NaN, ppn: NaN, pph: NaN, biayaLain: NaN, totalBaris: NaN, total: NaN};
    var lp = P[P.length - 1];
    function nilaiDi(lab) { var v = sebaris(lp, lab.y, 3).filter(function (i) { return i.x > lab.x + 30 && !isNaN(angka(i.s)); })[0]; return v ? angka(v.s) : NaN; }
    var totals = lp.filter(function (i) { return /^Total$/i.test(i.s) && i.x > 340; }).sort(function (a, b) { return a.y - b.y; });
    if (totals.length) { R.totalBaris = nilaiDi(totals[0]); R.total = nilaiDi(totals[totals.length - 1]); }
    [['hargaJual', /^Harga Jual$/i], ['diskon', /^Diskon$/i], ['ppn', /^PPN/i], ['pph', /^PPh/i], ['biayaLain', /^Biaya Lain/i]].forEach(function (a) { var l = lp.filter(function (i) { return a[1].test(i.s) && i.x > 340; })[0]; if (l) R[a[0]] = nilaiDi(l); });
    out.ringkas = R;
    // --- PEMERIKSA RUMUS ---
    var pesan = [], salah = [], jml = 0, tot = function (z) { return isNaN(z) ? 0 : z; };
    baris.forEach(function (r) {
      if (isNaN(r.qty) || isNaN(r.harga) || isNaN(r.total) || !(r.qty > 0)) { salah.push(r.no); pesan.push('Baris ' + r.no + ': qty/harga/total tidak terbaca utuh.'); return; }
      if (Math.abs(r.qty * r.harga - r.total) > 1.01 + r.qty) {   /* harga satuan dibulatkan ke rupiah penuh di PDF Accurate: selisih sampai 1 rupiah per satuan wajar */
         salah.push(r.no); pesan.push('Baris ' + r.no + ': qty x harga (' + Math.round(r.qty * r.harga) + ') tidak sama dengan total (' + r.total + ').'); }
      if (!r.nama) { salah.push(r.no); pesan.push('Baris ' + r.no + ': nama barang kosong.'); }
      jml += r.total;
    });
    if (isNaN(R.total)) pesan.push('Total PO di ringkasan tidak terbaca.');
    else {
      if (Math.abs(jml - (isNaN(R.totalBaris) ? R.total : R.totalBaris)) > 1.01) pesan.push('Jumlah total semua baris (' + Math.round(jml) + ') tidak sama dengan Total di PDF (' + (isNaN(R.totalBaris) ? R.total : R.totalBaris) + '). Mungkin ada baris yang tidak terbaca.');
      if (!isNaN(R.hargaJual)) {
        var h = R.hargaJual - tot(R.diskon) + tot(R.ppn) + tot(R.biayaLain);
        if (isNaN(R.pph) || R.pph === 0) { if (Math.abs(h - R.total) > 1.01) pesan.push('Harga Jual - Diskon + PPN + Biaya Lain (' + Math.round(h) + ') tidak sama dengan Total (' + R.total + ').'); }
        else warn.push('Ada PPh di ringkasan; pemeriksaan Harga Jual + PPN dilewati.');
      } else warn.push('Harga Jual tidak terbaca; harga sebelum PPN tidak bisa dihitung.');
    }
    // harga sebelum PPN: netto / (netto + PPN)
    var faktor = 1;
    if (!isNaN(R.hargaJual) && R.ppn > 0) { var net = R.hargaJual - tot(R.diskon); if (net > 0) faktor = net / (net + R.ppn); }
    baris.forEach(function (r) { r.hargaNet = isNaN(r.harga) ? NaN : bulat2(r.harga * faktor); });
    out.cek = {ok: !pesan.length && !salah.length, pesan: pesan, barisSalah: salah.filter(function (v, i, a) { return a.indexOf(v) === i; }), faktor: faktor, jumlah: jml};
    return out;
  }
  POB.parsePo = parsePo; POB.angka = angka; POB.tanggal = tanggal;
  /** Dari file PDF (butuh kb-impor.js: KBI.muatPdfjs / KBI.bacaBuf / KBI._pdfKeHalaman). Mengembalikan Promise<hasil parsePo>. */
  POB.bacaFile = function (file) {
    var K = root.KBI; if (!K) return Promise.reject(new Error('Pembaca PDF belum dimuat (kb-impor.js).'));
    return K.bacaBuf(file).then(function (buf) { return K.muatPdfjs().then(function (L) { return K._pdfKeHalaman(L, buf); }); }).then(function (pages) { var d = parsePo(pages); d.file = file.name; return d; });
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = POB;
  root.POB = POB;
})(typeof window !== 'undefined' ? window : globalThis);
