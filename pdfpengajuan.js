/* Pembuat PDF Pengajuan Kebutuhan Proyek (gaya sama dengan Bukti Pengambilan Barang). Dipakai kebutuhan.html dan pengajuan.html.
   Bergantung pada pustaka pdf-lib (window.PDFLib). */
(function (W) {
  "use strict";
  function asc(s) { return String(s == null ? "" : s).replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/[\r\n\t]+/g, " ").replace(/[^\x20-\x7E¡-ÿ]/g, "?"); }
  function fmtN(n) { n = Number(n) || 0; return (Math.round(n * 100) / 100).toString().replace(".", ","); }
  function rp(n) { return n == null || n === "" ? "" : "Rp " + Math.round(Number(n)).toLocaleString("id-ID"); }
  function tglId(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ""); if (!m) return iso || ""; var bl = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]; return Number(m[3]) + " " + bl[Number(m[2]) - 1] + " " + m[1]; }
  function bungkus(font, size, text, maxW) {
    var ws = asc(text).split(/\s+/).filter(Boolean), lines = [], cur = "";
    ws.forEach(function (w) {
      while (font.widthOfTextAtSize(w, size) > maxW) { var k = w.length; while (k > 1 && font.widthOfTextAtSize(w.slice(0, k), size) > maxW) k--; if (cur) { lines.push(cur); cur = ""; } lines.push(w.slice(0, k)); w = w.slice(k); }
      var t = cur ? cur + " " + w : w; if (font.widthOfTextAtSize(t, size) <= maxW) cur = t; else { lines.push(cur); cur = w; }
    });
    if (cur) lines.push(cur); return lines.length ? lines : [""];
  }
  function hex(h) { var n = parseInt(h.replace("#", ""), 16); return W.PDFLib.rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255); }

  /* Menggabungkan lampiran (PDF + foto) menjadi satu PDF. items: [{file: File, pdf: bool}]. Hasil: Uint8Array. */
  async function buatBundle(items, onProgress, gambarKeJpeg) {
    var L = W.PDFLib, doc = await L.PDFDocument.create(), HF = await doc.embedFont(L.StandardFonts.Helvetica);
    for (var i = 0; i < items.length; i++) {
      var a = items[i]; if (onProgress) onProgress(i + 1, items.length);
      try {
        if (a.pdf) { var src = await L.PDFDocument.load(await a.file.arrayBuffer(), { ignoreEncryption: true }), pg = await doc.copyPages(src, src.getPageIndices()); pg.forEach(function (p) { doc.addPage(p); }); }
        else {
          var g = await gambarKeJpeg(a.file), im = await doc.embedJpg(g.bytes), land = g.w > g.h * 1.15, PW = land ? 841.89 : 595.28, PH = land ? 595.28 : 841.89, m = 28, top = 44, sc = Math.min((PW - 2 * m) / g.w, (PH - m - top) / g.h), dw = g.w * sc, dh = g.h * sc, p = doc.addPage([PW, PH]);
          p.drawText(asc("Lampiran " + (i + 1) + ": " + a.file.name).slice(0, 110), { x: m, y: PH - 28, size: 9, font: HF, color: L.rgb(.3, .35, .4) });
          p.drawImage(im, { x: (PW - dw) / 2, y: PH - top - dh, width: dw, height: dh });
        }
      } catch (e) { var err = new Error(e && e.message ? e.message : "file rusak atau terkunci"); err.nama = a.file.name; throw err; }
    }
    return await doc.save();
  }

  /* opts: {data:{nomor,tgl,pengaju,dept,perihal,oto,proyek}, ttd:[{label,nama,waktu,img,cat}] (5), status, tolakOleh, alasanTolak, lampiranNama:[...], lampiranBytes:Uint8Array|null} */
  async function buatPdf(opts) {
    var L = W.PDFLib, rgb = L.rgb, d = opts.data, doc = await L.PDFDocument.create();
    doc.setTitle("Pengajuan Kebutuhan Barang Proyek " + (d.nomor || "")); doc.setCreator("Gudang SCTK");
    var F = await doc.embedFont(L.StandardFonts.Helvetica), FB = await doc.embedFont(L.StandardFonts.HelveticaBold), FT = await doc.embedFont(L.StandardFonts.TimesRomanBold);
    var PW = 841.89, PH = 595.28, M = 28.3, CW = PW - 2 * M, page, y;
    var NAVY = hex("#0a2a43"), GOLD = hex("#b8975a"), PALE = hex("#eef6fa"), LINE = hex("#b6cad6"), BORD = hex("#9fb8c6"), INK = hex("#0d1f2d"), MUT = hex("#5b6b75"), ALT = hex("#f5fafc");
    var pages = [];
    function baru(first) {
      page = doc.addPage([PW, PH]); pages.push(page); y = PH - M;
      if (first) kepala();
    }
    function kepala() {
      var bh = 54, top = PH, n = 70, c0 = [6, 32, 58], c1 = [10, 58, 92], c2 = [15, 111, 147];
      for (var i = 0; i < n; i++) {
        var t = i / (n - 1), a = t < .55 ? c0 : c1, b = t < .55 ? c1 : c2, u = t < .55 ? t / .55 : (t - .55) / .45;
        page.drawRectangle({ x: i * PW / n, y: top - bh, width: PW / n + 1, height: bh, color: rgb((a[0] + (b[0] - a[0]) * u) / 255, (a[1] + (b[1] - a[1]) * u) / 255, (a[2] + (b[2] - a[2]) * u) / 255) });
      }
      try { page.drawSvgPath("M0 20 Q 50 3 100 20 T 200 20 T 300 20 T 400 20 T 500 20 T 600 20 V30 H0 Z", { x: 0, y: top - bh + 30, color: rgb(1, 1, 1), opacity: .2, borderWidth: 0 }); } catch (e) { }
      page.drawRectangle({ x: 0, y: top - bh - 3.4, width: PW, height: 3.4, color: GOLD });
      var t1 = "PENGAJUAN KEBUTUHAN BARANG PROYEK", w1 = FT.widthOfTextAtSize(t1, 15); page.drawText(t1, { x: (PW - w1) / 2, y: top - 26, size: 15, font: FT, color: rgb(1, 1, 1) });
      var t2 = "PT SARANA CATUR TIRTA KELOLA", w2 = FB.widthOfTextAtSize(t2, 8); page.drawText(t2, { x: (PW - w2) / 2, y: top - 40, size: 8, font: FB, color: hex("#e3c98f") });
      y = top - bh - 3.4 - 12;
    }
    function kotak(x, yy, w, h, o) { page.drawRectangle(Object.assign({ x: x, y: yy, width: w, height: h, borderColor: BORD, borderWidth: .6 }, o || {})); }
    function medan(x, w, label, val) {
      page.drawText(asc(label), { x: x, y: y - 7, size: 7, font: FB, color: NAVY });
      var h = 15; kotak(x, y - 9 - h, w, h, { color: PALE });
      var s = asc(val || "-"), sz = 8.5; while (sz > 6 && F.widthOfTextAtSize(s, sz) > w - 8) sz -= .5;
      while (F.widthOfTextAtSize(s, sz) > w - 8 && s.length > 3) s = s.slice(0, -2);
      page.drawText(s, { x: x + 4, y: y - 9 - h + 4.6, size: sz, font: F, color: INK });
    }
    baru(true);
    var gap = 10, fw = (CW - 2 * gap) / 3, ppbjs = d.proyek.map(function (p) { return p.ppbj; }).filter(Boolean).join(", ");
    medan(M, fw, "Nomor Dokumen", d.nomor || "(belum diajukan)"); medan(M + fw + gap, fw, "Tanggal", tglId(d.tgl)); medan(M + 2 * (fw + gap), fw, "Departemen", d.dept); y -= 30;
    medan(M, fw, "Yang Mengajukan", d.pengaju); medan(M + fw + gap, fw, "No PPBJ", ppbjs || "-"); medan(M + 2 * (fw + gap), fw, "Sumber stok (urutan)", (d.oto || []).join(" lalu ")); y -= 34;
    var oto = d.oto || ["Moka", "Accurate"], no = oto.length;
    var col = [18, 92]; var fixTail = [26, 30].concat(oto.map(function (n) { return n.length > 6 ? 44 : 32; }), [28, 48, 54]);
    var nameW = CW - col[0] - col[1] - fixTail.reduce(function (a, b) { return a + b; }, 0);
    col = col.concat([nameW], fixTail);
    var HD = ["No", "Kode", "Nama Barang", "Sat", "Butuh"].concat(oto, ["Beli", "Harga", "Subtotal"]);
    var isRight = function (i) { return i >= 4; };
    function baris(cells, kind, o) {
      var f = kind === "head" || kind === "tot" ? FB : F, sz = 7.5, lh = 9.2, pad = 3, cl = cells.map(function (c, i) { return bungkus(f, sz, c, col[i] - 2 * pad); });
      var h = Math.max.apply(null, cl.map(function (a) { return a.length; })) * lh + 2 * pad - 1;
      if (y - h < M + 36) { baru(false); if (kind !== "head") baris(HD, "head"); }
      var x = M;
      cells.forEach(function (c, i) {
        var bg = kind === "head" ? NAVY : (o && o.alt ? ALT : rgb(1, 1, 1)), tc = kind === "head" ? rgb(1, 1, 1) : INK, bold = false;
        if (kind === "row" && i === 4 + no + 1 && c) { bg = hex("#fde8e8"); tc = hex("#8a1c28"); }
        page.drawRectangle({ x: x, y: y - h, width: col[i], height: h, color: bg, borderColor: kind === "head" ? hex("#2c5876") : LINE, borderWidth: .4 });
        cl[i].forEach(function (l, k) { var w = f.widthOfTextAtSize(l, sz); page.drawText(l, { x: isRight(i) && kind !== "head" || (isRight(i) && kind === "head") ? x + col[i] - pad - w : x + pad, y: y - pad - sz - k * lh + 1.6, size: sz, font: f, color: tc }); });
        x += col[i];
      });
      page.drawRectangle({ x: M, y: y - h, width: CW, height: h, borderColor: NAVY, borderWidth: .5 });
      y -= h;
    }
    d.proyek.forEach(function (p, pi) {
      if (y < M + 110) baru(false);
      bungkus(FB, 9, "Proyek " + (pi + 1) + ": " + (p.nama || "-") + (p.ppbj ? "   (No PPBJ: " + p.ppbj + ")" : ""), CW).forEach(function (l) { page.drawText(l, { x: M, y: y - 9, size: 9, font: FB, color: NAVY }); y -= 12; });
      y -= 3; baris(HD, "head");
      var tot = 0, adaH = false;
      p.rows.forEach(function (x, i) {
        var cells = [String(i + 1), x.kode, x.nama || x.kode, x.satuan || "", fmtN(x.butuh)].concat((x.ambil || []).map(function (a) { return a ? fmtN(a) : "-"; }), [x.beli > 0 ? fmtN(x.beli) : "-", x.harga != null && x.harga !== "" ? rp(x.harga) : "", x.subtotal != null && x.subtotal !== "" ? rp(x.subtotal) : ""]);
        if (x.subtotal != null && x.subtotal !== "") { tot += Number(x.subtotal); adaH = true; }
        baris(cells, "row", { alt: i % 2 === 1 });
      });
      var tc = ["", "", "Total nilai pemakaian stok", "", "", ""].slice(0, 5).concat(oto.map(function () { return ""; }), ["", "", adaH ? rp(tot) : "-"]); tc[2] = "Total nilai pemakaian stok"; baris(tc, "tot");
      y -= 12;
    });
    var cat = bungkus(F, 7, "Keterangan: kolom " + oto.join(" / ") + " adalah bagian kebutuhan yang dapat dipenuhi dari stok gudang pada tanggal pengajuan (" + oto[0] + " dipakai lebih dulu), setelah dikurangi alokasi proyek lain dan permintaan yang sedang berjalan. Kolom Beli adalah bagian yang perlu dibeli; harga hanya ditampilkan untuk barang yang tersedia di stok.", CW);
    if (y < M + 130 + cat.length * 8.5) baru(false);
    cat.forEach(function (l) { page.drawText(l, { x: M, y: y - 7, size: 7, font: F, color: MUT }); y -= 8.5; }); y -= 6;
    if (d.perihal) {
      page.drawText("Perihal / Keterangan", { x: M, y: y - 7, size: 7, font: FB, color: NAVY }); var pl = bungkus(F, 8.5, d.perihal, CW - 10), ph = pl.length * 10.5 + 6;
      kotak(M, y - 9 - ph, CW, ph, { color: PALE }); pl.forEach(function (l, k) { page.drawText(l, { x: M + 4, y: y - 9 - 10 - k * 10.5 + 3, size: 8.5, font: F, color: INK }); }); y -= 9 + ph + 8;
    }
    var ln = opts.lampiranNama || [];
    if (ln.length) {
      page.drawText("Lampiran (terlampir di halaman berikutnya)", { x: M, y: y - 7, size: 7, font: FB, color: NAVY }); y -= 11;
      ln.forEach(function (n, i) { bungkus(F, 8, (i + 1) + ". " + n, CW - 10).forEach(function (l) { if (y < M + 130) baru(false); page.drawText(l, { x: M + 6, y: y - 8, size: 8, font: F, color: INK }); y -= 10; }); }); y -= 4;
    }
    var BH = 98, TH = 16; if (y < M + BH + TH + 8) baru(false);
    var ttd = opts.ttd || [], sg = 8, bw = 130, grp = 26, by = Math.min(y - 4 - TH, M + BH + 14);
    var kiri = ttd.slice(0, 3), kanan = ttd.slice(3).filter(function (t) { return t && t.nama; });
    var slots = []; kiri.forEach(function (t, i) { slots.push({ x: M + i * (bw + sg), t: t }); });
    var kx = M + 3 * (bw + sg) - sg + grp; kanan.forEach(function (t, i) { slots.push({ x: kx + i * (bw + sg), t: t, kanan: true }); });
    if (kanan.length) {
      var gw = kanan.length * (bw + sg) - sg, gt = "Disetujui Oleh", gtw = FB.widthOfTextAtSize(gt, 9);
      page.drawText(gt, { x: kx + (gw - gtw) / 2, y: by + 5, size: 9, font: FB, color: NAVY });
      page.drawLine({ start: { x: kx, y: by + 1 }, end: { x: kx + gw, y: by + 1 }, thickness: 1, color: GOLD });
    }
    for (var i = 0; i < slots.length; i++) {
      var x = slots[i].x, t = slots[i].t || {}, top = by, hh = 17, th = 42, lab = t.label || "";
      if (slots[i].kanan && /^(Penyetuju|Atasan Langsung)$/.test(lab) === false) lab = "";
      if (slots[i].kanan && lab === "Penyetuju") lab = "";
      page.drawRectangle({ x: x, y: top - BH, width: bw, height: BH, borderColor: NAVY, borderWidth: .8, color: rgb(1, 1, 1) });
      page.drawRectangle({ x: x, y: top - hh, width: bw, height: hh, color: NAVY }); page.drawRectangle({ x: x, y: top - hh - 1.4, width: bw, height: 1.4, color: GOLD });
      var rl = lab ? bungkus(FB, 7.5, lab, bw - 6) : []; rl.slice(0, 2).forEach(function (l, k) { var w = FB.widthOfTextAtSize(l, 7.5); page.drawText(l, { x: x + (bw - w) / 2, y: top - 7.5 - k * 8 - (rl.length === 1 ? 3 : 0), size: 7.5, font: FB, color: rgb(1, 1, 1) }); });
      var ty = top - hh - 1.4;
      if (t.img) {
        try {
          var im = /^data:image\/png/.test(t.img) ? await doc.embedPng(t.img) : await doc.embedJpg(t.img), sc = Math.min((bw - 12) / im.width, (th - 6) / im.height);
          page.drawImage(im, { x: x + (bw - im.width * sc) / 2, y: ty - th + (th - im.height * sc) / 2, width: im.width * sc, height: im.height * sc });
        } catch (e) { }
      } else { var tt = "Tanda tangan", tw = F.widthOfTextAtSize(tt, 5.5); page.drawText(tt, { x: x + (bw - tw) / 2, y: ty - th + 3, size: 5.5, font: F, color: hex("#9db0bc") }); }
      var ny = ty - th; page.drawRectangle({ x: x, y: ny - (BH - hh - 1.4 - th), width: bw, height: BH - hh - 1.4 - th, color: PALE }); page.drawLine({ start: { x: x, y: ny }, end: { x: x + bw, y: ny }, thickness: .4, color: LINE });
      page.drawText("Nama", { x: x + (bw - F.widthOfTextAtSize("Nama", 5.8)) / 2, y: ny - 8, size: 5.8, font: F, color: MUT });
      if (t.nama) { bungkus(FB, 7.5, t.nama, bw - 8).slice(0, 2).forEach(function (l, k) { var w = FB.widthOfTextAtSize(l, 7.5); page.drawText(l, { x: x + (bw - w) / 2, y: ny - 17 - k * 8.5, size: 7.5, font: FB, color: INK }); }); }
      if (t.waktu) { var tg = asc(t.waktu), w = F.widthOfTextAtSize(tg, 6); page.drawText(tg, { x: x + (bw - w) / 2, y: ny - (BH - hh - 1.4 - th) + 4, size: 6, font: F, color: MUT }); }
    }
    if (opts.status === "Ditolak") {
      var p0 = pages[pages.length - 1], st = "DITOLAK", sz = 46, sw = FB.widthOfTextAtSize(st, sz);
      p0.drawText(st, { x: PW / 2 - sw / 2 * Math.cos(.28), y: PH / 2 - 10 - sw / 2 * Math.sin(.28) + 40, size: sz, font: FB, color: rgb(.75, .22, .17), opacity: .55, rotate: L.degrees(16) });
      if (opts.tolakOleh) { var st2 = asc("oleh " + opts.tolakOleh + (opts.alasanTolak ? ": " + opts.alasanTolak : "")).slice(0, 90), w2 = F.widthOfTextAtSize(st2, 9); p0.drawText(st2, { x: PW / 2 - w2 / 2, y: PH / 2 - 30, size: 9, font: F, color: rgb(.75, .22, .17) }); }
    }
    var tgl = new Date().toLocaleDateString("id-ID");
    pages.forEach(function (pg, i) { pg.drawText("Halaman " + (i + 1) + " dari " + pages.length, { x: PW - M - 62, y: M - 16, size: 7, font: F, color: MUT }); pg.drawText("Dokumen dibuat dari sistem Gudang SCTK, " + tgl + (d.nomor ? " - " + d.nomor : ""), { x: M, y: M - 16, size: 7, font: F, color: MUT }); });
    if (opts.lampiranBytes && opts.lampiranBytes.length) {
      var src = await L.PDFDocument.load(opts.lampiranBytes, { ignoreEncryption: true }), cp = await doc.copyPages(src, src.getPageIndices()); cp.forEach(function (p) { doc.addPage(p); });
    }
    return await doc.save();
  }
  W.PengajuanPdf = { buatPdf: buatPdf, buatBundle: buatBundle, asc: asc };
})(window);
