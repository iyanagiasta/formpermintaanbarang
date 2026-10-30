/* Tema bersama Sistem Gudang: tema gelap/terang, kepala halaman bermerek, tombol ganti tema. */
(function(){
  var d=document,h=d.documentElement,K="sctk_tema";
  function baca(){try{return localStorage.getItem(K)==="gelap"?"gelap":"terang";}catch(e){return "terang";}}
  function pasang(t){h.setAttribute("data-tema",t);var b=d.getElementById("tema");if(b){b.textContent=t==="terang"?"Mode gelap":"Mode terang";b.title=t==="terang"?"Ganti ke tema gelap":"Ganti ke tema terang";}}
  pasang(baca());
  function ganti(){var t=h.getAttribute("data-tema")==="terang"?"gelap":"terang";try{localStorage.setItem(K,t);}catch(e){}pasang(t);}
  var LOGO='<span class="lg"><img src="logo.png" alt="" onerror="this.remove();this.parentNode&&0">'
    +'<svg viewBox="0 0 24 24" fill="none" stroke="#0b5f8f" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3s6 6.2 6 10.5A6 6 0 0 1 6 13.5C6 9.2 12 3 12 3z"/></svg></span>';
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

/* Tabel: bisa digeser kiri-kanan, judul kolom beku di atas, dan kolom nama barang (kiri) beku saat digeser. */
(function(){
  var d=document,MIN=8;
  var st=d.createElement("style");
  st.textContent=".tbox{overflow-x:auto;overflow-y:visible;position:relative;border-radius:0;max-width:100%;-webkit-overflow-scrolling:touch}"+
   ".tbox.tv{max-height:72vh;overflow-y:auto}"+
   ".tbox>table{overflow:visible!important;margin:0}"+
   ".tbox.tv thead th{position:sticky;top:0;z-index:3;box-shadow:0 1px 0 rgba(0,0,0,.25)}"+
   ".tbox td.kb,.tbox th.kb{position:sticky;left:var(--kl,0);z-index:2;box-shadow:1px 0 0 rgba(127,160,180,.45)}"+
   ".tbox td.kb{background:var(--card,#fff)}.tbox th.kb{z-index:4}.tbox.tv thead th.kb{z-index:5}"+
   "@media (max-width:820px){.tbox{overflow:visible;max-height:none!important}.tbox.tv{overflow:visible}.tbox.tv thead th{position:static}.tbox td.kb,.tbox th.kb{position:static;box-shadow:none}}";
  (d.head||d.documentElement).appendChild(st);
  function boleh(t){return !t.closest(".sheet,#sheet,.nop,[data-tanpa-geser]");}
  function proses(t){
    if(t._beku)return;var th=t.tHead;if(!th||!th.rows.length||!boleh(t))return;
    var tb=t.tBodies[0];if(!tb)return;
    t._beku=true;var p=t.parentNode,ncol=th.rows[0].cells.length;
    if(ncol>=6)t.style.minWidth=(ncol*118)+"px";
    var w;
    if(p&&p.classList&&p.classList.contains("tw")&&p.children.length===1){w=p;w.classList.add("tbox");}
    else{w=d.createElement("div");w.className="tbox";p.insertBefore(w,t);w.appendChild(t);}
    if(tb.rows.length>=MIN)w.classList.add("tv");
  }
  /* kolom kiri beku: sampai kolom yang judulnya mengandung barang / nama / dokumen / proyek (maks 3 kolom pertama) */
  function bekuKol(t){
    if(!t._beku||!t.tHead||!t.tHead.rows.length)return;
    var hr=t.tHead.rows[0],n=hr.cells.length;if(n<5)return;
    var k=-1;for(var i=0;i<Math.min(n,3);i++){if(/barang|nama|dokumen|proyek|pembelian|nomor|uraian/i.test(hr.cells[i].textContent)){k=i;break;}}
    if(k<0)return;
    var off=0,lefts=[];for(var j=0;j<=k;j++){lefts.push(off);off+=hr.cells[j].offsetWidth;}
    var rows=[hr].concat(Array.prototype.slice.call(t.tBodies[0].rows));
    for(var r=0;r<rows.length;r++){var c=rows[r].cells;if(c.length<n)continue;for(var j2=0;j2<=k;j2++){var el=c[j2];if(!el.classList.contains("kb")){el.classList.add("kb");}el.style.setProperty("--kl",lefts[j2]+"px");}}
  }
  function semua(){var l=d.getElementsByTagName("table"),i;for(i=0;i<l.length;i++)proses(l[i]);for(i=0;i<l.length;i++)bekuKol(l[i]);}
  var tm=null;
  function jadwal(){clearTimeout(tm);tm=setTimeout(semua,60);}
  function mulai(){semua();try{new MutationObserver(jadwal).observe(d.body,{childList:true,subtree:true});}catch(e){}window.addEventListener("resize",jadwal);}
  if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",mulai);else mulai();
})();

/* Tombol melayang "Kembali ke Halaman Utama" dan "Ke atas": tidak perlu menggulir ke atas lagi untuk kembali ke dashboard. */
(function(){
  var d=document;
  function mulai(){
    var hb=d.querySelector("a.homebtn");if(!hb||d.getElementById("fabatas"))return;if(!/admin/i.test(location.pathname))return;
    var st=d.createElement("style");
    st.textContent="#fabkembali,#fabatas{position:fixed;z-index:40;bottom:16px;font:700 13px 'Segoe UI',Roboto,Arial,sans-serif;border-radius:3px;box-shadow:0 2px 8px rgba(0,0,0,.3);cursor:pointer;text-decoration:none;border:1px solid rgba(255,255,255,.5);background:#0c3b57;color:#fff}"+
     "#fabkembali{left:14px;padding:11px 16px}#fabatas{right:14px;width:42px;height:42px;display:none;align-items:center;justify-content:center;font-size:18px;padding:0}"+
     "#fabkembali:hover,#fabatas:hover{background:#0b5f8f;color:#fff}@media print{#fabkembali,#fabatas{display:none!important}}";
    d.head.appendChild(st);
    
    var u=d.createElement("button");u.type="button";u.id="fabatas";u.innerHTML="&uarr;";u.title="Ke atas";u.onclick=function(){window.scrollTo({top:0,behavior:"smooth"});};d.body.appendChild(u);
    function cek(){u.style.display=(window.pageYOffset||d.documentElement.scrollTop)>500?"flex":"none";}
    window.addEventListener("scroll",cek,{passive:true});cek();
  }
  if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",mulai);else mulai();
})();

/* Admin: petunjuk panjang (.note > 150 huruf) dilipat di balik "Petunjuk", tampil lagi dengan satu ketukan. */
(function(){
  var d=document,tm=0;
  function lipat(){
    if(!d.getElementById("tabs"))return;
    var n=d.querySelectorAll(".note");
    for(var i=0;i<n.length;i++){
      var e=n[i];
      if(e.id||e._pet||e.closest("details,table,.noprint,#sheet"))continue;
      var tx=(e.textContent||"").trim();
      if(tx.length<=150||/^(Menampilkan|Diperbarui)/i.test(tx))continue;
      e._pet=1;
      var dt=d.createElement("details");dt.className="pet";
      var sm=d.createElement("summary");sm.textContent="Petunjuk";dt.appendChild(sm);
      e.parentNode.insertBefore(dt,e);dt.appendChild(e);
    }
  }
  function jadwal(){clearTimeout(tm);tm=setTimeout(lipat,80);}
  function mulai(){lipat();try{new MutationObserver(jadwal).observe(d.body,{childList:true,subtree:true});}catch(e){}}
  if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",mulai);else mulai();
})();
