/* gabung-ui.js (T76) - tampilan kartu "Gabung jadi 1 PDF". Memakai GP (gabung-pdf.js). Semua berjalan di browser. */
(function (W) {
  "use strict";
  var D = document, GP = W.GP;
  var S = { hal: [], src: [], kual: "kecil", nomor: false, isi: false, raster: false, hasil: null, sibuk: false };
  var el = {};
  function esc(x) { return String(x == null ? "" : x).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k) || ""; localStorage.setItem(k, v); } catch (e) { /* abaikan */ } return ""; }
  function toast(m, bad) { var t = D.getElementById("toast"); if (!t) return; t.textContent = m; t.className = bad ? "bad" : ""; t.style.display = "block"; clearTimeout(toast.h); toast.h = setTimeout(function () { t.style.display = "none"; }, 5200); }
  function muatSetelan() {
    try { var o = JSON.parse(ls("gp_set") || "{}"); if (o.kual && GP.PRESET[o.kual]) S.kual = o.kual; S.nomor = !!o.nomor; S.isi = !!o.isi; S.raster = !!o.raster; } catch (e) { /* abaikan */ }
  }
  function simpanSetelan() { ls("gp_set", JSON.stringify({ kual: S.kual, nomor: S.nomor, isi: S.isi, raster: S.raster })); }

  function mount(host) {
    muatSetelan();
    host.innerHTML =
      '<div class="card" id="gp_tambah">' +
      '<b>Tambah berkas</b><div class="note" style="margin:4px 0 8px">PDF, gambar (JPG, PNG), Excel, atau CSV. Berkas diproses di perangkat ini dan tidak dikirim ke server.</div>' +
      '<div class="fr"><button id="gp_pilih" type="button">Pilih berkas</button><button id="gp_foto" type="button">Ambil foto kamera</button><button id="gp_kosong" class="gh" type="button">Kosongkan semua</button></div>' +
      '<input type="file" id="gp_f" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,.xlsx,.xls,.csv,application/pdf,image/*" hidden>' +
      '<input type="file" id="gp_c" accept="image/*" capture="environment" hidden>' +
      '<div id="gp_drop" class="drop">Tarik dan lepas berkas di sini</div><div id="gp_info" class="note"></div></div>' +
      '<div class="card" id="gp_opsi"><b>Pengaturan</b><div class="fr"><span class="fl">Ukuran hasil</span>' +
      '<select id="gp_kual"><option value="kecil">Kecil (paling hemat, masih terbaca)</option><option value="seimbang">Seimbang (jelas)</option><option value="asli">Asli (tanpa dikecilkan)</option></select></div>' +
      '<div class="fr"><label><input type="checkbox" id="gp_no"> Nomor halaman</label><label><input type="checkbox" id="gp_isi"> Halaman daftar isi di depan</label>' +
      '<label title="Mengubah halaman PDF jadi gambar agar lebih kecil. Teksnya tidak bisa diseleksi atau dicari lagi."><input type="checkbox" id="gp_ras"> Kompres PDF (halaman jadi gambar)</label></div></div>' +
      '<div class="card"><div class="fr" style="justify-content:space-between"><b id="gp_judul">Halaman (0)</b><span class="note" id="gp_total"></span></div>' +
      '<div id="gp_grid" class="grid"></div></div>' +
      '<div class="card"><div class="fr"><button id="gp_go" type="button" disabled>Gabungkan jadi 1 PDF</button><span class="note" id="gp_prog"></span></div><div id="gp_hasil"></div></div>' +
      '<div class="ov" id="gp_ov" role="dialog" aria-modal="true" hidden></div>';
    ["pilih", "foto", "kosong", "f", "c", "drop", "info", "kual", "no", "isi", "ras", "judul", "total", "grid", "go", "prog", "hasil", "ov"].forEach(function (k) { el[k] = D.getElementById("gp_" + k); });
    el.kual.value = S.kual; el.no.checked = S.nomor; el.isi.checked = S.isi; el.ras.checked = S.raster;
    el.pilih.onclick = function () { el.f.click(); }; el.foto.onclick = function () { el.c.click(); };
    el.f.onchange = function () { tambah(Array.prototype.slice.call(el.f.files)); el.f.value = ""; };
    el.c.onchange = function () { tambah(Array.prototype.slice.call(el.c.files)); el.c.value = ""; };
    el.kosong.onclick = function () { if (S.hal.length && !confirm("Kosongkan semua berkas dan halaman?")) return; S.hal = []; S.src = []; S.hasil = null; gambar(); };
    el.kual.onchange = function () { S.kual = el.kual.value; simpanSetelan(); S.hasil = null; gambarHasil(); };
    el.no.onchange = function () { S.nomor = el.no.checked; simpanSetelan(); S.hasil = null; gambarHasil(); };
    el.isi.onchange = function () { S.isi = el.isi.checked; simpanSetelan(); S.hasil = null; gambarHasil(); };
    el.ras.onchange = function () { S.raster = el.ras.checked; simpanSetelan(); S.hasil = null; gambarHasil(); };
    el.go.onclick = gabung;
    var dz = el.drop; ["dragenter", "dragover"].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add("on"); }); });
    ["dragleave", "drop"].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove("on"); }); });
    dz.addEventListener("drop", function (e) { if (e.dataTransfer && e.dataTransfer.files) tambah(Array.prototype.slice.call(e.dataTransfer.files)); });
    gambar();
  }

  async function tambah(files) {
    if (!files.length) return; var gagal = [], catatan = [], n0 = S.hal.length;
    for (var i = 0; i < files.length; i++) {
      el.info.textContent = "Membuka " + files[i].name + " (" + (i + 1) + "/" + files.length + ")...";
      try {
        var r = await GP.bukaBerkas(files[i]); S.src.push(r.src); r.halaman.forEach(function (h) { S.hal.push(h); }); if (r.catatan) catatan.push(r.catatan);
        for (var k = 0; k < r.halaman.length; k++) { try { r.halaman[k].thumb = await GP.thumb(r.halaman[k]); } catch (e) { r.halaman[k].thumb = ""; } if (k % 4 === 3) gambar(); }
      } catch (e) { gagal.push(e.message || String(e)); }
    }
    S.hasil = null; el.info.textContent = ""; gambar();
    if (gagal.length) toast("Dilewati: " + gagal.join(" | "), true);
    else if (catatan.length) toast(catatan.join(" "));
    else if (S.hal.length > n0) toast((S.hal.length - n0) + " halaman ditambahkan.");
  }
  function nomorSrc(h) { var n = 0; S.hal.forEach(function (x) { if (x.src === h.src && S.hal.indexOf(x) <= S.hal.indexOf(h)) n++; }); return n; }
  function gambar() {
    el.judul.textContent = "Halaman (" + S.hal.length + ")";
    var tot = 0; S.src.forEach(function (s) { tot += s.ukuran || 0; });
    el.total.textContent = S.src.length ? S.src.length + " berkas, ukuran asli " + GP.fmt(tot) : "";
    el.go.disabled = !S.hal.length || S.sibuk;
    if (!S.hal.length) { el.grid.innerHTML = '<div class="msg">Belum ada berkas. Pilih berkas atau ambil foto.</div>'; gambarHasil(); return; }
    el.grid.innerHTML = S.hal.map(function (h, i) {
      var tg = []; if (h.rot) tg.push("putar " + h.rot + "°"); if (h.flip) tg.push("balik"); if (h.crop) tg.push("dipotong"); if (h.bw) tg.push("dokumen"); if (h.br || h.ct) tg.push("cerah/kontras");
      return '<div class="pc" draggable="true" data-i="' + i + '"><span class="no">' + (i + 1) + '</span><div class="th">' + (h.thumb ? '<img alt="" src="' + h.thumb + '">' : '<i>...</i>') + '</div>' +
        '<div class="nm" title="' + esc(h.src.nama) + '">' + esc(h.src.nama) + '<small>' + (h.src.jenis === "img" ? "gambar" : "hal. " + (h.idx + 1) + " dari " + h.src.jml) + (tg.length ? " · " + esc(tg.join(", ")) : "") + '</small></div>' +
        '<div class="bt"><button type="button" class="gh" data-a="up" title="Geser ke depan"' + (i === 0 ? " disabled" : "") + '>&#9664;</button><button type="button" class="gh" data-a="dn" title="Geser ke belakang"' + (i === S.hal.length - 1 ? " disabled" : "") + '>&#9654;</button>' +
        '<button type="button" class="gh" data-a="rot" title="Putar 90°">&#8635;</button><button type="button" data-a="ed" title="Edit: potong, putar, perbaiki">Edit</button>' +
        '<button type="button" class="gh" data-a="dup" title="Gandakan halaman">&#10064;</button><button type="button" class="gh" data-a="del" title="Hapus halaman">&#10005;</button></div></div>';
    }).join("");
    Array.prototype.forEach.call(el.grid.querySelectorAll(".pc"), function (c) {
      var i = Number(c.getAttribute("data-i"));
      Array.prototype.forEach.call(c.querySelectorAll("button[data-a]"), function (b) { b.onclick = function () { aksi(i, b.getAttribute("data-a")); }; });
      c.addEventListener("dragstart", function (e) { try { e.dataTransfer.setData("text/plain", String(i)); e.dataTransfer.effectAllowed = "move"; } catch (x) { /* abaikan */ } c.classList.add("seret"); });
      c.addEventListener("dragend", function () { c.classList.remove("seret"); });
      c.addEventListener("dragover", function (e) { e.preventDefault(); });
      c.addEventListener("drop", function (e) { e.preventDefault(); e.stopPropagation(); var a = Number(e.dataTransfer.getData("text/plain")); if (isNaN(a) || a === i) return; var m = S.hal.splice(a, 1)[0]; S.hal.splice(i, 0, m); S.hasil = null; gambar(); });
    });
    gambarHasil();
  }
  async function perbaruiThumb(h) { try { h.thumb = await GP.thumb(h); } catch (e) { /* biarkan */ } gambar(); }
  async function aksi(i, a) {
    var h = S.hal[i]; if (!h) return; S.hasil = null;
    if (a === "up" && i > 0) { S.hal.splice(i - 1, 0, S.hal.splice(i, 1)[0]); gambar(); }
    else if (a === "dn" && i < S.hal.length - 1) { S.hal.splice(i + 1, 0, S.hal.splice(i, 1)[0]); gambar(); }
    else if (a === "del") { S.hal.splice(i, 1); S.src = S.src.filter(function (s) { return S.hal.some(function (x) { return x.src === s; }); }); gambar(); }
    else if (a === "dup") { var d = GP.salin(h); d.thumb = h.thumb; S.hal.splice(i + 1, 0, d); gambar(); }
    else if (a === "rot") { h.rot = (h.rot + 90) % 360; h.crop = GP.putarPecahan(h.crop, 90); perbaruiThumb(h); }
    else if (a === "ed") editor(h);
  }

  /* ---------- editor ---------- */
  function editor(h) {
    var d = { rot: h.rot, flip: h.flip, crop: h.crop ? { x: h.crop.x, y: h.crop.y, w: h.crop.w, h: h.crop.h } : null, bw: h.bw, br: h.br, ct: h.ct }, img = h.src.jenis === "img", cv = null, tunda = 0;
    el.ov.hidden = false;
    el.ov.innerHTML = '<div class="dlg ed"><h3>Edit halaman</h3><div class="wrapc" id="ed_w"><canvas id="ed_c"></canvas><div class="cb" id="ed_b"></div></div>' +
      '<div class="fr"><button type="button" class="gh" id="ed_l">&#8634; Kiri</button><button type="button" class="gh" id="ed_r">&#8635; Kanan</button>' + (img ? '<button type="button" class="gh" id="ed_f">&#8646; Balik</button>' : '') +
      '<button type="button" class="gh" id="ed_a">Potong otomatis</button><button type="button" class="gh" id="ed_x">Hapus potongan</button></div>' +
      (img ? '<div class="fr"><label><input type="checkbox" id="ed_bw"> Mode dokumen (hitam putih, lebih tajam)</label></div>' +
        '<div class="fr"><span class="fl">Kecerahan</span><input type="range" id="ed_br" min="-50" max="50" value="' + d.br + '"><span class="fl">Kontras</span><input type="range" id="ed_ct" min="-50" max="80" value="' + d.ct + '"></div>' : '<div class="note">Halaman PDF bisa diputar dan dipotong. Perbaikan warna hanya untuk gambar.</div>') +
      '<div class="fr" style="justify-content:flex-end"><button type="button" class="gh" id="ed_0">Kembalikan ke asli</button><button type="button" class="gh" id="ed_k">Batal</button><button type="button" id="ed_ok">Terapkan</button></div></div>';
    var cvs = D.getElementById("ed_c"), box = D.getElementById("ed_b"), wr = D.getElementById("ed_w");
    function tutup() { el.ov.hidden = true; el.ov.innerHTML = ""; }
    async function gambarEd() {
      var tmp = { src: h.src, idx: h.idx, rot: d.rot, flip: d.flip, crop: null, bw: d.bw, br: d.br, ct: d.ct };
      cv = await GP.render(tmp, Math.min(1000, Math.max(300, W.innerWidth - 60)), true); cvs.width = cv.width; cvs.height = cv.height; cvs.getContext("2d").drawImage(cv, 0, 0); tampilBox();
    }
    function tampilBox() {
      if (!d.crop) { box.style.display = "none"; return; } box.style.display = "block";
      box.style.left = d.crop.x * 100 + "%"; box.style.top = d.crop.y * 100 + "%"; box.style.width = d.crop.w * 100 + "%"; box.style.height = d.crop.h * 100 + "%";
    }
    function mulaiBox() { if (!d.crop) { d.crop = { x: .1, y: .1, w: .8, h: .8 }; tampilBox(); } }
    box.innerHTML = ["nw", "n", "ne", "e", "se", "s", "sw", "w"].map(function (p) { return '<i class="hd ' + p + '" data-p="' + p + '"></i>'; }).join("");
    var seret = null;
    function pos(e) { var r = wr.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }; }
    box.addEventListener("pointerdown", function (e) { var p = e.target.getAttribute("data-p") || "m"; seret = { p: p, a: pos(e), c: { x: d.crop.x, y: d.crop.y, w: d.crop.w, h: d.crop.h } }; try { box.setPointerCapture(e.pointerId); } catch (x) { /* abaikan */ } e.preventDefault(); });
    box.addEventListener("pointermove", function (e) {
      if (!seret) return; var q = pos(e), dx = q.x - seret.a.x, dy = q.y - seret.a.y, c = seret.c, p = seret.p, x0 = c.x, y0 = c.y, x1 = c.x + c.w, y1 = c.y + c.h, mn = .05;
      if (p === "m") { var nx = Math.min(1 - c.w, Math.max(0, c.x + dx)), ny = Math.min(1 - c.h, Math.max(0, c.y + dy)); d.crop = { x: nx, y: ny, w: c.w, h: c.h }; tampilBox(); return; }
      if (p.indexOf("w") >= 0) x0 = Math.min(x1 - mn, Math.max(0, c.x + dx)); if (p.indexOf("e") >= 0) x1 = Math.max(x0 + mn, Math.min(1, c.x + c.w + dx));
      if (p.indexOf("n") >= 0) y0 = Math.min(y1 - mn, Math.max(0, c.y + dy)); if (p.indexOf("s") >= 0) y1 = Math.max(y0 + mn, Math.min(1, c.y + c.h + dy));
      d.crop = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; tampilBox();
    });
    ["pointerup", "pointercancel"].forEach(function (ev) { box.addEventListener(ev, function () { seret = null; }); });
    D.getElementById("ed_l").onclick = function () { d.rot = (d.rot + 270) % 360; d.crop = GP.putarPecahan(d.crop, 270); gambarEd(); };
    D.getElementById("ed_r").onclick = function () { d.rot = (d.rot + 90) % 360; d.crop = GP.putarPecahan(d.crop, 90); gambarEd(); };
    if (img) {
      D.getElementById("ed_f").onclick = function () { d.flip = !d.flip; d.crop = GP.balikPecahan(d.crop); gambarEd(); };
      var bw = D.getElementById("ed_bw"); bw.checked = d.bw; bw.onchange = function () { d.bw = bw.checked; gambarEd(); };
      ["br", "ct"].forEach(function (k) { var r = D.getElementById("ed_" + k); r.oninput = function () { d[k] = Number(r.value); clearTimeout(tunda); tunda = setTimeout(gambarEd, 120); }; });
    }
    D.getElementById("ed_a").onclick = function () { var c = GP.potongOtomatis(cv); if (!c) { toast("Tepi kertas tidak terdeteksi. Atur kotak potong secara manual.", true); mulaiBox(); return; } d.crop = c; tampilBox(); };
    D.getElementById("ed_x").onclick = function () { d.crop = null; tampilBox(); };
    wr.addEventListener("dblclick", mulaiBox);
    D.getElementById("ed_0").onclick = function () { d.rot = 0; d.flip = false; d.crop = null; d.bw = false; d.br = 0; d.ct = 0; var a = D.getElementById("ed_bw"); if (a) a.checked = false; ["br", "ct"].forEach(function (k) { var r = D.getElementById("ed_" + k); if (r) r.value = 0; }); gambarEd(); };
    D.getElementById("ed_k").onclick = tutup;
    D.getElementById("ed_ok").onclick = function () { h.rot = d.rot; h.flip = d.flip; h.crop = d.crop; h.bw = d.bw; h.br = d.br; h.ct = d.ct; S.hasil = null; tutup(); perbaruiThumb(h); };
    var tb = D.createElement("div"); tb.className = "note"; tb.textContent = "Ketuk dua kali pada gambar untuk memunculkan kotak potong, lalu geser tepinya."; wr.parentNode.insertBefore(tb, wr.nextSibling);
    gambarEd();
  }

  /* ---------- gabung dan unduh ---------- */
  function namaSaran() { return ls("gp_nama") || "Gabungan berkas"; }
  async function gabung() {
    if (S.sibuk || !S.hal.length) return; S.sibuk = true; el.go.disabled = true; S.hasil = null; el.hasil.innerHTML = "";
    try {
      var r = await GP.bangun(S.hal, { kualitas: S.kual, nomor: S.nomor, daftarIsi: S.isi, rasterPdf: S.raster }, function (i, n) { el.prog.textContent = "Menggabungkan halaman " + Math.min(i + 1, n) + " dari " + n + "..."; });
      S.hasil = r; el.prog.textContent = "";
    } catch (e) { S.hasil = null; el.prog.textContent = ""; toast(e.message || "Gagal menggabungkan.", true); }
    S.sibuk = false; gambar();
  }
  function gambarHasil() {
    el.go.disabled = !S.hal.length || S.sibuk;
    var r = S.hasil; if (!r) { el.hasil.innerHTML = ""; return; }
    var asli = 0; S.src.forEach(function (s) { asli += s.ukuran || 0; });
    var gl = r.gagal.length ? '<div class="err" style="margin:8px 0">Dilewati: ' + r.gagal.map(function (g) { return esc(g.nama + " - " + g.pesan); }).join("; ") + "</div>" : "";
    el.hasil.innerHTML = '<div class="ringkas"><b>' + r.halaman + ' halaman</b> · ukuran ' + GP.fmt(r.bytes.length) + (asli ? ' (berkas asli ' + GP.fmt(asli) + ")" : "") + "</div>" + gl +
      '<div class="fr"><span class="fl">Nama berkas</span><input type="text" id="gp_nama" maxlength="100" style="flex:1;min-width:180px" value="' + esc(namaSaran()) + '"><span class="fl">.pdf</span></div>' +
      '<div class="fr"><button type="button" id="gp_unduh">Unduh PDF</button><button type="button" class="gh" id="gp_bagi" hidden>Bagikan</button></div>';
    var nm = D.getElementById("gp_nama"), blob = new Blob([r.bytes], { type: "application/pdf" });
    function nama() { var v = nm.value.trim() || "Gabungan berkas"; ls("gp_nama", v); return W.NB && W.NB.buat ? W.NB.buat("pdf", v) : v.replace(/[\\\/:*?"<>|]+/g, "-") + ".pdf"; }
    D.getElementById("gp_unduh").onclick = function () { var a = D.createElement("a"), u = URL.createObjectURL(blob); a.href = u; a.download = nama(); D.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(u); a.remove(); }, 2000); };
    try {
      var f = new File([blob], "x.pdf", { type: "application/pdf" });
      if (navigator.canShare && navigator.canShare({ files: [f] })) { var bg = D.getElementById("gp_bagi"); bg.hidden = false; bg.onclick = function () { navigator.share({ files: [new File([blob], nama(), { type: "application/pdf" })] }).catch(function () { /* dibatalkan */ }); }; }
    } catch (e) { /* tidak ada fitur bagikan */ }
  }

  W.GPUI = { mount: mount, _S: S };
})(window);
