/* Menu admin di halaman yang dibuka dari admin (Pembelian, Realisasi, Label, Pengajuan Pembelian): menu tab kiri tetap ada dan bisa diminimalkan.
   Hanya tampil bila admin sudah masuk (sesi admin di peramban ini). Pilihan buka/minimal diingat. */
(function () {
  var d = document, K = "sctk_menu_admin";
  var MENU = [["Harian", [["kerja", "Daftar Kerja"], ["pantau", "Pantauan BPB"], ["serah", "Serah Barang"], ["terima", "Terima Barang"], ["mutasi", "Mutasi"]]],
    ["Stok", [["stok", "Stok & Harga"], ["opname", "Selisih Opname"], ["kimia", "Opname Kimia"], ["kpi", "KPI Gudang"], ["baopname", "BA Opname"], ["kedaluwarsa", "Kedaluwarsa"], ["buffer", "Buffer Paket"], ["barangmati", "Barang Mati"], ["accurate", "Accurate"], ["komparasi", "Komparasi"]]],
    ["Proyek & Pembelian", [["proyek", "Proyek"], ["pengajuan", "Pengajuan"], ["pembelian", "Pembelian"], ["realisasi", "Realisasi"]]],
    ["Laporan", [["laporan", "Laporan"], ["lapatasan", "Laporan Atasan"], ["telusur", "Telusur"]]],
    ["Data & Sistem", [["masterbarang", "Master Barang"], ["label", "Label"], ["pengumuman", "Pengumuman"], ["sistem", "Sistem"], ["panduan", "Panduan"]]]];
  var HALAMAN = {"pengadaan.html": "pembelian", "realisasi.html": "realisasi", "label.html": "label", "pembelian.html": "pembelian"};
  var LANGSUNG = {pembelian: "pengadaan.html", realisasi: "realisasi.html", label: "label.html"};
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }
  function admin() { try { return !!sessionStorage.getItem("sctk_admin"); } catch (e) { return false; } }
  function simpan(v) { try { localStorage.setItem(K, v); } catch (e) {} }
  function baca() { try { return localStorage.getItem(K); } catch (e) { return null; } }
  function mulai() {
    var f = (location.pathname.split("/").pop() || "").toLowerCase(), cur = HALAMAN[f];
    if (!cur || !admin() || d.getElementById("mnadm")) return;
    var st = d.createElement("style");
    st.textContent = "#mnadm{position:fixed;left:0;top:0;bottom:0;width:220px;z-index:45;background:var(--card,#fff);color:var(--ink,#17232d);border-right:1px solid var(--line,#c3ccd3);box-shadow:2px 0 10px rgba(0,0,0,.12);overflow:auto;font:13px 'Segoe UI',Roboto,Arial,sans-serif;transition:transform .18s}" +
      "#mnadm h6{margin:10px 12px 4px;font:700 10.5px 'Segoe UI',Arial,sans-serif;letter-spacing:.8px;text-transform:uppercase;color:var(--mut,#4a5b68)}" +
      "#mnadm a{display:block;padding:8px 12px 8px 14px;color:inherit;text-decoration:none;border-left:4px solid transparent}" +
      "#mnadm a:hover{background:var(--hover,#e3eef5);border-left-color:var(--accent,#1a6cab);padding-left:18px}" +
      "#mnadm a.on{background:var(--accent,#1a6cab);color:var(--accent-ink,#fff);border-left-color:var(--head,#1b6ca8);font-weight:800}" +
      "#mnadm a.on:before{content:'\\25B8\\00a0'}" +
      "#mnadm .kb{display:block;margin:10px 10px 4px;padding:9px 10px;border:1px solid var(--accent,#1a6cab);border-radius:4px;color:var(--accent,#1a6cab);font-weight:700;text-align:center;border-left-width:1px}" +
      "#mnadm .kb:hover{background:var(--hover,#e3eef5);padding-left:10px}" +
      "#mnadm .mn{position:sticky;top:0;display:flex;justify-content:flex-end;background:var(--card,#fff);border-bottom:1px solid var(--line,#c3ccd3);padding:6px}" +
      "#mnadm .mn button{border:1px solid var(--line,#c3ccd3);background:transparent;color:inherit;border-radius:4px;padding:5px 10px;cursor:pointer;font:600 12px 'Segoe UI',Arial,sans-serif}" +
      "#mnbuka{position:fixed;left:0;top:90px;z-index:45;display:none;border:1px solid var(--accent,#1a6cab);border-left:0;background:var(--accent,#1a6cab);color:var(--accent-ink,#fff);border-radius:0 6px 6px 0;padding:10px 12px;font:700 13px 'Segoe UI',Arial,sans-serif;cursor:pointer;box-shadow:2px 2px 8px rgba(0,0,0,.25)}" +
      "#mnbuka:hover{filter:brightness(.9)}" +
      "body.mnbuka{padding-left:220px;transition:padding-left .18s}" +
      "body:not(.mnbuka) #mnadm{transform:translateX(-100%);box-shadow:none}body:not(.mnbuka) #mnbuka{display:block}" +
      "@media (max-width:1100px){body.mnbuka{padding-left:0}#mnadm{width:min(80vw,260px)}}" +
      "@media print{#mnadm,#mnbuka{display:none!important}body.mnbuka{padding-left:0}}";
    d.head.appendChild(st);
    var h = '<div class="mn"><button type="button" id="mntup" title="Sembunyikan menu">&laquo; Minimalkan</button></div><a class="kb" href="admin.html">&larr; Kembali ke Admin</a>';
    MENU.forEach(function (g) {
      h += "<h6>" + esc(g[0]) + "</h6>";
      g[1].forEach(function (x) { var u = LANGSUNG[x[0]] || ("admin.html#" + x[0]); h += '<a href="' + u + '"' + (x[0] === cur ? ' class="on" aria-current="page"' : "") + ">" + esc(x[1]) + "</a>"; });
    });
    var nav = d.createElement("nav"); nav.id = "mnadm"; nav.setAttribute("aria-label", "Menu admin"); nav.innerHTML = h;
    var bk = d.createElement("button"); bk.type = "button"; bk.id = "mnbuka"; bk.textContent = "☰ Menu"; bk.setAttribute("aria-label", "Buka menu admin");
    d.body.appendChild(nav); d.body.appendChild(bk);
    var awal = baca(), buka = awal ? awal === "buka" : window.innerWidth > 1100;
    function pasang(b) { d.body.classList.toggle("mnbuka", b); }
    pasang(buka);
    d.getElementById("mntup").onclick = function () { simpan("min"); pasang(false); };
    bk.onclick = function () { simpan("buka"); pasang(true); };
  }
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", mulai); else mulai();
})();
