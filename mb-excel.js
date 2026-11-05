/* Unduh Excel Master Barang memakai template impor Accurate ASLI (template-item-accurate.xlsx).
   Hanya isi baris data (mulai baris 2) di sheet pertama yang diganti; judul, kolom, sheet lain tidak disentuh. */
(function (W) {
  "use strict";
  var JENIS = { "Persediaan": "INV", "Non Persediaan": "NON", "Jasa": "SVC", "Biaya Produksi": "PDC" };
  var BATAS = { kategori: 60, kode: 30, nama: 240, satuan: 7 };
  var JSZIP = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ""); }
  function kolom(n) { var s = ""; n++; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }

  /** Ubah satu barang jadi baris template; kembalikan {baris:[kategori,kode,nama,jenis,satuan]} atau {masalah:[...]} */
  function siapkan(x) {
    var m = [], kat = String(x.jenis || "").trim().toUpperCase(), kode = String(x.kode || "").trim(),
      nama = String(x.nama || "").replace(/\s+/g, " ").trim(), sat = String(x.satuan || "").trim(), jn = JENIS[String(x.kategori || "").trim()];
    if (!kat) m.push("Kategori Barang kosong"); else if (kat.length > BATAS.kategori) m.push("Kategori Barang lebih dari 60 karakter");
    if (!kode) m.push("Kode Barang kosong"); else if (kode.length > BATAS.kode) m.push("Kode lebih dari 30 karakter (" + kode.length + ")");
    if (!nama) m.push("Nama Barang kosong"); else if (nama.length > BATAS.nama) m.push("Nama lebih dari 240 karakter");
    if (!jn) m.push("Jenis Barang tidak dikenal (" + (x.kategori || "kosong") + ")");
    if (!sat) m.push("Satuan kosong"); else if (sat.length > BATAS.satuan) m.push("Satuan \"" + sat + "\" lebih dari 7 karakter");
    return m.length ? { masalah: m } : { baris: [kat, kode, nama, jn, sat] };
  }

  async function muatJsZip() {
    if (W.JSZip) return W.JSZip;
    await new Promise(function (ok, gagal) { var s = document.createElement("script"); s.src = JSZIP; s.onload = ok; s.onerror = function () { gagal(new Error("JSZip gagal dimuat")); }; document.head.appendChild(s); });
    return W.JSZip;
  }

  /** Buat file xlsx dari template. data = [[kat,kode,nama,jenis,satuan],...] -> Blob */
  async function bangun(data, tplBuf) {
    var Z = await muatJsZip(), zip = await Z.loadAsync(tplBuf);
    var f1 = zip.file("xl/worksheets/sheet1.xml"), fs = zip.file("xl/sharedStrings.xml");
    if (!f1 || !fs) throw new Error("Template tidak dikenali.");
    var s1 = await f1.async("string"), ss = await fs.async("string");
    var i = s1.indexOf("<sheetData>"), j = s1.indexOf("</sheetData>"); if (i < 0 || j < 0) throw new Error("Template tidak dikenali.");
    var rows = s1.slice(i + 11, j), k1 = rows.indexOf("</row>"); if (k1 < 0) throw new Error("Template tidak dikenali.");
    var baris1 = rows.slice(0, k1 + 6);
    var m = /<sst[^>]*\bcount="(\d+)"[^>]*\buniqueCount="(\d+)"/.exec(ss); if (!m) throw new Error("Template tidak dikenali.");
    var uniq = +m[2], cnt = +m[1], baru = "", idx = {};
    function si(t) { if (idx[t] == null) { idx[t] = uniq++; baru += '<si><t xml:space="preserve">' + esc(t) + "</t></si>"; } cnt++; return idx[t]; }
    var gaya = [25, 26, 26, 27, 27], pos = [0, 1, 2, 3, 6], out = "";
    data.forEach(function (d, n) {
      var r = n + 2, c = "";
      for (var k = 0; k < 88; k++) {
        var p = pos.indexOf(k), ref = kolom(k) + r;
        if (p >= 0) c += '<c r="' + ref + '" s="' + gaya[p] + '" t="s"><v>' + si(d[p]) + "</v></c>";
        else c += '<c r="' + ref + '" s="' + (k === 7 ? 28 : 27) + '"/>';
      }
      out += '<row r="' + r + '" spans="1:88">' + c + "</row>";
    });
    s1 = s1.slice(0, i + 11) + baris1 + out + s1.slice(j);
    s1 = s1.replace(/<dimension ref="[^"]*"\/>/, '<dimension ref="A1:CJ' + (data.length + 1) + '"/>');
    ss = ss.replace(/count="\d+"/, 'count="' + cnt + '"').replace(/uniqueCount="\d+"/, 'uniqueCount="' + uniq + '"').replace("</sst>", baru + "</sst>");
    zip.file("xl/worksheets/sheet1.xml", s1); zip.file("xl/sharedStrings.xml", ss);
    return zip.generateAsync({ type: "blob", compression: "DEFLATE", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }

  function unduh(blob, nama) { var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nama; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }

  /** Titik masuk: daftar barang (objek pengajuan), fungsi toast, fungsi esc halaman */
  async function jalankan(list, toast) {
    var ok = [], salah = [];
    list.forEach(function (x) { var h = siapkan(x); if (h.baris) ok.push({ x: x, b: h.baris }); else salah.push({ x: x, m: h.masalah }); });
    if (!ok.length && !salah.length) { toast("Tidak ada barang untuk diunduh.", true); return; }
    if (salah.length) {
      var ada = document.getElementById("mbxm"); if (ada) ada.remove();
      var d = document.createElement("div"); d.id = "mbxm";
      d.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px";
      d.innerHTML = '<div style="background:var(--card,#fff);color:inherit;max-width:640px;width:100%;max-height:85vh;overflow:auto;border-radius:12px;padding:18px">' +
        '<b>' + salah.length + ' barang belum bisa masuk file Accurate</b><div class="note" style="margin:4px 0 10px">Perbaiki dulu datanya supaya impor tidak gagal. ' + ok.length + ' barang lain siap diunduh.</div>' +
        salah.map(function (s) { return '<div class="note" style="padding:5px 0;border-top:1px solid var(--line,#ddd)"><b>' + esc(s.x.nama) + '</b> (' + esc(s.x.no) + ')<br>' + s.m.map(esc).join("; ") + "</div>"; }).join("") +
        '<div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">' + (ok.length ? '<button class="sv" id="mbxgo">Unduh ' + ok.length + ' barang yang siap</button>' : "") + '<button class="gh" id="mbxno">Tutup</button></div></div>';
      document.body.appendChild(d);
      document.getElementById("mbxno").onclick = function () { d.remove(); };
      var go = document.getElementById("mbxgo"); if (go) go.onclick = function () { d.remove(); tulis(ok, toast); };
      return;
    }
    tulis(ok, toast);
  }
  async function tulis(ok, toast) {
    try {
      var r = await fetch("template-item-accurate.xlsx?v=" + Date.now()); if (!r.ok) throw new Error("File template-item-accurate.xlsx belum diunggah ke GitHub.");
      var blob = await bangun(ok.map(function (o) { return o.b; }), await r.arrayBuffer()), t = new Date(), p = function (n) { return String(n).padStart(2, "0"); };
      unduh(blob, "item-import-accurate_" + t.getFullYear() + p(t.getMonth() + 1) + p(t.getDate()) + "_" + p(t.getHours()) + p(t.getMinutes()) + ".xlsx");
      toast(ok.length + " barang diunduh dengan format template Accurate. Setelah berhasil diimpor, tandai sudah diinput.");
    } catch (e) { toast("Gagal membuat file: " + (e.message || e), true); }
  }
  W.MBX = { jalankan: jalankan, siapkan: siapkan, bangun: bangun, JENIS: JENIS };
})(window);
