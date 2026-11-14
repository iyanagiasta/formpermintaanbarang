/* Tambahan 126: navigasi admin.
   - Tab di atas area kerja seperti Accurate (maks 8, diingat setelah muat ulang, posisi gulir diingat per tab).
   - Pencarian pintar di kotak menu samping: menyaring menu saat mengetik (kata sehari-hari, toleran salah ketik),
     baris "Cari barang / PPBJ" tetap ada, panah + Enter, Esc.
   - Menu favorit (bintang) dan 5 menu terakhir dibuka.
   - Pintasan: Ctrl+K ke kotak cari menu, Alt+1..8 pindah tab, Alt+W tutup tab aktif. Tombol Kembali browser ikut pindah menu.
   Hanya tampilan; tidak menyentuh server. */
(function () {
  "use strict";
  var d = document, KT = "sctk_nav_tabs", KF = "sctk_nav_fav", KR = "sctk_nav_baru", MAKS = 8;
  var gulir = {}, kotor = {}, dariRiwayat = false;
  function ls(k, def) { try { var v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? def : v; } catch (e) { return def; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* abaikan */ } }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]; }); }
  function menuSemua() { var a = []; (window.MENU || []).forEach(function (g) { g[1].forEach(function (x) { a.push({t: x[0], nama: x[1], grup: g[0]}); }); }); return a; }
  function luar(t) { return t === "pembelian" || t === "realisasi" || t === "label"; }
  function nama(t) { try { return window.namaTab ? window.namaTab(t) : t; } catch (e) { return t; } }
  function ada(t) { return menuSemua().some(function (m) { return m.t === t; }); }

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
    telusur: "telusur lacak riwayat barang jejak ppbj bpb", analisa: "analisa analisis cukup kekurangan beli anggaran cukup proyek",
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

  /* ---------- tab di atas ---------- */
  function tabs() { return ls(KT, []).filter(function (x) { return x && ada(x.t) && !luar(x.t); }); }
  function catat(t) {
    if (!t || luar(t) || !ada(t)) return;
    var a = tabs(), now = Date.now(), x = a.filter(function (y) { return y.t === t; })[0];
    if (x) x.w = now; else a.push({t: t, w: now});
    while (a.length > MAKS) { var tua = null; a.forEach(function (y) { if (y.t !== t && (!tua || y.w < tua.w)) tua = y; }); a = a.filter(function (y) { return y !== tua; }); }
    lsSet(KT, a);
    var r = ls(KR, []).filter(function (y) { return y !== t; }); r.unshift(t); lsSet(KR, r.slice(0, 5));
  }
  function gambarBar() {
    var bar = d.getElementById("navtabs"); if (!bar) return;
    var a = tabs(), aktif = window.TAB;
    if (!a.length) { bar.innerHTML = ""; return; }
    bar.innerHTML = '<div class="ntw" role="tablist" aria-label="Tab yang terbuka">' + a.map(function (x, i) {
      var on = x.t === aktif;
      return '<div class="nt' + (on ? " on" : "") + '"><button type="button" role="tab" aria-selected="' + on + '" data-nt="' + esc(x.t) + '" title="' + esc(nama(x.t)) + (i < 8 ? " (Alt+" + (i + 1) + ")" : "") + '">' + esc(nama(x.t)) + '</button><button type="button" class="ntx" data-ntx="' + esc(x.t) + '" aria-label="Tutup tab ' + esc(nama(x.t)) + '" title="Tutup tab' + (on ? " (Alt+W)" : "") + '">&times;</button></div>';
    }).join("") + '</div>';
    bar.querySelectorAll("[data-nt]").forEach(function (b) { b.onclick = function () { var t = b.getAttribute("data-nt"); if (t !== window.TAB) window.goTab(t); }; });
    bar.querySelectorAll("[data-ntx]").forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); tutup(b.getAttribute("data-ntx")); }; });
    var on = bar.querySelector(".nt.on"); if (on && on.scrollIntoView) { try { on.scrollIntoView({block: "nearest", inline: "nearest"}); } catch (e2) { /* abaikan */ } }
  }
  function tutup(t) {
    var a = tabs(), i = a.findIndex(function (x) { return x.t === t; }); if (i < 0) return;
    if (t === window.TAB && adaKotor(t) && !konfirmasi(t)) return;
    a.splice(i, 1); lsSet(KT, a); delete gulir[t]; delete kotor[t];
    if (t === window.TAB) { var n = a[i] || a[i - 1]; if (n) window.goTab(n.t); else gambarBar(); } else gambarBar();
  }
  function konfirmasi(t) { return window.confirm('Ada isian yang belum disimpan di tab "' + nama(t) + '". Lanjutkan? Isian itu akan hilang.'); }

  /* ---------- isian belum disimpan ---------- */
  function seperti_cari(el) { return el.type === "search" || /cari|search|filter|saring|^q$|[_-]q$|ketik nama|ketik kode/i.test((el.id || "") + " " + (el.placeholder || "")); }
  d.addEventListener("input", function (e) {
    var el = e.target, p = d.getElementById("pane"); if (!p || !el || !p.contains(el)) return;
    if (el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && /^(text|number|date|tel|email|)$/.test(el.type || "text") && !seperti_cari(el))) { var a = kotor[window.TAB] || (kotor[window.TAB] = []); if (a.indexOf(el) < 0) a.push(el); }
  }, true);
  /* Isian dianggap belum disimpan hanya bila elemen yang diketik masih tampil di halaman dan isinya berbeda dari isi awal.
     Setelah disimpan, halaman biasanya digambar ulang sehingga elemen lama hilang dan peringatan tidak muncul. */
  function adaKotor(t) {
    var a = (kotor[t] || []).filter(function (el) { return el.isConnected; }); kotor[t] = a;
    return a.some(function (el) { var v = String(el.value == null ? "" : el.value); return v.trim() !== "" && v !== String(el.defaultValue == null ? "" : el.defaultValue); });
  }

  /* ---------- posisi gulir ---------- */
  function pulih(t) {
    var y = gulir[t]; if (!(y > 0)) return;
    [60, 300, 800, 1600].forEach(function (ms) { setTimeout(function () { if (window.TAB === t && Math.abs(window.scrollY - y) > 20 && d.documentElement.scrollHeight - window.innerHeight >= y - 5) window.scrollTo(0, y); }, ms); });
  }

  /* ---------- menu samping: cari pintar, favorit, terakhir ---------- */
  function fav() { return ls(KF, []).filter(ada); }
  function hiasMenu() {
    var box = d.getElementById("tabs"); if (!box) return;
    var f = fav();
    box.querySelectorAll("button[data-tab]").forEach(function (b) {
      var t = b.getAttribute("data-tab"), on = f.indexOf(t) >= 0;
      if (b.querySelector(".nfv")) return;
      var s = d.createElement("span"); s.className = "nfv" + (on ? " on" : ""); s.setAttribute("role", "button"); s.setAttribute("tabindex", "0");
      s.setAttribute("aria-label", (on ? "Hapus " : "Jadikan ") + b.textContent + (on ? " dari favorit" : " favorit")); s.title = on ? "Hapus dari favorit" : "Jadikan favorit";
      s.textContent = on ? "★" : "☆";
      var klik = function (e) { e.preventDefault(); e.stopPropagation(); var a = fav(), i = a.indexOf(t); if (i >= 0) a.splice(i, 1); else a.push(t); lsSet(KF, a); window.tabsUI(); };
      s.onclick = klik; s.onkeydown = function (e) { if (e.key === "Enter" || e.key === " ") klik(e); };
      b.appendChild(s);
    });
    if (f.length && !box.querySelector(".mgt.nfvg")) {
      var h = '<div class="mgt nfvg">Favorit</div>' + f.map(function (t) { return '<button type="button" class="' + (window.TAB === t ? "on" : "") + '" data-tab="' + esc(t) + '" data-fv="1">' + esc(nama(t)) + '</button>'; }).join("");
      box.insertAdjacentHTML("afterbegin", h);
      box.querySelectorAll('[data-fv="1"]').forEach(function (b) { b.onclick = function () { var sd = d.getElementById("side"); if (sd) sd.classList.remove("buka"); window.goTab(b.getAttribute("data-tab")); }; });
    }
    pasangCari();
  }
  var SEL = 0, HASIL = [], KUNCI = null;
  function pasangCari() {
    var qc = d.getElementById("qcepat"); if (!qc) return;
    if (qc.dataset.nav) { if (KUNCI) qc.onkeydown = KUNCI; return; }   // tabsUI asli memasang ulang onkeydown setiap kali menu digambar
    qc.dataset.nav = "1"; qc.placeholder = "Cari menu / barang / PPBJ"; qc.title = "Cari menu, barang, atau No PPBJ (Ctrl+K)"; qc.setAttribute("aria-autocomplete", "list"); qc.setAttribute("aria-controls", "navsaran");
    var pn = d.createElement("div"); pn.id = "navsaran"; pn.setAttribute("role", "listbox"); pn.hidden = true; qc.parentNode.appendChild(pn);
    function tampil() {
      var v = qc.value.trim(), h = "";
      if (!v) {
        var r = ls(KR, []).filter(function (t) { return ada(t) && t !== window.TAB; }).slice(0, 5);
        HASIL = r.map(function (t) { return {jenis: "menu", t: t}; });
        h = r.length ? '<div class="nsj">Terakhir dibuka</div>' : '<div class="nsj">Ketik nama menu, barang, atau No PPBJ</div>';
      } else {
        HASIL = cariMenu(v).map(function (m) { return {jenis: "menu", t: m.t}; }); HASIL.push({jenis: "barang", v: v});
        h = HASIL.length > 1 ? '<div class="nsj">Menu</div>' : '<div class="nsj">Tidak ada menu yang cocok</div>';
      }
      if (SEL >= HASIL.length) SEL = 0;
      h += HASIL.map(function (x, i) {
        if (x.jenis === "barang") return '<div class="nsi nsb' + (i === SEL ? " on" : "") + '" role="option" data-ns="' + i + '" aria-selected="' + (i === SEL) + '">Cari barang / No PPBJ: <b>' + esc(x.v) + '</b></div>';
        var m = menuSemua().filter(function (y) { return y.t === x.t; })[0];
        return '<div class="nsi' + (i === SEL ? " on" : "") + '" role="option" data-ns="' + i + '" aria-selected="' + (i === SEL) + '"><b>' + esc(m.nama) + '</b><small>' + esc(m.grup) + '</small></div>';
      }).join("");
      pn.innerHTML = h; pn.hidden = false;
      pn.querySelectorAll("[data-ns]").forEach(function (el) { el.onmousedown = function (e) { e.preventDefault(); pilih(Number(el.getAttribute("data-ns"))); }; });
    }
    function pilih(i) {
      var x = HASIL[i]; if (!x) return; var v = qc.value; qc.value = ""; pn.hidden = true; SEL = 0; qc.blur();
      var sd = d.getElementById("side"); if (sd) sd.classList.remove("buka");
      if (x.jenis === "menu") window.goTab(x.t); else if (typeof window.cepatCari === "function") window.cepatCari(v);
    }
    qc.addEventListener("input", function () { SEL = 0; tampil(); });
    qc.addEventListener("focus", tampil);
    qc.addEventListener("blur", function () { setTimeout(function () { pn.hidden = true; }, 150); });
    KUNCI = qc.onkeydown = function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); if (pn.hidden) tampil(); SEL = Math.min(HASIL.length - 1, SEL + 1); tampil(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); SEL = Math.max(0, SEL - 1); tampil(); }
      else if (e.key === "Enter") { e.preventDefault(); if (!HASIL.length) tampil(); pilih(SEL); }
      else if (e.key === "Escape") { if (qc.value) { qc.value = ""; tampil(); } else { pn.hidden = true; qc.blur(); } }
    };
  }

  /* ---------- pasang ke fungsi admin ---------- */
  function pasang() {
    if (typeof window.goTab !== "function" || typeof window.tabsUI !== "function") return setTimeout(pasang, 50);
    if (window.goTab.__nav) return;
    var asliGo = window.goTab, asliUI = window.tabsUI;
    window.goTab = function (t) {
      var lama = window.TAB;
      if (t !== lama && adaKotor(lama) && d.getElementById("pane") && !konfirmasi(lama)) return;
      if (lama && d.getElementById("pane")) gulir[lama] = window.scrollY;
      kotor[lama] = [];
      if (!luar(t) && t !== lama) { try { window.scrollTo(0, 0); } catch (e) { /* abaikan */ } }
      catat(t);
      if (!dariRiwayat && t !== lama && !luar(t)) { try { history.pushState(null, "", "#" + t); } catch (e3) { /* abaikan */ } }
      asliGo(t);
      gambarBar(); pulih(t);
    };
    window.goTab.__nav = true;
    window.tabsUI = function () {
      if (!d.getElementById("pane")) { asliUI(); siapkanKolom(); } else asliUI();
      siapkanKolom(); hiasMenu(); gambarBar();
    };
  }
  /* tab bar diletakkan di atas #pane dalam satu kolom agar tata letak menu samping tetap */
  function siapkanKolom() {
    var p = d.getElementById("pane"); if (!p || d.getElementById("navtabs")) return;
    var kol = d.createElement("div"); kol.className = "nkol"; p.parentNode.insertBefore(kol, p);
    var bar = d.createElement("div"); bar.id = "navtabs"; bar.className = "noprint"; kol.appendChild(bar); kol.appendChild(p);
    if (window.TAB && !tabs().some(function (x) { return x.t === window.TAB; })) catat(window.TAB);
  }
  /* Pantauan BPB dibuka lewat load() tanpa goTab: catat juga saat menu digambar */
  var tabTerakhir = null;
  setInterval(function () { if (window.TAB && window.TAB !== tabTerakhir && d.getElementById("navtabs")) { tabTerakhir = window.TAB; catat(window.TAB); gambarBar(); } }, 400);

  /* ---------- pintasan ---------- */
  d.addEventListener("keydown", function (e) {
    var k = (e.key || "").toLowerCase();
    if ((e.ctrlKey || e.metaKey) && !e.altKey && k === "k") {
      var qc = d.getElementById("qcepat"); if (!qc) return; e.preventDefault();
      var adm = d.querySelector(".adm"); if (adm && adm.classList.contains("tutup")) { var bk = d.getElementById("smbuka"); if (bk) bk.click(); }
      var sd = d.getElementById("side"); if (sd && window.innerWidth <= 860) sd.classList.add("buka");
      setTimeout(function () { qc.focus(); qc.select(); }, 30); return;
    }
    if (e.altKey && !e.ctrlKey && !e.metaKey) {
      var a = tabs();
      if (/^[1-8]$/.test(e.key) || /^Digit[1-8]$/.test(e.code || "")) { var n = Number((e.code || "").replace("Digit", "")) || Number(e.key); var x = a[n - 1]; if (x) { e.preventDefault(); if (x.t !== window.TAB) window.goTab(x.t); } return; }
      if (k === "w" || e.code === "KeyW") { if (window.TAB && a.some(function (y) { return y.t === window.TAB; })) { e.preventDefault(); tutup(window.TAB); } }
    }
  });
  /* tombol Kembali / Maju browser ikut pindah menu */
  window.addEventListener("hashchange", function () {
    var h = (location.hash || "").replace("#", ""); if (!h || h === window.TAB || !ada(h) || luar(h)) return;
    if (d.getElementById("pane")) { dariRiwayat = true; try { window.goTab(h); } finally { dariRiwayat = false; } }
  });

  /* ---------- gaya ---------- */
  var st = d.createElement("style");
  st.textContent = ".nkol{min-width:0}#navtabs:empty{display:none}#navtabs{position:sticky;top:0;z-index:20;background:var(--bg,#0b1626);padding:0 0 6px;margin:0 0 6px}" +
    ".ntw{display:flex;gap:4px;overflow-x:auto;scrollbar-width:thin;padding:2px 2px 0}.nt{display:flex;align-items:center;flex:none;border:1px solid var(--line);border-radius:8px 8px 0 0;background:var(--card);opacity:.82}" +
    ".nt.on{opacity:1;border-bottom-color:transparent;box-shadow:inset 0 3px 0 var(--accent,var(--teal,#2bb3c0))}.nt button{background:none;border:0;color:inherit;font:inherit;font-size:13px;padding:7px 4px 7px 10px;cursor:pointer;white-space:nowrap;min-height:34px}" +
    ".nt.on button{font-weight:700}.nt .ntx{padding:7px 9px 7px 4px;opacity:.6;font-size:15px}.nt .ntx:hover,.nt .ntx:focus-visible{opacity:1}" +
    "#tabs button .nfv{float:right;opacity:.35;padding:0 2px;margin-left:6px;cursor:pointer}#tabs button:hover .nfv,#tabs button .nfv:focus-visible,#tabs button .nfv.on{opacity:1}#tabs button .nfv.on{color:#e0a800}" +
    ".mcari{position:relative}#navsaran{position:absolute;left:0;right:0;top:100%;z-index:50;background:var(--card);border:1px solid var(--line);border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.35);max-height:60vh;overflow:auto;margin-top:2px}" +
    ".nsj{font-size:11px;font-weight:700;opacity:.7;padding:7px 10px 3px;letter-spacing:.03em}.nsi{padding:8px 10px;cursor:pointer;border-top:1px solid var(--line);font-size:13px}.nsi small{display:block;opacity:.65;font-size:11px}" +
    ".nsi.on,.nsi:hover{background:rgba(43,179,192,.16)}.nsb{font-size:12.5px}@media print{#navtabs{display:none}}";
  d.head.appendChild(st);
  pasang();
})();
