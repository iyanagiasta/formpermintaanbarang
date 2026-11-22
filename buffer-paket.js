/* T167: tampilan tab Buffer Paket yang seragam dengan Cek Material.
   - tindakan per barang (Beli N / Tunggu PO / Tunggu barang datang / Aman)
   - daftar proyek dengan nama proyek, "Stok terbatas", batang dan rincian antrean (komponen CMK)
   - kartu kesiapan per paket dengan barang penghambat
   - simulasi "kalau datang, siapa yang dapat?" (dihitung di browser dengan urutan antrean dari server; data tidak berubah)
   Hanya tampilan: angka buffer, kebutuhan, total order, dan sisa beli tetap dari server. */
(function (root) {
  'use strict';
  function n(v) { v = Number(v) || 0; return (Math.round(v * 1000) / 1000).toLocaleString('id-ID'); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]; }); }
  function kunci(s) { return String(s == null ? '' : s).trim().toUpperCase(); }
  function namaP(s) { return s ? s : '(belum bernama)'; }
  function r3(v) { return Math.round((Number(v) || 0) * 1000) / 1000; }
  var css = false;
  function gaya() {
    if (root.CMK && root.CMK.gaya) root.CMK.gaya();
    if (css) return; css = true;
    var st = document.createElement('style');
    st.textContent =
      '.bfx-ac{display:block;font-weight:800;font-size:15px;line-height:1.25;margin:0 0 2px}' +
      '.bfx-ac.o{color:var(--red,#a82424)}.bfx-ac.w{color:var(--blu,#17588f)}.bfx-ac.a{color:var(--grn,#14602f)}' +
      '.bfx-sub{display:block;font-size:12px;color:var(--mut,#5a6b78);margin:0 0 6px;line-height:1.4;white-space:normal}' +
      '.bfx-pk{margin:0 0 6px}.bfx-pk small{opacity:.75}' +
      '.bfx-ok{display:block;font-weight:600;color:var(--grn,#14602f)}.bfx-kr{display:block;font-weight:600;color:var(--red,#a82424)}' +
      '.bfx-h{margin-top:6px;font-weight:700;display:flex;align-items:center;gap:6px;flex-wrap:wrap}' +
      '.bfx-pr{margin:3px 0;padding:3px 7px;border-left:3px solid #9fb8c9;background:rgba(127,127,127,.07);border-radius:3px}' +
      '.bfx-pr.k{border-left-color:#d9a400}.bfx-pr.x{border-left-color:#e0565b}' +
      '.bfx-pr b{white-space:nowrap}.bfx-nm{display:block;font-size:12px;line-height:1.35}' +
      '.bfx-q{font-size:12px}.bfx-q .kr{color:var(--red,#a82424);font-weight:700}.bfx-q .ok{color:var(--grn,#14602f)}' +
      '.bfx-s{opacity:.75;font-size:11px}' +
      '.bfx-sisa{font-size:12px;margin-top:4px;color:var(--mut,#5a6b78)}' +
      '.bfx-kw{margin:10px 0}.bfx-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:10px;margin-top:8px}' +
      '.bfx-kt{border:1px solid var(--line,#d5dee5);border-radius:10px;padding:10px 12px;background:var(--card,#fff)}' +
      '.bfx-kt.k{border-left:4px solid #e0565b}.bfx-kt.a{border-left:4px solid #2e9d58}' +
      '.bfx-kt h4{margin:0 0 2px;font-size:15px;display:flex;justify-content:space-between;gap:8px;align-items:baseline}' +
      '.bfx-bd{font-size:12px;font-weight:700;padding:2px 8px;border-radius:10px;white-space:nowrap}' +
      '.bfx-bd.k{background:#f8d7da;color:#8a1c28}.bfx-bd.a{background:#d9f0df;color:#14612b}' +
      '.bfx-kt ul{margin:6px 0 4px 16px;padding:0;font-size:13px}.bfx-kt li{margin:2px 0}' +
      '.bfx-kt a{cursor:pointer}.bfx-ft{font-size:12px;color:var(--mut,#5a6b78);margin-top:4px}' +
      '.bfx-sim{background:rgba(23,88,143,.06);border:1px dashed var(--accent,#1a6cab);border-radius:8px;padding:10px 12px;font-size:13px;position:sticky;left:8px;max-width:min(880px,calc(100vw - 80px));box-sizing:border-box}' +
      'table.bftb td[data-l="Barang"]{min-width:250px}' +
      '.bfx-sim input{width:90px;padding:6px 8px;margin:0 6px}.bfx-sim table{margin-top:6px;min-width:0!important;width:auto}' +
      '.bfx-sim td,.bfx-sim th{padding:4px 8px;font-size:12.5px}' +
      'table.bftb td.bfo{text-align:left!important;white-space:normal!important;min-width:230px}table.bftb td.bfo small{white-space:normal}' +
      'html[data-tema] body table.bftb tbody tr:not(.bfx-simr):hover td{background:linear-gradient(var(--hover,#e3eef5),var(--hover,#e3eef5)),var(--card,#fff)!important}' +
      'html[data-tema=gelap] .bfx-ac.o,html[data-tema=gelap] .bfx-kr,html[data-tema=gelap] .bfx-q .kr{color:#ff8a8f}html[data-tema=gelap] .bfx-ac.w{color:#8cc4ff}' +
      'html[data-tema=gelap] .bfx-ac.a,html[data-tema=gelap] .bfx-ok,html[data-tema=gelap] .bfx-q .ok{color:#7fdc9c}' +
      'html[data-tema=gelap] .bfx-bd.k{background:#5a1f25;color:#ffd6da}html[data-tema=gelap] .bfx-bd.a{background:#174a2a;color:#c9f2d6}' +
      'html[data-tema=gelap] .bfx-sim{background:rgba(140,196,255,.08)}' +
      '@media (max-width:820px){table.bftb,table.bfpk{min-width:0!important}table.bftb td.nm,table.bfpk td.nm{text-align:left!important;white-space:normal!important}table.bftb td.nm *,table.bfpk td.nm *{text-align:left!important}table.bftb td.bfo,table.bftb td[data-l="Barang"]{min-width:0}.bfx-grid{grid-template-columns:1fr}.bfx-sim{position:static;max-width:none}}';
    document.head.appendChild(st);
  }
  /** Proyek yang belum kebagian penuh menurut antrean: [[No PPBJ, nama, kurang]]. */
  function belumKebagian(x) {
    var A = x.ant; if (!A) return [];
    return A.L.filter(function (r) { return r[2] - r[3] > 1e-9; }).map(function (r) { return [r[0], r[1], r3(r[2] - r[3])]; });
  }
  function orderTeks(x) {
    if (!(x.akan > 0)) return '';
    return 'sudah diorder ' + n(x.akan) + (x.akanTanpaPo > 0 ? ' (' + n(x.akanTanpaPo) + ' belum ada PO)' : '');
  }
  /** Kalimat tindakan sebagai teks biasa (layar dan Excel). */
  function aksiTeks(x) {
    if (!x || !x.act) return '';
    var sat = x.satuan ? ' ' + x.satuan : '';
    if (x.act === 'aman') return 'Aman: stok cukup untuk proyek dan buffer';
    if (x.act === 'tunggu') return (x.tPo ? 'Tunggu PO' : 'Tunggu barang datang') + ': kekurangan ' + n(x.totalOrder) + sat + ' sudah diorder' + (x.akanTanpaPo > 0 ? ', ' + n(x.akanTanpaPo) + ' belum ada PO' : '');
    var p = [], bk = belumKebagian(x);
    if (x.kurangPr > 0) p.push('proyek kurang ' + n(x.kurangPr) + (bk.length ? ' (' + bk.slice(0, 2).map(function (r) { return r[0] + ' · ' + namaP(r[1]); }).join('; ') + (bk.length > 2 ? '; +' + (bk.length - 2) + ' lagi' : '') + ')' : ''));
    if (x.kurangBuf > 0) p.push('buffer kurang ' + n(x.kurangBuf));
    var o = orderTeks(x); if (o) p.push(o);
    return 'Beli ' + n(x.sisaBeli != null ? x.sisaBeli : x.totalOrder) + sat + (p.length ? ': ' + p.join(', ') : '');
  }
  /** Baris tindakan di atas nama barang. */
  function aksi(x) {
    if (!x || !x.act) return '';
    var sat = x.satuan ? ' ' + esc(x.satuan) : '';
    if (x.act === 'aman') return '<span class="bfx-ac a">&#10003; Aman</span><span class="bfx-sub">Stok cukup untuk proyek dan buffer</span>';
    if (x.act === 'tunggu') return '<span class="bfx-ac w">' + (x.tPo ? 'Tunggu PO' : 'Tunggu barang datang') + '</span><span class="bfx-sub">Kekurangan ' + n(x.totalOrder) + sat + ' sudah diorder' + (x.akanTanpaPo > 0 ? ', <b>' + n(x.akanTanpaPo) + ' belum ada PO</b>' : '') + '</span>';
    var p = [], bk = belumKebagian(x);
    if (x.kurangPr > 0) p.push('proyek kurang <b>' + n(x.kurangPr) + '</b>' + (bk.length ? ' (' + esc(bk[0][0]) + ' · ' + esc(namaP(bk[0][1])) + (bk.length > 1 ? ' +' + (bk.length - 1) + ' proyek' : '') + ')' : ''));
    if (x.kurangBuf > 0) p.push('buffer kurang <b>' + n(x.kurangBuf) + '</b>');
    var o = orderTeks(x); if (o) p.push(esc(o));
    return '<span class="bfx-ac o">Beli ' + n(x.sisaBeli != null ? x.sisaBeli : x.totalOrder) + sat + '</span>' + (p.length ? '<span class="bfx-sub">' + p.join(' &middot; ') + '</span>' : '');
  }
  /** Satu paket di kolom Paket: target buffer dan cukup tidaknya sisa stok setelah kebutuhan proyek. */
  function paketBaris(p) {
    var h = '<div class="bfx-pk"><b>' + esc(p.nama) + '</b> <small title="qty per proyek &times; jumlah proyek buffer">' + n(p.qty) + '&times;' + n(p.set) + '</small>';
    if (p.cukup != null) {
      if (p.cukup >= p.set) h += '<span class="bfx-ok">Buffer aman: sisa stok cukup untuk ' + n(p.cukup) + ' proyek (target ' + n(p.set) + ')</span>';
      else h += '<span class="bfx-kr">Buffer kurang ' + n(p.set - p.cukup) + ' proyek: sisa stok cukup untuk ' + n(p.cukup) + ' dari ' + n(p.set) + '</span>';
    }
    return h + '</div>';
  }
  function proyekBaris(q, x) {
    var kr = q.kurang > 1e-9, cls = !(q.sisa > 0) ? '' : kr ? (q.dapat > 0 ? ' k' : ' x') : ' k';
    var qq = '';
    if (q.sisa > 0) {
      qq = 'butuh ' + n(q.sisa);
      if (q.dapat != null) qq += kr ? ' &middot; dapat ' + n(q.dapat) + ' &middot; <span class="kr">kurang ' + n(q.kurang) + '</span>' : ' &middot; <span class="ok">kebagian penuh</span>';
    } else qq = 'terpenuhi';
    return '<div class="bfx-pr' + cls + '"><b>' + esc(q.ppbj) + '</b><span class="bfx-nm">' + esc(namaP(q.nama || q.ket)) + '</span><div class="bfx-q">' + qq + '</div>' +
      '<div class="bfx-s">RAB ' + n(q.rab) + (q.serah ? ' &middot; diserahkan ' + n(q.serah) : '') + (q.alok ? ' &middot; alokasi ' + n(q.alok) : '') + '</div></div>';
  }
  /** Kolom Paket / proyek lengkap. */
  function kolom(x) {
    gaya();
    var C = root.CMK, h = (x.paket || []).map(paketBaris).join('');
    var pr = x.proyek || [];
    if (pr.length) {
      var butuh = pr.filter(function (q) { return q.sisa > 0; }), beres = pr.filter(function (q) { return !(q.sisa > 0); });
      if (butuh.length) {
        butuh.sort(function (a, b) { return (a.urut || 999) - (b.urut || 999); });
        h += '<div class="bfx-h">Proyek yang masih butuh (' + butuh.length + ')' + (x.terbatas ? '<span class="cmk-st t">Stok terbatas</span>' : '') + '</div>';
        if (x.terbatas && x.ant && C && C.batang) h += C.batang(x.ant, '');
        h += butuh.map(function (q) { return proyekBaris(q, x); }).join('');
        if (x.terbatas && x.ant && C && C.rincian) h += C.rincian(x.ant, '');
        if (x.sisaProyek != null) h += '<div class="bfx-sisa">Sisa untuk buffer setelah semua proyek: <b>' + n(x.sisaProyek) + '</b></div>';
      } else h += '<div class="bfx-h">Proyek</div>';
      if (beres.length) h += '<details style="margin-top:4px"><summary style="cursor:pointer;opacity:.85">' + (butuh.length ? beres.length + ' proyek sudah terpenuhi' : 'Semua ' + beres.length + ' proyek sudah terpenuhi') + '</summary>' + beres.map(function (q) { return proyekBaris(q, x); }).join('') + '</details>';
    }
    return h;
  }
  /** Status beli sebuah barang untuk kartu paket. */
  function statusBarang(b) {
    if (!b || !b.act) return '';
    if (b.act === 'tunggu') return b.tPo ? 'sudah diorder, belum ada PO' : 'sudah diorder, menunggu datang';
    if (b.act === 'beli') return b.akan > 0 ? 'diorder ' + n(b.akan) + ', masih perlu beli ' + n(b.sisaBeli) : 'belum dipesan';
    return 'stok gabungan cukup';
  }
  /** Kartu kesiapan per paket. */
  function kartu(D) {
    gaya();
    var by = {}; (D.barang || []).forEach(function (b) { by[kunci(b.kode)] = b; });
    var P = (D.paket || []).filter(function (p) { return p.aktif && p.items && p.items.length; });
    if (!P.length) return '';
    P = P.slice().sort(function (a, b) { return (a.siap / Math.max(1, a.set)) - (b.siap / Math.max(1, b.set)) || String(a.nama).localeCompare(String(b.nama), 'id'); });
    var nk = P.filter(function (p) { return p.siap < p.set; }).length;
    var h = '<div class="card bfx-kw"><b>Kesiapan per paket</b> <span class="note">(' + (nk ? nk + ' dari ' + P.length + ' paket belum siap penuh' : 'semua ' + P.length + ' paket siap') + ')</span>' +
      '<div class="note">Siap = berapa proyek buffer yang bisa dipenuhi dari sisa stok setelah kebutuhan proyek aktif, dihitung tiap paket sendiri-sendiri. Klik nama barang untuk melihatnya di tabel.</div><div class="bfx-grid">';
    P.forEach(function (p) {
      var ok = p.siap >= p.set, hb = p.penghambat || [];
      h += '<div class="bfx-kt ' + (ok ? 'a' : 'k') + '"><h4><span>' + esc(p.nama) + '</span><span class="bfx-bd ' + (ok ? 'a' : 'k') + '">' + (ok ? 'Siap ' + n(p.set) + ' proyek' : 'Siap ' + n(p.siap) + ' dari ' + n(p.set)) + '</span></h4>' +
        '<div class="note">' + n(p.set) + ' proyek buffer &middot; ' + n(p.jenis) + ' jenis barang</div>';
      if (hb.length) {
        var semuaOrder = hb.every(function (x) { var b = by[kunci(x.kode)]; return b && (b.act === 'tunggu' || b.act === 'aman'); });
        h += '<div style="margin-top:6px;font-weight:700;font-size:13px">Penghambat (' + hb.length + ')</div><ul>' + hb.slice(0, 4).map(function (x) {
          var b = by[kunci(x.kode)], st = statusBarang(b);
          return '<li><a data-bfxk="' + esc(x.kode) + '"><b>' + esc(x.nama || x.kode) + '</b></a>: perlu ' + n(x.perlu) + (x.satuan ? ' ' + esc(x.satuan) : '') + ' lagi' + (st ? ' <span class="note">(' + esc(st) + ')</span>' : '') + '</li>';
        }).join('') + (hb.length > 4 ? '<li class="note">+ ' + (hb.length - 4) + ' barang lain</li>' : '') + '</ul>' +
          '<div class="bfx-ft">' + (semuaOrder ? 'Semua penghambat sudah diorder; tinggal tunggu datang.' : (hb.length === 1 ? 'Kalau ' + n(hb[0].perlu) + ' ' + esc(hb[0].nama || hb[0].kode) + ' datang' : 'Kalau barang di atas datang sesuai jumlahnya') + ', semua ' + n(p.set) + ' proyek siap.') + '</div>';
      } else h += '<div class="bfx-ft">Tidak ada penghambat.</div>';
      h += '</div>';
    });
    return h + '</div></div>';
  }
  /** Simulasi: kalau q unit datang. Urutan antrean sama dengan server (tidak bergantung jumlah stok). */
  function hitungSim(x, q) {
    var A = x.ant, bebas2 = r3((x.bebas || 0) + q), sisa = bebas2, rows = [], tanpaUrut = false;
    /* T168: bila urutan antrean dari server belum ada (mis. hasil simpanan versi lama), proyek yang masih butuh tetap ditampilkan menurut daftar */
    var L = A ? A.L : (x.proyek || []).filter(function (p) { return p.sisa > 0; }).map(function (p) { return [p.ppbj, p.nama || p.ket, p.sisa, null]; });
    if (!A && L.length) tanpaUrut = true;
    var sisaDulu = x.bebas || 0;
    L.forEach(function (r) {
      var du = r[3] != null ? r[3] : r3(Math.max(0, Math.min(r[2], sisaDulu))); sisaDulu = r3(Math.max(0, sisaDulu - du));
      var d = r3(Math.max(0, Math.min(r[2], sisa))); sisa = r3(sisa - d); rows.push({ppbj: r[0], nama: r[1], butuh: r[2], dulu: du, baru: d});
    });
    if (!L.length) sisa = r3(bebas2 - (x.kebutuhan || 0));
    var buf = Math.max(0, sisa);
    var paket = (x.paket || []).map(function (p) { return {nama: p.nama, set: p.set, dulu: p.cukup, baru: p.qty > 0 ? Math.floor(buf / p.qty + 1e-9) : 0}; });
    return {q: q, tanpaUrut: tanpaUrut, bebas: x.bebas || 0, bebas2: bebas2, rows: rows, buf: buf, paket: paket, kurang2: Math.max(0, r3((x.kebutuhan || 0) + (x.buffer || 0) - bebas2))};
  }
  function simHtml(x, q) {
    var S = hitungSim(x, q), sat = x.satuan ? ' ' + esc(x.satuan) : '';
    var h = '<div><b>Kalau ' + n(q) + sat + ' datang</b>: stok bebas ' + n(S.bebas) + ' &rarr; <b>' + n(S.bebas2) + '</b>.</div>';
    if (S.rows.length) h += '<table data-tanpa-geser class="nop"><thead><tr><th>#</th><th>Proyek</th><th class="nm">Butuh</th><th class="nm" title="Jatah proyek dari stok bebas saat ini menurut antrean">Jatah dari stok sekarang</th><th class="nm" title="Jatah proyek kalau barang sejumlah di atas datang">Jatah kalau barang datang</th></tr></thead><tbody>' + S.rows.map(function (r, i) {
      var kr = r.butuh - r.baru > 1e-9;
      return '<tr><td>' + (i + 1) + '</td><td><b>' + esc(r.ppbj) + '</b> ' + esc(namaP(r.nama)) + '</td><td class="nm">' + n(r.butuh) + '</td><td class="nm">' + n(r.dulu) + '</td><td class="nm"><b style="color:' + (kr ? 'var(--red,#a82424)' : 'var(--grn,#14602f)') + '">' + n(r.baru) + '</b>' + (kr ? ' (kurang ' + n(r3(r.butuh - r.baru)) + ')' : '') + '</td></tr>';
    }).join('') + '</tbody></table>';
    else if (x.kebutuhan > 0) h += '<div class="note">Kebutuhan proyek ' + n(x.kebutuhan) + ' diambil lebih dulu; rincian proyek belum tersedia. Tekan &#8635; untuk memuat ulang.</div>';
    else h += '<div class="note">Tidak ada proyek aktif yang masih butuh barang ini; semuanya untuk buffer.</div>';
    if (S.tanpaUrut) h += '<div class="note">Urutan antrean belum tersedia dari server (data simpanan lama); proyek ditampilkan sesuai daftar. Tekan &#8635; untuk memuat ulang.</div>';
    h += '<div style="margin-top:6px">Sisa untuk buffer: <b>' + n(S.buf) + '</b>' + (S.paket.length ? ' &middot; ' + S.paket.map(function (p) { return esc(p.nama) + ' cukup untuk <b>' + n(Math.min(p.baru, 9999)) + '</b> dari ' + n(p.set) + ' proyek (sekarang ' + n(p.dulu) + ')'; }).join('; ') : '') + '</div>';
    h += '<div style="margin-top:4px">' + (S.kurang2 > 0 ? 'Setelah itu masih kurang <b>' + n(S.kurang2) + '</b> untuk proyek + buffer.' : '<b style="color:var(--grn,#14602f)">Setelah itu proyek dan buffer tercukupi.</b>') + '</div>';
    return h + '<div class="note" style="margin-top:4px">Hanya simulasi dengan urutan antrean yang sama (proyek Aktif dulu, prioritas Tinggi-Biasa-Rendah, PPBJ terlama; buffer mendapat sisanya). Data tidak berubah.</div>';
  }
  /** Baris simulasi di bawah baris barang (toggle). */
  function bukaSim(tr, x, ncol) {
    gaya();
    var nx = tr.nextElementSibling;
    if (nx && nx.classList.contains('bfx-simr')) { nx.remove(); return; }
    var q0 = x.akan > 0 ? x.akan : (x.sisaBeli > 0 ? x.sisaBeli : (x.totalOrder > 0 ? x.totalOrder : 1));
    var r = document.createElement('tr'); r.className = 'bfx-simr';
    r.innerHTML = '<td colspan="' + ncol + '" data-l="Simulasi"><div class="bfx-sim"><label>Jumlah datang <input type="number" min="0" step="any" value="' + r3(q0) + '"></label><button type="button">Hitung</button> <button type="button" class="gh">Tutup</button><div class="bfx-simh" style="margin-top:8px"></div></div></td>';
    tr.parentNode.insertBefore(r, tr.nextSibling);
    var inp = r.querySelector('input'), bt = r.querySelectorAll('button'), out = r.querySelector('.bfx-simh');
    function hit() { var q = Math.max(0, Number(String(inp.value).replace(',', '.')) || 0); out.innerHTML = simHtml(x, q); }
    bt[0].onclick = hit; bt[1].onclick = function () { r.remove(); };
    inp.onkeydown = function (e) { if (e.key === 'Enter') hit(); };
    hit();
  }
  root.BFX = {aksi: aksi, aksiTeks: aksiTeks, kolom: kolom, kartu: kartu, hitungSim: hitungSim, simHtml: simHtml, bukaSim: bukaSim, gaya: gaya, belumKebagian: belumKebagian,
    proyekTeks: function (x) { return (x.proyek || []).map(function (q) { return q.ppbj + ' ' + namaP(q.nama || q.ket) + ': butuh ' + n(q.sisa) + (q.dapat != null && q.sisa > 0 ? ', dapat ' + n(q.dapat) : ''); }).join('; '); }};
})(typeof window !== 'undefined' ? window : this);
