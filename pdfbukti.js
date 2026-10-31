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

  /* Menggambar satu dokumen (mulai halaman baru) ke dalam PDFDocument yang sudah ada.
     d = payload dokumen dari server (adminPaBukti), sig = {kunci: dataURL}, fonts = {F, FB, FT} */
  async function gambarDokumen(doc, d, sig, fonts) {
    var L = W.PDFLib, rgb = L.rgb, F = fonts.F, FB = fonts.FB, FT = fonts.FT, kembali = d.jenis === "Pengembalian";
    var PW = 595.28, PH = 841.89, M = 34, CW = PW - 2 * M, page, y;
    var NAVY = hex("#17588f"), GOLD = hex("#b8975a"), PALE = hex("#eef6fa"), BORD = hex("#9fb8c6"), INK = hex("#0d1f2d"), MUT = hex("#5b6b75"), ALT = hex("#f5fafc");
    function kotak(x, yy, w, h, o) { page.drawRectangle(Object.assign({ x: x, y: yy, width: w, height: h, borderColor: BORD, borderWidth: .6 }, o || {})); }
    function teks(t, x, yy, size, font, color, o) { page.drawText(asc(t), Object.assign({ x: x, y: yy, size: size, font: font || F, color: color || INK }, o || {})); }
    function mulai() {
      page = doc.addPage([PW, PH]); var bh = 56, n = 70, c0 = [6, 32, 58], c1 = [10, 58, 92], c2 = [15, 111, 147];
      for (var i = 0; i < n; i++) {
        var t = i / (n - 1), a = t < .55 ? c0 : c1, b = t < .55 ? c1 : c2, u = t < .55 ? t / .55 : (t - .55) / .45;
        page.drawRectangle({ x: i * PW / n, y: PH - bh, width: PW / n + 1, height: bh, color: rgb((a[0] + (b[0] - a[0]) * u) / 255, (a[1] + (b[1] - a[1]) * u) / 255, (a[2] + (b[2] - a[2]) * u) / 255) });
      }
      page.drawRectangle({ x: 0, y: PH - bh - 3.4, width: PW, height: 3.4, color: GOLD });
      var t1 = kembali ? "BUKTI PENGEMBALIAN BARANG SISA PROYEK" : "BUKTI PENGAMBILAN BARANG", w1 = FT.widthOfTextAtSize(t1, 16);
      teks(t1, (PW - w1) / 2, PH - 27, 16, FT, rgb(1, 1, 1));
      var t2 = "PT SARANA CATUR TIRTA KELOLA", w2 = FB.widthOfTextAtSize(t2, 8); teks(t2, (PW - w2) / 2, PH - 42, 8, FB, hex("#e3c98f"));
      y = PH - bh - 3.4 - 14;
    }
    mulai();
    // 6 kolom keterangan (2 kolom x 3 baris)
    var f = d.items ? d : d, ppbj = d.ppbj && !/^belum tersedia$/i.test(d.ppbj) ? d.ppbj : (d.ppbj || "-");
    var meta = [["Nama Pemohon", d.by], ["Nama Departemen", d.dept], ["PIC (User Peminta)", (d.pic && d.pic.nama) || ""], ["Tanggal", tglId(d.tgl)], ["Nomor Dokumen", d.doc], ["Nomor PPBJ", ppbj]];
    var cw = (CW - 8) / 2, rh = 30;
    meta.forEach(function (m, i) {
      var col = i % 2, row = Math.floor(i / 2), x = M + col * (cw + 8), yy = y - row * (rh + 5) - rh;
      kotak(x, yy, cw, rh, { color: PALE });
      teks(m[0], x + 7, yy + rh - 11, 7, FB, MUT); teks(bungkus(F, 10.5, m[1] || "-", cw - 14)[0], x + 7, yy + 7, 10.5, F, INK);
    });
    y -= 3 * (rh + 5) + 6;
    // tabel
    var cols = kembali ? [26, 78, 0, 46, 54, 66] : [26, 86, 0, 52, 56], hd = kembali ? ["No", "Kode Barang", "Nama Barang", "Satuan", "Jumlah", "Diterima"] : ["No", "Kode Barang", "Nama Barang", "Satuan", "Jumlah"];
    var fixed = cols.reduce(function (a, b) { return a + b; }, 0); cols[2] = CW - fixed;
    function kepalaTabel() {
      var x = M; kotak(M, y - 20, CW, 20, { color: NAVY, borderColor: NAVY });
      hd.forEach(function (h, i) { var tw = FB.widthOfTextAtSize(h, 8.5), tx = i === 2 ? x + 6 : x + (cols[i] - tw) / 2; teks(h, tx, y - 13.5, 8.5, FB, rgb(1, 1, 1)); x += cols[i]; });
      y -= 20;
    }
    kepalaTabel();
    var items = (d.items || []).slice(), min = 5, idx = 0, tinggiSisa = 300;
    while (items.length < min) items.push(null);
    for (var k = 0; k < items.length; k++) {
      var it = items[k], nm = bungkus(F, 9, it ? it.nama : "", cols[2] - 12), h = Math.max(20, nm.length * 11 + 8);
      if (y - h < M + 250) { mulai(); kepalaTabel(); }
      kotak(M, y - h, CW, h, { color: k % 2 ? ALT : rgb(1, 1, 1) });
      var x = M;
      cols.forEach(function (c, i) { if (i > 0) page.drawLine({ start: { x: x, y: y }, end: { x: x, y: y - h }, thickness: .5, color: BORD }); x += c; });
      if (it) {
        idx++; x = M;
        var vals = kembali ? [String(idx), it.kode, null, it.satuan, fmtN(it.jumlah), it.diterima === "" || it.diterima == null ? "-" : fmtN(it.diterima)] : [String(idx), it.kode, null, it.satuan, fmtN(it.jumlah)];
        vals.forEach(function (v, i) {
          if (i === 2) nm.forEach(function (ln, j) { teks(ln, x + 6, y - 13 - j * 11, 9, F); });
          else { var s = asc(v); while (s.length > 1 && F.widthOfTextAtSize(s, 9) > cols[i] - 6) s = s.slice(0, -1); var tw = F.widthOfTextAtSize(s, 9); teks(s, i === 1 ? x + 5 : x + (cols[i] - tw) / 2, y - 13, 9, F); }
          x += cols[i];
        });
      }
      y -= h;
    }
    y -= 10;
    // alasan & catatan
    function kotakTeks(judul, isi, min) {
      var ln = bungkus(F, 9, isi || "-", CW - 16), h = Math.max(min, ln.length * 11 + 24);
      if (y - h < M + 150) { mulai(); }
      kotak(M, y - h, CW, h); teks(judul, M + 8, y - 12, 7.5, FB, MUT);
      ln.forEach(function (l, j) { teks(l, M + 8, y - 25 - j * 11, 9, F); }); y -= h + 6;
    }
    kotakTeks(kembali ? "Alasan / Keterangan Pengembalian" : "Alasan Permintaan", d.alasan, 38);
    var cats = (d.cat || []).map(function (c) { return typeof c === "string" ? c : [c.oleh || c.nama || c.peran, c.teks || c.cat || c.catatan].filter(Boolean).join(": "); }).filter(Boolean).join(" | ");
    if (cats) kotakTeks("Catatan", cats, 30);
    // tanda tangan
    var roles = [["User Peminta (PIC)", "PIC", "pic"], ["Atasan Langsung", "Atasan", "atasan"], ["Staff Gudang", "Staff Gudang", "staff"], ["Manager Gudang", "Manager Gudang", "manager"]];
    var bw = (CW - 3 * 6) / 4, th = 78, bhh = 14 + th + 24;
    if (y - bhh < M) mulai();
    var by0 = y - bhh;
    for (var i = 0; i < roles.length; i++) {
      var r = roles[i];
      var a = d[r[2]] || {}, x = M + i * (bw + 6), tolak = d.tolak === r[2];
      kotak(x, by0, bw, bhh); kotak(x, by0 + bhh - 14, bw, 14, { color: PALE });
      var rw = FB.widthOfTextAtSize(r[0], 7.5); teks(r[0], x + (bw - rw) / 2, by0 + bhh - 10, 7.5, FB, NAVY);
      var ada = a.nama && a.waktu;
      if (ada && a.k && sig && sig[a.k]) {
        try {
          var s = sig[a.k], im = /^data:image\/png/.test(s) ? await doc.embedPng(s) : await doc.embedJpg(s), sc = Math.min((bw - 12) / im.width, (th - 6) / im.height);
          page.drawImage(im, { x: x + (bw - im.width * sc) / 2, y: by0 + 24 + (th - im.height * sc) / 2, width: im.width * sc, height: im.height * sc });
        } catch (e) { }
      }
      var cap = ada ? ((tolak ? "Ditolak via email " : "Disetujui via email ") + a.waktu) : (i === 0 && d.kirim ? "Diajukan via form " + d.kirim : "");
      if (cap) { var cl = bungkus(F, 5.6, cap, bw - 8); cl.slice(0, 2).forEach(function (l, j) { var lw = F.widthOfTextAtSize(l, 5.6); teks(l, x + (bw - lw) / 2, by0 + 24 + 6 + (cl.length > 1 ? (1 - j) * 6.5 : 0), 5.6, F, MUT); }); }
      var nmx = a.nama || (i === 0 ? d.by : ""), nl = bungkus(FB, 8.5, nmx || "-", bw - 10)[0]; var nw = FB.widthOfTextAtSize(nl, 8.5);
      page.drawLine({ start: { x: x + 8, y: by0 + 20 }, end: { x: x + bw - 8, y: by0 + 20 }, thickness: .5, color: BORD });
      teks(nl, x + (bw - nw) / 2, by0 + 8, 8.5, FB, INK);
    }
    if (kembali && d.terima && d.terima.nama) { var tt = "Diterima gudang oleh " + d.terima.nama + (d.terima.waktu ? " pada " + d.terima.waktu : ""); teks(tt, M, by0 - 12, 8, F, MUT); }
    if (d.status === "Ditolak") { teks("DITOLAK", PW - M - 70, by0 - 12, 10, FB, hex("#c0392b")); }
  }

  async function fonts(doc) { var L = W.PDFLib; return { F: await doc.embedFont(L.StandardFonts.Helvetica), FB: await doc.embedFont(L.StandardFonts.HelveticaBold), FT: await doc.embedFont(L.StandardFonts.TimesRomanBold) }; }

  /* docs: [{key,jenis,doc,d}] dari adminPaBukti. Hasil: Uint8Array berisi semua dokumen berurutan dalam satu PDF. */
  async function buatGabungan(docs, sig, onProgress) {
    var L = W.PDFLib, doc = await L.PDFDocument.create(), fn = await fonts(doc);
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
  W.BuktiPdf = { buatGabungan: buatGabungan, buatSatu: buatSatu, buatZip: buatZip, asc: asc };
})(window);
