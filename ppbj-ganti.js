/* Tambahan 95: Ubah nomor PPBJ proyek (tab Proyek, semua admin). Hanya nomornya; nomor ikut berubah di semua data yang memakainya.
   Alur: isi nomor baru + alasan -> Periksa dampak (jumlah catatan per sheet, tidak menulis apa pun) -> Simpan. Riwayat dan Urungkan ada di tombol Riwayat. */
var PGN=(function(){
  function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
  function dlg(html){
    var ov=document.createElement("div");ov.className="ppov";
    ov.innerHTML='<div class="ppdl" role="dialog" aria-modal="true">'+html+'</div>';
    ov.addEventListener("mousedown",function(e){if(e.target===ov)ov.remove();});
    document.body.appendChild(ov);return ov;
  }
  function baris(a,b){return '<div style="display:flex;justify-content:space-between;gap:10px;border-top:1px solid var(--line);padding:5px 0;font-size:14px"><span>'+a+'</span><b>'+b+'</b></div>';}
  function buka(p,api,toast,after){
    var ov=dlg('<b style="font-size:17px">Ubah nomor PPBJ</b>'+
      '<div class="note" style="margin-top:6px">Proyek: <b>'+esc(p.ket||"-")+'</b><br>Nomor sekarang: <b>'+esc(p.ppbj)+'</b></div>'+
      '<label for="pgn1">Nomor PPBJ baru</label><input id="pgn1" type="text" maxlength="60" value="'+esc(p.ppbj)+'" autocomplete="off">'+
      '<label for="pgn2">Alasan perubahan (wajib)</label><textarea id="pgn2" rows="2" maxlength="200" placeholder="Contoh: salah ketik nomor PPBJ"></textarea>'+
      '<div class="note" style="margin-top:8px">Hanya nomor yang berubah, materialnya tidak. Nomor ikut berubah di semua data proyek ini (kebutuhan, alokasi, BPB, serah barang, PO, dan lainnya). Cetakan memakai nomor baru tanpa catatan revisi.</div>'+
      '<div id="pgnr" style="margin-top:10px" aria-live="polite"></div>'+
      '<div class="ppb"><button class="gh" id="pgnc" type="button">Periksa dampak</button><button class="sv" id="pgns" type="button" disabled>Simpan perubahan</button><button class="gh" id="pgnx" type="button">Batal</button></div>');
    var $=function(i){return ov.querySelector("#"+i);},sibuk=false,siap="";
    $("pgnx").onclick=function(){ov.remove();};
    $("pgn1").oninput=function(){if(siap&&$("pgn1").value.trim()!==siap){siap="";$("pgns").disabled=true;$("pgnr").innerHTML='<div class="note">Nomor diubah. Periksa dampak lagi.</div>';}};
    $("pgnc").onclick=async function(){
      if(sibuk)return;var baru=$("pgn1").value.trim();
      if(!baru){toast("Isi nomor PPBJ yang baru.",true);return;}
      sibuk=true;this.disabled=true;$("pgnr").innerHTML='<div class="note">Memeriksa...</div>';
      try{
        var r=await api({action:"adminPpbjGantiCek",ppbj:p.ppbj,baru:baru});
        if(!r.ok){$("pgnr").innerHTML='<div style="color:var(--red,#a82424);font-weight:700">'+esc(r.msg||"Gagal.")+'</div>';return;}
        var h='<div><b>'+esc(r.lama)+'</b> menjadi <b>'+esc(r.baru)+'</b>. Akan berubah di <b>'+r.total+'</b> catatan pada <b>'+r.per.length+'</b> sheet:</div><div style="margin-top:6px">'+r.per.map(function(x){return baris(esc(x.sheet),x.n);}).join("")+'</div>';
        (r.warn||[]).forEach(function(w){h+='<div style="margin-top:8px;color:var(--warn-t,#6b4300);font-weight:700">&#9888; '+esc(w)+'</div>';});
        h+='<div class="note" style="margin-top:8px">PDF final yang sudah tersimpan sebagai file di Drive tetap bernomor lama. Cetakan yang dibuat saat dibuka memakai nomor baru.</div>';
        $("pgnr").innerHTML=h;siap=r.baru===baru?baru:baru;$("pgns").disabled=false;
      }catch(e){$("pgnr").innerHTML='<div style="color:var(--red,#a82424);font-weight:700">Gagal terhubung ke server.</div>';}
      finally{sibuk=false;$("pgnc").disabled=false;}
    };
    $("pgns").onclick=async function(){
      if(sibuk||!siap)return;var alasan=$("pgn2").value.trim();
      if(alasan.length<3){toast("Isi alasan perubahan (minimal 3 huruf).",true);$("pgn2").focus();return;}
      sibuk=true;this.disabled=true;$("pgnc").disabled=true;this.textContent="Menyimpan...";
      try{
        var r=await api({action:"adminPpbjGanti",ppbj:p.ppbj,baru:siap,alasan:alasan});
        toast(r.msg||(r.ok?"Berhasil.":"Gagal."),!r.ok);
        if(r.ok){ov.remove();if(after)await after();return;}
        $("pgnr").innerHTML='<div style="color:var(--red,#a82424);font-weight:700">'+esc(r.msg||"Gagal.")+'</div>';
      }catch(e){toast("Gagal terhubung ke server.",true);}
      finally{sibuk=false;var s=ov.querySelector("#pgns");if(s){s.textContent="Simpan perubahan";s.disabled=false;}var c=ov.querySelector("#pgnc");if(c)c.disabled=false;}
    };
    $("pgn1").focus();$("pgn1").select();
  }
  async function riwayat(api,toast,after){
    var ov=dlg('<b style="font-size:17px">Riwayat ubah nomor PPBJ</b><div id="pgh" style="margin-top:10px"><div class="note">Memuat...</div></div><div class="ppb"><button class="gh" id="pghx" type="button">Tutup</button></div>');
    ov.querySelector("#pghx").onclick=function(){ov.remove();};
    async function muat(){
      var box=ov.querySelector("#pgh");if(!box)return;
      try{
        var r=await api({action:"adminPpbjGantiDaftar"});
        if(!r.ok){box.innerHTML='<div class="note">'+esc(r.msg||"Gagal.")+'</div>';return;}
        if(!r.data.length){box.innerHTML='<div class="note">Belum pernah ada perubahan nomor PPBJ.</div>';return;}
        box.innerHTML=r.data.map(function(x){
          return '<div style="border-top:1px solid var(--line);padding:8px 0;font-size:14px"><b>'+esc(x.lama)+'</b> &rarr; <b>'+esc(x.baru)+'</b><div class="note">'+esc(x.waktu)+' &middot; '+esc(x.oleh)+' &middot; '+x.n+' catatan</div><div>'+esc(x.alasan)+'</div>'+
            (x.status==="Aktif"?'<button class="gh" data-pgu="'+esc(x.id)+'" type="button" style="margin-top:6px">Urungkan</button>':'<div class="note">Diurungkan'+(x.uoleh?' oleh '+esc(x.uoleh):'')+(x.uwaktu?', '+esc(x.uwaktu):'')+'</div>')+'</div>';
        }).join("");
        box.querySelectorAll("[data-pgu]").forEach(function(b){b.onclick=async function(){
          if(!confirm("Kembalikan nomor PPBJ ke yang lama? Semua data yang memakai nomor baru ikut dikembalikan."))return;
          b.disabled=true;
          try{var u=await api({action:"adminPpbjGantiUrung",id:b.getAttribute("data-pgu")});toast(u.msg||(u.ok?"Berhasil.":"Gagal."),!u.ok);if(u.ok){await muat();if(after)await after();}}
          catch(e){toast("Gagal terhubung ke server.",true);}
          b.disabled=false;
        };});
      }catch(e){box.innerHTML='<div class="note">Gagal terhubung ke server.</div>';}
    }
    muat();
  }
  return {buka:buka,riwayat:riwayat};
})();
