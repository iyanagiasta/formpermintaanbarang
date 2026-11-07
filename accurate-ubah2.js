/* Tambahan 45: ubah detail dokumen di tab Accurate (keterangan + barang) dengan pratinjau dampak, alasan, riwayat, urungkan.
   Berlaku: Penerimaan (TB-...), Pengembalian Masuk, Barang Keluar (barang lewat PAU). Selisih Opname tidak. Hanya admin.
   Memakai api(), toast(), esc(), loadAccurate(), IDX milik halaman admin. */
var PAU2=(function(){
  "use strict";
  var ST=null,hanya=false;
  function $(i){return document.getElementById(i);}
  function num(v){var n=parseFloat(String(v==null?"":v).replace(",","."));return isFinite(n)&&n>0?n:0;}
  function modal(html){var old=$("pau2mod");if(old)old.remove();var o=document.createElement("div");o.id="pau2mod";o.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9998;display:flex;align-items:flex-start;justify-content:center;padding:10px;overflow:auto";o.innerHTML='<div class="card" style="max-width:900px;width:100%;margin:auto;background:var(--card,#fff);color:var(--ink,#222);padding:14px">'+html+'</div>';document.body.appendChild(o);return o;}
  function tutup(){var o=$("pau2mod");if(o)o.remove();ST=null;}
  function dis(k){return /^KELUAR\|/.test(k)||/^KEMBALI\|/.test(k)||/^TERIMA\|TB-/.test(k);}
  /* ===== tombol di baris + bilah atas ===== */
  function pasang(){
    var pane=document.getElementById("pane");if(!pane)return;
    pane.querySelectorAll("[data-pk],[data-tk]").forEach(function(c){
      var k=c.getAttribute("data-pk")||c.getAttribute("data-tk");if(!dis(k))return;
      var tr=c.closest("tr");if(!tr||tr.querySelector("[data-pu2]"))return;
      var td=tr.querySelector("[data-l=Dokumen]")||tr.querySelector("[data-l=Penerimaan]");if(!td)return;
      td.insertAdjacentHTML("beforeend",'<div><button class="gh" data-pu2="'+esc(k)+'" style="margin-top:4px">Ubah detail</button></div>');
    });
    pane.querySelectorAll("[data-pu2]").forEach(function(b){b.onclick=function(){buka(b.getAttribute("data-pu2"));};});
    pane.querySelectorAll("td small").forEach(function(s){if(/^DIUBAH/.test(s.textContent)&&!s.getAttribute("data-dub")){s.setAttribute("data-dub","1");s.style.cssText="color:#b45309;font-weight:700";s.textContent="⚠ "+s.textContent+" · sesuaikan ulang di Accurate";}});
    if(!$("pau2bar")){
      var bar=document.createElement("div");bar.className="bar";bar.id="pau2bar";
      bar.innerHTML='<label class="fl"><input type="checkbox" id="paudf"'+(hanya?" checked":"")+'> Hanya yang diubah setelah diinput (perlu disesuaikan ulang)</label><button class="gh" id="pau2b">Ubah No PPBJ yang dipilih</button><button class="gh" id="pau2x">Unduh riwayat perubahan (Excel)</button>';
      var ref=$("pasub");if(ref&&ref.parentNode===pane)ref.insertAdjacentElement("afterend",bar);else pane.insertAdjacentElement("afterbegin",bar);
      $("paudf").onchange=function(){hanya=this.checked;saring();};$("pau2b").onclick=banyak;$("pau2x").onclick=excelRiwayat;
    }
    saring();
  }
  function saring(){
    var pane=document.getElementById("pane");if(!pane)return;
    pane.querySelectorAll("tbody tr").forEach(function(tr){var d=!!tr.querySelector("small[data-dub]");tr.style.display=(hanya&&!d)?"none":"";});
  }
  function terpilih(){var out=[];document.querySelectorAll("#pane [data-pk]:checked,#pane [data-tk]:checked").forEach(function(c){var k=c.getAttribute("data-pk")||c.getAttribute("data-tk");if(dis(k))out.push(k);});return out;}
  /* ===== dialog utama ===== */
  async function buka(key){
    var r=await api({action:"adminUbahRinci",key:key});
    if(!r.ok){toast(r.msg||"Gagal.",true);return;}
    ST={key:key,r:r,ket:Object.assign({},r.ket),items:null,pratinjau:false,alasan:""};
    if(r.items)ST.items=r.items.map(function(x){return Object.assign({asal:Object.assign({},x)},x);});
    gambar();
  }
  function dlProyek(){return '<datalist id="pu2dl">'+(ST.r.proyek||[]).map(function(p){return '<option value="'+esc(p.ppbj)+'">'+esc(p.ket||"")+'</option>';}).join("")+'</datalist>';}
  function namaProyek(pp){var v=(ST.r.proyek||[]).filter(function(p){return p.ppbj===String(pp||"").trim();})[0];return v?v.ket:"";}
  function judul(){var j=ST.r.jenis;return j==="TERIMA"?"penerimaan":j==="KEMBALI"?"pengembalian":"barang keluar";}
  function gambar(){
    var r=ST.r,k=ST.ket,j=r.jenis,h='<div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b>Ubah detail '+judul()+' '+esc(r.doc)+'</b><button class="gh" id="pu2x">Tutup</button></div>';
    h+='<div class="note">Status Accurate: <b>'+esc(r.status)+'</b>'+(r.noTrans?' ('+esc(r.noTrans)+')':"")+'</div>';
    if(r.status==="Sudah")h+='<div class="note" style="border-left:3px solid #b45309;padding-left:8px">Dokumen ini sudah ditandai diinput ke Accurate. Setelah disimpan statusnya kembali ke <b>Belum</b> dengan penanda “diubah setelah diinput”; sesuaikan ulang transaksinya di Accurate.</div>';
    h+='<div class="note"><b>Keterangan</b></div><div class="bar">';
    if(j==="TERIMA")h+='<label class="fl">No PPBJ <input id="pu2p" list="pu2dl" value="'+esc(k.ppbj)+'" placeholder="kosongkan bila tanpa PPBJ"></label><label class="fl">Proyek (bila PPBJ tidak ada) <input id="pu2n" value="'+esc(k.proyek)+'"></label><label class="fl">No PO <input id="pu2po" value="'+esc(k.po)+'"></label><label class="fl">Tanggal <input type="date" id="pu2t" value="'+esc(k.tgl)+'"></label><label class="fl">Catatan <input id="pu2c" value="'+esc(k.cat)+'" maxlength="200"></label>';
    else h+='<label class="fl">'+(j==="KEMBALI"?"No PPBJ / nama proyek":"No PPBJ")+' <input id="pu2p" list="pu2dl" value="'+esc(k.ppbj)+'" style="min-width:260px"></label>';
    h+='</div>'+dlProyek()+'<div class="note" id="pu2inf"></div>';
    if(j==="TERIMA")h+=barangTerima();else if(j==="KEMBALI")h+=barangKembali();
    else h+='<div class="note"><b>Barang</b></div><div class="bar"><button class="gh" id="pu2kel">Ubah barang keluar…</button><span class="note">Membuka layar ubah jumlah/hapus/tambah barang per sumber stok (Bekas, Moka, Accurate).</span></div>';
    h+='<label class="fl" style="display:block;margin-top:8px">Alasan perubahan <b>(wajib untuk perubahan barang)</b><input id="pu2a" maxlength="200" value="'+esc(ST.alasan)+'" style="width:100%" placeholder="mis. salah hitung, surat jalan menyusul"></label>';
    h+='<div id="pu2pv"></div><div class="bar"><button class="gh" id="pu2b1">Batal</button><button class="sv" id="pu2ok">Periksa dampak</button></div>';
    h+=riwayat();
    var o=modal(h);bind(o);info();
  }
  function barangTerima(){
    var rows=ST.items.map(function(x,i){return '<tr'+(x.hapus?' style="opacity:.45;text-decoration:line-through"':'')+'><td><b>'+esc(x.nama)+'</b> <small>'+esc(x.kode||"belum terdaftar")+' · '+esc(x.satuan||"")+'</small>'+(x.baru?' <span class="bd d">baru</span>':'')+'</td><td><input type="number" min="0" step="any" data-i="'+i+'" data-f="qty" value="'+esc(x.qty)+'" style="width:90px"></td><td><input type="number" min="0" step="any" data-i="'+i+'" data-f="harga" value="'+esc(x.harga==null?"":x.harga)+'" style="width:100px" placeholder="harga (ops.)"></td><td><button class="gh" data-ganti="'+i+'">Ganti barang</button> <button class="gh" data-hapus="'+i+'">'+(x.hapus?"Batal hapus":"Hapus")+'</button></td></tr>';}).join("");
    return '<div class="note" style="margin-top:8px"><b>Barang yang diterima</b> (stok Accurate ikut disesuaikan)</div><table><thead><tr><th>Barang</th><th>Jumlah</th><th>Harga</th><th></th></tr></thead><tbody>'+rows+'</tbody></table><div class="bar"><input id="pu2q" placeholder="Tambah / ganti barang: cari kode atau nama..." style="flex:1;min-width:220px"><button class="gh" id="pu2bebas">+ Barang belum terdaftar</button></div><div id="pu2h" class="note"></div>';
  }
  function barangKembali(){
    var rows=ST.items.map(function(x,i){return '<tr><td><b>'+esc(x.nama)+'</b> <small>'+esc(x.kode)+' · '+esc(x.satuan||"")+'</small></td><td>'+x.jumlah+'</td><td><input type="number" min="0" max="'+x.jumlah+'" step="any" data-i="'+i+'" data-f="jt" value="'+esc(x.jt)+'" style="width:90px"></td></tr>';}).join("");
    return '<div class="note" style="margin-top:8px"><b>Jumlah diterima gudang</b> (stok Accurate ikut disesuaikan; tidak boleh melebihi yang diajukan)</div><table><thead><tr><th>Barang</th><th>Diajukan</th><th>Diterima</th></tr></thead><tbody>'+rows+'</tbody></table>';
  }
  function riwayat(){
    var L=ST.r.riwayat||[];if(!L.length)return "";
    return '<div class="note" style="margin-top:10px"><b>Riwayat perubahan dokumen ini</b></div><table><thead><tr><th>Waktu</th><th>Oleh</th><th>Perubahan</th><th></th></tr></thead><tbody>'+L.map(function(x){return '<tr><td>'+esc(x.waktu)+'</td><td>'+esc(x.oleh)+'</td><td><b>'+esc(x.bagian)+'</b><small>'+esc(x.ring)+(x.alasan?' · alasan: '+esc(x.alasan):"")+'</small></td><td>'+(x.status==="Aktif"?'<button class="gh" data-urung="'+esc(x.id)+'">Urungkan</button>':'<small>'+esc(x.status)+'</small>')+'</td></tr>';}).join("")+'</tbody></table>';
  }
  function info(){var e=$("pu2inf"),p=$("pu2p");if(!e||!p)return;var n=namaProyek(p.value);e.textContent=n?"Proyek: "+n:(String(p.value).trim()?"No PPBJ ini belum terdaftar di sheet Proyek (nama proyek dan PIC tidak terbaca otomatis).":"");}
  function bind(o){
    var tt=function(){ST.pratinjau=false;var pv=$("pu2pv");if(pv)pv.innerHTML="";$("pu2ok").textContent="Periksa dampak";};
    $("pu2x").onclick=tutup;$("pu2b1").onclick=tutup;
    ["pu2p","pu2n","pu2po","pu2t","pu2c","pu2a"].forEach(function(id){var e=$(id);if(e)e.oninput=function(){ if(id==="pu2p")info();if(id==="pu2a")ST.alasan=e.value;tt();};});
    o.querySelectorAll("input[data-f]").forEach(function(e){e.oninput=function(){var x=ST.items[Number(e.getAttribute("data-i"))],f=e.getAttribute("data-f");x[f]=e.value===""?"":Number(e.value);tt();};});
    o.querySelectorAll("[data-hapus]").forEach(function(b){b.onclick=function(){var i=Number(b.getAttribute("data-hapus")),x=ST.items[i];if(x.baru)ST.items.splice(i,1);else x.hapus=!x.hapus;keep();gambar();};});
    o.querySelectorAll("[data-ganti]").forEach(function(b){b.onclick=function(){ST.ganti=Number(b.getAttribute("data-ganti"));toast("Cari barang pengganti di kotak cari, lalu klik hasilnya.");var q=$("pu2q");if(q)q.focus();};});
    o.querySelectorAll("[data-urung]").forEach(function(b){b.onclick=function(){urungkan(b.getAttribute("data-urung"));};});
    var q=$("pu2q");if(q){var tm=null;q.oninput=function(){var v=this.value;clearTimeout(tm);tm=setTimeout(function(){cari(v);},(window.IDX&&IDX.ada&&IDX.ada()?80:250));};}
    var bb=$("pu2bebas");if(bb)bb.onclick=function(){keep();ST.items.push({kode:"",nama:"Barang baru",satuan:"",qty:"",harga:"",baru:true,bebas:true});gambar();};
    var kb=$("pu2kel");if(kb)kb.onclick=function(){var key=ST.key;tutup();if(window.PAU)PAU.buka(key);};
    $("pu2ok").onclick=lanjut;
  }
  function keep(){ST.alasan=($("pu2a")||{value:ST.alasan}).value;bacaKet();}
  function bacaKet(){var g=function(i){var e=$(i);return e?e.value:undefined;};var k=ST.ket;var v=g("pu2p");if(v!==undefined)k.ppbj=v;v=g("pu2n");if(v!==undefined)k.proyek=v;v=g("pu2po");if(v!==undefined)k.po=v;v=g("pu2t");if(v!==undefined)k.tgl=v;v=g("pu2c");if(v!==undefined)k.cat=v;}
  async function cari(v){
    var h=$("pu2h");if(!h)return;if(!String(v).trim()){h.innerHTML="";return;}
    var r;
    if(window.IDX&&await IDX.siap()&&IDX.ada()){var cr=IDX.cari(v,{maks:12});r={ok:true,data:cr.hasil.map(function(b){return {kode:b.kode,nama:b.nama,satuan:b.satuan};})};}
    else r=await api({action:"adminBarangCari",q:v});
    if(!r.ok){h.textContent=r.msg||"Gagal.";return;}
    h.innerHTML=(r.data||[]).map(function(b,i){return '<div><button class="gh" data-pb="'+i+'">'+esc(b.nama)+' <small>'+esc(b.kode)+' · '+esc(b.satuan||"")+'</small></button></div>';}).join("")||"Tidak ada.";
    h.querySelectorAll("[data-pb]").forEach(function(bt){bt.onclick=function(){
      var b=r.data[Number(bt.getAttribute("data-pb"))];keep();
      if(ST.ganti!=null&&ST.items[ST.ganti]){var x=ST.items[ST.ganti];x.kode=b.kode;x.nama=b.nama;x.satuan=b.satuan||"";x.daftar=false;x.bebas=false;ST.ganti=null;}
      else ST.items.push({kode:b.kode,nama:b.nama,satuan:b.satuan||"",qty:"",harga:"",baru:true});
      gambar();};});
  }
  /* ===== kirim ===== */
  function muatKirim(dry){
    keep();var j=ST.r.jenis,p={action:"adminUbahSimpan",key:ST.key,alasan:ST.alasan.trim(),dry:!!dry},k=ST.ket,a=ST.r.ket;
    var ket={};if(String(k.ppbj||"")!==String(a.ppbj||""))ket.ppbj=k.ppbj;
    if(j==="TERIMA"){if(k.proyek!==a.proyek)ket.proyek=k.proyek;if(k.po!==a.po)ket.po=k.po;if(k.tgl!==a.tgl)ket.tgl=k.tgl;if(k.cat!==a.cat)ket.cat=k.cat;
      var its=ST.items.filter(function(x){return !x.hapus;}),ubah=ST.items.some(function(x){return x.hapus||x.baru||x.kode!==x.asal.kode||x.nama!==x.asal.nama||Number(x.qty)!==Number(x.asal.qty)||String(x.harga==null?"":x.harga)!==String(x.asal.harga==null?"":x.asal.harga);});
      if(ubah){if(!its.length)return {err:"Minimal satu barang harus tetap ada. Untuk membatalkan seluruh penerimaan, pakai Batalkan di halaman Penerimaan."};
        if(its.some(function(x){return !(Number(x.qty)>0);}))return {err:"Jumlah semua barang harus lebih dari 0 (hapus barisnya bila tidak jadi)."};
        p.items=its.map(function(x){return {kode:x.kode,nama:x.nama,satuan:x.satuan,qty:Number(x.qty),harga:x.harga===""||x.harga==null?"":Number(x.harga)};});}}
    else if(j==="KEMBALI"){var ch=ST.items.filter(function(x){return Number(x.jt)!==Number(x.asal.jt);});
      if(ch.length)p.items=ST.items.map(function(x,i){return {no:i+1,jt:Number(x.jt)};});}
    if(Object.keys(ket).length)p.ket=ket;
    if(!p.ket&&!p.items)return {err:"Belum ada perubahan."};
    if(p.items&&!p.alasan&&!dry)return {err:"Isi alasan perubahan barang."};
    return {p:p};
  }
  async function lanjut(){
    var b=$("pu2ok");
    if(!ST.pratinjau){
      var m=muatKirim(true);if(m.err){toast(m.err,true);return;}
      b.disabled=true;var r=await api(m.p);b.disabled=false;
      if(!r.ok&&r.perlu==="tanggal"){if(!confirm(r.msg))return;m.p.setujuTanggal=true;ST.setujuTanggal=true;r=await api(m.p);}
      if(!r.ok){toast(r.msg||"Gagal.",true);return;}
      var pv='<div class="card" style="border:2px solid var(--gold,#1a6cab);margin-top:8px"><b>Dampak perubahan</b>'+
        ((r.dampak&&r.dampak.length)?'<table><thead><tr><th>Barang</th><th>Stok</th><th>Sebelum</th><th>Sesudah</th></tr></thead><tbody>'+r.dampak.map(function(d){return '<tr><td>'+esc(d.nama)+' <small>'+esc(d.kode||"")+'</small></td><td>'+esc(d.sumber)+'</td><td>'+esc(d.sebelum)+'</td><td><b>'+esc(d.sesudah)+'</b></td></tr>';}).join("")+'</tbody></table>':'<div class="note">Tidak ada perubahan stok. Hanya keterangan dokumen.</div>')+
        (r.warn||[]).map(function(w){return '<div class="note" style="border-left:3px solid #b45309;padding-left:8px">⚠ '+esc(w)+'</div>';}).join("")+'</div>';
      $("pu2pv").innerHTML=pv;ST.pratinjau=true;b.textContent="Konfirmasi dan simpan";return;
    }
    var m2=muatKirim(false);if(m2.err){toast(m2.err,true);return;}if(ST.setujuTanggal)m2.p.setujuTanggal=true;
    b.disabled=true;var r2=await api(m2.p);b.disabled=false;
    if(!r2.ok){toast(r2.msg||"Gagal.",true);return;}
    tutup();toast(r2.msg+((r2.warn&&r2.warn.length)?" Perhatian: "+r2.warn.join(" "):""));if(window.loadAccurate)loadAccurate();
  }
  async function urungkan(id){
    if(!confirm("Urungkan perubahan "+id+"? Stok dan keterangan dikembalikan seperti sebelum perubahan itu."))return;
    var r=await api({action:"adminUbahUrungkan",id:id});
    if(!r.ok){toast(r.msg||"Gagal.",true);return;}
    toast(r.msg);var key=ST&&ST.key;tutup();if(window.loadAccurate)await loadAccurate();if(key)buka(key);
  }
  /* ===== ubah banyak (No PPBJ) ===== */
  async function banyak(){
    var keys=terpilih();if(!keys.length){toast("Centang dokumen dulu (Penerimaan, Pengembalian, atau Barang Keluar).",true);return;}
    var pr=await api({action:"adminUbahRinci",key:keys[0]}),list=(pr&&pr.proyek)||[];
    var o=modal('<div style="display:flex;justify-content:space-between"><b>Ubah No PPBJ '+keys.length+' dokumen sekaligus</b><button class="gh" id="pb-x">Tutup</button></div><div class="note">Hanya keterangan (tanpa mengubah stok). Penerimaan yang terhubung ke pesanan PPBJ dihitung ulang. Dokumen berstatus Sudah kembali ke Belum.</div><div class="bar"><label class="fl">No PPBJ baru <input id="pb-p" list="pb-dl" style="min-width:240px"></label><datalist id="pb-dl">'+list.map(function(p){return '<option value="'+esc(p.ppbj)+'">'+esc(p.ket||"")+'</option>';}).join("")+'</datalist><label class="fl">Alasan (opsional) <input id="pb-a" maxlength="200"></label></div><div id="pb-pv"></div><div class="bar"><button class="gh" id="pb-b">Batal</button><button class="sv" id="pb-ok">Periksa</button></div>');
    var ok=false;$("pb-x").onclick=tutup;$("pb-b").onclick=tutup;$("pb-p").oninput=function(){ok=false;$("pb-ok").textContent="Periksa";$("pb-pv").innerHTML="";};
    $("pb-ok").onclick=async function(){
      var pp=$("pb-p").value.trim();if(!pp){toast("Isi No PPBJ baru.",true);return;}
      var b=this;b.disabled=true;var r=await api({action:"adminUbahBanyak",keys:keys,ppbj:pp,alasan:$("pb-a").value.trim(),dry:!ok});b.disabled=false;
      if(!r.ok){toast(r.msg||"Gagal.",true);return;}
      if(!ok){$("pb-pv").innerHTML='<div class="card" style="border:2px solid var(--gold,#1a6cab)">'+esc(r.msg)+(r.warn||[]).map(function(w){return '<div class="note">⚠ '+esc(w)+'</div>';}).join("")+(r.gagal&&r.gagal.length?'<div class="note">Dilewati: '+r.gagal.map(esc).join("; ")+'</div>':"")+'</div>';ok=true;b.textContent="Terapkan";return;}
      tutup();toast(r.msg);if(window.loadAccurate)loadAccurate();
    };
  }
  /* ===== Excel riwayat ===== */
  async function excelRiwayat(){
    if(typeof XLSX==="undefined"){toast("Pembaca Excel belum termuat. Periksa internet lalu muat ulang halaman.",true);return;}
    var b=this;b.disabled=true;
    try{var r=await api({action:"adminUbahRiwayat"});if(!r.ok){toast(r.msg||"Gagal.",true);return;}
      var wb=XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([["ID Ubah","Waktu","Oleh","Jenis","No Dokumen","Bagian","Perubahan","Alasan","Status","Diurungkan Oleh","Diurungkan Waktu","Status Accurate Sebelumnya"]].concat((r.rows||[]).map(function(x){return [x.id,x.waktu,x.oleh,x.jenis,x.doc,x.bagian,x.ring,x.alasan,x.status,x.diurungkanOleh,x.diurungkanWaktu,x.paSeb];}))),"Riwayat Perubahan");
      XLSX.writeFile(wb,NB.buat("xlsx","Riwayat Perubahan Dokumen"));
      toast("Excel siap: "+(r.rows||[]).length+" perubahan"+(r.total>(r.rows||[]).length?" (2.000 terbaru dari "+r.total+")":"")+".");
    }catch(e){toast("Gagal terhubung ke server.",true);}finally{b.disabled=false;}
  }
  return {pasang:pasang,buka:buka};
})();
