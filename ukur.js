/* Pengukur kecepatan (Tambahan 39). Memasang pencatat pada fetch ke Apps Script: mengukur waktu tiap aksi dan membawa rincian dari server.
   Hanya mencatat angka dan nama aksi (tanpa PIN, kode pegawai, nama, atau isi data). Catatan dikirim berkelompok ke aksi perfLog.
   Panggilan yang cepat dan berhasil hanya diambil sebagian (bobot); yang lambat atau gagal selalu dicatat.
   Nonaktif di browser otomatis (navigator.webdriver) kecuali window.UKUR_TEST = true; atau localStorage sctk_ukur_off = 1. */
(function (W) {
  "use strict";
  if (W.__ukur) return; W.__ukur = 1;
  var VA = "T41", PELUANG = 0.3, MAKS_ANTRE = 200, JEDA = 30000, KELOMPOK = 15;
  try { if ((navigator.webdriver && !W.UKUR_TEST) || localStorage.getItem("sctk_ukur_off") === "1") return; } catch (e) { if (navigator.webdriver && !W.UKUR_TEST) return; }
  if (typeof W.fetch !== "function") return;
  var asli = W.fetch.bind(W), antre = [], urlApi = "", timer = null;
  function apiUrl(u) { return /script\.google\.com\/(a\/[^\/]+\/)?macros\/s\/|script\.googleusercontent\.com\//.test(String(u || "")); }
  function target(a) {
    if (/(List|Cari|Baca|Laporan|Rinci|Daftar|Ringkas|Analisa|Pintar|Cek|Unduh|Telusur|Indeks|Arsip)$/i.test(a)) return 4000;
    return /(Simpan|Serah|Koreksi|Terima|Acc|Tolak|Impor|Import|Buat|Hapus|Kirim|Setuju|Proses|Ubah|Isi|Tandai|Batal|Revisi|Setel|Alokasi|Ganti)/i.test(a) || a === "submit" || a === "decide" ? 6000 : 4000;
  }
  function halaman() { var p = (location.pathname.split("/").pop() || "index.html"), h = (location.hash || "").replace("#", "").split(/[?&]/)[0]; return (p + (h && /admin/.test(p) ? "#" + h : "")).slice(0, 40); }
  function rekam(aksi, t0, teks, status, galatJaringan) {
    try {
      var total = Math.round(performance.now() - t0), tail = String(teks || "").slice(-400), p = null, m = /"_p":(\{[^{}]*\})\}\s*$/.exec(tail);
      if (m) { try { p = JSON.parse(m[1]); } catch (e) { p = null; } }
      var gagal = galatJaringan || status >= 400 || (!p && /^\s*</.test(String(teks || "").slice(0, 20))) || (status === 200 && !p && !teks);
      var r = {a: aksi, p: halaman(), d: W.innerWidth <= 700 ? "hp" : "komputer", va: VA, t: total, kb: Math.round(String(teks || "").length / 102.4) / 10, g: gagal ? 1 : 0, ts: Date.now(), w: 1};
      if (gagal) r.j = galatJaringan ? "jaringan" : (status >= 400 ? "http" + status : (/^\s*</.test(String(teks || "").slice(0, 20)) ? "html" : "kosong"));
      try { r.c = (navigator.connection && navigator.connection.effectiveType) || ""; } catch (e) { r.c = ""; }
      if (p) { r.s = p.ms; r.k = p.k; r.h = p.h; r.m = p.m; r.mm = p.mm; r.sh = p.s; r.cd = p.d; r.o = p.o; r.vk = p.v; r.sm = p.sm; r.sn = p.sn; r.tg = p.tg; }
      var lambat = total > target(aksi);
      if (!gagal && !lambat) { if (Math.random() > PELUANG) return; r.w = Math.round(100 / PELUANG) / 100; }
      antre.push(r); if (antre.length > MAKS_ANTRE) antre.splice(0, antre.length - MAKS_ANTRE);
      if (antre.length >= KELOMPOK) kirim(false); else if (!timer) timer = setTimeout(function () { timer = null; kirim(false); }, JEDA);
    } catch (e) { /* pengukur tidak boleh mengganggu aplikasi */ }
  }
  function kirim(akhir) {
    if (!antre.length || !urlApi) return;
    var paket = antre.splice(0, 60);
    try { asli(urlApi, {method: "POST", headers: {"Content-Type": "text/plain;charset=utf-8"}, body: JSON.stringify({action: "perfLog", r: paket}), keepalive: !!akhir || paket.length < 40}).catch(function () {}); } catch (e) { /* dibuang */ }
    if (antre.length && !akhir) setTimeout(function () { kirim(false); }, 1000);
  }
  W.fetch = function (input, init) {
    try {
      var url = typeof input === "string" ? input : (input && input.url) || "";
      if (!apiUrl(url) || !init || typeof init.body !== "string") return asli(input, init);
      var b; try { b = JSON.parse(init.body); } catch (e) { return asli(input, init); }
      if (!b || typeof b !== "object" || !b.action || typeof b.action !== "string" || b.action === "perfLog" || /^adminPerf/.test(b.action)) return asli(input, init);
      urlApi = url; b.pf = 1;
      var init2 = {}; for (var k in init) init2[k] = init[k]; init2.body = JSON.stringify(b);
      var t0 = performance.now(), aksi = b.action;
      return asli(input, init2).then(function (res) {
        try { res.clone().text().then(function (tx) { rekam(aksi, t0, tx, res.status, false); }, function () { rekam(aksi, t0, "", res.status, true); }); } catch (e) { /* abaikan */ }
        return res;
      }, function (err) { rekam(aksi, t0, "", 0, true); throw err; });
    } catch (e) { return asli(input, init); }
  };
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") kirim(true); });
  W.addEventListener("pagehide", function () { kirim(true); });
  W.UKUR = {antre: function () { return antre.slice(); }, kirim: function () { kirim(true); }, versi: VA};
})(window);
