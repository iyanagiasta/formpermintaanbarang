/* Tambahan 165: panel Kesehatan sistem di tab Sistem (admin).
   Menampilkan hasil adminKesehatanPeriksa: ukuran spreadsheet terhadap batas Google, kuota email, pemicu otomatis,
   cadangan, sinkron Cari Barang, unggahan Accurate, judul kolom sheet, dan proses terlama.
   Tombol: Periksa ulang, Kirim email sekarang, Pasang email mingguan (Senin 07.00). */
(function (root) {
  'use strict';
  var W = {bahaya: ['b', 'BAHAYA'], perhatian: ['w', 'Perlu perhatian'], info: ['n', 'Info'], sehat: ['d', 'Sehat']};
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
  function n(v) { return (Number(v) || 0).toLocaleString('id-ID'); }
  /* T167: tombol perbaikan per catatan. ubah=1 meminta konfirmasi lalu menjalankan adminKesehatanPerbaiki; buka:<tab> membuka tab admin; bot:<teks> membuka Tanya Gudang. */
  var KONF = {
    'pemicu': 'Pasang pemicu ini? Pemicu yang sama dihapus dulu lalu dipasang satu (tidak ganda).',
    'cadangan': 'Buat salinan cadangan spreadsheet sekarang?',
    'sinkron': 'Kirim stok ke aplikasi Cari Barang sekarang?',
    'kosong': 'Hapus baris KOSONG di bawah data sheet ini? Data tidak tersentuh; disisakan 200 baris kosong. Sebaiknya buat cadangan dulu.',
    'kolom': 'Tulis ulang baris judul sheet ini sesuai judul seharusnya?\n\nTekan OK hanya bila judulnya tertimpa ketik. Bila ada kolom yang disisipkan atau dipindah, tekan Batal dan kembalikan posisinya dulu (Ctrl+Z atau Riwayat versi), karena data di bawahnya bisa salah label.'
  };
  function tombolAksi(L) {
    if (!L || !L.length) return '';
    return '<div class="fr" style="margin-top:6px;gap:6px;flex-wrap:wrap">' + L.map(function (a) { return '<button type="button" class="' + (a.ubah ? 'sv' : 'gh') + '" data-ksak="' + esc(a.id) + '" data-ksub="' + (a.ubah ? 1 : 0) + '" style="padding:5px 12px;font-size:13px">' + esc(a.label) + '</button>'; }).join('') + '</div>';
  }
  function jalankanAksi(b, el, api, toast) {
    var id = b.getAttribute('data-ksak'), ubah = b.getAttribute('data-ksub') === '1';
    if (/^buka:/.test(id)) { var t = id.slice(5); if (typeof root.goTab === 'function') root.goTab(t); else location.hash = t; return; }
    if (/^bot:/.test(id)) { root.open('tanya.html?tanya=' + encodeURIComponent(id.slice(4)), '_blank'); return; }
    if (ubah) { var k = KONF[id.split(':')[0]] || 'Jalankan perbaikan ini?'; if (!root.confirm(b.textContent + '\n\n' + k)) return; }
    b.disabled = true; var t0 = b.textContent; b.textContent = 'Memproses...';
    api({action: 'adminKesehatanPerbaiki', id: id}).then(function (x) {
      toast((x && x.msg) || ((x && x.ok) ? 'Selesai.' : 'Gagal.'), !(x && x.ok));
      if (x && x.ok) muat(el, api, toast, (x.msg || ''));
      else { b.disabled = false; b.textContent = t0; }
    }).catch(function () { toast('Gagal terhubung ke server.', true); b.disabled = false; b.textContent = t0; });
  }
  function isi(el, R, api, toast, info) {
    var A = R.angka || {}, sel = A.sel || {}, pc = sel.persen || 0, warna = pc >= 90 ? 'var(--red,#a82424)' : pc >= 70 ? 'var(--warn-t,#8a5a00)' : 'var(--grn,#14602f)';
    var h = '<h3 style="margin-top:0">Kesehatan sistem <span class="bd ' + W[R.tingkat][0] + '">' + W[R.tingkat][1] + '</span></h3>' +
      (info ? '<div class="note" style="margin:0 0 8px;border-left:3px solid var(--grn,#14602f);padding-left:8px"><b>Perbaikan terakhir:</b> ' + esc(info) + ' Pemeriksaan di bawah sudah diulang.</div>' : '') + '<div class="note" style="margin:0 0 8px">Diperiksa ' + esc(R.waktu) + (R.ms ? ' (' + Math.round(R.ms / 1000) + ' detik)' : '') + '. Email laporan: ' + (R.pemicuMingguan ? '<b>setiap Senin 07.00</b>' : '<b style="color:var(--red,#a82424)">belum dipasang</b>') + ' ke <b>' + esc(R.penerima || '(belum ada penerima)') + '</b>' + (R.kirimTerakhir ? '. Terakhir: ' + esc(R.kirimTerakhir) : '') + '.</div>';
    if (sel.total) h += '<div style="margin:6px 0 10px"><div style="display:flex;justify-content:space-between;font-size:13px"><span>Ukuran spreadsheet</span><b style="color:' + warna + '">' + String(pc).replace('.', ',') + '% (' + n(sel.total) + ' dari ' + n(sel.batas) + ' sel)</b></div>' +
      '<div style="height:10px;background:var(--line,#dde4ea);border-radius:5px;overflow:hidden;margin-top:3px"><div style="width:' + Math.min(100, pc) + '%;height:100%;background:' + warna + '"></div></div></div>';
    h += '<div class="kshat">' + (R.butir || []).map(function (b) {
      return '<div style="border-top:1px solid var(--line,#dde4ea);padding:7px 0;display:flex;gap:10px;align-items:flex-start"><span class="bd ' + W[b.tingkat][0] + '" style="flex:none;min-width:96px;text-align:center">' + W[b.tingkat][1] + '</span><div style="min-width:0"><b>' + esc(b.judul) + '</b> <small class="note" style="margin:0">' + esc(b.grup) + '</small>' +
        (b.rinci ? '<div style="font-size:13px">' + esc(b.rinci) + '</div>' : '') + (b.saran ? '<div style="font-size:13px;color:var(--blu,#17588f)">Langkah: ' + esc(b.saran) + '</div>' : '') + tombolAksi(b.aksi) + '</div></div>';
    }).join('') + '</div>';
    var det = '';
    var bsr = '';   // T167: sheet terbesar + mana yang aman dirapikan
    if (sel.top && sel.top.length) bsr = '<details style="margin-top:8px"><summary style="cursor:pointer;font-weight:600">Sheet terbesar dan yang aman dirapikan (' + sel.top.length + ')</summary><div class="note" style="margin:6px 0">Google menghitung semua sel yang <b>disediakan</b> (baris &times; kolom), termasuk baris kosong. <b>Baris kosong</b> aman dihapus kapan saja. Sheet <b>log</b> (catatan kecepatan, error, bot) aman dipangkas. Sheet <b>data</b> hanya diarsipkan untuk data lama dan setelah membuat cadangan.</div><div class="tw"><table><thead><tr><th>Sheet</th><th class="nm">Sel</th><th class="nm">Baris berisi</th><th class="nm">Baris kosong</th><th>Jenis</th><th></th></tr></thead><tbody>' + sel.top.map(function (x) {
      var ks = x.kosong != null ? x.kosong : Math.max(0, x.barisSedia - x.baris);
      return '<tr><td data-l="Sheet"><b>' + esc(x.sheet) + '</b></td><td class="nm" data-l="Sel">' + n(x.sel) + '</td><td class="nm" data-l="Baris berisi">' + n(x.baris) + '</td><td class="nm" data-l="Baris kosong">' + n(ks) + '</td><td data-l="Jenis">' + (x.log ? 'log, aman dipangkas' : 'data') + '</td><td>' + (ks > 1000 ? tombolAksi([{id: 'kosong:' + x.sheet, label: 'Hapus baris kosong', ubah: 1}]) : '') + '</td></tr>';
    }).join('') + '</tbody></table></div></details>';
    if (A.accurate && A.accurate.length) det += '<b>Unggahan data Accurate terakhir</b><ul style="margin:4px 0 8px 18px;padding:0">' + A.accurate.map(function (x) { return '<li>' + esc(x.jenis) + ': ' + (x.waktu ? esc(x.waktu) + ' (' + x.hari + ' hari lalu)' : '<span class="note" style="margin:0">belum tercatat</span>') + '</li>'; }).join('') + '</ul>';
    if (A.pemicu) det += '<b>Pemicu otomatis (' + A.pemicu.jumlah + ' dari batas ' + A.pemicu.batas + ')</b><ul style="margin:4px 0 8px 18px;padding:0">' + A.pemicu.daftar.map(function (p) { return '<li>' + esc(p.fungsi) + ': ' + (p.n ? '<b style="color:var(--grn,#14602f)">terpasang' + (p.n > 1 ? ' ' + p.n + ' kali' : '') + '</b>' : (p.penting ? '<b style="color:var(--red,#a82424)">belum</b>' : 'tidak dipasang')) + ' <small class="note" style="margin:0">' + esc(p.ket) + (p.n ? '' : '; pasang: jalankan ' + esc(p.pasang) + ' di editor') + '</small></li>'; }).join('') + '</ul>';
    if (A.galat && A.galat.terbaru && A.galat.terbaru.length) det += '<b>Error terbaru (' + A.galat.n + ' dalam ' + A.galat.hari + ' hari)</b><div class="tw"><table><thead><tr><th>Waktu</th><th>Jenis</th><th>Aksi</th><th>Pesan</th><th>Versi</th></tr></thead><tbody>' + A.galat.terbaru.slice(0, 10).map(function (g) { return '<tr><td data-l="Waktu">' + esc(g.waktu) + '</td><td data-l="Jenis">' + esc(g.jenis) + '</td><td data-l="Aksi">' + esc(g.aksi) + '</td><td data-l="Pesan">' + esc(g.pesan) + '</td><td data-l="Versi">' + esc(g.versi) + '</td></tr>'; }).join('') + '</tbody></table></div><div class="note" style="margin:2px 0 8px">Tanyakan "kenapa error tadi" di Tanya Gudang (admin) untuk penjelasan dan langkahnya.</div>';
    if (A.lambat && A.lambat.length) det += '<b>Proses terberat 7 hari, waktu server (batas Google 360 detik)</b><ul style="margin:4px 0 8px 18px;padding:0">' + A.lambat.map(function (x) { return '<li>' + esc(x.aksi) + ': paling lama ' + Math.round(x.ms / 1000) + ' detik' + (x.biasa != null ? ', biasanya ' + Math.round(x.biasa / 1000) + ' detik' : '') + (x.n ? ' (' + n(x.n) + ' permintaan' + (x.lambat ? ', ' + x.lambat + ' kali di atas 180 detik' : '') + ')' : '') + '</li>'; }).join('') + '</ul>';
    h += bsr;
    if (det) h += '<details style="margin-top:8px"><summary style="cursor:pointer;font-weight:600">Rincian angka</summary><div style="margin-top:6px">' + det + '</div></details>';
    h += '<div class="fr" style="margin-top:10px"><button class="gh" id="ksUlang">Periksa ulang</button><button class="gh" id="ksKirim">Kirim email sekarang</button>' + (R.pemicuMingguan ? '' : '<button class="sv" id="ksPasang">Pasang email mingguan</button>') + '</div>' +
      '<div class="note" style="margin:6px 0 0">Penerima: email Staff Gudang di sheet Pengguna, atau isi kunci <b>Email Kesehatan</b> di sheet Pengaturan. Peringatan BAHAYA juga dikirim dari pemicu harian (paling sering sekali per 3 hari).</div>';
    el.innerHTML = h;
    function tombol(id, aksi, sesudah) { var b = document.getElementById(id); if (!b) return; b.onclick = async function () { b.disabled = true; try { var x = await api({action: aksi}); toast(x.msg || (x.ok ? 'Selesai.' : 'Gagal.'), !x.ok); if (x.ok && sesudah) muat(el, api, toast); } catch (e) { toast('Gagal terhubung ke server.', true); } b.disabled = false; }; }
    var u = document.getElementById('ksUlang'); if (u) u.onclick = function () { muat(el, api, toast); };
    tombol('ksKirim', 'adminKesehatanKirim', true); tombol('ksPasang', 'adminKesehatanPemicu', true);
    el.querySelectorAll('[data-ksak]').forEach(function (b) { b.onclick = function () { jalankanAksi(b, el, api, toast); }; });
  }
  async function muat(el, api, toast, info) {
    if (!el) return;
    el.innerHTML = '<h3 style="margin-top:0">Kesehatan sistem</h3><div class="note">Memeriksa sistem (biasanya 10-30 detik)...</div>';
    try {
      var R = await api({action: 'adminKesehatanPeriksa'});
      if (!R || !R.ok) { el.innerHTML = '<h3 style="margin-top:0">Kesehatan sistem</h3><div class="note">' + esc((R && R.msg) || 'Gagal memeriksa.') + (R && /tidak dikenal|unknown/i.test(R.msg || '') ? ' Pasang Code.gs versi T165 lalu Deploy versi baru.' : '') + '</div>'; return; }
      isi(el, R, api, toast, info);
    } catch (e) { el.innerHTML = '<h3 style="margin-top:0">Kesehatan sistem</h3><div class="note">Gagal terhubung ke server.</div>'; }
  }
  root.KSH = {muat: muat};
})(typeof window !== 'undefined' ? window : this);
