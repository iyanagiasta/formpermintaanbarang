/* Logo SCTK berbentuk bola kaca yang terus berputar (kanvas 2D). Berhenti bila Kurangi gerak / mode ringan. */
(function(){
  var box=document.querySelector(".brand .logo");if(!box)return;
  var img=new Image(),ok=false,cv=document.createElement("canvas"),g=cv.getContext&&cv.getContext("2d");
  if(!g)return;
  var S=54,dpr=Math.min(window.devicePixelRatio||1,2),rot=0,raf=0,last=0,d=document.documentElement;
  cv.width=cv.height=Math.round(S*dpr);cv.className="bola-cv";cv.setAttribute("aria-hidden","true");
  function diam(){return d.classList.contains("reduce")||d.classList.contains("ringan");}
  function draw(){
    var R=S/2-1.5,cx=S/2,cy=S/2,i,x,phi,m,u,sw,half=48;
    g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,S,S);
    /* badan bola kaca biru */
    var b=g.createRadialGradient(cx-R*.35,cy-R*.4,R*.1,cx,cy,R);b.addColorStop(0,"#5FA8F0");b.addColorStop(.55,"#1F5FC0");b.addColorStop(1,"#0A2A70");
    g.fillStyle=b;g.beginPath();g.arc(cx,cy,R,0,Math.PI*2);g.fill();
    if(ok){
      g.save();g.beginPath();g.arc(cx,cy,R,0,Math.PI*2);g.clip();
      for(x=-R;x<R;x+=.5){
        phi=Math.asin(x/R)*180/Math.PI;m=((phi+rot)%120+180)%120-60; /* tiga logo, jarak 120 derajat */
        if(Math.abs(m)<=half){
          u=(m/half+1)/2;var h=2*Math.sqrt(R*R-x*x)*0.9;
          sw=Math.max(.5,img.width*(1/(half*2))*(180/Math.PI)/Math.sqrt(R*R-x*x)*.5);
          g.globalAlpha=.97;
          g.drawImage(img,Math.max(0,Math.min(img.width-sw,u*img.width-sw/2)),0,sw,img.height,cx+x,cy-h/2,.7,h);
        }
      }
      g.globalAlpha=1;g.restore();
    }
    /* bayangan tepi dan kilau kaca */
    var e=g.createRadialGradient(cx,cy,R*.55,cx,cy,R);e.addColorStop(0,"rgba(5,20,70,0)");e.addColorStop(1,"rgba(5,20,70,.55)");
    g.fillStyle=e;g.beginPath();g.arc(cx,cy,R,0,Math.PI*2);g.fill();
    var s=g.createRadialGradient(cx-R*.38,cy-R*.45,0,cx-R*.38,cy-R*.45,R*.5);s.addColorStop(0,"rgba(255,255,255,.85)");s.addColorStop(1,"rgba(255,255,255,0)");
    g.fillStyle=s;g.beginPath();g.arc(cx,cy,R,0,Math.PI*2);g.fill();
    g.strokeStyle="rgba(170,235,255,.85)";g.lineWidth=1.2;g.beginPath();g.arc(cx,cy,R,0,Math.PI*2);g.stroke();
  }
  function frame(now){raf=0;var dt=Math.min(.05,(now-last)/1000||.016);last=now;
    if(diam()){rot=0;draw();return;}
    rot=(rot+360/9*dt)%360;draw();raf=requestAnimationFrame(frame);}
  function start(){if(raf)return;last=performance.now();raf=requestAnimationFrame(frame);}
  function sync(){if(diam()){cancelAnimationFrame(raf);raf=0;rot=0;draw();}else start();}
  img.onload=function(){ok=true;box.classList.add("bola");box.appendChild(cv);sync();};
  img.onerror=function(){};
  img.src="logo-bola.png";
  try{new MutationObserver(sync).observe(d,{attributes:true,attributeFilter:["class"]});}catch(e){}
  document.addEventListener("visibilitychange",function(){if(document.hidden){cancelAnimationFrame(raf);raf=0;}else sync();});
})();
