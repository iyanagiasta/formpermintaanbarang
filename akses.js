/* akses.js (T59): kode akses pribadi di perangkat ini berlaku 24 jam sejak dimasukkan.
   Berlaku untuk kunci sctk_pic dan sctk_kodeop. Kode pegawai umum (sctk_kode) TIDAK dibatasi waktu.
   Catatan: ini pembatas di sisi browser; server tetap memeriksa kode pada setiap permintaan. */
(function(){
  var BATAS=24*3600*1000,KUNCI={sctk_pic:1,sctk_kodeop:1};
  try{
    var S=Storage.prototype,g=S.getItem,s=S.setItem,r=S.removeItem;
    function lokal(o){return o===window.localStorage;}
    S.getItem=function(k){
      if(lokal(this)&&KUNCI[k]){
        var v=g.call(this,k);if(v===null)return null;
        var t=Number(g.call(this,k+"_t"));
        if(!t){s.call(this,k+"_t",String(Date.now()));return v;}
        if(Date.now()-t>BATAS){r.call(this,k);r.call(this,k+"_t");return null;}
        return v;
      }
      return g.call(this,k);
    };
    S.setItem=function(k,v){
      if(lokal(this)&&KUNCI[k]){
        var lama=g.call(this,k),t=Number(g.call(this,k+"_t"));
        if(!(lama===String(v)&&t&&Date.now()-t<=BATAS))s.call(this,k+"_t",String(Date.now()));
      }
      return s.call(this,k,v);
    };
    S.removeItem=function(k){
      if(lokal(this)&&KUNCI[k])r.call(this,k+"_t");
      return r.call(this,k);
    };
  }catch(e){}
})();
