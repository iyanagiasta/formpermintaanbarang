/* Membaca halaman pertama "Form Pengajuan Uang Muka" dari Accurate (Keperluan, Jumlah, Diajukan oleh/departemen) dan memeriksa kecocokannya
   dengan isian form pembelian. Murni (tanpa halaman) agar dapat diuji. Masukan = [{w,h,items:[{s,x,y,w,h}]}] dari pdf.js (y dari atas). */
(function (root) {
  'use strict';
  var U = {};
  function norm(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().toLowerCase(); }
  function nilai(s) { var m = String(s || '').match(/\d[\d.,]*/); if (!m) return 0; var t = m[0].replace(/[.,](?=\d{3}(\D|$))/g, ''); t = t.replace(',', '.'); var n = Number(t); return isFinite(n) ? Math.round(n) : 0; }
  /** Nilai di sebelah kanan label pada baris yang sama. */
  function sebelah(items, label) {
    var lb = items.filter(function (i) { return norm(i.s) === norm(label); })[0]; if (!lb) return null;
    var bar = items.filter(function (i) { return Math.abs(i.y - lb.y) < 3 && i.x > lb.x + lb.w - 1 && i !== lb; }).sort(function (a, b) { return a.x - b.x; });
    var t = bar.map(function (i) { return i.s; }).join(' ').replace(/\s+/g, ' ').trim().replace(/^:\s*/, '').trim();
    return t;
  }
  /** Hasil {ok, diajukan, keperluan, jumlah}. ok=false bila bukan form uang muka atau teks tidak terbaca (scan/foto). */
  U.bacaForm = function (hal) {
    var p = hal && hal[0]; if (!p || !p.items || !p.items.length) return {ok: false, msg: 'Teks PDF tidak terbaca (mungkin hasil scan atau foto). Isi perihal dan departemen secara manual.'};
    var semua = p.items.map(function (i) { return norm(i.s); }).join(' ');
    if (semua.indexOf('pengajuan uang muka') < 0) return {ok: false, msg: 'Berkas ini tidak tampak seperti "Form Pengajuan Uang Muka" dari Accurate.'};
    var d = sebelah(p.items, 'Diajukan oleh/departemen') || '', k = sebelah(p.items, 'Keperluan') || '', j = sebelah(p.items, 'Jumlah') || '';
    return {ok: true, diajukan: d, keperluan: k, jumlah: nilai(j), jumlahTeks: j};
  };
  /** Pemeriksaan ringan terhadap isian form. Hasil berupa peringatan (tidak memblokir). */
  U.banding = function (info, isian) {
    var w = [];
    if (!info || !info.ok) return w;
    if (info.jumlah > 0 && Math.abs(info.jumlah - Math.round(Number(isian.total) || 0)) > 1) w.push('Jumlah di form Accurate (' + info.jumlah.toLocaleString('id-ID') + ') berbeda dari total rincian barang (' + Math.round(Number(isian.total) || 0).toLocaleString('id-ID') + '). Pastikan keduanya benar.');
    if (!info.keperluan) w.push('Baris Keperluan di form Accurate kosong.');
    return w;
  };
  /** Cocokkan teks "departemen" dari form dengan daftar departemen resmi; kosong bila tidak yakin. */
  U.cocokDept = function (teks, daftar) {
    var t = norm(teks); if (!t) return '';
    for (var i = 0; i < daftar.length; i++) if (norm(daftar[i]) === t) return daftar[i];
    var hit = daftar.filter(function (d) { return new RegExp('(^|[^a-z0-9])' + norm(d).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^a-z0-9])').test(t); });
    return hit.length === 1 ? hit[0] : '';
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = U;
  root.UmoBerkas = U;
})(typeof window !== 'undefined' ? window : globalThis);
