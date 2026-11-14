/* Tambahan 117: ISI TIDAK PERNAH KOSONG DI HALAMAN ADMIN.
   Aturan Iyan: "semua halaman admin tanpa terkecuali harus muncul isinya, jangan cuma ada notif sementara tampilan kosong".
   Cara kerja (satu tempat untuk SEMUA tab, tanpa mengubah tiap tab):
   1. Tulisan sementara "Memuat... / Menghitung... / Mencari..." yang ditulis ke area isi (#pane atau bagian di dalamnya)
      TIDAK lagi menghapus isi yang sedang tampil. Isi lama tetap terlihat (agak redup) dengan pita "Memperbarui data..." di atas.
      Begitu data baru siap, isi diganti di tempat dan posisi gulir tetap.
   2. Pindah ke tab lain: tampilan terakhir tab itu (cuplikan) langsung muncul, redup dan belum bisa diklik, sampai data baru datang.
      Bagian di dalam tab (mis. daftar hasil filter) juga diisi dari cuplikan bila namanya (id) sama.
   3. Tab yang belum pernah dibuka di browser ini: tampil kerangka abu-abu, bukan layar kosong.
   4. Pesan gagal tidak menimpa isi lama: isi tetap, pita menyebut "Gagal memperbarui" dengan tombol Coba lagi.
   5. Pita "Ada data lebih baru" (tampil-dulu, swr.js) tampil di atas isi dengan tombol Perbarui, tidak lagi melayang di bawah.
   6. Sekali per sesi sesudah masuk, tab utama yang belum tersimpan diambil di belakang satu per satu.
   Cuplikan disimpan di browser ini paling lama 12 jam, terikat ke kode admin (hash), dan dibuang saat Keluar atau kode salah.
   Matikan: localStorage.setItem("sctk_tl_off","1"). */
