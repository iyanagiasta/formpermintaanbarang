/* Tambahan 113: Telusur Selisih (admin > Stok > Komparasi > tombol "Telusur penyebab selisih").
   Menguraikan selisih stok Gudang vs Accurate per barang ke kantong penyebab:
   dokumen belum diinput, keluar fisik lewat sistem Gudang tapi IA kurang, dibeli untuk PPBJ (RI) tapi belum di-IA,
   IA ganda, barang kembaran (salah kode), satuan, rencana PPBJ vs IA, pola kelompok pekerjaan (SL, pengembangan jaringan, kebocoran).
   Hasilnya DUGAAN dengan tingkat keyakinan. Hanya membaca, stok tidak diubah. */
(function (root) {
  'use strict';
  var TS = {res: null, v: 'ringkas', q: '', fj: '', fy: '', sumber: '', busy: false};
  var LBL = {dok: 'Dokumen sistem belum diinput ke Accurate', serah: 'Keluar lewat sistem Gudang, IA kurang', beli: 'Dibeli untuk PPBJ (RI), belum/kurang di-IA', ganda: 'IA ganda', lebih: 'IA melebihi yang dibeli/diambil', kembar: 'Salah kode (barang kembaran)', satuan: 'Salah satuan', rencana: 'Rencana PPBJ > IA (proyek selesai)', pola: 'Material inti pekerjaan tidak di-IA', sisa: 'Belum terjelaskan (cek fisik)'};
  var WARNA = {dok: '#2471a3', serah: '#c0392b', beli: '#d35400', ganda: '#8e44ad', lebih: '#7d3c98', kembar: '#16a085', satuan: '#b7950b', rencana: '#a04000', pola: '#7f8c8d', sisa: '#566573'};
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
  function n3(n) { n = Number(n) || 0; return (Math.round(n * 1000) / 1000).toLocaleString('id-ID'); }
  function rp(n) { return n == null ? '-' : 'Rp ' + Math.round(n).toLocaleString('id-ID'); }
  function sel(n) { n = Number(n) || 0; return (n > 0 ? '+' : n < 0 ? '−' : '') + n3(Math.abs(n)); }
  function yk(y) { return y ? '<span class="ts-y ts-' + y + '">' + (y === 'tinggi' ? 'yakin tinggi' : y === 'sedang' ? 'yakin sedang' : 'yakin rendah') + '</span>' : ''; }
  function gaya() {
    if (document.getElementById('tsGaya')) return;
    var st = document.createElement('style'); st.id = 'tsGaya';
    st.textContent = '.ts-sum{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px;margin:8px 0}.ts-sum>div{border:1px solid var(--line,#ccd);border-radius:8px;padding:8px}.ts-sum b{display:block;font-size:18px}.ts-sum span{font-size:12px;opacity:.8}' +
      '.ts-bar{display:grid;grid-template-columns:minmax(150px,280px) 1fr auto;gap:8px;align-items:center;margin:4px 0;cursor:pointer;background:transparent!important;box-shadow:none!important;border:1px solid var(--line,#ccd)!important;border-radius:8px!important;padding:6px 8px!important;color:inherit!important;text-align:left;width:100%;font:inherit;font-weight:400!important}.ts-bar:hover{border-color:var(--accent,#2471a3)!important}#tsIsi select{max-width:100%}.ts-bar .tr{height:14px;border-radius:7px;background:var(--line,#dde);overflow:hidden}.ts-bar .tr i{display:block;height:100%}.ts-bar small{white-space:nowrap}' +
      '.ts-tabs{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}.ts-tabs button[aria-pressed="true"]{outline:2px solid var(--accent,#2471a3)}' +
      '.ts-y{display:inline-block;font-size:11px;padding:0 7px;border-radius:9px;border:1px solid currentColor;white-space:nowrap}.ts-tinggi{color:#c0392b}.ts-sedang{color:#b9770e}.ts-rendah{color:#7f8c8d}' +
      '.ts-tb{width:100%;border-collapse:collapse;font-size:13px}.ts-tb th,.ts-tb td{border-bottom:1px solid var(--line,#ccd);padding:5px 6px;text-align:left;vertical-align:top}.ts-tb td.nm,.ts-tb th.nm{text-align:right;white-space:nowrap}.ts-wrap{overflow-x:auto}' +
      '.ts-rc{margin:4px 0 0;padding:0;list-style:none;font-size:12px}.ts-rc li{margin:3px 0;padding-left:10px;border-left:3px solid var(--line,#ccd)}.ts-chip{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:4px;vertical-align:middle}' +
      '@media (max-width:700px){.ts-tb thead{display:none}.ts-tb tr{display:block;border:1px solid var(--line,#ccd);border-radius:8px;margin:6px 0;padding:4px}.ts-tb td{display:block;border:0;padding:2px 4px;text-align:left!important}.ts-tb td[data-l]:before{content:attr(data-l) ": ";font-weight:600;font-size:11px;opacity:.75}.ts-bar{grid-template-columns:1fr;gap:2px}}';
    document.head.appendChild(st);
  }

  /** Panggil server. rows = baris file Komparasi (null = pakai saldo Mutasi Accurate). */
  TS.jalankan = function (rows, sesi, box, selesai) {
    if (TS.busy) return; TS.busy = true;
    box.innerHTML = '<div class="card msg">Menelusur penyebab selisih... (membaca mutasi Accurate, IA, RI, rencana PPBJ, dan Serah Gudang)</div>';
    var body = rows ? {action: 'adminTelusurSelisih', rows: rows, sesi: sesi || undefined} : {action: 'adminTelusurSelisih', dariMutasi: true};
    root.api(body).then(function (r) {
      TS.busy = false;
      if (!r || !r.ok) { box.innerHTML = '<div class="card msg err">' + esc((r && r.msg) || 'Gagal.') + '</div>'; return; }
      TS.res = r; TS.v = 'ringkas'; TS.q = ''; TS.fj = ''; TS.fy = ''; if (selesai) selesai(); else TS.gambar(box);
    }).catch(function () { TS.busy = false; box.innerHTML = '<div class="card msg err">Gagal terhubung ke server.</div>'; });
  };

  TS.gambar = function (box) {
    gaya(); var r = TS.res; if (!r) { box.innerHTML = ''; return; }
    var R = r.ringkas, totSeb = r.sebab.reduce(function (a, s) { return a + (s.nilai || 0); }, 0) || 1;
    var pct = R.selisihNilai ? Math.round(100 * R.terjelaskanNilai / R.selisihNilai) : 0;
    var h = '<div class="card"><b>Telusur Selisih: kemungkinan penyebab selisih stok</b>' +
      '<div class="note">Sumber stok Accurate: <b>' + esc(r.sumber) + '</b>' + (R.mutasiSampai ? ' (mutasi Accurate sampai ' + esc(R.mutasiSampai) + ')' : '') + '. Stok aktual = stok Gudang terbaru. Hasil ini <b>dugaan</b> dengan tingkat keyakinan, bukan bukti. Pastikan di lapangan sebelum membuat adjustment. Hanya membaca: stok tidak diubah.</div>' +
      '<div class="ts-sum"><div><b>' + R.barang + '</b><span>barang selisih</span></div><div><b>' + rp(R.selisihNilai) + '</b><span>nilai selisih (setelah dokumen)</span></div><div><b style="color:#1e8449">' + pct + '%</b><span>sudah ada dugaan penyebab (' + rp(R.terjelaskanNilai) + ')</span></div><div><b style="color:#c0392b">' + rp(R.belumNilai) + '</b><span>belum terjelaskan, perlu cek fisik</span></div><div><b>' + R.proyek + '</b><span>proyek terkait</span></div></div>' +
      '<div class="fr" style="gap:6px;flex-wrap:wrap"><button class="sv" id="tsXls">Unduh laporan Excel (untuk atasan)</button></div></div>' +
      '<div class="ts-tabs" role="group" aria-label="Bagian telusur">' + [['ringkas', 'Penyebab'], ['barang', 'Per barang (' + r.barang.length + ')'], ['proyek', 'Proyek terkait (' + r.proyek.length + ')'], ['kembar', 'Barang kembaran (' + r.kembar.filter(function (k) { return k.dipakai; }).length + ')'], ['bulan', 'Per bulan'], ['opname', 'Saran opname (' + r.opname.length + ')'], ['pola', 'Pola pekerjaan']].map(function (t) { return '<button data-tv="' + t[0] + '" aria-pressed="' + (TS.v === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div><div id="tsIsi"></div>';
    box.innerHTML = h;
    box.querySelectorAll('[data-tv]').forEach(function (b) { b.onclick = function () { TS.v = b.getAttribute('data-tv'); TS.gambar(box); }; });
    box.querySelector('#tsXls').onclick = unduh;
    var isi = box.querySelector('#tsIsi');
    ({ringkas: vRingkas, barang: vBarang, proyek: vProyek, kembar: vKembar, bulan: vBulan, opname: vOpname, pola: vPola})[TS.v](isi, box);
  };

  function vRingkas(isi, box) {
    var r = TS.res, mx = r.sebab.reduce(function (a, s) { return Math.max(a, s.nilai || 0); }, 0) || 1, tot = r.sebab.reduce(function (a, s) { return a + (s.nilai || 0); }, 0) || 1;
    isi.innerHTML = '<div class="card"><b>Penyebab, dari nilai terbesar</b><div class="note">Klik satu penyebab untuk melihat barangnya. Urutan penjelasan per barang: yang paling yakin dipakai dulu, sampai selisihnya habis. Sisanya masuk "Belum terjelaskan".</div>' +
      r.sebab.slice().sort(function (a, b) { return (b.nilai || 0) - (a.nilai || 0); }).map(function (s) {
        return '<button class="ts-bar" data-sj="' + esc(s.jenis) + '"><span><span class="ts-chip" style="background:' + (WARNA[s.jenis] || '#888') + '"></span>' + esc(LBL[s.jenis] || s.label) + '</span><span class="tr"><i style="width:' + Math.max(2, Math.round(100 * (s.nilai || 0) / mx)) + '%;background:' + (WARNA[s.jenis] || '#888') + '"></i></span><small><b>' + rp(s.nilai) + '</b> &middot; ' + Math.round(100 * (s.nilai || 0) / tot) + '% &middot; ' + s.barang + ' barang</small></button>';
      }).join('') + '</div>' +
      '<div class="card"><b>Cara membaca</b><ul class="note" style="margin:4px 0 0 16px;padding:0">' +
      '<li><b>Keluar lewat sistem Gudang, IA kurang</b> (yakin tinggi): barang tercatat keluar di BPB/Serah untuk PPBJ itu, tapi IA di Accurate lebih kecil. Buat IA kekurangannya.</li>' +
      '<li><b>Dibeli untuk PPBJ (RI), belum/kurang di-IA</b>: barang masuk Accurate untuk proyek itu tapi IA-nya kurang. Yakin tinggi kalau proyek sudah selesai/BAST, sedang kalau masih berjalan. Konfirmasi ke PIC proyek, lalu buat IA.</li>' +
      '<li><b>Salah kode (barang kembaran)</b>: satu barang kurang dan barang yang namanya mirip lebih dengan jumlah serupa. Kemungkinan IA/RI memakai kode yang salah. Cukup koreksi kodenya.</li>' +
      '<li><b>Salah satuan</b>: stok satu sisi tepat kelipatan sisi lainnya (6, 12, dan seterusnya), misalnya batang vs meter.</li>' +
      '<li><b>IA ganda / IA melebihi</b>: Accurate lebih kecil dari stok fisik karena IA tercatat dua kali atau lebih besar dari barang yang dibeli/diambil.</li>' +
      '<li><b>Material inti pekerjaan tidak di-IA</b> (yakin rendah): proyek SL/pengembangan jaringan/kebocoran yang sudah selesai, tapi tidak memuat material yang biasanya selalu ada di pekerjaan sejenis.</li></ul></div>';
    isi.querySelectorAll('[data-sj]').forEach(function (b) { b.onclick = function () { TS.fj = b.getAttribute('data-sj'); TS.v = 'barang'; TS.gambar(box); }; });
  }
  function saringBarang() {
    var q = TS.q.toLowerCase();
    return TS.res.barang.filter(function (b) {
      if (TS.fj) { if (TS.fj === 'dok') { if (!b.dok) return false; } else if (!b.rinci.some(function (c) { return c.jenis === TS.fj; })) return false; }
      if (TS.fy && !b.rinci.some(function (c) { return c.yakin === TS.fy; })) return false;
      if (q && (b.kode + ' ' + b.nama + ' ' + b.rinci.map(function (c) { return (c.ppbj || '') + ' ' + (c.proyek || ''); }).join(' ')).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  }
  function rinciHtml(b) {
    return '<ul class="ts-rc">' + (b.dok ? '<li style="border-color:' + WARNA.dok + '">Dokumen sistem belum diinput: ' + sel(b.dok) + ' (lihat kolom Dijelaskan dokumen di Komparasi)</li>' : '') +
      b.rinci.map(function (c) { return '<li style="border-color:' + (WARNA[c.jenis] || '#888') + '"><b>' + esc(LBL[c.jenis] || c.jenis) + '</b> ' + sel(c.arah * c.alok) + (c.nilai != null ? ' (' + rp(c.nilai) + ')' : '') + ' ' + yk(c.yakin) + (c.ppbj ? '<br>PPBJ <b>' + esc(c.ppbj) + '</b>' + (c.proyek ? ' &middot; ' + esc(c.proyek) : '') + (c.status ? ' &middot; status ' + esc(c.status) : '') : '') + (c.tgl ? ' &middot; ' + esc(c.tgl) : '') + '<br><small>' + esc(c.ket) + '</small></li>'; }).join('') +
      (b.cadangan && b.cadangan.length ? '<li><small>Kemungkinan lain (tidak dihitung karena selisih sudah habis): ' + b.cadangan.map(function (c) { return esc(LBL[c.jenis] || c.jenis) + ' ' + n3(c.q) + (c.ppbj ? ' (' + esc(c.ppbj) + ')' : ''); }).join('; ') + '</small></li>' : '') + '</ul>';
  }
  function vBarang(isi) {
    var L = saringBarang();
    isi.innerHTML = '<div class="fr" style="gap:6px;flex-wrap:wrap;align-items:center"><input id="tsQ" placeholder="Cari barang, kode, PPBJ, atau proyek" value="' + esc(TS.q) + '" style="flex:1;min-width:200px">' +
      '<select id="tsFj" aria-label="Penyebab"><option value="">Semua penyebab</option>' + Object.keys(LBL).map(function (k) { return '<option value="' + k + '"' + (TS.fj === k ? ' selected' : '') + '>' + esc(LBL[k]) + '</option>'; }).join('') + '</select>' +
      '<select id="tsFy" aria-label="Keyakinan"><option value="">Semua keyakinan</option><option value="tinggi"' + (TS.fy === 'tinggi' ? ' selected' : '') + '>Yakin tinggi</option><option value="sedang"' + (TS.fy === 'sedang' ? ' selected' : '') + '>Yakin sedang</option><option value="rendah"' + (TS.fy === 'rendah' ? ' selected' : '') + '>Yakin rendah</option></select><span class="note">' + L.length + ' barang</span></div>' +
      '<div class="ts-wrap"><table class="ts-tb"><thead><tr><th>Barang</th><th class="nm">Gudang</th><th class="nm">Accurate</th><th class="nm">Selisih</th><th class="nm">Sisa setelah dokumen</th><th class="nm">Nilai</th><th>Kemungkinan penyebab</th></tr></thead><tbody>' +
      L.slice(0, 300).map(function (b) {
        var ring = b.rinci.map(function (c) { return '<span class="ts-chip" style="background:' + (WARNA[c.jenis] || '#888') + '" title="' + esc(LBL[c.jenis]) + '"></span>'; }).join('');
        return '<tr><td data-l="Barang"><b>' + esc(b.nama) + '</b><br><small>' + esc(b.kode) + (b.hu ? ' &middot; sudah dihitung ulang ' + esc(b.tgh) : ' &middot; belum diverifikasi opname') + '</small></td><td class="nm" data-l="Gudang">' + n3(b.gt) + '</td><td class="nm" data-l="Accurate">' + n3(b.ft) + '</td><td class="nm" data-l="Selisih">' + sel(b.selisih) + '</td><td class="nm" data-l="Sisa">' + sel(b.sisa) + '</td><td class="nm" data-l="Nilai">' + rp(b.nilaiSisa) + '</td>' +
          '<td data-l="Penyebab"><details><summary>' + ring + ' ' + (b.belum ? '<span class="pgt-warn">' + n3(b.belum) + ' belum terjelaskan</span>' : b.sisa ? 'terjelaskan' : 'dijelaskan dokumen') + '</summary>' + rinciHtml(b) + '</details></td></tr>';
      }).join('') + (L.length ? '' : '<tr><td colspan="7">Tidak ada barang pada saringan ini.</td></tr>') + '</tbody></table></div>' + (L.length > 300 ? '<div class="note">Tampil 300 pertama (nilai terbesar). Semua barang ada di Excel.</div>' : '');
    var qi = isi.querySelector('#tsQ'), t = null;
    qi.oninput = function () { clearTimeout(t); var v = this.value; t = setTimeout(function () { TS.q = v; vBarang(isi); var i2 = isi.querySelector('#tsQ'); i2.focus(); i2.setSelectionRange(v.length, v.length); }, 250); };
    isi.querySelector('#tsFj').onchange = function () { TS.fj = this.value; vBarang(isi); };
    isi.querySelector('#tsFy').onchange = function () { TS.fy = this.value; vBarang(isi); };
  }
  function vProyek(isi) {
    var P = TS.res.proyek;
    isi.innerHTML = '<div class="note">Proyek (PPBJ) yang paling banyak menyumbang selisih, dari nilai terbesar. Konfirmasi ke PIC proyek: apakah material ini memang terpakai di lapangan? Kalau ya, buat IA-nya.</div>' +
      '<div class="ts-wrap"><table class="ts-tb"><thead><tr><th>PPBJ</th><th>Proyek</th><th>Kelompok</th><th>Status</th><th class="nm">Nilai</th><th>Barang</th></tr></thead><tbody>' +
      P.slice(0, 200).map(function (p) {
        return '<tr><td data-l="PPBJ"><b>' + esc(p.ppbj) + '</b></td><td data-l="Proyek">' + esc(p.proyek || '-') + '</td><td data-l="Kelompok">' + esc(p.kelompok || '-') + '</td><td data-l="Status">' + esc(p.status || '-') + '</td><td class="nm" data-l="Nilai">' + rp(p.nilai) + '</td>' +
          '<td data-l="Barang"><details><summary>' + p.barang.length + ' barang</summary><ul class="ts-rc">' + p.barang.map(function (x) { return '<li style="border-color:' + (WARNA[x.jenis] || '#888') + '">' + esc(x.nama) + ' ' + sel(x.arah * x.q) + ' ' + yk(x.yakin) + '<br><small>' + esc(LBL[x.jenis]) + ': ' + esc(x.ket) + '</small></li>'; }).join('') + '</ul></details></td></tr>';
      }).join('') + (P.length ? '' : '<tr><td colspan="6">Tidak ada proyek terkait.</td></tr>') + '</tbody></table></div>';
  }
  function vKembar(isi) {
    var K = TS.res.kembar;
    isi.innerHTML = '<div class="note">Pasangan barang yang namanya mirip dengan selisih berlawanan (satu kurang, satu lebih). Kemungkinan IA atau RI memakai kode barang yang salah. Penyelesaiannya: koreksi kode di dokumen Accurate, bukan adjustment. Pasangan bertanda &#10003; dipakai dalam penjelasan.</div>' +
      '<div class="ts-wrap"><table class="ts-tb"><thead><tr><th>Kurang (Gudang &lt; Accurate)</th><th>Lebih (Gudang &gt; Accurate)</th><th class="nm">Jumlah</th><th class="nm">Nama mirip</th><th>Keyakinan</th></tr></thead><tbody>' +
      K.slice(0, 200).map(function (k) { return '<tr><td data-l="Kurang">' + (k.dipakai ? '&#10003; ' : '') + esc(k.minusNama) + '<br><small>' + esc(k.minus) + '</small></td><td data-l="Lebih">' + esc(k.plusNama) + '<br><small>' + esc(k.plus) + '</small></td><td class="nm" data-l="Jumlah">' + n3(k.q) + '</td><td class="nm" data-l="Mirip">' + k.mirip + '%</td><td data-l="Keyakinan">' + yk(k.yakin) + '</td></tr>'; }).join('') +
      (K.length ? '' : '<tr><td colspan="5">Tidak ada pasangan kembaran.</td></tr>') + '</tbody></table></div>';
  }
  function vBulan(isi) {
    var B = TS.res.bulan, mx = B.reduce(function (a, b) { return Math.max(a, b.nilai || 0); }, 0) || 1;
    isi.innerHTML = '<div class="card"><b>Kapan selisihnya kemungkinan muncul</b><div class="note">Dari tanggal IA/RI pada penyebab yang terkait proyek. "Tanpa tanggal" = penyebab yang tidak terikat transaksi (kembaran, satuan, belum terjelaskan). Bulan dengan nilai besar adalah periode yang paling perlu ditelusuri.</div>' +
      B.map(function (b) { return '<div class="ts-bar"><span>' + esc(b.bulan) + '</span><span class="tr"><i style="width:' + Math.max(2, Math.round(100 * (b.nilai || 0) / mx)) + '%;background:var(--accent,#2471a3)"></i></span><small><b>' + rp(b.nilai) + '</b> &middot; ' + n3(b.unit) + ' unit</small></div>'; }).join('') + '</div>';
  }
  function vOpname(isi) {
    var O = TS.res.opname;
    isi.innerHTML = '<div class="note">Urutan barang yang sebaiknya dihitung duluan di opname bertahap: yang <b>belum diverifikasi opname</b> dulu, lalu nilai yang belum terjelaskan terbesar. Hasil hitung baru otomatis menaikkan keyakinan saat Telusur dijalankan lagi.</div>' +
      '<div class="ts-wrap"><table class="ts-tb"><thead><tr><th>#</th><th>Barang</th><th class="nm">Sisa selisih</th><th class="nm">Belum terjelaskan</th><th class="nm">Nilai</th><th>Opname</th><th>Alasan</th></tr></thead><tbody>' +
      O.map(function (o, i) { return '<tr><td data-l="#">' + (i + 1) + '</td><td data-l="Barang"><b>' + esc(o.nama) + '</b><br><small>' + esc(o.kode) + '</small></td><td class="nm" data-l="Sisa">' + sel(o.sisa) + '</td><td class="nm" data-l="Belum">' + n3(o.belum) + '</td><td class="nm" data-l="Nilai">' + rp(o.nilai) + '</td><td data-l="Opname">' + (o.hu ? 'sudah dihitung ' + esc(o.tgh) : '<b>belum</b>') + '</td><td data-l="Alasan"><small>' + esc(o.alasan) + '</small></td></tr>'; }).join('') +
      (O.length ? '' : '<tr><td colspan="7">Tidak ada.</td></tr>') + '</tbody></table></div>';
  }
  function vPola(isi) {
    var P = TS.res.pola, K = TS.res.kelompok || {};
    isi.innerHTML = '<div class="note">Kelompok pekerjaan dikenali dari nama proyek dan keterangan IA (SL / sambungan langsung, upgrade SL, pengembangan jaringan, kebocoran per ukuran pipa). Material inti = dipakai di minimal separuh proyek sejenis (kelompok dengan minimal 5 proyek ber-IA). Proyek: ' + Object.keys(K).map(function (k) { return esc(k) + ' ' + K[k]; }).join(', ') + '.</div>' +
      (P.length ? P.map(function (p) { return '<div class="card"><b>' + esc(p.kelompok) + '</b> <small>(' + p.proyek + ' proyek ber-IA)</small>' + (p.inti.length ? '<div class="ts-wrap"><table class="ts-tb"><thead><tr><th>Material inti</th><th class="nm">Dipakai di</th><th class="nm">Median per unit</th></tr></thead><tbody>' + p.inti.map(function (c) { return '<tr><td data-l="Material">' + esc(c.nama) + '<br><small>' + esc(c.kode) + '</small></td><td class="nm" data-l="Dipakai">' + c.n + ' dari ' + p.proyek + '</td><td class="nm" data-l="Median">' + n3(c.med) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="note">Material terlalu beragam, belum ada material inti yang konsisten.</div>') + '</div>'; }).join('') : '<div class="card note">Belum ada kelompok dengan minimal 5 proyek ber-IA.</div>');
  }

  function unduh() {
    var r = TS.res; if (!r) return;
    if (typeof root.unduhBanyak !== 'function') { root.toast('Pembuat Excel belum termuat.', true); return; }
    var R = r.ringkas, d = new Date(), p2 = function (n) { return String(n).padStart(2, '0'); }, tg = d.getFullYear() + p2(d.getMonth() + 1) + p2(d.getDate());
    var ring = [['Laporan Telusur Selisih Stok (Gudang vs Accurate)'], ['PT Sarana Catur Tirta Kelola'], ['Dibuat', d.toLocaleString('id-ID')], ['Sumber stok Accurate', r.sumber + (R.mutasiSampai ? ' (mutasi sampai ' + R.mutasiSampai + ')' : '')], ['Stok aktual', 'Stok Gudang terbaru'], [''],
      ['Barang selisih', R.barang], ['Nilai selisih setelah dokumen (Rp)', R.selisihNilai], ['Sudah ada dugaan penyebab (Rp)', R.terjelaskanNilai], ['Belum terjelaskan (Rp)', R.belumNilai], ['Proyek terkait', R.proyek], [''], ['Penyebab', 'Nilai (Rp)', 'Unit', 'Barang', 'Porsi']];
    var tot = r.sebab.reduce(function (a, s) { return a + (s.nilai || 0); }, 0) || 1;
    r.sebab.slice().sort(function (a, b) { return (b.nilai || 0) - (a.nilai || 0); }).forEach(function (s) { ring.push([LBL[s.jenis] || s.label, s.nilai, s.unit, s.barang, Math.round(100 * (s.nilai || 0) / tot) + '%']); });
    ring.push(['']); ring.push(['Catatan', 'Hasil ini dugaan dengan tingkat keyakinan (tinggi/sedang/rendah), bukan bukti. Pastikan di lapangan sebelum adjustment.']);
    var brg = [['Kode', 'Nama', 'Stok Gudang', 'Stok Accurate', 'Selisih', 'Dijelaskan dokumen', 'Sisa setelah dokumen', 'Nilai sisa (Rp)', 'Penyebab', 'Unit dijelaskan', 'Nilai (Rp)', 'Keyakinan', 'PPBJ', 'Proyek', 'Status proyek', 'Tanggal', 'Keterangan', 'Opname']];
    r.barang.forEach(function (b) {
      var L = b.rinci.length ? b.rinci : [{jenis: '', alok: '', nilai: '', yakin: '', ppbj: '', proyek: '', status: '', tgl: '', ket: 'Selisih dijelaskan dokumen sistem yang belum diinput'}];
      L.forEach(function (c, i) { brg.push([i ? '' : b.kode, i ? '' : b.nama, i ? '' : b.gt, i ? '' : b.ft, i ? '' : b.selisih, i ? '' : b.dok, i ? '' : b.sisa, i ? '' : b.nilaiSisa, LBL[c.jenis] || c.jenis, c.alok === '' ? '' : c.arah * c.alok, c.nilai, c.yakin, c.ppbj, c.proyek, c.status, c.tgl, c.ket, i ? '' : (b.hu ? 'Sudah dihitung ' + b.tgh : 'Belum')]); });
    });
    var pry = [['PPBJ', 'Proyek', 'Kelompok', 'Status', 'Nilai (Rp)', 'Kode', 'Barang', 'Penyebab', 'Unit', 'Keyakinan', 'Keterangan']];
    r.proyek.forEach(function (p) { p.barang.forEach(function (x, i) { pry.push([i ? '' : p.ppbj, i ? '' : p.proyek, i ? '' : p.kelompok, i ? '' : p.status, i ? '' : p.nilai, x.kode, x.nama, LBL[x.jenis], x.arah * x.q, x.yakin, x.ket]); }); });
    var kmb = [['Kode kurang', 'Barang kurang', 'Kode lebih', 'Barang lebih', 'Jumlah', 'Nama mirip (%)', 'Keyakinan', 'Dipakai']].concat(r.kembar.map(function (k) { return [k.minus, k.minusNama, k.plus, k.plusNama, k.q, k.mirip, k.yakin, k.dipakai ? 'Ya' : '']; }));
    var bln = [['Bulan', 'Nilai (Rp)', 'Unit']].concat(r.bulan.map(function (b) { return [b.bulan, b.nilai, b.unit]; }));
    var opn = [['No', 'Kode', 'Barang', 'Sisa selisih', 'Belum terjelaskan', 'Nilai (Rp)', 'Opname', 'Alasan']].concat(r.opname.map(function (o, i) { return [i + 1, o.kode, o.nama, o.sisa, o.belum, o.nilai, o.hu ? 'Sudah ' + o.tgh : 'Belum', o.alasan]; }));
    var pol = [['Kelompok', 'Proyek ber-IA', 'Kode', 'Material inti', 'Dipakai di', 'Median per unit']];
    r.pola.forEach(function (p) { if (!p.inti.length) pol.push([p.kelompok, p.proyek, '', '(belum ada material inti konsisten)', '', '']); p.inti.forEach(function (c, i) { pol.push([i ? '' : p.kelompok, i ? '' : p.proyek, c.kode, c.nama, c.n, c.med]); }); });
    var ok = root.unduhBanyak('Telusur Selisih ' + tg + '.xlsx', [{n: 'Ringkasan', rows: ring, w: [40, 60, 12, 12, 10]}, {n: 'Per barang', rows: brg, w: [16, 40, 12, 12, 10, 12, 12, 14, 40, 12, 14, 10, 18, 40, 12, 12, 70, 18]}, {n: 'Proyek', rows: pry, w: [18, 40, 18, 12, 14, 16, 40, 36, 10, 10, 70]}, {n: 'Kembaran', rows: kmb, w: [16, 40, 16, 40, 10, 10, 10, 8]}, {n: 'Per bulan', rows: bln, w: [16, 16, 10]}, {n: 'Saran opname', rows: opn, w: [6, 16, 40, 12, 12, 14, 16, 40]}, {n: 'Pola pekerjaan', rows: pol, w: [22, 10, 16, 44, 10, 12]}]);
    if (ok) root.toast('Laporan Telusur Selisih siap diunduh.');
  }
  root.TS = TS;
})(window);
