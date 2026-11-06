/* Tambahan 35: ubah jumlah, hapus, dan tambah barang pada dokumen Barang Keluar di tab Accurate.
   Memakai api(), toast(), esc(), PA, loadAccurate() milik admin.html (dan IDX bila ada). */
var PAU=(function(){
  var ST=null;
  function modal(html){var o=document.createElement("div");o.id="paumod";o.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:10px";o.innerHTML='<div class="card" style="max-width:860px;width:100%;max-height:92vh;overflow:auto;background:var(--card,#fff);color:var(--ink,#222);padding:14px">'+html+'</div>';document.body.appendChild(o);return o;}
  function tutup(){var o=document.getElementById("paumod");if(o)o.remove();ST=null;}
  function num(v){var n=parseFloat(String(v).replace(",","."));return isFinite(n)&&n>0?n:0;}
  function inp(i,s,v){return '<input type="number" min="0" step="any" data-pi="'+i+'" data-ps="'+s+'" value="'+(v||"")+'" style="width:78px" inputmode="decimal">';}
  function gambar(){
    var o=document.getElementById("paumod");if(!o)return;
    var rows=ST.items.map(function(it,i){
      var stok=it.stok?'<small>stok: B '+it.stok[0]+' · M '+it.stok[1]+' · A '+it.stok[2]+'</small>':'<small>stok tidak tercatat</small>';
      return '<tr'+(it.hapus?' style="opacity:.45;text-decoration:line-through"':'')+'><td data-l="Barang"><b>'+esc(it.nama)+'</b> <small>'+esc(it.kode)+'</small>'+(it.baru?' <span class="bd d">baru</span>':'')+'<br>'+stok+'</td>'+
        '<td data-l="Bekas">'+inp(i,0,it.q[0])+'</td><td data-l="Moka">'+inp(i,1,it.q[1])+'</td><td data-l="Accurate">'+inp(i,2,it.q[2])+'</td><td data-l="Di luar stok">'+inp(i,3,it.lain)+'</td>'+
        '<td><button class="gh" data-ph="'+i+'">'+(it.hapus?"Batal hapus":"Hapus")+'</button></td></tr>';
    }).join("");
    o.firstChild.innerHTML='<b>Ubah barang keluar '+esc(ST.doc)+'</b>'+
      (ST.status==="Sudah"?'<div class="note" style="border-left:3px solid var(--red,#a82424);padding-left:8px">Dokumen ini sudah ditandai diinput ke Accurate. Setelah disimpan, sesuaikan juga di Accurate.</div>':'')+
      '<div class="note">Stok Bekas/Moka/Accurate dan riwayat Mutasi ikut disesuaikan otomatis. Kolom "Di luar stok" tidak memengaruhi stok.</div>'+
      '<table><thead><tr><th>Barang</th><th>Bekas</th><th>Moka</th><th>Accurate</th><th>Di luar stok</th><th></th></tr></thead><tbody>'+rows+'</tbody></table>'+
      '<div style="margin-top:8px"><input type="text" id="pau-q" placeholder="Tambah barang: cari kode atau nama..." style="width:100%"><div id="pau-h" class="note"></div></div>'+
      '<div class="bar"><button class="gh" id="pau-x">Batal</button><button class="sv" id="pau-ok">Simpan perubahan</button></div>';
    o.querySelectorAll("input[data-pi]").forEach(function(e){e.oninput=function(){var it=ST.items[Number(e.getAttribute("data-pi"))],s=Number(e.getAttribute("data-ps"));var v=num(e.value);if(s===3)it.lain=v;else it.q[s]=v;};});
    o.querySelectorAll("[data-ph]").forEach(function(b){b.onclick=function(){var it=ST.items[Number(b.getAttribute("data-ph"))];if(it.baru){ST.items.splice(Number(b.getAttribute("data-ph")),1);}else it.hapus=!it.hapus;gambar();};});
    o.querySelector("#pau-x").onclick=tutup;o.querySelector("#pau-ok").onclick=simpan;
    var tm=null;o.querySelector("#pau-q").oninput=function(){var v=this.value;clearTimeout(tm);tm=setTimeout(function(){cari(v);},(window.IDX&&IDX.ada()?80:250));};
  }
  async function cari(v){
    var o=document.getElementById("paumod");if(!o)return;var h=o.querySelector("#pau-h");if(!v.trim()){h.innerHTML="";return;}
    var r;
    if(window.IDX&&await IDX.siap()&&IDX.ada()){var cr=IDX.cari(v,{maks:12});r={ok:true,data:cr.hasil.map(function(b){return {kode:b.kode,nama:b.nama,satuan:b.satuan};})};}
    else r=await api({action:"adminBarangCari",q:v});
    if(!r.ok){h.textContent=r.msg||"Gagal.";return;}
    h.innerHTML=(r.data||[]).map(function(b,i){return '<div><button class="gh" data-pb="'+i+'">'+esc(b.nama)+' <small>'+esc(b.kode)+' · '+esc(b.satuan||"")+'</small></button></div>';}).join("")||"Tidak ada.";
    h.querySelectorAll("[data-pb]").forEach(function(bt){bt.onclick=async function(){
      var b=r.data[Number(bt.getAttribute("data-pb"))];
      if(ST.items.some(function(x){return !x.hapus&&String(x.kode).toLowerCase()===String(b.kode).toLowerCase();})&&!confirm("Barang ini sudah ada di dokumen. Tetap tambahkan sebagai baris baru?"))return;
      var sr=await api({action:"adminStokList",q:b.kode,limit:5,hanyaStok:false}),st=null;
      if(sr&&sr.ok)(sr.data||[]).forEach(function(z){if(String(z.kode).toLowerCase()===String(b.kode).toLowerCase())st=z.q;});
      ST.items.push({baru:true,kode:b.kode,nama:b.nama,q:[0,0,0],lain:0,stok:st});gambar();
    };});
  }
  async function simpan(){
    var ubah=[],hapus=[],tambah=[];
    ST.items.forEach(function(it){
      if(it.baru){var tot=it.q[0]+it.q[1]+it.q[2]+it.lain;if(tot>0)tambah.push({kode:it.kode,q:it.q,lain:it.lain});return;}
      if(it.hapus){hapus.push(it.no);return;}
      var sama=it.q[0]===it.asal.q[0]&&it.q[1]===it.asal.q[1]&&it.q[2]===it.asal.q[2]&&it.lain===it.asal.lain;
      if(!sama)ubah.push({no:it.no,q:it.q,lain:it.lain});
    });
    if(ST.items.some(function(it){return it.baru&&(it.q[0]+it.q[1]+it.q[2]+it.lain)<=0;})){toast("Ada barang baru yang jumlahnya masih 0. Isi jumlah atau hapus barisnya.",true);return;}
    if(!ubah.length&&!hapus.length&&!tambah.length){toast("Belum ada perubahan.",true);return;}
    var ada=ST.items.some(function(it){return !it.hapus&&(it.q[0]+it.q[1]+it.q[2]+it.lain)>0;});
    if(!ada){toast("Dokumen harus tetap punya minimal satu barang.",true);return;}
    if(!confirm("Simpan perubahan? Stok dan riwayat Mutasi akan disesuaikan ("+ubah.length+" diubah, "+hapus.length+" dihapus, "+tambah.length+" ditambah)."))return;
    var b=document.getElementById("pau-ok");b.disabled=true;
    var al=prompt("Alasan perubahan barang (wajib, tercatat di riwayat perubahan):","");if(!al||!al.trim()){b.disabled=false;toast("Alasan wajib diisi.",true);return;}
    var r=await api({action:"adminUbahSimpan",key:ST.key,ubah:ubah,hapus:hapus,tambah:tambah,alasan:al.trim()});b.disabled=false;
    if(!r.ok){toast(r.msg||"Gagal.",true);return;}
    tutup();toast(r.msg+((r.warn&&r.warn.length)?" Perhatian: "+r.warn.join(" "):""));if(window.loadAccurate)loadAccurate();
  }
  async function buka(key){
    var r=await api({action:"adminPaKeluarRinci",key:key});
    if(!r.ok){toast(r.msg||"Gagal.",true);return;}
    ST={key:key,doc:r.doc,status:r.status,items:r.items.map(function(x){return {no:x.no,kode:x.kode,nama:x.nama,q:x.q.slice(),lain:x.lain||0,stok:x.stok,asal:{q:x.q.slice(),lain:x.lain||0}};})};
    modal("");gambar();
  }
  function pasang(){
    document.querySelectorAll("[data-pk]").forEach(function(c){
      var k=c.getAttribute("data-pk");if(!/^KELUAR\|/.test(k))return;
      var td=c.closest("tr").querySelector("[data-l=Dokumen]");if(!td||td.querySelector("[data-pau]"))return;
      td.insertAdjacentHTML("beforeend",'<div><button class="gh" data-pau="'+esc(k)+'" style="margin-top:4px">Ubah barang</button></div>');
    });
    document.querySelectorAll("[data-pau]").forEach(function(b){b.onclick=function(){buka(b.getAttribute("data-pau"));};});
  }
  return {pasang:pasang,buka:buka};
})();
