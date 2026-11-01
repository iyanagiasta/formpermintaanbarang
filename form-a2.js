/* A2 untuk Form Permintaan: (1) paket sekali klik (semua departemen, untuk PPBJ terdaftar, mengikuti sisa RAB), (2) draf otomatis di perangkat ini,
   (3) kirim ulang yang tidak membuat permintaan ganda, (4) sinonim dari sheet Sinonim + pencarian yang mengingat pilihan.
   Tidak mengubah isi lembar cetak/PDF: semua tampilan baru berkelas "nop" dan berada di luar lembar. */
(function () {
  "use strict";
  var d = document;
  if (/[?&]m=cetak/.test(location.search) || !d.getElementById("rows")) return;
  var KD = "sctk_draf_v1", KP = "sctk_ck_v1", KB = "sctk_belajar_v1", KS = "sctk_sin_v1";
  function ls(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* abaikan */ } }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) { /* abaikan */ } }
  function jp(k) { try { return JSON.parse(ls(k) || "null"); } catch (e) { return null; } }
  function $(id) { return d.getElementById(id); }
  function nrm(s) { return String(s == null ? "" : s).toLowerCase().replace(/\s+/g, " ").trim(); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function fire(el, t) { try { el.dispatchEvent(new Event(t, { bubbles: true })); } catch (e) { /* abaikan */ } }
  function ping(msg, ok) { try { toast(msg, ok !== false); } catch (e) { /* abaikan */ } }

  /* ---------- gaya ---------- */
  var st = d.createElement("style");
  st.textContent =
    ".a2box{margin:10px auto;max-width:210mm;padding:10px 12px;border:1px solid var(--line,#c9d3da);border-radius:10px;background:var(--bar,#fff);color:var(--bar-ink,#12242f);font-size:14px;display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center}" +
    ".a2box select,.a2box input[type=number]{font:inherit;padding:7px 8px;border:1px solid var(--line,#c9d3da);border-radius:8px;background:var(--bg,#fff);color:var(--bar-ink,#12242f);min-height:38px}" +
    ".a2box input[type=number]{width:70px}.a2box select{max-width:100%;min-width:160px}" +
    ".a2box .a2i{color:var(--muted,#4d5f6b);font-size:13px;flex-basis:100%}" +
    ".a2ban{margin:0 auto 10px;max-width:210mm}.a2ban .a2box{margin:0;border-left:4px solid var(--ambt,#6b4300)}" +
    ".a2box .a2gap{display:flex;gap:8px;flex-wrap:wrap}" +
    "body.hp .a2box,body.hp .a2ban{margin-left:10px;margin-right:10px}" +
    "body.hp .a2box button,body.hp .a2box select,body.hp .a2box input[type=number]{min-height:46px}";
  d.head.appendChild(st);

  /* ---------- sinonim (sheet Sinonim) ---------- */
  var SIN = { barang: {}, dept: {} };
  function terapSin(s) {
    if (!s || typeof s !== "object") return;
    SIN = { barang: s.barang || {}, dept: s.dept || {} };
    try { if (window.CARI && CARI.sinonim) CARI.sinonim(SIN.barang); } catch (e) { /* abaikan */ }
  }
  function kanon(v) {
    var t = String(v == null ? "" : v).trim(); if (!t) return t;
    var k = nrm(t), h = SIN.dept[k];
    return h || t;
  }
  function alias(canon, q) {
    q = nrm(q); if (!q) return false;
    var hit = false;
    Object.keys(SIN.dept).forEach(function (a) { if (nrm(SIN.dept[a]) === nrm(canon) && a.indexOf(q) >= 0) hit = true; });
    return hit;
  }
  terapSin(jp(KS));
  try {
    api({ action: "sinonim" }).then(function (r) {
      if (r && r.ok) { terapSin(r); lsSet(KS, JSON.stringify({ barang: r.barang, dept: r.dept })); try { relookup(); } catch (e) { /* abaikan */ } }
    }).catch(function () { /* pakai cache */ });
  } catch (e) { /* abaikan */ }
  function kanonDept() {
    var el = $("dept"), k = kanon(el.value);
    if (k && k !== el.value.trim()) { el.value = k; fire(el, "input"); fire(el, "change"); }
  }
  $("dept").addEventListener("change", kanonDept);
  $("dept").addEventListener("blur", kanonDept);

  /* ---------- pencarian yang mengingat pilihan (per perangkat) ---------- */
  var lastQ = "";
  function kunciQ(q) { return nrm(q).replace(/[^a-z0-9 .]/g, ""); }
  function urut(q, hasil, persis) {
    lastQ = kunciQ(q);
    var m = jp(KB), e = m && m.q && m.q[lastQ];
    if (!e || lastQ.length < 2) return hasil;
    var top = hasil.slice(0, persis), sisa = hasil.slice(persis);
    var idx = {}; top.forEach(function (it, i) { idx[i] = (e[String(it.kode || it.nama).toUpperCase()] || 0); });
    var order = top.map(function (it, i) { return i; }).sort(function (a, b) { return (idx[b] - idx[a]) || (a - b); });
    return order.map(function (i) { return top[i]; }).concat(sisa);
  }
  function catat(kode, nama) {
    var q = lastQ; if (!q || q.length < 2 || !(kode || nama)) return;
    var m = jp(KB) || { q: {}, o: [] }; if (!m.q) m.q = {}; if (!m.o) m.o = [];
    var k = String(kode || nama).toUpperCase(), e = m.q[q] || (m.q[q] = {});
    e[k] = (e[k] || 0) + 1;
    m.o = m.o.filter(function (x) { return x !== q; }); m.o.push(q);
    while (m.o.length > 300) { delete m.q[m.o.shift()]; }
    lsSet(KB, JSON.stringify(m));
  }

  /* ---------- paket sekali klik ---------- */
  var tools = d.querySelector(".tools"), pak = d.createElement("div");
  var INFO0 = "Pilih Kebutuhan proyek (sisa RAB) atau paket lain seperti SL, lalu Pakai paket. Isi paket diisi ke tabel, paling banyak sebesar sisa RAB proyek. Jumlahnya masih bisa diubah, dan baris yang tidak perlu bisa dihapus sebelum dikirim.";
  pak.id = "a2paket"; pak.className = "a2box nop"; pak.style.display = "none";
  pak.innerHTML = '<b>Paket</b><select id="a2pk" aria-label="Pilih paket"></select>' +
    '<label>Jumlah set <input id="a2set" type="number" min="1" max="99" value="1" inputmode="numeric"></label>' +
    '<button class="btn" id="a2pakai" type="button">Pakai paket</button>' +
    '<span class="a2i" id="a2pinfo"></span><span class="a2i" id="a2pdet" style="display:none"></span><span class="a2i" id="a2pwarn" style="display:none;color:var(--ambt,#6b4300);font-weight:600"></span>';
  if (tools) tools.parentNode.insertBefore(pak, tools);
  var PAK = [], pakKey = "", ppbjLalu = "", SISA = {};
  function aturSet() { var P = PAK[Number($("a2pk").value)], l = $("a2set").parentNode; l.style.display = (P && P.proyek) || !PAK.length ? "none" : ""; }
  function ppbjNilai() { var e = $("ppbj"); return e ? String(e.value || "").trim() : ""; }
  function tampilPaket(boleh, msg) {
    var sel = $("a2pk");
    sel.style.display = boleh ? "" : "none"; $("a2set").parentNode.style.display = boleh ? "" : "none"; if (boleh) aturSet();
    $("a2pakai").disabled = !boleh; $("a2pinfo").textContent = boleh ? INFO0 : msg;
  }
  function muatPaket(ppbj) {
    return api({ action: "paket", kode: window.KODEPEG || "", ppbj: ppbj });
  }
  function segarPaket() {
    var kode = window.KODEPEG || "", ppbj = ppbjNilai();
    if (!kode || !ppbj) { pak.style.display = "none"; PAK = []; pakKey = ""; ppbjLalu = ppbj; return; }
    if (ppbj !== ppbjLalu) { ppbjLalu = ppbj; return; }   /* tunggu isian PPBJ stabil satu putaran */
    var key = kode + "|" + nrm(ppbj);
    if (key === pakKey) return;
    pakKey = key;
    muatPaket(ppbj).then(function (r) {
      if (key !== pakKey) return;
      var ok = !!(r && r.ok && r.boleh && r.data && r.data.length);
      PAK = ok ? r.data : [];
      var sel = $("a2pk"); sel.innerHTML = PAK.map(function (p, i) { return '<option value="' + i + '">' + esc(p.nama) + (p.proyek && !p.items.length ? " (RAB habis)" : " (" + p.items.length + " jenis barang)") + "</option>"; }).join(""); aturSet();
      $("a2pdet").style.display = "none"; $("a2pdet").textContent = "";
      tampilPaket(ok, (r && r.msg) || (r && r.ok && r.boleh ? "Belum ada paket aktif di Buffer Paket." : "Paket belum bisa dipakai."));
      pak.style.display = "";
    }).catch(function () { pakKey = ""; });
  }
  setInterval(segarPaket, 1500);
  $("ppbj") && $("ppbj").addEventListener("input", function () { pakKey = ""; });
  function barisIsi() { var n = 0; $("rows").querySelectorAll("tr").forEach(function (tr) { if (tr.querySelector(".nama").value.trim()) n++; }); return n; }
  function terapPaket(P, sets, ppbj) {
    var byKode = {}; DB.forEach(function (it) { if (it.kode) byKode[String(it.kode).trim().toUpperCase()] = it; });
    var tambah = 0, baru = [], penuh = 0, habis = [], luar = [], susut = [];
    SISA = {};
    P.items.forEach(function (it) {
      var base = Math.round(it.qty * (P.proyek ? 1 : sets) * 1000) / 1000, db = byKode[String(it.kode || "").trim().toUpperCase()], nama = db ? db.nama : it.nama;
      var rs = [].slice.call($("rows").querySelectorAll("tr"));
      var tr = rs.filter(function (r) { return nrm(r.querySelector(".nama").value) === nrm(nama); })[0], lama = 0;
      if (tr) { lama = parseFloat(String(tr.querySelector(".jml").value).replace(",", ".")) || 0; }
      var qty = base;
      if (it.diRab) {
        SISA[nrm(nama)] = { sisa: it.sisa, rab: it.rab };
        var ruang = Math.max(0, Math.round((it.sisa - lama) * 1000) / 1000);
        if (ruang <= 0) { habis.push(nama + " (RAB " + it.rab + ", sisa 0)"); return; }
        if (ruang < base) { qty = ruang; susut.push(nama + ": paket " + base + ", sisa RAB " + ruang + ", diisi " + ruang); }
      } else { luar.push(nama); }
      if (!tr) {
        tr = rs.filter(function (r) { return !r.querySelector(".nama").value.trim(); })[0];
        if (!tr) {
          if (barisIsi() >= MAX_ITEM) { penuh++; return; }
          addRow(); rs = [].slice.call($("rows").querySelectorAll("tr")); tr = rs[rs.length - 1];
        }
        var nm = tr.querySelector(".nama"); nm.value = nama; fire(nm, "input"); fire(nm, "change");
        if (!db) { baru.push(nama); var sat = tr.querySelector(".sat"); if (!sat.value) { sat.value = it.satuan || ""; } }
      }
      var j = tr.querySelector(".jml"), v = Math.round((lama + qty) * 1000) / 1000;
      j.value = String(v).replace(".", ","); fire(j, "input"); fire(j, "change");
      tambah++;
    });
    var m = 'Paket "' + P.nama + '" untuk PPBJ ' + ppbj + (P.proyek ? "" : " (" + sets + " set)") + ": " + tambah + " barang diisi.";
    if (habis.length) m += " " + habis.length + " barang tidak diisi karena RAB habis.";
    if (luar.length) m += " " + luar.length + " barang di luar RAB (ditandai).";
    if (baru.length) m += " " + baru.length + " barang tidak ada di daftar barang (ditandai BARU, isi satuannya).";
    if (penuh) m += " " + penuh + " barang tidak muat (maksimal " + MAX_ITEM + " per permintaan).";
    var det = [];
    if (susut.length) det.push("Disesuaikan dengan sisa RAB: " + susut.join("; ") + ".");
    if (habis.length) det.push("RAB habis, tidak diisi: " + habis.join("; ") + ".");
    if (luar.length) det.push("Di luar RAB proyek (tetap diisi sesuai paket): " + luar.join("; ") + ".");
    var dt = $("a2pdet"); dt.textContent = det.join(" "); dt.style.display = det.length ? "" : "none";
    ping(m, !penuh);
    cekLebih();
    simpanSegera();
  }
  $("a2pk").addEventListener("change", aturSet);
  function pakai() {
    var P0 = PAK[Number($("a2pk").value)]; if (!P0) return;
    var sets = Math.max(1, Math.min(99, parseInt($("a2set").value, 10) || 1)), ppbj = ppbjNilai(), btn = $("a2pakai");
    btn.disabled = true;
    muatPaket(ppbj).then(function (r) {   /* ambil sisa RAB terbaru tepat saat klik */
      btn.disabled = false;
      if (!r || !r.ok || !r.boleh) { ping((r && r.msg) || "Paket belum bisa dimuat. Coba lagi.", false); return; }
      PAK = r.data;
      var P = PAK.filter(function (p) { return p.nama === P0.nama; })[0];
      if (!P) { ping('Paket "' + P0.nama + '" sudah tidak aktif.', false); return; }
      if (!P.items.length) { ping("Semua barang RAB proyek ini sudah habis (sudah diambil atau sedang diproses), tidak ada yang diisi.", false); return; }
      terapPaket(P, sets, ppbj);
    }).catch(function () { btn.disabled = false; ping("Koneksi bermasalah, paket belum diisi. Coba lagi.", false); });
  }
  $("a2pakai").addEventListener("click", pakai);
  /* peringatan (tidak memblokir) bila jumlah barang paket melebihi sisa RAB */
  function cekLebih() {
    var w = [];
    $("rows").querySelectorAll("tr").forEach(function (tr) {
      var s = SISA[nrm(tr.querySelector(".nama").value)]; if (!s) return;
      var q = parseFloat(String(tr.querySelector(".jml").value).replace(",", ".")) || 0;
      if (q > s.sisa + 1e-9) w.push(tr.querySelector(".nama").value.trim() + " (diminta " + q + ", sisa RAB " + s.sisa + ")");
    });
    var e = $("a2pwarn"); e.textContent = w.length ? "Melebihi sisa RAB: " + w.join("; ") + ". Boleh tetap dikirim, penyetuju akan melihatnya." : ""; e.style.display = w.length ? "" : "none";
  }
  d.addEventListener("input", function (ev) { if (ev.target && ev.target.classList && ev.target.classList.contains("jml")) cekLebih(); }, true);

  /* ---------- draf otomatis ---------- */
  var FIELD = ["by", "dept", "pic", "ppbj", "email", "alasan", "cat"];
  function ambil() {
    var f = {}; FIELD.forEach(function (id) { f[id] = $(id).value; });
    var it = [];
    $("rows").querySelectorAll("tr").forEach(function (tr) {
      var n = tr.querySelector(".nama").value.trim(); if (!n) return;
      it.push({ n: n, j: tr.querySelector(".jml").value, s: tr.querySelector(".sat").value });
    });
    return { t: Date.now(), f: f, i: it };
  }
  var tmr = 0, bolehSimpan = true;
  function simpanSegera() {
    if (!bolehSimpan) return;
    var x = ambil();
    if (!x.i.length) { return; }
    lsSet(KD, JSON.stringify(x));
  }
  function simpanNanti() { clearTimeout(tmr); tmr = setTimeout(simpanSegera, 700); }
  d.addEventListener("input", simpanNanti, true);
  d.addEventListener("change", simpanNanti, true);
  d.addEventListener("visibilitychange", function () { if (d.visibilityState === "hidden") simpanSegera(); });
  window.addEventListener("pagehide", simpanSegera);

  function wkt(t) { var x = new Date(t), p = function (n) { return (n < 10 ? "0" : "") + n; }; return p(x.getDate()) + "/" + p(x.getMonth() + 1) + " " + p(x.getHours()) + ":" + p(x.getMinutes()); }
  function pulihkan(x) {
    bolehSimpan = false;
    try {
      var f = x.f || {};
      ["by", "dept", "ppbj", "email", "alasan", "cat"].forEach(function (id) { if (f[id] != null) { $(id).value = f[id]; } });
      fire($("dept"), "input"); fire($("dept"), "change");
      ["alasan", "cat"].forEach(function (id) { var e = $(id); if (e && e._upd) e._upd(); fire(e, "input"); });
      var rs = $("rows");
      (x.i || []).slice(0, MAX_ITEM).forEach(function (it, ix) {
        var list = [].slice.call(rs.querySelectorAll("tr"));
        var tr = list[ix];
        if (!tr) { addRow(); list = [].slice.call(rs.querySelectorAll("tr")); tr = list[list.length - 1]; }
        var nm = tr.querySelector(".nama"); nm.value = it.n; fire(nm, "input"); fire(nm, "change");
        if (tr.classList.contains("baru") && it.s) { tr.querySelector(".sat").value = it.s; }
        var j = tr.querySelector(".jml"); j.value = it.j || ""; fire(j, "input"); fire(j, "change");
      });
      /* PIC bisa dipilih setelah daftar PIC termuat */
      var pic = f.pic || "", n = 0;
      (function coba() {
        if (!pic) return;
        var el = $("pic"); el.value = pic; fire(el, "input"); fire(el, "change");
        if (nrm(el.value) !== nrm(pic) && n++ < 6) setTimeout(coba, 700);
      })();
    } finally { setTimeout(function () { bolehSimpan = true; }, 1500); }
  }
  function banner() {
    var x = jp(KD);
    if (!x || !x.i || !x.i.length || Date.now() - x.t > 3 * 86400000) { if (x) lsDel(KD); return; }
    if (barisIsi() > 0) return;
    var w = d.querySelector(".wrap"); if (!w) return;
    var b = d.createElement("div"); b.className = "a2ban nop"; b.id = "a2ban";
    b.innerHTML = '<div class="a2box"><span><b>Ada draf yang belum terkirim</b> (' + x.i.length + " barang, disimpan " + wkt(x.t) + ").</span>" +
      '<span class="a2gap"><button class="btn primary" type="button" id="a2lanjut">Lanjutkan draf</button><button class="btn" type="button" id="a2buang">Buang</button></span>' +
      '<span class="a2i">Draf hanya tersimpan di perangkat ini dan dihapus otomatis setelah 3 hari atau setelah permintaan terkirim.</span></div>';
    w.insertBefore(b, w.firstChild);
    $("a2lanjut").onclick = function () { pulihkan(x); b.remove(); ping("Draf dipulihkan. Periksa lagi sebelum dikirim.", true); };
    $("a2buang").onclick = function () { lsDel(KD); b.remove(); };
  }
  var _reset = window.resetForm;
  window.resetForm = function () { bolehSimpan = true; lsDel(KD); var b = $("a2ban"); if (b) b.remove(); return _reset.apply(this, arguments); };
  setTimeout(banner, 200);

  /* ---------- kirim ulang tanpa ganda ---------- */
  function acak() { var s = "", c = "abcdefghijklmnopqrstuvwxyz0123456789"; for (var i = 0; i < 20; i++) s += c.charAt(Math.floor(Math.random() * c.length)); return "k" + Date.now().toString(36) + s; }
  function hash(o) { var s = JSON.stringify(o), h = 5381; for (var i = 0; i < s.length; i++) { h = ((h << 5) + h + s.charCodeAt(i)) | 0; } return String(h); }
  function kunci(p) {
    var h = hash({ b: p.by, d: p.dept, p: p.ppbj, a: p.alasan, c: p.cat, i: p.items }), x = jp(KP);
    if (x && x.h === h && Date.now() - x.t < 5.5 * 3600000) return x.ck;
    var ck = acak(); lsSet(KP, JSON.stringify({ h: h, ck: ck, t: Date.now() })); return ck;
  }
  function gagal() {
    if ($("a2gagal")) return;
    var w = d.querySelector(".wrap"); if (!w) return;
    var b = d.createElement("div"); b.className = "a2ban nop"; b.id = "a2gagal";
    b.innerHTML = '<div class="a2box"><span><b>Pengiriman belum berhasil.</b> Isian Anda masih ada dan tersimpan sebagai draf.</span>' +
      '<span class="a2gap"><button class="btn primary" type="button" id="a2ulang">Kirim ulang</button></span>' +
      '<span class="a2i">Bila kiriman pertama ternyata sudah masuk, kirim ulang akan dikenali dan tidak membuat permintaan ganda (berlaku sekitar 6 jam).</span></div>';
    w.insertBefore(b, w.firstChild);
    $("a2ulang").onclick = function () { b.remove(); if (window.kirim) window.kirim(); };
  }
  function selesai() { bolehSimpan = false; clearTimeout(tmr); lsDel(KD); lsDel(KP); var b = $("a2gagal"); if (b) b.remove(); var b2 = $("a2ban"); if (b2) b2.remove(); }
  function mulai() { var b = $("a2gagal"); if (b) b.remove(); }

  window.A2 = { kanon: kanon, alias: alias, urut: urut, catat: catat, kunci: kunci, gagal: gagal, selesai: selesai, mulai: mulai, _banner: banner, _sin: function () { return SIN; } };
})();
