/* Pintasan keyboard dan mode baca untuk halaman Admin (komputer).
   Pintasan tidak aktif saat mengetik di kolom isian. Mode baca hanya mengubah tampilan di layar; cetakan dan PDF tidak berubah. */
(function () {
  "use strict";
  var d = document, KB = "sctk_baca", gAktif = 0, gTmr = 0;
  var PETA = { k: "kerja", p: "pantau", s: "serah", t: "terima", m: "mutasi", h: "stok", b: "buffer", y: "proyek", j: "pengajuan", l: "laporan", u: "telusur", d: "masterbarang", x: "sistem", a: "panduan" };
  function ls(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* abaikan */ } }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function sedangMengetik(e) {
    var t = e.target || d.activeElement;
    if (!t || !t.tagName) return false;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return true;
    return !!t.isContentEditable;
  }
  function tampak(el) { return !!(el && el.offsetParent !== null && !el.disabled && !el.readOnly); }
  function kotakCari() {
    var pane = d.getElementById("pane"), list = pane ? [].slice.call(pane.querySelectorAll("input")) : [];
    var c = list.filter(function (e) {
      return tampak(e) && /^(text|search)$/.test(e.type || "text") && (e.type === "search" || /cari|search|ketik|kode|nama|ppbj/i.test((e.placeholder || "") + " " + e.id));
    })[0];
    return c || d.getElementById("qcepat");
  }
  function fokus(el) { if (!el) return false; try { el.scrollIntoView({ block: "nearest" }); el.focus(); if (el.select) el.select(); } catch (e) { return false; } return true; }
  function namaTab(t) { try { return typeof window.namaTab === "function" ? window.namaTab(t) : t; } catch (e) { return t; } }

  /* ---------- bantuan ---------- */
  function tutupBantuan() { var h = d.getElementById("pintasBantuan"); if (h) { h.remove(); return true; } return false; }
  function bantuan() {
    if (tutupBantuan()) return;
    var baris = Object.keys(PETA).map(function (k) { return "<tr><td><kbd>g</kbd> <kbd>" + k + "</kbd></td><td>" + esc(namaTab(PETA[k])) + "</td></tr>"; }).join("");
    var h = d.createElement("div"); h.id = "pintasBantuan"; h.setAttribute("role", "dialog"); h.setAttribute("aria-label", "Daftar pintasan keyboard");
    h.innerHTML = '<div class="pb-kotak"><div class="pb-judul"><b>Pintasan keyboard</b><button type="button" id="pbTutup" aria-label="Tutup">&times;</button></div>' +
      '<table><tr><td><kbd>/</kbd></td><td>Langsung ke kotak cari di halaman ini</td></tr>' +
      '<tr><td><kbd>Ctrl</kbd> + <kbd>K</kbd></td><td>Cari menu, barang, atau No PPBJ (kotak di menu samping)</td></tr>' +
      '<tr><td><kbd>Alt</kbd> + <kbd>1</kbd>..<kbd>8</kbd></td><td>Pindah ke tab ke-1 sampai ke-8 di atas</td></tr>' +
      '<tr><td><kbd>Alt</kbd> + <kbd>Q</kbd></td><td>Kembali ke tab yang terakhir dibuka (bolak-balik dua tab)</td></tr>' +
      '<tr><td><kbd>Alt</kbd> + <kbd>[</kbd> / <kbd>]</kbd></td><td>Pindah ke tab di kiri / kanan</td></tr>' +
      '<tr><td><kbd>Alt</kbd> + <kbd>T</kbd></td><td>Buka tab baru jenis yang sama (Stok &amp; Harga, Mutasi, Telusur)</td></tr>' +
      '<tr><td><kbd>Alt</kbd> + <kbd>R</kbd></td><td>Muat ulang tab ini saja</td></tr>' +
      '<tr><td><kbd>Alt</kbd> + <kbd>W</kbd></td><td>Tutup tab yang sedang terbuka</td></tr>' +
      '<tr><td>Ctrl+klik / klik tengah menu</td><td>Buka menu di tab baru (Stok &amp; Harga, Mutasi, Telusur)</td></tr>' +
      '<tr><td>Klik tengah / klik 2x tab</td><td>Tutup tab / muat ulang tab. Seret tab untuk mengatur urutan.</td></tr>' +
      '<tr><td><kbd>?</kbd></td><td>Tampilkan atau tutup daftar ini</td></tr>' +
      '<tr><td><kbd>r</kbd></td><td>Mode baca: huruf lebih besar, baris lebih lega</td></tr>' +
      '<tr><td><kbd>Esc</kbd></td><td>Tutup daftar pintasan ini</td></tr>' + baris + '</table>' +
      '<p class="pb-cat"><kbd>g</kbd> lalu huruf: tekan <kbd>g</kbd>, lepas, lalu tekan huruf tujuan (dalam 1 detik). Pintasan tidak aktif saat Anda sedang mengetik di kolom isian.</p></div>';
    d.body.appendChild(h);
    h.addEventListener("click", function (e) { if (e.target === h) tutupBantuan(); });
    d.getElementById("pbTutup").onclick = tutupBantuan;
    try { d.getElementById("pbTutup").focus(); } catch (e) { /* abaikan */ }
  }

  /* ---------- mode baca ---------- */
  function setBaca(on, simpan) {
    d.body.classList.toggle("baca", !!on);
    var b = d.getElementById("bacaBtn"); if (b) { b.setAttribute("aria-pressed", on ? "true" : "false"); b.title = on ? "Mode baca hidup (tekan r untuk mematikan)" : "Mode baca: huruf lebih besar (tekan r)"; }
    if (simpan) lsSet(KB, on ? "1" : "0");
  }
  function toggleBaca() { setBaca(!d.body.classList.contains("baca"), true); }

  var st = d.createElement("style");
  st.textContent =
    "#pintasBantuan{position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:16px}" +
    "#pintasBantuan .pb-kotak{background:var(--card,#fff);color:var(--ink,#17232d);border:1px solid var(--line,#c3ccd3);border-radius:10px;padding:14px 16px;width:min(520px,100%);max-height:90vh;overflow:auto;font:14px 'Segoe UI',Roboto,Arial,sans-serif}" +
    "#pintasBantuan .pb-judul{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}" +
    "#pintasBantuan .pb-judul button{border:1px solid var(--line,#c3ccd3);background:transparent;color:inherit;border-radius:6px;font-size:20px;line-height:1;padding:2px 10px;cursor:pointer;min-height:34px}" +
    "#pintasBantuan table{border-collapse:collapse;width:100%}#pintasBantuan td{padding:5px 6px;border-top:1px solid var(--line,#c3ccd3);vertical-align:top}#pintasBantuan td:first-child{white-space:nowrap;width:1%}" +
    "#pintasBantuan kbd{display:inline-block;min-width:22px;text-align:center;padding:1px 6px;border:1px solid var(--line,#8fa0ab);border-bottom-width:2px;border-radius:5px;background:var(--bg,#f1f5f8);color:var(--ink,#17232d);font:700 12.5px 'Segoe UI',Roboto,Arial,sans-serif}" +
    "#pintasBantuan .pb-cat{margin:10px 0 0;color:var(--mut,#3d4e5a);font-size:13px}" +
    "#bacaBtn{position:fixed;right:12px;bottom:12px;z-index:60;min-width:44px;min-height:44px;border-radius:22px;border:1px solid var(--accent,#1a6cab);background:var(--card,#fff);color:var(--accent,#1a6cab);font:800 15px 'Segoe UI',Roboto,Arial,sans-serif;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.18)}" +
    "#bacaBtn[aria-pressed=true]{background:var(--accent,#1a6cab);color:var(--accent-ink,#fff)}" +
    "#pintasG{position:fixed;left:50%;bottom:64px;transform:translateX(-50%);z-index:210;background:var(--head,#0a2a43);color:#fff;padding:6px 14px;border-radius:16px;font:700 13px 'Segoe UI',Roboto,Arial,sans-serif}" +
    "body.baca #pane{zoom:1.15}body.baca #pane td,body.baca #pane th{padding-top:9px;padding-bottom:9px;line-height:1.5}" +
    "@media (max-width:860px){#bacaBtn{display:none}body.baca #pane{zoom:1}}" +
    "@media print{#bacaBtn,#pintasBantuan,#pintasG{display:none!important}body.baca #pane{zoom:1}body.baca #pane td,body.baca #pane th{padding-top:revert;padding-bottom:revert;line-height:revert}}";
  d.head.appendChild(st);
  var bb = d.createElement("button"); bb.type = "button"; bb.id = "bacaBtn"; bb.textContent = "Aa"; bb.setAttribute("aria-label", "Mode baca"); bb.onclick = toggleBaca;
  d.body.appendChild(bb);
  setBaca(ls(KB) === "1", false);

  /* ---------- tombol ---------- */
  function petunjukG(on) {
    var h = d.getElementById("pintasG");
    if (!on) { if (h) h.remove(); return; }
    if (!h) { h = d.createElement("div"); h.id = "pintasG"; h.textContent = "g … pilih huruf tujuan (? untuk daftar)"; d.body.appendChild(h); }
  }
  d.addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    var k = e.key;
    if (k === "Escape") {
      if (tutupBantuan()) { e.preventDefault(); return; }
      return;
    }
    if (sedangMengetik(e)) return;
    if (!d.getElementById("pane")) return;   // belum masuk (layar PIN)
    if (gAktif) {
      clearTimeout(gTmr); gAktif = 0; petunjukG(false);
      var t = PETA[String(k).toLowerCase()];
      if (t && typeof window.goTab === "function") { e.preventDefault(); (window.bukaTab || window.goTab)(t); }
      return;
    }
    if (k === "/") { e.preventDefault(); if (!fokus(kotakCari())) { /* tidak ada kotak cari */ } return; }
    if (k === "?") { e.preventDefault(); bantuan(); return; }
    if (k === "r" || k === "R") { e.preventDefault(); toggleBaca(); return; }
    if (k === "g" || k === "G") {
      e.preventDefault(); gAktif = 1; petunjukG(true);
      gTmr = setTimeout(function () { gAktif = 0; petunjukG(false); }, 1000);
    }
  });
  window.PINTAS = { peta: PETA, bantuan: bantuan, baca: toggleBaca };
})();
