/* gabung-pdf.js (T76) - mesin penggabung PDF di browser. Tanpa server: berkas tidak pernah dikirim ke mana pun.
   Sumber: gambar (JPG/PNG/WebP/foto kamera), PDF, Excel/CSV (dibuat tabel rapi per sheet).
   Model halaman: { id, src, idx, rot, flip, crop:{x,y,w,h}|null, bw, br, ct }; crop berupa pecahan (0..1) dari tampilan setelah diputar.
   Kualitas: kecil (sisi 1600, JPEG .75), seimbang (sisi 2400, .9), asli (tanpa pengecilan). */
(function (W) {
  "use strict";
  var PRESET = {
    kecil: { nama: "Kecil", sisi: 1600, q: .75, target: 380000 },
    seimbang: { nama: "Seimbang", sisi: 2400, q: .9, target: 1500000 },
    asli: { nama: "Asli", sisi: 0, q: .95, target: 0 }
  };
  var URL_PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js", URL_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  var URL_PDFLIB = "https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js", URL_XLSX = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
  var MEMO = {}, SEQ = 0;
  function muatSkrip(url, cek) {
    if (cek()) return Promise.resolve();
    if (MEMO[url]) return MEMO[url];
    MEMO[url] = new Promise(function (ok, gagal) {
      var s = document.createElement("script"); s.src = url; s.onload = function () { cek() ? ok() : gagal(new Error("Pustaka gagal dimuat.")); };
      s.onerror = function () { delete MEMO[url]; gagal(new Error("Pustaka tidak bisa diunduh. Periksa internet.")); }; document.head.appendChild(s);
    });
    return MEMO[url];
  }
  function adaLib() { return !!(W.PDFLib && W.PDFLib.PDFDocument); }
  function adaPdfjs() { return !!W.pdfjsLib; }
  async function pdfLib() { await muatSkrip(URL_PDFLIB, adaLib); return W.PDFLib; }
  async function pdfJs() { await muatSkrip(URL_PDFJS, adaPdfjs); try { if (!W.pdfjsLib.GlobalWorkerOptions.workerSrc) W.pdfjsLib.GlobalWorkerOptions.workerSrc = URL_WORKER; } catch (e) { /* abaikan */ } return W.pdfjsLib; }
  async function xlsxLib() { await muatSkrip(URL_XLSX, function () { return !!W.XLSX; }); return W.XLSX; }
  function fmt(n) { n = Number(n) || 0; return n >= 1048576 ? (n / 1048576).toFixed(n >= 10485760 ? 0 : 1).replace(".", ",") + " MB" : Math.max(1, Math.round(n / 1024)) + " KB"; }
  function kanvas(w, h) { var c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
  function keBlob(c, q) { return new Promise(function (ok) { c.toBlob(function (b) { ok(b); }, "image/jpeg", q); }); }
  function jenisBerkas(f) {
    var n = String(f.name || "").toLowerCase(), t = String(f.type || "").toLowerCase();
    if (/\.pdf$/.test(n) || t === "application/pdf") return "pdf";
    if (/\.(xlsx|xls|csv)$/.test(n) || /spreadsheet|ms-excel|csv/.test(t)) return "xls";
    if (/\.(jpe?g|png|webp|gif|bmp)$/.test(n) || /^image\//.test(t)) return "img";
    return "";
  }
  function bacaBytes(file) { return file.arrayBuffer().then(function (b) { return new Uint8Array(b); }); }
  async function bitmapDari(file) {
    try { if (W.createImageBitmap) return await createImageBitmap(file, { imageOrientation: "from-image" }); } catch (e) { /* coba cara lain */ }
    return await new Promise(function (ok, gagal) {
      var u = URL.createObjectURL(file), im = new Image();
      im.onload = function () { URL.revokeObjectURL(u); ok(im); }; im.onerror = function () { URL.revokeObjectURL(u); gagal(new Error("Gambar rusak atau formatnya tidak dikenal.")); }; im.src = u;
    });
  }
  function lepas(bm) { if (bm && bm.close) try { bm.close(); } catch (e) { /* abaikan */ } }
  function lw(bm) { return bm.naturalWidth || bm.width; }
  function lh(bm) { return bm.naturalHeight || bm.height; }

  /* ---------- sumber ---------- */
  /** Membuka satu berkas dan mengembalikan {src, halaman:[...], catatan}. Melempar galat bila rusak. */
  async function bukaBerkas(file) {
    var j = jenisBerkas(file); if (!j) throw new Error("Jenis berkas tidak didukung (pakai PDF, gambar, Excel, atau CSV).");
    var src = { id: "s" + (++SEQ), nama: file.name || "berkas", jenis: j, ukuran: file.size || 0, file: file }, hal = [], catatan = "";
    if (j === "img") {
      var bm = await bitmapDari(file), s = Math.min(1, 1400 / Math.max(lw(bm), lh(bm))), k = kanvas(lw(bm) * s, lh(bm) * s);
      k.getContext("2d").drawImage(bm, 0, 0, k.width, k.height); src.kerja = k; src.w = lw(bm); src.h = lh(bm); lepas(bm);
      hal.push(halBaru(src, 0));
    } else {
      var bytes;
      if (j === "xls") { var r = await excelKePdf(file); bytes = r.bytes; catatan = r.catatan; src.dariExcel = true; }
      else bytes = await bacaBytes(file);
      var L = await pdfLib(), doc;
      try { doc = await L.PDFDocument.load(bytes, { ignoreEncryption: true }); } catch (e) { throw new Error("PDF \"" + src.nama + "\" rusak atau terkunci sandi."); }
      if (doc.isEncrypted) throw new Error("PDF \"" + src.nama + "\" terkunci sandi.");
      src.bytes = bytes; src.doc = doc; src.jml = doc.getPageCount(); if (j === "pdf") src.ukuran = bytes.length;
      if (!src.jml) throw new Error("PDF \"" + src.nama + "\" tidak punya halaman.");
      var pj = await pdfJs(); try { src.pj = await pj.getDocument({ data: bytes.slice() }).promise; } catch (e2) { throw new Error("PDF \"" + src.nama + "\" tidak bisa dibaca."); }
      for (var i = 0; i < src.jml; i++) hal.push(halBaru(src, i));
    }
    return { src: src, halaman: hal, catatan: catatan };
  }
  function halBaru(src, idx) { return { id: "h" + (++SEQ), src: src, idx: idx, rot: 0, flip: false, crop: null, bw: false, br: 0, ct: 0 }; }
  function salin(h) { return { id: "h" + (++SEQ), src: h.src, idx: h.idx, rot: h.rot, flip: h.flip, crop: h.crop ? { x: h.crop.x, y: h.crop.y, w: h.crop.w, h: h.crop.h } : null, bw: h.bw, br: h.br, ct: h.ct }; }
  function diubah(h) { return !!(h.rot || h.flip || h.crop || h.bw || h.br || h.ct); }

  /* ---------- render halaman ke kanvas ---------- */
  function putarPecahan(c, derajat) {   // putar kotak potong ikut tampilan (derajat searah jarum jam: 90 atau 270)
    if (!c) return null;
    if (derajat === 90) return { x: 1 - c.y - c.h, y: c.x, w: c.h, h: c.w };
    return { x: c.y, y: 1 - c.x - c.w, w: c.h, h: c.w };
  }
  function balikPecahan(c) { return c ? { x: 1 - c.x - c.w, y: c.y, w: c.w, h: c.h } : null; }
  async function dasar(h, sisiMaks) {   // kanvas halaman penuh setelah diputar/dibalik, skala sisi terpanjang <= sisiMaks (0 = asli)
    var rot = ((h.rot % 360) + 360) % 360;
    if (h.src.jenis === "img") {
      var bm = null, sumber, sw, sh;
      if (sisiMaks && sisiMaks <= 1400 && h.src.kerja) { sumber = h.src.kerja; sw = sumber.width; sh = sumber.height; }
      else { bm = await bitmapDari(h.src.file); sumber = bm; sw = lw(bm); sh = lh(bm); }
      var tukar = rot === 90 || rot === 270, ow = tukar ? sh : sw, oh = tukar ? sw : sh, s = sisiMaks ? Math.min(1, sisiMaks / Math.max(ow, oh)) : 1;
      var c = kanvas(ow * s, oh * s), x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
      x.save(); x.translate(c.width / 2, c.height / 2); x.rotate(rot * Math.PI / 180); if (h.flip) x.scale(tukar ? 1 : -1, tukar ? -1 : 1);
      var dw = (tukar ? c.height : c.width), dh = (tukar ? c.width : c.height); x.drawImage(sumber, -dw / 2, -dh / 2, dw, dh); x.restore(); lepas(bm); return c;
    }
    var pg = await h.src.pj.getPage(h.idx + 1), nat = pg.rotate || 0, tot = (nat + rot) % 360, v1 = pg.getViewport({ scale: 1, rotation: tot });
    var sk = sisiMaks ? Math.min(4, sisiMaks / Math.max(v1.width, v1.height)) : 2, vp = pg.getViewport({ scale: sk, rotation: tot }), k = kanvas(vp.width, vp.height), cx = k.getContext("2d");
    cx.fillStyle = "#fff"; cx.fillRect(0, 0, k.width, k.height); await pg.render({ canvasContext: cx, viewport: vp }).promise;
    if (h.flip) { var k2 = kanvas(k.width, k.height), c2 = k2.getContext("2d"); c2.translate(k.width, 0); c2.scale(-1, 1); c2.drawImage(k, 0, 0); return k2; }
    return k;
  }
  function olah(c, h) {   // mode dokumen / kecerahan / kontras (per piksel; tidak bergantung ctx.filter agar jalan di semua HP)
    if (!h.bw && !h.br && !h.ct) return c;
    var x = c.getContext("2d"), d = x.getImageData(0, 0, c.width, c.height), p = d.data, f = 1 + (h.ct || 0) / 100, o = (h.br || 0) * 2.55;
    if (h.bw) { f *= 1.35; o += 8; }
    for (var i = 0; i < p.length; i += 4) {
      var r = p[i], g = p[i + 1], b = p[i + 2];
      if (h.bw) { r = g = b = .299 * r + .587 * g + .114 * b; }
      r = (r - 128) * f + 128 + o; g = (g - 128) * f + 128 + o; b = (b - 128) * f + 128 + o;
      p[i] = r < 0 ? 0 : r > 255 ? 255 : r; p[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g; p[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
    }
    x.putImageData(d, 0, 0); return c;
  }
  function potong(c, cr) {
    if (!cr) return c;
    var sx = Math.round(cr.x * c.width), sy = Math.round(cr.y * c.height), sw = Math.max(1, Math.round(cr.w * c.width)), sh = Math.max(1, Math.round(cr.h * c.height)), k = kanvas(sw, sh);
    k.getContext("2d").drawImage(c, sx, sy, sw, sh, 0, 0, sw, sh); return k;
  }
  /** Tampilan halaman lengkap untuk pratinjau/gambar akhir: putar, balik, potong, olah. Untuk PDF, olah hanya bila diminta. */
  async function render(h, sisiMaks, tanpaPotong) {
    var c = await dasar(h, sisiMaks);
    if (!tanpaPotong) c = potong(c, h.crop);
    return olah(c, h);
  }
  async function thumb(h) {
    var c = await render(h, 260), k = kanvas(c.width, c.height); k.getContext("2d").drawImage(c, 0, 0); return k.toDataURL("image/jpeg", .7);
  }

  /* ---------- potong otomatis tepi kertas (pendekatan sederhana: area terang terbesar) ---------- */
  function potongOtomatis(c) {
    var s = Math.min(1, 240 / Math.max(c.width, c.height)), k = kanvas(c.width * s, c.height * s); k.getContext("2d").drawImage(c, 0, 0, k.width, k.height);
    var d = k.getContext("2d").getImageData(0, 0, k.width, k.height).data, n = k.width * k.height, g = new Uint8Array(n), hist = new Array(256).fill(0), i;
    for (i = 0; i < n; i++) { var v = Math.round(.299 * d[i * 4] + .587 * d[i * 4 + 1] + .114 * d[i * 4 + 2]); g[i] = v; hist[v]++; }
    var tot = n, sum = 0, sB = 0, wB = 0, mx = 0, thr = 128;   // Otsu
    for (i = 0; i < 256; i++) sum += i * hist[i];
    for (i = 0; i < 256; i++) { wB += hist[i]; if (!wB) continue; var wF = tot - wB; if (!wF) break; sB += i * hist[i]; var mB = sB / wB, mF = (sum - sB) / wF, bt = wB * wF * (mB - mF) * (mB - mF); if (bt > mx) { mx = bt; thr = i; } }
    var br = 0; for (i = 0; i < n; i++) if (g[i] > thr) br++;
    if (br < n * .15 || br > n * .97) return null;
    var baris = new Array(k.height).fill(0), kol = new Array(k.width).fill(0), y, x;
    for (y = 0; y < k.height; y++) for (x = 0; x < k.width; x++) if (g[y * k.width + x] > thr) { baris[y]++; kol[x]++; }
    var y0 = 0, y1 = k.height - 1, x0 = 0, x1 = k.width - 1, mr = k.width * .25, mc = k.height * .25;
    while (y0 < y1 && baris[y0] < mr) y0++; while (y1 > y0 && baris[y1] < mr) y1--;
    while (x0 < x1 && kol[x0] < mc) x0++; while (x1 > x0 && kol[x1] < mc) x1--;
    var m = .008, r = { x: Math.max(0, x0 / k.width - m), y: Math.max(0, y0 / k.height - m) };
    r.w = Math.min(1 - r.x, (x1 + 1) / k.width + m - r.x); r.h = Math.min(1 - r.y, (y1 + 1) / k.height + m - r.y);
    var luas = r.w * r.h; if (luas < .3 || luas > .96) return null;
    return r;
  }

  /* ---------- Excel -> PDF tabel rapi ---------- */
  function sanitasi(font, s) {
    var set = null; try { set = font.getCharacterSet(); } catch (e) { set = null; }
    s = String(s == null ? "" : s).replace(/[\r\n\t]+/g, " ");
    if (!set) return s.replace(/[^\x20-\x7e]/g, "?");
    var h = ""; for (var i = 0; i < s.length; i++) { var cp = s.charCodeAt(i); h += (cp >= 32 && set.indexOf(cp) >= 0) ? s[i] : (cp > 127 ? "?" : (cp >= 32 ? s[i] : " ")); } return h;
  }
  function pasKolom(font, s, fs, lebar) {
    s = sanitasi(font, s); if (font.widthOfTextAtSize(s, fs) <= lebar) return s;
    while (s.length > 1 && font.widthOfTextAtSize(s + "..", fs) > lebar) s = s.slice(0, -1);
    return s + "..";
  }
  async function excelKePdf(file) {
    var X = await xlsxLib(), L = await pdfLib(), wb;
    try { wb = X.read(await file.arrayBuffer(), { type: "array" }); } catch (e) { throw new Error("Excel \"" + file.name + "\" tidak bisa dibaca."); }
    var doc = await L.PDFDocument.create(), fR = await doc.embedFont(L.StandardFonts.Helvetica), fB = await doc.embedFont(L.StandardFonts.HelveticaBold), potongan = 0, ada = false;
    wb.SheetNames.forEach(function (nm) {
      var rows = X.utils.sheet_to_json(wb.Sheets[nm], { header: 1, raw: false, defval: "" }).filter(function (r) { return r.some(function (v) { return String(v).trim() !== ""; }); });
      if (!rows.length) return; ada = true;
      var nc = 0; rows.forEach(function (r) { var t = r.length; while (t > 0 && String(r[t - 1]).trim() === "") t--; nc = Math.max(nc, t); });
      var mxl = new Array(nc).fill(3); rows.forEach(function (r) { for (var c = 0; c < nc; c++) mxl[c] = Math.max(mxl[c], Math.min(40, String(r[c] == null ? "" : r[c]).length)); });
      var fs = 9, landscape = false, PW = 595.28, PH = 841.89, mg = 28, lebar;
      function totalLebar(f) { return mxl.reduce(function (a, l) { return a + l * f * .52 + 8; }, 0); }
      if (totalLebar(fs) > PW - 2 * mg) { landscape = true; PW = 841.89; PH = 595.28; }
      while (fs > 6 && totalLebar(fs) > PW - 2 * mg) fs -= .5;
      var cw = mxl.map(function (l) { return l * fs * .52 + 8; }), tl = cw.reduce(function (a, b) { return a + b; }, 0), ruang = PW - 2 * mg;
      if (tl > ruang) { var f = ruang / tl; cw = cw.map(function (w) { return w * f; }); }
      var rh = fs + 6, page = null, y = 0, no = 0;
      function baru() { page = doc.addPage([PW, PH]); y = PH - mg; no++; if (no === 1) { page.drawText(sanitasi(fB, "Sheet: " + nm + " (" + file.name + ")"), { x: mg, y: y - 10, size: 10, font: fB, color: L.rgb(.1, .2, .3) }); y -= 22; } }
      function baris(r, tebal, abu) {
        if (!page || y - rh < mg) { baru(); if (!tebal && rows.length > 1 && no > 0) { /* ulangi judul kolom di halaman lanjutan */ if (no > 1) baris(rows[0], true, true); } }
        if (abu) page.drawRectangle({ x: mg, y: y - rh + 2, width: cw.reduce(function (a, b) { return a + b; }, 0), height: rh, color: L.rgb(.9, .93, .96) });
        var x = mg; for (var c = 0; c < nc; c++) { var v = r[c] == null ? "" : String(r[c]), t = pasKolom(tebal ? fB : fR, v, fs, cw[c] - 6); if (t !== sanitasi(fR, v)) potongan++; if (t) page.drawText(t, { x: x + 3, y: y - fs - 1, size: fs, font: tebal ? fB : fR, color: L.rgb(0, 0, 0) }); x += cw[c]; }
        page.drawLine({ start: { x: mg, y: y - rh + 2 }, end: { x: mg + cw.reduce(function (a, b) { return a + b; }, 0), y: y - rh + 2 }, thickness: .3, color: L.rgb(.75, .8, .85) });
        y -= rh;
      }
      baru(); baris(rows[0], true, true);
      for (var i = 1; i < rows.length; i++) baris(rows[i], false, false);
    });
    if (!ada) throw new Error("Excel \"" + file.name + "\" kosong.");
    var catatan = "Excel dibuat tabel teks per sheet (tanpa warna, gambar, dan format sel Excel)." + (potongan ? " " + potongan + " sel dipotong karena terlalu lebar." : "");
    return { bytes: await doc.save(), catatan: catatan };
  }

  /* ---------- gabungkan ---------- */
  function ukuranHalamanGambar(w, h) {   // ikuti arah gambar, muat dalam A4
    var land = w > h, bw = land ? 841.89 : 595.28, bh = land ? 595.28 : 841.89, s = Math.min(bw / w, bh / h);
    return [w * s, h * s];
  }
  function petaKotak(Wp, Hp, R, c) {   // kotak potong (pecahan tampilan) -> kotak koordinat halaman PDF asli
    if (R === 0) return { x: c.x * Wp, y: (1 - c.y - c.h) * Hp, w: c.w * Wp, h: c.h * Hp };
    if (R === 90) return { x: c.y * Wp, y: c.x * Hp, w: c.h * Wp, h: c.w * Hp };
    if (R === 180) return { x: Wp - (c.x + c.w) * Wp, y: c.y * Hp, w: c.w * Wp, h: c.h * Hp };
    return { x: (1 - c.y - c.h) * Wp, y: (1 - c.x - c.w) * Hp, w: c.h * Wp, h: c.w * Hp };
  }
  /** opsi: {kualitas, nomor, daftarIsi, rasterPdf}. onProgress(i, n). Hasil: {bytes, halaman, gagal:[{nama,pesan}]} */
  async function bangun(halaman, opsi, onProgress) {
    opsi = opsi || {}; var L = await pdfLib(), P = PRESET[opsi.kualitas] || PRESET.kecil, out = await L.PDFDocument.create(), gagal = [], mulai = [], n = halaman.length, helv = await out.embedFont(L.StandardFonts.Helvetica);
    var depan = opsi.daftarIsi ? 1 : 0, hasilHal = 0, terakhirSrc = null, simpanan = {};
    for (var i = 0; i < n; i++) {
      var h = halaman[i];
      if (onProgress) onProgress(i, n);
      try {
        var tambahan = 0;
        if (h.src.jenis === "img") tambahan = await tulisGambar(out, h, P);
        else if (opsi.rasterPdf && perluRaster(h.src)) tambahan = await tulisRaster(out, h, P);
        else tambahan = await tulisPdf(out, L, h, halaman, simpanan);
        if (tambahan) { if (terakhirSrc !== h.src.id) mulai.push({ nama: h.src.nama, hal: hasilHal + 1 + depan }); terakhirSrc = h.src.id; hasilHal += 1; }
      } catch (e) { gagal.push({ nama: h.src.nama + " (hal. " + (h.idx + 1) + ")", pesan: e.message || String(e) }); }
    }
    if (!hasilHal) throw new Error("Tidak ada halaman yang berhasil digabung.");
    if (opsi.daftarIsi) {
      var dp = out.insertPage(0, [595.28, 841.89]), y = 790, fb = await out.embedFont(L.StandardFonts.HelveticaBold);
      dp.drawText("DAFTAR ISI", { x: 50, y: y, size: 16, font: fb, color: L.rgb(.1, .25, .4) }); y -= 30;
      mulai.forEach(function (m, k) {
        if (y < 60) return;
        var t = (k + 1) + ". " + sanitasi(helv, m.nama); while (t.length > 5 && helv.widthOfTextAtSize(t, 11) > 430) t = t.slice(0, -1);
        dp.drawText(t, { x: 50, y: y, size: 11, font: helv, color: L.rgb(0, 0, 0) }); var no = String(m.hal);
        dp.drawText(no, { x: 545 - helv.widthOfTextAtSize(no, 11), y: y, size: 11, font: helv, color: L.rgb(0, 0, 0) }); y -= 20;
      });
    }
    if (opsi.nomor) {
      var pgs = out.getPages();
      pgs.forEach(function (p, k) {
        var t = (k + 1) + " / " + pgs.length, sz = Math.max(7, Math.min(9, p.getWidth() / 60)), w = helv.widthOfTextAtSize(t, sz);
        p.drawText(t, { x: (p.getWidth() - w) / 2, y: 14, size: sz, font: helv, color: L.rgb(.35, .35, .35) });
      });
    }
    try { out.setTitle(""); out.setAuthor(""); out.setProducer("Gudang SCTK"); out.setCreator("Gudang SCTK"); } catch (e) { /* abaikan */ }
    var bytes = await out.save({ useObjectStreams: true });
    if (onProgress) onProgress(n, n);
    return { bytes: bytes, halaman: out.getPageCount(), gagal: gagal };
  }
  function perluRaster(src) { return src.jenis !== "img" && !src.dariExcel && src.bytes && (src.bytes.length / Math.max(1, src.jml)) > 150000; }
  async function jpegDariKanvas(c0, P) {
    var q = P.q, sk = 1, c = c0, blob, tr = 0;
    for (;;) {
      blob = await keBlob(c, q); tr++; if (!blob) throw new Error("Gambar tidak bisa dikecilkan di perangkat ini.");
      if (!P.target || blob.size <= P.target || tr >= 8) break;
      if (q > .52) q = Math.max(.5, q - .07); else if (sk > .62) { sk *= .86; c = kanvas(c0.width * sk, c0.height * sk); c.getContext("2d").drawImage(c0, 0, 0, c.width, c.height); } else break;
    }
    return blob;
  }
  async function tulisGambar(out, h, P) {
    var asli = !h.src.file ? null : h.src.file;
    if (P === PRESET.asli && !diubah(h) && asli && /^image\/(jpeg|png)$/.test(asli.type)) {   // berkas asli dipakai apa adanya (bila arah EXIF tidak mengubah ukuran)
      var by = await bacaBytes(asli), im0 = /png/.test(asli.type) ? await out.embedPng(by) : await out.embedJpg(by);
      if (im0.width === h.src.w && im0.height === h.src.h) { var sz0 = ukuranHalamanGambar(im0.width, im0.height), p0 = out.addPage(sz0); p0.drawImage(im0, { x: 0, y: 0, width: sz0[0], height: sz0[1] }); return 1; }
    }
    var c = await dasar(h, 0), tot = potong(c, h.crop), s = P.sisi ? Math.min(1, P.sisi / Math.max(tot.width, tot.height)) : 1;
    if (s < 1) { var k = kanvas(tot.width * s, tot.height * s); k.getContext("2d").drawImage(tot, 0, 0, k.width, k.height); tot = k; }
    olah(tot, h); var blob = await jpegDariKanvas(tot, P), im = await out.embedJpg(new Uint8Array(await blob.arrayBuffer())), sz = ukuranHalamanGambar(tot.width, tot.height), p = out.addPage(sz);
    p.drawImage(im, { x: 0, y: 0, width: sz[0], height: sz[1] }); return 1;
  }
  async function tulisRaster(out, h, P) {
    var pg = await h.src.pj.getPage(h.idx + 1), tot = ((pg.rotate || 0) + ((h.rot % 360) + 360)) % 360, v1 = pg.getViewport({ scale: 1, rotation: tot });
    var c = await dasar(h, P.sisi || 2400), t = potong(c, h.crop); olah(t, h);
    var blob = await jpegDariKanvas(t, P), im = await out.embedJpg(new Uint8Array(await blob.arrayBuffer())), wpt = v1.width * (h.crop ? h.crop.w : 1), hpt = v1.height * (h.crop ? h.crop.h : 1), p = out.addPage([wpt, hpt]);
    p.drawImage(im, { x: 0, y: 0, width: wpt, height: hpt }); return 1;
  }
  async function tulisPdf(out, L, h, semua, simpanan) {
    var sm = simpanan[h.src.id];
    if (!sm) {   // salin sekali per sumber agar sumber daya (font, gambar) tidak berlipat ganda
      var idxs = []; semua.forEach(function (x) { if (x.src === h.src && idxs.indexOf(x.idx) < 0) idxs.push(x.idx); });
      var cps = await out.copyPages(h.src.doc, idxs); sm = simpanan[h.src.id] = {}; idxs.forEach(function (ix, k) { sm[ix] = cps[k]; });
    }
    var p = sm[h.idx]; if (p) delete sm[h.idx]; else p = (await out.copyPages(h.src.doc, [h.idx]))[0];
    var nat = 0; try { nat = p.getRotation().angle || 0; } catch (e) { nat = 0; }
    var R = (((nat + h.rot) % 360) + 360) % 360, ms = p.getSize();
    if (h.crop) { var b = petaKotak(ms.width, ms.height, R, h.crop); try { p.setCropBox(b.x, b.y, b.w, b.h); p.setMediaBox(b.x, b.y, b.w, b.h); } catch (e) { /* biarkan penuh */ } }
    p.setRotation(L.degrees(R)); out.addPage(p);
    if (h.flip) { /* membalik halaman PDF tidak didukung tanpa merender ulang: abaikan agar isi tidak rusak */ }
    return 1;
  }

  W.GP = { PRESET: PRESET, fmt: fmt, jenisBerkas: jenisBerkas, bukaBerkas: bukaBerkas, salin: salin, diubah: diubah, render: render, thumb: thumb, dasar: dasar, potongOtomatis: potongOtomatis,
    putarPecahan: putarPecahan, balikPecahan: balikPecahan, bangun: bangun, excelKePdf: excelKePdf, petaKotak: petaKotak, kanvas: kanvas, perluRaster: perluRaster };
})(window);
