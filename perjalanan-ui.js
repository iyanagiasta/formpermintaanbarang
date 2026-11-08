/* Halaman admin Perjalanan Kerja: isian jurnal/kartu/foto, ukuran, impor Excel opname bulanan, pelacak rekomendasi dan keputusan, harga, pengaturan tautan. */
(function (g) {
  "use strict";
  var API_URL = "https://script.google.com/macros/s/AKfycbyVPrhw3xmk8D-73kgZQlesBB_1M6-Pc6vv3IUFMpa8jZx9bZmfGhzf_IFjKe3ZuYOMVw/exec";
  var XLSX_URL = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
  var app = document.getElementById("app"), PIN = "", PJ = g.PJ = {}, tab = "tampilan", ST = {};
  var BAGIAN = [["kartu", "Masalah → Tindakan → Hasil"], ["perjalanan", "Lini masa perjalanan"], ["sebelum", "Foto sebelum dan sesudah"], ["opname", "Opname: progres, tren, status keputusan (angka saja)"], ["topselisih", "Daftar selisih terbesar (menampilkan NAMA barang)"], ["rupiah", "Nilai rupiah selisih"], ["sistem", "Angka dari sistem gudang (permintaan)"], ["ukuran", "Ukuran keberhasilan (grafik)"], ["minta", "Yang menunggu keputusan"], ["rencana", "Rencana berikutnya"], ["bukti", "Bukti pendukung"]];
  var TIPE = {
    jurnal: {nama: "Jurnal / tonggak", f: [["tanggal", "Tanggal", "date", 1], ["judul", "Judul kegiatan", "text", 1], ["gudang", "Gudang (G1–G4, boleh kosong)", "text"], ["isi1", "Uraian singkat", "area"], ["isi2", "Hasil / angka", "text"], ["isi3", "Dampak bagi perusahaan", "text"]], pen: 1, foto: 1},
    kartu: {nama: "Masalah → Tindakan → Hasil", f: [["judul", "Masalah", "text", 1], ["isi1", "Tindakan", "area"], ["isi2", "Hasil", "area"], ["isi3", "Dampak (satu kalimat)", "text"], ["urut", "Urutan tampil (angka kecil dulu)", "number"]], pen: 1},
    foto: {nama: "Foto & bukti", f: [["tanggal", "Tanggal foto", "date"], ["judul", "Keterangan", "text", 1], ["isi1", "Kelompok", "sel", 0, ["Sebelum", "Sesudah", "Dokumen", "Lainnya"]], ["gudang", "Gudang (G1–G4)", "text"], ["isi2", "Tautan (opsional)", "text"]], foto: 1},
    minta: {nama: "Menunggu keputusan", f: [["judul", "Hal yang diminta", "text", 1], ["isi1", "Uraian", "area"], ["isi2", "Tenggat", "text"], ["isi3", "Status", "sel", 0, ["Menunggu", "Sudah diputuskan"]], ["urut", "Urutan tampil", "number"]]},
    rencana: {nama: "Rencana berikutnya", f: [["judul", "Rencana", "text", 1], ["isi1", "Uraian", "area"], ["isi2", "Target waktu", "text"], ["isi3", "Status", "sel", 0, ["Dirancang", "Pilot", "Berjalan", "Selesai"]], ["urut", "Urutan tampil", "number"]]}
  };
  function esc(x) { return String(x == null ? "" : x).replace(/[&<>"]/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]; }); }
  function fmt(n, d) { if (n == null || n === "" || isNaN(n)) return "-"; return Number(n).toLocaleString("id-ID", {maximumFractionDigits: d == null ? 1 : d}); }
  function $(s, r) { return (r || document).querySelector(s); }
  function toast(m, bad) { var t = $("#toast"); t.textContent = m; t.className = bad ? "bad" : ""; t.style.display = "block"; clearTimeout(toast.h); toast.h = setTimeout(function () { t.style.display = "none"; }, bad ? 6000 : 3000); }
  function simpanPin(v) { try { if (v) sessionStorage.setItem("sctk_admin", v); else sessionStorage.removeItem("sctk_admin"); } catch (e) {} }
  function bacaPin() { try { return sessionStorage.getItem("sctk_admin") || ""; } catch (e) { return ""; } }
  async function call(action, body) {
    var b = Object.assign({action: action, pin: PIN}, body || {}), r;
    for (var i = 0; i < 3; i++) {
      try { var x = await fetch(API_URL, {method: "POST", headers: {"Content-Type": "text/plain;charset=utf-8"}, body: JSON.stringify(b)}); r = await x.json(); break; }
      catch (e) { if (i === 2) return {ok: false, msg: "Tidak bisa terhubung. Periksa internet."}; await new Promise(function (z) { setTimeout(z, 1200 * (i + 1)); }); }
    }
    return r;
  }
  PJ.call = call;
  function hariIni() { var d = new Date(), p = function (n) { return String(n).padStart(2, "0"); }; return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()); }

  /* ---------- masuk ---------- */
  function loginView() {
    app.innerHTML = '<div class="card" style="max-width:380px;margin:30px auto"><p style="margin-top:0"><b>PIN admin</b></p><div class="note" style="margin-bottom:8px">Halaman ini hanya untuk admin gudang.</div><input class="t" id="kd" type="password" autocomplete="off" placeholder="PIN admin"><div style="height:10px"></div><button id="go" style="width:100%">Masuk</button><p class="err" id="lerr" style="text-align:center;margin:10px 0 0"></p></div>';
    var i = $("#kd"); i.focus(); i.onkeydown = function (e) { if (e.key === "Enter") masuk(); }; $("#go").onclick = masuk;
  }
  async function masuk() {
    var v = $("#kd").value.trim(); if (!v) return; var b = $("#go"); b.disabled = true; PIN = v; var r = await call("adminSistem");
    if (!r || !r.ok) { PIN = ""; b.disabled = false; $("#lerr").textContent = (r && r.msg) || "PIN tidak dikenali."; return; }
    simpanPin(v); utama();
  }
  function utama() {
    app.innerHTML = '<div class="tabs" id="tabs"></div><div id="isi"></div>';
    var T = [["tampilan", "Tampilan & tautan"], ["isian", "Jurnal & isian"], ["ukuran", "Ukuran"], ["opname", "Opname bulanan"], ["harga", "Harga"]];
    $("#tabs").innerHTML = T.map(function (t) { return '<button data-t="' + t[0] + '" class="' + (t[0] === tab ? "on" : "") + '">' + t[1] + "</button>"; }).join("") + '<button class="gh" id="kel" style="margin-left:auto">Keluar</button>';
    Array.prototype.forEach.call($("#tabs").querySelectorAll("button[data-t]"), function (b) { b.onclick = function () { tab = b.getAttribute("data-t"); utama(); }; });
    $("#kel").onclick = function () { simpanPin(""); PIN = ""; loginView(); };
    ({tampilan: vTampilan, isian: vIsian, ukuran: vUkuran, opname: vOpname, harga: vHarga})[tab]();
  }

  /* ---------- tampilan & tautan ---------- */
  async function vTampilan() {
    var box = $("#isi"); box.innerHTML = '<div class="card note">Memuat...</div>'; var r = await call("perjAturGet");
    if (!r.ok) { box.innerHTML = '<div class="card err">' + esc(r.msg) + "</div>"; return; }
    var a = r.atur, url = new URL("tampil.html#k=" + a.sandi, location.href).href;
    box.innerHTML = '<div class="card"><h3>Dashboard presentasi</h3><div class="fr"><div class="lebar"><label>Judul</label><input class="t" id="aj" value="' + esc(a.judul) + '"></div><div><label>Mulai</label><input class="t" id="am" type="date" value="' + esc(a.mulai) + '"></div><div><label>Nama penyaji</label><input class="t" id="ap" value="' + esc(a.penyaji) + '"></div><div class="lebar"><label>Ringkasan 30 detik (tampil di layar pertama)</label><textarea class="t" id="ar" maxlength="500">' + esc(a.ringkasan) + "</textarea></div></div>" +
      '<h3 style="margin-top:12px">Bagian yang tampil di proyektor DAN di tautan</h3><div class="note">Yang dimatikan tidak dikirim ke tautan sama sekali. Bagian tanpa isian otomatis dilewati.</div><div id="bg">' +
      BAGIAN.map(function (b) { return '<label class="tog"><input type="checkbox" data-b="' + b[0] + '"' + (a.bagian[b[0]] ? " checked" : "") + "><span>" + esc(b[1]) + (b[0] === "topselisih" || b[0] === "rupiah" ? ' <span class="bd w">bawaan mati</span>' : "") + "</span></label>"; }).join("") + '</div><div style="margin-top:12px"><button id="sv">Simpan pengaturan</button></div></div>' +
      '<div class="card"><h3>Tautan untuk atasan dan direktur</h3><div class="note">Dibagikan hanya saat presentasi. Orang yang memegang tautan hanya bisa MELIHAT apa yang tampil di proyektor. Matikan lagi sesudah presentasi.</div>' +
      '<label class="tog"><input type="checkbox" id="ak"' + (a.aktif ? " checked" : "") + '><span><b>Tautan dinyalakan</b> <span class="bd ' + (a.aktif ? "d" : "l") + '" id="akb">' + (a.aktif ? "AKTIF" : "MATI") + '</span></span></label><div class="fr"><div class="lebar"><label>Tautan (berisi sandi)</label><input class="t" id="ul" readonly value="' + esc(url) + '"></div></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button id="sl" class="gh">Salin tautan</button><button id="gs" class="gh">Ganti sandi (tautan lama mati)</button></div></div>' +
      '<div class="card"><h3>Buka</h3><div style="display:flex;gap:8px;flex-wrap:wrap"><button id="bp">Buka presentasi (seperti yang dilihat atasan)</button><button id="bl" class="gh">Pratinjau lengkap (termasuk draf, hanya Anda)</button></div><div class="note" style="margin-top:8px">Di presentasi: tombol panah, F = layar penuh, P = simpan PDF (cadangan bila internet ruang rapat bermasalah), D = daftar bagian.</div></div>';
    function kumpul() { var b = {}; Array.prototype.forEach.call(box.querySelectorAll("input[data-b]"), function (c) { b[c.getAttribute("data-b")] = c.checked; }); return b; }
    $("#sv").onclick = async function () { var x = await call("perjAturSimpan", {judul: $("#aj").value, mulai: $("#am").value, penyaji: $("#ap").value, ringkasan: $("#ar").value, bagian: kumpul()}); toast(x.msg, !x.ok); };
    $("#ak").onchange = async function () { var x = await call("perjAturSimpan", {aktif: $("#ak").checked}); toast(x.ok ? ($("#ak").checked ? "Tautan DINYALAKAN" : "Tautan dimatikan") : x.msg, !x.ok); if (x.ok) { $("#akb").textContent = $("#ak").checked ? "AKTIF" : "MATI"; $("#akb").className = "bd " + ($("#ak").checked ? "d" : "l"); } };
    $("#sl").onclick = function () { var i = $("#ul"); i.select(); try { navigator.clipboard.writeText(i.value).then(function () { toast("Tautan disalin."); }, function () { document.execCommand("copy"); toast("Tautan disalin."); }); } catch (e) { document.execCommand("copy"); toast("Tautan disalin."); } };
    $("#gs").onclick = async function () { if (!confirm("Ganti sandi? Tautan yang sudah dibagikan tidak berlaku lagi.")) return; var x = await call("perjAturSimpan", {sandiBaru: true}); toast(x.msg, !x.ok); if (x.ok) vTampilan(); };
    $("#bp").onclick = function () { window.open("tampil.html", "_blank"); }; $("#bl").onclick = function () { window.open("tampil.html#lengkap", "_blank"); };
  }

  /* ---------- foto ---------- */
  function kompres(file) {
    return new Promise(function (ok, no) {
      var fr = new FileReader(); fr.onerror = function () { no(new Error("Foto tidak terbaca")); };
      fr.onload = function () {
        var im = new Image(); im.onerror = function () { no(new Error("Berkas bukan gambar")); };
        im.onload = function () {
          var m = 1400, s = Math.min(1, m / Math.max(im.width, im.height)), c = document.createElement("canvas"); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s);
          c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); ok(c.toDataURL("image/jpeg", 0.82).split(",")[1]);
        }; im.src = fr.result;
      }; fr.readAsDataURL(file);
    });
  }
  async function unggahFoto(files, daftar, wadah) {
    for (var i = 0; i < files.length; i++) {
      try { toast("Mengunggah foto " + (i + 1) + "/" + files.length + "..."); var b64 = await kompres(files[i]), r = await call("perjFotoSimpan", {nama: files[i].name, b64: b64, mime: "image/jpeg"}); if (!r.ok) { toast(r.msg, true); continue; } daftar.push(r.id); }
      catch (e) { toast(e.message, true); }
    }
    gambarFoto(daftar, wadah); toast("Foto terunggah.");
  }
  function gambarFoto(daftar, wadah) {
    wadah.innerHTML = daftar.map(function (id) { return '<div class="f" data-id="' + esc(id) + '"><span>memuat</span><button type="button" title="Lepas foto">×</button></div>'; }).join("");
    Array.prototype.forEach.call(wadah.querySelectorAll(".f"), function (f) {
      var id = f.getAttribute("data-id"); f.querySelector("button").onclick = function () { var k = daftar.indexOf(id); if (k >= 0) daftar.splice(k, 1); gambarFoto(daftar, wadah); };
      call("perjFotoGet", {id: id}).then(function (r) { if (r.ok) f.insertBefore(Object.assign(new Image(), {src: r.dataUrl}), f.firstChild), f.querySelector("span").remove(); else f.querySelector("span").textContent = "foto"; });
    });
  }

  /* ---------- jurnal & isian ---------- */
  async function vIsian() {
    var box = $("#isi"), sub = ST.sub || "jurnal";
    box.innerHTML = '<div class="tabs">' + Object.keys(TIPE).map(function (k) { return '<button data-s="' + k + '" class="' + (k === sub ? "on" : "") + '">' + TIPE[k].nama + "</button>"; }).join("") + '</div><div id="fm"></div><div id="ls"></div>';
    Array.prototype.forEach.call(box.querySelectorAll("button[data-s]"), function (b) { b.onclick = function () { ST.sub = b.getAttribute("data-s"); vIsian(); }; });
    var r = await call("perjItemDaftar", {tipe: sub}), T = TIPE[sub], list = r.ok ? r.data : [];
    function formulir(it) {
      it = it || {}; var foto = (it.foto || []).slice();
      $("#fm").innerHTML = '<div class="card"><h3>' + (it.id ? "Ubah" : "Tambah") + " · " + esc(T.nama) + '</h3><div class="fr">' + T.f.map(function (f) {
        var v = it[f[0]] != null ? it[f[0]] : (f[2] === "date" && f[0] === "tanggal" && !it.id ? hariIni() : ""), w = f[2] === "area" ? " lebar" : "";
        return '<div class="' + w.trim() + '"><label>' + esc(f[1]) + (f[3] ? " *" : "") + "</label>" + (f[2] === "area" ? '<textarea class="t" data-k="' + f[0] + '">' + esc(v) + "</textarea>" : f[2] === "sel" ? '<select class="t" data-k="' + f[0] + '">' + f[4].map(function (o) { return "<option" + (o === v ? " selected" : "") + ">" + o + "</option>"; }).join("") + "</select>" : '<input class="t" data-k="' + f[0] + '" type="' + f[2] + '" value="' + esc(v) + '">') + "</div>";
      }).join("") + "</div>" +
        (T.pen ? '<div class="fr"><div><label>Penanda angka/klaim</label><select class="t" id="pn">' + ["Diisi manual", "Perkiraan", "Terukur otomatis"].map(function (o) { return "<option" + (o === (it.penanda || "Diisi manual") ? " selected" : "") + ">" + o + "</option>"; }).join("") + "</select></div></div>" : "") +
        (T.foto ? '<label style="font-size:12px;color:var(--abu)">Foto (dikompres otomatis, disimpan pribadi di Drive)</label><div class="fotos" id="fw"></div><input type="file" id="fi" accept="image/*" multiple>' : "") +
        '<label class="tog" style="border:0"><input type="checkbox" id="tp"' + (it.tampil === false ? "" : " checked") + '><span>Tampilkan di presentasi dan tautan <span class="note">(hilangkan centang untuk draf)</span></span></label><div style="display:flex;gap:8px;margin-top:8px"><button id="sv">Simpan</button>' + (it.id ? '<button class="gh" id="bt">Batal</button>' : "") + "</div></div>";
      if (T.foto) { gambarFoto(foto, $("#fw")); $("#fi").onchange = function () { unggahFoto(Array.prototype.slice.call($("#fi").files), foto, $("#fw")); $("#fi").value = ""; }; }
      if (it.id) $("#bt").onclick = function () { formulir(); };
      $("#sv").onclick = async function () {
        var b = {tipe: sub, id: it.id || "", foto: foto, tampil: $("#tp").checked}; Array.prototype.forEach.call($("#fm").querySelectorAll("[data-k]"), function (e) { b[e.getAttribute("data-k")] = e.value; });
        if (T.pen) b.penanda = $("#pn").value; var x = await call("perjItemSimpan", b); toast(x.msg, !x.ok); if (x.ok) vIsian();
      };
    }
    formulir();
    $("#ls").innerHTML = '<div class="card"><h3>Daftar · ' + esc(T.nama) + " (" + list.length + ')</h3><div class="tw"><table><tr><th>Tanggal</th><th>Judul</th><th>Isi</th><th>Foto</th><th>Tampil</th><th></th></tr>' + list.map(function (x) {
      return "<tr><td>" + esc(x.tanggal) + "</td><td><b>" + esc(x.judul) + "</b>" + (x.gudang ? " <span class='bd l'>" + esc(x.gudang) + "</span>" : "") + "</td><td class='note'>" + esc([x.isi1, x.isi2, x.isi3].filter(Boolean).join(" · ").slice(0, 140)) + "</td><td>" + x.foto.length + "</td><td>" + (x.tampil ? "<span class='bd d'>ya</span>" : "<span class='bd l'>draf</span>") + "</td><td style='white-space:nowrap'><button class='sm gh' data-u='" + esc(x.id) + "'>Ubah</button> <button class='sm bad' data-h='" + esc(x.id) + "'>Hapus</button></td></tr>";
    }).join("") + "</table></div></div>";
    Array.prototype.forEach.call($("#ls").querySelectorAll("[data-u]"), function (b) { b.onclick = function () { formulir(list.filter(function (x) { return x.id === b.getAttribute("data-u"); })[0]); window.scrollTo(0, 0); }; });
    Array.prototype.forEach.call($("#ls").querySelectorAll("[data-h]"), function (b) { b.onclick = async function () { if (!confirm("Hapus isian ini? (foto di Drive tetap tersimpan)")) return; var x = await call("perjItemHapus", {id: b.getAttribute("data-h")}); toast(x.msg, !x.ok); vIsian(); }; });
  }

  /* ---------- ukuran ---------- */
  async function vUkuran() {
    var box = $("#isi"), r = await call("perjUkurDaftar"), list = r.ok ? r.data : [], nama = {};
    list.forEach(function (u) { nama[u.ukuran] = 1; });
    function formulir(u) {
      u = u || {}; $("#fu").innerHTML = '<h3>' + (u.id ? "Ubah" : "Tambah") + ' ukuran</h3><div class="fr"><div><label>Nama ukuran *</label><input class="t" data-k="ukuran" list="dn" value="' + esc(u.ukuran || "") + '" placeholder="mis. Barang berlabel"><datalist id="dn">' + Object.keys(nama).map(function (n) { return '<option value="' + esc(n) + '">'; }).join("") + '</datalist></div><div><label>Tanggal *</label><input class="t" data-k="tanggal" type="date" value="' + esc(u.tanggal || hariIni()) + '"></div><div><label>Nilai *</label><input class="t" data-k="nilai" value="' + esc(u.nilai == null ? "" : u.nilai) + '" inputmode="decimal"></div><div><label>Satuan</label><input class="t" data-k="satuan" value="' + esc(u.satuan || "") + '" placeholder="% / menit / item"></div><div><label>Target (opsional)</label><input class="t" data-k="target" value="' + esc(u.target == null ? "" : u.target) + '" inputmode="decimal"></div>' +
        '<div><label>Arah yang baik</label><select class="t" data-k="arah"><option value="naik"' + (u.arah !== "turun" ? " selected" : "") + '>Makin besar makin baik</option><option value="turun"' + (u.arah === "turun" ? " selected" : "") + '>Makin kecil makin baik</option></select></div><div><label>Penanda</label><select class="t" data-k="penanda">' + ["Diisi manual", "Perkiraan", "Terukur otomatis"].map(function (o) { return "<option" + (o === (u.penanda || "Diisi manual") ? " selected" : "") + ">" + o + "</option>"; }).join("") + '</select></div><div class="lebar"><label>Catatan cara mengukur</label><input class="t" data-k="catatan" value="' + esc(u.catatan || "") + '"></div></div><label class="tog" style="border:0"><input type="checkbox" id="ut"' + (u.tampil === false ? "" : " checked") + '><span>Tampilkan di presentasi dan tautan</span></label><div style="display:flex;gap:8px;margin-top:8px"><button id="us">Simpan</button>' + (u.id ? '<button class="gh" id="ub">Batal</button>' : "") + "</div>";
      if (u.id) $("#ub").onclick = function () { formulir(); };
      $("#us").onclick = async function () { var b = {id: u.id || "", tampil: $("#ut").checked}; Array.prototype.forEach.call($("#fu").querySelectorAll("[data-k]"), function (e) { b[e.getAttribute("data-k")] = e.value; }); var x = await call("perjUkurSimpan", b); toast(x.msg, !x.ok); if (x.ok) vUkuran(); };
    }
    box.innerHTML = '<div class="card" id="fu"></div><div class="card"><h3>Semua ukuran (' + list.length + ')</h3><div class="note">Satu baris = satu pengukuran pada satu tanggal. Grafik di dashboard dibuat dari baris dengan nama ukuran yang sama.</div><div class="tw"><table><tr><th>Ukuran</th><th>Tanggal</th><th class="n">Nilai</th><th>Target</th><th>Penanda</th><th>Tampil</th><th></th></tr>' +
      list.map(function (u) { return "<tr><td><b>" + esc(u.ukuran) + "</b></td><td>" + esc(u.tanggal) + "</td><td class='n'>" + fmt(u.nilai, 2) + " " + esc(u.satuan) + "</td><td>" + (u.target == null ? "-" : fmt(u.target, 2)) + "</td><td>" + esc(u.penanda) + "</td><td>" + (u.tampil ? "ya" : "draf") + "</td><td style='white-space:nowrap'><button class='sm gh' data-u='" + esc(u.id) + "'>Ubah</button> <button class='sm bad' data-h='" + esc(u.id) + "'>Hapus</button></td></tr>"; }).join("") + "</table></div></div>";
    formulir();
    Array.prototype.forEach.call(box.querySelectorAll("[data-u]"), function (b) { b.onclick = function () { formulir(list.filter(function (x) { return x.id === b.getAttribute("data-u"); })[0]); window.scrollTo(0, 0); }; });
    Array.prototype.forEach.call(box.querySelectorAll("[data-h]"), function (b) { b.onclick = async function () { if (!confirm("Hapus pengukuran ini?")) return; var x = await call("perjUkurHapus", {id: b.getAttribute("data-h")}); toast(x.msg, !x.ok); vUkuran(); }; });
  }

  /* ---------- Excel ---------- */
  function muatXlsx() {
    if (g.XLSX) return Promise.resolve(g.XLSX);
    return new Promise(function (ok, no) { var s = document.createElement("script"); s.src = XLSX_URL; s.onload = function () { ok(g.XLSX); }; s.onerror = function () { no(new Error("Pembaca Excel gagal dimuat. Periksa internet.")); }; document.head.appendChild(s); });
  }
  function norm(s) { return String(s == null ? "" : s).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
  function cari(head, alias) { for (var i = 0; i < head.length; i++) { var h = norm(head[i]); for (var j = 0; j < alias.length; j++) if (h === alias[j]) return i; } return -1; }
  function sel(v) { return v == null ? "" : (v instanceof Date ? v.toISOString().slice(0, 10) : v); }
  /** Baca buku kerja opname: kembalikan {rows:[kode,nama,satuan,kategori,ket,total,hasil,selisih], temuan:[...], ringkas, masalah:[]} */
  PJ.bacaOpname = function (XL, wb) {
    var ns = wb.SheetNames, nm = ns.filter(function (n) { return /hasil.*opname|opname/i.test(n); })[0] || ns[0], res = {masalah: [], rows: [], temuan: []};
    var data = XL.utils.sheet_to_json(wb.Sheets[nm], {header: 1, raw: true, defval: ""}), head = data[0] || [];
    var c = {kode: cari(head, ["kode barang", "kode"]), nama: cari(head, ["nama barang", "nama"]), sat: cari(head, ["satuan"]), kat: cari(head, ["kategori"]), ket: cari(head, ["keterangan"]), tot: cari(head, ["total stock", "total stok", "total"]), has: cari(head, ["hasil hitung"]), sel: cari(head, ["selisih"])};
    ["kode", "nama", "ket", "tot", "has", "sel"].forEach(function (k) { if (c[k] < 0) res.masalah.push("Kolom tidak ditemukan: " + {kode: "Kode Barang", nama: "Nama Barang", ket: "Keterangan", tot: "Total Stock", has: "Hasil hitung", sel: "Selisih"}[k]); });
    if (res.masalah.length) return res;
    for (var i = 1; i < data.length; i++) { var r = data[i]; if (!String(r[c.kode]).trim() && !String(r[c.nama]).trim()) continue; res.rows.push([String(r[c.kode]).trim(), String(r[c.nama]).trim(), c.sat >= 0 ? r[c.sat] : "", c.kat >= 0 ? r[c.kat] : "", String(r[c.ket]).trim(), r[c.tot], r[c.has], r[c.sel]]); }
    var tn = ns.filter(function (n) { return /temuan/i.test(n); })[0];
    if (tn) { var td = XL.utils.sheet_to_json(wb.Sheets[tn], {header: 1, raw: true, defval: ""}), th = td[0] || [], t = {n: cari(th, ["nama barang", "nama"]), s: cari(th, ["satuan"]), l: cari(th, ["lokasi"]), j: cari(th, ["jumlah"]), k: cari(th, ["catatan"])};
      if (t.n < 0 || t.j < 0) res.masalah.push("Sheet temuan: kolom Nama barang / Jumlah tidak ditemukan (diabaikan)"); else for (var k = 1; k < td.length; k++) { var q = td[k]; if (String(q[t.n]).trim()) res.temuan.push([String(q[t.n]).trim(), t.s >= 0 ? q[t.s] : "", t.l >= 0 ? q[t.l] : "", q[t.j], t.k >= 0 ? q[t.k] : ""]); } }
    var R = {total: res.rows.length, dihitung: 0, nol: 0, belum: 0, sesuai: 0, plus: 0, minus: 0, temuan: res.temuan.length};
    res.rows.forEach(function (r) {
      var total = Number(String(r[5]).replace(",", ".")) || 0, terisi = r[6] !== "" && r[6] != null && r[7] !== "" && r[7] != null;
      if (/^sudah\s*dihitung$/i.test(r[4]) || terisi) { R.dihitung++; var s = Number(String(r[7]).replace(",", ".")); if (r[7] === "" || isNaN(s)) s = (Number(String(r[6]).replace(",", ".")) || 0) - total; if (Math.abs(s) < 0.0005) R.sesuai++; else if (s > 0) R.plus++; else R.minus++; }
      else if (total <= 0.0000001) R.nol++; else R.belum++;
    });
    res.ringkas = R; return res;
  };
  PJ.bacaHarga = function (XL, wb) {
    var data = XL.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {header: 1, raw: true, defval: ""}), head = data[0] || [], res = {rows: [], masalah: []};
    var c = {kode: cari(head, ["kode barang", "kode"]), nama: cari(head, ["nama barang", "nama"]), sat: cari(head, ["satuan"]), harga: cari(head, ["harga satuan", "harga"]), tgl: cari(head, ["tanggal harga", "tanggal"]), sum: cari(head, ["sumber"])};
    if (c.kode < 0) res.masalah.push("Kolom Kode Barang tidak ditemukan"); if (c.harga < 0) res.masalah.push("Kolom Harga Satuan tidak ditemukan"); if (res.masalah.length) return res;
    for (var i = 1; i < data.length; i++) { var r = data[i]; if (!String(r[c.kode]).trim()) continue; res.rows.push([String(r[c.kode]).trim(), c.nama >= 0 ? r[c.nama] : "", c.sat >= 0 ? r[c.sat] : "", r[c.harga], c.tgl >= 0 ? sel(r[c.tgl]) : "", c.sum >= 0 ? r[c.sum] : ""]); }
    return res;
  };
  async function bacaBerkas(file) { var XL = await muatXlsx(), buf = await file.arrayBuffer(); return {XL: XL, wb: XL.read(new Uint8Array(buf), {type: "array", cellDates: true})}; }

  /* ---------- opname bulanan ---------- */
  async function vOpname() {
    var box = $("#isi"); box.innerHTML = '<div class="card note">Memuat...</div>';
    var r = await call("perjOpDaftar"); if (!r.ok) { box.innerHTML = '<div class="card err">' + esc(r.msg) + "</div>"; return; }
    var bl = r.bulan;
    box.innerHTML = '<div class="card"><h3>1. Unggah Excel opname</h3><div class="note">Pakai berkas yang sama bentuknya dengan laporan ke Accounting (sheet "Hasil Stock Opname" dan "Barang temuan"). Setiap unggahan disimpan per tanggal laporan dan tidak menimpa bulan lain. Mengunggah ulang tanggal yang sama menggantikan data tanggal itu saja.</div><div class="fr"><div><label>Berkas Excel (.xlsx)</label><input type="file" id="of" accept=".xlsx,.xls"></div><div><label>Tanggal laporan *</label><input class="t" id="ot" type="date" value="' + hariIni() + '"></div><div><label>Label</label><input class="t" id="ol" placeholder="mis. Akhir November"></div></div><div id="op"></div></div>' +
      '<div class="card"><h3>2. Ringkasan per tanggal</h3>' + (bl.length ? '<div class="tw"><table><tr><th>Tanggal</th><th>Label</th><th class="n">Item</th><th class="n">Dihitung</th><th class="n">Stok nol</th><th class="n">Belum beres</th><th class="n">Sesuai</th><th class="n">Lebih</th><th class="n">Kurang</th><th class="n">Temuan</th><th class="n">Progres</th><th class="n">Nilai kurang</th></tr>' + bl.map(function (b) { return "<tr><td><b>" + esc(b.periode) + "</b></td><td>" + esc(b.label) + "</td><td class='n'>" + fmt(b.total, 0) + "</td><td class='n'>" + fmt(b.dihitung, 0) + "</td><td class='n'>" + fmt(b.stokNol, 0) + "</td><td class='n'>" + fmt(b.belumBeres, 0) + "</td><td class='n'>" + fmt(b.sesuai, 0) + "</td><td class='n'>" + fmt(b.plus, 0) + "</td><td class='n'>" + fmt(b.minus, 0) + "</td><td class='n'>" + fmt(b.temuan, 0) + "</td><td class='n'><b>" + fmt(b.total ? (b.dihitung + b.stokNol) / b.total * 100 : 0) + "%</b></td><td class='n'>" + (b.adaHarga ? "Rp " + fmt(b.nilaiMinus, 0) : "-") + "</td></tr>"; }).join("") + "</table></div>" : '<div class="note">Belum ada unggahan.</div>') +
      (r.janggal.length ? '<div class="kotak"><b>' + r.janggal.length + " baris perlu dicek ulang</b> (hasil hitung − stok tidak sama dengan selisih): " + r.janggal.slice(0, 8).map(function (j) { return esc(j.nama); }).join("; ") + "</div>" : (bl.length ? '<div class="note ok">Semua baris pada unggahan terbaru konsisten (hasil − stok = selisih).</div>' : "")) + '</div>' +
      '<div class="card"><h3>3. Rekomendasi saya dan keputusan manajemen</h3><div class="kotak"><b>Aturan:</b> bagian "Rekomendasi saya" adalah USULAN Anda. Bagian "Keputusan manajemen" hanya diisi bila manajemen sudah memutuskan (nama pemutus wajib). Status "dilaksanakan" hanya bisa dicatat setelah keputusan Diterima atau Alternatif lain.</div><div id="kb"></div></div>';
    $("#of").onchange = async function () {
      var f = $("#of").files[0]; if (!f) return; $("#op").innerHTML = '<div class="note">Membaca berkas...</div>';
      try { var x = await bacaBerkas(f), o = PJ.bacaOpname(x.XL, x.wb); if (o.masalah.length && !o.rows.length) { $("#op").innerHTML = '<div class="kotak err">' + o.masalah.map(esc).join("<br>") + "</div>"; return; }
        var R = o.ringkas; $("#op").innerHTML = '<div class="card" style="background:var(--pucat)"><b>Pratinjau hitungan (dari berkas):</b><br>' + fmt(R.total, 0) + " item · dihitung " + fmt(R.dihitung, 0) + " · stok nol " + fmt(R.nol, 0) + " · belum beres " + fmt(R.belum, 0) + " · sesuai " + fmt(R.sesuai, 0) + " · lebih " + fmt(R.plus, 0) + " · kurang " + fmt(R.minus, 0) + " · temuan " + fmt(R.temuan, 0) + "<br><b>Progres: " + fmt((R.dihitung + R.nol) / R.total * 100) + "%</b>" + (o.masalah.length ? '<br><span class="err">' + o.masalah.map(esc).join("<br>") + "</span>" : "") + '</div><div class="bar" id="ob" style="display:none"><i></i></div><button id="osv">Simpan ke sistem</button> <span class="note" id="ost"></span>';
        $("#osv").onclick = function () { simpanOpname(o, f.name); };
      } catch (e) { $("#op").innerHTML = '<div class="kotak err">' + esc(e.message) + "</div>"; }
    };
    kasusView();
  }
  async function simpanOpname(o, nama) {
    var per = $("#ot").value, btn = $("#osv"), bar = $("#ob"), st = $("#ost"); if (!/^\d{4}-\d{2}-\d{2}$/.test(per)) { toast("Isi tanggal laporan.", true); return; }
    if (!confirm("Simpan opname tanggal " + per + "? Data tanggal yang sama akan diganti.")) return;
    btn.disabled = true; bar.style.display = "block"; var tot = o.rows.length + o.temuan.length, jalan = 0;
    function maju(n) { jalan += n; $("i", bar).style.width = Math.round(jalan / tot * 100) + "%"; st.textContent = jalan + " / " + tot; }
    var x = await call("perjOpMulai", {periode: per, label: $("#ol").value, berkas: nama}); if (!x.ok) { toast(x.msg, true); btn.disabled = false; return; }
    for (var i = 0; i < o.rows.length; i += 700) { var y = await call("perjOpItem", {periode: per, rows: o.rows.slice(i, i + 700)}); if (!y.ok) { toast(y.msg, true); btn.disabled = false; return; } maju(Math.min(700, o.rows.length - i)); }
    for (var j = 0; j < o.temuan.length; j += 700) { var z = await call("perjOpItem", {periode: per, temuan: true, rows: o.temuan.slice(j, j + 700)}); if (!z.ok) { toast(z.msg, true); btn.disabled = false; return; } maju(Math.min(700, o.temuan.length - j)); }
    var s = await call("perjOpSelesai", {periode: per}); toast(s.msg, !s.ok); btn.disabled = false; if (s.ok) vOpname();
  }
  /* pelacak */
  var KS = {sel: {}, f: {jenis: "", rekom: "", keputusan: "", q: ""}, dari: 0};
  async function kasusView() {
    var kb = $("#kb"); kb.innerHTML = '<div class="note">Memuat...</div>';
    var r = await call("perjKasusDaftar", Object.assign({dari: KS.dari, n: 200}, KS.f)); if (!r.ok) { kb.innerHTML = '<div class="err">' + esc(r.msg) + "</div>"; return; }
    var h = r.hitung, jml = Object.keys(KS.sel).length;
    function opt(a, cur, ph) { return '<option value="">' + ph + "</option>" + a.map(function (o) { return "<option" + (o === cur ? " selected" : "") + ">" + esc(o) + "</option>"; }).join(""); }
    kb.innerHTML = '<div>' + ["Selisih", "Belum beres", "Temuan"].map(function (j) { return '<span class="pill">' + j + ": <b>" + fmt(h.jenis[j] || 0, 0) + "</b></span>"; }).join("") + '<span class="pill">Menunggu keputusan: <b>' + fmt(h.keputusan["(menunggu keputusan)"] || 0, 0) + '</b></span><span class="pill">Dilaksanakan: <b>' + fmt(Object.keys(h.pelaksanaan).reduce(function (a, k) { return a + h.pelaksanaan[k]; }, 0), 0) + "</b></span></div>" +
      '<div class="fr"><div><label>Jenis</label><select class="t" id="kj">' + opt(["Selisih", "Belum beres", "Temuan"], KS.f.jenis, "Semua") + '</select></div><div><label>Rekomendasi saya</label><select class="t" id="kr">' + opt(["(belum ada)", "Disesuaikan di Accurate", "Ditelusuri lanjut", "Dijelaskan tanpa penyesuaian", "Dihapus buku"], KS.f.rekom, "Semua") + '</select></div><div><label>Keputusan manajemen</label><select class="t" id="kk">' + opt(["(menunggu keputusan)", "Diterima", "Ditunda", "Ditolak", "Alternatif lain"], KS.f.keputusan, "Semua") + '</select></div><div><label>Cari kode / nama</label><input class="t" id="kq" value="' + esc(KS.f.q) + '"></div></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px"><button class="gh sm" id="kc">Terapkan filter</button><button class="gh sm" id="kp">Pilih halaman ini</button><button class="gh sm" id="ks">Pilih SEMUA yang cocok (' + fmt(r.cocok, 0) + ')</button><button class="gh sm" id="kx">Kosongkan pilihan</button><b id="kn">' + fmt(jml, 0) + " dipilih</b></div>" +
      '<div class="tw"><table><tr><th></th><th>Barang</th><th>Jenis</th><th class="n">Awal</th><th>Terakhir</th><th>Rekomendasi saya</th><th>Keputusan manajemen</th><th>Pelaksanaan</th></tr>' + r.data.map(function (k) {
        return '<tr><td><input type="checkbox" data-k="' + esc(k.kunci) + '"' + (KS.sel[k.kunci] ? " checked" : "") + "></td><td><b>" + esc(k.nama) + '</b><div class="note">' + esc(k.kode) + "</div></td><td>" + esc(k.jenis) + "</td><td class='n'>" + fmt(k.awal, 2) + "</td><td class='note'>" + esc(k.terakhir) + " <br>" + esc(k.periodeTerakhir) + "</td><td>" + (k.rekom ? esc(k.rekom) : "<span class='note'>-</span>") + (k.alasan ? "<div class='note'>" + esc(k.alasan) + "</div>" : "") + "</td><td>" + (k.keputusan ? "<span class='bd d'>" + esc(k.keputusan) + "</span><div class='note'>" + esc(k.pemutus) + " · " + esc(k.tglKeputusan) + (k.catKeputusan ? "<br>" + esc(k.catKeputusan) : "") + "</div>" : "<span class='bd w'>menunggu</span>") + "</td><td>" + (k.pelaksanaan ? "<span class='bd d'>" + esc(k.pelaksanaan) + "</span><div class='note'>" + esc(k.tglPelaksanaan) + "</div>" : "<span class='note'>-</span>") + "</td></tr>";
      }).join("") + '</table></div><div style="display:flex;gap:8px;margin:8px 0">' + (KS.dari > 0 ? '<button class="gh sm" id="kb1">&larr; Sebelumnya</button>' : "") + (KS.dari + 200 < r.cocok ? '<button class="gh sm" id="kb2">Berikutnya &rarr;</button>' : "") + '<span class="note">Menampilkan ' + (r.cocok ? KS.dari + 1 : 0) + "–" + Math.min(KS.dari + 200, r.cocok) + " dari " + fmt(r.cocok, 0) + " (urut selisih terbesar)</span></div>" +
      '<div class="card" style="background:var(--pucat)"><h3>Terapkan ke barang terpilih</h3><b>A. Rekomendasi saya</b><div class="fr"><div><select class="t" id="rr"><option value="">(pilih)</option><option>Disesuaikan di Accurate</option><option>Ditelusuri lanjut</option><option>Dijelaskan tanpa penyesuaian</option><option>Dihapus buku</option></select></div><div class="lebar"><input class="t" id="ra" placeholder="Alasan singkat (opsional)" maxlength="300"></div></div><button id="rs">Simpan rekomendasi</button><hr style="border:0;border-top:1px solid var(--garis);margin:12px 0">' +
      '<b>B. Keputusan manajemen</b> <span class="note">(isi hanya setelah manajemen memutuskan)</span><div class="fr"><div><select class="t" id="kk2"><option value="">(pilih)</option><option>Diterima</option><option>Ditunda</option><option>Ditolak</option><option>Alternatif lain</option></select></div><div><input class="t" id="kpm" placeholder="Nama pemutus *"></div><div><input class="t" id="ktg" type="date"></div><div class="lebar"><input class="t" id="kct" placeholder="Catatan keputusan (rapat, email, dll.)" maxlength="300"></div></div><button id="ksv">Simpan keputusan</button> <button class="gh" id="kcl">Kosongkan keputusan</button><hr style="border:0;border-top:1px solid var(--garis);margin:12px 0">' +
      '<b>C. Pelaksanaan</b> <span class="note">(hanya untuk keputusan Diterima / Alternatif lain)</span><br><button id="kpl" class="gh">Tandai sudah dilaksanakan</button></div>';
    function sel2(e) { var k = e.getAttribute("data-k"); if (e.checked) KS.sel[k] = 1; else delete KS.sel[k]; $("#kn").textContent = fmt(Object.keys(KS.sel).length, 0) + " dipilih"; }
    Array.prototype.forEach.call(kb.querySelectorAll("input[data-k]"), function (e) { e.onchange = function () { sel2(e); }; });
    $("#kc").onclick = function () { KS.f = {jenis: $("#kj").value, rekom: $("#kr").value, keputusan: $("#kk").value, q: $("#kq").value}; KS.dari = 0; kasusView(); };
    $("#kp").onclick = function () { Array.prototype.forEach.call(kb.querySelectorAll("input[data-k]"), function (e) { e.checked = true; sel2(e); }); };
    $("#kx").onclick = function () { KS.sel = {}; kasusView(); };
    $("#ks").onclick = async function () { var d = 0, tot = 0; for (;;) { var x = await call("perjKasusDaftar", Object.assign({dari: d, n: 400}, KS.f)); if (!x.ok) { toast(x.msg, true); return; } x.data.forEach(function (k) { KS.sel[k.kunci] = 1; }); tot = x.cocok; d += 400; if (d >= tot) break; } kasusView(); };
    if ($("#kb1")) $("#kb1").onclick = function () { KS.dari = Math.max(0, KS.dari - 200); kasusView(); }; if ($("#kb2")) $("#kb2").onclick = function () { KS.dari += 200; kasusView(); };
    async function terapkan(set, ket) {
      var ks = Object.keys(KS.sel); if (!ks.length) { toast("Pilih barang dulu.", true); return; }
      if (!confirm(ket + " untuk " + ks.length + " barang?")) return; var ok = 0, tolak = [];
      for (var i = 0; i < ks.length; i += 500) { var x = await call("perjKasusSimpan", {kunci: ks.slice(i, i + 500), set: set}); if (!x.ok) { toast(x.msg, true); return; } ok += x.diperbarui; tolak = tolak.concat(x.ditolak || []); }
      toast(ok + " diperbarui" + (tolak.length ? ", " + tolak.length + " ditolak: " + tolak.slice(0, 2).join("; ") : ""), tolak.length > 0 && !ok); kasusView();
    }
    $("#rs").onclick = function () { if (!$("#rr").value) { toast("Pilih rekomendasi.", true); return; } terapkan({Rekomendasi: $("#rr").value, AlasanRek: $("#ra").value}, "Simpan rekomendasi"); };
    $("#ksv").onclick = function () { if (!$("#kk2").value) { toast("Pilih keputusan.", true); return; } if (!$("#kpm").value.trim()) { toast("Nama pemutus wajib diisi.", true); return; } terapkan({Keputusan: $("#kk2").value, Pemutus: $("#kpm").value, TglKeputusan: $("#ktg").value, CatKeputusan: $("#kct").value}, "Simpan keputusan manajemen"); };
    $("#kcl").onclick = function () { terapkan({Keputusan: ""}, "Kosongkan keputusan"); };
    $("#kpl").onclick = function () { terapkan({Pelaksanaan: "Sudah dilaksanakan"}, "Tandai sudah dilaksanakan"); };
  }

  /* ---------- harga ---------- */
  async function vHarga() {
    var box = $("#isi"), r = await call("perjHargaInfo");
    box.innerHTML = '<div class="card"><h3>Berkas harga</h3><div class="note">Harga dipakai untuk menghitung nilai rupiah selisih opname. Urutan: berkas harga unggahan Anda lebih dulu, bila kode tidak ada dipakai sheet Harga sistem. Barang tanpa harga tidak dihitung (tidak ditebak). Kolom yang dibaca: <b>Kode Barang, Nama Barang, Satuan, Harga Satuan, Tanggal Harga, Sumber</b>. Kode Barang harus sama persis dengan kode di Excel opname.</div>' + (r.ok ? '<p>Saat ini: <b>' + fmt(r.berkas, 0) + "</b> harga dari berkas unggahan · <b>" + fmt(r.sistem, 0) + "</b> harga di sheet Harga sistem.</p>" : "") + '<div class="fr"><div><label>Berkas Excel harga</label><input type="file" id="hf" accept=".xlsx,.xls,.csv"></div></div><div id="hp"></div></div>';
    $("#hf").onchange = async function () {
      var f = $("#hf").files[0]; if (!f) return; $("#hp").innerHTML = '<div class="note">Membaca...</div>';
      try { var x = await bacaBerkas(f), o = PJ.bacaHarga(x.XL, x.wb); if (o.masalah.length) { $("#hp").innerHTML = '<div class="kotak err">' + o.masalah.map(esc).join("<br>") + "</div>"; return; }
        $("#hp").innerHTML = '<div class="card" style="background:var(--pucat)"><b>' + fmt(o.rows.length, 0) + ' baris harga terbaca.</b><br>Contoh: ' + o.rows.slice(0, 3).map(function (q) { return esc(q[0]) + " = " + esc(q[3]); }).join("; ") + '</div><label class="tog" style="border:0"><input type="checkbox" id="hg" checked><span>Ganti seluruh berkas harga lama</span></label><div class="bar" id="hb" style="display:none"><i></i></div><button id="hs">Simpan harga</button>';
        $("#hs").onclick = async function () {
          var btn = $("#hs"); btn.disabled = true; $("#hb").style.display = "block"; var masuk = 0, lewat = 0;
          for (var i = 0; i < o.rows.length; i += 1000) { var y = await call("perjHargaImpor", {rows: o.rows.slice(i, i + 1000), ganti: i === 0 && $("#hg").checked}); if (!y.ok) { toast(y.msg, true); btn.disabled = false; return; } masuk += y.masuk; lewat += y.lewat; $("i", $("#hb")).style.width = Math.round(Math.min(i + 1000, o.rows.length) / o.rows.length * 100) + "%"; }
          toast(masuk + " harga disimpan, " + lewat + " dilewati (kode kosong / harga 0)."); vHarga();
        };
      } catch (e) { $("#hp").innerHTML = '<div class="kotak err">' + esc(e.message) + "</div>"; }
    };
  }

  (async function () { var p = bacaPin(); if (p) { PIN = p; var r = await call("adminSistem"); if (r && r.ok) { utama(); return; } PIN = ""; } loginView(); })();
})(window);
