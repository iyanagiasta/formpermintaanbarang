/* tanya.js: chatbot "Tanya Gudang" TANPA AI. Memahami kalimat lewat aturan (kata pengisi, salah ketik, ukuran, sinonim),
   lalu menjawab dari data asli: barang, stok, jatah proyek, PO, paket, dan BPB. Hanya membaca data (kecuali mencatat pertanyaan yang gagal). */
(function(){
var API_URL="https://script.google.com/macros/s/AKfycbyVPrhw3xmk8D-73kgZQlesBB_1M6-Pc6vv3IUFMpa8jZx9bZmfGhzf_IFjKe3ZuYOMVw/exec";
var app=document.getElementById("app"),KODE="",BAR=[],BYK={},SUMB=["Bekas","Moka","Accurate"],OTO=["Moka","Accurate"];
var AI_OFF=false,RAKOK=false,NETOK=false,TANPA=[],BOT_OK=null,BOT_P=null,PROY_P=null,SINO_SRV={},USER_NAMA="",DET={},INFO={},PAKET=null,PROY=null,PTOK=[],terakhir=null,chat=null;
function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function fq(n){n=Number(n)||0;return (Math.round(n*100)/100).toString().replace(".",",")}
function ls(k,v){try{if(v===undefined)return localStorage.getItem(k);if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v)}catch(e){return null}}
var UJI=/[?&]uji=1/.test(location.search),LOGMS=[];
function catatMs(nama,ms){if(!UJI)return;LOGMS.push(nama+" "+Math.round(ms)+" ms");var e=document.getElementById("uji");if(!e){e=document.createElement("pre");e.id="uji";e.style.cssText="margin:10px 14px;padding:10px;font:12px/1.5 monospace;white-space:pre-wrap;border:1px dashed #888;border-radius:8px;color:inherit";document.body.appendChild(e)}e.textContent="UJI KECEPATAN (waktu tunggu server)\n"+LOGMS.join("\n")}
async function api(b){b.kode=b.kode===undefined?KODE:b.kode;var t0=performance.now(),nm=b.action+(b.jenis?":"+b.jenis:"");var r=await fetch(API_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(b)});var j=await r.json();catatMs(nm,performance.now()-t0);return j}
function bot(jenis,x){x=x||{};x.action="bot";x.jenis=jenis;return api(x)}

/* ===== PEMAHAM TEKS ===== */
var STOP=("bekas keluar keluarnya diserahkan dipesan pesanan datang masuk baru diterima kapan terakhir sedang estimasi bulan minggu material materialnya bahan-bahan kebutuhannya stok stock bebasnya dimana mana lokasi letak rak ditaruh disimpan simpan taruh berapa ada apa sisa yang di untuk buat tolong cek cari minta info informasi barang nya ya dong kah itu ini masih punya dipakai dipake dipakainya proyek bebas jumlah tersedia gudang mau tahu tau lihat tampilkan boleh bisa saya kami kita pak bu mas mbak kalau kalo berapakah apakah lagi ke dari dengan pada atau adakah sedia tersisa tinggal sih deh aja saja gak ga nggak enggak tidak belum sudah butuh perlu pakai pake memakai jatah alokasi dialokasikan kebutuhan ambil pesan keluarkan bawa cukup pcs batang unit roll kaleng buah biji btg bh rumah set paket bahan").split(" ");
var SINO={knee:["elbow"],siku:["elbow"],kni:["elbow"],sok:["socket"],sock:["socket"],kran:["keran"],meteran:["meter"],wm:["water","meter"],gv:["gate","valve"],paralon:["pipa"],pralon:["pipa"],lakban:["seal","tape"],sealtape:["seal","tape"]};
var USER={};try{USER=JSON.parse(ls("tg_sino")||"{}")}catch(e){}
function norm(s){
  s=" "+String(s).toLowerCase()+" ";
  s=s.replace(/\b(projek|proyeknya|projeknya)\b/g,"proyek");
  s=s.replace(/(\d+(?:[.,]\d+)?(?:\/\d+)?)\s*(?:"|”|“|''|inch|inchi|inci|in)(?![a-z])/g,"$1in");
  s=s.replace(/(\d+(?:[.,]\d+)?)\s*(mm|gr|cm)(?![a-z])/g,"$1$2");
  s=s.replace(/[?!,;:()]/g," ").replace(/\s+/g," ").trim();
  return s.split(" ").filter(Boolean);
}
function adaAngka(t){return /\d/.test(t)}
function dist(a,b){if(Math.abs(a.length-b.length)>2)return 9;var m=a.length,n=b.length,d=[],i,j;for(i=0;i<=m;i++)d[i]=[i];for(j=0;j<=n;j++)d[0][j]=j;
  for(i=1;i<=m;i++)for(j=1;j<=n;j++){d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
    if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])d[i][j]=Math.min(d[i][j],d[i-2][j-2]+1)}return d[m][n]}
function sama(q,t){if(q===t)return true;if(/^[\d.\/]+$/.test(q))return t.replace(/(in|mm|gr|cm)$/,"")===q;return false}
function cocokToken(q,t){
  if(q===t)return 1;
  if(adaAngka(q)||adaAngka(t))return sama(q,t)?1:0;
  if(q.length>=3&&t.indexOf(q)===0)return .9;
  var mx=q.length>=7?2:q.length>=4?1:0;
  return (mx&&dist(q,t)<=mx)?.75:0;
}
function bersih(tok){
  var out=[];
  tok.forEach(function(t){
    if(STOP.indexOf(t)>=0)return;
    var m=SINO[t]||SINO_SRV[t]&&[SINO_SRV[t]]||USER[t];
    if(m){m.forEach(function(x){out.push(x)});return}
    out.push(t);
  });
  return out;
}
function skorTeks(qt,nt){
  if(!qt.length)return{cov:0,skor:0};
  var qa=qt.filter(adaAngka),ta=nt.filter(adaAngka),cocok=0,hit=0;
  if(qa.length&&ta.length&&qa.some(function(x){return !ta.some(function(y){return sama(x,y)})}))return{cov:0,skor:0};
  qt.forEach(function(q){var best=0;nt.forEach(function(t){var c=cocokToken(q,t);if(c>best)best=c});cocok+=best;if(best>0&&!adaAngka(q))hit++});
  if(!hit)return{cov:0,skor:0};
  var cov=cocok/qt.length,prec=cocok/Math.max(1,nt.length);
  return{cov:cov,skor:cov*.85+prec*.15};
}
function cari(qt){
  var out=[];
  for(var i=0;i<BAR.length;i++){var b=BAR[i],s=skorTeks(qt,b.tok);if(s.cov>=.6)out.push({b:b,cov:s.cov,skor:s.skor+(b.total>0?.02:0)})}
  return out.sort(function(a,b){return b.skor-a.skor});
}
function tidakDikenal(qt){
  return qt.filter(function(t){return !adaAngka(t)&&!BAR.some(function(b){return b.tok.some(function(y){return cocokToken(t,y)>0})})});
}

