/* BOQ (Gelombang 4): daftar, cari pintar, buat/ubah, salin, impor Excel, harga aktual, persetujuan, Excel dan PDF.
   Dipakai halaman boq.html (departemen), tab BOQ di pengadaan.html, dan boq-setuju.html (penyetuju, hanya baca).
   BoqUI.mount(el, {api, toast}) · BoqUI.dokumen(d) · BoqUI.pdf(d, ttd) · BoqUI.excel(d)  */
(function (root) {
  'use strict';
  var CX = null, S = {q: '', st: '', all: [], penuh: null, jenisList: [], dept: [], atasan: [], pengadaan: false, admin: false, nama: '', data: [], jumlah: 0}, EL = null, ED = null;
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]; }); }
  function rp(n) { return n == null || n === '' ? '' : 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID'); }
  function angka(n) { return n == null || n === '' ? '' : Math.round(Number(n) * 100 / 100).toLocaleString('id-ID'); }
  function fmtQ(n) { return String(Math.round((Number(n) || 0) * 1000) / 1000).replace('.', ','); }
  function numIn(v) { var s = String(v == null ? '' : v).trim().replace(/[^\d.,-]/g, ''); if (!s) return 0; if (/,/.test(s) && /\./.test(s)) s = s.replace(/\./g, '').replace(',', '.'); else if (/,/.test(s)) s = s.replace(',', '.'); else if (/\.\d{3}($|\.)/.test(s)) s = s.replace(/\./g, ''); var n = Number(s); return isNaN(n) ? 0 : n; }
  function normT(s) { return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
  function toast(m, bad) { if (CX && CX.toast) CX.toast(m, bad); }
  var STCLS = {'Draft': '', 'Diajukan': 'w', 'Menunggu persetujuan': 'w', 'Disetujui': 'ok', 'Ditolak': 'bad'};
  function tagSt(s) { return '<span class="tag ' + (STCLS[s] || '') + '">' + esc(s) + '</span>'; }
  /** Nama berkas: "BOQ SCTK-0001 - Judul proyek.ext" (tanpa tanggal unduh). */
  function namaBerkas(d, ext) {
    var no = String(d.nomor || '').replace(/^BOQ[\/\- ]*/i, '').replace(/[\\\/:*?"<>|]/g, '-'), jd = String(d.judul || '').replace(/[\\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim();
    var n = ('BOQ ' + no + (jd ? ' - ' + jd : '')).slice(0, 100).trim();
    return n + '.' + ext;
  }

  /* ---------- tampilan dokumen (dipakai bersama) ---------- */
  function ringkas(r) {
    var o = '<div class="sum"><div><b>' + rp(r.totalRencana) + '</b><span>Total rencana (' + r.dariBaris + ' baris)</span></div>' +
      '<div><b>' + (r.terisi ? rp(r.totalAktual) : '-') + '</b><span>Total aktual · terisi ' + r.terisi + ' dari ' + r.dariBaris + ' baris</span></div>' +
      '<div><b>' + (r.terisi ? (r.selisih > 0 ? '+' : '') + rp(r.selisih) : '-') + '</b><span>Selisih (hanya dari baris yang punya harga aktual)</span></div></div>';
    if (r.pembanding) {
      var p = r.pembanding, t = p.persen == null ? '' : (p.persen > 0 ? p.persen + '% lebih mahal' : (p.persen < 0 ? Math.abs(p.persen) + '% lebih murah' : 'sama'));
      o += '<div class="note">Pembanding: BOQ ini ' + esc(t) + ' dari rata-rata ' + p.n + ' BOQ ' + esc(p.jenis) + ' lain (rata-rata ' + rp(p.rata) + '). Hanya perbandingan fakta, bukan penilaian.</div>';
    }
    return o;
  }
  function tabelBaris(r, aksiPengadaan) {
    var adaStok = r.rows.some(function (x) { return x.stokBebas != null; });
    return '<div class="tw"><table><thead><tr><th>No</th><th>Uraian</th><th>Sat</th><th class="nm">Qty</th><th class="nm">Harga rencana</th><th class="nm">Rencana</th><th class="nm">Harga aktual</th><th class="nm">Aktual</th><th class="nm">Selisih</th>' + (adaStok ? '<th class="nm">Stok bebas</th><th class="nm">Perlu beli</th>' : '') + '</tr></thead><tbody>' + r.rows.map(function (x) {
      return '<tr><td>' + x.no + '</td><td>' + esc(x.uraian) + (x.spek ? '<small>' + esc(x.spek) + '</small>' : '') + (x.kode ? '<small>' + esc(x.kode) + '</small>' : '') + (x.ket ? '<small>' + esc(x.ket) + '</small>' : '') + (x.tanda ? '<small class="err">Harga rencana ' + (x.tanda.persen > 0 ? x.tanda.persen + '% di atas' : Math.abs(x.tanda.persen) + '% di bawah') + ' median BOQ sejenis (' + rp(x.tanda.median) + ')</small>' : '') + '</td><td>' + esc(x.satuan) + '</td><td class="nm">' + fmtQ(x.qty) + '</td><td class="nm">' + angka(x.harga) + '</td><td class="nm">' + angka(x.rencana) + '</td><td class="nm">' + (x.aktualHarga != null ? angka(x.aktualHarga) : '-') + '<small>' + esc(x.sumberAktual) + '</small></td><td class="nm">' + (x.aktual != null ? angka(x.aktual) : '-') + '</td><td class="nm">' + (x.selisih != null ? (x.selisih > 0 ? '+' : '') + angka(x.selisih) : '-') + '</td>' + (adaStok ? '<td class="nm">' + (x.stokBebas != null ? fmtQ(x.stokBebas) : '') + '</td><td class="nm">' + (x.kurang != null ? fmtQ(x.kurang) : '') + '</td>' : '') + '</tr>'; }).join('') + '</tbody></table></div>';
  }
  function kepala(d) {
    return '<div class="card"><h3 style="margin-top:0">' + esc(d.nomor) + ' · ' + esc(d.judul) + ' ' + tagSt(d.status) + '</h3><div class="note">' +
      (d.kerja ? esc(d.kerja) + '<br>' : '') + [d.jenis && 'Jenis: ' + d.jenis, d.pt && 'Untuk: ' + d.pt, d.dept && 'Dept: ' + d.dept, 'Pembuat: ' + d.pembuat, d.tgl && 'Tanggal: ' + d.tgl, d.pengaju && 'Pengaju: ' + d.pengaju, d.ppbj && 'PPBJ: ' + d.ppbj].filter(Boolean).map(esc).join(' · ') + '</div>' +
      (d.status === 'Ditolak' && d.cPutus ? '<div class="note err">Ditolak oleh ' + esc(d.putus) + ': ' + esc(d.cPutus) + '</div>' : '') + (d.status === 'Disetujui' ? '<div class="note">Disetujui oleh ' + esc(d.putus) + ' · ' + esc(d.wPutus) + '</div>' : '') + '</div>';
  }
  /** HTML dokumen lengkap (kepala + ringkasan + tabel). */
  function dokumen(r) { return kepala(r.dok) + '<div class="card" id="boqdok">' + ringkas(r) + tabelBaris(r) + '</div>'; }

  /* ---------- Excel ---------- */
  function excel(r) {
    if (typeof XLSX === 'undefined' || !XLSX.utils) { toast('Pembuat Excel belum termuat, coba lagi sebentar.', true); return; }
    var d = r.dok, aoa = [['BILL OF QUANTITY (BOQ)'], ['Nomor', d.nomor], ['Judul / proyek', d.judul], ['Nama pekerjaan', d.kerja], ['Jenis pekerjaan', d.jenis], ['Untuk PT', d.pt], ['Departemen', d.dept], ['Pembuat', d.pembuat], ['Tanggal', d.tgl], ['Pengaju', d.pengaju], ['No PPBJ', d.ppbj], ['Status', d.status], [],
      ['No', 'Uraian', 'Spesifikasi', 'Satuan', 'Qty', 'Harga Rencana', 'Rencana', 'Harga Aktual', 'Aktual', 'Selisih', 'Sumber Harga Aktual', 'Keterangan']];
    r.rows.forEach(function (x) { aoa.push([x.no, x.uraian, x.spek, x.satuan, x.qty, x.harga, x.rencana, x.aktualHarga == null ? '' : x.aktualHarga, x.aktual == null ? '' : x.aktual, x.selisih == null ? '' : x.selisih, x.sumberAktual, x.ket]); });
    aoa.push([], ['', 'TOTAL', '', '', '', '', r.totalRencana, '', r.terisi ? r.totalAktual : '', r.terisi ? r.selisih : '', 'Aktual terisi ' + r.terisi + ' dari ' + r.dariBaris + ' baris']);
    var ws = XLSX.utils.aoa_to_sheet(aoa), wb = XLSX.utils.book_new(); ws['!cols'] = [{wch: 6}, {wch: 44}, {wch: 24}, {wch: 8}, {wch: 8}, {wch: 14}, {wch: 14}, {wch: 14}, {wch: 14}, {wch: 12}, {wch: 34}, {wch: 24}];
    XLSX.utils.book_append_sheet(wb, ws, 'BOQ'); XLSX.writeFile(wb, namaBerkas(d, 'xlsx'));
  }
  function templat(contoh) {
    if (typeof XLSX === 'undefined' || !XLSX.utils) { toast('Pembuat Excel belum termuat, coba lagi sebentar.', true); return; }
    var d = [['No', 'Uraian', 'Spesifikasi', 'Satuan', 'Jumlah', 'Harga Rencana', 'Keterangan'], [1, 'Pipa PVC 3 inch', 'AW, 4 meter', 'btg', 10, 85000, 'contoh baris barang'], [2, 'Jasa pemasangan', '', 'ls', 1, 500000, 'contoh baris jasa']];
    var p = [['Petunjuk pengisian template BOQ'], [], ['1. Isi mulai baris 2 di lembar Data BOQ. Hapus dua baris contoh.'], ['2. Kolom wajib: Uraian dan Jumlah. Satuan, Spesifikasi, Harga Rencana, Keterangan boleh kosong.'], ['3. Uraian barang dicocokkan ke database barang; kode dan satuan terisi otomatis bila cocok. Jasa/barang belum terdaftar tetap diterima sebagai teks.'], ['4. Harga Rencana kosong akan diisi dari harga master bila barangnya ada. Harga aktual diisi Pengadaan, jangan di sini.'], ['5. Setelah unggah Anda melihat pratinjau dulu; tidak ada yang tersimpan sebelum menekan Simpan.']];
    var wb = XLSX.utils.book_new(), w1 = XLSX.utils.aoa_to_sheet(d); w1['!cols'] = [{wch: 5}, {wch: 40}, {wch: 24}, {wch: 8}, {wch: 8}, {wch: 14}, {wch: 26}];
    XLSX.utils.book_append_sheet(wb, w1, 'Data BOQ'); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(p), 'Petunjuk'); XLSX.writeFile(wb, 'Template BOQ.xlsx');
  }
  /** Baca tempelan/Excel: cari baris judul (ada "uraian"); kolom dikenali dari nama. */
  function bacaAoa(aoa) {
    var hi = -1, c = {};
    for (var i = 0; i < Math.min(aoa.length, 30); i++) { var row = (aoa[i] || []).map(function (x) { return normT(x); }); if (row.indexOf('uraian') >= 0 || row.some(function (x) { return x === 'nama barang' || x === 'item'; })) { hi = i; row.forEach(function (h, j) {
      if (/^(uraian|nama barang|item)$/.test(h)) c.u = j; else if (/^(spesifikasi|spek)$/.test(h)) c.s = j; else if (/^(satuan|sat)$/.test(h)) c.sat = j; else if (/^(jumlah|qty|kuantitas|volume)$/.test(h)) c.q = j; else if (/harga/.test(h) && !/aktual/.test(h)) c.h = j; else if (/^(keterangan|ket|catatan)$/.test(h)) c.k = j; else if (/^kode/.test(h)) c.kd = j; }); break; } }
    if (hi < 0 || c.u == null || c.q == null) return {rows: [], salah: ['Judul kolom "Uraian" dan "Jumlah" tidak ditemukan. Pakai template BOQ.']};
    var rows = [], salah = [];
    for (var k = hi + 1; k < aoa.length; k++) { var a = aoa[k] || [], u = String(a[c.u] == null ? '' : a[c.u]).trim(), q = numIn(a[c.q]); if (!u && !q) continue; if (/^total/i.test(u)) continue; if (!u) { salah.push('baris ' + (k + 1) + ': uraian kosong'); continue; } if (!(q > 0)) { salah.push('baris ' + (k + 1) + ': jumlah harus lebih dari 0'); continue; }
      rows.push({uraian: u, spek: c.s != null ? String(a[c.s] || '').trim() : '', satuan: c.sat != null ? String(a[c.sat] || '').trim() : '', qty: q, harga: c.h != null && a[c.h] !== '' ? numIn(a[c.h]) : '', ket: c.k != null ? String(a[c.k] || '').trim() : '', kode: c.kd != null ? String(a[c.kd] || '').trim() : ''}); }
    return {rows: rows, salah: salah};
  }

  /* ---------- PDF (desain mengikuti lembar BPB: kepala berbingkai, tabel biru tua, kotak tanda tangan) ---------- */
  function muatPdf() {
    return new Promise(function (ok, gagal) {
      if (window.jspdf && window.jspdf.jsPDF && window.jspdf.jsPDF.API && window.jspdf.jsPDF.API.autoTable) { ok(); return; }
      function skrip(u, cb) { var s = document.createElement('script'); s.src = u; s.onload = cb; s.onerror = function () { gagal(new Error('Pembuat PDF tidak bisa dimuat. Periksa koneksi internet.')); }; document.head.appendChild(s); }
      if (window.jspdf && window.jspdf.jsPDF) skrip('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js', ok);
      else skrip('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', function () { skrip('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js', ok); });
    });
  }
  async function pdf(r, ttd) {
    try { await muatPdf(); } catch (e) { toast(e.message, true); return false; }
    try {
      var d = r.dok, J = window.jspdf.jsPDF, doc = new J({orientation: 'landscape', unit: 'pt', format: 'a4'}), W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 36, y = 36;
      var aktual = r.terisi > 0;
      doc.setDrawColor(10, 42, 67); doc.setLineWidth(1.2); doc.rect(M, y, W - 2 * M, 54);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(10, 42, 67); doc.text('PT SARANA CATUR TIRTA KELOLA', M + 10, y + 18);
      doc.setFontSize(15); doc.text('BILL OF QUANTITY (BOQ)', M + 10, y + 40);
      doc.setFontSize(10); doc.text(String(d.nomor), W - M - 10, y + 18, {align: 'right'}); doc.setFont('helvetica', 'normal'); doc.text('Status: ' + d.status, W - M - 10, y + 36, {align: 'right'});
      y += 66; doc.setTextColor(20, 20, 20); doc.setFontSize(9);
      var meta = [['Judul / proyek', d.judul], ['Nama pekerjaan', d.kerja || '-'], ['Jenis pekerjaan', d.jenis || '-'], ['Untuk', d.pt || '-'], ['Departemen', d.dept || '-'], ['Pembuat / tanggal', d.pembuat + ' / ' + (d.tgl || '-')], ['No PPBJ', d.ppbj || '-']];
      var half = Math.ceil(meta.length / 2);
      meta.forEach(function (m, i) { var cx = i < half ? M : W / 2, cy = y + (i < half ? i : i - half) * 13; doc.setFont('helvetica', 'bold'); doc.text(m[0], cx, cy); doc.setFont('helvetica', 'normal'); doc.text(': ' + String(m[1]).slice(0, 70), cx + 92, cy); });
      y += half * 13 + 6;
      var head = ['No', 'Uraian', 'Spesifikasi', 'Sat', 'Qty', 'Harga Rencana', 'Rencana'].concat(aktual ? ['Harga Aktual', 'Aktual'] : []).concat(['Keterangan']);
      var body = r.rows.map(function (x) { return [x.no, x.uraian, x.spek, x.satuan, fmtQ(x.qty), angka(x.harga), angka(x.rencana)].concat(aktual ? [x.aktualHarga != null ? angka(x.aktualHarga) : '-', x.aktual != null ? angka(x.aktual) : '-'] : []).concat([x.ket]); });
      var foot = ['', 'TOTAL', '', '', '', '', angka(r.totalRencana)].concat(aktual ? ['', angka(r.totalAktual)] : []).concat(['']);
      var rt = {}; [4, 5, 6].concat(aktual ? [7, 8] : []).forEach(function (i) { rt[i] = {halign: 'right'}; });
      doc.autoTable({head: [head], body: body, foot: [foot], startY: y, margin: {left: M, right: M, bottom: 50}, styles: {fontSize: 8, cellPadding: 3, lineColor: [150, 160, 170], lineWidth: 0.4}, headStyles: {fillColor: [10, 42, 67], textColor: 255}, footStyles: {fillColor: [230, 236, 241], textColor: 20, fontStyle: 'bold'}, columnStyles: rt, showFoot: 'lastPage'});
      y = (doc.lastAutoTable ? doc.lastAutoTable.finalY : y) + 14;
      if (aktual) { doc.setFontSize(8); doc.text('Harga aktual terisi ' + r.terisi + ' dari ' + r.dariBaris + ' baris; selisih ' + (r.selisih > 0 ? '+' : '') + angka(r.selisih) + ' dihitung hanya dari baris tersebut.', M, y); y += 12; }
      if (r.pembanding && r.pembanding.persen != null) { doc.setFontSize(8); doc.text('Pembanding: ' + (r.pembanding.persen > 0 ? r.pembanding.persen + '% lebih mahal' : Math.abs(r.pembanding.persen) + '% lebih murah') + ' dari rata-rata ' + r.pembanding.n + ' BOQ ' + r.pembanding.jenis + ' lain (rata-rata ' + rp(r.pembanding.rata) + ').', M, y); y += 14; }
      var bw = (W - 2 * M - 40) / 3, bh = 92; if (y + bh + 20 > H - 40) { doc.addPage(); y = 40; }
      var kotak = [['Dibuat oleh', ttd && ttd.pembuat, d.pembuat, ''], ['Pengaju', ttd && ttd.pengaju, d.pengaju, ''], ['Disetujui', ttd && ttd.setuju, d.status === 'Disetujui' ? d.putus : (ttd && ttd.penyetuju) || '', d.status === 'Disetujui' ? d.wPutus : 'belum disetujui']];
      kotak.forEach(function (k, i) {
        var x = M + i * (bw + 20); doc.setDrawColor(10, 42, 67); doc.setLineWidth(0.8); doc.rect(x, y, bw, bh); doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.text(k[0], x + bw / 2, y + 12, {align: 'center'}); doc.line(x, y + 17, x + bw, y + 17);
        var img = k[1] && k[1].img; if (img && (i < 2 || d.status === 'Disetujui')) { try { doc.addImage(img, /png/i.test(img.slice(0, 20)) ? 'PNG' : 'JPEG', x + bw / 2 - 40, y + 22, 80, 40); } catch (e) { /* TTD tidak terbaca */ } }
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text(String(k[2] || '').slice(0, 40), x + bw / 2, y + bh - 14, {align: 'center'}); doc.setFontSize(7); doc.text(String(k[3] || ''), x + bw / 2, y + bh - 4, {align: 'center'});
      });
      var n = doc.getNumberOfPages(); for (var i = 1; i <= n; i++) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(90); doc.text(d.nomor + '  ·  Halaman ' + i + ' dari ' + n, M, H - 18); }
      doc.save(namaBerkas(d, 'pdf')); return true;
    } catch (e) { toast('Gagal membuat PDF: ' + (e.message || e), true); return false; }
  }

  /* ---------- daftar ---------- */
  function teksDok(x) { return [x.nomor, x.judul, x.kerja, x.jenis, x.dept, x.pembuat, x.ppbj].join(' '); }
  /** Saring daftar di browser (pintar, toleran salah ketik) bila seluruh dokumen sudah termuat. */
  function saringLokal() {
    var q = String(S.q || '').trim();
    S.data = q.length < 2 ? S.all.slice() : (window.CARI && CARI.saring ? CARI.saring(S.all, q, teksDok, 400).hasil : S.all.filter(function (x) { var t = teksDok(x).toLowerCase(); return q.toLowerCase().split(/\s+/).every(function (w) { return t.indexOf(w) >= 0; }); }));
    S.jumlah = S.data.length;
  }
  async function muatDaftar() {
    var r; try { r = await CX.api({action: 'boqDaftar', q: S.penuh === false ? S.q : ''}); } catch (e) { toast('Gagal terhubung ke server.', true); return null; }
    if (!r.ok) { toast(r.msg || 'Gagal.', true); return null; }
    if (S.penuh !== false) { S.all = r.data || []; S.penuh = (r.jumlah || 0) <= S.all.length; }
    S.data = r.data || []; S.jumlah = r.jumlah; if (S.penuh && S.all) saringLokal(); S.jenisList = r.jenis || []; S.dept = r.departemen || []; S.atasan = r.atasan || []; S.pengadaan = !!r.pengadaan; S.admin = !!r.admin; S.nama = r.nama || S.nama; return r;
  }
  async function daftar() {
    EL.innerHTML = '<div class="msg">Memuat...</div>'; var r = await muatDaftar(); if (!r) return; gambarDaftar();
  }
  function hasilHtml(l) {
    return (l.length ? '<div class="tw"><table><thead><tr><th>Nomor / judul</th><th>Jenis</th><th>Dept / pembuat</th><th>Status</th><th class="nm">Baris</th><th class="nm">Total rencana</th><th></th></tr></thead><tbody>' + l.map(function (x) { return '<tr><td><b>' + esc(x.nomor) + '</b><small>' + esc(x.judul) + (x.kerja ? ' · ' + esc(x.kerja) : '') + '</small></td><td>' + esc(x.jenis) + '</td><td>' + esc(x.dept) + '<small>' + esc(x.pembuat) + ' · ' + esc(x.tgl) + '</small></td><td>' + tagSt(x.status) + '</td><td class="nm">' + x.baris + '</td><td class="nm">' + angka(x.total) + '</td><td><button class="gh" data-b="' + esc(x.id) + '">Buka</button></td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="msg">Tidak ada BOQ yang cocok.</div>');
  }
  /** Hanya isian hasil dan jumlah dokumen yang diganti; kotak cari, pilihan status, dan posisi gulir tidak ikut berubah. */
  function segarkanHasil() {
    var h = $('bqhasil'); if (!h) { gambarDaftar(); return; }
    var l = S.data.filter(function (x) { return !S.st || x.status === S.st; }); h.innerHTML = hasilHtml(l);
    var j = $('bqjml'); if (j) j.textContent = S.jumlah + ' dokumen'; pasangBuka();
  }
  function pasangBuka() { Array.prototype.forEach.call(EL.querySelectorAll('button[data-b]'), function (b) { b.onclick = function () { buka(b.getAttribute('data-b')); }; }); }
  function gambarDaftar() {
    var l = S.data.filter(function (x) { return !S.st || x.status === S.st; }), cnt = {}; S.data.forEach(function (x) { cnt[x.status] = (cnt[x.status] || 0) + 1; });
    EL.innerHTML = '<div class="card"><h3 style="margin-top:0">BOQ <span class="tag" id="bqjml">' + S.jumlah + ' dokumen</span></h3><div class="note">Rencana kebutuhan dan biaya pekerjaan sebelum PPBJ dibuat. Semua departemen bisa membuat BOQ; Pengadaan mengisi harga aktual; persetujuan akhir oleh penyetuju BOQ lewat email.</div>' +
      '<div class="fr"><button class="sv" id="bqbaru">+ BOQ baru</button><input type="text" id="bqq" placeholder="Cari nomor, judul, pekerjaan, departemen...' + (S.penuh ? '' : ' (min. 3 huruf)') + '" value="' + esc(S.q) + '" style="flex:1;min-width:200px" autocomplete="off"><select id="bqst"><option value="">Semua status</option>' + ['Draft', 'Diajukan', 'Menunggu persetujuan', 'Disetujui', 'Ditolak'].map(function (s) { return '<option value="' + s + '">' + s + (cnt[s] ? ' (' + cnt[s] + ')' : '') + '</option>'; }).join('') + '</select></div><div id="bqsaran"></div>' +
      '<div id="bqhasil">' + hasilHtml(l) + '</div></div>';
    $('bqst').value = S.st; $('bqst').onchange = function () { S.st = this.value; segarkanHasil(); };
    $('bqbaru').onclick = function () { form(null); };
    var tm = null, q = $('bqq'); q.oninput = function () {
      clearTimeout(tm); var v = q.value;
      tm = setTimeout(async function () {
        S.q = v;
        if (S.penuh) { saringLokal(); }   /* seluruh dokumen sudah termuat: cari di browser, tanpa server dan tanpa batas minimal huruf */
        else { if (v.trim().length === 1 || v.trim().length === 2) return; var r = await muatDaftar(); if (!r) return; }
        segarkanHasil();
      }, S.penuh ? 120 : 350); };
    pasangBuka();
  }

  /* ---------- detail ---------- */
  async function buka(id) {
    EL.innerHTML = '<div class="msg">Memuat...</div>'; var r; try { r = await CX.api({action: 'boqBuka', id: id}); } catch (e) { toast('Gagal terhubung ke server.', true); return; }
    if (!r.ok) { toast(r.msg || 'Gagal.', true); daftar(); return; } ED = r; gambarDetail(r);
  }
  function gambarDetail(r) {
    var d = r.dok, st = d.status, bisaAjukan = (r.boleh || S.admin) && (st === 'Draft' || st === 'Ditolak'), bisaKirim = r.pengadaan && (st === 'Diajukan' || st === 'Menunggu persetujuan');
    EL.innerHTML = '<div class="fr"><button class="gh" id="bqkb">&larr; Kembali ke daftar</button></div>' + dokumen(r) +
      '<div class="card"><div class="fr">' + (r.boleh ? '<button id="bqub">Ubah isi</button>' : '') + (r.pengadaan && !r.boleh && (st === 'Draft' || st === 'Diajukan' || st === 'Ditolak') ? '<button id="bqub">Ubah / isi harga aktual</button>' : '') + '<button class="gh" id="bqsl">Salin jadi BOQ baru</button>' + (bisaAjukan ? '<button class="sv" id="bqaj">Ajukan</button>' : '') + (bisaKirim ? '<button class="gold" id="bqks">' + (st === 'Menunggu persetujuan' ? 'Kirim ulang ke penyetuju' : 'Kirim ke penyetuju') + '</button>' : '') +
      '<button class="gh" id="bqxl">Unduh Excel</button><button class="gh" id="bqpf">Unduh PDF</button>' + (r.pengadaan ? '<button class="gh" id="bqpb">Buat pengajuan pembelian</button>' : '') + '</div>' +
      (st === 'Draft' || st === 'Ditolak' ? '<div class="note">Pengaju (atasan langsung) dan departemen harus terisi sebelum diajukan. ' + (d.pengaju ? '' : '<b class="err">Pengaju belum dipilih: pilih lewat "Ubah isi".</b>') + '</div>' : '') + '</div>' +
      '<details class="card"><summary><b>Riwayat perubahan</b> <span class="note">(' + r.log.length + ')</span></summary>' + (r.log.length ? '<div class="tw"><table><thead><tr><th>Waktu</th><th>Oleh</th><th>Aksi</th><th>Rincian</th></tr></thead><tbody>' + r.log.map(function (l) { return '<tr><td>' + esc(l.waktu) + '</td><td>' + esc(l.oleh) + '</td><td>' + esc(l.aksi) + '</td><td>' + esc(l.rinci) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="note">Belum ada.</div>') + '</details>';
    $('bqkb').onclick = daftar; $('bqxl').onclick = function () { excel(r); };
    $('bqpf').onclick = async function () { this.disabled = true; try { var t = await CX.api({action: 'boqBuka', id: d.id, ttd: true}); await pdf(r, t.ok ? t.ttd : null); } catch (e) { toast('Gagal menyiapkan PDF.', true); } this.disabled = false; };
    if ($('bqub')) $('bqub').onclick = function () { form(r); };
    $('bqsl').onclick = async function () { var jd = prompt('Judul BOQ baru (nama proyek):', 'Salinan ' + d.judul); if (jd === null) return; this.disabled = true; try { var x = await CX.api({action: 'boqSalin', id: d.id, judul: jd, dept: ''}); toast(x.msg || (x.ok ? 'Disalin.' : 'Gagal.'), !x.ok); if (x.ok) { buka(x.id); return; } } catch (e) { toast('Gagal terhubung ke server.', true); } this.disabled = false; };
    if ($('bqaj')) $('bqaj').onclick = async function () { if (!confirm('Ajukan BOQ ' + d.nomor + '? Setelah diajukan, isi dikunci sampai diputuskan.')) return; this.disabled = true; try { var x = await CX.api({action: 'boqAjukan', id: d.id}); toast(x.msg || (x.ok ? 'Diajukan.' : 'Gagal.'), !x.ok); if (x.ok) { buka(d.id); return; } } catch (e) { toast('Gagal terhubung ke server.', true); } this.disabled = false; };
    if ($('bqks')) $('bqks').onclick = async function () { if (!confirm('Kirim BOQ ' + d.nomor + ' ke penyetuju lewat email?')) return; this.disabled = true; try { var x = await CX.api({action: 'boqKirimSetuju', id: d.id}); toast(x.msg || (x.ok ? 'Terkirim.' : 'Gagal.'), !x.ok); if (x.ok) { buka(d.id); return; } } catch (e) { toast('Gagal terhubung ke server.', true); } this.disabled = false; };
    if ($('bqpb')) $('bqpb').onclick = function () { pengajuan(r); };
  }
  /** Isi form Pengajuan Pembelian dari baris barang yang masih kurang stok (yang dipilih). */
  function pengajuan(r) {
    var barang = r.rows.filter(function (x) { return x.kode; }), jasa = r.rows.filter(function (x) { return !x.kode; });
    var h = '<div class="card blk"><h3 style="margin-top:0">Buat pengajuan pembelian dari ' + esc(r.dok.nomor) + '</h3><div class="note">Pilih baris yang mau dibeli. Jumlah awal = kekurangan setelah stok bebas (baris tanpa kode/jasa memakai jumlah penuh). Nanti dibuka di form Pengajuan Pembelian untuk dilengkapi.</div><div class="tw"><table><thead><tr><th></th><th>Uraian</th><th class="nm">Qty BOQ</th><th class="nm">Stok bebas</th><th class="nm">Qty beli</th></tr></thead><tbody>' +
      r.rows.map(function (x, i) { var q = x.kurang != null ? x.kurang : x.qty; return '<tr><td><input type="checkbox" data-pk="' + i + '"' + (q > 0 ? ' checked' : '') + '></td><td>' + esc(x.uraian) + '</td><td class="nm">' + fmtQ(x.qty) + '</td><td class="nm">' + (x.stokBebas != null ? fmtQ(x.stokBebas) : '-') + '</td><td class="nm"><input type="text" data-pq="' + i + '" value="' + fmtQ(q) + '" style="width:80px;text-align:right"></td></tr>'; }).join('') + '</tbody></table></div>' +
      '<div class="fr"><label>Jenis <select id="pkj"><option>PPBJ</option><option>UMO</option></select></label><label>Kategori <select id="pkk"><option>Opex</option><option>Capex</option></select></label><button class="sv" id="pkgo">Buka form pengajuan</button><button class="gh" id="pkx">Batal</button></div></div>';
    var box = $('boqaksi') || (function () { var dv = document.createElement('div'); dv.id = 'boqaksi'; EL.appendChild(dv); return dv; })(); box.innerHTML = h;
    $('pkx').onclick = function () { box.innerHTML = ''; };
    $('pkgo').onclick = function () {
      var items = []; r.rows.forEach(function (x, i) { var c = box.querySelector('input[data-pk="' + i + '"]'); if (!c || !c.checked) return; var q = numIn(box.querySelector('input[data-pq="' + i + '"]').value); if (!(q > 0)) return; items.push({kode: x.kode, nama: x.uraian, satuan: x.satuan, qty: q, harga: x.aktualHarga != null ? x.aktualHarga : x.harga, ket: 'dari ' + r.dok.nomor}); });
      if (!items.length) { toast('Pilih minimal satu baris dengan jumlah lebih dari 0.', true); return; }
      try { sessionStorage.setItem('sctk_pb_prefill', JSON.stringify({ppbj: r.dok.ppbj, proyek: r.dok.judul, dept: r.dok.dept, kategori: $('pkk').value, jenis: $('pkj').value, perihal: 'Pembelian untuk ' + r.dok.nomor + ' - ' + r.dok.judul, items: items})); } catch (e) { toast('Penyimpanan sementara peramban tidak tersedia.', true); return; }
      window.open('pembelian.html', '_blank');
    };
    box.scrollIntoView && box.scrollIntoView({behavior: 'smooth', block: 'start'});
  }

  /* ---------- form buat / ubah ---------- */
  var FR = null;
  function form(r) {
    var d = r ? r.dok : null;
    FR = {id: d ? d.id : '', judul: d ? d.judul : '', kerja: d ? d.kerja : '', jenis: d ? d.jenis : '', pt: d ? d.pt : '', dept: d ? d.dept : '', pengaju: d ? d.pengaju : '', ppbj: d ? d.ppbj : '', nomor: d ? d.nomor : '',
      rows: r ? r.rows.map(function (x) { return {kode: x.kode, uraian: x.uraian, spek: x.spek, satuan: x.satuan, qty: fmtQ(x.qty), harga: x.harga ? String(x.harga) : '', aktual: x.aktualManual === '' ? '' : String(x.aktualManual), ket: x.ket}; }) : [{kode: '', uraian: '', spek: '', satuan: '', qty: '', harga: '', aktual: '', ket: ''}]};
    if (!d) { try { var sv = JSON.parse(localStorage.getItem('sctk_boq_pref') || '{}'); FR.dept = sv.dept || ''; FR.pt = sv.pt || ''; } catch (e) { /* abaikan */ } }
    gambarForm();
  }
  function opt(list, val, kosong) { var s = '<option value="">' + (kosong || '- pilih -') + '</option>'; var ada = false; list.forEach(function (x) { if (x === val) ada = true; s += '<option' + (x === val ? ' selected' : '') + '>' + esc(x) + '</option>'; }); if (val && !ada) s += '<option selected>' + esc(val) + '</option>'; return s; }
  function jumlahForm() { var t = 0; FR.rows.forEach(function (x) { t += numIn(x.qty) * numIn(x.harga); }); return t; }
  function gambarForm() {
    var peng = S.pengadaan, edit = !!FR.id;
    EL.innerHTML = '<div class="fr"><button class="gh" id="fbk">&larr; ' + (edit ? 'Batal ubah' : 'Batal') + '</button></div><div class="card"><h3 style="margin-top:0">' + (edit ? 'Ubah ' + esc(FR.nomor) : 'BOQ baru') + '</h3>' +
      (edit ? '' : '<div class="fr"><button class="gh" id="fsalin">Mulai dari salinan BOQ lama</button><span class="note">atau isi dari kosong di bawah (ketik / unggah Excel)</span></div>') +
      '<div class="pgf"><div style="grid-column:span 2"><label>Judul BOQ / nama proyek <b class="err">*</b></label><input type="text" id="f_jd" value="' + esc(FR.judul) + '" maxlength="120"></div><div><label>Departemen pembuat</label>' + (S.dept.length ? '<select id="f_dp">' + opt(S.dept, FR.dept) + '</select>' : '<input type="text" id="f_dp" value="' + esc(FR.dept) + '" maxlength="60">') + '</div></div>' +
      '<div class="pgf"><div style="grid-column:span 2"><label>Nama pekerjaan (uraian pekerjaan)</label><input type="text" id="f_kj" value="' + esc(FR.kerja) + '" maxlength="200"></div><div><label>Jenis pekerjaan (ketik bebas; ada saran)</label><input type="text" id="f_jn" list="dl_jn" value="' + esc(FR.jenis) + '" maxlength="60"><datalist id="dl_jn">' + S.jenisList.map(function (j) { return '<option value="' + esc(j) + '">'; }).join('') + '</datalist></div></div>' +
      '<div class="pgf"><div><label>Untuk PT</label><input type="text" id="f_pt" value="' + esc(FR.pt) + '" maxlength="80"></div><div><label>Pengaju (atasan langsung)</label>' + (S.atasan.length ? '<select id="f_pg">' + opt(S.atasan, FR.pengaju) + '</select>' : '<input type="text" id="f_pg" value="' + esc(FR.pengaju) + '" maxlength="80">') + '</div><div><label>No PPBJ terkait (bila sudah ada)</label><input type="text" id="f_pp" value="' + esc(FR.ppbj) + '" maxlength="60"></div></div></div>' +
      '<div class="card"><h3 style="margin-top:0">Baris BOQ <span class="note" id="ftot"></span></h3><div class="fr"><button class="gh" id="ftpl">Unduh template Excel</button><label class="gh" style="padding:9px 13px;border:1px solid var(--line);border-radius:8px;cursor:pointer">Unggah Excel<input type="file" id="fxl" accept=".xlsx,.xls,.csv" style="display:none"></label><button class="gh" id="fadd">+ Baris</button></div><div id="fimp"></div>' +
      '<div class="tw"><table id="ftb"><thead><tr><th>#</th><th style="min-width:230px">Uraian (ketik untuk cari barang)</th><th>Spesifikasi</th><th>Sat</th><th class="nm">Qty</th><th class="nm">Harga rencana</th>' + (peng ? '<th class="nm">Harga aktual (manual)</th>' : '') + '<th>Keterangan</th><th></th></tr></thead><tbody id="fbd"></tbody></table></div></div>' +
      '<div class="card"><div class="fr"><button class="sv" id="fsv">Simpan</button><span class="note">Harga rencana kosong akan diisi harga master bila barangnya terdaftar.' + (peng ? ' Harga aktual kosong akan terisi otomatis dari PO terbaru bila ada.' : '') + '</span></div></div>';
    $('fbk').onclick = function () { if (FR.id) buka(FR.id); else daftar(); };
    ['jd:judul', 'dp:dept', 'kj:kerja', 'jn:jenis', 'pt:pt', 'pg:pengaju', 'pp:ppbj'].forEach(function (p) { var a = p.split(':'); var el = $('f_' + a[0]); el.oninput = el.onchange = function () { FR[a[1]] = this.value; }; });
    $('fadd').onclick = function () { FR.rows.push({kode: '', uraian: '', spek: '', satuan: '', qty: '', harga: '', aktual: '', ket: ''}); gambarBaris(); };
    $('ftpl').onclick = function () { templat(); };
    $('fxl').onchange = impor; $('fsv').onclick = simpan; if ($('fsalin')) $('fsalin').onclick = pilihSalin;
    gambarBaris();
  }
  function gambarBaris() {
    var peng = S.pengadaan, b = $('fbd');
    b.innerHTML = FR.rows.map(function (x, i) {
      return '<tr><td>' + (i + 1) + '</td><td style="position:relative"><input type="text" data-f="uraian" data-i="' + i + '" value="' + esc(x.uraian) + '" autocomplete="off" style="width:100%">' + (x.kode ? '<small>' + esc(x.kode) + ' <a href="#" data-lepas="' + i + '">lepas kode</a></small>' : '') + '<div class="sres" data-sr="' + i + '"></div></td><td><input type="text" data-f="spek" data-i="' + i + '" value="' + esc(x.spek) + '"></td><td><input type="text" data-f="satuan" data-i="' + i + '" value="' + esc(x.satuan) + '" style="width:60px"></td><td><input type="text" inputmode="decimal" data-f="qty" data-i="' + i + '" value="' + esc(x.qty) + '" style="width:70px;text-align:right"></td><td><input type="text" inputmode="decimal" data-f="harga" data-i="' + i + '" value="' + esc(x.harga) + '" style="width:100px;text-align:right"></td>' + (peng ? '<td><input type="text" inputmode="decimal" data-f="aktual" data-i="' + i + '" value="' + esc(x.aktual) + '" style="width:100px;text-align:right"></td>' : '') + '<td><input type="text" data-f="ket" data-i="' + i + '" value="' + esc(x.ket) + '"></td><td><button class="gh" data-hp="' + i + '">Hapus</button></td></tr>'; }).join('');
    Array.prototype.forEach.call(b.querySelectorAll('input[data-f]'), function (inp) {
      var i = Number(inp.getAttribute('data-i')), f = inp.getAttribute('data-f');
      inp.oninput = function () { FR.rows[i][f] = this.value; if (f === 'uraian') { FR.rows[i].kode = FR.rows[i].kode && FR.rows[i]._nama === this.value ? FR.rows[i].kode : ''; cariBarang(i, this.value); } hitung(); };
    });
    Array.prototype.forEach.call(b.querySelectorAll('button[data-hp]'), function (bt) { bt.onclick = function () { FR.rows.splice(Number(bt.getAttribute('data-hp')), 1); if (!FR.rows.length) FR.rows.push({kode: '', uraian: '', spek: '', satuan: '', qty: '', harga: '', aktual: '', ket: ''}); gambarBaris(); }; });
    Array.prototype.forEach.call(b.querySelectorAll('a[data-lepas]'), function (a) { a.onclick = function (e) { e.preventDefault(); FR.rows[Number(a.getAttribute('data-lepas'))].kode = ''; gambarBaris(); }; });
    hitung();
  }
  function hitung() { var e = $('ftot'); if (e) e.textContent = '· ' + FR.rows.filter(function (x) { return x.uraian.trim(); }).length + ' baris · total rencana ' + rp(jumlahForm()); }
  var CT = {};
  /* Daftar barang dan sinonim dimuat sekali (cache browser dipakai bersama form pegawai), lalu pencarian dilakukan di browser tanpa menunggu server. */
  var BL = {l: null, p: null, j: []};
  /** Jasa dan biaya (harga terbaru dari impor PO Accurate) yang cocok dengan ketikan; kode dikosongkan karena jasa tidak punya stok. */
  function jasaCocok(q) {
    var w = String(q).toLowerCase().split(/\s+/).filter(Boolean); if (!w.length || !BL.j.length) return [];
    return BL.j.filter(function (x) { var t = (x.nama + ' ' + x.kode).toLowerCase(); return w.every(function (z) { return t.indexOf(z) >= 0; }); }).slice(0, 3).map(function (x) { return {kode: x.kode, nama: x.nama, satuan: '', bebas: null, harga: x.harga, jasa: true}; });
  }
  function muatBarang() {
    if (!BL.l) { try { var c = JSON.parse(localStorage.getItem('sctk_barang_v3') || 'null'); if (c && c.items && c.items.length) BL.l = c.items; } catch (e) { /* abaikan */ } }
    if (!BL.p) {
      BL.p = Promise.all([
        CX.api({action: 'barang'}).then(function (r) { if (r && r.ok && r.items && r.items.length) { BL.l = r.items; try { localStorage.setItem('sctk_barang_v3', JSON.stringify({t: Date.now(), items: r.items})); } catch (e) { /* abaikan */ } } }).catch(function () { /* pakai jalur server */ }),
        CX.api({action: 'boqJasa'}).then(function (r) { if (r && r.ok) BL.j = r.data || []; }).catch(function () { /* tanpa daftar jasa */ }),
        CX.api({action: 'sinonim'}).then(function (r) { if (r && r.ok && window.CARI && CARI.sinonim) CARI.sinonim(r.barang || {}); }).catch(function () { /* tanpa sinonim */ })
      ]);
    }
    return BL.l ? Promise.resolve(BL.l) : BL.p.then(function () { return BL.l; });
  }
  function lokalSiap() { return !!(BL.l && window.CARI && CARI.saring); }
  function hasilLokal(q) {
    return CARI.saring(BL.l, q, function (b) { return b.nama + ' ' + b.kode; }, 60).hasil.slice(0, 15).map(function (b) { return {kode: b.kode, nama: b.nama, satuan: b.satuan, bebas: null, harga: 0, lokal: true}; });
  }
  /** Stok bebas dan harga diambil satu kali setelah barang dipilih (bukan tiap ketikan). */
  function lengkapiBarang(i, kode) {
    CX.api({action: 'boqBarang', q: kode}).then(function (r) {
      if (!r || !r.ok) return;
      var d = (r.data || []).filter(function (x) { return String(x.kode).toLowerCase() === String(kode).toLowerCase(); })[0], row = FR && FR.rows[i];
      if (!d || !row || row.kode !== kode || numIn(row.harga) || !d.harga) return;
      row.harga = String(d.harga); var el = document.querySelector('input[data-f="harga"][data-i="' + i + '"]'); if (el) el.value = row.harga; hitung();
    }).catch(function () { /* harga bisa diisi manual */ });
  }
  /* Daftar saran melayang di luar tabel (tabel punya overflow, jadi dipasang fixed menurut posisi kotak ketik). */
  function taruhSaran(box) {
    if (!box || !box.firstChild) return;
    var inp = box.parentNode && box.parentNode.querySelector('input[data-f="uraian"]'); if (!inp) return;
    var r = inp.getBoundingClientRect(), tinggiBawah = window.innerHeight - r.bottom - 12, tinggiAtas = r.top - 12, atas = tinggiBawah < 160 && tinggiAtas > tinggiBawah;
    box.style.left = Math.max(4, r.left) + 'px'; box.style.width = Math.max(260, r.width) + 'px';
    var mh = Math.max(120, Math.min(280, atas ? tinggiAtas : tinggiBawah)); box.style.maxHeight = mh + 'px';
    if (atas) { box.style.top = 'auto'; box.style.bottom = (window.innerHeight - r.top + 2) + 'px'; } else { box.style.bottom = 'auto'; box.style.top = (r.bottom + 2) + 'px'; }
  }
  function taruhSemuaSaran() { Array.prototype.forEach.call(document.querySelectorAll('.sres'), taruhSaran); }
  window.addEventListener('scroll', taruhSemuaSaran, true); window.addEventListener('resize', taruhSemuaSaran);
  function cariBarang(i, q) {
    clearTimeout(CT[i]); var box = document.querySelector('[data-sr="' + i + '"]'); if (!box) return; if (String(q).trim().length < 2) { box.innerHTML = ''; return; }
    CT[i] = setTimeout(async function () {
      var data;
      if (lokalSiap()) data = hasilLokal(q);
      else { var r; try { r = await CX.api({action: 'boqBarang', q: q}); } catch (e) { return; } if (!r || !r.ok) return; data = r.data; }
      box = document.querySelector('[data-sr="' + i + '"]'); if (!box) return;
      data = data.slice(0, 5).concat(jasaCocok(q));
      box.innerHTML = data.slice(0, 8).map(function (h, k) { return '<button type="button" class="hs" data-k="' + k + '">' + esc(h.nama) + ' <small>' + (h.jasa ? 'Jasa' : esc(h.kode) + ' · ' + esc(h.satuan)) + (h.bebas != null ? ' · bebas ' + fmtQ(h.bebas) : '') + (h.harga ? ' · ' + rp(h.harga) : '') + '</small></button>'; }).join('') + (data.length ? '<button type="button" class="hs" data-k="x"><small>Pakai teks ini apa adanya (jasa / belum terdaftar)</small></button>' : '');
      taruhSaran(box);
      Array.prototype.forEach.call(box.querySelectorAll('button'), function (bt) { bt.onclick = function () { var k = bt.getAttribute('data-k'); if (k === 'x') { box.innerHTML = ''; return; } var h = data[Number(k)], row = FR.rows[i]; if (h.jasa) { row.kode = ''; row.uraian = h.nama; row._nama = ''; if (!numIn(row.harga) && h.harga) row.harga = String(h.harga); gambarBaris(); return; } row.kode = h.kode; row.uraian = h.nama; row._nama = h.nama; row.satuan = h.satuan; if (!numIn(row.harga) && h.harga) row.harga = String(h.harga); gambarBaris(); if (h.lokal) lengkapiBarang(i, h.kode); }; });
    }, lokalSiap() ? 60 : 280);
  }
  async function simpan() {
    var b = $('fsv'); if (!FR.judul.trim()) { toast('Isi judul BOQ (nama proyek).', true); return; }
    var rows = FR.rows.filter(function (x) { return x.uraian.trim() || numIn(x.qty); }).map(function (x) { return {kode: x.kode, uraian: x.uraian, spek: x.spek, satuan: x.satuan, qty: numIn(x.qty), harga: x.harga === '' ? '' : numIn(x.harga), aktual: x.aktual === '' ? '' : numIn(x.aktual), ket: x.ket}; });
    if (!rows.length) { toast('Isi minimal satu baris.', true); return; } b.disabled = true;
    try {
      var x = await CX.api({action: 'boqSimpanDok', id: FR.id, judul: FR.judul, kerja: FR.kerja, jenis: FR.jenis, pt: FR.pt, dept: FR.dept, pengaju: FR.pengaju, ppbj: FR.ppbj, rows: rows});
      toast(x.msg || (x.ok ? 'Tersimpan.' : 'Gagal.'), !x.ok);
      if (x.ok) { try { localStorage.setItem('sctk_boq_pref', JSON.stringify({dept: FR.dept, pt: FR.pt})); } catch (e) { /* abaikan */ } buka(x.id); return; }
    } catch (e) { toast('Gagal terhubung ke server.', true); }
    b.disabled = false;
  }
  async function pilihSalin() {
    var box = $('fimp'); box.innerHTML = '<div class="card blk"><b>Pilih BOQ sebagai dasar</b><div class="fr"><input type="text" id="sq" placeholder="Cari nomor atau judul BOQ lama..." style="flex:1"></div><div id="sh"></div></div>';
    var ur = async function () { var r = await CX.api({action: 'boqDaftar', q: $('sq').value}); if (!r.ok) return; $('sh').innerHTML = r.data.slice(0, 12).map(function (x) { return '<div class="fr"><button class="gh" data-s="' + esc(x.id) + '">Pakai</button> <span><b>' + esc(x.nomor) + '</b> ' + esc(x.judul) + ' <small>' + esc(x.jenis) + ' · ' + x.baris + ' baris · ' + rp(x.total) + '</small></span></div>'; }).join('') || '<div class="note">Tidak ada.</div>';
      Array.prototype.forEach.call($('sh').querySelectorAll('button[data-s]'), function (bt) { bt.onclick = async function () { bt.disabled = true; var jd = prompt('Judul BOQ baru (nama proyek):', FR.judul || ''); if (jd === null) { bt.disabled = false; return; } var x = await CX.api({action: 'boqSalin', id: bt.getAttribute('data-s'), judul: jd || '', dept: FR.dept}); toast(x.msg || (x.ok ? 'Disalin.' : 'Gagal.'), !x.ok); if (x.ok) { var r2 = await CX.api({action: 'boqBuka', id: x.id}); if (r2.ok) { ED = r2; form(r2); return; } } bt.disabled = false; }; }); };
    var tm = null; $('sq').oninput = function () { clearTimeout(tm); tm = setTimeout(ur, 300); }; ur();
  }
  /* ---------- impor Excel dengan pratinjau ---------- */
  async function impor() {
    var f = this.files[0]; this.value = ''; if (!f) return; if (typeof XLSX === 'undefined') { toast('Pembaca Excel belum termuat.', true); return; }
    var box = $('fimp'); box.innerHTML = '<div class="msg">Membaca dan mencocokkan ke database barang...</div>';
    try {
      var wb = XLSX.read(await f.arrayBuffer(), {type: 'array'}), ws = wb.Sheets[wb.SheetNames[0]] || wb.Sheets[wb.SheetNames[1]], aoa = XLSX.utils.sheet_to_json(ws, {header: 1, defval: ''}), b = bacaAoa(aoa);
      if (b.salah.length && !b.rows.length) { box.innerHTML = '<div class="card blk err">' + esc(b.salah[0]) + '</div>'; return; }
      var c = await CX.api({action: 'boqCocok', rows: b.rows.map(function (x) { return {uraian: x.uraian, kode: x.kode}; })});
      if (!c.ok) { box.innerHTML = '<div class="card blk err">' + esc(c.msg || 'Gagal mencocokkan.') + '</div>'; return; }
      var pil = b.rows.map(function (x, i) { var h = c.hasil[i]; return {x: x, h: h, pilih: h.status === 'cocok' ? 'c' : (h.status === 'mirip' ? '' : 'j')}; });
      var tampil = function () {
        box.innerHTML = '<div class="card blk"><h3 style="margin-top:0">Pratinjau unggahan (' + pil.length + ' baris)</h3>' + (b.salah.length ? '<div class="note err">Dilewati: ' + esc(b.salah.slice(0, 5).join('; ')) + '</div>' : '') + '<div class="note">Cocok = barang ditemukan di database. Mirip = pilih barang yang dimaksud, atau pakai sebagai teks (jasa / belum terdaftar). Belum ada yang tersimpan.</div><div class="tw"><table><thead><tr><th>#</th><th>Uraian di Excel</th><th class="nm">Qty</th><th>Hasil pencocokan</th></tr></thead><tbody>' + pil.map(function (p, i) {
          var h = p.h, ket;
          if (h.status === 'cocok') ket = '<span class="tag ok">Cocok</span> ' + esc(h.nama) + ' <small>' + esc(h.kode) + ' · ' + esc(h.satuan) + '</small>';
          else if (h.status === 'mirip') ket = '<span class="tag w">Mirip</span> <select data-pm="' + i + '"><option value="">- pilih -</option>' + h.kandidat.map(function (k, j) { return '<option value="' + j + '"' + (p.pilih === String(j) ? ' selected' : '') + '>' + esc(k.nama) + ' (' + esc(k.kode) + ')</option>'; }).join('') + '<option value="j"' + (p.pilih === 'j' ? ' selected' : '') + '>Pakai sebagai teks (jasa / belum terdaftar)</option></select>';
          else ket = '<span class="tag">Tidak ada</span> dipakai sebagai teks';
          return '<tr><td>' + (i + 1) + '</td><td>' + esc(p.x.uraian) + '</td><td class="nm">' + fmtQ(p.x.qty) + '</td><td>' + ket + '</td></tr>'; }).join('') + '</tbody></table></div><div class="fr"><button class="sv" id="imok">Masukkan ke BOQ</button><button class="gh" id="imx">Batal</button></div></div>';
        Array.prototype.forEach.call(box.querySelectorAll('select[data-pm]'), function (s) { s.onchange = function () { pil[Number(s.getAttribute('data-pm'))].pilih = this.value; }; });
        $('imx').onclick = function () { box.innerHTML = ''; };
        $('imok').onclick = function () {
          var blm = pil.filter(function (p) { return p.h.status === 'mirip' && p.pilih === ''; }).length; if (blm && !confirm(blm + ' baris "Mirip" belum dipilih dan akan dimasukkan sebagai teks. Lanjutkan?')) return;
          if (FR.rows.length === 1 && !FR.rows[0].uraian.trim() && !FR.rows[0].qty) FR.rows = [];
          pil.forEach(function (p) { var h = p.h, x = p.x, row = {kode: x.kode || '', uraian: x.uraian, spek: x.spek, satuan: x.satuan, qty: fmtQ(x.qty), harga: x.harga === '' ? '' : String(x.harga), aktual: '', ket: x.ket};
            var k = h.status === 'cocok' ? h : (h.status === 'mirip' && p.pilih !== '' && p.pilih !== 'j' ? h.kandidat[Number(p.pilih)] : null);
            if (k) { row.kode = k.kode; row.uraian = k.nama; row._nama = k.nama; if (!row.satuan) row.satuan = k.satuan; if (row.harga === '' && k.harga) row.harga = String(k.harga); } FR.rows.push(row); });
          box.innerHTML = ''; gambarBaris(); toast(pil.length + ' baris dimasukkan. Periksa lalu Simpan.');
        };
      };
      tampil();
    } catch (e) { box.innerHTML = '<div class="card blk err">Gagal membaca berkas: ' + esc(e.message || e) + '</div>'; }
  }

  async function mount(el, ctx) { EL = el; CX = ctx; S.q = ''; S.st = ''; S.penuh = null; S.all = []; await daftar(); try { muatBarang(); } catch (e) { /* jalur server tetap jalan */ } }
  root.BoqUI = {mount: mount, dokumen: dokumen, kepala: kepala, ringkas: ringkas, tabel: tabelBaris, pdf: pdf, excel: excel, namaBerkas: namaBerkas, bacaAoa: bacaAoa, setCtx: function (c) { CX = c; }};
})(window);
