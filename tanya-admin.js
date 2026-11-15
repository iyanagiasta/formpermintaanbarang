/* tanya-admin.js (T133, Paket F): Tanya Gudang MODE ADMIN (bot pintar khusus admin).
   Aktif otomatis bila kode yang dipakai masuk adalah password admin (tanpa tombol; T135).
   Semua pertanyaan dikirim ke server (aksi adminBotTanya). Jawaban berupa blok: teks, kartu, tabel (lihat semua + unduh Excel),
   grafik kecil, pilihan (bot belajar), dan aksi yang wajib dikonfirmasi sebelum mengubah data. */
(function () {
  "use strict";
  var T = function () { return window.__tanya || {}; };
  var A = {aktif: false, pin: "", K: {kodes: [], nama: [], ppbj: ""}, lastTeks: "", sibuk: false, versi: "", H: []};   // H = riwayat 6 tanya-jawab (ingatan percakapan)
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]; }); }
  function tebal(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>"); }
  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) { return null; } }
  function fN(v) { if (v === null || v === undefined || v === "") return ""; var n = Number(v); if (!isFinite(n)) return esc(v); return n.toLocaleString("id-ID", {maximumFractionDigits: 3}); }
  function fRp(v) { if (v === null || v === undefined || v === "") return "-"; var n = Number(v); if (!isFinite(n)) return esc(v); return "Rp " + Math.round(n).toLocaleString("id-ID"); }
  function sel(v, f) { return f === "n" ? fN(v) : f === "rp" ? fRp(v) : esc(v); }
  function api(b) { var f = T().api; if (!f) return Promise.reject(new Error("tanya.js belum siap")); if (b.kode === undefined) b.kode = ""; return f(b); }
  function add(cls, html) { var f = T().add; return f ? f(cls, html) : null; }
  function chips(list, fn) { var f = T().chips; return f ? f(list, fn) : document.createElement("div"); }
  function bawah() { var c = document.getElementById("chat"); if (c) c.scrollTop = c.scrollHeight; }

  /* ---------- Excel (SheetJS dimuat saat dibutuhkan) ---------- */
  var xlsxP = null;
  function muatXlsx() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    if (xlsxP) return xlsxP;
    xlsxP = new Promise(function (ok, gagal) { var s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"; s.onload = function () { ok(window.XLSX); }; s.onerror = function () { xlsxP = null; gagal(new Error("Pustaka Excel gagal dimuat")); }; document.head.appendChild(s); });
    return xlsxP;
  }
  function hariIni() { var d = new Date(), z = function (n) { return (n < 10 ? "0" : "") + n; }; return d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate()); }
  function unduh(b, tombol) {
    tombol.disabled = true; var t0 = tombol.textContent; tombol.textContent = "Menyiapkan...";
    muatXlsx().then(function (X) {
      var aoa = [b.kolom.map(function (k) { return k.n; })].concat(b.baris.map(function (r) { return r.map(function (v) { return v === null || v === undefined ? "" : v; }); }));
      var ws = X.utils.aoa_to_sheet(aoa); ws["!cols"] = b.kolom.map(function (k, i) { var m = String(k.n).length; for (var j = 0; j < Math.min(b.baris.length, 200); j++) { var L = String(b.baris[j][i] == null ? "" : b.baris[j][i]).length; if (L > m) m = L; } return {wch: Math.min(60, Math.max(8, m + 2))}; });
      var wb = X.utils.book_new(); X.utils.book_append_sheet(wb, ws, String(b.judul || "Data").replace(/[\\\/?*\[\]:]/g, " ").slice(0, 31));
      var nama = window.NB && NB.buat ? NB.buat("xlsx", "Tanya Gudang", b.unduh || b.judul, hariIni()) : ("Tanya Gudang - " + (b.judul || "data") + ".xlsx");
      X.writeFile(wb, nama);
      tombol.textContent = "Terunduh"; setTimeout(function () { tombol.textContent = t0; tombol.disabled = false; }, 1500);
    }).catch(function (e) { tombol.textContent = "Gagal: " + e.message; tombol.disabled = false; });
  }

  /* ---------- gambar blok ---------- */
  function blokKartu(b) {
    var h = '<div class="tga-k"><div class="tq-nm">' + esc(b.judul) + '</div>' + (b.sub ? '<div class="tq-sm">' + esc(b.sub) + '</div>' : "");
    (b.baris || []).forEach(function (r) {
      var nada = r[2] === "merah" ? " tq-bad" : r[2] === "kuning" ? " tq-warn" : r[2] === "hijau" ? " tq-ok" : "";
      if (r[3]) h += '<div class="tga-r tga-rr' + (r[0] ? "" : " tga-lanjut") + '" role="button" tabindex="0" title="Klik untuk melihat asal angka"><span>' + esc(r[0]) + ' <i class="tga-i">asal angka</i></span><b class="' + nada + '">' + esc(r[1]) + '</b></div><div class="tga-rinci" hidden>' + tebal(r[3]).replace(/\n/g, "<br>") + "</div>";
      else h += '<div class="tga-r' + (r[0] ? "" : " tga-lanjut") + '"><span>' + esc(r[0]) + '</span><b class="' + nada + '">' + esc(r[1]) + "</b></div>";
    });
    return h + (b.catatan ? '<p class="tq-sm tga-cat">' + esc(b.catatan) + "</p>" : "") + "</div>";
  }
  function isiTabel(b, n) {
    var h = '<table class="tga-t"><thead><tr>' + b.kolom.map(function (k) { return "<th" + (k.f ? ' class="nm"' : "") + ">" + esc(k.n) + "</th>"; }).join("") + "</tr></thead><tbody>";
    b.baris.slice(0, n).forEach(function (r) { h += "<tr>" + r.map(function (v, i) { var k = b.kolom[i] || {}; return "<td" + (k.f ? ' class="nm"' : "") + ' data-l="' + esc(k.n) + '">' + sel(v, k.f) + "</td>"; }).join("") + "</tr>"; });
    return h + "</tbody></table>";
  }
  function blokTabel(b, wadah) {
    var d = document.createElement("div"); d.className = "tga-tb";
    var n = b.tutup ? 0 : Math.min(b.tampil || 15, b.baris.length);
    d.innerHTML = '<div class="tga-tj"><b>' + esc(b.judul) + '</b> <span class="tq-sm">' + b.total + " baris</span></div>" + '<div class="tga-sc"></div>' +
      (b.catatan ? '<p class="tq-sm tga-cat">' + esc(b.catatan) + "</p>" : "") + '<div class="tga-bt"></div>';
    var sc = d.querySelector(".tga-sc"), bt = d.querySelector(".tga-bt");
    function gambar() { sc.innerHTML = n ? isiTabel(b, n) : ""; bt.innerHTML = "";
      if (n < b.baris.length) { var lb = document.createElement("button"); lb.type = "button"; lb.className = "tq-chip"; lb.textContent = n ? "Lihat semua (" + b.baris.length + ")" : "Tampilkan (" + b.baris.length + " baris)"; lb.onclick = function () { n = Math.min(b.baris.length, 400); gambar(); bawah(); }; bt.appendChild(lb); }
      if (b.baris.length) { var ub = document.createElement("button"); ub.type = "button"; ub.className = "tq-chip"; ub.textContent = "Unduh Excel"; ub.onclick = function () { unduh(b, ub); }; bt.appendChild(ub); }
      if (n >= 400 && b.baris.length > 400) bt.insertAdjacentHTML("beforeend", '<span class="tq-sm">Tampil 400 baris; semua baris ada di Excel.</span>');
      if (b.total > b.baris.length) bt.insertAdjacentHTML("beforeend", '<span class="tq-sm">Dibatasi ' + b.baris.length + " baris dari " + b.total + ".</span>");
    }
    gambar(); wadah.appendChild(d);
  }
  function blokGrafik(b) {
    var mx = 0; (b.nilai || []).forEach(function (v) { if (Math.abs(v) > mx) mx = Math.abs(v); });
    var h = '<div class="tga-g"><div class="tq-sm"><b>' + esc(b.judul) + "</b></div>";
    (b.label || []).forEach(function (l, i) {
      var v = b.nilai[i] || 0, w = mx ? Math.max(1, Math.round(Math.abs(v) / mx * 100)) : 0;
      h += '<div class="tga-gr"><span class="tga-gl" title="' + esc(l) + '">' + esc(l) + '</span><span class="tga-gb"><i style="width:' + w + '%"></i></span><span class="tga-gv">' + (b.satuan === "Rp" ? fRp(v) : fN(v) + (b.satuan ? " " + esc(b.satuan) : "")) + "</span></div>";
    });
    return h + "</div>";
  }
  function blokAksi(b, wadah) {
    var d = document.createElement("div"); d.className = "tga-aksi";
    d.innerHTML = '<div class="tq-nm">' + esc(b.judul) + "</div><ul>" + (b.rincian || []).filter(Boolean).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + '</ul><div class="tga-ab"><button type="button" class="tga-ya">Ya, jalankan</button><button type="button" class="gh tga-batal">Batal</button></div><p class="tq-sm tga-hasil"></p>';
    var ya = d.querySelector(".tga-ya"), no = d.querySelector(".tga-batal"), hs = d.querySelector(".tga-hasil");
    no.onclick = function () { ya.disabled = no.disabled = true; hs.textContent = "Dibatalkan. Tidak ada yang diubah."; };
    ya.onclick = function () {
      ya.disabled = no.disabled = true; hs.textContent = "Menjalankan...";
      api({action: "adminBotJalankan", pin: A.pin, token: b.token}).then(function (r) {
        if (!r || !r.ok) { hs.textContent = (r && r.msg) || "Gagal."; return; }
        hs.textContent = r.berhasil ? "Sudah dijalankan." : "Tidak berhasil.";
        if (r.berhasil) { RK = null; setTimeout(ambilRk, 500); }   // T140: data berubah: ringkasan lama tidak dipakai lagi
        var m = add("tq-b tga", ""); if (m) { gambarBlok(r.blok || [], m); if ((r.saran || []).length) m.appendChild(chips(r.saran, function (x) { tanya(x.tanya); })); }
        bawah();
      }).catch(function () { hs.textContent = "Gagal terhubung ke server. Coba lagi: tanyakan ulang perintahnya."; });
    };
    wadah.appendChild(d);
  }
  function blokPilih(b, wadah) {
    var d = document.createElement("div"); d.className = "tga-pl"; d.innerHTML = "<p>" + tebal(b.judul) + "</p>";
    d.appendChild(chips(b.opsi.map(function (o) { return {label: o.label, o: o}; }), function (x) {
      var o = x.o;
      if (o.paksa) { tanya(o.tanya || A.lastTeks, {paksa: o.paksa, label: "→ " + o.label}); return; }
      if (o.tanya) { tanya(o.tanya); return; }
      if (o.kode) {
        api({action: "adminBotPilih", pin: A.pin, frasa: o.frasa, kode: o.kode}).catch(function () {});
        if (pilihInstan(o.kode)) return;
        var p = {}; p[o.frasa] = o.kode; tanya(A.lastTeks, {pilih: p, label: "→ " + o.label});
      }
    }));
    wadah.appendChild(d);
  }
  function blokUsulan(b, wadah) {
    var d = document.createElement("div"); d.className = "tga-us";
    (b.item || []).forEach(function (u) {
      var r = document.createElement("div"); r.className = "tga-usr";
      r.innerHTML = '<div><b>' + (u.jenis === "kamus" ? "Kamus" : "Contoh") + ':</b> "' + esc(u.dari) + '" → <b>' + esc(u.jenis === "contoh" ? labelAlat(u.ke) : u.ke) + "</b>" + (u.alasan ? '<div class="tq-sm">' + esc(u.alasan) + "</div>" : "") + (u.contoh && u.contoh !== u.dari ? '<div class="tq-sm">Dari pertanyaan: ' + esc(u.contoh) + "</div>" : "") + '</div><div class="tga-ab"><button type="button" class="tga-ya">Setujui</button><button type="button" class="gh tga-batal">Tolak</button></div><p class="tq-sm tga-hasil"></p>';
      var ya = r.querySelector(".tga-ya"), no = r.querySelector(".tga-batal"), hs = r.querySelector(".tga-hasil");
      function putus(setuju) { ya.disabled = no.disabled = true; hs.textContent = "Menyimpan...";
        api({action: "adminBotUsulanPutus", pin: A.pin, id: u.id, setuju: setuju ? 1 : 0}).then(function (x) { hs.textContent = (x && x.msg) || (x && x.ok ? "Tersimpan." : "Gagal."); if (!(x && x.ok)) ya.disabled = no.disabled = false; else r.classList.add("tga-done"); }).catch(function () { hs.textContent = "Gagal terhubung."; ya.disabled = no.disabled = false; }); }
      ya.onclick = function () { putus(true); }; no.onclick = function () { putus(false); };
      d.appendChild(r);
    });
    wadah.appendChild(d);
  }
  var LABEL_ALAT = {stok: "Cek stok", jelaskan: "Penjelasan angka", cukup: "Cukup untuk berapa proyek", order: "Status pesanan", buffer: "Buffer menipis", daftar: "Daftar cepat", proyek: "Sisa jatah proyek", risiko: "Proyek berisiko", simulasi: "Simulasi", mutasi: "Laporan keluar/masuk", kartu: "Riwayat barang", selisih: "Telusur selisih", sejenis: "Barang sejenis", seri: "Nomor seri", bpb: "Lacak dokumen", ambil: "Daftar ambil", beli: "Daftar beli", mati: "Barang tidur", stoksemua: "Semua stok", briefing: "Briefing", aneh: "Hal janggal", panduan: "Panduan", bantuan: "Bantuan"};
  function labelAlat(a) { return LABEL_ALAT[a] || a; }
  function pasangRinci(m) {
    m.querySelectorAll(".tga-rr").forEach(function (row) {
      if (row._ok) return; row._ok = 1;
      var f = function () { var d = row.nextElementSibling; if (d && d.classList.contains("tga-rinci")) { d.hidden = !d.hidden; row.classList.toggle("tga-buka", !d.hidden); } };
      row.onclick = f; row.onkeydown = function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); f(); } };
    });
  }
  function gambarBlok(L, m) {
    L.forEach(function (b) {
      if (b.t === "p") { if (b.s) m.insertAdjacentHTML("beforeend", "<p>" + tebal(b.s) + "</p>"); }
      else if (b.t === "kartu") m.insertAdjacentHTML("beforeend", blokKartu(b));
      else if (b.t === "tabel") blokTabel(b, m);
      else if (b.t === "grafik") { if ((b.label || []).length) m.insertAdjacentHTML("beforeend", blokGrafik(b)); }
      else if (b.t === "pilih") blokPilih(b, m);
      else if (b.t === "aksi") blokAksi(b, m);
      else if (b.t === "judul") m.insertAdjacentHTML("beforeend", '<h4 class="tga-jd">' + esc(b.s) + "</h4>");
      else if (b.t === "simpul") m.insertAdjacentHTML("beforeend", '<div class="tga-simpul"><div class="tq-sm"><b>Kesimpulan AI</b> · tafsiran dari angka di atas, bukan angka baru</div><p>' + tebal(b.s) + "</p></div>");
      else if (b.t === "usulan") blokUsulan(b, m);
      else if (b.t === "daftar") m.insertAdjacentHTML("beforeend", (b.judul ? "<p><b>" + esc(b.judul) + "</b></p>" : "") + '<ul class="tga-ul">' + (b.item || []).map(function (x) { return "<li>" + tebal(x) + "</li>"; }).join("") + "</ul>");
    });
    pasangRinci(m);
  }

  /* ---------- bertanya ---------- */
  function layar() { return (window.innerWidth || 1000) < 700 ? "hp" : "pc"; }
  /* ---------- T140: ringkasan (jawaban instan di browser) ---------- */
  var RK = null, RK_TIMER = null, RK_SEDANG = false;
  function rkSegar() { return !!(RK && RK.kartu && (RK.umur + (Date.now() - RK.terima)) < RK.ttl); }
  function ambilRk() {
    if (!A.aktif || RK_SEDANG) return; RK_SEDANG = true;
    api({action: "adminBotRingkas", pin: A.pin, t: RK && rkSegar() ? RK.t : 0}).then(function (r) {
      RK_SEDANG = false; if (!r || !r.ok) return;
      if (r.sama && RK) { RK.umur = r.umur || 0; RK.terima = Date.now(); RK.ttl = r.ttl || RK.ttl; return; }
      if (r.kartu) RK = {t: r.t, umur: r.umur || 0, terima: Date.now(), ttl: r.ttl || 600000, kartu: r.kartu, siap: r.siap || {}, ring: r.ring || {}, rakIsi: r.rakIsi || {}, bel: r.bel || {}, proy: r.proy || {}};
      else if (r.kosong) RK = null;
    }).catch(function () { RK_SEDANG = false; });
  }
  function rkMulai() {
    ambilRk();
    if (RK_TIMER) clearInterval(RK_TIMER);
    RK_TIMER = setInterval(function () { if (A.aktif && document.visibilityState !== "hidden") ambilRk(); }, 180000);   // segarkan tiap 3 menit selama halaman terbuka
  }
  function rkJam() { var d = new Date(RK.t), z = function (n) { return (n < 10 ? "0" : "") + n; }; return z(d.getHours()) + ":" + z(d.getMinutes()); }
  /* ---------- T141: kata kunci yang langsung dikenali (jawaban instan dari ringkasan) ---------- */
  function nr(s) { return String(s || "").toLowerCase().replace(/[?!.,;]+$/g, "").replace(/\s+/g, " ").trim(); }
  /** Sama dengan CARI.norm di server (BotAdmin memakainya sebagai kunci "bot belajar"). */
  function frasaSrv(s) {
    s = String(s == null ? "" : s).toLowerCase();
    try { s = s.normalize("NFD").replace(/[̀-ͯ]/g, ""); } catch (e) { /* lanjut */ }
    s = s.replace(/["“”″]/g, " inch ").replace(/(\d)\s*[x×*]\s*(?=\d)/g, "$1 ").replace(/(\d),(\d)/g, "$1.$2");
    s = s.replace(/(\d)([a-z])/g, "$1 $2").replace(/([a-z])(\d)/g, "$1 $2");
    return s.replace(/[^a-z0-9.]+/g, " ").replace(/(^|\s)\.+|\.+(\s|$)/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  }
  // Satu kata kunci = satu jawaban siap yang disiapkan server bersama ringkasan (urutan penting: yang khusus lebih dulu).
  var LK_SIAP = [
    ["briefing", /^(briefing|brifing|briefing hari ini|ringkasan pagi|ringkasan hari ini|rangkuman hari ini|prioritas hari ini|kondisi gudang( hari ini)?|apa (saja )?yang (harus|perlu) (dikerjakan|diurus|diperhatikan) hari ini)$/],
    ["beli", /^(daftar beli|daftar belanja|daftar pembelian|apa saja yang (harus|perlu) dibeli|barang yang (harus|perlu) dibeli|perlu dibeli apa saja|yang (harus|perlu) dibeli|(harus|perlu) beli apa|beli apa( saja)?)$/],
    ["buffer", /^(buffer (menipis|kurang|habis|kritis)|stok buffer (menipis|kurang)|buffer yang (menipis|kurang))$/],
    ["aneh", /^(ada yang aneh|ada yang aneh hari ini|ada yang janggal|ada yang janggal hari ini|hal aneh hari ini)$/],
    ["telat", /^((pesanan|order|po|barang) (yang )?(telat|terlambat|molor|lewat eta|nyangkut)|(yang )?(telat|terlambat) datang|ada (yang )?(telat|terlambat)|barang nyangkut)$/],
    ["belum", /^(((barang|material|yang)( yang)? )?belum (di ?order|dipesan|ada po)( apa saja)?)$/],
    ["jalan", /^((order|pesanan|po)( yang)? (belum datang|berjalan|sedang jalan|masih ditunggu|sedang diorder)|(barang|apa) yang (masih )?ditunggu|daftar (order|pesanan))$/],
    ["segera", /^(((order|pesanan|barang|kiriman)( yang)? )?(akan datang|segera datang|datang (minggu ini|besok|hari ini))( minggu ini| segera)?|kiriman minggu ini)$/],
    ["bufsemua", /^((cek|lihat|tampilkan) )?((semua|seluruh|isi|material|daftar|barang|stok) )*buffer( sto(c)?k)?( (semua|lengkap|keseluruhan))?$/],
    ["risiko", /^(((daftar )?proyek (aktif|berjalan|yang aktif|apa saja yang aktif))|proyek (mana )?(yang )?(paling )?(berisiko|beresiko|kritis|bermasalah|rawan)|proyek berisiko|proyek yang (berisiko|bermasalah))$/],
    ["habis", /^((cek|lihat) )?((barang|stok|material) )?(yang )?(habis|nol|kosong)( semua)?$/],
    ["minus", /^((cek|lihat) )?((barang|stok) )?(yang )?(stok )?(minus|negatif)$/],
    ["tanparab", /^((proyek|ppbj) )?(yang )?(tanpa rab|rab (kosong|belum( ada| diisi)?)|belum (ada |diisi )?rab)( apa saja)?$/]];
  // kata yang menandakan pertanyaan lebih dari sekadar cek barang: dijawab server
  var LK_BUKAN = /\b(kenapa|mengapa|knp|napa|cukup|proyek|projek|ppbj|riwayat|mutasi|keluar|masuk|bulan|minggu|hari|kemarin|tanggal|simulasi|kalau|jika|andai|ubah|tandai|set|ganti|hapus|email|kirim|harga|rp|nilai|seri|bpb|lacak|bandingkan|banding|vs|selisih|ukuran|mirip|sejenis|pengganti|buat|tolong|semua|daftar|apa|yang|terlambat|telat|jelaskan|rinci|mana|untuk|berapa proyek|jatah|alokasi|kurang|lebih|beli|supplier|vendor|bekas|rekap|laporan|total|paling|terbanyak|ranking|top)\b/;
  var PPBJ_RE = /\b\d{1,4}[a-z]?\s*\/\s*[a-z\-]{2,8}(?:\s*\/\s*[a-z]{2,6})?\s*\/\s*[ivx]{1,4}\s*\/\s*\d{4}[a-z]?\b/i;
  function klon(o) { return JSON.parse(JSON.stringify(o)); }
  function nKey(s) { return String(s || "").replace(/\s+/g, "").toUpperCase(); }
  function siapLokal(low) {
    for (var i = 0; i < LK_SIAP.length; i++) if (LK_SIAP[i][1].test(low)) {
      var x = RK.siap[LK_SIAP[i][0]]; if (!x || !(x.blok || []).length) return null;
      return {pahami: x.pahami, alat: x.alat, blok: klon(x.blok), saran: x.saran || [], konteks: null, lokal: {jenis: "siap", kunci: LK_SIAP[i][0]}, simpul: !!x.simpul};
    }
    return null;
  }
  /** "cek material proyek X", "cek PPBJ 011/PB/XI/2026", "proyek SL Mawar": jawaban per proyek yang disiapkan server. */
  function proyekLokal(low) {
    var P = RK.proy; if (!P) return null;
    var idx = {}, ada = false; Object.keys(P).forEach(function (k) { idx[nKey(P[k].ppbj)] = P[k]; ada = true; }); if (!ada) return null;
    var m = PPBJ_RE.exec(low), e = null, cand = [];
    if (m) {
      var sisa = low.replace(m[0], " ").replace(/\b(cek|lihat|tampilkan|tolong|dong|material|materialnya|kebutuhan|jatah|sisa|rincian|isi|status|proyek|projek|ppbj|no|nomor|nomer|buffer|stock|stok)\b/g, " ").replace(/\s+/g, " ").trim();
      if (sisa) return null;
      e = idx[nKey(m[0])]; if (!e) return null;
    } else {
      var n = /^(?:(?:cek|lihat|tampilkan|tolong) )*(?:(?:material|sisa jatah|jatah|kebutuhan|status|isi) )*(?:proyek|projek|ppbj) (.+)$/.exec(low); if (!n) return null;
      var q = n[1].replace(/\b(material|dong|ya|aja|saja|nya|ini|itu)\b/g, " ").replace(/\s+/g, " ").trim();
      if (!q || /\b(kenapa|mengapa|rekap|laporan|keluar|masuk|bulan|minggu|hari|ubah|tandai|ganti|prioritas|status|riwayat|kurang|berisiko|aktif|tanpa|selesai|batal|ditunda|apa|yang|mana|paling|semua)\b/.test(q)) return null;
      var qt = q.split(" ").filter(function (t) { return t.length >= 2; }); if (!qt.length) return null;
      Object.keys(idx).forEach(function (k) {
        var p = idx[k], tk = (nKey(p.ppbj) + " " + String(p.ket || "").toLowerCase() + (p.buffer ? " buffer stock" : "")).toLowerCase().split(/[^a-z0-9\/]+/).filter(Boolean);
        if (qt.every(function (t) { return tk.some(function (x) { return x === t || (t.length >= 3 && x.indexOf(t) === 0); }); })) cand.push(p);
      });
      if (!cand.length) return null;
      if (cand.length > 1) {
        var persis = cand.filter(function (p) { return String(p.ket || "").toLowerCase().replace(/\s+/g, " ") === q; });
        if (persis.length === 1) cand = persis;
      }
      if (cand.length > 1) {
        cand.sort(function (a, b) { return String(a.ppbj).localeCompare(String(b.ppbj)); });
        return {pahami: "Cek material proyek: " + q, alat: "proyek", konteks: null, saran: [], lokal: {jenis: "proy", kunci: "pilih"},
          blok: [{t: "pilih", judul: "Ada " + cand.length + " proyek yang cocok dengan \"" + q + "\". Pilih satu:", opsi: cand.slice(0, 10).map(function (p) { return {label: p.ppbj + " · " + String(p.ket || "").slice(0, 50) + " (" + (p.status || "") + ")", tanya: "cek material proyek " + p.ppbj}; })}]};
      }
      e = cand[0];
    }
    return {pahami: e.pahami, alat: "proyek", blok: klon(e.blok), saran: e.saran || [], konteks: {kodes: [], nama: [], ppbj: e.ppbj}, lokal: {jenis: "proy", kunci: nKey(e.ppbj)}};
  }
  /** "isi rak A3": barang di satu rak. */
  function rakLokal(low) {
    var m = /^(?:(?:cek|lihat|tampilkan|tolong|isi|barang di) )*rak ([a-z0-9][a-z0-9 \-\/.]{0,12})$/.exec(low); if (!m || !RK.rakIsi || !RK.ring) return null;
    var rn = m[1].replace(/[^a-z0-9]/g, ""), r = RK.rakIsi[rn]; if (!r) return null;
    var baris = (r.k || []).map(function (k) { return RK.ring[k]; }).filter(Boolean).sort(function (a, b) { return String(a[1]).localeCompare(String(b[1])); }).map(function (x) { return [x[1], x[0], x[2], x[3], x[4], x[5]]; });
    if (!baris.length) return null;
    return {pahami: "Isi rak " + r.rak, alat: "stok", konteks: null, saran: [], lokal: {jenis: "rak", kunci: rn},
      blok: [{t: "p", s: "**Rak " + r.rak + "**" + (r.gudang ? " (" + r.gudang + ")" : "") + " berisi " + baris.length + " barang."}, {t: "tabel", judul: "Isi rak " + r.rak, kolom: tabelBarang(), baris: baris, total: baris.length, tampil: 15, unduh: "Isi rak " + r.rak, catatan: ""}]};
  }
  function tabelBarang() { return [{n: "Barang", f: ""}, {n: "Kode", f: ""}, {n: "Satuan", f: ""}, {n: "Stok fisik", f: "n"}, {n: "Stok bebas", f: "n"}, {n: "Status", f: ""}]; }
  /** Maksud (stok / lokasi rak / order) dan sisa kalimat yang berisi nama barang. */
  function niatBarang(low) {
    var m;
    if ((m = /^(?:(?:cek|lihat|cari|tolong) )*(?:lokasi|letak|posisi|rak) (?:rak )?(.+)$/.exec(low)) || (m = /^(.+?) (?:ada )?(?:di ?mana|dimana|di rak (?:mana|berapa)|rak (?:mana|berapa)|lokasinya|lokasi|letaknya)$/.exec(low))) return {niat: "rak", isi: m[1]};
    if ((m = /^(?:(?:cek|lihat|tolong) )*(?:status )?(?:order|pesanan|po|eta) (.+)$/.exec(low)) || (m = /^(.+?) (?:(?:sudah|udah|lagi|sedang) )?(?:di ?order|diorder|dipesan|di ?pesan|ada po|kapan (?:datang|tiba|sampai)|datang kapan|belum datang|sudah datang)(?: ya| belum| gak| nggak)?$/.exec(low))) return {niat: "order", isi: m[1]};
    var isi = low.replace(/^(?:(?:tolong|cek|lihat|cari|info) )*(?:stok|stock|stk|sisa stok|sisa|berapa stok|stoknya|ada stok|berapa sisa)\s+/, "").replace(/^(?:tolong |cek |lihat |cari |info )+/, "").replace(/\s+(?:ada berapa|berapa|ada gak|ada nggak|ada ga|ada tidak|masih ada|sisa berapa|sisanya|stoknya|stok|sisa)$/, "");
    return {niat: "stok", isi: isi, polos: isi === low};
  }
  /** Satu potongan nama → {satu:{key,kode,nama}} | {banyak:[hit]} | null (ragu: serahkan ke server). */
  function lacakBarang(frag) {
    var tj = T(); if (!tj.cari || !tj.norm || !tj.bersih) return null;
    var fr = frasaSrv(frag), kb = RK.bel && RK.bel[fr];
    if (kb && RK.ring && RK.ring[kb] && RK.kartu[kb]) return {satu: {key: kb, kode: RK.ring[kb][0], nama: RK.ring[kb][1]}};   // pilihan yang pernah dipelajari bot
    var tok = tj.bersih(tj.norm(frag)); if (!tok.length) return null;
    var h = tj.cari(tok); if (!h.length) return null;
    var top = h[0];
    if (top.cov >= 0.99 && !(h[1] && h[1].skor > top.skor - 0.08)) return RK.kartu[top.b.key] ? {satu: {key: top.b.key, kode: top.b.kode, nama: top.b.nama}} : null;
    var kand = h.filter(function (x) { return x.cov >= 0.99 && RK.ring && RK.ring[x.b.key]; });
    if (kand.length >= 2 && kand.length <= 40) return {banyak: kand, frag: frag};
    return null;
  }
  function kartuSebagian(kt, label) {
    var k = klon(kt), simpan = false; k.baris = (k.baris || []).filter(function (r) { if (r[0]) simpan = label.test(r[0]); return simpan; }); return k;
  }
  function barangLokal(low) {
    if (!RK.ring) return null;
    var ni = niatBarang(low), isi = ni.isi;
    if (ni.niat === "stok" && ni.polos && !/^[\w\s\/".,-]+$/.test(low)) return null;
    if (!isi || LK_BUKAN.test(isi)) return null;
    var bag = isi.split(/\s+(?:dan|sama|serta|&)\s+|\s*,\s*/).filter(function (x) { return x.trim(); });
    if (!bag.length || bag.length > 2) return null;
    var item = [], banyak = null;
    for (var k = 0; k < bag.length; k++) {
      var h = lacakBarang(bag[k]); if (!h) return null;
      if (h.banyak) { if (bag.length > 1) return null; banyak = h; break; }
      if (item.some(function (x) { return x.key === h.satu.key; })) return null;
      item.push(h.satu);
    }
    if (banyak) return grupLokal(banyak, bag[0]);
    var nama = item.map(function (x) { return x.nama; }), kodes = item.map(function (x) { return x.kode; }), n1 = nama[0], blok = [];
    var saran = [{label: "Kenapa angkanya begitu?", tanya: "jelaskan " + n1}, {label: "Cukup untuk berapa proyek?", tanya: "cukup untuk berapa proyek " + n1}, {label: "Riwayat bulan ini", tanya: "riwayat " + n1 + " bulan ini"}, {label: "Ukuran lain", tanya: "ukuran lain " + n1}, {label: "Ringkas saja", tanya: low, ulang: "ringkas"}, {label: "Jelaskan lebih rinci", tanya: low, ulang: "rinci"}];
    var pahami = "Cek stok: " + nama.join(", ");
    item.forEach(function (it) {
      var kt = RK.kartu[it.key];
      if (ni.niat === "rak") {
        var m = /(Rak [^·]+|rak belum tercatat)\s*$/.exec(kt.sub || "");
        blok.push({t: "p", s: "**" + it.nama + "**: " + (m ? m[1].trim().replace(/^rak belum tercatat$/, "lokasi rak belum tercatat") : "lokasi rak belum tercatat") + "."});
        blok.push(kartuSebagian(kt, /^(Stok fisik|Stok bebas|Status)/));
      } else if (ni.niat === "order") {
        var ks = kartuSebagian(kt, /^(Stok bebas|Akan datang|Sudah diorder|Belum diorder|Perlu dibeli|Status)/);
        if (!ks.baris.some(function (r) { return /^(Akan datang|Sudah diorder|Belum diorder)/.test(r[0]); })) blok.push({t: "p", s: "**" + it.nama + "**: tidak ada order berjalan (tidak sedang diorder, atau pesanannya sudah datang)."});
        blok.push(ks);
      } else blok.push(klon(kt));
    });
    if (ni.niat === "rak") pahami = "Lokasi rak: " + nama.join(", ");
    else if (ni.niat === "order") pahami = "Status order: " + nama.join(", ");
    return {pahami: pahami, alat: ni.niat === "stok" ? "stok" : "order", blok: blok, konteks: {kodes: kodes, nama: nama, ppbj: ""}, lokal: {jenis: ni.niat === "stok" ? "stok" : "order", kodes: kodes}, saran: saran};
  }
  /** Beberapa barang cocok (mis. "cek elbow 3", "cek kimia"): tabel stok semuanya + pilihan (bot mengingat pilihan Anda). */
  function grupLokal(h, frag) {
    var baris = h.banyak.map(function (x) { var r = RK.ring[x.b.key]; return [r[1], r[0], r[2], r[3], r[4], r[5]]; });
    var opsi = h.banyak.slice(0, 8).map(function (x) { return {label: x.b.nama + " (" + x.b.kode + ")", kode: x.b.kode, frasa: frag}; });
    return {pahami: "Barang yang cocok dengan \"" + frag + "\"", alat: "stok", konteks: null, saran: [], lokal: {jenis: "grup", kodes: h.banyak.slice(0, 5).map(function (x) { return x.b.kode; })},
      blok: [{t: "p", s: "Ada **" + baris.length + " barang** yang cocok dengan \"" + frag + "\". Stoknya ada di tabel; pilih salah satu untuk rincian lengkap (bot akan mengingat pilihan ini)."},
        {t: "tabel", judul: "Barang yang cocok dengan " + frag, kolom: tabelBarang(), baris: baris, total: baris.length, tampil: 15, unduh: "Barang " + frag, catatan: ""},
        {t: "pilih", judul: "Rincian yang mana?", opsi: opsi}]};
  }
  function lokal(teks) {
    if (!rkSegar()) return null;
    var low = nr(teks).replace(/\bstk\b/g, "stok").replace(/\bstock\b/g, "stok").replace(/\bproject\b/g, "proyek");
    if (!low || low.length > 120) return null;
    return siapLokal(low) || proyekLokal(low) || rakLokal(low) || barangLokal(low);
  }
  function idLokal() { return "L" + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36); }

  /* ---------- bertanya ---------- */
  function layar() { return (window.innerWidth || 1000) < 700 ? "hp" : "pc"; }
  function tanya(teks, o) {
    o = o || {}; teks = String(teks || "").trim(); if (!teks) return;
    if (!o.pilih && !o.paksa && !o.mode) A.lastTeks = teks;
    var t0 = Date.now();
    if (!o.server && !o.pilih && !o.paksa && !o.mode && !o.segar) {
      var L = null; try { L = lokal(teks); } catch (eL) { L = null; }
      if (L) { instanKirim(teks, L, o, t0); return; }   // T140/T141: jawaban instan dari ringkasan (tanpa menunggu server)
    }
    add("tq-u", esc(o.label || teks));
    var m = add("tq-b tga", '<p class="tq-sm tga-tunggu">Memahami dan menghitung dari data...</p>'), henti = tungguBertahap(m);
    api({action: "adminBotTanya", pin: A.pin, teks: teks, konteks: A.K, pilih: o.pilih || null, segar: o.segar ? 1 : 0, riwayat: A.H.slice(-6), layar: layar(), mode: o.mode || "", paksa: o.paksa || "", bertahap: 1}).then(function (r) {
      henti(); if (!m) return; m.innerHTML = "";
      if (!r || !r.ok) {
        var msg = (r && r.msg) || "Gagal.";
        if (/is not defined|tidak dikenal/i.test(msg)) msg = "Bot admin belum terpasang di server (BotAdmin.gs). Pasang dulu BotAdmin.gs dan baris route di Code.gs, lalu Deploy.";
        if (/Kode tidak dikenali|Terlalu banyak/i.test(msg)) { matikan(); msg += " Silakan keluar lalu masuk lagi."; }
        m.innerHTML = '<p class="err">' + esc(msg) + "</p>"; return;
      }
      tampilkan(m, r, teks, o, t0);
      if (r.susul) {   // T140: log + kesimpulan AI menyusul, tidak menahan jawaban
        api({action: "adminBotSusul", pin: A.pin, id: r.id, ms: Date.now() - t0}).then(function (s) { if (s && s.ok && s.simpul) sisipSimpul(m, s.simpul); else hapusTunggu(m); }).catch(function () { hapusTunggu(m); });
      }
    }).catch(function () { henti(); if (m) m.innerHTML = '<p class="err">Gagal terhubung ke server. Periksa internet lalu coba lagi.</p>'; });
  }
  /** Jawaban instan: gambar dari ringkasan, lalu log + kesimpulan AI menyusul (tidak menahan jawaban). */
  function instanKirim(teks, L, o, t0) {
    add("tq-u", esc(o.label || teks));
    var ml = add("tq-b tga", "");
    if (layar() === "hp") L.blok.forEach(function (b) { if (b.t === "tabel") b.tampil = Math.min(b.tampil || 15, 6); });
    L.id = idLokal(); L.jalur = "instan"; L.ok = true;
    tampilkan(ml, L, teks, o, t0);
    api({action: "adminBotSusul", pin: A.pin, id: L.id, lokal: L.lokal, simpul: L.simpul ? 1 : 0, teks: teks, pahami: L.pahami, ms: Date.now() - t0}).then(function (s) { if (s && s.ok && s.simpul) sisipSimpul(ml, s.simpul); else hapusTunggu(ml); }).catch(function () { hapusTunggu(ml); });
  }
  /** Tulisan tunggu yang bergerak: menampilkan detik berjalan (bukan tahap palsu) supaya terlihat tidak macet. Mengembalikan fungsi untuk berhenti. */
  function tungguBertahap(m) {
    var t0 = Date.now(), p = m && m.querySelector(".tga-tunggu"), iv = null;
    function henti() { if (iv) { clearInterval(iv); iv = null; } }
    if (!p) return henti;
    iv = setInterval(function () {
      if (!p.isConnected) { henti(); return; }
      var dt = Math.floor((Date.now() - t0) / 1000);
      p.textContent = "Memahami dan menghitung dari data... " + dt + " dtk" + (dt >= 20 ? " · server sedang sibuk, mohon tunggu" : dt >= 6 ? " · data besar, masih dihitung" : "");
    }, 500);
    return henti;
  }
  /** Memilih barang dari tabel kelompok: kartu langsung dari ringkasan bila ada. */
  function pilihInstan(kode) {
    if (!rkSegar() || !RK.ring) return false;
    var key = String(kode || "").trim().toUpperCase(), kt = RK.kartu[key], r = RK.ring[key]; if (!kt || !r) return false;
    var n = r[1], L = {pahami: "Cek stok: " + n, alat: "stok", blok: [klon(kt)], konteks: {kodes: [r[0]], nama: [n], ppbj: ""}, lokal: {jenis: "stok", kodes: [r[0]]},
      saran: [{label: "Kenapa angkanya begitu?", tanya: "jelaskan " + n}, {label: "Cukup untuk berapa proyek?", tanya: "cukup untuk berapa proyek " + n}, {label: "Riwayat bulan ini", tanya: "riwayat " + n + " bulan ini"}, {label: "Ukuran lain", tanya: "ukuran lain " + n}]};
    instanKirim("stok " + n, L, {label: "→ " + n}, Date.now()); return true;
  }
  function sisipSimpul(m, s) {
    var w = m.querySelector(".tga-simpul-tunggu"), d = document.createElement("div");
    d.innerHTML = '<div class="tga-simpul"><div class="tq-sm"><b>Kesimpulan AI</b> · tafsiran dari angka di atas, bukan angka baru</div><p>' + tebal(s) + "</p></div>";
    if (w) w.replaceWith(d.firstChild); else { var meta = m.querySelector(".tga-meta"); m.insertBefore(d.firstChild, meta || null); }
    bawah();
  }
  function hapusTunggu(m) { var w = m && m.querySelector(".tga-simpul-tunggu"); if (w) w.remove(); }
  /** Menggambar satu jawaban (dari server atau instan dari ringkasan). */
  function tampilkan(m, r, teks, o, t0) {
    var instan = r.jalur === "instan";
    if (r.pahami) m.insertAdjacentHTML("beforeend", '<p class="tq-sm tga-paham">Dipahami sebagai: <b>' + esc(r.pahami) + "</b>" + (instan ? ' <span class="tga-jl">instan</span>' : r.jalur === "kilat" ? ' <span class="tga-jl">kilat</span>' : r.jalur === "ai" || r.jalur === "pilihan" ? ' <span class="tga-jl tga-jl-ai">AI</span>' : r.jalur === "belajar" ? ' <span class="tga-jl">belajar</span>' : "") + "</p>");
    gambarBlok(r.blok || [], m);
    if (r.simpulNanti || (instan && r.simpul)) m.insertAdjacentHTML("beforeend", '<p class="tq-sm tga-simpul-tunggu">Menyusun kesimpulan AI…</p>');
    if (r.konteks) A.K = {kodes: r.konteks.kodes || [], nama: r.konteks.nama || [], ppbj: r.konteks.ppbj || ""};
    if (r.alat !== "tanya") { A.H.push({q: teks, p: r.pahami || ""}); if (A.H.length > 6) A.H.shift(); }
    if ((r.saran || []).length) m.appendChild(chips(r.saran, function (x) {
      if (x.ulang) { tanya(x.tanya, {mode: x.ulang, pilih: o.pilih, paksa: o.paksa, label: x.label}); return; }
      if (/ $/.test(x.tanya)) { var q = document.getElementById("q"); if (q) { q.value = x.tanya; q.focus(); } } else tanya(x.tanya);
    }));
    var dtk = ((Date.now() - t0) / 1000).toFixed(1).replace(".", ",");
    if (instan) m.insertAdjacentHTML("beforeend", '<p class="tq-sm tga-meta">jawaban instan dari ringkasan per ' + esc(rkJam()) + (r.lokal && r.lokal.jenis === "rak" ? "" : ' · <a href="#" class="tga-segar">hitung ulang dari data terbaru</a>') + ' · <a href="#" class="tga-salah">Bukan ini maksud saya</a></p>');
    else m.insertAdjacentHTML("beforeend", '<p class="tq-sm tga-meta">' + "dihitung dari data " + dtk + " dtk" + (r.dataJam ? ' · bacaan data per ' + esc(r.dataJam) + ' <a href="#" class="tga-segar">hitung ulang dari data terbaru</a>' : "") + (r.id && r.alat !== "tanya" ? ' · <a href="#" class="tga-salah">Bukan ini maksud saya</a>' : "") + "</p>");
    var sg = m.querySelector(".tga-segar"); if (sg) sg.onclick = function (ev) { ev.preventDefault(); tanya(teks, {segar: true, pilih: o.pilih, paksa: o.paksa, label: teks + " (data terbaru)"}); };
    var sl = m.querySelector(".tga-salah");
    if (sl) sl.onclick = function (ev) {
      ev.preventDefault();
      if (instan) { sl.replaceWith(document.createTextNode("ditanyakan ulang ke server")); api({action: "adminBotNilai", pin: A.pin, id: r.id, nilai: "salah"}).catch(function () {}); tanya(teks, {server: true, label: teks + " (tanya server)"}); return; }
      bukanIni(r, teks, sl);
    };
    bawah();
  }
  /** "Bukan ini maksud saya": dicatat (bahan belajar), lalu tawarkan tafsiran lain atau tulis ulang maksudnya. */
  function bukanIni(r, teks, link) {
    if (link) { link.replaceWith(document.createTextNode("ditandai salah paham")); }
    api({action: "adminBotNilai", pin: A.pin, id: r.id, nilai: "salah"}).catch(function () {});
    var m = add("tq-b tga", '<p>Terima kasih, sudah dicatat untuk bahan belajar bot. Yang Anda maksud:</p>');
    if (!m) return;
    var op = (r.alt || []).map(function (x) { return {label: x.label, paksa: x.paksa}; });
    if (op.length) m.appendChild(chips(op, function (x) { tanya(teks, {paksa: x.paksa, label: "→ " + x.label}); }));
    var f = document.createElement("div"); f.className = "tga-pin";
    f.innerHTML = '<input class="t" type="text" maxlength="300" placeholder="Atau tulis maksud Anda dengan kata lain" aria-label="Maksud sebenarnya"><button type="button">Kirim</button>';
    m.appendChild(f);
    var i = f.querySelector("input"), b = f.querySelector("button");
    function kirim() { var v = i.value.trim(); if (!v) return; api({action: "adminBotNilai", pin: A.pin, id: r.id, nilai: "salah", catatan: v}).catch(function () {}); f.remove(); tanya(v); }
    b.onclick = kirim; i.onkeydown = function (e) { if (e.key === "Enter") kirim(); };
    bawah();
  }

  /* ---------- mode ---------- */
  function sapa() {
    var a = add("tq-b tga", "<p><b>Halo, admin.</b> Tanyakan apa saja: stok dan alasannya, pesanan, proyek, simulasi, laporan (bisa diunduh Excel), nomor seri, lacak BPB. Jawaban instan untuk kata kunci seperti \"cek stok X\", \"cek material proyek X\", \"cek PPBJ 011/PB/XI/2026\", \"material buffer stock\", \"barang habis\", \"stok minus\", \"pesanan akan datang\", \"pesanan yang telat\", \"rak X\", \"isi rak A3\". Boleh beberapa permintaan sekaligus, bahasa sehari-hari, dan pertanyaan susulan (\"yang kedua?\", \"kalau 10 proyek?\"). Perintah yang mengubah data selalu minta konfirmasi dulu.</p>");
    if (a) a.appendChild(chips([{label: "Briefing hari ini", t: "briefing"}, {label: "Ada yang aneh?", t: "ada yang aneh hari ini"}, {label: "Proyek berisiko", t: "proyek mana paling berisiko"}, {label: "Pesanan terlambat", t: "pesanan yang telat"}, {label: "Barang habis", t: "barang habis"}, {label: "Akan datang", t: "pesanan akan datang minggu ini"}, {label: "Material buffer stock", t: "cek material buffer stock"}, {label: "Contoh pertanyaan", t: "bantuan"}, {label: "Usulan belajar", t: "usulan belajar"}], function (x) { tanya(x.t); }));
  }
  /** Tidak ada tombol "Mode admin": admin dikenali dari kode masuk (password admin). Hanya lencana ADMIN kecil di judul. */
  function tombol() {
    var old = document.getElementById("tga-mode"); if (old) old.remove();
    var badge = document.getElementById("tga-badge"), top = document.querySelector(".top h1");
    if (A.aktif && top && !badge) top.insertAdjacentHTML("beforeend", ' <span id="tga-badge" class="tga-badge">ADMIN</span>');
    if (!A.aktif && badge) badge.remove();
  }
  function placeholder() { var q = document.getElementById("q"); if (q) q.placeholder = A.aktif ? "Contoh: kenapa pipa pvc 3 inch kurang? / rekap keluar bulan ini per proyek" : "Contoh: stok pipa pvc 3 inch"; }
  function nyalakan(pin) { A.pin = pin; A.aktif = true; ss("sctk_tanya_adm", pin); tombol(); placeholder(); sapa(); rkMulai(); }
  function matikan() { A.aktif = false; A.pin = ""; ss("sctk_tanya_adm", null); tombol(); placeholder(); RK = null; if (RK_TIMER) { clearInterval(RK_TIMER); RK_TIMER = null; } }
  /** T135: pemeriksaan admin dimulai bersamaan dengan pemuatan data (dipanggil tanya.js di awal), jadi tidak menambah waktu tunggu. */
  var AWAL = null;
  function awal(kode) { if (kode && T().api) AWAL = {kode: kode, p: api({action: "adminBotCek", kode: kode}).catch(function () { return null; })}; }
  function cek(kode) {
    var pre = AWAL && AWAL.kode === kode ? AWAL.p : null; AWAL = pre ? null : AWAL;
    return (pre ? pre.then(function (r) { return r === null ? api({action: "adminBotCek", kode: kode}) : r; }) : api({action: "adminBotCek", kode: kode})).then(function (r) {
      if (r && r.ok && r.admin) { A.versi = r.versi || ""; nyalakan(kode); }
      return r || {ok: false, gagal: true};
    }).catch(function () { return {ok: false, gagal: true, msg: "Gagal terhubung ke server."}; });
  }
  /** T139: selama pemeriksaan admin berjalan, pertanyaan MENUNGGU (tidak lari ke bot pegawai). Gagal terhubung: coba sekali lagi, lalu beri tahu dengan jelas. */
  var MENUNGGU = null;
  function cekPenuh(cand, kode, salamPegawai) {
    var info = add("tq-b tga-cek", '<p class="tq-sm">Memeriksa akses admin…</p>');
    function hapus() { if (info && info.parentNode) info.parentNode.removeChild(info); }
    function tutup(r) { MENUNGGU = null; hapus(); return r; }
    MENUNGGU = cek(cand).then(function (r) {
      if (r && r.gagal) return cek(cand);   // coba sekali lagi
      return r;
    }).then(function (r) {
      if (r && r.ok && r.admin) { if (cand === kode) { try { localStorage.removeItem("sctk_kode"); } catch (e) { /* abaikan */ } } return tutup(r); }   // password admin tidak disimpan permanen
      if (r && r.gagal) {
        tutup(r);
        var w = add("tq-b tga-cek", '<p><b>Bot admin belum bisa dihubungi</b> (server lambat atau koneksi putus). Jawaban sementara memakai bot pegawai.</p>');
        if (w) w.appendChild(chips([{label: "Coba lagi"}], function () { if (w.parentNode) w.parentNode.removeChild(w); cekPenuh(cand, kode, null); }));
        if (salamPegawai) salamPegawai();
        return r;
      }
      tutup(r);
      if (ss("sctk_tanya_adm") && cand !== kode && kode) { ss("sctk_tanya_adm", null); return cekPenuh(kode, kode, salamPegawai); }
      if (cand !== kode) ss("sctk_tanya_adm", null);
      if (salamPegawai) salamPegawai();
      return r;
    });
    return MENUNGGU;
  }
  /** Dipanggil tanya.js setelah chat tampil. kode = kode yang dipakai masuk; salamPegawai = sapaan bot pegawai (ditampilkan hanya bila bukan admin). */
  function pasang(kode, salamPegawai) {
    tombol();
    var simpan = ss("sctk_tanya_adm"), cand = simpan || kode;
    if (!cand) { if (salamPegawai) salamPegawai(); return; }
    cekPenuh(cand, kode, salamPegawai);
  }
  window.TGA = {_rk: function () { return RK; }, awal: awal, pasang: pasang, tanya: tanya, get aktif() { return A.aktif; }, get menunggu() { return MENUNGGU; }, matikan: matikan, _A: A};
})();
