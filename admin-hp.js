/* Admin di HP (layar <= 700 px): bilah bawah (Hari ini, Stok, Serah, Terima, Pantau, Lainnya) dan daftar kerja dalam bentuk kartu.
   Tidak mengubah data. Tahap berikutnya menambah kartu untuk Stok, Serah, Terima, dan Pantauan. */
(function () {
  "use strict";
  var d = document, mq = window.matchMedia ? window.matchMedia("(max-width:700px)") : { matches: false };
  var ITEM = [["kerja", "Hari ini", "&#128203;"], ["stok", "Stok", "&#128230;"], ["serah", "Serah", "&#10145;"], ["terima", "Terima", "&#11015;"], ["pantau", "Pantau", "&#128065;"]];
  var KARTU = { kerja: 1 };      // tab yang tabelnya diubah jadi kartu (ditambah bertahap)
  var MAKS = 5;                  // baris yang langsung tampil per daftar
  function ada() { return !!d.getElementById("pane") && !!d.querySelector(".adm"); }
  function pasang() {
    var on = !!mq.matches && ada();
    d.body.classList.toggle("hpa", on);
    var b = d.getElementById("abar");
    if (on && !b) buat();
    else if (!on && b) b.remove();
    if (on) tandai();
  }
  function buat() {
    var b = d.createElement("nav"); b.id = "abar"; b.setAttribute("aria-label", "Menu utama admin");
    b.innerHTML = ITEM.map(function (x) { return '<button type="button" data-t="' + x[0] + '"><span class="ik" aria-hidden="true">' + x[2] + '</span><span>' + x[1] + '</span></button>'; }).join("") +
      '<button type="button" data-t="_lain"><span class="ik" aria-hidden="true">&#9776;</span><span>Lainnya</span></button>';
    d.body.appendChild(b);
    b.addEventListener("click", function (e) {
      var t = e.target.closest && e.target.closest("button"); if (!t) return;
      var k = t.getAttribute("data-t");
      if (k === "_lain") {
        try { window.scrollTo(0, 0); } catch (x) { /* abaikan */ }
        var s = d.getElementById("side"); if (s) s.classList.add("buka");
        var mb = d.getElementById("mnbtn"); if (mb) { try { mb.focus(); } catch (x) { /* abaikan */ } }
        return;
      }
      if (typeof window.goTab === "function") { window.goTab(k); try { window.scrollTo(0, 0); } catch (x) { /* abaikan */ } }
    });
  }
  function tandai() {
    var b = d.getElementById("abar"); if (!b) return;
    var cur = (typeof window.TAB === "string") ? window.TAB : "";
    var dikenal = ITEM.some(function (x) { return x[0] === cur; });
    [].forEach.call(b.querySelectorAll("button"), function (x) {
      var k = x.getAttribute("data-t"), on = dikenal ? k === cur : k === "_lain";
      x.classList.toggle("on", on);
      if (on) x.setAttribute("aria-current", "page"); else x.removeAttribute("aria-current");
    });
    var kj = window.KJ, h = b.querySelector('button[data-t="kerja"]'), j = h && h.querySelector(".bj");
    var n = kj && typeof kj.total === "number" ? kj.total : 0;
    if (n > 0) { if (!j) { j = d.createElement("span"); j.className = "bj"; h.appendChild(j); } j.textContent = n > 99 ? "99+" : String(n); j.setAttribute("aria-label", n + " pekerjaan"); }
    else if (j) j.remove();
  }
  function kartukan() {
    if (!d.body.classList.contains("hpa")) return;
    var cur = window.TAB;
    if (!KARTU[cur]) return;
    var pane = d.getElementById("pane"); if (!pane) return;
    [].forEach.call(pane.querySelectorAll(".lp table:not(.kartu)"), function (t) {
      var th = [].map.call(t.querySelectorAll("thead th"), function (x) { return x.textContent.trim(); });
      if (!th.length) return;
      var rs = [].slice.call(t.querySelectorAll("tbody tr"));
      rs.forEach(function (tr, i) {
        [].forEach.call(tr.children, function (td, j) { if (th[j]) td.setAttribute("data-l", th[j]); });
        if (i >= MAKS) tr.classList.add("lebih");
      });
      t.classList.add("kartu");
      if (rs.length > MAKS) {
        var bt = d.createElement("button"); bt.type = "button"; bt.className = "hp-lebih gh";
        bt.textContent = "Tampilkan semua (" + rs.length + ")";
        bt.onclick = function () { var s = t.classList.toggle("semua"); bt.textContent = s ? "Ringkas" : "Tampilkan semua (" + rs.length + ")"; };
        var w = t.closest(".tw") || t; w.parentNode.insertBefore(bt, w.nextSibling);
      }
    });
    /* ringkasan: ketuk untuk melompat ke daftarnya */
    [].forEach.call(pane.querySelectorAll(".lp .sum>div:not([data-hp])"), function (dv) {
      dv.setAttribute("data-hp", "1"); dv.setAttribute("role", "button"); dv.tabIndex = 0;
      function pergi() {
        var ket = (dv.querySelector("span") || {}).textContent || "";
        var cards = [].slice.call(pane.querySelectorAll(".lp > .card"));
        var c = cards.filter(function (x) { var b = x.querySelector("b"); return b && b.textContent.trim().indexOf(ket.trim()) === 0; })[0];
        if (c) { try { c.scrollIntoView({ behavior: "smooth", block: "start" }); } catch (x) { c.scrollIntoView(); } }
      }
      dv.addEventListener("click", pergi);
      dv.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pergi(); } });
    });
  }
  var tj = 0;
  function jadwal() { if (tj) return; tj = setTimeout(function () { tj = 0; pasang(); kartukan(); }, 80); }
  if (mq.addEventListener) mq.addEventListener("change", pasang); else if (mq.addListener) mq.addListener(pasang);
  var app = d.getElementById("app") || d.body;
  if (window.MutationObserver) new MutationObserver(jadwal).observe(app, { childList: true, subtree: true });
  setInterval(function () { if (d.body.classList.contains("hpa")) tandai(); }, 1500);
  /* bilah bawah disembunyikan saat keyboard terbuka */
  d.addEventListener("focusin", function (e) { var t = e.target; if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) && d.body.classList.contains("hpa") && !t.closest("#abar")) d.body.classList.add("ketik"); });
  d.addEventListener("focusout", function () { setTimeout(function () { var a = d.activeElement; if (!(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))) d.body.classList.remove("ketik"); }, 120); });
  pasang(); kartukan();
  window.ADMHP = { aktif: function () { return d.body.classList.contains("hpa"); }, kartu: KARTU };
})();
