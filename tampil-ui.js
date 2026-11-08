/* Dashboard Perjalanan Kerja: mode presentasi (proyektor) dan tautan lihat-saja.
   Isi dan urutan bagian ditentukan data dari server (perjLihat); bagian tanpa data dilewati. Kanvas 1280x720 diskalakan ke layar. */
(function (g) {
  "use strict";
  var API_URL = "https://script.google.com/macros/s/AKfycbyVPrhw3xmk8D-73kgZQlesBB_1M6-Pc6vv3IUFMpa8jZx9bZmfGhzf_IFjKe3ZuYOMVw/exec";
  var PG = g.PG, esc = PG.esc, fmt = PG.fmt, W = PG.W;
  var BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
  var T = g.TP = {};
  var D = null, SL = [], idx = 0, fotoCache = {}, auth = {}, navTimer = null;
  function el(id) { return document.getElementById(id); }
  function tgl(s) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || "")); return m ? Number(m[3]) + " " + BLN[Number(m[2]) - 1] + " " + m[1] : ""; }
  function tglPendek(s) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || "")); return m ? Number(m[3]) + " " + BLN[Number(m[2]) - 1] : String(s || ""); }
  function rp(n) { return "Rp " + Math.round(n).toLocaleString("id-ID"); }
  function pot(s, n) { s = String(s == null ? "" : s); return s.length > n ? s.slice(0, n - 1).trim() + "…" : s; }
  function bd(pen) {
    pen = String(pen || ""); if (pen === "Terukur otomatis") return '<span class="bd otomatis">Terukur otomatis</span>';
    if (pen === "Perkiraan") return '<span class="bd perkiraan">≈ Perkiraan</span>';
    if (pen === "Menunggu") return '<span class="bd tunggu">Menunggu keputusan manajemen</span>';
    return '<span class="bd manual">Diisi manual</span>';
  }
  function progres(b) { return b && b.total ? (b.dihitung + b.stokNol) / b.total * 100 : 0; }
  function urut(a, f) { return a.slice().sort(function (x, y) { var p = f(x), q = f(y); return p < q ? -1 : p > q ? 1 : 0; }); }

  /* ---------- penyusun slide: setiap fungsi mengembalikan {bagian, judul, html} ---------- */
  function slPembuka() {
    var A = D.atur, op = D.opname, kartu = [], b = op && op.bulan.length ? op.bulan[op.bulan.length - 1] : null;
    if (b) kartu.push('<div class="kartu"><div class="angka">' + fmt(progres(b)) + '<small>%</small></div><div class="lbl">Progres hitungan opname<br><span style="font-size:17px">Excel opname ' + tgl(b.periode) + "</span></div></div>");
    if (op && op.kasus && op.kasus.total) { var m = op.kasus.keputusan["(menunggu keputusan)"] || 0; if (m) kartu.push('<div class="kartu"><div class="angka">' + fmt(m, 0) + '</div><div class="lbl">Barang menunggu keputusan manajemen<br>' + bd("Menunggu") + "</div></div>"); }
    var nm = {}, order = []; D.ukur.forEach(function (u) { if (!nm[u.ukuran]) { nm[u.ukuran] = []; order.push(u.ukuran); } nm[u.ukuran].push(u); });
    order.forEach(function (n) { if (kartu.length >= 5) return; var l = urut(nm[n], function (x) { return x.tanggal; }), z = l[l.length - 1]; kartu.push('<div class="kartu"><div class="angka">' + fmt(z.nilai) + "<small>" + esc(z.satuan) + '</small></div><div class="lbl">' + esc(n) + "<br>" + bd(z.penanda) + "</div></div>"); });
    if (D.sistem && kartu.length < 5) kartu.push('<div class="kartu"><div class="angka">' + fmt(D.sistem.permintaan, 0) + '</div><div class="lbl">Permintaan barang tercatat digital<br>' + bd("Terukur otomatis") + "</div></div>");
    var per = tgl(A.mulai) + " – " + tgl((D.now || "").split(" ")[0].split("/").reverse().join("-")) ;
    var html = '<div style="display:grid;grid-template-columns:1fr;gap:12px"><div><div class="jd" style="font-size:46px;margin-bottom:6px">' + esc(A.judul) + '</div><div class="sub" style="margin-bottom:6px">' + esc(per) + (A.penyaji ? " · " + esc(A.penyaji) : "") + "</div>" +
      (A.ringkasan ? '<div style="font-size:26px;line-height:1.35;color:var(--teks);max-width:1150px">' + esc(A.ringkasan) + "</div>" : "") + "</div>" +
      (kartu.length ? '<div class="grid" style="grid-template-columns:repeat(' + Math.min(kartu.length, 5) + ',1fr);margin-top:14px">' + kartu.join("") + "</div>" : '<div class="kos" style="padding-top:60px">Belum ada angka kunci yang ditampilkan.</div>') + "</div>";
    return {bagian: "Ringkasan", judul: "Ringkasan", html: html};
  }
  function slKartu() {
    var l = D.items.filter(function (x) { return x.tipe === "kartu"; }); if (!l.length) return [];
    l = urut(l, function (x) { return x.urut * 1e9 + (x.tanggal ? Number(x.tanggal.replace(/-/g, "")) : 0); });
    var out = [], n = Math.ceil(l.length / 3);
    for (var p = 0; p < n; p++) {
      var h = '<div class="jd">' + (p ? "Dari masalah ke hasil (lanjutan)" : (l.length + " perbaikan: dari masalah ke hasil")) + "</div>";
      l.slice(p * 3, p * 3 + 3).forEach(function (k) {
        h += '<div class="alur"><div class="k m"><h4>Masalah</h4>' + esc(pot(k.judul, 110)) + '</div><div class="pn">&rarr;</div><div class="k t"><h4>Tindakan</h4>' + esc(pot(k.isi1, 110)) + '</div><div class="pn">&rarr;</div><div class="k h"><h4>Hasil</h4>' + esc(pot(k.isi2, 110)) + "</div></div>" +
          '<div class="dampak">' + (k.isi3 ? "Dampak: " + esc(pot(k.isi3, 130)) + " &nbsp;" : "") + bd(k.penanda) + "</div>";
      });
      out.push({bagian: "Masalah → Tindakan → Hasil", judul: "Masalah, tindakan, hasil", html: h});
    }
    return out;
  }
  function slPerjalanan() {
    var l = urut(D.items.filter(function (x) { return x.tipe === "jurnal"; }), function (x) { return x.tanggal; }); if (!l.length) return [];
    var out = [], n = Math.ceil(l.length / 5);
    for (var p = 0; p < n; p++) {
      var h = '<div class="jd">Perjalanan ' + tgl(l[0].tanggal) + " – " + tgl(l[l.length - 1].tanggal) + (n > 1 ? " (" + (p + 1) + "/" + n + ")" : "") + '</div><div class="tl">';
      l.slice(p * 5, p * 5 + 5).forEach(function (j) {
        h += '<div class="it"><div class="tg">' + tgl(j.tanggal) + '</div><div><div class="jl">' + esc(pot(j.judul, 80)) + (j.gudang ? ' <span class="bd manual">' + esc(j.gudang) + "</span>" : "") + " " + bd(j.penanda) + "</div>" +
          (j.isi1 || j.isi2 ? '<div class="ur">' + esc(pot(j.isi1, 120)) + (j.isi2 ? " &rarr; <b>" + esc(pot(j.isi2, 100)) + "</b>" : "") + "</div>" : "") + "</div></div>";
      });
      out.push({bagian: "Perjalanan", judul: "Perjalanan", html: h + "</div>"});
    }
    return out;
  }
  function figFoto(k, label) {
    var f = k && k.foto && k.foto[0];
    return '<figure><div class="ph">' + (f ? '<img alt="' + esc(label) + '" data-foto="' + esc(f) + '">' : "Foto belum diunggah") + "</div><figcaption>" + esc(label) + (k && k.tanggal ? " · " + tgl(k.tanggal) : "") + (k && k.judul ? "<br><span style='font-weight:400;font-size:19px;color:var(--abu)'>" + esc(pot(k.judul, 70)) + "</span>" : "") + "</figcaption></figure>";
  }
  function slSebelum() {
    var l = D.items.filter(function (x) { return x.tipe === "foto" && /^(sebelum|sesudah)$/i.test(x.isi1); }); if (!l.length) return [];
    var gs = {}, ord = []; l.forEach(function (x) { var k = x.gudang || "Umum"; if (!gs[k]) { gs[k] = []; ord.push(k); } gs[k].push(x); });
    return ord.sort().map(function (k) {
      var a = urut(gs[k].filter(function (x) { return /^sebelum$/i.test(x.isi1); }), function (x) { return x.tanggal; }), b = urut(gs[k].filter(function (x) { return /^sesudah$/i.test(x.isi1); }), function (x) { return x.tanggal; });
      var s0 = a.filter(function (x) { return x.foto.length; })[0] || a[0], s1 = b.filter(function (x) { return x.foto.length; }).pop() || b[b.length - 1];
      return {bagian: "Sebelum dan sesudah", judul: "Sebelum dan sesudah " + k, html: '<div class="jd">' + (k === "Umum" ? "Sebelum dan sesudah penataan" : "Gudang " + esc(k.replace(/^G/i, "")) + ": sebelum dan sesudah") + '</div><div class="fot">' + figFoto(s0, "Sebelum") + figFoto(s1, "Sesudah") + "</div>"};
    });
  }
  function slOpname() {
    var op = D.opname; if (!op || !op.bulan.length) return [];
    var out = [], bs = op.bulan, b = bs[bs.length - 1], p = progres(b), sel = b.plus + b.minus;
    var h = '<div class="jd">Progres hitungan ' + fmt(p) + "%: " + fmt(b.dihitung + b.stokNol, 0) + " dari " + fmt(b.total, 0) + ' item</div><div style="display:grid;grid-template-columns:320px 1fr;gap:34px;align-items:center;margin-top:10px"><div>' + PG.ring(p, {ukuran: 320, tebal: 40}) + "</div><div>" +
      PG.tumpuk([{nama: "Dihitung fisik", nilai: b.dihitung, warna: W.biru}, {nama: "Stok nol", nilai: b.stokNol, warna: "#7fb2d6"}, {nama: "Belum beres", nilai: b.belumBeres, warna: "#d58a00"}], {lebar: 780, tinggi: 64}) +
      '<div style="display:flex;gap:22px;flex-wrap:wrap;font-size:21px;margin:10px 0 14px;color:var(--abu)"><span><b style="color:' + W.biru + '">■</b> Dihitung fisik ' + fmt(b.dihitung, 0) + '</span><span><b style="color:#7fb2d6">■</b> Stok nol (tidak dihitung) ' + fmt(b.stokNol, 0) + '</span><span><b style="color:#d58a00">■</b> Belum beres ' + fmt(b.belumBeres, 0) + "</span></div>" +
      '<div class="grid" style="grid-template-columns:repeat(4,1fr);gap:12px"><div class="kartu"><div class="angka" style="font-size:54px">' + fmt(b.sesuai, 0) + '</div><div class="lbl">Sesuai</div></div><div class="kartu"><div class="angka" style="font-size:54px">' + fmt(b.minus, 0) + '</div><div class="lbl">Selisih kurang</div></div><div class="kartu"><div class="angka" style="font-size:54px">' + fmt(b.plus, 0) + '</div><div class="lbl">Selisih lebih</div></div><div class="kartu"><div class="angka" style="font-size:54px">' + fmt(b.temuan, 0) + '</div><div class="lbl">Barang temuan baru</div></div></div></div></div>' +
      '<div class="cat" style="font-size:22px;margin-top:18px">Acuan: Excel opname ' + tgl(b.periode) + " (laporan ke Accounting). " + fmt(sel, 0) + " barang berselisih menunggu keputusan manajemen; penyesuaian belum dilakukan." +
      (b.nilaiMinus != null && b.adaHarga ? "<br>Nilai selisih (dari " + fmt(b.adaHarga, 0) + " barang berharga): kurang ≈ " + rp(b.nilaiMinus) + ", lebih ≈ " + rp(b.nilaiPlus) + "." : "") + (b.janggal ? "<br>" + b.janggal + " baris perlu dicek ulang." : "") + "</div>";
    out.push({bagian: "Opname", judul: "Progres opname", html: h});
    if (bs.length >= 2) {
      var x = function (q) { return tglPendek(q.periode) + " " + q.periode.slice(2, 4); };
      var h2 = '<div class="jd">Selisih: dari ' + fmt(bs[0].plus + bs[0].minus, 0) + " menjadi " + fmt(b.plus + b.minus, 0) + ' barang</div><div class="duaKol"><div><div class="sub">Progres hitungan (%)</div>' +
        PG.garis([{nama: "Progres", titik: bs.map(function (q) { return {x: x(q), y: Math.round(progres(q) * 10) / 10}; })}], {lebar: 560, tinggi: 330, max: 100, min: 0, label: "Progres hitungan"}) + '</div><div><div class="sub">Barang berselisih</div>' +
        PG.garis([{nama: "Selisih", warna: "#d58a00", titik: bs.map(function (q) { return {x: x(q), y: q.plus + q.minus}; })}], {lebar: 560, tinggi: 330, min: 0, label: "Barang berselisih"}) + '</div></div><div class="cat">Tiap titik = satu Excel opname bulanan. ' + (bs.length === 2 ? "Tren akan makin jelas setelah unggahan berikutnya." : "") + "</div>";
      out.push({bagian: "Opname", judul: "Tren opname bulanan", html: h2});
    }
    var k = op.kasus;
    if (k && k.total) {
      var m = k.keputusan["(menunggu keputusan)"] || 0, KEP = ["(menunggu keputusan)", "Diterima", "Ditunda", "Ditolak", "Alternatif lain"], REK = ["Disesuaikan di Accurate", "Ditelusuri lanjut", "Dijelaskan tanpa penyesuaian", "Dihapus buku", "(belum ada)"];
      var wk = {"(menunggu keputusan)": "#d58a00", Diterima: W.ok, Ditunda: "#7fb2d6", Ditolak: W.merah, "Alternatif lain": W.biru};
      var h3 = '<div class="jd">' + (m ? fmt(m, 0) + " barang menunggu keputusan manajemen" : "Semua keputusan sudah dicatat") + '</div><div class="duaKol"><div><div class="sub">Keputusan manajemen</div>' +
        PG.mendatar(KEP.filter(function (n) { return k.keputusan[n]; }).map(function (n) { return {label: n === "(menunggu keputusan)" ? "Menunggu keputusan" : n, nilai: k.keputusan[n], warna: wk[n]}; }), {lebar: 560, labelLebar: 250}) +
        '</div><div><div class="sub">Rekomendasi staf gudang</div>' + PG.mendatar(REK.filter(function (n) { return k.rekom[n]; }).map(function (n) { return {label: n === "(belum ada)" ? "Belum ada rekomendasi" : n, nilai: k.rekom[n], warna: n === "(belum ada)" ? "#b8c7d3" : W.biru}; }), {lebar: 560, labelLebar: 250}) + "</div></div>" +
        '<div class="cat">Rekomendasi adalah usulan staf gudang; keputusan ada pada manajemen. Dilaksanakan: <b>' + fmt(k.pelaksanaan, 0) + "</b> barang. Kembali sesuai pada hitungan berikutnya: <b>" + fmt(k.sesuaiKembali, 0) + "</b> barang. Total yang dipantau: " + fmt(k.total, 0) + " (selisih " + fmt(k.jenis["Selisih"] || 0, 0) + ", belum beres " + fmt(k["jenis"]["Belum beres"] || 0, 0) + ", temuan " + fmt(k.jenis["Temuan"] || 0, 0) + ").</div>";
      out.push({bagian: "Opname", judul: "Status penyelesaian selisih", html: h3});
    }
    if (op.top) {
      var adaNilai = op.top.minus.concat(op.top.plus).some(function (z) { return z.nilai != null; });
      var tb = function (jd, l, pl) {
        return '<div><div class="sub" style="margin-bottom:6px"><b>' + jd + "</b></div><table><tr><th>Barang</th><th class='n'>Sistem</th><th class='n'>Hitung</th><th class='n'>Selisih</th>" + (adaNilai ? "<th class='n'>Nilai (Rp)</th>" : "") + "</tr>" +
          l.map(function (z) { return '<tr><td style="font-size:17px;white-space:nowrap">' + esc(pot(z.nama, 24)) + '</td><td class="n" style="font-size:17px;white-space:nowrap">' + fmt(z.total, 0) + '</td><td class="n" style="font-size:17px;white-space:nowrap">' + fmt(z.hasil, 0) + '</td><td class="n" style="font-size:17px;font-weight:700;white-space:nowrap;color:' + (pl ? W.ok : W.merah) + '">' + (z.selisih > 0 ? "+" : "") + fmt(z.selisih, 0) + "</td>" + (adaNilai ? '<td class="n" style="font-size:15px;white-space:nowrap">' + (z.nilai != null ? rp(Math.abs(z.nilai)) : "-") + "</td>" : "") + "</tr>"; }).join("") + "</table></div>";
      };
      out.push({bagian: "Opname", judul: "Selisih terbesar", html: '<div class="jd">Selisih terbesar (Excel ' + tgl(op.top.periode) + ')</div><div class="duaKol" style="gap:20px">' + tb("Paling kurang", op.top.minus, false) + tb("Paling lebih", op.top.plus, true) + '</div><div class="cat" style="margin-top:6px">Nilai = selisih × harga (hanya barang yang punya harga; "-" = harga belum ada).</div>'});
    }
    return out;
  }
  function slSistem() {
    var s = D.sistem; if (!s || !s.permintaan) return [];
    var st = Object.keys(s.status).map(function (k) { return {label: k, nilai: s.status[k], warna: /ditolak/i.test(k) ? W.merah : /siap|selesai|serah/i.test(k) ? W.ok : W.biru}; });
    var h = '<div class="jd">' + fmt(s.permintaan, 0) + " permintaan barang tercatat digital sejak " + tgl(s.awal) + '</div><div class="duaKol"><div><div class="sub">Permintaan per bulan ' + bd("Terukur otomatis") + "</div>" + PG.batang(s.perBulan.map(function (q) { return {label: q.bulan.slice(5) + "/" + q.bulan.slice(2, 4), nilai: q.jumlah}; }), {lebar: 560, tinggi: 330}) +
      '</div><div><div class="sub">Status permintaan</div>' + PG.mendatar(st, {lebar: 560, labelLebar: 250}) + '</div></div><div class="cat">Sumber: sistem gudang (data permintaan unik). Sistem merekam sejak ' + tgl(s.awal) + "; periode sebelumnya tidak terekam di sistem.</div>";
    return [{bagian: "Sistem", judul: "Sistem berjalan", html: h}];
  }
  function slUkuran() {
    var nm = {}, ord = []; D.ukur.forEach(function (u) { if (!nm[u.ukuran]) { nm[u.ukuran] = []; ord.push(u.ukuran); } nm[u.ukuran].push(u); });
    if (!ord.length) return [];
    var out = [], n = Math.ceil(ord.length / 2);
    for (var p = 0; p < n; p++) {
      var h = '<div class="jd">' + (n > 1 ? "Ukuran keberhasilan (" + (p + 1) + "/" + n + ")" : "Ukuran keberhasilan") + "</div>";
      ord.slice(p * 2, p * 2 + 2).forEach(function (k) {
        var l = urut(nm[k], function (x) { return x.tanggal; }), a = l[0], z = l[l.length - 1], tg = z.target;
        h += '<div style="margin-bottom:8px"><div style="font-size:25px;font-weight:700;color:var(--tua)">' + esc(k) + ": " + (l.length > 1 ? fmt(a.nilai) + " &rarr; " : "") + fmt(z.nilai) + " " + esc(z.satuan) + " " + bd(z.penanda) + (z.arah === "turun" ? ' <span style="font-size:18px;color:var(--abu)">(makin kecil makin baik)</span>' : "") + "</div>" +
          PG.garis([{nama: k, titik: l.map(function (q) { return {x: tglPendek(q.tanggal) + " " + q.tanggal.slice(2, 4), y: q.nilai, p: q.penanda === "Perkiraan"}; })}], {lebar: 1180, tinggi: 220, target: tg == null ? null : tg, satuan: z.satuan, label: k}) + "</div>";
      });
      out.push({bagian: "Ukuran keberhasilan", judul: "Ukuran keberhasilan", html: h});
    }
    return out;
  }
  function slDaftar(tipe, bag, judul, kolom) {
    var l = D.items.filter(function (x) { return x.tipe === tipe; }); if (!l.length) return [];
    l = urut(l, function (x) { return x.urut * 1e9 + (x.tanggal ? Number(x.tanggal.replace(/-/g, "")) : 0); });
    var out = [], n = Math.ceil(l.length / 5);
    for (var p = 0; p < n; p++) {
      out.push({bagian: bag, judul: bag, html: '<div class="jd">' + judul + (n > 1 ? " (" + (p + 1) + "/" + n + ")" : "") + '</div><div class="tl">' + l.slice(p * 5, p * 5 + 5).map(function (x) {
        return '<div class="it"><div class="tg" style="font-size:20px">' + esc(x[kolom.kiri] || "") + '</div><div><div class="jl">' + esc(pot(x.judul, 90)) + " " + (tipe === "minta" ? bd(/diputus/i.test(x.isi3) ? "Diisi manual" : "Menunggu") : "") + '</div><div class="ur">' + esc(pot(x.isi1, 200)) + (x.isi3 && tipe === "rencana" ? " · <b>" + esc(x.isi3) + "</b>" : "") + "</div></div></div>";
      }).join("") + "</div>"});
    }
    return out;
  }
  function slBukti() {
    var l = D.items.filter(function (x) { return x.tipe === "foto" && !/^(sebelum|sesudah)$/i.test(x.isi1); }); if (!l.length) return [];
    var out = [], n = Math.ceil(l.length / 8);
    for (var p = 0; p < n; p++) {
      out.push({bagian: "Bukti", judul: "Bukti", html: '<div class="jd">Bukti pendukung' + (n > 1 ? " (" + (p + 1) + "/" + n + ")" : "") + '</div><div class="gal">' + l.slice(p * 8, p * 8 + 8).map(function (x) {
        var f = x.foto[0];
        return "<div><div class='ph'>" + (f ? '<img alt="' + esc(x.judul) + '" data-foto="' + esc(f) + '">' : (/^https?:/i.test(x.isi2) ? "Tautan tersedia" : "Tanpa foto")) + "</div><div class='cp'><b>" + esc(pot(x.judul, 44)) + "</b><br>" + esc(x.isi1 || "") + (x.tanggal ? " · " + tglPendek(x.tanggal) : "") + "</div></div>";
      }).join("") + "</div>"});
    }
    return out;
  }
  function slPenutup() {
    var r = D.items.filter(function (x) { return x.tipe === "rencana"; }).slice(0, 3);
    return [{bagian: "Penutup", judul: "Penutup", html: '<div style="text-align:center;padding-top:60px"><div class="jd" style="font-size:52px">Terima kasih</div><div class="sub" style="font-size:28px">Setiap hal yang saya sampaikan dapat dibuktikan dengan lampiran.</div>' +
      (r.length ? '<div style="margin:34px auto 0;max-width:900px;text-align:left;font-size:26px;line-height:1.5"><b style="color:var(--tua)">Langkah berikutnya</b><br>' + r.map(function (x) { return "• " + esc(pot(x.judul, 90)); }).join("<br>") + "</div>" : "") +
      (D.atur.penyaji ? '<div class="sub" style="margin-top:36px">' + esc(D.atur.penyaji) + "</div>" : "") + "</div>"}];
  }
  T.susun = function (data) {
    D = data;
    var s = [slPembuka()];
    [slKartu, slPerjalanan, slSebelum, slOpname, slUkuran, slSistem].forEach(function (f) { f().forEach(function (x) { s.push(x); }); });
    slDaftar("minta", "Menunggu keputusan", "Yang menunggu keputusan", {kiri: "isi2"}).forEach(function (x) { s.push(x); });
    slDaftar("rencana", "Rencana berikutnya", "Rencana berikutnya", {kiri: "isi2"}).forEach(function (x) { s.push(x); });
    slBukti().forEach(function (x) { s.push(x); });
    slPenutup().forEach(function (x) { s.push(x); });
    SL = s; return s;
  };
  /* ---------- tampilan ---------- */
  function slideHtml(s, i, n) {
    return '<div class="hd"><div class="lg"><img src="logo.png" alt="" onerror="this.remove()"></div><div class="nm">PT Sarana Catur Tirta Kelola</div><div class="bg">' + esc(s.bagian) + '</div></div><div class="isi">' + s.html + '</div><div class="ft"><b>' + (i + 1) + " dari " + n + "</b><span>" + esc(s.judul) + '</span><span class="sp">Diperbarui ' + esc(D.now || "") + "</span></div>";
  }
  function fit() {
    var s = Math.min(window.innerWidth / 1280, window.innerHeight / 720); el("kanvas").style.transform = "scale(" + s + ")";
    var h = el("putar"); if (h) h.style.display = (window.innerWidth < 700 && window.innerHeight > window.innerWidth) ? "block" : "none";
  }
  function tampil(i) {
    if (!SL.length) return; idx = Math.max(0, Math.min(SL.length - 1, i));
    var k = el("kanvas"), cur = k.querySelector(".slide"); if (!cur) { cur = document.createElement("div"); cur.className = "slide on"; k.appendChild(cur); }
    cur.innerHTML = slideHtml(SL[idx], idx, SL.length); muatFoto(cur);
    try { sessionStorage.setItem("sctk_tp_idx", String(idx)); } catch (e) {}
    Array.prototype.forEach.call(document.querySelectorAll("#daftar a"), function (a, j) { a.classList.toggle("on", j === idx); });
  }
  function api(b) { return fetch(API_URL, {method: "POST", headers: {"Content-Type": "text/plain;charset=utf-8"}, body: JSON.stringify(b)}).then(function (r) { return r.json(); }); }
  function kredensial(extra) { var b = {}; if (auth.pin) b.pin = auth.pin; else b.sandi = auth.sandi; for (var k in extra) b[k] = extra[k]; return b; }
  function muatFoto(root) {
    Array.prototype.forEach.call(root.querySelectorAll("img[data-foto]"), function (im) {
      var id = im.getAttribute("data-foto"); if (im.getAttribute("src")) return;
      im.onerror = function () { if (im.parentNode) im.parentNode.textContent = "Foto tidak tersedia"; };
      ambilFoto(id).then(function (u) { if (u) im.setAttribute("src", u); else if (im.parentNode) im.parentNode.textContent = "Foto tidak tersedia"; });
    });
  }
  function ambilFoto(id) {
    if (fotoCache[id]) return fotoCache[id];
    fotoCache[id] = api(kredensial({action: "perjFotoGet", id: id})).then(function (r) { return r && r.ok ? r.dataUrl : ""; }).catch(function () { return ""; });
    return fotoCache[id];
  }
  T.ambilFoto = ambilFoto;
  function daftarIsi() {
    el("daftar").innerHTML = "<h3>Daftar bagian</h3>" + SL.map(function (s, i) { return "<a data-i='" + i + "'>" + (i + 1) + ". " + esc(s.judul) + "</a>"; }).join("");
    Array.prototype.forEach.call(el("daftar").querySelectorAll("a"), function (a) { a.onclick = function () { tampil(Number(a.getAttribute("data-i"))); el("daftar").classList.remove("on"); }; });
  }
  function nyala(s) { var n = el("nav"); n.classList.remove("sembunyi"); clearTimeout(navTimer); navTimer = setTimeout(function () { n.classList.add("sembunyi"); }, s || 2800); }
  function layarPenuh() { var d = document.documentElement; if (document.fullscreenElement) document.exitFullscreen(); else if (d.requestFullscreen) d.requestFullscreen(); }
  function simpanPdf() {
    var c = el("cetak"), btn = el("bPdf"); btn.disabled = true; btn.textContent = "Menyiapkan...";
    c.innerHTML = SL.map(function (s, i) { return '<div class="slide on">' + slideHtml(s, i, SL.length) + "</div>"; }).join("");
    var ims = Array.prototype.slice.call(c.querySelectorAll("img[data-foto]")), tugas = ims.map(function (im) { return ambilFoto(im.getAttribute("data-foto")).then(function (u) { if (u) im.setAttribute("src", u); }); });
    Promise.all(tugas).then(function () { btn.disabled = false; btn.textContent = "Simpan PDF"; setTimeout(function () { window.print(); }, 300); });
  }
  function pesan(j, p, minta, ph) {
    el("msg").classList.add("on"); el("mj").textContent = j; el("mp").textContent = p || ""; el("mf").style.display = minta ? "block" : "none"; el("me").textContent = ""; if (minta) { el("mi").placeholder = ph || ""; el("mi").focus(); }
  }
  function mulai(data) {
    T.susun(data); daftarIsi(); el("msg").classList.remove("on"); el("kanvas").innerHTML = ""; fit();
    var i = 0; try { i = Number(sessionStorage.getItem("sctk_tp_idx")) || 0; } catch (e) {} tampil(Math.min(i, SL.length - 1)); nyala(4000);
  }
  function muat() {
    var h = location.hash.replace(/^#/, ""), o = {}; h.split("&").forEach(function (p) { var q = p.split("="); if (q[0]) o[q[0]] = decodeURIComponent(q.slice(1).join("=") || ""); });
    var pin = ""; try { pin = sessionStorage.getItem("sctk_admin") || ""; } catch (e) {}
    auth = {};
    if (o.k) auth.sandi = o.k; else if (pin && (o.admin !== undefined || o.lengkap !== undefined || !o.k)) auth.pin = pin;
    if (!auth.sandi && !auth.pin) { pesan("Dashboard Perjalanan Kerja", "Masukkan sandi tautan dari pemilik.", true, "Sandi tautan"); return; }
    pesan("Memuat...", "Mohon tunggu.", false);
    api(kredensial({action: "perjLihat", lengkap: o.lengkap !== undefined ? 1 : 0})).then(function (r) {
      if (!r || !r.ok) { if (auth.pin) { auth = {}; } pesan("Tidak bisa dibuka", (r && r.msg) || "Server tidak menjawab.", true, "Sandi tautan"); return; }
      mulai(r);
    }).catch(function () { pesan("Tidak ada koneksi", "Periksa internet lalu muat ulang halaman, atau pakai salinan PDF.", false); });
  }
  function pasang() {
    el("bPrev").onclick = function () { tampil(idx - 1); }; el("bNext").onclick = function () { tampil(idx + 1); };
    el("bFull").onclick = layarPenuh; el("bPdf").onclick = simpanPdf; el("bDaftar").onclick = function () { el("daftar").classList.toggle("on"); };
    el("mb").onclick = function () { var v = el("mi").value.trim(); if (!v) return; location.hash = "k=" + encodeURIComponent(v); el("mi").value = ""; muat(); };
    el("mi").onkeydown = function (e) { if (e.key === "Enter") el("mb").click(); };
    document.addEventListener("keydown", function (e) {
      if (el("msg").classList.contains("on") && e.target.tagName === "INPUT") return;
      var k = e.key; if (k === "ArrowRight" || k === "PageDown" || k === " ") { tampil(idx + 1); e.preventDefault(); } else if (k === "ArrowLeft" || k === "PageUp") { tampil(idx - 1); e.preventDefault(); }
      else if (k === "Home") tampil(0); else if (k === "End") tampil(SL.length - 1); else if (k === "f" || k === "F") layarPenuh(); else if (k === "p" || k === "P") simpanPdf(); else if (k === "d" || k === "D") el("daftar").classList.toggle("on"); else if (k === "Escape") el("daftar").classList.remove("on");
      nyala();
    });
    document.addEventListener("mousemove", function () { nyala(); }); document.addEventListener("touchstart", function () { nyala(5000); }, {passive: true});
    el("stage").addEventListener("click", function (e) { var x = e.clientX / window.innerWidth; if (e.target.closest && e.target.closest("#nav")) return; if (x > 0.7) tampil(idx + 1); else if (x < 0.3) tampil(idx - 1); });
    window.addEventListener("resize", fit); window.addEventListener("hashchange", function () { location.reload(); });
  }
  T.mulai = function () { pasang(); fit(); muat(); };
  T.ke = tampil; T.jumlah = function () { return SL.length; }; T.daftar = function () { return SL; };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", T.mulai); else T.mulai();
})(window);