/* ===== TAMPILAN ===== */
function add(cls,html){var d=document.createElement("div");d.className="tq-m "+cls;d.innerHTML=html;chat.appendChild(d);chat.scrollTop=chat.scrollHeight;return d}
function status(b,bebas){var tot=b.total;if(b.neto<0)return ["Kurang","bad"];return bebas<=0?["Habis","bad"]:bebas<=Math.max(3,Math.round(tot*.1))?["Menipis","warn"]:["Aman","ok"]}
function chips(list,fn){
  var w=document.createElement("div");w.className="tq-chips";
  list.forEach(function(x){var c=document.createElement("button");c.type="button";c.className="tq-chip";c.textContent=x.label;c.onclick=function(){fn(x)};w.appendChild(c)});
  return w;
}
async function detail(b){
  if(DET[b.key])return DET[b.key];
  var d={alok:[],tercadang:0,bebas:b.bebas,total:b.total,q:b.q,ada:false};
  try{
    var r=await api({action:"cari",q:b.kode});
    if(r.ok){var h=(r.data||[]).filter(function(x){return String(x.kode).trim().toUpperCase()===b.key})[0];
      if(h){d={alok:h.alok||[],tercadang:h.tercadang||0,bebas:h.bebas,total:h.total,q:h.q,ada:true,alokTotal:h.alokTotal||0};if(r.sumber)SUMB=r.sumber;if(r.otomatis&&r.otomatis.length)OTO=r.otomatis}}
  }catch(e){}
  DET[b.key]=d;return d;
}
async function infoPo(b){
  if(INFO[b.key])return INFO[b.key];
  var o={po:[],setara:[],rak:null,alok:[],tercadang:0,butuh:[],masuk:null,tahu:false};
  if(BOT_OK===false)return o;
  try{var r=await bot("info",{kodes:[b.kode]});
    if(r&&r.ok){o={po:(r.po&&r.po[b.key])||[],setara:(r.setara&&r.setara[b.key])||[],rak:(r.rak&&r.rak[b.key])||null,alok:(r.alok&&r.alok[b.key])||[],tercadang:(r.tercadang&&r.tercadang[b.key])||0,butuh:(r.butuh&&r.butuh[b.key])||[],masuk:(r.masuk&&r.masuk[b.key])||null,tahu:true};if(r.net&&r.net[b.key]!==undefined){b.neto=r.net[b.key];b.bebas=Math.max(0,b.neto)}if(r.tanpaRab)TANPA=r.tanpaRab;INFO[b.key]=o}}catch(e){}
  return o;
}
function poBaris(p){
  return esc(p.po||"PO")+(p.supplier?" ("+esc(p.supplier)+")":"")+(p.tanggal?", tgl "+esc(p.tanggal):"")+": belum datang <b>"+fq(p.sisa)+"</b> dari "+fq(p.dipesan)+(p.ppbj?" · untuk "+esc(p.ppbj)+(p.proyek?" - "+esc(p.proyek):""):(p.proyek?" · untuk "+esc(p.proyek):""))+(p.estimasi?" · perkiraan datang "+esc(p.estimasi):"");
}
function poHtml(o){
  if(o.po.length)return '<div class="tq-po"><b>Sudah dipesan, belum datang:</b><br>'+o.po.map(poBaris).join("<br>")+'</div>';
  return '<div class="tq-po"><b>Belum ada pesanan</b> yang menunggu datang untuk barang ini. Sampaikan ke Pengadaan bila dibutuhkan.</div>';
}
function masukHtml(m,sat){
  return m?'<div class="tq-po"><b>Terakhir masuk (30 hari terakhir):</b><br>'+fq(m.qty)+' '+esc(sat||"")+', terakhir '+esc(m.tanggal)+(m.ref?" · "+esc(m.ref):"")+(m.proyek?" · untuk "+esc(m.proyek):"")+(m.n>1?" ("+m.n+" penerimaan)":"")+'</div>'
    :'<div class="tq-po"><b>Tidak ada penerimaan</b> barang ini dalam 30 hari terakhir.</div>';
}
var askLok=false,askProy=false,askPesan=false,askMasuk=false;
function lokTeks(rak){return rak?(rak.gudang?esc(rak.gudang)+", ":"")+"Rak "+esc(rak.rak):""}
function kartu(b,d,rak,sementara){
  var st=status(b,d.bebas),h='<p class="tq-nm">'+esc(b.nama)+'</p><p class="tq-sm">'+esc(b.kode)+' · '+esc(b.sat||"")+'</p>';
  if(rak!==undefined)h+='<div class="tq-row"><span>Lokasi</span><b>'+(rak?lokTeks(rak):'<span class="tq-sm">belum tercatat</span>')+'</b></div>';
  var q=d.q||b.q;
  h+='<div class="tq-row"><span>Stok aktual di gudang</span><b>'+fq(d.total)+' '+esc(b.sat||"")+'</b></div>';
  SUMB.forEach(function(sn,i){if(q[i])h+='<div class="tq-row tq-sm"><span>&nbsp;&nbsp;Stok '+esc(sn)+'</span><span>'+fq(q[i])+' '+esc(b.sat||"")+'</span></div>'});
  if(sementara){}
  else if(d.alok.length)d.alok.forEach(function(a){h+='<div class="tq-row"><span>Dikunci (alokasi): '+esc(a.ppbj)+(a.ket?" - "+esc(a.ket):"")+(a.status==="Ditunda Sebentar"?" (ditunda)":"")+'</span><b>'+fq(a.qty)+' '+esc(b.sat||"")+'</b></div>'});
  else h+='<div class="tq-row"><span>Dikunci (alokasi)</span><b>Tidak ada</b></div>';
  if(!sementara&&d.tercadang>0)h+='<div class="tq-row"><span>Sudah diminta (belum diserahkan)</span><b>'+fq(d.tercadang)+' '+esc(b.sat||"")+'</b></div>';
  if(!sementara&&d.po&&d.po.length){var tp=0;d.po.forEach(function(x){tp+=x.sisa});
    h+='<div class="tq-row"><span>Sedang dipesan<br><span class="tq-sm">'+d.po.slice(0,3).map(function(x){return esc(x.po||"PO")+(x.supplier?" ("+esc(x.supplier)+")":"")+(x.ppbj?" · untuk "+esc(x.ppbj):"")+(x.estimasi?" · perkiraan datang "+esc(x.estimasi):"")}).join("<br>")+(d.po.length>3?"<br>dan "+(d.po.length-3)+" PO lain":"")+'</span></span><b>'+fq(tp)+' '+esc(b.sat||"")+'</b></div>'}
  if(!sementara&&d.masuk)h+='<div class="tq-row"><span>Terakhir masuk<br><span class="tq-sm">'+esc(d.masuk.tanggal)+(d.masuk.ref?" · "+esc(d.masuk.ref):"")+'</span></span><b>'+fq(d.masuk.qty)+' '+esc(b.sat||"")+'</b></div>';
  var bt=(d.butuh||[]).filter(function(x){return x.sisa>0});
  if(!sementara&&d.butuh){
    bt.forEach(function(x){h+='<div class="tq-row"><span>Butuh proyek: '+esc(x.ppbj)+(x.ket?" - "+esc(x.ket):"")+(x.status==="Ditunda Sebentar"?" (ditunda)":"")+'<br><span class="tq-sm">kebutuhan '+fq(x.rab)+' − diserahkan '+fq(x.serah)+' − dialokasi '+fq(x.alok)+(x.minta?' − sudah diminta '+fq(x.minta):'')+'</span></span><b>sisa '+fq(x.sisa)+' '+esc(b.sat||"")+'</b></div>'});
    if(!bt.length&&(d.butuh||[]).length)h+='<div class="tq-row"><span>Kebutuhan proyek</span><b>Sudah terpenuhi</b></div>';
  }
  var nt=b.neto!==undefined?b.neto:d.bebas,ib=SUMB.indexOf("Bekas"),qb=ib>=0?(q[ib]||0):0;
  h+='<div class="tq-bebas"><span>Stok bebas</span><b class="tq-'+st[1]+'">'+(nt<0?'Kurang '+fq(-nt):fq(Math.max(0,d.bebas)))+' '+esc(b.sat||"")+'</b><span class="tq-tag tq-'+st[1]+'">'+st[0]+'</span></div>';
  if(nt<=0&&qb>0&&OTO.indexOf("Bekas")<0)h+='<p class="tq-sm" style="margin-top:4px"><b>Ada stok Bekas '+fq(qb)+' '+esc(b.sat||"")+'.</b> Bekas tidak dihitung sebagai stok bebas dan dipilih manual oleh gudang saat penyerahan.</p>';
  var oto=OTO.join(" + ");
  h+='<p class="tq-sm" style="margin-top:4px">Stok bebas = '+esc(oto)+' dikurangi alokasi, yang sudah diminta, dan sisa kebutuhan proyek aktif (dari rincian material PPBJ)'+(SUMB.indexOf("Bekas")>=0&&OTO.indexOf("Bekas")<0&&q[SUMB.indexOf("Bekas")]?' (stok Bekas tidak dihitung)':'')+'.</p>';
  if(!sementara&&TANPA.length)h+='<p class="tq-sm" style="margin-top:4px">Belum ada rincian material PPBJ untuk: '+TANPA.slice(0,5).map(function(x){return esc(x.ppbj)+(x.ket?" - "+esc(x.ket):"")}).join("; ")+(TANPA.length>5?" dan "+(TANPA.length-5)+" lainnya":"")+'. Kebutuhan proyek itu belum terhitung.</p>';
  return h;
}
async function tampil(b,qty){
  terakhir=b;
  var lokalD={alok:[],tercadang:0,bebas:b.bebas,total:b.total,q:b.q};
  var el=add("tq-b",kartu(b,lokalD,RAKOK?b.rak:undefined,true)+'<p class="tq-sm" style="margin-top:6px">Memeriksa jatah proyek dan lokasi rak...</p>');
  try{await BOT_P}catch(e){}
  var info=await infoPo(b),d;
  if(info.tahu)d={alok:info.alok,tercadang:info.tercadang,butuh:info.butuh,po:info.po,masuk:info.masuk,bebas:b.bebas,total:b.total,q:b.q};
  else{d=await detail(b);info={po:[],setara:[],rak:undefined,tahu:false}}
  var st=status(b,d.bebas),bebas=Math.max(0,d.bebas),h="";
  var rakF=RAKOK?b.rak:(info.tahu?info.rak:undefined);
  if(askLok&&rakF!==undefined)h+=rakF?'<p class="tq-nm">Lokasi: '+lokTeks(rakF)+'</p>':'<p class="tq-nm">Lokasi rak belum tercatat</p><p class="tq-sm">Minta gudang mencatatnya lewat opname atau menu label.</p>';
  if(askProy&&info.tahu){
    var pr={};(d.alok||[]).forEach(function(a){pr[a.ppbj]=pr[a.ppbj]||{ppbj:a.ppbj,ket:a.ket};pr[a.ppbj].alok=a.qty});
    (d.butuh||[]).forEach(function(x){pr[x.ppbj]=pr[x.ppbj]||{ppbj:x.ppbj,ket:x.ket};pr[x.ppbj].rab=x.rab;pr[x.ppbj].sisa=x.sisa});
    var pl=Object.keys(pr).map(function(k){return pr[k]});
    h+='<p class="tq-nm">Untuk proyek apa saja</p>'+(pl.length?pl.map(function(x){return '<div class="tq-row"><span>'+esc(x.ppbj)+(x.ket?" - "+esc(x.ket):"")+'</span><b>'+(x.rab>0?'butuh '+fq(x.rab)+(x.sisa>0?', sisa '+fq(x.sisa):', terpenuhi'):'')+(x.alok?(x.rab>0?"; ":"")+'jatah '+fq(x.alok):'')+' '+esc(b.sat||"")+'</b></div>'}).join(""):'<p class="tq-sm">Belum ada proyek aktif yang membutuhkan atau menjatah barang ini.</p>')+'<hr class="tq-hr">';
  }
  if(askPesan&&info.tahu)h+=poHtml(info);
  if(askMasuk&&info.tahu)h+=masukHtml(info.masuk,b.sat);
  h+=kartu(b,d,rakF);
  if(info.tahu&&!askPesan&&!info.po.length&&(st[1]!=="ok"||(qty&&qty>bebas)))h+=poHtml(info);
  if(qty){var k=qty-bebas;h+=k<=0?'<div class="tq-verd tq-ok"><span>Butuh '+fq(qty)+' '+esc(b.sat||"")+'</span><b>Cukup</b><span class="tq-sm">sisa '+fq(bebas-qty)+'</span></div>':'<div class="tq-verd tq-bad"><span>Butuh '+fq(qty)+' '+esc(b.sat||"")+'</span><b>Kurang '+fq(k)+'</b></div>'}
  el.innerHTML=h;chat.scrollTop=chat.scrollHeight;
  if(info.tahu&&(st[1]==="bad"||(qty&&qty>bebas))){
    var l=info.setara.map(function(x){var o=BYK[String(x.kode).trim().toUpperCase()];return{label:x.nama+(o?" (bebas "+fq(o.bebas)+")":""),b:o,cat:x.catatan}}).filter(function(x){return x.b});
    if(l.length){el.insertAdjacentHTML("beforeend",'<p class="tq-sm" style="margin-top:6px">Yang bisa jadi pengganti:</p>');el.appendChild(chips(l,function(x){add("tq-u",esc(x.b.nama));tampil(x.b).then(function(){if(x.cat)chat.lastChild.insertAdjacentHTML("beforeend",'<p class="tq-sm" style="margin-top:6px">Catatan: '+esc(x.cat)+'</p>')})}))}
    else if(st[1]==="bad")el.insertAdjacentHTML("beforeend",'<p class="tq-sm" style="margin-top:6px">Belum ada barang pengganti yang terdaftar.</p>');
  }
  if(bebas>0&&b.kode){
    var n=qty?Math.min(qty,bebas):0;
    el.appendChild(chips([{label:"Buat permintaan barang ini"}],function(){add("tq-b","<p>Membuka form Permintaan Barang dengan <b>"+esc(b.nama)+"</b>"+(n?" sebanyak <b>"+fq(n)+" "+esc(b.sat||"")+"</b>":"")+". Periksa lagi sebelum dikirim.</p>");setTimeout(function(){location.href="index.html?dari=bot&isi="+encodeURIComponent(String(b.kode).trim()+":"+(n||""))},500)}));
  }
  chat.scrollTop=chat.scrollHeight;
  return el;
}
async function pilih(b,qty){add("tq-u",esc(b.nama));await tampil(b,qty)}

