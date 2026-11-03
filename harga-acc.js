/* Perbarui harga stok dari PDF "Daftar Barang dan Jasa" Accurate (Tambahan 29, Paket B). Khusus admin, di tab Stok & Harga.
   parse() murni (bisa diuji tanpa browser). Tidak ada yang tersimpan sebelum admin menekan Terapkan. */
(function (root) {
  'use strict';
  var HX = {};
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
  function rp(n) { return n == null ? '-' : 'Rp ' + Number(n).toLocaleString('id-ID', {maximumFractionDigits: 2}); }
  /** "20.833,33" -> 20833.33 ; "30.000" -> 30000 ; "283.105,5" -> 283105.5 ; "0" -> 0 */
  function angka(t) {
    t = String(t || '').trim(); if (!/\d/.test(t)) return null;
    t = t.replace(/[^\d.,-]/g, '');
    if (t.indexOf(',') >= 0) t = t.replace(/\./g, '').replace(',', '.'); else if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
    var n = Number(t); return isFinite(n) ? n : null;
  }
  /** pages = [{w,h,items:[{s,x,y,w,h}]}] dari pdf.js. Hasil {rows:[{kategori,kode,nama,qty,harga,total}], nBaris, tanggal, warn:[]} atau {err}. */
  function parse(pages) {
    if (!pages || !pages.length) return {err: 'PDF kosong.'};
    var warn = [], rows = [], tanggal = '';
    var kol = null;
    var P = pages.map(function (pg) { return (pg.items || []).filter(function (i) { return String(i.s).trim(); }).map(function (i) { return {s: String(i.s).trim(), x: i.x, y: i.y, w: i.w || 0}; }); });
    // judul kolom: cari "Kode Barang", "Nama Barang", "Kts", "Nilai Satuan", "Nilai Total"
    P.forEach(function (it) {
      if (kol) return;
      var f = function (re) { return it.filter(function (i) { return re.test(i.s); })[0]; };
      var kk = f(/^Kode\s*Barang$/i), nn = f(/^Nama\s*Barang$/i), q = f(/^Kts$/i), sa = f(/^Nilai\s*Satuan$/i), tt = f(/^Nilai\s*Total$/i), ka = f(/^Kategori/i);
      if (kk && nn && q && sa && tt) kol = {kategori: ka ? ka.x : kk.x - 150, kode: kk.x, nama: nn.x, cq: q.x + q.w / 2, cs: sa.x + sa.w / 2, ct: tt.x + tt.w / 2};
    });
    if (!kol) return {err: 'Format PDF tidak dikenali: judul Kode Barang, Nama Barang, Kts, Nilai Satuan, Nilai Total tidak ditemukan. Pastikan ini PDF "Daftar Barang dan Jasa" dari Accurate.'};
    var b1 = (kol.cq + kol.cs) / 2, b2 = (kol.cs + kol.ct) / 2, bKode = kol.kode - 8, bNama = kol.nama - 8, bKat = kol.kategori - 8;
    P.forEach(function (it) {
      it.forEach(function (i) { var m = i.s.match(/Per\s*Tgl\.?\s*(.+)$/i); if (m && !tanggal) tanggal = m[1].trim(); });
      // kelompokkan per baris (y)
      var lines = [], cur = null;
      it.slice().sort(function (a, b) { return a.y - b.y || a.x - b.x; }).forEach(function (i) {
        if (!cur || Math.abs(i.y - cur.y) > 2.5) { cur = {y: i.y, it: []}; lines.push(cur); }
        cur.it.push(i);
      });
      var last = null;
      lines.forEach(function (ln) {
        var kat = [], kode = [], nama = [], q = [], s = [], t = [];
        ln.it.forEach(function (i) {
          var re = i.x + i.w;
          if (i.x < bKode) kat.push(i);
          else if (i.x < bNama && re < b1 + 400) kode.push(i);
          else if (/^-?[\d.,]+$/.test(i.s) && re > b1 - 40 && i.x > kol.nama + 120) { if (re < b1) q.push(i); else if (re < b2) s.push(i); else t.push(i); }
          else nama.push(i);
        });
        var j = function (a) { return a.sort(function (x, y) { return x.x - y.x; }).map(function (x) { return x.s; }).join(' '); };
        var txt = j(ln.it.slice());
        if (/^(Kategori Barang|Kode Barang|\(Semua|Gdng\)|Halaman|PT |Daftar Barang|Per Tgl|Cabang)/i.test(txt) || /Kategori Barang.*Kode Barang/.test(txt)) { return; }
        if (!kat.length && !q.length && !s.length && !t.length && !kode.length && !nama.length) return;
        if (kat.length) {
          last = {kategori: j(kat), kode: j(kode).replace(/\s+/g, ''), nama: j(nama), qty: q.length ? angka(j(q)) : null, harga: s.length ? angka(j(s)) : null, total: t.length ? angka(j(t)) : null};
          rows.push(last);
        } else if (last && !q.length && !s.length && !t.length) {
          // lanjutan baris: kode terpotong dan/atau nama bersambung
          if (kode.length) last.kode += j(kode).replace(/\s+/g, '');
          if (nama.length) last.nama += (last.nama ? ' ' : '') + j(nama);
        }
      });
    });
    rows = rows.filter(function (r) { return r.kode && r.nama; });
    var kurang = rows.filter(function (r) { return r.qty == null || r.harga == null; }).length;
    if (kurang) warn.push(kurang + ' baris tidak punya angka Kts/Nilai Satuan terbaca; dianggap tanpa harga.');
    if (!rows.length) return {err: 'Tidak ada baris barang terbaca dari PDF.'};
    return {rows: rows, nBaris: rows.length, tanggal: tanggal, warn: warn};
  }
  HX.parse = parse; HX.angka = angka;

  /* ---------- tampilan (admin.html, tab Stok & Harga) ---------- */
  HX.mount = function (box, api, toast, reload) {
    var D = null;
    box.innerHTML = '<div class="card" style="border-color:var(--gold)"><b>Perbarui harga dari PDF Accurate</b><div class="note">Unggah PDF <b>Daftar Barang dan Jasa</b> dari Accurate. Hanya barang yang punya Kts dan Nilai Satuan lebih dari 0 yang dibaca; yang lain tidak mengubah apa pun. Pratinjau tampil dulu, harga baru tersimpan setelah Anda menekan Terapkan. Perubahan lebih dari 20% ditandai merah dan tidak tercentang.</div>' +
      '<div class="fr"><input type="file" id="hxf" accept=".pdf,application/pdf"><span class="note" id="hxn"></span></div><div id="hxo"></div></div>';
    var out = box.querySelector('#hxo'), info = box.querySelector('#hxn');
    box.querySelector('#hxf').onchange = async function () {
      var f = this.files[0]; if (!f) return; out.innerHTML = ''; info.textContent = 'Membaca PDF...';
      try {
        var K = root.KBI; var L = await K.muatPdfjs(); var buf = await K.bacaBuf(f); var pages = await K.pdfKeHalaman(L, buf);
        var o = parse(pages); if (o.err) { info.textContent = ''; toast(o.err, true); return; }
        var kirim = o.rows.filter(function (r) { return r.qty > 0 && r.harga > 0; }).map(function (r) { return {kode: r.kode, nama: r.nama, kategori: r.kategori, qty: r.qty, harga: r.harga}; });
        info.textContent = o.nBaris + ' baris barang dibaca, ' + kirim.length + ' punya harga.' + (o.tanggal ? ' Per ' + o.tanggal + '.' : '');
        if (!kirim.length) { toast('Tidak ada baris dengan Kts dan harga lebih dari 0.', true); return; }
        var r = await api({action: 'adminHargaAccCek', rows: kirim, total: o.nBaris});
        if (!r.ok) { toast(r.msg || 'Gagal.', true); return; }
        D = r; tampil(o);
      } catch (e) { info.textContent = ''; toast('PDF gagal dibaca: ' + (e && e.message ? e.message : e), true); }
    };
    function tampil(o) {
      var u = D.ubah || [], b = D.baru || [];
      out.innerHTML = '<div class="sum"><div><b>' + u.length + '</b><span>Harga berubah</span></div><div><b>' + b.length + '</b><span>Barang baru</span></div><div><b>' + (D.nSama || 0) + '</b><span>Harga sama</span></div><div><b>' + (D.nMerah || 0) + '</b><span>Beda &gt; 20%</span></div></div>' +
        (o.warn && o.warn.length ? '<div class="note">' + o.warn.map(esc).join(' ') + '</div>' : '') +
        (u.length ? '<b>Harga yang berubah</b><table><thead><tr><th></th><th>Kode</th><th>Nama</th><th class="nm">Harga sekarang</th><th class="nm">Harga baru</th><th class="nm">Selisih</th></tr></thead><tbody>' + u.map(function (x, i) {
          return '<tr' + (x.merah ? ' style="background:rgba(192,57,43,.12)"' : '') + '><td><input type="checkbox" data-u="' + i + '"' + (x.merah ? '' : ' checked') + '></td><td data-l="Kode">' + esc(x.kode) + '</td><td data-l="Nama">' + esc(x.nama) + '</td><td class="nm" data-l="Sekarang">' + rp(x.lama) + '</td><td class="nm" data-l="Baru"><b>' + rp(x.baru) + '</b></td><td class="nm" data-l="Selisih"' + (x.merah ? ' style="color:var(--red,#c0392b)"' : '') + '>' + (x.persen == null ? 'baru diisi' : (x.persen > 0 ? '+' : '') + x.persen.toFixed(1) + '%') + '</td></tr>';
        }).join('') + '</tbody></table>' : '<div class="note">Tidak ada harga yang berubah.</div>') +
        (b.length ? '<b>Kode belum ada di Master Barang</b><div class="note">Akan ditambahkan ke Master Barang dengan satuan <b>PCS</b> sebagai pengisi sementara (PDF tidak memuat satuan). Periksa satuannya nanti di Master Barang.</div><table><thead><tr><th></th><th>Kode</th><th>Nama</th><th>Kategori</th><th class="nm">Harga</th></tr></thead><tbody>' + b.map(function (x, i) {
          return '<tr><td><input type="checkbox" data-b="' + i + '" checked></td><td data-l="Kode">' + esc(x.kode) + '</td><td data-l="Nama">' + esc(x.nama) + '</td><td data-l="Kategori">' + esc(x.kategori) + '</td><td class="nm" data-l="Harga">' + rp(x.harga) + '</td></tr>';
        }).join('') + '</tbody></table>' : '') +
        ((u.length || b.length) ? '<div class="bar"><button class="sv" id="hxgo">Terapkan yang tercentang</button></div>' : '');
      var go = out.querySelector('#hxgo'); if (!go) return;
      go.onclick = async function () {
        var pil = [];
        out.querySelectorAll('[data-u]:checked').forEach(function (c) { var x = u[Number(c.getAttribute('data-u'))]; pil.push({kode: x.kode, nama: x.nama, harga: x.baru}); });
        out.querySelectorAll('[data-b]:checked').forEach(function (c) { var x = b[Number(c.getAttribute('data-b'))]; pil.push({kode: x.kode, nama: x.nama, harga: x.harga, tambah: true}); });
        if (!pil.length) { toast('Tidak ada yang tercentang.', true); return; }
        if (!confirm('Terapkan ' + pil.length + ' harga dari PDF Accurate?')) return;
        go.disabled = true; var r = await api({action: 'adminHargaAccTerapkan', pilih: pil, tanggalPdf: o.tanggal || ''}); go.disabled = false;
        toast(r.msg || (r.ok ? 'Tersimpan.' : 'Gagal.'), !r.ok); if (r.ok && reload) reload();
      };
    }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = HX; else root.HX = HX;
})(typeof window !== 'undefined' ? window : globalThis);
