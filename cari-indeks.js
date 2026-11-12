/* ===== Indeks barang bersama (admin) =====
   Satu daftar ringan semua barang (kode, nama, satuan, stok per sumber, harga, jenis, rak, ID barcode, jumlah RAB)
   dimuat sekali dari server (aksi adminIndeksBarang), disimpan di sessionStorage, dan dipakai SEMUA kotak cari barang
   di halaman admin dengan mesin CARI yang sama seperti di server. Pencarian jadi lokal (tanpa menunggu server).
   Aturan keselamatan:
   - Bila indeks belum siap / gagal dimuat, pemanggil memakai jalur server lama (IDX.ada() === false).
   - Keputusan yang mengubah data tetap dihitung server; indeks hanya untuk mencari dan memilih.
   - Setelah ada aksi tulis yang berhasil, indeks ditandai kotor dan dimuat ulang (versi sama = tanpa kirim ulang data). */
var IDX=(function(){
  var KEY="sctk_idx_v1",KAKI="sctk_idx_akhir",L=[],ver="",wkt="",sumber=["Bekas","Moka","Accurate"],tUp=0,sedang=null,perlu=false,kotorF=false,dengar=[],apiFn=null,ok=false;
  var MENULIS=/^(adminStokImport|adminKoreksi|adminHarga|adminSerah|adminSerahRevisi|adminSerahSemua|adminHargaAccTerapkan|adminOrderTerima|adminOrderBuat|adminJenisImport|adminJenisSet|adminOpnameProses|adminImporOpname|adminKembaliTerima|adminLamaImpor|adminLamaBatal|adminMbAcc|adminMbAccurate|adminIdBarcodeIsi|labelRakSimpan|adminTarikRak|adminSinkron|kbSimpan|plTerima)$/;
  function r3(x){return Math.round(x*1000)/1000;}
  function teks(b){return b.nama+" "+b.kode;}
  function kk(s){return String(s==null?"":s).trim().toLowerCase().replace(/[^a-z0-9]/g,"");}
  function bangun(rows){
    L=(rows||[]).map(function(a){var q=[Number(a[3])||0,Number(a[4])||0,Number(a[5])||0];
      return {kode:a[0],nama:a[1],satuan:a[2],q:q,total:q[0]+q[1]+q[2],harga:a[6]==null?null:Number(a[6]),jasa:a[7]||0,rak:a[8]||"",idbc:a[9]||"",nRab:a[10]||0};});
    ok=true;
  }
  /* Tambahan 102: indeks disimpan di localStorage (bertahan antar tab dan saat halaman dibuka ulang); server cukup ditanya versinya. Cadangan: sessionStorage. */
  function wadah(){try{var t="__idx_uji";localStorage.setItem(t,"1");localStorage.removeItem(t);return localStorage;}catch(e){try{return sessionStorage;}catch(e2){return null;}}}
  function simpan(rows){var w=wadah();if(!w)return;var isi=JSON.stringify({v:ver,w:wkt,s:sumber,t:Date.now(),rows:rows});try{w.setItem(KEY,isi);}catch(e){try{sessionStorage.setItem(KEY,isi);}catch(e2){}}}
  function pulih(){
    try{var w=wadah(),o=JSON.parse((w&&w.getItem(KEY))||sessionStorage.getItem(KEY)||"null");if(o&&o.rows&&o.rows.length){ver=o.v||"";wkt=o.w||"";if(o.s)sumber=o.s;tUp=o.t||0;bangun(o.rows);return true;}}catch(e){}
    return false;
  }
  function kabar(){dengar.forEach(function(f){try{f();}catch(e){}});}
  function panggil(b){var f=apiFn||window.api;return f(b);}
  async function muat(){
    try{
      var r=await panggil({action:"adminIndeksBarang",v:ok?ver:""});
      if(!r||!r.ok)return false;
      if(r.sama&&ok){tUp=Date.now();kotorF=false;kabar();return true;}
      if(!Array.isArray(r.rows))return false;
      bangun(r.rows);ver=r.v||"";wkt=r.waktu||"";if(r.sumber)sumber=r.sumber;tUp=Date.now();kotorF=false;simpan(r.rows);kabar();return true;
    }catch(e){return false;}
  }
  /** Muat ulang dari server. Panggilan yang datang saat muat sedang jalan diantre satu kali lagi (supaya data sesudah penulisan ikut). */
  function segarkan(){
    if(sedang){perlu=true;return sedang;}
    sedang=(async function(){
      var hasil=await muat();
      while(perlu){perlu=false;hasil=await muat();}
      sedang=null;return hasil;
    })();
    return sedang;
  }
  function mulai(fn){if(fn)apiFn=fn;if(!ok)pulih();if(!ok||Date.now()-tUp>150000)segarkan();return IDX;}   /* T46: pindah tab tidak lagi memeriksa server tiap 60 dtk (sebelumnya 96 panggilan); penulisan sendiri tetap menandai kotor */
  /** Resolve true bila indeks tersedia (menunggu muat pertama bila belum ada). Bila sudah ada tetapi lama (>60 dtk), muat ulang di latar belakang. */
  async function siap(){
    if(!ok)pulih();
    if(ok){if(sedang)return true;if(Date.now()-tUp>60000||kotorF)segarkan();return true;}
    return await (sedang||segarkan())&&ok;
  }
  /** Seperti siap(), tetapi bila indeks kotor atau lebih tua dari maksMs, menunggu muat ulang dulu (dipakai tampilan stok). Bergabung dengan muat yang sedang jalan. */
  async function segar(maksMs){
    if(!ok)pulih();
    if(sedang){await sedang;return ok;}
    if(!ok||kotorF||Date.now()-tUp>(maksMs==null?60000:maksMs)){await segarkan();}
    return ok;
  }
  function tandaiKotor(){kotorF=true;segarkan();}
  /** Dipanggil oleh api() admin setelah respons: bila aksi tulis berhasil, tandai kotor. */
  function sesudahApi(aksi,r){if(!ok||!aksi)return;if(r&&r.ok&&MENULIS.test(aksi))tandaiKotor();}
  function cariPersis(qq){
    var q=String(qq||"").trim();if(!q)return [];var k=kk(q),d=q.toLowerCase();
    return L.filter(function(b){return (b.idbc&&b.idbc.toLowerCase()===d)||(k&&kk(b.kode)===k);});
  }
  /** Cari barang. opsi: jasa (tampilkan jasa; bawaan tidak), tebak (sembunyikan juga yang jasa menurut tebakan nama), hanyaStok, maks, saring (cap penyaringan). */
  function cari(q,o){
    o=o||{};var qs=String(q||"").trim();
    if(!CARI.tokens(qs).length)return {hasil:[],total:0,persis:0,mirip:0};
    var hs=CARI.saring(L,qs,teks,o.saring||5000),persis=hs.persis,hasil=[],i,b,pts=cariPersis(qs),tampak={};
    function lolos(b){if(!o.jasa){if(b.jasa===1)return false;if(o.tebak&&b.jasa===2)return false;}if(o.hanyaStok&&b.total<=0)return false;return true;}
    pts.forEach(function(b){if(lolos(b)&&!tampak[b.kode]){tampak[b.kode]=1;hasil.push(Object.assign({},b,{mirip:false,persisKode:true}));}});
    for(i=0;i<hs.hasil.length;i++){b=hs.hasil[i];if(!lolos(b)||tampak[b.kode])continue;tampak[b.kode]=1;hasil.push(Object.assign({},b,{mirip:i>=persis}));}
    if(!hasil.length&&qs){ // terakhir: cocokkan rak persis (mis. "A-03")
      var rk=kk(qs);if(rk)L.forEach(function(b){if(b.rak&&kk(b.rak)===rk&&lolos(b)&&hasil.length<(o.maks||40))hasil.push(Object.assign({},b,{mirip:false,viaRak:true}));});
    }
    var total=hasil.length;
    return {hasil:o.maks?hasil.slice(0,o.maks):hasil,total:total,persis:persis,mirip:hs.mirip};
  }
  /** Meniru adminStokList (server): daftar stok, ringkasan, dan penanda mirip. */
  function stokList(q,o){
    o=o||{};var limit=o.semua?20000:Math.min(Number(o.limit)||100,300),out=[],total=0,sm={moka:0,accurate:0,bekas:0,total:0,nMoka:0,nAcc:0,tanpaHarga:0};
    function tambah(b,mirip){
      if(!o.denganJasa&&b.jasa===1)return;
      var tot=b.total;if(o.hanyaStok&&tot<=0)return;
      total++;var qs=b.q,hg=b.harga;
      sm.moka+=qs[1];sm.accurate+=qs[2];sm.bekas+=qs[0];sm.total+=tot;
      if(tot>0&&hg==null&&(qs[1]+qs[2])>0)sm.tanpaHarga++;
      if(hg!=null){sm.nMoka+=qs[1]*hg;sm.nAcc+=qs[2]*hg;}
      if(out.length<limit)out.push({mirip:!!mirip,kode:b.kode,nama:b.nama,satuan:b.satuan,q:qs.slice(),total:tot,harga:hg,nMoka:hg!=null?Math.round(qs[1]*hg):null,nAcc:hg!=null?Math.round(qs[2]*hg):null});
    }
    var qq=String(q||"").trim();
    if(CARI.tokens(qq).length){
      var pt=cariPersis(qq),dilihat={};pt.forEach(function(b){dilihat[b.kode]=1;tambah(b,false);});   // ID Barcode / kode persis di paling atas
      var hs=CARI.saring(L,qq,teks,5000);hs.hasil.forEach(function(b,ix){if(!dilihat[b.kode])tambah(b,ix>=hs.persis);});}
    else L.forEach(function(b){tambah(b);});
    return {ok:true,data:out,total:total,sumber:sumber,ringkas:{moka:r3(sm.moka),accurate:r3(sm.accurate),bekas:r3(sm.bekas),total:r3(sm.total),nilaiMoka:Math.round(sm.nMoka),nilaiAccurate:Math.round(sm.nAcc),nilaiTotal:Math.round(sm.nMoka+sm.nAcc),tanpaHarga:sm.tanpaHarga}};
  }
  /** Meniru adminAnalisaCari (server): jasa disembunyikan (juga yang jasa menurut tebakan nama), barang berstok / ada di RAB di atas, awalan nama sama di atas. */
  function analisaCari(q,jasa){
    var qq=String(q||"").trim(),qt=CARI.tokens(qq);if(!qt.length)return {ok:true,rows:[]};
    var cand=[];L.forEach(function(b){if(!jasa&&b.jasa>0)return;cand.push({kode:b.kode,nama:b.nama,satuan:b.satuan,stok:r3(b.total),nRab:b.nRab||0,jasa:b.jasa>0});});
    var hs=CARI.saring(cand,qq,function(c){return c.nama+" "+c.kode;},300),hasil=hs.hasil,ix={};
    var awal=function(c){var t=CARI.tokens(c.nama);return t.length&&qt.length&&t[0]===qt[0]?0:1;};
    hasil.forEach(function(c,i){ix[c.kode]=i;});
    hasil=hasil.slice().sort(function(a,b){return ((b.stok>0||b.nRab>0)?1:0)-((a.stok>0||a.nRab>0)?1:0)||awal(a)-awal(b)||ix[a.kode]-ix[b.kode];});
    return {ok:true,rows:hasil.slice(0,40),total:hasil.length};
  }
  /** Meniru adminTelusurCari (server): semua barang (jasa ikut), maksimal 30, penanda mirip. */
  function telusurCari(q){
    var qq=String(q||"").trim();if(!CARI.tokens(qq).length)return {ok:true,rows:[]};
    var c=cari(qq,{jasa:true,maks:30});
    return {ok:true,rows:c.hasil.map(function(b){return {kode:b.kode,nama:b.nama,satuan:b.satuan,stok:r3(b.total),mirip:!!b.mirip};}),mirip:c.mirip};
  }
  /** Barang yang terakhir dipilih (disimpan per perangkat, maksimal 12). */
  function catat(kode){
    try{var a=JSON.parse(localStorage.getItem(KAKI)||"[]").filter(function(x){return x!==kode;});a.unshift(kode);localStorage.setItem(KAKI,JSON.stringify(a.slice(0,12)));}catch(e){}
  }
  function terakhir(n){
    var a=[];try{a=JSON.parse(localStorage.getItem(KAKI)||"[]");}catch(e){}
    var by={};L.forEach(function(b){by[b.kode]=b;});
    return a.map(function(k){return by[k];}).filter(Boolean).slice(0,n||8).map(function(b){return Object.assign({},b,{mirip:false,terakhir:true});});
  }
  /** Hapus semua data indeks dari memori dan penyimpanan (saat keluar). */
  function hapus(){L=[];ok=false;ver="";wkt="";tUp=0;kotorF=false;try{sessionStorage.removeItem(KEY);}catch(e){}try{localStorage.removeItem(KEY);}catch(e){}}
  function bagi(f){dengar.push(f);}
  return {mulai:mulai,siap:siap,segar:segar,segarkan:segarkan,tandaiKotor:tandaiKotor,sesudahApi:sesudahApi,cari:cari,stokList:stokList,analisaCari:analisaCari,telusurCari:telusurCari,catat:catat,hapus:hapus,terakhir:terakhir,bagi:bagi,
    ada:function(){return ok;},umur:function(){return ok?Date.now()-tUp:Infinity;},jumlah:function(){return L.length;},waktu:function(){return tUp;},waktuServer:function(){return wkt;},semua:function(){return L;},kotor:function(){return kotorF;}};
})();
window.IDX=IDX;
