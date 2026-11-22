/* Tambahan 165: panel Kesehatan sistem di tab Sistem (admin).
   Menampilkan hasil adminKesehatanPeriksa: ukuran spreadsheet terhadap batas Google, kuota email, pemicu otomatis,
   cadangan, sinkron Cari Barang, unggahan Accurate, judul kolom sheet, dan proses terlama.
   Tombol: Periksa ulang, Kirim email sekarang, Pasang email mingguan (Senin 07.00). */
(function (root) {
  'use strict';
  var W = {bahaya: ['b', 'BAHAYA'], perhatian: ['w', 'Perlu perhatian'], info: ['n', 'Info'], sehat: ['d', 'Sehat']};
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
  function n(v) { return (Number(v) || 0).toLocaleString('id-ID'); }
  function isi(el, R, api, toast) {
    var A = R.angka || {}, sel = A.sel || {}, pc = sel.persen || 0, warna = pc >= 90 ? 'var(--red,#a82424)' : pc >= 70 ? 'var(--warn-t,#8a5a00)' : 'var(--grn,#14602f)';
    var h = '<h3 style="margin-top:0">Kesehatan sistem <span class="bd ' + W[R.tingkat][0] + '">' + W[R.tingkat][1] + '</span></h3>' +
      '<div class="note" style="margin:0 0 8px">Diperiksa ' + esc(R.waktu) + '. Email laporan: ' + (R.pemicuMingguan ? '<b>setiap Senin 07.00</b>' : '<b style="color:var(--red,#a82424)">belum dipasang</b>') + ' ke <b>' + esc(R.penerima || '(belum ada penerima)') + '</b>' + (R.kirimTerakhir ? '. Terakhir: ' + esc(R.kirimTerakhir) : '') + '.</div>';
    if (sel.total) h += '<div style="margin:6px 0 10px"><div style="display:flex;justify-content:space-between;font-size:13px"><span>Ukuran spreadsheet</span><b style="color:' + warna + '">' + String(pc).replace('.', ',') + '% (' + n(sel.total) + ' dari ' + n(sel.batas) + ' sel)</b></div>' +
      '<div style="height:10px;background:var(--line,#dde4ea);border-radius:5px;overflow:hidden;margin-top:3px"><div style="width:' + Math.min(100, pc) + '%;height:100%;background:' + warna + '"></div></div></div>';
    h += '<div class="kshat">' + (R.butir || []).map(function (b) {
      return '<div style="border-top:1px solid var(--line,#dde4ea);padding:7px 0;display:flex;gap:10px;align-items:flex-start"><span class="bd ' + W[b.tingkat][0] + '" style="flex:none;min-width:96px;text-align:center">' + W[b.tingkat][1] + '</span><div style="min-width:0"><b>' + esc(b.judul) + '</b> <small class="note" style="margin:0">' + esc(b.grup) + '</small>' +
        (b.rinci ? '<div style="font-size:13px">' + esc(b.rinci) + '</div>' : '') + (b.saran ? '<div style="font-size:13px;color:var(--blu,#17588f)">Langkah: ' + esc(b.saran) + '</div>' : '') + '</div></div>';
    }).join('') + '</div>';
    var det = '';
    if (sel.top && sel.top.length) det += '<b>Sheet terbesar (sel yang dihitung Google)</b><div class="tw"><table><thead><tr><th>Sheet</th><th class="nm">Sel</th><th class="nm">Baris berisi</th><th class="nm">Baris disediakan</th></tr></thead><tbody>' + sel.top.map(function (x) { return '<tr><td data-l="Sheet">' + esc(x.sheet) + '</td><td class="nm" data-l="Sel">' + n(x.sel) + '</td><td class="nm" data-l="Baris berisi">' + n(x.baris) + '</td><td class="nm" data-l="Disediakan">' + n(x.barisSedia) + '</td></tr>'; }).join('') + '</tbody></table></div>';
    if (A.accurate && A.accurate.length) det += '<b>Unggahan data Accurate terakhir</b><ul style="margin:4px 0 8px 18px;padding:0">' + A.accurate.map(function (x) { return '<li>' + esc(x.jenis) + ': ' + (x.waktu ? esc(x.waktu) + ' (' + x.hari + ' hari lalu)' : '<span class="note" style="margin:0">belum tercatat</span>') + '</li>'; }).join('') + '</ul>';
    if (A.pemicu) det += '<b>Pemicu otomatis (' + A.pemicu.jumlah + ' dari batas ' + A.pemicu.batas + ')</b><ul style="margin:4px 0 8px 18px;padding:0">' + A.pemicu.daftar.map(function (p) { return '<li>' + esc(p.fungsi) + ': ' + (p.n ? '<b style="color:var(--grn,#14602f)">terpasang' + (p.n > 1 ? ' ' + p.n + ' kali' : '') + '</b>' : (p.penting ? '<b style="color:var(--red,#a82424)">belum</b>' : 'tidak dipasang')) + ' <small class="note" style="margin:0">' + esc(p.ket) + (p.n ? '' : '; pasang: jalankan ' + esc(p.pasang) + ' di editor') + '</small></li>'; }).join('') + '</ul>';
    if (A.lambat && A.lambat.length) det += '<b>Proses terlama 7 hari (batas Google 360 detik)</b><ul style="margin:4px 0 8px 18px;padding:0">' + A.lambat.map(function (x) { return '<li>' + esc(x.aksi) + ': ' + Math.round(x.ms / 1000) + ' detik</li>'; }).join('') + '</ul>';
    if (det) h += '<details style="margin-top:8px"><summary style="cursor:pointer;font-weight:600">Rincian angka</summary><div style="margin-top:6px">' + det + '</div></details>';
    h += '<div class="fr" style="margin-top:10px"><button class="gh" id="ksUlang">Periksa ulang</button><button class="gh" id="ksKirim">Kirim email sekarang</button>' + (R.pemicuMingguan ? '' : '<button class="sv" id="ksPasang">Pasang email mingguan</button>') + '</div>' +
      '<div class="note" style="margin:6px 0 0">Penerima: email Staff Gudang di sheet Pengguna, atau isi kunci <b>Email Kesehatan</b> di sheet Pengaturan. Peringatan BAHAYA juga dikirim dari pemicu harian (paling sering sekali per 3 hari).</div>';
    el.innerHTML = h;
    function tombol(id, aksi, sesudah) { var b = document.getElementById(id); if (!b) return; b.onclick = async function () { b.disabled = true; try { var x = await api({action: aksi}); toast(x.msg || (x.ok ? 'Selesai.' : 'Gagal.'), !x.ok); if (x.ok && sesudah) muat(el, api, toast); } catch (e) { toast('Gagal terhubung ke server.', true); } b.disabled = false; }; }
    var u = document.getElementById('ksUlang'); if (u) u.onclick = function () { muat(el, api, toast); };
    tombol('ksKirim', 'adminKesehatanKirim', true); tombol('ksPasang', 'adminKesehatanPemicu', true);
  }
  async function muat(el, api, toast) {
    if (!el) return;
    el.innerHTML = '<h3 style="margin-top:0">Kesehatan sistem</h3><div class="note">Memeriksa sistem (sekitar 10-30 detik)...</div>';
    try {
      var R = await api({action: 'adminKesehatanPeriksa'});
      if (!R || !R.ok) { el.innerHTML = '<h3 style="margin-top:0">Kesehatan sistem</h3><div class="note">' + esc((R && R.msg) || 'Gagal memeriksa.') + (R && /tidak dikenal|unknown/i.test(R.msg || '') ? ' Pasang Code.gs versi T165 lalu Deploy versi baru.' : '') + '</div>'; return; }
      isi(el, R, api, toast);
    } catch (e) { el.innerHTML = '<h3 style="margin-top:0">Kesehatan sistem</h3><div class="note">Gagal terhubung ke server.</div>'; }
  }
  root.KSH = {muat: muat};
})(typeof window !== 'undefined' ? window : this);
