/* Tab admin: Daftar Kerja, Telusur, Kedaluwarsa, Laporan Atasan. Memakai fungsi bawaan admin.html (api, esc, toast, pane, unduhBanyak, tglIso, ensureProyek, pasangProyek, PROC, XLSX). */
function kwrap(h){LPR.injectCss();return '<div class="lp">'+h+'</div>';}
function kt(head,fmt,rows,ket){return LPR.tbl(head,fmt,rows,5000,ket);}
function tanyaEmail(){var v="";try{v=localStorage.getItem("sctk_email_atasan")||"";}catch(e){}var e=prompt("Kirim ke alamat email (satu alamat):",v);if(e===null)return null;e=e.trim();try{localStorage.setItem("sctk_email_atasan",e);}catch(x){}return e;}

/* ===== DAFTAR KERJA ===== */
var KJ=null;
async function loadKerja(){
  pane().innerHTML='<div class="card msg">Memuat daftar kerja...</div>';
  var r;try{r=await api({action:"adminKerja"});}catch(e){pane().innerHTML='<div class="card msg err">Gagal terhubung.</div>';return;}
  if(!r.ok){pane().innerHTML='<div class="card msg err">'+esc(r.msg||"Gagal.")+'</div>';return;}
  KJ=r;drawKerja();
}
function drawKerja(){
  var r=KJ,tag={merah:"r",kuning:"y",biru:"",ok:"g"},h='<div class="bar noprint"><button id="kj_r">Muat ulang</button><button id="kj_x" class="gh">Unduh daftar kerja (Excel)</button><span class="note">Diperbarui '+esc(r.waktu)+' &middot; '+r.total+' hal, '+r.nMerah+' mendesak</span></div>';
  h+='<div class="sum">'+r.items.map(function(i){return '<div><b>'+i.n+'</b><span>'+esc(i.judul)+'</span></div>';}).join("")+'</div>';
  r.items.forEach(function(i){
    if(!i.n)return;
    h+='<div class="card"><p style="margin:0 0 6px"><span class="tag '+(tag[i.tingkat]||"")+'">'+(i.tingkat==="merah"?"Mendesak":i.tingkat==="kuning"?"Perlu tindakan":"Info")+'</span> <b>'+esc(i.judul)+'</b> ('+i.n+')</p>'+kt(i.kolom,i.kolom.map(function(){return "t";}),i.rows)+(i.n>i.rows.length?'<div class="note">Menampilkan '+i.rows.length+' dari '+i.n+'.</div>':'')+'</div>';
  });
  if(!r.total)h+='<div class="card msg">Tidak ada pekerjaan tertunda. Semua beres.</div>';
  pane().innerHTML=kwrap(h);
  document.getElementById("kj_r").onclick=loadKerja;
  document.getElementById("kj_x").onclick=function(){
    var sh=[{n:"Ringkasan",rows:[["Daftar kerja gudang",r.waktu],[],["Pekerjaan","Jumlah","Tingkat"]].concat(r.items.map(function(i){return [i.judul,i.n,i.tingkat];})),w:[48,10,12]}];
    r.items.forEach(function(i){if(i.n)sh.push({n:i.judul.replace(/[\\\/\?\*\[\]:]/g,"").slice(0,31),rows:[i.kolom].concat(i.rows),w:i.kolom.map(function(){return 22;})});});
    if(unduhBanyak("daftar_kerja_"+tglIso(new Date())+".xlsx",sh))toast("Daftar kerja siap diunduh.");
  };
}

