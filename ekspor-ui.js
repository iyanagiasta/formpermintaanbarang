/* Ekspor Data Perusahaan (khusus admin). Hanya membaca dari server; paket ZIP disusun di perangkat ini. */
(function (g) {
  "use strict";
  var URL_JSZIP = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
  var BATAS_BAGIAN = 400 * 1024 * 1024, BATAS_BERKAS = 25 * 1024 * 1024, BATAS_PANGGILAN = 6 * 1024 * 1024;
  var URUT = ["transaksi", "master", "pengadaan", "arsip", "kimia", "laporan", "pengguna", "lain", "teknis"];
  var JUDUL = {transaksi: "Transaksi gudang", master: "Master dan proyek", pengadaan: "Pengadaan dan pembelian", arsip: "Arsip dan dokumen", kimia: "Bahan kimia", laporan: "Laporan", pengguna: "Pengguna dan aturan", lain: "Lain-lain", teknis: "Data teknis"};
  var SENSITIF = /^(Pengguna|KodeAkses|Admin|AturanTTD|KimiaOperator|ArsipTtd|TandaSerah)$/;
  var KET_KEL = {transaksi: "Permintaan, mutasi, serah, stok, penerimaan, opname, pengembalian", master: "Barang, proyek, rak, alokasi, kebutuhan proyek", pengadaan: "PPBJ, PO, pembelian, vendor, harga, BOQ, klaim, realisasi", arsip: "Arsip tanda tangan, berkas PO, nota, catatan", kimia: "Semua sheet Kimia*", laporan: "Laporan dan potret bulanan", pengguna: "Pengguna, aturan, pengaturan (rahasia disamarkan)", lain: "Sheet yang tidak dikenal (sheet baru ikut otomatis)", teknis: "Pengukur kecepatan, antrean email, tautan sementara"};
  var S = {};
  var E = g.EKS = {};
  E.api = function () { return Promise.reject(new Error("api belum dipasang")); };
  E.unduh = function (blob, nama) { var u = URL.createObjectURL(blob), a = document.createElement("a"); a.href = u; a.download = nama; document.body.appendChild(a); a.click(); setTimeout(function () { a.remove(); }, 1000); return u; };
  E.pustaka = function () {
    if (g.JSZip) return Promise.resolve(g.JSZip);
    return new Promise(function (ok, no) { var s = document.createElement("script"); s.src = URL_JSZIP; s.onload = function () { ok(g.JSZip); }; s.onerror = function () { no(new Error("Pustaka ZIP gagal dimuat. Periksa internet.")); }; document.head.appendChild(s); });
  };
  function esc(x) { return String(x == null ? "" : x).replace(/[&<>"]/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]; }); }
  function tidur(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function mb(n) { return n >= 1073741824 ? (n / 1073741824).toFixed(2) + " GB" : n >= 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB"; }
  function sekarang() { try { return new Date().toLocaleString("sv-SE", {timeZone: "Asia/Jakarta"}); } catch (e) { return new Date().toISOString().replace("T", " ").slice(0, 19); } }
  function tanggal() { return sekarang().slice(0, 10).replace(/-/g, ""); }
  function bersih(s, maks) { s = String(s == null ? "" : s).replace(/[\\\/:*?"<>|\u0000-\u001f]/g, "-").replace(/^\.+/, "").trim(); return (s.slice(0, maks || 120) || "_"); }
  async function panggil(b) {
    var g1 = null;
    for (var i = 0; i < 4; i++) {
      try { var r = await E.api(b); if (r && r.ok) return r; g1 = new Error((r && r.msg) || "Server menolak."); if (r && /Terlalu banyak|tidak dikenali/i.test(r.msg || "")) throw g1; }
      catch (e) { g1 = e; if (/Terlalu banyak|tidak dikenali/i.test(e.message || "")) throw e; }
      if (S.batal) throw new Error("Dibatalkan");
      await tidur(1500 * (i + 1));
    }
    throw g1;
  }
  E.panggil = panggil;
  async function sha(u8) {
    var h = await crypto.subtle.digest("SHA-256", u8), a = new Uint8Array(h), s = "";
    for (var i = 0; i < a.length; i++) s += (a[i] < 16 ? "0" : "") + a[i].toString(16);
    return s;
  }
  function dariB64(b64) { var bin = atob(b64), n = bin.length, u = new Uint8Array(n); for (var i = 0; i < n; i++) u[i] = bin.charCodeAt(i); return u; }
  function csv(rows) { return "﻿" + rows.map(function (r) { return r.map(function (v) { v = String(v == null ? "" : v); return /[",\n\r;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(","); }).join("\r\n") + "\r\n"; }
  E.csv = csv; E.bersih = bersih;

  /* ---------- 1. Rencana & pindai Drive ---------- */
  E.muatRencana = async function () { var r = await panggil({action: "ekspRencana"}); S.rencana = r; S.scan = null; return r; };
  E.pindai = async function (log) {
    var files = [], galat = [], akar = (S.rencana.akar || []).filter(function (a) { return !a.galat; });
    for (var i = 0; i < akar.length; i++) {
      var sisa = null, n0 = files.length;
      for (;;) {
        var r = await panggil({action: "ekspDriveDaftar", akar: akar[i].id, sisa: sisa || undefined});
        r.files.forEach(function (f) { f.jenis = akar[i].jenis; files.push(f); });
        (r.galat || []).forEach(function (x) { galat.push({jenis: akar[i].jenis, jalur: x.jalur, msg: x.msg}); });
        if (log) log(akar[i].jenis + ": " + (files.length - n0) + " berkas");
        if (!r.sisa || !r.sisa.length) break; sisa = r.sisa;
      }
    }
    S.scan = {files: files, galat: galat, akar: akar}; return S.scan;
  };

  /* ---------- 2. Jalankan ekspor ---------- */
  /** pilih: {kelompok:{kunci:true}, tahun:{ '2025':true } | null (semua), jenis:{nama:true} | null (semua), drive:true} */
  E.jalankan = async function (pilih, ui) {
    ui = ui || {}; var JSZip = await E.pustaka(); S.batal = false;
    var mulai = sekarang(), tgl = tanggal(), manifest = [], bagianNo = 1, zip = new JSZip(), byt = 0, dipakai = {}, hasilBagian = [];
    var ringkas = {sheet: 0, baris: 0, berkas: 0, bytesBerkas: 0, gagal: 0, dikecualikan: 0};
    var head = ["Jenis", "Kelompok", "Nama", "Lokasi dalam ZIP", "Bagian", "Baris", "Kolom", "Ukuran (byte)", "SHA-256", "Sensitif", "Disamarkan", "Status", "Catatan"];
    function man(o) { manifest.push([o.jenis, o.kelompok || "", o.nama || "", o.lokasi || "", o.bagian || "", o.baris == null ? "" : o.baris, o.kolom == null ? "" : o.kolom, o.ukuran == null ? "" : o.ukuran, o.sha || "", o.sensitif || "", o.samar || "", o.status || "ikut", o.catatan || ""]); }
    async function lepasBagian() {
      var blob = await zip.generateAsync({type: "blob", compression: "STORE"}, function (m) { if (ui.zip) ui.zip(m.percent); });
      var nama = "ekspor-sctk-" + tgl + "-bagian-" + bagianNo + ".zip", url = E.unduh(blob, nama);
      hasilBagian.push({nama: nama, blob: blob, url: url, ukuran: blob.size}); if (ui.bagian) ui.bagian(hasilBagian[hasilBagian.length - 1]);
      bagianNo++; zip = new JSZip(); byt = 0;
    }
    async function taruh(path, u8, kompres) {
      zip.file(path, u8, {binary: true, compression: kompres ? "DEFLATE" : "STORE"}); byt += u8.length;
      if (byt >= (E.batasBagian || BATAS_BAGIAN)) await lepasBagian();
    }
    function awal(t) { if (ui.status) ui.status(t); }
    var sheets = S.rencana.sheets.filter(function (s) { return s.teknis ? !!pilih.kelompok.teknis : !!pilih.kelompok[s.kelompok]; });
    var tidakIkut = S.rencana.sheets.filter(function (s) { return sheets.indexOf(s) < 0; });
    var jumlahSheet = sheets.length, sudah = 0;
    try {
      /* a. Data sheet -> satu Excel per kelompok */
      var nomor = 0;
      for (var ki = 0; ki < URUT.length; ki++) {
        var kk = URUT[ki], grup = sheets.filter(function (s) { return (s.teknis ? "teknis" : s.kelompok) === kk; });
        if (!grup.length) continue; nomor++;
        var wb = new g.EKSX.Buku(JSZip), berkasNama = ("0" + nomor).slice(-2) + "-" + bersih(JUDUL[kk]).replace(/\s+/g, "-") + ".xlsx", lokasi = "1-Data-Excel/" + berkasNama, adaIsi = false, bagianMulai = bagianNo;
        for (var si = 0; si < grup.length; si++) {
          if (S.batal) throw new Error("Dibatalkan");
          var sh = grup[si], sb = wb.sheet(sh.nama), dari = 1, total = 0, kolom = 0, samarKol = {}, samarBaris = [], terpotong = 0, gagal = "";
          awal("Membaca sheet " + sh.nama + " (" + (++sudah) + "/" + jumlahSheet + ")…");
          try {
            for (;;) {
              var r = await panggil({action: "ekspSheet", nama: sh.nama, dari: dari});
              if (r.rows.length) sb.tambah(r.rows); total += r.rows.length; kolom = Math.max(kolom, r.kolom || 0); terpotong += r.terpotong || 0;
              (r.samarKolom || []).forEach(function (c) { samarKol[c] = 1; }); (r.samarBaris || []).forEach(function (c) { if (samarBaris.indexOf(c) < 0) samarBaris.push(c); });
              if (ui.baris) ui.baris(sh.nama, total, r.total);
              if (!r.berikut) break; dari = r.berikut;
            }
          } catch (e) { if (/Dibatalkan/.test(e.message)) throw e; gagal = e.message; ringkas.gagal++; }
          var samar = Object.keys(samarKol).map(function (c) { return "kolom " + c; }).concat(samarBaris.length ? ["baris: " + samarBaris.join(" | ")] : []);
          var cat = (terpotong ? terpotong + " sel dipotong pada 32.000 karakter. " : "") + (gagal ? "GAGAL dibaca: " + gagal : "");
          man({jenis: "sheet", kelompok: JUDUL[kk], nama: sh.nama, lokasi: lokasi + " > tab " + sb.nama, bagian: "", baris: Math.max(0, total - 1), kolom: kolom, sensitif: SENSITIF.test(sh.nama) ? "data pribadi" : "", samar: samar.join("; "), status: gagal ? "gagal" : "ikut", catatan: cat});
          if (!gagal) { ringkas.sheet++; ringkas.baris += Math.max(0, total - 1); adaIsi = true; }
        }
        var u8 = await wb.hasil(), hx = await sha(u8);
        var bagianExcel = bagianNo;
        await taruh(lokasi, u8, false);
        man({jenis: "berkas-excel", kelompok: JUDUL[kk], nama: berkasNama, lokasi: lokasi, bagian: bagianExcel, ukuran: u8.length, sha: hx, sensitif: grup.some(function (s) { return SENSITIF.test(s.nama); }) ? "memuat data pribadi" : "", catatan: grup.length + " tab"});
        // perbaiki nomor bagian pada baris sheet yang baru ditambahkan
        for (var mi = manifest.length - 2; mi >= 0 && manifest[mi][0] === "sheet" && manifest[mi][3].indexOf(lokasi) === 0; mi--) manifest[mi][4] = bagianExcel;
      }
      tidakIkut.forEach(function (s) { ringkas.dikecualikan++; man({jenis: "sheet", kelompok: s.teknis ? JUDUL.teknis : JUDUL[s.kelompok], nama: s.nama, baris: Math.max(0, s.baris - 1), kolom: s.kolom, status: "dikecualikan", catatan: s.teknis ? "Data teknis (bukan data perusahaan); centang \"sertakan data teknis\" bila perlu." : "Kelompok tidak dipilih."}); });

      /* b. Berkas Drive */
      var dr = pilih.drive ? (S.scan ? S.scan : await E.pindai(function (t) { awal("Memindai Drive… " + t); })) : null, antrean = [];
      if (dr) {
        dr.files.forEach(function (f) {
          var thnOk = !pilih.tahun || pilih.tahun[f.tahun], jnsOk = !pilih.jenis || pilih.jenis[f.jenis];
          if (!thnOk || !jnsOk) { ringkas.dikecualikan++; return; }
          if (f.native) { ringkas.dikecualikan++; man({jenis: "berkas-drive", kelompok: f.jenis, nama: f.nama, lokasi: "", ukuran: "", status: "dikecualikan", catatan: "Berkas Google (Docs/Sheets), bukan berkas biasa. Tautan: https://drive.google.com/open?id=" + f.id}); return; }
          if (f.ukuran > BATAS_BERKAS) { ringkas.dikecualikan++; man({jenis: "berkas-drive", kelompok: f.jenis, nama: f.nama, ukuran: f.ukuran, status: "dilewati", catatan: "Lebih dari 25 MB (batas pengambilan). Ambil manual: https://drive.google.com/open?id=" + f.id}); return; }
          antrean.push(f);
        });
        dr.galat.forEach(function (x) { man({jenis: "berkas-drive", kelompok: x.jenis, nama: x.jalur, status: "gagal", catatan: "Folder tidak terbaca: " + x.msg}); ringkas.gagal++; });
        var totalBerkas = antrean.length, selesai = 0, byInd = {};
        antrean.forEach(function (f) { byInd[f.id] = f; });
        while (antrean.length) {
          if (S.batal) throw new Error("Dibatalkan");
          var ids = [], tot = 0;
          while (antrean.length && (ids.length === 0 || tot + antrean[0].ukuran <= BATAS_PANGGILAN) && ids.length < 150) { var f0 = antrean.shift(); ids.push(f0.id); tot += f0.ukuran; }
          awal("Mengunduh berkas Drive " + selesai + "/" + totalBerkas + "…");
          var rb;
          try { rb = await panggil({action: "ekspBerkas", ids: ids}); }
          catch (e) { if (/Dibatalkan/.test(e.message)) throw e; ids.forEach(function (id) { var f = byInd[id]; ringkas.gagal++; man({jenis: "berkas-drive", kelompok: f.jenis, nama: f.nama, ukuran: f.ukuran, status: "gagal", catatan: "Gagal diambil: " + e.message}); }); continue; }
          for (var bi = 0; bi < rb.berkas.length; bi++) {
            var it = rb.berkas[bi], f = byInd[it.id], u = dariB64(it.b64), hx2 = await sha(u);
            var seg = [bersih(f.jenis), bersih(f.tahun || "tanpa-tahun")].concat(String(f.jalur || "").split("/").filter(Boolean).map(function (x) { return bersih(x); })), pth = "2-Berkas-Drive/" + seg.join("/") + "/" + bersih(f.nama, 150);
            if (dipakai[pth.toLowerCase()]) { var dot = pth.lastIndexOf("."), tail = " (" + f.id.slice(0, 6) + ")"; pth = dot > pth.lastIndexOf("/") ? pth.slice(0, dot) + tail + pth.slice(dot) : pth + tail; }
            dipakai[pth.toLowerCase()] = 1;
            var bg0 = bagianNo; await taruh(pth, u, false); ringkas.berkas++; ringkas.bytesBerkas += u.length; selesai++;
            man({jenis: "berkas-drive", kelompok: f.jenis, nama: f.nama, lokasi: pth, bagian: bg0, ukuran: u.length, sha: hx2, sensitif: f.jenis === "Arsip Tanda Tangan" ? "gambar tanda tangan / data pribadi" : "", status: "ikut", catatan: "Dibuat " + f.dibuat + "; id Drive " + f.id});
            if (ui.berkas) ui.berkas(selesai, totalBerkas, ringkas.bytesBerkas);
          }
          (rb.lewat || []).forEach(function (x) { var f = byInd[x.id]; ringkas.gagal++; man({jenis: "berkas-drive", kelompok: f ? f.jenis : "", nama: f ? f.nama : x.id, ukuran: f ? f.ukuran : "", status: "gagal", catatan: x.alasan}); });
          (rb.sisa || []).slice().reverse().forEach(function (id) { var f = byInd[id]; if (f) antrean.unshift(f); });
        }
      }
    } catch (e) {
      if (!/Dibatalkan/.test(e.message)) throw e;
      ringkas.dibatalkan = true;
    }
    /* c. Manifest + BACA-SAYA, lalu bagian terakhir */
    var selesaiWaktu = sekarang();
    var teks = bacaSaya({mulai: mulai, selesai: selesaiWaktu, ringkas: ringkas, rencana: S.rencana, scan: S.scan, pilih: pilih});
    var mfBagian = bagianNo;
    var mfCsv = csv([head].concat(manifest));
    var enc = new TextEncoder();
    zip.file("MANIFEST.csv", enc.encode(mfCsv), {binary: true, compression: "DEFLATE"}); zip.file("BACA-SAYA.txt", enc.encode(teks), {binary: true, compression: "DEFLATE"});
    await lepasBagian();
    var rg = "sheet " + ringkas.sheet + ", baris " + ringkas.baris + ", berkas " + ringkas.berkas + " (" + mb(ringkas.bytesBerkas) + "), gagal " + ringkas.gagal + ", bagian " + hasilBagian.length + (ringkas.dibatalkan ? ", DIBATALKAN" : "");
    try { await panggil({action: "ekspSelesai", ringkas: rg}); } catch (e) { /* catatan jejak tidak boleh menggagalkan */ }
    return {bagian: hasilBagian, ringkas: ringkas, ringkasan: rg, manifest: manifest, manifestBagianTerakhir: mfBagian};
  };
  E.batal = function () { S.batal = true; };

  function bacaSaya(o) {
    var r = o.rencana, L = [];
    L.push("PAKET EKSPOR DATA PERUSAHAAN - PT SARANA CATUR TIRTA KELOLA (SCTK)");
    L.push("Dibuat: " + o.selesai + " WIB (mulai " + o.mulai + "). Spreadsheet sumber: " + (r.ss || "-") + ". Versi kode server: " + (r.versi || "-") + ".");
    if (o.ringkas.dibatalkan) L.push("PERHATIAN: ekspor ini DIBATALKAN di tengah jalan, isinya tidak lengkap.");
    L.push("", "ISI PAKET", "- 1-Data-Excel/   : isi sheet, satu berkas Excel per kelompok (tiap sheet = satu tab).", "- 2-Berkas-Drive/ : berkas dari Google Drive, dalam folder per jenis dan tahun (PDF final bertanda tangan, lampiran PO, surat jalan, nota, foto, gambar tanda tangan).", "- MANIFEST.csv    : daftar SETIAP sheet dan berkas: ukuran, SHA-256, bagian ZIP, yang sensitif, yang dikecualikan beserta alasannya, kolom yang disamarkan.", "- Paket besar dipecah menjadi beberapa ZIP (bagian-1, bagian-2, ...). MANIFEST dan berkas ini ada di bagian TERAKHIR.");
    L.push("", "RINGKASAN", "- Sheet diekspor: " + o.ringkas.sheet + " (" + o.ringkas.baris + " baris data)", "- Berkas Drive: " + o.ringkas.berkas + " (" + mb(o.ringkas.bytesBerkas) + ")", "- Gagal/dilewati: lihat kolom Status di MANIFEST.csv", "");
    L.push("YANG TIDAK PERNAH IKUT (RAHASIA)", "- PIN admin, kode akses (KodeAkses), kode operator kimia, dan kolom bertajuk Token/Rahasia/Sandi/Password: isinya diganti \"(disamarkan)\".", "- Baris Pengaturan/AturanBeli yang berkunci kode, PIN, rahasia, sandi, atau token: nilainya diganti \"(disamarkan)\".", "- Catatan: kolom lain yang kebetulan memuat token di dalam teks atau tautan TIDAK terdeteksi otomatis. Periksa sebelum paket diserahkan ke pihak luar.");
    L.push("", "DATA PRIBADI", "- Nama, email karyawan dan gambar tanda tangan ikut dan ditandai \"data pribadi\" di MANIFEST. Perlakukan paket ini sebagai dokumen rahasia perusahaan.");
    L.push("", "DIKECUALIKAN SECARA UMUM", "- Data teknis (UkurRingkas/Kecepatan/Ukuran, AntreanEmail, TautanSetuju, PengingatWA, Sheet1) kecuali dicentang \"sertakan data teknis\".", "- Berkas Google Docs/Sheets (bukan berkas biasa) dan berkas lebih dari 25 MB: tercatat di MANIFEST dengan tautan Drive.");
    L.push("", "FOLDER DRIVE YANG DIPINDAI (berkas di luar folder ini TIDAK ikut)");
    (r.akar || []).forEach(function (a) { L.push("- " + a.jenis + ": " + (a.nama || "(tidak terbaca)") + " [" + a.id + "]" + (a.galat ? " - GAGAL: " + a.galat : "")); });
    L.push("- Folder lain dapat ditambahkan di sheet Pengaturan, baris \"Folder Ekspor Tambahan\" (ID atau tautan, dipisah koma).");
    L.push("", "CARA MEMERIKSA KEUTUHAN", "- Windows (PowerShell): Get-FileHash -Algorithm SHA256 \"nama-berkas\"  lalu bandingkan dengan kolom SHA-256 di MANIFEST.csv.", "- Mac/Linux: shasum -a 256 \"nama-berkas\"");
    L.push("", "BATAS PAKET INI", "- Ini salinan (snapshot) pada waktu pembuatan. Perubahan sesudahnya tidak ikut.", "- Paket ini bukan pernyataan hak milik atas kode, sistem, atau data; hanya salinan data operasional.", "- Waktu sel tanggal ditulis sebagai teks zona Asia/Jakarta. Teks lebih dari 32.000 karakter dipotong (dicatat di MANIFEST).");
    return L.join("\r\n") + "\r\n";
  }
  E.bacaSaya = bacaSaya;

  /* ---------- 3. Tampilan ---------- */
  E.mount = function (el) {
    el.innerHTML = '<div class="card"><h3 style="margin:0 0 6px">Ekspor Data Perusahaan</h3><div class="note">Satu paket ZIP berisi data semua sheet (Excel), berkas Drive, dan daftar pemeriksa (manifest dengan SHA-256). Hanya membaca; tidak mengubah apa pun. Rahasia (PIN, kode akses, token) tidak pernah ikut. <b>Gunakan komputer</b> dan biarkan halaman ini terbuka sampai selesai.</div><div id="ex-ren" class="msg">Memuat rencana…</div></div><div id="ex-run"></div>';
    E.muatRencana().then(function () { tampilRencana(el); }).catch(function (e) { document.getElementById("ex-ren").innerHTML = '<span class="err">' + esc(e.message) + "</span>"; });
  };
  function tampilRencana(el) {
    var r = S.rencana, per = {}, h = "";
    r.sheets.forEach(function (s) { var k = s.teknis ? "teknis" : s.kelompok; per[k] = per[k] || {n: 0, b: 0}; per[k].n++; per[k].b += Math.max(0, s.baris - 1); });
    h += '<div class="fr"><label><input type="radio" name="mode" value="penuh" checked> Ekspor penuh (semua kelompok, semua tahun)</label><label><input type="radio" name="mode" value="pilih"> Pilih sendiri</label></div>';
    h += '<div id="ex-pil"><b>Data sheet</b> <span class="note">(selalu penuh, tidak difilter tahun)</span><div class="grid2">';
    URUT.forEach(function (k) { if (!per[k]) return; h += '<label class="kel"><input type="checkbox" data-kel="' + k + '"' + (k === "teknis" ? "" : " checked") + '> <span><b>' + JUDUL[k] + '</b> <small>' + per[k].n + " sheet, " + per[k].b.toLocaleString("id-ID") + " baris. " + esc(KET_KEL[k]) + "</small></span></label>"; });
    h += '</div><p class="note" style="margin:6px 0 0">Data teknis tidak dicentang secara bawaan (bukan data perusahaan).</p>';
    h += '<div style="margin-top:12px"><label><input type="checkbox" id="ex-drive" checked> <b>Sertakan berkas Drive</b></label> <button class="gh" id="ex-scan">Pindai Drive</button> <span id="ex-scantxt" class="note"></span></div><div id="ex-thn"></div></div>';
    h += '<div style="margin-top:12px"><button id="ex-go">Mulai ekspor</button> <button class="gh" id="ex-stop" style="display:none">Batalkan</button></div>';
    document.getElementById("ex-ren").outerHTML = '<div id="ex-ren">' + h + "</div>";
    var pil = document.getElementById("ex-pil");
    function kunciMode() { var penuh = el.querySelector('input[name=mode]:checked').value === "penuh"; Array.prototype.forEach.call(pil.querySelectorAll("input[data-kel]:not([data-kel=teknis]),#ex-drive,.ex-t,.ex-j"), function (i) { if (penuh) i.checked = true; i.disabled = penuh; }); }
    Array.prototype.forEach.call(el.querySelectorAll("input[name=mode]"), function (i) { i.onchange = kunciMode; }); kunciMode();
    document.getElementById("ex-scan").onclick = async function () {
      var b = this; b.disabled = true; var t = document.getElementById("ex-scantxt");
      try { var sc = await E.pindai(function (x) { t.textContent = "Memindai… " + x; }); tampilTahun(sc); t.textContent = sc.files.length + " berkas ditemukan" + (sc.galat.length ? ", " + sc.galat.length + " folder tak terbaca" : "") + "."; kunciMode(); }
      catch (e) { t.innerHTML = '<span class="err">' + esc(e.message) + "</span>"; } b.disabled = false;
    };
    document.getElementById("ex-go").onclick = function () { mulaiUI(el); };
    document.getElementById("ex-stop").onclick = function () { E.batal(); };
  }
  function tampilTahun(sc) {
    var th = {}, jn = {}; sc.files.forEach(function (f) { var t = th[f.tahun || "?"] = th[f.tahun || "?"] || {n: 0, b: 0}; t.n++; t.b += f.ukuran; var j = jn[f.jenis] = jn[f.jenis] || {n: 0, b: 0}; j.n++; j.b += f.ukuran; });
    var h = '<div class="fr"><b>Jenis berkas:</b>' + Object.keys(jn).map(function (j) { return '<label><input type="checkbox" class="ex-j" value="' + esc(j) + '" checked> ' + esc(j) + " <small>(" + jn[j].n + ", " + mb(jn[j].b) + ")</small></label>"; }).join("") + "</div>";
    h += '<div class="fr"><b>Tahun:</b>' + Object.keys(th).sort().map(function (t) { return '<label><input type="checkbox" class="ex-t" value="' + esc(t) + '" checked> ' + esc(t) + " <small>(" + th[t].n + ", " + mb(th[t].b) + ")</small></label>"; }).join("") + "</div>";
    document.getElementById("ex-thn").innerHTML = h;
  }
  E.ambilPilihan = function (el) {
    var pilih = {kelompok: {}, tahun: null, jenis: null, drive: !!el.querySelector("#ex-drive").checked};
    Array.prototype.forEach.call(el.querySelectorAll("input[data-kel]"), function (i) { pilih.kelompok[i.getAttribute("data-kel")] = i.checked; });
    var ts = el.querySelectorAll(".ex-t"), js = el.querySelectorAll(".ex-j");
    if (ts.length) { pilih.tahun = {}; Array.prototype.forEach.call(ts, function (i) { if (i.checked) pilih.tahun[i.value] = true; }); }
    if (js.length) { pilih.jenis = {}; Array.prototype.forEach.call(js, function (i) { if (i.checked) pilih.jenis[i.value] = true; }); }
    return pilih;
  };
  async function mulaiUI(el) {
    var pilih = E.ambilPilihan(el), run = document.getElementById("ex-run"), go = document.getElementById("ex-go"), stop = document.getElementById("ex-stop");
    var nSheet = S.rencana.sheets.filter(function (s) { return s.teknis ? pilih.kelompok.teknis : pilih.kelompok[s.kelompok]; }).length;
    if (!nSheet && !pilih.drive) { alert("Pilih minimal satu kelompok atau berkas Drive."); return; }
    if (S.scan && pilih.drive) {
      var tot = S.scan.files.filter(function (f) { return (!pilih.tahun || pilih.tahun[f.tahun]) && (!pilih.jenis || pilih.jenis[f.jenis]) && !f.native && f.ukuran <= BATAS_BERKAS; }).reduce(function (a, f) { return a + f.ukuran; }, 0);
      if (tot > 3 * 1073741824 && !confirm("Berkas Drive terpilih sekitar " + mb(tot) + ". Itu besar untuk satu kali jalan. Disarankan memilih satu-dua tahun per ekspor. Lanjut?")) return;
    }
    go.disabled = true; stop.style.display = ""; Array.prototype.forEach.call(el.querySelectorAll("input,button.gh"), function (i) { if (i !== stop) i.disabled = true; });
    run.innerHTML = '<div class="card"><div id="ex-st"><b>Memulai…</b></div><div class="bar"><i id="ex-bar"></i></div><div id="ex-baris" class="note"></div><div id="ex-bag" style="margin-top:8px"></div></div>';
    var st = document.getElementById("ex-st"), bar = document.getElementById("ex-bar"), br = document.getElementById("ex-baris"), bg = document.getElementById("ex-bag");
    var ui = {status: function (t) { st.innerHTML = "<b>" + esc(t) + "</b>"; }, baris: function (n, a, b) { br.textContent = n + ": " + a.toLocaleString("id-ID") + " / " + (b || 0).toLocaleString("id-ID") + " baris"; }, berkas: function (a, b, by) { bar.style.width = Math.round(a * 100 / Math.max(1, b)) + "%"; br.textContent = "Berkas " + a + " / " + b + " (" + mb(by) + ")"; },
      bagian: function (b) { bg.innerHTML += '<div class="fr"><span class="bd d">Bagian siap</span> <b>' + esc(b.nama) + "</b> " + mb(b.ukuran) + ' <a class="lnk" href="' + b.url + '" download="' + esc(b.nama) + '">Unduh lagi</a></div>'; }};
    window.onbeforeunload = function () { return "Ekspor sedang berjalan."; };
    try {
      var h = await E.jalankan(pilih, ui);
      st.innerHTML = '<b>Selesai.</b> ' + esc(h.ringkasan) + '<div class="note">Periksa kolom Status di MANIFEST.csv bila ada yang gagal. Bagian terakhir memuat MANIFEST dan BACA-SAYA. Jika peramban meminta izin unduhan ganda, pilih Izinkan.</div>'; bar.style.width = "100%";
    } catch (e) { st.innerHTML = '<span class="err">Ekspor berhenti: ' + esc(e.message) + "</span>"; }
    window.onbeforeunload = null; stop.style.display = "none"; go.disabled = false; Array.prototype.forEach.call(el.querySelectorAll("input,button.gh"), function (i) { i.disabled = false; });
  }
  E._S = S;
})(typeof window !== "undefined" ? window : globalThis);
