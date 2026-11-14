/* Tambahan 126 + 127 + 129: navigasi admin. T129: angka penanda di menu (BPB perlu tindakan, pengembalian, no seri) dan cari dokumen dari kotak cari menu.
   T126:
   - Tab di atas area kerja seperti Accurate (maks 8, diingat setelah muat ulang).
   - Pencarian pintar di kotak menu samping (kata sehari-hari, toleran salah ketik), panah + Enter, Esc.
   - Menu favorit (bintang) dan 5 menu terakhir dibuka. Ctrl+K, Alt+1..8, Alt+W, tombol Kembali browser.
   T127 (tab tetap standby):
   - Setiap tab punya ruang sendiri. Saat ditinggal, isinya (hasil cari, saringan, isian, posisi gulir) disimpan di memori;
     saat kembali langsung tampil tanpa memuat ulang.
   - Dimuat ulang hanya bila: pertama kali dibuka, tombol ↻ / Alt+R / klik 2x tab, menu yang sama diklik lagi,
     ada penyimpanan dari halaman ini yang berkaitan dengan tab itu, atau Daftar Kerja / Pantauan BPB lebih dari 5 menit.
     Isian yang belum disimpan tidak pernah dihapus otomatis (diberi tanda saja).
   - Jawaban server untuk tab yang sudah ditinggal diproses di ruang tab itu sendiri (tidak lagi muncul di tab lain).
   - Stok & Harga, Mutasi, dan Telusur boleh dibuka lebih dari satu tab (tombol ＋, Ctrl+klik, klik tengah, Alt+T).
   - Pintasan: Alt+Q tab terakhir, Alt+[ / Alt+] kiri/kanan, Alt+T tab baru, Alt+R muat ulang. Klik tengah tab = tutup,
     klik 2x = muat ulang, seret = atur urutan, roda mouse menggeser baris tab. Keterangan muncul saat mouse diam di tombol.
   Hanya tampilan; tidak menyentuh server. */
