/* kompres.js (T59) - mesin kompres lampiran di browser. Tanpa server.
   Foto: perbaiki arah (EXIF), putar manual, kecilkan sisi terpanjang, JPEG adaptif, mode dokumen (abu-abu + kontras) opsional.
   PDF: PDF berisi teks TIDAK diubah isinya (hanya metadata dibersihkan, dipakai bila lebih kecil). PDF hasil scan boleh
   dikecilkan (opsional, per file) dengan merender ulang halaman jadi gambar. */
(function (W) {
  "use strict";
  var PRESET = {
    tajam: { nama: "Tajam", sisi: 2200, q: .86, target: 950000 },
    seimbang: { nama: "Seimbang", sisi: 1600, q: .74, target: 600000 },
    hemat: { nama: "Hemat", sisi: 1200, q: .58, target: 350000 }
  };
  var PDFJS_SRC = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js", PDFJS_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  function fmt(n) { n = Number(n) || 0; return n >= 1048576 ? (n / 1048576).toFixed(n >= 10485760 ? 0 : 1).replace(".", ",") + " MB" : Math.max(1, Math.round(n / 1024)) + " KB"; }
  function pilih(p) { return PRESET[p] || PRESET.seimbang; }
  async function muatBitmap(file) {
    try { if (W.createImageBitmap) return await createImageBitmap(file, { imageOrientation: "from-image" }); } catch (e) { /* coba cara lain */ }
    return await new Promise(function (ok, gagal) {
      var u = URL.createObjectURL(file), im = new Image();
      im.onload = function () { URL.revokeObjectURL(u); ok(im); };
      im.onerror = function () { URL.revokeObjectURL(u); gagal(new Error("Foto \"" + (file.name || "") + "\" tidak bisa dibuka. Gunakan JPG atau PNG.")); };
      im.src = u;
    });
  }
  function kanvas(w, h) { var c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
  function keBlob(c, q) { return new Promise(function (ok) { c.toBlob(function (b) { ok(b); }, "image/jpeg", q); }); }
  /* Mode dokumen: abu-abu, lalu regangkan kontras (persentil 2% dan 98%) agar kertas menjadi putih dan tulisan gelap. */
  function modeDokumen(c) {
    var x = c.getContext("2d"), im = x.getImageData(0, 0, c.width, c.height), d = im.data, hist = new Uint32Array(256), n = d.length / 4, i;
    for (i = 0; i < d.length; i += 4) { var g = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000 | 0; d[i] = d[i + 1] = d[i + 2] = g; hist[g]++; }
    var lo = 0, hi = 255, acc = 0;
    for (i = 0; i < 256; i++) { acc += hist[i]; if (acc >= n * .02) { lo = i; break; } }
    acc = 0; for (i = 255; i >= 0; i--) { acc += hist[i]; if (acc >= n * .02) { hi = i; break; } }
    if (hi - lo < 40) { lo = Math.max(0, lo - 20); hi = Math.min(255, hi + 20); }
    var tab = new Uint8ClampedArray(256), k;
    for (k = 0; k < 256; k++) { var v = (k - lo) / (hi - lo); tab[k] = Math.max(0, Math.min(255, Math.round(255 * Math.pow(Math.max(0, Math.min(1, v)), 1.15)))); }
    for (i = 0; i < d.length; i += 4) { d[i] = d[i + 1] = d[i + 2] = tab[d[i]]; }
    x.putImageData(im, 0, 0);
  }
  /* opts: {preset, rot (0/90/180/270), bw (mode dokumen)}. Hasil: {blob, bytes, w, h, asli, ukuran} */
  async function gambar(file, opts) {
    opts = opts || {}; var P = pilih(opts.preset), rot = ((Number(opts.rot) || 0) % 360 + 360) % 360, bm = await muatBitmap(file);
    var sw = bm.width, sh = bm.height, tukar = rot === 90 || rot === 270, ow = tukar ? sh : sw, oh = tukar ? sw : sh, sk = Math.min(1, P.sisi / Math.max(ow, oh)), q = P.q, blob = null, w, h, tries = 0;
    for (;;) {
      w = Math.max(1, Math.round(ow * sk)); h = Math.max(1, Math.round(oh * sk));
      var c = kanvas(w, h), x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, w, h);
      x.save(); x.translate(w / 2, h / 2); x.rotate(rot * Math.PI / 180); var dw = tukar ? h : w, dh = tukar ? w : h; x.drawImage(bm, -dw / 2, -dh / 2, dw, dh); x.restore();
      if (opts.bw) modeDokumen(c);
      blob = await keBlob(c, q); tries++;
      if (!blob) throw new Error("Foto tidak bisa dikecilkan di perangkat ini.");
      if (blob.size <= P.target || tries >= 8) break;
      if (q > .46) q = Math.max(.42, q - .08); else if (sk > .55) sk *= .85; else break;
    }
    if (bm.close) try { bm.close(); } catch (e) { /* abaikan */ }
    var bytes = new Uint8Array(await blob.arrayBuffer());
    return { blob: blob, bytes: bytes, w: w, h: h, asli: file.size, ukuran: blob.size };
  }
  function adaPdfLib() { return W.PDFLib && W.PDFLib.PDFDocument; }
  function bersihMeta(doc) { try { doc.setTitle(""); doc.setAuthor(""); doc.setSubject(""); doc.setKeywords([]); doc.setProducer("Gudang SCTK"); doc.setCreator("Gudang SCTK"); } catch (e) { /* abaikan */ } }
  async function bacaBytes(file) { return new Uint8Array(await file.arrayBuffer()); }
  async function muatPdfJs() {
    if (W.pdfjsLib) return W.pdfjsLib;
    await new Promise(function (ok, gagal) { var s = document.createElement("script"); s.src = PDFJS_SRC; s.onload = ok; s.onerror = function () { gagal(new Error("Pustaka pembaca PDF belum bisa dimuat. Periksa internet.")); }; document.head.appendChild(s); });
    if (!W.pdfjsLib) throw new Error("Pustaka pembaca PDF tidak tersedia.");
    W.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER; return W.pdfjsLib;
  }
  /* true bila 3 halaman pertama hampir tanpa teks (PDF hasil scan). null bila tidak bisa dipastikan. */
  async function apakahScan(file) {
    try {
      var lib = await muatPdfJs(), doc = await lib.getDocument({ data: await bacaBytes(file) }).promise, n = Math.min(3, doc.numPages), huruf = 0;
      for (var i = 1; i <= n; i++) { var pg = await doc.getPage(i), t = await pg.getTextContent(); huruf += t.items.reduce(function (a, z) { return a + String(z.str || "").trim().length; }, 0); }
      return huruf < 25;
    } catch (e) { return null; }
  }
  /* PDF: isi tidak diubah. opts.raster = true -> render ulang halaman jadi gambar (hanya untuk hasil scan, atas pilihan pengguna). */
  async function pdf(file, opts) {
    opts = opts || {}; var asli = await bacaBytes(file), P = pilih(opts.preset);
    var hasil = { bytes: asli, ukuran: asli.length, asli: asli.length, mode: "asli", halaman: 0 };
    if (!adaPdfLib()) return hasil;
    var L = W.PDFLib, doc;
    try { doc = await L.PDFDocument.load(asli, { ignoreEncryption: true }); } catch (e) { var er = new Error("PDF \"" + (file.name || "") + "\" rusak atau terkunci sandi."); er.nama = file.name; throw er; }
    hasil.halaman = doc.getPageCount();
    if (opts.raster) {
      var lib = await muatPdfJs(), src = await lib.getDocument({ data: asli.slice() }).promise, out = await L.PDFDocument.create();
      for (var i = 1; i <= src.numPages; i++) {
        var pg = await src.getPage(i), v1 = pg.getViewport({ scale: 1 }), sk = Math.min(3, P.sisi / Math.max(v1.width, v1.height)), vp = pg.getViewport({ scale: sk }), c = kanvas(Math.round(vp.width), Math.round(vp.height)), x = c.getContext("2d");
        x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); await pg.render({ canvasContext: x, viewport: vp }).promise;
        if (opts.bw) modeDokumen(c);
        var b = await keBlob(c, P.q), im = await out.embedJpg(new Uint8Array(await b.arrayBuffer())), np = out.addPage([v1.width, v1.height]); np.drawImage(im, { x: 0, y: 0, width: v1.width, height: v1.height });
      }
      bersihMeta(out); var rb = await out.save({ useObjectStreams: true });
      if (rb.length < asli.length * .8) return { bytes: rb, ukuran: rb.length, asli: asli.length, mode: "raster", halaman: out.getPageCount() };
      hasil.catatan = "Hasil render ulang tidak lebih kecil, file asli dipakai."; return hasil;
    }
    try {
      bersihMeta(doc); var nb = await doc.save({ useObjectStreams: true });
      if (nb.length < asli.length) { hasil.bytes = nb; hasil.ukuran = nb.length; hasil.mode = "bersih"; }
    } catch (e2) { /* pakai file asli */ }
    return hasil;
  }
  W.Kompres = { PRESET: PRESET, gambar: gambar, pdf: pdf, apakahScan: apakahScan, fmt: fmt, modeDokumen: modeDokumen };
})(window);
