/* Panduan (manual book) + Periksa Sistem - tab admin. Bergantung pada api(), toast(), TAB, goTab().
   Isi panduan dikirim server hanya setelah PIN admin benar (aksi adminPanduan). */
var PDN=(function(){
  var el=null,D=null,LIVE=null,CUR="",Q="",IDX=null,PERAN="",kembaliTab="",PR=null;
  function E(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
  /* teks dari server: semua di-escape, hanya <b> dan <i> yang dikembalikan */
  function S(t){return E(String(t==null?"":t).replace(/&amp;/g,"&")).replace(/&lt;(\/?)(b|i)&gt;/g,"<$1$2>");}
  function strip(t){return String(t==null?"":t).replace(/<[^>]+>/g,"").replace(/&amp;/g,"&");}
  function css(){if(document.getElementById("pdcss"))return;var s=document.createElement("style");s.id="pdcss";
    s.textContent=".pd{display:grid;grid-template-columns:270px minmax(0,1fr);gap:14px;align-items:start}.pd-toc{position:sticky;top:8px;max-height:calc(100vh - 20px);overflow:auto;border:1px solid var(--line,#ccd);border-radius:6px;padding:8px;background:var(--card,#fff)}"+
    ".pd-toc h4{margin:10px 6px 4px;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:var(--mut,#567)}.pd-toc button{display:block;width:100%;text-align:left;border:0;background:transparent;border-radius:5px;padding:6px 8px;font-size:13px;color:inherit;cursor:pointer;margin:0}.pd-toc button:hover{background:rgba(0,90,160,.08)}.pd-toc button.on{background:rgba(0,90,160,.16);font-weight:700}"+
    ".pd-main{min-width:0}.pd-bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px}.pd-bar input[type=search]{flex:1 1 260px;min-width:0}"+
    ".pd-sec h2{margin:0 0 4px;font-size:21px}.pd-sec .pd-ring{color:var(--mut,#567);margin:0 0 6px}.pd-untuk{font-size:12px;color:var(--mut,#567);margin-bottom:10px}.pd-sec h3{margin:18px 0 6px;font-size:16px;border-bottom:1px solid var(--line,#ccd);padding-bottom:3px}.pd-sec p{line-height:1.55;margin:6px 0}.pd-sec ul,.pd-sec ol{margin:6px 0 6px 20px;padding:0;line-height:1.55}.pd-sec li{margin:3px 0}"+
    ".pd-box{border-left:4px solid #1f6fb5;background:rgba(31,111,181,.09);padding:8px 12px;border-radius:0 6px 6px 0;margin:10px 0;line-height:1.5}.pd-box.w{border-color:#c0392b;background:rgba(192,57,43,.1)}.pd-box b.k{display:block;font-size:12px;letter-spacing:.03em;text-transform:uppercase;margin-bottom:2px}"+
    ".pd-tw{overflow-x:auto;max-width:100%;margin:8px 0}.pd-sec table{border-collapse:collapse;width:100%;font-size:13.5px}.pd-sec th,.pd-sec td{border:1px solid var(--line,#ccd);padding:6px 8px;text-align:left;vertical-align:top}.pd-sec th{background:rgba(0,90,160,.1)}.pd-now{margin-top:4px;font-size:12px;color:var(--mut,#567)}"+
    ".pd-card{border:1px solid var(--line,#ccd);border-radius:6px;padding:12px;background:var(--card,#fff);margin-bottom:10px}.pd-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px}.pd-link{border:1px solid var(--line,#ccd);border-radius:6px;padding:10px;cursor:pointer;background:var(--card,#fff);text-align:left;color:inherit}.pd-link:hover{border-color:#1f6fb5}.pd-link b{display:block}.pd-link small{color:var(--mut,#567)}"+
    ".pd-st{display:inline-block;border-radius:20px;padding:2px 9px;font-size:11px;font-weight:700;margin-right:6px}.pd-st.ok{background:#d9f0df;color:#14612b}.pd-st.warn{background:#fff3cd;color:#7a5b00}.pd-st.bad{background:#fadbd8;color:#8e1b10}.pd-st.info{background:#e1ecf7;color:#17487a}"+
    "html[data-tema=gelap] .pd-st.ok{background:#17402a;color:#a9e6bd}html[data-tema=gelap] .pd-st.warn{background:#4a3a0a;color:#f3d98a}html[data-tema=gelap] .pd-st.bad{background:#4d1d22;color:#f4b8bf}html[data-tema=gelap] .pd-st.info{background:#1c3350;color:#b9d6f5}"+
    ".pd-hit{border-bottom:1px solid var(--line,#ccd);padding:8px 2px;cursor:pointer}.pd-hit:hover{background:rgba(0,90,160,.06)}.pd-hit b{display:block}.pd-hit small{color:var(--mut,#567)}mark.pd{background:#ffe58a;color:#000;padding:0 1px}"+
    "#pdnq{position:fixed;right:14px;bottom:68px;z-index:30;width:44px;height:44px;border-radius:50%;border:0;background:#1f6fb5;color:#fff;font-size:22px;font-weight:700;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.3);padding:0}"+
    "@media (max-width:900px){.pd{grid-template-columns:1fr}.pd-toc{position:static;max-height:none}.pd-toc.tutup .pd-isi{display:none}}"+
    "@media print{.pd-toc,.pd-bar,#pdnq,.pd-noprint{display:none!important}.pd{display:block}}";document.head.appendChild(s);}
  async function muatData(){
    if(D)return true;
    var r;try{r=await api({action:"adminPanduan"});}catch(e){el.innerHTML='<div class="card msg err">Gagal terhubung ke server.</div>';return false;}
    if(!r.ok){el.innerHTML='<div class="card msg err">'+E(r.msg||"Gagal memuat panduan")+'</div>';return false;}
    D=r.data;LIVE=r.live;buatIndeks();return true;
  }
  function teksBlok(b){var k=b[0];if(k==="ul"||k==="ol")return b[1].map(strip).join(" ");if(k==="tabel")return b[1].map(strip).join(" ")+" "+b[2].map(function(r){return r.map(strip).join(" ");}).join(" ");return strip(b[1]);}
  function buatIndeks(){IDX=D.bagian.map(function(s){var body=s.blok.map(teksBlok).join(" ");return {s:s,j:s.judul.toLowerCase(),r:(s.ringkas||"").toLowerCase(),y:(s.sinonim||[]).join(" ").toLowerCase(),b:body.toLowerCase(),raw:body};});}
  function token(q){return String(q).toLowerCase().split(/[^a-z0-9\u00c0-\u024f]+/).filter(function(x){return x.length>=2;});}
  function sinonimDari(q,toks){var alt={};var ql=" "+String(q).toLowerCase()+" ";(D.sinonim||[]).forEach(function(g){var kena=g.some(function(t){return ql.indexOf(" "+t+" ")>=0||ql.indexOf(t)>=0&&t.length>=4;});if(kena)g.forEach(function(t){token(t).forEach(function(w){if(toks.indexOf(w)<0)alt[w]=1;});});});return Object.keys(alt);}
  function cari(q){
    var toks=token(q);if(!toks.length)return [];var alt=sinonimDari(q,toks);
    function skor(x,w,bobot){var n=0;if(x.j.indexOf(w)>=0)n+=5;if(x.y.indexOf(w)>=0)n+=4;if(x.r.indexOf(w)>=0)n+=3;if(x.b.indexOf(w)>=0)n+=1;return n*bobot;}
    var hasil=IDX.map(function(x){var tot=0,semua=true;toks.forEach(function(w){var n=skor(x,w,1);if(!n){alt.forEach(function(a){n=Math.max(n,skor(x,a,.7));});}if(!n)semua=false;tot+=n;});alt.forEach(function(a){tot+=skor(x,a,.25);});return {x:x,t:tot,semua:semua};}).filter(function(h){return h.t>0;});
    var kuat=hasil.filter(function(h){return h.semua;});if(kuat.length)hasil=kuat;
    if(!kuat.length&&window.CARI){ /* salah ketik: cari yang mirip pada judul, sinonim, ringkasan */
      var mir=[];IDX.forEach(function(x){var r=CARI.skor(x.j+" "+x.y+" "+x.r,q);if(r)mir.push({x:x,t:r.s,semua:true,mirip:true});});
      if(mir.length)hasil=mir;
    }
    hasil.sort(function(a,b){return b.t-a.t;});return hasil.slice(0,14).map(function(h){return {x:h.x,toks:toks.concat(alt)};});
  }
  function cuplik(x,toks){var t=x.raw,l=x.b,p=-1;for(var i=0;i<toks.length&&p<0;i++)p=l.indexOf(toks[i]);if(p<0)return E(x.s.ringkas||"");var a=Math.max(0,p-60),z=Math.min(t.length,p+110);var sn=(a>0?"...":"")+t.slice(a,z)+(z<t.length?"...":"");return sorot(E(sn),toks);}
  function sorot(h,toks){toks.forEach(function(w){if(w.length<2)return;var re=new RegExp("("+w.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+")","ig");h=h.replace(/(<[^>]*>)|([^<]+)/g,function(m,tag,txt){return tag?tag:txt.replace(re,'<mark class="pd">$1</mark>');});});return h;}
  function tabelHtml(s,b){
    var live=(s.id==="pengaturan"&&LIVE)?LIVE.pengaturan:null;
    var h='<div class="pd-tw"><table><thead><tr>'+b[1].map(function(c){return '<th>'+S(c)+'</th>';}).join("")+'</tr></thead><tbody>';
    b[2].forEach(function(r){h+='<tr>'+r.map(function(c,i){var extra="";if(live&&i===r.length-1){var k=strip(r[0]);if(Object.prototype.hasOwnProperty.call(live,k))extra='<div class="pd-now">Sekarang di sistem Anda: <b>'+E(live[k])+'</b></div>';}return '<td data-l="'+E(strip(b[1][i]))+'">'+S(c)+extra+'</td>';}).join("")+'</tr>';});
    return h+'</tbody></table></div>';
  }
  function bagianHtml(s){
    var h='<div class="pd-sec"><h2>'+E(s.ikon||"")+" "+E(s.judul)+'</h2><p class="pd-ring">'+S(s.ringkas||"")+'</p><div class="pd-untuk">Untuk: '+E((s.untuk||[]).join(", "))+" &middot; "+E(s.grup)+'</div>';
    s.blok.forEach(function(b){var k=b[0];
      if(k==="p")h+='<p>'+S(b[1])+'</p>';
      else if(k==="h")h+='<h3>'+S(b[1])+'</h3>';
      else if(k==="ul"||k==="ol")h+='<'+k+'>'+b[1].map(function(x){return '<li>'+S(x)+'</li>';}).join("")+'</'+k+'>';
      else if(k==="tip")h+='<div class="pd-box"><b class="k">Tips</b>'+S(b[1])+'</div>';
      else if(k==="warn")h+='<div class="pd-box w"><b class="k">Perhatian</b>'+S(b[1])+'</div>';
      else if(k==="tabel")h+=tabelHtml(s,b);});
    var terkait=D.bagian.filter(function(o){return o.id!==s.id&&o.grup===s.grup;}).slice(0,6);
    if(terkait.length)h+='<h3>Bagian terkait</h3><div class="pd-grid">'+terkait.map(function(o){return '<button type="button" class="pd-link" data-buka="'+E(o.id)+'"><b>'+E(o.ikon||"")+" "+E(o.judul)+'</b><small>'+E(o.ringkas||"")+'</small></button>';}).join("")+'</div>';
    return h+'</div>';
  }
  function catatanHtml(){
    var h='<div class="pd-sec"><h2>\uD83D\uDDD2\uFE0F Catatan Perubahan</h2><p class="pd-ring">Riwayat tahap pengembangan. Tahap baru ditambahkan di paling atas.</p>';
    D.catatan.forEach(function(c){h+='<div class="pd-card"><b>'+E(c.tahap)+'</b> &middot; '+E(c.tgl)+'<div style="font-weight:700;margin:4px 0">'+E(c.judul)+'</div><ul>'+c.isi.map(function(x){return '<li>'+S(x)+'</li>';}).join("")+'</ul><div class="pd-ring" style="margin:4px 0 0"><b>Dampak:</b> '+S(c.dampak||"-")+'</div></div>';});
    return h+'</div>';
  }
  function kondisiHtml(){
    var L=LIVE||{},kd=(L.versiKode||"").slice(0,10),lama=kd&&D.dibuat&&kd<D.dibuat;
    var pm=(L.pemicu||[]).map(function(p){return '<li>'+(p.ada?'<span class="pd-st ok">terpasang</span>':'<span class="pd-st '+(p.wajib?'bad':'warn')+'">belum</span>')+E(p.fungsi)+(p.ada?'':' <small>(jalankan '+E(p.pasang)+')</small>')+'</li>';}).join("");
    return '<div class="pd-card"><b>Kondisi sistem Anda</b>'+
      '<p style="margin:6px 0">Versi Code.gs terpasang: <b>'+E(L.versiKode||"?")+'</b> &middot; Versi panduan: <b>'+E(D.versi)+'</b></p>'+
      (lama?'<div class="pd-box w"><b class="k">Perhatian</b>Code.gs yang terpasang lebih lama dari panduan ini. Mungkin Anda belum memasang Code.gs terbaru atau belum membuat versi baru deployment (lihat bagian Memasang versi baru).</div>':'')+
      '<p style="margin:6px 0">Cadangan terakhir: <b>'+E(L.cadangan||"-")+'</b> &middot; Sisa kuota email hari ini: <b>'+E(L.kuota<0?"tidak terbaca":L.kuota)+'</b></p>'+
      '<details><summary>Pemicu otomatis ('+(L.pemicu||[]).filter(function(p){return p.ada;}).length+' dari '+(L.pemicu||[]).length+' terpasang)</summary><ul style="list-style:none;margin:6px 0 0;padding:0">'+pm+'</ul></details></div>';
  }
  function berandaHtml(){
    var cepat=["rutinitas","skenario","masalah","alur-permintaan","peran","pengaturan"].map(function(id){return D.bagian.filter(function(s){return s.id===id;})[0];}).filter(Boolean);
    return '<div class="pd-sec"><h2>\uD83D\uDCD8 Panduan Sistem Gudang SCTK</h2><p class="pd-ring">Ketik apa yang ingin Anda ketahui di kotak cari (misalnya "keluar barang", "ganti kode", "stok tidak cocok"), pilih bagian di kiri, atau mulai dari jalan pintas di bawah.</p></div>'+
      kondisiHtml()+'<h3 style="margin:10px 0 6px">Jalan pintas</h3><div class="pd-grid">'+cepat.map(function(s){return '<button type="button" class="pd-link" data-buka="'+E(s.id)+'"><b>'+E(s.ikon||"")+" "+E(s.judul)+'</b><small>'+E(s.ringkas||"")+'</small></button>';}).join("")+'</div>'+
      '<h3 style="margin:16px 0 6px">Perubahan terbaru</h3>'+D.catatan.slice(0,2).map(function(c){return '<div class="pd-card"><b>'+E(c.tahap)+'</b> &middot; '+E(c.tgl)+' &mdash; '+E(c.judul)+'</div>';}).join("")+'<button type="button" class="gh" data-buka="catatan">Lihat semua catatan perubahan</button>';
  }
  function periksaHtml(){
    if(!PR)return '<div class="pd-sec"><h2>\uD83E\uDE7A Periksa Sistem</h2><p class="pd-ring">Memeriksa kesehatan sistem. Hanya membaca, tidak mengubah data apa pun.</p><div class="pd-card"><button type="button" class="sv" id="pdrun">Jalankan pemeriksaan</button></div></div>';
    var n=PR.ringkas||{},urut={bad:0,warn:1,info:2,ok:3},lab={ok:"Baik",info:"Info",warn:"Perlu perhatian",bad:"Perlu diperbaiki"};
    var h='<div class="pd-sec"><h2>\uD83E\uDE7A Periksa Sistem</h2><p class="pd-ring">Diperiksa '+E(PR.waktu)+'. '+(n.bad||0)+' perlu diperbaiki, '+(n.warn||0)+' perlu perhatian, '+(n.info||0)+' info, '+(n.ok||0)+' baik.</p><div class="pd-card pd-noprint"><button type="button" class="sv" id="pdrun">Periksa ulang</button></div>';
    PR.hasil.slice().sort(function(a,b){return urut[a.status]-urut[b.status];}).forEach(function(r){
      var ada=D.bagian.some(function(s){return s.id===r.bagian;});
      h+='<div class="pd-card"><span class="pd-st '+r.status+'">'+lab[r.status]+'</span><b>'+E(r.judul)+'</b><div style="margin:4px 0">'+E(r.detail)+'</div>'+(r.saran?'<div><b>Langkah:</b> '+E(r.saran)+'</div>':'')+(ada?'<div style="margin-top:6px"><button type="button" class="gh" data-buka="'+E(r.bagian)+'">Buka bagian panduan</button></div>':'')+'</div>';});
    return h+'</div>';
  }
  function tocHtml(){
    var peran=PERAN,h='<div class="pd-toc" id="pdtoc"><button type="button" id="pdtg" class="mnbtn" style="display:none;font-weight:700">Daftar isi \u25BE</button><div class="pd-isi">'+
      '<button type="button" data-buka="">\uD83C\uDFE0 Beranda panduan</button><button type="button" data-buka="periksa" class="'+(CUR==="periksa"?"on":"")+'">\uD83E\uDE7A Periksa Sistem</button>';
    D.grup.forEach(function(g){var l=D.bagian.filter(function(s){return s.grup===g&&(!peran||(s.untuk||[]).indexOf(peran)>=0||(s.untuk||[]).indexOf("Semua")>=0);});if(!l.length)return;
      h+='<h4>'+E(g)+'</h4>'+l.map(function(s){return '<button type="button" data-buka="'+E(s.id)+'" class="'+(CUR===s.id?"on":"")+'">'+E(s.ikon||"")+" "+E(s.judul)+'</button>';}).join("");});
    return h+'<h4>Riwayat</h4><button type="button" data-buka="catatan" class="'+(CUR==="catatan"?"on":"")+'">\uD83D\uDDD2\uFE0F Catatan Perubahan</button></div></div>';
  }
  function perans(){var o={};D.bagian.forEach(function(s){(s.untuk||[]).forEach(function(p){if(p!=="Semua")o[p]=1;});});return Object.keys(o).sort();}
  function layout(isi){
    el.innerHTML='<div class="pd-bar"><input type="search" id="pdq" placeholder="Cari di panduan: misalnya keluar barang, ganti kode, stok tidak cocok..." value="'+E(Q)+'" aria-label="Cari di panduan">'+
      '<select id="pdp" aria-label="Filter peran"><option value="">Semua peran</option>'+perans().map(function(p){return '<option'+(p===PERAN?" selected":"")+'>'+E(p)+'</option>';}).join("")+'</select>'+
      (kembaliTab?'<button type="button" class="gh" id="pdkb">\u2190 Kembali ke '+E(namaTab(kembaliTab))+'</button>':'')+'<button type="button" class="gh" id="pdcetak">Cetak</button></div>'+
      '<div class="pd"><div>'+tocHtml()+'</div><div class="pd-main" id="pdmain">'+isi+'</div></div>';
    pasangEvent();
  }
  function tampil(){
    var isi;
    if(Q.trim()){var hs=cari(Q);isi='<div class="pd-sec"><h2>Hasil cari: "'+E(Q)+'"</h2>'+(hs.length?'<p class="pd-ring">'+hs.length+' bagian cocok. Pilih salah satu.</p>'+hs.map(function(h){return '<div class="pd-hit" data-buka="'+E(h.x.s.id)+'"><b>'+E(h.x.s.ikon||"")+" "+sorot(E(h.x.s.judul),h.toks)+'</b><small>'+E(h.x.s.grup)+'</small><div>'+cuplik(h.x,h.toks)+'</div></div>';}).join(""):'<p class="pd-ring">Tidak ada yang cocok. Coba kata lain, atau buka daftar isi di kiri. Pertanyaan umum ada di "Saya ingin... maka...".</p>')+'</div>';}
    else if(CUR==="periksa")isi=periksaHtml();
    else if(CUR==="catatan")isi=catatanHtml();
    else if(CUR){var s=D.bagian.filter(function(x){return x.id===CUR;})[0];isi=s?bagianHtml(s):berandaHtml();}
    else isi=berandaHtml();
    layout(isi);
  }
  function pasangEvent(){
    var q=document.getElementById("pdq");
    var t=null;q.oninput=function(){Q=q.value;clearTimeout(t);t=setTimeout(function(){var pos=q.selectionStart;tampil();var n=document.getElementById("pdq");n.focus();try{n.setSelectionRange(pos,pos);}catch(e){}},220);};
    document.getElementById("pdp").onchange=function(){PERAN=this.value;tampil();};
    document.getElementById("pdcetak").onclick=function(){window.print();};
    var kb=document.getElementById("pdkb");if(kb)kb.onclick=function(){goTab(kembaliTab);};
    el.querySelectorAll("[data-buka]").forEach(function(b){b.onclick=function(){buka(b.getAttribute("data-buka"));};});
    var run=document.getElementById("pdrun");if(run)run.onclick=jalankanPeriksa;
    var tg=document.getElementById("pdtg"),toc=document.getElementById("pdtoc");
    function mob(){var m=window.matchMedia("(max-width:900px)").matches;tg.style.display=m?"block":"none";if(!m)toc.classList.remove("tutup");else if(!toc.hasAttribute("data-init")){toc.classList.add("tutup");toc.setAttribute("data-init","1");}}
    mob();tg.onclick=function(){toc.classList.toggle("tutup");};
  }
  async function jalankanPeriksa(){
    var b=document.getElementById("pdrun");if(b){b.disabled=true;b.textContent="Memeriksa...";}
    var r;try{r=await api({action:"adminPeriksa"});}catch(e){toast("Gagal terhubung ke server.",true);if(b){b.disabled=false;b.textContent="Jalankan pemeriksaan";}return;}
    if(!r.ok){toast(r.msg||"Gagal memeriksa",true);if(b){b.disabled=false;}return;}
    PR=r;CUR="periksa";Q="";tampil();window.scrollTo(0,0);
  }
  function buka(id){Q="";CUR=id||"";tampil();var m=document.getElementById("pdmain");if(m&&m.scrollIntoView)m.scrollIntoView({block:"start"});}
  async function mount(root,target){
    css();el=root;if(!D){el.innerHTML='<div class="card msg">Memuat panduan...</div>';}
    if(!(await muatData()))return;
    if(target!==undefined){CUR=target;Q="";}else{kembaliTab="";CUR="";Q="";}
    tampil();
  }
  /* tombol ? di pojok: membuka bagian panduan untuk tab yang sedang dibuka */
  function tombol(){
    css();var b=document.getElementById("pdnq");
    if(!b){b=document.createElement("button");b.id="pdnq";b.type="button";b.title="Bantuan untuk halaman ini";b.setAttribute("aria-label","Bantuan untuk halaman ini");b.textContent="?";document.body.appendChild(b);
      b.onclick=function(){var t=(typeof TAB!=="undefined"&&TAB)?TAB:"";if(t==="panduan"){return;}kembaliTab=t;var id="tab-"+t;PDN.bukaDari(id);};}
  }
  async function bukaDari(id){
    TAB="panduan";tabsUI();
    var s=D&&D.bagian.some(function(x){return x.id===id;});
    if(D&&!s)id="";
    try{history.replaceState(null,"","#panduan");}catch(e){}
    await mount(pane(),id||"");
    if(!D)return;
    if(id&&!D.bagian.some(function(x){return x.id===id;}))buka("");
  }
  return {mount:mount,tombol:tombol,bukaDari:bukaDari,buka:buka};
})();
