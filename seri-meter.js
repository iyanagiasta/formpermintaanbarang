/* Tambahan 124: nomor seri meter air.
   Dipakai form Permintaan Barang, Pengembalian, Penerimaan, Pengadaan (terima PO), halaman persetujuan, bukti, dan admin.
   Barang meter air = kategori METER AIR (dari server, aksi seriKode). Nomor seri: satu per baris, disamakan huruf besar. */
(function (root) {
  'use strict';
  var KODE = null, KEY = 'sctk_seri_kode';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
  function norm(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().toUpperCase(); }
  function parse(v) { return (Array.isArray(v) ? v : String(v == null ? '' : v).split(/[\n,;]+/)).map(norm).filter(function (x) { return x; }); }
  function jadiSet(a) { var o = {}; (a || []).forEach(function (k) { o[norm(k)] = 1; }); return o; }
  function muat(api) {
    if (KODE) return Promise.resolve(KODE);
    try { var o = JSON.parse(sessionStorage.getItem(KEY) || 'null'); if (o && o.t > Date.now() - 1800000) { KODE = jadiSet(o.k); return Promise.resolve(KODE); } } catch (e) { /* abaikan */ }
    return Promise.resolve(api({action: 'seriKode'})).then(function (r) {
      var k = (r && r.ok && r.kode) || []; KODE = jadiSet(k);
      try { sessionStorage.setItem(KEY, JSON.stringify({t: Date.now(), k: k})); } catch (e) { /* abaikan */ }
      return KODE;
    }).catch(function () { KODE = KODE || {}; return KODE; });
  }
  function isMeter(k) { return !!(KODE && k && KODE[norm(k)]); }
  function num(q) { return Number(String(q == null ? '' : q).replace(',', '.')) || 0; }
  /** Teks penghitung: "2 dari 3 nomor seri (kurang 1)". */
  function info(t, qty) {
    var l = parse(t), n = l.length, q = num(qty), dob = l.filter(function (x, i) { return l.indexOf(x) !== i; });
    var s = n + ' dari ' + (q || '?') + ' nomor seri';
    if (dob.length) s += ' (dobel: ' + dob[0] + ')'; else if (q && n < q) s += ' (kurang ' + (q - n) + ')'; else if (q && n > q) s += ' (kelebihan ' + (n - q) + ')';
    return {n: n, q: q, pas: q > 0 && n === q && !dob.length, lebih: q > 0 && n > q, dobel: dob.length > 0, teks: s};
  }
  function css() {
    if (document.getElementById('seri-css')) return;
    var s = document.createElement('style'); s.id = 'seri-css';
    s.textContent = '.seribox{margin-top:6px;text-align:left}.seribox label{display:block;font-size:11.5px;font-weight:700;color:var(--mut,#567);margin:0 0 2px}' +
      '.seribox textarea{width:100%;min-height:44px;font:inherit;font-size:13px;padding:6px 8px;border:1px solid var(--line,#c8d2dc);border-radius:7px;background:var(--card,#fff);color:var(--ink,#111);resize:vertical;box-sizing:border-box;text-transform:uppercase}' +
      '.serin{font-weight:400;margin-left:4px}.serin.ok{color:var(--ok-t,#14612b)}.serin.kr{color:var(--warn-t,#8a5a00)}.serin.er{color:var(--bad-t,#a01c28)}' +
      '.seritag{display:inline-block;border-radius:20px;padding:1px 8px;font-size:11px;font-weight:700;background:#fff3cd;color:#7a5b00;margin-left:4px;white-space:nowrap}' +
      '.serilist{font-size:12px;color:var(--mut,#456);margin-top:2px;word-break:break-word}' +
      '.seriov{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9998;display:flex;align-items:flex-start;justify-content:center;padding:max(16px,env(safe-area-inset-top,0px)) 12px 16px;overflow:auto}' +
      '.serimd{background:var(--card,#fff);color:var(--ink,#111);border-radius:12px;max-width:560px;width:100%;padding:16px;box-shadow:0 10px 40px rgba(0,0,0,.35)}' +
      '.serimd h3{margin:0 0 4px;font-size:16px}.serimd .seriit{border-top:1px solid var(--line,#dde);padding:10px 0}.serimd textarea{width:100%;min-height:70px;margin-top:6px;font:inherit;padding:8px;border:1px solid var(--line,#c8d2dc);border-radius:8px;background:var(--card,#fff);color:var(--ink,#111);box-sizing:border-box;text-transform:uppercase}' +
      '.serimd input{width:100%;padding:9px;border:1px solid var(--line,#c8d2dc);border-radius:8px;background:var(--card,#fff);color:var(--ink,#111);font:inherit;box-sizing:border-box}' +
      '.serimd .seribt{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}.serimd button{padding:10px 14px;border-radius:8px;border:0;font:600 14px inherit;cursor:pointer;background:var(--navy,#1b4f72);color:#fff}.serimd button.gh{background:transparent;color:var(--ink,#1b4f72);border:1px solid var(--line,#c8d2dc)}' +
      '.serimd .serimsg{margin-top:8px;font-size:13px}.serimd .serimsg.er{color:var(--bad-t,#a01c28)}.serinote{font-size:12px;color:var(--mut,#567)}';
    document.head.appendChild(s);
  }
  /** Kotak isian nomor seri. cls = kelas textarea, nilai = teks awal, wajib = keterangan wajib atau boleh menyusul. */
  function kotak(cls, nilai, wajib) {
    css();
    return '<div class="seribox"><label>No seri meter air' + (wajib ? ' (wajib)' : ' (boleh menyusul, wajib sebelum barang diserahkan)') + ' <span class="serin"></span></label>' +
      '<textarea class="' + cls + '" rows="2" autocomplete="off" spellcheck="false" placeholder="Satu nomor seri per baris">' + esc(nilai || '') + '</textarea></div>';
  }
  /** Memperbarui penghitung di dalam satu kotak. */
  function hitung(box, qty) {
    if (!box) return null; var ta = box.querySelector('textarea'), sp = box.querySelector('.serin'); if (!ta || !sp) return null;
    var x = info(ta.value, qty); sp.textContent = x.teks; sp.className = 'serin ' + (x.pas ? 'ok' : (x.lebih || x.dobel ? 'er' : 'kr')); return x;
  }
  function teks(list) { return (list && list.length) ? list.join(', ') : ''; }
  /** Baris tampilan "No seri: A, B" + tanda kurang, untuk daftar/bukti. */
  function baris(it) {
    if (!it || !it.meter) return '';
    css();
    return '<div class="serilist">No seri: ' + (it.seri && it.seri.length ? esc(teks(it.seri)) : '-') + (it.seriKurang > 0 ? ' <span class="seritag">No seri belum lengkap (kurang ' + it.seriKurang + ')</span>' : '') + '</div>';
  }
  /** Jendela edit nomor seri (admin). opsi: {toast, selesai} */
  function edit(api, ref, o) {
    o = o || {}; css();
    var ov = document.createElement('div'); ov.className = 'seriov'; ov.innerHTML = '<div class="serimd" role="dialog" aria-modal="true"><div>Memuat nomor seri...</div></div>';
    document.body.appendChild(ov);
    var md = ov.firstChild;
    function tutup() { ov.remove(); document.removeEventListener('keydown', esck); }
    function esck(e) { if (e.key === 'Escape') tutup(); }
    document.addEventListener('keydown', esck);
    ov.addEventListener('click', function (e) { if (e.target === ov) tutup(); });
    Promise.resolve(api({action: 'seriDok', ref: ref})).then(function (r) {
      if (!r || !r.ok) { md.innerHTML = '<p class="serimsg er">' + esc((r && r.msg) || 'Gagal memuat.') + '</p><div class="seribt"><button type="button" class="gh" data-t>Tutup</button></div>'; md.querySelector('[data-t]').onclick = tutup; return; }
      var h = '<h3>No seri meter air ' + esc(r.dok) + '</h3><div class="serinote">' + esc(r.jenis) + (r.proy ? ' &middot; ' + esc(r.proy) : '') + (r.status === 'Rencana' ? ' &middot; pengembalian belum diterima gudang' : '') + '</div>';
      if (r.ditolak) h += '<p class="serimsg er">Dokumen ini ditolak atau dibatalkan, nomor seri tidak bisa diubah.</p>';
      if (!r.items.length) h += '<p>Tidak ada meter air di dokumen ini.</p>';
      r.items.forEach(function (it, i) { h += '<div class="seriit"><b>' + esc(it.nama) + '</b> <span class="serinote">' + esc(it.kode) + ' &middot; jumlah ' + esc(it.qty) + '</span><textarea data-si="' + i + '" rows="3" spellcheck="false" placeholder="Satu nomor seri per baris"' + (r.ditolak ? ' disabled' : '') + '>' + esc((it.seri || []).join('\n')) + '</textarea><div class="serinote" data-sn="' + i + '"></div></div>'; });
      if (r.items.length && !r.ditolak) h += '<label class="serinote" style="display:block;margin-top:8px">Alasan perubahan (wajib, tercatat di riwayat)</label><input data-al placeholder="mis. salah baca nomor seri, meter diganti">';
      h += '<div class="seribt">' + (r.items.length && !r.ditolak ? '<button type="button" data-s>Simpan nomor seri</button>' : '') + '<button type="button" class="gh" data-t>Tutup</button></div><div class="serimsg"></div>';
      md.innerHTML = h;
      var msg = md.querySelector('.serimsg');
      function perbarui() { r.items.forEach(function (it, i) { var ta = md.querySelector('[data-si="' + i + '"]'), x = info(ta.value, it.qty), n = md.querySelector('[data-sn="' + i + '"]'); n.textContent = x.teks; n.style.color = x.pas ? 'var(--ok-t,#14612b)' : (x.lebih || x.dobel ? 'var(--bad-t,#a01c28)' : 'var(--warn-t,#8a5a00)'); }); }
      md.addEventListener('input', perbarui); perbarui();
      md.querySelector('[data-t]').onclick = tutup;
      var sv = md.querySelector('[data-s]');
      if (sv) sv.onclick = function () {
        var al = md.querySelector('[data-al]').value.trim(); if (!al) { msg.className = 'serimsg er'; msg.textContent = 'Isi alasan perubahan.'; md.querySelector('[data-al]').focus(); return; }
        var items = r.items.map(function (it, i) { return {kode: it.kode, seri: parse(md.querySelector('[data-si="' + i + '"]').value)}; });
        sv.disabled = true; msg.className = 'serimsg'; msg.textContent = 'Menyimpan...';
        Promise.resolve(api({action: 'seriSimpan', ref: r.ref, items: items, alasan: al})).then(function (x) {
          sv.disabled = false;
          if (!x || !x.ok) { msg.className = 'serimsg er'; msg.textContent = (x && x.msg) || 'Gagal menyimpan.'; return; }
          if (o.toast) o.toast(x.msg); tutup(); if (o.selesai) o.selesai(x);
        }).catch(function () { sv.disabled = false; msg.className = 'serimsg er'; msg.textContent = 'Gagal terhubung ke server.'; });
      };
      var t0 = md.querySelector('textarea:not([disabled])'); if (t0) t0.focus();
    }).catch(function () { md.innerHTML = '<p class="serimsg er">Gagal terhubung ke server.</p><div class="seribt"><button type="button" class="gh" data-t>Tutup</button></div>'; md.querySelector('[data-t]').onclick = tutup; });
  }

  /* ================= Tab admin: No Seri Meter ================= */
  function tab(el, api, toast) {
    css();
    var D = null;
    el.innerHTML = '<div class="card"><h3 style="margin:0 0 4px">No Seri Meter Air</h3><p class="note" style="margin:0 0 10px">Setiap meter air dicatat nomor serinya di penerimaan, permintaan barang (BPB), dan pengembalian. Barang meter air = kategori METER AIR.</p>' +
      '<div class="fr"><input id="srq" type="search" placeholder="Cari nomor seri, mis. 2301" autocomplete="off" style="flex:2;min-width:200px"><button id="srgo" type="button">Cari riwayat</button></div><div id="srhasil"></div></div>' +
      '<div class="card" id="srkurang"><div class="msg">Memuat...</div></div><div class="card" id="srstok"></div>' +
      '<div class="card"><b>Excel</b><p class="note" style="margin:4px 0 8px">Unduh semua catatan nomor seri, atau impor daftar nomor seri stok yang sudah ada di gudang (sekali di awal).</p><div class="fr">' +
      '<button type="button" class="gh" id="srx">Unduh semua catatan</button><button type="button" class="gh" id="srtpl">Unduh template stok awal</button>' +
      '<label class="gh" style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;border:1px solid var(--line,#ccd);border-radius:9px;padding:9px 12px">Impor stok awal (Excel)<input type="file" id="srimp" accept=".xlsx,.xls,.csv" style="display:none"></label></div><div id="srimpinfo" class="note"></div></div>';
    function q(id) { return el.querySelector('#' + id); }
    function cari() {
      var v = q('srq').value.trim(), box = q('srhasil'); if (v.length < 2) { box.innerHTML = '<p class="note">Ketik minimal 2 karakter.</p>'; return; }
      box.innerHTML = '<p class="note">Mencari...</p>';
      Promise.resolve(api({action: 'seriCari', q: v})).then(function (r) {
        if (!r.ok) { box.innerHTML = '<p class="err">' + esc(r.msg || 'Gagal.') + '</p>'; return; }
        if (!r.data.length) { box.innerHTML = '<p class="note">Nomor seri "' + esc(v) + '" belum pernah tercatat.</p>'; return; }
        box.innerHTML = r.data.map(function (s) {
          var cls = s.status === 'Di gudang' ? 'ok' : (s.status === 'Keluar' ? 'w' : '');
          return '<div style="border-top:1px solid var(--line,#dde);padding:8px 0"><b style="font-size:15px">' + esc(s.seri) + '</b> <span class="tag ' + cls + '" style="margin-left:6px">' + esc(s.status) + '</span> <span class="note">' + esc(s.nama) + ' (' + esc(s.kode) + ')' + (s.dok ? ' &middot; terakhir ' + esc(s.dok) : '') + '</span>' +
            '<div class="tw"><table><thead><tr><th>Waktu</th><th>Peristiwa</th><th>Dokumen</th><th>Proyek / PPBJ</th><th>Oleh</th><th>Keterangan</th></tr></thead><tbody>' +
            s.riwayat.map(function (e) { return '<tr' + (e.status === 'Batal' ? ' style="opacity:.6"' : '') + '><td>' + esc(e.waktu) + '</td><td>' + esc(e.arah) + (e.status !== 'Aktif' ? ' <small>(' + esc(e.status) + ')</small>' : '') + '</td><td>' + esc(e.dok) + ' <small>' + esc(e.jenis) + '</small></td><td>' + esc(e.proy) + '</td><td>' + esc(e.oleh) + '</td><td>' + esc(e.ket) + '</td></tr>'; }).join('') +
            '</tbody></table></div></div>';
        }).join('') + (r.lebih ? '<p class="note">Hasil dibatasi 50 nomor seri. Ketik lebih lengkap.</p>' : '');
      }).catch(function () { box.innerHTML = '<p class="err">Gagal terhubung ke server.</p>'; });
    }
    q('srgo').onclick = cari; q('srq').onkeydown = function (e) { if (e.key === 'Enter') cari(); };
    function gambar() {
      var k = q('srkurang'), s = q('srstok');
      if (!D) return;
      k.innerHTML = '<b>Nomor seri belum lengkap</b> <span class="tag w">' + D.nKurang + ' dokumen</span><p class="note" style="margin:4px 0 8px">BPB, pengembalian, dan penerimaan berisi meter air yang nomor serinya belum lengkap. Tekan Isi untuk melengkapi (alasan wajib, tercatat di riwayat).</p>' +
        (D.kurang.length ? '<div class="tw"><table><thead><tr><th>Dokumen</th><th>Jenis</th><th>Tanggal</th><th>Proyek / PPBJ</th><th>Barang (tercatat/jumlah)</th><th>Kurang</th><th></th></tr></thead><tbody>' +
          D.kurang.map(function (x) { return '<tr><td><b>' + esc(x.dok) + '</b></td><td>' + esc(x.jenis) + (x.status ? '<small style="display:block">' + esc(x.status) + '</small>' : '') + '</td><td>' + esc(x.tgl) + '</td><td>' + esc(x.proy) + '</td><td>' + esc(x.barang.join('; ')) + '</td><td>' + esc(x.kurang) + '</td><td><button type="button" class="gh" data-ref="' + esc(x.ref) + '">Isi no seri</button></td></tr>'; }).join('') + '</tbody></table></div>' : '<p class="note">Semua dokumen sudah lengkap.</p>');
      s.innerHTML = '<b>Meter air di gudang</b> <span class="tag ok">' + D.diGudang + ' unit tercatat</span> <span class="tag">' + D.keluar + ' sudah keluar</span>' +
        (D.kodeMeter && !D.kodeMeter.length ? '<p class="err">Belum ada barang berkategori METER AIR. Isi kategori lewat impor Jenis &amp; Kategori di tab Stok &amp; Harga.</p>' : '') +
        (D.stok.length ? D.stok.map(function (b) { return '<details style="border-top:1px solid var(--line,#dde);padding:6px 0"><summary><b>' + esc(b.nama) + '</b> <span class="note">' + esc(b.kode) + '</span> <span class="tag ok">' + b.seri.length + '</span></summary><div class="serilist" style="margin-top:6px">' + esc(b.seri.join(', ')) + '</div></details>'; }).join('') : '<p class="note">Belum ada nomor seri yang tercatat di gudang.</p>');
      k.querySelectorAll('[data-ref]').forEach(function (b) { b.onclick = function () { edit(api, b.getAttribute('data-ref'), {toast: toast, selesai: muatData}); }; });
    }
    function muatData() {
      Promise.resolve(api({action: 'seriDaftar'})).then(function (r) { if (!r.ok) { q('srkurang').innerHTML = '<p class="err">' + esc(r.msg || 'Gagal.') + '</p>'; return; } D = r; gambar(); })
        .catch(function () { q('srkurang').innerHTML = '<p class="err">Gagal terhubung ke server.</p>'; });
    }
    function xlsxSiap() { if (!root.XLSX || !root.XLSX.utils) { toast('Pustaka Excel belum termuat. Periksa internet lalu muat ulang.', true); return false; } return true; }
    q('srx').onclick = function () {
      if (!xlsxSiap()) return; var b = this; b.disabled = true;
      Promise.resolve(api({action: 'seriDaftar', peristiwa: 1})).then(function (r) {
        b.disabled = false; if (!r.ok) { toast(r.msg || 'Gagal.', true); return; }
        var wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([r.head].concat(r.peristiwa)), 'Semua catatan');
        var st = [['Kode Barang', 'Nama Barang', 'No Seri', 'Status']]; r.stok.forEach(function (x) { x.seri.forEach(function (s) { st.push([x.kode, x.nama, s, 'Di gudang']); }); });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(st), 'Di gudang');
        var kr = [['Dokumen', 'Jenis', 'Tanggal', 'Proyek / PPBJ', 'Barang (tercatat/jumlah)', 'Kurang']]; r.kurang.forEach(function (x) { kr.push([x.dok, x.jenis, x.tgl, x.proy, x.barang.join('; '), x.kurang]); });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(kr), 'Belum lengkap');
        XLSX.writeFile(wb, 'No_Seri_Meter_Air.xlsx');
      }).catch(function () { b.disabled = false; toast('Gagal terhubung ke server.', true); });
    };
    q('srtpl').onclick = function () {
      if (!xlsxSiap()) return;
      var wb = XLSX.utils.book_new(), ws = XLSX.utils.aoa_to_sheet([['Kode Barang', 'Nama Barang', 'No Seri'], ['(contoh) J1-00123', 'Meter Air 1/2 inch', 'SN230001'], ['(contoh) J1-00123', 'Meter Air 1/2 inch', 'SN230002']]);
      ws['!cols'] = [{wch: 18}, {wch: 36}, {wch: 22}];
      XLSX.utils.book_append_sheet(wb, ws, 'Stok awal');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Cara mengisi'], ['Satu baris = satu meter air (satu nomor seri).'], ['Kode Barang harus sama dengan master barang dan berkategori METER AIR.'], ['Hapus baris contoh sebelum mengimpor.'], ['Nomor seri yang sudah tercatat di gudang akan dilewati.']]), 'Petunjuk');
      XLSX.writeFile(wb, 'Template_No_Seri_Meter_Air.xlsx');
    };
    q('srimp').onchange = function () {
      var f = this.files && this.files[0], inp = this; if (!f || !xlsxSiap()) return;
      var info = q('srimpinfo'); info.textContent = 'Membaca berkas...';
      var rd = new FileReader();
      rd.onload = function () {
        try {
          var wb = XLSX.read(new Uint8Array(rd.result), {type: 'array'}), ws = wb.Sheets[wb.SheetNames[0]], A = XLSX.utils.sheet_to_json(ws, {header: 1, defval: ''});
          var h = (A[0] || []).map(function (x) { return String(x).toLowerCase().replace(/\s+/g, ''); }), ik = h.indexOf('kodebarang'), inn = h.indexOf('namabarang'), is = h.findIndex(function (x) { return x === 'noseri' || x === 'nomorseri' || x === 'serial'; });
          if (ik < 0 || is < 0) { info.textContent = 'Kolom Kode Barang dan No Seri tidak ditemukan. Gunakan template.'; inp.value = ''; return; }
          var rows = A.slice(1).map(function (x) { return {kode: String(x[ik] || '').trim(), nama: inn >= 0 ? String(x[inn] || '') : '', seri: String(x[is] || '')}; }).filter(function (x) { return (x.kode || x.seri) && !/^\(contoh\)/i.test(x.kode); });
          if (!rows.length) { info.textContent = 'Tidak ada baris terisi.'; inp.value = ''; return; }
          info.innerHTML = rows.length + ' baris siap diimpor. <button type="button" id="srimpgo">Impor sekarang</button> <button type="button" class="gh" id="srimpno">Batal</button>';
          q('srimpno').onclick = function () { info.textContent = ''; inp.value = ''; };
          q('srimpgo').onclick = function () {
            this.disabled = true;
            Promise.resolve(api({action: 'seriImpor', rows: rows})).then(function (r) {
              inp.value = '';
              if (!r.ok) { info.textContent = r.msg || 'Gagal.'; return; }
              info.innerHTML = esc(r.msg) + (r.lewat && r.lewat.length ? '<ul style="margin:6px 0 0 18px;padding:0">' + r.lewat.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '');
              toast(r.msg); muatData();
            }).catch(function () { info.textContent = 'Gagal terhubung ke server.'; });
          };
        } catch (e) { info.textContent = 'Berkas tidak bisa dibaca. Gunakan .xlsx atau .csv.'; inp.value = ''; }
      };
      rd.readAsArrayBuffer(f);
    };
    muatData();
  }

  root.SERI = {norm: norm, parse: parse, muat: muat, isMeter: isMeter, info: info, kotak: kotak, hitung: hitung, teks: teks, baris: baris, edit: edit, tab: tab, css: css, esc: esc};
})(window);
