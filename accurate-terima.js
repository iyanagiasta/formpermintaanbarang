/* Sub-tab "Penerimaan barang" di tab Accurate (Tambahan 43).
   Daftar terpisah dari BPB: penerimaan barang yang menambah stok harus disesuaikan juga di Accurate.
   Excel = jumlah masuk saja (tanpa harga). PDF = foto surat jalan untuk dilampirkan di penerimaan Accurate.
   Tanda merah saja (tanpa email) bila belum disesuaikan lebih dari batas hari. Memakai fungsi global halaman admin: pane, api, toast, esc, fmtN, cocokQ, kirimAdmin, paSimpan, paNamaBerkas, paNamaGabungan, loadAccurate. */
var PAT=(function(){
  "use strict";
  var F={status:"Belum",q:"",dari:"",sampai:""},S={};
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
      if(F.status&&x.status!==F.status)return false;
      if(F.dari&&x.tgl<F.dari)return false;if(F.sampai&&x.tgl>F.sampai)return false;
      if(q&&!cocokQ(x.doc+" "+x.proyek+" "+x.ppbj+" "+x.noTrans+" "+x.sumber,q))return false;return true;});
  }
  function terpilih(){return PA.rowsT.filter(function(x){return S[x.key];});}
  function draw(){
    var R=PA.ringT||{belum:0,sudah:0,tertua:0,lewatBatas:0,batas:3},vis=tampil(),sel=terpilih(),nSel=vis.filter(function(x){return S[x.key];}).length;
    var body=vis.slice(0,500).map(function(x){
      var merah=x.status==="Belum"&&x.umur>R.batas;
      return '<tr><td><input type="checkbox" data-tk="'+esc(x.key)+'"'+(S[x.key]?" checked":"")+'></td><td data-l="Tanggal">'+esc(x.tgl)+'</td><td data-l="Penerimaan"><b>'+esc(x.doc)+'</b><small>'+esc(x.sumber||"")+'</small></td><td data-l="No PPBJ">'+(x.ppbj?'<b>'+esc(x.ppbj)+'</b>':'<span class="bd w">tanpa PPBJ</span>')+'</td><td data-l="Proyek">'+esc(x.proyek||"-")+'</td><td class="nm" data-l="Barang / Jumlah">'+x.n+' / '+fmtN(x.qty)+'</td>'+
        '<td data-l="Status">'+(x.status==="Sudah"?'<span class="bd d">Sudah</span><small>'+esc(x.noTrans)+'</small><small>'+esc(x.tglIn)+(x.oleh?" - "+esc(x.oleh):"")+'</small>':'<span class="bd '+(merah?"b":"w")+'">Belum</span><small'+(merah?' style="color:var(--red,#a82424);font-weight:700"':"")+'>'+x.umur+' hari'+(merah?' &middot; lewat '+R.batas+' hari':"")+'</small>')+(x.cat?'<small>'+esc(x.cat)+'</small>':"")+'</td></tr>';
    }).join("");
    pane().innerHTML=bar()+
     '<div class="sum"><div><b'+(R.belum?' style="color:'+(R.lewatBatas?"var(--red,#a82424)":"var(--warn-t,#6b4300)")+'"':"")+'>'+R.belum+'</b><span>Penerimaan belum disesuaikan di Accurate</span></div><div><b>'+R.tertua+' hari</b><span>Yang tertua belum</span></div><div><b'+(R.lewatBatas?' style="color:var(--red,#c0392b)"':"")+'>'+R.lewatBatas+'</b><span>Lewat batas '+R.batas+' hari (merah)</span></div><div><b>'+R.sudah+'</b><span>Sudah diinput</span></div></div>'+
     '<div class="note">Daftar ini khusus barang yang DITERIMA dan menambah stok (halaman Penerimaan Barang dan penerimaan lewat Pembelian). Terpisah dari daftar BPB. Di Accurate, buat penerimaan/penyesuaian persediaan sesuai jumlah masuk, lalu lampirkan PDF surat jalan.</div>'+
     '<div class="bar"><select id="tas">'+[["Belum","Belum diinput"],["Sudah","Sudah diinput"],["","Semua status"]].map(function(o){return '<option value="'+o[0]+'"'+(F.status===o[0]?" selected":"")+'>'+o[1]+'</option>';}).join("")+'</select><label class="fl">Dari <input type="date" id="tad" value="'+esc(F.dari)+'"></label><label class="fl">Sampai <input type="date" id="taz" value="'+esc(F.sampai)+'"></label><input id="taq" placeholder="Cari nomor / proyek / No transaksi" value="'+esc(F.q)+'"><button class="gh" id="tar">Segarkan</button></div>'+
     '<div class="bar"><label class="fl"><input type="checkbox" id="tall"'+(vis.length&&nSel===Math.min(vis.length,500)?" checked":"")+'> Pilih semua yang tampil</label><b id="tasel">'+sel.length+' dipilih</b><button class="gh" id="tax">Unduh Excel (jumlah masuk)</button><button class="gh" id="tag">Unduh PDF surat jalan (gabungan)</button><button class="gh" id="taz2">Unduh ZIP (1 PDF per penerimaan)</button></div>'+
     '<div class="bar"><input id="tano" placeholder="No transaksi penerimaan di Accurate" maxlength="80"><input id="tact" placeholder="Catatan (opsional)" maxlength="200"><button class="sv" id="tat">Tandai sudah diinput</button><button class="gh" id="tab2">Kembalikan ke Belum</button></div>'+
     (vis.length?'<table><thead><tr><th></th><th>Tanggal</th><th>Penerimaan</th><th>No PPBJ</th><th>Proyek</th><th class="nm">Barang / Jumlah</th><th>Status</th></tr></thead><tbody>'+body+'</tbody></table>'+(vis.length>500?'<div class="note">Menampilkan 500 dari '+vis.length+'. Persempit filter.</div>':""):'<div class="card msg">Tidak ada penerimaan yang cocok dengan filter.</div>');
    pasangBar();
    $("tas").onchange=function(){F.status=this.value;draw();};$("tad").onchange=function(){F.dari=this.value;draw();};$("taz").onchange=function(){F.sampai=this.value;draw();};
    $("taq").onkeydown=function(e){if(e.key==="Enter"){F.q=this.value;draw();}};$("taq").onchange=function(){F.q=this.value;draw();};$("tar").onclick=function(){loadAccurate();};
    $("tall").onchange=function(){var on=this.checked;vis.slice(0,500).forEach(function(x){if(on)S[x.key]=1;else delete S[x.key];});draw();};
    document.querySelectorAll("[data-tk]").forEach(function(c){c.onchange=function(){var k=c.getAttribute("data-tk");if(c.checked)S[k]=1;else delete S[k];$("tasel").textContent=terpilih().length+" dipilih";};});
    $("tax").onclick=function(){excel(this);};$("tag").onclick=function(){pdf(this,false);};$("taz2").onclick=function(){pdf(this,true);};
    $("tat").onclick=function(){tandai(this,"sudah");};$("tab2").onclick=function(){tandai(this,"belum");};
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
      XLSX.writeFile(wb,"penerimaan_barang_"+new Date().toISOString().slice(0,10)+".xlsx");
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
        paSimpan(BuktiPdf.buatZip(files),"suratjalan_penerimaan_"+stamp+".zip","application/zip");
      }else{
        var h2=await BuktiPdf.buatSuratJalan(docs,function(i,n){btn.textContent="Membuat PDF "+i+"/"+n+"...";});lewat=lewat.concat(h2.dilewati);
        if(!h2.bytes){toast("Tidak ada halaman yang bisa dibuat. "+(lewat[0]||""),true);btn.disabled=false;btn.textContent=tek;return;}
        var nm=paNamaGabungan(docs,stamp);if(/^bukti_accurate_/.test(nm))nm="suratjalan_penerimaan_"+stamp;
        paSimpan(h2.bytes,nm+".pdf","application/pdf");
      }
      toast("Unduhan siap: "+docs.length+" penerimaan."+(lewat.length?" Dilewati "+lewat.length+": "+lewat.slice(0,3).join("; ")+(lewat.length>3?" ...":""):""));
    }catch(e){toast("Gagal membuat PDF: "+(e&&e.message?e.message:"coba lagi"),true);}
    btn.disabled=false;btn.textContent=tek;
  }
  return {bar:bar,pasangBar:pasangBar,draw:draw};
})();
