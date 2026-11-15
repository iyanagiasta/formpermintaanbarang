/* tanya-admin.js (T133, Paket F): Tanya Gudang MODE ADMIN (bot pintar khusus admin).
   Aktif otomatis bila kode yang dipakai masuk adalah password admin (tanpa tombol; T135).
   Semua pertanyaan dikirim ke server (aksi adminBotTanya). Jawaban berupa blok: teks, kartu, tabel (lihat semua + unduh Excel),
   grafik kecil, pilihan (bot belajar), dan aksi yang wajib dikonfirmasi sebelum mengubah data. */
(function () {
  "use strict";
  var T = function () { return window.__tanya || {}; };
  var A = {aktif: false, pin: "", K: {kodes: [], nama: [], ppbj: ""}, lastTeks: "", sibuk: false, versi: "", H: []};   // H = riwayat 6 tanya-jawab (ingatan percakapan)
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
      if (r[3]) h += '<div class="tga-r tga-rr' + (r[0] ? "" : " tga-lanjut") + '" role="button" tabindex="0" title="Klik untuk melihat asal angka"><span>' + esc(r[0]) + ' <i class="tga-i">asal angka</i></span><b class="' + nada + '">' + esc(r[1]) + '</b></div><div class="tga-rinci" hidden>' + tebal(r[3]).replace(/\n/g, "<br>") + "</div>";
      else h += '<div class="tga-r' + (r[0] ? "" : " tga-lanjut") + '"><span>' + esc(r[0]) + '</span><b class="' + nada + '">' + esc(r[1]) + "</b></div>";
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
      if (o.paksa) { tanya(o.tanya || A.lastTeks, {paksa: o.paksa, label: "→ " + o.label}); return; }
      if (o.tanya) { tanya(o.tanya); return; }
      if (o.kode) {
        api({action: "adminBotPilih", pin: A.pin, frasa: o.frasa, kode: o.kode}).catch(function () {});
        var p = {}; p[o.frasa] = o.kode; tanya(A.lastTeks, {pilih: p, label: "→ " + o.label});
      }
    }));
    wadah.appendChild(d);
  }
  function blokUsulan(b, wadah) {
    var d = document.createElement("div"); d.className = "tga-us";
    (b.item || []).forEach(function (u) {
      var r = document.createElement("div"); r.className = "tga-usr";
      r.innerHTML = '<div><b>' + (u.jenis === "kamus" ? "Kamus" : "Contoh") + ':</b> "' + esc(u.dari) + '" → <b>' + esc(u.jenis === "contoh" ? labelAlat(u.ke) : u.ke) + "</b>" + (u.alasan ? '<div class="tq-sm">' + esc(u.alasan) + "</div>" : "") + (u.contoh && u.contoh !== u.dari ? '<div class="tq-sm">Dari pertanyaan: ' + esc(u.contoh) + "</div>" : "") + '</div><div class="tga-ab"><button type="button" class="tga-ya">Setujui</button><button type="button" class="gh tga-batal">Tolak</button></div><p class="tq-sm tga-hasil"></p>';
      var ya = r.querySelector(".tga-ya"), no = r.querySelector(".tga-batal"), hs = r.querySelector(".tga-hasil");
      function putus(setuju) { ya.disabled = no.disabled = true; hs.textContent = "Menyimpan...";
        api({action: "adminBotUsulanPutus", pin: A.pin, id: u.id, setuju: setuju ? 1 : 0}).then(function (x) { hs.textContent = (x && x.msg) || (x && x.ok ? "Tersimpan." : "Gagal."); if (!(x && x.ok)) ya.disabled = no.disabled = false; else r.classList.add("tga-done"); }).catch(function () { hs.textContent = "Gagal terhubung."; ya.disabled = no.disabled = false; }); }
      ya.onclick = function () { putus(true); }; no.onclick = function () { putus(false); };
      d.appendChild(r);
    });
    wadah.appendChild(d);
  }
  var LABEL_ALAT = {stok: "Cek stok", jelaskan: "Penjelasan angka", cukup: "Cukup untuk berapa proyek", order: "Status pesanan", buffer: "Buffer menipis", proyek: "Sisa jatah proyek", risiko: "Proyek berisiko", simulasi: "Simulasi", mutasi: "Laporan keluar/masuk", kartu: "Riwayat barang", selisih: "Telusur selisih", sejenis: "Barang sejenis", seri: "Nomor seri", bpb: "Lacak dokumen", ambil: "Daftar ambil", beli: "Daftar beli", mati: "Barang tidur", stoksemua: "Semua stok", briefing: "Briefing", aneh: "Hal janggal", panduan: "Panduan", bantuan: "Bantuan"};
  function labelAlat(a) { return LABEL_ALAT[a] || a; }
  function pasangRinci(m) {
    m.querySelectorAll(".tga-rr").forEach(function (row) {
      if (row._ok) return; row._ok = 1;
      var f = function () { var d = row.nextElementSibling; if (d && d.classList.contains("tga-rinci")) { d.hidden = !d.hidden; row.classList.toggle("tga-buka", !d.hidden); } };
      row.onclick = f; row.onkeydown = function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); f(); } };
    });
  }
  function gambarBlok(L, m) {
    L.forEach(function (b) {
      if (b.t === "p") { if (b.s) m.insertAdjacentHTML("beforeend", "<p>" + tebal(b.s) + "</p>"); }
      else if (b.t === "kartu") m.insertAdjacentHTML("beforeend", blokKartu(b));
      else if (b.t === "tabel") blokTabel(b, m);
      else if (b.t === "grafik") { if ((b.label || []).length) m.insertAdjacentHTML("beforeend", blokGrafik(b)); }
      else if (b.t === "pilih") blokPilih(b, m);
      else if (b.t === "aksi") blokAksi(b, m);
      else if (b.t === "judul") m.insertAdjacentHTML("beforeend", '<h4 class="tga-jd">' + esc(b.s) + "</h4>");
      else if (b.t === "simpul") m.insertAdjacentHTML("beforeend", '<div class="tga-simpul"><div class="tq-sm"><b>Kesimpulan AI</b> · tafsiran dari angka di atas, bukan angka baru</div><p>' + tebal(b.s) + "</p></div>");
      else if (b.t === "usulan") blokUsulan(b, m);
      else if (b.t === "daftar") m.insertAdjacentHTML("beforeend", (b.judul ? "<p><b>" + esc(b.judul) + "</b></p>" : "") + '<ul class="tga-ul">' + (b.item || []).map(function (x) { return "<li>" + tebal(x) + "</li>"; }).join("") + "</ul>");
    });
    pasangRinci(m);
  }

  /* ---------- bertanya ---------- */
  function layar() { return (window.innerWidth || 1000) < 700 ? "hp" : "pc"; }
  function tanya(teks, o) {
    o = o || {}; teks = String(teks || "").trim(); if (!teks) return;
    if (!o.pilih && !o.paksa && !o.mode) A.lastTeks = teks;
    add("tq-u", esc(o.label || teks));
    var m = add("tq-b tga", '<p class="tq-sm tga-tunggu">Memahami dan menghitung dari data...</p>');
    var t0 = Date.now();
    api({action: "adminBotTanya", pin: A.pin, teks: teks, konteks: A.K, pilih: o.pilih || null, segar: o.segar ? 1 : 0, riwayat: A.H.slice(-6), layar: layar(), mode: o.mode || "", paksa: o.paksa || ""}).then(function (r) {
      if (!m) return; m.innerHTML = "";
      if (!r || !r.ok) {
        var msg = (r && r.msg) || "Gagal.";
        if (/is not defined|tidak dikenal/i.test(msg)) msg = "Bot admin belum terpasang di server (BotAdmin.gs). Pasang dulu BotAdmin.gs dan baris route di Code.gs, lalu Deploy.";
        if (/Kode tidak dikenali|Terlalu banyak/i.test(msg)) { matikan(); msg += " Silakan keluar lalu masuk lagi."; }
        m.innerHTML = '<p class="err">' + esc(msg) + "</p>"; return;
      }
      if (r.pahami) m.insertAdjacentHTML("beforeend", '<p class="tq-sm tga-paham">Dipahami sebagai: <b>' + esc(r.pahami) + "</b>" + (r.jalur === "kilat" ? ' <span class="tga-jl">kilat</span>' : r.jalur === "ai" || r.jalur === "pilihan" ? ' <span class="tga-jl tga-jl-ai">AI</span>' : r.jalur === "belajar" ? ' <span class="tga-jl">hasil belajar</span>' : "") + "</p>");
      gambarBlok(r.blok || [], m);
      if (r.konteks) A.K = {kodes: r.konteks.kodes || [], nama: r.konteks.nama || [], ppbj: r.konteks.ppbj || ""};
      if (r.alat !== "tanya") { A.H.push({q: teks, p: r.pahami || ""}); if (A.H.length > 6) A.H.shift(); }
      if ((r.saran || []).length) m.appendChild(chips(r.saran, function (x) {
        if (x.ulang) { tanya(x.tanya, {mode: x.ulang, pilih: o.pilih, paksa: o.paksa, label: x.label}); return; }
        if (/ $/.test(x.tanya)) { var q = document.getElementById("q"); if (q) { q.value = x.tanya; q.focus(); } } else tanya(x.tanya);
      }));
      m.insertAdjacentHTML("beforeend", '<p class="tq-sm tga-meta">' + "dihitung dari data " + ((Date.now() - t0) / 1000).toFixed(1).replace(".", ",") + " dtk" + (r.dataJam ? ' · bacaan data per ' + esc(r.dataJam) + ' <a href="#" class="tga-segar">hitung ulang dari data terbaru</a>' : "") + (r.id && r.alat !== "tanya" ? ' · <a href="#" class="tga-salah">Bukan ini maksud saya</a>' : "") + "</p>");
      var sg = m.querySelector(".tga-segar"); if (sg) sg.onclick = function (ev) { ev.preventDefault(); tanya(teks, {segar: true, pilih: o.pilih, paksa: o.paksa, label: teks + " (data terbaru)"}); };
      var sl = m.querySelector(".tga-salah"); if (sl) sl.onclick = function (ev) { ev.preventDefault(); bukanIni(r, teks, sl); };
      bawah();
    }).catch(function () { if (m) m.innerHTML = '<p class="err">Gagal terhubung ke server. Periksa internet lalu coba lagi.</p>'; });
  }
  /** "Bukan ini maksud saya": dicatat (bahan belajar), lalu tawarkan tafsiran lain atau tulis ulang maksudnya. */
  function bukanIni(r, teks, link) {
    if (link) { link.replaceWith(document.createTextNode("ditandai salah paham")); }
    api({action: "adminBotNilai", pin: A.pin, id: r.id, nilai: "salah"}).catch(function () {});
    var m = add("tq-b tga", '<p>Terima kasih, sudah dicatat untuk bahan belajar bot. Yang Anda maksud:</p>');
    if (!m) return;
    var op = (r.alt || []).map(function (x) { return {label: x.label, paksa: x.paksa}; });
    if (op.length) m.appendChild(chips(op, function (x) { tanya(teks, {paksa: x.paksa, label: "→ " + x.label}); }));
    var f = document.createElement("div"); f.className = "tga-pin";
    f.innerHTML = '<input class="t" type="text" maxlength="300" placeholder="Atau tulis maksud Anda dengan kata lain" aria-label="Maksud sebenarnya"><button type="button">Kirim</button>';
    m.appendChild(f);
    var i = f.querySelector("input"), b = f.querySelector("button");
    function kirim() { var v = i.value.trim(); if (!v) return; api({action: "adminBotNilai", pin: A.pin, id: r.id, nilai: "salah", catatan: v}).catch(function () {}); f.remove(); tanya(v); }
    b.onclick = kirim; i.onkeydown = function (e) { if (e.key === "Enter") kirim(); };
    bawah();
  }

  /* ---------- mode ---------- */
  function sapa() {
    var a = add("tq-b tga", "<p><b>Halo, admin.</b> Tanyakan apa saja: stok dan alasannya, pesanan, proyek, simulasi, laporan (bisa diunduh Excel), nomor seri, lacak BPB. Boleh beberapa permintaan sekaligus, bahasa sehari-hari, dan pertanyaan susulan (\"yang kedua?\", \"kalau 10 proyek?\"). Perintah yang mengubah data selalu minta konfirmasi dulu.</p>");
    if (a) a.appendChild(chips([{label: "Briefing hari ini", t: "briefing"}, {label: "Ada yang aneh?", t: "ada yang aneh hari ini"}, {label: "Proyek berisiko", t: "proyek mana paling berisiko"}, {label: "Pesanan terlambat", t: "pesanan yang telat"}, {label: "Contoh pertanyaan", t: "bantuan"}, {label: "Usulan belajar", t: "usulan belajar"}], function (x) { tanya(x.t); }));
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
  function awal(kode) { if (kode && T().api) AWAL = {kode: kode, p: api({action: "adminBotCek", kode: kode}).catch(function () { return null; })}; }
  function cek(kode) {
    var pre = AWAL && AWAL.kode === kode ? AWAL.p : null; AWAL = pre ? null : AWAL;
    return (pre ? pre.then(function (r) { return r === null ? api({action: "adminBotCek", kode: kode}) : r; }) : api({action: "adminBotCek", kode: kode})).then(function (r) {
      if (r && r.ok && r.admin) { A.versi = r.versi || ""; nyalakan(kode); }
      return r || {ok: false, gagal: true};
    }).catch(function () { return {ok: false, gagal: true, msg: "Gagal terhubung ke server."}; });
  }
  /** T139: selama pemeriksaan admin berjalan, pertanyaan MENUNGGU (tidak lari ke bot pegawai). Gagal terhubung: coba sekali lagi, lalu beri tahu dengan jelas. */
  var MENUNGGU = null;
  function cekPenuh(cand, kode, salamPegawai) {
    var info = add("tq-b tga-cek", '<p class="tq-sm">Memeriksa akses admin…</p>');
    function hapus() { if (info && info.parentNode) info.parentNode.removeChild(info); }
    function tutup(r) { MENUNGGU = null; hapus(); return r; }
    MENUNGGU = cek(cand).then(function (r) {
      if (r && r.gagal) return cek(cand);   // coba sekali lagi
      return r;
    }).then(function (r) {
      if (r && r.ok && r.admin) { if (cand === kode) { try { localStorage.removeItem("sctk_kode"); } catch (e) { /* abaikan */ } } return tutup(r); }   // password admin tidak disimpan permanen
      if (r && r.gagal) {
        tutup(r);
        var w = add("tq-b tga-cek", '<p><b>Bot admin belum bisa dihubungi</b> (server lambat atau koneksi putus). Jawaban sementara memakai bot pegawai.</p>');
        if (w) w.appendChild(chips([{label: "Coba lagi"}], function () { if (w.parentNode) w.parentNode.removeChild(w); cekPenuh(cand, kode, null); }));
        if (salamPegawai) salamPegawai();
        return r;
      }
      tutup(r);
      if (ss("sctk_tanya_adm") && cand !== kode && kode) { ss("sctk_tanya_adm", null); return cekPenuh(kode, kode, salamPegawai); }
      if (cand !== kode) ss("sctk_tanya_adm", null);
      if (salamPegawai) salamPegawai();
      return r;
    });
    return MENUNGGU;
  }
  /** Dipanggil tanya.js setelah chat tampil. kode = kode yang dipakai masuk; salamPegawai = sapaan bot pegawai (ditampilkan hanya bila bukan admin). */
  function pasang(kode, salamPegawai) {
    tombol();
    var simpan = ss("sctk_tanya_adm"), cand = simpan || kode;
    if (!cand) { if (salamPegawai) salamPegawai(); return; }
    cekPenuh(cand, kode, salamPegawai);
  }
  window.TGA = {awal: awal, pasang: pasang, tanya: tanya, get aktif() { return A.aktif; }, get menunggu() { return MENUNGGU; }, matikan: matikan, _A: A};
})();
