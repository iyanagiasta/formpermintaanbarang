/* Penamaan berkas unduhan (T60). Satu aturan untuk semua PDF, Excel, dan ZIP yang dibuat sistem:
   - nama sesuai isi (jenis dokumen + nomor/subjek utama, + periode untuk laporan), TANPA tanggal unduh;
   - bagian dipisah " - ", mis. "Pengajuan Pembelian UMO - PBU-SCTK-0001 - Beli meter air.pdf";
   - karakter yang dilarang sistem berkas (\ / : * ? " < > |) menjadi "-";
   - dipotong sekitar 100 karakter (tanpa ekstensi).
   Dua lapis: NB.buat() dipakai langsung oleh dokumen penting; NB.rapikan() adalah pengaman otomatis
   (dipasang pada tautan unduh, XLSX.writeFile, dan jsPDF.save) untuk nama lama bergaya_snake_case atau berakhiran tanggal unduh. */
(function (g) {
  'use strict';
  var MAKS = 100, DIBUAT = {};
  var KECIL = {sd: 1, dan: 1, per: 1, di: 1, ke: 1, dari: 1, vs: 1, atau: 1, yang: 1, untuk: 1};
  function bersihBagian(s) {
    s = String(s == null ? '' : s).replace(/(?:\s*[\\\/:*?"<>|\u0000-\u001f])+\s*/g, '-').replace(/\s+/g, ' ');
    return s.replace(/^[\s.\-]+|[\s.\-]+$/g, '');
  }
  function potong(s, maks) {
    s = String(s);
    if (s.length <= maks) return s;
    return s.slice(0, maks).replace(/[\s.\-]+$/, '');
  }
  /** NB.buat('pdf', 'Pengajuan Pembelian UMO', 'PBU/SCTK/0001', 'Beli meter air') -> "Pengajuan Pembelian UMO - PBU-SCTK-0001 - Beli meter air.pdf" */
  function buat(ext, bagian) {
    var p = Array.prototype.slice.call(arguments, 1), out = [];
    p.forEach(function (x) { var b = bersihBagian(x); if (b) out.push(b); });
    var e = String(ext || '').replace(/^\./, '').toLowerCase();
    var dasar = potong(out.join(' - ') || 'Dokumen', MAKS), hasil = dasar + (e ? '.' + e : '');
    DIBUAT[hasil] = 1;
    return hasil;
  }
  /** "2026-10-01 sd 2026-10-31" (periode laporan, bukan tanggal unduh). */
  function periode(dari, sampai) {
    dari = bersihBagian(dari); sampai = bersihBagian(sampai);
    if (dari && sampai) return dari === sampai ? dari : dari + ' sd ' + sampai;
    return dari || sampai || '';
  }
  function hariIniIso() { var d = new Date(), z = function (n) { return (n < 10 ? '0' : '') + n; }; return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); }
  function judul(kata) {
    return kata.split(' ').map(function (w) {
      if (!w) return w; var l = w.toLowerCase();
      if (KECIL[l]) return l;
      return w.charAt(0).toUpperCase() + w.slice(1);
    }).join(' ');
  }
  /** Pengaman: rapikan nama lama. (1) tanggal unduh di ujung nama dibuang; (2) gaya_snake_case atau huruf kecil semua diubah jadi
      "Judul Per Kata"; (3) karakter terlarang dibersihkan dan nama dipotong. Nama bergaya baru (ada spasi/huruf besar) tidak diubah selain (3). */
  function rapikan(nama) {
    var s = String(nama == null ? '' : nama), m = /^(.*?)(\.(xlsx|xls|pdf|zip|csv))$/i.exec(s);
    if (!m || DIBUAT[s]) return s;
    var dasar = m[1], ext = m[2].toLowerCase(), hi = hariIniIso();
    var mm = /^(.*?)[\s_\-]+(\d{4}-\d{2}-\d{2})$/.exec(dasar);
    if (mm && mm[2] === hi && !/(^|[\s_\-])(sd|sampai|dari)$/i.test(mm[1]) && !/\d{4}-\d{2}-\d{2}$/.test(mm[1])) dasar = mm[1];
    var hc = hi.replace(/-/g, ''), m8 = /^(.*?)[\s_\-]+(\d{8})$/.exec(dasar);
    if (m8 && m8[2] === hc) dasar = m8[1];
    var lama = /^[a-z0-9_+.\- ]+$/.test(dasar) && /[a-z]/.test(dasar), snake = !/\s/.test(dasar) && /_/.test(dasar);
    if (lama || snake) {
      var tgl = [];
      dasar = dasar.replace(/\d{4}-\d{2}-\d{2}/g, function (t) { tgl.push(t); return '\u0001' + (tgl.length - 1) + '\u0001'; });
      dasar = dasar.replace(lama ? /[_\-]+/g : /_+/g, ' ').replace(/\s+/g, ' ').trim();
      dasar = dasar.replace(/\u0001(\d+)\u0001/g, function (t, i) { return tgl[Number(i)]; });
      dasar = judul(dasar);
    }
    var b = bersihBagian(dasar);
    return potong(b || 'Dokumen', MAKS) + ext;
  }
  function pasangAnchor() {
    try {
      var P = g.HTMLAnchorElement && g.HTMLAnchorElement.prototype, d = P && Object.getOwnPropertyDescriptor(P, 'download');
      if (!d || !d.set || d.set.__nb) return;
      var asli = d.set, baru = function (v) { return asli.call(this, rapikan(v)); };
      baru.__nb = 1;
      Object.defineProperty(P, 'download', {get: d.get, set: baru, configurable: true, enumerable: d.enumerable});
    } catch (e) { /* abaikan */ }
  }
  function pasangXlsx() {
    try {
      var X = g.XLSX; if (!X || typeof X.writeFile !== 'function' || X.writeFile.__nb) return;
      var asli = X.writeFile, baru = function (wb, nama) { var a = Array.prototype.slice.call(arguments); a[1] = rapikan(nama); return asli.apply(this, a); };
      baru.__nb = 1; X.writeFile = baru;
    } catch (e) { /* abaikan */ }
  }
  function pasangPdf() {
    try {
      var J = g.jspdf && g.jspdf.jsPDF; if (!J || !J.API || typeof J.API.save !== 'function' || J.API.save.__nb) return;
      var asli = J.API.save, baru = function (nama, opsi) { return asli.call(this, rapikan(nama), opsi); };
      baru.__nb = 1; J.API.save = baru;
    } catch (e) { /* abaikan */ }
  }
  function pasang() { pasangAnchor(); pasangXlsx(); pasangPdf(); }
  pasang();
  // pustaka dimuat belakangan dari CDN pada sebagian halaman: coba lagi sebentar
  var n = 0, t = setInterval(function () { pasang(); if (++n > 60) clearInterval(t); }, 250);
  if (g.addEventListener) g.addEventListener('load', pasang);
  g.NB = {buat: buat, periode: periode, rapikan: rapikan, bersih: bersihBagian, pasang: pasang};
})(typeof window !== 'undefined' ? window : this);
