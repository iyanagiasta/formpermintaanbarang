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
  function stokHP() {
    if (!d.body.classList.contains("hpa") || window.TAB !== "stok") return;
    var pane = d.getElementById("pane"), sq = d.getElementById("sq");
    if (!pane || !sq || sq.getAttribute("data-hps")) return;
    sq.setAttribute("data-hps", "1");
    var alat = [];
    [].forEach.call(pane.children, function (c) {
      if (!c.classList || !c.classList.contains("card")) return;
      if (c.querySelector("#hq")) { c.classList.add("hp-alat", "hp-sembunyi"); alat.push(c); }
      else if (c.querySelector("#uf,#xf,#hf,#thb,#sink,#rakt")) { c.classList.add("hp-alat"); alat.push(c); }
    });
    var sg = d.getElementById("sgo"); if (sg && sg.parentNode) sg.parentNode.classList.add("hp-sembunyi");
    if (alat.length) {
      var tg = d.createElement("button"); tg.type = "button"; tg.className = "gh hp-alatbtn";
      var nyala = function () { return d.body.classList.contains("hp-alat-on"); };
      var teks = function () { tg.textContent = nyala() ? "Sembunyikan alat unggah & sinkron" : "Alat unggah, impor & sinkron (lebih nyaman di komputer)"; tg.setAttribute("aria-expanded", nyala() ? "true" : "false"); };
      tg.onclick = function () { d.body.classList.toggle("hp-alat-on"); teks(); };
      teks();
      var pertama = alat[0]; pertama.parentNode.insertBefore(tg, pertama);
    }
    var bar = sq.closest(".bar"); if (bar) bar.classList.add("hp-s");
    var sm = pane.querySelector(":scope > .sum"); if (sm) sm.classList.add("hp-s");
    var t = pane.querySelector(":scope > table, :scope > .tbox > table");
    if (!t) return;
    t.classList.add("kartu", "hp-stok");
    var wr = t.closest(".tbox"); if (wr) wr.classList.add("hp-wrap");
    var rs = [].slice.call(t.querySelectorAll("tbody tr")), data = window.STOK || [];
    rs.forEach(function (tr, i) {
      var it = data[i], tds = tr.children, last = tds[tds.length - 1];
      if (i >= MAKS_STOK) tr.classList.add("lebih");
      if (!it) return;
      var hg = tr.querySelector('td[data-l="Harga"]');
      if (hg && !it.harga) { hg.classList.add("hp-nol"); hg.textContent = "Belum ada harga"; }
      if (last) {
        last.className = "hp-aksi"; last.setAttribute("data-l", "Aksi");
        last.innerHTML = '<button type="button" class="gh" data-hk="' + i + '">Koreksi stok</button><button type="button" class="gh" data-hh="' + i + '">Ubah harga</button>';
      }
    });
    t.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("button"); if (!b) return;
      var k = b.getAttribute("data-hk"), h = b.getAttribute("data-hh");
      if (k !== null && data[+k]) koreksiStok(data[+k]);
      else if (h !== null && data[+h]) ubahHarga(data[+h]);
    });
    if (rs.length > MAKS_STOK) {
      var bt = d.createElement("button"); bt.type = "button"; bt.className = "hp-lebih gh";
      bt.textContent = "Tampilkan semua (" + rs.length + ")";
      bt.onclick = function () { var s2 = t.classList.toggle("semua"); bt.textContent = s2 ? "Ringkas" : "Tampilkan semua (" + rs.length + ")"; };
      var wb = t.closest(".tbox") || t; wb.parentNode.insertBefore(bt, wb.nextSibling);
    }
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
        window.kirimAdmin(this, { action: "adminKoreksi", kode: item.kode, sumber: sm2, qty: String(q), alasan: al }, async function () { tutupSheet(); await window.loadStok(); });
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
        window.kirimAdmin(this, { action: "adminHarga", rows: [{ kode: item.kode, nama: item.nama, harga: raw }] }, async function () { tutupSheet(); await window.loadStok(); });
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
