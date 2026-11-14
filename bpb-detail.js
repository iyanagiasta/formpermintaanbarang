/* Tambahan 79: Detail barang BPB di tab Pantauan BPB (admin).
   Lihat nama barang + jumlah, salin daftar, ubah jumlah, ganti barang, tambah barang, urungkan. Memakai api(), toast(), esc(), load() milik admin.html (dan IDX bila ada). */
var BPBD=(function(){
  var ST=null;
  function modal(html){var o=document.getElementById("bpbmod");if(!o){o=document.createElement("div");o.id="bpbmod";o.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:10px";document.body.appendChild(o);}o.innerHTML='<div class="card" style="max-width:820px;width:100%;max-height:92vh;overflow:auto;margin:0">'+html+'</div>';return o;}
  function tutup(){var o=document.getElementById("bpbmod");if(o)o.remove();ST=null;}
  function num(v){var n=parseFloat(String(v).replace(",","."));return isFinite(n)&&n>0?n:0;}
  function fmt(n){return String(Math.round(Number(n)*1000)/1000).replace(".",",");}
  function salinTeks(){
    var t="BPB "+ST.doc+"\n";
    ST.items.forEach(function(it,i){t+=(i+1)+". "+(it.gantiKe?it.gantiKe.nama:it.nama)+" - "+fmt(it.qtyBaru!=null?it.qtyBaru:it.qty)+" "+(it.gantiKe?it.gantiKe.satuan:it.satuan||"")+"\n";});
    ST.baru.forEach(function(b,i){t+=(ST.items.length+i+1)+". "+b.nama+" - "+fmt(b.qty)+" "+(b.satuan||"")+"\n";});
    return t.trim();
  }
  function salin(){
    var t=salinTeks();
    function fb(){var a=document.createElement("textarea");a.value=t;a.style.cssText="position:fixed;left:-9999px";document.body.appendChild(a);a.select();try{document.execCommand("copy");toast("Daftar barang disalin.");}catch(e){toast("Gagal menyalin. Salin manual dari kotak.",true);}a.remove();}
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(function(){toast("Daftar barang disalin.");},fb);else fb();
  }
  function adaUbah(){return ST.items.some(function(it){return it.gantiKe||(it.qtyBaru!=null&&it.qtyBaru!==it.qty);})||ST.baru.length>0;}
  function gambar(){
    var o=document.getElementById("bpbmod");if(!o||!ST)return;
    var edit=ST.bisaUbah;
    var rows=ST.items.map(function(it,i){
      var nm=it.gantiKe?it.gantiKe.nama:it.nama,kd=it.gantiKe?it.gantiKe.kode:it.kode,sat=it.gantiKe?it.gantiKe.satuan:it.satuan;
      var q=it.qtyBaru!=null?it.qtyBaru:it.qty;
      var aksi=edit?'<button class="gh" data-bg="'+i+'">Ganti barang</button>'+(it.gantiKe?' <button class="gh" data-bb="'+i+'">Batal ganti</button>':''):"";
      return '<tr><td data-l="Barang"><b>'+(i+1)+'. '+esc(nm)+'</b> <small>'+esc(kd)+'</small>'+(it.gantiKe?'<br><small>semula: '+esc(it.nama)+'</small>':'')+(ST.mode==="serah"&&it.diminta!=null&&it.diminta!==it.qty?'<br><small>diminta: '+fmt(it.diminta)+'</small>':'')+(it.meter&&window.SERI?SERI.baris(it):'')+'</td>'+
        '<td data-l="Jumlah">'+(edit?'<input type="number" min="0" step="any" inputmode="decimal" data-bq="'+i+'" value="'+esc(String(q))+'" style="width:84px"> ':'<b>'+esc(fmt(q))+'</b> ')+esc(sat||"")+'</td><td data-l="">'+aksi+'</td></tr>';
    }).join("");
    var baru=ST.baru.map(function(b,i){
      return '<tr><td data-l="Barang"><b>'+(ST.items.length+i+1)+'. '+esc(b.nama)+'</b> <small>'+esc(b.kode)+'</small> <span class="bd d">baru</span></td><td data-l="Jumlah"><input type="number" min="0" step="any" inputmode="decimal" data-bn="'+i+'" value="'+esc(String(b.qty))+'" style="width:84px"> '+esc(b.satuan||"")+'</td><td data-l=""><button class="gh" data-bh="'+i+'">Hapus</button></td></tr>';
    }).join("");
    var rw=(ST.riwayat||[]).map(function(h,i){return '<tr><td data-l="Waktu">'+esc(h.waktu)+'</td><td data-l="Oleh">'+esc(h.oleh)+'</td><td data-l="Perubahan">'+esc(h.ring||"")+(h.alasan?'<br><small>'+esc(h.alasan)+'</small>':'')+'</td><td data-l="Status">'+esc(h.status)+(edit&&h.status==="Aktif"&&i===ST.riwayat.findIndex(function(z){return z.status==="Aktif";})?' <button class="gh" data-bu="'+esc(h.id)+'">Urungkan</button>':'')+'</td></tr>';}).join("");
    o.firstChild.innerHTML='<b>Detail barang BPB '+esc(ST.doc)+'</b> <small>'+esc(ST.status||"")+'</small>'+
      (ST.mode==="serah"?'<div class="note" style="border-left:3px solid var(--ambt,#b8760a);padding-left:8px">Sudah diserahkan: perubahan menyesuaikan stok dan Mutasi, dan dokumennya di tab Accurate kembali ke Belum.</div>':'')+
      (!edit?'<div class="note err">'+esc(ST.alasanTutup||"Tidak bisa diubah.")+'</div>':'<div class="note">Ubah jumlah, ganti, atau tambah barang lalu Simpan. Stok ikut otomatis, PDF dan link cetak memakai isi terbaru. Riwayat di sheet.</div>')+
      '<div class="tw"><table><thead><tr><th>Nama barang</th><th>Jumlah</th><th></th></tr></thead><tbody>'+rows+baru+'</tbody></table></div>'+
      (ST.items.some(function(it){return it.meter;})&&window.SERI?'<div style="margin-top:6px"><button type="button" class="gh" id="bpb-seri">'+(ST.seriKurang>0?'Lengkapi no seri meter air':'Ubah no seri meter air')+'</button></div>':'')+
      (edit?'<div style="margin-top:8px"><input type="text" id="bpb-q" placeholder="Tambah / ganti barang: cari kode atau nama..." style="width:100%"><div id="bpb-h" class="note"></div></div>':'')+
      (edit?'<div style="margin-top:6px"><input type="text" id="bpb-al" placeholder="Alasan (boleh kosong)" maxlength="200" style="width:100%"></div>':'')+
      '<div class="bar"><button class="gh" id="bpb-x">Tutup</button><button class="gh" id="bpb-s">Salin daftar</button>'+(edit?'<button class="sv" id="bpb-ok">Simpan perubahan</button>':'')+'</div>'+
      (rw?'<details style="margin-top:10px"><summary><b>Riwayat perubahan ('+ST.riwayat.length+')</b></summary><div class="tw"><table><thead><tr><th>Waktu</th><th>Oleh</th><th>Perubahan</th><th>Status</th></tr></thead><tbody>'+rw+'</tbody></table></div></details>':'');
    o.querySelector("#bpb-x").onclick=tutup;o.querySelector("#bpb-s").onclick=salin;
    var bsr=o.querySelector("#bpb-seri");if(bsr)bsr.onclick=function(){var id=ST.id;SERI.edit(api,id,{toast:toast,selesai:function(){muat(id);}});};
    if(!edit)return;
    o.querySelector("#bpb-ok").onclick=simpan;
    o.querySelectorAll("[data-bq]").forEach(function(e){e.oninput=function(){var it=ST.items[Number(e.getAttribute("data-bq"))],v=num(e.value);it.qtyBaru=v;};});
    o.querySelectorAll("[data-bn]").forEach(function(e){e.oninput=function(){ST.baru[Number(e.getAttribute("data-bn"))].qty=num(e.value);};});
    o.querySelectorAll("[data-bh]").forEach(function(b){b.onclick=function(){ST.baru.splice(Number(b.getAttribute("data-bh")),1);gambar();};});
    o.querySelectorAll("[data-bg]").forEach(function(b){b.onclick=function(){ST.ganti=Number(b.getAttribute("data-bg"));var q=o.querySelector("#bpb-q");q.placeholder="Ganti "+ST.items[ST.ganti].nama+" dengan: cari kode atau nama...";q.focus();toast("Cari barang pengganti di kotak pencarian.");};});
    o.querySelectorAll("[data-bb]").forEach(function(b){b.onclick=function(){ST.items[Number(b.getAttribute("data-bb"))].gantiKe=null;gambar();};});
    o.querySelectorAll("[data-bu]").forEach(function(b){b.onclick=function(){urungkan(b.getAttribute("data-bu"));};});
    var tm=null;o.querySelector("#bpb-q").oninput=function(){var v=this.value;clearTimeout(tm);tm=setTimeout(function(){cari(v);},(window.IDX&&IDX.ada()?80:250));};
  }
  async function cari(v){
    var o=document.getElementById("bpbmod");if(!o||!ST)return;var h=o.querySelector("#bpb-h");if(!h)return;if(!v.trim()){h.innerHTML="";return;}
    var r;
    if(window.IDX&&await IDX.siap()&&IDX.ada()){var cr=IDX.cari(v,{maks:12});r={ok:true,data:cr.hasil.map(function(b){return {kode:b.kode,nama:b.nama,satuan:b.satuan};})};}
    else r=await api({action:"adminBarangCari",q:v});
    if(!r.ok){h.textContent=r.msg||"Gagal.";return;}
    var ganti=ST.ganti!=null;
    h.innerHTML=(r.data||[]).map(function(b,i){return '<div><button class="gh" data-pb="'+i+'">'+(ganti?"Ganti dengan: ":"Tambah: ")+esc(b.nama)+' <small>'+esc(b.kode)+' · '+esc(b.satuan||"")+'</small></button></div>';}).join("")||"Tidak ada.";
    h.querySelectorAll("[data-pb]").forEach(function(bt){bt.onclick=function(){
      var b=r.data[Number(bt.getAttribute("data-pb"))];
      if(ST.ganti!=null){var it=ST.items[ST.ganti];ST.ganti=null;it.gantiKe={kode:b.kode,nama:b.nama,satuan:b.satuan||""};}
      else ST.baru.push({kode:b.kode,nama:b.nama,satuan:b.satuan||"",qty:1});
      gambar();
    };});
  }
  function badan(){
    var ubah=[],ganti=[],tambah=[];
    ST.items.forEach(function(it){
      if(it.gantiKe){var g={no:it.no,kode:it.gantiKe.kode};if(it.qtyBaru!=null&&it.qtyBaru!==it.qty)g.qty=it.qtyBaru;ganti.push(g);}
      else if(it.qtyBaru!=null&&it.qtyBaru!==it.qty)ubah.push({no:it.no,qty:it.qtyBaru});
    });
    ST.baru.forEach(function(b){tambah.push({kode:b.kode,qty:b.qty});});
    return {action:"bpbUbah",id:ST.id,ubah:ubah,ganti:ganti,tambah:tambah,alasan:((document.getElementById("bpb-al")||{}).value||"").trim()};
  }
  async function simpan(){
    if(!adaUbah()){toast("Belum ada perubahan.",true);return;}
    if(ST.items.some(function(it){return it.qtyBaru===0;})||ST.baru.some(function(b){return !(b.qty>0);})){toast("Jumlah harus lebih dari 0.",true);return;}
    var b=document.getElementById("bpb-ok");b.disabled=true;
    var bd=badan(),dry=await api(Object.assign({},bd,{dry:true}));
    if(!dry.ok){b.disabled=false;toast(dry.msg||"Gagal.",true);return;}
    var tx="Simpan perubahan barang BPB "+ST.doc+"?"+(ST.mode==="serah"?" Stok dan Mutasi akan disesuaikan, dokumen di tab Accurate kembali ke Belum.":" Stok tercadang akan mengikuti.");
    if((dry.warn||[]).length)tx+="\n\nPeringatan:\n- "+dry.warn.join("\n- ");
    if(!confirm(tx)){b.disabled=false;return;}
    var r=await api(bd);b.disabled=false;
    if(!r.ok){toast(r.msg||"Gagal.",true);return;}
    toast(r.msg||"Tersimpan.");var id=ST.id;await muat(id);
    try{if(typeof load==="function")load(false);}catch(e){}
  }
  async function urungkan(rid){
    if(!confirm("Urungkan perubahan ini? Barang dan stok dikembalikan seperti sebelum perubahan."))return;
    var r=await api({action:"adminUbahUrungkan",id:rid});
    if(!r.ok){toast(r.msg||"Gagal.",true);return;}
    toast(r.msg||"Diurungkan.");var id=ST.id;await muat(id);
    try{if(typeof load==="function")load(false);}catch(e){}
  }
  async function muat(id){
    var r=await api({action:"bpbDetail",id:id});
    if(!r.ok){toast(r.msg||"Gagal memuat detail.",true);tutup();return;}
    ST={id:r.id,doc:r.doc,status:r.status,mode:r.mode,bisaUbah:r.bisaUbah,alasanTutup:r.alasanTutup,key:r.key,riwayat:r.riwayat||[],baru:[],ganti:null,
        seriKurang:r.seriKurang||0,items:r.items.map(function(x){return {no:x.no,kode:x.kode,nama:x.nama,satuan:x.satuan,qty:x.qty,diminta:x.diminta,qtyBaru:null,gantiKe:null,meter:x.meter,seri:x.seri,seriKurang:x.seriKurang};})};
    modal("");gambar();
  }
  function buka(id){modal("<b>Memuat...</b>");muat(id);}
  return {buka:buka};
})();
