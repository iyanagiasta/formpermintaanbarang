/* T162: Data susulan Rekap PPBJ lewat template Excel (admin > Laporan > Rekap PPBJ > Data susulan).
   Empat jenis: Harga barang, Penerimaan lama, Garis waktu proyek, Keterangan penyimpangan.
   Template diisi otomatis dengan baris yang masih kosong dari rekap yang sedang dimuat. Unggah -> pratinjau (baru, diganti, dihapus, diabaikan, ditolak) -> simpan.
   Data resmi (sistem gudang / Accurate) selalu menang; template hanya mengisi yang kosong.
   Bergantung: XT (xlsx-tulis.js), MC.sheetKeBaris (mutasi-acc.js), JSZip (dimuat saat perlu). */
(function (root) {
  'use strict';
  var S = {};
  function arr(x) { return Array.isArray(x) ? x : []; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
  function tg(s) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '')); return m ? m[3] + '/' + m[2] + '/' + m[1] : String(s || ''); }
  function rp(n) { return n == null || n === '' ? '' : 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID'); }
  var LEMBAR = {
    HARGA: {nama: 'Harga Barang', kol: ['Kode Barang', 'Nama Barang', 'Satuan', 'Harga Satuan (isi)', 'Keterangan / sumber harga', 'Hapus (isi YA)'], lebar: [16, 40, 9, 18, 34, 12], isi: [3, 4]},
    TERIMA: {nama: 'Penerimaan Lama', kol: ['No PPBJ', 'Nama Proyek', 'No PO', 'Kode Barang', 'Nama Barang', 'Dipesan', 'Qty Datang (isi)', 'Tanggal Datang (isi, dd/mm/yyyy)', 'No Surat Jalan / Keterangan', 'Hapus (isi YA)'], lebar: [20, 30, 20, 16, 34, 9, 14, 20, 28, 12], isi: [6, 7, 8]},
    GARIS: {nama: 'Garis Waktu', kol: ['No PPBJ', 'Nama Proyek', 'Tgl PPBJ', 'Tanggal Mulai (isi, dd/mm/yyyy)', 'Rencana Selesai (isi, dd/mm/yyyy)', 'Keterangan', 'Hapus (isi YA)'], lebar: [20, 40, 11, 20, 20, 34, 12], isi: [3, 4, 5]},
    PYP: {nama: 'Keterangan Penyimpangan', kol: ['No PPBJ', 'Nama Proyek', 'Kode Barang', 'Nama Barang', 'Jenis Penyimpangan', 'RAB', 'Keluar Bersih', 'Keterangan / alasan (isi)', 'Disetujui Oleh', 'Hapus (isi YA)'], lebar: [20, 30, 16, 34, 20, 8, 10, 40, 20, 12], isi: [7, 8]}
  };
  /* ---------- angka dan tanggal dari sel Excel ---------- */
  S.tgl = function (v) {
    if (v == null || v === '') return '';
    if (typeof v === 'number' || /^\d{4,5}(\.\d+)?$/.test(String(v))) { var n = Number(v); if (n > 20000 && n < 80000) { var d = new Date(Date.UTC(1899, 11, 30) + Math.round(n) * 864e5); return d.toISOString().slice(0, 10); } }
    var s = String(v).trim(), m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/.exec(s);
    if (m) { var dd = +m[1], mm = +m[2]; if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) return m[3] + '-' + ('0' + mm).slice(-2) + '-' + ('0' + dd).slice(-2); }
    m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s); if (m) return m[1] + '-' + m[2] + '-' + m[3];
    return s;
  };
  S.angka = function (v) {
    if (v == null || v === '') return '';
    if (typeof v === 'number') return v;
    var s = String(v).replace(/rp/ig, '').replace(/\s/g, '');
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
    else if (/^-?\d+,\d+$/.test(s)) s = s.replace(',', '.');
    else if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, '');
    var n = Number(s); return isFinite(n) ? n : String(v);
  };
  /* ---------- yang masih kosong di rekap ---------- */
  S.perlu = function (res) {
    var P = {tanpaRab: [], harga: {}, terima: [], garis: [], pyp: [], ada: {HARGA: 0, TERIMA: 0, GARIS: 0, PYP: 0}};
    arr(res && res.ppbj).forEach(function (g) {
      var r2 = g.r2 || {}, lk = r2.lk || {}, w = r2.garis || {};
      if (r2.terdaftar && lk.rab === false) P.tanpaRab.push(g);
      P.garis.push({g: g, ada: !!w.tpl});
      if (w.tpl) P.ada.GARIS++;
      function hg(x) { var a = x.ang; if (!a || !(a.rab > 0) || !x.kode) return; if (a.harga == null || a.hargaTpl) { var k = String(x.kode).toUpperCase(); if (!P.harga[k]) P.harga[k] = {kode: x.kode, nama: x.nama, sat: x.sat || '', harga: a.hargaTpl ? a.harga : ''}; } }
      arr(g.b).forEach(function (b) {
        hg(b);
        var t = b.trm;
        if (t && t.dipesan > 0 && ((!(t.gudang > 0) && !t.riBelum) || t.tpl) && !(t.ri > 0)) P.terima.push({g: g, b: b});
        if (t && t.tpl) P.ada.TERIMA++;
        if (arr(b.ms2).some(function (m) { return m === 'lebihRab' || m === 'luarRab'; })) P.pyp.push({g: g, b: b});
        if (b.pyp) P.ada.PYP++;
      });
      arr(g.rabLain).forEach(hg);
    });
    Object.keys(P.harga).forEach(function (k) { if (P.harga[k].harga !== '') P.ada.HARGA++; });
    P.n = {tanpaRab: P.tanpaRab.length, harga: Object.keys(P.harga).filter(function (k) { return P.harga[k].harga === ''; }).length, terima: P.terima.filter(function (x) { return !x.b.trm.tpl; }).length,
      garis: P.garis.filter(function (x) { return x.g.r2 && x.g.r2.terdaftar && !x.ada; }).length, pyp: P.pyp.filter(function (x) { return !x.b.pyp; }).length};
    return P;
  };
  /* ---------- template ---------- */
  S.template = function (res) {
    var XT = root.XT, wb = XT.buku(), P = S.perlu(res), wkt = res && res.waktu ? res.waktu : '';
    var gH = {font: {b: true, sz: 10, color: 'FFFFFF'}, fill: '1A6CAB', border: {l: true, r: true, t: true, b: true}, al: {h: 'center', v: 'center', wrap: true}};
    var gI = {font: {b: true, sz: 10}, fill: 'FCF3CF', border: {l: true, r: true, t: true, b: true}, al: {h: 'center', v: 'center', wrap: true}};
    var sl = function (isi) { var g = {font: {sz: 10}, border: {l: true, r: true, t: true, b: true}, al: {v: 'top', wrap: true}}; if (isi) g.fill = 'FEF9E7'; return g; };
    var pt = wb.sheet('Petunjuk', {warna: '7F8C8D'}), T = [
      ['TEMPLATE DATA SUSULAN REKAP PPBJ', ''], ['Dibuat dari rekap per', wkt], ['', ''],
      ['Cara isi', 'Isi hanya kolom berlatar kuning (judulnya bertanda "isi"). Kolom lain sudah terisi dari sistem; jangan diubah. Baris yang kolom isiannya kosong dilewati.'],
      ['Tanggal', 'Tulis dd/mm/yyyy, misalnya 05/11/2026. Tanggal yang diketik sebagai tanggal Excel juga terbaca.'],
      ['Angka', 'Boleh 1250000 atau 1.250.000. Tanpa "Rp" juga boleh.'],
      ['Harga Barang', 'Barang di RAB yang belum punya harga. Harga dipakai untuk nilai RAB dan nilai lebih RAB (diberi label "dari template"). Bila nanti harga resmi ada (data Accurate atau harga gudang), harga resmi yang dipakai.'],
      ['Penerimaan Lama', 'Barang yang sudah dipesan tetapi belum ada catatan datang (misalnya datang sebelum sistem gudang digital dipakai). Dipakai hanya bila belum ada catatan penerimaan resmi dan RI Accurate.'],
      ['Garis Waktu', 'Tanggal mulai dan rencana selesai proyek. Lama berjalan dihitung dari tanggal mulai; proyek aktif yang melewati rencana selesai ditandai Perlu perhatian.'],
      ['Keterangan Penyimpangan', 'Alasan barang keluar melebihi atau di luar RAB. Bila kolom "Disetujui Oleh" diisi, barang melebihi RAB itu tidak lagi membuat proyek Berisiko (tetap tercatat sebagai Perlu perhatian).'],
      ['Menghapus', 'Isi YA di kolom "Hapus" untuk menghapus data yang tersimpan pada baris itu.'],
      ['Unggah', 'Admin > Laporan > Rekap PPBJ > tombol Data susulan > pilih file ini. Sistem menampilkan pratinjau (baru, diganti, dihapus, diabaikan, ditolak) sebelum menyimpan. Unggah ulang mengganti data dengan kunci sama; data lama tersimpan di riwayat.']];
    T.forEach(function (z, i) { pt.set(i + 1, 1, z[0], {font: {b: true, sz: i ? 10 : 13}, al: {v: 'top'}}); pt.set(i + 1, 2, z[1], {font: {sz: 10}, al: {v: 'top', wrap: true}}); });
    pt.kolom(1, 26); pt.kolom(2, 110);
    function lembar(j, baris) {
      var L = LEMBAR[j], s = wb.sheet(L.nama, {warna: j === 'HARGA' ? '1E8449' : j === 'TERIMA' ? '17A589' : j === 'GARIS' ? '2471A3' : 'C0392B'});
      L.kol.forEach(function (n, i) { s.set(1, i + 1, n, L.isi.indexOf(i) >= 0 ? gI : gH); s.kolom(i + 1, L.lebar[i]); });
      s.baris(1, 32);
      baris.forEach(function (v, r) { v.forEach(function (x, c) { s.set(r + 2, c + 1, x == null ? '' : x, sl(L.isi.indexOf(c) >= 0)); }); for (var c = v.length; c < L.kol.length; c++) s.set(r + 2, c + 1, '', sl(L.isi.indexOf(c) >= 0)); });
      for (var e = 0; e < 20; e++) L.kol.forEach(function (n, c) { s.set(baris.length + 2 + e, c + 1, '', sl(L.isi.indexOf(c) >= 0)); });
      s.bekukan(2, 1);
      return baris.length;
    }
    var n = {};
    n.HARGA = lembar('HARGA', Object.keys(P.harga).sort().map(function (k) { var h = P.harga[k]; return [h.kode, h.nama, h.sat, h.harga, '']; }));
    n.TERIMA = lembar('TERIMA', P.terima.map(function (x) { var t = x.b.trm || {}, tp = t.tpl || {}; return [x.g.no, x.g.proyek || '', arr(x.b.po).map(function (p) { return p.no; }).join(', '), x.b.kode, x.b.nama, t.dipesan, tp.qty || '', tp.tgl ? tg(tp.tgl) : '', tp.ket || '']; }));
    n.GARIS = lembar('GARIS', P.garis.slice().sort(function (a, c) { var x = a.g.r2 && a.g.r2.terdaftar ? 0 : 1, y = c.g.r2 && c.g.r2.terdaftar ? 0 : 1; return x - y; }).map(function (x) { var w = (x.g.r2 || {}).garis || {}; return [x.g.no, x.g.proyek || '', tg(x.g.tgl), w.tpl && w.mulai ? tg(w.mulai) : '', w.tpl && w.rencana ? tg(w.rencana) : '', w.tpl ? w.ket || '' : '']; }));
    n.PYP = lembar('PYP', P.pyp.map(function (x) { var a = x.b.ang || {}, p = x.b.pyp || {}; return [x.g.no, x.g.proyek || '', x.b.kode, x.b.nama, arr(x.b.ms2).indexOf('lebihRab') >= 0 ? 'Melebihi RAB' : 'Di luar RAB', a.rab || 0, a.bersih || 0, p.ket || '', p.setuju || '']; }));
    return {wb: wb, n: n};
  };
  /* ---------- baca file ---------- */
  function norm(s) { return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
  var PETA = {
    HARGA: [['kode barang', 'kode'], ['nama barang', 'nama'], ['harga satuan', 'harga'], ['keterangan', 'ket'], ['hapus', 'hapus']],
    TERIMA: [['no ppbj', 'ppbj'], ['kode barang', 'kode'], ['nama barang', 'nama'], ['qty datang', 'qty'], ['tanggal datang', 'tgl1'], ['no surat jalan', 'ket'], ['hapus', 'hapus']],
    GARIS: [['no ppbj', 'ppbj'], ['tanggal mulai', 'tgl1'], ['rencana selesai', 'tgl2'], ['keterangan', 'ket'], ['hapus', 'hapus']],
    PYP: [['no ppbj', 'ppbj'], ['kode barang', 'kode'], ['nama barang', 'nama'], ['keterangan', 'ket'], ['disetujui oleh', 'setuju'], ['hapus', 'hapus']]
  };
  var ISI = {HARGA: ['harga'], TERIMA: ['qty', 'tgl1'], GARIS: ['tgl1', 'tgl2', 'ket'], PYP: ['ket', 'setuju']};
  S.baris = function (lembarRows) {   // {namaLembar: rows[][]} -> {rows, lewat}
    var out = [], lewat = 0, dikenal = 0;
    Object.keys(lembarRows).forEach(function (nm) {
      var j = Object.keys(LEMBAR).filter(function (k) { return norm(LEMBAR[k].nama) === norm(nm); })[0]; if (!j) return; dikenal++;
      var R = lembarRows[nm] || [], hd = (R[0] || []).map(norm), idx = {};
      PETA[j].forEach(function (p) { for (var c = 0; c < hd.length; c++) if (hd[c] && hd[c].indexOf(p[0]) === 0 && idx[p[1]] == null) { idx[p[1]] = c; break; } });
      for (var i = 1; i < R.length; i++) {
        var row = R[i] || [], o = {jenis: j, baris: LEMBAR[j].nama + ' baris ' + (i + 1)};
        Object.keys(idx).forEach(function (f) { var v = row[idx[f]]; o[f] = v == null ? '' : v; });
        if (o.harga !== undefined) o.harga = S.angka(o.harga);
        if (o.qty !== undefined) o.qty = S.angka(o.qty);
        if (o.tgl1 !== undefined) o.tgl1 = S.tgl(o.tgl1);
        if (o.tgl2 !== undefined) o.tgl2 = S.tgl(o.tgl2);
        ['ppbj', 'kode', 'nama', 'ket', 'setuju', 'hapus'].forEach(function (f) { if (o[f] !== undefined) o[f] = String(o[f]).trim(); });
        var isi = ISI[j].some(function (f) { return o[f] !== undefined && o[f] !== ''; }) || /^(ya|y|hapus)$/i.test(o.hapus || '');
        if (!isi) { if (o.ppbj || o.kode) lewat++; continue; }
        out.push(o);
      }
    });
    return {rows: out, lewat: lewat, dikenal: dikenal};
  };
  S.bacaFile = function (JSZip, buf) {
    var MCX = root.MACM || root.MC; if (!MCX || !MCX.sheetKeBaris) return Promise.reject(new Error('Pembaca Excel belum termuat. Muat ulang halaman.'));
    return JSZip.loadAsync(buf).then(function (z) {
      var f = function (p) { var x = z.file(p); return x ? x.async('string') : Promise.resolve(''); };
      return Promise.all([f('xl/workbook.xml'), f('xl/_rels/workbook.xml.rels'), f('xl/sharedStrings.xml')]).then(function (a) {
        var wb = a[0], rels = a[1], ss = a[2], shared = [], m, sre = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
        while ((m = sre.exec(ss))) { var t = '', tre = /<t\b[^>]*>([\s\S]*?)<\/t>/g, q; while ((q = tre.exec(m[1]))) t += q[1]; shared.push(t.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')); }
        var L = [], re = /<sheet\b[^>]*>/g, s0;
        while ((s0 = re.exec(wb))) { var nm = (/\bname="([^"]*)"/.exec(s0[0]) || [])[1] || '', id = (/\br:id="([^"]+)"/.exec(s0[0]) || [])[1]; if (!id) continue; var rm = new RegExp('<Relationship\\b[^>]*Id="' + id + '"[^>]*>').exec(rels || ''), tg0 = rm ? (/Target="([^"]+)"/.exec(rm[0]) || [])[1] : ''; if (!tg0) continue; L.push({nama: nm.replace(/&amp;/g, '&'), path: tg0.charAt(0) === '/' ? tg0.slice(1) : 'xl/' + tg0.replace(/^\.\//, '')}); }
        return Promise.all(L.map(function (x) { return f(x.path).then(function (xml) { return {nama: x.nama, rows: xml ? MCX.sheetKeBaris(xml, shared) : []}; }); }));
      }).then(function (A) { var o = {}; A.forEach(function (x) { o[x.nama] = x.rows; }); return S.baris(o); });
    });
  };
  /* ---------- jendela ---------- */
  var ST = {baru: ['Baru', 'g'], ubah: ['Diganti', 'b'], hapus: ['Dihapus', 'r'], abaikan: ['Diabaikan', 'l'], tolak: ['Ditolak', 'r']};
  function nilaiTeks(o) {
    if (o.jenis === 'HARGA') return rp(o.harga);
    if (o.jenis === 'TERIMA') return (o.qty || '') + ' datang ' + tg(o.tgl1);
    if (o.jenis === 'GARIS') return (o.tgl1 ? 'mulai ' + tg(o.tgl1) : '') + (o.tgl2 ? ' rencana selesai ' + tg(o.tgl2) : '');
    return (o.ket || '') + (o.setuju ? ' (disetujui ' + o.setuju + ')' : '');
  }
  S.buka = function (op) {
    var res = op.res, P = S.perlu(res), state = {rows: null, hasil: null, berkas: '', f: ''};
    var h = '<div class="rk-md" id="rksMd" role="dialog" aria-modal="true" aria-label="Data susulan"><div class="rk-mdb" style="max-width:980px">' +
      '<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><div><b>Data susulan Rekap PPBJ</b><div class="note">Isi data yang belum ada di sistem lewat template Excel. Data resmi dari sistem gudang dan Accurate selalu menang; template hanya mengisi yang kosong dan diberi label "dari template".</div></div><button class="gh" id="rksTutup">Tutup</button></div>' +
      '<div class="rk-sum" style="margin-top:8px"><div><b>' + P.n.harga + '</b><span>barang RAB tanpa harga</span></div><div><b>' + P.n.terima + '</b><span>barang dipesan, belum ada catatan datang</span></div><div><b>' + P.n.garis + '</b><span>PPBJ terdaftar tanpa rencana selesai</span></div><div><b>' + P.n.pyp + '</b><span>penyimpangan belum berketerangan</span></div></div>' +
      '<div class="note">Sudah tersimpan dari template: ' + P.ada.HARGA + ' harga, ' + P.ada.TERIMA + ' penerimaan lama, ' + P.ada.GARIS + ' garis waktu, ' + P.ada.PYP + ' keterangan penyimpangan.</div>' +
      '<div class="rk-fl"><b>1.</b> <button class="sv" id="rksUnduh">Unduh template</button><span class="note">Berisi baris yang masih kosong dan data template yang sudah tersimpan.</span></div>' +
      '<div class="rk-fl"><b>2.</b> <label class="gh" style="cursor:pointer;padding:6px 10px;border:1px solid var(--line,#ccd);border-radius:6px">Pilih file template terisi<input type="file" id="rksFile" accept=".xlsx" style="display:none"></label><span class="note" id="rksNama"></span></div>' +
      '<div id="rksHasil"></div></div></div>';
    var w = document.createElement('div'); w.innerHTML = h; document.body.appendChild(w.firstChild);
    var md = document.getElementById('rksMd'), $ = function (id) { return document.getElementById(id); };
    function tutup() { if (md && md.parentNode) md.parentNode.removeChild(md); document.removeEventListener('keydown', esk); }
    function esk(ev) { if (ev.key === 'Escape') tutup(); }
    md.onclick = function (ev) { if (ev.target === md) tutup(); }; $('rksTutup').onclick = tutup; document.addEventListener('keydown', esk);
    $('rksUnduh').onclick = function () {
      if (!root.XT) { op.toast('Penulis Excel belum termuat. Muat ulang halaman.', true); return; }
      op.muatJSZip().then(function (Z) { var T = S.template(res); return T.wb.simpan(Z).then(function (u) { return {u: u, n: T.n}; }); }).then(function (o) {
        var tgl = new Date(), iso = tgl.getFullYear() + '-' + ('0' + (tgl.getMonth() + 1)).slice(-2) + '-' + ('0' + tgl.getDate()).slice(-2), nama = 'Template Data Susulan Rekap PPBJ ' + iso + '.xlsx';
        try { if (root.NB && root.NB.buat) nama = root.NB.buat('xlsx', 'Template Data Susulan Rekap PPBJ', 'diunduh ' + iso) || nama; } catch (e) { /* bawaan */ }
        var blob = new Blob([o.u], {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}), a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = nama; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
        op.toast('Template diunduh: ' + o.n.HARGA + ' harga, ' + o.n.TERIMA + ' penerimaan, ' + o.n.GARIS + ' PPBJ, ' + o.n.PYP + ' penyimpangan.');
      }).catch(function (e) { op.toast('Template gagal dibuat: ' + (e && e.message ? e.message : e), true); });
    };
    $('rksFile').onchange = function () {
      var fl = this.files && this.files[0]; if (!fl) return; state.berkas = fl.name; $('rksNama').textContent = fl.name;
      var box = $('rksHasil'); box.innerHTML = '<div class="card msg">Membaca file...</div>';
      op.muatJSZip().then(function (Z) { return fl.arrayBuffer().then(function (b) { return S.bacaFile(Z, b); }); }).then(function (B) {
        if (!B.dikenal) { box.innerHTML = '<div class="card msg err">Lembar template tidak ditemukan. Pakai file dari tombol Unduh template.</div>'; return; }
        if (!B.rows.length) { box.innerHTML = '<div class="card msg">Belum ada kolom isian yang terisi.' + (B.lewat ? ' ' + B.lewat + ' baris kosong dilewati.' : '') + '</div>'; return; }
        state.rows = B.rows; state.lewat = B.lewat; box.innerHTML = '<div class="card msg">Memeriksa ' + B.rows.length + ' baris...</div>';
        return op.api({action: 'adminSusulPratinjau', rows: B.rows}).then(function (r) {
          if (!r || !r.ok) { box.innerHTML = '<div class="card msg err">' + esc((r && r.msg) || 'Gagal memeriksa.') + '</div>'; return; }
          state.hasil = r; gambar();
        });
      }).catch(function (e) { box.innerHTML = '<div class="card msg err">File tidak terbaca: ' + esc(e && e.message ? e.message : e) + '</div>'; });
    };
    function gambar() {
      var r = state.hasil, Rg = r.ringkas || {}, L = arr(r.hasil), f = state.f, J = r.jenis || {};
      var ubah = (Rg.baru || 0) + (Rg.ubah || 0) + (Rg.hapus || 0);
      var h2 = '<div class="rk-v">' + [['', 'Semua (' + L.length + ')']].concat(Object.keys(ST).filter(function (k) { return Rg[k]; }).map(function (k) { return [k, ST[k][0] + ' (' + Rg[k] + ')']; })).map(function (x) { return '<button class="gh" data-rsf="' + x[0] + '" aria-pressed="' + (f === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>' +
        (state.lewat ? '<div class="note">' + state.lewat + ' baris tanpa isian dilewati.</div>' : '') + (r.lebih ? '<div class="card msg err">' + r.lebih + ' baris melebihi batas 3000 per unggah dan tidak diperiksa.</div>' : '') +
        '<div class="rk-wrap" style="max-height:46vh"><table class="rk-tb" style="min-width:860px"><thead><tr><th class="bD">Status</th><th class="bD">Jenis</th><th class="bA">No PPBJ</th><th class="bA">Barang</th><th class="bD">Isian</th><th class="bD">Alasan</th><th class="bD">Lokasi di file</th></tr></thead><tbody>' +
        L.filter(function (o) { return !f || o.status === f; }).slice(0, 800).map(function (o) { var s = ST[o.status] || [o.status, 'l']; var src = state.rows[o.i] || {}; return '<tr><td><span class="rk-chip rk-c-' + s[1] + '">' + esc(s[0]) + '</span></td><td>' + esc(J[o.jenis] || o.jenis) + '</td><td>' + esc(o.ppbj) + '</td><td>' + esc([o.kode, o.nama].filter(String).join(' ')) + '</td><td>' + esc(o.hapus ? 'hapus' : nilaiTeks(o)) + '</td><td>' + esc(o.alasan || '') + '</td><td>' + esc(src.baris || '') + '</td></tr>'; }).join('') + '</tbody></table></div>' +
        '<div class="rk-fl" style="margin-top:8px"><b>3.</b> <button class="sv" id="rksSimpan"' + (ubah ? '' : ' disabled') + '>' + (ubah ? 'Simpan ' + ubah + ' perubahan' : 'Tidak ada perubahan untuk disimpan') + '</button><span class="note">Baris ditolak dan diabaikan tidak disimpan.</span></div>';
      $('rksHasil').innerHTML = h2;
      document.querySelectorAll('[data-rsf]').forEach(function (b) { b.onclick = function () { state.f = b.getAttribute('data-rsf'); gambar(); }; });
      var sv = $('rksSimpan'); if (sv && ubah) sv.onclick = function () {
        sv.disabled = true; sv.textContent = 'Menyimpan...';
        op.api({action: 'adminSusulSimpan', rows: state.rows, berkas: state.berkas}).then(function (x) {
          if (!x || !x.ok) { op.toast((x && x.msg) || 'Gagal menyimpan.', true); sv.disabled = false; sv.textContent = 'Simpan ' + ubah + ' perubahan'; return; }
          op.toast(x.msg); tutup(); if (op.selesai) op.selesai();
        }).catch(function () { op.toast('Gagal terhubung ke server.', true); sv.disabled = false; sv.textContent = 'Simpan ' + ubah + ' perubahan'; });
      };
    }
    try { $('rksUnduh').focus(); } catch (e) { /* abaikan */ }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = S; else root.RKS = S;
})(typeof window !== 'undefined' ? window : globalThis);
