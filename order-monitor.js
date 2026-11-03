/* Monitor barang ORDER per PPBJ (Tambahan 30, Paket C). Khusus admin; dibuka dari tab Proyek.
   Barang ORDER (menurut PDF PPBJ) -> pembelian (lewat sistem Pembelian yang ada) -> terima bertahap dengan foto surat jalan -> stok bertambah. */
var OM=(function(){
  var D=[],F={st:"",q:""},back=null,box=null,api0=null,toast0=null;
  function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
  function fq(n){return Number(n||0).toLocaleString("id-ID",{maximumFractionDigits:3});}
  function rp(n){return n==null||n===""?"-":"Rp "+Number(n).toLocaleString("id-ID",{maximumFractionDigits:0});}
  function num(v){var t=String(v==null?"":v).trim().replace(/\s/g,"");if(!t)return 0;if(t.indexOf(",")>=0)t=t.replace(/\./g,"").replace(",",".");var n=Number(t);return isFinite(n)?n:0;}
  var STC={"Menunggu dipesan":"l","Sudah dipesan":"b","Sebagian datang":"w","Lengkap":"d"};
  function bd(s){return '<span class="bd '+(STC[s]||"b")+'">'+esc(s)+'</span>';}
  function ambilGambar(file){return new Promise(function(res,rej){var im=new Image(),u=URL.createObjectURL(file);im.onload=function(){var s=Math.min(1,1600/Math.max(im.width,im.height)),c=document.createElement("canvas");c.width=Math.max(1,Math.round(im.width*s));c.height=Math.max(1,Math.round(im.height*s));var x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,c.width,c.height);x.drawImage(im,0,0,c.width,c.height);c.toBlob(function(b){res(b);},"image/jpeg",0.75);};im.onerror=function(){rej(new Error("gambar rusak"));};im.src=u;});}
  function b64(b){return new Promise(function(res,rej){var fr=new FileReader();fr.onload=function(){res(String(fr.result).split(",")[1]||"");};fr.onerror=function(){rej(new Error("gagal membaca file"));};fr.readAsDataURL(b);});}
  async function siapFile(files){var out=[];for(var i=0;i<files.length;i++){var f=files[i],pdf=f.type==="application/pdf"||/\.pdf$/i.test(f.name);
    if(!pdf&&!/^image\//.test(f.type))throw new Error(f.name+": hanya PDF atau foto.");if(f.size>20*1048576)throw new Error(f.name+" lebih dari 20 MB.");
    var b=pdf?f:await ambilGambar(f);out.push({nama:pdf?f.name:f.name.replace(/\.[^.]+$/,"")+".jpg",mime:pdf?"application/pdf":"image/jpeg",data:await b64(b)});}return out;}
  function tampil(){
    var q=F.q.toLowerCase(),list=D.filter(function(g){
      if(F.st&&g.status!==F.st)return false;
      if(q&&(g.ppbj+" "+g.proyek+" "+g.items.map(function(i){return i.nama+" "+i.kode;}).join(" ")).toLowerCase().indexOf(q)<0)return false;return true;});
    var cnt={};D.forEach(function(g){cnt[g.status]=(cnt[g.status]||0)+1;});
    box.innerHTML='<div class="bar noprint"><button class="gh" id="omback">&larr; Kembali ke daftar proyek</button><a class="gh" href="pengadaan.html" style="text-decoration:none;padding:8px 12px">Buka halaman Pembelian</a></div>'+
      '<div class="card"><b>Monitor barang ORDER per PPBJ</b><div class="note">Barang ORDER (menurut PDF PPBJ) dipesan lewat pembelian, lalu diterima bertahap. <b>Menunggu dipesan</b> = belum ada pembelian ber-No PO. <b>Sudah dipesan</b> = ada No PO. Stok bertambah saat barang diterima. Daftar beli keseluruhan baru dikurangi setelah No PO terisi.</div>'+
      '<div class="fr">'+["","Menunggu dipesan","Sudah dipesan","Sebagian datang","Lengkap"].map(function(s){return '<button class="'+(F.st===s?"sv":"gh")+'" data-st="'+esc(s)+'">'+(s||"Semua")+(s?" ("+(cnt[s]||0)+")":" ("+D.length+")")+'</button>';}).join("")+
      '<input id="omq" placeholder="Cari PPBJ, proyek, atau barang..." value="'+esc(F.q)+'" style="flex:1;min-width:180px"></div></div>'+
      (list.length?list.map(kartu).join(""):'<div class="card msg">Tidak ada PPBJ yang cocok. Barang ORDER muncul di sini setelah PDF PPBJ diimpor dan RAB disimpan.</div>');
    box.querySelector("#omback").onclick=function(){back&&back();};
    box.querySelectorAll("[data-st]").forEach(function(b){b.onclick=function(){F.st=b.getAttribute("data-st");tampil();};});
    var qi=box.querySelector("#omq");qi.oninput=function(){F.q=this.value;var p=this.selectionStart;tampil();var n=box.querySelector("#omq");n.focus();try{n.setSelectionRange(p,p);}catch(e){}};
    box.querySelectorAll("[data-gi]").forEach(function(c){var g=list[Number(c.getAttribute("data-gi"))];
      c.querySelector("[data-pesan]").onclick=function(){formPesan(c,g);};c.querySelector("[data-terima]").onclick=function(){formTerima(c,g);};});
  }
  function kartu(g,gi){
    return '<div class="card" data-gi="'+gi+'"><b>'+esc(g.ppbj)+'</b> '+bd(g.status)+' <small>'+esc(g.proyek||"")+' &middot; prioritas '+esc(g.prio)+' &middot; '+esc(g.statusProyek)+'</small><div class="note">'+g.nLengkap+' dari '+g.n+' barang ORDER sudah lengkap'+(g.pembelian.length?' &middot; pembelian: '+g.pembelian.map(function(p){return esc(p.nomor)+(p.po?" (PO "+esc(p.po)+")":"");}).join(", "):"")+'</div>'+
      '<table><thead><tr><th>Barang</th><th class="nm">Kebutuhan RAB</th><th class="nm">Dipesan</th><th class="nm">Diterima</th><th>Status</th></tr></thead><tbody>'+g.items.map(function(i){return '<tr><td data-l="Barang"><b>'+esc(i.nama)+'</b><small>'+esc(i.kode)+' &middot; '+esc(i.satuan||"")+'</small></td><td class="nm" data-l="RAB">'+fq(i.rab)+'</td><td class="nm" data-l="Dipesan">'+fq(i.dipesan)+'</td><td class="nm" data-l="Diterima">'+fq(i.diterima)+(i.diterima>i.rab+0.0005?' <small>(lebih '+fq(i.diterima-i.rab)+')</small>':"")+'</td><td data-l="Status">'+bd(i.status)+'</td></tr>';}).join("")+'</tbody></table>'+
      '<div class="bar"><button class="sv" data-pesan="1">Buat pembelian (dipesan)</button><button class="gh" data-terima="1">Terima barang</button></div><div class="omf"></div></div>';
  }
  function formPesan(c,g){
    var f=c.querySelector(".omf"),pil=g.items.filter(function(i){return i.sisaPesan>0;});
    if(!pil.length){f.innerHTML='<div class="note">Semua barang ORDER di PPBJ ini sudah dipesan.</div>';return;}
    var tgl=new Date().toISOString().slice(0,10);
    f.innerHTML='<div class="note"><b>Buat pembelian</b>. Centang barang yang dipesan, isi jumlah dan harga. Harga awal diambil dari harga anggaran PPBJ.</div>'+
      '<table><thead><tr><th></th><th>Barang</th><th class="nm">Jumlah</th><th class="nm">Harga satuan</th></tr></thead><tbody>'+pil.map(function(i,k){return '<tr><td><input type="checkbox" data-pk="'+k+'" checked></td><td data-l="Barang">'+esc(i.nama)+'<small>'+esc(i.kode)+'</small></td><td class="nm"><input data-pq="'+k+'" value="'+i.sisaPesan+'" inputmode="decimal" style="width:80px"></td><td class="nm"><input data-ph="'+k+'" value="'+(i.harga==null?"":i.harga)+'" inputmode="decimal" style="width:110px"></td></tr>';}).join("")+'</tbody></table>'+
      '<div class="fr"><input id="oms" placeholder="Supplier (wajib)" style="flex:1;min-width:160px"><input id="omp" placeholder="No PO (wajib kecuali sudah datang)" style="flex:1;min-width:160px"><input id="omt" type="date" value="'+tgl+'"></div>'+
      '<label class="fl" style="align-items:flex-start"><input type="checkbox" id="oml"> <span><b>PPBJ lama: barang ini sudah datang dan stoknya sudah tercatat.</b> Dicatat lengkap TANPA menambah stok.</span></label>'+
      '<div class="bar"><button class="sv" id="omgo">Simpan pembelian</button><button class="gh" id="omx">Batal</button></div>';
    f.querySelector("#omx").onclick=function(){f.innerHTML="";};
    f.querySelector("#omgo").onclick=async function(){
      var items=[];f.querySelectorAll("[data-pk]").forEach(function(ck){if(!ck.checked)return;var k=ck.getAttribute("data-pk"),i=pil[Number(k)];items.push({kode:i.kode,qty:num(f.querySelector('[data-pq="'+k+'"]').value),harga:f.querySelector('[data-ph="'+k+'"]').value});});
      var sudah=f.querySelector("#oml").checked;
      if(!items.length){toast0("Centang minimal satu barang.",true);return;}
      if(!f.querySelector("#oms").value.trim()){toast0("Isi supplier.",true);return;}
      if(!sudah&&!f.querySelector("#omp").value.trim()){toast0("Isi No PO. (Untuk PPBJ lama yang sudah datang, centang pilihan di bawahnya.)",true);return;}
      if(!confirm(sudah?"Catat pembelian ini sebagai SUDAH DATANG tanpa menambah stok?":"Simpan pembelian untuk "+items.length+" barang?"))return;
      this.disabled=true;var r=await api0({action:"adminOrderBuat",ppbj:g.ppbj,items:items,supplier:f.querySelector("#oms").value,po:f.querySelector("#omp").value,tgl:f.querySelector("#omt").value,sudahDatang:sudah});
      this.disabled=false;toast0(r.msg||(r.ok?"Tersimpan.":"Gagal."),!r.ok);if(r.ok)muat();};
  }
  function formTerima(c,g){
    var f=c.querySelector(".omf"),pil=g.items.filter(function(i){return i.sisaTerima>0;});
    if(!pil.length){f.innerHTML='<div class="note">Belum ada barang yang menunggu diterima. Buat pembelian (dengan No PO) dulu.</div>';return;}
    f.innerHTML='<div class="note"><b>Terima barang</b>. Isi jumlah yang benar-benar datang hari ini (boleh sebagian). Stok bertambah sesuai isian. Lampirkan foto surat jalan.</div>'+
      '<table><thead><tr><th>Barang</th><th class="nm">Menunggu</th><th class="nm">Diterima sekarang</th></tr></thead><tbody>'+pil.map(function(i,k){return '<tr><td data-l="Barang">'+esc(i.nama)+'<small>'+esc(i.kode)+'</small></td><td class="nm" data-l="Menunggu">'+fq(i.sisaTerima)+'</td><td class="nm"><input data-tq="'+k+'" inputmode="decimal" placeholder="0" style="width:90px"> <a href="#" data-all="'+k+'">semua</a></td></tr>';}).join("")+'</tbody></table>'+
      '<div class="fr"><label class="gh" style="padding:9px 13px;border:1px solid var(--line);border-radius:8px;cursor:pointer">Pilih foto / PDF surat jalan<input type="file" id="omf" multiple accept="image/*,application/pdf" style="display:none"></label>'+
      '<label class="gh" style="padding:9px 13px;border:1px solid var(--line);border-radius:8px;cursor:pointer">Ambil foto (kamera HP)<input type="file" id="omc" accept="image/*" capture="environment" style="display:none"></label><span class="note" id="omn"></span></div>'+
      '<input id="omk" placeholder="Catatan penerimaan (opsional)" style="width:100%"><div class="bar"><button class="sv" id="omgo2">Konfirmasi diterima fisik</button><button class="gh" id="omx2">Batal</button></div>';
    var FILES=[];function ff(){var n=f.querySelector("#omn");n.textContent=FILES.length+" file dipilih";}
    f.querySelector("#omf").onchange=function(){FILES=FILES.concat(Array.prototype.slice.call(this.files));ff();};
    f.querySelector("#omc").onchange=function(){FILES=FILES.concat(Array.prototype.slice.call(this.files));ff();};
    f.querySelectorAll("[data-all]").forEach(function(a){a.onclick=function(e){e.preventDefault();var k=a.getAttribute("data-all");f.querySelector('[data-tq="'+k+'"]').value=String(pil[Number(k)].sisaTerima).replace(".",",");};});
    f.querySelector("#omx2").onclick=function(){f.innerHTML="";};
    f.querySelector("#omgo2").onclick=async function(){
      var items=[];f.querySelectorAll("[data-tq]").forEach(function(e){var q=num(e.value);if(q>0)items.push({kode:pil[Number(e.getAttribute("data-tq"))].kode,qty:q});});
      if(!items.length){toast0("Isi jumlah yang diterima minimal untuk satu barang.",true);return;}
      if(!confirm("Konfirmasi "+items.length+" barang diterima fisik? Stok akan bertambah."))return;
      this.disabled=true;
      try{
        var fl=FILES.length?await siapFile(FILES):[],p={action:"adminOrderTerima",ppbj:g.ppbj,items:items,catatan:f.querySelector("#omk").value,files:fl},r=await api0(p);
        if(!r.ok&&r.lebih){if(confirm(r.lebih.map(function(z){return z.kode+" lebih "+fq(z.lebih);}).join("\n")+"\n\nJumlah melebihi pesanan. Tetap terima? Selisih akan dicatat.")){p.izinLebih=true;r=await api0(p);}else{this.disabled=false;return;}}
        toast0(r.msg||(r.ok?"Tersimpan.":"Gagal."),!r.ok);if(r.ok)muat();
      }catch(e){toast0(e.message||"Gagal.",true);}
      this.disabled=false;};
  }
  async function muat(){
    box.innerHTML='<div class="card msg">Memuat monitor ORDER...</div>';
    var r=await api0({action:"adminOrderList"});if(!r.ok){toast0(r.msg||"Gagal.",true);if(back)back();return;}
    D=r.data||[];tampil();
  }
  function buka(el,api,toast,kembali){box=el;api0=api;toast0=toast;back=kembali;muat();}
  return {buka:buka};
})();
