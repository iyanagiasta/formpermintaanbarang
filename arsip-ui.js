/* Tampilan Gelombang 6 untuk halaman Pengadaan: tanya jawab dengan penyetuju + pesan WhatsApp,
   tempel tanda tangan ke PDF Accurate, tab Arsip (cari pintar, cek keaslian, paket bukti).
   Memakai fungsi halaman: api, esc, toast, app, bisa. Dimuat sesudah lintas-ui.js dan ttd-stempel.js, qr-mini.js, pdf-lib, kb-impor.js. */
(function (root) {
  'use strict';
  var U = root.POUI; if (!U) return;
  var E = U.ekstra = U.ekstra || {};
  var S = {q: '', jenis: '', tunggu: {po: [], umo: []}, gagal: [], sapu: false, hasil: null};
  function $(id) { return document.getElementById(id); }
  function each(host, sel, fn) { Array.prototype.forEach.call(host.querySelectorAll(sel), fn); }
  async function ap(body) { try { return await api(body); } catch (e) { toast('Gagal terhubung ke server.', true); return {ok: false, msg: 'Gagal terhubung ke server.'}; } }
  function rpx(n) { return 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID'); }
  function b64Bytes(s) { var bin = atob(s), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
  function bytesB64(u8) { var s = '', CH = 0x8000; for (var i = 0; i < u8.length; i += CH) s += String.fromCharCode.apply(null, u8.subarray(i, i + CH)); return btoa(s); }
  function lokal(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { /* tidak tersedia */ } return null; }
  /* PO yang gagal ditempel diingat di peramban supaya penempelan otomatis tidak terus mengulang yang itu-itu saja dan menghalangi PO lain. */
  function gagalMuat() { try { var a = JSON.parse(lokal('ttd_gagal') || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function gagalSimpan() { lokal('ttd_gagal', JSON.stringify(S.gagal.slice(0, 100))); }
  S.gagal = gagalMuat();
  function bukaBlob(bytes, nama, unduh) {
    var url = URL.createObjectURL(new Blob([bytes], {type: 'application/pdf'})), a = document.createElement('a'); a.href = url;
    if (unduh) a.download = nama; else { a.target = '_blank'; a.rel = 'noopener'; }
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
  }
  function namaBerkas(parts, ext) { return root.NB && NB.buat ? NB.buat.apply(NB, [ext].concat(parts)) : parts.join(' ') + '.' + ext; }
  function gaya() {
    if ($('arsgaya')) return; var s = document.createElement('style'); s.id = 'arsgaya';
    s.textContent = '.bub{border:1px solid var(--line,#ccc);border-radius:10px;padding:7px 10px;margin:6px 0;max-width:92%}.bub.me{background:rgba(23,88,143,.12)}.bub.pg{margin-left:auto;background:rgba(27,138,58,.12)}.bub small{display:block;color:var(--mut)}' +
      '#arsm{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:90;display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:14px}#arsm>div{background:var(--card,#fff);color:var(--ink,#111);border-radius:12px;max-width:760px;width:100%;padding:14px}';
    document.head.appendChild(s);
  }

  /* ===================== TANYA JAWAB + WHATSAPP ===================== */
  async function tanyaIsi(box, jenis, ref, judul) {
    gaya();
    async function gambar() {
      var r = await ap({action: 'diskusiList', jenis: jenis, ref: ref});
      if (!r.ok) { box.innerHTML = '<div class="note">' + esc(r.msg || 'Gagal memuat tanya jawab.') + '</div>'; return; }
      var w = r.aktif ? await ap({action: 'waPenyetuju', jenis: jenis, ref: ref}) : {ok: false};
      var h = '<h3 style="margin-top:0">Tanya jawab dengan penyetuju' + (r.perluJawab ? ' <span class="tag bad">menunggu jawaban Anda</span>' : '') + '</h3>' +
        (judul ? '<div class="note">' + esc(judul) + '</div>' : '') +
        (r.data.length ? r.data.map(function (m) { return '<div class="bub ' + (m.peran === 'Penyetuju' ? 'me' : 'pg') + '"><small>' + esc(m.dari) + ' · ' + esc(m.waktu) + '</small>' + esc(m.isi).replace(/\n/g, '<br>') + '</div>'; }).join('') : '<div class="note">Belum ada pertanyaan. Penyetuju bertanya lewat tombol "Ada pertanyaan" di halaman persetujuan; jawaban Anda dikirim lewat email.</div>');
      if (r.aktif) {
        h += '<div class="fr"><textarea id="tjt" maxlength="800" placeholder="Tulis jawaban atau penjelasan untuk penyetuju" style="flex:1;min-width:220px;min-height:60px"></textarea></div><div class="fr"><button class="sv" id="tjk">Kirim jawaban (email)</button></div>';
        if (w.ok) {
          h += '<div class="note" style="margin-top:6px">Kirim lewat WhatsApp (pesan sudah berisi sapaan, salam sesuai jam, dan tautan):</div><div class="fr">' + w.data.map(function (x, i) {
            return '<a href="' + esc(x.wa) + '" target="_blank" rel="noopener"><button type="button" class="gh">WhatsApp ke ' + esc(x.sapaan + ' ' + x.nama.split(' ')[0]) + '</button></a><button class="gh" data-sl="' + i + '">Salin pesan</button>' + (x.adaNomor ? '' : '<span class="note">nomor belum diisi (Pengaturan: Nomor WA Penyetuju)</span>');
          }).join('') + '</div>';
        }
      } else h += '<div class="note">Dokumen sudah diputuskan; percakapan ditutup.</div>';
      box.innerHTML = h;
      var kb = box.querySelector('#tjk'); if (kb) kb.onclick = async function () {
        var t = box.querySelector('#tjt').value.trim(); if (!t) { toast('Tulis jawaban dulu.', true); return; } kb.disabled = true;
        var x = await ap({action: 'diskusiBalas', jenis: jenis, ref: ref, isi: t}); toast(x.msg || (x.ok ? 'Terkirim.' : 'Gagal.'), !x.ok); if (x.ok) gambar(); else kb.disabled = false;
      };
      each(box, 'button[data-sl]', function (b) { b.onclick = function () { var x = w.data[Number(b.getAttribute('data-sl'))]; if (U.salinTeks) U.salinTeks(x.pesan); else { try { navigator.clipboard.writeText(x.pesan); toast('Tersalin.'); } catch (e) { toast('Gagal menyalin.', true); } } }; });
      return r;
    }
    return gambar();
  }
  U.tanyaPasang = async function (host, jenis, ref, judul) {
    var box = document.createElement('div'); box.className = 'card'; box.innerHTML = '<div class="msg">Memuat tanya jawab...</div>'; host.appendChild(box);
    var r = await tanyaIsi(box, jenis, ref, judul); if (r && !r.aktif && !r.data.length) box.remove();
  };
  U.tanyaModal = function (jenis, ref, judul) {
    gaya(); var m = document.createElement('div'); m.id = 'arsm'; m.innerHTML = '<div><div class="fr" style="justify-content:flex-end;margin-top:0"><button class="gh" id="arsx">Tutup</button></div><div id="arsb"><div class="msg">Memuat...</div></div></div>';
    document.body.appendChild(m); m.querySelector('#arsx').onclick = function () { m.remove(); };
    tanyaIsi(m.querySelector('#arsb'), jenis, ref, judul);
  };

  /* ===================== TEMPEL TANDA TANGAN ===================== */
  async function siapkan(jenis, ref, bytesAsli) {
    if (!root.PDFLib) throw new Error('Pustaka PDF belum termuat. Muat ulang halaman (Ctrl+F5).');
    if (!root.TTD) throw new Error('Modul tanda tangan belum termuat. Muat ulang halaman (Ctrl+F5).');
    if (!root.KBI || !KBI.muatPdfjs) throw new Error('Pembaca PDF belum termuat. Muat ulang halaman (Ctrl+F5).');
    var b = await ap({action: 'ttdBahan', jenis: jenis, ref: ref}); if (!b.ok) throw new Error(b.msg || 'Gagal mengambil bahan tanda tangan.');
    var bytes = jenis === 'PO' ? b64Bytes(b.pdf) : bytesAsli, L = await KBI.muatPdfjs(), hal = await KBI.pdfKeHalaman(L, bytes.slice().buffer);
    return {b: b, bytes: bytes, hal: hal};
  }
  /** opsi: {bytesAsli, override, pratinjau}. Hasil {ok, msg, masalah}. */
  async function tempel(jenis, ref, opsi) {
    opsi = opsi || {};
    try {
      var x = await siapkan(jenis, ref, opsi.bytesAsli), pr = TTD.periksa(jenis, x.hal, x.b);
      if (!pr.ok && !opsi.override) return {ok: false, masalah: pr.masalah};
      var out = await TTD.stempel(PDFLib, x.bytes, x.hal, jenis, x.b);
      if (opsi.pratinjau) { bukaBlob(out, 'pratinjau.pdf', false); return {ok: true, pratinjau: true, masalah: pr.masalah}; }
      var r = await ap({action: 'arsipSimpan', jenis: jenis, ref: ref, kodeVer: x.b.kode, pdfTtd: bytesB64(out), pdfAsli: jenis === 'UMO' ? bytesB64(x.bytes) : undefined});
      return {ok: !!r.ok, msg: r.msg};
    } catch (e) { return {ok: false, masalah: [e.message || 'Gagal menempel tanda tangan.']}; }
  }
  /** Menempel semua PO yang menunggu. silent = dari pemuatan halaman (tanpa membuka tab Arsip). */
  async function sapuPo(daftar, silent) {
    var n = 0, gagal = []; for (var i = 0; i < daftar.length && i < 8; i++) {
      var it = daftar[i]; if (!it.ada) { gagal.push({jenis: 'PO', ref: it.ref, nomor: it.nomor, alasan: 'PDF asli PO tidak ada. Unggah PDF PO dari Accurate di rincian PO.'}); continue; }
      var r = await tempel('PO', it.ref, {}); if (r.ok) n++; else gagal.push({jenis: 'PO', ref: it.ref, nomor: it.nomor, alasan: (r.masalah || [r.msg || 'Gagal']).join(' ')});
    }
    var diproses = {}; daftar.slice(0, 8).forEach(function (x) { diproses[x.ref] = 1; });
    S.gagal = S.gagal.filter(function (g) { return g.jenis !== 'PO' || !diproses[g.ref]; }).concat(gagal); gagalSimpan();
    if (n) toast(n + ' PO ditempel tanda tangan dan diarsipkan.'); if (gagal.length && !silent) toast(gagal.length + ' PO perlu diperiksa (lihat daftar).', true);
    else if (gagal.length && silent) toast(gagal.length + ' PO disetujui belum bisa ditempel. Buka tab Arsip.', true);
    return {n: n, gagal: gagal};
  }
  async function sapuOtomatis() {
    if (S.sapu || !bisa('input') || lokal('ttd_letak_ok_PO') !== '1') return; S.sapu = true;
    try { var t = await ap({action: 'arsipTunggu'}); if (t.ok) { S.tunggu = t; var dp = t.po.filter(function (x) { return x.ada && !S.gagal.some(function (g) { return g.ref === x.ref; }); }); if (dp.length) await sapuPo(dp, true); else if (t.po.length && !S.gagal.length) toast(t.po.length + ' PO disetujui belum punya PDF asli. Buka tab Arsip.', true); else if (S.gagal.length) toast(S.gagal.length + ' PO disetujui belum bisa ditempel. Buka tab Arsip.', true); } } catch (e) { /* tambahan */ }
  }
  if (U.muatBadge) { var mb0 = U.muatBadge; U.muatBadge = async function () { var r = await mb0.apply(this, arguments); sapuOtomatis(); return r; }; }

  /* ===================== TAB ARSIP ===================== */
  E.arsip = async function () {
    app.innerHTML = U.nav('arsip') + '<div class="msg">Memuat...</div>'; U.pasangNav();
    var t = await ap({action: 'arsipTunggu'}); S.tunggu = t.ok ? t : {po: [], umo: []}; gambar();
  };
  function kartuTunggu() {
    var po = S.tunggu.po, um = S.tunggu.umo, ok = lokal('ttd_letak_ok_PO') === '1', refPo = {}; po.forEach(function (x) { refPo[x.ref] = 1; }); S.gagal = S.gagal.filter(function (g) { return g.jenis !== 'PO' || refPo[g.ref]; }); gagalSimpan();
    if (!po.length && !um.length && !S.gagal.length) return '';
    var h = '<div class="card" id="arstg"><h3 style="margin-top:0">Menunggu tanda tangan ditempel <span class="tag ' + (po.length + um.length ? 'w' : 'ok') + '">' + (po.length + um.length) + '</span></h3>' +
      '<div class="note">Hanya dokumen yang SUDAH disetujui yang diarsipkan; salinan tanpa tanda tangan tidak disimpan (bisa diunduh lagi dari Accurate). Tanda tangan berupa gambar + kode verifikasi + QR. Sebelum menempel, sistem mencocokkan nomor dan total di PDF dengan data yang disetujui; bila tidak cocok, tidak ditempel.</div>';
    if (po.length) {
      h += '<h4 style="margin:10px 0 4px">PO (' + po.length + ')</h4>' + (ok ? '<div class="note">Penempelan otomatis aktif: PO disetujui akan ditempel saat halaman Pengadaan dibuka.</div>' : '<div class="note"><b>Langkah pertama:</b> tekan Pratinjau pada satu PO, periksa letak tanda tangan di PDF yang terbuka. Bila sudah benar, tekan "Letak sudah benar, tempel otomatis". Sesudah itu semua PO disetujui ditempel otomatis.</div>') +
        '<div class="tw"><table><thead><tr><th>PO</th><th>Vendor</th><th>Penyetuju</th><th></th></tr></thead><tbody>' + po.map(function (x) {
          return '<tr><td><b>' + esc(x.nomor) + '</b></td><td>' + esc(x.pihak) + '</td><td>' + esc(x.penyetuju) + '</td><td>' + (x.ada ? '<button class="gh" data-pv="PO|' + esc(x.ref) + '">Pratinjau</button> <button class="sv" data-tp="PO|' + esc(x.ref) + '">Tempel</button>' : '<span class="tag bad">PDF asli belum ada</span>') + '</td></tr>';
        }).join('') + '</tbody></table></div><div class="fr">' + (ok ? '' : '<button class="gold" id="arsok">Letak sudah benar, tempel otomatis</button>') + '<button class="sv" id="arsall">Tempel &amp; arsipkan semua PO</button></div>';
    }
    if (um.length) {
      h += '<h4 style="margin:10px 0 4px">UMO (' + um.length + ')</h4><div class="note">Unduh dulu "Form Pengajuan Uang Muka" dari Accurate (PDF), pilih berkasnya di sini, lalu tempel. Tanda tangan penyetuju masuk ke kotak "Kepala Departemen/Direktur" (penyetuju Capex bila UMO Capex, selain itu Atasan Langsung).</div>' +
        '<div class="tw"><table><thead><tr><th>UMO</th><th>Pengaju / perihal</th><th class="nm">Jumlah</th><th>PDF dari Accurate</th></tr></thead><tbody>' + um.map(function (x) {
          return '<tr><td><b>' + esc(x.nomor) + '</b></td><td>' + esc(x.pihak) + '<small>' + esc(x.perihal) + '</small></td><td class="nm">' + rpx(x.total) + '</td><td><input type="file" accept="application/pdf,.pdf" data-uf="' + esc(x.ref) + '" style="max-width:190px"> <button class="gh" data-uv="' + esc(x.ref) + '">Pratinjau</button> <button class="sv" data-ut="' + esc(x.ref) + '">Tempel &amp; arsipkan</button></td></tr>';
        }).join('') + '</tbody></table></div>';
    }
    if (S.gagal.length) h += '<h4 style="margin:10px 0 4px">Perlu diperiksa</h4>' + S.gagal.map(function (g) { return '<div class="at"><span><b>' + esc(g.jenis + ' ' + g.nomor) + '</b><br><span class="err">' + esc(g.alasan) + '</span></span>' + (g.jenis === 'PO' ? '<button class="gh" data-ov="' + esc(g.ref) + '">Tempel tetap (saya sudah memeriksa)</button>' : '') + '</div>'; }).join('');
    return h + '<div id="arsinfo" class="note" style="margin-top:6px"></div></div>';
  }
  function gambar() {
    app.innerHTML = U.nav('arsip') + kartuTunggu() +
      '<div class="card"><h3 style="margin-top:0">Arsip tanda tangan</h3><div class="note">Dokumen bertanda tangan sebagai bukti. Terlihat hanya oleh Pengadaan dan admin utama. Pencarian toleran salah ketik: nomor, vendor, perihal, PPBJ, penyetuju.</div>' +
      '<div class="fr"><input type="text" id="arq" placeholder="Cari nomor, vendor, perihal, PPBJ, penyetuju..." value="' + esc(S.q) + '" style="flex:1;min-width:200px"><select id="arj"><option value="">PO dan UMO</option><option value="PO">PO</option><option value="UMO">UMO</option></select><button class="sv" id="arcari">Cari</button></div><div id="arhasil"><div class="msg">Memuat...</div></div></div>';
    U.pasangNav(); $('arj').value = S.jenis;
    $('arcari').onclick = function () { S.q = $('arq').value.trim(); S.jenis = $('arj').value; cari(); }; $('arq').onkeydown = function (e) { if (e.key === 'Enter') $('arcari').click(); }; $('arj').onchange = function () { $('arcari').click(); };
    pasangTunggu(); cari();
  }
  function info(t, bad) { var el = $('arsinfo'); if (el) el.innerHTML = bad ? '<span class="err">' + esc(t) + '</span>' : esc(t); else toast(t, !!bad); }
  function pasangTunggu() {
    var host = $('arstg'); if (!host) return;
    var proses = async function (btn, jenis, ref, opsi, selesai) {
      btn.disabled = true; info('Memproses...');
      var r = await tempel(jenis, ref, opsi); btn.disabled = false;
      if (r.ok && r.pratinjau) { info('Pratinjau dibuka di tab baru.' + (r.masalah && r.masalah.length ? ' PERHATIAN: ' + r.masalah.join(' ') : '')); return; }
      if (r.ok) { S.gagal = S.gagal.filter(function (g) { return g.ref !== ref; }); gagalSimpan(); toast(r.msg || 'Diarsipkan.'); E.arsip(); return; }
      var tx = (r.masalah || [r.msg || 'Gagal.']).join(' '); info(tx, true);
      if (r.masalah && r.masalah.length && jenis === 'PO' && !opsi.override) { if (!S.gagal.some(function (g) { return g.ref === ref; })) S.gagal.push({jenis: jenis, ref: ref, nomor: ref, alasan: tx}); gagalSimpan(); E.arsip(); }
    };
    each(host, 'button[data-pv]', function (b) { b.onclick = function () { var p = b.getAttribute('data-pv').split('|'); proses(b, p[0], p[1], {pratinjau: true, override: true}); }; });
    each(host, 'button[data-tp]', function (b) { b.onclick = function () { var p = b.getAttribute('data-tp').split('|'); proses(b, p[0], p[1], {}); }; });
    each(host, 'button[data-ov]', function (b) { b.onclick = function () { if (confirm('Tempel tanda tangan walau pemeriksaan menemukan ketidakcocokan? Pastikan PDF-nya benar.')) proses(b, 'PO', b.getAttribute('data-ov'), {override: true}); }; });
    var ok = $('arsok'); if (ok) ok.onclick = function () { lokal('ttd_letak_ok_PO', '1'); toast('Penempelan otomatis diaktifkan.'); E.arsip(); };
    var all = $('arsall'); if (all) all.onclick = async function () {
      if (lokal('ttd_letak_ok_PO') !== '1' && !confirm('Anda sudah memeriksa pratinjau letak tanda tangan?\nSetelah ini PO disetujui akan ditempel otomatis.')) return;
      lokal('ttd_letak_ok_PO', '1'); all.disabled = true; info('Menempel...'); var r = await sapuPo(S.tunggu.po.filter(function (x) { return x.ada; }), false); if (r.n || r.gagal.length) E.arsip(); else all.disabled = false;
    };
    function file(ref) { var el = host.querySelector('input[data-uf="' + ref + '"]'); return el && el.files && el.files[0]; }
    async function umo(btn, ref, pratinjau) {
      var f = file(ref); if (!f) { toast('Pilih PDF Form Pengajuan Uang Muka dari Accurate dulu.', true); return; }
      var bytes = new Uint8Array(await f.arrayBuffer()); proses(btn, 'UMO', ref, {bytesAsli: bytes, pratinjau: pratinjau, override: pratinjau});
    }
    each(host, 'button[data-uv]', function (b) { b.onclick = function () { umo(b, b.getAttribute('data-uv'), true); }; });
    each(host, 'button[data-ut]', function (b) { b.onclick = function () { umo(b, b.getAttribute('data-ut'), false); }; });
  }
  async function cari() {
    var r = await ap({action: 'arsipDaftar', q: S.q, jenis: S.jenis}), el = $('arhasil'); if (!el) return;
    if (!r.ok) { el.innerHTML = '<div class="msg err">' + esc(r.msg || 'Gagal.') + '</div>'; return; }
    S.hasil = r.data;
    el.innerHTML = '<div class="note">' + r.data.length + ' dari ' + r.total + ' dokumen' + (S.q ? ' untuk "' + esc(S.q) + '"' : '') + '.</div>' + (r.data.length ? '<div class="tw"><table><thead><tr><th>Dokumen</th><th>Pihak / perihal</th><th>Penyetuju</th><th>Kode verifikasi</th><th></th></tr></thead><tbody>' + r.data.map(function (a) {
      return '<tr><td><b>' + esc(a.jenis + ' ' + a.nomor) + '</b><small>' + (a.ppbj ? 'PPBJ ' + esc(a.ppbj) : '') + '</small></td><td>' + esc(a.pihak) + '<small>' + esc(a.perihal) + '</small></td><td>' + esc(a.penyetuju) + '<small>' + esc(a.waktuSetuju) + '</small></td><td><code>' + esc(a.kode) + '</code></td><td><button class="sv" data-au="' + esc(a.id) + '">Unduh</button> <button class="gh" data-ar="' + esc(a.id) + '">Rincian</button>' + (a.jenis === 'PO' ? ' <button class="gh" data-ap="' + esc(a.ref) + '">Paket bukti</button>' : '') + '</td></tr>';
    }).join('') + '</tbody></table></div>' : '<div class="msg">Belum ada dokumen yang cocok.</div>');
    var baris = function (id) { return S.hasil.filter(function (x) { return x.id === id; })[0]; };
    each(el, 'button[data-au]', function (b) { b.onclick = async function () { b.disabled = true; var a = baris(b.getAttribute('data-au')), x = await ap({action: 'arsipFile', id: a.id, which: 'ttd'}); b.disabled = false; if (!x.ok) { toast(x.msg || 'Gagal.', true); return; } bukaBlob(b64Bytes(x.data), namaBerkas([a.jenis + ' ' + a.nomor, '(bertanda tangan)'], 'pdf'), true); }; });
    each(el, 'button[data-ar]', function (b) { b.onclick = function () { rincian(b.getAttribute('data-ar')); }; });
    each(el, 'button[data-ap]', function (b) { b.onclick = function () { paket(b, b.getAttribute('data-ap')); }; });
  }
  async function rincian(id) {
    gaya(); var m = document.createElement('div'); m.id = 'arsm'; m.innerHTML = '<div><div class="fr" style="justify-content:flex-end;margin-top:0"><button class="gh" id="arsx">Tutup</button></div><div id="arsb"><div class="msg">Memuat...</div></div></div>'; document.body.appendChild(m); m.querySelector('#arsx').onclick = function () { m.remove(); };
    var r = await ap({action: 'arsipRincian', id: id}), b = m.querySelector('#arsb'); if (!r.ok) { b.innerHTML = '<div class="msg err">' + esc(r.msg || 'Gagal.') + '</div>'; return; }
    var a = r.arsip;
    b.innerHTML = '<h3 style="margin-top:0">' + esc(a.jenis + ' ' + a.nomor) + '</h3><div class="note">' + esc(a.pihak) + (a.perihal ? ' · ' + esc(a.perihal) : '') + (a.ppbj ? ' · PPBJ ' + esc(a.ppbj) : '') + '</div>' +
      '<p>Disetujui oleh <b>' + esc(a.penyetuju) + '</b> pada ' + esc(a.waktuSetuju) + '.<br>Kode verifikasi <code>' + esc(a.kode) + '</code> · diarsipkan ' + esc(a.diarsipkan) + ' oleh ' + esc(a.oleh) + '.</p>' +
      '<div class="note" style="word-break:break-all">Sidik jari berkas (SHA-256): ' + esc(a.hash) + '</div><div class="note">Halaman verifikasi publik (tanpa membuka isi dokumen): <a href="' + esc(a.verUrl) + '" target="_blank" rel="noopener">' + esc(a.verUrl) + '</a></div>' +
      '<div class="fr"><button class="sv" id="arck">Cek keaslian berkas</button>' + (a.adaAsli ? '<button class="gh" id="aras">Unduh salinan asli Accurate</button>' : '') + '<span id="arcs" class="note"></span></div>' +
      '<h4 style="margin:10px 0 4px">Riwayat persetujuan</h4>' + (r.riwayat.length ? r.riwayat.map(function (x) { return '<div class="at"><span>' + esc(x) + '</span></div>'; }).join('') : '<div class="note">Tidak ada catatan.</div>') +
      '<h4 style="margin:10px 0 4px">Tanya jawab sebelum disetujui</h4>' + (r.diskusi.length ? r.diskusi.map(function (m2) { return '<div class="bub ' + (m2.peran === 'Penyetuju' ? 'me' : 'pg') + '"><small>' + esc(m2.dari) + ' · ' + esc(m2.waktu) + '</small>' + esc(m2.isi) + '</div>'; }).join('') : '<div class="note">Tidak ada.</div>');
    b.querySelector('#arck').onclick = async function () { this.disabled = true; var x = await ap({action: 'arsipCek', id: id}); this.disabled = false; $('arcs').innerHTML = x.ok ? '<span class="' + (x.cocok ? '' : 'err') + '"><b>' + esc(x.msg) + '</b></span>' : '<span class="err">' + esc(x.msg || 'Gagal.') + '</span>'; };
    var as = b.querySelector('#aras'); if (as) as.onclick = async function () { var x = await ap({action: 'arsipFile', id: id, which: 'asli'}); if (!x.ok) { toast(x.msg || 'Gagal.', true); return; } bukaBlob(b64Bytes(x.data), x.nama || 'asli.pdf', true); };
  }
  /** Paket bukti satu PO: PO bertanda tangan + lampiran + surat jalan, digabung menjadi satu PDF (gambar dijadikan halaman; berkas lain disebut di catatan). */
  async function paket(btn, no) {
    btn.disabled = true;
    try {
      var d = await ap({action: 'paketDaftar', no: no}); if (!d.ok) { toast(d.msg || 'Gagal.', true); return; }
      var P = root.PDFLib, out = await P.PDFDocument.create(), font = await out.embedFont(P.StandardFonts.Helvetica), lewat = [], n = 0;
      for (var i = 0; i < d.data.length; i++) {
        var it = d.data[i], x = it.sumber === 'arsip' ? await ap({action: 'arsipFile', id: it.id, which: 'ttd'}) : it.sumber === 'po' ? await ap({action: 'poFile', no: it.no, fileId: it.fileId}) : await ap({action: 'plFile', id: it.id, fileId: it.fileId});
        if (!x.ok) { lewat.push(it.label + ' (tidak terbaca)'); continue; }
        var by = b64Bytes(x.data), mime = String(it.mime || x.mime || '');
        try {
          if (/pdf/i.test(mime) || (by[0] === 0x25 && by[1] === 0x50)) { var src = await P.PDFDocument.load(by); (await out.copyPages(src, src.getPageIndices())).forEach(function (pg) { out.addPage(pg); }); n++; }
          else if (/^image\/(jpeg|png)/i.test(mime)) { var im = /png/i.test(mime) ? await out.embedPng(by) : await out.embedJpg(by), pg2 = out.addPage([595, 842]), s = Math.min(535 / im.width, 760 / im.height, 1); pg2.drawText(it.label, {x: 30, y: 820, size: 9, font: font}); pg2.drawImage(im, {x: 30, y: 810 - im.height * s, width: im.width * s, height: im.height * s}); n++; }
          else lewat.push(it.label + ' (bukan PDF/gambar, unduh terpisah)');
        } catch (e) { lewat.push(it.label + ' (gagal digabung)'); }
      }
      if (!n) { toast('Tidak ada berkas yang bisa digabung.', true); return; }
      bukaBlob(await out.save(), namaBerkas(['Paket bukti PO ' + d.nomor, d.vendor], 'pdf'), true);
      toast('Paket bukti ' + n + ' berkas diunduh.' + (lewat.length ? ' Tidak ikut: ' + lewat.join('; ') + '.' : ''), lewat.length > 0);
    } catch (e) { toast(e.message || 'Gagal menyusun paket.', true); } finally { btn.disabled = false; }
  }
})(typeof window !== 'undefined' ? window : globalThis);
