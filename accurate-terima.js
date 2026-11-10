/* Sub-tab "Penerimaan barang" di tab Accurate (Tambahan 43).
   Daftar terpisah dari BPB: penerimaan barang yang menambah stok harus disesuaikan juga di Accurate.
   Excel = jumlah masuk saja (tanpa harga). PDF = foto surat jalan untuk dilampirkan di penerimaan Accurate.
   Tanda merah saja (tanpa email) bila belum disesuaikan lebih dari batas hari. Memakai fungsi global halaman admin: pane, api, toast, esc, fmtN, cocokQ, kirimAdmin, paSimpan, paNamaBerkas, paNamaGabungan, loadAccurate. */
var PAT=(function(){
  "use strict";
  var F={status:"Belum",q:"",dari:"",sampai:"",po:""},S={};
  function $(i){return document.getElementById(i);}
  function ada(){return !!(window.PA&&PA.rowsT);}
  function bar(){
    var rb=(window.PA&&PA.ring)?PA.ring.belum:0,rt=(window.PA&&PA.ringT)?PA.ringT.belum:0,m=window.PAM||"bpb",merah=window.PA&&PA.ringT&&PA.ringT.lewatBatas>0;
    return '<div class="bar" id="pasub"><button class="chip'+(m==="bpb"?" on":"")+'" data-pm="bpb">Bukti pengambilan (BPB)'+(rb?' <span class="bd '+(PA.ring.lewatBatas?"b":"w")+'">'+rb+'</span>':"")+'</button><button class="chip'+(m==="terima"?" on":"")+'" data-pm="terima">Penerimaan barang'+(rt?' <span class="bd '+(merah?"b":"w")+'">'+rt+'</span>':"")+'</button></div>';
  }
  function pasangBar(){
    document.querySelectorAll("[data-pm]").forEach(function(b){b.onclick=function(){window.PAM=b.getAttribute("data-pm");S={};if(window.PAS)window.PAS={};drawAccurate();};});
  }
  function tampil(){
    var q=F.q.trim().toLowerCase();
    return PA.rowsT.filter(function(x){
      if(F.status&&x.status!==F.status)return false;if(F.po==="lengkap"&&!x.poLengkap)return false;
      if(F.dari&&x.tgl<F.dari)return false;if(F.sampai&&x.tgl>F.sampai)return false;
      if(q&&!cocokQ(x.doc+" "+x.proyek+" "+x.ppbj+" "+x.noTrans+" "+x.sumber,q))return false;return true;});
  }
  function terpilih(){return PA.rowsT.filter(function(x){return S[x.key];});}
  function draw(){
    var R=PA.ringT||{belum:0,sudah:0,tertua:0,lewatBatas:0,batas:3},vis=tampil(),sel=terpilih(),nSel=vis.filter(function(x){return S[x.key];}).length;
    var body=vis.slice(0,500).map(function(x){
      var merah=x.status==="Belum"&&x.umur>R.batas;
      return '<tr><td><input type="checkbox" data-tk="'+esc(x.key)+'"'+(S[x.key]?" checked":"")+'></td><td data-l="Tanggal">'+esc(x.tgl)+'</td><td data-l="Penerimaan"><b>'+esc(x.doc)+'</b><small>'+esc(x.sumber||"")+'</small>'+(x.poNo?'<small>PO '+esc(x.poNo)+': '+(x.poLengkap?'<b style="color:var(--ok,#14612b)">PO lengkap, siap diinput</b>':'PO belum lengkap')+'</small>':'')+'</td><td data-l="No PPBJ">'+(x.ppbj?'<b>'+esc(x.ppbj)+'</b>':'<span class="bd w">tanpa PPBJ</span>')+'</td><td data-l="Proyek">'+esc(x.proyek||"-")+'</td><td class="nm" data-l="Barang / Jumlah">'+x.n+' / '+fmtN(x.qty)+'<div><button class="gh" data-tlh="'+esc(x.key)+'" style="margin-top:4px">Lihat barang</button></div></td>'+
        '<td data-l="Status">'+(x.status==="Sudah"?'<span class="bd d">Sudah</span><small>'+esc(x.noTrans)+'</small><small>'+esc(x.tglIn)+(x.oleh?" - "+esc(x.oleh):"")+'</small>':'<span class="bd '+(merah?"b":"w")+'">Belum</span><small'+(merah?' style="color:var(--red,#a82424);font-weight:700"':"")+'>'+x.umur+' hari'+(merah?' &middot; lewat '+R.batas+' hari':"")+'</small>')+(x.cat?'<small>'+esc(x.cat)+'</small>':"")+'</td></tr>';
    }).join("");
    pane().innerHTML=bar()+
     '<div class="sum"><div><b'+(R.belum?' style="color:'+(R.lewatBatas?"var(--red,#a82424)":"var(--warn-t,#6b4300)")+'"':"")+'>'+R.belum+'</b><span>Penerimaan belum disesuaikan di Accurate</span></div><div><b>'+R.tertua+' hari</b><span>Yang tertua belum</span></div><div><b'+(R.lewatBatas?' style="color:var(--red,#c0392b)"':"")+'>'+R.lewatBatas+'</b><span>Lewat batas '+R.batas+' hari (merah)</span></div><div><b>'+R.sudah+'</b><span>Sudah diinput</span></div></div>'+
     '<div class="note">Daftar ini khusus barang yang DITERIMA dan menambah stok (halaman Penerimaan Barang dan penerimaan lewat Pembelian). Terpisah dari daftar BPB. Di Accurate, buat penerimaan/penyesuaian persediaan sesuai jumlah masuk, lalu lampirkan PDF surat jalan.</div>'+
     '<div class="bar" id="tastab" role="group" aria-label="Status input Accurate">'+[["Belum","Belum diinput ("+R.belum+")"],["Sudah","Sudah diinput ("+R.sudah+")"],["","Semua"]].map(function(o){return '<button class="chip'+(F.status===o[0]?" on":"")+'" data-ts="'+o[0]+'">'+o[1]+'</button>';}).join("")+'</div>'+
     '<div class="bar"><select id="tapo"><option value="">Semua penerimaan</option><option value="lengkap"'+(F.po==="lengkap"?" selected":"")+'>Hanya PO lengkap</option></select><label class="fl">Dari <input type="date" id="tad" value="'+esc(F.dari)+'"></label><label class="fl">Sampai <input type="date" id="taz" value="'+esc(F.sampai)+'"></label><input id="taq" placeholder="Cari nomor / proyek / No transaksi" value="'+esc(F.q)+'"><button class="gh" id="tar">Segarkan</button></div>'+
     '<div class="bar"><label class="fl"><input type="checkbox" id="tall"'+(vis.length&&nSel===Math.min(vis.length,500)?" checked":"")+'> Pilih semua yang tampil</label><b id="tasel">'+sel.length+' dipilih</b><button class="gh" id="tax">Unduh Excel (jumlah masuk)</button><button class="gh" id="tag">Unduh PDF surat jalan (gabungan)</button><button class="gh" id="taz2">Unduh ZIP (1 PDF per penerimaan)</button></div>'+
     '<div class="bar"><input id="tano" placeholder="No transaksi penerimaan di Accurate" maxlength="80"><input id="tact" placeholder="Catatan (opsional)" maxlength="200"><button class="sv" id="tat">Tandai sudah diinput</button><button class="gh" id="tab2">Kembalikan ke Belum</button></div>'+
     (vis.length?'<table><thead><tr><th></th><th>Tanggal</th><th>Penerimaan</th><th>No PPBJ</th><th>Proyek</th><th class="nm">Barang / Jumlah</th><th>Status</th></tr></thead><tbody>'+body+'</tbody></table>'+(vis.length>500?'<div class="note">Menampilkan 500 dari '+vis.length+'. Persempit filter.</div>':""):'<div class="card msg">Tidak ada penerimaan yang cocok dengan filter.</div>');
    pasangBar();
    document.querySelectorAll("[data-ts]").forEach(function(b){b.onclick=function(){F.status=b.getAttribute("data-ts");S={};draw();};});$("tapo").onchange=function(){F.po=this.value;draw();};$("tad").onchange=function(){F.dari=this.value;draw();};$("taz").onchange=function(){F.sampai=this.value;draw();};
    $("taq").onkeydown=function(e){if(e.key==="Enter"){F.q=this.value;draw();}};$("taq").onchange=function(){F.q=this.value;draw();};$("tar").onclick=function(){loadAccurate(true);};
    $("tall").onchange=function(){var on=this.checked;vis.slice(0,500).forEach(function(x){if(on)S[x.key]=1;else delete S[x.key];});draw();};
    document.querySelectorAll("[data-tk]").forEach(function(c){c.onchange=function(){var k=c.getAttribute("data-tk");if(c.checked)S[k]=1;else delete S[k];$("tasel").textContent=terpilih().length+" dipilih";};});
    $("tax").onclick=function(){excel(this);};$("tag").onclick=function(){pdf(this,false);};$("taz2").onclick=function(){pdf(this,true);};
    $("tat").onclick=function(){tandai(this,"sudah");};$("tab2").onclick=function(){tandai(this,"belum");};
    document.querySelectorAll("[data-tlh]").forEach(function(b){b.onclick=function(){lihat(b.getAttribute("data-tlh"),b);};});
    if(window.PAU2)PAU2.pasang();
  }
  /* Tombol "Lihat barang" (Tambahan 48): isi satu penerimaan untuk diperiksa + detail proyek. Hanya membaca. */
  function tgl(i){var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(i||""));return m?m[3]+"/"+m[2]+"/"+m[1]:(i||"");}
  function rp(v){return v==null?"-":"Rp "+fmtN(v);}
  function tlhModal(html){var o=$("tlhmod");if(o)o.remove();o=document.createElement("div");o.id="tlhmod";o.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9998;display:flex;align-items:flex-start;justify-content:center;padding:10px;overflow:auto";o.innerHTML='<div class="card" style="max-width:960px;width:100%;margin:auto;background:var(--card,#fff);color:var(--ink,#222);padding:14px">'+html+'</div>';document.body.appendChild(o);o.onclick=function(e){if(e.target===o)o.remove();};var x=$("tlh-x");if(x)x.onclick=function(){o.remove();};return o;}
  function badgeOrder(o){if(!o)return "";var k={BELUM:"w",DIPESAN:"n",SEBAGIAN:"w",DATANG:"d",BATAL:"r"}[o.kode]||"r";return '<span class="bd '+(o.peringatan?"b":k)+'">'+esc(o.label)+'</span>';}
  async function lihat(key,btn){
    if(btn)btn.disabled=true;
    try{
      var r=await api({action:"adminTerimaLihat",key:key});
      if(!r.ok){toast(r.msg||"Gagal memuat.",true);return;}
      var d=r.doc,p=r.proyek,adaRab=p&&p.terdaftar&&p.adaRab,h='<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><div><b style="font-size:16px">'+esc(d.nomor)+'</b> <span class="note">'+esc(d.jenis)+'</span></div><button class="gh" id="tlh-x">Tutup</button></div>';
      h+='<div class="note" style="margin:6px 0">'+esc(d.waktu)+' &middot; diterima oleh <b>'+esc(d.oleh||"-")+'</b>'+(d.peran?" ("+esc(d.peran)+")":"")+(d.sumber?" &middot; "+esc(d.sumber):"")+(d.po?" &middot; PO "+esc(d.po):"")+(d.supplier?" &middot; "+esc(d.supplier):"")+(d.foto?" &middot; "+d.foto+" foto surat jalan":(d.alasanTanpaFoto?" &middot; tanpa foto: "+esc(d.alasanTanpaFoto):""))+'</div>';
      h+='<div class="note" style="margin:4px 0">Accurate: '+(d.statusAcc==="Sudah"?'<span class="bd d">Sudah diinput</span> '+esc(d.noTrans||"")+(d.tglInput?" &middot; "+esc(d.tglInput):""):'<span class="bd w">Belum diinput</span>')+(d.stokNaik?"":' &middot; <b>stok tidak ditambah</b>')+'</div>';
      if(d.batal)h+='<div class="card msg" style="margin:6px 0;color:var(--red,#a82424)"><b>DIBATALKAN.</b> '+esc(d.batalInfo)+'</div>';
      if(d.catatan)h+='<div class="note" style="margin:4px 0">Catatan: '+esc(d.catatan)+'</div>';
      var kol=adaRab;
      h+='<table style="margin:8px 0"><thead><tr><th>#</th><th>Barang</th><th class="nm">Diterima</th><th class="nm">Harga</th><th class="nm">Stok Accurate sekarang</th>'+(kol?'<th class="nm">Kebutuhan proyek</th><th>Status stok proyek</th><th>Status order</th>':"")+'<th>Catatan</th></tr></thead><tbody>'+
        r.items.map(function(x){
          var tg=[];if(x.belumTerdaftar)tg.push('<span class="bd w">belum terdaftar di Master</span>');if(x.luarPesanan)tg.push('<span class="bd w">di luar pesanan</span>');if(x.diLuarRab)tg.push('<span class="bd w">tidak ada di kebutuhan proyek</span>');
          return '<tr><td>'+x.no+'</td><td><b>'+esc(x.nama||x.kode)+'</b><small>'+esc(x.kode||"(tanpa kode)")+(x.satuan?" &middot; "+esc(x.satuan):"")+'</small></td><td class="nm"><b>'+fmtN(x.qty)+'</b></td><td class="nm">'+(x.harga==null?"-":rp(x.harga))+'</td><td class="nm">'+(x.stokSekarang==null?"-":fmtN(x.stokSekarang))+'</td>'+
            (kol?'<td class="nm">'+(x.rab==null?"-":fmtN(x.rab)+(x.sisa!=null?'<small>sisa '+fmtN(x.sisa)+"</small>":""))+'</td><td>'+esc(x.statusStok||"-")+'</td><td>'+(badgeOrder(x.order)||"-")+'</td>':"")+'<td>'+(tg.join(" ")||"")+'</td></tr>';
        }).join("")+'</tbody><tfoot><tr><td></td><td><b>Total '+r.total.n+' barang</b></td><td class="nm"><b>'+fmtN(r.total.qty)+'</b></td><td class="nm">'+(r.total.nilai==null?"":"<b>"+rp(r.total.nilai)+"</b>")+'</td><td></td>'+(kol?'<td></td><td></td><td></td>':"")+'<td></td></tr></tfoot></table>';
      h+='<div class="note">Stok Accurate sekarang = stok kolom Accurate saat ini (sesudah semua mutasi), bukan stok saat penerimaan.</div>';
      if(p&&p.terdaftar){
        h+='<div class="card" style="margin:10px 0 0;padding:10px"><b>Detail proyek</b><div style="margin-top:4px"><b>'+esc(p.ppbj)+'</b> &mdash; '+esc(p.ket||"-")+'</div><div class="note" style="margin-top:4px">Departemen '+esc(p.dept||"-")+(p.pic?" &middot; PIC <b>"+esc(p.pic)+"</b>":"")+' &middot; Status <b>'+esc(p.status)+'</b>'+(p.mengikat?"":" (tidak mengikat stok)")+' &middot; Prioritas '+esc(p.prio||"-")+' &middot; '+esc(p.jenis||"")+(p.tglButuh?" &middot; Dibutuhkan "+tgl(p.tglButuh):"")+(p.sumberRab?" &middot; Sumber kebutuhan: "+esc(p.sumberRab):"")+'</div>';
        h+=p.adaRab?'<div class="note" style="margin-top:4px">Kebutuhan: '+p.nItem+' barang &middot; terpenuhi '+p.nTerpenuhi+' &middot; sisa '+p.nSisa+(p.nKurang?" &middot; <b>kurang "+p.nKurang+"</b>"+(p.nKurangDipesan?" ("+p.nKurangDipesan+" sudah dipesan)":""):"")+(p.nRebutan?" &middot; rebutan "+p.nRebutan:"")+((p.nOrderBelum||p.nOrderDipesan||p.nOrderDatang)?" &middot; order: belum "+p.nOrderBelum+", dipesan "+p.nOrderDipesan+", datang "+p.nOrderDatang:"")+'</div>':'<div class="note" style="margin-top:4px">Proyek ini belum punya daftar kebutuhan (RAB).</div>';
        h+='</div>';
      }else if(p){h+='<div class="card" style="margin:10px 0 0;padding:10px"><b>Proyek</b><div style="margin-top:4px">'+(p.ppbj?'<b>'+esc(p.ppbj)+'</b> &mdash; ':"")+esc(p.ket||"-")+'</div><div class="note" style="margin-top:4px">'+(p.ppbj?"No PPBJ ini belum terdaftar di tab Proyek.":"Ditulis bebas saat penerimaan (tanpa No PPBJ).")+'</div></div>';}
      else h+='<div class="note" style="margin-top:10px">Penerimaan ini tidak dikaitkan dengan proyek.</div>';
      tlhModal(h);
    }catch(e){toast("Gagal terhubung ke server.",true);}
    finally{if(btn)btn.disabled=false;}
  }
  async function tandai(btn,aksi){
    var sel=terpilih();if(!sel.length){toast("Pilih penerimaan dulu.",true);return;}
    var no=$("tano").value.trim();if(aksi==="sudah"&&!no){toast("Isi nomor transaksi penerimaan di Accurate dulu.",true);return;}
    if(!confirm(aksi==="sudah"?"Tandai "+sel.length+" penerimaan sudah diinput ke Accurate dengan nomor "+no+"?":"Kembalikan "+sel.length+" penerimaan ke status Belum?"))return;
    await kirimAdmin(btn,{action:"adminPaTandai",keys:sel.map(function(x){return x.key;}),aksi:aksi,noTrans:no,cat:$("tact").value.trim()},async function(){S={};await loadAccurate();});
  }
  async function excel(btn){
    var sel=terpilih();if(!sel.length){toast("Pilih penerimaan dulu.",true);return;}
    if(typeof XLSX==="undefined"){toast("Pembaca Excel belum termuat. Periksa internet lalu muat ulang halaman.",true);return;}
    btn.disabled=true;
    try{
      var rows=[];
      for(var i=0;i<sel.length;i+=150){var r=await api({action:"adminPaRincian",keys:sel.slice(i,i+150).map(function(x){return x.key;})});if(!r.ok){toast(r.msg||"Gagal.",true);btn.disabled=false;return;}rows=rows.concat(r.rows||[]);}
      var wb=XLSX.utils.book_new();
      var a1=[["Rincian Penerimaan Barang (jumlah masuk, untuk Accurate)"],[],["No Transaksi Accurate","Status","Tanggal","No Penerimaan","No PO","No PPBJ","Proyek","Kode Barang","Nama Barang","Satuan","Jumlah Masuk"]].concat(rows.map(function(x){return [x.noTrans,x.status,x.tgl,x.doc,x.po||"",x.ppbj,x.proyek,x.kode,x.nama,x.satuan,x.qty];}));
      XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(a1),"Rincian Barang");
      var tot={};rows.forEach(function(x){var k=x.kode||x.nama,t=tot[k]||(tot[k]={kode:x.kode,nama:x.nama,satuan:x.satuan,qty:0});t.qty+=x.qty;});
      XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([["Total per Barang"],[],["Kode Barang","Nama Barang","Satuan","Total Masuk"]].concat(Object.keys(tot).sort().map(function(k){var t=tot[k];return [t.kode,t.nama,t.satuan,Math.round(t.qty*1000)/1000];}))),"Total per Barang");
      XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([["Tanggal","No Penerimaan","Proyek","No PPBJ","Jumlah Barang","Total Jumlah","Status","No Transaksi Accurate"]].concat(sel.map(function(x){return [x.tgl,x.doc,x.proyek,x.ppbj,x.n,x.qty,x.status,x.noTrans];}))),"Daftar Penerimaan");
      XLSX.writeFile(wb,NB.buat("xlsx","Penerimaan Barang Accurate"));
      toast("Excel siap: "+sel.length+" penerimaan, "+rows.length+" baris barang (jumlah masuk saja).",!rows.length);
    }catch(e){toast("Gagal terhubung ke server.",true);}
    btn.disabled=false;
  }
  async function pdf(btn,zip){
    var sel=terpilih();if(!sel.length){toast("Pilih penerimaan dulu.",true);return;}
    if(!window.PDFLib||!window.BuktiPdf||!BuktiPdf.buatSuratJalan){toast("Pembuat PDF belum termuat. Periksa internet lalu muat ulang halaman.",true);return;}
    var tek=btn.textContent;btn.disabled=true;
    try{
      var docs=[],lewat=[];
      for(var i=0;i<sel.length;i+=2){
        btn.textContent="Mengambil foto "+Math.min(i+2,sel.length)+"/"+sel.length+"...";
        var r=await api({action:"adminTerimaFoto",keys:sel.slice(i,i+2).map(function(x){return x.key;})});
        if(!r.ok){toast(r.msg||"Gagal.",true);btn.disabled=false;btn.textContent=tek;return;}
        docs=docs.concat(r.docs||[]);lewat=lewat.concat(r.lewat||[]);
      }
      var urut={};sel.forEach(function(x){urut[x.key]=x.tgl+"|"+x.doc;});docs.sort(function(a,b){return urut[a.key]<urut[b.key]?-1:1;});
      docs=docs.filter(function(d){return d.files&&d.files.length;});
      if(!docs.length){toast("Tidak ada foto surat jalan pada penerimaan terpilih. "+(lewat[0]||""),true);btn.disabled=false;btn.textContent=tek;return;}
      var stamp=new Date().toISOString().slice(0,10);
      if(zip){
        var files=[];
        for(var j=0;j<docs.length;j++){btn.textContent="Membuat PDF "+(j+1)+"/"+docs.length+"...";var h=await BuktiPdf.buatSuratJalan([docs[j]]);lewat=lewat.concat(h.dilewati);if(h.bytes)files.push({name:paNamaBerkas(docs[j])+".pdf",bytes:h.bytes});}
        if(!files.length){toast("Tidak ada halaman yang bisa dibuat. "+(lewat[0]||""),true);btn.disabled=false;btn.textContent=tek;return;}
        paSimpan(BuktiPdf.buatZip(files),NB.buat("zip","Surat Jalan Penerimaan",docs.length+" penerimaan"),"application/zip");
      }else{
        var h2=await BuktiPdf.buatSuratJalan(docs,function(i,n){btn.textContent="Membuat PDF "+i+"/"+n+"...";});lewat=lewat.concat(h2.dilewati);
        if(!h2.bytes){toast("Tidak ada halaman yang bisa dibuat. "+(lewat[0]||""),true);btn.disabled=false;btn.textContent=tek;return;}
        var nm=paNamaGabungan(docs,stamp);if(/^Bukti Accurate - /.test(nm))nm=NB.buat("","Surat Jalan Penerimaan",docs.length+" penerimaan");
        paSimpan(h2.bytes,nm+".pdf","application/pdf");
      }
      toast("Unduhan siap: "+docs.length+" penerimaan."+(lewat.length?" Dilewati "+lewat.length+": "+lewat.slice(0,3).join("; ")+(lewat.length>3?" ...":""):""));
    }catch(e){toast("Gagal membuat PDF: "+(e&&e.message?e.message:"coba lagi"),true);}
    btn.disabled=false;btn.textContent=tek;
  }
  function mulai(){F.status="Belum";S={};}
  return {bar:bar,pasangBar:pasangBar,draw:draw,mulai:mulai};
})();
