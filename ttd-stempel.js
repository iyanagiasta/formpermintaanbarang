/* Menempel tanda tangan penyetuju ke PDF bawaan Accurate (PO dan Form Pengajuan Uang Muka).
   Murni (tidak menyentuh halaman) agar dapat diuji. Letak kotak dicari dari TEKS di PDF (bukan koordinat tetap),
   jadi tetap benar bila jumlah baris barang berubah. Masukan halaman = [{w,h,items:[{s,x,y,w,h}]}] dari pdf.js
   (sama dengan pembaca PO). Y dihitung dari atas halaman.
   Tanda tangan di sini berupa GAMBAR + keterangan + kode verifikasi + QR, bukan tanda tangan digital bersertifikat. */
(function (root) {
  'use strict';
  var T = {};
  function norm(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().toLowerCase(); }
  function semuaTeks(hal) { var t = []; hal.forEach(function (h) { h.items.forEach(function (i) { t.push(i.s); }); }); return t.join(' '); }
  /** Semua bilangan di teks, hanya angkanya (titik/koma pemisah dibuang). */
  function bilangan(teks) { var m = String(teks || '').match(/\d[\d.,]*/g) || []; return m.map(function (x) { return Number(x.replace(/[.,]/g, '')); }).filter(function (n) { return isFinite(n); }); }
  function pusat(it) { return it.x + it.w / 2; }

  /** Letak kotak tanda tangan. Hasil {ok, hal, cx, top, bottom, nama, judul, nameItem} atau {ok:false, msg}. */
  T.cariLetak = function (jenis, hal) {
    var pi, i, it;
    if (jenis === 'UMO') {
      for (pi = hal.length - 1; pi >= 0; pi--) {
        var its = hal[pi].items;
        for (i = 0; i < its.length; i++) {
          it = its[i];
          if (/^kepala departemen\s*\/\s*direktur$/.test(norm(it.s))) {
            var top = it.y + 7, bottom = Math.min(top + 72, hal[pi].h - 8);
            return {ok: true, hal: pi, cx: pusat(it), top: top, bottom: bottom, nama: '', judul: it, boxW: 142};
          }
        }
      }
      return {ok: false, msg: 'Tulisan "Kepala Departemen/Direktur" tidak ditemukan di PDF. Pastikan ini PDF Form Pengajuan Uang Muka dari Accurate.'};
    }
    for (pi = hal.length - 1; pi >= 0; pi--) {
      var items = hal[pi].items.filter(function (x) { return String(x.s).trim(); }), pem = null, per = null;
      items.forEach(function (x) { if (!pem && /^pihak pembeli$/.test(norm(x.s))) pem = x; });
      if (!pem) continue;
      items.forEach(function (x) { if (!per && x.y > pem.y && x.y < pem.y + 24 && /sarana catur tirta/.test(norm(x.s))) per = x; });
      var batasAtas = per ? per.y : pem.y, judul = null, nameIt = null;
      /* jabatan: baris teks tepat di bawah nama, di kolom pembeli */
      var kolom = items.filter(function (x) { return x.y > batasAtas + 14 && x.y < batasAtas + 90 && Math.abs(pusat(x) - (per ? pusat(per) : pusat(pem))) < 110 && x.x > pem.x - 70; }).sort(function (a, b) { return a.y - b.y; });
      if (kolom.length >= 2) { judul = kolom[kolom.length - 1]; nameIt = kolom[kolom.length - 2]; }
      else if (kolom.length === 1) { nameIt = kolom[0]; }
      if (nameIt) {
        var nameTop = nameIt.y - (nameIt.h || 9), topB = (per ? per.y : pem.y) + 4, bot = nameTop - 1;
        if (bot - topB < 18) topB = bot - 26;
        return {ok: true, hal: pi, cx: pusat(nameIt), top: topB, bottom: bot, nama: String(nameIt.s).trim(), judul: judul, nameItem: nameIt, boxW: 110};
      }
      if (per) return {ok: true, hal: pi, cx: pusat(per), top: per.y + 6, bottom: per.y + 40, nama: '', judul: null, boxW: 110};
    }
    return {ok: false, msg: 'Kotak tanda tangan "PIHAK PEMBELI" tidak ditemukan di PDF. Pastikan ini PDF PO dari Accurate.'};
  };

  /** Pemeriksaan sebelum menempel. masalah[] kosong = aman ditempel otomatis. */
  T.periksa = function (jenis, hal, bahan) {
    var m = [], lt = T.cariLetak(jenis, hal);
    if (!lt.ok) return {ok: false, masalah: [lt.msg], letak: lt};
    var teks = semuaTeks(hal), nums = bilangan(teks), tot = Math.round(Number(bahan.total) || 0);
    if (jenis === 'PO') {
      var kn = String(bahan.nomor || '').replace(/\s+/g, '').toLowerCase();
      if (!kn || teks.replace(/\s+/g, '').toLowerCase().indexOf(kn) < 0) m.push('Nomor PO ' + bahan.nomor + ' tidak ada di PDF. Mungkin PDF yang terunggah milik PO lain.');
    }
    if (tot > 0 && !nums.some(function (n) { return Math.abs(n - tot) <= 1; })) m.push('Total ' + String(tot).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' di sistem tidak ditemukan di PDF. Isi PDF mungkin berbeda dari data yang disetujui.');
    if (jenis === 'PO' && lt.nama) {
      var dep = norm(String(bahan.penyetuju || '').split(/\s+/)[0]);
      if (dep && norm(lt.nama).indexOf(dep) < 0) m.push('Nama di kotak tanda tangan PDF ("' + lt.nama + '") berbeda dari penyetuju di sistem ("' + bahan.penyetuju + '").');
    }
    return {ok: m.length === 0, masalah: m, letak: lt};
  };

  function dataUrlBytes(u) {
    var m = /^data:([^;]+);base64,(.*)$/.exec(String(u || '')); if (!m) throw new Error('Gambar tanda tangan tidak terbaca.');
    var bin = typeof atob === 'function' ? atob(m[2]) : Buffer.from(m[2], 'base64').toString('binary'), a = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return {mime: m[1], bytes: a};
  }
  T.dataUrlBytes = dataUrlBytes;

  /** Pemetaan koordinat tampilan (x ke kanan, y ke bawah dari pojok kiri atas, seperti pdf.js) ke koordinat halaman PDF; mendukung halaman diputar 0/90/180/270. */
  function peta(W, H, rot) {
    return {
      p: function (vx, vy) { return rot === 90 ? {x: vy, y: vx} : rot === 180 ? {x: W - vx, y: vy} : rot === 270 ? {x: W - vy, y: H - vx} : {x: vx, y: H - vy}; },
      rot: rot
    };
  }
  function gambarQR(g, matriks, vx, vyAtas, ukuran) {
    var n = matriks.length, q = 2, sel = ukuran / (n + 2 * q);
    g.rect(vx, vyAtas, ukuran, ukuran, g.putih);
    for (var r = 0; r < n; r++) {
      var c = 0;
      while (c < n) {
        if (!matriks[r][c]) { c++; continue; }
        var c0 = c; while (c < n && matriks[r][c]) c++;
        g.rect(vx + (q + c0) * sel, vyAtas + (q + r) * sel, (c - c0) * sel, sel, g.hitam);
      }
    }
  }

  /** Menempel tanda tangan. PL = PDFLib. Mengembalikan Promise<Uint8Array>. bahan = hasil ttdBahan dari server. */
  T.stempel = async function (PL, bytes, hal, jenis, bahan) {
    var lt = T.cariLetak(jenis, hal); if (!lt.ok) throw new Error(lt.msg);
    var doc = await PL.PDFDocument.load(bytes), pg = doc.getPages()[lt.hal]; if (!pg) throw new Error('Halaman tanda tangan tidak ada.');
    var rot = pg.getRotation ? ((pg.getRotation().angle % 360) + 360) % 360 : 0; if (rot % 90 !== 0) throw new Error('Rotasi halaman PDF tidak dikenal.');
    var m = peta(pg.getWidth(), pg.getHeight(), rot), W = hal[lt.hal].w, abu = PL.rgb(0.15, 0.15, 0.2);
    var im = dataUrlBytes(bahan.ttd), img = /png/i.test(im.mime) ? await doc.embedPng(im.bytes) : await doc.embedJpg(im.bytes);
    var font = await doc.embedFont(PL.StandardFonts.Helvetica), fb = await doc.embedFont(PL.StandardFonts.HelveticaBold);
    var qr = root.QRMini ? root.QRMini.matriks(bahan.verUrl) : null;
    var g = {
      putih: PL.rgb(1, 1, 1), hitam: PL.rgb(0, 0, 0),
      rect: function (vx, vyAtas, w, h, warna) {
        var a = m.p(vx, vyAtas), b = m.p(vx + w, vyAtas + h);
        pg.drawRectangle({x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(b.x - a.x), height: Math.abs(b.y - a.y), color: warna});
      },
      img: function (vx, vyBawah, w, h) { var a = m.p(vx, vyBawah); pg.drawImage(img, {x: a.x, y: a.y, width: w, height: h, rotate: PL.degrees(rot)}); },
      txt: function (s, vx, vyDasar, ukuran, f) { var a = m.p(vx, vyDasar); pg.drawText(s, {x: a.x, y: a.y, size: ukuran, font: f, color: abu, rotate: PL.degrees(rot)}); },
      tengah: function (s, cx, vyDasar, ukuran, f) { var w = f.widthOfTextAtSize(s, ukuran); g.txt(s, Math.max(2, Math.min(W - w - 2, cx - w / 2)), vyDasar, ukuran, f); }
    };
    var tgl = bahan.waktu || '';
    if (jenis === 'PO') {
      var maxH = Math.max(18, Math.min(34, lt.bottom - lt.top)), s = Math.min(lt.boxW / img.width, maxH / img.height), w = img.width * s, h = img.height * s;
      g.img(lt.cx - w / 2, lt.bottom, w, h);
      var yJ = lt.judul ? lt.judul.y : lt.bottom + 22;
      g.tengah('Ditandatangani elektronik', lt.cx, yJ + 8.5, 5.5, fb); g.tengah(bahan.penyetuju + ' - ' + tgl, lt.cx, yJ + 15, 5.5, font); g.tengah('Kode verifikasi ' + bahan.kode, lt.cx, yJ + 21.5, 5.5, font);
      if (qr) { var qx = (lt.nameItem ? lt.nameItem.x : lt.cx - 40) - 40; if (qx > 4) gambarQR(g, qr, qx, yJ + 2 - 36, 36); }
    } else {
      var kiri = lt.cx - lt.boxW / 2, s2 = Math.min((lt.boxW - 12) / img.width, 36 / img.height), w2 = img.width * s2, h2 = img.height * s2;
      g.img(lt.cx - w2 / 2, lt.top + 2 + h2, w2, h2);
      var y0 = lt.top + 46, xt = kiri + 6;
      [['Ditandatangani elektronik', fb], [bahan.penyetuju, font], [tgl, font], ['Kode ' + bahan.kode, font]].forEach(function (b, i) { g.txt(b[0], xt, y0 + i * 6.6, 5.5, b[1]); });
      if (qr) gambarQR(g, qr, kiri + lt.boxW - 36, lt.top + 38, 32);
    }
    doc.setSubject('Ditandatangani elektronik: ' + bahan.penyetuju + ' ' + tgl + ' - kode ' + bahan.kode);
    return await doc.save();
  };

  /** PDF gabungan: hanya halaman form UMO (indeks halUmo, mulai 0) yang dicari kotak tanda tangannya, supaya lampiran tidak ikut terbaca. */
  T.halamanSaja = function (hal, idx) { return hal.map(function (h, i) { return {w: h.w, h: h.h, items: i === idx ? h.items : []}; }); };
  T.periksaGabungan = function (hal, halUmo, bahan) { if (!(halUmo >= 0) || halUmo >= hal.length) return {ok: false, masalah: ['Halaman form UMO tidak ada di PDF gabungan.']}; return T.periksa('UMO', T.halamanSaja(hal, halUmo), bahan); };
  T.stempelGabungan = async function (PL, bytes, hal, halUmo, bahan) { return T.stempel(PL, bytes, T.halamanSaja(hal, halUmo), 'UMO', bahan); };
  /** Memeriksa hasil tempel dengan membaca ulang PDF: jumlah halaman sama, dan halaman form memuat keterangan serta kode verifikasi. */
  T.cekHasil = function (halSebelum, halSesudah, halUmo, bahan) {
    if (halSesudah.length !== halSebelum.length) return {ok: false, msg: 'Jumlah halaman berubah setelah ditempel (' + halSebelum.length + ' menjadi ' + halSesudah.length + ').'};
    var p = halSesudah[halUmo]; if (!p) return {ok: false, msg: 'Halaman form tidak ditemukan setelah ditempel.'};
    var teks = p.items.map(function (i) { return i.s; }).join(' ').replace(/\s+/g, '').toLowerCase();
    if (teks.indexOf('ditandatanganielektronik') < 0) return {ok: false, msg: 'Keterangan tanda tangan tidak terbaca pada hasil.'};
    if (teks.indexOf(String(bahan.kode).replace(/\s+/g, '').toLowerCase()) < 0) return {ok: false, msg: 'Kode verifikasi tidak terbaca pada hasil.'};
    return {ok: true};
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = T;
  root.TTD = T;
})(typeof window !== 'undefined' ? window : globalThis);