/* ===== PAKET, PROYEK, BPB ===== */
async function muatPaket(){try{await BOT_P}catch(e){}return PAKET||[]}
async function muatProyek(){try{await BOT_P}catch(e){}try{await PROY_P}catch(e){}return PROY||[]}
function jawabPaket(pk,n){
  var h='<p class="tq-nm">'+esc(pk.nama)+' x '+n+'</p><p class="tq-sm">Bahan yang dibutuhkan / stok bebas:</p>',kurang=[];
  pk.items.forEach(function(r){
    var b=BYK[String(r.kode).trim().toUpperCase()],perlu=r.qty*n,bebas=b?Math.max(0,b.bebas):0,ok=bebas>=perlu;
    if(!ok)kurang.push({b:b,nama:r.nama,sat:r.satuan,k:perlu-bebas});
    h+='<div class="tq-row"><span>'+esc(r.nama)+'</span><b class="tq-'+(ok?"ok":"bad")+'">'+fq(perlu)+' / '+fq(bebas)+(ok?" ✓":" kurang "+fq(perlu-bebas))+'</b></div>';
  });
  h+=kurang.length?'<div class="tq-verd tq-bad"><span>Hasil</span><b>'+kurang.length+' barang kurang</b></div>':'<div class="tq-verd tq-ok"><span>Hasil</span><b>Semua cukup</b></div>';
  var el=add("tq-b",h);
  if(kurang.length){
    var t=kurang.map(function(k){return k.nama+" kurang "+fq(k.k)+" "+k.sat}).join("\n"),ch=[{label:"Salin daftar kekurangan"}];
    el.appendChild(chips(ch,function(){try{navigator.clipboard.writeText(t).then(function(){add("tq-b","<p>Daftar kekurangan tersalin.</p>")},function(){add("tq-b","<p>Salin manual:<br>"+esc(t).replace(/\n/g,"<br>")+"</p>")})}catch(e){add("tq-b","<p>Salin manual:<br>"+esc(t).replace(/\n/g,"<br>")+"</p>")}}));
    // kabar PO barang yang kurang (maks 5)
    var kk=kurang.filter(function(k){return k.b}).slice(0,5);
    if(kk.length)bot("info",{kodes:kk.map(function(k){return k.b.kode})}).then(function(r){
      if(!r.ok)return;var s="";kk.forEach(function(k){var p=(r.po&&r.po[k.b.key])||[];s+='<p class="tq-sm" style="margin-top:6px">'+esc(k.nama)+": "+(p.length?"sudah dipesan "+esc(p[0].po||"PO")+", belum datang "+fq(p[0].sisa):"belum ada pesanan")+".</p>"});
      el.insertAdjacentHTML("beforeend",s);
    }).catch(function(){});
  }
}
function iso(d){return d.getFullYear()+"-"+("0"+(d.getMonth()+1)).slice(-2)+"-"+("0"+d.getDate()).slice(-2)}
function periodeDari(low){
  var n=new Date(),m;n.setHours(0,0,0,0);
  if(/\bhari ini\b/.test(low))return{dari:iso(n),label:"hari ini"};
  if(/\bminggu ini\b/.test(low)){var w=new Date(n);w.setDate(n.getDate()-((n.getDay()+6)%7));return{dari:iso(w),label:"minggu ini"}}
  if(/\bbulan ini\b/.test(low))return{dari:iso(new Date(n.getFullYear(),n.getMonth(),1)),label:"bulan ini"};
  if((m=low.match(/(\d{1,3})\s*hari(?: terakhir| lalu)?/))){var x=new Date(n);x.setDate(n.getDate()-(+m[1]));return{dari:iso(x),label:m[1]+" hari terakhir"}}
  return null;
}
function jawabProyek(p,label){
  var h='<p class="tq-nm">'+esc(p.ppbj)+(p.ket?" - "+esc(p.ket):"")+(p.status==="Ditunda Sebentar"?" (ditunda)":"")+'</p>';
  if(p.adaRab!==undefined){
    var ringkas=p.adaRab?(p.nKurang?'<b class="tq-bad">'+p.nKurang+' barang stoknya kurang</b>':"")+(p.nRebutan?(p.nKurang?", ":"")+'<b class="tq-warn">'+p.nRebutan+' barang rebutan dengan proyek lain</b>':"")||'<b class="tq-ok">Semua kebutuhan tercukupi stok</b>':"";
    h+='<p class="tq-sm">Material proyek (rincian material PPBJ). Keluar'+(label?" "+esc(label):" (semua waktu)")+':</p>'+(ringkas?'<p class="tq-sm">'+ringkas+'</p>':"");
    if(!p.adaRab)h+='<p class="tq-sm">Proyek ini belum punya rincian material PPBJ. Yang tampil hanya barang yang sudah keluar, dijatah, atau sudah diminta.</p>';
    var ib=SUMB.indexOf("Bekas");
    p.items.forEach(function(i){
      var sat=" "+esc(i.satuan||""),kls={Kurang:"bad",Rebutan:"warn",Cukup:"ok",Terpenuhi:"ok"}[i.status]||"";
      var kanan=i.rab>0?(i.status==="Terpenuhi"?"terpenuhi":"sisa "+fq(i.sisa)+sat):(i.diluar?"tidak ada di rincian PPBJ":(i.alok>0?"jatah "+fq(i.alok)+sat:"tidak ada jatah"));
      var tag=i.status==="Kurang"?"Kurang "+fq(i.kurang)+sat:i.status==="Rebutan"?"Rebutan":i.status==="Cukup"?"Stok cukup":"";
      var bk=BYK[String(i.kode).trim().toUpperCase()],adaBk=i.status==="Kurang"&&bk&&ib>=0&&bk.q[ib]>0?'<br><span class="tq-sm">ada bekas '+fq(bk.q[ib])+sat+' (tidak dihitung)</span>':"";
      var sub=[];if(i.rab>0)sub.push("butuh "+fq(i.rab));
      sub.push("keluar "+fq(i.keluar)+(i.keluarBekas?" (termasuk "+fq(i.keluarBekas)+" dari stok Bekas)":"")+(i.tgl?", terakhir "+esc(i.tgl):""));
      if(i.diminta)sub.push("sudah diminta "+fq(i.diminta));
      if(i.alok)sub.push("dialokasi "+fq(i.alok));
      h+='<div class="tq-row"><span>'+esc(i.nama)+'<br><span class="tq-sm">'+sub.join(" · ")+'</span></span><b>'+kanan+(tag?'<br><span class="tq-tag tq-'+kls+'">'+tag+'</span>':"")+adaBk+'</b></div>';
    });
    if(p.dugaan&&p.dugaan.length){
      h+='<p class="tq-sm" style="margin-top:8px"><b>Diduga untuk proyek ini</b> (penyerahan tanpa nomor PPBJ; dicocokkan dari alasan permintaan, tidak dijumlahkan ke angka di atas):</p>';
      p.dugaan.forEach(function(d){h+='<div class="tq-row"><span>'+esc(d.nama)+'<br><span class="tq-sm">'+d.nDok+' dokumen'+(d.tgl?", terakhir "+esc(d.tgl):"")+(d.bekas?" · termasuk "+fq(d.bekas)+" dari stok Bekas":"")+'</span></span><b>keluar '+fq(d.qty)+' '+esc(d.satuan||"")+'</b></div>'});
    }
    add("tq-b",h+'<p class="tq-sm" style="margin-top:6px">Stok dihitung dari Moka + Accurate. Ketik nama barangnya untuk melihat rinciannya. Bisa juga tambahkan "bulan ini", "minggu ini", atau "30 hari" untuk melihat yang keluar pada periode itu.</p>');
    return;
  }
  h+='<p class="tq-sm">Barang yang dijatah untuk proyek ini:</p>';
  p.items.forEach(function(i){h+='<div class="tq-row"><span>'+esc(i.nama)+'</span><b>'+fq(i.qty)+' '+esc(i.satuan||"")+'</b></div>'});
  add("tq-b",h+'<p class="tq-sm" style="margin-top:6px">Ketik nama barangnya untuk melihat stok bebas.</p>');
}
async function jawabProyekPeriode(p,per){
  if(!per)return jawabProyek(p);
  var r=null;try{r=await bot("proyek",{dari:per.dari})}catch(e){r=null}
  var q2=r&&r.ok&&r.data?r.data.filter(function(x){return x.ppbj===p.ppbj})[0]:null;
  jawabProyek(q2||p,q2?per.label:"");
}
async function jawabDaftar(jenis){
  if(BOT_OK===false){add("tq-b","<p>Fitur ini butuh Bot.gs terbaru di server.</p>");return}
  var r=null;try{r=await bot(jenis)}catch(e){r=null}
  if(!r||!r.ok){add("tq-b","<p>Gagal membaca datanya. Coba lagi sebentar.</p>");return}
  var L=(r.data||[]).slice(0,20),h="";
  if(jenis==="pesan"){
    if(!L.length){add("tq-b","<p>Tidak ada barang yang sedang dipesan (semua PO sudah datang).</p>");return}
    h='<p class="tq-nm">Sedang dipesan, belum datang</p><p class="tq-sm">'+r.total+' barang. Yang jumlah belum datangnya terbanyak di atas.</p>';
    L.forEach(function(x){var p0=x.po[0]||{};h+='<div class="tq-row"><span>'+esc(x.nama)+'<br><span class="tq-sm">'+esc(p0.po||"PO")+(p0.supplier?" ("+esc(p0.supplier)+")":"")+(p0.ppbj?" · untuk "+esc(p0.ppbj):"")+(p0.estimasi?" · perkiraan datang "+esc(p0.estimasi):"")+(x.po.length>1?" · +"+(x.po.length-1)+" PO lain":"")+'</span></span><b>'+fq(x.sisa)+' '+esc(x.satuan||"")+'</b></div>'});
  }else{
    if(!L.length){add("tq-b","<p>Tidak ada barang masuk dalam 30 hari terakhir.</p>");return}
    h='<p class="tq-nm">Barang masuk 30 hari terakhir</p><p class="tq-sm">'+r.total+' barang, yang terbaru di atas.</p>';
    L.forEach(function(x){h+='<div class="tq-row"><span>'+esc(x.nama)+'<br><span class="tq-sm">'+esc(x.tanggal)+(x.ref?" · "+esc(x.ref):"")+(x.proyek?" · untuk "+esc(x.proyek):"")+'</span></span><b>'+fq(x.qty)+' '+esc(x.satuan||"")+'</b></div>'});
  }
  if(r.total>L.length)h+='<p class="tq-sm">dan '+(r.total-L.length)+' barang lain. Sebutkan nama barangnya untuk melihat rinciannya.</p>';
  add("tq-b",h);
}
var CATBEKAS='<p class="tq-sm" style="margin-top:6px">Bekas dipilih manual oleh gudang saat penyerahan. Kondisi barang bekas belum tercatat di sistem.</p>';
function bekasQ(b){var i=SUMB.indexOf("Bekas");return i>=0?(b.q[i]||0):0}
function jawabBekasDaftar(){
  var L=BAR.filter(function(b){return bekasQ(b)>0}).sort(function(a,b){return bekasQ(b)-bekasQ(a)});
  if(!L.length){add("tq-b","<p><b>Tidak ada stok material bekas di gudang.</b></p>");return}
  var h='<p class="tq-nm">Stok barang bekas di gudang</p><p class="tq-sm">'+L.length+' barang, yang terbanyak di atas.</p>';
  L.slice(0,20).forEach(function(b){h+='<div class="tq-row"><span>'+esc(b.nama)+'<br><span class="tq-sm">'+esc(b.kode)+'</span></span><b>'+fq(bekasQ(b))+' '+esc(b.sat||"")+'</b></div>'});
  if(L.length>20)h+='<p class="tq-sm">dan '+(L.length-20)+' barang lain. Sebutkan nama barangnya untuk melihat rinciannya.</p>';
  add("tq-b",h+CATBEKAS);
}
function bekasKartu(b,qty){
  var q=bekasQ(b),h='<p class="tq-nm">'+esc(b.nama)+'</p><p class="tq-sm">'+esc(b.kode)+' · '+esc(b.sat||"")+'</p>';
  if(q<=0){add("tq-b",h+'<p><b>Tidak ada stok bekas</b> untuk barang ini di gudang.</p>');return}
  h+='<div class="tq-bebas"><span>Stok bekas</span><b class="tq-ok">'+fq(q)+' '+esc(b.sat||"")+'</b></div>';
  if(qty)h+=qty<=q?'<div class="tq-verd tq-ok"><span>Butuh '+fq(qty)+' '+esc(b.sat||"")+'</span><b>Cukup dari bekas</b><span class="tq-sm">sisa '+fq(q-qty)+'</span></div>':'<div class="tq-verd tq-bad"><span>Butuh '+fq(qty)+' '+esc(b.sat||"")+'</span><b>Bekas kurang '+fq(qty-q)+'</b></div>';
  add("tq-b",h+CATBEKAS);
}
var TAHAP={"Menunggu PIC":1,"Menunggu Atasan":2,"Menunggu Staff Gudang":3,"Menunggu Manager Gudang":4,"Siap Diserahkan":5,"Ditolak":-1};
async function jawabBpb(){
  if(!USER_NAMA){S.tunggu=true;add("tq-b","<p>Siapa nama Anda? Ketik nama (atau sebagian nama) seperti di formulir permintaan.</p>");return}
  var r;try{r=await bot("bpb",{nama:USER_NAMA})}catch(e){add("tq-b","<p>Gagal terhubung ke server.</p>");return}
  if(!r.ok){add("tq-b","<p>"+esc(r.msg||"Gagal.")+"</p>");USER_NAMA="";ls("sctk_bot_nama",null);return}
  if(!r.data.length){add("tq-b","<p>Belum ada BPB atas nama <b>"+esc(USER_NAMA)+"</b>. Ketik \"nama saya ...\" bila namanya salah.</p>");return}
  var h='<p class="tq-nm">BPB '+esc(USER_NAMA)+'</p>';
  r.data.forEach(function(x){
    var t=TAHAP[x.status]||0,tl=x.diserahkan?6:t,ditolak=t<0,st="";
    for(var i=1;i<=6;i++)st+='<i class="'+(ditolak?"":i<=tl?(i===tl&&!x.diserahkan&&t<5?"c":"d"):"")+'"></i>';
    h+='<div class="tq-row" style="display:block"><b>'+esc(x.nomor||x.id)+'</b> <span class="tq-sm">'+esc(x.tanggal)+'</span><br><span>'+x.items.map(esc).join(", ")+'</span><div class="tq-step">'+st+'</div><span class="'+(ditolak?"tq-bad":"")+'">'+(x.diserahkan?"Sudah diserahkan "+esc(x.diserahkan):esc(x.status))+'</span></div>';
  });
  add("tq-b",h+'<p class="tq-sm" style="margin-top:6px">Ketik "nama saya ..." untuk mengganti nama.</p>');
}

