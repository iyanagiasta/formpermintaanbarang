/* Laporan Pintar (Tambahan 24): Pusat Laporan, Tren 6 bulan + anomali, Laju RAB, Kerapian data, Segel & tautan baca,
   serta penjelas selisih stok Accurate. Dipakai tab Laporan dan Accurate di admin.html (memakai api, esc, fmtN, toast, pane, goTab). */
var LX=(function(){
  var ALAT=[["pusat","Pusat Laporan"],["proyek","Per proyek"],["tren","Tren 6 bulan"],["rab","Laju RAB"],["rapi","Kerapian data"],["segel","Segel & tautan"]];
  var S={view:"pusat",dari:"",sampai:"",tab:"dept",data:null,cache:{}};
  function $(i){return document.getElementById(i);}
  function p2(n){return String(n).padStart(2,"0");}
  function iso(d){return d.getFullYear()+"-"+p2(d.getMonth()+1)+"-"+p2(d.getDate());}
  function hari(n){var t=new Date();return iso(new Date(t.getFullYear(),t.getMonth(),t.getDate()-n));}
  function tgl(s){var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s||""));return m?m[3]+"/"+m[2]+"/"+m[1]:String(s||"");}
  function rp(n){return n==null?"-":(n<0?"-":"")+"Rp "+Math.abs(Math.round(n)).toLocaleString("id-ID");}
  function pc(o){if(o==null||o.persen==null)return '<span class="note" style="margin:0">baru</span>';var up=o.persen>0;return '<span style="color:'+(up?"var(--red,#a82424)":"var(--grn,#14602f)")+'">'+(o.persen===0?"=":(up?"&#9650; +":"&#9660; ")+o.persen+"%")+'</span>';}
  function tiles(a){return '<div class="sum">'+a.map(function(t){return '<div><b'+(t[2]?' style="color:'+t[2]+'"':'')+'>'+t[0]+'</b><span>'+t[1]+'</span></div>';}).join("")+'</div>';}
  function tab(kep,baris,rata){return '<div class="tw"><table><thead><tr>'+kep.map(function(k,i){return '<th'+(rata&&rata.indexOf(i)>=0?' class="nm"':'')+'>'+k+'</th>';}).join("")+'</tr></thead><tbody>'+baris.map(function(r){var i=-1;return r.replace(/<td(?![^>]*data-l)/g,function(){i++;return '<td data-l="'+esc(String(kep[i]||"").replace(/<[^>]*>/g,""))+'"';});}).join("")+'</tbody></table></div>';}
  function salin(teks,ok){
    function fb(){var t=document.createElement("textarea");t.value=teks;t.style.cssText="position:fixed;opacity:0";document.body.appendChild(t);t.select();var b=false;try{b=document.execCommand("copy");}catch(e){}document.body.removeChild(t);return b;}
    if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(teks).then(function(){toast(ok||"Tersalin.");},function(){toast(fb()?(ok||"Tersalin."):"Gagal menyalin. Salin manual.",!fb());});}
    else toast(fb()?(ok||"Tersalin."):"Gagal menyalin. Salin manual.",false);
  }
  function xlsx(nama,sheets){
    if(typeof XLSX==="undefined"){toast("Pembaca Excel belum termuat. Periksa internet lalu muat ulang halaman.",true);return;}
    var wb=XLSX.utils.book_new();sheets.forEach(function(s){XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(s[1]),s[0].slice(0,30));});XLSX.writeFile(wb,nama);
  }
  function tombol(cur){return ALAT.map(function(a){return '<button class="chip'+(cur===a[0]?" on":"")+'" data-lv="'+a[0]+'">'+a[1]+'</button>';}).join("");}
  function periode(){
    var t=new Date(),aw=iso(new Date(t.getFullYear(),t.getMonth(),1)),lalu1=iso(new Date(t.getFullYear(),t.getMonth()-1,1)),lalu2=iso(new Date(t.getFullYear(),t.getMonth(),0)),th=iso(new Date(t.getFullYear(),0,1));
    var P=[["Bulan ini",aw,iso(t)],["Bulan lalu",lalu1,lalu2],["30 hari",hari(29),iso(t)],["Tahun ini",th,iso(t)]];
    return '<div class="bar noprint"><label class="fl">Dari <input type="date" id="lxd" value="'+esc(S.dari)+'"></label><label class="fl">Sampai <input type="date" id="lxs" value="'+esc(S.sampai)+'"></label><button class="gh" id="lxgo">Tampilkan</button>'+
      P.map(function(x,i){return '<button class="chip" data-lp="'+i+'">'+x[0]+'</button>';}).join("")+'</div>';
  }
  function bar(){
    if(!S.dari){var t=new Date();S.dari=iso(new Date(t.getFullYear(),t.getMonth(),1));S.sampai=iso(t);}
    return '<div class="bar noprint" id="lxbar">'+tombol(S.view)+'</div>';
  }
  function pasangBar(root,muat){
    Array.prototype.forEach.call(root.querySelectorAll("[data-lv]"),function(b){b.onclick=function(){S.view=b.getAttribute("data-lv");if(S.view==="proyek"){window.loadLaporan();}else muat();};});
  }
  async function panggil(a,ekstra){var r=await api(Object.assign({action:a},ekstra||{}));if(!r.ok){toast(r.msg||"Gagal.",true);return null;}return r;}
  function pasangPeriode(root,muat){
    var P=[["Bulan ini"],["Bulan lalu"],["30 hari"],["Tahun ini"]],t=new Date();
    var pr=[[iso(new Date(t.getFullYear(),t.getMonth(),1)),iso(t)],[iso(new Date(t.getFullYear(),t.getMonth()-1,1)),iso(new Date(t.getFullYear(),t.getMonth(),0))],[hari(29),iso(t)],[iso(new Date(t.getFullYear(),0,1)),iso(t)]];
    Array.prototype.forEach.call(root.querySelectorAll("[data-lp]"),function(b){b.onclick=function(){var x=pr[+b.getAttribute("data-lp")];S.dari=x[0];S.sampai=x[1];muat();};});
    if($("lxgo"))$("lxgo").onclick=function(){S.dari=$("lxd").value||S.dari;S.sampai=$("lxs").value||S.sampai;muat();};
  }
  /* ---- Pusat Laporan ---- */
  async function pusat(){
    var r=await panggil("adminLapPintar",{dari:S.dari,sampai:S.sampai});if(!r)return;S.data=r;
    var pa=null;try{pa=await api({action:"adminPaList",sinkron:false});}catch(e){}
    var T=r.total,B=r.banding,TABS=[["dept","Departemen"],["proyek","Proyek"],["barang","Barang"],["kategori","Kategori"]],L=(r.rekap||{})[S.tab]||[];
    var h=bar()+periode()+
      '<div class="card"><b>Ringkasan periode</b> <button class="gh noprint" id="lxsl" style="margin-left:8px">Salin ringkasan</button><p style="margin:8px 0 0" id="lxnar">'+esc(r.narasi)+'</p></div>'+
      tiles([[rp(T.nilai)+' '+pc(B.nilai),"Nilai pemakaian (Moka + Accurate)"],[T.baris+' '+pc(B.baris),"Baris barang diserahkan"],[fmtN(T.bekas),"Qty Bekas (tidak dinilai)"],[T.tanpaPpbj,"Baris tanpa No PPBJ",T.tanpaPpbj?"var(--red,#a82424)":""],[T.tanpaHarga,"Baris tanpa harga",T.tanpaHarga?"var(--red,#a82424)":""],[T.kembali,"Sisa proyek dikembalikan"]])+
      '<div class="note">Dibanding periode sebelumnya, '+tgl(B.dari)+' s.d. '+tgl(B.sampai)+' ('+rp(B.nilai.lalu)+'). Klik satu baris untuk melihat transaksi pembentuknya.</div>'+
      '<div class="bar noprint">'+TABS.map(function(x){return '<button class="chip'+(S.tab===x[0]?" on":"")+'" data-lt="'+x[0]+'">'+x[1]+'</button>';}).join("")+'<button class="gh" id="lxxl">Unduh Excel</button></div>'+
      (L.length?tab([TABS.filter(function(x){return x[0]===S.tab;})[0][1],"Baris","Qty","Nilai","Periode lalu","Perubahan"],L.map(function(x,i){return '<tr class="dd" data-ri="'+i+'" style="cursor:pointer"><td><b>'+esc(x.label||x.k)+'</b></td><td class="nm">'+x.baris+'</td><td class="nm">'+fmtN(x.qty)+'</td><td class="nm"><b>'+rp(x.nilai)+'</b></td><td class="nm">'+rp(x.lalu)+'</td><td class="nm">'+pc(x)+'</td></tr>';}),[1,2,3,4,5]):'<div class="card msg">Belum ada barang diserahkan pada rentang ini.</div>')+
      '<div id="lxrinci"></div><div id="lxacc">'+kartuAcc(pa)+'</div>';
    pane().innerHTML=h;pasangBar(pane(),muatAktif);pasangPeriode(pane(),muatAktif);
    $("lxsl").onclick=function(){salin("Laporan pemakaian barang gudang. "+r.narasi,"Ringkasan tersalin.");};
    Array.prototype.forEach.call(pane().querySelectorAll("[data-lt]"),function(b){b.onclick=function(){S.tab=b.getAttribute("data-lt");pusat();};});
    Array.prototype.forEach.call(pane().querySelectorAll("tr.dd"),function(tr){tr.onclick=function(){rinci(S.tab,L[+tr.getAttribute("data-ri")]);};});
    $("lxxl").onclick=function(){xlsx("laporan_pintar_"+S.dari+"_sd_"+S.sampai+".xlsx",[["Ringkasan",[["Laporan Pemakaian Barang"],["Periode",tgl(S.dari)+" s.d. "+tgl(S.sampai)],[r.narasi],[],["Nilai",T.nilai],["Baris",T.baris],["Periode lalu (nilai)",B.nilai.lalu],["Perubahan %",B.nilai.persen==null?"":B.nilai.persen]]]].concat(TABS.map(function(x){return [x[1],[[x[1],"Baris","Qty","Nilai","Periode lalu","Perubahan %"]].concat(((r.rekap||{})[x[0]]||[]).map(function(y){return [y.label||y.k,y.baris,y.qty,y.nilai,y.lalu,y.persen==null?"":y.persen];}))];})));};
    if($("lxgoacc"))$("lxgoacc").onclick=function(){goTab("accurate");};
  }
  function kartuAcc(pa){
    if(!pa||!pa.ok)return "";var R=pa.ringkas;
    return '<div class="card"><b>Antrean Accurate</b><p style="margin:6px 0">Dari semua dokumen yang belum diinput: <b>'+R.siap+'</b> siap diinput, <b style="color:'+(R.tertahan?"var(--red,#a82424)":"inherit")+'">'+R.tertahan+'</b> tertahan (belum ada No PPBJ atau proyek belum terdaftar)'+(R.tertahanLintasBulan?', <b style="color:var(--red,#a82424)">'+R.tertahanLintasBulan+'</b> di antaranya dari bulan sebelumnya':"")+'.'+(R.tertahanTertua?' Yang tertua menunggu '+R.tertahanTertua+' hari.':"")+'</p><button class="gh noprint" id="lxgoacc">Buka tab Accurate</button></div>';
  }
  async function rinci(by,x){
    var o=$("lxrinci");o.innerHTML='<div class="card msg">Memuat transaksi...</div>';
    var r=await panggil("adminLapRinci",{dari:S.dari,sampai:S.sampai,by:by,key:x.k});if(!r){o.innerHTML="";return;}
    o.innerHTML='<div class="card"><b>'+esc(x.label||x.k)+'</b> <span class="note" style="margin:0">'+r.total+' baris, '+rp(r.nilai)+(r.terpotong?' (menampilkan sebagian)':'')+'</span> <button class="gh noprint" id="lxrx">Unduh Excel</button> <button class="gh noprint" id="lxrc">Tutup</button>'+
      tab(["Waktu","Dokumen","Barang","Departemen / Proyek","Qty","Nilai"],r.rows.map(function(m){return '<tr><td>'+esc(m.waktu)+'</td><td><b>'+esc(m.doc)+'</b><small>'+esc(m.jenis)+'</small></td><td><b>'+esc(m.nama)+'</b><small>'+esc(m.kode)+(m.kat?" &middot; "+esc(m.kat):"")+'</small></td><td>'+esc(m.dept)+'<small>'+esc(m.ppbj)+'</small></td><td class="nm">'+fmtN(m.qty)+(m.bekas?'<small>Bekas '+fmtN(m.bekas)+'</small>':"")+'</td><td class="nm">'+(m.tanpaHarga?'<span class="bd w">tanpa harga</span>':rp(m.nilai))+'</td></tr>';}),[4,5])+'</div>';
    $("lxrc").onclick=function(){o.innerHTML="";};
    $("lxrx").onclick=function(){xlsx("bukti_"+String(x.k).replace(/[^\w-]+/g,"_")+".xlsx",[["Bukti",[["Waktu","Dokumen","Jenis","Kode","Nama","Kategori","Departemen","PPBJ","Qty","Bekas","Nilai","Oleh"]].concat(r.rows.map(function(m){return [m.waktu,m.doc,m.jenis,m.kode,m.nama,m.kat,m.dept,m.ppbj,m.qty,m.bekas,m.tanpaHarga?"":m.nilai,m.oleh];}))]]);};
    o.scrollIntoView&&o.scrollIntoView({behavior:"smooth",block:"nearest"});
  }
  /* ---- Tren ---- */
  function garis(v){var mx=Math.max.apply(null,v.concat([1])),w=120,hh=26;return '<svg width="'+w+'" height="'+hh+'" viewBox="0 0 '+w+' '+hh+'" aria-hidden="true"><polyline fill="none" stroke="currentColor" stroke-width="2" points="'+v.map(function(y,i){return Math.round(i*(w-4)/(v.length-1)+2)+","+Math.round(hh-3-(y/mx)*(hh-6));}).join(" ")+'"/></svg>';}
  async function tren(){
    var r=await panggil("adminLapTren",{bulan:6});if(!r)return;
    var bl=r.bulan;
    function blok(jd,L,kunciLabel){return L.length?'<h3 style="font-size:15px;margin:14px 0 4px">'+jd+'</h3>'+tab([kunciLabel].concat(bl.map(function(b){return b;})).concat(["Pola"]),L.map(function(o){return '<tr><td><b>'+esc(o.label||o.k)+'</b></td>'+o.v.map(function(y){return '<td class="nm">'+rp(y)+'</td>';}).join("")+'<td>'+garis(o.v)+'</td></tr>';}),[1,2,3,4,5,6]):"";}
    pane().innerHTML=bar()+
      '<div class="note">Bulan terakhir ('+bl[bl.length-1]+') baru berjalan '+r.hariBerjalan+' hari'+(r.faktorProyeksi>1?"; angka proyeksi akhir bulan memakai faktor "+r.faktorProyeksi:"")+'. Tanda anomali hanya muncul jika ada minimal 3 bulan riwayat.</div>'+
      '<div class="card"><b>Pemakaian total per bulan</b>'+tab(bl,[ '<tr>'+r.total.map(function(y){return '<td class="nm"><b>'+rp(y)+'</b></td>';}).join("")+'</tr>'],bl.map(function(_,i){return i;}))+'</div>'+
      '<div class="card"><b>Anomali (lonjakan di luar kebiasaan)</b>'+(r.anomali.length?tab(["Jenis","Nama","Bulan ini (berjalan)","Proyeksi bulan","Biasanya","Kali lipat"],r.anomali.map(function(a){return '<tr><td>'+esc(a.jenis)+'</td><td><b>'+esc(a.label||a.k)+'</b></td><td class="nm">'+rp(a.berjalan)+'</td><td class="nm">'+rp(a.sekarang)+'</td><td class="nm">'+rp(a.rata)+'</td><td class="nm"><b style="color:var(--red,#a82424)">'+a.kali+'x</b></td></tr>';}),[2,3,4,5]):'<p class="note">Tidak ada lonjakan yang menonjol.</p>')+'</div>'+
      blok("Per departemen",r.dept,"Departemen")+blok("Per proyek",r.proyek,"Proyek")+
      '<div class="bar noprint"><button class="gh" id="lxtx">Unduh Excel</button></div>';
    pasangBar(pane(),muatAktif);
    $("lxtx").onclick=function(){xlsx("tren_pemakaian.xlsx",[["Total",[["Bulan"].concat(bl),["Nilai"].concat(r.total)]],["Departemen",[["Departemen"].concat(bl)].concat(r.dept.map(function(o){return [o.k].concat(o.v);}))],["Proyek",[["Proyek"].concat(bl)].concat(r.proyek.map(function(o){return [o.label||o.k].concat(o.v);}))],["Anomali",[["Jenis","Nama","Nilai","Biasanya","Kali lipat"]].concat(r.anomali.map(function(a){return [a.jenis,a.label||a.k,a.sekarang,a.rata,a.kali];}))]]);};
  }
  /* ---- Laju RAB ---- */
  var WK={"Melebihi":"var(--red,#a82424)","Habis dalam 30 hari":"var(--red,#a82424)","Waspada":"var(--warn-t,#6b4300)","Aman":"var(--grn,#14602f)"};
  async function rab(){
    var r=await panggil("adminLapRab");if(!r)return;
    pane().innerHTML=bar()+tiles([["Melebihi"],["Habis dalam 30 hari"],["Waspada"],["Aman"]].map(function(k){return [r.hitung[k[0]]||0,k[0],WK[k[0]]];}))+
      '<div class="note">'+esc(r.catatan)+'</div>'+
      (r.rows.length?tab(["Proyek","Nilai RAB","Terpakai","%","Sisa","Laju/hari","Perkiraan habis","Kondisi"],r.rows.map(function(x){return '<tr><td><b>'+esc(x.ppbj)+'</b><small>'+esc(x.proyek)+' &middot; '+esc(x.dept)+'</small></td><td class="nm">'+rp(x.rab)+(x.barangTanpaHarga?'<small>'+x.barangTanpaHarga+' barang RAB tanpa harga</small>':"")+'</td><td class="nm">'+rp(x.pakai)+'</td><td class="nm">'+(x.persen==null?"-":x.persen+"%")+'</td><td class="nm" style="color:'+(x.sisa<0?"var(--red,#a82424)":"inherit")+'">'+rp(x.sisa)+'</td><td class="nm">'+rp(x.laju)+'</td><td>'+(x.hari!=null?tgl(x.tglHabis)+'<small>sekitar '+x.hari+' hari lagi</small>':"-")+'</td><td><b style="color:'+WK[x.kondisi]+'">'+x.kondisi+'</b></td></tr>';}),[1,2,3,4,5]):'<div class="card msg">Belum ada proyek aktif yang punya RAB.</div>')+
      (r.tanpaRab.length?'<div class="card"><b>Proyek sudah memakai barang tetapi belum punya RAB</b>'+tab(["Proyek","Departemen","Terpakai"],r.tanpaRab.map(function(x){return '<tr><td><b>'+esc(x.ppbj)+'</b><small>'+esc(x.proyek)+'</small></td><td>'+esc(x.dept)+'</td><td class="nm">'+rp(x.pakai)+'</td></tr>';}),[2])+'</div>':"")+
      '<div class="bar noprint"><button class="gh" id="lxrb">Unduh Excel</button></div>';
    pasangBar(pane(),muatAktif);
    $("lxrb").onclick=function(){xlsx("laju_rab.xlsx",[["Laju RAB",[["PPBJ","Proyek","Dept","RAB","Terpakai","%","Sisa","Laju/hari","Perkiraan habis","Kondisi"]].concat(r.rows.map(function(x){return [x.ppbj,x.proyek,x.dept,x.rab,x.pakai,x.persen==null?"":x.persen,x.sisa,x.laju,x.tglHabis,x.kondisi];}))],["Tanpa RAB",[["PPBJ","Proyek","Dept","Terpakai"]].concat(r.tanpaRab.map(function(x){return [x.ppbj,x.proyek,x.dept,x.pakai];}))]]);};
  }
  /* ---- Kerapian ---- */
  async function rapi(){
    var r=await panggil("adminLapKerapian",{dari:S.dari,sampai:S.sampai});if(!r)return;
    var wr=function(v){return v>=90?"var(--grn,#14602f)":v>=70?"var(--warn-t,#6b4300)":"var(--red,#a82424)";};
    pane().innerHTML=bar()+periode()+tiles([[r.skor+"/100","Skor kerapian data",wr(r.skor)],[r.baris,"Baris diperiksa"],[r.nTertahan,"Dokumen tertahan di Accurate",r.nTertahan?"var(--red,#a82424)":""]])+
      '<div class="note">Skor = 40% kelengkapan No PPBJ + 30% PPBJ terdaftar di sheet Proyek + 30% barang berharga. Semakin rapi, semakin cepat dokumen bisa diinput ke Accurate.</div>'+
      (r.rows.length?tab(["Departemen","Baris","PPBJ terisi","PPBJ terdaftar","Harga ada","Skor","Perlu diperbaiki"],r.rows.map(function(x){return '<tr><td><b>'+esc(x.dept)+'</b></td><td class="nm">'+x.baris+'</td><td class="nm">'+x.ppbj+'%</td><td class="nm">'+x.terdaftar+'%</td><td class="nm">'+x.harga+'%</td><td class="nm"><b style="color:'+wr(x.skor)+'">'+x.skor+'</b></td><td><small>'+(x.tanpaPpbj?x.tanpaPpbj+' tanpa PPBJ. ':"")+(x.belumTerdaftar?x.belumTerdaftar+' PPBJ belum terdaftar. ':"")+(x.tanpaHarga?x.tanpaHarga+' tanpa harga.':"")+'</small></td></tr>';}),[1,2,3,4,5]):'<div class="card msg">Belum ada data pada rentang ini.</div>')+
      '<div class="card"><b>Dokumen yang tertahan</b> <span class="note" style="margin:0">tidak bisa diinput ke Accurate sampai dilengkapi</span>'+(r.tertahan.length?tab(["Dokumen","Tanggal","Departemen","Alasan"],r.tertahan.map(function(x){return '<tr><td><b>'+esc(x.doc)+'</b></td><td>'+esc(x.tgl||"")+'</td><td>'+esc(x.dept||"")+'</td><td>'+esc(x.alasan)+'</td></tr>';})):'<p class="note">Tidak ada.</p>')+'<div class="bar noprint"><button class="gh" id="lxkp">Buka Kotak Pengingat PPBJ</button></div></div>';
    pasangBar(pane(),muatAktif);pasangPeriode(pane(),muatAktif);
    $("lxkp").onclick=function(){goTab("kerja");};
  }
  /* ---- Segel & tautan ---- */
  async function segel(aksi){
    var r=await panggil("adminLapSegel",aksi?{aksi:"segel"}:{});if(!r)return;
    var wk={utuh:["Utuh","g"],berubah:["BERUBAH","r"],belum:["Belum disegel","y"]};
    pane().innerHTML=bar()+
      '<div class="card"><b>Segel pemakaian bulanan</b><p class="note" style="margin:6px 0">Bulan yang sudah lewat disegel otomatis dengan sidik jari data. Jika ada angka lama yang diubah, statusnya berubah menjadi BERUBAH. Segel pertama hanya membuktikan keadaan data saat disegel.</p>'+
      (r.daftar.length?tab(["Periode","Baris","Nilai","Status","Disegel","Sidik jari"],r.daftar.map(function(s){var w=wk[s.status]||[s.status,"y"];return '<tr><td><b>'+esc(s.periode)+'</b></td><td class="nm">'+s.baris+(s.status==="berubah"&&s.barisSegel!=null?'<small>saat segel '+s.barisSegel+'</small>':"")+'</td><td class="nm">'+rp(s.nilai)+(s.status==="berubah"&&s.nilaiSegel!=null?'<small>saat segel '+rp(s.nilaiSegel)+'</small>':"")+'</td><td><span class="tag '+w[1]+'">'+w[0]+'</span></td><td>'+esc(s.disegel||"-")+'<small>'+esc(s.oleh||"")+'</small></td><td><small>'+esc(s.sidik||"")+'</small></td></tr>';}),[1,2]):'<p class="note">Belum ada bulan yang lewat.</p>')+
      '<div class="bar noprint"><button class="sv" id="lxsg">Segel sekarang</button></div></div>'+
      '<div class="card"><b>Tautan baca-saja untuk atasan</b><p class="note" style="margin:6px 0">Atasan membuka laporan pemakaian tanpa PIN. Tautan berlaku 90 hari dan bisa dicabut dari Kotak Pengingat (Laporan Atasan). Pilih bulan berjalan agar isinya ikut berubah tiap bulan.</p>'+
      '<div class="bar noprint"><label class="fl"><input type="checkbox" id="lxot" checked> bulan berjalan (otomatis)</label><button class="sv" id="lxtl">Buat tautan</button></div><div id="lxlk"></div></div>';
    pasangBar(pane(),muatAktif);
    $("lxsg").onclick=function(){segel(true);};
    $("lxtl").onclick=async function(){
      var lb=prompt("Untuk siapa tautan ini? (catatan agar mudah dicabut nanti, mis. Pak GM)","Atasan");if(lb===null)return;
      var b={label:lb};if($("lxot").checked)b.dari="@bulan";else{b.dari=S.dari;b.sampai=S.sampai;}
      var x=await panggil("adminLapTautan",b);if(!x)return;
      $("lxlk").innerHTML='<div style="margin-top:10px"><b>Tautan (berlaku sampai '+esc(x.sampai)+')</b><div class="fr" style="margin-top:6px"><input id="lxlu" readonly style="flex:1;min-width:220px" value="'+esc(x.link)+'"><button id="lxlc" class="sv">Salin</button></div></div>';
      $("lxlc").onclick=function(){salin(x.link,"Tautan tersalin.");};
    };
  }
  /* ---- penjelas selisih stok Accurate (dipakai tab Accurate) ---- */
  async function jembatan(btn){
    if(btn)btn.disabled=true;
    try{
      var r=await panggil("adminPaJembatan",{unduh:true});if(!r)return;
      var o=$("lxjb");o.innerHTML='<div class="card"><b>Penjelas selisih stok Accurate</b><p class="note" style="margin:6px 0">'+esc(r.catatan)+'</p>'+
        tiles([[r.dokumen.keluar,"Dokumen keluar belum diinput"],[r.dokumen.kembali,"Pengembalian belum diinput"],[r.dokumen.opname,"Selisih opname belum diinput"],[rp(r.nilai),"Perkiraan nilai selisih"]])+
        (r.rows.length?tab(["Barang","Keluar","Opname kurang","Kembali","Selisih bersih","Nilai","Stok Accurate (sistem)","Perkiraan di Accurate"],r.rows.slice(0,150).map(function(x){return '<tr><td><b>'+esc(x.nama)+'</b><small>'+esc(x.kode)+'</small></td><td class="nm">'+fmtN(x.keluar)+(x.tertahan?'<small style="color:var(--red,#a82424)">'+fmtN(x.tertahan)+' tertahan</small>':"")+'</td><td class="nm">'+fmtN(x.opname)+'</td><td class="nm">'+fmtN(x.kembali)+'</td><td class="nm"><b>'+fmtN(x.net)+'</b></td><td class="nm">'+rp(x.nilai)+'</td><td class="nm">'+(x.stokAccurate==null?"-":fmtN(x.stokAccurate))+'</td><td class="nm">'+(x.perkiraanDiAccurate==null?"-":fmtN(x.perkiraanDiAccurate))+'</td></tr>';}),[1,2,3,4,5,6,7]):'<p class="note">Tidak ada selisih: semua sudah diinput.</p>')+
        '<div class="bar noprint"><button class="gh" id="lxjx">Unduh Excel</button></div></div>';
      $("lxjx").onclick=function(){xlsx("penjelas_selisih_accurate.xlsx",[["Selisih",[["Kode","Nama","Keluar","Opname kurang","Kembali","Selisih bersih","Nilai","Stok Accurate","Perkiraan di Accurate","Keluar tertahan"]].concat(r.rows.map(function(x){return [x.kode,x.nama,x.keluar,x.opname,x.kembali,x.net,x.nilai==null?"":x.nilai,x.stokAccurate==null?"":x.stokAccurate,x.perkiraanDiAccurate==null?"":x.perkiraanDiAccurate,x.tertahan];}))]]);};
    }finally{if(btn)btn.disabled=false;}
  }
  function muatAktif(){var f={pusat:pusat,tren:tren,rab:rab,rapi:rapi,segel:function(){return segel(false);}}[S.view];if(f)return f();}
  function muat(){pane().innerHTML='<div class="card msg">Memuat...</div>';return muatAktif();}
  return {S:S,bar:bar,tombol:tombol,muat:muat,jembatan:jembatan,pasangBar:pasangBar,
    pakai:function(){return S.view!=="proyek";},
    ke:function(v){S.view=v;}};
})();
