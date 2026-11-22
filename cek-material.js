/* Tambahan 163: kolom Keterangan Cek Material (tab Proyek) yang mudah dipahami.
   - Kata "Rebutan" tampil sebagai "Stok terbatas" (nilai data tetap 'Rebutan').
   - Batang antrean pembagian stok (aturan Tambahan 128) per barang: tiap segmen = satu proyek, garis = stok bebas.
   - Angka tindakan: Perlu order / Tunggu PO / Tunggu barang / Aman / Terpenuhi.
   - Rincian antrean lengkap (No PPBJ + nama proyek) terlipat, dibuka dengan klik (cocok di HP).
   Data dari server: KRG.antre[kode] dan per barang x.ant, x.act, x.kurangA, x.belumPesan, x.tPo.
   Bila server belum diperbarui (data itu tidak ada), tampilan jatuh ke keterangan lama tanpa galat. */
(function (root) {
  'use strict';
  var LBL = {Rebutan: 'Stok terbatas', Kurang: 'Kurang', Cukup: 'Cukup', Terpenuhi: 'Terpenuhi'};
  function stLbl(s) { return LBL[s] || s || ''; }
  function n(v) { v = Number(v) || 0; return (Math.round(v * 1000) / 1000).toLocaleString('id-ID'); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]; }); }
  function kunci(s) { return String(s == null ? '' : s).trim().toUpperCase(); }
  function antre(K, x) {
    if (!K || !K.antre || !x) return null;
    return K.antre[kunci(x.kode)] || null;
  }
  function namaP(s) { return s ? s : '(belum bernama)'; }
  var css = false;
  function gaya() {
    if (css) return; css = true;
    var st = document.createElement('style');
    st.textContent =
      '.cmk-st{display:inline-block;font-weight:700;font-size:12px;padding:2px 8px;border-radius:10px;margin-right:6px}' +
      '.cmk-st.k{background:#f8d7da;color:#8a1c28}.cmk-st.t{background:#fff3cd;color:#7a5b00}.cmk-st.c{background:#d9f0df;color:#14612b}' +
      '.cmk-ac{display:inline-block;font-weight:800;font-size:15px;line-height:1.2}' +
      '.cmk-ac.o{color:var(--red,#a82424)}.cmk-ac.w{color:var(--blu,#17588f)}.cmk-ac.a{color:var(--grn,#14602f)}' +
      '.cmk-sub{display:block;font-size:12px;color:var(--mut,#5a6b78);margin-top:2px}' +
      '.cmk-bt{position:relative;display:flex;height:14px;border-radius:4px;overflow:visible;margin:8px 0 2px;background:rgba(127,127,127,.15);min-width:160px}' +
      '.cmk-bs{position:relative;height:100%;background:#e0565b;border-right:1px solid var(--card,#fff);box-sizing:border-box;overflow:hidden}' +
      '.cmk-bs:first-child{border-radius:4px 0 0 4px}.cmk-bs:last-of-type{border-radius:0 4px 4px 0;border-right:0}' +
      '.cmk-bs i{position:absolute;left:0;top:0;bottom:0;background:#2e9d58}' +
      '.cmk-bs.me{outline:2px solid var(--ink,#1c2a33);outline-offset:-2px;z-index:1}' +
      '.cmk-gr{position:absolute;top:-4px;bottom:-4px;width:0;border-left:2px dashed var(--ink,#1c2a33);z-index:2}' +
      '.cmk-bl{display:flex;justify-content:space-between;font-size:11px;color:var(--mut,#5a6b78);gap:6px}' +
      '.cmk-kal{display:block;font-size:12.5px;margin-top:4px;color:var(--ink,#1c2a33)}' +
      '.cmk-rc{margin-top:4px;font-size:12px}.cmk-rc summary{cursor:pointer;color:var(--blu,#17588f);font-weight:600}' +
      '.cmk-tq{display:grid;grid-template-columns:auto auto 1fr auto auto;gap:2px 10px;margin-top:4px;align-items:baseline}' +
      '.cmk-tq span{white-space:nowrap}.cmk-tq span.nm{white-space:normal}.cmk-tq .h{font-weight:700;color:var(--mut,#5a6b78);font-size:11px}' +
      '.cmk-tq .me{font-weight:800}.cmk-tq .r{text-align:right}.cmk-tq .kr{color:var(--red,#a82424)}.cmk-tq .ok{color:var(--grn,#14602f)}' +
      'tr.cmk-gh td{background:var(--bg2,#eef3f7);font-weight:800;font-size:14px;padding:8px 10px}' +
      'tr.cmk-gh td small{font-weight:400;color:var(--mut,#5a6b78);margin-left:6px}' +
      'html[data-tema=gelap] tr.cmk-gh td{background:rgba(255,255,255,.07)}' +
      'html[data-tema=gelap] .cmk-st.k{background:#5a1f25;color:#ffd6da}html[data-tema=gelap] .cmk-st.t{background:#4d3d0a;color:#ffe9a8}html[data-tema=gelap] .cmk-st.c{background:#174a2a;color:#c9f2d6}' +
      'html[data-tema=gelap] .cmk-ac.w,html[data-tema=gelap] .cmk-rc summary{color:#8cc4ff}html[data-tema=gelap] .cmk-ac.o,html[data-tema=gelap] .cmk-tq .kr{color:#ff8a8f}html[data-tema=gelap] .cmk-ac.a,html[data-tema=gelap] .cmk-tq .ok{color:#7fdc9c}html[data-tema=gelap] .cmk-kal{color:inherit}' +
      'html[data-tema=gelap] .cmk-gr{border-left-color:#fff}html[data-tema=gelap] .cmk-bs.me{outline-color:#fff}' +
      '.cmk-keb b{font-size:16px}.cmk-keb small{display:block;font-size:11.5px;color:var(--mut,#5a6b78);line-height:1.45}' +
      '@media (max-width:820px){table.cmk-tb{min-width:0!important}table.cmk-tb td.nm{text-align:left!important;white-space:normal!important}table.cmk-tb td.nm *{text-align:left!important}.cmk-keb small{white-space:normal}tr.cmk-gh{border:0;background:transparent;padding:0;margin:14px 0 6px}tr.cmk-gh td{border-radius:8px}.cmk-bt{min-width:0}}';
    document.head.appendChild(st);
  }
  /** Tindakan per barang. Bila server lama (tanpa x.act): tebakan dari status lama. */
  function act(x) {
    if (x.act) return x.act;
    if (x.status === 'Terpenuhi') return 'tuntas';
    if (x.status === 'Cukup') return 'aman';
    if (x.status === 'Kurang') return x.tertutup ? 'tunggu' : 'order';
    return 'order';
  }
  function tindakan(x) {
    var a = act(x);
    if (a === 'order') return '<span class="cmk-ac o">Perlu order: kurang ' + n(x.kurangA != null ? x.kurangA : (x.kurangSendiri || x.kurangTotal)) + '</span>' +
      (x.belumPesan != null ? '<span class="cmk-sub">Belum dipesan untuk semua proyek: <b>' + n(x.belumPesan) + '</b></span>' : '');
    if (a === 'tunggu') return '<span class="cmk-ac w">' + (x.tPo ? 'Tunggu PO' : 'Tunggu barang datang') + '</span><span class="cmk-sub">Kekurangan ' + n(x.kurangA != null ? x.kurangA : x.kurangSendiri) + ' sudah ' + (x.tPo ? 'diorder, PO belum ada' : 'dipesan') + '</span>';
    if (a === 'aman') return '<span class="cmk-ac a">&#10003; Aman</span>';
    return '<span class="cmk-ac a">&#10003; Terpenuhi</span>';
  }
  function chip(x) {
    var c = x.status === 'Kurang' ? 'k' : x.status === 'Rebutan' ? 't' : 'c';
    return '<span class="cmk-st ' + c + '">' + esc(stLbl(x.status)) + '</span>';
  }
  /** Batang antrean: lebar segmen = kebutuhan proyek, hijau = dapat dari stok, merah = kurang, garis putus = stok bebas. */
  function batang(A, ppbj) {
    if (!A || !(A.total > 0)) return '';
    var me = kunci(ppbj), h = '<div class="cmk-bt" role="img" aria-label="Stok bebas ' + n(A.bebas) + ' dari kebutuhan ' + n(A.total) + '">';
    A.L.forEach(function (r, i) {
      var w = r[2] / A.total * 100, dp = r[2] > 0 ? Math.min(100, r[3] / r[2] * 100) : 0;
      h += '<div class="cmk-bs' + (kunci(r[0]) === me ? ' me' : '') + '" style="width:' + w.toFixed(3) + '%" title="' + esc('Antrean ' + (i + 1) + ' · ' + r[0] + ' · ' + namaP(r[1]) + ' · butuh ' + n(r[2]) + ' · dapat ' + n(r[3]) + (r[2] - r[3] > 1e-9 ? ' · kurang ' + n(r[2] - r[3]) : '')) + '"><i style="width:' + dp.toFixed(1) + '%"></i></div>';
    });
    var g = Math.min(100, A.bebas / A.total * 100);
    h += '<b class="cmk-gr" style="left:' + g.toFixed(3) + '%" title="Stok bebas ' + n(A.bebas) + '"></b></div>';
    h += '<div class="cmk-bl"><span>stok bebas ' + n(A.bebas) + '</span><span>butuh semua proyek ' + n(A.total) + '</span></div>';
    return h;
  }
  function rincian(A, ppbj) {
    if (!A || !(A.n > 1)) return '';
    var me = kunci(ppbj), h = '<details class="cmk-rc"><summary>Lihat antrean ' + A.n + ' proyek</summary><div class="cmk-tq"><span class="h">#</span><span class="h">No PPBJ</span><span class="h">Proyek</span><span class="h r">Butuh</span><span class="h r">Dapat</span>';
    A.L.forEach(function (r, i) {
      var c = kunci(r[0]) === me ? ' me' : '', kr = r[2] - r[3] > 1e-9;
      h += '<span class="' + c + '">' + (i + 1) + '</span><span class="' + c + '">' + esc(r[0]) + '</span><span class="nm' + c + '">' + esc(namaP(r[1])) + (r[5] ? ' <small>(ditunda)</small>' : '') + (r[4] && r[4] !== 'Biasa' ? ' <small>prioritas ' + esc(r[4]) + '</small>' : '') + '</span><span class="r' + c + '">' + n(r[2]) + '</span><span class="r' + c + (kr ? ' kr' : ' ok') + '">' + n(r[3]) + '</span>';
    });
    return h + '</div><div class="cmk-sub">Urutan pembagian: proyek Aktif dulu, prioritas Tinggi-Biasa-Rendah, lalu PPBJ terlama. Ditunda Sebentar setelah semua proyek Aktif.</div></details>';
  }
  function bufTeks(x) {
    var b = x.orderBuf; if (!b || !(b.akan > 0)) return '';
    return 'PPBJ buffer ' + b.ppbj + ': akan datang ' + n(b.akan) + (b.tutup ? ' (menutup kekurangan gabungan proyek + buffer)' : ', masih kurang ' + n(b.sisa) + ' gabungan proyek + buffer');
  }
  /** Kalimat keterangan (teks biasa; dipakai di layar dan Excel). */
  function kalimat(x, A) {
    var t = [], kb = bufTeks(x);
    if (x.status === 'Terpenuhi') return 'Sudah terpenuhi';
    if (x.tidakAda) t.push('Barang belum ada di stok/master.');
    if (x.status === 'Cukup') { t.push('Stok cukup untuk semua proyek.'); if (kb) t.push(kb + '.'); return t.join(' '); }
    if (A && x.ant) {
      if (A.n > 1) t.push('Stok bebas ' + n(A.bebas) + ' untuk ' + A.n + ' proyek (butuh ' + n(A.total) + '). Antrean ke-' + x.ant.u + ': dapat ' + n(x.ant.d) + ' dari ' + n(x.sisa) + (x.ant.k > 1e-9 ? ', kurang ' + n(x.ant.k) + '.' : '.'));
      else t.push('Stok bebas ' + n(A.bebas) + ', proyek ini butuh ' + n(x.sisa) + ': kurang ' + n(x.ant.k) + '.');
    } else if (x.status === 'Kurang') t.push('Kurang ' + n(x.kurangSendiri) + '.');
    else t.push('Stok bebas ' + n(x.bebas) + ' tidak cukup untuk semua proyek (butuh ' + n(x.total) + ', kurang ' + n(x.kurangTotal) + ').' + (x.lain && x.lain.length ? ' Juga dibutuhkan: ' + x.lain.map(function (l) { return l.ppbj + ' (' + n(l.sisa) + ')'; }).join(', ') + '.' : ''));
    var oo = x.order;
    if (x.status === 'Kurang') {
      if (x.tertutupBuf) t.push('Sudah dipesan di PPBJ buffer ' + x.orderBuf.ppbj + ', menunggu barang datang.');
      else if (x.tertutup) t.push('Sudah dipesan, menunggu barang datang.');
      else if (oo && (oo.kode === 'DIPESAN' || oo.kode === 'SEBAGIAN')) t.push('Sudah dipesan ' + n(oo.open) + ', belum menutup seluruh kekurangan.');
      if (kb && !x.tertutupBuf) t.push(kb + '.');
    }
    return t.join(' ');
  }
  /** Isi sel Keterangan (HTML). */
  function sel(x, P, K) {
    gaya();
    var A = antre(K, x);
    if (x.status === 'Terpenuhi') return chip(x) + tindakan(x);
    return chip(x) + tindakan(x) + (x.ant ? batang(A, P.ppbj) : '') + '<span class="cmk-kal">' + esc(kalimat(x, A)) + '</span>' + (x.ant ? rincian(A, P.ppbj) : '');
  }
  /** Sel Kebutuhan ringkas: sisa kebutuhan besar, rincian kecil di bawahnya. */
  function kebutuhan(x) {
    var bersih = Math.round(((x.serah || 0) - (x.kembali || 0)) * 1000) / 1000;
    return '<div class="cmk-keb"><b>' + n(x.sisa) + '</b><small title="Sisa kebutuhan = RAB - sudah diserahkan (bersih) - sedang diminta - dialokasikan">RAB ' + n(x.rab) + ' &middot; diserahkan ' + n(bersih) + (x.kembali > 0 ? ' (kembali ' + n(x.kembali) + ')' : '') + '<br>sisa RAB ' + n(x.sisaRab == null ? x.sisa : x.sisaRab) + ' &middot; dialokasikan ' + n(x.alok) + '</small></div>';
  }
  function stok(x) {
    return '<div class="cmk-keb"><b>' + n(x.bebas) + '</b><small>semua proyek butuh ' + n(x.total) + '</small></div>';
  }
  var GRUP = [['order', 'Perlu order sekarang', 'kekurangan belum dipesan'], ['tunggu', 'Sudah diorder, menunggu', 'tunggu PO atau barang datang'], ['aman', 'Aman', 'dapat penuh dari stok bebas'], ['tuntas', 'Sudah terpenuhi', '']];
  /** Kelompokkan barang menurut tindakan; urutan di dalam kelompok tetap seperti dari server. */
  function grup(L) {
    var o = {}; L.forEach(function (x) { var a = act(x); (o[a] = o[a] || []).push(x); });
    return GRUP.filter(function (g) { return o[g[0]] && o[g[0]].length; }).map(function (g) { return {k: g[0], judul: g[1], ket: g[2], L: o[g[0]]}; });
  }
  /** Kolom tambahan Excel per barang. */
  var XH = ['Antrean ke', 'Jumlah proyek antre', 'Dapat dari stok (antrean)', 'Kurang menurut antrean', 'Tindakan', 'Belum dipesan semua proyek', 'Antrean lengkap'];
  function xBaris(x, K) {
    var A = antre(K, x), a = act(x), lb = {order: 'Perlu order', tunggu: x.tPo ? 'Tunggu PO' : 'Tunggu barang datang', aman: 'Aman', tuntas: 'Terpenuhi'}[a] || '';
    return [x.ant ? x.ant.u : '', x.ant ? x.ant.n : '', x.ant ? x.ant.d : '', x.kurangA != null ? x.kurangA : '', lb, x.belumPesan != null ? x.belumPesan : '',
      A && x.ant ? A.L.map(function (r, i) { return (i + 1) + '. ' + r[0] + ' ' + namaP(r[1]) + ' butuh ' + r[2] + ' dapat ' + r[3]; }).join('; ') : ''];
  }
  root.CMK = {stLbl: stLbl, sel: sel, kalimat: function (x, K) { return kalimat(x, antre(K, x)); }, kebutuhan: kebutuhan, stok: stok, grup: grup, act: act, gaya: gaya, XH: XH, xBaris: xBaris, antre: antre};
})(typeof window !== 'undefined' ? window : this);
