/* T156: Perjalanan Kerja - tab Kesiapan bukti (skor, capaian otomatis, pemeriksa lemah, janji vs bukti, adopsi) dan tab Ringkasan mingguan (dikirim manual). */
(function (g) {
  "use strict";
  var PJ = g.PJ = g.PJ || {};
  var WST = {"Terbukti": "d", "Sebagian": "w", "Belum terbukti": "l", "Lewat tenggat": "x"};
  var NAMA_TIPE = {jurnal: "Jurnal", kartu: "Masalah → Hasil", janji: "Janji", ukuran: "Ukuran", rencana: "Rencana", minta: "Menunggu keputusan"};
  function tglId(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || "")); return m ? m[3] + "/" + m[2] + "/" + m[1] : (s || "-"); }
  function bulanId(s) { var m = /^(\d{4})-(\d{2})$/.exec(String(s || "")); return m ? ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"][Number(m[2]) - 1] + " " + m[1] : s; }

  PJ.kesiapan = async function (box, U) {
    var esc = U.esc, fmt = U.fmt;
    box.innerHTML = '<div class="card note">Menghitung kesiapan bukti...</div>';
    var r = await U.call("perjKesiapan");
    if (!r || !r.ok) { box.innerHTML = '<div class="card err">' + esc((r && r.msg) || "Gagal memuat.") + "</div>"; return; }
    var K = r.skor, warna = K.skor >= 80 ? "var(--ok)" : K.skor >= 60 ? "var(--biru)" : K.skor >= 35 ? "var(--kn)" : "var(--bad)";
    var h = '<div class="card ks-skor"><div class="ks-angka" style="color:' + warna + '"><b id="ks_n">' + K.skor + '</b><span>/100</span></div><div class="ks-ket"><h3 style="margin:0">Skor kesiapan bukti: ' + esc(K.label) + '</h3>' +
      '<div class="note">Presentasi ' + esc(tglId(K.presentasi)) + (K.sisaHari >= 0 ? " · <b>" + K.sisaHari + " hari lagi</b>" : " · sudah lewat") + '. Skor menilai kelengkapan bahan, bukan kinerja. Tanggal presentasi bisa diubah di Tampilan & tautan.</div>' +
      '<div class="ks-komp">' + K.komponen.map(function (k) { var p = Math.round(k.nilai * 100); return '<div class="ks-k"><div class="ks-kl"><span>' + esc(k.label) + '</span><b>' + fmt(k.poin, 1) + " / " + k.bobot + '</b></div><div class="bar"><i style="width:' + p + '%"></i></div><div class="note">' + esc(k.ket) + "</div></div>"; }).join("") + "</div>" +
      (K.langkah.length ? '<div class="ks-langkah"><b>Langkah berikutnya</b><ol>' + K.langkah.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ol></div>" : '<div class="ok"><b>Semua komponen lengkap.</b></div>') + "</div></div>";

    // capaian otomatis
    var sar = r.saran || [];
    h += '<div class="card"><h3>Capaian otomatis dari data sistem</h3><div class="note">Angka dihitung ulang dari sheet saat disimpan. Tersimpan ke Jurnal dengan penanda <b>Terukur otomatis</b>; capaian yang sudah ada diperbarui (tidak dobel). Barang tanpa harga tidak dihitung.</div>' +
      (sar.length ? '<div class="tw"><table id="ks_sar"><tr><th style="width:28px"><input type="checkbox" id="ks_sa" aria-label="Pilih semua"></th><th>Capaian</th><th>Angka</th><th>Dasar hitung</th><th>Status</th></tr>' + sar.map(function (x) {
        var st = x.status === "baru" ? '<span class="bd l">baru</span>' : x.status === "berubah" ? '<span class="bd w">angka berubah</span>' : '<span class="bd d">sudah di Jurnal</span>';
        return '<tr><td><input type="checkbox" data-sk="' + esc(x.kunci) + '"' + (x.status === "sama" ? " disabled" : " checked") + ' aria-label="Pilih ' + esc(x.judul) + '"></td><td><b>' + esc(x.judul) + '</b><div class="note">' + esc(x.isi3) + '</div></td><td><b>' + esc(x.isi2) + "</b>" + (x.status === "berubah" ? '<div class="note">sebelumnya: ' + esc(x.isi2Lama) + " (" + esc(tglId(x.tglLama)) + ")</div>" : "") + '</td><td class="note">' + esc(x.isi1) + "<br><i>Sumber: " + esc(x.sumber) + "</i></td><td>" + st + "</td></tr>";
      }).join("") + '</table></div><div style="margin-top:8px"><button id="ks_ss">Simpan yang dipilih ke Jurnal</button></div>' : '<div class="note">Belum ada data yang bisa dihitung.</div>') + "</div>";

    // pemeriksa lemah
    var L = r.lemah || [], nT = L.filter(function (x) { return x.masalah.some(function (q) { return q.berat === "tinggi"; }); }).length;
    h += '<div class="card"><h3>Pemeriksa Lemah <span class="bd ' + (L.length ? "w" : "d") + '">' + L.length + " isian</span>" + (nT ? ' <span class="bd x">' + nT + " berat</span>" : "") + '</h3><div class="note">Bagian yang akan mudah dipertanyakan atasan: tanpa angka, tanpa bukti, tanpa dampak, atau ukuran tanpa target/pembanding.</div>' +
      (L.length ? '<div class="ks-lemah">' + L.map(function (x) {
        return '<div class="ks-l"><div class="ks-lh"><span class="bd l">' + esc(NAMA_TIPE[x.tipe] || x.tipe) + "</span> <b>" + esc(x.judul) + "</b>" + (x.tanggal ? ' <span class="note">' + esc(tglId(x.tanggal)) + "</span>" : "") + (x.tampil === false ? ' <span class="bd l">draf</span>' : "") +
          '<button class="sm gh" data-ke="' + esc(x.tipe) + '">Perbaiki</button></div><ul>' + x.masalah.map(function (q) { return '<li class="ks-' + q.berat + '">' + esc(q.teks) + "</li>"; }).join("") + "</ul></div>";
      }).join("") + "</div>" : '<div class="ok" style="margin-top:6px"><b>Tidak ada isian yang lemah.</b></div>') + "</div>";

    // janji vs bukti
    var J = r.janji || {data: [], n: {}};
    h += '<div class="card"><h3>Janji vs Bukti</h3><div class="note">Janji yang ditautkan ke Ukuran dinilai otomatis dari pengukuran terakhir terhadap target. Tanpa ukuran, janji dianggap terbukti bila bukti manual atau foto diisi.</div>' +
      '<div style="margin:6px 0"><button class="sm" id="ks_jt">+ Tambah janji</button></div>' +
      (J.data.length ? '<div class="tw"><table><tr><th>Janji</th><th>Tenggat</th><th>Bukti</th><th style="min-width:140px">Progres</th><th>Status</th></tr>' + J.data.map(function (j) {
        var bukti = j.ukuran ? esc(j.ukuran.nama) + ": <b>" + fmt(j.ukuran.nilai, 2) + " " + esc(j.ukuran.satuan) + "</b>" + (j.ukuran.target != null ? " (target " + fmt(j.ukuran.target, 2) + ", awal " + fmt(j.ukuran.awal, 2) + ")" : " <span class='err'>(ukuran tanpa target)</span>") : (j.bukti ? esc(j.bukti) : "") + (j.foto ? " · " + j.foto + " foto" : "");
        var pr = j.progres != null ? '<div class="bar"><i style="width:' + j.progres + '%"></i></div><span class="note">' + j.progres + "%</span>" : '<span class="note">' + (j.sumber === "man" ? "bukti manual" : "-") + "</span>";
        return "<tr><td><b>" + esc(j.janji) + '</b><div class="note">' + esc(j.ukuranTeks) + "</div></td><td>" + esc(tglId(j.tenggat)) + "</td><td>" + (bukti || '<span class="note">belum ada</span>') + "</td><td>" + pr + '</td><td><span class="bd ' + (WST[j.status] || "l") + '">' + esc(j.status) + "</span>" + (j.sumber === "oto" ? '<div class="note">dari ukuran</div>' : "") + "</td></tr>";
      }).join("") + "</table></div>" : '<div class="note">Belum ada janji. Tulis target yang Anda janjikan selama probation, lalu tautkan ke Ukuran agar dinilai otomatis.</div>') + "</div>";

    // adopsi
    var A = r.adopsi;
    if (A && A.total) {
      var T = A.total;
      h += '<div class="card"><h3>Bukti adopsi pengguna</h3><div class="ks-tiles">' + [[T.pemohon, "pemohon BPB"], [T.dept, "departemen"], [T.bpb, "BPB lewat sistem"], [T.setuju, "persetujuan di sistem"], [T.penyetuju, "penyetuju"], [T.terima, "penerimaan dicatat"], [T.kembali, "pengembalian"], [T.bot, "pertanyaan bot admin"]].map(function (t) { return "<div><b>" + fmt(t[0], 0) + "</b><span>" + t[1] + "</span></div>"; }).join("") + "</div>" +
        '<div class="tw"><table><tr><th>Bulan</th><th class="n">BPB</th><th class="n">Pemohon</th><th class="n">Departemen</th><th class="n">Persetujuan</th><th class="n">Penerimaan</th><th class="n">Pengembalian</th><th class="n">Bot admin</th></tr>' +
        A.perBulan.map(function (b) { return "<tr><td>" + esc(bulanId(b.bulan)) + '</td><td class="n">' + fmt(b.bpb, 0) + '</td><td class="n">' + fmt(b.pemohon, 0) + '</td><td class="n">' + fmt(b.dept, 0) + '</td><td class="n">' + fmt(b.setuju, 0) + '</td><td class="n">' + fmt(b.terima, 0) + '</td><td class="n">' + fmt(b.kembali, 0) + '</td><td class="n">' + fmt(b.bot, 0) + "</td></tr>"; }).join("") + '</table></div><div class="note">Sumber: ' + esc(A.sumber) + "</div></div>";
    }
    box.innerHTML = h;

    var sa = box.querySelector("#ks_sa");
    if (sa) sa.onchange = function () { Array.prototype.forEach.call(box.querySelectorAll("input[data-sk]:not(:disabled)"), function (c) { c.checked = sa.checked; }); };
    var ss = box.querySelector("#ks_ss");
    if (ss) ss.onclick = async function () {
      var k = Array.prototype.map.call(box.querySelectorAll("input[data-sk]:checked"), function (c) { return c.getAttribute("data-sk"); });
      if (!k.length) { U.toast("Pilih minimal satu capaian.", true); return; }
      ss.disabled = true; var x = await U.call("perjCapaianSimpan", {kunci: k}); U.toast(x.msg, !x.ok); ss.disabled = false; if (x.ok) PJ.kesiapan(box, U);
    };
    Array.prototype.forEach.call(box.querySelectorAll("[data-ke]"), function (b) { b.onclick = function () { var t = b.getAttribute("data-ke"); if (t === "ukuran") U.ke("ukuran"); else U.ke("isian", t); }; });
    var jt = box.querySelector("#ks_jt"); if (jt) jt.onclick = function () { U.ke("isian", "janji"); };
  };

  PJ.mingguan = async function (box, U) {
    var esc = U.esc, fmt = U.fmt;
    function iso(d) { var p = function (n) { return String(n).padStart(2, "0"); }; return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()); }
    var now = new Date(), awal = new Date(now.getTime() - 6 * 864e5);
    box.innerHTML = '<div class="card"><h3>Ringkasan mingguan untuk atasan</h3><div class="note">Sistem menyusun isinya dari data minggu itu. <b>Email hanya terkirim saat Anda menekan Kirim</b>; tidak ada pengiriman otomatis.</div>' +
      '<div class="fr"><div><label>Dari</label><input class="t" type="date" id="mg_d" value="' + iso(awal) + '"></div><div><label>Sampai</label><input class="t" type="date" id="mg_s" value="' + iso(now) + '"></div><div class="lebar"><label>Penerima (pisahkan dengan koma, maks 5)</label><input class="t" id="mg_k" placeholder="nama@sctk.co.id"></div>' +
      '<div class="lebar"><label>Catatan pembuka (opsional)</label><textarea class="t" id="mg_c" placeholder="mis. Pak, berikut ringkasan pekerjaan gudang minggu ini."></textarea></div></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="gh" id="mg_p">Pratinjau</button><button id="mg_x">Kirim sekarang</button></div></div>' +
      '<div class="card"><h3>Pratinjau</h3><div id="mg_v" class="note">Tekan Pratinjau.</div></div><div class="card"><h3>Riwayat kirim</h3><div id="mg_r" class="note">-</div></div>';
    function riwayat(L) { box.querySelector("#mg_r").innerHTML = (L && L.length) ? '<div class="tw"><table><tr><th>Waktu</th><th>Periode</th><th>Kepada</th></tr>' + L.map(function (x) { return "<tr><td>" + esc(x.waktu) + "</td><td>" + esc(tglId(x.dari)) + " – " + esc(tglId(x.sampai)) + "</td><td>" + esc(x.kepada) + "</td></tr>"; }).join("") + "</table></div>" : '<span class="note">Belum pernah dikirim.</span>'; }
    function isi() { return {dari: box.querySelector("#mg_d").value, sampai: box.querySelector("#mg_s").value, catatan: box.querySelector("#mg_c").value, kepada: box.querySelector("#mg_k").value}; }
    var pertama = true;
    async function lihat() {
      var v = box.querySelector("#mg_v"); v.innerHTML = '<span class="note">Menyusun...</span>';
      var x = await U.call("perjMingguanLihat", isi()); if (!x || !x.ok) { v.innerHTML = '<span class="err">' + esc((x && x.msg) || "Gagal.") + "</span>"; return; }
      if (pertama && x.kepada && !box.querySelector("#mg_k").value) box.querySelector("#mg_k").value = x.kepada; pertama = false;
      v.innerHTML = '<div class="note" style="margin-bottom:6px">Subjek: <b>' + esc(x.subjek) + "</b> · " + fmt(x.data.bpb, 0) + " BPB, " + fmt(x.data.jurnal.length, 0) + ' pekerjaan dari Jurnal</div><iframe id="mg_if" title="Pratinjau email" style="width:100%;height:560px;border:1px solid var(--garis);border-radius:8px;background:#fff"></iframe>';
      v.querySelector("#mg_if").srcdoc = x.html; riwayat(x.kirim);
    }
    box.querySelector("#mg_p").onclick = lihat;
    box.querySelector("#mg_x").onclick = async function () {
      var b = isi(); if (!b.kepada.trim()) { U.toast("Isi email penerima.", true); return; }
      if (!confirm("Kirim ringkasan " + tglId(b.dari) + " – " + tglId(b.sampai) + " ke " + b.kepada + "?")) return;
      var bt = box.querySelector("#mg_x"); bt.disabled = true; var x = await U.call("perjMingguanKirim", b); bt.disabled = false; U.toast(x.msg, !x.ok); if (x.ok) riwayat(x.kirim);
    };
    lihat();
  };
})(window);
