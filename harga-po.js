/* Impor harga dari PDF "Purchase Order Detail" Accurate (Tambahan 98). Khusus admin, tab Stok & Harga.
   parse() dan ringkas() murni (bisa diuji tanpa browser). Tidak ada yang tersimpan sebelum admin menekan Terapkan. */
(function (root) {
  'use strict';
  var HP = {};
  var BULAN = {Jan: 1, Feb: 2, Mar: 3, Apr: 4, Mei: 5, Jun: 6, Jul: 7, Agt: 8, Agu: 8, Sep: 9, Okt: 10, Nov: 11, Des: 12};
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
  function rp(n) { return n == null || n === '' ? '-' : 'Rp ' + Number(n).toLocaleString('id-ID', {maximumFractionDigits: 2}); }
  /** "1.538.461,5" -> 1538461.5 ; "4.591" -> 4591 ; "27,5" -> 27.5 */
  function angka(t) {
    t = String(t == null ? '' : t).trim(); if (!/^-?[\d.,]+$/.test(t) || !/\d/.test(t)) return null;
    var n = Number(t.replace(/\./g, '').replace(',', '.')); return isFinite(n) ? n : null;
  }
  var RE_TGL = /^(\d{1,2}) ([A-Za-z]{3}) (\d{4})$/;
  function iso(t) { var m = RE_TGL.exec(t); if (!m || !BULAN[m[2]]) return ''; return m[3] + '-' + (BULAN[m[2]] < 10 ? '0' : '') + BULAN[m[2]] + '-' + (m[1].length < 2 ? '0' : '') + m[1]; }
  function kolom(i) {   // satu sel = satu potongan teks; kolom ditentukan dari tepi kiri/kanannya
    var x = i.x, r = i.x + (i.w || 0);
    if (x < 130) return 'kode';
    if (x < 262) return 'nama';
    if (r <= 321) return 'qty';
    if (r <= 401) return 'harga';
    if (r <= 494) return 'total';
    if (x < 637) return 'nomor';
    if (x < 716) return 'tgl';
    return 'vendor';
  }
  var FOOT = /^(ACCURATE Accounting|Tercetak pada|Halaman \d)/i;
  /** pages = [{w,h,items:[{s,x,y,w,h}]}] dari pdf.js. Hasil {rows:[{kode,nama,qty,harga,total,nomor,tgl,iso,vendor,idx}], nBaris, periode, warn} atau {err}. */
  function parse(pages) {
    if (!pages || !pages.length) return {err: 'PDF kosong.'};
    var all = [], off = 0, judul = {}, periode = '';
    pages.forEach(function (pg) {
      (pg.items || []).forEach(function (i) {
        var s = String(i.s == null ? '' : i.s).trim(); if (!s) return;
        if (/^(Code#|Item Name|Quantity|@Price|Total Price|Number|Date|Supplier)$/.test(s)) judul[s] = true;
        var m = /Dari\s+(.+?)\s+s\/d\s+(.+)$/i.exec(s); if (m && !periode) periode = m[1] + ' s/d ' + m[2];
        all.push({s: s, x: i.x, y: i.y + off, w: i.w || 0});
      });
      off += pg.h || 0;
    });
    if (!judul['Code#'] || !judul['@Price'] || !judul['Supplier'] || !judul['Number']) return {err: 'Format PDF tidak dikenali: judul Code#, @Price, Number, Supplier tidak ditemukan. Pastikan ini PDF "Purchase Order Detail" dari Accurate.'};
    all = all.filter(function (i) { return !FOOT.test(i.s); });
    all.sort(function (a, b) { return a.y - b.y || a.x - b.x; });
    var lines = [], cur = null;
    all.forEach(function (i) { if (!cur || i.y - cur.y > 3) { cur = {y: i.y, it: []}; lines.push(cur); } cur.it.push(i); });
    var rows = [], c = null, warn = [], grupTgl = '', ahli = false;
    lines.forEach(function (ln) {
      var d = {}, n = 0;
      ln.it.sort(function (a, b) { return a.x - b.x; }).forEach(function (i) { var k = kolom(i); d[k] = (d[k] ? d[k] + ' ' : '') + i.s; n++; });
      var ks = Object.keys(d);
      if (!ahli) { if (d.kode === 'Code#') ahli = true; return; }                         // lewati kepala laporan sampai judul kolom
      if (d.kode === 'Code#' || (d.kode && /^Cabang/.test(d.kode))) return;                // judul diulang (jika PDF >1 halaman)
      if (d.tgl && RE_TGL.test(d.tgl) && (d.qty || d.harga || d.total)) {
        c = {kode: d.kode || '', nama: d.nama || '', qty: d.qty || '', harga: d.harga || '', total: d.total || '', nomor: d.nomor || '', tgl: d.tgl, vendor: d.vendor || ''};
        rows.push(c); return;
      }
      if (ks.length === 1 && ks[0] === 'kode' && RE_TGL.test(d.kode)) { grupTgl = d.kode; c = null; return; }
      if (ks.length === 1 && ks[0] === 'kode' && /^\d{2,3}\/[A-Za-z0-9 .\-\/]*\d{4}[A-Z]?(_\d+)?( &)?$/.test(d.kode)) { c = null; return; }   // judul kelompok: nomor dokumen
      if (ks.length === 2 && d.kode && d.nama && /^_\d+$/.test(d.nama) && /^\d{2,3}\//.test(d.kode)) { c = null; return; }
      if (c) {   // lanjutan baris: kode/nama terpotong, angka terpotong, nomor/vendor tersambung
        c.kode += d.kode || ''; c.nama = (c.nama + ' ' + (d.nama || '')).trim();
        c.qty += d.qty || ''; c.harga += d.harga || ''; c.total += d.total || '';
        if (d.nomor) c.nomor += ' ' + d.nomor; if (d.vendor) c.vendor += ' ' + d.vendor;
      } else if (warn.length < 5) warn.push('Baris tak dikenali dilewati: ' + ks.map(function (k) { return d[k]; }).join(' | ').slice(0, 80));
    });
    var out = [], salah = 0, selisih = 0;
    rows.forEach(function (r, i) {
      var q = angka(r.qty), h = angka(r.harga), t = angka(r.total), tg = iso(r.tgl);
      if (q == null || h == null || t == null || !tg || !r.kode) { salah++; return; }
      var hit = q * h; if (Math.abs(hit - t) > Math.max(1, 0.0005 * Math.abs(t)) + 0.6) selisih++;
      out.push({kode: r.kode.trim(), nama: r.nama.replace(/\s+/g, ' ').trim(), qty: q, harga: h, total: t, nomor: r.nomor.replace(/\s+/g, ' ').trim(), tgl: r.tgl, iso: tg, vendor: r.vendor.replace(/\s+/g, ' ').trim(), idx: out.length});
    });
    if (!out.length) return {err: 'Tidak ada baris pembelian terbaca dari PDF.'};
    if (salah) warn.push(salah + ' baris tidak terbaca angkanya dan dilewati.');
    if (selisih) warn.push(selisih + ' baris Qty x Harga tidak sama dengan Total (biasanya karena diskon); harga tetap memakai @Price.');
    return {rows: out, nBaris: out.length, periode: periode, warn: warn};
  }
  /** Satu entri per kode barang (pembelian TERAKHIR menurut tanggal, seri sama = baris paling bawah) + daftar vendor. */
  function ringkas(rows) {
    var by = {}, vend = {};
    rows.forEach(function (r) {
      var e = by[r.kode] || (by[r.kode] = {kode: r.kode, nama: '', harga: 0, tgl: '', vendor: '', qty: 0, nilai: 0, n: 0, namaLain: {}, _k: ''});
      var k = r.iso + ('00000' + r.idx).slice(-6);
      if (k >= e._k) { e._k = k; e.nama = r.nama; e.harga = r.harga; e.tgl = r.iso; e.vendor = r.vendor; e.nomor = r.nomor; }
      if (r.qty > 0) { e.qty += r.qty; e.nilai += r.total; }
      e.n++; e.namaLain[r.nama] = 1;
      var v = vend[r.vendor] || (vend[r.vendor] = {nama: r.vendor, n: 0, kode: {}, terakhir: ''});
      v.n++; v.kode[r.kode] = 1; if (r.iso > v.terakhir) v.terakhir = r.iso;
    });
    var kode = Object.keys(by).sort().map(function (k) { var e = by[k]; return {kode: e.kode, nama: e.nama, harga: e.harga, tgl: e.tgl, vendor: e.vendor, nomor: e.nomor, qty: Math.round(e.qty * 1000) / 1000, nilai: Math.round(e.nilai * 100) / 100, n: e.n, nNama: Object.keys(e.namaLain).length}; });
    var vendor = Object.keys(vend).map(function (k) { var v = vend[k]; return {nama: v.nama, n: v.n, nKode: Object.keys(v.kode).length, terakhir: v.terakhir}; }).sort(function (a, b) { return b.n - a.n; });
    return {kode: kode, vendor: vendor};
  }
  HP.parse = parse; HP.ringkas = ringkas; HP.angka = angka; HP.iso = iso;

  /* ---------- tampilan (admin.html, tab Stok & Harga) ---------- */
  var JENIS = ['barang', 'jasa', 'lewati'], JL = {barang: 'Barang', jasa: 'Jasa', lewati: 'Lewati'};
  HP.mount = function (box, api, toast, reload) {
    var D = null, R = null;
    box.innerHTML = '<details class="card" style="border-color:var(--gold)"><summary><b>Perbarui harga dari PDF pembelian Accurate</b></summary><div class="note">Unggah PDF <b>Purchase Order Detail</b> dari Accurate. Sistem mengambil pembelian <b>terakhir</b> tiap barang sebagai <b>Harga Terbaru</b>, dan menghitung <b>Harga Rata-rata</b> dari semua pembelian di PDF (hanya diisi sekali; sesudahnya rata-rata dihitung otomatis dari Terima Barang). Pratinjau tampil dulu; tidak ada yang tersimpan sebelum Anda menekan Terapkan. Perubahan lebih dari 20% ditandai merah dan tidak tercentang.</div>' +
      '<div class="fr"><input type="file" id="hpf" accept=".pdf,application/pdf"><span class="note" id="hpn"></span></div><div id="hpo"></div></details>';
    var out = box.querySelector('#hpo'), info = box.querySelector('#hpn');
    box.querySelector('#hpf').onchange = async function () {
      var f = this.files[0]; if (!f) return; out.innerHTML = ''; info.textContent = 'Membaca PDF...';
      try {
        var K = root.KBI; var L = await K.muatPdfjs(); var buf = await K.bacaBuf(f); var pages = await K.pdfKeHalaman(L, buf);
        var o = parse(pages); if (o.err) { info.textContent = ''; toast(o.err, true); return; }
        R = ringkas(o.rows); o.R = R;
        info.textContent = o.nBaris + ' baris pembelian, ' + R.kode.length + ' kode, ' + R.vendor.length + ' vendor dibaca.' + (o.periode ? ' Periode ' + o.periode + '.' : '');
        var r = await api({action: 'adminHargaPoCek', kode: R.kode, vendor: R.vendor});
        if (!r.ok) { toast(r.msg || 'Gagal.', true); return; }
        D = r; tampil(o);
      } catch (e) { info.textContent = ''; toast('PDF gagal dibaca: ' + (e && e.message ? e.message : e), true); }
    };
    function tampil(o) {
      var rows = D.rows || [], s = D.ring || {};
      var h = '<div class="sum"><div><b>' + (s.barang || 0) + '</b><span>Barang</span></div><div><b>' + (s.jasa || 0) + '</b><span>Jasa</span></div><div><b>' + (s.lewati || 0) + '</b><span>Perlu ditentukan</span></div><div><b>' + (s.merah || 0) + '</b><span>Beda &gt; 20%</span></div></div>' +
        (o.warn && o.warn.length ? '<div class="note">' + o.warn.map(esc).join(' ') + '</div>' : '') +
        '<div class="note">Kolom <b>Jenis</b> bisa diubah per baris. <b>Barang</b> hanya bisa dipilih untuk kode yang sudah ada di Master Barang. <b>Lewati</b> tidak mengubah apa pun dan diingat untuk bulan depan. Pilihan Jasa juga diingat.</div>' +
        '<div class="fr"><input id="hpq" placeholder="Cari kode atau nama..." style="min-width:200px"><select id="hpj"><option value="">Semua jenis</option><option value="barang">Barang</option><option value="jasa">Jasa</option><option value="lewati">Lewati</option><option value="merah">Beda &gt; 20%</option></select></div>' +
        '<table><thead><tr><th></th><th>Kode</th><th>Nama</th><th>Jenis</th><th class="nm">Harga sekarang</th><th class="nm">Harga terbaru</th><th class="nm">Selisih</th><th class="nm">Rata-rata</th><th>Vendor terakhir</th><th>Catatan</th></tr></thead><tbody id="hpb">' + rows.map(function (x, i) {
          return '<tr data-i="' + i + '"' + (x.merah ? ' style="background:rgba(192,57,43,.12)"' : '') + '><td><input type="checkbox" data-c="' + i + '"' + (x.cek ? ' checked' : '') + '></td><td data-l="Kode">' + esc(x.kode) + '</td><td data-l="Nama">' + esc(x.nama) + '</td><td data-l="Jenis"><select data-j="' + i + '">' + JENIS.map(function (j) { return '<option value="' + j + '"' + (x.jenis === j ? ' selected' : '') + (j === 'barang' && !x.master ? ' disabled' : '') + '>' + JL[j] + '</option>'; }).join('') + '</select></td><td class="nm" data-l="Sekarang">' + rp(x.lama) + '</td><td class="nm" data-l="Baru"><b>' + rp(x.baru) + '</b></td><td class="nm" data-l="Selisih"' + (x.merah ? ' style="color:var(--red,#c0392b)"' : '') + '>' + (x.persen == null ? 'baru diisi' : (x.persen > 0 ? '+' : '') + x.persen.toFixed(1) + '%') + '</td><td class="nm" data-l="Rata-rata">' + (x.rataBaru ? rp(x.rataBaru) : '-') + (x.rataTetap ? ' <small>(tetap)</small>' : '') + '</td><td data-l="Vendor">' + esc(x.vendor) + '</td><td data-l="Catatan"><small>' + esc((x.catatan || []).join('; ')) + '</small></td></tr>';
        }).join('') + '</tbody></table>' +
        '<b>Vendor</b><div class="note">Vendor baru masuk ke tab Vendor (nama saja; telepon dan alamat diisi nanti). Vendor yang sudah ada tidak diubah. Nama perorangan, PIC, media, dan pekerja harian tidak tercentang; centang sendiri bila memang vendor.</div>' +
        '<table><thead><tr><th></th><th>Nama</th><th class="nm">Baris</th><th class="nm">Barang</th><th>Terakhir</th><th>Catatan</th></tr></thead><tbody id="hpv">' + (D.ven || []).map(function (v, i) {
          return '<tr><td><input type="checkbox" data-v="' + i + '"' + (v.cek ? ' checked' : '') + (v.ada ? ' disabled' : '') + '></td><td data-l="Nama">' + esc(v.nama) + '</td><td class="nm" data-l="Baris">' + v.n + '</td><td class="nm" data-l="Barang">' + v.nKode + '</td><td data-l="Terakhir">' + esc(v.terakhir) + '</td><td data-l="Catatan"><small>' + (v.ada ? 'sudah ada di tab Vendor' : (v.orang ? 'perorangan / bukan vendor?' : '')) + '</small></td></tr>';
        }).join('') + '</tbody></table>' +
        '<div class="bar"><button class="sv" id="hpgo">Terapkan yang tercentang</button></div>';
      out.innerHTML = h;
      var tb = out.querySelector('#hpb');
      function saring() {
        var q = out.querySelector('#hpq').value.trim().toLowerCase(), j = out.querySelector('#hpj').value;
        tb.querySelectorAll('tr').forEach(function (tr) {
          var x = rows[Number(tr.getAttribute('data-i'))], teks = (x.kode + ' ' + x.nama).toLowerCase();
          var okJ = !j || (j === 'merah' ? x.merah : x.jenis === j);
          tr.style.display = (!q || teks.indexOf(q) >= 0) && okJ ? '' : 'none';
        });
      }
      out.querySelector('#hpq').oninput = saring; out.querySelector('#hpj').onchange = saring;
      tb.onchange = function (e) {
        var t = e.target, i = t.getAttribute('data-j');
        if (i != null) { rows[Number(i)].jenis = t.value; var cb = tb.querySelector('[data-c="' + i + '"]'); if (cb) cb.checked = t.value !== 'lewati' && !rows[Number(i)].merah; }
      };
      out.querySelector('#hpgo').onclick = async function () {
        var pil = [], b = this;
        tb.querySelectorAll('[data-c]').forEach(function (c) {
          var x = rows[Number(c.getAttribute('data-c'))];
          if (c.checked || x.jenis === 'lewati') pil.push({kode: x.kode, nama: x.nama, jenis: x.jenis, harga: x.baru, tgl: x.tgl, vendor: x.vendor, qty: x.qty, nilai: x.nilai, pilih: c.checked});
        });
        var vpil = []; out.querySelectorAll('[data-v]:checked').forEach(function (c) { var v = (D.ven || [])[Number(c.getAttribute('data-v'))]; if (v) vpil.push({nama: v.nama, n: v.n, terakhir: v.terakhir}); });
        var nTerap = pil.filter(function (x) { return x.pilih && x.jenis !== 'lewati'; }).length;
        if (!pil.length && !vpil.length) { toast('Tidak ada yang tercentang.', true); return; }
        if (!confirm('Terapkan ' + nTerap + ' harga dan ' + vpil.length + ' vendor baru dari PDF pembelian Accurate?')) return;
        b.disabled = true; var r = await api({action: 'adminHargaPoTerapkan', pilih: pil, vendor: vpil, periode: o.periode || ''}); b.disabled = false;
        toast(r.msg || (r.ok ? 'Tersimpan.' : 'Gagal.'), !r.ok); if (r.ok && reload) reload();
      };
    }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = HP; else root.HP = HP;
})(typeof window !== 'undefined' ? window : globalThis);