(function () {
  "use strict";
  var d = document, W = window, KT = "sctk_nav_tabs", KF = "sctk_nav_fav", KR = "sctk_nav_baru", MAKS = 8;
  var SEGAR_MNT = {kerja: 5, pantau: 5};
  var MULTI = {stok: 1, mutasi: 1, telusur: 1};
  var INST = {}, AKTIF = null, PEMILIK = {}, KTX = null, ANTRI = [], RIW = [], kotor = {}, dariRiwayat = false, lewatHash = false;
  var asliGo = null;
  function ls(k, def) { try { var v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? def : v; } catch (e) { return def; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* abaikan */ } }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]; }); }
  function menuSemua() { var a = []; (W.MENU || []).forEach(function (g) { g[1].forEach(function (x) { a.push({t: x[0], nama: x[1], grup: g[0]}); }); }); return a; }
  function luar(t) { return t === "pembelian" || t === "realisasi" || t === "label"; }
  function nama(t) { try { return W.namaTab ? W.namaTab(t) : t; } catch (e) { return t; } }
  function ada(t) { return menuSemua().some(function (m) { return m.t === t; }); }
  function jam(ms) { var x = new Date(ms), p = function (n) { return String(n).padStart(2, "0"); }; return p(x.getHours()) + "." + p(x.getMinutes()); }
  function toast(m, e) { try { if (typeof W.toast === "function") W.toast(m, e); } catch (x) { /* abaikan */ } }

  /* ---------- kata kunci sehari-hari per menu ---------- */
  var KATA = {
    kerja: "daftar kerja tugas hari ini pekerjaan todo", pantau: "bpb permintaan barang pantau persetujuan approval status permintaan",
    serah: "serah kirim barang keluarkan barang penyerahan ambil barang", terima: "terima pengembalian masuk barang kembali bpk retur",
    mutasi: "mutasi keluar masuk histori stok kartu stok", stok: "stok harga persediaan nilai inventori koreksi stok",
    opname: "opname selisih stock opname hitung fisik", kimia: "kimia pac kaporit polimer sodium tangki larutan konsentrasi",
    seri: "meter meter air no seri nomor seri serial water meter sn", kpi: "kpi kinerja target performa",
    baopname: "berita acara ba opname", kedaluwarsa: "kedaluwarsa kadaluarsa expired exp", buffer: "buffer paket stok pengaman safety stock",
    barangmati: "barang mati tidak bergerak slow moving dead stock", accurate: "accurate input accurate ia item adjustment",
    komparasi: "komparasi bandingkan selisih accurate moka", proyek: "proyek projek ppbj rab cek material kebutuhan monitor order",
    pengajuan: "pengajuan umo ajukan uang muka", pembelian: "pengadaan vendor po pembelian supplier beli",
    realisasi: "realisasi umo laporan uang muka", laporan: "laporan report rekap bulanan", lapatasan: "laporan atasan atasan manajemen direksi",
    telusur: "telusur lacak riwayat barang jejak ppbj bpb dokumen no seri banyak barang linimasa", analisa: "analisa analisis cukup kekurangan beli anggaran cukup proyek",
    arsip: "arsip bukti pdf bukti cetak bukti pengambilan", bast: "bast berita acara serah terima", pengganti: "bpb pengganti pengganti ganti",
    mutasiacc: "mutasi accurate", masterbarang: "master barang barang baru kode barang katalog daftar barang", label: "label barcode stiker cetak label",
    pengumuman: "pengumuman info berita", sistem: "sistem pengaturan setting admin pin", kecepatan: "kecepatan lambat performa aplikasi",
    panduan: "panduan bantuan help cara pakai petunjuk"
  };
  function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim(); }
  function dekat(a, b) {   // beda paling banyak 1 huruf
    if (a === b) return true; var la = a.length, lb = b.length; if (Math.abs(la - lb) > 1) return false;
    var i = 0, j = 0, beda = 0; while (i < la && j < lb) { if (a[i] === b[j]) { i++; j++; continue; } if (++beda > 1) return false; if (la === lb) { i++; j++; } else if (la > lb) i++; else j++; }
    return beda + (la - i) + (lb - j) <= 1;
  }
  function skor(m, toks) {
    var lab = norm(m.nama), hay = norm(m.nama + " " + m.grup + " " + (KATA[m.t] || "")), kata = hay.split(" "), total = 0;
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i], s = 0;
      if (kata.some(function (w) { return w.indexOf(t) === 0; })) s = 3;
      else if (hay.indexOf(t) >= 0) s = 2;
      else if (t.length >= 4 && kata.some(function (w) { return w.length >= 3 && (dekat(t, w) || dekat(t, w.slice(0, t.length))); })) s = 1;
      if (!s) return 0; total += s;
    }
    if (lab.indexOf(toks.join(" ")) === 0) total += 4; else if (lab.indexOf(toks[0]) >= 0) total += 2;
    return total;
  }
  function cariMenu(q) {
    var toks = norm(q).split(" ").filter(Boolean); if (!toks.length) return [];
    return menuSemua().map(function (m) { return {m: m, s: skor(m, toks)}; }).filter(function (x) { return x.s > 0; })
      .sort(function (a, b) { return b.s - a.s; }).slice(0, 8).map(function (x) { return x.m; });
  }

  /* ---------- daftar tab (diingat di browser) ---------- */
  function idSah(x) { return x && x.t && ada(x.t) && !luar(x.t) && (x.id === x.t || String(x.id).indexOf(x.t + "~") === 0); }
  function daftar() { return ls(KT, []).map(function (x) { return x && {id: x.id || x.t, t: x.t, w: x.w || 0}; }).filter(idSah); }
  function simpanDaftar(a) { lsSet(KT, a.map(function (x) { return {id: x.id, t: x.t, w: x.w}; })); }
  function diDaftar(id) { return daftar().some(function (x) { return x.id === id; }); }
  function catat(id, t) {
    if (!id || luar(t) || !ada(t)) return;
    var a = daftar(), now = Date.now(), x = a.filter(function (y) { return y.id === id; })[0];
    if (x) x.w = now; else a.push({id: id, t: t, w: now});
    while (a.length > MAKS) {
      var tua = null, tuaK = null;
      a.forEach(function (y) { if (y.id === id) return; if (!adaKotor(y.id) && (!tua || y.w < tua.w)) tua = y; if (!tuaK || y.w < tuaK.w) tuaK = y; });
      tua = tua || tuaK; if (!tua) break;
      a = a.filter(function (y) { return y !== tua; }); if (tua.id !== AKTIF) hapusInst(tua.id);
    }
    simpanDaftar(a);
    var r = ls(KR, []).filter(function (y) { return y !== t; }); r.unshift(t); lsSet(KR, r.slice(0, 5));
  }
  function idBaru(t) {
    var a = daftar(), pakai = function (id) { return !!INST[id] || a.some(function (x) { return x.id === id; }); };
    if (!pakai(t)) return t;
    var n = 2; while (pakai(t + "~" + n)) n++; return t + "~" + n;
  }
  /** Tab untuk menu t: yang terakhir dipakai (untuk klik menu), atau pemegang data saat ini (untuk perintah dari kode). */
  function idUntuk(t, pemilikDulu) {
    if (pemilikDulu && PEMILIK[t] && INST[PEMILIK[t]]) return PEMILIK[t];
    var a = daftar().filter(function (x) { return x.t === t; }).sort(function (p, q) { return q.w - p.w; });
    if (a.length) return a[0].id;
    if (PEMILIK[t] && INST[PEMILIK[t]]) return PEMILIK[t];
    return INST[t] ? idBaru(t) : t;
  }

  /* ---------- ruang tab ---------- */
  function inst(id, t) { return INST[id] || (INST[id] = {id: id, t: t, el: null, dimuat: 0, basi: false, y: 0, st: null}); }
  function hapusInst(id) {
    var x = INST[id]; if (!x) return;
    if (x.el && x.el.parentNode && id !== AKTIF) x.el.parentNode.removeChild(x.el);
    delete INST[id]; delete kotor[id];
    if (PEMILIK[x.t] === id) delete PEMILIK[x.t];
    RIW = RIW.filter(function (y) { return y !== id; });
  }
  function kolom() { return d.querySelector(".nkol"); }
  function boxAktif() { var x = INST[AKTIF]; return x && x.el; }

  /* Data milik satu tab untuk menu yang boleh dibuka lebih dari satu: ditukar saat pindah tab. */
  var STATE = {
    stok: {v: ["STOK", "STOKR", "JNS"], baru: function () { return {STOK: [], STOKR: null, JNS: {tampil: "periksa", q: "", ubah: {}}}; }},
    mutasi: {v: ["MUT", "MF", "MVIEW", "MR"], baru: function () { return {MUT: [], MF: {dari: "", sampai: "", jenis: "", sumber: "", arah: "", dept: "", proyek: "", q: ""}, MVIEW: "rinci", MR: null, catatan: ""}; }},
    telusur: {v: ["TL"], baru: function () { return {TL: {mode: "barang", q: "", hasil: null, lebih: 0, det: null, ppbj: "", cek: null, bpb: "", bpbHasil: null, saring: false, buka: "", seq: ((W.TL && W.TL.seq) || 0) + 1, banyak: [], bHasil: null, bBuka: "", linSemua: false, simpan: ""}}; }}
  };
  function ambilState(t) {
    var c = STATE[t], o = {}; c.v.forEach(function (k) { if (k in W) o[k] = W[k]; });
    if (t === "mutasi" && W.MX) { try { o.catatan = W.MX.catatan; } catch (e) { /* abaikan */ } }
    return o;
  }
  function pasangState(t, o) {
    STATE[t].v.forEach(function (k) { if (k in o && k in W) W[k] = o[k]; });
    if (t === "mutasi" && W.MX && "catatan" in o) { try { W.MX.catatan = o.catatan; } catch (e) { /* abaikan */ } }
  }
  function simpanState(x) { if (x && STATE[x.t] && PEMILIK[x.t] === x.id) x.st = ambilState(x.t); }
  function pakaiState(x) {
    if (!x || !STATE[x.t] || PEMILIK[x.t] === x.id) { if (x && STATE[x.t]) PEMILIK[x.t] = x.id; return; }
    var p = INST[PEMILIK[x.t]]; if (p) p.st = ambilState(x.t);
    pasangState(x.t, x.st || STATE[x.t].baru()); PEMILIK[x.t] = x.id;
  }
  /** Perintah dari kode (mis. Cari cepat mengisi TL lalu goTab): data global yang baru disiapkan pemanggil menjadi milik tab tujuan. */
  function ambilAlihState(x) {
    if (!x || !STATE[x.t]) return;
    var p = INST[PEMILIK[x.t]]; if (p && p.id !== x.id) p.st = ambilState(x.t);
    PEMILIK[x.t] = x.id;
  }

  /* ---------- nama tab (Stok: pipa 3in) ---------- */
  function labelDari(x) {
    if (!x || !MULTI[x.t]) return "";
    var s = "";
    try {
      var milik = PEMILIK[x.t] === x.id, st = milik ? null : x.st;
      if (x.t === "stok") { var q = x.el && x.el.querySelector("#sq"); s = q ? q.value : ""; }
      else if (x.t === "mutasi") { var mf = milik ? W.MF : (st && st.MF); s = mf ? (mf.q || mf.proyek || "") : ""; }
      else if (x.t === "telusur") { var tl = milik ? W.TL : (st && st.TL); if (tl) s = tl.mode === "ppbj" ? tl.ppbj : tl.mode === "bpb" ? tl.bpb : tl.mode === "banyak" ? (tl.banyak && tl.banyak.length ? tl.banyak.length + " barang" : "") : tl.q; }
    } catch (e) { s = ""; }
    s = String(s || "").trim(); return s.length > 16 ? s.slice(0, 15) + "…" : s;
  }
  function judulTab(x, semua) {
    var n = nama(x.t), lbl = labelDari(INST[x.id] || x);
    if (lbl) return n.replace(/ & Harga$/, "") + ": " + lbl;
    var sama = semua.filter(function (y) { return y.t === x.t; });
    if (sama.length > 1) return n + " (" + (sama.indexOf(sama.filter(function (y) { return y.id === x.id; })[0]) + 1) + ")";
    return n;
  }

  /* ---------- pindah tab ---------- */
  /* mode: "menu" (klik tab/menu: tampilkan yang tersimpan), "program" (goTab dari kode: muat ulang dengan data yang disiapkan),
     "muat" (muat ulang), "baru" (tab baru kosong), "siap" (pasang ruang saja, pengisi memuat sendiri). */
  function pindah(id, t, mode) {
    selesaiKtx();
    var lama = INST[AKTIF], x = inst(id, t), sama = !!lama && lama.id === id;
    if (!kolom()) {   // tata letak admin belum ada (baru masuk): biarkan goTab asli membuatnya; ruang pertama diambil di siapkanKolom
      AKTIF = id; catat(id, t); x.dimuat = Date.now();
      if (mode === "program" || !STATE[t]) ambilAlihState(x); else pakaiState(x);
      if (mode !== "siap") asliGo(t);
      return;
    }
    if (!sama && lama) {
      lama.y = W.scrollY || 0; simpanState(lama);
      try { if (W.TAMPIL && W.TAMPIL.lepas) W.TAMPIL.lepas(); } catch (e) { /* abaikan */ }
      if (lama.el && lama.el.parentNode) lama.el.parentNode.removeChild(lama.el);
      if (lama.el) lama.el.removeAttribute("id");
      try { if (W.BASI && W.BASI.hapus) W.BASI.hapus(); } catch (e) { /* abaikan */ }
      if (!diDaftar(lama.id)) hapusInst(lama.id);
    }
    AKTIF = id; RIW = RIW.filter(function (y) { return y !== id; }); RIW.push(id); if (RIW.length > 20) RIW.shift();
    if (mode === "program") ambilAlihState(x); else pakaiState(x);
    W.TAB = t;
    if (!x.el) x.el = d.createElement("div");
    x.el.id = "pane"; x.el.hidden = false; if (x.el.parentNode !== kolom()) kolom().appendChild(x.el);
    catat(id, t);
    var kosong = !x.dimuat, tua = !!SEGAR_MNT[t] && Date.now() - x.dimuat > SEGAR_MNT[t] * 60000;
    var muat = mode === "program" || mode === "muat" || mode === "baru" || kosong || ((x.basi || tua) && !adaKotor(id));
    /* riwayat browser: entri baru dibuat SEBELUM goTab asli (yang memakai replaceState) agar entri tab lama tidak tertimpa */
    try { if (!dariRiwayat && !sama) history.pushState({navId: id}, "", "#" + t); } catch (e) { /* abaikan */ }
    if (mode === "siap") {
      x.dimuat = Date.now(); x.basi = false;
      try { if (W.TAMPIL && W.TAMPIL.aktif) W.TAMPIL.aktif(); } catch (e) { /* abaikan */ }
    } else if (muat) {
      try { if (W.TAMPIL && W.TAMPIL.aktif) W.TAMPIL.aktif(); } catch (e) { /* abaikan */ }
      if (!sama) { try { W.scrollTo(0, 0); } catch (e) { /* abaikan */ } }
      var yLama = x.y; x.dimuat = Date.now(); x.basi = false;
      if (!x.el.firstChild && !MULTI[t]) x.el.innerHTML = '<div class="card msg">Memuat...</div>';   // bukan untuk tab ganda: tampilan terakhir tab lain jangan ikut terbaca   // ruang baru: tanda memuat (tampil.js mengganti dengan tampilan terakhir / kerangka)
      asliGo(t);
      if (!sama && !kosong && mode !== "program" && yLama > 0) pulih(id, yLama);
    } else {
      W.tabsUI();
      try { if (W.TAMPIL && W.TAMPIL.aktif) W.TAMPIL.aktif(); } catch (e) { /* abaikan */ }
      try { W.scrollTo(0, x.y || 0); } catch (e) { /* abaikan */ }
    }
    try { history.replaceState({navId: id}, "", "#" + t); } catch (e) { /* abaikan */ }
    gambarBar();
  }
  function pulih(id, y) {
    [60, 300, 800, 1600].forEach(function (ms) { setTimeout(function () { if (AKTIF === id && Math.abs(W.scrollY - y) > 20 && d.documentElement.scrollHeight - W.innerHeight >= y - 5) W.scrollTo(0, y); }, ms); });
  }
  function bukaMenu(t) {
    if (luar(t)) return asliGo(t);
    var a = INST[AKTIF];
    if (a && a.t === t) { if (adaKotor(a.id) && !konfirmasi(a.id, "dimuat ulang")) return; return pindah(a.id, t, "muat"); }
    pindah(idUntuk(t, false), t, "menu");
  }
  function bukaBaru(t) {
    if (!t) return;
    if (!MULTI[t]) { bukaMenu(t); if (ada(t) && !luar(t)) toast('"' + nama(t) + '" hanya bisa dibuka satu tab. Tab baru tersedia untuk Stok & Harga, Mutasi, dan Telusur.'); return; }
    pindah(idBaru(t), t, "baru");
  }
  function muatUlang(id) {
    var x = INST[id] || daftar().filter(function (y) { return y.id === id; })[0]; if (!x) return;
    if (id === AKTIF && adaKotor(id) && !konfirmasi(id, "dimuat ulang")) return;
    pindah(id, x.t, "muat");
  }
  function tutup(id) {
    var a = daftar(), i = a.findIndex(function (x) { return x.id === id; }); if (i < 0) return;
    if (adaKotor(id) && !konfirmasi(id, "ditutup")) return;
    a.splice(i, 1); simpanDaftar(a);
    if (id === AKTIF) { var n = a[i] || a[i - 1]; if (n) { pindah(n.id, n.t, "menu"); hapusInst(id); } else gambarBar(); }
    else { hapusInst(id); gambarBar(); }
  }
  function konfirmasi(id, apa) {
    var x = INST[id]; return W.confirm('Ada isian yang belum disimpan di tab "' + (x ? nama(x.t) : "ini") + '". Tab akan ' + (apa || "dimuat ulang") + " dan isian itu hilang. Lanjutkan?");
  }

  /* ---------- jawaban server untuk tab yang sudah ditinggal ---------- */
  /* Jawaban diproses di ruang tab asalnya: ruang itu dipasang sementara (tersembunyi) sebagai #pane, data global milik tab itu
     dipulihkan, lalu sesudah kode lanjutan selesai semuanya dikembalikan. Tab yang sedang dibuka tidak tersentuh. */
  function jalankan(asal, fn) {
    if (KTX) { ANTRI.push([asal, fn]); return; }
    var kol = kolom(), x = asal ? INST[asal] : null;
    if (!asal || asal === AKTIF || !kol) { fn(); return; }
    var el = (x && x.el) || d.createElement("div"), akt = boxAktif();
    KTX = {id: asal, x: x, el: el, ui: false, pemilik: x && STATE[x.t] ? PEMILIK[x.t] : null};
    if (x) { pakaiState(x); W.TAB = x.t; }
    el.hidden = true; el.id = "pane"; kol.insertBefore(el, akt && akt.parentNode === kol ? akt : null);
    try { fn(); } catch (e) { /* abaikan */ }
    setTimeout(selesaiKtx, 0);
  }
  function selesaiKtx() {
    if (!KTX) return; var k = KTX; KTX = null;
    if (k.el.parentNode) k.el.parentNode.removeChild(k.el);
    k.el.hidden = false; k.el.removeAttribute("id");
    if (k.x && STATE[k.x.t] && k.pemilik && k.pemilik !== k.x.id && INST[k.pemilik]) pakaiState(INST[k.pemilik]);
    var a = INST[AKTIF]; if (a) { W.TAB = a.t; if (STATE[a.t]) pakaiState(a); }
    if (k.ui) { try { W.tabsUI(); } catch (e) { /* abaikan */ } }
    try { if (W.TAMPIL && W.TAMPIL.aktif) W.TAMPIL.aktif(); } catch (e) { /* abaikan */ }
    gambarBar();
    var q = ANTRI.shift(); if (q) jalankan(q[0], q[1]);
  }

  /* ---------- penyimpanan yang mengubah data tab lain ---------- */
  var BACA_LAIN = {adminAnalisaBarang: 1, adminAnalisaPpbj: 1, adminMutasi: 1, adminKondisiTautan: 1, adminBastDataAwal: 1, adminBastDraf: 1, kimiaFotoGet: 1, seriDok: 1, seriKode: 1, bot: 1, adminCetakLink: 1};
  var T_STOK = "stok mutasi telusur buffer analisa barangmati kerja pantau serah terima opname kpi komparasi seri kedaluwarsa accurate masterbarang lapatasan laporan baopname mutasiacc arsip bast pengganti".split(" ");
  var T_PROYEK = "telusur buffer analisa proyek kerja pantau serah pengajuan lapatasan laporan".split(" ");
  var RX_TANPA = /^(adminPengumumanSimpan|adminKpiTarget|label|catatan|diskusi|perj|ven|tawar|adminPengingatPesan|adminRemind|adminPbRemind|adminPgjRemind|adminBufferEmail|adminLaporan|adminCetakLink|bot|kimia|pengAtur|tanda|berkasTandai|klaimSelesai|adminCadangan|adminKomparasiTandai|adminLapTautan|adminLapSegel|adminMutasiSegel|adminMutasiTautan|adminArsipTautan|adminPgtTautan|adminIdBarcodeIsi|eksp|revisiSelesai|adminMacRekonTandai)/;
  var RX_STOK = /terima|serah|kembali|keluar|koreksi|stok|opname|mutasi|seri|submit|decide|bpb|pgt|kdl|harga|jenis|^mb|adminMb|ubah|^adminIa|sinkron|tarikrak|impor|import/i;
  var RX_PROYEK = /ppbj|proyek|boq|buffer|alokasi|analisa|order|lama|beli|umo|pgj|^pb|^po|^rl|termin|^pl|setujugab|utang|masuk|^tpo/i;
  function kenaTulis(a) {
    if (RX_TANPA.test(a)) return [];
    if (RX_STOK.test(a)) return T_STOK.concat(T_PROYEK);
    if (RX_PROYEK.test(a)) return T_PROYEK;
    return T_STOK.concat(T_PROYEK);
  }
  function tandaiTulis(b, j, asal) {
    if (!b || !j || j.ok === false || typeof j._st !== "number") return;
    var a = String(b.action || ""); if (!a || BACA_LAIN[a]) return;
    var kena = kenaTulis(a); if (!kena.length) return;
    var ubah = false;
    Object.keys(INST).forEach(function (id) { var x = INST[id]; if (id !== asal && x.dimuat && kena.indexOf(x.t) >= 0 && !x.basi) { x.basi = true; ubah = true; } });
    if (ubah) setTimeout(gambarBar, 0);
    muatAngkaNanti(4000);
  }
  function bungkusApi() {
    var asli = W.api; if (typeof asli !== "function" || asli.__nav) return;
    W.api = function (b) {
      var asal = KTX ? KTX.id : AKTIF;
      var p = asli.apply(this, arguments);
      if (!p || typeof p.then !== "function") return p;
      return new Promise(function (res, rej) {
        p.then(function (j) { try { tandaiTulis(b, j, asal); } catch (e) { /* abaikan */ } jalankan(asal, function () { res(j); }); },
          function (e) { jalankan(asal, function () { rej(e); }); });
      });
    };
    W.api.__nav = true;
  }

  /* ---------- baris tab ---------- */
  function gambarBar() {
    var bar = d.getElementById("navtabs"); if (!bar) return;
    var a = daftar(), x = INST[AKTIF];
    if (!a.length) { bar.innerHTML = ""; return; }
    var info = "";
    if (x && x.dimuat) {
      var k = adaKotor(x.id) && x.basi;
      info = '<div class="nti"><span class="ntj' + (k ? " ntbasi" : "") + '" data-tip="' + esc(k ? "Ada penyimpanan yang mengubah data tab ini, tetapi ada isian yang belum disimpan, jadi tab tidak dimuat ulang otomatis.\nSimpan isian lalu tekan ↻." : "Dimuat jam " + jam(x.dimuat) + ".\nTekan ↻ bila ada perubahan dari HP pegawai.") + '">' + (k ? "⚠ data berubah" : "data " + jam(x.dimuat)) + '</span>' +
        '<button type="button" class="ntr" data-ntr="1" aria-label="Muat ulang tab ini" data-tip="Muat ulang tab ini (Alt+R)">&#8635;</button></div>';
    }
    bar.innerHTML = '<div class="ntw" role="tablist" aria-label="Tab yang terbuka">' + a.map(function (y, i) {
      var on = y.id === AKTIF, z = INST[y.id], basi = z && z.basi && !on, jd = judulTab(y, a);
      var tip = (i < 8 ? "Alt+" + (i + 1) + " · " : "") + "klik tengah: tutup · klik 2x: muat ulang · seret: atur urutan\nAlt+Q: tab terakhir · Alt+[ / Alt+]: tab kiri / kanan" + (basi ? "\nAda penyimpanan terkait; dimuat ulang saat dibuka." : "");
      return '<div class="nt' + (on ? " on" : "") + '" draggable="true" data-ntd="' + esc(y.id) + '"><button type="button" role="tab" aria-selected="' + on + '" data-nt="' + esc(y.id) + '" aria-label="' + esc(jd) + '" data-tip="' + esc(tip) + '">' + (basi ? '<i class="ntdot" aria-hidden="true"></i>' : "") + esc(jd) + '</button><button type="button" class="ntx" data-ntx="' + esc(y.id) + '" aria-label="Tutup tab ' + esc(jd) + '" data-tip="' + (on ? "Tutup tab (Alt+W)" : "Tutup tab") + '">&times;</button></div>';
    }).join("") + '</div>' + info;
    var w = bar.querySelector(".ntw");
    bar.querySelectorAll("[data-nt]").forEach(function (b) {
      var id = b.getAttribute("data-nt");
      b.onclick = function () { if (id !== AKTIF) { var y = a.filter(function (q) { return q.id === id; })[0]; if (y) pindah(id, y.t, "menu"); } };
      b.ondblclick = function (e) { e.preventDefault(); muatUlang(id); };
    });
    bar.querySelectorAll("[data-ntx]").forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); tutup(b.getAttribute("data-ntx")); }; });
    bar.querySelectorAll(".nt").forEach(function (el) {
      var id = el.getAttribute("data-ntd");
      el.addEventListener("mousedown", function (e) { if (e.button === 1) e.preventDefault(); });
      el.addEventListener("auxclick", function (e) { if (e.button === 1) { e.preventDefault(); tutup(id); } });
      el.addEventListener("dragstart", function (e) { try { e.dataTransfer.setData("text/plain", id); e.dataTransfer.effectAllowed = "move"; } catch (x2) { /* abaikan */ } el.classList.add("ntg"); sembunyiTip(); });
      el.addEventListener("dragend", function () { el.classList.remove("ntg"); bar.querySelectorAll(".ntl,.ntr2").forEach(function (q) { q.classList.remove("ntl", "ntr2"); }); });
      el.addEventListener("dragover", function (e) { e.preventDefault(); var r = el.getBoundingClientRect(), kiri = e.clientX < r.left + r.width / 2; el.classList.toggle("ntl", kiri); el.classList.toggle("ntr2", !kiri); });
      el.addEventListener("dragleave", function () { el.classList.remove("ntl", "ntr2"); });
      el.addEventListener("drop", function (e) {
        e.preventDefault(); var dari = ""; try { dari = e.dataTransfer.getData("text/plain"); } catch (x3) { /* abaikan */ }
        var r = el.getBoundingClientRect(), kiri = e.clientX < r.left + r.width / 2; geser(dari, id, kiri);
      });
    });
    var rb = bar.querySelector("[data-ntr]"); if (rb) rb.onclick = function () { muatUlang(AKTIF); };
    if (w) w.addEventListener("wheel", function (e) { if (w.scrollWidth > w.clientWidth && Math.abs(e.deltaY) > Math.abs(e.deltaX)) { w.scrollLeft += e.deltaY; e.preventDefault(); } }, {passive: false});
    var on = bar.querySelector(".nt.on"); if (on && w && w.scrollWidth > w.clientWidth) { var r1 = on.offsetLeft, r2 = r1 + on.offsetWidth; if (r1 < w.scrollLeft) w.scrollLeft = r1 - 8; else if (r2 > w.scrollLeft + w.clientWidth) w.scrollLeft = r2 - w.clientWidth + 8; }
  }
  function geser(dari, ke, kiri) {
    if (!dari || dari === ke) return;
    var a = daftar(), x = a.filter(function (y) { return y.id === dari; })[0]; if (!x) return;
    a = a.filter(function (y) { return y.id !== dari; });
    var i = a.findIndex(function (y) { return y.id === ke; }); if (i < 0) return;
    a.splice(kiri ? i : i + 1, 0, x); simpanDaftar(a); gambarBar();
  }
  function tabKe(n) { var a = daftar(), x = a[n]; if (x && x.id !== AKTIF) pindah(x.id, x.t, "menu"); }
  function tabGeser(arah) {
    var a = daftar(); if (a.length < 2) return; var i = a.findIndex(function (y) { return y.id === AKTIF; });
    var x = a[((i < 0 ? 0 : i) + arah + a.length) % a.length]; if (x && x.id !== AKTIF) pindah(x.id, x.t, "menu");
  }
  function tabSebelum() {
    var a = daftar(); for (var i = RIW.length - 2; i >= 0; i--) { var id = RIW[i], x = a.filter(function (y) { return y.id === id; })[0]; if (x && id !== AKTIF) { pindah(x.id, x.t, "menu"); return; } }
    toast("Belum ada tab sebelumnya.");
  }

  /* ---------- isian belum disimpan ---------- */
  function seperti_cari(el) { return el.type === "search" || /cari|search|filter|saring|^q$|[_-]q$|ketik nama|ketik kode/i.test((el.id || "") + " " + (el.placeholder || "")); }
  d.addEventListener("input", function (e) {
    var el = e.target, b = boxAktif(); if (KTX || !b || !el || !b.contains(el)) return;
    if (el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && /^(text|number|date|tel|email|)$/.test(el.type || "text") && !seperti_cari(el))) { var a = kotor[AKTIF] || (kotor[AKTIF] = []); if (a.indexOf(el) < 0) a.push(el); }
  }, true);
  /* Isian dianggap belum disimpan bila elemen yang diketik masih ada di ruang tab itu dan isinya berbeda dari isi awal.
     Setelah disimpan, tab biasanya digambar ulang sehingga elemen lama hilang dan tanda ini ikut hilang. */
  function adaKotor(id) {
    var x = INST[id]; if (!x || !x.el) return false;
    var a = (kotor[id] || []).filter(function (el) { return x.el.contains(el); }); kotor[id] = a;
    return a.some(function (el) { var v = String(el.value == null ? "" : el.value); return v.trim() !== "" && v !== String(el.defaultValue == null ? "" : el.defaultValue); });
  }

  /* ---------- keterangan saat mouse diam di tombol ---------- */
  var tipEl = null, tipFor = null, tipT = null;
  function bisaHover() { try { return W.matchMedia("(hover: hover) and (pointer: fine)").matches; } catch (e) { return false; } }
  function sembunyiTip() { clearTimeout(tipT); tipT = null; tipFor = null; if (tipEl) tipEl.hidden = true; }
  function tampilTip(el) {
    if (!el.isConnected) return;
    if (!tipEl) { tipEl = d.createElement("div"); tipEl.id = "navtip"; tipEl.setAttribute("role", "tooltip"); d.body.appendChild(tipEl); }
    tipEl.textContent = el.getAttribute("data-tip") || ""; tipEl.hidden = false;
    var r = el.getBoundingClientRect(), tw = tipEl.offsetWidth, th = tipEl.offsetHeight, x = r.left + r.width / 2 - tw / 2, y = r.bottom + 6;
    x = Math.max(6, Math.min(x, W.innerWidth - tw - 6)); if (y + th > W.innerHeight - 6) y = r.top - th - 6;
    tipEl.style.left = x + "px"; tipEl.style.top = y + "px";
  }
  d.addEventListener("mouseover", function (e) {
    if (!bisaHover()) return;
    var el = e.target && e.target.closest ? e.target.closest("[data-tip]") : null;
    if (el === tipFor) return; sembunyiTip(); if (!el) return;
    tipFor = el; tipT = setTimeout(function () { if (tipFor === el) tampilTip(el); }, 450);
  });
  d.addEventListener("mouseout", function (e) { if (tipFor && (!e.relatedTarget || !tipFor.contains(e.relatedTarget))) sembunyiTip(); });
  ["mousedown", "keydown", "wheel"].forEach(function (n) { d.addEventListener(n, sembunyiTip, true); });
  W.addEventListener("scroll", sembunyiTip, true);

  /* ---------- menu samping: cari pintar, favorit, tab baru ---------- */
  function fav() { return ls(KF, []).filter(ada); }
  function hiasMenu() {
    var box = d.getElementById("tabs"); if (!box) return;
    var f = fav();
    box.querySelectorAll("button[data-tab]").forEach(function (b) {
      var t = b.getAttribute("data-tab"), on = f.indexOf(t) >= 0;
      if (b.querySelector(".nfv")) return;
      var s = d.createElement("span"); s.className = "nfv" + (on ? " on" : ""); s.setAttribute("role", "button"); s.setAttribute("tabindex", "0");
      s.setAttribute("aria-label", (on ? "Hapus " : "Jadikan ") + b.textContent + (on ? " dari favorit" : " favorit")); s.setAttribute("data-tip", on ? "Hapus dari favorit" : "Jadikan favorit");
      s.textContent = on ? "★" : "☆";
      var klik = function (e) { e.preventDefault(); e.stopPropagation(); var a = fav(), i = a.indexOf(t); if (i >= 0) a.splice(i, 1); else a.push(t); lsSet(KF, a); W.tabsUI(); };
      s.onclick = klik; s.onkeydown = function (e) { if (e.key === "Enter" || e.key === " ") klik(e); };
      b.appendChild(s);
      if (MULTI[t] && !b.hasAttribute("data-fv")) {
        var p = d.createElement("span"); p.className = "npl"; p.setAttribute("role", "button"); p.setAttribute("tabindex", "0");
        p.setAttribute("aria-label", "Buka " + nama(t) + " di tab baru"); p.setAttribute("data-tip", "Buka tab baru (Ctrl+klik / Alt+T)"); p.textContent = "+";
        p.onkeydown = function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); tutupSamping(); bukaBaru(t); } };
        b.appendChild(p);
      }
    });
    if (f.length && !box.querySelector(".mgt.nfvg")) {
      var h = '<div class="mgt nfvg">Favorit</div>' + f.map(function (t) { return '<button type="button" class="' + (W.TAB === t ? "on" : "") + '" data-tab="' + esc(t) + '" data-fv="1">' + esc(nama(t)) + '</button>'; }).join("");
      box.insertAdjacentHTML("afterbegin", h);
    }
    pasangCari(); pasangAngka();
  }
  /* ---------- T129: angka penanda di menu samping ---------- */
  var ANGKA = null, angkaJalan = false, TIP_ANGKA = {pantau: " BPB perlu tindakan (menunggu persetujuan / siap diserahkan)", terima: " pengembalian belum selesai diterima", seri: " dokumen meter air belum lengkap nomor serinya"};
  function muatAngka() {
    if (angkaJalan || !W.PIN || typeof W.api !== "function" || !kolom()) return; angkaJalan = true;
    Promise.resolve(W.api({action: "adminMenuRingkas"})).then(function (r) { angkaJalan = false; if (r && r.ok && r.angka) { ANGKA = r.angka; pasangAngka(); } }, function () { angkaJalan = false; });
  }
  var muatAngkaNanti = (function () { var t = null; return function (ms) { clearTimeout(t); t = setTimeout(muatAngka, ms || 4000); }; })();
  function pasangAngka() {
    var box = d.getElementById("tabs"); if (!box || !ANGKA) return;
    box.querySelectorAll("button[data-tab]").forEach(function (b) {
      var t = b.getAttribute("data-tab"), n = ANGKA[t], ada = b.querySelector(".nbd");
      if (!(t in TIP_ANGKA)) return;
      if (!n) { if (ada) ada.remove(); return; }
      if (!ada) { ada = d.createElement("span"); ada.className = "nbd"; var st = b.querySelector(".nfv"); b.insertBefore(ada, st || null); }
      ada.textContent = n > 99 ? "99+" : String(n); ada.setAttribute("data-tip", n + TIP_ANGKA[t]); ada.setAttribute("aria-label", n + TIP_ANGKA[t]);
    });
  }
  setInterval(function () { if (d.visibilityState !== "hidden") muatAngka(); }, 5 * 60000);
  function tutupSamping() { var sd = d.getElementById("side"); if (sd) sd.classList.remove("buka"); }
  /* Klik menu ditangani di sini (sebelum onclick bawaan): Ctrl+klik = tab baru, klik biasa = tampilkan tab yang tersimpan. */
  d.addEventListener("click", function (e) {
    var b = e.target && e.target.closest ? e.target.closest("#tabs button[data-tab]") : null; if (!b) return;
    if (e.target.closest(".nfv")) return;
    var t = b.getAttribute("data-tab"); e.preventDefault(); e.stopPropagation(); tutupSamping();
    if (e.target.closest(".npl") || e.ctrlKey || e.metaKey) bukaBaru(t); else bukaMenu(t);
  }, true);
  d.addEventListener("mousedown", function (e) { if (e.button === 1 && e.target && e.target.closest && e.target.closest("#tabs button[data-tab]")) e.preventDefault(); }, true);
  d.addEventListener("auxclick", function (e) {
    if (e.button !== 1) return; var b = e.target && e.target.closest ? e.target.closest("#tabs button[data-tab]") : null; if (!b) return;
    e.preventDefault(); tutupSamping(); bukaBaru(b.getAttribute("data-tab"));
  }, true);

  var SEL = 0, HASIL = [], KUNCI = null, DOKQ = "", DOKS = [], dokT = null;
  function pasangCari() {
    var qc = d.getElementById("qcepat"); if (!qc) return;
    if (qc.dataset.nav) { if (KUNCI) qc.onkeydown = KUNCI; return; }   // tabsUI asli memasang ulang onkeydown setiap kali menu digambar
    qc.dataset.nav = "1"; qc.placeholder = "Cari menu / barang / PPBJ"; qc.removeAttribute("title"); qc.setAttribute("data-tip", "Cari menu, barang, atau No PPBJ (Ctrl+K)"); qc.setAttribute("aria-label", "Cari menu, barang, atau No PPBJ");
    qc.setAttribute("aria-autocomplete", "list"); qc.setAttribute("aria-controls", "navsaran");
    var pn = d.createElement("div"); pn.id = "navsaran"; pn.setAttribute("role", "listbox"); pn.hidden = true; qc.parentNode.appendChild(pn);
    function tampil() {
      var v = qc.value.trim(), h = "";
      if (!v) {
        var r = ls(KR, []).filter(function (t) { return ada(t) && t !== W.TAB; }).slice(0, 5);
        HASIL = r.map(function (t) { return {jenis: "menu", t: t}; });
        h = r.length ? '<div class="nsj">Terakhir dibuka</div>' : '<div class="nsj">Ketik nama menu, barang, atau No PPBJ</div>';
      } else {
        HASIL = cariMenu(v).map(function (m) { return {jenis: "menu", t: m.t}; }); HASIL.push({jenis: "barang", v: v});
        h = HASIL.length > 1 ? '<div class="nsj">Menu</div>' : '<div class="nsj">Tidak ada menu yang cocok</div>';
        if (v.length >= 3 && /\d/.test(v)) {   // T129: nomor dokumen / no seri
          HASIL.push({jenis: "dok", v: v});
          if (DOKQ === v) DOKS.forEach(function (g) { HASIL.push({jenis: "dokx", g: g}); });
          else { clearTimeout(dokT); dokT = setTimeout(function () { ambilDok(v); }, 450); }
        }
      }
      if (SEL >= HASIL.length) SEL = 0;
      h += HASIL.map(function (x, i) {
        if (x.jenis === "barang") return '<div class="nsi nsb' + (i === SEL ? " on" : "") + '" role="option" data-ns="' + i + '" aria-selected="' + (i === SEL) + '">Cari barang / No PPBJ: <b>' + esc(x.v) + '</b></div>';
        if (x.jenis === "dok") return '<div class="nsi nsb' + (i === SEL ? " on" : "") + '" role="option" data-ns="' + i + '" aria-selected="' + (i === SEL) + '">Cari dokumen / no seri: <b>' + esc(x.v) + '</b></div>';
        if (x.jenis === "dokx") { var g = x.g; return (HASIL[i - 1] && HASIL[i - 1].jenis === "dok" ? '<div class="nsj">Dokumen</div>' : "") + '<div class="nsi' + (i === SEL ? " on" : "") + '" role="option" data-ns="' + i + '" aria-selected="' + (i === SEL) + '"><b>' + esc(g.doc) + '</b> <small>' + esc((g.jenis === "BPK" ? "Pengembalian" : g.jenis) + " · " + g.status + (g.ppbj ? " · " + g.ppbj : "") + (g.pemohon ? " · " + g.pemohon : "") + (g.seriCocok ? " · seri " + g.seriCocok.join(", ") : "")) + '</small></div>'; }
        var m = menuSemua().filter(function (y) { return y.t === x.t; })[0];
        return '<div class="nsi' + (i === SEL ? " on" : "") + '" role="option" data-ns="' + i + '" aria-selected="' + (i === SEL) + '"><b>' + esc(m.nama) + '</b><small>' + esc(m.grup) + '</small></div>';
      }).join("");
      pn.innerHTML = h; pn.hidden = false;
      pn.querySelectorAll("[data-ns]").forEach(function (el) { el.onmousedown = function (e) { e.preventDefault(); pilih(Number(el.getAttribute("data-ns")), e.ctrlKey || e.metaKey); }; });
    }
    function pilih(i, baru) {
      var x = HASIL[i]; if (!x) return; var v = qc.value; qc.value = ""; pn.hidden = true; SEL = 0; qc.blur(); tutupSamping();
      if (x.jenis === "menu") { if (baru) bukaBaru(x.t); else bukaMenu(x.t); }
      else if (x.jenis === "dok") { if (typeof W.tlBukaDok === "function") W.tlBukaDok(x.v); }
      else if (x.jenis === "dokx") { if (typeof W.tlBukaDok === "function") W.tlBukaDok(x.g.doc); }
      else if (typeof W.cepatCari === "function") W.cepatCari(v);
    }
    function ambilDok(v) {
      if (typeof W.api !== "function") return;
      Promise.resolve(W.api({action: "adminTelusurBpb", q: v, ringkas: 1})).then(function (r) {
        DOKQ = v; DOKS = r && r.ok ? (r.rows || []).slice(0, 5) : [];
        if (qc.value.trim() === v && d.activeElement === qc) tampil();
      }, function () { DOKQ = v; DOKS = []; });
    }
    qc.addEventListener("input", function () { SEL = 0; tampil(); });
    qc.addEventListener("focus", tampil);
    qc.addEventListener("blur", function () { setTimeout(function () { pn.hidden = true; }, 150); });
    KUNCI = qc.onkeydown = function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); if (pn.hidden) tampil(); SEL = Math.min(HASIL.length - 1, SEL + 1); tampil(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); SEL = Math.max(0, SEL - 1); tampil(); }
      else if (e.key === "Enter") { e.preventDefault(); if (!HASIL.length) tampil(); pilih(SEL, e.ctrlKey || e.metaKey); }
      else if (e.key === "Escape") { if (qc.value) { qc.value = ""; tampil(); } else { pn.hidden = true; qc.blur(); } }
    };
  }

  /* ---------- pasang ke fungsi admin ---------- */
  function pasang() {
    if (typeof W.goTab !== "function" || typeof W.tabsUI !== "function") return setTimeout(pasang, 50);
    if (W.goTab.__nav) return;
    asliGo = W.goTab; var asliUI = W.tabsUI;
    bungkusApi();
    W.goTab = function (t) {
      if (KTX) { if (KTX.x) KTX.x.basi = true; return; }   // kode lanjutan tab yang sedang di belakang ingin memuat ulang: tandai saja
      if (luar(t)) return asliGo(t);
      var a = INST[AKTIF];
      if (a && a.t === t) return pindah(a.id, t, "muat");
      return pindah(idUntuk(t, true), t, "program");
    };
    W.goTab.__nav = true;
    W.bukaTab = bukaMenu; W.bukaTabBaru = bukaBaru;
    W.NAVT = {inst: function () { return INST; }, aktif: function () { return AKTIF; }, kena: kenaTulis};   // untuk pemeriksaan
    W.tabsUI = function () {
      if (KTX) { KTX.ui = true; return; }
      asliUI(); siapkanKolom(); hiasMenu(); gambarBar();
    };
    if (W.PDN && typeof W.PDN.bukaDari === "function" && !W.PDN.bukaDari.__nav) {
      var asliPdn = W.PDN.bukaDari;
      W.PDN.bukaDari = function () { if (kolom()) pindah(idUntuk("panduan", true), "panduan", "siap"); return asliPdn.apply(this, arguments); };
      W.PDN.bukaDari.__nav = true;
    }
  }
  /* Baris tab diletakkan di atas #pane dalam satu kolom. Ruang tab pertama adalah #pane yang dibuat halaman admin. */
  function siapkanKolom() {
    var p = d.getElementById("pane"); if (!p || d.getElementById("navtabs")) return;
    INST = {}; PEMILIK = {}; RIW = []; kotor = {};   // tata letak baru (baru masuk / masuk ulang)
    var kol = d.createElement("div"); kol.className = "nkol"; p.parentNode.insertBefore(kol, p);
    var bar = d.createElement("div"); bar.id = "navtabs"; bar.className = "noprint"; kol.appendChild(bar); kol.appendChild(p);
    var t = W.TAB, id = (AKTIF && String(AKTIF).split("~")[0] === t) ? AKTIF : idUntuk(t, false);
    var x = inst(id, t); x.el = p; x.dimuat = Date.now(); AKTIF = id; RIW = [id];
    if (STATE[t]) PEMILIK[t] = id;
    catat(id, t);
    try { history.replaceState({navId: id}, "", location.hash || ("#" + t)); } catch (e) { /* abaikan */ }
    setTimeout(muatAngka, 2500);
  }
  /* Nama tab mengikuti isi pencarian (Stok: pipa 3in) */
  var lblLama = "";
  setInterval(function () { var x = INST[AKTIF]; if (!x || !MULTI[x.t] || KTX) return; var l = labelDari(x); if (l !== lblLama) { lblLama = l; gambarBar(); } }, 700);

  /* ---------- pintasan ---------- */
  d.addEventListener("keydown", function (e) {
    var k = (e.key || "").toLowerCase(), c = e.code || "";
    if ((e.ctrlKey || e.metaKey) && !e.altKey && k === "k") {
      var qc = d.getElementById("qcepat"); if (!qc) return; e.preventDefault();
      var adm = d.querySelector(".adm"); if (adm && adm.classList.contains("tutup")) { var bk = d.getElementById("smbuka"); if (bk) bk.click(); }
      var sd = d.getElementById("side"); if (sd && W.innerWidth <= 860) sd.classList.add("buka");
      setTimeout(function () { qc.focus(); qc.select(); }, 30); return;
    }
    if (!e.altKey || e.ctrlKey || e.metaKey || !kolom()) return;
    var n = /^Digit[1-8]$/.test(c) ? Number(c.slice(5)) : (/^[1-8]$/.test(e.key) ? Number(e.key) : 0);
    if (n) { e.preventDefault(); tabKe(n - 1); return; }
    if (c === "KeyW" || k === "w") { e.preventDefault(); if (AKTIF && diDaftar(AKTIF)) tutup(AKTIF); return; }
    if (c === "KeyQ" || k === "q") { e.preventDefault(); tabSebelum(); return; }
    if (c === "BracketLeft" || k === "[") { e.preventDefault(); tabGeser(-1); return; }
    if (c === "BracketRight" || k === "]") { e.preventDefault(); tabGeser(1); return; }
    if (c === "KeyT" || k === "t") { e.preventDefault(); var x = INST[AKTIF]; if (x) bukaBaru(x.t); return; }
    if (c === "KeyR" || k === "r") { e.preventDefault(); if (AKTIF) muatUlang(AKTIF); return; }
  });
  /* tombol Kembali / Maju browser ikut pindah tab */
  W.addEventListener("popstate", function (e) {
    var id = e.state && e.state.navId; if (!id || !kolom() || id === AKTIF) return;
    var x = INST[id] || daftar().filter(function (y) { return y.id === id; })[0]; if (!x) return;
    lewatHash = true; dariRiwayat = true; try { pindah(id, x.t, "menu"); } finally { dariRiwayat = false; }
    setTimeout(function () { lewatHash = false; }, 0);
  });
  W.addEventListener("hashchange", function () {
    if (lewatHash) return;
    var h = (location.hash || "").replace("#", ""), a = INST[AKTIF]; if (!h || !ada(h) || luar(h) || (a && a.t === h)) return;
    if (kolom()) { dariRiwayat = true; try { bukaMenu(h); } finally { dariRiwayat = false; } }
  });

  /* ---------- gaya ---------- */
  var st = d.createElement("style");
  st.textContent = ".nkol{min-width:0}#navtabs:empty{display:none}#navtabs{position:sticky;top:0;z-index:20;background:var(--bg,#0b1626);padding:0 0 6px;margin:0 0 6px;display:flex;align-items:flex-end;gap:8px}" +
    ".ntw{display:flex;gap:4px;overflow-x:auto;scrollbar-width:thin;padding:2px 2px 0;flex:1;min-width:0}.nt{display:flex;align-items:center;flex:none;border:1px solid var(--line);border-radius:8px 8px 0 0;background:var(--card);opacity:.82}" +
    ".nt.on{opacity:1;border-bottom-color:transparent;box-shadow:inset 0 3px 0 var(--accent,var(--teal,#2bb3c0))}.nt button{background:none;border:0;color:inherit;font:inherit;font-size:13px;padding:7px 4px 7px 10px;cursor:pointer;white-space:nowrap;min-height:34px}" +
    ".nt.on button{font-weight:700}.nt .ntx{padding:7px 9px 7px 4px;opacity:.6;font-size:15px}.nt .ntx:hover,.nt .ntx:focus-visible{opacity:1}" +
    ".nt.ntg{opacity:.4}.nt.ntl{box-shadow:inset 3px 0 0 var(--accent,#2bb3c0)}.nt.ntr2{box-shadow:inset -3px 0 0 var(--accent,#2bb3c0)}" +
    ".ntdot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#e0a800;margin-right:6px;vertical-align:1px}" +
    ".nti{display:flex;align-items:center;gap:4px;flex:none;padding-bottom:4px;font-size:12px}.ntj{opacity:.7;white-space:nowrap;cursor:default}.ntj.ntbasi{opacity:1;color:#e0a800;font-weight:700}" +
    ".ntr{background:none;border:1px solid var(--line);border-radius:6px;color:inherit;font-size:15px;line-height:1;padding:4px 7px;cursor:pointer;min-height:28px}.ntr:hover,.ntr:focus-visible{background:rgba(43,179,192,.16)}" +
    "#tabs button .nfv{float:right;opacity:.35;padding:0 2px;margin-left:6px;cursor:pointer}#tabs button:hover .nfv,#tabs button .nfv:focus-visible,#tabs button .nfv.on{opacity:1}#tabs button .nfv.on{color:#e0a800}" +
    "#tabs button .npl{float:right;opacity:0;padding:0 5px;margin-left:2px;cursor:pointer;font-weight:700;border-radius:4px}#tabs button:hover .npl,#tabs button .npl:focus-visible{opacity:.85}#tabs button .npl:hover{background:rgba(43,179,192,.22);opacity:1}" +
    "@media (hover:none){#tabs button .npl{opacity:.6}}" +
    "#tabs button .nbd{display:inline-block;min-width:18px;padding:0 5px;margin-left:6px;border-radius:9px;background:#c0392b;color:#fff;font-size:11px;font-weight:700;line-height:18px;text-align:center;vertical-align:1px}" +
    ".mcari{position:relative}#navsaran{position:absolute;left:0;right:0;top:100%;z-index:50;background:var(--card);border:1px solid var(--line);border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.35);max-height:60vh;overflow:auto;margin-top:2px}" +
    ".nsj{font-size:11px;font-weight:700;opacity:.7;padding:7px 10px 3px;letter-spacing:.03em}.nsi{padding:8px 10px;cursor:pointer;border-top:1px solid var(--line);font-size:13px}.nsi small{display:block;opacity:.65;font-size:11px}" +
    ".nsi.on,.nsi:hover{background:rgba(43,179,192,.16)}.nsb{font-size:12.5px}" +
    "#navtip{position:fixed;z-index:10000;max-width:320px;padding:6px 9px;border-radius:6px;background:#1d2733;color:#f2f5f8;font-size:12px;line-height:1.45;white-space:pre-line;box-shadow:0 4px 14px rgba(0,0,0,.3);pointer-events:none}" +
    "@media print{#navtabs,#navtip{display:none}}";
  d.head.appendChild(st);
  pasang();
})();
