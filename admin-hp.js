/* Admin di HP (layar <= 700 px): bilah bawah (Hari ini, Stok, Serah, Terima, Pantau, Lainnya), daftar kerja berbentuk kartu,
   dan tab Stok & Harga berbentuk kartu dengan koreksi stok / harga (selalu lewat layar konfirmasi "dari X ke Y").
   Koreksi memakai alur server yang sama dengan komputer (adminKoreksi, adminHarga). Tahap berikutnya: Serah, Terima, Pantauan. */
(function () {
  "use strict";
  var d = document, mq = window.matchMedia ? window.matchMedia("(max-width:700px)") : { matches: false };
  var ITEM = [["kerja", "Hari ini", "&#128203;"], ["stok", "Stok", "&#128230;"], ["serah", "Serah", "&#10145;"], ["terima", "Terima", "&#11015;"], ["pantau", "Pantau", "&#128065;"]];
  var KARTU = { kerja: 1 };      // tab yang tabelnya diubah jadi kartu (ditambah bertahap)
  var MAKS = 5;                  // baris yang langsung tampil per daftar
  var MAKS_STOK = 10;            // kartu barang yang langsung tampil di tab Stok & Harga
  function ada() { return !!d.getElementById("pane") && !!d.querySelector(".adm"); }
  function pasang() {
    var on = !!mq.matches && ada();
    d.body.classList.toggle("hpa", on);
    var b = d.getElementById("abar");
    if (on && !b) buat();
    else if (!on && b) b.remove();
    if (!on) tutupSheet();
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
  /* ---------- Stok & Harga: kartu + koreksi dengan konfirmasi ---------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function F(n) { return typeof window.fmtN === "function" ? window.fmtN(n) : String(n); }
  function RP(n) { return typeof window.rp === "function" ? window.rp(n) : "Rp " + n; }
  function sumb() { return (window.SUMB && window.SUMB.length) ? window.SUMB : ["Bekas", "Moka", "Accurate"]; }
  function angka(t) {            // "1,5" atau "1.5" -> 1.5 ; kosong/bukan angka -> NaN
    t = String(t == null ? "" : t).trim().replace(/\s/g, "");
    if (!/^\d+([.,]\d+)?$/.test(t)) return NaN;
    return Number(t.replace(",", "."));
  }
  function hargaAngka(raw) {      // sama dengan cara server membaca harga (adminHarga_)
    return Number(String(raw).replace(/[^\d.,-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
  }
  var FULL = null, CHIP = "semua", LIMIT = 40;   // FULL = seluruh barang (diambil sekali bila chip penyaring dipakai)
  var CHIPS = [["semua", "Semua"], ["kosong", "Kosong"], ["noharga", "Tanpa harga"], ["bekas", "Bekas"]];
  function lolos(it, c) {
    if (c === "kosong") return !(Number(it.total) > 0);
    if (c === "noharga") return !it.harga;
    if (c === "bekas") return (Number(it.q[0]) || 0) > 0;
    return true;
  }
  function cocok(it, q) {
    q = String(q || "").trim().toLowerCase(); if (!q) return true;
    var h = (String(it.nama) + " " + String(it.kode)).toLowerCase();
    return q.split(/\s+/).every(function (t) { return h.indexOf(t) >= 0; });
  }
  function stokHP() {
    if (!d.body.classList.contains("hpa") || window.TAB !== "stok") { CHIP = "semua"; return; }
    var pane = d.getElementById("pane"), sq = d.getElementById("sq");
    if (!pane || !sq || sq.getAttribute("data-hps")) return;
    sq.setAttribute("data-hps", "1");
    var bar = sq.closest(".bar"), sm = pane.querySelector(":scope > .sum"), nt = pane.querySelector(":scope > .note:not(.hp-ringkas)");
    var tb = pane.querySelector(":scope > table, :scope > .tbox"), wrap = tb ? (tb.closest(".tbox") || tb) : null;
    var alat = [];
    [].forEach.call(pane.children, function (c) {
      if (!c.classList || !c.classList.contains("card")) return;
      if (c.querySelector("#hq")) { c.classList.add("hp-alat", "hp-sembunyi"); alat.push(c); }
      else if (c.querySelector("#uf,#xf,#hf,#thb,#sink,#rakt")) { c.classList.add("hp-alat"); alat.push(c); }
    });
    var sg = d.getElementById("sgo"); if (sg && sg.parentNode) sg.parentNode.classList.add("hp-sembunyi");
    [sm, nt, wrap].forEach(function (x) { if (x) x.classList.add("hp-sembunyi"); });
    var hs = d.getElementById("hs"); if (hs && hs.parentNode) hs.parentNode.classList.add("hp-sembunyi");
    var sx = d.getElementById("sx"), scari = d.getElementById("scari");
    /* kotak cari + chip menempel di atas */
    var top = d.createElement("div"); top.className = "hp-top";
    var r1 = d.createElement("div"); r1.className = "hp-r1";
    if (bar && bar.parentNode) bar.parentNode.insertBefore(top, bar); else sq.parentNode.insertBefore(top, sq);
    r1.appendChild(sq); if (scari) r1.appendChild(scari);
    top.appendChild(r1);
    var ch = d.createElement("div"); ch.className = "hp-chips"; ch.setAttribute("role", "group"); ch.setAttribute("aria-label", "Penyaring stok");
    ch.innerHTML = CHIPS.map(function (c) { return '<button type="button" class="hp-chip' + (CHIP === c[0] ? " on" : "") + '" data-c="' + c[0] + '" aria-pressed="' + (CHIP === c[0]) + '">' + c[1] + '</button>'; }).join("");
    top.appendChild(ch);
    var rg = d.createElement("div"); rg.className = "note hp-ringkas"; top.appendChild(rg);
    if (bar) bar.classList.add("hp-sembunyi");
    var list = d.createElement("div"); list.id = "hpList"; top.parentNode.insertBefore(list, top.nextSibling);
    var more = d.createElement("button"); more.type = "button"; more.className = "gh hp-lebih"; more.hidden = true; list.parentNode.insertBefore(more, list.nextSibling);
    /* alat unggah di bawah daftar */
    var bwh = d.createElement("div"); bwh.className = "hp-bawah"; more.parentNode.insertBefore(bwh, more.nextSibling);
    if (sx) { sx.classList.add("hp-unduh"); bwh.appendChild(sx); }
    if (alat.length) {
      var tg = d.createElement("button"); tg.type = "button"; tg.className = "gh hp-alatbtn";
      var nyala = function () { return d.body.classList.contains("hp-alat-on"); };
      var teks = function () { tg.textContent = nyala() ? "Sembunyikan alat unggah & sinkron" : "Alat unggah, impor & sinkron (lebih nyaman di komputer)"; tg.setAttribute("aria-expanded", nyala() ? "true" : "false"); };
      tg.onclick = function () { d.body.classList.toggle("hp-alat-on"); teks(); };
      teks(); bwh.appendChild(tg);
      alat.forEach(function (c) { bwh.appendChild(c); });
    }
    var buka = -1, sumber = function () { return CHIP === "semua" ? (window.STOK || []) : (FULL || []); };
    function ringkas(n) {
      var R = window.STOKR, t = n + " barang";
      if (CHIP !== "semua") t += " (" + (CHIPS.filter(function (c) { return c[0] === CHIP; })[0] || [0, ""])[1].toLowerCase() + ")";
      if (R) t += " · nilai persediaan " + RP(R.nilaiTotal) + (R.tanpaHarga ? " · " + R.tanpaHarga + " belum ada harga" : "");
      rg.textContent = t;
    }
    function gambar() {
      var q = CHIP === "semua" ? "" : sq.value, data = sumber().filter(function (it) { return lolos(it, CHIP) && cocok(it, q); });
      ringkas(data.length);
      if (!data.length) { list.innerHTML = '<div class="card msg">Tidak ada barang.</div>'; more.hidden = true; return; }
      var tampil = data.slice(0, LIMIT);
      list.innerHTML = tampil.map(function (it, i) {
        var kosong = !(Number(it.total) > 0), o = i === buka;
        return '<div class="hp-row' + (o ? " buka" : "") + '"><button type="button" class="hp-l1" data-i="' + i + '" aria-expanded="' + o + '">' +
          '<span class="hp-dot ' + (kosong ? "k" : "a") + '" aria-hidden="true"></span>' +
          '<span class="hp-nm"><b>' + esc(it.nama) + '</b><small>' + esc(it.kode) + (kosong ? ' · <em class="hp-m">kosong</em>' : '') + (it.harga ? '' : ' · <em class="hp-m">belum ada harga</em>') + '</small></span>' +
          '<span class="hp-tot">' + F(it.total) + '<small>' + esc(it.satuan || "") + '</small></span></button>' +
          (o ? '<div class="hp-det"><div class="hp-g3">' + sumb().map(function (s, j) { return '<div><span>' + esc(s) + '</span><b>' + F(it.q[j]) + '</b></div>'; }).join("") + '</div>' +
            '<div class="hp-hg"><span>Harga</span><b>' + (it.harga ? RP(it.harga) : "belum ada") + '</b></div>' +
            '<div class="hp-bt"><button type="button" class="gh" data-k="' + i + '">Koreksi stok</button><button type="button" class="gh" data-h="' + i + '">Ubah harga</button></div></div>' : '') + '</div>';
      }).join("");
      more.hidden = data.length <= LIMIT; more.textContent = "Tampilkan lagi (" + (data.length - LIMIT) + " barang)";
      list.__d = tampil;
    }
    more.onclick = function () { LIMIT += 40; gambar(); };
    list.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("button"); if (!b || !list.__d) return;
      var i = b.getAttribute("data-i"), k = b.getAttribute("data-k"), h = b.getAttribute("data-h");
      if (i !== null) { buka = (buka === +i) ? -1 : +i; gambar(); var r = list.querySelectorAll(".hp-row")[+i]; if (buka >= 0 && r) { try { r.scrollIntoView({ block: "nearest" }); } catch (x) { /* abaikan */ } } }
      else if (k !== null && list.__d[+k]) koreksiStok(list.__d[+k]);
      else if (h !== null && list.__d[+h]) ubahHarga(list.__d[+h]);
    });
    async function pakaiChip(c) {
      if (c !== "semua" && !FULL) {
        ch.setAttribute("aria-busy", "true"); rg.textContent = "Memuat seluruh barang...";
        try { var r = await window.api({ action: "adminStokList", q: "", hanyaStok: false, semua: true }); if (r && r.ok) FULL = r.data || []; } catch (x) { FULL = null; }
        ch.removeAttribute("aria-busy");
        if (!FULL) { if (typeof window.toast === "function") window.toast("Gagal memuat seluruh barang. Periksa sinyal lalu coba lagi.", true); c = "semua"; }
      }
      CHIP = c; buka = -1; LIMIT = 40;
      [].forEach.call(ch.querySelectorAll(".hp-chip"), function (x) { var on = x.getAttribute("data-c") === c; x.classList.toggle("on", on); x.setAttribute("aria-pressed", on); });
      gambar();
    }
    ch.addEventListener("click", function (e) { var b = e.target.closest && e.target.closest("button"); if (b) pakaiChip(b.getAttribute("data-c")); });
    /* cari: tanpa chip -> pencarian server seperti biasa; dengan chip -> menyaring daftar di layar */
    sq.addEventListener("input", function () { if (CHIP !== "semua") { buka = -1; gambar(); } });
    sq.onkeydown = function (e) { if (e.key === "Enter") { if (CHIP === "semua") window.loadStok(); else { sq.blur(); gambar(); } } };
    if (scari) scari.onclick = function () { if (CHIP === "semua") window.loadStok(); else gambar(); };
    if (CHIP !== "semua") { if (FULL) gambar(); else pakaiChip(CHIP); } else gambar();
  }
  function tutupSheet() { var o = d.getElementById("hpSheet"); if (o) o.remove(); d.removeEventListener("keydown", escSheet); }
  function escSheet(e) { if (e.key === "Escape") tutupSheet(); }
  function bukaSheet(judul) {
    tutupSheet();
    var o = d.createElement("div"); o.id = "hpSheet"; o.setAttribute("role", "dialog"); o.setAttribute("aria-modal", "true"); o.setAttribute("aria-label", judul);
    o.innerHTML = '<div class="hs-k"><div class="hs-j"><b>' + esc(judul) + '</b><button type="button" class="hs-x" aria-label="Tutup">&times;</button></div><div class="hs-i"></div></div>';
    d.body.appendChild(o);
    o.addEventListener("click", function (e) { if (e.target === o) tutupSheet(); });
    o.querySelector(".hs-x").onclick = tutupSheet;
    d.addEventListener("keydown", escSheet);
    return o.querySelector(".hs-i");
  }
  /* ambil angka TERBARU dari server sebelum konfirmasi (daftar di layar bisa sudah lama) */
  async function terbaru(kode) {
    var r = await window.api({ action: "adminStokList", q: kode, hanyaStok: false, limit: 10 });
    if (!r || !r.ok) return null;
    var f = (r.data || []).filter(function (x) { return String(x.kode).trim().toUpperCase() === String(kode).trim().toUpperCase(); })[0];
    return f ? { it: f, sumber: r.sumber || sumb() } : null;
  }
  function koreksiStok(item) {
    var S = sumb(), el = bukaSheet("Koreksi stok");
    function form(nilai) {
      nilai = nilai || {};
      el.innerHTML = '<div class="hs-n"><b>' + esc(item.nama) + '</b><small>' + esc(item.kode) + ' · ' + esc(item.satuan || "") + '</small></div>' +
        '<p class="hs-ket">Isi stok BARU (saldo akhir), bukan selisih. Alasan wajib dan tercatat di Mutasi.</p>' +
        '<label for="hsS">Sumber stok</label><select id="hsS">' + S.map(function (s, j) { return '<option value="' + esc(s) + '"' + (nilai.s === s ? " selected" : "") + '>' + esc(s) + ' (sekarang ' + F(item.q[j]) + ')</option>'; }).join("") + '</select>' +
        '<label for="hsQ">Stok baru</label><input id="hsQ" type="text" inputmode="decimal" autocomplete="off" value="' + esc(nilai.q || "") + '">' +
        '<label for="hsA">Alasan koreksi</label><input id="hsA" type="text" maxlength="300" autocomplete="off" value="' + esc(nilai.a || "") + '">' +
        '<p class="hs-err" id="hsE" role="alert"></p>' +
        '<div class="hs-t"><button type="button" class="gh" id="hsB">Batal</button><button type="button" class="sv" id="hsL">Lanjut</button></div>';
      el.querySelector("#hsB").onclick = tutupSheet;
      var sibuk = false;
      el.querySelector("#hsL").onclick = async function () {
        if (sibuk) return;
        var sm2 = el.querySelector("#hsS").value, q = angka(el.querySelector("#hsQ").value), al = el.querySelector("#hsA").value.trim(), er = el.querySelector("#hsE");
        if (isNaN(q)) { er.textContent = "Isi stok baru dengan angka 0 atau lebih."; return; }
        if (al.length < 3) { er.textContent = "Alasan koreksi wajib diisi."; return; }
        sibuk = true; this.disabled = true; er.textContent = "Memeriksa stok terbaru...";
        var tb = null; try { tb = await terbaru(item.kode); } catch (x) { tb = null; }
        sibuk = false; this.disabled = false;
        if (!tb) { er.textContent = "Tidak bisa memeriksa stok terbaru. Periksa sinyal lalu coba lagi."; return; }
        var j = tb.sumber.indexOf(sm2), lama = Number(tb.it.q[j]) || 0;
        if (Math.abs(lama - q) < 1e-9) { er.textContent = "Angkanya sama dengan stok sekarang (" + F(lama) + "). Tidak ada yang diubah."; return; }
        konfirmasi(sm2, lama, q, al, Math.abs((Number(item.q[S.indexOf(sm2)]) || 0) - lama) > 1e-9);
      };
      setTimeout(function () { var x = el.querySelector("#hsQ"); if (x) x.focus(); }, 50);
    }
    function konfirmasi(sm2, lama, q, al, berubah) {
      var sel = Math.round((q - lama) * 1000) / 1000;
      el.innerHTML = '<div class="hs-n"><b>' + esc(item.nama) + '</b><small>' + esc(item.kode) + '</small></div>' +
        '<p class="hs-tanya">Stok <b>' + esc(sm2) + '</b> diubah dari <b>' + F(lama) + '</b> ke <b>' + F(q) + '</b> ' + esc(item.satuan || "") + '. Simpan?</p>' +
        '<div class="hs-dr"><span>' + F(lama) + '</span><i aria-hidden="true">&rarr;</i><span>' + F(q) + '</span><em class="' + (sel < 0 ? "min" : "plus") + '">' + (sel > 0 ? "+" : "") + F(sel) + '</em></div>' +
        '<p class="hs-ket">Alasan: ' + esc(al) + '</p>' +
        (berubah ? '<p class="hs-peringatan">Stok ini sudah berubah sejak daftar dimuat. Angka "dari" di atas adalah angka terbaru dari server.</p>' : '') +
        '<div class="hs-t"><button type="button" class="gh" id="hsK">Kembali</button><button type="button" class="sv" id="hsY">Ya, simpan</button></div>';
      el.querySelector("#hsK").onclick = function () { form({ s: sm2, q: String(q).replace(".", ","), a: al }); };
      el.querySelector("#hsY").onclick = function () {
        if (typeof window.kirimAdmin !== "function") return;
        window.kirimAdmin(this, { action: "adminKoreksi", kode: item.kode, sumber: sm2, qty: String(q), alasan: al }, async function () { FULL = null; tutupSheet(); await window.loadStok(); });
      };
    }
    form();
  }
  function ubahHarga(item) {
    var el = bukaSheet("Ubah harga");
    function form(nilai) {
      el.innerHTML = '<div class="hs-n"><b>' + esc(item.nama) + '</b><small>' + esc(item.kode) + ' · ' + esc(item.satuan || "") + '</small></div>' +
        '<p class="hs-ket">Harga sekarang: <b>' + (item.harga ? RP(item.harga) : "belum ada") + '</b>. Satu harga berlaku untuk Moka dan Accurate.</p>' +
        '<label for="hsH">Harga baru (Rp)</label><input id="hsH" type="text" inputmode="decimal" autocomplete="off" value="' + esc(nilai || "") + '">' +
        '<p class="hs-err" id="hsE" role="alert"></p>' +
        '<div class="hs-t"><button type="button" class="gh" id="hsB">Batal</button><button type="button" class="sv" id="hsL">Lanjut</button></div>';
      el.querySelector("#hsB").onclick = tutupSheet;
      var sibuk = false;
      el.querySelector("#hsL").onclick = async function () {
        if (sibuk) return;
        var er = el.querySelector("#hsE"), raw = String(el.querySelector("#hsH").value).replace(/[^0-9,.]/g, ""), h = /\d/.test(raw) ? hargaAngka(raw) : NaN;
        if (isNaN(h) || h < 0) { er.textContent = "Isi harga dengan angka, contoh 15000 atau 15.000."; return; }
        sibuk = true; this.disabled = true; er.textContent = "Memeriksa harga terbaru...";
        var tb = null; try { tb = await terbaru(item.kode); } catch (x) { tb = null; }
        sibuk = false; this.disabled = false;
        if (!tb) { er.textContent = "Tidak bisa memeriksa harga terbaru. Periksa sinyal lalu coba lagi."; return; }
        var lama = Number(tb.it.harga) || 0;
        if (Math.abs(lama - h) < 1e-9) { er.textContent = "Harganya sama dengan harga sekarang (" + RP(lama) + "). Tidak ada yang diubah."; return; }
        konfirmasi(raw, lama, h, Math.abs((Number(item.harga) || 0) - lama) > 1e-9);
      };
      setTimeout(function () { var x = el.querySelector("#hsH"); if (x) x.focus(); }, 50);
    }
    function konfirmasi(raw, lama, h, berubah) {
      el.innerHTML = '<div class="hs-n"><b>' + esc(item.nama) + '</b><small>' + esc(item.kode) + '</small></div>' +
        '<p class="hs-tanya">Harga diubah dari <b>' + (lama ? RP(lama) : "belum ada") + '</b> ke <b>' + RP(h) + '</b>. Simpan?</p>' +
        '<div class="hs-dr"><span>' + (lama ? RP(lama) : "-") + '</span><i aria-hidden="true">&rarr;</i><span>' + RP(h) + '</span></div>' +
        (berubah ? '<p class="hs-peringatan">Harga ini sudah berubah sejak daftar dimuat. Angka "dari" di atas adalah angka terbaru dari server.</p>' : '') +
        '<div class="hs-t"><button type="button" class="gh" id="hsK">Kembali</button><button type="button" class="sv" id="hsY">Ya, simpan</button></div>';
      el.querySelector("#hsK").onclick = function () { form(raw); };
      el.querySelector("#hsY").onclick = function () {
        if (typeof window.kirimAdmin !== "function") return;
        window.kirimAdmin(this, { action: "adminHarga", rows: [{ kode: item.kode, nama: item.nama, harga: raw }] }, async function () { FULL = null; tutupSheet(); await window.loadStok(); });
      };
    }
    form();
  }

  var tj = 0;
  function jadwal() { if (tj) return; tj = setTimeout(function () { tj = 0; pasang(); kartukan(); stokHP(); }, 80); }
  if (mq.addEventListener) mq.addEventListener("change", pasang); else if (mq.addListener) mq.addListener(pasang);
  var app = d.getElementById("app") || d.body;
  if (window.MutationObserver) new MutationObserver(jadwal).observe(app, { childList: true, subtree: true });
  setInterval(function () { if (d.body.classList.contains("hpa")) tandai(); }, 1500);
  /* bilah bawah disembunyikan saat keyboard terbuka */
  d.addEventListener("focusin", function (e) { var t = e.target; if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) && d.body.classList.contains("hpa") && !t.closest("#abar")) d.body.classList.add("ketik"); });
  d.addEventListener("focusout", function () { setTimeout(function () { var a = d.activeElement; if (!(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))) d.body.classList.remove("ketik"); }, 120); });
  pasang(); kartukan(); stokHP();
  window.ADMHP = { tutupSheet: tutupSheet, aktif: function () { return d.body.classList.contains("hpa"); }, kartu: KARTU };
})();
