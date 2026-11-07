/* real-berkas.js (T59) - panel "Berkas dan tanda tangan" pada realisasi UMO (tab UMO halaman Pengadaan).
   Alur: lampiran (foto/PDF, dikompres di browser) -> gabung jadi SATU PDF -> kirim ke penyetuju -> atasan departemen -> PDF final.
   Memakai: window.Kompres, window.RealisasiPdf, window.PDFLib. */
(function (W) {
  "use strict";
  var TARGET = 8 * 1048576, BATAS = 12 * 1048576;
  function b64Bytes(b) { var s = atob(b), u = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
  function bytesB64(u) { var s = "", n = 0x8000; for (var i = 0; i < u.length; i += n) s += String.fromCharCode.apply(null, u.subarray(i, i + n)); return btoa(s); }
  function unduh(bytes, nama, mime) { var l = document.createElement("a"); l.href = URL.createObjectURL(new Blob([bytes], { type: mime || "application/pdf" })); l.download = nama; document.body.appendChild(l); l.click(); setTimeout(function () { URL.revokeObjectURL(l.href); l.remove(); }, 4000); }
  function belumPpbj(p) { p = String(p || "").trim(); return !p || /^(-|menunggu|belum)/i.test(p); }

  function pasang(el, X) {
    var api = X.api, esc = X.esc, toast = X.toast, id = X.id, d = X.d, dt = X.dt, Kp = W.Kompres, preset = "seimbang", antri = [], seq = 0, sibuk = false;
    var bk = dt.berkas || d.berkas || [], tanda = dt.tanda || {}, tanda2 = dt.tanda2 || {}, ok1 = tanda.status === "Disetujui", ok2 = tanda2.status === "Disetujui", atasan = dt.atasan || d.atasan || {};
    var lamp = bk.filter(function (b) { return b.jenis === "Lampiran"; }), gab = bk.filter(function (b) { return b.jenis === "Gabungan"; })[0], fin = bk.filter(function (b) { return b.jenis === "Final"; })[0];
    function chip(st) { return '<span class="tag ' + (st === "Disetujui" ? "ok" : st === "Ditolak" ? "bad" : st === "Menunggu" ? "w" : "") + '">' + esc(st || "Belum dikirim") + "</span>"; }
    function baris(t, ps, nama) { return '<div class="fr" style="margin:4px 0"><b style="min-width:210px">' + esc(t) + ": " + esc(nama || "-") + "</b>" + chip(ps && ps.status) + (ps && ps.waktuPutus ? '<span class="note">' + esc(ps.waktuPutus) + (ps.cat ? " · " + esc(ps.cat) : "") + "</span>" : "") + "</div>"; }
    function render() {
      var kunci = ok1, ppbjKosong = belumPpbj(d.ppbj);
      var h = '<div class="card blk" style="margin-top:12px"><h3 style="margin:0 0 6px">Berkas dan tanda tangan</h3>' +
        baris("1. Penyetuju", tanda, d.penandatangan.disetujui) + baris("2. Atasan langsung departemen " + (d.dept || ""), tanda2, atasan.nama || d.penandatangan.diperiksa) +
        (atasan.ada === false ? '<div class="note err">Atasan departemen "' + esc(d.dept || "") + '" belum terdaftar lengkap (sheet AturanTTD dan Pengguna beserta emailnya). Permintaan ke atasan memakai pengaturan bawaan, atau tertahan bila tidak ada. Hubungi admin.</div>' : "") +
        (ppbjKosong ? '<div class="note err">UMO ini belum punya No PPBJ. Isi dulu No PPBJ-nya (tombol di daftar UMO) sebelum menggabungkan dan mengirim.</div>' : "") +
        '<h4 style="margin:12px 0 4px">Lampiran pendukung</h4><div class="note">Nota per catatan realisasi otomatis ikut. Tambahkan lampiran lain (PPBJ, kuitansi, foto bukti) berupa foto atau PDF, jumlahnya bebas.</div>' +
        (lamp.length ? '<div class="tw"><table><tbody>' + lamp.map(function (b) { return '<tr><td>' + esc(b.nama) + '<small>' + esc(Kp.fmt(b.ukuran)) + " · " + esc(b.oleh || "") + '</small></td><td><button class="gh" data-lb="' + esc(b.id) + '">Buka</button>' + (kunci ? "" : ' <button class="gh" data-lh="' + esc(b.id) + '">Hapus</button>') + "</td></tr>"; }).join("") + "</tbody></table></div>" : '<div class="note">Belum ada lampiran tambahan.</div>') +
        (kunci ? '<div class="note">Lampiran terkunci karena penyetuju sudah menandatangani.</div>' :
          '<div class="fr"><label class="gh" style="cursor:pointer;padding:10px 14px;border:1px solid var(--line);border-radius:8px">Pilih file<input type="file" id="rbf" multiple accept="image/*,application/pdf" style="display:none"></label><label class="gh" style="cursor:pointer;padding:10px 14px;border:1px solid var(--line);border-radius:8px">Ambil foto<input type="file" id="rbc" accept="image/*" capture="environment" style="display:none"></label>' +
          '<select id="rbp" title="Kualitas"><option value="tajam">Tajam (file lebih besar)</option><option value="seimbang" selected>Seimbang (disarankan)</option><option value="hemat">Hemat (file terkecil)</option></select></div>' +
          '<div id="rbq"></div><div class="fr"><button class="sv" id="rbs" style="display:none">Simpan lampiran</button><span class="note" id="rbi"></span></div>') +
        '<h4 style="margin:12px 0 4px">Gabungkan jadi satu PDF</h4><div class="note">Isi: Form Pengajuan Uang Muka, Form Realisasi, Laporan Kas Kecil, semua nota, lalu lampiran. Digabung di perangkat ini, targetnya sekitar 8 MB.</div>' +
        '<div class="fr"><button class="sv" id="rbg"' + (ppbjKosong || ok1 ? " disabled" : "") + ">" + (gab ? "Gabungkan ulang" : "Gabungkan PDF") + "</button>" +
        (gab ? '<button class="gh" id="rbo">Buka gabungan v' + gab.versi + " (" + esc(Kp.fmt(gab.ukuran)) + ")</button>" : "") + '<span class="note" id="rbgi"></span></div>' +
        '<h4 style="margin:12px 0 4px">Kirim untuk tanda tangan</h4>' +
        '<div class="fr">' + (ok1 ? "" : '<button class="sv" id="rbk"' + (!gab || ppbjKosong ? " disabled" : "") + ">" + (tanda.status === "Menunggu" ? "Kirim ulang ke " : "Kirim ke ") + esc(d.penandatangan.disetujui) + "</button>") +
        (ok1 && !ok2 ? '<button class="sv" id="rbk2">' + (tanda2.status === "Menunggu" ? "Kirim ulang ke atasan departemen" : "Kirim ke atasan departemen") + "</button>" : "") + '<span class="note" id="rbki"></span></div>' +
        (tanda.status === "Ditolak" ? '<div class="note err">Ditolak: ' + esc(tanda.cat || "") + ". Perbaiki catatan atau lampiran, gabungkan ulang, lalu kirim lagi.</div>" : "") +
        (ok1 && tanda2.status === "Ditolak" ? '<div class="note err">Ditolak atasan departemen: ' + esc(tanda2.cat || "") + ". Minta admin membuka kembali realisasi ini untuk diperbaiki.</div>" : "") +
        (ok1 && !ok2 ? '<div class="note">Setelah penyetuju menyetujui, tautan otomatis dikirim ke atasan departemen.</div>' : "") +
        (ok1 && ok2 ? '<h4 style="margin:12px 0 4px">PDF final</h4><div class="note">Kedua tanda tangan sudah lengkap. Buat PDF final yang memuat semua tanda tangan.</div><div class="fr"><button class="sv" id="rbf2">' + (fin ? "Buat ulang PDF final" : "Buat PDF final") + "</button>" + (fin ? '<button class="gh" id="rbfo">Buka PDF final (' + esc(Kp.fmt(fin.ukuran)) + ")</button>" : "") + '<span class="note" id="rbfi"></span></div>' : "") + "</div>";
      el.innerHTML = h; ikat();
    }
    function status(id2, t, err) { var e = document.getElementById(id2); if (e) { e.textContent = t || ""; e.className = "note" + (err ? " err" : ""); } }
    async function ambil(fid) { var r = await api({ action: "rlBerkasGet", id: id, fid: fid }); if (!r.ok) throw new Error(r.msg || "Berkas tidak terbaca."); return { bytes: b64Bytes(r.data), nama: r.nama, mime: r.mime }; }
    async function segarkan() { var a = await api({ action: "rlDetail", id: id }), b = await api({ action: "rlLaporan", id: id }); if (a.ok && b.ok) { dt = Object.assign({}, a, { meta: a.meta }); d = b.data; bk = a.berkas || b.data.berkas || []; tanda = a.tanda || {}; tanda2 = a.tanda2 || {}; ok1 = tanda.status === "Disetujui"; ok2 = tanda2.status === "Disetujui"; atasan = a.atasan || {}; lamp = bk.filter(function (x) { return x.jenis === "Lampiran"; }); gab = bk.filter(function (x) { return x.jenis === "Gabungan"; })[0]; fin = bk.filter(function (x) { return x.jenis === "Final"; })[0]; } render(); }
    /* ---- olah file ---- */
    function urlOf(b) { return URL.createObjectURL(b); }
    async function olah(it) {
      var tok = ++it.tok; it.proses = true; tampilAntri();
      try {
        if (it.tipe === "img") { var h = await Kp.gambar(it.file, { preset: preset, rot: it.rot, bw: it.bw }); if (tok !== it.tok) return; it.hasil = h; if (it.urlHasil) URL.revokeObjectURL(it.urlHasil); it.urlHasil = urlOf(h.blob); }
        else { var p = await Kp.pdf(it.file, { preset: preset, raster: it.raster, bw: it.bw }); if (tok !== it.tok) return; it.hasil = p; }
        it.err = "";
      } catch (e) { it.err = e.message || "Gagal diproses."; it.hasil = null; }
      it.proses = false; tampilAntri();
    }
    function tambahFile(files) {
      Array.prototype.forEach.call(files, function (f) {
        var pdf = f.type === "application/pdf" || /\.pdf$/i.test(f.name), img = /^image\//.test(f.type);
        if (!pdf && !img) { toast("\"" + f.name + "\" bukan foto atau PDF.", true); return; }
        var it = { n: ++seq, file: f, tipe: pdf ? "pdf" : "img", rot: 0, bw: false, raster: false, lihat: "hasil", tok: 0, scan: null, urlAsli: pdf ? "" : urlOf(f) };
        antri.push(it); olah(it);
        if (pdf && f.size > 1500000) Kp.apakahScan(f).then(function (s) { it.scan = s; tampilAntri(); });
      });
      tampilAntri();
    }
    function tampilAntri() {
      var q = document.getElementById("rbq"), sv = document.getElementById("rbs"); if (!q) return;
      q.innerHTML = antri.map(function (it) {
        var h = it.hasil, uk = h ? Kp.fmt(h.asli) + " &rarr; <b>" + Kp.fmt(h.ukuran) + "</b>" + (it.tipe === "pdf" ? (h.mode === "asli" ? " (isi tidak diubah)" : h.mode === "bersih" ? " (isi tidak diubah, data tambahan dibersihkan)" : " (halaman dirender ulang)") : "") : (it.proses ? "Memproses..." : "");
        return '<div class="card" style="margin:6px 0;padding:8px"><div class="fr" style="margin:0;align-items:flex-start">' +
          (it.tipe === "img" ? '<img src="' + (it.lihat === "asli" ? it.urlAsli : (it.urlHasil || it.urlAsli)) + '" alt="" style="width:90px;height:90px;object-fit:cover;border-radius:6px;border:1px solid var(--line)">' : '<div style="width:90px;height:90px;border:1px solid var(--line);border-radius:6px;display:flex;align-items:center;justify-content:center;font-weight:700">PDF</div>') +
          '<div style="flex:1;min-width:180px"><b>' + esc(it.file.name) + "</b><div class=\"note\">" + uk + "</div>" + (it.err ? '<div class="note err">' + esc(it.err) + "</div>" : "") +
          '<div class="fr" style="margin:4px 0 0">' + (it.tipe === "img" ? '<button class="gh" data-r="' + it.n + '">Putar</button><button class="gh" data-v="' + it.n + '">Lihat ' + (it.lihat === "asli" ? "hasil" : "asli") + '</button><label class="note"><input type="checkbox" data-b="' + it.n + '"' + (it.bw ? " checked" : "") + "> Mode dokumen (hitam putih)</label>" : (it.scan ? '<label class="note"><input type="checkbox" data-s="' + it.n + '"' + (it.raster ? " checked" : "") + "> Kecilkan PDF hasil scan (halaman diubah jadi gambar)</label>" : "")) +
          '<button class="gh" data-x="' + it.n + '">Buang</button></div></div></div></div>';
      }).join("");
      if (sv) { sv.style.display = antri.length ? "" : "none"; sv.textContent = "Simpan " + antri.length + " lampiran"; sv.disabled = antri.some(function (i) { return i.proses || !i.hasil; }); }
      Array.prototype.forEach.call(q.querySelectorAll("button[data-r]"), function (b) { b.onclick = function () { var it = antri.filter(function (z) { return z.n === Number(b.getAttribute("data-r")); })[0]; it.rot = (it.rot + 90) % 360; olah(it); }; });
      Array.prototype.forEach.call(q.querySelectorAll("button[data-v]"), function (b) { b.onclick = function () { var it = antri.filter(function (z) { return z.n === Number(b.getAttribute("data-v")); })[0]; it.lihat = it.lihat === "asli" ? "hasil" : "asli"; tampilAntri(); }; });
      Array.prototype.forEach.call(q.querySelectorAll("input[data-b]"), function (b) { b.onchange = function () { var it = antri.filter(function (z) { return z.n === Number(b.getAttribute("data-b")); })[0]; it.bw = b.checked; olah(it); }; });
      Array.prototype.forEach.call(q.querySelectorAll("input[data-s]"), function (b) { b.onchange = function () { var it = antri.filter(function (z) { return z.n === Number(b.getAttribute("data-s")); })[0]; it.raster = b.checked; olah(it); }; });
      Array.prototype.forEach.call(q.querySelectorAll("button[data-x]"), function (b) { b.onclick = function () { antri = antri.filter(function (z) { return z.n !== Number(b.getAttribute("data-x")); }); tampilAntri(); }; });
    }
    async function simpanLampiran() {
      var sv = document.getElementById("rbs"); sv.disabled = true; var n = 0;
      try {
        for (var i = 0; i < antri.length; i++) {
          var it = antri[i], h = it.hasil, nama = it.file.name.replace(/\.[^.]+$/, "") + (it.tipe === "img" ? ".jpg" : ".pdf");
          status("rbi", "Mengunggah " + (i + 1) + " dari " + antri.length + "...");
          var r = await api({ action: "rlLampirSimpan", id: id, files: [{ nama: nama, mime: it.tipe === "img" ? "image/jpeg" : "application/pdf", data: bytesB64(h.bytes) }] });
          if (!r.ok) { status("rbi", (r.msg || "Gagal menyimpan.") + (n ? " " + n + " file sebelumnya sudah tersimpan." : ""), true); antri = antri.slice(i); tampilAntri(); await segarkan(); return; }
          n++;
        }
        antri = []; toast(n + " lampiran tersimpan."); await segarkan();
      } catch (e) { status("rbi", e.message || "Gagal terhubung ke server.", true); sv.disabled = false; }
    }
    /* ---- gabung ---- */
    async function kumpul() {
      var nota = [], lam = [], ents = (dt.entries || []).filter(function (e) { return e.jenis === "Realisasi" && e.status === "Aktif"; });
      for (var i = 0; i < ents.length; i++) for (var j = 0; j < (ents[i].nota || []).length; j++) {
        var f = ents[i].nota[j], r = await api({ action: "rlNota", rid: ents[i].id, fileId: f.id }); if (!r.ok) throw new Error(r.msg || "Nota tidak terbaca.");
        nota.push({ judul: "Nota " + (nota.length + 1) + ": " + ents[i].uraian + " (" + String(ents[i].tgl).slice(0, 10).split("-").reverse().join("/") + ", " + X.rp(ents[i].nilai) + ")", nama: r.nama, mime: r.mime, bytes: b64Bytes(r.data) });
      }
      var ls = bk.filter(function (b) { return b.jenis === "Lampiran"; });
      for (var k = 0; k < ls.length; k++) { var g = await ambil(ls[k].id); lam.push({ judul: "Lampiran " + (k + 1) + ": " + ls[k].nama, nama: ls[k].nama, mime: g.mime, bytes: g.bytes }); }
      return { nota: nota, lampiran: lam };
    }
    async function bangun(info, dd) {
      var bytes = await W.RealisasiPdf.gabung({ d: dd, nota: info.nota, lampiran: info.lampiran, preset: "seimbang", onProgress: function (a, b) { info.prog && info.prog(a, b); } });
      if (bytes.length > TARGET) { info.prog && info.prog(0, 0, "Ukuran " + Kp.fmt(bytes.length) + ", memperkecil foto..."); bytes = await W.RealisasiPdf.gabung({ d: dd, nota: info.nota, lampiran: info.lampiran, preset: "hemat", paksaKompres: true }); }
      return bytes;
    }
    async function gabungAksi(final) {
      var tombol = document.getElementById(final ? "rbf2" : "rbg"), inf = final ? "rbfi" : "rbgi"; if (sibuk) return; if (!W.PDFLib || !W.PengajuanPdf || !W.RealisasiPdf) { status(inf, "Pustaka PDF belum termuat. Periksa internet lalu muat ulang halaman.", true); return; } sibuk = true; tombol.disabled = true;
      try {
        status(inf, "Mengambil nota dan lampiran...");
        var lp = await api({ action: "rlLaporan", id: id }); if (!lp.ok) throw new Error(lp.msg || "Laporan tidak terbaca.");
        var dd = lp.data; if (!final && belumPpbj(dd.ppbj)) throw new Error("No PPBJ belum diisi.");
        var info = await kumpul(); info.prog = function (a, b, t) { status(inf, t || ("Menyusun halaman " + a + " dari " + b + "...")); };
        var bytes = await bangun(info, dd);
        if (bytes.length > BATAS) throw new Error("Hasil gabungan " + Kp.fmt(bytes.length) + ", melebihi batas 12 MB. Buang beberapa lampiran besar atau pilih kualitas Hemat, lalu coba lagi.");
        status(inf, "Menyimpan " + Kp.fmt(bytes.length) + "...");
        var r = await api({ action: "rlGabungSimpan", id: id, pdf: bytesB64(bytes), final: !!final }); if (!r.ok) throw new Error(r.msg || "Gagal menyimpan.");
        toast(r.msg || "Tersimpan."); sibuk = false; await segarkan();
      } catch (e) { status(inf, e.message || "Gagal.", true); tombol.disabled = false; sibuk = false; }
    }
    async function kirim(tahap2) {
      var b = document.getElementById(tahap2 ? "rbk2" : "rbk"); b.disabled = true;
      try { var r = await api(tahap2 ? { action: "rlMinta", id: id, tahap: 2 } : { action: "rlMinta", id: id }); status("rbki", r.msg || (r.ok ? "Terkirim." : "Gagal."), !r.ok); toast(r.msg || (r.ok ? "Terkirim." : "Gagal."), !r.ok); if (r.ok) { await segarkan(); return; } } catch (e) { status("rbki", "Gagal terhubung ke server.", true); }
      b.disabled = false;
    }
    function ikat() {
      var q = function (s) { return el.querySelector(s); };
      Array.prototype.forEach.call(el.querySelectorAll("button[data-lb]"), function (b) { b.onclick = async function () { b.disabled = true; try { var g = await ambil(b.getAttribute("data-lb")); unduh(g.bytes, g.nama, g.mime); } catch (e) { toast(e.message, true); } b.disabled = false; }; });
      Array.prototype.forEach.call(el.querySelectorAll("button[data-lh]"), function (b) { b.onclick = async function () { if (!confirm("Hapus lampiran ini?")) return; b.disabled = true; try { var r = await api({ action: "rlLampirHapus", id: id, fid: b.getAttribute("data-lh") }); toast(r.msg || (r.ok ? "Dihapus." : "Gagal."), !r.ok); if (r.ok) { await segarkan(); return; } } catch (e) { toast("Gagal terhubung ke server.", true); } b.disabled = false; }; });
      if (q("#rbf")) q("#rbf").onchange = function () { tambahFile(this.files); this.value = ""; };
      if (q("#rbc")) q("#rbc").onchange = function () { tambahFile(this.files); this.value = ""; };
      if (q("#rbp")) { q("#rbp").value = preset; q("#rbp").onchange = function () { preset = this.value; antri.forEach(olah); }; }
      if (q("#rbs")) q("#rbs").onclick = simpanLampiran;
      if (q("#rbg")) q("#rbg").onclick = function () { gabungAksi(false); };
      if (q("#rbo")) q("#rbo").onclick = async function () { this.disabled = true; try { var g = await ambil(gab.id); unduh(g.bytes, g.nama); } catch (e) { toast(e.message, true); } this.disabled = false; };
      if (q("#rbk")) q("#rbk").onclick = function () { kirim(false); };
      if (q("#rbk2")) q("#rbk2").onclick = function () { kirim(true); };
      if (q("#rbf2")) q("#rbf2").onclick = function () { gabungAksi(true); };
      if (q("#rbfo")) q("#rbfo").onclick = async function () { this.disabled = true; try { var g = await ambil(fin.id); unduh(g.bytes, g.nama); } catch (e) { toast(e.message, true); } this.disabled = false; };
      tampilAntri();
    }
    render();
  }
  W.RealBerkas = { pasang: pasang };
})(window);