(function (W, d) {
  "use strict";
  if (W.TAMPIL) return;
  try { if (localStorage.getItem("sctk_tl_off") === "1") return; } catch (e) { }
  var D = Object.getOwnPropertyDescriptor(Element.prototype, "innerHTML");
  if (!D || !D.set || !D.get) return;
  var AWAL = "sctk_tl1|", UMUR = 12 * 3600e3, MAKS_SIMPAN = 350 * 1024, MAKS_MEMORI = 2500 * 1024;
  var RX_MUAT = /\b(memuat|menghitung|mencari|menyiapkan|mengambil|menyinkronkan)\b[^.]*(\.\.\.|…)\s*$/i;
  var RX_GAGAL = /^(gagal|error|tidak dapat|tidak bisa terhubung)/i;
  var RX_AKTIF = /<(input|select|textarea|table|button)\b/i;
  var mem = {}, liveTab = "", pindah = false, simpanT = null, bar = null, barJenis = "", barPesan = "", pfMulai = false;

  function setH(el, v) { D.set.call(el, v); }
  function getH(el) { return D.get.call(el); }
  function teks(s) { return String(s || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim(); }
  function jenisHtml(s) {
    s = String(s == null ? "" : s);
    if (s.length > 900 || RX_AKTIF.test(s)) return "isi";
    var t = teks(s);
    if (!t || t.length > 180) return "isi";
    if (RX_MUAT.test(t)) return "muat";
    if (/\berr\b/.test(s) || RX_GAGAL.test(t)) return "gagal";
    return "isi";
  }
  function pane() { return d.getElementById("pane"); }
  function diPane(el) { var p = pane(); return !!p && (el === p || p.contains(el)); }
  function tab() { return String(W.TAB || ""); }
  function hashPin() { var h = 5381, s = String(W.PIN || ""); for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
  function kunci(t) { return AWAL + hashPin() + "|" + t; }
  /** Isi yang berarti: bukan kosong, bukan tulisan sementara, bukan kerangka. */
  function adaIsi(el) {
    if (el.classList.contains("tl-kerangka")) return false;
    var h = getH(el); if (!h || !h.trim()) return false;
    return jenisHtml(h) !== "muat";
  }

  // ---------- cuplikan per tab ----------
  function cuplikan(t) {
    if (!t || !W.PIN) return "";
    if (mem[t]) return mem[t];
    try { var o = JSON.parse(localStorage.getItem(kunci(t)) || "null"); if (o && typeof o.t === "number" && Date.now() - o.t < UMUR && o.h) { mem[t] = o.h; return o.h; } } catch (e) { }
    return "";
  }
  function simpanCuplikan(t) {
    var p = pane(); if (!p || !t || t !== liveTab || !W.PIN) return;
    if (p.querySelector(".tl-lama,.tl-kerangka") || p.classList.contains("tl-lama") || p.classList.contains("tl-kerangka")) return;   // masih ada bagian lama: jangan simpan campuran
    var h = getH(p); if (!h || jenisHtml(h) !== "isi") return;
    if (h.length > MAKS_MEMORI) return;
    mem[t] = h;
    if (h.length <= MAKS_SIMPAN) { try { localStorage.setItem(kunci(t), JSON.stringify({t: Date.now(), h: h})); } catch (e) { bersihSimpan(); } }
  }
  function jadwalSimpan() { clearTimeout(simpanT); var t = tab(); simpanT = setTimeout(function () { simpanCuplikan(t); }, 2500); }
  function bersihSimpan() { try { var k = []; for (var i = 0; i < localStorage.length; i++) { var x = localStorage.key(i); if (x && x.indexOf(AWAL) === 0) k.push(x); } k.forEach(function (x) { localStorage.removeItem(x); }); } catch (e) { } }
  function bersih() { mem = {}; bersihSimpan(); try { sessionStorage.removeItem("sctk_tl_pf"); } catch (e) { } }
  /** Isi bagian (id) dari cuplikan tab saat ini. */
  function bagianDariCuplikan(id) {
    var h = cuplikan(tab()); if (!h || !id) return "";
    try { var tp = d.createElement("template"); setH(tp, h); var e = tp.content.getElementById(id); if (e && adaIsi(e)) return getH(e); } catch (e2) { }
    return "";
  }
  /** Sesudah isi tab ditulis: bagian ber-id yang masih "Memuat..." diisi dari cuplikan (redup), sisanya kerangka. */
  function isiBagianKosong(root) {
    var h = cuplikan(tab()), tp = null;
    [].forEach.call(root.querySelectorAll("[id]"), function (e) {
      var s = getH(e); if (!s || jenisHtml(s) !== "muat" || e.children.length > 3) return;
      if (h && !tp) { try { tp = d.createElement("template"); setH(tp, h); } catch (x) { tp = null; } }
      var lama = tp && tp.content.getElementById(e.id);
      if (lama && adaIsi(lama)) { setH(e, getH(lama)); e.classList.add("tl-lama"); }
      else e.classList.add("tl-kerangka");
    });
  }

  // ---------- pita di atas isi ----------
  function gambarBar() {
    var p = pane(), induk = p && p.parentNode;
    var adaTunggu = !!(p && (p.classList.contains("tl-tunggu") || p.classList.contains("tl-lama") || p.classList.contains("tl-kerangka") || p.querySelector(".tl-tunggu,.tl-lama,.tl-kerangka")));
    var j = barJenis || (adaTunggu ? "muat" : "");
    if (!j || !induk) { if (bar && bar.parentNode) bar.parentNode.removeChild(bar); return; }
    if (!bar) { bar = d.createElement("div"); bar.className = "tl-bar"; bar.setAttribute("role", "status"); bar.setAttribute("aria-live", "polite"); }
    var lama = !!(p && (p.classList.contains("tl-lama") || p.querySelector(".tl-lama")));
    var h;
    if (j === "muat") h = '<span class="tl-putar" aria-hidden="true"></span><span>' + (lama ? "Memuat data terbaru. Yang tampil di bawah adalah tampilan terakhir tab ini." : "Memperbarui data...") + '</span>';
    else if (j === "gagal") h = '<span>Gagal memperbarui' + (barPesan ? ": " + esc(barPesan) : "") + '. Yang tampil di bawah adalah data terakhir.</span><button type="button" class="tl-aksi" data-tl="ulang">Coba lagi</button><button type="button" class="tl-tutup" data-tl="tutup" aria-label="Tutup">&times;</button>';
    else h = '<span>Ada data lebih baru dari server.</span><button type="button" class="tl-aksi" data-tl="baru">Perbarui</button><button type="button" class="tl-tutup" data-tl="tutup" aria-label="Tutup">&times;</button>';
    bar.className = "tl-bar tl-" + j;
    setH(bar, h);
    if (bar.parentNode !== induk || bar.nextSibling !== p) {
      var bb = induk.querySelector(".basi-bar");   // pita "Dihitung pukul" (basi.js) tetap paling dekat dengan isi
      induk.insertBefore(bar, bb && bb.nextSibling === p ? bb : p);
    }
    [].forEach.call(bar.querySelectorAll("[data-tl]"), function (b) {
      b.onclick = function () {
        var a = b.getAttribute("data-tl"); barJenis = ""; barPesan = "";
        if (a === "baru") { if (W.SWR && W.SWR.tampilkan) W.SWR.tampilkan(); else if (W.goTab) W.goTab(W.TAB); }
        else if (a === "ulang") { if (W.goTab) W.goTab(W.TAB); }
        gambarBar();
      };
    });
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]; }); }
  function selesaiCek() { if (barJenis === "muat") barJenis = ""; setTimeout(gambarBar, 0); }

  // ---------- inti: penulisan innerHTML ke area isi ----------
  function tulis(el, v) {
    var s = String(v == null ? "" : v), j = jenisHtml(s), isPane = el.id === "pane";
    if (j === "muat") {
      if (adaIsi(el) && !(isPane && pindah)) { el.classList.add("tl-tunggu"); if (barJenis !== "gagal") barJenis = ""; gambarBar(); return; }   // isi tetap tampil
      var lama = isPane ? cuplikan(tab()) : bagianDariCuplikan(el.id);
      if (lama) { setH(el, lama); el.classList.remove("tl-kerangka", "tl-tunggu"); el.classList.add("tl-lama"); gambarBar(); return; }
      setH(el, s); el.classList.remove("tl-lama", "tl-tunggu"); el.classList.add("tl-kerangka"); gambarBar(); return;
    }
    if (j === "gagal" && adaIsi(el) && (el.classList.contains("tl-tunggu") || el.classList.contains("tl-lama"))) {
      el.classList.remove("tl-tunggu"); barJenis = "gagal"; barPesan = teks(s).slice(0, 120); gambarBar(); return;   // pesan gagal tidak menimpa isi lama
    }
    var jaga = el.classList.contains("tl-tunggu") || el.classList.contains("tl-lama"), sy = jaga ? (W.scrollY || 0) : null;
    setH(el, s);
    el.classList.remove("tl-tunggu", "tl-lama", "tl-kerangka");
    if (isPane) { liveTab = tab(); pindah = false; if (j === "isi") isiBagianKosong(el); }
    if (sy != null && Math.abs((W.scrollY || 0) - sy) > 2) { try { W.scrollTo(0, sy); } catch (e) { } }
    if (j === "isi") { jadwalSimpan(); mulaiAmbilLatar(); }
    selesaiCek();
  }
  Object.defineProperty(Element.prototype, "innerHTML", {
    configurable: true, enumerable: D.enumerable, get: D.get,
    set: function (v) {
      try { if (this.nodeType === 1 && W.PIN && diPane(this)) return tulis(this, v); } catch (e) { }
      return D.set.call(this, v);
    }
  });

  // ---------- pindah tab ----------
  var goAsli = W.goTab;
  if (typeof goAsli === "function") {
    W.goTab = function (t) {
      try {
        if (t !== W.TAB) {
          clearTimeout(simpanT); simpanCuplikan(tab());
          pindah = true; liveTab = ""; barJenis = ""; barPesan = "";
          var p = pane(); if (p) p.classList.remove("tl-tunggu", "tl-lama", "tl-kerangka");
        }
      } catch (e) { }
      var r = goAsli.apply(this, arguments);
      setTimeout(gambarBar, 0);
      return r;
    };
  }
  function simpanSekarang() { try { clearTimeout(simpanT); simpanCuplikan(tab()); } catch (e) { } }
  W.addEventListener("pagehide", simpanSekarang);
  d.addEventListener("visibilitychange", function () { if (d.visibilityState === "hidden") simpanSekarang(); });

  // ---------- ambil tab utama di belakang (sekali per sesi) ----------
  var LATAR = [{action: "adminKerja"}, {action: "adminProyekList"}, {action: "adminProyekKurang"}, {action: "adminProyekPintar"}, {action: "adminSerahList"}, {action: "adminBufferList"}, {action: "adminPaRingkas"}, {action: "adminPengingatDaftar"}];
  function mulaiAmbilLatar() {
    if (pfMulai || !W.PIN || !W.SWR || typeof W.api !== "function") return;
    try { if (sessionStorage.getItem("sctk_tl_pf") === "1") { pfMulai = true; return; } sessionStorage.setItem("sctk_tl_pf", "1"); } catch (e) { }
    pfMulai = true;
    var i = 0;
    (function lanjut() {
      if (i >= LATAR.length || !W.PIN) return;
      if (d.visibilityState === "hidden") { setTimeout(lanjut, 15000); return; }
      var b = LATAR[i++], c = {}; for (var x in b) c[x] = b[x];
      if (W.SWR.ada && W.SWR.ada(c)) { setTimeout(lanjut, 200); return; }
      var t0 = Date.now();
      Promise.resolve(W.api(c)).then(function (j) {
        if (j && j.ok === false && /kode|PIN|akses/i.test(String(j.msg || ""))) return;
        setTimeout(lanjut, Math.min(8000, 1500 + (Date.now() - t0) / 2));
      }, function () { setTimeout(lanjut, 10000); });
    })();
  }
  setTimeout(function () { if (W.PIN && pane()) mulaiAmbilLatar(); }, 6000);
  // Pengaman: bila server tidak menjawab 60 detik, isi yang ditahan dibuka lagi (bisa diklik) dan pita menawarkan Coba lagi. Tab tidak pernah terkunci.
  var tahanSejak = 0;
  setInterval(function () {
    var p = pane(); if (!p) { tahanSejak = 0; return; }
    var ditahan = p.classList.contains("tl-tunggu") || p.classList.contains("tl-lama") || !!p.querySelector(".tl-tunggu,.tl-lama");
    if (!ditahan) { tahanSejak = 0; return; }
    if (!tahanSejak) { tahanSejak = Date.now(); return; }
    if (Date.now() - tahanSejak < 60000) return;
    tahanSejak = 0;
    [p].concat([].slice.call(p.querySelectorAll(".tl-tunggu"))).forEach(function (e) { e.classList.remove("tl-tunggu"); });
    barJenis = "gagal"; barPesan = "server belum menjawab"; gambarBar();
  }, 5000);

  // ---------- gaya ----------
  try {
    var st = d.createElement("style");
    st.textContent = [
      ".tl-tunggu{opacity:.72;pointer-events:none;transition:opacity .25s}",
      ".tl-lama{opacity:.6;pointer-events:none;filter:saturate(.75)}",
      ".tl-kerangka{position:relative;min-height:180px}",
      ".tl-kerangka::after{content:'';position:absolute;left:0;right:0;top:56px;bottom:0;border-radius:6px;background:repeating-linear-gradient(to bottom,var(--line,#d9e1ea) 0 14px,transparent 14px 32px);opacity:.5;animation:tlk 1.3s ease-in-out infinite alternate;pointer-events:none}",
      "@keyframes tlk{from{opacity:.22}to{opacity:.55}}",
      ".tl-bar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:0 0 10px;padding:8px 12px;border:1px solid var(--line,#c9d6e3);border-left:4px solid #2f7fc1;border-radius:6px;background:var(--card,var(--bg,#fff));color:inherit;font-size:13px}",
      ".tl-bar span{flex:1;min-width:200px}.tl-bar.tl-gagal{border-left-color:#c0392b}.tl-bar.tl-baru{border-left-color:#1e8449}",
      ".tl-bar .tl-aksi{white-space:nowrap}.tl-bar .tl-tutup{background:none;border:0;color:inherit;font-size:18px;line-height:1;cursor:pointer;padding:0 4px;flex:none}",
      ".tl-bar .tl-putar{flex:none;min-width:0;width:14px;height:14px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:tlp .8s linear infinite;opacity:.7}",
      "@keyframes tlp{to{transform:rotate(360deg)}}",
      "@media (prefers-reduced-motion:reduce){.tl-kerangka::after,.tl-bar .tl-putar{animation:none}}",
      /* pita di atas isi tidak boleh menggeser tata letak dua kolom (menu kiri, isi kanan): pita dan isi selalu di kolom kanan */
      "@media (min-width:861px){.adm:not(.tutup){grid-template-rows:auto auto auto 1fr}.adm:not(.tutup)>.side{grid-row:1/5}.adm:not(.tutup)>.tl-bar,.adm:not(.tutup)>.basi-bar,.adm:not(.tutup)>#pane{grid-column:2}}"
    ].join("");
    d.head.appendChild(st);
  } catch (e) { }

  W.TAMPIL = {
    bersih: bersih,
    adaBaru: function () { barJenis = "baru"; gambarBar(); },
    adaBaruHapus: function () { if (barJenis === "baru") { barJenis = ""; gambarBar(); } },
    _jenis: jenisHtml, _cuplikan: cuplikan, _simpan: function () { simpanCuplikan(tab()); }
  };
})(window, document);