/* ===== TELUSUR ===== */
var TL={mode:"barang",q:"",hasil:null,det:null,ppbj:"",cek:null};
function loadTelusur(){drawTelusur();}
function drawTelusur(){
  var h='<div class="tabs noprint"><button data-tm="barang" class="'+(TL.mode==="barang"?"on":"")+'">Riwayat satu barang</button><button data-tm="ppbj" class="'+(TL.mode==="ppbj"?"on":"")+'">Per No PPBJ</button></div>';
  if(TL.mode==="barang"){
    h+='<div class="bar noprint"><input id="tl_q" placeholder="Ketik kode atau nama barang" value="'+esc(TL.q)+'"><button id="tl_c">Cari</button></div><div id="tl_h"></div>';
  }else{
    h+='<div class="bar noprint"><input id="tl_p" placeholder="Ketik No PPBJ (pilih dari daftar proyek)" value="'+esc(TL.ppbj)+'" autocomplete="off"><button id="tl_pc">Telusuri</button></div><div id="tl_h"></div>';
  }
  pane().innerHTML=kwrap(h);
  pane().querySelectorAll("[data-tm]").forEach(function(b){b.onclick=function(){TL.mode=b.getAttribute("data-tm");drawTelusur();};});
  if(TL.mode==="barang"){
    var q=document.getElementById("tl_q");q.onkeydown=function(e){if(e.key==="Enter")cariBarangTL();};document.getElementById("tl_c").onclick=cariBarangTL;
    if(TL.det)drawTLBarang();else if(TL.hasil)drawTLHasil();
  }else{
    var p=document.getElementById("tl_p");p.onkeydown=function(e){if(e.key==="Enter")cariPpbjTL();};document.getElementById("tl_pc").onclick=cariPpbjTL;
    ensureProyek().then(function(){pasangProyek(p,function(){return PROC||[];},function(){cariPpbjTL();});});
    if(TL.cek)drawTLPpbj();
  }
}
async function cariBarangTL(){
  var q=document.getElementById("tl_q").value.trim();TL.q=q;TL.det=null;if(!q)return;
  var r=await api({action:"adminTelusurCari",q:q});if(!r.ok){toast(r.msg||"Gagal",true);return;}
  TL.hasil=r.rows;if(r.rows.length===1){await bukaBarangTL(r.rows[0].kode);return;}drawTLHasil();
}
function drawTLHasil(){
  var h=document.getElementById("tl_h");if(!h)return;
  h.innerHTML=TL.hasil.length?'<div class="card">'+TL.hasil.map(function(x,i){return '<div style="padding:8px 0;border-top:'+(i?'1px solid var(--line)':'0')+';cursor:pointer" data-kb="'+esc(x.kode)+'"><b>'+esc(x.nama)+'</b> <span class="note">'+esc(x.kode)+' &middot; stok '+LPR.nf(x.stok)+' '+esc(x.satuan)+'</span></div>';}).join("")+'</div>':'<div class="card msg">Tidak ada barang yang cocok.</div>';
  h.querySelectorAll("[data-kb]").forEach(function(d){d.onclick=function(){bukaBarangTL(d.getAttribute("data-kb"));};});
}
async function bukaBarangTL(kode){
  var r=await api({action:"adminTelusurBarang",kode:kode});if(!r.ok){toast(r.msg||"Gagal",true);return;}
  TL.det=r;drawTLBarang();
}
function drawTLBarang(){
  var r=TL.det,i=r.info,h=document.getElementById("tl_h");if(!h)return;
  var x='<div class="card"><p style="margin:0"><b>'+esc(i.nama)+'</b> <span class="note">'+esc(i.kode)+' &middot; '+esc(i.satuan)+'</span></p>'+
   '<div class="kpi"><div><b>'+LPR.nf(i.q[0])+'</b><span>Bekas</span></div><div><b>'+LPR.nf(i.q[1])+'</b><span>Moka</span></div><div><b>'+LPR.nf(i.q[2])+'</b><span>Accurate</span></div><div><b>'+LPR.nf(i.bebas)+'</b><span>Stok bebas</span></div><div><b>'+LPR.nf(i.tercadang)+'</b><span>Tercadang permintaan</span></div><div><b>'+(i.harga!=null?LPR.rp(i.harga):"-")+'</b><span>Harga satuan</span></div></div>'+
   '<button id="tl_x" class="gh noprint">Unduh riwayat (Excel)</button></div>';
  x+='<div class="card"><h3 style="margin-top:0">Permintaan berjalan</h3>'+kt(["Dokumen","Pemohon","Dept","No PPBJ","Qty","Status"],["t","t","t","t","n","t"],r.permintaan,"Tidak ada permintaan berjalan.")+'</div>';
  x+='<div class="card"><h3 style="margin-top:0">Kebutuhan RAB &amp; alokasi proyek</h3>'+kt(["No PPBJ","Proyek","Status","RAB","Sudah diserahkan"],["t","t","t","n","n"],r.rab,"Tidak ada di RAB proyek manapun.")+kt(["No PPBJ","Proyek","Qty dialokasi","Status"],["t","t","n","t"],i.alokasi)+'</div>';
  x+='<div class="card"><h3 style="margin-top:0">Kedaluwarsa</h3>'+kt(["Batch","Qty","Tgl","Sisa hari","Status"],["t","n","d","n","t"],r.kedaluwarsa,"Tidak ada batch tercatat.")+'</div>';
  x+='<div class="card"><h3 style="margin-top:0">Penyerahan terakhir</h3>'+kt(["Waktu","Dokumen","Dept","No PPBJ","Qty","Oleh"],["t","t","t","t","n","t"],r.serah,"Belum pernah diserahkan.")+'</div>';
  x+='<div class="card"><h3 style="margin-top:0">Opname</h3>'+kt(["Waktu","Sesi","Stok sistem","Hasil","Selisih","Status","Oleh"],["t","t","n","n","n","t","t"],r.opname,"Belum pernah dihitung.")+'</div>';
  x+='<div class="card"><h3 style="margin-top:0">Mutasi ('+r.mutasiTotal+' catatan, terbaru dulu)</h3>'+kt(["Waktu","Jenis","Sumber","Qty","Saldo","Referensi","Proyek","Keterangan","Oleh"],["t","t","t","n","n","t","t","t","t"],r.mutasi.slice(0,60),"Belum ada mutasi.")+(r.mutasi.length>60?'<div class="note">60 teratas ditampilkan; semua ada di Excel.</div>':'')+'</div>';
  h.innerHTML=x;
  document.getElementById("tl_x").onclick=async function(){
    var f=await api({action:"adminTelusurBarang",kode:i.kode,unduh:true});if(!f.ok){toast(f.msg||"Gagal",true);return;}
    unduhBanyak("riwayat_"+i.kode+"_"+tglIso(new Date())+".xlsx",[
     {n:"Ringkas",rows:[["Barang",i.nama],["Kode",i.kode],["Bekas",i.q[0]],["Moka",i.q[1]],["Accurate",i.q[2]],["Stok bebas",i.bebas],["Tercadang",i.tercadang],["Harga",i.harga==null?"":i.harga]],w:[20,40]},
     {n:"Mutasi",rows:[["Waktu","Jenis","Sumber","Qty","Saldo","Referensi","Proyek","Keterangan","Oleh"]].concat(f.mutasi),w:[16,14,10,9,9,18,22,30,12]},
     {n:"Serah",rows:[["Waktu","Dokumen","Dept","No PPBJ","Qty","Oleh"]].concat(f.serah),w:[16,16,12,16,9,12]},
     {n:"RAB",rows:[["No PPBJ","Proyek","Status","RAB","Diserahkan"]].concat(f.rab),w:[16,30,14,9,12]},
     {n:"Permintaan",rows:[["Dokumen","Pemohon","Dept","No PPBJ","Qty","Status"]].concat(f.permintaan),w:[16,16,12,16,9,24]},
     {n:"Kedaluwarsa",rows:[["Batch","Qty","Tgl","Sisa hari","Status"]].concat(f.kedaluwarsa),w:[14,9,12,10,12]},
     {n:"Opname",rows:[["Waktu","Sesi","Stok sistem","Hasil","Selisih","Status","Oleh"]].concat(f.opname),w:[16,24,11,9,9,14,12]}]);
  };
}
async function cariPpbjTL(){
  var p=document.getElementById("tl_p").value.trim();TL.ppbj=p;if(!p)return;
  var r=await api({action:"adminTelusurPpbj",ppbj:p});if(!r.ok){toast(r.msg||"Gagal",true);return;}
  TL.cek=r;drawTLPpbj();
}
function drawTLPpbj(){
  var r=TL.cek,c=r.cek,t=c.total||{},h=document.getElementById("tl_h");if(!h)return;
  var x='<div class="card"><p style="margin:0"><b>'+esc(c.ppbj)+'</b> &middot; '+esc(c.nama||"(belum terdaftar)")+' <span class="note">'+esc(c.dept||"")+' &middot; status '+esc(r.status||"-")+'</span></p>'+
   '<div class="kpi"><div><b>'+LPR.rp(t.nilaiRab)+'</b><span>Nilai RAB</span></div><div><b>'+LPR.rp(t.nilaiBersih)+'</b><span>Nilai keluar (bersih)</span></div><div><b>'+(t.melebihi||0)+'</b><span>Barang melebihi RAB</span></div><div><b>'+(t.diluar||0)+'</b><span>Barang di luar RAB</span></div></div>'+
   '<button id="tl_px" class="gh noprint">Unduh (Excel)</button></div>';
  x+='<div class="card"><h3 style="margin-top:0">Material: RAB vs keluar</h3>'+kt(["Kode","Barang","Sat","RAB","Keluar","Kembali","Bersih","Siap","Proses","Sisa","Nilai bersih","Catatan"],["t","t","t","n","n","n","n","n","n","n","r","t"],(c.rows||[]).map(function(w){return [w.kode,w.nama,w.satuan,w.rab,w.keluar,w.kembali,w.bersih,w.siap,w.proses,w.sisa,w.nilaiBersih,w.flag];}),"Belum ada data material.")+'</div>';
  x+='<div class="card"><h3 style="margin-top:0">Kekurangan stok untuk proyek ini</h3>'+kt(["Kode","Barang","Sisa kebutuhan","Stok bebas","Status","Kurang"],["t","t","n","n","t","n"],r.kurang,"Tidak ada kekurangan.")+'</div>';
  x+='<div class="card"><h3 style="margin-top:0">Alokasi stok</h3>'+kt(["Kode","Qty","Status proyek"],["t","n","t"],r.alokasi,"Tidak ada alokasi.")+'</div>';
  x+='<div class="card"><h3 style="margin-top:0">Dokumen serah &amp; pengembalian</h3>'+kt(["Jenis","Dokumen","Tanggal","Pemohon","Oleh","Isi"],["t","t","t","t","t","t"],(c.docs||[]).map(function(d){return [d.jenis,d.doc,d.tgl,d.pemohon,d.oleh,(d.items||[]).map(function(i){return i.nama+" ×"+i.qty;}).join("; ")];}),"Belum ada dokumen.")+'</div>';
  x+='<div class="card"><h3 style="margin-top:0">Permintaan masih berjalan</h3>'+kt(["Dokumen","Tanggal","Status","Pemohon","Barang","Qty"],["t","t","t","t","t","n"],(c.proses||[]).map(function(p){return [p.doc,p.tgl,p.status,p.pemohon,p.nama,p.qty];}),"Tidak ada.")+'</div>';
  x+='<div class="card"><h3 style="margin-top:0">Mutasi terkait ('+r.mutasi.length+')</h3>'+kt(["Waktu","Kode","Barang","Jenis","Sumber","Qty","Referensi","Oleh"],["t","t","t","t","t","n","t","t"],r.mutasi.slice(0,50),"Tidak ada mutasi yang menyebut PPBJ ini.")+'</div>';
  h.innerHTML=x;
  document.getElementById("tl_px").onclick=function(){
    unduhBanyak("ppbj_"+String(c.ppbj).replace(/[^\w-]+/g,"_")+"_"+tglIso(new Date())+".xlsx",[
     {n:"Ringkas",rows:[["No PPBJ",c.ppbj],["Proyek",c.nama],["Departemen",c.dept],["Status",r.status],["Nilai RAB",t.nilaiRab],["Nilai keluar bersih",t.nilaiBersih],["Barang melebihi RAB",t.melebihi||0],["Barang di luar RAB",t.diluar||0]],w:[24,40]},
     {n:"Material",rows:[["Kode","Barang","Satuan","RAB","Keluar","Kembali","Bersih","Siap","Proses","Sisa","Nilai bersih","Catatan"]].concat((c.rows||[]).map(function(w){return [w.kode,w.nama,w.satuan,w.rab,w.keluar,w.kembali,w.bersih,w.siap,w.proses,w.sisa,w.nilaiBersih,w.flag];})),w:[14,34,8,9,9,9,9,8,8,9,14,14]},
     {n:"Kekurangan",rows:[["Kode","Barang","Sisa kebutuhan","Stok bebas","Status","Kurang"]].concat(r.kurang),w:[14,34,14,11,12,10]},
     {n:"Mutasi",rows:[["Waktu","Kode","Barang","Jenis","Sumber","Qty","Referensi","Oleh"]].concat(r.mutasi),w:[16,14,34,14,10,9,18,12]}]);
  };
}

