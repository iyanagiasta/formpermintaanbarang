/* ===== CARI PINTAR (inti bersama browser + server). Toleran salah ketik, spasi/tanda baca, singkatan, kata terbalik/terpotong. ===== */
var CARI = (function () {
  var SIN = {inci: 'inch', 'in': 'inch', inchi: 'inch', inc: 'inch', inch: 'inch', buah: 'pcs', bh: 'pcs', pc: 'pcs', biji: 'pcs', unit: 'pcs',
    ltr: 'liter', lt: 'liter', btg: 'batang', mtr: 'meter', klg: 'kaleng', rol: 'roll', kilo: 'kg', pak: 'pack'};
  var CACHE = {}, NCACHE = 0;
  function sinonim(map) { for (var k in map) { if (Object.prototype.hasOwnProperty.call(map, k)) SIN[String(k).toLowerCase()] = String(map[k]).toLowerCase(); } CACHE = {}; NCACHE = 0; }
  function norm(s) {
    s = String(s == null ? '' : s).toLowerCase();
    try { s = s.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) {}
    s = s.replace(/["“”″]/g, ' inch ').replace(/(\d)\s*[x×*]\s*(?=\d)/g, '$1 ').replace(/(\d),(\d)/g, '$1.$2');
    s = s.replace(/(\d)([a-z])/g, '$1 $2').replace(/([a-z])(\d)/g, '$1 $2');
    s = s.replace(/[^a-z0-9.]+/g, ' ').replace(/(^|\s)\.+|\.+(\s|$)/g, ' ').replace(/\s+/g, ' ').trim();
    return s;
  }
  var SQC = {}, FOC = {}, nsq = 0;
  function squeeze(w) { var c = SQC[w]; if (c !== undefined) return c; if (++nsq > 60000) { SQC = {}; FOC = {}; nsq = 0; } return (SQC[w] = w.replace(/([a-z])\1+/g, '$1')); }
  function fonetik(w) {
    var c = FOC[w]; if (c !== undefined) return c;
    return (FOC[w] = squeeze(w.replace(/ph/g, 'f').replace(/th/g, 't').replace(/kh/g, 'k').replace(/c([eiy])/g, 's$1').replace(/[ckq]/g, 'k').replace(/x/g, 'ks').replace(/[vw]/g, 'f').replace(/y/g, 'i').replace(/z/g, 's')));
  }
  function tokens(s) {
    var t = norm(s).split(' ').filter(Boolean), out = [];
    for (var i = 0; i < t.length; i++) out.push(SIN[t[i]] || t[i]);
    return out;
  }
  function dl(a, b, maks) { // jarak Damerau-Levenshtein (dibatasi)
    var n = a.length, m = b.length; if (Math.abs(n - m) > maks) return maks + 1;
    var d = [], i, j;
    for (i = 0; i <= n; i++) { d[i] = [i]; }
    for (j = 1; j <= m; j++) d[0][j] = j;
    for (i = 1; i <= n; i++) for (j = 1; j <= m; j++) {
      var c = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
      if (i > 1 && j > 1 && a.charAt(i - 1) === b.charAt(j - 2) && a.charAt(i - 2) === b.charAt(j - 1)) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
    return d[n][m];
  }
  var ANGKA = /^[0-9.]+$/, FZ = 0;
  function skorToken(q, it) {
    FZ = 0;
    if (q === it) return 1;
    if (ANGKA.test(q) || ANGKA.test(it)) return 0;           // angka harus persis (3 inch tidak sama dengan 4 inch)
    var sq = squeeze(q), si = squeeze(it);
    if (sq === si) return 0.97;
    if (q.length >= 2 && it.indexOf(q) === 0) return 0.92;
    if (sq.length >= 2 && si.indexOf(sq) === 0) return 0.9;
    if (q.length >= 3 && it.indexOf(q) >= 0) return 0.8;
    if (sq.length >= 3 && si.indexOf(sq) >= 0) return 0.78;
    if (q.length >= 4) {
      FZ = 1;
      var fq = fonetik(q), fi = fonetik(it);
      if (fq === fi) return 0.88;
      if (fq.length >= 4 && fi.indexOf(fq) === 0) return 0.82;
      if (sq.length < 4 || fq.length < 4 || si.length < 3) { FZ = 0; return 0; }
      var mx = sq.length <= 6 ? 1 : 2, d = dl(sq, si, mx);
      if (d <= mx) return 0.86 - 0.1 * d;
      var pre = si.slice(0, sq.length); d = dl(sq, pre, mx);
      if (d <= mx) return 0.74 - 0.04 * d;
      mx = fq.length <= 6 ? 1 : 2; d = dl(fq, fi, mx);
      if (d <= mx) return 0.72;
      d = dl(fq, fi.slice(0, fq.length), mx);
      if (d <= mx) return 0.66;
    }
    FZ = 0; return 0;
  }
  function tokItem(h) {
    var c = CACHE[h]; if (c) return c;
    if (NCACHE > 40000) { CACHE = {}; NCACHE = 0; }
    c = tokens(h); CACHE[h] = c; NCACHE++; return c;
  }
  /** Nilai kecocokan haystack terhadap query. Mengembalikan null bila tidak cocok, atau {s: nilai 0..1, m: true bila hanya mirip (bukan persis)}. */
  function skor(hay, q) {
    var qt = typeof q === 'string' ? tokens(q) : q;
    if (!qt.length) return {s: 1, m: false};
    var it = tokItem(String(hay == null ? '' : hay)), tot = 0, kuat = true, urut = true, pos = -1;
    var nq = 0;
    for (var i = 0; i < qt.length; i++) {
      var best = 0, bj = -1, pakai = 1, j, v, bf = 0;
      for (j = 0; j < it.length; j++) { v = skorToken(qt[i], it[j]); if (v > best) { best = v; bj = j; bf = FZ; if (v === 1) break; } }
      if (best < 0.6 && qt[i].length >= 3) { // kata dipecah/disambung: "base plat" ~ "baseplat", "sil tep" ~ "seal tape"
        for (j = 0; j + 1 < it.length; j++) { v = skorToken(qt[i], it[j] + it[j + 1]) * 0.97; if (v > best) { best = v; bj = j; bf = FZ; } }
        if (i + 1 < qt.length && !ANGKA.test(qt[i]) && !ANGKA.test(qt[i + 1])) {
          var gb = qt[i] + qt[i + 1];
          for (j = 0; j < it.length; j++) { v = skorToken(gb, it[j]) * 0.95; if (v > best) { best = v; bj = j; pakai = 2; bf = FZ; } }
          for (j = 0; j + 1 < it.length; j++) { v = skorToken(gb, it[j] + it[j + 1]) * 0.95; if (v > best) { best = v; bj = j; pakai = 2; bf = FZ; } }
        }
      }
      if (best < 0.6) return null;
      if (bf || best < 0.8) kuat = false;
      if (bj < pos) urut = false; pos = bj;
      tot += best; nq++; i += pakai - 1;
    }
    var s = tot / nq + (urut ? 0.03 : 0) - Math.min(0.05, it.length * 0.004);
    return {s: s, m: !kuat};
  }
  /** Saring + urutkan. teks(x) = teks yang dicari milik x. Hasil persis lebih dulu; yang mirip hanya ditambahkan bila hasil persis sedikit. */
  function saring(list, q, teks, maks) {
    var qt = tokens(q), n = list.length, i, p = [], m = [];
    if (!qt.length) { return {hasil: list.slice(0, maks || list.length), mirip: 0, persis: list.length}; }
    for (i = 0; i < n; i++) { var r = skor(teks ? teks(list[i]) : list[i], qt); if (r) { (r.m ? m : p).push({x: list[i], s: r.s, i: i}); } }
    function urut(a, b) { return b.s - a.s || a.i - b.i; }
    p.sort(urut); m.sort(urut);
    var lim = maks || 200, outP = p.slice(0, lim), outM = p.length < 8 ? m.slice(0, Math.min(8, lim - outP.length)) : [];
    return {hasil: outP.map(function (z) { return z.x; }).concat(outM.map(function (z) { return z.x; })), persis: outP.length, mirip: outM.length};
  }
  function cocok(hay, q) { return !!skor(hay, q); }
  return {norm: norm, tokens: tokens, skor: skor, saring: saring, cocok: cocok, sinonim: sinonim};
})();

window.CARI=CARI;
