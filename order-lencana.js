/* Tambahan 131 (Paket G tahap A): lencana "sedang diorder" yang seragam di semua tab admin.
   Satu peta pesanan per barang dari server (aksi adminOrderPetaBaca): order proyek (barang bertanda ORDER / dipesan untuk PPBJ proyek)
   dan order buffer (PPBJ berketerangan "buffer stock"). Pesanan lengkap datang / batal tidak tampil.
   Pemakaian di tab: OL.html(kode) di samping nama barang. Tempat kosong diisi otomatis begitu peta selesai dimuat.
   Klik lencana membuka rincian semua pesanan barang itu. Hanya keterangan: stok, kebutuhan, dan kekurangan tidak berubah. */
(function (root) {
  'use strict';
  var KS = 'sctk_ol_peta_v1', UMUR = 10 * 60 * 1000;
  var OL = {peta: null, waktu: 0, api: null, memuat: null};
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
  function kunci(k) { return String(k == null ? '' : k).trim().toUpperCase(); }
  function nf(n) { return (Math.round((Number(n) || 0) * 1000) / 1000).toLocaleString('id-ID'); }
  var BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  function tgl(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? Number(m[3]) + ' ' + BLN[Number(m[2]) - 1] : ''; }
  function poPendek(po) { var a = String(po || '').split(',')[0].trim(); var m = /^(\d{1,4})\s*\//.exec(a); return m ? m[1] : a; }
  function gaya() {
    if (document.getElementById('olGaya')) return;
    var st = document.createElement('style'); st.id = 'olGaya';
    st.textContent = '.ol-w:empty{display:none}.ol-b{display:inline-block;margin:2px 0 0 4px;padding:1px 8px;border-radius:10px;font:600 11px/1.5 "Segoe UI",Roboto,Arial,sans-serif;cursor:pointer;border:1px solid transparent;white-space:normal;text-align:left;vertical-align:middle;max-width:100%}' +
      '.ol-b:hover,.ol-b:focus{outline:2px solid var(--accent,#1b6ca8);outline-offset:1px}.ol-BELUM{background:#fff3cd;color:#6b4e00;border-color:#e6c76a}.ol-DIPESAN{background:#e3f0fb;color:#0d4a7a;border-color:#9cc6ea}.ol-SEBAGIAN{background:#fde8d4;color:#7a3a00;border-color:#efb27a}' +
      '.ol-bg{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:12px}.ol-md{background:var(--card,#fff);color:var(--ink,#1b2a33);border-radius:12px;max-width:1100px;width:100%;max-height:88vh;overflow:auto;padding:16px;box-shadow:0 10px 40px rgba(0,0,0,.3)}' +
      '.ol-md table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}.ol-md th,.ol-md td{border-bottom:1px solid var(--line,#ccd);padding:6px;text-align:left;vertical-align:top;background:transparent!important;color:inherit;white-space:normal;word-break:break-word}.ol-md th{font-size:12px;opacity:.8}.ol-md td.n,.ol-md th.n{text-align:right;white-space:nowrap}' +
      '@media (max-width:700px){.ol-md thead{display:none}.ol-md tr{display:block;border:1px solid var(--line,#ccd);border-radius:8px;margin:6px 0;padding:4px}.ol-md td{display:block;border:0;padding:2px 4px;text-align:left!important}.ol-md td[data-l]:before{content:attr(data-l) ": ";font-weight:600;font-size:11px;opacity:.75}}' +
      '@media print{.ol-w{display:none!important}}';
    document.head.appendChild(st);
  }
  /** Teks satu pesanan, mis. "Order proyek · PPBJ 0123 · PO 114 · tiba ±20 Nov". */
  function teks(o) {
    var t = (o.jenis === 'buffer' ? 'Order buffer' : 'Order proyek') + ' · PPBJ ' + o.ppbj;
    if (o.st === 'BELUM') t += o.peringatan ? ' · belum ada PO (lama)' : ' · belum ada PO';
    else if (o.st === 'SEBAGIAN') t += ' · datang ' + nf(o.diterima) + ' dari ' + nf(o.rab || o.dipesan);
    else t += o.po ? ' · PO ' + poPendek(o.po) : ' · sudah dipesan';
    if (o.eta) t += ' · tiba ±' + tgl(o.eta);
    return t;
  }
  function daftar(kode) { return OL.peta ? (OL.peta[kunci(kode)] || []) : []; }
  /** Isi HTML lencana (tanpa pembungkus). '' bila tidak ada pesanan berjalan. */
  OL.lencana = function (kode) {
    var L = daftar(kode); if (!L.length) return '';
    var o = L[0], t = teks(o), akan = L.reduce(function (a, x) { return a + (Number(x.akan) || 0); }, 0);
    if (L.length > 1) t += ' · +' + (L.length - 1) + ' PPBJ lain · akan datang ' + nf(akan);
    var judul = L.map(teks).join('\n') + '\nKlik untuk rincian.';
    return '<button type="button" class="ol-b ol-' + esc(o.st) + '" data-olb="' + esc(kunci(kode)) + '" title="' + esc(judul) + '">' + esc(t) + '</button>';
  };
  /** Tempat lencana di samping nama barang. Terisi otomatis setelah peta dimuat. */
  OL.html = function (kode) {
    if (!kode) return '';
    return '<span class="ol-w" data-olk="' + esc(kunci(kode)) + '">' + (OL.peta ? OL.lencana(kode) : '') + '</span>';
  };
  /** Isi ulang semua tempat lencana di dalam el (bawaan: seluruh halaman). */
  OL.isi = function (el) {
    if (!OL.peta) return;
    (el || document).querySelectorAll('[data-olk]').forEach(function (s) { var h = OL.lencana(s.getAttribute('data-olk')); if (s.innerHTML !== h) s.innerHTML = h; });
  };
  function simpan() { try { localStorage.setItem(KS, JSON.stringify({t: OL.waktu, peta: OL.peta})); } catch (e) {} }
  function baca() { try { var o = JSON.parse(localStorage.getItem(KS) || 'null'); if (o && o.peta) { OL.peta = o.peta; OL.waktu = o.t || 0; return true; } } catch (e) {} return false; }
  /** Muat peta: pakai simpanan di browser lalu perbarui dari server bila lebih dari 10 menit (atau paksa). */
  OL.muat = function (api, paksa) {
    if (api) OL.api = api; gaya();
    if (!OL.peta) baca();
    if (OL.peta) OL.isi();
    if (!paksa && OL.peta && Date.now() - OL.waktu < UMUR) return Promise.resolve(OL.peta);
    if (OL.memuat) return OL.memuat;
    if (!OL.api) return Promise.resolve(OL.peta);
    OL.memuat = Promise.resolve(OL.api({action: 'adminOrderPetaBaca'})).then(function (r) {
      OL.memuat = null;
      if (r && r.ok && r.peta) { OL.peta = r.peta; OL.waktu = Date.now(); simpan(); OL.isi(); }
      return OL.peta;
    }).catch(function () { OL.memuat = null; return OL.peta; });
    return OL.memuat;
  };
  /** Dipanggil setelah status order / pembelian / penerimaan berubah. */
  OL.segarkan = function () { OL.waktu = 0; return OL.muat(null, true); };
  OL.sesudahApi = function (aksi, j) {
    if (!aksi || !j || !j.ok) return;
    if (/^(adminOrder(StatusSimpan|Buat|Terima)|adminProyekSimpan|kbSimpan|adminKbx|adminTerima|tb(Catat|Simpan|Batal)|adminPb|adminPo|adminPembelian|adminPenerimaan|penerimaan)/i.test(aksi) && !/(List|Baca|Cari|Daftar|Rinci)$/.test(aksi)) setTimeout(OL.segarkan, 300);
  };
  /** Rincian semua pesanan satu barang. */
  OL.buka = function (kode, nama) {
    gaya(); var L = daftar(kode); if (!L.length) return;
    var bg = document.createElement('div'); bg.className = 'ol-bg';
    var akan = L.reduce(function (a, x) { return a + (Number(x.akan) || 0); }, 0);
    bg.innerHTML = '<div class="ol-md" role="dialog" aria-modal="true" aria-label="Rincian pesanan"><div style="display:flex;gap:8px;align-items:flex-start"><div style="flex:1"><b>Sedang diorder: ' + esc(nama || kode) + '</b><br><small>' + esc(kode) + ' &middot; ' + L.length + ' pesanan berjalan &middot; akan datang ' + nf(akan) + '</small></div><button type="button" class="gh" data-olx="1">Tutup</button></div>' +
      '<table><thead><tr><th>Jenis</th><th>PPBJ / proyek</th><th>Status</th><th class="n">Di PPBJ</th><th class="n">Dipesan</th><th class="n">Datang</th><th class="n">Akan datang</th><th>PO / supplier</th><th>Perkiraan tiba</th></tr></thead><tbody>' +
      L.map(function (o) {
        return '<tr><td data-l="Jenis">' + (o.jenis === 'buffer' ? 'Order buffer' : 'Order proyek') + '</td><td data-l="PPBJ"><b>' + esc(o.ppbj) + '</b>' + (o.ket ? '<br><small>' + esc(o.ket) + '</small>' : '') + (root.cepatCari ? '<br><a href="#" data-olt="' + esc(o.ppbj) + '">Telusur PPBJ</a>' : '') + '</td>' +
          '<td data-l="Status"><span class="ol-b ol-' + esc(o.st) + '" style="cursor:default">' + esc(o.label) + '</span>' + (o.peringatan ? '<br><small>ditandai ORDER lebih dari batas hari tanpa PO</small>' : '') + (o.sumber === 'manual' ? '<br><small>status diubah manual</small>' : '') + '</td>' +
          '<td class="n" data-l="Di PPBJ">' + (o.rab ? nf(o.rab) : '-') + '</td><td class="n" data-l="Dipesan">' + nf(o.dipesan) + '</td><td class="n" data-l="Datang">' + nf(o.diterima) + '</td><td class="n" data-l="Akan datang"><b>' + nf(o.akan) + '</b></td>' +
          '<td data-l="PO">' + esc(o.po || '-') + (o.supplier ? '<br><small>' + esc(o.supplier) + '</small>' : '') + '</td><td data-l="Tiba">' + esc(o.eta ? tgl(o.eta) + ' ' + String(o.eta).slice(0, 4) : '-') + '</td></tr>';
      }).join('') + '</tbody></table><div class="note" style="margin-top:8px">Order proyek = barang bertanda ORDER atau dipesan untuk PPBJ proyek. Order buffer = PPBJ berketerangan "buffer stock". Status order bisa diubah di tab Proyek (Status order) atau Monitor ORDER. Data diperbarui otomatis tiap 10 menit' + (OL.waktu ? ' (terakhir ' + new Date(OL.waktu).toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit'}) + ')' : '') + '. <a href="#" data-olr="1">Perbarui sekarang</a></div></div>';
    document.body.appendChild(bg);
    function tutup() { bg.remove(); document.removeEventListener('keydown', esk); }
    function esk(e) { if (e.key === 'Escape') tutup(); }
    document.addEventListener('keydown', esk);
    bg.addEventListener('click', function (e) {
      if (e.target === bg || e.target.closest('[data-olx]')) { tutup(); return; }
      var t = e.target.closest('[data-olt]'); if (t) { e.preventDefault(); tutup(); root.cepatCari(t.getAttribute('data-olt')); return; }
      var r = e.target.closest('[data-olr]'); if (r) { e.preventDefault(); r.textContent = 'memperbarui...'; OL.segarkan().then(function () { tutup(); if (daftar(kode).length) OL.buka(kode, nama); }); }
    });
    var b = bg.querySelector('[data-olx]'); if (b) b.focus();
  };
  // Klik lencana di mana pun: buka rincian. Ambil nama barang dari baris terdekat bila ada.
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-olb]'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    var row = b.closest('tr,.card,li,div'), nm = '';
    if (row) { var bb = row.querySelector('b'); if (bb && !bb.closest('[data-olb]')) nm = bb.textContent.replace(/^\d+\.\s*/, ''); }
    OL.buka(b.getAttribute('data-olb'), nm);
  }, true);
  // Tempat lencana yang baru digambar (tab dibuka / tabel diperbarui) langsung diisi.
  var tm = null;
  function amati() {
    if (!root.MutationObserver || !document.body) return;
    new MutationObserver(function () { if (!OL.peta) return; clearTimeout(tm); tm = setTimeout(function () { document.querySelectorAll('[data-olk]:empty').forEach(function (s) { var h = OL.lencana(s.getAttribute('data-olk')); if (h) s.innerHTML = h; }); }, 60); }).observe(document.body, {childList: true, subtree: true});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', amati); else amati();
  root.OL = OL;
  root.OLH = function (kode) { return root.OL ? root.OL.html(kode) : ''; };
})(window);
