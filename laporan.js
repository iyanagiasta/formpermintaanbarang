/* Tampilan + Excel laporan gudang (dipakai laporan.html untuk atasan dan tab Laporan Atasan di admin.html).
   Data = snapshot dari server (Code.gs laporanData_). Tidak memanggil server sendiri. */
var LPR=(function(){
  var CSS='.lp{color:var(--ink,#0d1f2d);font-size:14px;line-height:1.45}.lp h2{font:700 20px Georgia,serif;margin:0 0 2px;color:var(--navy,#0a2a43)}.lp h3{font:700 15px "Segoe UI",Roboto,Arial,sans-serif;margin:22px 0 6px;padding-bottom:5px;border-bottom:2px solid var(--gold,#b8975a);color:var(--navy,#0a2a43)}'+
   '.lp .sub{color:var(--mut,#5b7a8c);font-size:12.5px;margin-bottom:12px}.lp .kpi{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin:10px 0}.lp .kpi div{border:1px solid var(--line,#cfd8de);border-radius:10px;padding:9px 11px;background:var(--card,#fff)}'+
   '.lp .kpi b{display:block;font-size:19px}.lp .kpi span{font-size:12px;color:var(--mut,#5b7a8c)}.lp .kpi .bad b{color:#b3261e}.lp .kpi .ok b{color:#1b7a3a}'+
   '.lp ul.pr{margin:6px 0 4px 18px;padding:0}.lp ul.pr li{margin:3px 0}.lp .tw{overflow-x:auto}.lp table{width:100%;border-collapse:collapse;font-size:13px;margin:6px 0;background:var(--card,#fff)}.lp th{background:var(--navy,#0a2a43);color:#fff;text-align:left;padding:6px 7px;font-size:12px}'+
   '.lp td{border-top:1px solid var(--line,#cfd8de);padding:5px 7px;vertical-align:top}.lp td.n,.lp th.n{text-align:right;white-space:nowrap}.lp .mut{color:var(--mut,#5b7a8c);font-size:12px}.lp .tag{display:inline-block;border-radius:12px;padding:1px 8px;font-size:11.5px;font-weight:700;background:#e8f1f6;color:#0a2a43}'+
   '.lp .tag.r{background:#f8d7da;color:#8a1c28}.lp .tag.y{background:#fff3cd;color:#7a5b00}.lp .tag.g{background:#d9f0df;color:#14612b}.lp .kosong{color:var(--mut,#5b7a8c);font-style:italic;padding:6px 0}'+
   '@media print{body{background:#fff!important}.noprint,.top,.tabs{display:none!important}.lp{color:#000}.lp h3{break-after:avoid}.lp table{break-inside:auto}.lp tr{break-inside:avoid}.lp th{-webkit-print-color-adjust:exact;print-color-adjust:exact}.lp .kpi div{-webkit-print-color-adjust:exact;print-color-adjust:exact}}';
  function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
  function rp(n){return n===""||n==null?"-":(n<0?"-":"")+"Rp "+Math.abs(Math.round(n)).toLocaleString("id-ID");}
  function nf(n){return n===""||n==null?"-":(Math.round(Number(n)*100)/100).toLocaleString("id-ID");}
  function juta(n){n=Math.round(n||0);if(Math.abs(n)>=1e9)return "Rp "+(n/1e9).toFixed(2).replace(".",",")+" M";if(Math.abs(n)>=1e6)return "Rp "+(n/1e6).toFixed(1).replace(".",",")+" jt";return rp(n);}
  function tgl(s){var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s||""));return m?m[3]+"/"+m[2]+"/"+m[1]:String(s||"");}
  function injectCss(){if(document.getElementById("lpcss"))return;var st=document.createElement("style");st.id="lpcss";st.textContent=CSS;document.head.appendChild(st);}
  /** fmt: 't' teks, 'n' angka, 'r' rupiah, 'd' tanggal; maks = jumlah baris tampil */
  function tbl(head,fmt,rows,maks,ket){
    if(!rows||!rows.length)return '<div class="kosong">'+esc(ket||"Tidak ada.")+'</div>';
    var tampil=rows.slice(0,maks||15),h='<div class="tw"><table><thead><tr>'+head.map(function(x,i){return '<th'+(fmt[i]==="n"||fmt[i]==="r"?' class="n"':'')+'>'+esc(x)+'</th>';}).join("")+'</tr></thead><tbody>';
    tampil.forEach(function(r){h+='<tr>'+fmt.map(function(f,i){var v=r[i];return '<td'+(f==="n"||f==="r"?' class="n"':'')+'>'+(f==="r"?rp(v):f==="n"?nf(v):f==="d"?esc(tgl(v)):esc(v))+'</td>';}).join("")+'</tr>';});
    h+='</tbody></table></div>';
    if(rows.length>tampil.length)h+='<div class="mut">+ '+(rows.length-tampil.length)+' baris lagi - lengkapnya ada di file Excel.</div>';
    return h;
  }
  function perhatian(d){
    var r=d.ringkas,p=[];
    if(r.kritis>0)p.push('<b>'+r.kritis+' barang</b> di bawah buffer dan perlu dibeli'+(r.nilaiBeli?' (perkiraan '+juta(r.nilaiBeli)+')':'')+'.');
    if(d.layanan&&d.layanan.macet&&d.layanan.macet.length)p.push('<b>'+d.layanan.macet.length+' permintaan</b> sudah menunggu lebih dari 2 hari tanpa selesai.');
    if(r.kedaluwarsaLewat>0)p.push('<b>'+r.kedaluwarsaLewat+' batch</b> sudah lewat kedaluwarsa dan masih tercatat di stok.');
    if(r.kedaluwarsa30>0)p.push('<b>'+r.kedaluwarsa30+' batch</b> akan kedaluwarsa dalam 30 hari.');
    if(r.melebihiRab>0)p.push('<b>'+r.melebihiRab+' barang</b> keluar melebihi RAB proyek.');
    if(r.diluarRab>0)p.push('<b>'+r.diluarRab+' barang</b> keluar untuk proyek padahal tidak ada di RAB.');
    if(r.tanpaPpbj>0)p.push('<b>'+r.tanpaPpbj+' baris</b> barang keluar tanpa No PPBJ.');
    if(r.mati>0)p.push('<b>'+r.mati+' barang</b> tidak bergerak lebih dari 90 hari, nilai '+juta(r.nilaiMati)+' tertahan.');
    if(r.akurasiOpname!=null&&r.akurasiOpname<95)p.push('Akurasi opname <b>'+r.akurasiOpname+'%</b> (di bawah target 95%).');
    if(r.tanpaHargaStok>0)p.push(r.tanpaHargaStok+' barang berstok belum punya harga, jadi tidak masuk nilai.');
    return p.length?'<ul class="pr">'+p.map(function(x){return '<li>'+x+'</li>';}).join("")+'</ul>':'<div class="kosong">Tidak ada hal yang perlu perhatian khusus pada periode ini.</div>';
  }
  function render(el,d,info){
    injectCss();
    var r=d.ringkas,L=d.layanan||{},judul=info.jenis==="Bulanan"?"Laporan Gudang Bulanan":info.jenis==="2 Mingguan"?"Ringkasan Gudang 2 Mingguan":"Laporan Gudang";
    var h='<div class="lp"><h2>'+esc(judul)+'</h2><div class="sub">PT Sarana Catur Tirta Kelola &middot; Periode '+esc(tgl(info.dari))+' s/d '+esc(tgl(info.sampai))+' &middot; dibuat '+esc(info.dibuat)+' &middot; nilai memakai '+esc(d.meta.harga)+'</div>';
    h+='<div class="kpi">'+
     '<div><b>'+juta(r.nilaiKeluar)+'</b><span>Nilai barang keluar</span></div><div><b>'+juta(r.nilaiMasuk)+'</b><span>Nilai barang masuk</span></div><div><b>'+juta(r.nilaiStok)+'</b><span>Nilai stok saat ini ('+r.sku+' barang)</span></div>'+
     '<div><b>'+r.dokSerah+'</b><span>Dokumen serah</span></div><div><b>'+r.permintaan+'</b><span>Permintaan masuk'+(r.ditolak?' ('+r.ditolak+' ditolak)':'')+'</span></div>'+
     '<div class="'+(r.kritis?'bad':'ok')+'"><b>'+r.kritis+'</b><span>Stok kritis</span></div><div class="'+(r.mati?'bad':'ok')+'"><b>'+juta(r.nilaiMati)+'</b><span>Barang mati (&gt;90 hari)</span></div>'+
     '<div class="'+((r.kedaluwarsaLewat||r.kedaluwarsa30)?'bad':'ok')+'"><b>'+r.kedaluwarsaLewat+' / '+r.kedaluwarsa30+'</b><span>Kedaluwarsa: lewat / &le;30 hari</span></div><div><b>'+(r.akurasiOpname!=null?r.akurasiOpname+'%':'-')+'</b><span>Akurasi opname'+(r.opnameHitung?' ('+r.opnameHitung+' barang)':'')+'</span></div></div>';
    h+='<h3>Yang perlu perhatian</h3>'+perhatian(d);
    h+='<h3>1. Stok kritis &amp; perlu dibeli</h3><div class="mut">Stok bebas = Moka + Accurate dikurangi alokasi proyek dan permintaan berjalan.</div>'+
      '<b>Di bawah buffer paket</b>'+tbl(["Kode","Barang","Sat","Status","Buffer","Bebas","Kurang","Harga","Perkiraan"],["t","t","t","t","n","n","n","r","r"],d.kritis,15,"Semua barang buffer aman.")+
      '<b>Kebutuhan proyek yang belum tertutup stok</b>'+tbl(["Kode","Barang","Sat","Butuh","Bebas","Kurang","Harga","Perkiraan"],["t","t","t","n","n","n","r","r"],d.beli,15,"Kebutuhan proyek tertutup stok.");
    h+='<h3>2. Pemakaian proyek vs RAB</h3>'+tbl(["No PPBJ","Proyek","Dept","Status","Nilai RAB","Nilai keluar (bersih)","% terpakai","Keluar terakhir","Melebihi","Luar RAB"],["t","t","t","t","r","r","n","d","n","n"],d.proyek,20,"Tidak ada proyek berjalan.")+
      '<div class="mut">Termasuk proyek Aktif, Ditunda Sebentar, dan Selesai pada periode ini. Rincian barang per proyek ada di Excel (lembar "Material per Proyek").</div>';
    h+='<h3>3. Perputaran &amp; barang mati</h3><b>Paling banyak keluar periode ini</b>'+tbl(["Kode","Barang","Sat","Keluar","Stok kini","Rasio keluar/stok","Nilai keluar"],["t","t","t","n","n","n","r"],d.top,10,"Tidak ada barang keluar.")+
      '<b>Tidak bergerak &gt; 90 hari ('+r.mati+' barang, '+juta(r.nilaiMati)+')</b>'+tbl(["Kode","Barang","Sat","Stok","Harga","Nilai","Keluar terakhir","Hari"],["t","t","t","n","r","r","t","n"],d.mati,12,"Tidak ada barang mati.");
    h+='<h3>4. Hasil opname &amp; akurasi</h3>'+tbl(["Sesi","Dihitung","Sesuai","Selisih","Temuan","Diabaikan","Belum diketahui","Akurasi %","Nilai selisih"],["t","n","n","n","n","n","n","n","r"],d.opname,12,"Tidak ada opname pada periode ini.")+
      (d.opnameSelisih&&d.opnameSelisih.length?'<b>Selisih terbesar</b>'+tbl(["Sesi","Kode","Barang","Sistem","Fisik","Selisih","Nilai","Status"],["t","t","t","n","n","n","r","t"],d.opnameSelisih,10):"");
    h+='<h3>5. Kinerja layanan permintaan</h3><div class="mut">'+(L.dikirim||0)+' permintaan masuk, '+(L.selesai||0)+' sudah diserahkan, '+(L.ditolak||0)+' ditolak. Angka = rata-rata lama di tiap tahap.</div>'+
      tbl(["Tahap","Jumlah permintaan","Rata-rata (hari)"],["t","n","n"],L.tahap||[],8)+
      '<b>Masih menunggu &gt; 2 hari (di mana macet)</b>'+tbl(["Dokumen","Pemohon","Dept","Tahap sekarang","Umur (hari)","Dikirim"],["t","t","t","t","n","d"],L.macet||[],12,"Tidak ada permintaan yang macet.");
    h+='<h3>6. Pengecualian</h3><b>Barang keluar tanpa No PPBJ ('+(d.tanpaPpbj||[]).length+')</b>'+tbl(["Tanggal","Dokumen","Dept","Barang","Qty","Nilai","Oleh"],["d","t","t","t","n","r","t"],d.tanpaPpbj,10,"Tidak ada.")+
      '<b>Keluar di luar RAB ('+(d.diluarRab||[]).length+')</b>'+tbl(["No PPBJ","Proyek","Kode","Barang","Qty keluar","Nilai"],["t","t","t","t","n","r"],d.diluarRab,10,"Tidak ada.")+
      '<b>Melebihi RAB ('+(d.melebihiRab||[]).length+')</b>'+tbl(["No PPBJ","Proyek","Kode","Barang","RAB","Keluar","Lebih","Nilai lebih"],["t","t","t","t","n","n","n","r"],d.melebihiRab,10,"Tidak ada.");
    h+='<h3>7. Kedaluwarsa</h3>'+tbl(["Kode","Barang","Sat","Batch","Qty","Tgl kedaluwarsa","Sisa hari","Kategori","Status"],["t","t","t","t","n","d","n","t","t"],d.kedaluwarsa,15,"Tidak ada batch mendekati kedaluwarsa (90 hari).")+
      ((d.kedaluwarsaTutup&&d.kedaluwarsaTutup.length)?'<b>Sudah ditangani periode ini</b>'+tbl(["Kode","Barang","Batch","Qty","Tgl","Status","Diproses","Catatan"],["t","t","t","n","d","t","t","t"],d.kedaluwarsaTutup,10):"");
    h+='<h3>Lampiran: ringkasan mutasi periode ini</h3>'+tbl(["Jenis","Jumlah transaksi","Qty masuk","Qty keluar","Nilai bersih"],["t","n","n","n","r"],d.ringMut,12,"Tidak ada mutasi.")+
      '<div class="mut">Rincian '+nf(r.mutasiBaris)+' baris mutasi dan daftar stok lengkap ada di file Excel (lembar "Mutasi" dan "Stok").</div></div>';
    el.innerHTML=h;
  }
  function excel(d,info,nama){
    if(typeof XLSX==="undefined")return false;
    var r=d.ringkas,L=d.layanan||{},wb=XLSX.utils.book_new();
    function add(n,rows,w){var ws=XLSX.utils.aoa_to_sheet(rows);if(w)ws["!cols"]=w.map(function(x){return {wch:x};});ws["!freeze"]={xSplit:0,ySplit:1};XLSX.utils.book_append_sheet(wb,ws,n.slice(0,31));}
    var R=[["Laporan Gudang - PT Sarana Catur Tirta Kelola"],["Jenis",info.jenis],["Periode",tgl(info.dari)+" s/d "+tgl(info.sampai)],["Dibuat",info.dibuat],["Dasar nilai",d.meta.harga],[],["RINGKASAN","Nilai / Jumlah"],
      ["Nilai barang keluar",r.nilaiKeluar],["Nilai barang masuk",r.nilaiMasuk],["Nilai stok saat ini",r.nilaiStok],["Jumlah barang berstok",r.sku],["Dokumen serah",r.dokSerah],["Permintaan masuk",r.permintaan],["Permintaan ditolak",r.ditolak],
      ["Stok kritis (barang)",r.kritis],["Perkiraan nilai pembelian",r.nilaiBeli],["Barang mati >90 hari (barang)",r.mati],["Nilai barang mati",r.nilaiMati],["Kedaluwarsa sudah lewat (batch)",r.kedaluwarsaLewat],["Kedaluwarsa <=30 hari (batch)",r.kedaluwarsa30],
      ["Akurasi opname %",r.akurasiOpname==null?"":r.akurasiOpname],["Keluar tanpa No PPBJ (baris)",r.tanpaPpbj],["Keluar melebihi RAB (barang)",r.melebihiRab],["Keluar di luar RAB (barang)",r.diluarRab],["Barang berstok tanpa harga",r.tanpaHargaStok]];
    add("Ringkasan",R,[38,22]);
    add("Stok Kritis",[["Kode","Barang","Satuan","Status","Buffer","Stok bebas","Kurang","Harga","Perkiraan nilai"]].concat(d.kritis),[14,36,8,10,10,10,10,12,14]);
    add("Perlu Dibeli",[["Kode","Barang","Satuan","Kebutuhan proyek","Stok bebas","Kurang","Harga","Perkiraan nilai"]].concat(d.beli),[14,36,8,14,10,10,12,14]);
    add("Proyek Berjalan",[["No PPBJ","Proyek","Departemen","Status","Nilai RAB","Nilai keluar (bersih)","% terpakai","Tgl keluar terakhir","Barang melebihi RAB","Barang di luar RAB","RAB tersedia"]].concat(d.proyek),[16,34,12,16,16,18,10,16,14,14,14]);
    add("Material per Proyek",[["No PPBJ","Proyek","Kode","Barang","Satuan","RAB","Keluar total","Kembali","Keluar bersih","Sisa RAB","Keluar periode ini","Nilai keluar bersih","Keluar terakhir","Catatan"]].concat(d.material),[16,28,14,34,8,9,11,9,11,10,12,15,14,14]);
    add("Perputaran",[["Kode","Barang","Satuan","Keluar periode","Stok sekarang","Rasio keluar/stok","Nilai keluar"]].concat(d.top),[14,36,8,12,12,14,14]);
    add("Barang Mati",[["Kode","Barang","Satuan","Stok (Moka+Accurate)","Harga","Nilai","Keluar terakhir","Hari tanpa keluar"]].concat(d.mati),[14,36,8,16,12,14,18,14]);
    add("Opname",[["Sesi","Dihitung","Sesuai","Selisih","Temuan","Diabaikan","Belum diketahui","Akurasi %","Nilai selisih"]].concat(d.opname),[28,10,9,9,9,10,14,10,14]);
    add("Opname Selisih",[["Sesi","Kode","Barang","Stok sistem","Hasil hitung","Selisih","Nilai selisih","Status"]].concat(d.opnameSelisih||[]),[24,14,34,11,11,9,14,12]);
    var LY=[["Tahap","Jumlah permintaan","Rata-rata (hari)"]].concat(L.tahap||[]);LY.push([]);LY.push(["Permintaan masuk",L.dikirim]);LY.push(["Sudah diserahkan",L.selesai]);LY.push(["Ditolak",L.ditolak]);LY.push([]);LY.push(["MASIH MENUNGGU > 2 HARI"]);LY.push(["Dokumen","Pemohon","Departemen","Tahap sekarang","Umur (hari)","Dikirim"]);
    add("Layanan",LY.concat(L.macet||[]),[24,20,16,24,12,14]);
    add("Tanpa PPBJ",[["Tanggal","Dokumen","Departemen","Barang","Qty","Nilai","Oleh"]].concat(d.tanpaPpbj||[]),[12,16,14,36,8,14,14]);
    add("Luar RAB",[["No PPBJ","Proyek","Kode","Barang","Qty keluar","Nilai"]].concat(d.diluarRab||[]),[16,30,14,36,10,14]);
    add("Melebihi RAB",[["No PPBJ","Proyek","Kode","Barang","RAB","Keluar bersih","Lebih","Nilai lebih"]].concat(d.melebihiRab||[]),[16,30,14,36,9,12,9,14]);
    add("Kedaluwarsa",[["Kode","Barang","Satuan","Batch","Qty","Tgl kedaluwarsa","Sisa hari","Kategori","Status","Catatan"]].concat(d.kedaluwarsa||[]).concat([[],["SUDAH DITANGANI PERIODE INI"],["Kode","Barang","Batch","Qty","Tgl","Status","Diproses","Catatan"]]).concat(d.kedaluwarsaTutup||[]),[14,34,8,12,9,14,10,14,12,30]);
    add("Ringkasan Mutasi",[["Jenis","Jumlah transaksi","Qty masuk","Qty keluar","Nilai bersih"]].concat(d.ringMut),[26,16,12,12,16]);
    add("Mutasi",[["Waktu","Kode","Barang","Jenis","Sumber","Qty (+/-)","Saldo sumber","Referensi","Departemen","Proyek","Keterangan","Oleh","Harga"]].concat(d.mutasi),[16,14,34,14,10,10,12,18,14,22,30,12,12]);
    add("Stok",[["Kode","Barang","Satuan","Bekas","Moka","Accurate","Total","Harga","Nilai (Moka+Accurate)"]].concat(d.stok),[14,36,8,9,9,10,9,12,16]);
    XLSX.writeFile(wb,nama||("laporan_gudang_"+(info.sampai||"")+".xlsx"));return true;
  }
  return {render:render,excel:excel,esc:esc,rp:rp,nf:nf,tgl:tgl,juta:juta,tbl:tbl,injectCss:injectCss};
})();
