/* pdf-realisasi.js (T59) - PDF Realisasi UMO bertema BPB (header biru navy, garis emas, kotak tanda tangan).
   Membuat: Form Pengajuan Uang Muka, Form Realisasi, Laporan Kas Kecil, lalu menggabungkannya dengan nota dan lampiran
   menjadi SATU PDF. Bergantung pada pdf-lib (window.PDFLib), pdfpengajuan.js dan kompres.js. */
(function (W) {
  "use strict";
  var PW = 841.89, PH = 595.28, M = 28.3, CW = PW - 2 * M;
  function asc(s) { return String(s == null ? "" : s).replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/[\r\n\t]+/g, " ").replace(/[^\x20-\x7E¡-ÿ]/g, "?"); }
  function rp(n) { return n == null || n === "" ? "" : "Rp " + Math.round(Number(n)).toLocaleString("id-ID"); }
  function rpK(n) { n = Number(n) || 0; return n < 0 ? "(" + rp(-n) + ")" : rp(n); }
  function tgl(s) { var m = /^(\d{4})-(\d\d)-(\d\d)/.exec(String(s || "")); return m ? m[3] + "/" + m[2] + "/" + m[1] : String(s || ""); }
  function hex(h) { var n = parseInt(h.replace("#", ""), 16); return W.PDFLib.rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255); }
  function bungkus(font, size, text, maxW) {
    var ws = asc(text).split(/\s+/).filter(Boolean), lines = [], cur = "";
    ws.forEach(function (w) {
      while (font.widthOfTextAtSize(w, size) > maxW) { var k = w.length; while (k > 1 && font.widthOfTextAtSize(w.slice(0, k), size) > maxW) k--; if (cur) { lines.push(cur); cur = ""; } lines.push(w.slice(0, k)); w = w.slice(k); }
      var t = cur ? cur + " " + w : w; if (font.widthOfTextAtSize(t, size) <= maxW) cur = t; else { lines.push(cur); cur = w; }
    });
    if (cur) lines.push(cur); return lines.length ? lines : [""];
  }
  async function baru(judul, nomor) {
    var L = W.PDFLib, doc = await L.PDFDocument.create();
    doc.setTitle(judul + " " + (nomor || "")); doc.setCreator("Gudang SCTK"); doc.setProducer("Gudang SCTK");
    var c = { L: L, doc: doc, pages: [], judul: judul, nomor: nomor, rgb: L.rgb };
    c.F = await doc.embedFont(L.StandardFonts.Helvetica); c.FB = await doc.embedFont(L.StandardFonts.HelveticaBold); c.FT = await doc.embedFont(L.StandardFonts.TimesRomanBold);
    c.NAVY = hex("#17588f"); c.GOLD = hex("#b8975a"); c.PALE = hex("#eef6fa"); c.LINE = hex("#b6cad6"); c.BORD = hex("#9fb8c6"); c.INK = hex("#0d1f2d"); c.MUT = hex("#5b6b75"); c.ALT = hex("#f5fafc"); c.RED = L.rgb(.75, .22, .17);
    halaman(c, true); return c;
  }
  function halaman(c, pertama) {
    c.page = c.doc.addPage([PW, PH]); c.pages.push(c.page); c.y = PH - M; if (pertama) kepala(c);
  }
  function kepala(c) {
    var rgb = c.rgb, p = c.page, bh = 54, top = PH, n = 70, c0 = [6, 32, 58], c1 = [10, 58, 92], c2 = [15, 111, 147];
    for (var i = 0; i < n; i++) { var t = i / (n - 1), a = t < .55 ? c0 : c1, b = t < .55 ? c1 : c2, u = t < .55 ? t / .55 : (t - .55) / .45; p.drawRectangle({ x: i * PW / n, y: top - bh, width: PW / n + 1, height: bh, color: rgb((a[0] + (b[0] - a[0]) * u) / 255, (a[1] + (b[1] - a[1]) * u) / 255, (a[2] + (b[2] - a[2]) * u) / 255) }); }
    p.drawRectangle({ x: 0, y: top - bh - 3.4, width: PW, height: 3.4, color: c.GOLD });
    var w1 = c.FT.widthOfTextAtSize(c.judul, 15); p.drawText(c.judul, { x: (PW - w1) / 2, y: top - 26, size: 15, font: c.FT, color: rgb(1, 1, 1) });
    var t2 = "PT SARANA CATUR TIRTA KELOLA", w2 = c.FB.widthOfTextAtSize(t2, 8); p.drawText(t2, { x: (PW - w2) / 2, y: top - 40, size: 8, font: c.FB, color: hex("#e3c98f") });
    c.y = top - bh - 3.4 - 12;
  }
  function kotak(c, x, yy, w, h, o) { c.page.drawRectangle(Object.assign({ x: x, y: yy, width: w, height: h, borderColor: c.BORD, borderWidth: .6 }, o || {})); }
  function medan(c, x, w, label, val) {
    c.page.drawText(asc(label), { x: x, y: c.y - 7, size: 7, font: c.FB, color: c.NAVY });
    var h = 15; kotak(c, x, c.y - 9 - h, w, h, { color: c.PALE });
    var s = asc(val || "-"), sz = 8.5; while (sz > 6 && c.F.widthOfTextAtSize(s, sz) > w - 8) sz -= .5;
    while (c.F.widthOfTextAtSize(s, sz) > w - 8 && s.length > 3) s = s.slice(0, -2);
    c.page.drawText(s, { x: x + 4, y: c.y - 9 - h + 4.6, size: sz, font: c.F, color: c.INK });
  }
  /* tabel bergulir: col = lebar kolom, kanan = indeks kolom rata kanan */
  function tabelBaris(c, col, kanan, cells, jenis, o, ulangKepala) {
    var f = jenis === "head" || jenis === "tot" ? c.FB : c.F, sz = 7.5, lh = 9.2, pad = 3, cl = cells.map(function (t, i) { return bungkus(f, sz, t, col[i] - 2 * pad); });
    var h = Math.max.apply(null, cl.map(function (a) { return a.length; })) * lh + 2 * pad - 1;
    if (c.y - h < M + 36) { halaman(c, false); if (jenis !== "head" && ulangKepala) tabelBaris(c, col, kanan, ulangKepala, "head"); }
    var x = M, rgb = c.rgb;
    cells.forEach(function (t, i) {
      var bg = jenis === "head" ? c.NAVY : (o && o.alt ? c.ALT : rgb(1, 1, 1)), tc = jenis === "head" ? rgb(1, 1, 1) : c.INK, rt = kanan.indexOf(i) >= 0;
      c.page.drawRectangle({ x: x, y: c.y - h, width: col[i], height: h, color: bg, borderColor: jenis === "head" ? hex("#2c5876") : c.LINE, borderWidth: .4 });
      cl[i].forEach(function (l, k) { var w = f.widthOfTextAtSize(l, sz); c.page.drawText(l, { x: rt && jenis !== "head" ? x + col[i] - pad - w : x + pad, y: c.y - pad - sz - k * lh + 1.6, size: sz, font: f, color: tc }); });
      x += col[i];
    });
    c.page.drawRectangle({ x: M, y: c.y - h, width: CW, height: h, borderColor: c.NAVY, borderWidth: .5 }); c.y -= h;
  }
  /* kotak tanda tangan: [{label, nama, waktu, img}] */
  async function kotakTtd(c, list) {
    var BH = 98, sg = 12, n = list.length, bw = Math.min(190, (CW - (n - 1) * sg) / n), tot = n * bw + (n - 1) * sg, x0 = M + (CW - tot) / 2, rgb = c.rgb;
    if (c.y < M + BH + 30) halaman(c, false);
    var by = Math.min(c.y - 6, M + BH + 14);
    for (var i = 0; i < n; i++) {
      var t = list[i] || {}, x = x0 + i * (bw + sg), top = by, hh = 17, th = 42, p = c.page;
      p.drawRectangle({ x: x, y: top - BH, width: bw, height: BH, borderColor: c.NAVY, borderWidth: .8, color: rgb(1, 1, 1) });
      p.drawRectangle({ x: x, y: top - hh, width: bw, height: hh, color: c.NAVY }); p.drawRectangle({ x: x, y: top - hh - 1.4, width: bw, height: 1.4, color: c.GOLD });
      var rl = bungkus(c.FB, 7.5, t.label || "", bw - 6); rl.slice(0, 2).forEach(function (l, k) { var w = c.FB.widthOfTextAtSize(l, 7.5); p.drawText(l, { x: x + (bw - w) / 2, y: top - 7.5 - k * 8 - (rl.length === 1 ? 3 : 0), size: 7.5, font: c.FB, color: rgb(1, 1, 1) }); });
      var ty = top - hh - 1.4;
      if (t.img) {
        try { var im = /^data:image\/png/.test(t.img) ? await c.doc.embedPng(t.img) : await c.doc.embedJpg(t.img), sc = Math.min((bw - 12) / im.width, (th - 6) / im.height); p.drawImage(im, { x: x + (bw - im.width * sc) / 2, y: ty - th + (th - im.height * sc) / 2, width: im.width * sc, height: im.height * sc }); } catch (e) { /* tanpa gambar */ }
      } else { var tt = t.menunggu ? "Menunggu tanda tangan" : "Tanda tangan", tw = c.F.widthOfTextAtSize(tt, 5.8); p.drawText(tt, { x: x + (bw - tw) / 2, y: ty - th / 2 - 2, size: 5.8, font: c.F, color: hex("#9db0bc") }); }
      var ny = ty - th, rest = BH - hh - 1.4 - th; p.drawRectangle({ x: x, y: ny - rest, width: bw, height: rest, color: c.PALE }); p.drawLine({ start: { x: x, y: ny }, end: { x: x + bw, y: ny }, thickness: .4, color: c.LINE });
      p.drawText("Nama", { x: x + (bw - c.F.widthOfTextAtSize("Nama", 5.8)) / 2, y: ny - 8, size: 5.8, font: c.F, color: c.MUT });
      if (t.nama) bungkus(c.FB, 7.5, t.nama, bw - 8).slice(0, 2).forEach(function (l, k) { var w = c.FB.widthOfTextAtSize(l, 7.5); p.drawText(l, { x: x + (bw - w) / 2, y: ny - 17 - k * 8.5, size: 7.5, font: c.FB, color: c.INK }); });
      if (t.waktu) { var tg = asc(t.waktu), w = c.F.widthOfTextAtSize(tg, 6); p.drawText(tg, { x: x + (bw - w) / 2, y: ny - rest + 4, size: 6, font: c.F, color: c.MUT }); }
    }
    c.y = by - BH - 8;
  }
  function kaki(c) {
    var d = new Date().toLocaleDateString("id-ID");
    c.pages.forEach(function (pg, i) { pg.drawText("Halaman " + (i + 1) + " dari " + c.pages.length, { x: PW - M - 62, y: M - 16, size: 7, font: c.F, color: c.MUT }); pg.drawText("Dokumen dibuat dari sistem Gudang SCTK, " + d + (c.nomor ? " - " + c.nomor : ""), { x: M, y: M - 16, size: 7, font: c.F, color: c.MUT }); });
  }
  function waktuPutus(ps) { return ps && ps.status === "Disetujui" && ps.waktuPutus ? String(ps.waktuPutus) : ""; }
  function boxes(d) {
    var ps1 = d.persetujuan || {}, ps2 = d.persetujuan2 || {}, t = d.ttd || {}, p = d.penandatangan || {};
    var s1 = ps1.status === "Disetujui", s2 = ps2.status === "Disetujui";
    return {
      dibuat: { nama: p.dibuat, img: t.dibuat },
      diperiksa: { nama: p.diperiksa, img: s2 ? t.diperiksa : "", waktu: waktuPutus(ps2), menunggu: !s2 },
      disetujui: { nama: p.disetujui, img: s1 ? t.disetujui : "", waktu: waktuPutus(ps1), menunggu: !s1 }
    };
  }

  /* ---- Form Pengajuan Uang Muka (rantai tanda tangan sama dengan pengajuan asli) ---- */
  async function formPengajuan(d) {
    var pj = d.pengajuan || {}, data = { nomor: pj.nomor, tgl: pj.tgl, jenis: pj.jenis || "UMO", kategori: pj.kategori, pengaju: pj.pengaju, dept: pj.dept, ppbj: pj.ppbj, proyek: pj.proyek, perihal: pj.perihal, items: pj.items || [], total: pj.total, darurat: pj.darurat, alasanDarurat: pj.alasanDarurat, revisiDari: pj.revisiDari };
    return await W.PengajuanPdf.buatPdfBeli({ judul: "FORM PENGAJUAN UANG MUKA", data: data, ttd: pj.ttd || [], status: pj.status });
  }

  /* ---- Form Realisasi ---- */
  async function formRealisasi(d) {
    var c = await baru("FORM REALISASI PENGAJUAN UANG MUKA", d.nomor), gap = 10, fw = (CW - 2 * gap) / 3;
    medan(c, M, fw, "Nomor Pengajuan", d.nomor); medan(c, M + fw + gap, fw, "Diajukan Oleh", d.pengaju); medan(c, M + 2 * (fw + gap), fw, "Departemen", d.dept); c.y -= 30;
    medan(c, M, fw, "No PPBJ", d.ppbj || "-"); medan(c, M + fw + gap, 2 * fw + gap, "Proyek", d.proyek || "-"); c.y -= 30;
    medan(c, M, CW, "Keperluan", d.perihal); c.y -= 30;
    medan(c, M, fw, "Uang Muka", rp(d.uangMuka)); medan(c, M + fw + gap, fw, "Aktual", rp(d.aktual)); medan(c, M + 2 * (fw + gap), fw, d.selisih > 0 ? "Lebih (harus dikembalikan / ditagih)" : "Lebih / (kurang)", rpK(d.selisih)); c.y -= 30;
    medan(c, M, CW, "Keterangan", "Terlampir rincian realisasi, laporan kas kecil, nota, dan lampiran pendukung dalam satu berkas ini"); c.y -= 36;
    var col = [64, 0, 90, 100, 100]; col[1] = CW - col[0] - col[2] - col[3] - col[4]; var HD = ["Tanggal", "Uraian", "No Akun", "No Bukti", "Nilai"];
    tabelBaris(c, col, [4], HD, "head");
    (d.entries || []).forEach(function (e, i) { tabelBaris(c, col, [4], [tgl(e.tgl), e.uraian + (e.cat ? " (" + e.cat + ")" : ""), e.akun || "-", e.bukti || "-", rp(e.nilai)], "row", { alt: i % 2 === 1 }, HD); });
    tabelBaris(c, col, [4], ["", "Total aktual", "", "", rp(d.aktual)], "tot", null, HD); c.y -= 12;
    var b = boxes(d);
    await kotakTtd(c, [{ label: "Yang Mengajukan", nama: b.dibuat.nama, img: b.dibuat.img }, { label: "Atasan Langsung Departemen", nama: b.diperiksa.nama, img: b.diperiksa.img, waktu: b.diperiksa.waktu, menunggu: b.diperiksa.menunggu }, { label: "Disetujui", nama: b.disetujui.nama, img: b.disetujui.img, waktu: b.disetujui.waktu, menunggu: b.disetujui.menunggu }]);
    kaki(c); return await c.doc.save();
  }

  /* ---- Laporan Kas Kecil ---- */
  async function kasKecil(d) {
    var c = await baru("LAPORAN KAS KECIL PURCHASING", d.nomor), gap = 10, fw = (CW - gap) / 2;
    medan(c, M, fw, "Pengajuan", d.nomor + " - " + d.pengaju + (d.dept ? " (" + d.dept + ")" : "")); medan(c, M + fw + gap, fw, "Keperluan", d.perihal); c.y -= 34;
    var col = [58, 78, 0, 80, 74, 74, 62, 0]; var sisa = CW - col.reduce(function (a, b) { return a + b; }, 0); col[2] = Math.round(sisa * .62); col[7] = sisa - col[2];
    var HD = ["Tanggal", "No PPBJ", "Uraian", "Keterangan", "Penerimaan", "Pengeluaran", "Kode Akun", "Keterangan"];
    tabelBaris(c, col, [4, 5], HD, "head");
    var saldo = Number(d.uangMuka) || 0, tg0 = d.pengajuan && d.pengajuan.tgl ? tgl(d.pengajuan.tgl) : "";
    tabelBaris(c, col, [4, 5], [tg0, d.ppbj || "", "Kas Masuk", d.perihal, rp(d.uangMuka), "", "", ""], "row", null, HD);
    (d.entries || []).forEach(function (e, i) { saldo = Math.round((saldo - e.nilai) * 100) / 100; tabelBaris(c, col, [4, 5], [tgl(e.tgl), d.ppbj || "", e.uraian, e.bukti || "", "", rp(e.nilai), e.akun || "", e.cat || ""], "row", { alt: i % 2 === 0 }, HD); });
    tabelBaris(c, col, [4, 5], ["", "", "Saldo akhir", "", "", rpK(saldo), "", saldo < 0 ? "Kurang dibayar" : (saldo > 0 ? "Sisa dikembalikan" : "")], "tot", null, HD); c.y -= 12;
    var b = boxes(d);
    await kotakTtd(c, [{ label: "Dibuat", nama: b.dibuat.nama, img: b.dibuat.img }, { label: "Diperiksa", nama: b.diperiksa.nama, img: b.diperiksa.img, waktu: b.diperiksa.waktu, menunggu: b.diperiksa.menunggu }, { label: "Disetujui", nama: b.disetujui.nama, img: b.disetujui.img, waktu: b.disetujui.waktu, menunggu: b.disetujui.menunggu }]);
    kaki(c); return await c.doc.save();
  }

  /* ---- penggabungan ---- */
  function adalahPdf(b) { return b && b.length > 4 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46; }
  async function keJpeg(item, preset, paksa) {
    var ada = item.bytes, jpg = ada && ada[0] === 0xff && ada[1] === 0xd8;
    if (jpg && !paksa) return { bytes: ada };
    var file = new File([item.bytes], item.nama || "foto", { type: item.mime || "image/jpeg" }), h = await W.Kompres.gambar(file, { preset: preset });
    return { bytes: h.bytes };
  }
  /* item: {judul, nama, mime, bytes:Uint8Array}. Gambar diberi judul kecil di atasnya, PDF disalin utuh (judul dicetak di halaman pertama). */
  async function tambahLampiran(doc, L, HF, item, preset, paksa) {
    if (adalahPdf(item.bytes)) {
      var src = await L.PDFDocument.load(item.bytes, { ignoreEncryption: true }), cp = await doc.copyPages(src, src.getPageIndices());
      cp.forEach(function (p, i) { doc.addPage(p); if (i === 0 && item.judul) { var s = asc(item.judul).slice(0, 120), sz = 7; p.drawText(s, { x: 14, y: 8, size: sz, font: HF, color: L.rgb(.35, .4, .45) }); } });
      return;
    }
    var g = await keJpeg(item, preset, paksa), im = await doc.embedJpg(g.bytes), land = im.width > im.height * 1.15, pw = land ? 841.89 : 595.28, ph = land ? 595.28 : 841.89, m = 28, top = 44, sc = Math.min((pw - 2 * m) / im.width, (ph - m - top) / im.height), dw = im.width * sc, dh = im.height * sc, p = doc.addPage([pw, ph]);
    p.drawText(asc(item.judul || item.nama || "Lampiran").slice(0, 120), { x: m, y: ph - 28, size: 9, font: HF, color: L.rgb(.3, .35, .4) });
    p.drawImage(im, { x: (pw - dw) / 2, y: ph - top - dh, width: dw, height: dh });
  }
  /* opts: {d (data rlLaporan), nota:[{judul,nama,mime,bytes}], lampiran:[...], preset, paksaKompres, onProgress}. Hasil Uint8Array. */
  async function gabung(opts) {
    var L = W.PDFLib, d = opts.d, doc = await L.PDFDocument.create(), HF = await doc.embedFont(L.StandardFonts.Helvetica), parts = [await formPengajuan(d), await formRealisasi(d), await kasKecil(d)], i, n = parts.length + (opts.nota || []).length + (opts.lampiran || []).length, k = 0;
    doc.setTitle("Realisasi UMO " + (d.nomor || "")); doc.setCreator("Gudang SCTK"); doc.setProducer("Gudang SCTK");
    for (i = 0; i < parts.length; i++) { var src = await L.PDFDocument.load(parts[i]), cp = await doc.copyPages(src, src.getPageIndices()); cp.forEach(function (p) { doc.addPage(p); }); if (opts.onProgress) opts.onProgress(++k, n); }
    var semua = (opts.nota || []).concat(opts.lampiran || []);
    for (i = 0; i < semua.length; i++) {
      try { await tambahLampiran(doc, L, HF, semua[i], opts.preset || "seimbang", !!opts.paksaKompres); }
      catch (e) { var er = new Error("Berkas \"" + (semua[i].nama || semua[i].judul) + "\" tidak bisa digabung: " + (e && e.message ? e.message : "rusak atau terkunci")); er.nama = semua[i].nama; throw er; }
      if (opts.onProgress) opts.onProgress(++k, n);
    }
    return await doc.save({ useObjectStreams: true });
  }
  W.RealisasiPdf = { formPengajuan: formPengajuan, formRealisasi: formRealisasi, kasKecil: kasKecil, gabung: gabung, adalahPdf: adalahPdf, boxes: boxes };
})(window);
