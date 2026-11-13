/* Tambahan 109: BPB Pengganti untuk IA lama (admin > Laporan > BPB Pengganti).
   Rekonstruksi dari IA Accurate sebelum sistem digital dipakai. BUKAN dokumen bertanggal mundur:
   tanggal IA tetap tanggal IA, tanda tangan digital diberikan sekarang lewat tautan per orang (PIC > Atasan > Staff Gudang > Manager Gudang).
   Selesai -> masuk Arsip Bukti. Berita acara rekonstruksi ditandatangani Manager Gudang. */
(function (root) {
  'use strict';
  var PG = {}, el, api, toast, S = {tab: 'calon', cal: null, list: null, pil: {}, dpil: {}, q: '', rutin: false};
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
  function dmy(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? m[3] + '/' + m[2] + '/' + m[1] : (iso || ''); }
  function qy(n) { n = Number(n) || 0; return (Math.round(n * 1000) / 1000).toLocaleString('id-ID'); }
  function gaya() {
    if (document.getElementById('pgtGaya')) return;
    var st = document.createElement('style'); st.id = 'pgtGaya';
    st.textContent = '.pgt-tabs{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}.pgt-tabs button[aria-pressed="true"]{outline:2px solid var(--accent,#2471a3)}' +
      '.pgt-wrap{overflow-x:auto}.pgt-tb{width:100%;border-collapse:collapse;font-size:13px}.pgt-tb th,.pgt-tb td{border-bottom:1px solid var(--line,#ccd);padding:5px 6px;text-align:left;vertical-align:top}.pgt-tb select{max-width:150px}' +
      '.pgt-st{display:inline-block;font-size:11px;padding:0 7px;border-radius:9px;border:1px solid currentColor;white-space:nowrap}.pgt-ok{color:#1e8449}.pgt-w{color:#b9770e}.pgt-no{color:#c0392b}' +
      '.pgt-warn{color:#b9770e;font-size:12px}.pgt-card{border:1px solid var(--line,#ccd);border-radius:8px;padding:8px;margin:6px 0}' +
      '@media (max-width:700px){.pgt-tb thead{display:none}.pgt-tb tr{display:block;border:1px solid var(--line,#ccd);border-radius:8px;margin:6px 0;padding:4px}.pgt-tb td{display:block;border:0;padding:3px 4px}.pgt-tb td[data-l]:before{content:attr(data-l) ": ";font-weight:600;font-size:11px;opacity:.75}}';
    document.head.appendChild(st);
  }
  function unduh(bytes, nama, mime) { var blob = new Blob([bytes], {type: mime || 'application/pdf'}), a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nama; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }
  function salin(teks, ok) {
    function cadangan() { var t = document.createElement('textarea'); t.value = teks; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); toast(ok); } catch (e) { toast('Salin manual: ' + teks.slice(0, 80), true); } t.remove(); }
    try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(teks).then(function () { toast(ok); }, cadangan); else cadangan(); } catch (e) { cadangan(); }
  }
  function urlTtd(token) { try { return new URL('ttd-pengganti.html?t=' + token, location.href).href; } catch (e) { return 'ttd-pengganti.html?t=' + token; } }

  PG.mount = function (box, api0, toast0) { el = box; api = api0; toast = toast0; gaya(); gambar(); };
  function gambar() {
    el.innerHTML = '<div class="card"><h3 style="margin:0">BPB Pengganti untuk IA lama</h3>' +
      '<div class="note">Untuk IA Accurate <b>sebelum sistem digital dipakai</b> yang berkas BPB manualnya tidak lengkap. Dokumen dibuat ulang dari barang di IA (baris jasa, galian, boringan, instalasi, ongkos kirim, perbaikan, dan sejenisnya tidak dicantumkan), diberi label <b>BPB Pengganti</b>, lalu ditandatangani digital <b>sekarang</b> lewat tautan (PIC &rarr; Atasan &rarr; Staff Gudang &rarr; Manager Gudang). Tanggal tanda tangan = hari persetujuan, bukan tanggal IA. Yang selesai masuk Arsip Bukti.</div>' +
      '<div class="pgt-tabs" role="group" aria-label="Bagian">' + [['calon', 'Calon IA lama'], ['daftar', 'Daftar BPB Pengganti'], ['tautan', 'Tautan tanda tangan'], ['ba', 'Berita acara']].map(function (t) { return '<button data-pt="' + t[0] + '" aria-pressed="' + (S.tab === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div><div id="pgtIsi"></div></div>';
    el.querySelectorAll('[data-pt]').forEach(function (b) { b.onclick = function () { S.tab = b.getAttribute('data-pt'); gambar(); }; });
    var box = el.querySelector('#pgtIsi');
    ({calon: tabCalon, daftar: tabDaftar, tautan: tabTautan, ba: tabBa})[S.tab](box);
  }

  /* --- Calon --- */
  function tabCalon(box) {
    box.innerHTML = '<div class="note">Memuat IA lama...</div>';
    api({action: 'adminPgtCalon'}).then(function (r) { if (!r.ok) { box.textContent = r.msg || 'Gagal.'; return; } S.cal = r; S.pil = {}; r.rows.forEach(function (x) { x._dept = x.dept; x._pic = (r.pic[x.dept] || []).length === 1 ? r.pic[x.dept][0] : ''; }); gambarCalon(box); });
  }
  /* Pencarian pintar (di layar saja): kata tepat > salah ketik 1 huruf > sebagian kata; semua kata harus cocok. */
  function pgNorm(t) { return String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
  function pgNol(w) { return /^\d+$/.test(w) ? w.replace(/^0+(?=\d)/, '') : w; }
  function pgMirip(a, b) {
    if (a === b) return true; var la = a.length, lb = b.length; if (Math.abs(la - lb) > 1 || la < 4) return false;
    if (la === lb) { var p = 0; while (p < la && a[p] === b[p]) p++; if (p < la - 1 && a[p] === b[p + 1] && a[p + 1] === b[p] && a.slice(p + 2) === b.slice(p + 2)) return true; }
    var i = 0, j = 0, d = 0; while (i < la && j < lb) { if (a[i] === b[j]) { i++; j++; continue; } if (++d > 1) return false; if (la === lb) { i++; j++; } else if (la > lb) i++; else j++; }
    return d + (la - i) + (lb - j) <= 1;
  }
  function pgIndeks(x) {
    if (x._ix) return x._ix;
    var teks = [x.no, x.ppbj, x.kerja, x.proyek, x.ket, x.dept].concat((x.barang || []).map(function (b) { return b.nama + ' ' + b.kode; })).join(' ');
    var kata = pgNorm(teks).split(' ').map(pgNol).filter(String), set = {}; kata.forEach(function (w) { set[w] = 1; });
    return (x._ix = {kata: Object.keys(set), teks: ' ' + kata.join(' ') + ' '});
  }
  function pgSkor(x, qs) {
    var ix = pgIndeks(x), tot = 0;
    for (var i = 0; i < qs.length; i++) {
      var w = qs[i], sk = 0;
      if (ix.kata.indexOf(w) >= 0) sk = 3;
      else if (/^\d+$/.test(w) ? ix.kata.some(function (k) { return k.indexOf(w) === 0; }) : (ix.teks.indexOf(w) >= 0 && w.length >= 2)) sk = 2;
      else if (ix.kata.some(function (k) { return pgMirip(w, k); })) sk = 1;
      if (!sk) return 0; tot += sk;
    }
    return tot || 1;
  }
  function saringCalon(rows) {
    var qs = pgNorm(S.q).split(' ').map(pgNol).filter(String), out = [];
    rows.forEach(function (x) {
      if (!S.rutin && x.rutin) return;
      if (S.fd && (x._dept || '') !== S.fd) return;
      if (S.fs === 'lengkap' && !(x._dept && x._pic)) return;
      if (S.fs === 'belum' && x._dept && x._pic) return;
      if (S.t1 && x.tgl < S.t1) return;
      if (S.t2 && x.tgl > S.t2) return;
      var sk = qs.length ? pgSkor(x, qs) : 1; if (!sk) return;
      out.push({x: x, sk: sk});
    });
    if (qs.length) out.sort(function (a, b) { return b.sk - a.sk; });
    return out.map(function (o) { return o.x; });
  }
  function gambarCalon(box) {
    var r = S.cal, L = saringCalon(r.rows);
    var nPil = Object.keys(S.pil).length, depts = r.dept.slice().sort();
    box.innerHTML = '<div class="note">Sistem digital mulai <b>' + esc(dmy(r.mulai)) + '</b> (BPB pertama). ' + r.rows.length + ' IA lama belum punya BPB pengganti' + (r.nSudah ? ', ' + r.nSudah + ' sudah dibuat' : '') + (r.nJasaSaja ? ', ' + r.nJasaSaja + ' IA isinya jasa saja (dilewati)' : '') + '. Departemen ditebak dari nama pekerjaan (kebocoran &rarr; Distribusi, SL/upgrade &rarr; RM, perbaikan lain &rarr; Produksi); periksa dan ubah bila perlu.</div>' +
      '<div class="fr" style="gap:6px;flex-wrap:wrap;align-items:center"><input id="pgQ" placeholder="Cari nomor IA, PPBJ, pekerjaan, proyek, atau nama barang" value="' + esc(S.q) + '" style="flex:1;min-width:220px">' +
      '<select id="pgFd" aria-label="Departemen"><option value="">Semua departemen</option>' + depts.map(function (d) { return '<option' + (S.fd === d ? ' selected' : '') + '>' + esc(d) + '</option>'; }).join('') + '</select>' +
      '<select id="pgFs" aria-label="Kelengkapan"><option value="">Semua status</option><option value="lengkap"' + (S.fs === 'lengkap' ? ' selected' : '') + '>Departemen &amp; PIC lengkap</option><option value="belum"' + (S.fs === 'belum' ? ' selected' : '') + '>Belum lengkap</option></select>' +
      '<input type="date" id="pgT1" value="' + esc(S.t1 || '') + '" aria-label="Dari tanggal"> <input type="date" id="pgT2" value="' + esc(S.t2 || '') + '" aria-label="Sampai tanggal"><button id="pgReset">Reset</button>' +
      '<span class="pgt-warn" style="color:inherit">' + L.length + ' dari ' + r.rows.length + ' IA</span>' +
      '</div><div class="fr" style="gap:6px;flex-wrap:wrap;align-items:center;margin-top:6px"><label><input type="checkbox" id="pgR"' + (S.rutin ? ' checked' : '') + '> tampilkan pemakaian rutin (kimia/reklas)</label>' +
      '<button id="pgAll">Pilih yang lengkap (' + L.filter(function (x) { return x._dept && x._pic; }).length + ')</button><button id="pgNone">Kosongkan pilihan</button><button class="sv" id="pgBuat"' + (nPil ? '' : ' disabled') + '>Buat BPB Pengganti (' + nPil + ')</button></div>' +
      '<div class="pgt-wrap"><table class="pgt-tb"><thead><tr><th></th><th>IA</th><th>Pekerjaan / proyek</th><th>Departemen</th><th>PIC (peminta)</th><th>Barang</th></tr></thead><tbody>' +
      L.slice(0, 200).map(function (x) {
        var pics = r.pic[x._dept] || [];
        return '<tr><td><input type="checkbox" data-pp="' + esc(x.no) + '"' + (S.pil[x.no] ? ' checked' : '') + ' aria-label="Pilih ' + esc(x.no) + '"></td><td data-l="IA"><b>' + esc(x.no) + '</b><br><small>' + esc(dmy(x.tgl)) + '</small></td>' +
          '<td data-l="Pekerjaan">' + esc(x.kerja) + '<br><small>' + esc(x.ppbj || 'tanpa PPBJ') + (x.proyek && x.proyek !== x.kerja ? ' · ' + esc(x.proyek) : '') + '</small>' + (x.rutin ? '<br><span class="pgt-warn">pemakaian rutin</span>' : '') + '</td>' +
          '<td data-l="Departemen"><select data-pd="' + esc(x.no) + '"><option value="">- pilih -</option>' + depts.map(function (d) { return '<option' + (x._dept === d ? ' selected' : '') + '>' + esc(d) + '</option>'; }).join('') + '</select>' + (x.dept ? '' : '<br><span class="pgt-warn">tidak terdeteksi</span>') + '</td>' +
          '<td data-l="PIC"><select data-pc="' + esc(x.no) + '"><option value="">- pilih -</option>' + pics.map(function (n) { return '<option' + (x._pic === n ? ' selected' : '') + '>' + esc(n) + '</option>'; }).join('') + '</select></td>' +
          '<td data-l="Barang"><details><summary>' + x.barang.length + ' barang' + (x.jasa.length ? ', ' + x.jasa.length + ' jasa dilewati' : '') + '</summary><small>' + x.barang.map(function (b) { return esc(b.nama) + ' (' + qy(b.qty) + ' ' + esc(b.satuan) + ')'; }).join('<br>') + (x.jasa.length ? '<br><i>Tidak dicantumkan: ' + esc(x.jasa.join('; ')) + '</i>' : '') + '</small></details>' + (x.ragu.length ? '<span class="pgt-warn">' + x.ragu.length + ' kode tidak ada di Master Barang, pastikan bukan jasa</span>' : '') + '</td></tr>';
      }).join('') + (L.length ? '' : '<tr><td colspan="6">Tidak ada IA lama pada saringan ini.</td></tr>') + '</tbody></table></div>' + (L.length > 200 ? '<div class="note">Tampil 200 pertama. Persempit dengan kotak cari atau saringan.</div>' : '');
    box.querySelector('#pgQ').oninput = function () { S.q = this.value; clearTimeout(gambarCalon.h); var v = this; gambarCalon.h = setTimeout(function () { gambarCalon(box); var i = box.querySelector('#pgQ'); i.focus(); i.setSelectionRange(v.value.length, v.value.length); }, 250); };
    box.querySelector('#pgR').onchange = function () { S.rutin = this.checked; gambarCalon(box); };
    box.querySelector('#pgFd').onchange = function () { S.fd = this.value; gambarCalon(box); };
    box.querySelector('#pgFs').onchange = function () { S.fs = this.value; gambarCalon(box); };
    box.querySelector('#pgT1').onchange = function () { S.t1 = this.value; gambarCalon(box); };
    box.querySelector('#pgT2').onchange = function () { S.t2 = this.value; gambarCalon(box); };
    box.querySelector('#pgReset').onclick = function () { S.q = ''; S.fd = ''; S.fs = ''; S.t1 = ''; S.t2 = ''; gambarCalon(box); };
    box.querySelector('#pgAll').onclick = function () { L.forEach(function (x) { if (x._dept && x._pic) S.pil[x.no] = 1; }); gambarCalon(box); };
    box.querySelector('#pgNone').onclick = function () { S.pil = {}; gambarCalon(box); };
    var byNo = {}; r.rows.forEach(function (x) { byNo[x.no] = x; });
    box.querySelectorAll('[data-pp]').forEach(function (c) { c.onchange = function () { var n = c.getAttribute('data-pp'); if (c.checked) S.pil[n] = 1; else delete S.pil[n]; var b = box.querySelector('#pgBuat'); b.textContent = 'Buat BPB Pengganti (' + Object.keys(S.pil).length + ')'; b.disabled = !Object.keys(S.pil).length; }; });
    box.querySelectorAll('[data-pd]').forEach(function (s) { s.onchange = function () { var x = byNo[s.getAttribute('data-pd')]; x._dept = s.value; var p = r.pic[x._dept] || []; x._pic = p.length === 1 ? p[0] : ''; gambarCalon(box); }; });
    box.querySelectorAll('[data-pc]').forEach(function (s) { s.onchange = function () { byNo[s.getAttribute('data-pc')]._pic = s.value; }; });
    box.querySelector('#pgBuat').onclick = function () {
      var b = this, items = Object.keys(S.pil).map(function (n) { var x = byNo[n]; return {no: n, dept: x._dept, pic: x._pic}; });
      var kurang = items.filter(function (x) { return !x.dept || !x.pic; }); if (kurang.length) { toast(kurang.length + ' IA terpilih belum lengkap departemen/PIC-nya.', true); return; }
      b.disabled = true; b.textContent = 'Membuat...';
      api({action: 'adminPgtBuat', items: items}).then(function (x) { toast(x.msg || (x.ok ? 'Selesai.' : 'Gagal.'), !x.ok); if (x.ok) { S.tab = 'tautan'; gambar(); } else { b.disabled = false; b.textContent = 'Buat BPB Pengganti (' + items.length + ')'; } });
    };
  }

  /* --- Daftar --- */
  function muatList(fn) { api({action: 'adminPgtList'}).then(function (r) { if (!r.ok) { toast(r.msg || 'Gagal memuat.', true); return; } S.list = r; fn(r); }); }
  function stKelas(st) { return st === 'Selesai' ? 'pgt-ok' : st === 'Ditolak' ? 'pgt-no' : 'pgt-w'; }
  function tabDaftar(box) {
    box.innerHTML = '<div class="note">Memuat...</div>';
    muatList(function (r) {
      var ps = r.perStatus || {};
      box.innerHTML = '<div class="note">' + (Object.keys(ps).map(function (k) { return esc(k) + ': <b>' + ps[k] + '</b>'; }).join(' · ') || 'Belum ada BPB pengganti.') + '</div>' +
        '<div class="fr" style="gap:6px;flex-wrap:wrap"><button id="pgPdf">Unduh PDF terpilih</button><button id="pgHps">Hapus terpilih (yang belum selesai)</button></div>' +
        '<div class="pgt-wrap"><table class="pgt-tb"><thead><tr><th></th><th>Nomor</th><th>IA</th><th>Proyek</th><th>Status</th><th>Tanda tangan</th></tr></thead><tbody>' +
        r.rows.map(function (o) {
          return '<tr><td><input type="checkbox" data-dp="' + esc(o.id) + '" aria-label="Pilih ' + esc(o.nomor) + '"></td><td data-l="Nomor"><b>' + esc(o.nomor) + '</b><br><small>' + esc(o.dept) + ' · ' + o.barang.length + ' barang</small></td><td data-l="IA">' + esc(o.no) + '<br><small>' + esc(dmy(o.tgl)) + '</small></td>' +
            '<td data-l="Proyek">' + esc(o.proyek) + '<br><small>' + esc(o.ppbj || '') + '</small></td><td data-l="Status"><span class="pgt-st ' + stKelas(o.status) + '">' + esc(o.status) + '</span>' + (o.tolak ? '<br><small>' + esc(o.tolak.peran + ' ' + o.tolak.nama + ': ' + o.tolak.alasan) + '</small>' : '') + '</td>' +
            '<td data-l="Tanda tangan"><small>' + [['PIC', 'pic'], ['Atasan', 'atasan'], ['Staff', 'staff'], ['Manager', 'manager']].map(function (p) { var a = o[p[1]]; return esc(p[0]) + ' ' + esc(a.nama) + ': ' + (a.waktu ? '&#10003; ' + esc(a.waktu) : '-'); }).join('<br>') + '</small></td></tr>';
        }).join('') + (r.rows.length ? '' : '<tr><td colspan="6">Belum ada.</td></tr>') + '</tbody></table></div>';
      function pilih() { return [].slice.call(box.querySelectorAll('[data-dp]:checked')).map(function (c) { return c.getAttribute('data-dp'); }); }
      box.querySelector('#pgPdf').onclick = function () { var ids = pilih(); if (!ids.length) { toast('Pilih dulu.', true); return; } buatPdf(ids, this); };
      box.querySelector('#pgHps').onclick = function () { var ids = pilih(); if (!ids.length) { toast('Pilih dulu.', true); return; } api({action: 'adminPgtHapus', ids: ids}).then(function (x) { toast(x.msg || '', !x.ok); if (x.ok) tabDaftar(box); }); };
    });
  }
  function buatPdf(ids, btn) {
    if (!root.PDFLib || !root.BuktiPdf) { toast('Pembuat PDF belum termuat. Muat ulang halaman.', true); return; }
    btn.disabled = true; var t0 = btn.textContent; btn.textContent = 'Membuat PDF...';
    var docs = [], sig = {}, p = Promise.resolve();
    for (var i = 0; i < ids.length; i += 25) (function (sl) { p = p.then(function () { return api({action: 'adminPgtPdf', ids: sl}).then(function (r) { if (!r.ok) throw new Error(r.msg || 'Gagal'); docs = docs.concat(r.docs); Object.keys(r.sig || {}).forEach(function (k) { sig[k] = r.sig[k]; }); }); }); })(ids.slice(i, i + 25));
    p.then(function () { return root.BuktiPdf.buatGabungan(docs, sig); }).then(function (u) { unduh(u, (docs.length === 1 ? 'BPB Pengganti ' + docs[0].doc.replace(/\//g, '-') : 'BPB Pengganti (' + docs.length + ' dokumen)') + '.pdf'); })
      .catch(function (e) { toast('PDF gagal: ' + (e && e.message ? e.message : e), true); }).then(function () { btn.disabled = false; btn.textContent = t0; });
  }

  /* --- Tautan --- */
  function tabTautan(box) {
    box.innerHTML = '<div class="note">Memuat...</div>';
    muatList(function (r) {
      box.innerHTML = '<div class="note">Satu tautan per orang, berisi semua BPB pengganti yang perlu ia setujui. Tautan tetap sama dari awal sampai selesai (berlaku 30 hari, diperpanjang saat ada dokumen baru), jadi bisa dikirim sekaligus di depan: orang hanya bisa menyetujui saat tahap sebelumnya sudah selesai. Kirim lewat WhatsApp dengan tombol Salin. Tidak ada email yang dikirim.</div>' +
        (r.orang.length ? r.orang.sort(function (a, b) { return b.siap - a.siap; }).map(function (o, i) {
          return '<div class="pgt-card"><b>' + esc(o.nama) + '</b> <small>(' + esc(o.peran) + ')</small> · siap disetujui <b>' + o.siap + '</b> · sudah ' + o.sudah + ' dari ' + o.total + (o.sampai ? ' · berlaku sampai ' + esc(o.sampai) : ' · <span class="pgt-warn">belum ada tautan aktif</span>') +
            '<div class="fr" style="gap:6px;flex-wrap:wrap;margin-top:4px">' + (o.token ? '<button data-sl="' + i + '">Salin tautan</button><button data-sw="' + i + '">Salin pesan WhatsApp</button>' : '') + '<button data-tb="' + i + '">' + (o.token ? 'Buat tautan baru' : 'Buat tautan') + '</button>' + (o.token ? '<button data-tc="' + i + '">Cabut</button>' : '') + '</div></div>';
        }).join('') : '<div class="note">Belum ada BPB pengganti.</div>');
      function pesan(o) { return 'Yth. Bapak/Ibu ' + o.nama + ',\n\nMohon persetujuan digital *BPB Pengganti* (rekonstruksi dari IA Accurate lama yang berkas BPB manualnya tidak lengkap) sebagai ' + o.peran + '. Saat ini ' + o.siap + ' dokumen siap disetujui.\n\nTautan: ' + urlTtd(o.token) + '\n(berlaku sampai ' + o.sampai + ')\n\nTerima kasih.\nGudang PT Sarana Catur Tirta Kelola'; }
      box.querySelectorAll('[data-sl]').forEach(function (b) { b.onclick = function () { salin(urlTtd(r.orang[+b.getAttribute('data-sl')].token), 'Tautan disalin.'); }; });
      box.querySelectorAll('[data-sw]').forEach(function (b) { b.onclick = function () { salin(pesan(r.orang[+b.getAttribute('data-sw')]), 'Pesan WhatsApp disalin.'); }; });
      box.querySelectorAll('[data-tb]').forEach(function (b) { b.onclick = function () { var o = r.orang[+b.getAttribute('data-tb')]; api({action: 'adminPgtTautan', nama: o.nama, peran: o.peran, aksi: o.token ? 'baru' : ''}).then(function (x) { toast(x.msg || '', !x.ok); tabTautan(box); }); }; });
      box.querySelectorAll('[data-tc]').forEach(function (b) { b.onclick = function () { var o = r.orang[+b.getAttribute('data-tc')]; api({action: 'adminPgtTautan', nama: o.nama, peran: o.peran, aksi: 'cabut'}).then(function (x) { toast(x.msg || '', !x.ok); tabTautan(box); }); }; });
    });
  }

  /* --- Berita acara --- */
  function tabBa(box) {
    box.innerHTML = '<div class="note">Memuat...</div>';
    muatList(function (r) {
      var nSel = r.rows.filter(function (o) { return o.status === 'Selesai'; }).length;
      box.innerHTML = '<div class="note">Satu lembar penjelasan untuk auditor: BPB manual lama tidak lengkap, maka BPB pengganti dibuat ulang dari data IA Accurate dan ditandatangani ulang. Ditandatangani Manager Gudang lewat tautannya (tautan yang sama dengan BPB pengganti).</div>' +
        '<div class="fr"><button class="sv" id="pgBaBuat">Buat berita acara dari BPB pengganti yang Selesai (' + nSel + ')</button></div>' +
        (r.ba.length ? r.ba.map(function (b) { return '<div class="pgt-card"><b>' + esc(b.nomor) + '</b> · ' + esc(dmy(b.tgl)) + ' · ' + b.daftar.length + ' BPB pengganti · <span class="pgt-st ' + stKelas(b.status) + '">' + esc(b.status) + '</span>' + (b.manager.waktu ? ' · disetujui ' + esc(b.manager.waktu) : '') + '<div class="fr" style="margin-top:4px"><button data-bp="' + esc(b.id) + '">Unduh PDF berita acara</button></div></div>'; }).join('') : '<div class="note">Belum ada berita acara.</div>');
      box.querySelector('#pgBaBuat').onclick = function () { api({action: 'adminPgtBa'}).then(function (x) { toast(x.msg || '', !x.ok); if (x.ok) tabBa(box); }); };
      box.querySelectorAll('[data-bp]').forEach(function (b) { b.onclick = function () { api({action: 'adminPgtBaPdf', id: b.getAttribute('data-bp')}).then(function (x) { if (!x.ok) { toast(x.msg || 'Gagal.', true); return; } return PG.pdfBa(x).then(function (u) { unduh(u, 'Berita Acara ' + x.ba.nomor.replace(/\//g, '-') + '.pdf'); }); }).catch(function (e) { toast('PDF gagal: ' + (e && e.message ? e.message : e), true); }); }; });
    });
  }
  /** PDF berita acara rekonstruksi (A4). x = {ba, sig, mulai}. */
  PG.pdfBa = function (x) {
    var L = root.PDFLib; if (!L) return Promise.reject(new Error('PDFLib belum termuat'));
    var b = x.ba;
    return L.PDFDocument.create().then(function (doc) {
      return Promise.all([doc.embedFont(L.StandardFonts.Helvetica), doc.embedFont(L.StandardFonts.HelveticaBold)]).then(function (F) {
        var f = F[0], fb = F[1], W = 595, H = 842, M = 50, page = doc.addPage([W, H]), y = H - M;
        function asc(s) { return String(s == null ? '' : s).replace(/[^\x20-\x7E]/g, '?'); }
        function teks(s, x0, yy, font, sz, o) { s = asc(s); var w = font.widthOfTextAtSize(s, sz); var xx = o && o.c ? x0 + (o.w - w) / 2 : o && o.r ? x0 + o.w - w : x0; page.drawText(s, {x: xx, y: yy, size: sz, font: font}); }
        function bungkus(s, font, sz, w) { var out = [], cur = ''; asc(s).split(' ').forEach(function (k) { var c = cur ? cur + ' ' + k : k; if (font.widthOfTextAtSize(c, sz) > w && cur) { out.push(cur); cur = k; } else cur = c; }); if (cur) out.push(cur); return out; }
        function para(s, sz) { bungkus(s, f, sz || 10, W - 2 * M).forEach(function (l) { if (y < M + 60) { page = doc.addPage([W, H]); y = H - M; } teks(l, M, y, f, sz || 10); y -= (sz || 10) + 4; }); y -= 4; }
        teks('PT SARANA CATUR TIRTA KELOLA', M, y, fb, 11, {c: 1, w: W - 2 * M}); y -= 22;
        teks('BERITA ACARA REKONSTRUKSI BUKTI PENGAMBILAN BARANG (BPB)', M, y, fb, 12, {c: 1, w: W - 2 * M}); y -= 15;
        teks('Nomor: ' + b.nomor, M, y, f, 10, {c: 1, w: W - 2 * M}); y -= 26;
        var tg = b.tgl.split('-').reverse().join('/');
        para('Pada tanggal ' + tg + ', Gudang PT Sarana Catur Tirta Kelola menyatakan bahwa sebagian berkas Bukti Pengambilan Barang (BPB) manual untuk transaksi pengeluaran barang (IA Accurate) sebelum sistem gudang digital digunakan' + (x.mulai ? ' (mulai ' + x.mulai.split('-').reverse().join('/') + ')' : '') + ' tidak ditemukan lengkap di arsip.');
        para('Sebagai pengganti, telah dibuat ' + b.daftar.length + ' BPB Pengganti dari data IA Accurate yang sudah tercatat. BPB Pengganti hanya memuat barang (bukan jasa/pekerjaan) dan telah disetujui ulang secara digital oleh PIC, Atasan departemen, Staff Gudang, dan Manager Gudang. Tanggal persetujuan pada setiap BPB Pengganti adalah tanggal persetujuan digital, bukan tanggal transaksi IA. Bila BPB manual asli ditemukan, BPB manual asli tetap berlaku.');
        para('Daftar BPB Pengganti:');
        var cols = [[M, 28, 'No'], [M + 28, 100, 'BPB Pengganti'], [M + 128, 95, 'IA Accurate'], [M + 223, 60, 'Tgl IA'], [M + 283, W - 2 * M - 283, 'Proyek / PPBJ']];
        function kepala() { cols.forEach(function (c) { teks(c[2], c[0] + 2, y, fb, 8.5); }); y -= 4; page.drawLine({start: {x: M, y: y}, end: {x: W - M, y: y}, thickness: .6}); y -= 11; }
        kepala();
        b.daftar.forEach(function (d, i) {
          var pr = bungkus((d.proyek || '-') + (d.ppbj ? ' (' + d.ppbj + ')' : ''), f, 8, cols[4][1] - 4), h = Math.max(1, pr.length) * 10;
          if (y - h < M + 120) { page = doc.addPage([W, H]); y = H - M; kepala(); }
          teks(String(i + 1), cols[0][0] + 2, y, f, 8.5); teks(d.nomor, cols[1][0] + 2, y, f, 8.5); teks(d.no, cols[2][0] + 2, y, f, 8.5); teks(String(d.tgl).split('-').reverse().join('/'), cols[3][0] + 2, y, f, 8.5);
          pr.forEach(function (l, j) { teks(l, cols[4][0] + 2, y - j * 10, f, 8); }); y -= h + 3;
        });
        y -= 14; if (y < M + 120) { page = doc.addPage([W, H]); y = H - M; }
        para('Demikian berita acara ini dibuat dengan sebenarnya untuk keperluan arsip dan pemeriksaan (audit).');
        var bx = W - M - 190, by = y - 10;
        teks('Manager Gudang', bx, by, fb, 10, {c: 1, w: 190}); by -= 8;
        var tail = function () {
          teks(b.manager.waktu ? 'Disetujui digital ' + b.manager.waktu : '(belum disetujui)', bx, by - 62, f, 8, {c: 1, w: 190});
          teks(b.manager.nama, bx, by - 76, fb, 10, {c: 1, w: 190});
          return doc.save();
        };
        if (x.sig && b.manager.waktu) {
          var p = /^data:image\/png/.test(x.sig) ? doc.embedPng(x.sig) : doc.embedJpg(x.sig);
          return p.then(function (im) { var sc = Math.min(150 / im.width, 50 / im.height); page.drawImage(im, {x: bx + (190 - im.width * sc) / 2, y: by - 55, width: im.width * sc, height: im.height * sc}); return tail(); }, tail);
        }
        return tail();
      });
    });
  };
  root.PGT = PG;
  if (typeof module !== 'undefined' && module.exports) module.exports = PG;
})(typeof window !== 'undefined' ? window : globalThis);
