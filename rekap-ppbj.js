/* T157: Rekap PPBJ lengkap (admin > Laporan > Rekap PPBJ).
   Tiga blok kiri ke kanan: Permintaan PPBJ (Item Requisition Accurate) | Barang gudang keluar (satu baris per BPB) | PO/SPK (PO Detail Accurate).
   Harga hanya dari data Accurate yang diunggah: estimasi = Item Requisition, harga stok = Penyesuaian Stok (IA), harga PO = PO Detail.
   Barang tanpa harga dibiarkan kosong (tidak dinolkan) dan dihitung terpisah. Hanya membaca.
   Bergantung: CARI (cari-pintar.js), XT (xlsx-tulis.js) + JSZip (dimuat saat unduh). */
(function (root) {
  'use strict';
  var RK = {res: null, t: 0, per: 'semua', dari: '', sampai: '', q: '', dept: '', ms: '', sb: '', st: '', v: 'barang', lim: 40, busy: false, idx: null};
  /* T161: blok tambahan (bisa ditampilkan/disembunyikan): Anggaran (RAB), Penerimaan, Stok & status, Penyimpangan */
  var BLOK = [['ang', 'Anggaran (RAB)'], ['trm', 'Penerimaan'], ['stk', 'Stok & status'], ['pyp', 'Penyimpangan']];
  RK.blok = (function () { var d = {ang: 1, trm: 1, stk: 1, pyp: 1}; try { var x = JSON.parse(root.localStorage.getItem('rkBlok161') || 'null'); if (x) Object.keys(d).forEach(function (k) { if (k in x) d[k] = x[k] ? 1 : 0; }); } catch (e) { /* bawaan */ } return d; })();
  function simpanBlok() { try { root.localStorage.setItem('rkBlok161', JSON.stringify(RK.blok)); } catch (e) { /* abaikan */ } }
  var el = null, api = null, toast = function () {};
  var JENIS = {BPB: '', PGT: 'BPB Pengganti', IA: 'Tanpa BPB', IAX: 'Ada di IA, tidak di BPB', IAM: 'IA masuk', PK: 'Pengembalian'};
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
  function n3(n) { if (n == null || n === '') return ''; n = Number(n) || 0; return (Math.round(n * 1000) / 1000).toLocaleString('id-ID'); }
  function rp(n) { return n == null || n === '' ? '' : 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID'); }
  function pc(n) { return n == null ? '' : (n > 0 ? '+' : '') + String(n).replace('.', ',') + '%'; }
  function tg(s) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '')); return m ? m[3] + '/' + m[2] + '/' + m[1] : String(s || ''); }
  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function hari(a, b) { var x = Date.parse(a + 'T00:00:00Z'), y = Date.parse(b + 'T00:00:00Z'); return isFinite(x) && isFinite(y) ? Math.round((y - x) / 864e5) : null; }
  function hp() { return (root.innerWidth || 1200) < 760; }
  function MS(k) { return ((RK.res && RK.res.MS) || {})[k] || k; }
  function MS2(k) { return ((RK.res && RK.res.MS2) || {})[k] || k; }
  function chipMs2(L) { return arr(L).map(function (m) { return '<span class="rk-chip rk-c-' + (/lebihRab|kurangBelum/.test(m) ? 'r' : m === 'padanan' ? 'l' : 'y') + '">' + esc(MS2(m)) + '</span>'; }).join(''); }
  var ST_W = {'Berisiko': 'r', 'Perlu perhatian': 'y', 'Aman': 'g'};
  function chipSt(g) { var r = g.r2; if (!r || !r.status) return ''; return '<span class="rk-chip rk-c-' + (ST_W[r.status] || 'l') + '" title="' + esc(arr(r.alasan).join('; ') || 'Tidak ada temuan') + '">' + esc(r.status) + '</span>'; }
  var LK_L = {ir: 'Item Requisition', rab: 'RAB (Kebutuhan Proyek)', po: 'PO Detail', ia: 'IA lengkap', ri: 'RI (Mutasi per Gudang)', terima: 'Catatan penerimaan'};
  function lkKurang(g) { var lk = (g.r2 || {}).lk || {}; return Object.keys(LK_L).filter(function (k) { return lk[k] === false; }).map(function (k) { return LK_L[k]; }); }
  function lkTeks(g) { var L = lkKurang(g); return L.length ? 'Belum lengkap: ' + L.join(', ') : 'Lengkap'; }
  function bt() { return (RK.res && RK.res.batas) || {k: 5, m: 15}; }
  function warnaSel(v) { if (v == null) return ''; var b = bt(); return v >= b.m ? 'rk-r' : v >= b.k ? 'rk-y' : ''; }
  function arr(x) { return Array.isArray(x) ? x : []; }
  var INFO = {perkiraan: 1, hargaKosong: 1, kodeBeda: 1, iaUnggah: 1};   // penanda informasi, bukan masalah
  function bermasalah(b) { return arr(b.ms).some(function (m) { return !INFO[m]; }); }
  function gaya() {
    if (document.getElementById('rkGaya')) return;
    var st = document.createElement('style'); st.id = 'rkGaya';
    st.textContent = '.rk-sum{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin:8px 0}.rk-sum>div{border:1px solid var(--line,#ccd);border-radius:8px;padding:8px}.rk-sum b{display:block;font-size:17px}.rk-sum span{font-size:12px;opacity:.85}' +
      '.rk-fl{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:6px 0}.rk-fl input,.rk-fl select{padding:6px 8px;border:1px solid var(--line,#c3ccd3);border-radius:6px;font:inherit;max-width:100%}.rk-fl input#rkQ{flex:1 1 260px;min-width:200px}' +
      '.rk-v{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}.rk-v button[aria-pressed="true"]{outline:2px solid var(--accent,#1a6cab);font-weight:700}' +
      '.rk-wrap{overflow:auto;max-height:72vh;border:1px solid var(--line,#ccd);border-radius:8px}.rk-tb{border-collapse:separate;border-spacing:0;font-size:12.5px;min-width:1700px;width:100%}' +
      '.rk-tb th,.rk-tb td{border-bottom:1px solid var(--line,#dde);border-right:1px solid var(--line,#eef);padding:4px 6px;vertical-align:top;text-align:left;background:var(--card,#fff)}.rk-tb td.n,.rk-tb th.n{text-align:right;white-space:nowrap}' +
      '.rk-tb thead th{position:sticky;top:0;z-index:3;font-size:11.5px}.rk-tb thead tr:nth-child(2) th{top:25px}.rk-tb .rk-st{position:sticky;left:0;z-index:2;min-width:220px;max-width:260px}.rk-tb thead .rk-st{z-index:4}' +
      '.rk-tb th.bA{background:#d6eaf8;color:#17202a}.rk-tb th.bB{background:#d5f5e3;color:#17202a}.rk-tb th.bC{background:#fdebd0;color:#17202a}.rk-tb th.bD{background:#eaecee;color:#17202a}' +
      '.rk-tb tr.rk-g td{background:var(--hover,#eaf2f8);font-weight:600;border-top:2px solid var(--accent,#1a6cab)}.rk-tb tr.rk-g td .note{font-weight:400}.rk-tb tr.rk-t td{font-weight:700;border-top:1px dashed var(--line,#ccd);border-bottom:2px solid var(--line,#ccd)}' +
      '.rk-tb tr.rk-m>td.rk-st{box-shadow:inset 4px 0 0 #c0392b}.rk-tb tr.rk-l>td{border-top:0}.rk-tb td.rk-y{background:#fcf3cf!important;color:#7d6608}.rk-tb td.rk-r{background:#fadbd8!important;color:#922b21}' +
      '.rk-chip{display:inline-block;font-size:10.5px;padding:0 6px;border-radius:9px;border:1px solid currentColor;margin:1px 3px 1px 0;white-space:nowrap;font-weight:400}.rk-c-r{color:#c0392b}.rk-c-y{color:#b9770e}.rk-c-b{color:#2471a3}.rk-c-g{color:#1e8449}.rk-c-l{color:#7f8c8d}' +
      '.rk-bar{cursor:pointer;color:var(--accent,#1a6cab);text-decoration:underline dotted;background:none;border:0;padding:0;font:inherit;text-align:left}.rk-kos{color:#7f8c8d;font-style:italic}' +
      '.rk-md{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:90;display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:20px 8px}.rk-mdb{background:var(--card,#fff);color:var(--ink,#17232d);max-width:760px;width:100%;border-radius:10px;padding:14px 16px;box-shadow:0 8px 30px rgba(0,0,0,.3)}' +
      '.rk-tl{list-style:none;margin:8px 0;padding:0;border-left:3px solid var(--line,#ccd)}.rk-tl li{position:relative;margin:0 0 10px;padding-left:14px}.rk-tl li:before{content:"";position:absolute;left:-8px;top:4px;width:12px;height:12px;border-radius:50%;background:var(--accent,#1a6cab)}.rk-tl li.r:before{background:#c0392b}.rk-tl li.g:before{background:#1e8449}.rk-tl li.l:before{background:#95a5a6}.rk-tl .d{font-size:12px;opacity:.8}.rk-tl .gap{font-size:11px;color:#7f8c8d;margin:-6px 0 8px 14px}' +
      '.rk-kt{border:1px solid var(--line,#ccd);border-radius:8px;margin:8px 0}.rk-kt>summary{padding:8px 10px;cursor:pointer}.rk-kt .rk-kb{border-top:1px solid var(--line,#eef);padding:6px 10px;font-size:13px}.rk-kt .rk-kb .d{font-size:12px;opacity:.85}' +
      '.rk-cc{font-size:11px;color:#2471a3}' +
      '.rk-tb th.bE{background:#e8daef;color:#17202a}.rk-tb th.bF{background:#d1f2eb;color:#17202a}.rk-tb th.bG{background:#fcf3cf;color:#17202a}.rk-tb th.bH{background:#fadbd8;color:#17202a}.rk-tb tr.rk-rab td{font-style:italic}.rk-tb thead tr:nth-child(2) th.bE,.rk-tb thead tr:nth-child(2) th.bF,.rk-tb thead tr:nth-child(2) th.bG,.rk-tb thead tr:nth-child(2) th.bH{min-width:104px}.rk-tb td.rk-st,.rk-tb thead th.rk-st{background-color:var(--solid,var(--card,#fff))}.rk-tb tr.rk-g td.rk-st{background-image:linear-gradient(var(--hover,transparent),var(--hover,transparent))}html[data-tema=gelap] body .rk-wrap .rk-tb.rk-tb thead th{background-color:var(--solid,#0f1b38)!important;background-image:linear-gradient(rgba(88,230,255,.1),rgba(88,230,255,.1))}html[data-tema=gelap] .rk-tb tbody td.rk-st{background-color:var(--solid,#0f1b38)!important}' +
      '.rk-bl{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:4px 0 8px}.rk-bl button[aria-pressed="true"]{outline:2px solid var(--accent,#1a6cab);font-weight:700}.rk-bl button[aria-pressed="false"]{opacity:.7}';
    document.head.appendChild(st);
  }
  /* ---------- data ---------- */
  function periode() {
    var d = new Date(), x = '', y = '';
    if (RK.per === '3b') { var a = new Date(d); a.setMonth(a.getMonth() - 3); x = iso(a); }
    else if (RK.per === '6b') { var b = new Date(d); b.setMonth(b.getMonth() - 6); x = iso(b); }
    else if (RK.per === 'tahun') x = d.getFullYear() + '-01-01';
    else if (RK.per === 'pilih') { x = RK.dari; y = RK.sampai; }
    return {dari: x, sampai: y};
  }
  function muat(paksa, segar) {
    if (RK.busy) return;
    if (!paksa && RK.res && Date.now() - RK.t < 5 * 60 * 1000) { gambar(); return; }
    RK.busy = true;
    var box = el.querySelector('#rkIsi'); if (box) box.innerHTML = '<div class="card msg">' + (segar ? 'Menghitung ulang rekap PPBJ dari data terbaru (bisa 20-40 detik)...' : 'Memuat rekap PPBJ...') + ' (Item Requisition, PO Detail, Penyesuaian Stok, BPB, dan BPB Pengganti)</div>';
    var p = periode();
    var rq = {action: 'adminRekapPpbj', dari: p.dari, sampai: p.sampai}; if (segar) rq.segar = 1;   // T170: Muat ulang = hitung ulang di server (selain itu hasil simpanan sampai 20 menit)
    api(rq).then(function (r) {
      RK.busy = false;
      if (!r || !r.ok) { if (box) box.innerHTML = '<div class="card msg err">' + esc((r && r.msg) || 'Gagal memuat rekap.') + '</div>'; return; }
      RK.res = r; RK.t = Date.now(); RK.idx = null; RK.lim = 40; gambar();
    }).catch(function () { RK.busy = false; if (box) box.innerHTML = '<div class="card msg err">Gagal terhubung ke server.</div>'; });
  }
  function teksBarang(g, b) {
    var t = [g.no, g.proyek, g.dept, b.kode, b.nama, b.sb, b.stL];
    arr(b.kel).forEach(function (e) { t.push(e.no, e.ref || '', arr(e.ia).join(' ')); });
    arr(b.po).forEach(function (x) { t.push(x.no, x.sup || ''); });
    return t.join(' ');
  }
  function indeks() {
    if (RK.idx) return RK.idx;
    var L = []; (RK.res.ppbj || []).forEach(function (g) { arr(g.b).forEach(function (b) { L.push({g: g, b: b, t: teksBarang(g, b)}); }); });
    return (RK.idx = L);
  }
  /** Hasil saringan: [{g, b:[barang], cocok:{}}] menurut urutan PPBJ. */
  function saring() {
    var res = RK.res, L = indeks(), pilih = L;
    if (RK.q && root.CARI) pilih = root.CARI.saring(L, RK.q, function (x) { return x.t; }, 100000).hasil;
    var ok = new Set(pilih), by = new Map();
    pilih.forEach(function (x) {
      var g = x.g, b = x.b;
      if (!ok.has(x)) return;
      if (RK.dept && String(g.dept || '') !== RK.dept) return;
      if (RK.sb && b.sb !== RK.sb) return;
      if (RK.ms === '_ada' && !bermasalah(b) && !arr(g.ms).length) return;
      if (RK.st && (!g.r2 || g.r2.status !== RK.st)) return;
      if (RK.ms && RK.ms.indexOf('2:') === 0) { if (arr(b.ms2).indexOf(RK.ms.slice(2)) < 0) return; }
      else if (RK.ms && RK.ms !== '_ada' && arr(b.ms).indexOf(RK.ms) < 0 && arr(g.ms).indexOf(RK.ms) < 0) return;
      var o = by.get(g); if (!o) { o = {g: g, b: []}; by.set(g, o); } o.b.push(b);
    });
    var out = []; (res.ppbj || []).forEach(function (g) { var o = by.get(g); if (o) { o.b.sort(function (a, c) { return arr(g.b).indexOf(a) - arr(g.b).indexOf(c); }); out.push(o); } });
    return out;
  }
  function cocokDi(g, b) {
    if (!RK.q || !root.CARI) return [];
    var F = [['PPBJ', g.no], ['proyek', g.proyek], ['barang', b.nama + ' ' + b.kode], ['BPB/IA', arr(b.kel).map(function (e) { return e.no + ' ' + (e.ref || '') + ' ' + arr(e.ia).join(' '); }).join(' ')], ['PO', arr(b.po).map(function (x) { return x.no; }).join(' ')], ['vendor', arr(b.po).map(function (x) { return x.sup || ''; }).join(' ')]];
    return F.filter(function (f) { return f[1] && root.CARI.cocok(String(f[1]), RK.q); }).map(function (f) { return f[0]; });
  }
  function jumlah(H) {
    var T = {nG: H.length, nB: 0, est: 0, nEstK: 0, kel: 0, nKelK: 0, po: 0, nPoK: 0, nMs: 0};
    H.forEach(function (h) { h.b.forEach(function (b) {
      T.nB++; if (bermasalah(b)) T.nMs++;
      if (b.ir) { if (b.ir.total > 0) T.est += b.ir.total; else T.nEstK++; }
      arr(b.kel).forEach(function (e) { if (e.total != null) T.kel += e.total; else T.nKelK++; });
      arr(b.po).forEach(function (x) { if (x.bagian != null) T.po += x.bagian; else T.nPoK++; });
    }); });
    T.est = Math.round(T.est * 100) / 100; T.kel = Math.round(T.kel * 100) / 100; T.po = Math.round(T.po * 100) / 100;
    return T;
  }
  /* ---------- tampilan ---------- */
  function kerangka() {
    el.innerHTML = '<div class="card"><h3 style="margin-top:0">Rekap PPBJ</h3><div class="note">Satu baris per BPB, tiga blok kiri ke kanan: <b>Permintaan PPBJ</b> (Item Requisition), <b>Barang gudang keluar</b> (BPB, BPB Pengganti, atau no IA bila BPB belum ada), dan <b>PO/SPK</b> (PO Detail), lalu blok tambahan <b>Anggaran (RAB)</b>, <b>Penerimaan</b>, <b>Stok &amp; status</b>, dan <b>Penyimpangan</b> yang bisa ditampilkan atau disembunyikan. Rekap mencakup seluruh masa proyek; Periode hanya menyaring tanggal PPBJ. Harga hanya dari data Accurate yang diunggah. Barang tanpa harga dibiarkan kosong dan dihitung terpisah, tidak dianggap nol. Klik nama barang untuk melihat ceritanya.</div>' +
      '<div class="rk-fl"><label>Periode PPBJ <select id="rkPer"><option value="semua">Semua</option><option value="3b">3 bulan terakhir</option><option value="6b">6 bulan terakhir</option><option value="tahun">Tahun ini</option><option value="pilih">Pilih tanggal</option></select></label>' +
      '<span id="rkTgl" style="display:none"><input type="date" id="rkDari"> s/d <input type="date" id="rkSampai"> <button class="gh" id="rkTerap">Terapkan</button></span>' +
      '<button class="gh" id="rkMuat" title="Hitung ulang dari data terbaru (20-40 detik). Tanpa ini rekap memakai hasil hitungan terakhir, paling lama 20 menit.">Hitung ulang</button><button class="sv" id="rkXls">Unduh Excel</button><button class="gh" id="rkSusul" title="Isi data yang belum ada di sistem lewat template Excel">Data susulan</button><span class="note" id="rkWaktu"></span></div>' +
      '<div class="rk-fl"><input id="rkQ" placeholder="Cari pintar: proyek, no PPBJ, barang, kode, no BPB, no IA, no PO, vendor" autocomplete="off">' +
      '<select id="rkDept"><option value="">Semua departemen</option></select><select id="rkSb"><option value="">Semua sumber</option></select><select id="rkMs"><option value="">Semua baris</option><option value="_ada">Hanya yang bermasalah</option></select><select id="rkSt"><option value="">Semua status proyek</option><option>Berisiko</option><option>Perlu perhatian</option><option>Aman</option></select></div></div>' +
      '<div id="rkIsi"></div>';
    var $ = function (s) { return el.querySelector(s); };
    $('#rkPer').value = RK.per; $('#rkTgl').style.display = RK.per === 'pilih' ? '' : 'none'; $('#rkDari').value = RK.dari; $('#rkSampai').value = RK.sampai; $('#rkQ').value = RK.q;
    $('#rkPer').onchange = function () { RK.per = this.value; $('#rkTgl').style.display = RK.per === 'pilih' ? '' : 'none'; if (RK.per !== 'pilih') muat(true); };
    $('#rkTerap').onclick = function () { RK.dari = $('#rkDari').value; RK.sampai = $('#rkSampai').value; if (!RK.dari && !RK.sampai) { toast('Isi tanggal dari atau sampai.', true); return; } muat(true); };
    $('#rkMuat').onclick = function () { muat(true, true); };
    $('#rkXls').onclick = unduh;
    $('#rkSusul').onclick = bukaSusulan;
    var tm = null; $('#rkQ').oninput = function () { var v = this.value; clearTimeout(tm); tm = setTimeout(function () { RK.q = v.trim(); RK.lim = 40; isi(); }, 250); };
    $('#rkDept').onchange = function () { RK.dept = this.value; RK.lim = 40; isi(); };
    $('#rkSb').onchange = function () { RK.sb = this.value; RK.lim = 40; isi(); };
    $('#rkMs').onchange = function () { RK.ms = this.value; RK.lim = 40; isi(); };
    $('#rkSt').value = RK.st; $('#rkSt').onchange = function () { RK.st = this.value; RK.lim = 40; isi(); };
  }
  function gambar() {
    gaya();
    if (!el.querySelector('#rkIsi')) kerangka();
    var r = RK.res; if (!r) return;
    var $ = function (s) { return el.querySelector(s); };
    var lw = (r.info || {}).lewat;   /* T171: blok tambahan dilewati karena hitungan terlalu lama */
    $('#rkWaktu').innerHTML = esc('Data per ' + r.waktu) + (lw ? ' <b style="color:var(--red,#a82424)">&middot; ' + (lw === 'stok' ? 'kolom Stok dan status tidak dihitung' : 'blok tambahan (Anggaran RAB, Penerimaan, Stok dan status, Penyimpangan per barang) tidak dihitung') + ' karena hitungan melewati ' + Math.round((r.info.detik || 150) / 60 * 10) / 10 + ' menit; rekap utama tetap lengkap</b>' : '');
    var dp = {}, sb = {}, ms = {};
    var ms2 = {}, stc = {};
    (r.ppbj || []).forEach(function (g) { if (g.dept) dp[g.dept] = 1; if (g.r2 && g.r2.status) stc[g.r2.status] = (stc[g.r2.status] || 0) + 1; arr(g.ms).forEach(function (m) { ms[m] = (ms[m] || 0) + 1; }); arr(g.b).forEach(function (b) { sb[b.sb] = (sb[b.sb] || 0) + 1; arr(b.ms).forEach(function (m) { ms[m] = (ms[m] || 0) + 1; }); arr(b.ms2).forEach(function (m) { ms2[m] = (ms2[m] || 0) + 1; }); }); });
    $('#rkDept').innerHTML = '<option value="">Semua departemen</option>' + Object.keys(dp).sort().map(function (d) { return '<option>' + esc(d) + '</option>'; }).join('');
    $('#rkDept').value = RK.dept;
    $('#rkSb').innerHTML = '<option value="">Semua sumber</option>' + Object.keys(sb).sort().map(function (d) { return '<option value="' + esc(d) + '">' + esc(d) + ' (' + sb[d] + ')</option>'; }).join('');
    $('#rkSb').value = RK.sb;
    $('#rkMs').innerHTML = '<option value="">Semua baris</option><option value="_ada">Hanya yang bermasalah</option>' + Object.keys(r.MS || {}).filter(function (k) { return ms[k]; }).map(function (k) { return '<option value="' + k + '">' + esc(r.MS[k]) + ' (' + ms[k] + ')</option>'; }).join('') +
      (Object.keys(ms2).length ? '<optgroup label="Penyimpangan">' + Object.keys(r.MS2 || {}).filter(function (k) { return ms2[k]; }).map(function (k) { return '<option value="2:' + k + '">' + esc(r.MS2[k]) + ' (' + ms2[k] + ')</option>'; }).join('') + '</optgroup>' : '');
    $('#rkSt').innerHTML = '<option value="">Semua status proyek</option>' + ['Berisiko', 'Perlu perhatian', 'Aman'].map(function (s0) { return '<option value="' + s0 + '">' + s0 + ' (' + (stc[s0] || 0) + ')</option>'; }).join('');
    $('#rkSt').value = RK.st;
    $('#rkMs').value = RK.ms;
    isi();
  }
  function bukaSusulan() {
    if (!RK.res) { toast('Rekap belum dimuat.', true); return; }
    if (!root.RKS) { toast('Modul data susulan belum termuat. Muat ulang halaman (Ctrl+F5).', true); return; }
    root.RKS.buka({res: RK.res, api: api, toast: toast, muatJSZip: muatJSZip, selesai: function () { muat(true); }});
  }
  function keTab(t) { if (typeof root.goTab === 'function') root.goTab(t); }
  function menunggu(r) {
    if (!root.RKS) return '';
    var P = root.RKS.perlu(r), n = P.n, i = r.info || {}, L = [];
    if (!i.adaIr) L.push(['Item Requisition belum diunggah: blok Permintaan kosong.', 'dataacc', 'Buka Data Accurate']);
    if (!i.adaPo) L.push(['PO Detail belum diunggah: harga dan jumlah PO kosong.', 'dataacc', 'Buka Data Accurate']);
    if (!i.nIa) L.push(['Penyesuaian Stok (IA) belum diunggah: harga stok kosong.', 'dataacc', 'Buka Data Accurate']);
    if (!i.adaMac) L.push(['Mutasi per Gudang (Excel) belum diunggah: RI dan tanggal barang datang belum terbaca, pesanan PO Accurate belum dinilai terlambat.', 'dataacc', 'Buka Data Accurate']);
    if (n.tanpaRab) L.push([n.tanpaRab + ' PPBJ terdaftar di tab Proyek belum punya RAB (Kebutuhan Proyek): blok Anggaran dan Stok kosong.', 'proyek', 'Buka tab Proyek']);
    if (n.harga) L.push([n.harga + ' barang RAB belum punya harga: nilai RAB dan nilai lebih RAB belum lengkap.', '_s', 'Isi lewat template']);
    if (n.terima) L.push([n.terima + ' barang sudah dipesan tetapi belum ada catatan datang.', '_s', 'Isi lewat template']);
    if (n.garis) L.push([n.garis + ' PPBJ terdaftar belum punya tanggal mulai atau rencana selesai.', '_s', 'Isi lewat template']);
    if (n.pyp) L.push([n.pyp + ' barang melebihi atau di luar RAB belum berketerangan.', '_s', 'Isi lewat template']);
    if (!L.length) return '<div class="note">Semua data yang dibutuhkan rekap sudah tersedia.</div>';
    return '<details class="rk-kt" id="rkTunggu"><summary><b>Data yang menunggu (' + L.length + ')</b> <span class="note">angka yang bergantung pada data ini belum lengkap</span></summary>' +
      L.map(function (x) { return '<div class="rk-kb" style="display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap"><span>' + esc(x[0]) + '</span><button class="gh" data-rkt="' + x[1] + '" style="padding:2px 10px;font-size:12px">' + esc(x[2]) + '</button></div>'; }).join('') + '</details>';
  }
  function peringatan(r) {
    var i = r.info || {}, w = [];
    if (!i.adaIr) w.push('Item Requisition belum diunggah: blok Permintaan kosong.');
    if (!i.adaPo) w.push('PO Detail belum diunggah: harga PO kosong.');
    if (!i.nIa) w.push('Penyesuaian Stok (IA) belum diunggah: harga stok kosong.');
    if (!i.adaMac) w.push('Mutasi per Gudang belum diunggah: tanggal barang datang (RI) di cerita barang belum terbaca.');
    var x = [];
    if (i.nIa) x.push('IA terbaca ' + i.nIa + ' dokumen, ' + tg(i.iaMin) + ' s/d ' + tg(i.iaMax) + '.');
    if (i.mulai) x.push('Sistem gudang digital mulai ' + tg(i.mulai) + ' (IA sebelum tanggal ini = IA lama).');
    if (i.nBpbTanpaPpbj) x.push(i.nBpbTanpaPpbj + ' baris BPB tanpa No PPBJ tidak ikut rekap ini.');
    if (i.nIaTanpaPpbj) x.push(i.nIaTanpaPpbj + ' baris IA tanpa PPBJ tidak ikut rekap ini.');
    if (root.RKS) w = [];   // T162: daftar data yang menunggu menggantikan peringatan unggahan
    return (w.length ? '<div class="card msg err">' + w.map(esc).join('<br>') + '</div>' : '') + menunggu(r) + (x.length ? '<div class="note">' + x.map(esc).join(' ') + '</div>' : '');
  }
  function isi() {
    var box = el.querySelector('#rkIsi'), r = RK.res; if (!box || !r) return;
    var H = saring(), T = jumlah(H), tind = tindak(H);
    var h = peringatan(r) +
      '<div class="rk-sum"><div><b>' + T.nG + '</b><span>PPBJ</span></div><div><b>' + T.nB + '</b><span>barang/jasa</span></div>' +
      '<div><b>' + rp(T.est) + '</b><span>total estimasi PPBJ' + (T.nEstK ? ' (' + T.nEstK + ' tanpa estimasi)' : '') + '</span></div>' +
      '<div><b>' + rp(T.kel) + '</b><span>total barang gudang keluar' + (T.nKelK ? ' (' + T.nKelK + ' baris tanpa harga)' : '') + '</span></div>' +
      '<div><b>' + rp(T.po) + '</b><span>total PO/SPK' + (T.nPoK ? ' (' + T.nPoK + ' baris tanpa harga)' : '') + '</span></div>' +
      '<div><b style="color:' + (T.nMs ? '#c0392b' : '#1e8449') + '">' + T.nMs + '</b><span>barang bermasalah</span></div></div>' +
      '<div class="rk-v" role="group" aria-label="Tampilan">' + [['barang', 'Per barang'], ['ppbj', 'Per PPBJ'], ['vendor', 'Per vendor'], ['tindak', 'Perlu ditindak (' + tind.length + ')']].map(function (x) { return '<button class="gh" data-rv="' + x[0] + '" aria-pressed="' + (RK.v === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div><div id="rkV"></div>';
    box.innerHTML = h;
    box.querySelectorAll('[data-rv]').forEach(function (b) { b.onclick = function () { RK.v = b.getAttribute('data-rv'); RK.lim = 40; isi(); }; });
    box.querySelectorAll('[data-rkt]').forEach(function (b) { b.onclick = function () { var t = b.getAttribute('data-rkt'); if (t === '_s') bukaSusulan(); else keTab(t); }; });
    var v = box.querySelector('#rkV');
    if (!H.length && RK.v !== 'tindak') { v.innerHTML = '<div class="card msg">Tidak ada yang cocok dengan saringan ini.</div>'; return; }
    ({barang: hp() ? vKartu : vBarang, ppbj: vPpbj, vendor: vVendor, tindak: vTindak})[RK.v](v, H, tind);
  }
  function chipMs(b) { return arr(b.ms).filter(function (m) { return m !== 'hargaKosong'; }).map(function (m) { var c = /Merah|iaBelum|iaNomor|bpbBelum|bpbTak|belumOrder|lebih|iaBeda/.test(m) ? 'r' : /Kuning|iaLebih|poDetail|luarIr/.test(m) ? 'y' : 'l'; return '<span class="rk-chip rk-c-' + c + '">' + esc(MS(m)) + '</span>'; }).join(''); }
  function chipKel(e) {
    var c = '', t = JENIS[e.j] || '';
    if (e.j === 'PGT') c = 'b'; else if (e.j === 'IA') { c = e.ms ? 'r' : 'l'; t = e.ms === 'bpbBelum' ? 'BPB belum ada' : e.ms === 'bpbTak' ? 'BPB tidak ditemukan' : 'Bukan barang'; } else if (e.j === 'IAX') c = e.ms ? 'y' : 'l'; else if (e.j === 'PK' || e.j === 'IAM') c = 'g';
    var s = t ? '<span class="rk-chip rk-c-' + (c || 'l') + '">' + esc(t) + '</span>' : '';
    if (e.cara === 'perkiraan') s += '<span class="rk-chip rk-c-y" title="' + esc(e.ket || '') + '">IA perkiraan</span>';
    if (e.ms === 'iaBelum') s += '<span class="rk-chip rk-c-r">IA belum ada</span>';
    if (e.ms === 'iaNomor') s += '<span class="rk-chip rk-c-r" title="' + esc(e.ket || '') + '">Nomor IA belum diisi</span>';
    if (e.ms === 'iaUnggah') s += '<span class="rk-chip rk-c-y" title="' + esc(e.ket || '') + '">IA dicatat, belum diunggah</span>';
    return s;
  }
  function refPo(g, b) { return arr(b.po).length ? arr(b.po).map(function (x) { return x.no; }).join(', ') : g.no; }
  var KOL = 25;
  function kol() { var k = RK.blok; return KOL + (k.ang ? 5 : 0) + (k.trm ? 6 : 0) + (k.stk ? 4 : 0) + (k.pyp ? 1 : 0); }
  function kepala() {
    var k = RK.blok;
    return '<thead><tr><th class="rk-st bA" rowspan="2">Nama barang / jasa</th><th class="bA" colspan="5">PERMINTAAN PPBJ (Item Requisition)</th><th class="bB" colspan="6">BARANG GUDANG KELUAR</th><th class="bC" colspan="6">PO / SPK (PO Detail)</th>' +
      (k.ang ? '<th class="bE" colspan="5">ANGGARAN (RAB Kebutuhan Proyek)</th>' : '') + (k.trm ? '<th class="bF" colspan="6">PENERIMAAN</th>' : '') + (k.stk ? '<th class="bG" colspan="4">STOK &amp; STATUS</th>' : '') +
      '<th class="bD" colspan="7">PEMERIKSAAN</th>' + (k.pyp ? '<th class="bH">PENYIMPANGAN</th>' : '') + '</tr>' +
      '<tr><th class="bA">Kode</th><th class="bA n">Qty</th><th class="bA">Satuan</th><th class="bA n">Harga satuan</th><th class="bA n">Total harga</th>' +
      '<th class="bB">No BPB</th><th class="bB">Tgl</th><th class="bB n">Jumlah keluar</th><th class="bB">No PO / No PPBJ</th><th class="bB n">Harga satuan stok</th><th class="bB n">Total harga</th>' +
      '<th class="bC">No PO/SPK</th><th class="bC">Tgl PO</th><th class="bC">Nama vendor</th><th class="bC n">Qty PO</th><th class="bC n">Harga satuan PO</th><th class="bC n">Total harga PO</th>' +
      (k.ang ? '<th class="bE n">RAB</th><th class="bE n">Keluar bersih (gudang)</th><th class="bE n">Dialokasikan</th><th class="bE n">Sisa RAB</th><th class="bE n">Sisa kebutuhan</th>' : '') +
      (k.trm ? '<th class="bF n">Dipesan</th><th class="bF n">Datang (catatan gudang)</th><th class="bF n">RI Accurate</th><th class="bF n">Sisa belum datang</th><th class="bF">Tiba terakhir</th><th class="bF">Rusak / salah kirim / klaim</th>' : '') +
      (k.stk ? '<th class="bG n">Stok bebas</th><th class="bG">Status stok</th><th class="bG">Status order / perkiraan tiba</th><th class="bG">Bersaing dengan</th>' : '') +
      '<th class="bD n">Selisih PO vs estimasi</th><th class="bD n">Selisih stok vs PO</th><th class="bD">Sumber</th><th class="bD">Status order</th><th class="bD n">Keluar bersih</th><th class="bD">Keterangan</th><th class="bD">Masalah</th>' + (k.pyp ? '<th class="bH">RAB, penerimaan, stok</th>' : '') + '</tr></thead>';
  }
  function pypTeks(b) { var p = b.pyp; return p ? '<div class="note" style="white-space:normal;min-width:180px">Keterangan: ' + esc(p.ket || '') + (p.setuju ? ' (disetujui ' + esc(p.setuju) + ')' : '') + '</div>' : ''; }
  function kos(t) { return '<span class="rk-kos">' + esc(t) + '</span>'; }
  function selBlok(g, b, n) {
    var k = RK.blok, h = '', rs = ' rowspan="' + n + '"', a = b.ang, t = b.trm, s0 = b.stk, lk = (g.r2 || {}).lk || {};
    if (k.ang) {
      if (!a) h += '<td colspan="5"' + rs + '>' + kos(lk.rab === false ? 'PPBJ ini belum punya RAB (Kebutuhan Proyek)' : (b.jasa ? 'jasa/biaya' : '-')) + '</td>';
      else h += '<td class="n"' + rs + '>' + (a.rab > 0 ? n3(a.rab) : '<span class="rk-chip rk-c-y">tidak di RAB</span>') + (a.hargaTpl ? '<div class="note" title="Harga perkiraan dari template data susulan">harga ' + rp(a.harga) + ' (template)</div>' : '') + '</td><td class="n' + (a.lebih ? ' rk-r' : '') + '"' + rs + '>' + n3(a.bersih || 0) + (a.lebih ? '<div class="note">lebih ' + n3(a.lebih) + '</div>' : '') + (a.kembali ? '<div class="note">kembali ' + n3(a.kembali) + '</div>' : '') + '</td><td class="n"' + rs + '>' + n3(a.alok || 0) + '</td><td class="n"' + rs + '>' + n3(a.sisaRab || 0) + '</td><td class="n"' + rs + '>' + n3(a.sisa || 0) + '</td>';
    }
    if (k.trm) {
      if (!t) h += '<td colspan="6"' + rs + '>' + kos(b.rabSaja ? '-' : arr(b.po).length ? 'jumlah PO belum terbaca' : 'tidak ada pesanan') + '</td>';
      else h += '<td class="n"' + rs + '>' + (t.dipesan ? n3(t.dipesan) + (t.sumber ? '<div class="note">' + esc(t.sumber) + '</div>' : '') : '-') + '</td><td class="n"' + rs + '>' + n3(t.gudang || 0) + (arr(t.dok).length ? '<div class="note">' + esc(arr(t.dok).join(', ')) + '</div>' : '') + (t.tpl ? '<div><span class="rk-chip rk-c-b" title="' + esc(t.tpl.ket || '') + '">dari template</span></div>' : '') + (t.tplAbaikan ? '<div class="note">template diabaikan, ada catatan resmi</div>' : '') + '</td><td class="n"' + rs + '>' + (t.riBelum ? kos('belum terbaca') : n3(t.ri || 0)) + '</td>' +
        '<td class="n' + (t.umur ? ' rk-r' : '') + '"' + rs + '>' + (t.sisa != null ? n3(t.sisa) + (t.riBelum && t.sisa > 0 ? '<div class="note">RI belum terbaca</div>' : '') + (t.umur ? '<div class="note">PO ' + t.umur + ' hari</div>' : '') : '-') + '</td><td' + rs + '>' + tg(t.tgl) + '</td><td' + rs + '>' + ([t.rusak ? 'Rusak ' + n3(t.rusak) : '', t.salah ? 'Salah kirim ' + n3(t.salah) : ''].filter(String).map(esc).join(' &middot; ')) + (t.klaim ? ' <span class="rk-chip rk-c-r">' + t.klaim + ' klaim terbuka</span>' : '') + '</td>';
    }
    if (k.stk) {
      if (!s0) h += '<td colspan="4"' + rs + '>' + kos(lk.rab === false ? 'dihitung bila ada RAB' : 'tidak dihitung (proyek tidak aktif, buffer, atau tidak di RAB)') + '</td>';
      else h += '<td class="n"' + rs + '>' + n3(s0.bebas || 0) + '</td><td' + rs + '><span class="rk-chip rk-c-' + (s0.st === 'Kurang' ? 'r' : s0.st === 'Rebutan' ? 'y' : 'g') + '">' + esc(s0.st === 'Rebutan' ? 'Stok terbatas' : (s0.st || '-')) + '</span>' + (s0.kurang ? '<div class="note">kurang ' + n3(s0.kurang) + (s0.tutup ? ', sudah diorder' : '') + '</div>' : '') + '</td><td' + rs + '>' + esc(s0.order || '-') + (s0.eta ? '<div class="note">perkiraan tiba ' + tg(s0.eta) + '</div>' : '') + '</td><td' + rs + '>' + esc(arr(s0.lain).join(', ')) + '</td>';
    }
    return h;
  }
  function barisRab(g, x) {
    var k = RK.blok;
    return '<tr class="rk-rab"><td class="rk-st">' + esc(x.nama || x.kode) + '<div class="note">hanya di RAB, belum diminta</div></td><td style="white-space:nowrap">' + esc(x.kode) + '</td><td></td><td>' + esc(x.sat || '') + '</td><td></td><td></td><td colspan="12">' + kos('belum ada permintaan, barang keluar, atau PO') + '</td>' +
      selBlok(g, {ang: x.ang, stk: x.stk, po: [], rabSaja: true}, 1) + '<td colspan="7"></td>' + (k.pyp ? '<td>' + chipMs2(x.ms2) + '</td>' : '') + '</tr>';
  }
  function barisBarang(g, b, gi, bi) {
    var kel = arr(b.kel), po = arr(b.po), n = Math.max(kel.length, po.length, 1), h = '', ir = b.ir, cc = cocokDi(g, b), m = bermasalah(b);
    for (var i = 0; i < n; i++) {
      var e = kel[i], x = po[i], cls = (m ? 'rk-m ' : '') + (i ? 'rk-l' : '');
      h += '<tr class="' + cls + '">';
      if (!i) h += '<td class="rk-st" rowspan="' + n + '"><button class="rk-bar" data-cg="' + gi + '" data-cb="' + bi + '">' + esc(b.nama || b.kode) + '</button>' + (cc.length ? '<div class="rk-cc">cocok: ' + esc(cc.join(', ')) + '</div>' : '') + '</td>' +
        '<td style="white-space:nowrap">' + esc(b.kode) + '</td><td class="n">' + (ir ? n3(ir.qty) : '<span class="rk-kos">-</span>') + '</td><td>' + esc(b.sat || '') + '</td><td class="n">' + (ir ? (ir.harga != null ? rp(ir.harga) : '<span class="rk-kos">kosong</span>') : '') + '</td><td class="n">' + (ir && ir.total > 0 ? rp(ir.total) : '') + '</td>';
      else h += '<td></td><td></td><td></td><td></td><td></td>';
      if (e) h += '<td>' + esc(e.no) + (e.ref ? '<div class="note">BPB ' + esc(e.ref) + '</div>' : '') + ((e.j === 'PGT' || e.j === 'BPB') && e.ia ? '<div class="note">' + esc(arr(e.ia).join(', ')) + '</div>' : '') + chipKel(e) + '</td><td>' + tg(e.tgl) + '</td><td class="n">' + n3(e.qty) + '</td><td>' + esc(refPo(g, b)) + '</td>' +
        '<td class="n ' + warnaSel(e.sel) + '">' + (e.harga != null ? rp(e.harga) : '<span class="rk-kos">kosong</span>') + '</td><td class="n">' + (e.total != null ? rp(e.total) : '') + '</td>';
      else h += i ? '<td></td><td></td><td></td><td></td><td></td><td></td>' : '<td colspan="6"><span class="rk-kos">belum ada barang keluar</span></td>';
      if (x) h += '<td>' + esc(x.no) + (x.bersama ? '<span class="rk-chip rk-c-b" title="' + esc(x.ket || '') + '">PO bersama</span>' : '') + '</td><td>' + tg(x.tgl) + '</td><td>' + esc(x.sup || '') + '</td><td class="n">' + n3(x.qty) + '</td><td class="n ' + warnaSel(x.sel) + '">' + (x.harga != null ? rp(x.harga) : '<span class="rk-kos">kosong</span>') + '</td>' +
        '<td class="n">' + (x.bagian != null ? rp(x.bagian) : '<span class="rk-kos">' + (x.ada ? 'kosong' : 'PO Detail belum ada') + '</span>') + (x.bersama && x.bagian != null && x.total != null && Math.abs(x.bagian - x.total) > 0.5 ? '<div class="note">dari ' + rp(x.total) + '</div>' : '') + '</td>';
      else h += i ? '<td></td><td></td><td></td><td></td><td></td><td></td>' : '<td colspan="6"><span class="rk-kos">' + (b.jasa ? 'jasa/biaya' : b.sb === 'Dari stok' ? 'dari stok gudang' : 'belum ada PO') + '</span></td>';
      if (!i) {
        var sp = po.map(function (z) { return z.sel; }).filter(function (z) { return z != null; }), si = kel.map(function (z) { return z.sel; }).filter(function (z) { return z != null; });
        var mxp = sp.length ? Math.max.apply(null, sp) : null, mxi = si.length ? Math.max.apply(null, si) : null;
        var ket = kel.map(function (z) { return z.ket; }).filter(Boolean).concat(po.map(function (z) { return z.ket; }).filter(Boolean)).filter(function (v, k, a) { return a.indexOf(v) === k; });
        h += selBlok(g, b, n);
        h += '<td class="n ' + warnaSel(mxp) + '" rowspan="' + n + '">' + pc(mxp) + '</td><td class="n ' + warnaSel(mxi) + '" rowspan="' + n + '">' + pc(mxi) + '</td><td rowspan="' + n + '">' + esc(b.sb) + '</td><td rowspan="' + n + '">' + esc(b.stL || '') + '</td><td class="n" rowspan="' + n + '">' + n3(b.bersih) + '</td><td rowspan="' + n + '" style="min-width:220px">' + esc(ket.join('; ')) + '</td><td rowspan="' + n + '">' + chipMs(b) + '</td>' + (RK.blok.pyp ? '<td rowspan="' + n + '">' + chipMs2(b.ms2) + pypTeks(b) + '</td>' : '');
      }
      h += '</tr>';
    }
    return h;
  }
  function totRab(g) { var t = (g.r2 || {}).t || {}, a = []; if (t.nRab) a.push('RAB ' + t.nRab + ' barang' + (t.nilaiRab ? ', perkiraan ' + rp(t.nilaiRab) : '') + (t.rabTanpaHarga ? ' (' + t.rabTanpaHarga + ' tanpa harga)' : '')); if (t.nLebihRab) a.push(t.nLebihRab + ' melebihi RAB' + (t.nilaiLebih ? ' (' + rp(t.nilaiLebih) + ')' : '')); if (t.nLuarRab) a.push(t.nLuarRab + ' di luar RAB'); if (t.nBelumDatang) a.push(t.nBelumDatang + ' belum lengkap datang'); if (t.nKlaim) a.push(t.nKlaim + ' klaim terbuka'); return a.length ? ' &middot; ' + a.join(' &middot; ') : ''; }
  function totGrup(g) { var t = g.tot || {}; return 'Estimasi ' + rp(t.est || 0) + (t.nEstK ? ' (' + t.nEstK + ' tanpa)' : '') + ' &middot; Keluar ' + rp(t.kel || 0) + (t.nKelK ? ' (' + t.nKelK + ' tanpa harga)' : '') + ' &middot; PO ' + rp(t.po || 0) + (t.nPoK ? ' (' + t.nPoK + ' tanpa harga)' : '') + (t.pctPo != null ? ' &middot; PO/estimasi ' + String(t.pctPo).replace('.', ',') + '%' : '') + (t.pctKel != null ? ' &middot; keluar/estimasi ' + String(t.pctKel).replace('.', ',') + '%' : ''); }
  function tombolBlok() { return '<div class="rk-bl" role="group" aria-label="Blok kolom"><span class="note" style="margin:0">Blok kolom:</span>' + BLOK.map(function (x) { return '<button class="gh" data-bl="' + x[0] + '" aria-pressed="' + (!!RK.blok[x[0]]) + '" style="padding:3px 10px;font-size:12px">' + esc(x[1]) + '</button>'; }).join('') + '</div>'; }
  function garisTeks(g) { var w = (g.r2 || {}).garis || {}, a = []; if (w.lama != null) a.push('berjalan ' + w.lama + ' hari'); if (w.po1) a.push('PO pertama ' + tg(w.po1)); if (w.bpb1) a.push('BPB pertama ' + tg(w.bpb1)); if (w.bpbN && w.bpbN !== w.bpb1) a.push('BPB terakhir ' + tg(w.bpbN)); if (w.terimaN) a.push('tiba terakhir ' + tg(w.terimaN)); if (w.mulai) a.push('mulai ' + tg(w.mulai)); if (w.rencana) a.push('rencana selesai ' + tg(w.rencana) + (w.lewat ? ' <span style="color:#c0392b">(lewat ' + w.lewat + ' hari)</span>' : '')); return a.join(' &middot; '); }
  function vBarang(v, H) {
    var G = H.slice(0, RK.lim), KL = kol(), h = tombolBlok() + '<div class="rk-wrap"><table class="rk-tb" style="min-width:' + (1700 + (KL - KOL) * 85) + 'px">' + kepala() + '<tbody>';
    G.forEach(function (o, gi) {
      var g = o.g, gid = (RK.res.ppbj || []).indexOf(g);
      var lkL = lkKurang(g);
      h += '<tr class="rk-g"><td class="rk-st">' + esc(g.no) + '<div class="note">' + tg(g.tgl) + '</div></td><td colspan="' + (KL - 1) + '">' + chipSt(g) + ' ' + esc(g.proyek || '(nama proyek belum ada)') + (g.dept ? ' &middot; ' + esc(g.dept) : '') + (g.stProyek ? ' &middot; ' + esc(g.stProyek) : '') + (arr(g.ms).length ? ' <span class="rk-chip rk-c-y">' + esc(MS('tanpaIr')) + '</span>' : '') +
        ' <button class="gh" data-rg="' + gid + '" style="padding:1px 8px;font-size:12px">Ringkasan proyek</button>' + (o.b.length < arr(g.b).length ? ' <span class="note">(' + o.b.length + ' dari ' + arr(g.b).length + ' barang sesuai saringan)</span>' : '') +
        '<div class="note">' + garisTeks(g) + (arr((g.r2 || {}).alasan).length ? ' &middot; ' + esc(g.r2.alasan.join('; ')) : '') + (lkL.length ? ' &middot; <span style="color:#b9770e">Belum lengkap: ' + esc(lkL.join(', ')) + '</span>' : '') + '</div></td></tr>';
      o.b.forEach(function (b) { h += barisBarang(g, b, gid, arr(g.b).indexOf(b)); });
      if (RK.blok.ang && o.b.length === arr(g.b).length && !RK.ms) arr(g.rabLain).forEach(function (x) { h += barisRab(g, x); });
      h += '<tr class="rk-t"><td class="rk-st">TOTAL ' + esc(g.no) + '</td><td colspan="' + (KL - 1) + '">' + totGrup(g) + totRab(g) + '</td></tr>';
    });
    h += '</tbody></table></div>' + (H.length > RK.lim ? '<div class="fr" style="margin-top:8px"><button class="gh" id="rkLagi">Tampilkan ' + Math.min(40, H.length - RK.lim) + ' PPBJ lagi (' + (H.length - RK.lim) + ' tersisa)</button></div>' : '');
    v.innerHTML = h; pasang(v);
  }
  function kartuTambah(b) {
    var a = [], x = b.ang, t = b.trm, s0 = b.stk;
    if (x) a.push('RAB ' + (x.rab > 0 ? n3(x.rab) : 'tidak ada') + ', sisa RAB ' + n3(x.sisaRab || 0) + (x.lebih ? ', lebih ' + n3(x.lebih) : ''));
    if (t) a.push('dipesan ' + n3(t.dipesan || 0) + ', datang ' + n3(t.datang || 0) + (t.sisa != null ? ', sisa ' + n3(t.sisa) : '') + (t.riBelum ? ' (RI belum terbaca)' : '') + (t.klaim ? ', ' + t.klaim + ' klaim terbuka' : '') + (t.tpl ? ' (dari template)' : ''));
    if (b.pyp) a.push('keterangan: ' + b.pyp.ket + (b.pyp.setuju ? ' (disetujui ' + b.pyp.setuju + ')' : ''));
    if (s0) a.push('stok bebas ' + n3(s0.bebas || 0) + ' (' + (s0.st === 'Rebutan' ? 'Stok terbatas' : (s0.st || '-')) + ')' + (s0.order ? ', ' + s0.order : ''));
    return (a.length ? '<div class="d">' + esc(a.join(' \u00b7 ')) + '</div>' : '') + (arr(b.ms2).length ? '<div>' + chipMs2(b.ms2) + '</div>' : '');
  }
  function vKartu(v, H) {
    var h = '';
    H.slice(0, RK.lim).forEach(function (o) {
      var g = o.g, gid = (RK.res.ppbj || []).indexOf(g), t = g.tot || {};
      h += '<details class="rk-kt"><summary>' + chipSt(g) + ' <b>' + esc(g.no) + '</b> &middot; ' + esc(g.proyek || '-') + '<div class="note">' + tg(g.tgl) + (g.dept ? ' &middot; ' + esc(g.dept) : '') + ' &middot; ' + o.b.length + ' barang &middot; estimasi ' + rp(t.est || 0) + ' &middot; keluar ' + rp(t.kel || 0) + ' &middot; PO ' + rp(t.po || 0) + '</div></summary>';
      o.b.forEach(function (b) {
        var nk = arr(b.kel).length, np = arr(b.po).length;
        h += '<div class="rk-kb"><button class="rk-bar" data-cg="' + gid + '" data-cb="' + arr(g.b).indexOf(b) + '">' + esc(b.nama || b.kode) + '</button> ' + chipMs(b) +
          '<div class="d">Diminta ' + (b.ir ? n3(b.ir.qty) + ' ' + esc(b.sat || '') + ' (' + (b.ir.harga != null ? rp(b.ir.harga) : 'tanpa estimasi') + ')' : '-') + ' &middot; keluar bersih ' + n3(b.bersih) + ' (' + nk + ' baris) &middot; ' + np + ' PO &middot; ' + esc(b.sb) + '</div>' + kartuTambah(b) + '</div>';
      });
      h += '<div class="rk-kb"><button class="gh" data-rg="' + gid + '">Ringkasan proyek</button></div></details>';
    });
    h += (H.length > RK.lim ? '<button class="gh" id="rkLagi">Tampilkan lagi (' + (H.length - RK.lim) + ' tersisa)</button>' : '') + '<div class="note">Tabel lengkap tersedia di Excel (tombol Unduh Excel).</div>';
    v.innerHTML = h; pasang(v);
  }
  function selPpbj(g) {
    var r = g.r2 || {}, t = r.t || {}, lk = r.lk || {};
    return '<td>' + chipSt(g) + (arr(r.alasan).length ? '<div class="note">' + esc(r.alasan.join('; ')) + '</div>' : '') + '</td><td class="n">' + (lk.rab === false ? kos('belum ada') : (t.nRab || '')) + '</td><td class="n">' + (t.nilaiRab ? rp(t.nilaiRab) : '') + (t.rabTanpaHarga ? '<div class="note">' + t.rabTanpaHarga + ' tanpa harga</div>' : '') + '</td>' +
      '<td class="n' + (t.nLebihRab ? ' rk-r' : '') + '">' + (t.nLebihRab || '') + (t.nilaiLebih ? '<div class="note">' + rp(t.nilaiLebih) + '</div>' : '') + '</td><td class="n' + (t.nLuarRab ? ' rk-y' : '') + '">' + (t.nLuarRab || '') + '</td><td class="n' + (t.nKurangBelum ? ' rk-r' : '') + '">' + (t.nKurangBelum || '') + '</td><td class="n">' + (t.nBelumDatang || '') + (t.nPoLama ? '<div class="note">' + t.nPoLama + ' lewat ' + ((RK.res && RK.res.poLamaHari) || 30) + ' hari</div>' : '') + '</td><td class="n">' + (t.nKlaim || '') + '</td>' +
      '<td style="min-width:200px">' + garisTeks(g) + '</td><td style="min-width:180px">' + esc(lkTeks(g)) + '</td>';
  }
  function vPpbj(v, H) {
    var h = '<div class="rk-wrap"><table class="rk-tb" style="min-width:2200px"><thead><tr><th class="bA rk-st">No PPBJ</th><th class="bA">Tgl</th><th class="bA">Proyek</th><th class="bA">Departemen</th><th class="bA n">Barang</th><th class="bA n">Total estimasi</th><th class="bB n">Total keluar gudang</th><th class="bC n">Total PO/SPK</th><th class="bD n">PO / estimasi</th><th class="bD n">Keluar / estimasi</th><th class="bD n">Tanpa harga</th><th class="bD n">Bermasalah</th><th class="bH">Status proyek</th><th class="bE n">RAB (barang)</th><th class="bE n">Nilai RAB (perkiraan)</th><th class="bH n">Melebihi RAB</th><th class="bH n">Di luar RAB</th><th class="bG n">Kurang belum diorder</th><th class="bF n">Belum lengkap datang</th><th class="bF n">Klaim terbuka</th><th class="bA">Garis waktu</th><th class="bA">Kelengkapan data</th><th class="bD"></th></tr></thead><tbody>';
    H.forEach(function (o) {
      var g = o.g, t = jumlah([o]), gid = (RK.res.ppbj || []).indexOf(g);
      h += '<tr' + (t.nMs ? ' class="rk-m"' : '') + '><td class="rk-st">' + esc(g.no) + '</td><td>' + tg(g.tgl) + '</td><td>' + esc(g.proyek || '') + '</td><td>' + esc(g.dept || '') + '</td><td class="n">' + t.nB + '</td><td class="n">' + rp(t.est) + '</td><td class="n">' + rp(t.kel) + '</td><td class="n">' + rp(t.po) + '</td>' +
        '<td class="n">' + (t.est > 0 ? String(Math.round(t.po / t.est * 1000) / 10).replace('.', ',') + '%' : '') + '</td><td class="n">' + (t.est > 0 ? String(Math.round(t.kel / t.est * 1000) / 10).replace('.', ',') + '%' : '') + '</td><td class="n">' + (t.nEstK + t.nKelK + t.nPoK || '') + '</td><td class="n">' + (t.nMs || '') + '</td>' + selPpbj(g) +
        '<td><button class="gh" data-rg="' + gid + '" style="padding:1px 8px;font-size:12px">Ringkasan</button> <button class="gh" data-rq="' + esc(g.no) + '" style="padding:1px 8px;font-size:12px">Per barang</button></td></tr>';
    });
    var T = jumlah(H);
    h += '<tr class="rk-t"><td class="rk-st">TOTAL</td><td colspan="3">' + T.nG + ' PPBJ</td><td class="n">' + T.nB + '</td><td class="n">' + rp(T.est) + '</td><td class="n">' + rp(T.kel) + '</td><td class="n">' + rp(T.po) + '</td><td colspan="15"></td></tr></tbody></table></div>';
    v.innerHTML = h; pasang(v);
  }
  function grupVendor(H) {
    var V = {};
    H.forEach(function (o) { o.b.forEach(function (b) { arr(b.po).forEach(function (x) {
      var k = x.sup || '(vendor belum terbaca)', w = V[k] || (V[k] = {sup: k, po: {}, n: 0, nilai: 0, nK: 0, L: []});
      w.po[x.no] = 1; w.n++; if (x.bagian != null) w.nilai += x.bagian; else w.nK++;
      w.L.push({g: o.g, b: b, x: x});
    }); }); });
    return Object.keys(V).map(function (k) { return V[k]; }).sort(function (a, c) { return c.nilai - a.nilai; });
  }
  function vVendor(v, H) {
    var L = grupVendor(H);
    if (!L.length) { v.innerHTML = '<div class="card msg">Belum ada PO pada saringan ini.</div>'; return; }
    var h = '<div class="note">Diurutkan dari nilai PO terbesar. Nilai = bagian PPBJ ini (PO bersama dibagi menurut Ordered Qty Item Requisition).</div>';
    L.forEach(function (w) {
      var mr = w.L.filter(function (z) { return z.x.sel != null && z.x.sel >= bt().k; }).length;
      h += '<details class="rk-kt"><summary><b>' + esc(w.sup) + '</b> &middot; ' + Object.keys(w.po).length + ' PO &middot; ' + w.n + ' baris &middot; ' + rp(w.nilai) + (w.nK ? ' (' + w.nK + ' tanpa harga)' : '') + (mr ? ' <span class="rk-chip rk-c-r">' + mr + ' di atas estimasi</span>' : '') + '</summary><div class="rk-wrap" style="max-height:50vh;border:0"><table class="rk-tb" style="min-width:900px"><thead><tr><th class="bC">No PO/SPK</th><th class="bC">Tgl PO</th><th class="bA">No PPBJ</th><th class="bA">Proyek</th><th class="bA">Barang</th><th class="bC n">Qty</th><th class="bC n">Harga satuan</th><th class="bA n">Estimasi</th><th class="bD n">Selisih</th><th class="bC n">Nilai</th></tr></thead><tbody>' +
        w.L.sort(function (a, c) { return (c.x.tgl || '') < (a.x.tgl || '') ? -1 : 1; }).map(function (z) { return '<tr><td>' + esc(z.x.no) + '</td><td>' + tg(z.x.tgl) + '</td><td>' + esc(z.g.no) + '</td><td>' + esc(z.g.proyek || '') + '</td><td>' + esc(z.b.nama) + '</td><td class="n">' + n3(z.x.qty) + '</td><td class="n">' + rp(z.x.harga) + '</td><td class="n">' + (z.b.ir && z.b.ir.harga != null ? rp(z.b.ir.harga) : '') + '</td><td class="n ' + warnaSel(z.x.sel) + '">' + pc(z.x.sel) + '</td><td class="n">' + rp(z.x.bagian) + '</td></tr>'; }).join('') + '</tbody></table></div></details>';
    });
    v.innerHTML = h;
  }
  /** Daftar kerja dari rekap yang sedang disaring. */
  function tindak(H) {
    var L = [];
    H.forEach(function (o) { var g = o.g; o.b.forEach(function (b) {
      arr(b.kel).forEach(function (e) {
        if (e.ms === 'bpbBelum') L.push({j: 'IA lama belum ada BPB (buat BPB Pengganti)', no: e.no, tgl: e.tgl, g: g, b: b, qty: e.qty, nilai: e.total, ket: e.ket});
        else if (e.ms === 'bpbTak') L.push({j: 'IA tanpa BPB', no: e.no, tgl: e.tgl, g: g, b: b, qty: e.qty, nilai: e.total, ket: e.ket});
        else if (e.ms === 'iaBelum') L.push({j: 'BPB belum ada IA', no: e.no, tgl: e.tgl, g: g, b: b, qty: e.qty, nilai: null, ket: e.ket});
        else if (e.ms === 'iaNomor') L.push({j: 'Sudah di tab Accurate, nomor IA belum diisi', no: e.no, tgl: e.tgl, g: g, b: b, qty: e.qty, nilai: null, ket: e.ket});
        else if (e.ms === 'iaUnggah') L.push({j: 'IA dicatat, unggah ulang Penyesuaian Stok', no: e.no, tgl: e.tgl, g: g, b: b, qty: e.qty, nilai: null, ket: e.ket});
        else if (e.ms === 'iaLebih') L.push({j: 'Ada di IA, tidak ada di BPB', no: e.no, tgl: e.tgl, g: g, b: b, qty: e.qty, nilai: e.total, ket: e.ket});
        else if (e.ms === 'iaBeda') L.push({j: 'IA tertaut tidak memuat barang ini', no: e.no, tgl: e.tgl, g: g, b: b, qty: e.qty, nilai: null, ket: e.ket});
      });
      if (arr(b.ms).indexOf('belumOrder') >= 0) L.push({j: 'Stok kurang, belum diorder', no: g.no, tgl: g.tgl, g: g, b: b, qty: b.ir ? b.ir.qty : null, nilai: b.ir ? b.ir.total : null, ket: b.stL});
      var a2 = b.ang || {}, t2 = b.trm || {}, s2 = b.stk || {};
      if (arr(b.ms2).indexOf('lebihRab') >= 0) L.push({j: 'Keluar melebihi RAB', no: g.no, tgl: g.tgl, g: g, b: b, qty: a2.lebih, nilai: a2.harga != null && a2.lebih ? Math.round(a2.harga * a2.lebih) : null, ket: 'RAB ' + n3(a2.rab) + ', keluar bersih gudang ' + n3(a2.bersih)});
      if (arr(b.ms2).indexOf('luarRab') >= 0) L.push({j: 'Keluar di luar RAB', no: g.no, tgl: g.tgl, g: g, b: b, qty: a2.bersih, nilai: null, ket: 'Barang tidak ada di Kebutuhan Proyek PPBJ ini'});
      if (arr(b.ms2).indexOf('kurangBelum') >= 0) L.push({j: 'Stok kurang (Cek Material), belum diorder', no: g.no, tgl: g.tgl, g: g, b: b, qty: s2.kurang, nilai: null, ket: 'Stok bebas ' + n3(s2.bebas) + ', sisa kebutuhan ' + n3(a2.sisa)});
      if (arr(b.ms2).indexOf('klaim') >= 0) L.push({j: 'Klaim vendor masih terbuka', no: g.no, tgl: t2.tgl, g: g, b: b, qty: (t2.rusak || 0) + (t2.salah || 0), nilai: null, ket: [t2.rusak ? 'rusak ' + n3(t2.rusak) : '', t2.salah ? 'salah kirim ' + n3(t2.salah) : ''].filter(String).join(', ')});
      if (arr(b.ms2).indexOf('poLama') >= 0) L.push({j: 'Pesanan belum lengkap datang > ' + ((RK.res && RK.res.poLamaHari) || 30) + ' hari', no: arr(b.po).map(function (x) { return x.no; }).join(', '), tgl: (arr(b.po)[0] || {}).tgl, g: g, b: b, qty: t2.sisa, nilai: null, ket: 'Dipesan ' + n3(t2.dipesan) + ', datang ' + n3(t2.datang) + ', umur PO ' + t2.umur + ' hari'});
      if (arr(b.ms).indexOf('lebih') >= 0) L.push({j: 'Keluar melebihi qty PPBJ', no: g.no, tgl: g.tgl, g: g, b: b, qty: b.bersih, nilai: null, ket: 'Diminta ' + (b.ir ? n3(b.ir.qty) : '-') + ', keluar bersih ' + n3(b.bersih)});
    });
      if (!RK.q && !RK.sb && !RK.ms && o.b.length === arr(g.b).length) arr(g.rabLain).forEach(function (x) { if (arr(x.ms2).indexOf('kurangBelum') >= 0) L.push({j: 'Stok kurang (Cek Material), belum diorder', no: g.no, tgl: g.tgl, g: g, b: {kode: x.kode, nama: x.nama}, qty: (x.stk || {}).kurang, nilai: null, ket: 'Hanya di RAB, belum diminta. Stok bebas ' + n3((x.stk || {}).bebas)}); });
    });
    if (!RK.q && !RK.dept && !RK.sb && !RK.ms) (RK.res.poTanpa || []).forEach(function (p) { L.push({j: 'PO tidak tertaut PPBJ', no: p.no, tgl: p.tgl, g: null, b: null, qty: null, nilai: p.nilai, ket: (p.sup || '') + ' (' + arr(p.items).length + ' barang)'}); });
    return L;
  }
  function vTindak(v, H, L) {
    if (!L.length) { v.innerHTML = '<div class="card msg">Tidak ada yang perlu ditindak pada saringan ini.</div>'; return; }
    var J = {}; L.forEach(function (x) { (J[x.j] = J[x.j] || []).push(x); });
    var h = '<div class="note">Daftar kerja dari rekap ini. Lembar yang sama ada di Excel ("Perlu ditindak").' + (RK.q || RK.dept || RK.sb || RK.ms ? ' PO tanpa PPBJ hanya tampil bila saringan kosong.' : '') + '</div>';
    Object.keys(J).forEach(function (k) {
      var A = J[k];
      h += '<details class="rk-kt"' + (Object.keys(J).length === 1 ? ' open' : '') + '><summary><b>' + esc(k) + '</b> (' + A.length + ')</summary><div class="rk-wrap" style="max-height:50vh;border:0"><table class="rk-tb" style="min-width:900px"><thead><tr><th class="bD">No dokumen</th><th class="bD">Tgl</th><th class="bA">No PPBJ</th><th class="bA">Proyek</th><th class="bA">Barang</th><th class="bD n">Qty</th><th class="bD n">Nilai</th><th class="bD">Keterangan</th></tr></thead><tbody>' +
        A.slice(0, 500).map(function (x) { return '<tr><td>' + esc(x.no) + '</td><td>' + tg(x.tgl) + '</td><td>' + esc(x.g ? x.g.no : '') + '</td><td>' + esc(x.g ? x.g.proyek || '' : '') + '</td><td>' + esc(x.b ? x.b.nama : '') + '</td><td class="n">' + n3(x.qty) + '</td><td class="n">' + rp(x.nilai) + '</td><td>' + esc(x.ket || '') + '</td></tr>'; }).join('') + '</tbody></table></div>' + (A.length > 500 ? '<div class="note">500 pertama; semua ada di Excel.</div>' : '') + '</details>';
    });
    v.innerHTML = h;
  }
  function pasang(v) {
    v.querySelectorAll('[data-cg]').forEach(function (b) { b.onclick = function () { var g = RK.res.ppbj[+b.getAttribute('data-cg')]; cerita(g, arr(g.b)[+b.getAttribute('data-cb')]); }; });
    v.querySelectorAll('[data-rg]').forEach(function (b) { b.onclick = function () { ringkasan(RK.res.ppbj[+b.getAttribute('data-rg')]); }; });
    v.querySelectorAll('[data-rq]').forEach(function (b) { b.onclick = function () { RK.q = b.getAttribute('data-rq'); RK.v = 'barang'; var q = el.querySelector('#rkQ'); if (q) q.value = RK.q; isi(); }; });
    v.querySelectorAll('[data-bl]').forEach(function (b) { b.onclick = function () { var k = b.getAttribute('data-bl'); RK.blok[k] = RK.blok[k] ? 0 : 1; simpanBlok(); var y = root.scrollY; isi(); root.scrollTo(0, y); }; });
    var lg = v.querySelector('#rkLagi'); if (lg) lg.onclick = function () { RK.lim += 40; var y = root.scrollY; isi(); root.scrollTo(0, y); };
  }
  /* ---------- satu barang, satu cerita ---------- */
  function peristiwa(g, b) {
    var E = [], ir = b.ir;
    if (ir) E.push({t: g.tgl, c: '', h: 'PPBJ dibuat di Accurate (Item Requisition)', d: 'Diminta ' + n3(ir.qty) + ' ' + (b.sat || '') + (ir.harga != null ? ', estimasi ' + rp(ir.harga) + ' per satuan (total ' + rp(ir.total) + ')' : ', tanpa harga estimasi') + (ir.oqty > 0 ? '. Ordered Qty ' + n3(ir.oqty) : '. Ordered Qty 0')});
    else E.push({t: g.tgl, c: 'l', h: 'Barang ini tidak ada di Item Requisition PPBJ ' + g.no, d: ''});
    arr(b.po).forEach(function (x) { E.push({t: x.tgl, c: x.sel != null && x.sel >= bt().m ? 'r' : '', h: 'PO/SPK ' + x.no + (x.sup ? ' ke ' + x.sup : ''), d: x.qty != null ? n3(x.qty) + ' ' + (b.sat || '') + ' x ' + rp(x.harga) + ' = ' + rp(x.total) + (x.sel != null ? ' (' + pc(x.sel) + ' dari estimasi)' : '') + (x.bersama ? '. ' + (x.ket || 'PO bersama') : '') : (x.ket || 'PO Detail belum diunggah')}); });
    arr(b.ri).forEach(function (x) { E.push({t: x.tgl, c: 'g', h: 'Barang datang: ' + x.no + ' (PO ' + x.po + ')', d: x.qty != null ? n3(x.qty) + ' ' + (b.sat || '') : 'Jumlah dan tanggal belum terbaca (unggah Mutasi per Gudang)'}); });
    arr(b.kel).forEach(function (e) {
      var h = e.j === 'BPB' ? 'Keluar lewat BPB ' + e.no : e.j === 'PGT' ? 'BPB Pengganti ' + e.no : e.j === 'PK' ? 'Dikembalikan lewat ' + e.no : e.j === 'IAM' ? 'IA masuk ' + e.no : e.j === 'IAX' ? 'Tercatat di ' + e.no + ' (tidak ada di BPB ' + (e.ref || '') + ')' : 'Tercatat di ' + e.no + ' tanpa BPB';
      E.push({t: e.tgl, c: e.ms && e.ms !== 'perkiraan' ? 'r' : e.j === 'PK' ? 'g' : '', h: h, d: n3(e.qty) + ' ' + (b.sat || '') + (e.harga != null ? ' x ' + rp(e.harga) + ' = ' + rp(e.total) : ', harga kosong') + (e.ket ? '. ' + e.ket : '')});
      if (e.j === 'BPB' && e.ia && e.iaTgl && e.iaTgl !== e.tgl) E.push({t: e.iaTgl, c: '', h: 'IA dibuat di Accurate: ' + arr(e.ia).join(', '), d: 'Untuk BPB ' + e.no + (e.cara === 'perkiraan' ? ' (dicocokkan perkiraan)' : '')});
    });
    E.sort(function (a, c) { return (a.t || '9') < (c.t || '9') ? -1 : (a.t || '9') > (c.t || '9') ? 1 : 0; });
    return E;
  }
  function cerita(g, b) {
    if (!g || !b) return;
    var E = peristiwa(g, b), h = '<div class="rk-md" id="rkMd" role="dialog" aria-modal="true" aria-label="Cerita barang"><div class="rk-mdb"><div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><div><b>' + esc(b.nama || b.kode) + '</b> <span class="note">' + esc(b.kode) + '</span><div class="note">PPBJ ' + esc(g.no) + ' &middot; ' + esc(g.proyek || '-') + (g.dept ? ' &middot; ' + esc(g.dept) : '') + '</div></div><button class="gh" id="rkTutup">Tutup</button></div>' +
      '<div class="note" style="margin-top:6px">Sekarang: <b>' + esc(b.stL || b.sb) + '</b> &middot; sumber ' + esc(b.sb) + ' &middot; keluar bersih ' + n3(b.bersih) + ' ' + esc(b.sat || '') + (b.ir ? ' dari ' + n3(b.ir.qty) + ' diminta' : '') + '</div>' + (arr(b.ms).length ? '<div style="margin-top:4px">' + chipMs(b) + '</div>' : '') + (kartuTambah(b) ? '<div class="note" style="margin-top:4px">' + kartuTambah(b) + '</div>' : '') + '<ul class="rk-tl">';
    var prev = '';
    E.forEach(function (e) {
      if (prev && e.t) { var d = hari(prev, e.t); if (d != null && d > 0) h += '<div class="gap">+' + d + ' hari</div>'; }
      h += '<li class="' + e.c + '"><div><b>' + (e.t ? tg(e.t) : 'Tanggal belum terbaca') + '</b> &middot; ' + esc(e.h) + '</div>' + (e.d ? '<div class="d">' + esc(e.d) + '</div>' : '') + '</li>';
      if (e.t) prev = e.t;
    });
    h += '</ul><div class="note">Disusun dari data Accurate yang diunggah dan transaksi sistem gudang. Tanggal penerimaan (RI) terbaca bila Mutasi per Gudang sudah diunggah.</div></div></div>';
    var w = document.createElement('div'); w.innerHTML = h; document.body.appendChild(w.firstChild);
    var md = document.getElementById('rkMd'), tutup = function () { if (md && md.parentNode) md.parentNode.removeChild(md); document.removeEventListener('keydown', esk); };
    function esk(ev) { if (ev.key === 'Escape') tutup(); }
    md.onclick = function (ev) { if (ev.target === md) tutup(); }; document.getElementById('rkTutup').onclick = tutup; document.addEventListener('keydown', esk);
    try { document.getElementById('rkTutup').focus(); } catch (e) { /* abaikan */ }
  }
  /* ---------- ringkasan satu halaman per proyek ---------- */
  function ringkasan(g) {
    if (!g) return;
    var t = jumlah([{g: g, b: arr(g.b)}]), nm = arr(g.b).filter(bermasalah);
    var w = root.open('', '_blank'); if (!w) { toast('Jendela baru diblokir peramban. Izinkan pop-up untuk halaman ini.', true); return; }
    var baris = arr(g.b).map(function (b) {
      var nP = arr(b.po).reduce(function (s, x) { return s + (x.bagian || 0); }, 0), nK = arr(b.kel).reduce(function (s, e) { return s + (e.total || 0); }, 0);
      var kK = arr(b.kel).filter(function (e) { return e.total == null; }).length, pK = arr(b.po).filter(function (x) { return x.bagian == null; }).length;
      var sel = function (L, kos, nil) { return !L.length ? '' : kos === L.length ? '<i>kosong</i>' : rp(nil) + (kos ? '<br><i>' + kos + ' tanpa harga</i>' : ''); };
      return '<tr><td>' + esc(b.nama) + '</td><td class="n">' + (b.ir ? n3(b.ir.qty) : '-') + ' ' + esc(b.sat || '') + '</td><td class="n">' + (b.ir && b.ir.total > 0 ? rp(b.ir.total) : (b.ir ? '<i>kosong</i>' : '')) + '</td><td class="n">' + n3(b.bersih) + '</td><td class="n">' + sel(arr(b.kel), kK, nK) + '</td><td class="n">' + sel(arr(b.po), pK, nP) + '</td><td>' + esc(b.sb) + '</td></tr>';
    }).join('');
    var css = 'body{font:12px Arial,sans-serif;color:#17202a;margin:18px}h1{font-size:17px;margin:0}h2{font-size:13px;margin:14px 0 4px}.k{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:10px 0}.k div{border:1px solid #aab;border-radius:6px;padding:6px}.k b{display:block;font-size:15px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccd;padding:3px 5px;text-align:left}th{background:#d6eaf8}.n{text-align:right;white-space:nowrap}.c{font-size:10.5px;color:#555;margin-top:10px}@media print{button{display:none}}';
    var html = '<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>Ringkasan ' + esc(g.no) + '</title><style>' + css + '</style></head><body><button onclick="print()">Cetak / simpan PDF</button>' +
      '<h1>Ringkasan Proyek: ' + esc(g.proyek || '-') + '</h1><div>PPBJ ' + esc(g.no) + ' &middot; ' + tg(g.tgl) + (g.dept ? ' &middot; ' + esc(g.dept) : '') + (g.stProyek ? ' &middot; ' + esc(g.stProyek) : '') + '</div>' +
      '<div class="k"><div><b>' + rp(t.est) + '</b>Total estimasi PPBJ' + (t.nEstK ? ' (' + t.nEstK + ' tanpa estimasi)' : '') + '</div><div><b>' + rp(t.kel) + '</b>Barang gudang keluar' + (t.nKelK ? ' (' + t.nKelK + ' baris tanpa harga)' : '') + '</div><div><b>' + rp(t.po) + '</b>PO/SPK' + (t.nPoK ? ' (' + t.nPoK + ' tanpa harga)' : '') + '</div><div><b>' + t.nMs + '</b>barang bermasalah dari ' + t.nB + '</div></div>' +
      (t.est > 0 ? '<div>PO terhadap estimasi: <b>' + String(Math.round(t.po / t.est * 1000) / 10).replace('.', ',') + '%</b> &middot; barang keluar terhadap estimasi: <b>' + String(Math.round(t.kel / t.est * 1000) / 10).replace('.', ',') + '%</b> (dua angka ini terpisah, tidak dijumlahkan, karena barang PO yang masuk gudang lalu keluar akan terhitung dua kali).</div>' : '') +
      '<h2>Barang dan jasa</h2><table><thead><tr><th>Barang/jasa</th><th class="n">Diminta</th><th class="n">Estimasi</th><th class="n">Keluar bersih</th><th class="n">Nilai keluar</th><th class="n">Nilai PO</th><th>Sumber</th></tr></thead><tbody>' + baris + '</tbody></table>' +
      (nm.length ? '<h2>Perlu diperhatikan</h2><ul>' + nm.slice(0, 30).map(function (b) { return '<li>' + esc(b.nama) + ': ' + arr(b.ms).filter(function (m) { return !INFO[m]; }).map(function (m) { return esc(MS(m)); }).join(', ') + '</li>'; }).join('') + '</ul>' + (nm.length > 30 ? '<div>dan ' + (nm.length - 30) + ' barang lain (lihat Excel).</div>' : '') : '<h2>Perlu diperhatikan</h2><div>Tidak ada.</div>') +
      '<div class="c">Sumber: data Accurate yang diunggah (Item Requisition, PO Detail, Penyesuaian Stok) dan transaksi sistem gudang. Barang tanpa harga tidak dihitung nol. Data per ' + esc(RK.res.waktu) + '.</div></body></html>';
    w.document.open(); w.document.write(html); w.document.close();
  }
  /* ---------- Excel ---------- */
  function muatJSZip() { if (root.JSZip) return Promise.resolve(root.JSZip); return new Promise(function (ok, no) { var s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'; s.onload = function () { ok(root.JSZip); }; s.onerror = function () { no(new Error('JSZip gagal dimuat. Periksa internet.')); }; document.head.appendChild(s); }); }
  function kosong(v) { return v == null ? '' : v; }
  /** Buku Excel bergaya dari hasil saringan. Dipisah supaya bisa diuji tanpa peramban. */
  RK.buku = function (H, res, saringKet) {
    var XT = root.XT, wb = XT.buku(), RPF = '#,##0', QF = '#,##0.###', PF = '0.0"%"';
    var gH = function (fill) { return {font: {b: true, sz: 9}, fill: fill, border: {l: true, r: true, t: true, b: true}, al: {h: 'center', v: 'center', wrap: true}}; };
    var A = 'D6EAF8', B = 'D5F5E3', Cc = 'FDEBD0', Dd = 'EAECEE';
    var sel = function (fmt, fill, b) { var g = {border: {l: true, r: true, t: true, b: true}, al: {v: 'top', wrap: true}, font: {sz: 9}}; if (fmt) g.fmt = fmt; if (fill) g.fill = fill; if (b) g.font.b = true; return g; };
    var s = wb.sheet('Rekap', {warna: '1A6CAB'});
    var COL = ['No PPBJ', 'Tgl PPBJ', 'Nama Proyek', 'Departemen', 'Nama Barang/Jasa', 'Kode', 'Satuan', 'Qty PPBJ', 'Harga Satuan (estimasi)', 'Total Harga (estimasi)',
      'No BPB', 'Penanda', 'Tgl Keluar', 'Jumlah Keluar', 'No PO / No PPBJ', 'Harga Satuan Stok (IA)', 'Total Harga', 'No IA',
      'No PO/SPK', 'Tgl PO', 'Nama Vendor', 'Qty PO', 'Harga Satuan PO', 'Total Harga PO (bagian PPBJ ini)',
      'Selisih PO vs Estimasi', 'Selisih Stok vs PO', 'Sumber', 'Status Order', 'Keterangan', 'Masalah', 'Jenis Baris',
      'RAB', 'Keluar Bersih Gudang', 'Dialokasikan', 'Sisa RAB', 'Sisa Kebutuhan', 'Lebih dari RAB',
      'Dipesan', 'Sumber Pesanan', 'Datang (catatan gudang)', 'RI Accurate', 'Sisa Belum Datang', 'Tiba Terakhir', 'Rusak', 'Salah Kirim', 'Klaim Terbuka', 'Dokumen Penerimaan',
      'Stok Bebas', 'Status Stok', 'Kurang', 'Status Order (Cek Material)', 'Perkiraan Tiba', 'Bersaing Dengan', 'Penyimpangan', 'Status Proyek',
      'Harga Perkiraan RAB', 'Sumber Data Susulan', 'Keterangan Penyimpangan'];
    var W = [18, 10, 30, 12, 34, 14, 8, 9, 14, 15, 18, 16, 10, 10, 18, 14, 15, 18, 18, 10, 24, 9, 14, 16, 10, 10, 14, 22, 40, 30, 9, 9, 11, 10, 9, 10, 9, 9, 14, 11, 9, 10, 10, 8, 8, 8, 20, 9, 10, 8, 22, 10, 22, 34, 14, 14, 26, 40];
    var E5 = 'E8DAEF', F5 = 'D1F2EB', G5 = 'FCF3CF', H5 = 'FADBD8';
    var NUM2 = {32: 1, 33: 1, 34: 1, 35: 1, 36: 1, 37: 1, 38: 1, 40: 1, 41: 1, 42: 1, 44: 1, 45: 1, 46: 1, 48: 1, 50: 1, 56: 1};
    var ext = function (g, b) {
      var a = b.ang || {}, t = b.trm || {}, k = b.stk || {}, A0 = !!b.ang, T0 = !!b.trm, K0 = !!b.stk;
      return [A0 ? kosong(a.rab) : '', A0 ? kosong(a.bersih) : '', A0 ? kosong(a.alok) : '', A0 ? kosong(a.sisaRab) : '', A0 ? kosong(a.sisa) : '', A0 && a.lebih ? a.lebih : '',
        T0 ? kosong(t.dipesan) : '', T0 ? t.sumber || '' : '', T0 ? kosong(t.gudang) : '', T0 ? (t.riBelum ? 'belum terbaca' : kosong(t.ri)) : '', T0 ? kosong(t.sisa) : '', T0 ? tg(t.tgl) : '', T0 && t.rusak ? t.rusak : '', T0 && t.salah ? t.salah : '', T0 && t.klaim ? t.klaim : '', T0 ? arr(t.dok).join(', ') : '',
        K0 ? kosong(k.bebas) : '', K0 ? (k.st === 'Rebutan' ? 'Stok terbatas' : k.st || '') : '', K0 && k.kurang ? k.kurang : '', K0 ? k.order || '' : '', K0 ? tg(k.eta) : '', K0 ? arr(k.lain).join(', ') : '', arr(b.ms2).map(MS2).join('; '), (g.r2 || {}).status || '',
        A0 && a.harga != null ? a.harga : '', [A0 && a.hargaTpl ? 'harga dari template' : '', T0 && t.tpl ? 'penerimaan dari template (' + tg(t.tpl.tgl) + (t.tpl.ket ? ', ' + t.tpl.ket : '') + ')' : '', T0 && t.tplAbaikan ? 'template penerimaan diabaikan (ada catatan resmi)' : ''].filter(String).join('; '), b.pyp ? b.pyp.ket + (b.pyp.setuju ? ' (disetujui ' + b.pyp.setuju + ')' : '') : ''];
    };
    var blok = function (c) { return c <= 10 ? A : c <= 18 ? B : c <= 24 ? Cc : c <= 31 ? Dd : c <= 37 ? E5 : c <= 47 ? F5 : c <= 53 ? G5 : H5; };
    s.set(1, 1, 'REKAP PPBJ: PERMINTAAN, BARANG GUDANG KELUAR, DAN PO/SPK', {font: {b: true, sz: 13}}); s.gabung(1, 1, 1, 12);
    s.set(2, 1, 'Harga dari data Accurate yang diunggah (Item Requisition, Penyesuaian Stok/IA, PO Detail). Barang tanpa harga dibiarkan kosong, tidak dinolkan. ' + saringKet + ' Data per ' + res.waktu + '.', {font: {i: true, sz: 9}}); s.gabung(2, 1, 2, 24);
    [[1, 10, 'PERMINTAAN PPBJ (Item Requisition)', A], [11, 18, 'BARANG GUDANG KELUAR', B], [19, 24, 'PO / SPK (PO Detail)', Cc], [25, 31, 'PEMERIKSAAN', Dd], [32, 37, 'ANGGARAN (RAB Kebutuhan Proyek)', E5], [38, 47, 'PENERIMAAN', F5], [48, 53, 'STOK DAN STATUS', G5], [54, 58, 'PENYIMPANGAN, STATUS, DATA SUSULAN', H5]].forEach(function (b) { s.set(3, b[0], b[2], gH(b[3])); for (var c = b[0] + 1; c <= b[1]; c++) s.gaya(3, c, gH(b[3])); s.gabung(3, b[0], 3, b[1]); });
    COL.forEach(function (n, i) { s.set(4, i + 1, n, gH(blok(i + 1))); s.kolom(i + 1, W[i]); });
    s.baris(4, 30);
    var r = 5, Tall = jumlah(H);
    var num = function (c) { return [8, 9, 10, 14, 16, 17, 22, 23, 24, 25, 26].indexOf(c) >= 0 || !!NUM2[c]; };
    var fmtC = function (c) { return [9, 10, 16, 17, 23, 24, 56].indexOf(c) >= 0 ? RPF : (c === 25 || c === 26) ? PF : QF; };
    H.forEach(function (o) {
      var g = o.g;
      o.b.forEach(function (b) {
        var kel = arr(b.kel), po = arr(b.po), n = Math.max(kel.length, po.length, 1), ms = arr(b.ms).filter(function (m) { return m !== 'hargaKosong' || true; }).map(MS).join('; ');
        for (var i = 0; i < n; i++) {
          var e = kel[i], x = po[i], ket = [];
          if (e && e.ket) ket.push(e.ket); if (x && x.ket) ket.push(x.ket);
          var v = [g.no, tg(g.tgl), g.proyek || '', g.dept || '', b.nama, b.kode, b.sat || '',
            i ? '' : (b.ir ? b.ir.qty : ''), i ? '' : (b.ir ? kosong(b.ir.harga) : ''), i ? '' : (b.ir && b.ir.total > 0 ? b.ir.total : ''),
            e ? e.no : '', e ? ((JENIS[e.j] || (e.j === 'BPB' ? 'BPB' : '')) + (e.j === 'IA' ? (e.ms === 'bpbBelum' ? ' (BPB belum ada)' : e.ms === 'bpbTak' ? ' (BPB tidak ditemukan)' : ' (bukan barang)') : '') + (e.cara === 'perkiraan' ? ', IA perkiraan' : '')) : '', e ? tg(e.tgl) : '', e ? e.qty : '', e ? refPo(g, b) : '', e ? kosong(e.harga) : '', e ? kosong(e.total) : '', e ? (arr(e.ia).join(', ') || (e.j === 'IA' || e.j === 'IAX' || e.j === 'IAM' ? e.no : '')) : '',
            x ? x.no + (x.bersama ? ' (PO bersama)' : '') : '', x ? tg(x.tgl) : '', x ? x.sup || '' : '', x ? kosong(x.qty) : '', x ? kosong(x.harga) : '', x ? kosong(x.bagian) : '',
            x && x.sel != null ? x.sel : '', e && e.sel != null ? e.sel : '', i ? '' : b.sb, i ? '' : (b.stL || ''), ket.join('; '), i ? '' : ms, i ? 'lanjutan' : 'barang'].concat(i ? ext(g, {}).map(function () { return ''; }) : ext(g, b));
          for (var c = 1; c <= v.length; c++) {
            var val = v[c - 1], st = sel(num(c) ? fmtC(c) : null, null, false);
            if (num(c)) st.al = {h: 'right', v: 'top'};
            if (c === 25 || c === 26) { if (val !== '' && val >= bt().m) st.fill = 'FADBD8'; else if (val !== '' && val >= bt().k) st.fill = 'FCF3CF'; }
            if ((c === 16 || c === 23 || c === 9) && val === '' && ((c === 16 && e) || (c === 23 && x) || (c === 9 && b.ir && !i))) { val = 'kosong'; st.font.i = true; st.font.color = '7F8C8D'; st.al = {h: 'right', v: 'top'}; }
            s.set(r, c, val, st);
          }
          r++;
        }
      });
      if (o.b.length === arr(g.b).length && !RK.ms) arr(g.rabLain).forEach(function (x) {
        var v2 = [g.no, tg(g.tgl), g.proyek || '', g.dept || '', x.nama, x.kode, x.sat || ''];
        while (v2.length < 28) v2.push('');
        v2.push('Hanya di RAB, belum ada permintaan, barang keluar, atau PO', '', 'hanya RAB');
        v2 = v2.concat(ext(g, x));
        for (var c4 = 1; c4 <= v2.length; c4++) { var st4 = sel(num(c4) ? QF : null, 'F8F9F9', false); st4.font.i = true; if (num(c4)) st4.al = {h: 'right', v: 'top'}; s.set(r, c4, v2[c4 - 1], st4); }
        r++;
      });
      var t = jumlah([o]), tt = {font: {b: true, sz: 9}, fill: 'F2F3F4', border: {l: true, r: true, t: true, b: true}};
      for (var c2 = 1; c2 <= COL.length; c2++) s.gaya(r, c2, tt);
      s.set(r, 1, g.no, tt); s.set(r, 2, tg(g.tgl), tt); s.set(r, 3, g.proyek || '', tt); s.set(r, 5, 'TOTAL PPBJ ' + g.no, tt);
      s.set(r, 10, t.est, Object.assign({fmt: RPF}, tt)); s.set(r, 17, t.kel, Object.assign({fmt: RPF}, tt)); s.set(r, 24, t.po, Object.assign({fmt: RPF}, tt));
      s.set(r, 29, [t.nEstK ? t.nEstK + ' barang tanpa estimasi' : '', t.nKelK ? t.nKelK + ' baris keluar tanpa harga' : '', t.nPoK ? t.nPoK + ' baris PO tanpa harga' : '', t.est > 0 ? 'PO/estimasi ' + Math.round(t.po / t.est * 1000) / 10 + '%, keluar/estimasi ' + Math.round(t.kel / t.est * 1000) / 10 + '%' : ''].filter(String).join('; '), tt);
      s.set(r, 31, 'TOTAL', tt); r++;
    });
    var gt = {font: {b: true, sz: 10}, fill: 'D6DBDF', border: {l: true, r: true, t: true, b: true}};
    for (var c3 = 1; c3 <= COL.length; c3++) s.gaya(r, c3, gt);
    s.set(r, 5, 'TOTAL SEMUA (' + Tall.nG + ' PPBJ)', gt); s.set(r, 10, Tall.est, Object.assign({fmt: RPF}, gt)); s.set(r, 17, Tall.kel, Object.assign({fmt: RPF}, gt)); s.set(r, 24, Tall.po, Object.assign({fmt: RPF}, gt)); s.set(r, 31, 'TOTAL', gt);
    s.bekukan(5, 6); s.saring('A4:' + XT.kol(COL.length) + Math.max(5, r - 1));
    s.atur({lanskap: true, fitW: true, kertas: 9, margin: [0.3, 0.3, 0.4, 0.4]});
    // Per PPBJ
    var p = wb.sheet('Per PPBJ', {warna: '1E8449'}), PC = ['No PPBJ', 'Tgl PPBJ', 'Nama Proyek', 'Departemen', 'Status Proyek', 'Jumlah Barang', 'Total Estimasi', 'Barang tanpa Estimasi', 'Total Barang Keluar', 'Baris Keluar tanpa Harga', 'Total PO/SPK', 'Baris PO tanpa Harga', 'PO / Estimasi', 'Keluar / Estimasi', 'Barang Bermasalah',
      'Status Proyek', 'Alasan Status', 'Terdaftar di tab Proyek', 'RAB (barang)', 'Nilai RAB (perkiraan)', 'RAB tanpa Harga', 'Melebihi RAB (barang)', 'Nilai Lebih RAB (perkiraan)', 'Di luar RAB (barang)', 'Kurang belum Diorder', 'Belum Lengkap Datang', 'Pesanan Lewat Batas Hari', 'Klaim Terbuka', 'PO Pertama', 'BPB Pertama', 'BPB Terakhir', 'Tiba Terakhir', 'Lama Berjalan (hari)', 'Kelengkapan Data', 'Tanggal Mulai', 'Rencana Selesai', 'Lewat Rencana (hari)', 'Keterangan Garis Waktu'];
    PC.forEach(function (n, i) { p.set(1, i + 1, n, gH(i < 6 ? A : i < 8 ? A : i < 10 ? B : i < 12 ? Cc : i < 15 ? Dd : i < 17 ? H5 : i < 21 ? E5 : i < 24 ? H5 : i < 28 ? F5 : A)); p.kolom(i + 1, [18, 10, 34, 12, 12, 9, 16, 10, 16, 10, 16, 10, 10, 10, 10, 14, 40, 10, 9, 15, 9, 9, 15, 9, 9, 9, 9, 9, 11, 11, 11, 11, 9, 40, 11, 11, 9, 30][i]); });
    p.baris(1, 30);
    var pr = 2;
    H.forEach(function (o) {
      var g = o.g, t = jumlah([o]);
      [g.no, tg(g.tgl), g.proyek || '', g.dept || '', g.stProyek || '', t.nB, t.est, t.nEstK, t.kel, t.nKelK, t.po, t.nPoK, t.est > 0 ? Math.round(t.po / t.est * 1000) / 10 : '', t.est > 0 ? Math.round(t.kel / t.est * 1000) / 10 : '', t.nMs].concat((function () { var r2 = g.r2 || {}, u = r2.t || {}, w = r2.garis || {}, lk = r2.lk || {}; return [r2.status || '', arr(r2.alasan).join('; '), r2.terdaftar ? 'ya' : 'tidak', lk.rab === false ? 'belum ada' : (u.nRab || 0), u.nilaiRab || '', u.rabTanpaHarga || '', u.nLebihRab || '', u.nilaiLebih || '', u.nLuarRab || '', u.nKurangBelum || '', u.nBelumDatang || '', u.nPoLama || '', u.nKlaim || '', tg(w.po1), tg(w.bpb1), tg(w.bpbN), tg(w.terimaN), w.lama != null ? w.lama : '', lkTeks(g), tg(w.mulai), tg(w.rencana), w.lewat || '', w.ket || '']; })()).forEach(function (v, i) { var g3 = sel(i === 6 || i === 8 || i === 10 || i === 19 || i === 22 ? RPF : (i === 12 || i === 13) ? PF : null); if (i === 15 && v) g3.fill = v === 'Berisiko' ? 'FADBD8' : v === 'Perlu perhatian' ? 'FCF3CF' : 'D5F5E3'; p.set(pr, i + 1, v, g3); });
      pr++;
    });
    [['TOTAL', 1], [Tall.nB, 6], [Tall.est, 7], [Tall.nEstK, 8], [Tall.kel, 9], [Tall.nKelK, 10], [Tall.po, 11], [Tall.nPoK, 12], [Tall.nMs, 15]].forEach(function (z) { p.set(pr, z[1], z[0], {font: {b: true, sz: 9}, fill: 'D6DBDF', fmt: z[1] === 7 || z[1] === 9 || z[1] === 11 ? RPF : undefined, border: {l: true, r: true, t: true, b: true}}); });
    p.bekukan(2, 2); p.saring('A1:' + XT.kol(PC.length) + Math.max(2, pr - 1));
    // Per Vendor
    var vd = wb.sheet('Per Vendor', {warna: 'D35400'}), VC = ['Nama Vendor', 'No PO/SPK', 'Tgl PO', 'No PPBJ', 'Nama Proyek', 'Kode', 'Nama Barang/Jasa', 'Qty PO', 'Harga Satuan PO', 'Harga Satuan Estimasi', 'Selisih', 'Total Baris PO', 'Bagian PPBJ ini', 'PO Bersama'];
    VC.forEach(function (n, i) { vd.set(1, i + 1, n, gH(Cc)); vd.kolom(i + 1, [26, 18, 10, 18, 30, 14, 34, 9, 14, 14, 9, 15, 15, 9][i]); });
    var vr = 2;
    grupVendor(H).forEach(function (w) { w.L.forEach(function (z) {
      var x = z.x;
      [w.sup, x.no, tg(x.tgl), z.g.no, z.g.proyek || '', z.b.kode, z.b.nama, kosong(x.qty), kosong(x.harga), z.b.ir ? kosong(z.b.ir.harga) : '', x.sel != null ? x.sel : '', kosong(x.total), kosong(x.bagian), x.bersama ? 'ya' : ''].forEach(function (v, i) {
        var g2 = sel(i === 8 || i === 9 || i === 11 || i === 12 ? RPF : i === 10 ? PF : i === 7 ? QF : null);
        if (i === 10 && v !== '') { if (v >= bt().m) g2.fill = 'FADBD8'; else if (v >= bt().k) g2.fill = 'FCF3CF'; }
        vd.set(vr, i + 1, v, g2);
      });
      vr++;
    }); });
    vd.bekukan(2, 2); vd.saring('A1:N' + Math.max(2, vr - 1));
    // Perlu ditindak
    var td = wb.sheet('Perlu ditindak', {warna: 'C0392B'}), TC = ['Jenis', 'No Dokumen', 'Tanggal', 'No PPBJ', 'Nama Proyek', 'Kode', 'Nama Barang', 'Qty', 'Nilai', 'Keterangan'];
    TC.forEach(function (n, i) { td.set(1, i + 1, n, gH('FADBD8')); td.kolom(i + 1, [34, 20, 10, 18, 30, 14, 34, 9, 15, 50][i]); });
    var tr = 2;
    tindak(H).forEach(function (x) { [x.j, x.no, tg(x.tgl), x.g ? x.g.no : '', x.g ? x.g.proyek || '' : '', x.b ? x.b.kode : '', x.b ? x.b.nama : '', kosong(x.qty), kosong(x.nilai), x.ket || ''].forEach(function (v, i) { td.set(tr, i + 1, v, sel(i === 8 ? RPF : i === 7 ? QF : null)); }); tr++; });
    td.bekukan(2, 1); td.saring('A1:J' + Math.max(2, tr - 1));
    // Keterangan
    var k = wb.sheet('Keterangan', {warna: '7F8C8D'}), K = [
      ['Rekap PPBJ (sistem gudang SCTK)', ''], ['Data per', res.waktu], ['Saringan', saringKet || 'tanpa saringan'],
      ['Blok Permintaan', 'Item Requisition Accurate: qty, harga satuan = Total Estimasi / Qty, total = Total Estimasi. Ditulis hanya di baris pertama tiap barang agar total tidak dobel.'],
      ['Blok Barang gudang keluar', 'Satu baris per BPB. Harga satuan stok = harga di Penyesuaian Stok (IA) Accurate yang tertaut (dari tab Accurate) atau dicocokkan perkiraan (PPBJ + barang + tanggal IA -7 s/d +75 hari dari BPB). BPB dari stok Moka/Bekas tidak lewat IA sehingga harganya kosong.'],
      ['No BPB', 'BPB biasa; BPB Pengganti (rekonstruksi dari IA lama); no IA dengan penanda "BPB belum ada" bila IA lama belum punya BPB; pengembalian (BPK) bernilai minus.'],
      ['No PO / No PPBJ', 'No PO tempat barang dibeli untuk PPBJ ini; bila tidak ada PO, ditulis No PPBJ (barang dari stok).'],
      ['Blok PO/SPK', 'PO Detail Accurate. PO yang dipakai beberapa PPBJ (PO bersama) dibagi menurut Ordered Qty Item Requisition, PPBJ yang lebih lama dulu, tidak melebihi qty PO.'],
      ['Selisih', 'Selisih PO vs estimasi = (harga PO - harga estimasi) / harga estimasi. Selisih stok vs PO = (harga IA - harga PO rata-rata) / harga PO. Kuning bila >= ' + bt().k + '%, merah bila >= ' + bt().m + '% (Pengaturan Batas Harga).'],
      ['Total', 'Barang tanpa harga tidak dihitung nol; jumlahnya ditulis terpisah. PO/estimasi dan keluar/estimasi dihitung terpisah karena barang PO yang masuk gudang lalu keluar akan terhitung dua kali bila dijumlahkan.'],
      ['Jenis Baris', '"barang" = baris pertama barang, "lanjutan" = BPB atau PO berikutnya untuk barang yang sama, "TOTAL" = total per PPBJ. Saring kolom ini untuk membuang baris total.'],
      ['Blok Anggaran (RAB)', 'Dari Kebutuhan Proyek (tab Proyek). Keluar bersih gudang = diserahkan dikurangi pengembalian yang sudah diterima. Sisa RAB dan Sisa kebutuhan sama dengan Cek Material (sisa kebutuhan juga dikurangi alokasi dan permintaan berjalan). "Lebih dari RAB" = keluar bersih melebihi RAB. PPBJ tanpa RAB: blok ini kosong.'],
      ['Blok Penerimaan', 'Dipesan = qty PO Accurate (bagian PPBJ ini) atau qty pembelian di sistem bila tidak ada PO Accurate. Datang (catatan gudang) = Catat barang masuk yang tidak tertaut PO + penerimaan lewat Pembelian (catatan yang sudah tertaut PO tidak dihitung dua kali). RI Accurate dari Mutasi per Gudang; tertulis "belum terbaca" bila file itu belum diunggah. Sisa belum datang = dipesan - yang lebih besar dari catatan gudang dan RI. Rusak, salah kirim, dan klaim dari Klaim Vendor.'],
      ['Blok Stok dan status', 'Dari Cek Material untuk proyek Aktif/Ditunda yang punya RAB: stok bebas, status (Cukup, Stok terbatas, Kurang, Terpenuhi), kekurangan, status order dan perkiraan tiba, serta proyek lain yang membutuhkan barang yang sama.'],
      ['Penyimpangan', 'Keluar melebihi RAB; keluar di luar RAB; stok kurang belum diorder; klaim vendor terbuka; pesanan belum lengkap datang lebih dari ' + (res.poLamaHari || 30) + ' hari sejak PO (hanya bila RI sudah terbaca atau pesanan dari Pembelian sistem); dicocokkan lewat Padanan/nama. Penanda ini terpisah dari kolom Masalah, sehingga angka "barang bermasalah" tidak berubah.'],
      ['Status Proyek', 'Berisiko = ada barang keluar melebihi RAB atau stok kurang yang belum diorder. Perlu perhatian = ada barang di luar RAB, klaim terbuka, atau pesanan lewat batas hari. Aman = tidak ada temuan tersebut. Kelengkapan data dinilai terpisah.'],
      ['Baris "hanya RAB"', 'Barang yang ada di RAB tetapi belum diminta, belum keluar, dan belum di-PO. Tidak ikut total estimasi, keluar, dan PO.'],
      ['Data susulan (template)', 'Harga barang, penerimaan lama, garis waktu, dan keterangan penyimpangan yang diisi lewat tombol Data susulan. Data resmi selalu menang: harga template dipakai hanya bila tidak ada harga PO, estimasi, atau harga gudang; penerimaan template hanya bila belum ada catatan penerimaan resmi dan RI. Kolom "Sumber Data Susulan" menandai angka yang berasal dari template. Lama berjalan dihitung dari tanggal mulai bila diisi. Melebihi RAB yang sudah diisi "Disetujui Oleh" tidak lagi membuat proyek Berisiko.'],
      ['Nilai RAB (perkiraan)', 'Qty RAB x harga: harga PO rata-rata barang itu, bila tidak ada harga estimasi PPBJ, bila tidak ada harga referensi gudang. Barang tanpa harga tidak dihitung nol; jumlahnya ditulis terpisah.'],
      ['Tidak ikut', (res.info.nBpbTanpaPpbj || 0) + ' baris BPB tanpa No PPBJ dan ' + (res.info.nIaTanpaPpbj || 0) + ' baris IA tanpa PPBJ.']];
    K.forEach(function (z, i) { k.set(i + 1, 1, z[0], {font: {b: true, sz: 10}, al: {v: 'top'}}); k.set(i + 1, 2, z[1], {font: {sz: 10}, al: {v: 'top', wrap: true}}); });
    k.kolom(1, 26); k.kolom(2, 110);
    return wb;
  };
  function ketSaring() {
    var a = [], p = periode();
    if (p.dari || p.sampai) a.push('Tanggal PPBJ ' + (p.dari ? tg(p.dari) : '...') + ' s/d ' + (p.sampai ? tg(p.sampai) : 'sekarang'));
    if (RK.q) a.push('cari "' + RK.q + '"'); if (RK.dept) a.push('departemen ' + RK.dept); if (RK.sb) a.push('sumber ' + RK.sb);
    if (RK.ms) a.push(RK.ms === '_ada' ? 'hanya yang bermasalah' : 'masalah: ' + MS(RK.ms));
    return a.length ? 'Saringan: ' + a.join(', ') + '.' : 'Tanpa saringan.';
  }
  function unduh() {
    if (!RK.res) { toast('Rekap belum dimuat.', true); return; }
    if (!root.XT) { toast('Penulis Excel belum termuat. Muat ulang halaman.', true); return; }
    var H = saring(); if (!H.length) { toast('Tidak ada data pada saringan ini.', true); return; }
    toast('Menyusun Excel...');
    muatJSZip().then(function (Z) { return RK.buku(H, RK.res, ketSaring()).simpan(Z); }).then(function (u) {
      var nama = 'Rekap PPBJ ' + iso(new Date()) + '.xlsx';
      try { if (root.NB && root.NB.buat) { var p0 = periode(); nama = root.NB.buat('xlsx', 'Rekap PPBJ', p0.dari || p0.sampai ? (root.NB.periode ? root.NB.periode(p0.dari, p0.sampai || iso(new Date())) : '') : 'semua periode', 'diunduh ' + iso(new Date())) || nama; } } catch (e) { /* nama bawaan */ }
      var blob = new Blob([u], {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}), a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = nama; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
      toast('Excel rekap PPBJ diunduh (' + H.length + ' PPBJ).');
    }).catch(function (e) { toast('Excel gagal dibuat: ' + (e && e.message ? e.message : e), true); });
  }
  /* ---------- pintu masuk ---------- */
  RK.mount = function (box, api0, toast0) {
    el = box; api = api0; toast = toast0 || toast; gaya(); kerangka();
    if (RK.res && Date.now() - RK.t < 5 * 60 * 1000) gambar(); else muat(true);
    var lebar = hp(); if (RK._rs) return; RK._rs = true;
    root.addEventListener('resize', function () { if (!el || !el.isConnected || !el.querySelector('#rkV')) return; var x = hp(); if (x !== lebar) { lebar = x; if (RK.v === 'barang') isi(); } });
  };
  /** Dipakai dari Telusur PPBJ: buka rekap dengan pencarian terisi. */
  RK.cari = function (q) { RK.q = String(q || ''); RK.v = 'barang'; RK.lim = 40; RK.ms = ''; RK.sb = ''; RK.dept = ''; };
  RK._uji = {menunggu: menunggu, saring: saring, jumlah: jumlah, tindak: tindak, peristiwa: peristiwa, grupVendor: grupVendor, set: function (r) { RK.res = r; RK.idx = null; RK.t = Date.now(); }};
  if (typeof module !== 'undefined' && module.exports) module.exports = RK; else root.RKP = RK;
})(typeof window !== 'undefined' ? window : globalThis);
