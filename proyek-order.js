/* STATUS ORDER di tab Proyek (Tambahan 47): lencana, rincian per barang, ubah manual + perkiraan tiba + catatan (admin), riwayat, pesan siap salin.
   Data berasal dari aksi adminProyekKurang (item.order, item.tertutup) dan ditulis lewat adminOrderStatusSimpan. Tidak mengirim email apa pun. */
(function (W) {
  "use strict";
  var KLS = {BELUM: "w", DIPESAN: "n", SEBAGIAN: "w", DATANG: "d", BATAL: "r"}, OPSI = ["", "Belum diorder", "Sedang diorder", "Sudah datang", "Batal order"];
  function E(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]; }); }
  function $(id) { return document.getElementById(id); }
  function tgl(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || "")); return m ? m[3] + "/" + m[2] + "/" + m[1] : ""; }
  function n(v) { return (typeof W.fmtN === "function") ? W.fmtN(v) : String(v); }
  function chip(o) {
    if (!o) return '<span class="note">-</span>';
    return '<span class="bd ' + (o.peringatan ? "b" : (KLS[o.kode] || "r")) + '">' + E(o.label) + '</span>' + (o.sumber === "manual" ? ' <small class="note">(manual)</small>' : "");
  }
  function pemasok(o) { var s = {}, a = []; (o.pos || []).forEach(function (p) { if (p.supplier && !s[p.supplier]) { s[p.supplier] = 1; a.push(p.supplier); } }); return a.join(", "); }
  function rinci(o) {
    if (!o) return "";
    var a = [];
    if (o.po) a.push("PO: " + E(o.po) + (pemasok(o) ? " (" + E(pemasok(o)) + ")" : ""));
    if (o.dipesan || o.diterima) a.push("Dipesan " + n(o.dipesan) + " &middot; diterima " + n(o.diterima));
    if (o.eta) a.push("Perkiraan tiba <b>" + tgl(o.eta) + "</b>");
    if (o.catatan) a.push(E(o.catatan));
    if (o.peringatan) a.push('<b style="color:var(--red,#a82424)">Belum ada PO ' + o.umur + ' hari</b>');
    return a.length ? '<small style="display:block;margin-top:3px">' + a.join(" &middot; ") + "</small>" : "";
  }
  function modal(html) {
    var old = $("pomod"); if (old) old.remove();
    var o = document.createElement("div"); o.id = "pomod";
    o.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9998;display:flex;align-items:flex-start;justify-content:center;padding:10px;overflow:auto";
    o.innerHTML = '<div class="card" style="max-width:640px;width:100%;margin:auto;background:var(--card,#fff);color:var(--ink,inherit)">' + html + "</div>";
    document.body.appendChild(o); return o;
  }
  function tutup() { var o = $("pomod"); if (o) o.remove(); }
  /** Dialog ubah status order. daftar = [{kode,nama,order,rab}] (satu atau banyak barang dari satu PPBJ). sesudah = fungsi dipanggil setelah tersimpan. */
  function ubah(ppbj, daftar, sesudah) {
    if (!daftar || !daftar.length) { W.toast("Pilih barang dulu.", true); return; }
    var satu = daftar.length === 1, d0 = daftar[0], o = d0.order || null;
    var info = "";
    if (satu) {
      info = '<div class="note" style="margin:6px 0"><b>' + E(d0.nama || d0.kode) + "</b> (" + E(d0.kode) + ") &middot; kebutuhan " + n(d0.rab) + "<br>Status sistem: <b>" + (o ? E(o.label) : "belum ada info order") + "</b>" + (o && o.sumber === "manual" ? " (sedang ditimpa manual; sistem mengambil alih lagi bila ada pesanan/penerimaan baru)" : "") + "</div>";
      if (o && o.pos && o.pos.length) info += '<div class="note" style="margin:4px 0">' + o.pos.map(function (p) { return E(p.nomor || "") + " " + (p.po ? "PO " + E(p.po) : "<i>tanpa No PO</i>") + " &middot; " + E(p.supplier || "") + " &middot; pesan " + n(p.qBeli) + ", terima " + n(p.qTerima); }).join("<br>") + "</div>";
    } else info = '<div class="note" style="margin:6px 0">' + daftar.length + " barang terpilih: " + daftar.slice(0, 6).map(function (x) { return E(x.nama || x.kode); }).join(", ") + (daftar.length > 6 ? ", ..." : "") + ". Perkiraan tiba dan catatan yang dikosongkan tidak mengubah isi masing-masing barang.</div>";
    var sm = o && o.sumber === "manual" ? (function () { var s = ""; OPSI.forEach(function (x) { if (x && (o.kode === ({"Belum diorder": "BELUM", "Sedang diorder": "DIPESAN", "Sudah datang": "DATANG", "Batal order": "BATAL"})[x])) s = x; }); return s; })() : "";
    var mo = modal('<b>Ubah status order: ' + E(ppbj) + "</b>" + info +
      '<div class="fr"><label class="note" style="margin:0">Status<br><select id="po-st">' + OPSI.map(function (x) { return '<option value="' + E(x) + '"' + (x === sm ? " selected" : "") + ">" + (x || "Ikuti sistem (otomatis)") + "</option>"; }).join("") + "</select></label>" +
      '<label class="note" style="margin:0">Perkiraan tiba<br><input type="date" id="po-eta" value="' + E(satu && o ? o.eta : "") + '"></label></div>' +
      '<label class="note" style="display:block;margin:8px 0 0">Catatan<br><input type="text" id="po-cat" maxlength="200" style="width:100%" value="' + E(satu && o ? o.catatan : "") + '" placeholder="mis. dipesan lewat Ace, kirim 3 hari"></label>' +
      '<div class="note" style="margin:8px 0">Status manual berlaku sampai sistem mencatat pesanan atau penerimaan baru untuk barang ini. Pilih <b>Ikuti sistem</b> untuk mengembalikan ke otomatis.</div>' +
      '<div class="fr"><button class="sv" id="po-ok">Simpan</button><button class="gh" id="po-x">Batal</button>' + (satu ? '<button class="gh" id="po-rw">Riwayat perubahan</button>' : "") + '</div><div id="po-info" class="note" style="margin-top:8px"></div>');
    $("po-x").onclick = tutup;
    if (satu) $("po-rw").onclick = async function () {
      $("po-info").textContent = "Memuat riwayat...";
      try { var r = await W.api({action: "adminOrderRiwayat", ppbj: ppbj, kode: d0.kode}); if (!r.ok) { $("po-info").textContent = r.msg || "Gagal."; return; }
        $("po-info").innerHTML = r.data.length ? r.data.map(function (h) { return E(h.waktu) + " &middot; " + E(h.oleh) + ": " + E(h.dari || "-") + " &rarr; <b>" + E(h.ke) + "</b>" + (h.eta ? " &middot; tiba " + E(h.eta) : "") + (h.catatan ? " &middot; " + E(h.catatan) : ""); }).join("<br>") : "Belum ada perubahan manual."; }
      catch (e) { $("po-info").textContent = "Gagal terhubung."; }
    };
    $("po-ok").onclick = async function () {
      var st = $("po-st").value, eta = $("po-eta").value.trim(), cat = $("po-cat").value.trim(), b = $("po-ok"); b.disabled = true;
      var items = daftar.map(function (x) {
        var oo = x.order || {};
        return {kode: x.kode, status: st, eta: satu ? eta : (eta || oo.eta || ""), catatan: satu ? cat : (cat || oo.catatan || "")};
      });
      try {
        var r = await W.api({action: "adminOrderStatusSimpan", ppbj: ppbj, items: items});
        if (!r.ok) { W.toast(r.msg || "Gagal menyimpan.", true); b.disabled = false; return; }
        tutup(); W.toast(r.msg || "Tersimpan.");
        try { if (typeof W.muatKurang === "function") await W.muatKurang(); } catch (e) { /* abaikan */ }
        if (typeof sesudah === "function") sesudah();
      } catch (e) { W.toast("Gagal terhubung ke server.", true); b.disabled = false; }
    };
  }
  function salin(teks, tombol) {
    function cadangan() { var t = $("po-teks"); if (t) { t.focus(); t.select(); try { document.execCommand("copy"); W.toast("Pesan disalin."); } catch (e) { W.toast("Tekan Ctrl+C untuk menyalin.", true); } } }
    try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(teks).then(function () { W.toast("Pesan disalin."); }, cadangan); return; } } catch (e) { /* lanjut */ }
    cadangan();
  }
  /** Pesan siap salin untuk PIC (tidak dikirim otomatis). jenis: "datang" atau "semua". */
  async function pesan(ppbj, jenis) {
    try {
      var r = await W.api({action: "adminOrderPesan", ppbj: ppbj, jenis: jenis});
      if (!r.ok) { W.toast(r.msg || "Tidak ada pesan.", true); return; }
      modal('<b>Pesan siap salin (' + (jenis === "datang" ? "barang sudah datang" : "status order") + ')</b><div class="note" style="margin:6px 0">Salin lalu tempel ke WhatsApp atau email. Sistem tidak mengirim apa pun sendiri.</div>' +
        '<textarea id="po-teks" readonly style="width:100%;min-height:240px;font:13px/1.45 inherit;padding:8px">' + E(r.teks) + '</textarea><div class="fr" style="margin-top:8px"><button class="sv" id="po-cp">Salin pesan</button><button class="gh" id="po-x2">Tutup</button></div>');
      $("po-x2").onclick = tutup; $("po-cp").onclick = function () { salin(r.teks); };
    } catch (e) { W.toast("Gagal terhubung ke server.", true); }
  }
  /** Rincian barang per proyek untuk saringan order (tabel lengkap di bawah baris proyek). f: obelum | odipesan | operingatan */
  function cocokItem(x, f) {
    var o = x.order; if (!o || x.status === "Terpenuhi" && o.kode !== "DATANG") return false;
    if (f === "obelum") return o.kode === "BELUM";
    if (f === "odipesan") return o.kode === "DIPESAN" || o.kode === "SEBAGIAN";
    if (f === "operingatan") return !!o.peringatan;
    return false;
  }
  function detailProyek(P, f) {
    var L = (P.items || []).filter(function (x) { return cocokItem(x, f); });
    if (!L.length) return "";
    return '<table style="margin:4px 0 8px"><thead><tr><th>Barang</th><th class="nm">Kebutuhan</th><th class="nm">Kurang</th><th>Status order</th><th>Pesanan / perkiraan tiba</th><th></th></tr></thead><tbody>' +
      L.map(function (x) {
        var o = x.order;
        return "<tr><td><b>" + E(x.nama || x.kode) + "</b><small>" + E(x.kode) + (x.satuan ? " &middot; " + E(x.satuan) : "") + '</small></td><td class="nm">' + n(x.rab) + '</td><td class="nm">' + (x.kurangSendiri ? n(x.kurangSendiri) + (x.tertutup ? " (sudah dipesan)" : "") : "-") + "</td><td>" + chip(o) + "</td><td>" + (rinci(o) || '<small class="note">-</small>') + '</td><td><button class="gh" data-poub="' + E(P.ppbj) + "|" + E(x.kode) + '">Ubah</button></td></tr>';
      }).join("") + "</tbody></table>";
  }
  W.PO = {chip: chip, rinci: rinci, ubah: ubah, pesan: pesan, detailProyek: detailProyek, cocokItem: cocokItem, tgl: tgl};
})(window);
