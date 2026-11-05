/* Tambahan 37: Arsip Bukti. Semua Form Permintaan (BPB) dan Pengembalian di satu tempat: cari pintar (nomor BPB, nama proyek, PPBJ),
   unduh satu per satu, gabungan (PDF), atau ZIP; salin tautan cetak. Khusus admin dan staf gudang (PIN admin).
   Memakai pdf-lib + pdfbukti.js (BuktiPdf) dan CARI milik admin.html. */
var ARB=(function(){
  var MAKS=25,TAMPIL=300,S={rows:[],f:{q:"",jenis:"",status:"",dept:"",dari:"",sampai:"",semua:false},sel:{},total:0,terpotong:false,muat:false},el=null,api0=null,toast0=null;
  function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
  function iso(d){return d.getFullYear()+"-"+("0"+(d.getMonth()+1)).slice(-2)+"-"+("0"+d.getDate()).slice(-2);}
  function tglId(s){var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(s||"");return m?m[3]+"/"+m[2]+"/"+m[1]:(s||"");}
  function grup(st){return /^(Siap Diserahkan|Siap Diterima|Selesai Diterima)$/.test(st)?"Disetujui":st==="Ditolak"?"Ditolak":"Menunggu";}
  function final(st){return grup(st)!=="Menunggu";}
  function teksCari(x){return [x.doc,x.ppbj,x.proyek,x.dept,x.by,x.jenis,tglId(x.tgl)].join(" ");}
  function tampil(){
    var f=S.f,L=S.rows.filter(function(x){
      if(f.jenis&&x.jenis!==f.jenis)return false;
      if(f.status&&grup(x.status)!==f.status)return false;
      if(f.dept&&x.dept!==f.dept)return false;
      return true;});
    var q=f.q.trim();
    if(q&&window.CARI){var r=CARI.saring(L,q,teksCari,2000);L=(r.hasil||[]).concat(r.mirip||[]);}
    else if(q){var t=q.toLowerCase();L=L.filter(function(x){return teksCari(x).toLowerCase().indexOf(t)>=0;});}
    return L;
  }
  function simpan(bytes,nama,tipe){var b=new Blob([bytes],{type:tipe}),a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=nama;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},4000);}
  function salin(t){
    try{if(navigator.clipboard&&navigator.clipboard.writeText)return navigator.clipboard.writeText(t).then(function(){return true;},function(){return fb(t);});}catch(e){}
    return Promise.resolve(fb(t));
    function fb(x){try{var a=document.createElement("textarea");a.value=x;a.style.cssText="position:fixed;left:-999px";document.body.appendChild(a);a.select();var ok=document.execCommand("copy");a.remove();return ok;}catch(e){return false;}}
  }
  async function load(){
    el.innerHTML='<div class="card msg">Memuat arsip bukti...</div>';
    var p={action:"adminArsipList"};if(S.f.semua)p.semua=true;else{if(S.f.dari)p.dari=S.f.dari;if(S.f.sampai)p.sampai=S.f.sampai;}
    try{var r=await api0(p);if(!r||!r.ok){toast0((r&&r.msg)||"Gagal memuat.",true);el.innerHTML='<div class="card msg">'+esc((r&&r.msg)||"Gagal memuat.")+'</div>';return;}
      S.rows=r.rows||[];S.total=r.total||S.rows.length;S.terpotong=!!r.terpotong;S.muat=true;S.sel={};gambar();
    }catch(e){toast0("Gagal terhubung ke server.",true);}
  }
  function gambar(){
    var L=tampil(),vis=L.slice(0,TAMPIL),f=S.f,nSel=Object.keys(S.sel).length;
    var dept={};S.rows.forEach(function(x){if(x.dept)dept[x.dept]=1;});
    var opt=function(v,t,cur){return '<option value="'+esc(v)+'"'+(cur===v?" selected":"")+'>'+esc(t)+'</option>';};
    var body=vis.map(function(x){
      var gp=grup(x.status),cls=gp==="Disetujui"?"d":gp==="Ditolak"?"b":"w";
      return '<tr><td><input type="checkbox" data-sk="'+esc(x.id)+'"'+(S.sel[x.id]?" checked":"")+'></td><td data-l="Tanggal">'+esc(tglId(x.tgl))+'</td>'+
        '<td data-l="Dokumen"><b>'+esc(x.doc)+'</b><small>'+esc(x.jenis)+'</small></td><td data-l="No PPBJ">'+(x.ppbj?'<b>'+esc(x.ppbj)+'</b>':'<small>-</small>')+'</td>'+
        '<td data-l="Proyek">'+esc(x.proyek||"-")+'</td><td data-l="Departemen">'+esc(x.dept)+'<small>'+esc(x.by)+'</small></td><td class="nm" data-l="Barang">'+x.n+'</td>'+
        '<td data-l="Status"><span class="bd '+cls+'">'+esc(gp)+'</span><small>'+esc(x.status)+'</small></td>'+
        '<td><div class="bar"><button class="gh" data-ap="'+esc(x.id)+'">PDF</button><button class="gh" data-at="'+esc(x.id)+'"'+(final(x.status)?"":' disabled title="Tautan tersedia setelah dokumen selesai diproses"')+'>Salin tautan</button>'+
        (final(x.status)?'<button class="gh" data-ab="'+esc(x.id)+'" title="Mencabut tautan lama dan membuat tautan baru">Tautan baru</button>':"")+'</div></td></tr>';
    }).join("");
    el.innerHTML='<div class="card"><b>Arsip Bukti</b><div class="note">Semua Form Permintaan dan Pengembalian. Cari dengan nomor BPB, nama proyek, atau No PPBJ (salah ketik tetap ketemu), lalu unduh satu per satu atau gabungan (maksimal '+MAKS+' dokumen sekali unduh).</div>'+
      '<div class="bar"><input id="arq" autocomplete="off" placeholder="Cari nomor BPB, nama proyek, atau PPBJ..." value="'+esc(f.q)+'" style="flex:1;min-width:220px"><button class="gh" id="arr">Segarkan</button></div>'+
      '<div class="bar"><select id="arj">'+opt("","Semua jenis",f.jenis)+opt("Permintaan","Permintaan",f.jenis)+opt("Pengembalian","Pengembalian",f.jenis)+'</select>'+
      '<select id="ars">'+opt("","Semua status",f.status)+opt("Disetujui","Disetujui",f.status)+opt("Menunggu","Menunggu persetujuan",f.status)+opt("Ditolak","Ditolak",f.status)+'</select>'+
      '<select id="ard"><option value="">Semua departemen</option>'+Object.keys(dept).sort().map(function(d){return opt(d,d,f.dept);}).join("")+'</select>'+
      '<label class="fl">Dari <input type="date" id="ar1" value="'+esc(f.dari)+'"'+(f.semua?" disabled":"")+'></label><label class="fl">Sampai <input type="date" id="ar2" value="'+esc(f.sampai)+'"'+(f.semua?" disabled":"")+'></label>'+
      '<label class="fl"><input type="checkbox" id="ara"'+(f.semua?" checked":"")+'> semua periode</label></div>'+
      '<div class="bar"><label class="fl"><input type="checkbox" id="arall"> Pilih yang tampil (maks. '+MAKS+')</label><b id="arsel">'+nSel+' dipilih</b>'+
      '<button class="sv" id="arpdf">Unduh PDF gabungan</button><button class="gh" id="arzip">Unduh ZIP (1 PDF per dokumen)</button></div>'+
      '<div class="note" id="arinfo">'+L.length+' dokumen cocok'+(S.rows.length!==L.length?' dari '+S.rows.length:"")+(S.terpotong?' (daftar dipotong 6.000 terbaru, persempit periode)':"")+(L.length>TAMPIL?'; menampilkan '+TAMPIL+' teratas, persempit pencarian':"")+'.</div></div>'+
      (vis.length?'<table><thead><tr><th></th><th>Tanggal</th><th>Dokumen</th><th>No PPBJ</th><th>Proyek</th><th>Departemen</th><th class="nm">Barang</th><th>Status</th><th></th></tr></thead><tbody>'+body+'</tbody></table>':'<div class="card msg">Tidak ada dokumen yang cocok.</div>');
    pasang(vis);
  }
  function pasang(vis){
    var $=function(i){return el.querySelector("#"+i);};
    var q=$("arq");q.oninput=function(){S.f.q=q.value;clearTimeout(ARB._t);ARB._t=setTimeout(function(){var p=q.selectionStart;gambar();var n=el.querySelector("#arq");n.focus();try{n.setSelectionRange(p,p);}catch(e){}},120);};
    $("arr").onclick=load;
    $("arj").onchange=function(){S.f.jenis=this.value;gambar();};$("ars").onchange=function(){S.f.status=this.value;gambar();};$("ard").onchange=function(){S.f.dept=this.value;gambar();};
    $("ar1").onchange=function(){S.f.dari=this.value;load();};$("ar2").onchange=function(){S.f.sampai=this.value;load();};$("ara").onchange=function(){S.f.semua=this.checked;load();};
    $("arall").onchange=function(){var on=this.checked;S.sel={};if(on){if(vis.length>MAKS)toast0("Hanya "+MAKS+" dokumen teratas yang dipilih (batas sekali unduh).",true);vis.slice(0,MAKS).forEach(function(x){S.sel[x.id]=1;});}gambar();};
    el.querySelectorAll("[data-sk]").forEach(function(c){c.onchange=function(){var k=c.getAttribute("data-sk");if(c.checked){if(Object.keys(S.sel).length>=MAKS){c.checked=false;toast0("Maksimal "+MAKS+" dokumen sekali unduh.",true);return;}S.sel[k]=1;}else delete S.sel[k];$("arsel").textContent=Object.keys(S.sel).length+" dipilih";};});
    el.querySelectorAll("[data-ap]").forEach(function(b){b.onclick=function(){unduh(b,[b.getAttribute("data-ap")],"satu");};});
    el.querySelectorAll("[data-at]").forEach(function(b){b.onclick=function(){tautan(b,b.getAttribute("data-at"),false);};});
    el.querySelectorAll("[data-ab]").forEach(function(b){b.onclick=function(){if(confirm("Buat tautan baru? Tautan lama (termasuk yang ada di email) berhenti berlaku."))tautan(b,b.getAttribute("data-ab"),true);};});
    $("arpdf").onclick=function(){var ids=Object.keys(S.sel);if(!ids.length){toast0("Pilih dokumen dulu.",true);return;}unduh(this,ids,"gabung");};
    $("arzip").onclick=function(){var ids=Object.keys(S.sel);if(!ids.length){toast0("Pilih dokumen dulu.",true);return;}unduh(this,ids,"zip");};
  }
  async function tautan(btn,id,baru){
    btn.disabled=true;var r=await api0({action:"adminArsipTautan",id:id,aksi:baru?"baru":"ambil"});btn.disabled=false;
    if(!r||!r.ok){toast0((r&&r.msg)||"Gagal.",true);return;}
    var ok=await salin(r.url);toast0(ok?(baru?"Tautan baru disalin (yang lama sudah dicabut).":"Tautan disalin."):"Salin manual: "+r.url,!ok);
  }
  async function unduh(btn,ids,mode){
    if(!window.PDFLib||!window.BuktiPdf){toast0("Pembuat PDF belum termuat. Periksa internet lalu muat ulang halaman.",true);return;}
    var tek=btn.textContent;btn.disabled=true;
    try{
      btn.textContent="Mengambil data...";
      var r=await api0({action:"adminArsipBukti",ids:ids.slice(0,MAKS)});
      if(!r||!r.ok){toast0((r&&r.msg)||"Gagal.",true);return;}
      var meta={};S.rows.forEach(function(x){meta[x.id]=x;});
      var docs=(r.docs||[]).slice().sort(function(a,b){var A=meta[a.key]||{},B=meta[b.key]||{};return (A.tgl+"|"+A.doc)<(B.tgl+"|"+B.doc)?-1:1;});
      if(!docs.length){toast0("Tidak ada dokumen yang bisa dicetak. "+((r.lewat||[])[0]||""),true);return;}
      var stamp=iso(new Date());
      if(mode==="zip"){
        var files=[];for(var j=0;j<docs.length;j++){btn.textContent="Membuat PDF "+(j+1)+"/"+docs.length+"...";files.push({name:String(docs[j].doc).replace(/[\\\/:*?"<>|\s]+/g,"-")+".pdf",bytes:await BuktiPdf.buatSatu(docs[j],r.sig||{})});}
        simpan(BuktiPdf.buatZip(files),"arsip-bukti_"+stamp+".zip","application/zip");
      }else if(mode==="satu"){
        simpan(await BuktiPdf.buatSatu(docs[0],r.sig||{}),String(docs[0].doc).replace(/[\\\/:*?"<>|\s]+/g,"-")+".pdf","application/pdf");
      }else{
        simpan(await BuktiPdf.buatGabungan(docs,r.sig||{},function(i,n){btn.textContent="Membuat PDF "+i+"/"+n+"...";}),"arsip-bukti_"+stamp+".pdf","application/pdf");
      }
      toast0(docs.length+" dokumen diunduh."+((r.lewat&&r.lewat.length)?" Dilewati: "+r.lewat.slice(0,2).join("; "):""));
    }catch(e){toast0("Gagal membuat PDF: "+(e&&e.message||e),true);}
    finally{btn.disabled=false;btn.textContent=tek;}
  }
  function mount(pane,api,toast){
    el=pane;api0=api;toast0=toast;
    if(!S.f.dari){var d=new Date();d.setDate(d.getDate()-90);S.f.dari=iso(d);}
    load();
  }
  return {mount:mount,_t:null};
})();
