/* INFO "SEDANG DIORDER" untuk halaman pegawai/PIC (Tambahan 132): Form Permintaan, Cek PPBJ (proyek.html), Kebutuhan (kebutuhan.html), form Kebutuhan Proyek.
   Hanya keterangan: TANPA No PPBJ, PO, supplier, jumlah, dan tanggal (keputusan Iyan). Data dari aksi server orderPetaPublik (daftar kode barang).
   Pakai: OI.atur(function(){ return api({action:"orderPetaPublik"}); }) sekali; lalu OIH(kode) di mana pun barang tampil.
   OIH(kode, cadangan): cadangan = HTML yang ditampilkan bila barang TIDAK ada di daftar order (mis. tanda ORDER lama dari PDF PPBJ). Hanya membaca, tidak mengubah apa pun. */
(function (root) {
  "use strict";
  var OI = root.OI = root.OI || {}, KS = "sctk_oi_v1", UMUR = 10 * 60 * 1000;
  OI.peta = null; OI.waktu = 0; OI.fn = null; OI.memuat = null;
  function kunci(k) { return String(k == null ? "" : k).trim().toUpperCase(); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]; }); }
  function gaya() {
    if (document.getElementById("oi-gaya")) return;
    var st = document.createElement("style"); st.id = "oi-gaya";
    st.textContent = ".oi-w:empty{display:none}.oi-b{display:inline-block;margin:2px 0 0 4px;padding:1px 9px;border-radius:10px;font:700 11px/1.5 \"Segoe UI\",Roboto,Arial,sans-serif;background:#fff3cd;color:#6b4e00;border:1px solid #e6c76a;border-left:4px solid #d9a400;white-space:nowrap;vertical-align:middle;cursor:help}@media print{.oi-w{display:none!important}}";
    document.head.appendChild(st);
  }
  function lencana() { return '<span class="oi-b" title="Barang ini sedang dalam pemesanan ke supplier. Tanya Staff Gudang untuk perkiraan kedatangannya.">Sedang diorder</span>'; }
  function ada(kode) { return !!(OI.peta && OI.peta[kunci(kode)]); }
  function isiSatu(s) {
    var k = s.getAttribute("data-oik"), h = ada(k) ? lencana() : (s.getAttribute("data-oic") || "");
    if (s.innerHTML !== h) s.innerHTML = h;
  }
  OI.isi = function (el) { if (!OI.peta) return; (el || document).querySelectorAll("[data-oik]").forEach(isiSatu); };
  function simpan() { try { localStorage.setItem(KS, JSON.stringify({t: OI.waktu, p: Object.keys(OI.peta)})); } catch (e) { /* abaikan */ } }
  function baca() {
    try { var o = JSON.parse(localStorage.getItem(KS) || "null"); if (o && o.p) { OI.peta = {}; o.p.forEach(function (k) { OI.peta[k] = 1; }); OI.waktu = o.t || 0; return true; } } catch (e) { /* abaikan */ }
    return false;
  }
  OI.atur = function (fn) { OI.fn = fn; gaya(); };
  /** Muat daftar kode yang sedang dipesan (pakai simpanan browser, perbarui bila lebih dari 10 menit). */
  OI.muat = function (paksa) {
    gaya();
    if (!OI.peta) baca();
    if (OI.peta) OI.isi();
    if (!paksa && OI.peta && Date.now() - OI.waktu < UMUR) return Promise.resolve(OI.peta);
    if (OI.memuat) return OI.memuat;
    if (!OI.fn) return Promise.resolve(OI.peta);
    OI.memuat = Promise.resolve(OI.fn()).then(function (r) {
      OI.memuat = null;
      if (r && r.ok && r.kode) { OI.peta = {}; r.kode.forEach(function (k) { OI.peta[kunci(k)] = 1; }); OI.waktu = Date.now(); simpan(); OI.isi(); }
      return OI.peta;
    }).catch(function () { OI.memuat = null; return OI.peta; });
    return OI.memuat;
  };
  /** Tempat keterangan di samping nama barang. Terisi otomatis setelah daftar dimuat. */
  OI.html = function (kode, cadangan) {
    if (!kode) return cadangan || "";
    if (!OI.peta && !OI.memuat && OI.fn) OI.muat();
    var k = kunci(kode), cad = cadangan || "";
    return '<span class="oi-w" data-oik="' + esc(k) + '" data-oic="' + esc(cad) + '">' + (OI.peta ? (ada(k) ? lencana() : cad) : cad) + "</span>";
  };
  if (typeof MutationObserver === "function") {
    var t = null;
    new MutationObserver(function () { if (!OI.peta) return; clearTimeout(t); t = setTimeout(function () { OI.isi(); }, 60); })
      .observe(document.documentElement, {childList: true, subtree: true});
  }
  root.OIH = function (kode, cadangan) { return OI.html(kode, cadangan); };
})(window);