/* ===== KEDALUWARSA ===== */
var KD={f:"aktif",q:"",data:null,imp:null};
async function loadKdl(){
  pane().innerHTML='<div class="card msg">Memuat...</div>';
  var r=await api({action:"adminKdlList",semua:KD.f==="semua",q:KD.q});
  if(!r.ok){pane().innerHTML='<div class="card msg err">'+esc(r.msg||"Gagal")+'</div>';return;}
  KD.data=r;drawKdl();
}
function drawKdl(){
  var r=KD.data,g=r.ringkas,lbl={lewat:["Sudah lewat","r"],h30:["≤ 30 hari","r"],h60:["≤ 60 hari","y"],h90:["≤ 90 hari","y"],aman:["Aman","g"],tutup:["Selesai",""]};
  var h='<div class="sum"><div><b style="color:#b3261e">'+g.lewat+'</b><span>Sudah lewat</span></div><div><b>'+g.h30+'</b><span>≤ 30 hari</span></div><div><b>'+g.h60+'</b><span>≤ 60 hari</span></div><div><b>'+g.h90+'</b><span>≤ 90 hari</span></div><div><b>'+LPR.rp(r.nilaiRisiko)+'</b><span>Nilai berisiko (lewat + ≤30 hari)</span></div></div>';
  h+='<div class="card noprint"><p style="margin:0 0 8px"><b>Tambah batch</b> <span class="note">Satu baris per batch. Kode harus sama dengan Kode Barang di sistem.</span></p>'+
   '<div class="fr"><input type="text" id="kd_k" placeholder="Kode barang" style="width:130px"><input type="text" id="kd_b" placeholder="Batch / lot" style="width:120px"><input type="date" id="kd_t"><input type="number" id="kd_q" placeholder="Qty" style="width:90px" min="0" step="any"><input type="text" id="kd_c" placeholder="Catatan (opsional)" style="width:180px"><button id="kd_add" class="sv">Simpan</button></div>'+
   '<div class="fr"><button id="kd_imp" class="gh">Import dari Excel</button><button id="kd_tpl" class="gh">Unduh contoh file</button><input type="file" id="kd_f" accept=".xlsx,.xls,.csv" style="display:none"><span class="note">Kolom: Kode, Batch, Tgl Kedaluwarsa, Qty, Catatan</span></div><div id="kd_pv"></div></div>';
  h+='<div class="bar noprint"><input id="kd_q2" placeholder="Cari kode / nama / batch" value="'+esc(KD.q)+'"><button class="chip '+(KD.f==="aktif"?"on":"")+'" id="kd_fa">Masih aktif</button><button class="chip '+(KD.f==="semua"?"on":"")+'" id="kd_fs">Semua (termasuk selesai)</button><button id="kd_x" class="gh">Unduh</button></div>';
  h+=r.rows.length?'<div class="tw"><table><thead><tr><th>Barang</th><th>Batch</th><th class="n">Qty</th><th>Kedaluwarsa</th><th>Status</th><th class="noprint">Tindakan</th></tr></thead><tbody>'+r.rows.map(function(x){var l=lbl[x.level]||["",""];
    return '<tr><td><b>'+esc(x.nama)+'</b><small>'+esc(x.kode)+' &middot; '+esc(x.satuan)+(x.catatan?' &middot; '+esc(x.catatan):'')+'</small></td><td>'+esc(x.batch||"-")+'</td><td class="n">'+LPR.nf(x.qty)+'</td><td>'+esc(LPR.tgl(x.tgl))+'<small>'+(x.sisa==null?"":x.sisa<0?"lewat "+(-x.sisa)+" hari":x.sisa+" hari lagi")+'</small></td><td><span class="tag '+l[1]+'">'+(x.aktif?l[0]:esc(x.status))+'</span>'+(x.aktif&&x.status!=="Aktif"?'<small>'+esc(x.status)+'</small>':'')+'</td>'+
    '<td class="noprint">'+(x.aktif?'<div class="act"><button data-ks="Dipakai" data-id="'+esc(x.id)+'" class="sv">Sudah dipakai</button><button data-ks="Diperpanjang" data-id="'+esc(x.id)+'" class="gh">Perpanjang</button><button data-ks="Dibuang" data-id="'+esc(x.id)+'" data-q="'+x.qty+'" class="rm">Dibuang</button></div>':'')+'</td></tr>';}).join("")+'</tbody></table></div>':'<div class="card msg">Belum ada batch kedaluwarsa tercatat.</div>';
  pane().innerHTML=kwrap(h);
  document.getElementById("kd_add").onclick=simpanKdl;
  document.getElementById("kd_fa").onclick=function(){KD.f="aktif";loadKdl();};document.getElementById("kd_fs").onclick=function(){KD.f="semua";loadKdl();};
  var q2=document.getElementById("kd_q2");q2.onkeydown=function(e){if(e.key==="Enter"){KD.q=q2.value.trim();loadKdl();}};
  document.getElementById("kd_x").onclick=async function(){var f=await api({action:"adminKdlList",semua:KD.f==="semua",q:KD.q,unduh:true});unduhBanyak("kedaluwarsa_"+tglIso(new Date())+".xlsx",[{n:"Kedaluwarsa",rows:[["Kode","Barang","Satuan","Batch","Qty","Tgl kedaluwarsa","Sisa hari","Status","Catatan"]].concat(f.rows.map(function(x){return [x.kode,x.nama,x.satuan,x.batch,x.qty,x.tgl,x.sisa==null?"":x.sisa,x.status,x.catatan];})),w:[14,34,8,12,9,14,10,12,30]}]);};
  document.getElementById("kd_tpl").onclick=function(){unduhBanyak("contoh_kedaluwarsa.xlsx",[{n:"Kedaluwarsa",rows:[["Kode","Batch","Tgl Kedaluwarsa","Qty","Catatan"],["LEM-001","B2024-11","2027-03-31",12,"contoh"]],w:[14,14,18,8,30]}]);};
  document.getElementById("kd_imp").onclick=function(){document.getElementById("kd_f").click();};
  document.getElementById("kd_f").onchange=function(){var f=this.files&&this.files[0];if(f)bacaKdl(f);this.value="";};
  pane().querySelectorAll("[data-ks]").forEach(function(b){b.onclick=function(){ubahKdl(b);};});
}
async function simpanKdl(){
  var row={kode:document.getElementById("kd_k").value.trim(),batch:document.getElementById("kd_b").value.trim(),tgl:document.getElementById("kd_t").value,qty:document.getElementById("kd_q").value,catatan:document.getElementById("kd_c").value.trim()};
  if(!row.kode||!row.tgl||!(Number(row.qty)>0)){toast("Isi kode, tanggal kedaluwarsa, dan qty.",true);return;}
  var r=await api({action:"adminKdlSimpan",rows:[row]});toast(r.msg||"Gagal",!r.ok||(r.salah&&r.salah.length>0));if(r.salah&&r.salah.length)alert(r.salah.join("\n"));if(r.ok&&r.baru+r.ubah>0)loadKdl();
}
function bacaKdl(f){
  if(typeof XLSX==="undefined"){toast("Pembaca Excel belum termuat.",true);return;}
  var fr=new FileReader();fr.onload=function(ev){try{
    var wb=XLSX.read(new Uint8Array(ev.target.result),{type:"array",cellDates:true}),a=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,defval:"",raw:true});
    var hd=(a[0]||[]).map(function(x){return String(x).trim().toLowerCase();});function ix(re,def){for(var i=0;i<hd.length;i++)if(re.test(hd[i]))return i;return def;}
    var ik=ix(/kode/,0),ib=ix(/batch|lot/,1),it=ix(/tgl|tanggal|kedaluwarsa|expired|exp/,2),iq=ix(/qty|jumlah/,3),ic=ix(/catatan|ket/,4),rows=[];
    for(var i=1;i<a.length;i++){var x=a[i];if(!String(x[ik]||"").trim())continue;var tv=x[it];if(tv instanceof Date)tv=tglIso(new Date(tv.getTime()+12*3600000));rows.push({kode:String(x[ik]).trim(),batch:String(x[ib]||"").trim(),tgl:tv,qty:x[iq],catatan:String(x[ic]||"").trim()});}
    if(!rows.length){toast("Tidak ada baris data.",true);return;}
    KD.imp=rows;document.getElementById("kd_pv").innerHTML='<p><b>'+rows.length+' baris</b> siap disimpan. Contoh: '+esc(rows.slice(0,3).map(function(r){return r.kode+" / "+r.batch+" / "+r.tgl;}).join("; "))+'</p><button id="kd_ok" class="sv">Simpan semua</button> <button id="kd_no" class="gh">Batal</button>';
    document.getElementById("kd_no").onclick=function(){KD.imp=null;document.getElementById("kd_pv").innerHTML="";};
    document.getElementById("kd_ok").onclick=async function(){this.disabled=true;var r=await api({action:"adminKdlSimpan",rows:KD.imp});toast(r.msg||"Gagal",!r.ok);if(r.salah&&r.salah.length)alert(r.salah.join("\n"));KD.imp=null;loadKdl();};
  }catch(e){toast("File tidak bisa dibaca. Gunakan .xlsx atau .csv.",true);}};fr.readAsArrayBuffer(f);
}
async function ubahKdl(b){
  var st=b.getAttribute("data-ks"),id=b.getAttribute("data-id"),req={action:"adminKdlStatus",id:id,status:st};
  if(st==="Diperpanjang"){var t=prompt("Tanggal kedaluwarsa baru (format 2027-12-31):","");if(!t)return;req.tglBaru=t.trim();}
  else if(st==="Dibuang"){var mx=b.getAttribute("data-q"),q=prompt("Jumlah yang dibuang (maks "+mx+"). Stok akan dikurangi dan tercatat di Mutasi sebagai koreksi kedaluwarsa:",mx);if(q===null)return;req.qtyBuang=q.trim();}
  else if(!confirm("Tandai batch ini sudah habis dipakai?"))return;
  var c=prompt("Catatan (boleh kosong):","");if(c===null)return;req.catatan=c.trim();
  var r=await api(req);toast(r.msg||"Gagal",!r.ok);if(r.ok)loadKdl();
}

