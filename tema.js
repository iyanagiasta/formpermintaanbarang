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

/* Judul kolom tabel dibuat beku: tabel dengan banyak baris dibungkus kotak gulir, judul kolom menempel di atas saat digulir. */
(function(){
  var d=document,MIN=8;
  var st=d.createElement("style");
  st.textContent=".tbox{max-height:72vh;overflow:auto;position:relative;border-radius:12px}"+
   ".tbox>table,.tw.tbox>table{overflow:visible!important;margin:0}"+
   ".tbox thead th{position:sticky;top:0;z-index:3;box-shadow:0 1px 0 rgba(0,0,0,.25)}"+
   "@media (max-width:820px){.tbox{max-height:none;overflow:visible}.tbox thead th{position:static}}";
  (d.head||d.documentElement).appendChild(st);
  function proses(t){
    if(t._beku)return;var th=t.tHead;if(!th||!th.rows.length)return;
    var tb=t.tBodies[0];if(!tb||tb.rows.length<MIN)return;
    t._beku=true;var p=t.parentNode;
    if(p&&p.classList&&p.classList.contains("tw")&&p.children.length===1){p.classList.add("tbox");return;}
    var w=d.createElement("div");w.className="tbox";p.insertBefore(w,t);w.appendChild(t);
  }
  function semua(){var l=d.getElementsByTagName("table");for(var i=0;i<l.length;i++)proses(l[i]);}
  var tm=null;
  function jadwal(){clearTimeout(tm);tm=setTimeout(semua,60);}
  function mulai(){semua();try{new MutationObserver(jadwal).observe(d.body,{childList:true,subtree:true});}catch(e){}}
  if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",mulai);else mulai();
})();
