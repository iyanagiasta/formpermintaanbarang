/* tanya-admin.js (T133, Paket F): Tanya Gudang MODE ADMIN (bot pintar khusus admin).
   Aktif otomatis bila kode yang dipakai masuk adalah password admin (tanpa tombol; T135).
   Semua pertanyaan dikirim ke server (aksi adminBotTanya). Jawaban berupa blok: teks, kartu, tabel (lihat semua + unduh Excel),
   grafik kecil, pilihan (bot belajar), dan aksi yang wajib dikonfirmasi sebelum mengubah data. */
(function () {
  "use strict";
  var T = function () { return window.__tanya || {}; };
  var A = {aktif: false, pin: "", K: {kodes: [], nama: [], ppbj: ""}, lastTeks: "", sibuk: false, versi: ""};
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]; }); }
  function tebal(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>"); }
  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) { return null; } }
  function fN(v) { if (v === null || v === undefined || v === "") return ""; var n = Number(v); if (!isFinite(n)) return esc(v); return n.toLocaleString("id-ID", {maximumFractionDigits: 3}); }
  function fRp(v) { if (v === null || v === undefined || v === "") return "-"; var n = Number(v); if (!isFinite(n)) return esc(v); return "Rp " + Math.round(n).toLocaleString("id-ID"); }
  function sel(v, f) { return f === "n" ? fN(v) : f === "rp" ? fRp(v) : esc(v); }
  function api(b) { var f = T().api; if (!f) return Promise.reject(new Error("tanya.js belum siap")); if (b.kode === undefined) b.kode = ""; return f(b); }
  function add(cls, html) { var f = T().add; return f ? f(cls, html) : null; }
  function chips(list, fn) { var f = T().chips; return f ? f(list, fn) : document.createElement("div"); }
  function bawah() { var c = document.getElementById("chat"); if (c) c.scrollTop = c.scrollHeight; }

  /* ---------- Excel (SheetJS dimuat saat dibutuhkan) ---------- */
  var xlsxP = null;
  function muatXlsx() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    if (xlsxP) return xlsxP;
    xlsxP = new Promise(function (ok, gagal) { var s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"; s.onload = function () { ok(window.XLSX); }; s.onerror = function () { xlsxP = null; gagal(new Error("Pustaka Excel gagal dimuat")); }; document.head.appendChild(s); });
    return xlsxP;
  }
  function hariIni() { var d = new Date(), z = function (n) { return (n < 10 ? "0" : "") + n; }; return d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate()); }
  function unduh(b, tombol) {
    tombol.disabled = true; var t0 = tombol.textContent; tombol.textContent = "Menyiapkan...";
    muatXlsx().then(function (X) {
      var aoa = [b.kolom.map(function (k) { return k.n; })].concat(b.baris.map(function (r) { return r.map(function (v) { return v === null || v === undefined ? "" : v; }); }));
      var ws = X.utils.aoa_to_sheet(aoa); ws["!cols"] = b.kolom.map(function (k, i) { var m = String(k.n).length; for (var j = 0; j < Math.min(b.baris.length, 200); j++) { var L = String(b.baris[j][i] == null ? "" : b.baris[j][i]).length; if (L > m) m = L; } return {wch: Math.min(60, Math.max(8, m + 2))}; });
      var wb = X.utils.book_new(); X.utils.book_append_sheet(wb, ws, String(b.judul || "Data").replace(/[\\\/?*\[\]:]/g, " ").slice(0, 31));
      var nama = window.NB && NB.buat ? NB.buat("xlsx", "Tanya Gudang", b.unduh || b.judul, hariIni()) : ("Tanya Gudang - " + (b.judul || "data") + ".xlsx");
      X.writeFile(wb, nama);
      tombol.textContent = "Terunduh"; setTimeout(function () { tombol.textContent = t0; tombol.disabled = false; }, 1500);
    }).catch(function (e) { tombol.textContent = "Gagal: " + e.message; tombol.disabled = false; });
  }

  /* ---------- gambar blok ---------- */
  function blokKartu(b) {
    var h = '<div class="tga-k"><div class="tq-nm">' + esc(b.judul) + '</div>' + (b.sub ? '<div class="tq-sm">' + esc(b.sub) + '</div>' : "");
    (b.baris || []).forEach(function (r) {
      var nada = r[2] === "merah" ? " tq-bad" : r[2] === "kuning" ? " tq-warn" : r[2] === "hijau" ? " tq-ok" : "";
      h += '<div class="tga-r' + (r[0] ? "" : " tga-lanjut") + '"><span>' + esc(r[0]) + '</span><b class="' + nada + '">' + esc(r[1]) + "</b></div>";
    });
    return h + (b.catatan ? '<p class="tq-sm tga-cat">' + esc(b.catatan) + "</p>" : "") + "</div>";
  }
  function isiTabel(b, n) {
    var h = '<table class="tga-t"><thead><tr>' + b.kolom.map(function (k) { return "<th" + (k.f ? ' class="nm"' : "") + ">" + esc(k.n) + "</th>"; }).join("") + "</tr></thead><tbody>";
    b.baris.slice(0, n).forEach(function (r) { h += "<tr>" + r.map(function (v, i) { var k = b.kolom[i] || {}; return "<td" + (k.f ? ' class="nm"' : "") + ' data-l="' + esc(k.n) + '">' + sel(v, k.f) + "</td>"; }).join("") + "</tr>"; });
    return h + "</tbody></table>";
  }
  function blokTabel(b, wadah) {
    var d = document.createElement("div"); d.className = "tga-tb";
    var n = b.tutup ? 0 : Math.min(b.tampil || 15, b.baris.length);
    d.innerHTML = '<div class="tga-tj"><b>' + esc(b.judul) + '</b> <span class="tq-sm">' + b.total + " baris</span></div>" + '<div class="tga-sc"></div>' +
      (b.catatan ? '<p class="tq-sm tga-cat">' + esc(b.catatan) + "</p>" : "") + '<div class="tga-bt"></div>';
    var sc = d.querySelector(".tga-sc"), bt = d.querySelector(".tga-bt");
    function gambar() { sc.innerHTML = n ? isiTabel(b, n) : ""; bt.innerHTML = "";
      if (n < b.baris.length) { var lb = document.createElement("button"); lb.type = "button"; lb.className = "tq-chip"; lb.textContent = n ? "Lihat semua (" + b.baris.length + ")" : "Tampilkan (" + b.baris.length + " baris)"; lb.onclick = function () { n = Math.min(b.baris.length, 400); gambar(); bawah(); }; bt.appendChild(lb); }
      if (b.baris.length) { var ub = document.createElement("button"); ub.type = "button"; ub.className = "tq-chip"; ub.textContent = "Unduh Excel"; ub.onclick = function () { unduh(b, ub); }; bt.appendChild(ub); }
      if (n >= 400 && b.baris.length > 400) bt.insertAdjacentHTML("beforeend", '<span class="tq-sm">Tampil 400 baris; semua baris ada di Excel.</span>');
      if (b.total > b.baris.length) bt.insertAdjacentHTML("beforeend", '<span class="tq-sm">Dibatasi ' + b.baris.length + " baris dari " + b.total + ".</span>");
    }
    gambar(); wadah.appendChild(d);
  }
  function blokGrafik(b) {
    var mx = 0; (b.nilai || []).forEach(function (v) { if (Math.abs(v) > mx) mx = Math.abs(v); });
    var h = '<div class="tga-g"><div class="tq-sm"><b>' + esc(b.judul) + "</b></div>";
    (b.label || []).forEach(function (l, i) {
      var v = b.nilai[i] || 0, w = mx ? Math.max(1, Math.round(Math.abs(v) / mx * 100)) : 0;
      h += '<div class="tga-gr"><span class="tga-gl" title="' + esc(l) + '">' + esc(l) + '</span><span class="tga-gb"><i style="width:' + w + '%"></i></span><span class="tga-gv">' + (b.satuan === "Rp" ? fRp(v) : fN(v) + (b.satuan ? " " + esc(b.satuan) : "")) + "</span></div>";
    });
    return h + "</div>";
  }
  function blokAksi(b, wadah) {
    var d = document.createElement("div"); d.className = "tga-aksi";
    d.innerHTML = '<div class="tq-nm">' + esc(b.judul) + "</div><ul>" + (b.rincian || []).filter(Boolean).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + '</ul><div class="tga-ab"><button type="button" class="tga-ya">Ya, jalankan</button><button type="button" class="gh tga-batal">Batal</button></div><p class="tq-sm tga-hasil"></p>';
    var ya = d.querySelector(".tga-ya"), no = d.querySelector(".tga-batal"), hs = d.querySelector(".tga-hasil");
    no.onclick = function () { ya.disabled = no.disabled = true; hs.textContent = "Dibatalkan. Tidak ada yang diubah."; };
    ya.onclick = function () {
      ya.disabled = no.disabled = true; hs.textContent = "Menjalankan...";
      api({action: "adminBotJalankan", pin: A.pin, token: b.token}).then(function (r) {
        if (!r || !r.ok) { hs.textContent = (r && r.msg) || "Gagal."; return; }
        hs.textContent = r.berhasil ? "Sudah dijalankan." : "Tidak berhasil.";
        var m = add("tq-b tga", ""); if (m) { gambarBlok(r.blok || [], m); if ((r.saran || []).length) m.appendChild(chips(r.saran, function (x) { tanya(x.tanya); })); }
        bawah();
      }).catch(function () { hs.textContent = "Gagal terhubung ke server. Coba lagi: tanyakan ulang perintahnya."; });
    };
    wadah.appendChild(d);
  }
  function blokPilih(b, wadah) {
    var d = document.createElement("div"); d.className = "tga-pl"; d.innerHTML = "<p>" + tebal(b.judul) + "</p>";
    d.appendChild(chips(b.opsi.map(function (o) { return {label: o.label, o: o}; }), function (x) {
      var o = x.o;
      if (o.tanya) { tanya(o.tanya); return; }
      if (o.kode) {
        api({action: "adminBotPilih", pin: A.pin, frasa: o.frasa, kode: o.kode}).catch(function () {});
        var p = {}; p[o.frasa] = o.kode; tanya(A.lastTeks, {pilih: p, label: "→ " + o.label});
      }
    }));
    wadah.appendChild(d);
  }
  function gambarBlok(L, m) {
    L.forEach(function (b) {
      if (b.t === "p") { if (b.s) m.insertAdjacentHTML("beforeend", "<p>" + tebal(b.s) + "</p>"); }
      else if (b.t === "kartu") m.insertAdjacentHTML("beforeend", blokKartu(b));
      else if (b.t === "tabel") blokTabel(b, m);
      else if (b.t === "grafik") { if ((b.label || []).length) m.insertAdjacentHTML("beforeend", blokGrafik(b)); }
      else if (b.t === "pilih") blokPilih(b, m);
      else if (b.t === "aksi") blokAksi(b, m);
      else if (b.t === "daftar") m.insertAdjacentHTML("beforeend", (b.judul ? "<p><b>" + esc(b.judul) + "</b></p>" : "") + '<ul class="tga-ul">' + (b.item || []).map(function (x) { return "<li>" + tebal(x) + "</li>"; }).join("") + "</ul>");
    });
  }

  /* ---------- bertanya ---------- */
  function tanya(teks, o) {
    o = o || {}; teks = String(teks || "").trim(); if (!teks) return;
    if (!o.pilih) A.lastTeks = teks;
    add("tq-u", esc(o.label || teks));
    var m = add("tq-b tga", '<p class="tq-sm tga-tunggu">Menghitung dari data...</p>');
    var t0 = Date.now();
    api({action: "adminBotTanya", pin: A.pin, teks: teks, konteks: A.K, pilih: o.pilih || null}).then(function (r) {
      if (!m) return; m.innerHTML = "";
      if (!r || !r.ok) {
        var msg = (r && r.msg) || "Gagal.";
        if (/is not defined|tidak dikenal/i.test(msg)) msg = "Bot admin belum terpasang di server (BotAdmin.gs). Pasang dulu BotAdmin.gs dan baris route di Code.gs, lalu Deploy.";
        if (/Kode tidak dikenali|Terlalu banyak/i.test(msg)) { matikan(); msg += " Silakan keluar lalu masuk lagi."; }
        m.innerHTML = '<p class="err">' + esc(msg) + "</p>"; return;
      }
      gambarBlok(r.blok || [], m);
      if (r.konteks) A.K = {kodes: r.konteks.kodes || [], nama: r.konteks.nama || [], ppbj: r.konteks.ppbj || ""};
      if ((r.saran || []).length) m.appendChild(chips(r.saran, function (x) { if (/ $/.test(x.tanya)) { var q = document.getElementById("q"); if (q) { q.value = x.tanya; q.focus(); } } else tanya(x.tanya); }));
      m.insertAdjacentHTML("beforeend", '<p class="tq-sm tga-meta">' + (r.ai ? "AI membantu memahami pertanyaan · " : "") + "dihitung dari data " + ((Date.now() - t0) / 1000).toFixed(1).replace(".", ",") + " dtk</p>");
      bawah();
    }).catch(function () { if (m) m.innerHTML = '<p class="err">Gagal terhubung ke server. Periksa internet lalu coba lagi.</p>'; });
  }

  /* ---------- mode ---------- */
  function sapa() {
    var a = add("tq-b tga", "<p><b>Halo, admin.</b> Tanyakan apa saja: stok dan alasannya, pesanan, proyek, simulasi, laporan (bisa diunduh Excel), nomor seri, lacak BPB. Perintah yang mengubah data selalu minta konfirmasi dulu.</p>");
    if (a) a.appendChild(chips([{label: "Briefing hari ini", t: "briefing"}, {label: "Ada yang aneh?", t: "ada yang aneh hari ini"}, {label: "Proyek berisiko", t: "proyek mana paling berisiko"}, {label: "Pesanan terlambat", t: "pesanan yang telat"}, {label: "Contoh pertanyaan", t: "bantuan"}], function (x) { tanya(x.t); }));
  }
  /** Tidak ada tombol "Mode admin": admin dikenali dari kode masuk (password admin). Hanya lencana ADMIN kecil di judul. */
  function tombol() {
    var old = document.getElementById("tga-mode"); if (old) old.remove();
    var badge = document.getElementById("tga-badge"), top = document.querySelector(".top h1");
    if (A.aktif && top && !badge) top.insertAdjacentHTML("beforeend", ' <span id="tga-badge" class="tga-badge">ADMIN</span>');
    if (!A.aktif && badge) badge.remove();
  }
  function placeholder() { var q = document.getElementById("q"); if (q) q.placeholder = A.aktif ? "Contoh: kenapa pipa pvc 3 inch kurang? / rekap keluar bulan ini per proyek" : "Contoh: stok pipa pvc 3 inch"; }
  function nyalakan(pin) { A.pin = pin; A.aktif = true; ss("sctk_tanya_adm", pin); tombol(); placeholder(); sapa(); }
  function matikan() { A.aktif = false; A.pin = ""; ss("sctk_tanya_adm", null); tombol(); placeholder(); }
  /** T135: pemeriksaan admin dimulai bersamaan dengan pemuatan data (dipanggil tanya.js di awal), jadi tidak menambah waktu tunggu. */
  var AWAL = null;
  function awal(kode) { if (kode) AWAL = {kode: kode, p: api({action: "adminBotCek", kode: kode}).catch(function () { return null; })}; }
  function cek(kode) {
    var pre = AWAL && AWAL.kode === kode ? AWAL.p : null; AWAL = pre ? null : AWAL;
    return (pre || api({action: "adminBotCek", kode: kode})).then(function (r) {
      if (r === null) return {ok: false, msg: "Gagal terhubung ke server."};
      if (r && r.ok && r.admin) { A.versi = r.versi || ""; nyalakan(kode); }
      return r;
    }).catch(function () { return {ok: false, msg: "Gagal terhubung ke server."}; });
  }
  /** Dipanggil tanya.js setelah chat tampil. kode = kode yang dipakai masuk. */
  function pasang(kode) {
    tombol();
    var simpan = ss("sctk_tanya_adm"), cand = simpan || kode;
    if (!cand) return;
    cek(cand).then(function (r) {
      if (r && r.ok && r.admin) { if (cand === kode) { try { localStorage.removeItem("sctk_kode"); } catch (e) { /* abaikan */ } } return; }   // password admin tidak disimpan permanen di perangkat
      if (simpan) { ss("sctk_tanya_adm", null); if (kode && kode !== simpan) cek(kode); }
    });
  }
  window.TGA = {awal: awal, pasang: pasang, tanya: tanya, get aktif() { return A.aktif; }, matikan: matikan, _A: A};
})();