/* ===== LAPORAN ATASAN ===== */
var LA={data:null,lihat:null};
async function loadLapAtasan(){
  pane().innerHTML='<div class="card msg">Memuat...</div>';
  var r=await api({action:"adminLaporanDaftar"});if(!r.ok){pane().innerHTML='<div class="card msg err">'+esc(r.msg||"Gagal")+'</div>';return;}
  LA.data=r;drawLapAtasan();
}
function drawLapAtasan(){
  var r=LA.data,t=new Date(),d1=tglIso(new Date(t.getTime()-14*86400000)),d2=tglIso(new Date(t.getTime()-86400000));
  var h='<div class="card"><p style="margin:0"><b>Laporan otomatis:</b> '+(r.otomatis?'<span class="tag g">AKTIF</span>':'<span class="tag y">BELUM AKTIF</span>')+' <span class="note">'+(r.otomatis?'Pemicu terakhir: '+esc(r.terakhir||"belum berjalan"):'Jalankan fungsi aktifkanLaporanOtomatis sekali di editor Apps Script. Bulanan dibuat hari kerja pertama tiap bulan pukul 09.00, ringkasan 2 mingguan tiap 14 hari.')+'</span></p>'+
   '<p class="note" style="margin:6px 0 0">Laporan hanya <b>dibuat</b> otomatis. Pengiriman ke atasan tetap Anda lakukan sendiri dengan tombol Kirim. Tautan berlaku '+r.hariTautan+' hari dan bisa dicabut.</p></div>';
  h+='<div class="card noprint"><p style="margin:0 0 6px"><b>Buat laporan</b></p><div class="fr"><button id="la_b" class="sv">Bulanan (bulan lalu)</button><span class="note">atau rentang bebas:</span><input type="date" id="la_d1" value="'+d1+'"><input type="date" id="la_d2" value="'+d2+'"><button id="la_k" class="gh">Buat laporan periode ini</button><button id="la_m" class="gh">Buat ringkasan 2 mingguan</button></div></div>';
  h+='<div id="la_v"></div>';
  h+='<div class="card"><p style="margin:0 0 8px"><b>Laporan tersimpan</b> <span class="note">Isi laporan dibekukan saat dibuat. "Buat ulang" memperbarui data dan memakai harga terbaru.</span></p>'+(r.daftar.length?'<div class="tw"><table><thead><tr><th>Laporan</th><th>Dibuat</th><th class="n">Nilai keluar</th><th class="n">Nilai stok</th><th class="noprint">Tindakan</th></tr></thead><tbody>'+r.daftar.map(function(x){
    return '<tr><td><b>'+esc(x.jenis)+'</b><small>'+esc(x.periode)+'</small></td><td>'+esc(x.dibuat)+'<small>oleh '+esc(x.oleh)+'</small></td><td class="n">'+LPR.rp((x.ringkas||{}).nilaiKeluar)+'</td><td class="n">'+LPR.rp((x.ringkas||{}).nilaiStok)+'</td>'+
    '<td class="noprint"><div class="act"><button data-lv="'+esc(x.id)+'">Lihat</button><button data-lx="'+esc(x.id)+'" class="gh">Unduh Excel</button><button data-lk="'+esc(x.id)+'" class="sv">Kirim ke atasan</button><button data-lu="'+esc(x.id)+'" class="gh">Buat ulang</button></div></td></tr>';}).join("")+'</tbody></table></div>':'<div class="msg">Belum ada laporan. Klik "Bulanan (bulan lalu)" untuk mencoba.</div>')+'</div>';
  h+='<div class="card"><p style="margin:0 0 8px"><b>Tautan terkirim</b></p>'+(r.tautan.length?'<div class="tw"><table><thead><tr><th>Laporan</th><th>Dikirim ke</th><th>Waktu</th><th>Berlaku s/d</th><th class="n">Dibuka</th><th>Status</th><th class="noprint"></th></tr></thead><tbody>'+r.tautan.map(function(x){
    return '<tr><td>'+esc(x.id)+'</td><td>'+esc(x.email)+'</td><td>'+esc(x.dikirim)+'</td><td>'+esc(x.sampai)+'</td><td class="n">'+x.dibuka+'x</td><td>'+(x.dicabut?'<span class="tag r">Dicabut</span>':x.aktif?'<span class="tag g">Aktif</span>':'<span class="tag y">Kedaluwarsa</span>')+'</td><td class="noprint">'+(x.aktif?'<button data-lc="'+x.tid+'" class="rm">Cabut</button>':'')+'</td></tr>';}).join("")+'</tbody></table></div>':'<div class="msg">Belum ada tautan dikirim.</div>')+'</div>';
  pane().innerHTML=kwrap(h);
  document.getElementById("la_b").onclick=function(){buatLap({jenis:"Bulanan"});};
  document.getElementById("la_k").onclick=function(){buatLap({jenis:"Khusus",dari:document.getElementById("la_d1").value,sampai:document.getElementById("la_d2").value});};
  document.getElementById("la_m").onclick=function(){buatLap({jenis:"2 Mingguan",dari:document.getElementById("la_d1").value,sampai:document.getElementById("la_d2").value});};
  pane().querySelectorAll("[data-lv]").forEach(function(b){b.onclick=function(){lihatLap(b.getAttribute("data-lv"),false);};});
  pane().querySelectorAll("[data-lx]").forEach(function(b){b.onclick=function(){lihatLap(b.getAttribute("data-lx"),true);};});
  pane().querySelectorAll("[data-lk]").forEach(function(b){b.onclick=function(){kirimLap(b.getAttribute("data-lk"));};});
  pane().querySelectorAll("[data-lu]").forEach(function(b){b.onclick=function(){buatLap({ulang:b.getAttribute("data-lu")});};});
  pane().querySelectorAll("[data-lc]").forEach(function(b){b.onclick=async function(){if(!confirm("Cabut tautan ini? Atasan tidak bisa membukanya lagi."))return;var c=await api({action:"adminLaporanCabut",tid:b.getAttribute("data-lc")});toast(c.msg||"Gagal",!c.ok);loadLapAtasan();};});
}
async function buatLap(req){
  req.action="adminLaporanBuat";toast("Membuat laporan... bisa 10-60 detik.");
  var r;try{r=await api(req);}catch(e){toast("Gagal terhubung.",true);return;}
  toast(r.msg||"Gagal",!r.ok);if(r.ok){await loadLapAtasan();lihatLap(r.id,false);}
}
async function lihatLap(id,unduh){
  var r=await api({action:"adminLaporanGet",id:id});if(!r.ok){toast(r.msg||"Gagal",true);return;}
  if(unduh){if(!LPR.excel(r.data,r.info,"laporan_gudang_"+r.info.dari+"_"+r.info.sampai+".xlsx"))toast("Pembaca Excel belum termuat.",true);return;}
  var v=document.getElementById("la_v");if(!v)return;
  v.innerHTML='<div class="card"><div class="bar noprint"><button id="la_cx">Unduh Excel</button><button id="la_cp" class="gh">Cetak / PDF</button><button id="la_cc" class="gh">Tutup</button></div><div id="la_vi"></div></div>';
  LPR.render(document.getElementById("la_vi"),r.data,r.info);
  document.getElementById("la_cx").onclick=function(){LPR.excel(r.data,r.info,"laporan_gudang_"+r.info.dari+"_"+r.info.sampai+".xlsx");};
  document.getElementById("la_cp").onclick=function(){window.print();};document.getElementById("la_cc").onclick=function(){v.innerHTML="";};
  v.scrollIntoView({behavior:"smooth",block:"start"});
}
async function kirimLap(id){
  var e=tanyaEmail();if(!e)return;if(!confirm("Kirim email laporan ini ke "+e+"?"))return;
  var r=await api({action:"adminLaporanKirim",id:id,email:e});toast(r.msg||"Gagal",!r.ok);if(r.ok)loadLapAtasan();
}
