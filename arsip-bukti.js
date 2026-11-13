/* Tambahan 37: Arsip Bukti. Semua Form Permintaan (BPB) dan Pengembalian di satu tempat: cari pintar (nomor BPB, nama proyek, PPBJ),
   unduh satu per satu, gabungan (PDF), atau ZIP; salin tautan cetak. Khusus admin dan staf gudang (PIN admin).
   Memakai pdf-lib + pdfbukti.js (BuktiPdf) dan CARI milik admin.html. */
var ARB=(function(){
  var MAKS=25,TAMPIL=300,S={rows:[],f:{q:"",jenis:"",status:"",dept:"",proyek:"",dari:"",sampai:"",semua:false},sel:{},total:0,terpotong:false,muat:false},el=null,api0=null,toast0=null;
  function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
  function iso(d){return d.getFullYear()+"-"+("0"+(d.getMonth()+1)).slice(-2)+"-"+("0"+d.getDate()).slice(-2);}
  function tglId(s){var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(s||"");return m?m[3]+"/"+m[2]+"/"+m[1]:(s||"");}
  function grup(st){return /^(Siap Diserahkan|Siap Diterima|Selesai Diterima|Diterima)$|^Selesai \(pengganti/.test(st)?"Disetujui":/^(Ditolak|Dibatalkan)$/.test(st)?"Ditolak":"Menunggu";}
  function final(st){return grup(st)!=="Menunggu";}
  function teksCari(x){return [x.doc,x.ppbj,x.proyek,x.dept,x.by,x.jenis,x.po||"",tglId(x.tgl)].join(" ");}
  function pnr(x){return x.jenis==="Penerimaan";}
  function tampil(){
    var f=S.f,L=S.rows.filter(function(x){
      if(f.jenis&&x.jenis!==f.jenis)return false;
      if(f.status&&grup(x.status)!==f.status)return false;
      if(f.dept&&x.dept!==f.dept)return false;
      if(f.proyek&&(x.proyek||"")!==f.proyek)return false;
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
      if(pnr(x))return '<tr><td><input type="checkbox" data-sk="'+esc(x.id)+'"'+(S.sel[x.id]?" checked":"")+'></td><td data-l="Tanggal">'+esc(tglId(x.tgl))+'</td>'+
        '<td data-l="Dokumen"><b>'+esc(x.doc)+'</b><small>Penerimaan barang'+(x.po?' &middot; PO '+esc(x.po):'')+'</small></td><td data-l="No PPBJ">'+(x.ppbj?'<b>'+esc(x.ppbj)+'</b>':'<small>-</small>')+'</td>'+
        '<td data-l="Proyek">'+esc(x.proyek||"-")+'</td><td data-l="Penerima">'+esc(x.by)+'</td><td class="nm" data-l="Barang">'+x.n+'</td>'+
        '<td data-l="Status"><span class="bd '+cls+'">'+esc(x.status)+'</span><small>'+x.foto+' foto/file surat jalan</small></td>'+
        '<td><div class="bar"><button class="gh" data-ap="'+esc(x.id)+'"'+(x.foto?"":' disabled title="Tidak ada foto surat jalan"')+'>PDF</button><button class="gh" data-af="'+esc(x.id)+'"'+(x.foto?"":' disabled')+'>Lihat foto</button></div></td></tr>';
      return '<tr><td><input type="checkbox" data-sk="'+esc(x.id)+'"'+(S.sel[x.id]?" checked":"")+'></td><td data-l="Tanggal">'+esc(tglId(x.tgl))+'</td>'+
        '<td data-l="Dokumen"><b>'+esc(x.doc)+'</b><small>'+esc(x.jenis)+'</small></td><td data-l="No PPBJ">'+(x.ppbj?'<b>'+esc(x.ppbj)+'</b>':'<small>-</small>')+'</td>'+
        '<td data-l="Proyek">'+esc(x.proyek||"-")+'</td><td data-l="Departemen">'+esc(x.dept)+'<small>'+esc(x.by)+'</small></td><td class="nm" data-l="Barang">'+x.n+'</td>'+
        '<td data-l="Status"><span class="bd '+cls+'">'+esc(gp)+'</span><small>'+esc(x.status)+'</small></td>'+
        '<td><div class="bar"><button class="gh" data-ap="'+esc(x.id)+'">PDF</button><button class="gh" data-at="'+esc(x.id)+'"'+(final(x.status)?"":' disabled title="Tautan tersedia setelah dokumen selesai diproses"')+'>Salin tautan</button>'+
        (final(x.status)?'<button class="gh" data-ab="'+esc(x.id)+'" title="Mencabut tautan lama dan membuat tautan baru">Tautan baru</button>':"")+'</div></td></tr>';
    }).join("");
    el.innerHTML='<div class="card"><b>Arsip Bukti</b><div class="note">Semua Form Permintaan, Pengembalian, dan Penerimaan barang (surat jalan). Cari dengan nomor BPB, nama proyek, atau No PPBJ (salah ketik tetap ketemu), lalu unduh satu per satu atau gabungan (maksimal '+MAKS+' dokumen sekali unduh).</div>'+
      '<div class="bar"><input id="arq" autocomplete="off" placeholder="Cari nomor BPB, nama proyek, atau PPBJ..." value="'+esc(f.q)+'" style="flex:1;min-width:220px"><button class="gh" id="arr">Segarkan</button></div>'+
      '<div class="bar"><select id="arj">'+opt("","Semua jenis",f.jenis)+opt("Permintaan","Permintaan",f.jenis)+opt("Pengembalian","Pengembalian",f.jenis)+opt("Penerimaan","Penerimaan (surat jalan)",f.jenis)+opt("BPB Pengganti","BPB Pengganti (IA lama)",f.jenis)+'</select>'+
      '<select id="ars">'+opt("","Semua status",f.status)+opt("Disetujui","Disetujui",f.status)+opt("Menunggu","Menunggu persetujuan",f.status)+opt("Ditolak","Ditolak",f.status)+'</select>'+
      '<select id="arp" style="max-width:240px"><option value="">Semua proyek</option>'+proyekOpsi(opt)+'</select>'+
      '<select id="ard"><option value="">Semua departemen</option>'+Object.keys(dept).sort().map(function(d){return opt(d,d,f.dept);}).join("")+'</select>'+
      '<label class="fl">Dari <input type="date" id="ar1" value="'+esc(f.dari)+'"'+(f.semua?" disabled":"")+'></label><label class="fl">Sampai <input type="date" id="ar2" value="'+esc(f.sampai)+'"'+(f.semua?" disabled":"")+'></label>'+
      '<label class="fl"><input type="checkbox" id="ara"'+(f.semua?" checked":"")+'> semua periode</label></div>'+
      '<div class="bar"><label class="fl"><input type="checkbox" id="arall"> Pilih yang tampil (maks. '+MAKS+')</label><b id="arsel">'+nSel+' dipilih</b>'+
      '<button class="sv" id="arpdf">Unduh PDF gabungan</button><button class="gh" id="arzip">Unduh ZIP (1 PDF per dokumen)</button>'+(f.proyek&&S.rows.some(function(x){return pnr(x)&&x.proyek===f.proyek&&x.foto;})?'<button class="gh" id="arsj" title="Satu PDF berisi semua surat jalan penerimaan proyek ini">Unduh semua surat jalan proyek ini</button>':"")+'</div>'+
      '<div class="note" id="arinfo">'+L.length+' dokumen cocok'+(S.rows.length!==L.length?' dari '+S.rows.length:"")+(S.terpotong?' (daftar dipotong 6.000 terbaru, persempit periode)':"")+(L.length>TAMPIL?'; menampilkan '+TAMPIL+' teratas, persempit pencarian':"")+'.</div></div>'+
      (vis.length?'<table><thead><tr><th></th><th>Tanggal</th><th>Dokumen</th><th>No PPBJ</th><th>Proyek</th><th>Departemen</th><th class="nm">Barang</th><th>Status</th><th></th></tr></thead><tbody>'+body+'</tbody></table>':'<div class="card msg">Tidak ada dokumen yang cocok.</div>');
    pasang(vis);
  }
  function proyekOpsi(opt){var c={};S.rows.forEach(function(x){if(x.proyek)c[x.proyek]=(c[x.proyek]||0)+1;});return Object.keys(c).sort().map(function(p){return opt(p,p+" ("+c[p]+")",S.f.proyek);}).join("");}
  function pasang(vis){
    var $=function(i){return el.querySelector("#"+i);};
    var q=$("arq");q.oninput=function(){S.f.q=q.value;clearTimeout(ARB._t);ARB._t=setTimeout(function(){var p=q.selectionStart;gambar();var n=el.querySelector("#arq");n.focus();try{n.setSelectionRange(p,p);}catch(e){}},120);};
    $("arr").onclick=load;
    $("arj").onchange=function(){S.f.jenis=this.value;gambar();};$("ars").onchange=function(){S.f.status=this.value;gambar();};$("ard").onchange=function(){S.f.dept=this.value;gambar();};
    $("arp").onchange=function(){S.f.proyek=this.value;gambar();};
    if($("arsj"))$("arsj").onclick=function(){var L=tampil().filter(function(x){return pnr(x)&&x.foto;});if(!L.length){toast0("Tidak ada penerimaan berfoto pada proyek ini.",true);return;}S.sel={};if(L.length>MAKS)toast0("Hanya "+MAKS+" penerimaan teratas yang dipilih (batas sekali unduh).",true);L.slice(0,MAKS).forEach(function(x){S.sel[x.id]=1;});unduh(this,Object.keys(S.sel),"gabung");};
    el.querySelectorAll("[data-af]").forEach(function(b){b.onclick=function(){lihatFoto(b.getAttribute("data-af"),b);};});
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
  async function ambilBukti(btn,ids){
    var r=await api0({action:"adminArsipBukti",ids:ids.slice(0,MAKS)});
    if(!r||!r.ok){toast0((r&&r.msg)||"Gagal.",true);return null;}return r;
  }
  async function ambilSJ(btn,ids,lewat){
    var docs=[];
    for(var i=0;i<ids.length;i+=2){
      btn.textContent="Mengambil foto "+Math.min(i+2,ids.length)+"/"+ids.length+"...";
      var r=await api0({action:"adminTerimaFoto",keys:ids.slice(i,i+2)});
      if(!r||!r.ok){toast0((r&&r.msg)||"Gagal.",true);return null;}
      docs=docs.concat(r.docs||[]);(r.lewat||[]).forEach(function(x){lewat.push(x);});
    }
    var urut={};S.rows.forEach(function(x){urut[x.id]=x.tgl+"|"+x.doc;});
    docs.sort(function(a,b){return (urut[a.key]||"")<(urut[b.key]||"")?-1:1;});
    return docs.filter(function(d){return d.files&&d.files.length;});
  }
  function namaSatu(d){return window.paNamaBerkas?paNamaBerkas(d):String(d.doc).replace(/[\\\/:*?"<>|\s]+/g,"-");}
  async function gabungBytes(list){
    var L=window.PDFLib,out=await L.PDFDocument.create();
    for(var i=0;i<list.length;i++){var src=await L.PDFDocument.load(list[i]),pg=await out.copyPages(src,src.getPageIndices());pg.forEach(function(p){out.addPage(p);});}
    return await out.save();
  }
  async function unduh(btn,ids,mode){
    if(!window.PDFLib||!window.BuktiPdf){toast0("Pembuat PDF belum termuat. Periksa internet lalu muat ulang halaman.",true);return;}
    var tek=btn.textContent;btn.disabled=true;
    try{
      var idB=ids.filter(function(k){return k.indexOf("TERIMA|")!==0;}),idT=ids.filter(function(k){return k.indexOf("TERIMA|")===0;}),lewat=[],docs=[],sig={},docsT=[];
      if(idB.length){btn.textContent="Mengambil data...";var r=await ambilBukti(btn,idB);if(!r)return;docs=r.docs||[];sig=r.sig||{};(r.lewat||[]).forEach(function(x){lewat.push(x);});}
      if(idT.length){docsT=await ambilSJ(btn,idT,lewat);if(!docsT)return;}
      var meta={};S.rows.forEach(function(x){meta[x.id]=x;});
      docs=docs.slice().sort(function(a,b){var A=meta[a.key]||{},B=meta[b.key]||{};return (A.tgl+"|"+A.doc)<(B.tgl+"|"+B.doc)?-1:1;});
      if(!docs.length&&!docsT.length){toast0("Tidak ada dokumen yang bisa dicetak. "+(lewat[0]||""),true);return;}
      var stamp=iso(new Date()),n=docs.length+docsT.length;
      if(mode==="zip"){
        var files=[];
        for(var j=0;j<docs.length;j++){btn.textContent="Membuat PDF "+(j+1)+"/"+docs.length+"...";files.push({name:String(docs[j].doc).replace(/[\\\/:*?"<>|\s]+/g,"-")+".pdf",bytes:await BuktiPdf.buatSatu(docs[j],sig)});}
        for(var k=0;k<docsT.length;k++){btn.textContent="Membuat PDF surat jalan "+(k+1)+"/"+docsT.length+"...";var h=await BuktiPdf.buatSuratJalan([docsT[k]]);(h.dilewati||[]).forEach(function(x){lewat.push(x);});if(h.bytes)files.push({name:namaSatu(docsT[k])+".pdf",bytes:h.bytes});}
        if(!files.length){toast0("Tidak ada halaman yang bisa dibuat. "+(lewat[0]||""),true);return;}
        simpan(BuktiPdf.buatZip(files),NB.buat("zip","Arsip Bukti",n+" dokumen"),"application/zip");
      }else if(mode==="satu"){
        if(docs.length)simpan(await BuktiPdf.buatSatu(docs[0],sig),String(docs[0].doc).replace(/[\\\/:*?"<>|\s]+/g,"-")+".pdf","application/pdf");
        else{var h1=await BuktiPdf.buatSuratJalan([docsT[0]]);(h1.dilewati||[]).forEach(function(x){lewat.push(x);});if(!h1.bytes){toast0("Tidak ada halaman yang bisa dibuat. "+(lewat[0]||""),true);return;}simpan(h1.bytes,namaSatu(docsT[0])+".pdf","application/pdf");}
      }else{
        var parts=[];
        if(docs.length)parts.push(await BuktiPdf.buatGabungan(docs,sig,function(i,n2){btn.textContent="Membuat PDF "+i+"/"+n2+"...";}));
        if(docsT.length){var h2=await BuktiPdf.buatSuratJalan(docsT,function(i,n2){btn.textContent="Membuat surat jalan "+i+"/"+n2+"...";});(h2.dilewati||[]).forEach(function(x){lewat.push(x);});if(h2.bytes)parts.push(h2.bytes);}
        if(!parts.length){toast0("Tidak ada halaman yang bisa dibuat. "+(lewat[0]||""),true);return;}
        var byt=parts.length>1?await gabungBytes(parts):parts[0],nm=NB.buat("","Arsip Bukti",n+" dokumen");
        if(!docs.length&&window.paNamaGabungan){nm=paNamaGabungan(docsT,stamp);if(/^Bukti Accurate - /.test(nm))nm=NB.buat("","Surat Jalan Penerimaan",docsT.length+" penerimaan");}
        simpan(byt,nm+".pdf","application/pdf");
      }
      toast0(n+" dokumen diunduh."+(lewat.length?" Dilewati "+lewat.length+": "+lewat.slice(0,2).join("; "):""));
    }catch(e){toast0("Gagal membuat PDF: "+(e&&e.message||e),true);}
    finally{btn.disabled=false;btn.textContent=tek;}
  }
  /** Lihat foto surat jalan langsung (tanpa unduh PDF). */
  async function lihatFoto(id,btn){
    var tek=btn.textContent;btn.disabled=true;btn.textContent="Memuat...";
    try{
      var r=await api0({action:"adminTerimaFoto",keys:[id]});
      if(!r||!r.ok){toast0((r&&r.msg)||"Gagal.",true);return;}
      var d=(r.docs||[])[0];if(!d||!d.files.length){toast0("Tidak ada foto yang terbaca. "+((r.lewat||[])[0]||""),true);return;}
      var ov=document.createElement("div");ov.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:50;overflow:auto;padding:14px";
      ov.innerHTML='<div style="max-width:760px;margin:0 auto;background:var(--card,#fff);color:var(--ink,#000);border-radius:12px;padding:12px"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b>'+esc(d.doc)+(d.proyek?' &middot; '+esc(d.proyek):'')+'</b><button class="gh" id="arfx">Tutup</button></div>'+
        d.files.map(function(f){return f.mime==="application/pdf"?'<p>'+esc(f.nama)+' (PDF, unduh lewat tombol PDF)</p>':'<img alt="'+esc(f.nama)+'" src="data:'+esc(f.mime)+';base64,'+f.data+'" style="max-width:100%;display:block;margin:8px auto;border:1px solid var(--line,#ccc);border-radius:8px">';}).join("")+'</div>';
      document.body.appendChild(ov);var tutup=function(){ov.remove();};ov.querySelector("#arfx").onclick=tutup;ov.onclick=function(e){if(e.target===ov)tutup();};
    }catch(e){toast0("Gagal memuat foto.",true);}
    finally{btn.disabled=false;btn.textContent=tek;}
  }
  function mount(pane,api,toast){
    el=pane;api0=api;toast0=toast;
    if(!S.f.dari){var d=new Date();d.setDate(d.getDate()-90);S.f.dari=iso(d);}
    load();
  }
  return {mount:mount,_t:null};
})();
