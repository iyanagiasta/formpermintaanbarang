/* Proyek Pintar (Tambahan 25): prioritas, kesiapan material, rebutan menurut prioritas, halaman proyek, simulasi,
   daftar belanja, dan peringatan di Serah Barang. Dipakai tab Proyek dan Serah Barang di admin.html. */
var PX=(function(){
  var D=null,F={q:"",status:"",prio:"",dept:"",tanda:"",jenis:""};
  var PC={Tinggi:"var(--red,#a82424)",Biasa:"inherit",Rendah:"var(--mut,#4a5b68)"};
  function $(i){return document.getElementById(i);}
  function rp(n){return n==null?"-":(n<0?"-":"")+"Rp "+Math.abs(Math.round(n)).toLocaleString("id-ID");}
  function tgl(s){var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s||""));return m?m[3]+"/"+m[2]+"/"+m[1]:String(s||"");}
  function tiles(a){return '<div class="sum">'+a.map(function(t){return '<div><b'+(t[2]?' style="color:'+t[2]+'"':'')+'>'+t[0]+'</b><span>'+t[1]+'</span></div>';}).join("")+'</div>';}
  function tab(kep,baris,rata){return '<div class="tw"><table><thead><tr>'+kep.map(function(k,i){return '<th'+(rata&&rata.indexOf(i)>=0?' class="nm"':'')+'>'+k+'</th>';}).join("")+'</tr></thead><tbody>'+baris.map(function(r){var i=-1;return r.replace(/<td(?![^>]*data-l)/g,function(){i++;return '<td data-l="'+esc(String(kep[i]||"").replace(/<[^>]*>/g,""))+'"';});}).join("")+'</tbody></table></div>';}
  function xlsx(nama,sheets){
    if(typeof XLSX==="undefined"){toast("Pembaca Excel belum termuat. Periksa internet lalu muat ulang halaman.",true);return;}
    var wb=XLSX.utils.book_new();sheets.forEach(function(s){XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(s[1]),s[0].slice(0,30));});XLSX.writeFile(wb,nama);
  }
  function prioBadge(p){return '<span class="bd '+(p==="Tinggi"?"b":p==="Rendah"?"l":"w")+'">'+esc(p)+'</span>';}
  function bar(p){if(p==null)return '<small class="note">belum ada kebutuhan</small>';var w=p>=90?"var(--grn,#14602f)":p>=60?"var(--warn-t,#6b4300)":"var(--red,#a82424)";return '<div style="display:flex;align-items:center;gap:6px"><div style="flex:1;min-width:60px;height:8px;background:var(--line,#cfd8de);border-radius:4px"><div style="width:'+p+'%;height:8px;background:'+w+';border-radius:4px"></div></div><b style="color:'+w+'">'+p+'%</b></div>';}
  /* ---- panel atas tab Proyek ---- */
  async function muat(){
    var w=$("pxtop");if(!w)return;
    var r;try{var pp=null;try{if(window.__pre&&window.__pre.p&&Date.now()-window.__pre.t<90000){pp=window.__pre.p;window.__pre.p=null;}}catch(e0){}r=await (pp||api({action:"adminProyekPintar"}));}catch(e){w.innerHTML='<div class="note">Ringkasan pintar gagal dimuat (tidak terhubung).</div>';return;}
    if(!r.ok){w.innerHTML='<div class="note">'+esc(r.msg||"Gagal memuat ringkasan.")+'</div>';return;}
    D=r;var R=r.ringkas;
    w.innerHTML=tiles([[R.aktif,"Proyek mengikat stok"],[R.tinggi,"Prioritas Tinggi"],[R.terancam,"Proyek terancam kekurangan",R.terancam?"var(--red,#a82424)":""],[R.jalanDuluan,"Proyek bergerak, proyek lain terancam",R.jalanDuluan?"var(--warn-t,#6b4300)":""],[R.dokTertahan,"Dokumen tertahan di Accurate",R.dokTertahan?"var(--red,#a82424)":""],[R.tanpaRab,"Belum ada RAB"]])+
      (r.tanpaPpbj.length?'<div class="card"><b>Barang keluar tanpa No PPBJ</b> <span class="note" style="margin:0">belum diinput ke Accurate; lengkapi lewat Kotak Pengingat PPBJ</span>'+tab(["Departemen","Dokumen","Nilai","Menunggu paling lama"],r.tanpaPpbj.map(function(x){return '<tr><td><b>'+esc(x.dept)+'</b></td><td class="nm">'+x.dok+'</td><td class="nm">'+rp(x.nilai)+'</td><td class="nm">'+x.tertua+' hari</td></tr>';}),[1,2,3])+'<div class="bar noprint"><button class="gh" id="pxkp">Buka Daftar Kerja (Kotak Pengingat)</button></div></div>':"")+
      '<div class="bar noprint" id="pxf"></div>';
    if($("pxkp"))$("pxkp").onclick=function(){goTab("kerja");};
    saring();isi();
  }
  function filterUI(){
    var f=$("pxf");if(!f||!D)return;
    var dep={};D.rows.forEach(function(x){if(x.dept)dep[x.dept]=1;});
    function ch(k,v,l){return '<button class="chip'+(F[k]===v?" on":"")+'" data-fk="'+k+'" data-fv="'+v+'">'+l+'</button>';}
    f.innerHTML='<input id="pxq" placeholder="Cari No PPBJ / keterangan" value="'+esc(F.q)+'" style="max-width:220px">'+
      ch("status","","Semua status")+ch("status","Aktif","Aktif")+ch("status","Ditunda Sebentar","Ditunda Sebentar")+ch("prio","Tinggi","Prioritas Tinggi")+ch("prio","Rendah","Rendah")+ch("tanda","terancam","Terancam")+ch("tanda","jalan","Jalan duluan")+ch("tanda","kurang","Ada yang kurang")+ch("tanda","tertahan","Dokumen tertahan")+ch("tanda","order","Ada barang ORDER")+ch("jenis","SL","Proyek SL")+ch("jenis","Reguler","Reguler")+
      '<select id="pxd"><option value="">Semua departemen</option>'+Object.keys(dep).sort().map(function(d){return '<option'+(F.dept===d?" selected":"")+'>'+esc(d)+'</option>';}).join("")+'</select>'+
      '<button class="gh" id="pxsl" title="Cari proyek yang isi RAB-nya memuat barang paket Sambungan Langsung">Cari proyek SL</button><button class="gh" id="pxb">Daftar belanja</button><button class="sv" id="pxbs" title="Kebutuhan semua proyek + buffer - stok bebas">Daftar beli keseluruhan</button><button class="gh" id="pxor" title="Barang ORDER per PPBJ: dipesan, diterima sebagian, lengkap">Monitor ORDER</button><button class="gh" id="pxx">Unduh Excel</button>';
    Array.prototype.forEach.call(f.querySelectorAll("[data-fk]"),function(b){b.onclick=function(){var k=b.getAttribute("data-fk"),v=b.getAttribute("data-fv");F[k]=(F[k]===v&&v!=="")?"":v;saring();filterUI();};});
    $("pxq").oninput=function(){F.q=this.value;saring();};$("pxd").onchange=function(){F.dept=this.value;saring();};
    $("pxsl").onclick=dugaan;$("pxb").onclick=belanja;$("pxbs").onclick=beli;$("pxor").onclick=function(){OM.buka(pane(),api,toast,drawProyek);};$("pxx").onclick=excelDaftar;
  }
  function lolos(x){
    var q=F.q.trim().toLowerCase();
    if(q&&!cocokQ(x.ppbj+" "+x.ket+" "+x.dept,q))return false;
    if(F.status&&x.status!==F.status)return false;if(F.prio&&x.prio!==F.prio)return false;if(F.jenis&&(x.jenis||"Reguler")!==F.jenis)return false;if(F.tanda==="order"&&!x.nOrder)return false;if(F.dept&&x.dept!==F.dept)return false;
    if(F.tanda==="terancam"&&!x.terancamOleh.length)return false;if(F.tanda==="jalan"&&!x.jalanDuluan)return false;if(F.tanda==="kurang"&&!x.nKurang)return false;if(F.tanda==="tertahan"&&!x.dok.tertahan)return false;
    return true;
  }
  function saring(){
    if(!D)return;filterUI();
    var by={};D.rows.forEach(function(x){by[x.ppbj.toLowerCase()]=x;});
    Array.prototype.forEach.call(document.querySelectorAll("[data-pxr]"),function(tr){var x=by[tr.getAttribute("data-pxr").toLowerCase()];tr.classList.toggle("krgx",!!x&&!lolos(x));});
  }
  /* ---- sel kesiapan & peringatan di tiap baris ---- */
  function isi(){
    if(!D)return;var by={};D.rows.forEach(function(x){by[x.ppbj.toLowerCase()]=x;});
    Array.prototype.forEach.call(document.querySelectorAll("[data-pxp]"),function(td){
      var x=by[td.getAttribute("data-pxp").toLowerCase()];if(!x){td.innerHTML="-";return;}
      td.innerHTML='<select data-prio="'+esc(x.ppbj)+'" title="Prioritas proyek. Menentukan siapa dilayani lebih dulu bila stok tidak cukup untuk semua.">'+["Tinggi","Biasa","Rendah"].map(function(p){return '<option'+(x.prio===p?" selected":"")+'>'+p+'</option>';}).join("")+'</select>';
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-pxj]"),function(td){
      var x=by[td.getAttribute("data-pxj").toLowerCase()];if(!x){td.innerHTML="-";return;}
      td.innerHTML='<select data-jenis="'+esc(x.ppbj)+'" title="Jenis proyek. Hanya untuk filter dan laporan; tidak mengubah perhitungan stok atau buffer.">'+["Reguler","SL"].map(function(j){return '<option'+((x.jenis||"Reguler")===j?" selected":"")+'>'+j+'</option>';}).join("")+'</select>';
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-pxk]"),function(td){
      var x=by[td.getAttribute("data-pxk").toLowerCase()];if(!x){td.innerHTML="-";return;}
      var h='';
      if(x.mengikat)h+=bar(x.kesiapan);
      var b=[];if(x.nKurang)b.push('<span class="bd b">Kurang '+x.nKurang+'</span>');if(x.nRebutanTerancam)b.push('<span class="bd w">Terancam '+x.nRebutanTerancam+'</span>');if(x.nTipis)b.push('<span class="bd l" title="Stok hanya sedikit di atas total kebutuhan">Tipis '+x.nTipis+'</span>');
      if(b.length)h+='<div style="margin-top:4px">'+b.join(" ")+'</div>';
      if(x.nOrder)h+='<small style="display:block;color:var(--warn-t,#6b4300)"><b>'+x.nOrder+' barang berstatus ORDER</b> (menurut PDF PPBJ)</small>';
      if(x.rab)h+='<small class="note" style="display:block">RAB '+(x.rab.persen==null?"-":x.rab.persen+"%")+' terpakai &middot; <b>'+esc(x.rab.kondisi)+'</b></small>';
      if(x.dok.belum)h+='<small class="note" style="display:block">Accurate: '+x.dok.siap+' siap'+(x.dok.tertahan?', <b style="color:var(--red,#a82424)">'+x.dok.tertahan+' tertahan</b>':"")+'</small>';
      if(x.terancamOleh.length)h+='<small style="display:block;color:var(--red,#a82424)">Terancam oleh '+x.terancamOleh.map(function(o){return esc(o.ppbj)+(o.lebihRendah?" (prioritas lebih rendah)":"");}).join(", ")+'</small>';
      if(x.jalanDuluan)h+='<small style="display:block;color:var(--warn-t,#6b4300)">Bergerak duluan: berpotensi mengurangi jatah '+x.mengancam.map(function(o){return esc(o.ppbj);}).join(", ")+'</small>';
      h+='<div style="margin-top:4px"><button class="gh" data-buka="'+esc(x.ppbj)+'">Buka proyek</button></div>';
      td.innerHTML=h;
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-prio]"),function(s){s.onchange=async function(){var r=await api({action:"adminProyekPrioritas",ppbj:s.getAttribute("data-prio"),prio:s.value});toast(r.msg||(r.ok?"Tersimpan.":"Gagal."),!r.ok);if(r.ok)muat();};});
    Array.prototype.forEach.call(document.querySelectorAll("[data-jenis]"),function(s){s.onchange=async function(){var r=await api({action:"adminProyekJenis",ppbj:s.getAttribute("data-jenis"),jenis:s.value});toast(r.msg||(r.ok?"Tersimpan.":"Gagal."),!r.ok);if(r.ok)muat();};});
    Array.prototype.forEach.call(document.querySelectorAll("[data-buka]"),function(b){b.onclick=function(){buka(b.getAttribute("data-buka"));};});
    saring();
  }
  /* ---- halaman satu proyek ---- */
  var SK={Kurang:"var(--red,#a82424)",Rebutan:"var(--warn-t,#6b4300)",Cukup:"var(--grn,#14602f)",Terpenuhi:"var(--grn,#14602f)"};
  async function buka(ppbj){
    pane().innerHTML='<div class="card msg">Memuat proyek...</div>';
    var r=await api({action:"adminProyekRinci",ppbj:ppbj});if(!r.ok){toast(r.msg||"Gagal.",true);drawProyek();return;}
    var P=r.proyek,sisa=r.items.filter(function(x){return x.status!=="Terpenuhi";});
    pane().innerHTML='<div class="bar noprint"><button class="gh" id="pxback">&larr; Kembali ke daftar proyek</button><button class="gh" id="pxsim">Kalau proyek ini mulai (simulasi)</button><button class="gh" id="pxrx">Unduh Excel proyek ini</button></div>'+
      '<div class="card"><b>'+esc(P.ppbj)+'</b> &middot; '+esc(P.ket)+' <span class="bd '+stCls(P.status)+'">'+esc(P.status)+'</span> '+prioBadge(P.prio)+(P.jenis==="SL"?' <span class="bd d">SL</span>':"")+'<div class="note" style="margin-top:6px">Departemen '+esc(P.dept||"-")+'. '+(P.mengikat?'':'Proyek ini tidak mengikat stok, jadi tidak ikut bersaing. ')+(P.adaRab?'':'Belum ada RAB untuk proyek ini.')+'</div></div>'+
      tiles([[P.kesiapan==null?"-":P.kesiapan+"%","Kesiapan material"],[r.items.length,"Barang di RAB"],[P.nKurang,"Kurang",P.nKurang?"var(--red,#a82424)":""],[P.nRebutanTerancam,"Terancam (rebutan)",P.nRebutanTerancam?"var(--warn-t,#6b4300)":""],[P.rab?(P.rab.persen==null?"-":P.rab.persen+"%"):"-","RAB terpakai"],[r.nDokumen,"Dokumen"]].concat(P.nOrder?[[P.nOrder,"Barang berstatus ORDER","var(--warn-t,#6b4300)"]]:[]))+
      (P.terancamOleh.length?'<div class="note" style="border-left:3px solid var(--red,#a82424);padding-left:8px">Terancam kekurangan karena bersaing dengan: '+P.terancamOleh.map(function(o){return '<b>'+esc(o.ppbj)+'</b> ('+esc(o.prio)+', '+o.barang+' barang)'+(o.lebihRendah?' <b>prioritasnya lebih rendah dari proyek ini</b>':"");}).join("; ")+'.</div>':"")+
      '<h3 style="font-size:15px;margin:14px 0 4px">Ketersediaan barang proyek ini</h3>'+
      (r.items.length?tab(["Barang","RAB","Sudah diserahkan","Dialokasikan","Sisa kebutuhan","Stok bebas","Total kebutuhan semua proyek","Status","Bersaing dengan"],r.items.map(function(x){var ket=x.status==="Rebutan"&&x.kurangPrioritas>0?'<small style="color:var(--red,#a82424)">Menurut prioritas, kurang '+fmtN(x.kurangPrioritas)+'</small>':x.status==="Rebutan"?'<small>Aman menurut prioritas</small>':x.status==="Kurang"?'<small style="color:var(--red,#a82424)">Kurang '+fmtN(x.kurangSendiri)+' (perlu dibeli)</small>':x.tipis?'<small>Stok tipis</small>':"";return '<tr><td><b>'+esc(x.nama||x.kode)+'</b>'+(x.order?' <span class="bd w" title="Menurut PDF PPBJ barang ini akan dipesan">ORDER</span>':"")+'<small>'+esc(x.kode)+(x.satuan?' &middot; '+esc(x.satuan):"")+'</small></td><td class="nm">'+fmtN(x.rab)+'</td><td class="nm">'+fmtN(x.serah)+'</td><td class="nm">'+fmtN(x.alok)+'</td><td class="nm">'+fmtN(x.sisa)+'</td><td class="nm">'+fmtN(x.bebas)+'</td><td class="nm">'+fmtN(x.total)+'</td><td><b style="color:'+(SK[x.status]||"inherit")+'">'+esc(x.status)+'</b>'+ket+'</td><td>'+(x.pesaing.length?x.pesaing.map(function(o){return esc(o.ppbj)+' <small>'+esc(o.prio)+' &middot; '+fmtN(o.sisa)+'</small>';}).join("<br>"):"-")+'</td></tr>';}),[1,2,3,4,5,6]):'<div class="card msg">Belum ada kebutuhan (RAB) untuk proyek ini.</div>')+
      '<h3 style="font-size:15px;margin:14px 0 4px">Dokumen barang keluar dan pengembalian</h3>'+
      (r.dokumen.length?tab(["Dokumen","Tanggal","Jenis","Baris","Nilai","Status di Accurate"],r.dokumen.map(function(x){return '<tr><td><b>'+esc(x.doc)+'</b></td><td>'+tgl(x.tgl)+'</td><td>'+esc(x.jenis)+'</td><td class="nm">'+x.baris+'</td><td class="nm">'+rp(x.nilai)+'</td><td>'+(x.accurate==="Tertahan"?'<b style="color:var(--red,#a82424)">Tertahan</b>':esc(x.accurate))+'</td></tr>';}),[3,4]):'<div class="card msg">Belum ada barang keluar atas proyek ini.</div>')+
      '<div id="pxsimh"></div>';
    $("pxback").onclick=function(){drawProyek();};$("pxsim").onclick=function(){simulasi(P.ppbj);};
    $("pxrx").onclick=function(){xlsx("proyek_"+String(P.ppbj).replace(/[^\w-]+/g,"_")+".xlsx",[["Ketersediaan",[["Kode","Nama","Satuan","RAB","Diserahkan","Dialokasikan","Sisa","Stok bebas","Total kebutuhan semua proyek","Status","Kurang menurut prioritas","Bersaing dengan"]].concat(r.items.map(function(x){return [x.kode,x.nama,x.satuan,x.rab,x.serah,x.alok,x.sisa,x.bebas,x.total,x.status,x.kurangPrioritas,x.pesaing.map(function(o){return o.ppbj+" ("+o.prio+")";}).join(", ")];}))],["Dokumen",[["Dokumen","Tanggal","Jenis","Baris","Nilai","Status di Accurate"]].concat(r.dokumen.map(function(x){return [x.doc,x.tgl,x.jenis,x.baris,x.nilai,x.accurate];}))]]);};
  }
  /* ---- simulasi ---- */
  async function simulasi(ppbj){
    var o=$("pxsimh");o.innerHTML='<div class="card msg">Menghitung simulasi...</div>';
    var r=await api({action:"adminProyekSimulasi",ppbj:ppbj});if(!r.ok){o.innerHTML="";toast(r.msg||"Gagal.",true);return;}
    var S=r.ringkas;
    o.innerHTML='<div class="card"><b>Kalau '+esc(r.ppbj)+' mulai sekarang</b> <span class="note" style="margin:0">(simulasi, tidak mengubah data apa pun)</span>'+
      tiles([[S.barang,"Barang dibutuhkan"],[S.kurang,"Barang kurang",S.kurang?"var(--red,#a82424)":""],[rp(S.nilaiKurang),"Perkiraan nilai yang perlu dibeli"],[S.proyekTerdampak.length,"Proyek lain terdampak",S.proyekTerdampak.length?"var(--warn-t,#6b4300)":""]])+
      (S.proyekTerdampak.length?'<div class="note" style="border-left:3px solid var(--warn-t,#6b4300);padding-left:8px">Terdampak: '+S.proyekTerdampak.map(function(x){return '<b>'+esc(x.ppbj)+'</b> ('+esc(x.prio)+')';}).join(", ")+'.</div>':'<div class="note">Tidak ada proyek lain yang ikut kekurangan.</div>')+
      (r.rows.length?tab(["Barang","Kebutuhan","Stok bebas","Bisa dipenuhi","Kurang","Nilai kurang","Proyek yang jadi kurang"],r.rows.map(function(x){return '<tr><td><b>'+esc(x.nama||x.kode)+'</b><small>'+esc(x.kode)+(x.tidakAda?' &middot; belum ada di stok':'')+'</small></td><td class="nm">'+fmtN(x.sisa)+'</td><td class="nm">'+fmtN(x.bebas)+'</td><td class="nm">'+fmtN(x.dapat)+'</td><td class="nm"><b style="color:'+(x.kurang>0?"var(--red,#a82424)":"inherit")+'">'+fmtN(x.kurang)+'</b></td><td class="nm">'+(x.nilaiKurang==null?"-":rp(x.nilaiKurang))+'</td><td>'+(x.dampak.length?x.dampak.map(function(d){return esc(d.ppbj)+' <small>'+esc(d.prio)+' &middot; tambah kurang '+fmtN(d.tambahKurang)+'</small>';}).join("<br>"):"-")+'</td></tr>';}),[1,2,3,4,5]):'<div class="card msg">Proyek ini tidak punya sisa kebutuhan.</div>')+
      '<div class="note">'+esc(r.catatan)+'</div></div>';
    o.scrollIntoView&&o.scrollIntoView({behavior:"smooth",block:"nearest"});
  }
  /* ---- daftar belanja ---- */
  function belanja(){
    if(!D)return;var B=D.beli||[],K=D.ringkasKurang||{};
    pane().innerHTML='<div class="bar noprint"><button class="gh" id="pxback">&larr; Kembali ke daftar proyek</button><button class="gh" id="pxbx">Unduh Excel</button></div>'+
      '<div class="card"><b>Daftar belanja dari kekurangan semua proyek</b><div class="note">Barang yang total kebutuhan semua proyek aktifnya melebihi stok bebas. Jumlah kurang = kebutuhan semua proyek dikurangi stok bebas. Belum mempertimbangkan barang yang sedang dipesan (sistem pengadaan belum ada).</div></div>'+
      tiles([[B.length,"Jenis barang perlu dibeli"],[rp(K.nilaiBeli||0),"Perkiraan nilai"],[K.tanpaHarga||0,"Barang tanpa harga"]])+
      (B.length?tab(["Barang","Total kebutuhan","Stok bebas","Perlu dibeli","Perkiraan nilai","Dibutuhkan oleh"],B.map(function(x){return '<tr><td><b>'+esc(x.nama||x.kode)+'</b><small>'+esc(x.kode)+(x.satuan?' &middot; '+esc(x.satuan):'')+'</small></td><td class="nm">'+fmtN(x.total)+'</td><td class="nm">'+fmtN(x.bebas)+'</td><td class="nm"><b>'+fmtN(x.kurang)+'</b></td><td class="nm">'+(x.nilai==null?"-":rp(x.nilai))+'</td><td><small>'+esc(x.proyek)+'</small></td></tr>';}),[1,2,3,4]):'<div class="card msg">Semua kebutuhan proyek aktif tercukupi stok bebas.</div>');
    $("pxback").onclick=function(){drawProyek();};
    $("pxbx").onclick=function(){xlsx("daftar_belanja_proyek.xlsx",[["Daftar belanja",[["Kode","Nama","Satuan","Total kebutuhan","Stok bebas","Perlu dibeli","Perkiraan nilai","Dibutuhkan oleh"]].concat(B.map(function(x){return [x.kode,x.nama,x.satuan,x.total,x.bebas,x.kurang,x.nilai==null?"":x.nilai,x.proyek];}))]]);};
  }
  function excelDaftar(){
    if(!D)return;
    xlsx("kesiapan_proyek.xlsx",[["Proyek",[["PPBJ","Keterangan","Departemen","Status","Prioritas","Kesiapan %","Barang RAB","Kurang","Terancam","Tipis","RAB terpakai %","Kondisi RAB","Dokumen Accurate siap","Dokumen tertahan","Terancam oleh","Bergerak duluan","Jenis proyek","Barang ORDER"]].concat(D.rows.filter(lolos).map(function(x){return [x.ppbj,x.ket,x.dept,x.status,x.prio,x.kesiapan==null?"":x.kesiapan,x.nItem,x.nKurang,x.nRebutanTerancam,x.nTipis,x.rab&&x.rab.persen!=null?x.rab.persen:"",x.rab?x.rab.kondisi:"",x.dok.siap,x.dok.tertahan,x.terancamOleh.map(function(o){return o.ppbj;}).join(", "),x.jalanDuluan?"Ya":"",x.jenis||"Reguler",x.nOrder||0];}))]]);
  }
  /* ---- peringatan di Serah Barang ---- */
  async function peringatan(id){
    try{var r=await api({action:"adminSerahPeringatan",id:id});if(!r.ok||!r.n)return true;
      var seen={},baris=[];r.peringatan.forEach(function(x){var k=x.ppbj;(seen[k]=seen[k]||[]).push(x);});
      Object.keys(seen).forEach(function(k){var L=seen[k];baris.push("- "+k+" (prioritas "+L[0].prio+") kekurangan "+L.map(function(x){return x.nama+" "+fmtN(x.kurang);}).join(", ")+(L.some(function(x){return x.lebihRendah;})?". Proyek peminta berprioritas lebih rendah.":"")+(L.some(function(x){return x.diLuarRab;})?" Barang ini di luar RAB peminta.":""));});
      return confirm("PERINGATAN: stok barang ini terbatas untuk proyek lain.\n\n"+baris.join("\n")+"\n\nBarang tetap boleh diserahkan. Lanjutkan?");
    }catch(e){return true;}
  }

  /* ---- daftar beli keseluruhan: proyek + buffer (Tambahan 26) ---- */
  var BL=null,BUD="";
  function anggaran(rows,budget){
    var L=[];rows.forEach(function(x,i){
      if(x.tanpaHarga)return;
      (x.rinci||[]).forEach(function(p){L.push({i:i,tier:p.prio==="Tinggi"?1:p.prio==="Biasa"?2:4,label:p.ppbj+" ("+p.prio+")",qty:p.qty,h:x.harga});});
      if(x.cadangan>0)L.push({i:i,tier:3,label:"Buffer",qty:x.cadangan,h:x.harga});
    });
    L.sort(function(a,b){return a.tier-b.tier||a.i-b.i;});
    var rem=budget,res={};
    L.forEach(function(l){
      var full=l.qty*l.h,beli=0;
      if(full<=rem+1e-9)beli=l.qty;else beli=Math.floor(Math.max(0,rem)/l.h);
      rem-=beli*l.h;l.beli=beli;var r=res[l.i]||(res[l.i]={beli:0,perlu:0,nilai:0});r.beli+=beli;r.perlu+=l.qty;r.nilai+=beli*l.h;
    });
    return {res:res,sisa:rem,pakai:budget-rem};
  }
  async function beli(){
    pane().innerHTML='<div class="card msg">Menghitung daftar beli...</div>';
    var r=await api({action:"adminBeliSemua"});if(!r.ok){toast(r.msg||"Gagal.",true);drawProyek();return;}
    BL=r;gambarBeli();
  }
  function gambarBeli(){
    var r=BL,R=r.ringkas,b=Number(String(BUD).replace(/[^\d]/g,""))||0,A=b>0?anggaran(r.rows,b):null,tn=r.rows.filter(function(x){return x.tanpaHarga;});
    pane().innerHTML='<div class="bar noprint"><button class="gh" id="pxback">&larr; Kembali ke daftar proyek</button><button class="gh" id="pxbx">Unduh Excel</button></div>'+
      '<div class="card"><b>Daftar beli keseluruhan (proyek + buffer)</b><div class="note">'+esc(r.catatan)+'</div></div>'+
      tiles([[R.barang,"Barang perlu dibeli"],[rp(R.nilai),"Perkiraan nilai total"],[rp(R.nilaiWajib),"Wajib (untuk proyek)"],[rp(R.nilaiCadangan),"Cadangan (buffer)"],[R.tanpaHarga,"Barang tanpa harga",R.tanpaHarga?"var(--red,#a82424)":""]])+
      '<div class="card noprint"><b>Mode anggaran</b> <span class="note" style="margin:0">hanya usulan susunan di layar; tidak membuat pesanan</span><div class="fr" style="margin-top:6px"><input id="pxbud" inputmode="numeric" placeholder="Batas dana, mis. 50000000" value="'+esc(BUD)+'" style="max-width:220px"><button class="sv" id="pxbgo">Susun</button><button class="gh" id="pxbrs">Hapus anggaran</button></div>'+
      (A?'<div class="note" style="margin-top:6px">Urutan: kebutuhan proyek prioritas <b>Tinggi</b>, lalu <b>Biasa</b>, lalu <b>buffer</b>, lalu proyek <b>Rendah</b>. Masuk anggaran <b>'+rp(A.pakai)+'</b> dari '+rp(b)+'; sisa '+rp(A.sisa)+'. Barang tanpa harga ('+tn.length+') tidak ikut dihitung.</div>':'')+'</div>'+
      (r.rows.length?tab(["Barang","Proyek","Buffer","Stok bebas","Perlu dibeli","Sudah dipesan","Sisa beli","Wajib","Cadangan","Nilai","Dibutuhkan oleh"].concat(A?["Anggaran"]:[]),r.rows.map(function(x,i){
        var a=A&&A.res[i];
        var st=!A?"":x.tanpaHarga?'<td><span class="bd l">tanpa harga</span></td>':!a||a.perlu===0?'<td>-</td>':a.beli>=a.perlu-1e-9?'<td><span class="bd d">Dibeli penuh</span></td>':a.beli>0?'<td><span class="bd w">Sebagian '+fmtN(a.beli)+' dari '+fmtN(a.perlu)+'</span></td>':'<td><span class="bd b">Ditunda</span></td>';
        return '<tr><td><b>'+esc(x.nama||x.kode)+'</b><small>'+esc(x.kode)+(x.satuan?' &middot; '+esc(x.satuan):'')+(x.tidakAda?' &middot; belum ada di stok':'')+'</small></td><td class="nm">'+fmtN(x.proyek)+'</td><td class="nm">'+fmtN(x.buffer)+'</td><td class="nm">'+fmtN(x.bebas)+'</td><td class="nm"><b>'+fmtN(x.beli)+'</b></td><td class="nm">'+(x.dipesan?fmtN(x.dipesan):'-')+'</td><td class="nm"><b>'+fmtN(x.sisaBeli==null?x.beli:x.sisaBeli)+'</b></td><td class="nm">'+fmtN(x.wajib)+'</td><td class="nm">'+fmtN(x.cadangan)+'</td><td class="nm">'+(x.tanpaHarga?'<span class="bd l">tanpa harga</span>':rp(x.nilai))+'</td><td><small>'+(x.rinci.length?x.rinci.map(function(p){return esc(p.ppbj)+' <span style="color:'+(PC[p.prio]||"inherit")+'">'+esc(p.prio)+'</span> '+fmtN(p.qty);}).join("<br>"):"")+(x.cadangan>0?(x.rinci.length?"<br>":"")+'Buffer '+fmtN(x.cadangan)+(x.paket.length?' ('+esc(x.paket.join(", "))+')':""):"")+'</small></td>'+st+'</tr>';}),[1,2,3,4,5,6,7]):'<div class="card msg">Semua kebutuhan proyek dan buffer tercukupi stok bebas.</div>');
    $("pxback").onclick=function(){drawProyek();};
    $("pxbgo").onclick=function(){BUD=$("pxbud").value;gambarBeli();};$("pxbud").onkeydown=function(e){if(e.key==="Enter"){BUD=this.value;gambarBeli();}};
    $("pxbrs").onclick=function(){BUD="";gambarBeli();};
    $("pxbx").onclick=function(){
      var rows=[["Kode","Nama","Satuan","Kebutuhan proyek","Minimal buffer","Stok bebas","Perlu dibeli","Wajib (proyek)","Cadangan (buffer)","Harga","Nilai total","Prioritas tertinggi","Dibutuhkan oleh","Sudah dipesan (PO terisi)","Sisa yang perlu dipesan","Stok fisik (Moka+Accurate)","Alokasi proyek","Permintaan berjalan","Stok Bekas (tidak dihitung)"].concat(A?["Anggaran"]:[])].concat(r.rows.map(function(x,i){
        var a=A&&A.res[i];return [x.kode,x.nama,x.satuan,x.proyek,x.buffer,x.bebas,x.beli,x.wajib,x.cadangan,x.harga==null?"":x.harga,x.nilai==null?"":x.nilai,x.prioTertinggi,x.rinci.map(function(p){return p.ppbj+" ("+p.prio+") "+p.qty;}).concat(x.cadangan>0?["Buffer "+x.cadangan+(x.paket.length?" ["+x.paket.join(", ")+"]":"")]:[]).join("; "),x.dipesan||0,x.sisaBeli==null?x.beli:x.sisaBeli,x.fisik,x.alokTot,x.tercTot,x.bekas ].concat(A?[x.tanpaHarga?"tanpa harga":!a||a.perlu===0?"":a.beli>=a.perlu-1e-9?"Dibeli penuh":a.beli>0?"Sebagian "+a.beli+" dari "+a.perlu:"Ditunda"]:[]);}));
      var jj=[["Kode","Nama","Proyek","Prioritas","RAB","Sudah diserahkan","Dialokasikan","Sedang diminta","Sisa kebutuhan"]];r.rows.forEach(function(x){x.jejak.forEach(function(p){jj.push([x.kode,x.nama,p.ppbj,p.prio,p.rab,p.serah,p.alok,p.minta,p.sisa]);});});
      var det=[["Kode","Nama","Proyek / Buffer","Prioritas","Qty perlu dibeli"]];r.rows.forEach(function(x){x.rinci.forEach(function(p){det.push([x.kode,x.nama,p.ppbj,p.prio,p.qty]);});if(x.cadangan>0)det.push([x.kode,x.nama,"Buffer"+(x.paket.length?" ("+x.paket.join(", ")+")":""),"Buffer",x.cadangan]);});
      xlsx("daftar_beli_keseluruhan.xlsx",[["Daftar beli",rows],["Rincian per proyek",det],["Jejak perhitungan",jj],["Ringkasan",[["Daftar beli keseluruhan (proyek + buffer)"],[r.catatan],[],["Barang perlu dibeli",R.barang],["Nilai total",R.nilai],["Wajib (proyek)",R.nilaiWajib],["Cadangan (buffer)",R.nilaiCadangan],["Barang tanpa harga",R.tanpaHarga]].concat(A?[[],["Anggaran",b],["Masuk anggaran",A.pakai],["Sisa anggaran",A.sisa]]:[]) ]]);};
  }
  /* ---- Serahkan semua (Tab Serah Barang) ---- */
  async function serahSemua(btn){
    btn.disabled=true;
    try{
      var c=await api({action:"adminSerahSemuaCek"});if(!c.ok){toast(c.msg||"Gagal.",true);return;}
      if(!c.layak.length){toast("Tidak ada dokumen yang bisa diserahkan otomatis"+(c.lewati.length?" ("+c.lewati.length+" perlu diisi manual).":"."),true);return;}
      var m="Serahkan "+c.layak.length+" dokumen sekaligus sesuai saran stok (urutan: proyek prioritas Tinggi lebih dulu)?\n\n"+c.layak.slice(0,15).map(function(d){return "- "+d.doc+" ("+d.dept+(d.ppbj?", "+d.ppbj:"")+")";}).join("\n")+(c.layak.length>15?"\n- ... dan "+(c.layak.length-15)+" lainnya":"");
      if(c.lewati.length)m+="\n\nDILEWATI ("+c.lewati.length+", isi manual):\n"+c.lewati.slice(0,8).map(function(d){return "- "+d.doc+": "+d.alasan;}).join("\n");
      if(c.peringatan.length)m+="\n\nPERINGATAN: proyek ini kekurangan barang yang sama:\n"+c.peringatan.map(function(w){return "- "+w.ppbj+" (prioritas "+w.prio+"): "+w.barang.join(", ");}).join("\n")+"\n(Barang tetap boleh diserahkan.)";
      if(!confirm(m))return;
      var tot=0,gagal=[],ids=c.layak.map(function(d){return d.id;});
      for(var ronde=0;ronde<8&&ids.length;ronde++){
        var r=await api({action:"adminSerahSemua",ids:ids});if(!r.ok){toast(r.msg||"Gagal.",true);break;}
        tot+=r.selesai;gagal=gagal.concat(r.gagal);
        var sudah={};(r.dok||[]).forEach(function(d){sudah[d]=1;});
        if(!r.sisa)break;
        ids=c.layak.filter(function(d){return !sudah[d.doc]&&ids.indexOf(d.id)>=0;}).map(function(d){return d.id;});
      }
      toast(tot+" dokumen diserahkan"+(gagal.length?", "+gagal.length+" gagal: "+gagal.map(function(g){return g.doc+" ("+g.msg+")";}).join("; "):"")+".",gagal.length>0);
      loadSerah();
    }catch(e){toast("Gagal terhubung ke server.",true);}
    finally{btn.disabled=false;}
  }
  /* ---- Cari proyek SL: dugaan dari isi RAB (Tambahan 28) ---- */
  async function dugaan(){
    pane().innerHTML='<div class="card msg">Mencari proyek yang memuat barang paket SL...</div>';
    var r=await api({action:"adminSlDugaan"});if(!r.ok){toast(r.msg||"Gagal.",true);drawProyek();return;}
    var L=r.rows||[];
    pane().innerHTML='<div class="bar noprint"><button class="gh" id="sdback">&larr; Kembali ke daftar proyek</button></div>'+
      '<div class="card"><b>Diduga proyek Sambungan Langsung (SL)</b><div class="note">Dari isi RAB: proyek yang memuat barang dari paket '+(r.paket.length?r.paket.map(function(n){return "<b>"+esc(n)+"</b>";}).join(", "):"SL")+(r.nKodePaket?' ('+r.nKodePaket+' jenis barang)':"")+'. Sebagian cocok pun ditampilkan dengan persentasenya; Anda yang memutuskan. Tanda SL hanya untuk filter dan laporan, tidak mengubah perhitungan stok atau buffer.</div></div>'+
      (r.msg?'<div class="card msg">'+esc(r.msg)+'</div>':"")+
      (L.length?'<div class="bar noprint"><button class="sv" id="sdsl">Tandai terpilih sebagai SL</button><button class="gh" id="sdreg">Kembalikan terpilih ke Reguler</button><button class="gh" id="sdpil">Pilih yang 60% ke atas</button><span class="note" id="sdn"></span></div>'+
      tab(["","No PPBJ","Proyek","Status","Jenis","Cocok paket SL","Contoh barang"],L.map(function(x,i){return '<tr><td><input type="checkbox" data-sd="'+i+'" aria-label="Pilih '+esc(x.ppbj)+'"></td><td><b>'+esc(x.ppbj)+'</b></td><td>'+esc(x.ket)+'</td><td>'+esc(x.status)+'</td><td>'+(x.jenis==="SL"?'<span class="bd d">SL</span>':'Reguler')+'</td><td>'+bar(x.persen)+'<small class="note">'+x.nCocok+' dari '+x.nItem+' barang RAB</small></td><td><small>'+x.contoh.map(esc).join(", ")+'</small></td></tr>';})):(r.msg?"":'<div class="card msg">Tidak ada proyek yang RAB-nya memuat barang paket SL.</div>'));
    $("sdback").onclick=function(){drawProyek();};
    if(!L.length)return;
    function pilih(){var o=[];Array.prototype.forEach.call(pane().querySelectorAll("[data-sd]:checked"),function(c){o.push(L[+c.getAttribute("data-sd")].ppbj);});return o;}
    function hit(){$("sdn").textContent=pilih().length+" dipilih";}
    Array.prototype.forEach.call(pane().querySelectorAll("[data-sd]"),function(c){c.onchange=hit;});
    $("sdpil").onclick=function(){Array.prototype.forEach.call(pane().querySelectorAll("[data-sd]"),function(c){var x=L[+c.getAttribute("data-sd")];c.checked=x.persen>=60&&x.jenis!=="SL";});hit();};
    async function tandai(j){var p=pilih();if(!p.length){toast("Centang proyek dulu.",true);return;}var rr=await api({action:"adminProyekJenis",ppbj:p,jenis:j});toast(rr.msg||(rr.ok?"Tersimpan.":"Gagal."),!rr.ok);if(rr.ok)dugaan();}
    $("sdsl").onclick=function(){tandai("SL");};$("sdreg").onclick=function(){tandai("Reguler");};hit();
  }
  function tolakJenis(ppbj){if(!D||!F.jenis)return false;var x=D.rows.filter(function(o){return String(o.ppbj).toLowerCase()===String(ppbj).toLowerCase();})[0];return !!x&&(x.jenis||"Reguler")!==F.jenis;}
  return {beli:beli,serahSemua:serahSemua,muat:muat,isi:isi,buka:buka,peringatan:peringatan,simulasi:simulasi,belanja:belanja,dugaan:dugaan,tolakJenis:tolakJenis};
})();
