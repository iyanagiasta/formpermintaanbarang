/* Tanda penyerahan (untuk KPI): dipakai di tab Serah Barang (admin) dan tandaserah.html (Staff Gudang). Bergantung pada api(), toast(). */
var TDS=(function(){
  var el=null,D=null;
  function E(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
  function css(){if(document.getElementById("tdscss"))return;var s=document.createElement("style");s.id="tdscss";
    s.textContent=".tds .tdd{border:1px solid var(--line,#ccd);border-left:4px solid var(--accent,#0b5f8f);border-radius:4px;padding:10px 12px;margin:8px 0;background:var(--card,#fff)}.tds .tdd.tl{border-left-color:#a82424}.tds .tdd .ts{font-size:12px;color:var(--mut,#567);margin:3px 0}.tds .tdd label{font-size:12px;color:var(--mut,#567)}.tds .tdd input[type=datetime-local]{max-width:210px}";document.head.appendChild(s);}
  async function muat(){
    css();el.innerHTML='<div class="card msg">Memuat penanda penyerahan...</div>';
    var r;try{r=await api({action:"tandaList"});}catch(e){el.innerHTML='<div class="card msg err">Gagal terhubung ke server.</div>';return;}
    if(!r.ok){el.innerHTML='<div class="card msg err">'+E(r.msg||"Gagal")+'</div>';return;}
    D=r;render();
  }
  function info(x){return '<b>'+E(x.doc)+'</b> <small>'+E(x.dept)+' &middot; pemohon '+E(x.by||"-")+' &middot; PIC '+E(x.pic||"-")+'</small><div class="ts">Dikirim '+E(x.kirim)+(x.picWaktu?' &middot; disetujui PIC '+E(x.picWaktu):'')+' &middot; status: '+E(x.status)+'</div><div class="ts">'+E(x.items.join("; "))+(x.nItem>x.items.length?' dan '+(x.nItem-x.items.length)+' barang lain':'')+'</div>';}
  function render(){
    var h='<div class="tds"><div class="card"><b>Tandai penyerahan (untuk KPI)</b><div class="note">Tekan "Sudah diserahkan" saat barang diserahkan ke peminta, setelah PIC menyetujui. Ini hanya penanda waktu untuk KPI gudang: stok belum berkurang dan status dokumen tidak berubah. Stok baru dikurangi lewat Serah Barang setelah semua tanda tangan lengkap.</div></div>';
    h+='<div class="card"><b>Menunggu ditandai ('+D.menunggu.length+')</b>'+(D.menunggu.length?D.menunggu.map(function(x,i){return '<div class="tdd">'+info(x)+'<details class="pet"><summary>Waktu sebenarnya (opsional)</summary><div class="fr"><label>Diserahkan pada</label><input type="datetime-local" data-w="'+i+'"><label>Barang baru siap sejak</label><input type="datetime-local" data-s="'+i+'"></div><div class="note">Isi "diserahkan pada" bila baru dicatat belakangan. Isi "siap sejak" bila barang harus menunggu pembelian; waktu tunggu itu tidak dihitung sebagai keterlambatan gudang.</div></details><div class="fr"><input type="text" maxlength="300" placeholder="Catatan (opsional)" data-c="'+i+'" style="flex:1;min-width:160px"><button class="sv" data-t="'+i+'">Sudah diserahkan</button></div></div>';}).join(""):'<div class="msg">Tidak ada permintaan yang menunggu ditandai.</div>')+'</div>';
    h+='<div class="card"><b>Sudah ditandai, menunggu Serah Barang resmi ('+D.ditandai.length+')</b><div class="note">Barang sudah keluar tetapi stok belum dicatat. Catat lewat Serah Barang setelah status Siap Diserahkan.</div>'+(D.ditandai.length?D.ditandai.map(function(x,i){return '<div class="tdd">'+info(x)+'<div class="ts"><b>Ditandai '+E(x.ditandai)+'</b> oleh '+E(x.oleh)+(x.sebenarnya?' &middot; waktu sebenarnya '+E(x.sebenarnya):'')+(x.siap?' &middot; barang siap '+E(x.siap):'')+(x.catatan?' &middot; '+E(x.catatan):'')+'</div><div class="fr"><button class="rm bahaya" data-b="'+i+'">Batalkan tanda</button></div></div>';}).join(""):'<div class="msg">Belum ada.</div>')+'</div>';
    if(D.tindakLanjut.length)h+='<div class="card"><b>Perlu ditindaklanjuti ('+D.tindakLanjut.length+')</b><div class="note">Dokumen ini ditolak setelah barang ditandai diserahkan. Barang sudah di tangan peminta: koordinasikan pengembalian atau persetujuan ulang.</div>'+D.tindakLanjut.map(function(x){return '<div class="tdd tl">'+info(x)+'<div class="ts"><b>Ditandai '+E(x.ditandai)+'</b> oleh '+E(x.oleh)+'</div></div>';}).join("")+'</div>';
    h+='</div>';el.innerHTML=h;
    el.querySelectorAll("[data-t]").forEach(function(b){b.onclick=async function(){var i=Number(b.getAttribute("data-t")),x=D.menunggu[i];
      if(!confirm("Tandai "+x.doc+" sudah diserahkan?"))return;b.disabled=true;
      var q=function(a){var e=el.querySelector("["+a+'="'+i+'"]');return e?e.value:"";};
      var r=await api({action:"tandaSimpan",id:x.id,waktuSebenarnya:q("data-w"),barangSiapSejak:q("data-s"),catatan:q("data-c")});
      toast(r.msg||"Gagal",!r.ok);b.disabled=false;if(r.ok)muat();};});
    el.querySelectorAll("[data-b]").forEach(function(b){b.onclick=async function(){var x=D.ditandai[Number(b.getAttribute("data-b"))],a=prompt("Alasan membatalkan tanda penyerahan "+x.doc+" (wajib):");if(!a)return;
      var r=await api({action:"tandaBatal",id:x.id,alasan:a});toast(r.msg||"Gagal",!r.ok);if(r.ok)muat();};});
  }
  function mount(root){el=root;return muat();}
  return {mount:mount,muat:muat};
})();