/* ===== PENGURAI PERTANYAAN ===== */
var S={tunggu:false};
var KATA_QTY=/\b(butuh|perlu|minta|ambil|mau|cukup|pesan|kebutuhan|pakai|pake|keluarkan|bawa)\b/;
function catatGagal(t){bot("catat",{teks:t}).catch(function(){})}
async function jawabSatu(teks,prev){
  var per=periodeDari(teks.toLowerCase());
  if(per)teks=teks.replace(/(hari ini|minggu ini|bulan ini|\d{1,3}\s*hari(?: terakhir| lalu)?)/ig," ");
  var raw=norm(teks),low=teks.toLowerCase().trim();
  askLok=/\b(dimana|di mana|lokasi|letak|rak|ditaruh|disimpan|simpan)\b/.test(low);
  askProy=/\b(proyek|projek|ppbj)\b/.test(low);
  askPesan=/\b(dipesan|dipesankan|pesanan|belum datang|kapan datang|akan datang|sudah dipesan|sedang dipesan|po)\b/.test(low);
  askMasuk=/\b(baru masuk|sudah masuk|barang masuk|masuk kapan|terakhir masuk|baru datang|sudah datang|diterima|penerimaan)\b/.test(low);
  var askBekas=/\bbekas\b/.test(low);
  if(S.tunggu&&!/bpb/.test(low)){USER_NAMA=raw.filter(function(t){return t!=="saya"&&t!=="nama"&&t!=="aku"}).join(" ");S.tunggu=false;ls("sctk_bot_nama",USER_NAMA);add("tq-b","<p>Baik, <b>"+esc(USER_NAMA)+"</b>.</p>");return jawabBpb()}
  var mn=low.match(/^(?:nama\s+)?(?:saya|aku)\s+([a-z ]{3,40})$/);
  if(mn&&!/(butuh|perlu|mau|minta|ambil)/.test(low)){USER_NAMA=mn[1].trim();ls("sctk_bot_nama",USER_NAMA);add("tq-b","<p>Baik, <b>"+esc(USER_NAMA)+"</b>. Tanya \"bpb saya sampai mana?\" kapan saja.</p>");return}
  if(/\b(bpb|permintaan|pengajuan)\b/.test(low)&&/(saya|aku|ku\b|status|sampai mana|kemarin)/.test(low))return jawabBpb();
  var qty=0,rc=raw,ia=-1;raw.forEach(function(t,i){if(/^\d+$/.test(t)&&ia<0)ia=i});
  if(ia>=0&&(KATA_QTY.test(low)||/\d+\s*(pcs|batang|unit|roll|kaleng|buah|biji|btg|bh|meter)\b/.test(low))){qty=+raw[ia];rc=raw.filter(function(t,i){return i!==ia})}
  var qt=bersih(rc);
  if(askBekas){
    if(!qt.length)return jawabBekasDaftar();
    var hb=cari(qt).filter(function(h){return h.skor>=.6}).slice(0,8).map(function(h){return h.b});
    if(hb.length){
      var wb=hb.filter(function(b){return bekasQ(b)>0});
      if(!wb.length){add("tq-b","<p><b>Tidak ada stok bekas</b> untuk "+(hb.length===1?"<b>"+esc(hb[0].nama)+"</b>":"barang yang cocok dengan pertanyaan Anda")+" di gudang.</p>"+CATBEKAS);return}
      if(wb.length===1){bekasKartu(wb[0],qty);return}
      var db=add("tq-b","<p>Barang bekas yang ada. Yang mana?</p>");
      db.appendChild(chips(wb.map(function(b){return{label:b.nama+" (bekas "+fq(bekasQ(b))+")",b:b}}),function(x){add("tq-u",esc(x.b.nama));bekasKartu(x.b,qty)}));return;
    }
  }
  if(!qt.length&&askPesan&&!askMasuk)return jawabDaftar("pesan");
  if(!qt.length&&askMasuk)return jawabDaftar("masuk");
  if(!qt.length&&askProy){
    var PRX=await muatProyek();
    if(PRX.length){var dpx=add("tq-b","<p>Proyek mana yang ingin dicek?</p>");
      dpx.appendChild(chips(PRX.slice(0,10).map(function(x){return{label:x.ppbj+(x.ket?" - "+x.ket:""),p:x}}),function(x){add("tq-u",esc(x.label));jawabProyek(x.p)}));return}
  }
  if(!qt.length||/^(halo|hai|hi|hello|p|test|tes|bantuan|help|menu)$/.test(low)){
    var d=add("tq-b","<p>Halo! Saya bisa menjawab:</p><p>• Stok barang dan stok bebasnya, serta proyek yang memakainya<br>• \"Butuh 30 elbow 3 inch\": cukup atau kurang<br>• Bahan satu paket pekerjaan<br>• Kabar pesanan (PO) barang yang kurang dan penggantinya<br>• Status BPB Anda</p>");
    d.appendChild(chips([{label:"stok pipa 3 inch"},{label:"elbow 3 inch di mana"},{label:"butuh 30 elbow 3 inch"},{label:"barang yang stok bebasnya habis"},{label:"bpb saya sampai mana"}],function(x){tanya(x.label)}));return}
  var kataDaftar=/\b(habis|kosong|menipis|tipis|sedikit)\b/.test(low);
  if(kataDaftar){qt=qt.filter(function(t){return !/^(habis|kosong|menipis|tipis|sedikit)$/.test(t)});
    if(!qt.length){
      var l=BAR.filter(function(b){return b.total>0&&b.bebas<=0}).sort(function(a,b){return b.total-a.total}).slice(0,20);
      var h="<p><b>Stok ada, tetapi stok bebasnya habis</b> (semua teralokasi proyek atau sudah diminta). Menampilkan "+l.length+" teratas:</p>";
      l.forEach(function(b){h+='<div class="tq-row"><span>'+esc(b.nama)+'</span><b class="tq-bad">stok '+fq(b.total)+'</b></div>'});
      add("tq-b",l.length?h:"<p>Tidak ada barang yang stok bebasnya habis.</p>");return}}
  var hasil=cari(qt),pk=null,pj=null;
  var P=PAKET||[],PR=PROY||[];
  if(!hasil.length||hasil[0].skor<.75){P=await muatPaket();PR=await muatProyek()}
  P.forEach(function(p){var s=skorTeks(qt,p.tok);if(s.cov>=.6&&(!pk||s.skor>pk.skor))pk={p:p,skor:s.skor}});
  PR.forEach(function(p){var s=skorTeks(qt,p.tok);if(s.cov>=.6&&(!pj||s.skor>pj.skor))pj={p:p,skor:s.skor}});
  var top0=hasil[0]?hasil[0].skor:0;
  if(pk&&pk.skor>top0&&pk.skor>=(pj?pj.skor:0)){return jawabPaket(pk.p,ia>=0?+raw[ia]:1)}
  if(pj&&(pj.skor>top0||(askProy&&pj.skor>=top0-.1))){return jawabProyekPeriode(pj.p,per)}
  if(askProy&&!pj&&!hasil.length&&PR.length&&!/\b(apa saja|apa aja|mana saja)\b/.test(low)){
    var dp=add("tq-b","<p>Proyek mana yang Anda maksud?</p>");
    dp.appendChild(chips(PR.slice(0,10).map(function(x){return{label:x.ppbj+(x.ket?" - "+x.ket:""),p:x}}),function(x){add("tq-u",esc(x.label));jawabProyek(x.p)}));return}
  if(!hasil.length&&prev&&qt.every(adaAngka)){
    var ct=prev.dasar.join(" ")+" "+rc.filter(adaAngka).join(" ");
    if(cari(bersih(norm(ct))).length)return jawabSatu(ct+(qty?" butuh "+qty:""));
    add("tq-b","<p>Tidak ada <b>"+esc(prev.dasar.join(" "))+"</b> ukuran "+esc(rc.join(" "))+" di data.</p>");return;
  }
  if(!hasil.length){
    // cadangan: pencarian server (sudah memakai sinonim sheet)
    var teksCari=qt.filter(function(t){return !adaAngka(t)||qt.length===1}).join(" ")||qt.join(" ");
    if(teksCari.length>=2){
      try{var r=await api({action:"cari",q:teksCari});
        if(r.ok&&r.data&&r.data.length){
          var L=r.data.slice(0,6).map(function(x){var b=BYK[String(x.kode).trim().toUpperCase()];return b?{label:b.nama,b:b}:null}).filter(Boolean);
          if(L.length){var d3=add("tq-b","<p>Saya menemukan barang yang mirip. Maksud Anda yang mana?</p>");d3.appendChild(chips(L,function(x){pilih(x.b,qty)}));return}
        }
      }catch(e){}
    }
    var aiCoba=false,a=null;
    if(BOT_OK!==false&&!AI_OFF){
      aiCoba=true;
      var w=add("tq-b",'<p class="tq-sm">Mencoba memahami dengan bantuan AI...</p>');
      try{a=await bot("ai",{teks:teks})}catch(e){a=null}
      if(w.parentNode)w.parentNode.removeChild(w);
      if(a&&a.ok&&a.tersedia===false&&a.alasan==="tanpa_kunci")AI_OFF=true;
      var LA=((a&&a.tersedia&&a.kode)||[]).map(function(k){return BYK[String(k).trim().toUpperCase()]}).filter(Boolean);
      if(LA.length){
        catatGagal(teks);
        if(a.maksud==="lokasi")askLok=true;
        var qA=qty||a.jumlah||undefined,cat='<p class="tq-sm" style="margin-top:6px">Pertanyaan dipahami dengan bantuan AI. Angka tetap dari data gudang. Salah? Tulis nama barangnya saja.</p>';
        if(LA.length===1){var eA=await tampil(LA[0],qA);if(eA)eA.insertAdjacentHTML("beforeend",cat);return}
        var dA=add("tq-b","<p>Saya kira maksud Anda salah satu ini. Yang mana?</p>"+cat);
        dA.appendChild(chips(LA.map(function(b){return{label:b.nama,b:b}}),function(x){pilih(x.b,qA)}));return;
      }
    }
    catatGagal(teks);
    var ketAi=BOT_OK===false?"Bantuan AI belum aktif (Bot.gs belum terpasang di server).":
      !aiCoba?(AI_OFF?"Bantuan AI belum aktif (kunci belum diisi).":""):a&&a.tersedia===false?({tanpa_kunci:"Bantuan AI belum aktif (kunci belum diisi).",batas:"Bantuan AI hari ini sudah habis jatahnya.",gagal:"Bantuan AI sedang tidak bisa dihubungi, coba lagi sebentar.",pendek:"",sibuk:"Bantuan AI sedang sibuk."}[a.alasan]||"Bantuan AI tidak tersedia."):
      a&&a.tersedia?"AI juga belum yakin barang yang dimaksud.":"Bantuan AI tidak menjawab.";
    add("tq-b","<p>Saya belum menemukan barang itu. Pertanyaan Anda sudah dicatat supaya admin bisa mengajarkannya. Coba tulis nama barangnya saja, misalnya <i>pipa pvc 3 inch</i>.</p>"+(ketAi?'<p class="tq-sm" style="margin-top:6px">'+esc(ketAi)+'</p>':""));
    return}
  var top=hasil[0],ke2=hasil[1];
  if((top.skor>=.75&&(!ke2||ke2.skor<=top.skor-.12))||(!ke2&&top.cov>=.6)){
    var el=await tampil(top.b,qty),asing=tidakDikenal(qt).filter(function(t){return !top.b.tok.some(function(y){return cocokToken(t,y)>0})});
    if(asing.length&&el){el.insertAdjacentHTML("beforeend",'<p class="tq-sm" style="margin-top:6px">Kata <i>'+esc(asing.join(", "))+'</i> tidak saya kenali. Ini barang terdekat.</p>');
      el.appendChild(chips([{label:"Bukan ini"}],function(){catatGagal(teks);add("tq-b","<p>Terima kasih, sudah dicatat. Admin akan menambahkan artinya.</p>")}))}
    return}
  var jml=hasil.length,d4=add("tq-b","<p>Ada "+jml+" barang yang cocok. Maksud Anda yang mana?"+(jml>6?" Tambahkan ukuran atau jenis supaya lebih tepat.":"")+"</p>");
  d4.appendChild(chips(hasil.slice(0,6).map(function(x){return{label:x.b.nama,b:x.b}}),function(x){pilih(x.b,qty)}));
}
function tanya(teks){
  teks=String(teks||"").trim();if(!teks)return;
  add("tq-u",esc(teks));
  var prev=terakhir,bagian=teks.split(/\s+(?:dan|sama|serta|plus)\s+|\s*&\s*|;|\n/).filter(function(x){return x.trim()});
  (async function(){for(var i=0;i<bagian.length;i++){try{await jawabSatu(bagian[i],prev)}catch(e){add("tq-b","<p>Maaf, ada gangguan saat membaca data. Coba lagi.</p>")}}})();
}

