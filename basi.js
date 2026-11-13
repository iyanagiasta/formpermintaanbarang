/* Tambahan 116: LAPORAN BERAT BOLEH TERTINGGAL 20 MENIT.
   Server memakai hasil hitungan terakhir laporan berat (Proyek Pintar, Telusur PPBJ, KPI, Daftar Kerja, Proyek Kurang, daftar Accurate)
   sampai 20 menit walau ada penulisan oleh pengguna lain. Berkas ini:
   (1) mencatat jam penulisan dari browser ini (jam server, _st) lalu mengirim "sejak" pada laporan berat, sehingga perubahan yang Anda buat
       sendiri SELALU langsung terlihat;
   (2) menampilkan pita "Data ini dihitung pukul ..." bila hasilnya lebih dari 1,5 menit, dengan tombol Hitung ulang sekarang.
   Dipasang sesudah swr.js (membungkus api). Bila server lama (tanpa _dihitung), berkas ini diam saja. */
(function (W) {
  "use strict";
  if (W.BASI || typeof W.api !== "function") return;
  var BERAT = {adminProyekPintar: 1, adminTelusurPpbj: 1, adminKpi: 1, adminKerja: 1, adminProyekKurang: 1, adminPaList: 1};
  var KT = "sctk_tulis_t", JENDELA = 25 * 60000, TAMPIL_MS = 90000;
  var asli = W.api, lokalT = 0, catat = {}, bar = null, barTab = "";

  function bacaT() { var t = lokalT; try { t = Math.max(t, Number(localStorage.getItem(KT) || 0)); } catch (e) { } return t; }
  function simpanT(t) { lokalT = Math.max(lokalT, t); try { localStorage.setItem(KT, String(lokalT)); } catch (e) { } }
  function jam(t) { var d = new Date(t), p = function (n) { return String(n).padStart(2, "0"); }; return p(d.getHours()) + "." + p(d.getMinutes()); }
  function tabNow() { return String(W.TAB || ""); }
  function hapusBar() { if (bar && bar.parentNode) bar.parentNode.removeChild(bar); bar = null; barTab = ""; catat = {}; }

  function gambarBar() {
    var ks = Object.keys(catat); if (!ks.length) { if (bar && bar.parentNode) bar.parentNode.removeChild(bar); bar = null; return; }
    var tertua = Math.min.apply(null, ks.map(function (k) { return catat[k].t; })), umur = Date.now() - tertua;
    if (umur < TAMPIL_MS) { if (bar && bar.parentNode) bar.parentNode.removeChild(bar); bar = null; return; }
    var pn = document.getElementById("pane"), induk = pn && pn.parentNode;
    if (!induk) return;
    if (!bar) { bar = document.createElement("div"); bar.className = "basi-bar"; bar.setAttribute("role", "status"); }
    var mnt = Math.max(1, Math.round(umur / 60000));
    bar.innerHTML = '<span>Data laporan ini dihitung pukul <b>' + jam(tertua) + '</b> (' + mnt + ' menit lalu). Perubahan dari pengguna lain bisa belum masuk; perubahan Anda sendiri sudah termasuk.</span><button type="button" class="basi-ulang">Hitung ulang sekarang</button>';
    if (bar.parentNode !== induk || bar.nextSibling !== pn) induk.insertBefore(bar, pn);
    barTab = tabNow();
    bar.querySelector(".basi-ulang").onclick = hitungUlang;
  }
  async function hitungUlang() {
    var btn = bar && bar.querySelector(".basi-ulang"); if (btn) { btn.disabled = true; btn.textContent = "Menghitung ulang..."; }
    var daftar = Object.keys(catat).map(function (k) { return catat[k].b; }), terakhir = daftar.length ? daftar[daftar.length - 1] : null;
    try {
      await Promise.all(daftar.map(function (b) { var c = {}; for (var x in b) if (x !== "sejak") c[x] = b[x]; c.segar = 1; return asli(c); }));
    } catch (e) { if (btn) { btn.disabled = false; btn.textContent = "Hitung ulang sekarang"; } if (typeof W.toast === "function") W.toast("Gagal terhubung ke server.", true); return; }
    try { if (W.SWR && W.SWR.bersih) W.SWR.bersih(); } catch (e) { }
    hapusBar();
    if (terakhir && terakhir.action === "adminTelusurPpbj" && typeof W.cariPpbjTL === "function") { W.cariPpbjTL(); return; }
    if (typeof W.goTab === "function") W.goTab(W.TAB || "kerja");
  }
  function tandai(b, j) {
    if (barTab && barTab !== tabNow()) hapusBar();
    var c = {}; for (var x in b) if (x !== "pin" && x !== "pf" && x !== "sejak" && x !== "segar") c[x] = b[x];
    var k = JSON.stringify(c); catat[k] = {t: j._dihitung, b: c};
    setTimeout(gambarBar, 0); setTimeout(gambarBar, 400);
  }

  W.api = function (b) {
    try {
      var a = b && b.action;
      if (!a || typeof a !== "string") return asli(b);
      var berat = !!BERAT[a];
      if (berat && b.segar !== 1 && b.sejak == null) { var t = bacaT(); if (t && Date.now() - t < JENDELA) b.sejak = t; }
      var p = asli(b);
      if (!p || typeof p.then !== "function") return p;
      return p.then(function (j) {
        try {
          if (j && j.ok !== false && typeof j._st === "number") simpanT(j._st);   // _st hanya dikirim server pada aksi TULIS yang berhasil
          if (berat && j && j.ok && typeof j._dihitung === "number") tandai(b, j);
        } catch (e) { }
        return j;
      });
    } catch (e) { return asli(b); }
  };
  var goAsli = W.goTab;
  if (typeof goAsli === "function") W.goTab = function (t) { if (t !== W.TAB || !bar) hapusBar(); return goAsli.apply(this, arguments); };
  try {
    var st = document.createElement("style");
    st.textContent = ".basi-bar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:0 0 10px;padding:8px 12px;border:1px solid #c98a12;border-left-width:4px;border-radius:6px;background:var(--card,var(--bg,#fff));color:inherit;font-size:13px}.basi-bar span{flex:1;min-width:220px}.basi-bar .basi-ulang{white-space:nowrap}";
    document.head.appendChild(st);
  } catch (e) { }
  W.BASI = {berat: BERAT, hapus: hapusBar, _tulisT: bacaT};
})(window);
