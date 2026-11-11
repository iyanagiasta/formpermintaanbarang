/* wah-init.js: pengaturan bersama tampilan baru (tema bawaan gelap, Kurangi gerak, mode ringan, layar sukses). Aman dimuat di semua halaman. */
(function(){
  var d=document,h=d.documentElement,n=navigator,g="",t="";
  try{g=localStorage.getItem("sctk_gerak")||"";t=localStorage.getItem("sctk_tema")||"";}catch(e){}
  if(!t)h.setAttribute("data-tema","gelap");
  var lemah=(n.hardwareConcurrency&&n.hardwareConcurrency<=3)||(n.deviceMemory&&n.deviceMemory<=2)||(n.connection&&n.connection.saveData);
  var mati=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
  if(g==="kurang"||(g!=="penuh"&&(lemah||mati)))h.classList.add("reduce");
  if(g!=="penuh"&&lemah)h.classList.add("ringan");
  function tombol(){
    var bar=d.querySelector(".bar");if(!bar||d.getElementById("gerak"))return;
    var b=d.createElement("button");b.type="button";b.id="gerak";b.className="btn";
    function ik(){var k=h.classList.contains("reduce");b.textContent=k?"Gerak: mati":"Kurangi gerak";b.setAttribute("aria-pressed",k?"true":"false");}
    ik();b.onclick=function(){var k=!h.classList.contains("reduce");h.classList.toggle("reduce",k);if(!k)h.classList.remove("ringan");try{localStorage.setItem("sctk_gerak",k?"kurang":"penuh");}catch(e){}ik();};
    bar.appendChild(b);
  }
  window.WAH_sukses=function(nomor,judul){
    if(d.body.classList.contains("cetak"))return;
    var o=d.getElementById("sukses");if(o)o.remove();
    o=d.createElement("div");o.id="sukses";o.className="nop";o.setAttribute("role","dialog");o.setAttribute("aria-modal","true");o.setAttribute("aria-labelledby","sk-j");
    var e=function(s){return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});};
    var sp="";for(var i=0;i<14;i++){var a=i/14*Math.PI*2,r=70+(i%3)*22;sp+='<i style="--dx:'+Math.round(Math.cos(a)*r)+'px;--dy:'+Math.round(Math.sin(a)*r)+'px;background:'+["#58E6FF","#B3A8FF","#FFC857","#7BE0A4"][i%4]+'"></i>';}
    o.innerHTML='<div class="sk"><div class="skc"><span class="sp">'+sp+'</span><svg width="132" height="132" viewBox="0 0 132 132" aria-hidden="true"><circle cx="66" cy="66" r="48" class="c0"/><circle cx="66" cy="66" r="48" class="c1" transform="rotate(-90 66 66)"/><path class="c2" d="M46 68l14 14 28-30"/></svg></div>'+
     '<h2 id="sk-j">'+e(judul||"Permintaan terkirim")+'</h2><p>Persetujuan diminta lewat email. Anda akan mendapat kabar di setiap tahap.</p><div class="no">'+e(nomor)+'</div>'+
     '<div class="ak"><button type="button" class="b1" id="sk-baru">Buat permintaan lain</button><a class="b2" href="dashboard.html">Kembali ke beranda</a><button type="button" class="b3" id="sk-tutup">Lihat formulir</button></div></div>';
    d.body.appendChild(o);
    d.getElementById("sk-tutup").onclick=function(){o.remove();};
    d.getElementById("sk-baru").onclick=function(){location.href=location.pathname+location.search;};
    setTimeout(function(){var b=d.getElementById("sk-baru");if(b)b.focus();},60);
  };
  if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",tombol);else tombol();
})();
