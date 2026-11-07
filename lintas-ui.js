/* Tampilan Gelombang 5 untuk halaman Pengadaan: tab Vendor lengkap dan ide lintas tab
   (Kokpit biaya, Berkas PO, Jadwal kedatangan, Penutupan bulan, Catatan tempel, Waktu siklus).
   Memakai fungsi halaman: api, esc, toast, app, bisa. Dimuat sesudah po-ui.js. Tidak ada yang tersimpan sebelum tombol Simpan. */
(function (root) {
  'use strict';
  var U = root.POUI; if (!U) return;
  var E = U.ekstra = U.ekstra || {};
  function $(id) { return document.getElementById(id); }
  function rpx(n) { return 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID'); }
  function tgl(s) { var m = /^(\d{4})-(\d\d)-(\d\d)/.exec(String(s || '')); return m ? m[3] + '/' + m[2] + '/' + m[1] : String(s || ''); }
  function nama(ext) { var a = Array.prototype.slice.call(arguments, 1); return root.NB && NB.buat ? NB.buat.apply(NB, [ext].concat(a)) : a.join(' ') + '.' + ext; }
  function each(sel, fn) { Array.prototype.forEach.call(app.querySelectorAll(sel), fn); }
  async function ap(body) { try { return await api(body); } catch (e) { toast('Gagal terhubung ke server.', true); return {ok: false}; } }
  function salinTeks(t) { if (U.salinTeks) return U.salinTeks(t); try { navigator.clipboard.writeText(t); toast('Tersalin.'); } catch (e) { toast('Gagal menyalin.', true); } }
  function kotakPesan(judul, teks) {
    return '<div class="card blk"><h3 style="margin-top:0">' + esc(judul) + '</h3><textarea readonly style="width:100%;min-height:150px;padding:9px;border:1px solid var(--line,#ccc);border-radius:8px;font:inherit">' + esc(teks) + '</textarea><div class="fr"><button class="sv" data-salin="1">Salin pesan</button></div></div>';
  }
  function pasangSalin(el) { Array.prototype.forEach.call(el.querySelectorAll('button[data-salin]'), function (b) { b.onclick = function () { var t = b.parentNode.parentNode.querySelector('textarea'); salinTeks(t ? t.value : ''); }; }); }

  /* ===================== VENDOR ===================== */
  var V = {view: 'daftar', list: [], q: '', f: 'semua', nama: '', edit: null, pil: [], tw: null};
  E.vendor = function (ref) { if (ref) { V.view = 'profil'; V.nama = ref; } else V.view = 'daftar'; return vendor(); };
  async function vendor() {
    app.innerHTML = U.nav('vendor') + '<div class="msg">Memuat...</div>'; U.pasangNav();
    if (V.view === 'daftar' || !V.list.length) { var r = await ap({action: 'venDaftar'}); if (!r.ok) { toast(r.msg || 'Gagal.', true); return; } V.list = r.data; }
    ({daftar: vDaftar, profil: vProfil, form: vForm, impor: vImpor, mirip: vMirip, belanja: vBelanja, tawar: vTawar, rekon: vRekon})[V.view]();
  }
  function vBar() {
    return '<div class="card"><h3 style="margin-top:0">Vendor</h3><div class="fr"><button class="' + (V.view === 'daftar' ? 'sv' : 'gh') + '" data-vv="daftar">Daftar</button> <button class="gh" data-vv="form">Tambah vendor</button> <button class="gh" data-vv="impor">Unggah Excel</button> <button class="gh" data-vv="mirip">Nama mirip</button> <button class="gh" data-vv="belanja">Daftar belanja per vendor</button> <button class="gh" data-vv="tawar">Penawaran</button> <button class="gh" data-vv="rekon">Rekonsiliasi</button></div></div>';
  }
  function pasangBar() { each('button[data-vv]', function (b) { b.onclick = function () { V.view = b.getAttribute('data-vv'); V.edit = null; if (V.view === 'daftar') { V.f = 'semua'; V.q = ''; } vendor(); }; }); }
  function vDaftar() {
    var q = V.q.toLowerCase(), l = V.list.filter(function (x) {
      if (q && (x.nama + ' ' + x.attn + ' ' + x.telepon + ' ' + x.email + ' ' + (x.kategori || '')).toLowerCase().indexOf(q) < 0) return false;
      if (V.f === 'aktif') return x.status !== 'Nonaktif'; if (V.f === 'nonaktif') return x.status === 'Nonaktif'; if (V.f === 'lengkapi') return x.kurang && x.kurang.length; if (V.f === 'janji') return x.janjiTerlewat > 0; if (V.f === 'poaktif') return x.poAktif > 0; return true;
    });
    app.innerHTML = U.nav('vendor') + vBar() + '<div class="card"><div class="fl"><input type="text" id="vq" placeholder="Cari vendor, kontak, kategori" value="' + esc(V.q) + '" style="flex:1;min-width:180px"> <select id="vf"><option value="semua">Semua</option><option value="aktif">Aktif</option><option value="nonaktif">Nonaktif</option><option value="poaktif">Punya PO yang ditunggu</option><option value="janji">Janji terlewat</option><option value="lengkapi">Data perlu dilengkapi</option></select> <button class="gh" id="vx">Unduh Excel</button></div>' +
      (l.length ? '<div class="tw"><table><thead><tr><th>Vendor</th><th>Kontak</th><th>Kategori</th><th class="nm">PO</th><th class="nm">PO ditunggu</th><th class="nm">Rata-rata tunggu</th><th>Catatan</th></tr></thead><tbody>' + l.map(function (x) {
        return '<tr><td><a href="#" data-vp="' + esc(x.nama) + '"><b>' + esc(x.nama) + '</b></a>' + (x.status === 'Nonaktif' ? ' <span class="tag bad">Nonaktif</span>' : '') + (x.belumTerdaftar ? ' <span class="tag w">belum terdaftar</span>' : '') + '</td><td>' + esc(x.attn) + '<small>' + esc(x.telepon) + (x.email ? ' · ' + esc(x.email) : '') + '</small></td><td>' + esc(x.kategori || '') + '</td><td class="nm">' + (x.nPo || 0) + '</td><td class="nm">' + (x.poAktif || 0) + '</td><td class="nm">' + (x.tunggu == null ? '-' : String(x.tunggu).replace('.', ',') + ' hari<small>' + x.nTerima + ' penerimaan</small>') + '</td><td>' +
          (x.janjiTerlewat ? '<span class="tag bad">' + x.janjiTerlewat + ' janji terlewat</span> ' : '') + (x.kurang && x.kurang.length ? '<small>Belum ada: ' + esc(x.kurang.join(', ')) + '</small>' : '') + '</td></tr>';
      }).join('') + '</tbody></table></div>' : '<div class="note" style="margin-top:8px">Tidak ada vendor yang cocok.</div>') + '<div class="note">Hanya fakta dari data yang tercatat, tanpa nilai atau peringkat vendor.</div></div>';
    U.pasangNav(); pasangBar(); $('vf').value = V.f; $('vf').onchange = function () { V.f = this.value; vDaftar(); };
    $('vq').oninput = function () { var v = this.value; clearTimeout(vDaftar.h); vDaftar.h = setTimeout(function () { V.q = v; vDaftar(); var e = $('vq'); if (e) { e.focus(); e.setSelectionRange(v.length, v.length); } }, 250); };
    each('a[data-vp]', function (a) { a.onclick = function (e) { e.preventDefault(); V.nama = a.getAttribute('data-vp'); V.view = 'profil'; vendor(); }; });
    $('vx').onclick = function () { U.unduhBanyak([{judul: 'Data Vendor', kolom: KOLOM_XL, baris: l.map(function (x) { return [x.nama, x.attn, x.telepon, x.email, x.alamat, x.npwp, x.bank, x.rekening, x.atasNama, x.termin, x.kategori, x.status, x.catatan]; })}], nama('xlsx', 'Data Vendor')); };
  }
  var KOLOM_XL = ['Nama Vendor', 'Attn', 'Telepon', 'Email', 'Alamat', 'NPWP', 'Bank', 'No Rekening', 'Atas Nama', 'Termin Bayar', 'Kategori', 'Status', 'Catatan'];
  function vInfo(label, v) { return '<div><label>' + label + '</label>' + (v ? esc(v) : '<span class="note">-</span>') + '</div>'; }
  async function vProfil() {
    var r = await ap({action: 'venProfil', nama: V.nama}); if (!r.ok) { toast(r.msg || 'Gagal.', true); V.view = 'daftar'; return vendor(); }
    var v = r.vendor, h = U.nav('vendor') + vBar();
    h += '<div class="card"><h3 style="margin-top:0">' + esc(v.nama) + ' ' + (v.status === 'Nonaktif' ? '<span class="tag bad">Nonaktif</span>' : '<span class="tag ok">Aktif</span>') + '</h3>' +
      (v.status === 'Nonaktif' ? '<div class="note" style="color:#c0392b">Vendor ini ditandai Nonaktif. Ini peringatan saja, PO baru tetap bisa dibuat.</div>' : '') +
      (r.kurang.length ? '<div class="note">Data belum lengkap: ' + esc(r.kurang.join(', ')) + '.</div>' : '') +
      '<div class="pgf">' + vInfo('Attn / kontak', v.attn) + vInfo('Telepon', v.telepon) + vInfo('Email', v.email) + vInfo('Alamat', v.alamat) + vInfo('Kategori', v.kategori) + vInfo('NPWP', v.npwp) + vInfo('Bank', v.bank) + vInfo('No rekening', v.rekening) + vInfo('Atas nama', v.atasNama) + vInfo('Termin bayar bawaan', v.termin) + vInfo('Catatan', v.catatan) + '</div>' +
      (v.rekeningDiubah ? '<div class="note">Rekening terakhir diubah ' + esc(tgl(v.rekeningDiubah)) + '. Alasannya ada di catatan di bawah.</div>' : '') +
      '<div class="fr"><button class="sv" id="vpu">Ubah data</button> <button class="gh" id="vpr">Rekonsiliasi</button> <button class="gh" id="vpb">Kembali ke daftar</button></div></div>';
    if (r.satuVendor.length) h += '<div class="card"><span class="tag w">Hanya satu vendor</span> Barang ini sering dibeli tetapi hanya dari vendor ini: <b>' + esc(r.satuVendor.slice(0, 12).join(', ')) + '</b>. Pertimbangkan mencari vendor kedua. Peringatan saja.</div>';
    h += '<div class="card"><h3 style="margin-top:0">PO yang masih ditunggu <span class="tag n">' + r.poAktif.length + '</span></h3>' + (r.poAktif.length ? '<div class="tw"><table><thead><tr><th>No PO</th><th>PPBJ</th><th>Dikirim</th><th class="nm">Nilai</th></tr></thead><tbody>' + r.poAktif.map(function (p) { return '<tr><td>' + esc(p.no) + '</td><td>' + esc(p.ppbj) + '<small>' + esc(p.proyek) + '</small></td><td>' + esc(tgl(p.tglKirim)) + '</td><td class="nm">' + rpx(p.total) + '</td></tr>'; }).join('') + '</tbody></table></div><div class="fr"><button class="gh" id="vtg">Susun pesan tagih kiriman</button></div><div id="vtgbox"></div>' : '<div class="note">Tidak ada.</div>') + '</div>';
    h += '<div class="card"><h3 style="margin-top:0">Janji vs kenyataan</h3><div class="note">' + esc(r.janjiRingkas.teks) + '</div>' + (r.janji.length ? '<div class="tw"><table><thead><tr><th>PO</th><th>Janji</th><th>Tiba</th><th>Hasil</th></tr></thead><tbody>' + r.janji.map(function (j) { return '<tr><td>' + esc(j.po) + '</td><td>' + esc(tgl(j.janji)) + '</td><td>' + (j.tiba ? esc(tgl(j.tiba)) : '-') + '</td><td><span class="tag ' + (j.terlewat ? 'bad' : 'ok') + '">' + esc(j.status) + '</span></td></tr>'; }).join('') + '</tbody></table></div>' : '') + '</div>';
    h += '<div class="card"><h3 style="margin-top:0">Barang yang pernah dibeli dan tren harga <span class="tag n">' + r.barang.length + '</span></h3><div class="note">Harga per satuan saat barang diterima. Hanya pergerakan, tanpa penilaian.</div>' + (r.barang.length ? '<div class="tw"><table><thead><tr><th>Barang</th><th class="nm">Harga terakhir</th><th class="nm">Perubahan</th><th>Riwayat</th></tr></thead><tbody>' + r.barang.map(function (b) { return '<tr><td>' + esc(b.nama) + (b.satuVendor ? ' <span class="tag w">satu vendor</span>' : '') + '<small>' + esc(b.kode) + '</small></td><td class="nm">' + rpx(b.terakhir) + '<small>' + esc(tgl(b.tglTerakhir)) + '</small></td><td class="nm">' + (b.perubahan == null ? '-' : (b.perubahan > 0 ? '+' : '') + String(b.perubahan).replace('.', ',') + '%') + '</td><td><small>' + b.titik.map(function (t) { return Math.round(t.harga).toLocaleString('id-ID'); }).join(' → ') + '</small></td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="note">Belum ada barang yang diterima dari vendor ini.</div>') + '</div>';
    h += '<div class="card"><h3 style="margin-top:0">Klaim <span class="tag n">' + r.klaim.length + '</span></h3>' + (r.klaim.length ? '<div class="tw"><table><tbody>' + r.klaim.map(function (k) { return '<tr><td>PO ' + esc(k.po) + '</td><td>' + esc(k.nama) + '</td><td>' + esc(k.jenis) + '</td><td>' + esc(k.status) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="note">Tidak ada klaim.</div>') + '</div>';
    h += '<div class="card"><h3 style="margin-top:0">Catatan komunikasi</h3><div class="pgf"><div><label>Catatan / isi pembicaraan</label><input type="text" id="vci"></div><div><label>Hasil</label><input type="text" id="vch"></div><div><label>Janji vendor, tanggal (opsional)</label><input type="date" id="vcj"></div><div><label>Untuk PO (opsional)</label><select id="vcp"><option value="">-</option>' + r.po.map(function (p) { return '<option>' + esc(p.no) + '</option>'; }).join('') + '</select></div></div><div class="fr"><button class="sv" id="vcs">Simpan catatan</button></div>' +
      (r.catatan.length ? '<div class="tw"><table><thead><tr><th>Waktu</th><th>Siapa</th><th>Catatan</th><th>Janji</th></tr></thead><tbody>' + r.catatan.map(function (c) { return '<tr><td>' + esc(c.waktu) + '</td><td>' + esc(c.oleh) + '</td><td><span class="tag n">' + esc(c.jenis) + '</span> ' + esc(c.isi) + (c.hasil ? '<small>Hasil: ' + esc(c.hasil) + '</small>' : '') + '</td><td>' + (c.janji ? esc(tgl(c.janji)) + (c.po ? '<small>PO ' + esc(c.po) + '</small>' : '') + (c.selesai ? '<small>selesai</small>' : (c.terlewat ? ' <span class="tag bad">terlewat</span> <button class="gh" data-cs="' + esc(c.id) + '">Tandai selesai</button>' : '')) : '') + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="note">Belum ada catatan.</div>') + '</div>';
    app.innerHTML = h; U.pasangNav(); pasangBar();
    $('vpu').onclick = function () { V.edit = v; V.view = 'form'; vendor(); }; $('vpb').onclick = function () { V.view = 'daftar'; vendor(); }; $('vpr').onclick = function () { V.view = 'rekon'; V.rkv = v.nama; vendor(); };
    if ($('vtg')) $('vtg').onclick = async function () { var t = await ap({action: 'venTagih', vendor: v.nama}); if (!t.ok) { toast(t.msg || 'Gagal.', true); return; } $('vtgbox').innerHTML = t.pesan ? kotakPesan('Pesan tagih kiriman', t.pesan) : '<div class="note">' + esc(t.msg || 'Tidak ada yang ditunggu.') + '</div>'; pasangSalin($('vtgbox')); };
    $('vcs').onclick = async function () { var x = await ap({action: 'venCatat', vendor: v.nama, isi: $('vci').value, hasil: $('vch').value, janji: $('vcj').value, po: $('vcp').value}); toast(x.msg || (x.ok ? 'Tersimpan.' : 'Gagal.'), !x.ok); if (x.ok) vProfil(); };
    each('button[data-cs]', function (b) { b.onclick = async function () { var x = await ap({action: 'venCatatSelesai', id: b.getAttribute('data-cs')}); toast(x.msg || 'Gagal.', !x.ok); if (x.ok) vProfil(); }; });
    if (U.catatanPasang) U.catatanPasang(app, 'Vendor', v.nama);
  }
  var FM = [['nama', 'Nama vendor (wajib)'], ['attn', 'Attn / kontak'], ['telepon', 'Telepon'], ['email', 'Email'], ['alamat', 'Alamat'], ['kategori', 'Kategori / barang yang dijual'], ['npwp', 'NPWP'], ['bank', 'Bank'], ['rekening', 'No rekening'], ['atasNama', 'Atas nama rekening'], ['termin', 'Termin bayar bawaan (mis. Net 14)'], ['catatan', 'Catatan']];
  function vForm() {
    var d = V.edit || {}, h = U.nav('vendor') + vBar() + '<div class="card"><h3 style="margin-top:0">' + (V.edit ? 'Ubah ' + esc(d.nama) : 'Tambah vendor') + '</h3><div class="pgf">' + FM.map(function (f) { return '<div><label>' + f[1] + '</label><input type="text" id="vf_' + f[0] + '" value="' + esc(d[f[0]] || '') + '"' + (V.edit && f[0] === 'nama' ? '' : '') + '></div>'; }).join('') + '<div><label>Status</label><select id="vf_status"><option>Aktif</option><option>Nonaktif</option></select></div></div>' +
      '<div id="vf_alasan_box" style="display:none" class="note"><b>Rekening berubah.</b> Alasan wajib diisi dan akan tercatat di riwayat vendor.<br><input type="text" id="vf_alasan" placeholder="Mis. vendor kirim surat pindah bank, 5 Nov" style="width:100%"></div>' +
      '<div class="fr"><button class="sv" id="vfs">Simpan</button> <button class="gh" id="vfb">Batal</button></div><div class="note">Isian kosong tidak menghapus data lama.</div></div>';
    app.innerHTML = h; U.pasangNav(); pasangBar(); $('vf_status').value = d.status || 'Aktif';
    var cek = function () { var lama = V.edit && V.edit.rekening, beda = lama && (($('vf_rekening').value && $('vf_rekening').value !== V.edit.rekening) || ($('vf_bank').value && $('vf_bank').value !== V.edit.bank) || ($('vf_atasNama').value && $('vf_atasNama').value !== V.edit.atasNama)); $('vf_alasan_box').style.display = beda ? '' : 'none'; };
    ['rekening', 'bank', 'atasNama'].forEach(function (k) { $('vf_' + k).oninput = cek; });
    $('vfb').onclick = function () { V.view = V.edit ? 'profil' : 'daftar'; if (V.edit) V.nama = V.edit.nama; vendor(); };
    $('vfs').onclick = async function () {
      var b = {action: 'venSimpan2', status: $('vf_status').value, alasan: $('vf_alasan').value}; FM.forEach(function (f) { b[f[0]] = $('vf_' + f[0]).value; }); if (V.edit) b.namaLama = V.edit.nama;
      this.disabled = true; var r = await ap(b);
      if (!r.ok && r.mirip && confirm(r.msg + '\n\nTekan OK untuk tetap menambah sebagai vendor baru.')) { b.tetapBaru = true; r = await ap(b); }
      toast(r.msg || (r.ok ? 'Tersimpan.' : 'Gagal.'), !r.ok); this.disabled = false; if (r.ok) { V.nama = b.nama; V.view = 'profil'; V.edit = null; V.list = []; vendor(); }
    };
  }
  /* --- impor Excel dengan pratinjau --- */
  function kolomVen(h) {
    var s = String(h || '').toLowerCase().replace(/[^a-z]/g, '');
    if (/^(nama|namavendor|vendor|supplier|namasupplier|perusahaan)$/.test(s)) return 'nama'; if (/^(attn|kontak|pic|up|namakontak|contact)$/.test(s)) return 'attn'; if (/^(telepon|telp|tlp|phone|hp|nohp|notelepon|notelp)$/.test(s)) return 'telepon';
    if (/^(email|mail|surel)$/.test(s)) return 'email'; if (/^(alamat|address)$/.test(s)) return 'alamat'; if (s === 'npwp') return 'npwp'; if (/^(bank|namabank)$/.test(s)) return 'bank'; if (/^(norekening|rekening|norek|accountno|nomorrekening)$/.test(s)) return 'rekening';
    if (/^(atasnama|namarekening|pemilikrekening)$/.test(s)) return 'atasNama'; if (/^(terminbayar|termin|terminbayarbawaan|tempo|top)$/.test(s)) return 'termin'; if (/^(kategori|barangyangdijual|produk|jenis)$/.test(s)) return 'kategori'; if (s === 'status') return 'status'; if (/^(catatan|keterangan|note)$/.test(s)) return 'catatan'; return '';
  }
  U.bacaVendor2 = function (aoa) {
    var h = (aoa[0] || []).map(kolomVen), out = []; if (h.indexOf('nama') < 0) return {err: 'Kolom nama vendor tidak ditemukan. Judul kolom harus ada di baris pertama (Nama Vendor).'};
    for (var i = 1; i < aoa.length; i++) { var o = {}, a = false; h.forEach(function (k, j) { if (k) { var v = String(aoa[i][j] == null ? '' : aoa[i][j]).trim(); if (v) { o[k] = v; a = true; } } }); if (a) out.push(o); }
    return {rows: out};
  };
  function vImpor() {
    app.innerHTML = U.nav('vendor') + vBar() + '<div class="card"><h3 style="margin-top:0">Unggah daftar vendor dari Excel</h3><div class="note">Unduh template, isi, lalu unggah. Sebelum disimpan, tiap baris diberi penanda: <b>Baru</b>, <b>Perbarui</b>, <b>Mirip</b> (mirip nama vendor lain, ditahan), <b>Salah</b> (tidak akan disimpan).</div><div class="fr"><button class="gh" id="vit">Unduh template Excel</button> <input type="file" id="vif" accept=".xlsx,.xls,.csv"> <button class="sv" id="vib">Baca dan periksa</button></div><div id="vbox"></div></div>';
    U.pasangNav(); pasangBar();
    $('vit').onclick = function () {
      U.unduhBanyak([{judul: 'Data Vendor', kolom: KOLOM_XL, baris: [['CV Contoh Pipa Jaya', 'Bapak Budi', '081234567890', 'budi@contoh.id', 'Jl. Contoh No. 1, Serang', '12.345.678.9-012.000', 'BCA', '1234567890', 'CV Contoh Pipa Jaya', 'Net 14', 'Pipa dan fitting', 'Aktif', 'Contoh baris, hapus sebelum diunggah']]},
        {judul: 'Petunjuk', kolom: ['Kolom', 'Keterangan'], baris: [['Nama Vendor', 'Wajib. Nama yang sama dengan vendor lama akan memperbarui datanya.'], ['Attn, Telepon, Email, Alamat', 'Boleh kosong. Isian kosong tidak menghapus data lama.'], ['NPWP', '15 atau 16 angka (titik dan strip boleh).'], ['Bank, No Rekening, Atas Nama', 'Bila rekening vendor lama berubah, sistem meminta alasan dan mencatatnya.'], ['Termin Bayar', 'Mis. Net 14, DP 30%.'], ['Status', 'Aktif atau Nonaktif. Nonaktif hanya peringatan.'], ['Baris pertama', 'Judul kolom, jangan diubah urutannya.']]}], nama('xlsx', 'Template Data Vendor'));
    };
    $('vib').onclick = async function () {
      var f = $('vif').files && $('vif').files[0]; if (!f) { toast('Pilih file Excel dulu.', true); return; } if (typeof XLSX === 'undefined') { toast('Pembaca Excel belum termuat, coba lagi sebentar.', true); return; }
      try {
        var wb = XLSX.read(await f.arrayBuffer(), {type: 'array'}), aoa = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {header: 1, defval: ''}), b = U.bacaVendor2(aoa); if (b.err) { toast(b.err, true); return; } if (!b.rows.length) { toast('Tidak ada baris vendor.', true); return; }
        var r = await ap({action: 'venPratinjau', rows: b.rows}); if (!r.ok) { toast(r.msg || 'Gagal.', true); return; } V.pil = b.rows; var tg = {Baru: 'ok', Perbarui: 'n', Mirip: 'w', Salah: 'bad'}, ada = r.baris.some(function (x) { return x.rekeningBerubah; });
        $('vbox').innerHTML = '<div class="fr">' + Object.keys(r.hitung).map(function (k) { return '<span class="tag ' + tg[k] + '">' + k + ': ' + r.hitung[k] + '</span>'; }).join(' ') + '</div><div class="tw"><table><thead><tr><th>Baris</th><th>Vendor</th><th>Penanda</th><th>Catatan</th></tr></thead><tbody>' + r.baris.map(function (x) { return '<tr><td>' + x.baris + '</td><td>' + esc(x.nama) + '</td><td><span class="tag ' + tg[x.tanda] + '">' + x.tanda + '</span></td><td>' + esc(x.catatan.join('; ')) + '</td></tr>'; }).join('') + '</tbody></table></div>' +
          (ada ? '<div class="note"><b>Ada rekening yang berubah.</b> Alasan wajib:<br><input type="text" id="via" style="width:100%" placeholder="Mis. data rekening dari surat vendor 5 Nov"></div>' : '') + (r.hitung.Mirip ? '<label class="note"><input type="checkbox" id="vim"> Simpan juga baris "Mirip" sebagai vendor baru</label>' : '') +
          '<div class="fr"><button class="sv" id="vis">Simpan yang valid</button></div>';
        $('vis').onclick = async function () { this.disabled = true; var x = await ap({action: 'venImpor2', rows: V.pil, alasan: $('via') ? $('via').value : '', sertakanMirip: !!($('vim') && $('vim').checked)}); toast(x.msg || (x.ok ? 'Selesai.' : 'Gagal.'), !x.ok); if (x.ok) { V.list = []; V.view = 'daftar'; V.f = 'semua'; V.q = ''; vendor(); } else this.disabled = false; };
      } catch (e) { toast(e.message || 'Gagal membaca Excel.', true); }
    };
  }
  async function vMirip() {
    var r = await ap({action: 'venMirip'}); if (!r.ok) { toast(r.msg || 'Gagal.', true); return; }
    app.innerHTML = U.nav('vendor') + vBar() + '<div class="card"><h3 style="margin-top:0">Nama vendor yang mirip <span class="tag n">' + r.data.length + '</span></h3><div class="note">Bisa jadi vendor yang sama dengan dua penulisan. ' + (r.bisaGabung ? 'Gabungkan agar semua PO, klaim, dan riwayat memakai satu nama.' : 'Hanya admin utama yang dapat menggabungkan.') + '</div>' +
      (r.data.length ? '<div class="tw"><table><tbody>' + r.data.map(function (x, i) { return '<tr><td>' + esc(x.a) + ' <small>' + x.poA + ' PO</small></td><td>' + esc(x.b) + ' <small>' + x.poB + ' PO</small></td><td>' + (r.bisaGabung ? '<button class="gh" data-gb="' + i + '|a">Pakai nama kiri</button> <button class="gh" data-gb="' + i + '|b">Pakai nama kanan</button>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="note">Tidak ada nama yang mirip.</div>') + '</div>';
    U.pasangNav(); pasangBar();
    each('button[data-gb]', function (b) { b.onclick = async function () { var p = b.getAttribute('data-gb').split('|'), x = r.data[Number(p[0])], ke = p[1] === 'a' ? x.a : x.b, dari = p[1] === 'a' ? x.b : x.a; if (!confirm('Gabungkan "' + dari + '" ke "' + ke + '"? Semua PO, klaim, dan riwayat atas nama "' + dari + '" akan memakai "' + ke + '".')) return; var g = await ap({action: 'venGabung', dari: dari, ke: ke}); toast(g.msg || (g.ok ? 'Selesai.' : 'Gagal.'), !g.ok); if (g.ok) { V.list = []; vMirip(); } }; });
  }
  async function vBelanja() {
    var r = await ap({action: 'venDaftarBelanja'}); if (!r.ok) { toast(r.msg || 'Gagal.', true); return; }
    app.innerHTML = U.nav('vendor') + vBar() + '<div class="card"><h3 style="margin-top:0">Daftar belanja per vendor langganan</h3><div class="note">Dari kebutuhan material PPBJ aktif (tab Stok menipis), dikelompokkan ke vendor terakhir tempat barang itu dibeli. Salin pesannya lalu kirim sendiri.</div></div>' +
      r.grup.map(function (g, i) { return '<div class="card"><h3 style="margin-top:0">' + esc(g.vendor) + ' <span class="tag n">' + g.items.length + ' barang</span> <small>perkiraan ' + rpx(g.nilai) + (g.tanpaHarga ? ' (+' + g.tanpaHarga + ' barang tanpa harga)' : '') + '</small></h3><div class="tw"><table><tbody>' + g.items.map(function (x) { return '<tr><td>' + esc(x.nama) + '</td><td class="nm">' + String(x.kurang).replace('.', ',') + ' ' + esc(x.satuan) + '</td></tr>'; }).join('') + '</tbody></table></div>' + kotakPesan('Pesan untuk ' + g.vendor, g.pesan) + '</div>'; }).join('') +
      (r.tanpaVendor.length ? '<div class="card"><h3 style="margin-top:0">Belum punya vendor langganan <span class="tag w">' + r.tanpaVendor.length + '</span></h3><div class="note">' + esc(r.tanpaVendor.map(function (x) { return x.nama; }).join(', ')) + '</div></div>' : '') + (!r.grup.length && !r.tanpaVendor.length ? '<div class="card"><div class="note">Tidak ada barang yang perlu dibeli saat ini.</div></div>' : '');
    U.pasangNav(); pasangBar(); pasangSalin(app);
  }
  /* --- penawaran: berdampingan, tanpa peringkat --- */
  async function vTawar() {
    var r = await ap({action: 'tawarList'}); if (!r.ok) { toast(r.msg || 'Gagal.', true); return; }
    app.innerHTML = U.nav('vendor') + vBar() + '<div class="card"><h3 style="margin-top:0">Permintaan penawaran</h3><div class="fr"><button class="sv" id="twb">Buat permintaan baru</button></div></div>' +
      r.data.map(function (t, i) { return '<div class="card"><h3 style="margin-top:0">' + esc(t.judul) + ' <small>' + esc(t.waktu) + ' · ' + esc(t.oleh) + (t.ppbj ? ' · PPBJ ' + esc(t.ppbj) : '') + '</small></h3>' + tabelTawar(t) + (t.terpilih ? '<div class="note"><b>Dipilih: ' + esc(t.terpilih) + '</b>. Alasan: ' + esc(t.alasan) + '</div>' : '') + '<div class="fr"><button class="gh" data-te="' + i + '">Buka dan ubah</button></div></div>'; }).join('');
    U.pasangNav(); pasangBar(); $('twb').onclick = function () { V.tw = {judul: '', ppbj: '', barang: [{nama: '', kode: '', satuan: '', qty: 1}], vendor: [{nama: '', harga: []}, {nama: '', harga: []}]}; tawarForm(); };
    each('button[data-te]', function (b) { b.onclick = function () { V.tw = JSON.parse(JSON.stringify(r.data[Number(b.getAttribute('data-te'))])); tawarForm(); }; });
  }
  function tabelTawar(t) {
    return '<div class="tw"><table><thead><tr><th>Barang</th><th class="nm">Qty</th><th class="nm">Harga PO terakhir</th>' + t.vendor.map(function (v) { return '<th class="nm">' + esc(v.nama) + '</th>'; }).join('') + '</tr></thead><tbody>' + t.barang.map(function (b, i) { return '<tr><td>' + esc(b.nama) + '</td><td class="nm">' + String(b.qty).replace('.', ',') + ' ' + esc(b.satuan) + '</td><td class="nm">' + (b.terakhir ? rpx(b.terakhir.harga) + '<small>' + esc(b.terakhir.vendor) + ' · ' + esc(tgl(b.terakhir.tgl)) + '</small>' : '-') + '</td>' + t.vendor.map(function (v) { return '<td class="nm">' + (v.harga[i] == null ? '-' : rpx(v.harga[i])) + '</td>'; }).join('') + '</tr>'; }).join('') +
      '<tr><td colspan="3"><small>Ongkir · lama kirim · berlaku</small></td>' + t.vendor.map(function (v) { return '<td class="nm"><small>' + (v.ongkir ? rpx(v.ongkir) : '-') + ' · ' + esc(v.lamaKirim || '-') + ' · ' + esc(v.berlaku || '-') + '</small></td>'; }).join('') + '</tr></tbody></table></div>';
  }
  async function tawarForm() {
    var t = V.tw, dl = '<datalist id="vtdl">' + V.list.map(function (v) { return '<option value="' + esc(v.nama) + '">'; }).join('') + '</datalist>';
    var h = U.nav('vendor') + vBar() + '<div class="card"><h3 style="margin-top:0">' + (t.id ? 'Ubah' : 'Buat') + ' permintaan penawaran</h3>' + dl + '<div class="pgf"><div><label>Judul</label><input type="text" id="twj" value="' + esc(t.judul) + '"></div><div><label>PPBJ (opsional)</label><input type="text" id="twp" value="' + esc(t.ppbj || '') + '"></div></div>' +
      '<div class="fr"><button class="gh" id="twm">Ambil barang dari Stok menipis</button></div>' +
      '<div class="tw"><table><thead><tr><th>Barang</th><th>Kode</th><th>Satuan</th><th class="nm">Qty</th>' + t.vendor.map(function (v, j) { return '<th><input type="text" list="vtdl" data-vn="' + j + '" value="' + esc(v.nama) + '" placeholder="Vendor ' + (j + 1) + '" style="width:150px"></th>'; }).join('') + '</tr></thead><tbody>' +
      t.barang.map(function (b, i) { return '<tr><td><input type="text" data-bn="' + i + '" value="' + esc(b.nama) + '"></td><td><input type="text" data-bk="' + i + '" value="' + esc(b.kode || '') + '" style="width:80px"></td><td><input type="text" data-bs="' + i + '" value="' + esc(b.satuan || '') + '" style="width:60px"></td><td><input type="text" data-bq="' + i + '" value="' + esc(b.qty) + '" style="width:60px"></td>' + t.vendor.map(function (v, j) { return '<td><input type="text" data-bh="' + i + '|' + j + '" value="' + (v.harga[i] == null ? '' : esc(v.harga[i])) + '" placeholder="harga" style="width:110px"></td>'; }).join('') + '</tr>'; }).join('') +
      '<tr><td colspan="4"><small>Ongkir</small></td>' + t.vendor.map(function (v, j) { return '<td><input type="text" data-vo="' + j + '" value="' + esc(v.ongkir || '') + '" style="width:110px"></td>'; }).join('') + '</tr><tr><td colspan="4"><small>Lama kirim</small></td>' + t.vendor.map(function (v, j) { return '<td><input type="text" data-vl="' + j + '" value="' + esc(v.lamaKirim || '') + '" style="width:110px"></td>'; }).join('') + '</tr><tr><td colspan="4"><small>Masa berlaku</small></td>' + t.vendor.map(function (v, j) { return '<td><input type="text" data-vb="' + j + '" value="' + esc(v.berlaku || '') + '" style="width:110px"></td>'; }).join('') + '</tr></tbody></table></div>' +
      '<div class="fr"><button class="gh" id="twab">+ Barang</button> <button class="gh" id="twav">+ Vendor</button> <button class="gh" id="twps">Susun pesan permintaan</button></div><div id="twpesan"></div>' +
      '<div class="note">Jawaban vendor diketik di tabel di atas dan ditampilkan berdampingan tanpa peringkat. Harga PO terakhir ditampilkan setelah disimpan.</div><div class="pgf"><div><label>Vendor terpilih (opsional)</label><input type="text" list="vtdl" id="twt" value="' + esc(t.terpilih || '') + '"></div><div><label>Alasan memilih (wajib bila memilih)</label><input type="text" id="twa" value="' + esc(t.alasan || '') + '"></div></div><div class="fr"><button class="sv" id="twsv">Simpan</button> <button class="gh" id="twbt">Kembali</button></div></div>';
    app.innerHTML = h; U.pasangNav(); pasangBar();
    var ambil = function () {
      t.judul = $('twj').value; t.ppbj = $('twp').value; t.terpilih = $('twt').value; t.alasan = $('twa').value;
      each('input[data-bn]', function (e) { t.barang[+e.getAttribute('data-bn')].nama = e.value; }); each('input[data-bk]', function (e) { t.barang[+e.getAttribute('data-bk')].kode = e.value; }); each('input[data-bs]', function (e) { t.barang[+e.getAttribute('data-bs')].satuan = e.value; }); each('input[data-bq]', function (e) { t.barang[+e.getAttribute('data-bq')].qty = e.value; });
      each('input[data-vn]', function (e) { t.vendor[+e.getAttribute('data-vn')].nama = e.value; }); each('input[data-vo]', function (e) { t.vendor[+e.getAttribute('data-vo')].ongkir = e.value; }); each('input[data-vl]', function (e) { t.vendor[+e.getAttribute('data-vl')].lamaKirim = e.value; }); each('input[data-vb]', function (e) { t.vendor[+e.getAttribute('data-vb')].berlaku = e.value; });
      each('input[data-bh]', function (e) { var p = e.getAttribute('data-bh').split('|'); t.vendor[+p[1]].harga[+p[0]] = e.value; });
    };
    $('twab').onclick = function () { ambil(); t.barang.push({nama: '', kode: '', satuan: '', qty: 1}); tawarForm(); };
    $('twav').onclick = function () { ambil(); if (t.vendor.length >= 3) { toast('Maksimal 3 vendor per permintaan.', true); return; } t.vendor.push({nama: '', harga: []}); tawarForm(); };
    $('twm').onclick = async function () { ambil(); var s = await ap({action: 'stokMenipis'}); if (!s.ok) { toast(s.msg || 'Gagal.', true); return; } if (!s.beli.length) { toast('Tidak ada barang yang perlu dibeli.'); return; } t.barang = s.beli.slice(0, 40).map(function (b) { return {nama: b.nama, kode: b.kode, satuan: b.satuan, qty: b.kurang}; }); tawarForm(); };
    $('twps').onclick = async function () { ambil(); var p = await ap({action: 'tawarPesan', barang: t.barang.filter(function (b) { return b.nama; }), vendor: t.vendor.map(function (v) { return v.nama; }).filter(Boolean)}); if (!p.ok) { toast(p.msg || 'Gagal.', true); return; } $('twpesan').innerHTML = p.data.map(function (x) { return kotakPesan('Pesan untuk ' + x.vendor, x.pesan); }).join(''); pasangSalin($('twpesan')); };
    $('twbt').onclick = function () { vendor(); };
    $('twsv').onclick = async function () { ambil(); var r = await ap({action: 'tawarSimpan', id: t.id || '', judul: t.judul, ppbj: t.ppbj, barang: t.barang, vendor: t.vendor.filter(function (v) { return v.nama; }), terpilih: t.terpilih, alasan: t.alasan}); toast(r.msg || (r.ok ? 'Tersimpan.' : 'Gagal.'), !r.ok); if (r.ok) vendor(); };
  }
  function vRekon() {
    var iso = new Date().toISOString().slice(0, 10), awal = iso.slice(0, 8) + '01';
    app.innerHTML = U.nav('vendor') + vBar() + '<div class="card"><h3 style="margin-top:0">Lembar rekonsiliasi vendor</h3><div class="pgf"><div><label>Vendor</label><input type="text" id="rkv" list="rkdl" value="' + esc(V.rkv || '') + '"><datalist id="rkdl">' + V.list.map(function (v) { return '<option value="' + esc(v.nama) + '">'; }).join('') + '</datalist></div><div><label>Dari</label><input type="date" id="rkd" value="' + awal + '"></div><div><label>Sampai</label><input type="date" id="rks" value="' + iso + '"></div></div><div class="fr"><button class="sv" id="rkb">Tampilkan</button></div><div id="rkbox"></div></div>';
    U.pasangNav(); pasangBar();
    $('rkb').onclick = async function () {
      var r = await ap({action: 'venRekon', vendor: $('rkv').value, dari: $('rkd').value, sampai: $('rks').value}); if (!r.ok) { toast(r.msg || 'Gagal.', true); return; }
      var kol = ['No PO', 'Tanggal', 'PPBJ', 'Status', 'Nilai PO', 'Qty pesan', 'Qty diterima', 'Klaim', 'Jasa dibayar'], baris = r.rows.map(function (x) { return [x.po, tgl(x.tgl), x.ppbj, x.status, rpx(x.total), x.qPesan, x.qTerima, x.klaim + (x.klaimTerbuka ? ' (' + x.klaimTerbuka + ' terbuka)' : ''), x.jasaDibayar ? rpx(x.jasaDibayar) : '-']; }), per = tgl(r.dari) + ' s/d ' + tgl(r.sampai);
      baris.push(['TOTAL', '', '', '', rpx(r.total.nilai), '', '', r.total.klaim, rpx(r.total.jasaDibayar)]);
      $('rkbox').innerHTML = '<div class="sum"><div><b>' + r.rows.length + '</b><span>PO</span></div><div><b>' + rpx(r.total.nilai) + '</b><span>Nilai PO</span></div><div><b>' + r.total.klaim + '</b><span>Klaim (' + r.total.klaimTerbuka + ' terbuka)</span></div><div><b>' + rpx(r.total.jasaDibayar) + '</b><span>Jasa dibayar</span></div></div>' + (r.rows.length ? '<div class="tw"><table><thead><tr>' + kol.map(function (k) { return '<th>' + k + '</th>'; }).join('') + '</tr></thead><tbody>' + baris.map(function (b) { return '<tr>' + b.map(function (c) { return '<td>' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>' : '<div class="note">Tidak ada PO pada periode ini.</div>') +
        '<div class="fr"><button class="gh" id="rkx">Unduh Excel</button> <button class="gh" id="rkp">Unduh PDF</button></div>';
      $('rkx').onclick = function () { U.unduhBanyak([{judul: 'Rekonsiliasi', kolom: kol, baris: baris}], nama('xlsx', 'Rekonsiliasi', r.vendor, per.replace(/\//g, '-'))); };
      $('rkp').onclick = function () { U.unduhPdf('REKONSILIASI VENDOR - ' + r.vendor, 'Periode ' + per, [{judul: '', kolom: kol, baris: baris}], nama('pdf', 'Rekonsiliasi', r.vendor, per.replace(/\//g, '-'))); };
    };
  }

  /* ===================== CATATAN TEMPEL ===================== */
  U.catatanPasang = async function (host, jenis, ref) {
    var box = document.createElement('div'); box.className = 'card'; box.innerHTML = '<div class="msg">Memuat catatan...</div>'; host.appendChild(box);
    async function gambar() {
      var r = await ap({action: 'catatanList', jenis: jenis, ref: ref}); if (!r.ok) { box.innerHTML = ''; return; }
      box.innerHTML = '<h3 style="margin-top:0">Catatan tempel <span class="tag n">' + r.data.length + '</span></h3><div class="note">Catatan internal Pengadaan untuk ' + esc(jenis) + ' ' + esc(ref) + '. Terlihat oleh sesama Pengadaan, bukan pemohon.</div>' +
        r.data.map(function (c) { return '<div class="at"><span><b>' + esc(c.oleh) + '</b> <small>' + esc(c.waktu) + '</small><br>' + esc(c.isi) + '</span>' + (c.milikSaya ? '<button class="gh" data-ch="' + esc(c.id) + '">Hapus</button>' : '') + '</div>'; }).join('') +
        '<div class="fr"><input type="text" id="cti" placeholder="Tulis catatan" style="flex:1;min-width:180px"> <button class="sv" id="ctb">Tempel</button></div>';
      box.querySelector('#ctb').onclick = async function () { var i = box.querySelector('#cti'); var x = await ap({action: 'catatanTambah', jenis: jenis, ref: ref, isi: i.value}); toast(x.msg || (x.ok ? 'Tersimpan.' : 'Gagal.'), !x.ok); if (x.ok) gambar(); };
      Array.prototype.forEach.call(box.querySelectorAll('button[data-ch]'), function (b) { b.onclick = async function () { var x = await ap({action: 'catatanHapus', id: b.getAttribute('data-ch')}); toast(x.msg || 'Gagal.', !x.ok); if (x.ok) gambar(); }; });
    }
    gambar();
  };

  /* ===================== KOKPIT BIAYA ===================== */
  var K = {q: ''};
  E.kokpit = async function () {
    app.innerHTML = U.nav('kokpit') + '<div class="msg">Memuat...</div>'; U.pasangNav();
    var r = await ap({action: 'kokpit', q: K.q}); if (!r.ok) { toast(r.msg || 'Gagal.', true); return; }
    var kol = ['PPBJ', 'Proyek', 'Anggaran RAB', 'Dipesan (PO)', 'Diterima', 'UMO', 'Termin dibayar', 'Sisa anggaran', 'Peringatan'], baris = r.data.map(function (x) { return [x.ppbj, x.proyek, x.adaRab ? rpx(x.anggaran) : 'belum diisi', rpx(x.dipesan), rpx(x.diterima), rpx(x.umoMuka), rpx(x.terminDibayar), x.sisa == null ? '-' : rpx(x.sisa), x.peringatan.join(' ')]; });
    app.innerHTML = U.nav('kokpit') + '<div class="card"><h3 style="margin-top:0">Kokpit biaya per PPBJ <span class="tag ' + (r.data.some(function (x) { return x.peringatan.length; }) ? 'bad' : 'ok') + '">' + r.data.filter(function (x) { return x.peringatan.length; }).length + ' peringatan</span></h3><div class="note">' + esc(r.catatan) + '</div><div class="fr"><input type="text" id="kq" placeholder="Cari PPBJ atau proyek" value="' + esc(K.q) + '" style="flex:1;min-width:180px"> <button class="gh" id="kx">Unduh Excel</button> <button class="gh" id="kp">Unduh PDF</button></div>' +
      (r.data.length ? '<div class="tw"><table><thead><tr><th>PPBJ / Proyek</th><th class="nm">Anggaran RAB</th><th class="nm">Dipesan</th><th class="nm">Diterima</th><th class="nm">UMO</th><th class="nm">Termin dibayar</th><th class="nm">Sisa</th></tr></thead><tbody>' + r.data.map(function (x) { return '<tr><td><b>' + esc(x.ppbj) + '</b><small>' + esc(x.proyek) + '</small>' + x.peringatan.map(function (p) { return '<small style="color:#c0392b">' + esc(p) + '</small>'; }).join('') + '</td><td class="nm">' + (x.adaRab ? rpx(x.anggaran) : '<small>RAB kosong</small>') + '</td><td class="nm">' + rpx(x.dipesan) + (x.menunggu ? '<small>+' + rpx(x.menunggu) + ' menunggu</small>' : '') + '</td><td class="nm">' + rpx(x.diterima) + '</td><td class="nm">' + rpx(x.umoMuka) + '</td><td class="nm">' + rpx(x.terminDibayar) + '</td><td class="nm">' + (x.sisa == null ? '-' : '<span class="tag ' + (x.sisa < 0 ? 'bad' : 'ok') + '">' + rpx(x.sisa) + '</span>') + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="note">Belum ada PPBJ dengan pesanan.</div>') + '</div>';
    U.pasangNav(); $('kq').onchange = function () { K.q = this.value; E.kokpit(); };
    $('kx').onclick = function () { U.unduhBanyak([{judul: 'Kokpit biaya', kolom: kol, baris: baris}], nama('xlsx', 'Kokpit Biaya')); }; $('kp').onclick = function () { U.unduhPdf('KOKPIT BIAYA PER PPBJ', 'Dicetak ' + new Date().toLocaleDateString('id-ID'), [{judul: '', kolom: kol, baris: baris}], nama('pdf', 'Kokpit Biaya')); };
  };

  /* ===================== BERKAS PO ===================== */
  var B = {q: '', tanpa: ''};
  E.berkas = async function () {
    app.innerHTML = U.nav('berkas') + '<div class="msg">Memuat...</div>'; U.pasangNav();
    var r = await ap({action: 'berkasPo', q: B.q, tanpa: B.tanpa}); if (!r.ok) { toast(r.msg || 'Gagal.', true); return; }
    var ic = function (b, j, no) { var x = b[j]; if (x.ada === null) return '<small>-</small>'; return '<button class="' + (x.ada ? 'tag ok' : 'tag bad') + '" style="border:0;cursor:pointer" data-bt="' + esc(no) + '|' + j + '|' + (x.ada ? 0 : 1) + '" title="' + (x.otomatis ? 'Terdeteksi otomatis. ' : 'Dicentang manual. ') + 'Ketuk untuk mengubah">' + (x.ada ? 'ada' : 'belum') + '</button>'; };
    app.innerHTML = U.nav('berkas') + '<div class="card"><h3 style="margin-top:0">Kelengkapan berkas PO</h3><div class="note">PO, surat jalan, berita acara, dan bukti bayar terdeteksi otomatis bila sudah diunggah. Invoice dan yang lain bisa dicentang manual dengan mengetuk tandanya. Tanda "-" berarti tidak berlaku.</div><div class="fr"><input type="text" id="bq" placeholder="Cari PO, vendor, PPBJ" value="' + esc(B.q) + '" style="flex:1;min-width:160px"> <select id="bf"><option value="">Semua PO</option>' + r.jenis.map(function (j) { return '<option value="' + j + '">Belum ada ' + j + ' (' + (r.hitung[j] || 0) + ')</option>'; }).join('') + '</select></div>' +
      (r.data.length ? '<div class="tw"><table><thead><tr><th>PO / Vendor</th>' + r.jenis.map(function (j) { return '<th>' + j + '</th>'; }).join('') + '</tr></thead><tbody>' + r.data.map(function (x) { return '<tr><td><b>' + esc(x.no) + '</b><small>' + esc(x.vendor) + ' · ' + esc(x.ppbj) + '</small></td>' + r.jenis.map(function (j) { return '<td>' + ic(x.berkas, j, x.no) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>' : '<div class="note">Tidak ada PO yang cocok.</div>') + (r.pesan ? kotakPesan('Daftar untuk ditagih', r.pesan) : '') +
      '<div class="note">Mengunduh seluruh berkas PO sebagai satu paket belum tersedia. Berkas dibuka dari rincian PO di tab Daftar PO.</div></div>';
    U.pasangNav(); pasangSalin(app); $('bf').value = B.tanpa; $('bf').onchange = function () { B.tanpa = this.value; E.berkas(); }; $('bq').onchange = function () { B.q = this.value; E.berkas(); };
    each('button[data-bt]', function (b) { b.onclick = async function () { var p = b.getAttribute('data-bt').split('|'), x = await ap({action: 'berkasTandai', no: p[0], jenis: p[1], ada: p[2] === '1'}); toast(x.msg || 'Gagal.', !x.ok); if (x.ok) E.berkas(); }; });
  };

  /* ===================== JADWAL KEDATANGAN ===================== */
  E.jadwal = async function () {
    app.innerHTML = U.nav('jadwal') + '<div class="msg">Memuat...</div>'; U.pasangNav();
    var r = await ap({action: 'jadwalDatang'}); if (!r.ok) { toast(r.msg || 'Gagal.', true); return; }
    var kart = function (k) { return '<div class="at"><span><b>' + esc(k.vendor) + '</b> · PO ' + esc(k.po) + ' <small>(' + esc(k.asal) + (k.tgl ? ' ' + esc(tgl(k.tgl)) : '') + ')</small><br><small>' + esc(k.items.map(function (i) { return i.nama + ' ' + String(i.sisa).replace('.', ',') + ' ' + i.satuan; }).slice(0, 5).join(', ')) + '</small></span></div>'; };
    app.innerHTML = U.nav('jadwal') + '<div class="card"><h3 style="margin-top:0">Jadwal kedatangan 7 hari ke depan</h3><div class="note">Dari janji vendor bila ada, selain itu perkiraan dari rata-rata lama tunggu vendor. Bisa berubah.</div></div>' +
      r.hari.map(function (h) { return '<div class="card"><b>' + h.nama + '</b> <small>' + esc(tgl(h.tgl)) + '</small> <span class="tag ' + (h.kirim.length ? 'w' : 'n') + '">' + h.kirim.length + ' pengiriman</span>' + h.kirim.map(kart).join('') + '</div>'; }).join('') +
      (r.lewat.length ? '<div class="card"><b>Sudah lewat jadwal, belum tiba</b> <span class="tag bad">' + r.lewat.length + '</span>' + r.lewat.map(kart).join('') + '</div>' : '') + (r.nanti.length ? '<div class="card"><b>Lebih dari 7 hari lagi</b> <span class="tag n">' + r.nanti.length + '</span>' + r.nanti.map(kart).join('') + '</div>' : '') + (r.tanpa.length ? '<div class="card"><b>Belum ada perkiraan tanggal</b> <span class="tag n">' + r.tanpa.length + '</span>' + r.tanpa.map(kart).join('') + '</div>' : '') + kotakPesan('Pesan untuk tim gudang', r.pesan);
    U.pasangNav(); pasangSalin(app);
  };

  /* ===================== PENUTUPAN BULAN ===================== */
  var TB = {bulan: ''};
  E.tutup = async function () {
    if (!TB.bulan) TB.bulan = new Date().toISOString().slice(0, 7);
    app.innerHTML = U.nav('tutup') + '<div class="msg">Memuat...</div>'; U.pasangNav();
    var r = await ap({action: 'tutupBulan', bulan: TB.bulan}); if (!r.ok) { toast(r.msg || 'Gagal.', true); return; }
    var kol = ['Butir', 'Jumlah', 'Status', 'Contoh'], baris = r.butir.map(function (b) { return [b.judul, b.n, b.ok ? 'Beres' : 'Perlu dicek', b.contoh.join('; ')]; });
    app.innerHTML = U.nav('tutup') + '<div class="card"><h3 style="margin-top:0">Daftar penutupan bulan <span class="tag ' + (r.selesai ? 'ok' : 'bad') + '">' + (r.selesai ? 'siap ditutup' : r.belum + ' butir perlu dicek') + '</span></h3><div class="fr"><label>Bulan</label><input type="month" id="tbb" value="' + esc(TB.bulan) + '"> <button class="gh" id="tbp">Unduh PDF</button></div><div class="note">Keadaan saat ini (' + esc(r.dibuat) + '). Yang masih perlu tindakan dihitung sampai hari ini.</div></div>' +
      r.butir.map(function (b) { return '<div class="card"><span class="tag ' + (b.ok ? 'ok' : 'bad') + '">' + (b.ok ? 'beres' : b.n + ' perlu dicek') + '</span> <b>' + esc(b.judul) + '</b>' + (b.ket && !b.ok ? '<div class="note">' + esc(b.ket) + '</div>' : '') + (b.contoh.length && !b.ok ? '<div class="note">' + b.contoh.map(esc).join('<br>') + '</div>' : '') + '</div>'; }).join('');
    U.pasangNav(); $('tbb').onchange = function () { TB.bulan = this.value; E.tutup(); };
    $('tbp').onclick = function () { U.unduhPdf('DAFTAR PENUTUPAN BULAN ' + r.bulan, 'Dibuat ' + r.dibuat, [{judul: '', kolom: kol, baris: baris}], nama('pdf', 'Penutupan Bulan', r.bulan)); };
  };

  /* ===================== WAKTU SIKLUS (di tab Pantau) ===================== */
  U.siklusPasang = async function (host) {
    var r = await ap({action: 'waktuSiklus'}); if (!r.ok) return; var d = document.createElement('div'); d.className = 'card';
    var f = function (v) { return v == null ? '-' : String(v).replace('.', ',') + ' hari'; };
    d.innerHTML = '<h3 style="margin-top:0">Waktu siklus pengadaan</h3><div class="note">Rata-rata hari tiap tahap untuk PO yang dibuat pada bulan itu. ' + esc(r.catatan) + '</div><div class="tw"><table><thead><tr><th>Tahap</th><th class="nm">Bulan ini (' + esc(r.bulanIni) + ')</th><th class="nm">Bulan lalu (' + esc(r.bulanLalu) + ')</th><th class="nm">Semua</th></tr></thead><tbody>' + r.tahap.map(function (t) { return '<tr><td>' + esc(t.tahap) + '</td><td class="nm">' + f(t.bulanIni) + '<small>' + t.nIni + ' PO</small></td><td class="nm">' + f(t.bulanLalu) + '<small>' + t.nLalu + ' PO</small></td><td class="nm">' + f(t.semua) + '<small>' + t.nSemua + ' PO</small></td></tr>'; }).join('') + '</tbody></table></div>';
    host.appendChild(d);
  };
})(typeof window !== 'undefined' ? window : this);