/* ===== ADMIN: ajarkan sinonim ===== */
function adminPanel(){
  var pin="";try{pin=sessionStorage.getItem("sctk_admin")||""}catch(e){}
  return '<details class="card tq-adm" id="adm"><summary>Admin: pertanyaan yang belum dipahami</summary><div id="admb"><p class="note">Khusus admin. Pertanyaan yang gagal dikumpulkan di sini; ajarkan satu kata baru lalu tekan Ajarkan.</p><div class="tq-it"><input class="t" id="apin" type="password" placeholder="PIN admin" autocomplete="off" value="'+esc(pin)+'" aria-label="PIN admin"><button type="button" id="amuat">Muat daftar</button></div><div id="alist"></div></div></details>';
}
async function muatGagal(){
  var pin=document.getElementById("apin").value.trim(),w=document.getElementById("alist");
  if(!pin){w.innerHTML='<p class="note">Isi PIN admin.</p>';return}
  w.innerHTML='<p class="note">Memuat...</p>';
  try{var r=await api({action:"bot",jenis:"gagal",pin:pin});
    if(!r.ok){w.innerHTML='<p class="err">'+esc(r.msg||"Gagal.")+'</p>';return}
    if(!r.data.length){w.innerHTML='<p class="note">Tidak ada pertanyaan yang menunggu.</p>';return}
    w.innerHTML="";
    r.data.forEach(function(e){
      var unk=tidakDikenal(bersih(norm(e.teks))),d=document.createElement("div");d.className="tq-it";
      d.innerHTML='<span style="flex:1 0 100%">"'+esc(e.teks)+'" <span class="note">('+e.jumlah+'x)</span></span><input class="t" placeholder="kata" aria-label="Kata" value="'+esc(unk[0]||"")+'"><input class="t" placeholder="sama dengan" aria-label="Sama dengan (satu kata)"><button type="button">Ajarkan</button>';
      var ins=d.querySelectorAll("input"),bt=d.querySelector("button");
      bt.onclick=async function(){
        bt.disabled=true;
        try{var x=await api({action:"bot",jenis:"ajar",pin:pin,kata:ins[0].value,samaDengan:ins[1].value,baris:e.baris});
          if(!x.ok){alert_(d,x.msg||"Gagal.");bt.disabled=false;return}
          try{sessionStorage.setItem("sctk_admin",pin)}catch(z){}
          var s=await api({action:"sinonim"});if(s&&s.ok)SINO_SRV=s.barang||{};
          d.innerHTML='<span class="note">Tersimpan: '+esc(ins[0].value)+' = '+esc(ins[1].value)+'</span>';
        }catch(z){alert_(d,"Gagal terhubung.");bt.disabled=false}
      };
      w.appendChild(d);
    });
  }catch(e){w.innerHTML='<p class="err">Gagal terhubung ke server.</p>'}
}
function alert_(d,m){var p=d.querySelector(".err");if(!p){p=document.createElement("span");p.className="err";p.style.flex="1 0 100%";d.appendChild(p)}p.textContent=m}

