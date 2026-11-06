/* TAMPIL-DULU (Tambahan 46). Halaman admin yang berat langsung menampilkan hasil terakhir yang tersimpan di browser (di bawah 0,3 detik),
   sementara data terbaru diambil di belakang. Bila ternyata berbeda, muncul pita kecil "Data terbaru tersedia - Tampilkan"; tidak ada tampilan
   yang berubah sendiri (supaya yang sedang diketik tidak hilang).
   Aman karena: (1) hanya aksi BACA yang terdaftar; (2) setiap aksi selain baca dari browser ini menghapus semua simpanan dulu,
   sehingga sehabis menyimpan/menyetujui, daftar selalu dibaca baru; (3) simpanan terikat ke kode admin (hash, bukan kode), umur maksimal 12 jam;
   (4) kode admin salah/dicabut -> simpanan dibuang. Matikan: localStorage.setItem("sctk_swr_off","1").
   Catatan: data admin tersimpan di browser perangkat ini sampai 12 jam; pada komputer bersama jalankan SWR.bersih() atau tutup lewat tombol Keluar. */
(function (W) {
  "use strict";
  if (W.SWR || typeof W.api !== "function") return;
  var AWAL = "sctk_swr1|", UMUR = 12 * 3600e3, SEGAR = 20e3, MAKS_KB = 300;
  var DAFTAR = {adminKerja: 1, adminProyekPintar: 1, adminProyekKurang: 1, adminKpi: 1, adminBufferList: 1, adminPaList: 1, adminProyekList: 1, adminList: 1, adminSerahList: 1, adminPengingatDaftar: 1};
  var BACA = /(List|Get|Rinci|Daftar|Ringkas|Info|Cari|Indeks|Pintar|Kurang|Pratinjau|Periksa|Riwayat|Analisis|Analisa|Kpi|Pada|Laporan|Dugaan|Simulasi|Telusur|Lihat)$/;
  try { if (localStorage.getItem("sctk_swr_off") === "1") return; } catch (e) { return; }
  var asli = W.api, jalan = {}, tahanSampai = 0, baru = {};

  function hashPin(p) { var h = 5381, s = String(p || ""); for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
  function pinAktif(b) { return (typeof W.PIN === "string" && W.PIN) ? W.PIN : (b && b.pin) || ""; }   // api() asli memasang PIN global ke tiap permintaan
  function kunci(b) {
    var o = {}, ks = Object.keys(b).sort(); ks.forEach(function (k) { if (k !== "pin" && k !== "pf") o[k] = b[k]; });
    return AWAL + b.action + "|" + hashPin(pinAktif(b)) + "|" + JSON.stringify(o);
  }
  function baca(k) { try { var o = JSON.parse(localStorage.getItem(k) || "null"); if (o && typeof o.t === "number" && Date.now() - o.t < UMUR && o.d) return o; } catch (e) { } return null; }
  function bersih() { try { var d = []; for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf(AWAL) === 0) d.push(k); } d.forEach(function (k) { localStorage.removeItem(k); }); } catch (e) { } baru = {}; pita(false); }
  function simpan(k, teks) {
    if (teks.length > MAKS_KB * 1024) return;
    try { localStorage.setItem(k, JSON.stringify({t: Date.now(), d: teks})); }
    catch (e) { bersih(); try { localStorage.setItem(k, JSON.stringify({t: Date.now(), d: teks})); } catch (e2) { } }
  }
  function pita(tampil) {
    var el = document.getElementById("swr-pita");
    if (!tampil) { if (el) el.style.display = "none"; return; }
    if (!el) {
      el = document.createElement("div"); el.id = "swr-pita";
      el.style.cssText = "position:fixed;left:50%;transform:translateX(-50%);bottom:14px;z-index:9999;background:#0a2a43;color:#fff;padding:9px 14px;border-radius:6px;font-size:13px;box-shadow:0 3px 14px rgba(0,0,0,.3);display:flex;gap:12px;align-items:center;max-width:92vw";
      el.innerHTML = '<span>Data terbaru tersedia.</span><button type="button" id="swr-tampil" style="background:#fff;color:#0a2a43;border:0;border-radius:4px;padding:5px 12px;font-weight:bold;cursor:pointer">Tampilkan</button><button type="button" id="swr-tutup" style="background:none;border:0;color:#fff;cursor:pointer;font-size:16px" aria-label="Tutup">&times;</button>';
      document.body.appendChild(el);
      document.getElementById("swr-tampil").onclick = function () {
        pita(false); tahanSampai = Date.now() + 4000;   // pakai hasil yang baru saja tersimpan, tanpa memanggil ulang
        try { if (typeof W.goTab === "function") W.goTab(W.TAB || "pantau"); else location.reload(); } catch (e) { location.reload(); }
      };
      document.getElementById("swr-tutup").onclick = function () { pita(false); };
    }
    el.style.display = "flex";
  }
  function segarkanLatar(b, k, lama) {
    if (jalan[k]) return; var salinan = {}; for (var x in b) salinan[x] = b[x];
    jalan[k] = asli(salinan).then(function (j) {
      delete jalan[k];
      if (!j || j.ok === false) { if (j && /kode|PIN|akses/i.test(String(j.msg || ""))) { bersih(); pita(true); } return; }
      var teks = JSON.stringify(j); if (teks === lama) { simpan(k, teks); return; }
      simpan(k, teks); baru[k] = 1; pita(true);
    }, function () { delete jalan[k]; });
  }
  W.api = function (b) {
    try {
      var a = b && b.action;
      if (!a || typeof a !== "string") return asli(b);
      if (!DAFTAR[a]) {
        if (!BACA.test(a) && a !== "decide") { bersih(); var p = asli(b); try { p.then(bersih, bersih); } catch (e) { } return p; }
        if (a === "decide") { bersih(); }
        return asli(b);
      }
      if (b.segar === 1 || !pinAktif(b)) return asli(b);
      var k = kunci(b), c = baca(k);
      if (c) {
        var umur = Date.now() - c.t, j; try { j = JSON.parse(c.d); } catch (e) { j = null; }
        if (j) {
          if (umur >= SEGAR && Date.now() > tahanSampai) segarkanLatar(b, k, c.d);
          if (W.SWR) W.SWR.terakhir = {aksi: a, umur: umur};
          return Promise.resolve(j);
        }
      }
      return asli(b).then(function (j2) { try { if (j2 && j2.ok !== false) simpan(k, JSON.stringify(j2)); } catch (e) { } return j2; });
    } catch (e) { return asli(b); }
  };
  W.SWR = {bersih: bersih, terakhir: null, daftar: DAFTAR};
})(window);
