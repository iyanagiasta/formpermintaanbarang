/* Mengisi baris form permintaan dari tautan Tanya Gudang: index.html?dari=bot&isi=KODE:JUMLAH,KODE:JUMLAH
   Hanya mengisi nama barang dan jumlah; departemen, PPBJ, alasan, dan pengiriman tetap diisi dan dikirim oleh pemohon.
   Aman: bila ada yang gagal, form tetap terbuka seperti biasa. */
(function () {
  try {
    var q = new URLSearchParams(location.search), isi = q.get("isi");
    if (!isi || q.get("m") === "cetak") return;
    var daftar = isi.split(",").map(function (x) {
      var p = x.split(":");
      return {kode: String(p[0] || "").trim().toUpperCase(), qty: String(p[1] || "").replace(",", ".").replace(/[^0-9.]/g, "")};
    }).filter(function (x) { return x.kode; }).slice(0, 10);
    if (!daftar.length) return;
    var n = 0, t = setInterval(function () {
      n++;
      if (typeof DB !== "undefined" && DB.size && document.getElementById("rows")) { clearInterval(t); isiAwal(daftar); }
      else if (n > 80) clearInterval(t);
    }, 250);
  } catch (e) { /* abaikan */ }
  function isiAwal(d) {
    try {
      var byKode = {};
      DB.forEach(function (v) { var k = String(v.kode || "").trim().toUpperCase(); if (k && !byKode[k]) byKode[k] = v; });
      var ok = [], tidak = [];
      d.forEach(function (x) {
        var it = byKode[x.kode]; if (!it) { tidak.push(x.kode); return; }
        var baris = Array.prototype.slice.call(document.querySelectorAll("#rows tr")), tr = null;
        for (var i = 0; i < baris.length; i++) if (!baris[i].querySelector(".nama").value.trim()) { tr = baris[i]; break; }
        if (!tr) { addRow(); var all = document.querySelectorAll("#rows tr"); tr = all[all.length - 1]; }
        tr.querySelector(".nama").value = it.nama;
        lookup(tr);
        if (x.qty) tr.querySelector(".jml").value = x.qty;
        renderStok(tr);
        ok.push(it.nama);
      });
      var tb = document.getElementById("rows"), tabel = tb.closest("table") || tb, info = document.createElement("div");
      info.setAttribute("role", "status");
      info.style.cssText = "margin:8px 0;padding:10px 12px;border:1px solid #2b7bd6;border-radius:10px;background:rgba(43,123,214,.12);color:inherit;font:14px/1.45 system-ui,sans-serif";
      info.textContent = ok.length
        ? "Diisi dari Tanya Gudang: " + ok.join(", ") + ". Periksa jumlah, lalu isi departemen, nomor PPBJ, dan alasan sebelum mengirim."
        : "Barang dari Tanya Gudang tidak ditemukan di daftar. Pilih barangnya langsung di form.";
      if (tidak.length && ok.length) info.textContent += " Tidak ditemukan: " + tidak.join(", ") + ".";
      tabel.parentNode.insertBefore(info, tabel);
      try { history.replaceState(null, "", location.pathname + "?dari=" + encodeURIComponent(new URLSearchParams(location.search).get("dari") || "bot")); } catch (e) { /* abaikan */ }
    } catch (e) { /* abaikan */ }
  }
})();
