/* T155: Laporan nilai pemakaian stok (tab Stok & Harga).
   Satu sumber data dengan presentasi Perjalanan Kerja (server nsHitung_): riwayat pengambilan dari Moka (sumber prioritas) beserta harganya,
   pembanding Moka vs Accurate, proyek yang memakai stok, dan pembelian yang dihindari (kebutuhan RAB yang dipenuhi dari stok).
   Barang tanpa harga tidak dihitung nol dan tidak ditebak. */
(function (g) {
  "use strict";
  var NS = g.NS = {}, R = null, F = {q: "", proyek: ""};
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]; }); }
  function n(v, d) { if (v == null || v === "" || isNaN(v)) return "-"; return Number(v).toLocaleString("id-ID", {maximumFractionDigits: d == null ? 2 : d}); }
  function rp(v) { return v == null ? '<span class="note">belum ada harga</span>' : "Rp " + Number(v).toLocaleString("id-ID", {maximumFractionDigits: 0}); }
  var BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
  function bln(ym) { var m = /^(\d{4})-(\d{2})/.exec(ym || ""); return m ? BLN[Number(m[2]) - 1] + " " + m[1] : ym; }
  function tgl(s) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ""); return m ? Number(m[3]) + " " + BLN[Number(m[2]) - 1] + " " + m[1] : (s || ""); }

  NS.kartu = function () {
    return '<div class="card" id="nsCard" style="border-color:var(--gold)"><b>Nilai pemakaian stok: Moka, Accurate, dan efisiensi proyek</b>' +
      '<div class="note">Riwayat pengambilan dari stok Moka (sumber prioritas) beserta harganya, pembanding Moka vs Accurate, proyek yang memakai stok, dan pembelian yang dihindari. Angka yang sama dipakai di presentasi Perjalanan Kerja.</div>' +
      '<div class="fr" style="align-items:flex-end;gap:8px;flex-wrap:wrap"><label>Dari <input type="date" id="nsDari"></label><label>Sampai <input type="date" id="nsSampai"></label><button class="sv" id="nsMuat">Tampilkan laporan</button></div><div id="nsIsi"></div></div>';
  };
  NS.pasang = function (api, toast) {
    var b = document.getElementById("nsMuat"); if (!b) return;
    b.onclick = async function () {
      var isi = document.getElementById("nsIsi"); b.disabled = true; isi.innerHTML = '<div class="note">Menghitung...</div>';
      var r; try { r = await api({action: "adminNilaiStok", dari: document.getElementById("nsDari").value, sampai: document.getElementById("nsSampai").value}); } catch (e) { r = {ok: false, msg: "Gagal terhubung ke server."}; }
      b.disabled = false;
      if (!r || !r.ok) { isi.innerHTML = '<p class="err">' + esc((r && r.msg) || "Gagal.") + "</p>"; return; }
      R = r; F = {q: "", proyek: ""}; gambar(api, toast);
    };
  };
  function kartu(judul, besar, kecil) { return '<div style="flex:1;min-width:180px;background:var(--pucat,#eaf4fb);border:1px solid var(--line,#cfd8de);border-radius:10px;padding:10px 12px"><div class="note" style="margin:0">' + judul + '</div><div style="font-size:22px;font-weight:800;margin:2px 0">' + besar + '</div><div class="note" style="margin:0">' + kecil + "</div></div>"; }
  function gambar(api, toast) {
    var r = R, isi = document.getElementById("nsIsi"), mo = r.moka, ac = r.accurate;
    var h = '<div class="note" style="margin:8px 0">Periode data: ' + esc(tgl(r.dari)) + " – " + esc(tgl(r.sampai)) + " · dihitung " + esc(r.dihitung) + (r.hargaTerkini ? " · " + r.hargaTerkini + " baris memakai harga terkini karena harga saat serah kosong" : "") + "</div>" +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px">' +
      kartu("Stok Moka dipakai (prioritas)", rp(mo.nilai), n(mo.qty) + " qty · " + mo.dokumen + " dokumen · " + mo.proyek + " proyek" + (mo.tanpaHarga ? " · " + mo.tanpaHarga + " baris tanpa harga" : "")) +
      kartu("Stok Accurate dipakai", rp(ac.nilai), n(ac.qty) + " qty · " + ac.dokumen + " dokumen" + (ac.tanpaHarga ? " · " + ac.tanpaHarga + " baris tanpa harga" : "")) +
      kartu("Porsi Moka dari nilai stok dipakai", r.persenMoka == null ? "-" : n(r.persenMoka, 1) + "%", "Moka dihabiskan lebih dulu (Sumber Otomatis: Moka lalu Accurate)") +
      kartu("Pembelian dihindari", rp(r.dihindari), r.proyekRab + " proyek ber-RAB dari " + r.proyekMemakai + " proyek yang memakai stok" + (r.bekas.qty ? " · Bekas " + n(r.bekas.qty) + " qty (tanpa nilai)" : "")) +
      "</div>";
    if (r.perBulan.length) h += '<details open><summary><b>Per bulan</b></summary><div style="overflow-x:auto"><table><thead><tr><th>Bulan</th><th class="nm">Moka (Rp)</th><th class="nm">Moka (qty)</th><th class="nm">Accurate (Rp)</th><th class="nm">Accurate (qty)</th></tr></thead><tbody>' +
      r.perBulan.map(function (b) { return "<tr><td>" + esc(bln(b.bulan)) + '</td><td class="nm">' + n(b.moka, 0) + '</td><td class="nm">' + n(b.mokaQty) + '</td><td class="nm">' + n(b.accurate, 0) + '</td><td class="nm">' + n(b.accQty) + "</td></tr>"; }).join("") + "</tbody></table></div></details>";
    if (r.proyek.length) h += '<details open><summary><b>Proyek yang memakai stok (' + r.proyek.length + ")</b></summary><div class=\"note\">Pembelian dihindari = kebutuhan RAB yang dipenuhi dari stok gudang (bersih dari pengembalian) × harga. Proyek tanpa Kebutuhan Proyek (RAB) tidak dihitung pembelian dihindarinya.</div><div style=\"overflow-x:auto\"><table><thead><tr><th>PPBJ / Proyek</th><th class=\"nm\">Moka (Rp)</th><th class=\"nm\">Accurate (Rp)</th><th class=\"nm\">Nilai RAB</th><th class=\"nm\">Dihindari</th><th class=\"nm\">% RAB dari stok</th></tr></thead><tbody>" +
      r.proyek.map(function (p) { return "<tr><td><b>" + esc(p.ppbj) + "</b><small>" + esc(p.nama || "") + (p.tanpaHarga ? " · " + p.tanpaHarga + " baris tanpa harga" : "") + '</small></td><td class="nm">' + n(p.moka, 0) + '</td><td class="nm">' + n(p.accurate, 0) + '</td><td class="nm">' + (p.adaRab ? n(p.nilaiRab, 0) + (p.tanpaHargaRab ? "<small>" + p.tanpaHargaRab + " kode RAB tanpa harga</small>" : "") : '<span class="note">tanpa RAB</span>') + '</td><td class="nm">' + (p.adaRab ? n(p.dihindari, 0) : "-") + '</td><td class="nm">' + (p.persen == null ? "-" : n(p.persen, 1) + "%") + "</td></tr>"; }).join("") + "</tbody></table></div></details>";
    if (r.top.length) h += '<details><summary><b>Barang Moka paling banyak diambil</b></summary><div style="overflow-x:auto"><table><thead><tr><th>Barang</th><th class="nm">Qty</th><th class="nm">Kali</th><th class="nm">Nilai</th></tr></thead><tbody>' +
      r.top.map(function (t) { return "<tr><td><b>" + esc(t.nama) + "</b><small>" + esc(t.kode) + '</small></td><td class="nm">' + n(t.qty) + '</td><td class="nm">' + t.kali + '</td><td class="nm">' + (t.tanpaHarga && !t.nilai ? '<span class="note">belum ada harga</span>' : n(t.nilai, 0)) + "</td></tr>"; }).join("") + "</tbody></table></div></details>";
    var pro = {}; r.riwayat.forEach(function (x) { if (x.ppbj) pro[x.ppbj] = x.proyek || x.ppbj; });
    h += '<details open><summary><b>Riwayat pengambilan dari Moka (' + r.riwayat.length + (r.riwayatTerpotong ? " dari " + r.riwayatTerpotong : "") + ")</b></summary>" +
      '<div class="fr" style="gap:8px;flex-wrap:wrap;align-items:center"><input id="nsQ" placeholder="Cari barang / dokumen" value="' + esc(F.q) + '" style="min-width:220px"><select id="nsP"><option value="">Semua proyek</option>' + Object.keys(pro).sort().map(function (k) { return "<option" + (F.proyek === k ? " selected" : "") + ' value="' + esc(k) + '">' + esc(k + (pro[k] !== k ? " - " + pro[k] : "")) + "</option>"; }).join("") + '</select><button class="gh" id="nsX">Unduh Excel (semua bagian)</button></div><div id="nsTab"></div></details>';
    isi.innerHTML = h; tabel();
    document.getElementById("nsQ").oninput = function () { F.q = this.value; tabel(); };
    document.getElementById("nsP").onchange = function () { F.proyek = this.value; tabel(); };
    document.getElementById("nsX").onclick = async function () {
      var x = r; if (r.riwayatTerpotong) { try { var y = await api({action: "adminNilaiStok", dari: document.getElementById("nsDari").value, sampai: document.getElementById("nsSampai").value, semua: true}); if (y && y.ok) x = y; } catch (e) { } }
      var sh = [{n: "Ringkasan", rows: [["Nilai pemakaian stok", tgl(x.dari) + " - " + tgl(x.sampai)], [], ["Ukuran", "Nilai (Rp)", "Qty", "Baris", "Baris tanpa harga", "Dokumen", "Proyek"],
        ["Stok Moka dipakai", x.moka.nilai, x.moka.qty, x.moka.baris, x.moka.tanpaHarga, x.moka.dokumen, x.moka.proyek], ["Stok Accurate dipakai", x.accurate.nilai, x.accurate.qty, x.accurate.baris, x.accurate.tanpaHarga, x.accurate.dokumen, x.accurate.proyek],
        ["Porsi Moka (%)", x.persenMoka], ["Pembelian dihindari", x.dihindari], ["Proyek memakai stok", x.proyekMemakai], ["Proyek ber-RAB", x.proyekRab], ["Bekas (qty, tanpa nilai)", "", x.bekas.qty], [],
        ["Catatan: barang tanpa harga tidak dihitung (tidak ditebak). Harga = harga satuan saat penyerahan; bila kosong dipakai harga terkini (" + x.hargaTerkini + " baris)."]], w: [34, 16, 12, 10, 16, 10, 10]},
        {n: "Riwayat Moka", rows: [["Tanggal", "Dokumen", "Kode", "Nama Barang", "Qty Moka", "Harga Satuan", "Nilai", "Harga", "No PPBJ", "Proyek", "Departemen"]].concat(x.riwayat.map(function (z) { return [z.tgl, z.doc, z.kode, z.nama, z.qty, z.harga == null ? "" : z.harga, z.nilai == null ? "" : z.nilai, z.harga == null ? "belum ada harga" : z.hargaTerkini ? "harga terkini" : "harga saat serah", z.ppbj, z.proyek, z.dept]; })), w: [12, 18, 14, 40, 10, 14, 14, 16, 18, 36, 18]},
        {n: "Per bulan", rows: [["Bulan", "Moka (Rp)", "Moka (qty)", "Accurate (Rp)", "Accurate (qty)"]].concat(x.perBulan.map(function (b) { return [b.bulan, b.moka, b.mokaQty, b.accurate, b.accQty]; })), w: [10, 16, 12, 16, 12]},
        {n: "Proyek", rows: [["No PPBJ", "Proyek", "Departemen", "Moka (Rp)", "Accurate (Rp)", "Nilai RAB", "Pembelian dihindari", "% RAB dari stok", "Baris tanpa harga"]].concat(x.proyek.map(function (p) { return [p.ppbj, p.nama, p.dept, p.moka, p.accurate, p.adaRab ? p.nilaiRab : "tanpa RAB", p.adaRab ? p.dihindari : "", p.persen == null ? "" : p.persen, p.tanpaHarga]; })), w: [18, 40, 16, 14, 14, 14, 18, 14, 16]}];
      if (typeof g.unduhBanyak === "function" && g.unduhBanyak("nilai_pemakaian_stok.xlsx", sh)) toast("Laporan siap diunduh.");
    };
  }
  function tabel() {
    var q = F.q.trim().toLowerCase(), L = R.riwayat.filter(function (x) { return (!F.proyek || x.ppbj === F.proyek) && (!q || (x.nama + " " + x.kode + " " + x.doc + " " + x.proyek).toLowerCase().indexOf(q) >= 0); });
    var tot = 0, th = 0; L.forEach(function (x) { if (x.nilai != null) tot += x.nilai; else th++; });
    document.getElementById("nsTab").innerHTML = '<div class="note" style="margin:6px 0">' + L.length + " baris · nilai " + rp(tot) + (th ? " · " + th + " baris tanpa harga (tidak dihitung)" : "") + "</div>" +
      '<div style="overflow-x:auto;max-height:520px;overflow-y:auto"><table><thead><tr><th>Tanggal</th><th>Dokumen</th><th>Barang</th><th class="nm">Qty</th><th class="nm">Harga</th><th class="nm">Nilai</th><th>Proyek</th></tr></thead><tbody>' +
      L.slice(0, 400).map(function (x) { return "<tr><td>" + esc(tgl(x.tgl)) + "</td><td>" + esc(x.doc) + "</td><td><b>" + esc(x.nama) + "</b><small>" + esc(x.kode) + '</small></td><td class="nm">' + n(x.qty) + '</td><td class="nm">' + (x.harga == null ? '<span class="note">-</span>' : n(x.harga, 0) + (x.hargaTerkini ? '<small title="harga saat serah kosong">terkini</small>' : "")) + '</td><td class="nm">' + (x.nilai == null ? '<span class="note">belum ada harga</span>' : n(x.nilai, 0)) + "</td><td>" + (x.ppbj ? "<b>" + esc(x.ppbj) + "</b><small>" + esc(x.proyek) + "</small>" : '<span class="note">tanpa proyek</span>') + "</td></tr>"; }).join("") +
      (L.length > 400 ? '<tr><td colspan="7" class="note">Menampilkan 400 baris pertama. Unduh Excel untuk semuanya.</td></tr>' : "") + "</tbody></table></div>";
  }
})(window);
