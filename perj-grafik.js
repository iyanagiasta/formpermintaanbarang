/* Grafik SVG sederhana untuk dashboard Perjalanan Kerja (tanpa pustaka luar). Semua ukuran dirancang untuk kanvas 1280x720. */
(function (g) {
  "use strict";
  var W = {biru: "#1a6cab", biruTua: "#0d3b66", biruMuda: "#cfe6f7", biruPucat: "#eaf4fb", abu: "#5b7080", garis: "#c3d3df", ok: "#14602f", kuning: "#b86e00", merah: "#a82424", teks: "#10283c"};
  function esc(x) { return String(x == null ? "" : x).replace(/[&<>"]/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]; }); }
  function fmt(n, d) { if (n == null || isNaN(n)) return "-"; return Number(n).toLocaleString("id-ID", {maximumFractionDigits: d == null ? 1 : d}); }
  function pendek(s, n) { s = String(s == null ? "" : s); return s.length > n ? s.slice(0, n - 1) + "…" : s; }
  /** Cincin persentase. */
  function ring(pct, o) {
    o = o || {}; var uk = o.ukuran || 260, tb = o.tebal || 30, r = (uk - tb) / 2, c = 2 * Math.PI * r, p = Math.max(0, Math.min(100, pct || 0)), w = o.warna || W.biru;
    return '<svg viewBox="0 0 ' + uk + " " + uk + '" width="' + uk + '" height="' + uk + '" role="img" aria-label="' + esc(o.label || "Persentase") + " " + fmt(p) + '%">' +
      '<circle cx="' + uk / 2 + '" cy="' + uk / 2 + '" r="' + r + '" fill="none" stroke="' + W.biruMuda + '" stroke-width="' + tb + '"/>' +
      '<circle cx="' + uk / 2 + '" cy="' + uk / 2 + '" r="' + r + '" fill="none" stroke="' + w + '" stroke-width="' + tb + '" stroke-linecap="butt" stroke-dasharray="' + (c * p / 100).toFixed(1) + " " + c.toFixed(1) + '" transform="rotate(-90 ' + uk / 2 + " " + uk / 2 + ')"/>' +
      '<text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" font-size="' + Math.round(uk * 0.2) + '" font-weight="700" fill="' + W.biruTua + '">' + fmt(p) + '%</text></svg>';
  }
  /** Batang bertumpuk satu baris: bagian = [{nama, nilai, warna}] */
  function tumpuk(bagian, o) {
    o = o || {}; var w = o.lebar || 1080, h = o.tinggi || 56, tot = 0, x = 0, out = "";
    bagian.forEach(function (b) { tot += Math.max(0, b.nilai || 0); });
    if (!tot) return "";
    bagian.forEach(function (b) {
      var bw = Math.max(0, b.nilai || 0) / tot * w; if (bw <= 0) return;
      out += '<rect x="' + x.toFixed(1) + '" y="0" width="' + bw.toFixed(1) + '" height="' + h + '" fill="' + b.warna + '"/>';
      if (bw > 90) out += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + h / 2 + '" text-anchor="middle" dominant-baseline="central" font-size="22" font-weight="700" fill="#fff">' + fmt(b.nilai, 0) + "</text>";
      x += bw;
    });
    return '<svg viewBox="0 0 ' + w + " " + h + '" width="100%" role="img" aria-label="' + esc(bagian.map(function (b) { return b.nama + " " + fmt(b.nilai, 0); }).join(", ")) + '">' + out + "</svg>";
  }
  /** Garis tren. seri = [{nama, warna, titik:[{x:label, y:angka}]}], label sumbu x ikut urutan titik pertama. opsi: target, satuan, min, max */
  function garis(seri, o) {
    o = o || {}; var w = o.lebar || 1080, h = o.tinggi || 360, ml = 90, mr = 40, mt = 30, mb = 64, pw = w - ml - mr, ph = h - mt - mb;
    var xs = [], ys = [];
    seri.forEach(function (s) { s.titik.forEach(function (t) { if (xs.indexOf(t.x) < 0) xs.push(t.x); if (t.y != null) ys.push(t.y); }); });
    if (o.target != null) ys.push(o.target);
    if (!xs.length || !ys.length) return "";
    var mn = o.min != null ? o.min : Math.min.apply(null, ys), mx = o.max != null ? o.max : Math.max.apply(null, ys);
    if (o.min == null && mn > 0) mn = 0; if (mx === mn) mx = mn + 1;
    var langkah = (mx - mn) / 4;
    if (o.max == null) {   // puncak sumbu dibulatkan ke angka rapi (mis. 100, 25, 50) agar garis bantu tidak berangka aneh
      var pk = mx - mn, cand = [1, 2, 2.5, 5], st2 = 0, e;
      for (e = -2; e <= 8 && !st2; e++) for (var c2 = 0; c2 < cand.length; c2++) { var sp = cand[c2] * Math.pow(10, e); if (Math.ceil(pk / sp - 1e-9) <= 5) { st2 = sp; break; } }
      if (st2) { mx = mn + Math.ceil(pk / st2 - 1e-9) * st2; langkah = st2; }
    }
    var nTick = Math.max(1, Math.round((mx - mn) / langkah));
    function X(i) { return ml + (xs.length === 1 ? pw / 2 : i * pw / (xs.length - 1)); }
    function Y(v) { return mt + ph - (v - mn) / (mx - mn) * ph; }
    var out = "", i, k;
    for (k = 0; k <= nTick; k++) { var v = mn + (mx - mn) * k / nTick, y = Y(v); out += '<line x1="' + ml + '" x2="' + (w - mr) + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="' + W.garis + '" stroke-width="1"/><text x="' + (ml - 12) + '" y="' + y.toFixed(1) + '" text-anchor="end" dominant-baseline="central" font-size="20" fill="' + W.abu + '">' + fmt(v, Math.abs(mx - mn) < 10 ? 1 : 0) + "</text>"; }
    xs.forEach(function (lab, idx) { out += '<text x="' + X(idx).toFixed(1) + '" y="' + (h - mb + 32) + '" text-anchor="middle" font-size="20" fill="' + W.abu + '">' + esc(pendek(lab, 12)) + "</text>"; });
    if (o.target != null) { var yt = Y(o.target); out += '<line x1="' + ml + '" x2="' + (w - mr) + '" y1="' + yt.toFixed(1) + '" y2="' + yt.toFixed(1) + '" stroke="' + W.kuning + '" stroke-width="3" stroke-dasharray="10 8"/><text x="' + (w - mr) + '" y="' + (yt - 8).toFixed(1) + '" text-anchor="end" font-size="20" font-weight="700" fill="' + W.kuning + '">Target ' + fmt(o.target) + (o.satuan ? " " + esc(o.satuan) : "") + "</text>"; }
    seri.forEach(function (s, si) {
      var warna = s.warna || (si ? W.kuning : W.biru), pts = [];
      xs.forEach(function (lab, idx) { var t = s.titik.filter(function (q) { return q.x === lab; })[0]; if (t && t.y != null) pts.push({x: X(idx), y: Y(t.y), v: t.y, p: t.p}); });
      if (pts.length > 1) out += '<polyline fill="none" stroke="' + warna + '" stroke-width="5" stroke-linejoin="round" points="' + pts.map(function (p) { return p.x.toFixed(1) + "," + p.y.toFixed(1); }).join(" ") + '"/>';
      pts.forEach(function (p) {
        out += '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="8" fill="' + (p.p ? "#fff" : warna) + '" stroke="' + warna + '" stroke-width="4"/><text x="' + p.x.toFixed(1) + '" y="' + (p.y - 16).toFixed(1) + '" text-anchor="middle" font-size="22" font-weight="700" fill="' + W.biruTua + '">' + fmt(p.v) + "</text>";
      });
    });
    return '<svg viewBox="0 0 ' + w + " " + h + '" width="100%" role="img" aria-label="' + esc(o.label || "Grafik tren") + '">' + out + "</svg>";
  }
  /** Batang vertikal. data = [{label, nilai, warna?}] */
  function batang(data, o) {
    o = o || {}; var w = o.lebar || 1080, h = o.tinggi || 340, ml = 70, mr = 20, mt = 36, mb = 60, pw = w - ml - mr, ph = h - mt - mb;
    if (!data.length) return ""; var mx = Math.max.apply(null, data.map(function (d) { return d.nilai || 0; })) || 1, bw = Math.min(110, pw / data.length * 0.62), out = "";
    for (var k = 0; k <= 3; k++) { var v = mx * k / 3, y = mt + ph - ph * k / 3; out += '<line x1="' + ml + '" x2="' + (w - mr) + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="' + W.garis + '"/><text x="' + (ml - 10) + '" y="' + y.toFixed(1) + '" text-anchor="end" dominant-baseline="central" font-size="20" fill="' + W.abu + '">' + fmt(v, 0) + "</text>"; }
    data.forEach(function (d, i) {
      var cx = ml + pw / data.length * (i + 0.5), bh = (d.nilai || 0) / mx * ph, y = mt + ph - bh;
      out += '<rect x="' + (cx - bw / 2).toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="3" fill="' + (d.warna || W.biru) + '"/><text x="' + cx.toFixed(1) + '" y="' + (y - 10).toFixed(1) + '" text-anchor="middle" font-size="24" font-weight="700" fill="' + W.biruTua + '">' + fmt(d.nilai, 0) + '</text><text x="' + cx.toFixed(1) + '" y="' + (h - mb + 32) + '" text-anchor="middle" font-size="20" fill="' + W.abu + '">' + esc(pendek(d.label, 12)) + "</text>";
    });
    return '<svg viewBox="0 0 ' + w + " " + h + '" width="100%" role="img" aria-label="' + esc(o.label || "Grafik batang") + '">' + out + "</svg>";
  }
  /** Batang mendatar berlabel: label di atas batang agar tidak terpotong. data = [{label, nilai, warna}] */
  function mendatar(data, o) {
    o = o || {}; var w = o.lebar || 1080, bh = 34, lh = 30, gap = 14, per = lh + bh + gap, h = data.length * per + 4, mx = Math.max.apply(null, data.map(function (d) { return d.nilai || 0; })) || 1, out = "";
    data.forEach(function (d, i) {
      var y = i * per + 2, bw = Math.max(3, (d.nilai || 0) / mx * (w - 130));
      out += '<text x="0" y="' + (y + 22) + '" font-size="23" fill="' + W.teks + '">' + esc(pendek(d.label, 44)) + '</text><rect x="0" y="' + (y + lh) + '" width="' + bw.toFixed(1) + '" height="' + bh + '" rx="3" fill="' + (d.warna || W.biru) + '"/><text x="' + (bw + 12).toFixed(1) + '" y="' + (y + lh + bh / 2) + '" dominant-baseline="central" font-size="26" font-weight="700" fill="' + W.biruTua + '">' + fmt(d.nilai, 0) + "</text>";
    });
    return '<svg viewBox="0 0 ' + w + " " + h + '" width="100%" role="img" aria-label="' + esc(o.label || "Grafik batang") + '">' + out + "</svg>";
  }
  g.PG = {W: W, esc: esc, fmt: fmt, pendek: pendek, ring: ring, tumpuk: tumpuk, garis: garis, batang: batang, mendatar: mendatar};
})(typeof window !== "undefined" ? window : this);
