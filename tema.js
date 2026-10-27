/* Tema bersama Sistem Gudang: tema gelap/terang, kepala halaman bermerek, tombol ganti tema. */
(function(){
  var d=document,h=d.documentElement,K="sctk_tema";
  function baca(){try{return localStorage.getItem(K)==="terang"?"terang":"gelap";}catch(e){return "gelap";}}
  function pasang(t){h.setAttribute("data-tema",t);var b=d.getElementById("tema");if(b){b.innerHTML=t==="terang"?"&#127769;":"&#9728;";b.title=t==="terang"?"Ganti ke tema gelap":"Ganti ke tema terang";}}
  pasang(baca());
  function ganti(){var t=h.getAttribute("data-tema")==="terang"?"gelap":"terang";try{localStorage.setItem(K,t);}catch(e){}pasang(t);}
  var LOGO='<span class="lg"><img src="logo.png" alt="" onerror="this.remove();this.parentNode&&0">'
    +'<svg viewBox="0 0 24 24" fill="none" stroke="#4cc3f0" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3s6 6.2 6 10.5A6 6 0 0 1 6 13.5C6 9.2 12 3 12 3z"/></svg></span>';
  function mulai(){
    var b=d.body;if(!b||b.hasAttribute("data-tanpa-tema"))return;
    b.classList.add("tema");
    var sdh=d.getElementById("tema");
    var tombol=d.createElement("button");tombol.type="button";tombol.id="tema";tombol.className="tg";tombol.setAttribute("aria-label","Ganti tema terang atau gelap");
    var top=d.querySelector(".top");
    if(top){ // halaman yang sudah punya kepala: percantik saja
      top.insertAdjacentHTML("afterbegin",LOGO);top.appendChild(tombol);
    }else{
      var jd=b.getAttribute("data-judul")||(d.title||"").replace(/\s*[-|–].*$/,"")||"Sistem Gudang";
      var hd=d.createElement("header");hd.className="tbar nop";
      hd.innerHTML=LOGO+'<div class="tt"><b></b><small>PT SARANA CATUR TIRTA KELOLA</small></div>';
      hd.querySelector("b").textContent=jd;hd.appendChild(tombol);
      b.insertBefore(hd,b.firstChild);
    }
    var img=d.querySelector(".lg img");
    if(img){img.addEventListener("load",function(){img.parentNode.classList.add("ada");});if(img.complete&&img.naturalWidth)img.parentNode.classList.add("ada");}
    tombol.onclick=ganti;pasang(baca());
  }
  if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",mulai);else mulai();
})();
