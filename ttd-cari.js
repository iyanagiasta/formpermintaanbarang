/* ttd-cari.js (T174): membaca form PPBJ dari teks PDF.
   Masukan: halaman = [{n, w, h, items:[{s, x, y, w}]}] dalam koordinat TAMPILAN (kiri-atas = 0,0; y = garis dasar teks; satuan pt).
   Keluaran: {ok, nomor, proyek, hal, kotak:{kiri, atas, kanan, bawah}} atau {ok:false, kode, msg}.
   Dipakai peramban (pdf.js) dan uji di Node. Tidak menyentuh DOM. */
(function (root) {
  'use strict';
  function rapi(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
  function kecil(s) { return rapi(s).toLowerCase(); }

  /** Kelompokkan item satu baris (selisih y kecil) menjadi baris terurut menurut x. */
  function barisBaris(items) {
    var arr = items.filter(function (i) { return rapi(i.s); }).slice().sort(function (a, b) { return a.y - b.y || a.x - b.x; }), out = [];
    arr.forEach(function (it) {
      var b = out.length ? out[out.length - 1] : null;
      if (b && Math.abs(b.y - it.y) <= 3.2) b.it.push(it); else out.push({y: it.y, it: [it]});
    });
    out.forEach(function (b) { b.it.sort(function (p, q) { return p.x - q.x; }); });
    return out;
  }
  /** Nilai di kanan label "No. PPBJ" / "Peruntukan": lewati ":" lalu ambil item berurutan sampai ada celah lebar (label kolom berikutnya). */
  function nilaiKanan(items, labelRe) {
    var bs = barisBaris(items), hasil = null;
    for (var bi = 0; bi < bs.length && !hasil; bi++) {
      var b = bs[bi];
      for (var k = 0; k < b.it.length; k++) {
        var s = kecil(b.it[k].s).replace(/[:\s]+$/, '');
        if (!labelRe.test(s)) continue;
        var akhir = b.it[k].x + b.it[k].w, vals = [], x0 = null, pos = k + 1;
        // item berikutnya: ":" saja, atau ":" menempel pada nilai
        while (pos < b.it.length) {
          var t = rapi(b.it[pos].s);
          if (t === ':' || t === '') { akhir = b.it[pos].x + b.it[pos].w; pos++; continue; }
          break;
        }
        for (; pos < b.it.length; pos++) {
          var it = b.it[pos], gap = it.x - akhir, nxt = b.it[pos + 1];
          if (nxt && rapi(nxt.s).charAt(0) === ':' && vals.length) break;   // item ini label kolom berikutnya
          if (vals.length && gap > 22) break;
          if (!vals.length && gap > 60) break;
          if (x0 == null) x0 = it.x;
          vals.push(rapi(it.s).replace(/^:\s*/, '')); akhir = it.x + it.w;
        }
        var nilai = rapi(vals.join(' '));
        if (nilai) {
          // lanjutan baris berikutnya (peruntukan panjang): rata kiri dengan nilai, rapat, tanpa titik dua
          if (/peruntukan/.test(labelRe.source)) {
            var yy = b.y;
            for (var j = bi + 1; j < bs.length && j <= bi + 4; j++) {
              var l = bs[j], d = l.y - yy, c = l.it[0];
              if (d < 8 || d > 14.5) break;
              if (Math.abs(c.x - x0) > 3 || /:/.test(c.s)) break;
              nilai += ' ' + rapi(c.s); yy = l.y;
            }
          }
          hasil = nilai;
        }
        break;
      }
    }
    return hasil;
  }
  function cariKotak(halaman, opsi) {
    opsi = opsi || {};
    var wajib = kecil(opsi.namaWajib || 'rosyihani'), ada = false, hit = null, sebab = '';
    halaman.forEach(function (p) {
      barisBaris(p.items).forEach(function (b) {
        b.it.forEach(function (h) {
          var t = kecil(h.s);
          if (!/^bagian\s+gudang$/.test(t)) return;
          ada = true;
          var cx = h.x + h.w / 2, nama = null;
          p.items.forEach(function (n) {
            var dy = n.y - h.y; if (dy < 35 || dy > 95 || !rapi(n.s)) return;
            var nx = n.x + n.w / 2; if (Math.abs(nx - cx) > 45) return;
            if (!nama || dy < nama.dy) nama = {dy: dy, it: n, cx: nx};
          });
          if (!nama) { sebab = sebab || 'nama'; return; }
          if (kecil(nama.it.s).indexOf(wajib) < 0) { sebab = 'nama'; return; }
          var tengah = (cx + nama.cx) / 2, atas = h.y + 6, bawah = nama.it.y - 11;
          if (bawah - atas < 24 || bawah - atas > 90) { atas = h.y + 6; bawah = h.y + 53; }
          hit = {hal: p.n, kotak: {kiri: tengah - 38, kanan: tengah + 38, atas: atas, bawah: bawah}, namaDi: rapi(nama.it.s)};
        });
      });
    });
    if (hit) return {ok: true, hal: hit.hal, kotak: hit.kotak, namaDi: hit.namaDi};
    if (!ada) return {ok: false, kode: 'kotak', msg: 'Kotak "Bagian Gudang" tidak ditemukan. Pastikan ini PDF form PPBJ asli dari sistem.'};
    return {ok: false, kode: 'nama', msg: 'Nama di bawah kotak "Bagian Gudang" bukan Staff Gudang yang berwenang menandatangani. Tanda tangan tidak dibubuhkan.'};
  }
  function baca(halaman, opsi) {
    var total = 0; halaman.forEach(function (p) { total += p.items.filter(function (i) { return rapi(i.s); }).length; });
    if (total < 1) return {ok: false, kode: 'scan', msg: 'PDF ini tidak memuat teks (kemungkinan foto atau hasil scan). Unggah PDF asli yang diunduh dari sistem, bukan foto atau scan.'};
    var nomor = null, proyek = null;
    for (var i = 0; i < halaman.length; i++) {
      var n = nilaiKanan(halaman[i].items, /^no\.? ?ppbj$/); if (n && !nomor) nomor = n;
      var pr = nilaiKanan(halaman[i].items, /^peruntukan$/); if (pr && !proyek) proyek = pr;
      if (nomor && proyek) break;
    }
    if (!nomor) return {ok: false, kode: 'nomor', msg: 'No. PPBJ tidak terbaca. Pastikan ini PDF form PPBJ asli dari sistem.'};
    var k = cariKotak(halaman, opsi); if (!k.ok) return k;
    return {ok: true, nomor: nomor, proyek: proyek || '', hal: k.hal, kotak: k.kotak, namaDi: k.namaDi};
  }
  var api = {baca: baca, cariKotak: cariKotak, nilaiKanan: nilaiKanan, barisBaris: barisBaris};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.TtdCari = api;
})(typeof window !== 'undefined' ? window : this);