/* ===== MASUK DAN MUAT DATA ===== */
function loginView(msg){
  app.innerHTML='<div class="card" style="max-width:380px;margin:30px auto"><p style="margin-top:0"><b>Masukkan kode akses</b></p><div class="note" style="margin-bottom:8px">Tanya stok barang dan status permintaan dengan bahasa sehari-hari. Masukkan kode akses pegawai Anda.</div><input class="t" id="kd" type="password" autocomplete="off" placeholder="Kode akses"><div style="height:10px"></div><button id="go" style="width:100%">Masuk</button><p class="err" id="lerr" style="margin:10px 0 0">'+esc(msg||"")+'</p></div>';
  var i=document.getElementById("kd");i.focus();i.onkeydown=function(e){if(e.key==="Enter")masuk()};document.getElementById("go").onclick=masuk;
}
async function masuk(){
  var v=document.getElementById("kd").value.trim();if(!v)return;
  KODE=v;document.getElementById("go").disabled=true;await mulai(true);
}
async function mulai(dariLogin){
  app.innerHTML='<div class="card note" style="text-align:center">Memuat data barang dan stok...</div>';
  try{
    var rs=await Promise.all([api({action:"barang"}),api({action:"stok"}),api({action:"sinonim"}),bot("rak").catch(function(){return null}),bot("butuh").catch(function(){return null})]);
    var rb=rs[0],rk=rs[1],rn=rs[2],rr=rs[3],rb2=rs[4];var NET={};if(rb2&&rb2.ok===true&&rb2.net){NETOK=true;NET=rb2.net;TANPA=rb2.tanpaRab||[]}RAKOK=!!(rr&&rr.ok===true&&rr.rak);var RM=RAKOK?rr.rak:{};
    if(!rk.ok){KODE="";ls("sctk_kode",null);loginView(rk.msg||"Kode tidak dikenali.");return}
    if(!rb.ok||!rb.items){app.innerHTML='<div class="card err">Gagal memuat daftar barang.</div>';return}
    ls("sctk_kode",KODE);
    if(rk.sumber)SUMB=rk.sumber;if(rk.otomatis&&rk.otomatis.length)OTO=rk.otomatis;
    if(rn&&rn.ok)SINO_SRV=rn.barang||{};
    var sm=rk.data||{};BAR=[];BYK={};
    rb.items.forEach(function(it){
      if(it.jenis==="Jasa")return;
      var key=String(it.kode).trim().toUpperCase(),e=sm[key]||[0,0,0,0],tok=norm(it.nama),q=[e[0]||0,e[1]||0,e[2]||0];
      var b={kode:String(it.kode).trim(),key:key,nama:it.nama,sat:it.satuan,tok:tok,dasar:tok.filter(function(t){return !adaAngka(t)}),q:q,total:q[0]+q[1]+q[2],bebas:Math.max(0,NET[key]!==undefined?NET[key]:(e[3]||0)),neto:NET[key]!==undefined?NET[key]:(e[3]||0),rak:RM[key]?{rak:RM[key][0],gudang:RM[key][1]}:null};
      BAR.push(b);BYK[key]=b;
    });
    USER_NAMA=ls("sctk_bot_nama")||"";
    tampilChat();
    BOT_P=bot("paket").then(function(r){
      BOT_OK=!!(r&&r.ok===true);
      if(BOT_OK){PAKET=r.data||[];PAKET.forEach(function(p){p.tok=norm(p.nama)});
        PROY_P=bot("proyek").then(function(x){PROY=(x&&x.ok)?x.data:[];PROY.forEach(function(p){p.tok=norm(p.ppbj+" "+(p.ket||""))})}).catch(function(){PROY=[]})}
    }).catch(function(){BOT_OK=false});
  }catch(e){KODE="";if(dariLogin)loginView("Gagal terhubung ke server. Periksa internet lalu coba lagi.");else loginView("")}
}
function tampilChat(){
  app.innerHTML='<div class="tq"><div class="tq-chat" id="chat" aria-live="polite"></div>'+
   '<form class="tq-form" id="f" autocomplete="off"><input class="t" id="q" placeholder="Contoh: stok pipa pvc 3 inch" aria-label="Pertanyaan"><button type="button" class="tq-mic" id="mic" aria-label="Bicara"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg></button><button class="tq-send" type="submit">Kirim</button></form>'+
   '<div class="tq-end"><span class="note">Angka diambil dari data stok. AI hanya membantu memahami pertanyaan.</span><button type="button" class="gh" id="lo">Keluar</button></div>'+adminPanel()+'</div>';
  chat=document.getElementById("chat");
  document.getElementById("f").onsubmit=function(e){e.preventDefault();var i=document.getElementById("q"),v=i.value;i.value="";tanya(v);i.focus()};
  document.getElementById("lo").onclick=function(){KODE="";ls("sctk_kode",null);loginView("")};
  document.getElementById("amuat").onclick=muatGagal;
  var mic=document.getElementById("mic");
  mic.onclick=function(){
    var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    function tolak(){mic.classList.remove("on");add("tq-b","<p>Mikrofon tidak bisa dipakai di peramban ini. Coba Chrome di HP, atau izinkan mikrofon untuk halaman ini.</p>")}
    if(!SR)return tolak();
    try{var r=new SR();r.lang="id-ID";r.interimResults=false;r.onresult=function(e){tanya(e.results[0][0].transcript)};r.onerror=tolak;r.onend=function(){mic.classList.remove("on")};mic.classList.add("on");r.start()}catch(e){tolak()}
  };
  var a=add("tq-b","<p>Halo! Tanyakan stok barang, kebutuhan, paket pekerjaan, atau status BPB Anda. Tulis seperti biasa, salah ketik pun saya usahakan paham.</p>");
  a.appendChild(chips([{label:"stok pipa pvc 3 inch"},{label:"butuh 30 elbow 3 inch"},{label:"barang yang stok bebasnya habis"},{label:"bpb saya sampai mana"}],function(x){tanya(x.label)}));
  document.getElementById("q").focus();
}
var k0=ls("sctk_kode");
if(k0){KODE=k0;mulai(false)}else loginView("");
window.__tanya={tanya:tanya,jawabSatu:jawabSatu,norm:norm,bersih:bersih};
})();
