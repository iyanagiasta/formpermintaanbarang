/* Pembuat PDF Bukti Pengambilan Barang / Bukti Pengembalian untuk diunggah ke Accurate, plus pembuat ZIP sederhana.
   Dipakai admin.html (tab Accurate). Bergantung pada pustaka pdf-lib (window.PDFLib). */
(function (W) {
  "use strict";
  function asc(s) { return String(s == null ? "" : s).replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/[\r\n\t]+/g, " ").replace(/[^\x20-\x7E¡-ÿ]/g, "?"); }
  function fmtN(n) { n = Number(n); if (!isFinite(n)) return String(n == null ? "" : n); return (Math.round(n * 1000) / 1000).toString().replace(".", ","); }
  function tglId(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ""); if (!m) return iso || ""; return m[3] + "/" + m[2] + "/" + m[1]; }
  function bungkus(font, size, text, maxW) {
    var ws = asc(text).split(/\s+/).filter(Boolean), lines = [], cur = "";
    ws.forEach(function (w) {
      while (font.widthOfTextAtSize(w, size) > maxW) { var k = w.length; while (k > 1 && font.widthOfTextAtSize(w.slice(0, k), size) > maxW) k--; if (cur) { lines.push(cur); cur = ""; } lines.push(w.slice(0, k)); w = w.slice(k); }
      var t = cur ? cur + " " + w : w; if (font.widthOfTextAtSize(t, size) <= maxW) cur = t; else { lines.push(cur); cur = w; }
    });
    if (cur) lines.push(cur); return lines.length ? lines : [""];
  }
  function hex(h) { var n = parseInt(h.replace("#", ""), 16); return W.PDFLib.rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255); }

  /* Menggambar satu dokumen mengikuti desain lembar form (index.html / pengembalian.html + lembar.css + form-baru.css).
     Ukuran: A5 landscape bila isi pendek; A4 portrait bila panjang (diperkecil bila lebih dari 297 mm), sama seperti tombol Simpan PDF di form.
     d = payload dokumen dari server (adminPaBukti), sig = {kunci: dataURL}, fonts = {F, FB, FT} */
  async function gambarDokumen(doc, d, sig, fonts) {
    var L = W.PDFLib, rgb = L.rgb, F = fonts.F, FB = fonts.FB, kembali = d.jenis === "Pengembalian", ganti = d.jenis === "Pengganti";
    var MM = 72 / 25.4, SW = 210, X0 = 8, CW = SW - 2 * X0;
    var NAVY = hex("#17588f"), BLUE = hex("#1f6fae"), RULE = hex("#7f97a6"), SOFT = hex("#d5dee4"), INK = hex("#0d1f2d"), LAB = hex("#3f5868"), MUT = hex("#5b6b75"), TT = hex("#62788a"), ST = hex("#4a5f6e");
    var page = null, K = 1, PH = 0, draw = false;
    // ---- data
    var ppbj = d.ppbj || "-", pic = (d.pic && d.pic.nama) || "";
    var meta = ganti
      ? [["Nama Pemohon (PIC)", d.by], ["Nama Departemen", d.dept], ["Nomor IA Accurate", d.noIa], ["Tanggal IA", tglId(d.tgl)], ["Nomor Dokumen", d.doc], ["Nomor PPBJ", ppbj]]
      : kembali
      ? [["Nama Pengembali", d.by], ["Nama Departemen", d.dept], ["PIC (Penanggung Jawab)", pic], ["Tanggal", tglId(d.tgl)], ["Nomor Dokumen", d.doc], ["Sisa dari Proyek (No PPBJ / nama proyek)", ppbj]]
      : [["Nama Pemohon", d.by], ["Nama Departemen", d.dept], ["PIC (User Peminta)", pic], ["Tanggal", tglId(d.tgl)], ["Nomor Dokumen", d.doc], ["Nomor PPBJ", ppbj]];
    var judul = ganti ? "BPB PENGGANTI (REKONSTRUKSI DARI IA ACCURATE)" : kembali ? "BUKTI PENGEMBALIAN BARANG SISA PROYEK" : "BUKTI PENGAMBILAN BARANG";
    var cols = kembali ? [9, 26, 0, 16, 15, 17] : [9, 30, 0, 20, 17];
    var hd = kembali ? ["No", "Kode Barang", "Nama Barang", "Satuan", "Jumlah", "Diterima"] : ["No", "Kode Barang", "Nama Barang", "Satuan", "Jumlah"];
    cols[2] = CW - cols.reduce(function (a, b) { return a + b; }, 0);
    var catLines = (d.cat || []).map(function (c) { return typeof c === "string" ? c : (c.peran || "") + (c.nama ? " (" + c.nama + (c.waktu ? ", " + c.waktu : "") + ")" : "") + ": " + (c.teks || c.cat || c.catatan || ""); });
    var roles = [[kembali ? "PIC" : "User Peminta (PIC)", "pic"], ["Atasan Langsung", "atasan"], ["Staff Gudang", "staff"], ["Manager Gudang", "manager"]];
    var imgs = {};
    for (var ri = 0; ri < roles.length; ri++) {
      var a0 = d[roles[ri][1]] || {};
      if (a0.nama && a0.waktu && a0.k && sig && sig[a0.k] && !a0.otomatis && d.tolak !== roles[ri][1]) {
        try { var s0 = sig[a0.k]; imgs[roles[ri][1]] = /^data:image\/png/.test(s0) ? await doc.embedPng(s0) : await doc.embedJpg(s0); } catch (e) { }
      }
    }
    // ---- primitif (semua ukuran dalam mm / pt di ruang tanpa skala; K = skala akhir)
    function Y(mm) { return PH - mm * MM * K; }
    function lebar(font, size, s, sp) { return font.widthOfTextAtSize(s, size) + (sp ? sp * Math.max(0, s.length - 1) : 0); }   // pt tanpa skala
    function T(s, x, base, size, font, color, o) {
      if (!draw) return; o = o || {}; s = asc(s); if (!s) return;
      var sp = o.sp || 0, w = lebar(font, size, s, sp) / MM, px = x;
      if (o.al === "c") px = x + (o.w - w) / 2; else if (o.al === "r") px = x + o.w - w;
      if (!sp) { page.drawText(s, { x: px * MM * K, y: Y(base), size: size * K, font: font, color: color }); return; }
      var cx = px * MM;
      for (var i = 0; i < s.length; i++) { var ch = s.charAt(i); page.drawText(ch, { x: cx * K, y: Y(base), size: size * K, font: font, color: color }); cx += font.widthOfTextAtSize(ch, size) + sp; }
    }
    function R(x, y, w, h, fill, border, bw) {
      if (!draw) return; var o = { x: x * MM * K, y: Y(y + h), width: w * MM * K, height: h * MM * K };
      if (fill) o.color = fill; if (border) { o.borderColor = border; o.borderWidth = (bw || .25) * MM * K; } page.drawRectangle(o);
    }
    function G(x1, y1, x2, y2, bw, color) { if (draw) page.drawLine({ start: { x: x1 * MM * K, y: Y(y1) }, end: { x: x2 * MM * K, y: Y(y2) }, thickness: bw * MM * K, color: color }); }
    function wrap(font, size, s, wmm) { return bungkus(font, size, s, wmm * MM); }
    function mid(y0, h, size) { return y0 + h / 2 + 0.36 * size / MM; }   // garis dasar teks yang diratakan vertikal
    // ---- tata letak (draw=false: hanya mengukur)
    function layout() {
      var y;
      if (draw) {
        // logo tetes
        if (fonts.logo) { var lg = fonts.logo, sc = Math.min(13.5 / (lg.width / MM), 13.5 / (lg.height / MM)) / 1, lw = lg.width / MM * sc, lh = lg.height / MM * sc;
          page.drawImage(lg, { x: (8 + (13.5 - lw) / 2) * MM * K, y: Y(3.2 + (13.5 + lh) / 2), width: lw * MM * K, height: lh * MM * K }); }
        else page.drawSvgPath("M12 3s6 6.2 6 10.5A6 6 0 0 1 6 13.5C6 9.2 12 3 12 3z", { x: (8 + 0) * MM * K, y: Y(3.2), scale: (13.5 / 24) * MM * K, borderColor: hex("#1a6cab"), borderWidth: 1.6, borderLineCap: L.LineCapStyle.Round });
        // nama perusahaan + garis ganda
        T("PT SARANA CATUR TIRTA KELOLA", 24, 4 + 3.69 * .78, 9.5, FB, NAVY, { sp: .6 });
        R(24, 9.29, SW - 8 - 24, .55, BLUE); R(24, 10.39, SW - 8 - 24, .2, BLUE);
        // label kanan
        var w2 = lebar(F, 6.4, "Bukti resmi", .3) / MM, w1 = lebar(FB, 7.4, "FORM GUDANG", .3) / MM;
        T("Bukti resmi", SW - 8 - w2, 4.6 + 3.1, 6.4, F, hex("#1b6ca8"), { sp: .3 });
        T("FORM GUDANG", SW - 8 - w2 - 1.6 - w1, 4.6 + 3.1, 7.4, FB, hex("#0c3b57"), { sp: .3 });
        T(judul, X0, 12.44 + 4.67 / 2 + .36 * 11.5 / MM, 11.5, FB, INK, { sp: 1.2, al: "c", w: CW });
      }
      y = 19.1;
      // data pemohon: 3 kolom x 2 baris
      var cw = (CW - 2 * 4) / 3;
      meta.forEach(function (m, i) {
        var col = i % 3, row = Math.floor(i / 3), x = X0 + col * (cw + 4), yy = y + row * (2.8 + 5.4 + 1.5);
        T(m[0].toUpperCase(), x, yy + 1.4 + .36 * 6.1 / MM, 6.1, FB, LAB, { sp: .375 });
        var v = wrap(FB, 8.5, m[1] || "", cw - 1.2)[0];
        T(v, x + .6, mid(yy + 2.8, 5.4, 8.5), 8.5, FB, INK);
        G(x, yy + 2.8 + 5.4 - .15, x + cw, yy + 2.8 + 5.4 - .15, .3, RULE);
      });
      y += 2 * (2.8 + 5.4) + 1.5 + 2.5;
      // tabel
      var ty = y;
      R(X0, ty, CW, .45, NAVY);
      R(X0, ty + .45, CW, 5.6, BLUE);
      var x = X0; hd.forEach(function (h, i) { T(h.toUpperCase(), x, mid(ty + .45, 5.6, 6.6), 6.6, FB, rgb(1, 1, 1), { sp: .375, al: i === 2 ? "c" : "c", w: cols[i] }); x += cols[i]; });
      y = ty + .45 + 5.6;
      var items = (d.items || []).slice(); while (items.length < 5) items.push(null);
      items.forEach(function (it, k) {
        var nm = it ? wrap(F, 8.5, it.nama || "", cols[2] - 3) : [""], h = Math.max(5.4, nm.length * 3.75 + 1.6), xx = X0;
        G(X0, y, X0 + CW, y, .15, SOFT);
        cols.forEach(function (c, i) { if (i > 0) G(xx, y, xx, y + h, .15, SOFT); xx += c; });
        if (it) {
          xx = X0; var base = mid(y, 5.4, 8.5);
          var vals = [String(k + 1), it.kode, null, it.satuan, fmtN(it.jumlah)]; if (kembali) vals.push(it.diterima === "" || it.diterima == null ? "-" : fmtN(it.diterima));
          vals.forEach(function (v, i) {
            if (i === 2) nm.forEach(function (ln, j) { T(ln, xx + 1.5, base + j * 3.75, 8.5, F, INK); });
            else { var s = asc(v); while (s.length > 1 && lebar(F, 8.5, s) / MM > cols[i] - 2) s = s.slice(0, -1); T(s, xx + (i === 1 ? 1.5 : 0), base, 8.5, F, INK, i === 1 ? {} : { al: "c", w: cols[i] }); }
            xx += cols[i];
          });
        } else { T(String(k + 1), X0, mid(y, 5.4, 8.5), 8.5, F, INK, { al: "c", w: cols[0] }); }
        y += h;
      });
      R(X0, y, CW, .45, NAVY); y += .45;
      // alasan dan catatan
      function kotakTeks(label, lines) {
        y += 2.2; T(label.toUpperCase(), X0, y + 1.4 + .36 * 6.1 / MM, 6.1, FB, LAB, { sp: .375 }); y += 2.8;
        var ls = []; lines.forEach(function (t) { wrap(F, 8.5, t, CW - 1.2).forEach(function (z) { ls.push(z); }); });
        var h = Math.max(9.9, ls.length * 3.9 + 1.9);
        ls.forEach(function (z, j) { T(z, X0 + .6, y + .8 + 1.95 + j * 3.9 + .36 * 8.5 / MM, 8.5, F, INK); });
        G(X0, y + h - .15, X0 + CW, y + h - .15, .3, RULE); y += h;
      }
      kotakTeks(ganti ? "Keterangan" : kembali ? "Keterangan (sisa proyek apa, kondisi barang)" : "Alasan Permintaan", [d.alasan || ""]);
      if (catLines.length) kotakTeks("Catatan", catLines);
      // tanda tangan
      var sh = 4.9 + 11 + 8.5 + .5, selesai = y;
      return {akhir: selesai, signH: sh};
    }
    function tanda(sy) {
      var bw = (CW - 3 * 3) / 4;
      roles.forEach(function (r, i) {
        var a = d[r[1]] || {}, x = X0 + i * (bw + 3), tolak = d.tolak === r[1], ada = a.nama && a.waktu;
        R(x, sy, bw, 4.9 + 11 + 8.5 + .5, null, RULE, .25);
        R(x, sy, bw, 4.9, BLUE, RULE, .25);
        T(r[0].toUpperCase(), x, mid(sy, 4.9, 6.6), 6.6, FB, rgb(1, 1, 1), { sp: .45, al: "c", w: bw });
        var cap = ada ? ((tolak ? (ganti ? "Ditolak digital " : "Ditolak via email ") : (ganti ? "Disetujui digital " : a.otomatis ? "Disetujui " : "Disetujui via email ")) + a.waktu) : (i === 0 && d.kirim && !ganti ? "Diajukan via form " + d.kirim : "");
        var im = imgs[r[1]];
        if (draw && im) { var sc = Math.min((bw * .88) / (im.width / MM * 1), 8 / (im.height / MM * 1)); sc = Math.min(bw * .88 * MM / im.width, 8 * MM / im.height);
          page.drawImage(im, { x: (x + (bw - im.width * sc / MM) / 2) * MM * K, y: Y(sy + 4.9 + .6 + im.height * sc / MM), width: im.width * sc * K, height: im.height * sc * K }); }
        if (cap) T(cap, x, sy + 4.9 + 11 - .5 - .2, 5, F, ST, { al: "c", w: bw });
        if (!cap && !im) T("Tanda tangan", x, sy + 4.9 + 11 - .6 - .2, 5.5, F, TT, { al: "c", w: bw });
        G(x, sy + 4.9 + 11, x + bw, sy + 4.9 + 11, .15, SOFT);
        T("Nama", x, sy + 4.9 + 11 + 2.7, 5.8, F, MUT, { al: "c", w: bw });
        var nmx = a.nama || (i === 0 ? d.by : ""), nl = wrap(FB, 8.5, nmx || "", bw - 3)[0];
        T(nl, x, sy + 4.9 + 11 + 6.2, 8.5, FB, INK, { al: "c", w: bw });
      });
    }
    // 1) ukur, 2) pilih ukuran kertas, 3) gambar
    var m1 = layout(), H = m1.akhir + 2.5 + m1.signH + 6, pw, ph, sy;
    if (H <= 148.8) { pw = 210; ph = 148; K = 1; sy = 148 - 6 - m1.signH; }
    else if (H <= 297) { pw = 210; ph = 297; K = 1; sy = m1.akhir + 2.5; }
    else { pw = 210; ph = 297; K = 297 / H; sy = m1.akhir + 2.5; }
    page = doc.addPage([pw * MM, ph * MM]); PH = ph * MM; draw = true;
    layout(); tanda(sy);
    var by = sy + m1.signH + 1.2;
    if (ganti) T("Dokumen pengganti (dibuat ulang " + (d.dibuat || "") + "). Tanggal tanda tangan = tanggal persetujuan digital, bukan tanggal IA.", X0, by + 2, 6.5, F, hex("#17588f"));
    if (kembali && d.terima && d.terima.nama) T("Barang diterima gudang oleh " + d.terima.nama + (d.terima.waktu ? " pada " + d.terima.waktu : "") + ".", X0, by + 2, 7, F, hex("#17588f"));
    if (d.status === "Ditolak") {
      var cx = SW / 2, cy = ph / 2 - 10;
      page.drawText("DITOLAK", { x: (cx - 38) * MM * K, y: Y(cy), size: 36 * K, font: FB, color: rgb(.75, .22, .17), rotate: L.degrees(16), opacity: .8 });
    }
  }

  /* Logo perusahaan: logo.png di folder yang sama dengan halaman (file yang sama dipakai form). Bila tidak ada, dipakai ikon tetes. */
  var LOGO_CACHE = null;
  async function muatLogo(doc) {
    if (LOGO_CACHE === null) {
      LOGO_CACHE = false;
      try {
        var r = await fetch("logo.png?v=" + Date.now().toString(36).slice(0, 6), { cache: "no-cache" });
        if (r.ok) { var b = new Uint8Array(await r.arrayBuffer()); if (b.length > 100 && b.length < 3e6) LOGO_CACHE = b; }
      } catch (e) { }
    }
    if (!LOGO_CACHE) return null;
    var b0 = LOGO_CACHE, png = b0[0] === 0x89 && b0[1] === 0x50, jpg = b0[0] === 0xff && b0[1] === 0xd8;
    if (!png && !jpg) return null;
    return png ? await doc.embedPng(b0) : await doc.embedJpg(b0);
  }

  async function fonts(doc) { var L = W.PDFLib; return { F: await doc.embedFont(L.StandardFonts.Helvetica), FB: await doc.embedFont(L.StandardFonts.HelveticaBold), FT: await doc.embedFont(L.StandardFonts.TimesRomanBold) }; }

  /* docs: [{key,jenis,doc,d}] dari adminPaBukti. Hasil: Uint8Array berisi semua dokumen berurutan dalam satu PDF. */
  async function buatGabungan(docs, sig, onProgress) {
    var L = W.PDFLib, doc = await L.PDFDocument.create(), fn = await fonts(doc);
    try { fn.logo = await muatLogo(doc); } catch (e) { fn.logo = null; }
    doc.setTitle("Bukti Accurate"); doc.setCreator("Gudang SCTK");
    for (var i = 0; i < docs.length; i++) { if (onProgress) onProgress(i + 1, docs.length); await gambarDokumen(doc, docs[i].d, sig, fn); }
    return await doc.save();
  }
  async function buatSatu(item, sig) { return buatGabungan([item], sig); }

  /* ZIP tanpa kompresi (cukup untuk PDF). files: [{name, bytes:Uint8Array}] -> Uint8Array */
  var CRC = null;
  function crc32(b) { if (!CRC) { CRC = new Uint32Array(256); for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; CRC[n] = c >>> 0; } } var c2 = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) c2 = CRC[(c2 ^ b[i]) & 255] ^ (c2 >>> 8); return (c2 ^ 0xFFFFFFFF) >>> 0; }
  function buatZip(files) {
    var enc = new TextEncoder(), parts = [], cen = [], off = 0, now = new Date();
    var dt = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xFFFF, dd = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xFFFF;
    var pakai = {};
    files.forEach(function (f) {
      var nama = String(f.name).replace(/[\\\/:*?"<>|]+/g, "-"); if (pakai[nama]) { var p = nama.lastIndexOf("."); nama = nama.slice(0, p) + "-" + (++pakai[nama]) + nama.slice(p); } else pakai[nama] = 1;
      var nb = enc.encode(nama), crc = crc32(f.bytes), sz = f.bytes.length;
      var lh = new DataView(new ArrayBuffer(30)); lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true); lh.setUint16(10, dt, true); lh.setUint16(12, dd, true); lh.setUint32(14, crc, true); lh.setUint32(18, sz, true); lh.setUint32(22, sz, true); lh.setUint16(26, nb.length, true); lh.setUint16(28, 0, true);
      parts.push(new Uint8Array(lh.buffer), nb, f.bytes);
      var ch = new DataView(new ArrayBuffer(46)); ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true); ch.setUint16(12, dt, true); ch.setUint16(14, dd, true); ch.setUint32(16, crc, true); ch.setUint32(20, sz, true); ch.setUint32(24, sz, true); ch.setUint16(28, nb.length, true); ch.setUint32(42, off, true);
      cen.push(new Uint8Array(ch.buffer), nb); off += 30 + nb.length + sz;
    });
    var csz = 0; cen.forEach(function (c) { csz += c.length; });
    var end = new DataView(new ArrayBuffer(22)); end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, csz, true); end.setUint32(16, off, true);
    var all = parts.concat(cen, [new Uint8Array(end.buffer)]), tot = 0; all.forEach(function (p) { tot += p.length; });
    var out = new Uint8Array(tot), pos = 0; all.forEach(function (p) { out.set(p, pos); pos += p.length; }); return out;
  }
  /* Surat jalan penerimaan: satu foto per halaman (A4, diskalakan muat), file PDF disisipkan halaman demi halaman. Keterangan kecil di atas: nomor penerimaan, proyek, urutan.
     docs: [{doc, proyek, files:[{nama,mime,data(base64)}]}]. Hasil: {bytes, halaman, dilewati:[teks]}. */
  function b64Bytes(s) { var bin = atob(String(s || "")), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
  async function buatSuratJalan(docs, onProgress) {
    var L = W.PDFLib, out = await L.PDFDocument.create(), F = await out.embedFont(L.StandardFonts.Helvetica), hal = 0, lewat = [];
    out.setTitle("Surat jalan penerimaan"); out.setCreator("Gudang SCTK");
    for (var i = 0; i < docs.length; i++) {
      var d = docs[i], fl = d.files || [], cap0 = asc(d.doc + (d.proyek ? " - " + d.proyek : ""));
      if (onProgress) onProgress(i + 1, docs.length);
      for (var j = 0; j < fl.length; j++) {
        var f = fl[j], cap = cap0.slice(0, 110) + "  (" + (j + 1) + "/" + fl.length + ")";
        try {
          var by = b64Bytes(f.data);
          if (f.mime === "application/pdf") {
            var src = await L.PDFDocument.load(by, { ignoreEncryption: true }), idx = src.getPageIndices(), pgs = await out.copyPages(src, idx);
            pgs.forEach(function (p, n) { out.addPage(p); var sz = p.getSize(); p.drawText(cap + (idx.length > 1 ? " hal " + (n + 1) : ""), { x: 14, y: sz.height - 12, size: 7, font: F, color: L.rgb(.35, .35, .35) }); hal++; });
          } else {
            var im = f.mime === "image/png" ? await out.embedPng(by) : (f.mime === "image/jpeg" ? await out.embedJpg(by) : null);
            if (!im) { lewat.push(d.doc + ": " + (f.nama || "file") + " (format " + f.mime + " tidak bisa dibuat PDF)"); continue; }
            var PW = 595.28, PH = 841.89, M = 28, top = 22, bw = PW - 2 * M, bh = PH - M - top - 8, sc = Math.min(bw / im.width, bh / im.height, 1.6), w = im.width * sc, h = im.height * sc;
            var pg = out.addPage([PW, PH]); pg.drawText(cap, { x: M, y: PH - 16, size: 7, font: F, color: L.rgb(.35, .35, .35) });
            pg.drawImage(im, { x: (PW - w) / 2, y: PH - top - 8 - h, width: w, height: h }); hal++;
          }
        } catch (e) { lewat.push(d.doc + ": " + (f.nama || "file") + " tidak terbaca (" + (e && e.message ? e.message : "rusak") + ")"); }
      }
    }
    if (!hal) return { bytes: null, halaman: 0, dilewati: lewat };
    return { bytes: await out.save(), halaman: hal, dilewati: lewat };
  }
  W.BuktiPdf = { buatGabungan: buatGabungan, buatSatu: buatSatu, buatZip: buatZip, asc: asc, buatSuratJalan: buatSuratJalan };
})(window);
