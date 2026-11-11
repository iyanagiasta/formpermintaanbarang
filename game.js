/* Game "Main sebentar" - dimuat saat tombol ditekan. Memakai shadow DOM supaya tidak bentrok dengan halaman. */
(function(){
  var host=null,ov=null,fokus=null;
  function bangun(){
    host=document.createElement("div");host.id="gm-host";
    var root=host.attachShadow({mode:"open"});
    root.innerHTML="<style>"+"\n:host{--bg:#04202f;--bg2:#0a3a52;--card:#0c3048;--fg:#e8f6fb;--mut:#9cc3d3;--ac:#2fd0e8;--gold:#ffc83d;--bad:#ff7a7a;--line:#1d5774;color-scheme:dark}\n*{box-sizing:border-box}\n.ov{position:fixed;inset:0;z-index:2147483000;overflow:auto;-webkit-overflow-scrolling:touch;background:radial-gradient(120% 80% at 50% 0,var(--bg2),var(--bg) 70%) fixed,var(--bg);color:var(--fg);font:15px/1.5 system-ui,-apple-system,\"Segoe UI\",Roboto,sans-serif;padding-block:20px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));-webkit-tap-highlight-color:transparent}\n.w{max-width:460px;margin:0 auto;display:flex;flex-direction:column;gap:14px}\nh1{margin:0;font-size:24px;letter-spacing:.2px}\n.sub{color:var(--mut);margin:2px 0 0}\n.tabs{display:flex;gap:8px}\n.tab{flex:1;min-width:0;padding:11px 8px;border-radius:12px;border:1px solid var(--line);background:var(--card);color:var(--fg);font:inherit;font-weight:600;cursor:pointer}\n.tab[aria-selected=true]{background:linear-gradient(135deg,#0f6f8c,#1593b3);border-color:var(--ac)}\n.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:14px;display:flex;flex-direction:column;gap:12px}\n.row{display:flex;gap:8px;justify-content:space-between;align-items:center;flex-wrap:wrap}\n.pill{background:#06263a;border:1px solid var(--line);border-radius:999px;padding:4px 11px;color:var(--mut);font-size:13px;white-space:nowrap}\n.pill b{color:var(--fg)}\n.btn{border:0;border-radius:12px;padding:13px 16px;font:inherit;font-weight:700;cursor:pointer;color:#032430;background:linear-gradient(135deg,#46e0f5,#2fd0e8);width:100%}\n.btn:active{transform:scale(.98)}\n.how{color:var(--mut);font-size:14px;margin:0}\n.lv{height:8px;border-radius:6px;background:#06263a;border:1px solid var(--line);overflow:hidden}\n.lv i{display:block;height:100%;width:0;background:linear-gradient(90deg,#2fd0e8,#ffc83d);transition:width .3s}\n.tw{display:flex;gap:12px;align-items:stretch}\n.tank{position:relative;flex:1;height:300px;border:2px solid #6fd6ea;border-radius:10px 10px 18px 18px;background:rgba(255,255,255,.04);overflow:hidden;touch-action:manipulation;cursor:pointer;user-select:none}\n.water{position:absolute;left:0;right:0;bottom:0;height:0;background:linear-gradient(#35c8e6,#0d6f95)}\n.water:before{content:\"\";position:absolute;left:-10%;right:-10%;top:-6px;height:12px;border-radius:50%;background:#7fe7f6;opacity:.85}\n.tg{position:absolute;left:0;right:0;height:0;transition:opacity .35s}\n.tg .bd{position:absolute;left:0;right:0;background:rgba(255,200,61,.18)}\n.tg .ln{position:absolute;left:0;right:0;top:-1px;border-top:3px dashed var(--gold)}\n.tg span{position:absolute;right:6px;top:-26px;background:#2b2100;color:var(--gold);border:1px solid var(--gold);font-size:12px;font-weight:700;padding:1px 8px;border-radius:8px}\n.tank.hit .water{filter:brightness(1.4)}\n.tank.salah .water{filter:hue-rotate(150deg) brightness(1.1)}\n.side{width:104px;display:flex;flex-direction:column;gap:8px;justify-content:center;text-align:center}\n.big{font-size:30px;font-weight:800;line-height:1}\n.fb{min-height:44px;font-weight:700;color:var(--gold)}\n.cv{width:100%;height:400px;border-radius:14px;background:linear-gradient(#0b4a66,#052c40);border:1px solid var(--line);touch-action:none;display:block}\n.hasil{border:2px dashed var(--gold);border-radius:14px;padding:14px;background:#2b2100;color:#ffe9a8;text-align:center}\n.hasil h3{margin:0 0 4px;color:var(--gold);font-size:18px}\n.hasil p{margin:0}\n.iq{border:1px solid var(--line);border-radius:14px;padding:12px;background:#06263a;text-align:center}\n.iq b{font-size:22px;color:var(--gold)}\n[hidden]{display:none!important}\n@media (prefers-reduced-motion:reduce){.btn:active{transform:none}.lv i,.tg{transition:none}}\n\n.tutup{background:transparent;color:var(--fg);border:1px solid var(--line)}\n.top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}\n.x{flex:none;width:44px;height:44px;border-radius:12px;border:1px solid var(--line);background:var(--card);color:var(--fg);font:700 20px/1 system-ui;cursor:pointer}\n.x:focus-visible,.btn:focus-visible,.tab:focus-visible{outline:3px solid var(--gold);outline-offset:2px}\n"+"</style>"+"<div class=\"ov\" id=\"ov\" role=\"dialog\" aria-modal=\"true\" aria-label=\"Main sebentar\" hidden><div class=\"w\">\n  <div class=\"top\"><div>\n    <h1>Main sebentar</h1>\n    <p class=\"sub\">10 level. Makin tinggi makin gila. Katanya hanya yang ber-IQ 200 yang bisa tamat.</p>\n  </div><button class=\"x\" id=\"x\" type=\"button\" aria-label=\"Tutup game\">\u2715</button></div>\n\n  <div class=\"tabs\" role=\"tablist\">\n    <button class=\"tab\" id=\"t1\" role=\"tab\" aria-selected=\"true\">Isi Tangki</button>\n    <button class=\"tab\" id=\"t2\" role=\"tab\" aria-selected=\"false\">Tangkap Barang</button>\n  </div>\n\n  <!-- ISI TANGKI -->\n  <section class=\"card\" id=\"g1\">\n    <div class=\"row\">\n      <span class=\"pill\">Level <b id=\"a-r\">1</b>/10</span>\n      <span class=\"pill\">Nyawa <b id=\"a-n\" style=\"color:#ff8a8a\">\u2665\u2665\u2665</b></span>\n      <span class=\"pill\">Terbaik <b id=\"a-b\">Lv 0</b></span>\n    </div>\n    <div class=\"lv\"><i id=\"a-bar\"></i></div>\n    <p class=\"how\">Ketuk tangki tepat saat air menyentuh garis <b style=\"color:var(--gold)\">Batas</b>. Tiap level makin cepat, makin sempit, dan garisnya makin pelit tampil.</p>\n    <div class=\"tw\">\n      <div class=\"tank\" id=\"tank\" aria-label=\"Tangki, ketuk untuk berhenti\">\n        <div class=\"water\" id=\"water\"></div>\n        <div class=\"tg\" id=\"tgt\"><div class=\"bd\" id=\"bd\"></div><div class=\"ln\"></div><span>Batas</span></div>\n      </div>\n      <div class=\"side\">\n        <div class=\"big\" id=\"a-pts\">\u2013</div>\n        <div class=\"fb\" id=\"a-fb\">Siap?</div>\n      </div>\n    </div>\n    <div class=\"iq\" id=\"a-iq\" hidden></div>\n    <button class=\"btn\" id=\"a-go\">Mulai</button>\n  </section>\n\n  <!-- TANGKAP BARANG -->\n  <section class=\"card\" id=\"g2\" hidden>\n    <div class=\"row\">\n      <span class=\"pill\">Level <b id=\"b-l\">1</b>/10</span>\n      <span class=\"pill\">Waktu <b id=\"b-t\">20</b>d</span>\n      <span class=\"pill\">Poin <b id=\"b-s\">0/8</b></span>\n      <span class=\"pill\">Terbaik <b id=\"b-b\">Lv 0</b></span>\n    </div>\n    <div class=\"lv\"><i id=\"b-bar\"></i></div>\n    <p class=\"how\">Geser jari untuk menggerakkan kardus. Capai target poin sebelum waktu habis. Pompa +5, water meter +3, stop kran +2, lainnya +1. Besi berkarat -3.</p>\n    <canvas class=\"cv\" id=\"cv\"></canvas>\n    <div class=\"iq\" id=\"b-iq\" hidden></div>\n    <button class=\"btn\" id=\"b-go\">Mulai</button>\n  </section>\n\n  <div class=\"hasil\" id=\"kupon\" hidden>\n    <h3 id=\"kh\">Selamat!</h3>\n    <p id=\"kmsg\"></p>\n  </div>\n  <button class=\"btn tutup\" id=\"tutup\" type=\"button\">Tutup</button>\n</div></div>";
    document.body.appendChild(host);
    ov=root.getElementById("ov");
    root.getElementById("x").onclick=tutup;root.getElementById("tutup").onclick=tutup;
    (function(){

(function(root){
  var $=function(i){return root.getElementById(i)};
  function ls(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){return null}}
  var IQ=[70,80,90,100,110,120,135,150,170,200];
  var KOMEN=["Di bawah 70, tapi jangan sedih. Air tetap mengalir.","IQ Anda sekitar 80. Tarik napas, coba lagi.","IQ Anda sekitar 90. Lumayan buat hari Senin.","IQ Anda sekitar 100. Sangat rata-rata, sangat manusia.","IQ Anda sekitar 110. Staf gudang berbakat.","IQ Anda sekitar 120. Mulai mencurigakan.","IQ Anda sekitar 135. Ini sudah level supervisor.","IQ Anda sekitar 150. Jangan-jangan Anda pakai bot.","IQ Anda sekitar 170. Tinggal satu level lagi!","IQ 200 terkonfirmasi. Anda tamat!"];
  function iqText(n){return n<=0?"Belum lulus satu level pun. "+KOMEN[0]:"Lulus "+n+" level. "+KOMEN[n-1]}
  function menang(){
    var u=["Hadiah ambil di gudang ya, kalau masih ada.","Silakan ambil hadiah di gudang, kalau masih ada.","Hadiah menunggu di gudang... kalau belum habis.","Cepat ambil hadiah di gudang, sebelum keduluan yang lain."];
    $("kh").textContent="IQ 200 terkonfirmasi! Selamat!";
    $("kmsg").textContent="Hanya segelintir orang yang tamat. "+u[Math.floor(Math.random()*u.length)];
    $("kupon").hidden=false;$("kupon").scrollIntoView({behavior:"smooth",block:"center"});
  }
  function best(key,n,el){var b=+ls(key)||0;if(n>b){b=n;ls(key,b)}$(el).textContent="Lv "+b}

  function tab(n){
    $("g1").hidden=n!==1;$("g2").hidden=n!==2;
    $("t1").setAttribute("aria-selected",n===1);$("t2").setAttribute("aria-selected",n===2);
    if(n===1)stopB();else stopA();
  }
  $("t1").onclick=function(){tab(1)};$("t2").onclick=function(){tab(2)};

  /* ===== ISI TANGKI ===== */
  var A={on:false,L:1,nyawa:3,lvl:0,t0:0,raf:0,tgt:.6,spd:.6,tol:.15,tm:0,end:true};
  $("a-b").textContent="Lv "+(+ls("lv_a")||0);
  function setLvl(v){$("water").style.height=(v*100)+"%"}
  function hati(){var s="";for(var i=0;i<3;i++)s+=i<A.nyawa?"♥":"♡";$("a-n").textContent=s}
  function newRound(){
    var L=A.L;$("a-r").textContent=L;$("a-bar").style.width=((L-1)*10)+"%";
    A.tol=.16-.012*(L-1);A.spd=.55+.17*L;
    A.tgt=.3+Math.random()*.55;
    $("tgt").style.bottom=(A.tgt*100)+"%";$("tgt").style.opacity=1;
    $("bd").style.top=(-A.tol*300)+"px";$("bd").style.height=(A.tol*600)+"px";
    clearTimeout(A.tm);
    if(L>=5)A.tm=setTimeout(function(){$("tgt").style.opacity=0},L>=8?600:1200);
    A.t0=performance.now();A.on=true;
    $("a-fb").textContent=L>=5?"Ingat garisnya!":"Ketuk!";$("a-pts").textContent="Lv "+L;
    loopA();
  }
  function loopA(){
    cancelAnimationFrame(A.raf);
    A.raf=requestAnimationFrame(function f(now){
      if(!A.on)return;
      var p=((now-A.t0)/1000*A.spd)%2;
      A.lvl=p<1?p:2-p;setLvl(A.lvl);
      A.raf=requestAnimationFrame(f);
    });
  }
  function stopA(){A.on=false;cancelAnimationFrame(A.raf);clearTimeout(A.tm)}
  function selesaiA(menangg){
    A.end=true;var n=menangg?10:A.L-1;
    best("lv_a",n,"a-b");
    $("a-bar").style.width=(n*10)+"%";
    $("a-iq").hidden=false;$("a-iq").innerHTML="<b>"+(n>0?"IQ "+IQ[n-1]:"IQ < 70")+"</b><br>"+iqText(n);
    $("a-go").textContent="Main lagi";$("a-go").hidden=false;
    $("a-fb").textContent=menangg?"TAMAT!":"Game over";
    if(menangg)menang();
  }
  function tapA(){
    if(!A.on)return;
    A.on=false;cancelAnimationFrame(A.raf);clearTimeout(A.tm);$("tgt").style.opacity=1;
    var d=Math.abs(A.lvl-A.tgt),t=$("tank");
    if(d<=A.tol){
      $("a-fb").textContent=d<=A.tol/3?"Pas sekali!":"Lolos!";$("a-pts").textContent="✓";
      t.classList.add("hit");setTimeout(function(){t.classList.remove("hit")},200);
      if(A.L>=10){selesaiA(true);return}
      A.L++;setTimeout(newRound,1000);
    }else{
      A.nyawa--;hati();$("a-fb").textContent="Meleset "+Math.round(d*100)+"%";$("a-pts").textContent="✗";
      t.classList.add("salah");setTimeout(function(){t.classList.remove("salah")},300);
      if(A.nyawa<=0){selesaiA(false);return}
      setTimeout(newRound,1000);
    }
  }
  $("tank").addEventListener("pointerdown",function(e){e.preventDefault();tapA()});
  $("a-go").onclick=function(){
    A.L=1;A.nyawa=3;A.end=false;hati();$("kupon").hidden=true;$("a-iq").hidden=true;
    $("a-go").hidden=true;newRound();
  };

  /* ===== TANGKAP BARANG ===== */
  var cv=$("cv"),cx=cv.getContext("2d"),W=0,H=0;
  var B={on:false,L:1,items:[],fx:[],s:0,q:8,t:20,last:0,sp:0,raf:0,bx:0,msg:"",mt:0,pop:0,wait:0,over:"",BW:90,cek:false};
  var JENIS={pipa:["Pipa PVC",1],elbow:["Elbow 90°",1],tee:["Tee",1],keran:["Stop kran",2],seal:["Seal tape",1],baut:["Baut",1],meter:["Water meter",3],pompa:["Pompa",5],karat:["Besi berkarat",-3]};
  var BAG=["pipa","pipa","elbow","elbow","tee","tee","keran","keran","seal","seal","baut","baut","meter","pompa"];
  var CATATAN={1:"Level 1: pemanasan",3:"Level 3: barang makin cepat",6:"Level 6: barang mulai oleng",8:"Level 8: KONTROL TERBALIK!",10:"Level 10: yang terakhir"};
  $("b-b").textContent="Lv "+(+ls("lv_b")||0);
  function fit(){
    var d=window.devicePixelRatio||1,r=cv.getBoundingClientRect();
    if(!r.width)return;
    W=r.width;H=r.height;cv.width=W*d;cv.height=H*d;cx.setTransform(d,0,0,d,0,0);
    if(!B.bx)B.bx=W/2;
    if(!B.on)draw();
  }
  window.addEventListener("resize",fit);
  function params(){
    var L=B.L;B.q=6+2*L;B.BW=96-5.5*L;B.t=20;B.s=0;B.sp=0;B.items=[];B.fx=[];
    $("b-l").textContent=L;$("b-bar").style.width=((L-1)*10)+"%";$("b-s").textContent="0/"+B.q;
    B.msg=CATATAN[L]||"Level "+L;B.mt=1.6;B.pop=1;
  }
  function spawn(){
    var L=B.L,k=Math.random()<.12+.03*L?"karat":BAG[Math.floor(Math.random()*BAG.length)];
    B.items.push({k:k,x:30+Math.random()*(W-60),x0:0,y:-30,vy:110+L*26+Math.random()*50,rot:(Math.random()-.5)*.8,ph:Math.random()*6.28});
  }
  function item(k,x,y,rot){
    cx.save();cx.translate(x,y);cx.rotate(rot||0);cx.lineJoin="round";cx.lineCap="round";
    if(k==="pipa"){
      cx.fillStyle="#e9eff2";cx.strokeStyle="#7d949f";cx.lineWidth=2;
      cx.beginPath();cx.roundRect?cx.roundRect(-30,-9,60,18,4):cx.rect(-30,-9,60,18);cx.fill();cx.stroke();
      cx.fillStyle="#c5d3da";cx.fillRect(-30,-9,7,18);cx.fillRect(23,-9,7,18);
    }else if(k==="elbow"){
      cx.strokeStyle="#7d949f";cx.lineWidth=18;cx.beginPath();cx.moveTo(18,14);cx.lineTo(-12,14);cx.lineTo(-12,-16);cx.stroke();
      cx.strokeStyle="#e9eff2";cx.lineWidth=14;cx.stroke();
    }else if(k==="tee"){
      cx.strokeStyle="#7d949f";cx.lineWidth=18;cx.beginPath();cx.moveTo(-24,-10);cx.lineTo(24,-10);cx.moveTo(0,-10);cx.lineTo(0,20);cx.stroke();
      cx.strokeStyle="#e9eff2";cx.lineWidth=14;cx.stroke();
    }else if(k==="keran"){
      cx.fillStyle="#d9a441";cx.strokeStyle="#8a6420";cx.lineWidth=2;
      cx.fillRect(-26,-4,52,14);cx.strokeRect(-26,-4,52,14);
      cx.beginPath();cx.arc(0,3,13,0,6.28);cx.fill();cx.stroke();
      cx.fillStyle="#d64545";cx.fillRect(-14,-20,28,6);cx.fillRect(-2,-16,4,10);
    }else if(k==="seal"){
      cx.strokeStyle="#f4f6f7";cx.lineWidth=11;cx.beginPath();cx.arc(0,0,14,0,6.28);cx.stroke();
      cx.strokeStyle="#9fb4bd";cx.lineWidth=1.5;cx.beginPath();cx.arc(0,0,19.5,0,6.28);cx.stroke();
    }else if(k==="baut"){
      cx.fillStyle="#9aa7ad";cx.strokeStyle="#5b6a71";cx.lineWidth=2;
      cx.fillRect(-4,-4,8,26);cx.strokeRect(-4,-4,8,26);
      cx.beginPath();for(var i=0;i<6;i++){var a=i/6*6.28;cx.lineTo(Math.cos(a)*15,-8+Math.sin(a)*8)}cx.closePath();cx.fill();cx.stroke();
    }else if(k==="meter"){
      cx.fillStyle="#3aa9d1";cx.strokeStyle="#1b6f92";cx.lineWidth=3;
      cx.beginPath();cx.arc(0,0,21,0,6.28);cx.fill();cx.stroke();
      cx.fillStyle="#f4fbff";cx.beginPath();cx.arc(0,0,14,0,6.28);cx.fill();
      cx.strokeStyle="#d64545";cx.lineWidth=2;cx.beginPath();cx.moveTo(0,0);cx.lineTo(8,-8);cx.stroke();
    }else if(k==="pompa"){
      cx.shadowColor="#ffc83d";cx.shadowBlur=14;
      cx.fillStyle="#1d6fd8";cx.strokeStyle="#ffc83d";cx.lineWidth=2.5;
      cx.beginPath();cx.roundRect?cx.roundRect(-24,-16,48,32,8):cx.rect(-24,-16,48,32);cx.fill();cx.stroke();
      cx.shadowBlur=0;cx.fillStyle="#cfe6ff";cx.beginPath();cx.arc(0,0,9,0,6.28);cx.fill();
      cx.strokeStyle="#1d6fd8";cx.lineWidth=2;cx.beginPath();cx.moveTo(-6,0);cx.lineTo(6,0);cx.moveTo(0,-6);cx.lineTo(0,6);cx.stroke();
    }else{
      cx.fillStyle="#8a4b2a";cx.strokeStyle="#5a2d16";cx.lineWidth=2;
      cx.beginPath();cx.moveTo(-22,-6);cx.lineTo(-8,-18);cx.lineTo(10,-14);cx.lineTo(22,0);cx.lineTo(12,16);cx.lineTo(-12,18);cx.closePath();cx.fill();cx.stroke();
      cx.fillStyle="#d9822b";cx.beginPath();cx.arc(-6,-2,5,0,6.28);cx.arc(8,6,4,0,6.28);cx.fill();
    }
    cx.restore();
  }
  function kardus(){
    var by=H-40,x=B.bx,w=B.BW;
    cx.fillStyle="#c69a5b";cx.strokeStyle="#8a6a37";cx.lineWidth=2;
    cx.beginPath();cx.moveTo(x-w/2,by);cx.lineTo(x+w/2,by);cx.lineTo(x+w/2-8,by+34);cx.lineTo(x-w/2+8,by+34);cx.closePath();cx.fill();cx.stroke();
    cx.fillStyle="#e3c48d";cx.fillRect(x-6,by,12,34);
    if(w>60){cx.fillStyle="#5a3f17";cx.font="700 10px system-ui";cx.textAlign="center";cx.fillText("GUDANG",x-w/4-2,by+21)}
  }
  function pop(x,y,c){for(var i=0;i<8;i++){var a=i/8*6.28;B.fx.push({x:x,y:y,vx:Math.cos(a)*100,vy:Math.sin(a)*100,l:.4,c:c})}}
  function draw(){
    cx.clearRect(0,0,W,H);
    cx.fillStyle="rgba(255,255,255,.05)";for(var r=1;r<4;r++)cx.fillRect(0,r*H/4,W,3);
    B.items.forEach(function(it){item(it.k,it.x,it.y,it.rot)});
    kardus();
    B.fx.forEach(function(p){cx.globalAlpha=Math.max(0,p.l/.4);cx.fillStyle=p.c;cx.beginPath();cx.arc(p.x,p.y,3,0,6.28);cx.fill()});
    cx.globalAlpha=1;
    if(B.mt>0){cx.globalAlpha=Math.min(1,B.mt*2);cx.fillStyle=B.pop<0?"#ff9d9d":"#ffe08a";cx.font="700 16px system-ui";cx.textAlign="center";cx.fillText(B.msg,W/2,28);cx.globalAlpha=1}
    if(B.over){
      cx.fillStyle="rgba(3,30,45,.8)";cx.fillRect(0,0,W,H);
      cx.fillStyle="#e8f6fb";cx.textAlign="center";cx.font="800 30px system-ui";cx.fillText(B.over,W/2,H/2-6);
      cx.font="600 15px system-ui";cx.fillStyle="#9cc3d3";cx.fillText(B.over2||"",W/2,H/2+22);
    }
  }
  function selesaiB(menangg){
    B.on=false;B.items=[];B.mt=0;
    var n=menangg?10:B.L-1;
    best("lv_b",n,"b-b");$("b-bar").style.width=(n*10)+"%";
    B.over=menangg?"TAMAT!":"Berhenti di Level "+B.L;B.over2=menangg?"IQ 200 terkonfirmasi":"Poin kurang "+(B.q-B.s);
    draw();
    $("b-iq").hidden=false;$("b-iq").innerHTML="<b>"+(n>0?"IQ "+IQ[n-1]:"IQ < 70")+"</b><br>"+iqText(n);
    $("b-go").textContent="Main lagi";$("b-go").hidden=false;
    if(menangg)menang();
  }
  function loopB(now){
    if(!B.on)return;
    var dt=Math.min(.05,(now-B.last)/1000);B.last=now;
    B.mt-=dt;
    if(B.wait>0){B.wait-=dt;if(B.wait<=0)params();draw();B.raf=requestAnimationFrame(loopB);return}
    B.t-=dt;B.sp-=dt;
    if(B.sp<=0){spawn();B.sp=Math.max(.3,.8-.05*B.L)}
    var by=H-40,L=B.L;
    B.items.forEach(function(it){it.y+=it.vy*dt;it.rot+=dt*.4;if(L>=6){it.ph+=dt*3;it.x+=Math.cos(it.ph)*60*dt}});
    B.items=B.items.filter(function(it){
      if(it.y+14>=by&&it.y<by+26&&Math.abs(it.x-B.bx)<B.BW/2+6){
        var j=JENIS[it.k];B.s=Math.max(0,B.s+j[1]);$("b-s").textContent=B.s+"/"+B.q;
        B.msg=(j[1]>0?"+":"")+j[1]+" "+j[0];B.mt=.9;B.pop=j[1];
        pop(it.x,by,j[1]<0?"#ff7a7a":j[1]>=5?"#ffc83d":"#bff4ff");return false;
      }
      return it.y<H+40;
    });
    B.fx.forEach(function(p){p.x+=p.vx*dt;p.y+=p.vy*dt;p.l-=dt});
    B.fx=B.fx.filter(function(p){return p.l>0});
    $("b-t").textContent=Math.max(0,Math.ceil(B.t));
    if(B.s>=B.q){
      if(L>=10){selesaiB(true);return}
      B.L++;B.items=[];B.msg="Level "+L+" lulus!";B.mt=1.2;B.pop=1;B.wait=1.3;
      draw();B.raf=requestAnimationFrame(loopB);return;
    }
    if(B.t<=0){selesaiB(false);return}
    draw();
    B.raf=requestAnimationFrame(loopB);
  }
  function stopB(){B.on=false;cancelAnimationFrame(B.raf)}
  function geser(e){
    var r=cv.getBoundingClientRect(),x=e.clientX-r.left;
    if(B.L>=8&&B.on&&!B.wait)x=W-x;
    B.bx=Math.max(B.BW/2,Math.min(W-B.BW/2,x));
    if(!B.on)draw();
  }
  cv.addEventListener("pointerdown",function(e){e.preventDefault();try{cv.setPointerCapture(e.pointerId)}catch(x){}geser(e)});
  cv.addEventListener("pointermove",function(e){geser(e)});
  $("b-go").onclick=function(){
    fit();B.L=1;B.over="";B.wait=0;params();
    $("kupon").hidden=true;$("b-iq").hidden=true;$("b-go").hidden=true;
    B.on=true;B.last=performance.now();B.raf=requestAnimationFrame(loopB);
  };
  new ResizeObserver(fit).observe(cv);
  setTimeout(fit,50);
  window.__gmStop=function(){stopA();stopB()};
})(host.shadowRoot);
    })();
  }
  function buka(){
    if(!host)bangun();
    fokus=document.activeElement;
    ov.hidden=false;document.documentElement.style.overflow="hidden";
    ov.scrollTop=0;
    var x=host.shadowRoot.getElementById("x");if(x)x.focus();
  }
  function tutup(){
    if(!ov)return;
    if(window.__gmStop)window.__gmStop();
    ov.hidden=true;document.documentElement.style.overflow="";
    if(fokus&&fokus.focus)fokus.focus();
  }
  document.addEventListener("keydown",function(e){if(e.key==="Escape"&&ov&&!ov.hidden)tutup()});
  function pasang(){var b=document.getElementById("gm-buka");if(b)b.addEventListener("click",buka)}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",pasang);else pasang();
})();
