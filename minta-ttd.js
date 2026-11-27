/* minta-ttd.js (T174): halaman Minta TTD Staff Gudang. Pegawai unggah PPBJ (tanpa login); admin melihat riwayat.
   Peramban hanya MEMBACA PDF (pdf.js) dan mengirim PDF + koordinat. Gambar tanda tangan dibubuhkan di server dan tidak pernah dikirim ke sini. */
(function () {
  "use strict";
  var API_URL = "https://script.google.com/macros/s/AKfycbyVPrhw3xmk8D-73kgZQlesBB_1M6-Pc6vv3IUFMpa8jZx9bZmfGhzf_IFjKe3ZuYOMVw/exec";
  var URL_PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js", URL_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]; }); }
  async function api(b) { var r = await fetch(API_URL, {method: "POST", headers: {"Content-Type": "text/plain;charset=utf-8"}, body: JSON.stringify(b)}); return await r.json(); }
  function lsGet(k) { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* abaikan */ } }
  var TT = null;
  function toast(t, bad) { var x = $("toast"); x.textContent = t; x.className = bad ? "bad" : ""; x.style.display = "block"; clearTimeout(TT); TT = setTimeout(function () { x.style.display = "none"; }, 4500); }
  function adminPin() { try { return sessionStorage.getItem("sctk_admin") || ""; } catch (e) { return ""; } }
  function setAdminPin(v) { try { if (v) sessionStorage.setItem("sctk_admin", v); else sessionStorage.removeItem("sctk_admin"); } catch (e) { /* abaikan */ } }

  /* ---------- pdf.js ---------- */
  var pdfjsP = null;
  function pdfJs() {
    if (window.pdfjsLib) { try { if (!pdfjsLib.GlobalWorkerOptions.workerSrc) pdfjsLib.GlobalWorkerOptions.workerSrc = URL_WORKER; } catch (e) { /* abaikan */ } return Promise.resolve(window.pdfjsLib); }
    if (!pdfjsP) pdfjsP = new Promise(function (ok, gagal) {
      var s = document.createElement("script"); s.src = URL_PDFJS;
      s.onload = function () { if (window.pdfjsLib) { try { pdfjsLib.GlobalWorkerOptions.workerSrc = URL_WORKER; } catch (e) { /* abaikan */ } ok(window.pdfjsLib); } else gagal(new Error("Pustaka PDF gagal dimuat.")); };
      s.onerror = function () { pdfjsP = null; gagal(new Error("Pustaka PDF gagal dimuat. Periksa koneksi internet lalu coba lagi.")); };
      document.head.appendChild(s);
    });
    return pdfjsP;
  }
  /** Membaca teks PDF per halaman (koordinat tampilan) lalu mencari No. PPBJ, peruntukan, dan kotak "Bagian Gudang". */
  async function analisaPdf(buf, kataNama) {
    var lib = await pdfJs(), doc = await lib.getDocument({data: new Uint8Array(buf.slice(0)), verbosity: 0}).promise, hal = [], vps = {};
    for (var n = 1; n <= doc.numPages; n++) {
      var p = await doc.getPage(n), vp = p.getViewport({scale: 1}), tc = await p.getTextContent(); vps[n] = vp;
      hal.push({n: n, w: vp.width, h: vp.height, items: tc.items.filter(function (i) { return i.str && i.str.trim(); }).map(function (i) { var m = lib.Util.transform(vp.transform, i.transform); return {s: i.str, x: m[4], y: m[5], w: i.width}; })});
    }
    var r = TtdCari.baca(hal, {namaWajib: kataNama});
    if (!r.ok) return r;
    var vp2 = vps[r.hal], k = r.kotak, bl = vp2.convertToPdfPoint(k.kiri, k.bawah), br = vp2.convertToPdfPoint(k.kanan, k.bawah);
    r.pos = {hal: r.hal, bx: bl[0], by: bl[1], ang: Math.round(Math.atan2(br[1] - bl[1], br[0] - bl[0]) * 180 / Math.PI * 1000) / 1000, w: k.kanan - k.kiri, h: k.bawah - k.atas};
    r.halaman = doc.numPages;
    return r;
  }
  function b64Dari(file) { return new Promise(function (ok, gagal) { var fr = new FileReader(); fr.onload = function () { ok(String(fr.result).split(",")[1] || ""); }; fr.onerror = function () { gagal(new Error("Berkas tidak bisa dibaca.")); }; fr.readAsDataURL(file); }); }
  function unduhB64(b64, nama) {
    var bin = atob(b64), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    var url = URL.createObjectURL(new Blob([u], {type: "application/pdf"})), a = document.createElement("a"); a.href = url; a.download = nama; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  /* ---------- tab ---------- */
  function tab(t) {
    $("pMinta").hidden = t !== "minta"; $("pRiwayat").hidden = t !== "riwayat";
    $("tabMinta").className = t === "minta" ? "on" : ""; $("tabRiwayat").className = t === "riwayat" ? "on" : "";
    if (t === "riwayat") riwayatBuka();
  }
  $("tabMinta").onclick = function () { tab("minta"); history.replaceState(null, "", location.pathname); };
  $("tabRiwayat").onclick = function () { tab("riwayat"); history.replaceState(null, "", "#riwayat"); };

  /* ---------- pegawai: minta TTD ---------- */
  var INFO = {aktif: true, kataNama: "rosyihani", maksMB: 20}, BACA = null, FILE = null, SIBUK = false;
  function status(t, err) { $("status").className = err ? "note err" : "note"; $("status").textContent = t || ""; }
  function siap() { $("kirim").disabled = SIBUK || !INFO.aktif || !BACA || !BACA.ok || $("nama").value.trim().length < 2 || $("dept").value.trim().length < 2; }
  async function muatInfo() {
    try {
      var r = await api({action: "ttdPpbjInfoCek"});
      if (r && r.ok) { INFO = r; if (!r.aktif) { $("nonaktif").hidden = false; $("nonaktif").textContent = r.pesan; } }
    } catch (e) { /* tetap pakai bawaan; server menolak bila nonaktif */ }
    siap();
  }
  $("nama").value = lsGet("sctk_ttd_nama"); $("dept").value = lsGet("sctk_ttd_dept");
  $("nama").oninput = $("dept").oninput = siap;
  $("berkas").onchange = async function () {
    BACA = null; FILE = this.files && this.files[0] || null; $("alasanBox").hidden = true; $("alasan").value = ""; $("hasil").innerHTML = ""; status(""); siap();
    if (!FILE) { $("baca").textContent = ""; return; }
    if (!/\.pdf$/i.test(FILE.name) && FILE.type !== "application/pdf") { $("baca").innerHTML = '<span class="err">Berkas harus berformat PDF.</span>'; return; }
    if (FILE.size > INFO.maksMB * 1000000) { $("baca").innerHTML = '<span class="err">Ukuran berkas ' + (FILE.size / 1e6).toFixed(1) + ' MB melebihi batas ' + INFO.maksMB + ' MB.</span>'; return; }
    $("baca").textContent = "Membaca PDF...";
    try {
      var buf = await FILE.arrayBuffer(); BACA = await analisaPdf(buf, INFO.kataNama);
      if (!BACA.ok) { $("baca").innerHTML = '<span class="err">' + esc(BACA.msg) + '</span>'; }
      else $("baca").innerHTML = '<dl class="dl"><dt>No. PPBJ</dt><dd><b>' + esc(BACA.nomor) + '</b></dd><dt>Proyek</dt><dd>' + esc(BACA.proyek || "-") + '</dd><dt>Halaman</dt><dd>' + BACA.halaman + ' (kotak Bagian Gudang di halaman ' + BACA.hal + ')</dd></dl>';
    } catch (e) { BACA = null; $("baca").innerHTML = '<span class="err">PDF tidak bisa dibaca: ' + esc(e && e.message ? e.message : e) + '</span>'; }
    siap();
  };
  $("kirim").onclick = async function () {
    if (SIBUK || !BACA || !BACA.ok) return;
    var nama = $("nama").value.trim(), dept = $("dept").value.trim(), alasan = $("alasan").value.trim();
    if (!$("alasanBox").hidden && alasan.length < 5) { status("Isi alasan unggah ulang (minimal 5 huruf).", true); return; }
    SIBUK = true; siap(); lsSet("sctk_ttd_nama", nama); lsSet("sctk_ttd_dept", dept); $("hasil").innerHTML = "";
    try {
      status("Menyiapkan berkas..."); var b64 = await b64Dari(FILE);
      status("Mengunggah " + (FILE.size / 1e6).toFixed(1) + " MB dan membubuhkan tanda tangan. Mohon tunggu, jangan tutup halaman...");
      var r = await api({action: "ttdPpbjTanda", pdf: b64, nama: nama, dept: dept, nomor: BACA.nomor, proyek: BACA.proyek, kotak: BACA.pos, alasan: alasan});
      if (r && r.ok) {
        status("");
        $("alasanBox").hidden = true;
        $("hasil").innerHTML = '<div class="card"><b class="ok">Tanda tangan sudah dibubuhkan.</b><dl class="dl"><dt>No. PPBJ</dt><dd><b>' + esc(r.nomor) + '</b></dd><dt>Proyek</dt><dd>' + esc(r.proyek || "-") + '</dd><dt>Waktu</dt><dd>' + esc(r.waktu) + '</dd><dt>Kode verifikasi</dt><dd><span class="kode">' + esc(r.kode) + '</span></dd></dl><div class="act" style="flex-direction:row"><button id="unduh" type="button">Unduh PDF bertanda tangan</button><button type="button" class="gh" id="periksa">Periksa kode</button></div><div class="note">PDF terunduh otomatis. Simpan berkasnya; kode verifikasi tercetak kecil di bawah tanda tangan.</div></div>';
        var vu = r.verUrl; $("periksa").onclick = function () { window.open(vu, "_blank", "noopener"); };
        var nf = r.namaFile; $("unduh").onclick = function () { unduhB64(r.pdf, nf); }; try { unduhB64(r.pdf, nf); } catch (e) { /* tombol tetap tersedia */ }
        $("berkas").value = ""; FILE = null; BACA = null; $("baca").textContent = "";
      } else if (r && r.perluAlasan) {
        $("alasanBox").hidden = false; $("alasanMsg").textContent = r.msg; status(alasan ? r.msg : "", !!alasan); $("alasan").focus();
      } else status((r && r.msg) || "Gagal. Coba lagi.", true);
    } catch (e) { status("Gagal terhubung ke server. Coba lagi. (" + (e && e.message ? e.message : e) + ")", true); }
    SIBUK = false; siap();
  };

  /* ---------- admin: riwayat ---------- */
  var QT = null, DATA = null;
  function riwayatBuka() {
    var ada = !!adminPin(); $("masuk").hidden = ada; $("isiRiwayat").hidden = !ada;
    if (ada) muatDaftar(); else setTimeout(function () { $("pin").focus(); }, 50);
  }
  $("btnMasuk").onclick = async function () {
    var p = $("pin").value.trim(); if (!p) return; $("masukMsg").textContent = ""; this.disabled = true;
    try { var r = await api({action: "ttdPpbjDaftar", pin: p, q: ""}); if (r && r.ok) { setAdminPin(p); $("pin").value = ""; riwayatBuka(); } else $("masukMsg").textContent = (r && r.msg) || "Kode admin salah."; }
    catch (e) { $("masukMsg").textContent = "Gagal terhubung ke server."; }
    this.disabled = false;
  };
  $("pin").onkeydown = function (e) { if (e.key === "Enter") $("btnMasuk").click(); };
  $("btnKeluar").onclick = function () { setAdminPin(""); riwayatBuka(); };
  $("q").oninput = function () { clearTimeout(QT); QT = setTimeout(muatDaftar, 350); };
  async function muatDaftar() {
    $("daftar").innerHTML = '<div class="msg">Memuat...</div>';
    try {
      var r = await api({action: "ttdPpbjDaftar", pin: adminPin(), q: $("q").value.trim()});
      if (!r || !r.ok) { if (r && /PIN|kode|akses/i.test(r.msg || "")) { setAdminPin(""); riwayatBuka(); } $("daftar").innerHTML = '<div class="msg err">' + esc((r && r.msg) || "Gagal memuat.") + '</div>'; return; }
      DATA = r; tampil(r);
    } catch (e) { $("daftar").innerHTML = '<div class="msg err">Gagal terhubung ke server.</div>'; }
  }
  function tampil(r) {
    $("ringkas").innerHTML = 'Layanan: <b class="' + (r.aktif ? "ok" : "err") + '">' + (r.aktif ? "AKTIF" : "NONAKTIF") + '</b> &middot; hari ini ' + r.hariIni + ' dari batas ' + r.maksHari + ' &middot; total ' + r.total + ' catatan';
    $("btnSet").textContent = r.aktif ? "Nonaktifkan" : "Aktifkan";
    var q = $("q").value.trim(), h = '<div class="note">' + r.data.length + ' dari ' + r.total + ' catatan' + (q ? ' untuk &ldquo;' + esc(q) + '&rdquo;' : '') + (r.saring && r.saring.length ? ' (penyaring: ' + r.saring.map(esc).join(", ") + ')' : '') + '.</div>';
    if (!r.data.length) { $("daftar").innerHTML = h + '<div class="msg">Belum ada catatan' + (q ? " yang cocok" : "") + '.</div>'; return; }
    h += '<div class="tb"><table><thead><tr><th class="w1">Waktu</th><th>No. PPBJ / Proyek</th><th>Pemohon</th><th class="w1">Kode</th><th>Aksi</th></tr></thead><tbody>';
    r.data.forEach(function (o) {
      h += '<tr><td class="w1" data-l="Waktu">' + esc(o.waktu) + '</td><td data-l="No. PPBJ / Proyek"><b>' + esc(o.nomor) + '</b><small>' + esc(o.proyek || "-") + '</small></td>' +
        '<td data-l="Pemohon">' + esc(o.nama) + '<small>' + esc(o.dept) + '</small>' + (o.alasan ? '<small><span class="bd w">Unggah ulang</span> ' + esc(o.alasan) + '</small>' : '') + '</td>' +
        '<td class="w1" data-l="Kode"><span class="kode">' + esc(o.kode) + '</span><small>' + o.kb + ' KB</small></td>' +
        '<td data-l="Aksi"><div class="act"><button type="button" data-u="hasil" data-id="' + esc(o.id) + '">Unduh hasil</button><button type="button" class="gh" data-u="asli" data-id="' + esc(o.id) + '">Unduh asli</button><button type="button" class="gh" data-ver="' + esc(o.verUrl) + '">Periksa kode</button></div></td></tr>';
    });
    $("daftar").innerHTML = h + '</tbody></table></div>';
  }
  $("daftar").onclick = async function (e) {
    var v = e.target.closest("button[data-ver]"); if (v) { window.open(v.getAttribute("data-ver"), "_blank", "noopener"); return; }
    var b = e.target.closest("button[data-u]"); if (!b) return; var t = b.textContent; b.disabled = true; b.textContent = "Mengunduh...";
    try { var r = await api({action: "ttdPpbjUnduh", pin: adminPin(), id: b.getAttribute("data-id"), jenis: b.getAttribute("data-u")}); if (r && r.ok) unduhB64(r.pdf, r.namaFile); else toast((r && r.msg) || "Gagal mengunduh.", true); }
    catch (er) { toast("Gagal terhubung ke server.", true); }
    b.disabled = false; b.textContent = t;
  };
  $("btnSet").onclick = async function () {
    if (!DATA) return; var aktif = !DATA.aktif;
    if (!aktif && !confirm("Nonaktifkan Minta TTD? Pegawai tidak bisa meminta tanda tangan sampai diaktifkan lagi.")) return;
    this.disabled = true;
    try { var r = await api({action: "ttdPpbjSet", pin: adminPin(), aktif: aktif}); if (r && r.ok) muatDaftar(); else toast((r && r.msg) || "Gagal.", true); } catch (e) { toast("Gagal terhubung ke server.", true); }
    this.disabled = false;
  };
  $("btnUji").onclick = async function () {
    this.disabled = true; $("ujiHasil").innerHTML = '<div class="note">Menguji (pertama kali bisa beberapa detik)...</div>';
    try {
      var r = await api({action: "ttdPpbjUjiCek", pin: adminPin()});
      if (!r || !r.tahap) $("ujiHasil").innerHTML = '<div class="ket err">' + esc((r && r.msg) || "Gagal.") + '</div>';
      else $("ujiHasil").innerHTML = '<div class="ket"><b class="' + (r.ok ? "ok" : "err") + '">' + (r.ok ? "Semua tahap berhasil." : "Ada tahap yang gagal.") + '</b><ol style="margin:6px 0 0;padding-left:20px">' + r.tahap.map(function (t) { return '<li class="' + (t.ok ? "ok" : "err") + '">' + esc(t.n) + ': ' + (t.ok ? "berhasil" : "GAGAL") + ' <span style="color:var(--mut)">(' + t.ms + ' md' + (t.ket ? "; " + esc(t.ket) : "") + ')</span></li>'; }).join("") + '</ol></div>';
    } catch (e) { $("ujiHasil").innerHTML = '<div class="ket err">Gagal terhubung ke server.</div>'; }
    this.disabled = false;
  };

  muatInfo();
  if (location.hash === "#riwayat") tab("riwayat");
})();
