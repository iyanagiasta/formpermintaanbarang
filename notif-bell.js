/* Tambahan 81: Lonceng notifikasi admin.
   Info yang dulu dikirim lewat email (menunggu atasan, disetujui, dll) kini dicatat di sheet Notifikasi dan tampil di sini.
   Memakai api(), esc(), PIN milik admin.html. Tanda "sudah dibaca" disimpan di browser ini saja (localStorage). */
var NTF=(function(){
  var D=null,seen=0,timer=null,mulai=false;
  function ls(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v);}catch(e){}return null;}
  function adaPin(){try{return typeof PIN!=="undefined"&&!!PIN;}catch(e){return false;}}
  function belum(){if(!D)return 0;return D.daftar.filter(function(x){return x.jenis!=="Ringkasan"&&x.t>seen;}).length;}
  function taruh(b){
    var tm=document.getElementById("tema"),hb=document.querySelector(".top .homebtn");
    if(tm&&getComputedStyle(tm).position==="absolute"){
      var kiri=hb&&getComputedStyle(hb).position==="absolute"?hb.getBoundingClientRect().left:tm.getBoundingClientRect().left;
      b.style.position="absolute";b.style.top="50%";b.style.right=Math.max(12,Math.round(window.innerWidth-kiri+8))+"px";
    }else{b.style.position="";b.style.top="";b.style.right="";}
  }
  function tombol(){
    var b=document.getElementById("ntfbtn");
    if(!b){var top=document.querySelector(".top");if(!top)return null;b=document.createElement("button");b.id="ntfbtn";b.type="button";b.className="tg";b.onclick=buka;
      var tm=document.getElementById("tema");if(tm&&tm.parentNode===top)top.insertBefore(b,tm);else top.appendChild(b);
      window.addEventListener("resize",function(){taruh(b);});}
    var n=belum();b.textContent="Notifikasi"+(n?" ("+n+")":"");b.title=n?n+" notifikasi baru":"Tidak ada notifikasi baru";taruh(b);return b;
  }
  function modal(html){var o=document.getElementById("ntfmod");if(!o){o=document.createElement("div");o.id="ntfmod";o.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:24px 12px;overflow:auto";o.onclick=function(e){if(e.target===o)tutup();};var c=document.createElement("div");c.className="card";c.style.cssText="max-width:720px;width:100%;margin:0";o.appendChild(c);document.body.appendChild(o);}o.firstChild.innerHTML=html;return o;}
  function tutup(){var o=document.getElementById("ntfmod");if(o)o.remove();}
  function gambar(){
    if(!D)return;
    var st='Sisa kuota email hari ini: <b>'+(D.kuota>=0?D.kuota:"?")+'</b> &middot; Ringkasan harian: <b>'+(D.digest?"aktif":"belum dipasang")+'</b>'+(D.digest?' &middot; antre: <b>'+D.antre+'</b>':'')+' &middot; Mode hemat: <b>'+(D.hemat?"hidup":"mati")+'</b>';
    var rows=D.daftar.map(function(x){var baru=x.jenis!=="Ringkasan"&&x.t>seen;
      return '<tr><td data-l="Waktu" style="white-space:nowrap">'+esc(x.waktu)+(baru?' <span class="bd d">baru</span>':'')+'</td><td data-l="Info"><b>'+esc(x.judul)+'</b>'+(x.ringkas?'<br><small>'+esc(x.ringkas)+'</small>':'')+(x.untuk?'<br><small>untuk: '+esc(x.untuk)+'</small>':'')+'</td><td data-l="">'+(x.link?'<a href="'+esc(x.link)+'" target="_blank" rel="noopener">Buka</a>':'')+'</td></tr>';}).join("");
    modal('<b>Notifikasi</b><div class="note">'+st+'</div><div class="note">Info non-aksi tidak lagi dikirim lewat email supaya jatah email hemat. Email yang butuh tindakan (persetujuan, ditolak, siap diserahkan) tetap dikirim, dan pengingat digabung menjadi satu ringkasan harian per orang.</div>'+
      (rows?'<div class="tw"><table><thead><tr><th>Waktu</th><th>Info</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>':'<div class="msg">Belum ada notifikasi.</div>')+
      '<div style="margin-top:10px;display:flex;gap:8px"><button class="gh" id="ntf-baca">Tandai semua dibaca</button><button class="gh" id="ntf-tutup">Tutup</button></div>');
    document.getElementById("ntf-tutup").onclick=tutup;
    document.getElementById("ntf-baca").onclick=function(){tandai();gambar();};
  }
  function tandai(){var m=0;if(D)D.daftar.forEach(function(x){if(x.t>m)m=x.t;});seen=Math.max(seen,m,Date.now());ls("sctk_ntf_seen",String(seen));tombol();}
  async function ambil(){
    if(!adaPin())return false;
    try{var r=await api({action:"notifDaftar"});if(r&&r.ok){D=r;tombol();return true;}}catch(e){}
    return false;
  }
  async function buka(){await ambil();if(!D){modal('<b>Notifikasi</b><div class="msg">Belum bisa memuat. Coba lagi sebentar lagi.</div><div style="margin-top:10px"><button class="gh" id="ntf-tutup">Tutup</button></div>');document.getElementById("ntf-tutup").onclick=tutup;return;}gambar();}
  function jalan(){
    if(mulai)return;mulai=true;seen=Number(ls("sctk_ntf_seen")||0)||0;
    var cek=setInterval(async function(){if(!adaPin())return;clearInterval(cek);var pertama=!ls("sctk_ntf_seen");
      if(await ambil()&&pertama){tandai();}
      timer=setInterval(function(){if(!document.hidden)ambil();},5*60*1000);},1500);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",jalan);else jalan();
  return {buka:buka,ambil:ambil};
})();
