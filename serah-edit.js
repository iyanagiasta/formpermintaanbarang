/* Ganti barang / Ubah nama saat Serah Barang (Tambahan 28). Memakai api(), toast(), esc(), SERAH, loadSerah() milik admin.html. */
var SE=(function(){
  function modal(html){var o=document.createElement("div");o.id="semod";o.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:12px";o.innerHTML='<div class="card" style="max-width:520px;width:100%;max-height:90vh;overflow:auto">'+html+'</div>';document.body.appendChild(o);return o;}
  function tutup(){var o=document.getElementById("semod");if(o)o.remove();}
  function buka(gi,ii,aksi){
    var g=SERAH[gi],it=g.items[ii],pilih=null,tm=null;
    var o=modal('<b>'+(aksi==="ganti"?"Ganti barang":"Ubah nama")+'</b><div class="note">'+esc(g.doc)+' · '+esc(it.nama)+' <small>'+esc(it.kode||"")+'</small></div>'+
      (aksi==="ganti"?'<input type="text" id="se-q" placeholder="Cari kode atau nama barang pengganti..." style="width:100%"><div id="se-h" class="note"></div>':'<input type="text" id="se-n" maxlength="200" value="'+esc(it.nama)+'" style="width:100%">')+
      '<input type="text" id="se-a" maxlength="120" placeholder="Alasan (wajib): salah ketik / user minta ganti / barang setara" style="width:100%;margin-top:6px">'+
      '<div class="bar"><button class="gh" id="se-x">Batal</button><button class="sv" id="se-ok">Simpan</button></div>');
    o.querySelector("#se-x").onclick=tutup;
    if(aksi==="ganti"){o.querySelector("#se-q").oninput=function(){var v=this.value;clearTimeout(tm);tm=setTimeout(async function(){
      var r=await api({action:"adminBarangCari",q:v});var h=o.querySelector("#se-h");
      if(!r.ok){h.textContent=r.msg||"Gagal.";return;}
      h.innerHTML=(r.data||[]).map(function(b,i){return '<div><button class="gh" data-sp="'+i+'">'+esc(b.nama)+' <small>'+esc(b.kode)+' · '+esc(b.satuan)+'</small></button></div>';}).join("")||"Tidak ada.";
      h.querySelectorAll("[data-sp]").forEach(function(bt){bt.onclick=function(){pilih=r.data[Number(bt.getAttribute("data-sp"))];h.innerHTML='Dipilih: <b>'+esc(pilih.nama)+'</b> <small>'+esc(pilih.kode)+'</small>';};});
    },250);};}
    o.querySelector("#se-ok").onclick=async function(){
      var alasan=o.querySelector("#se-a").value.trim();
      if(!alasan){toast("Alasan wajib diisi.",true);return;}
      var p={action:"adminSerahRevisi",id:g.id,no:it.no,aksi:aksi,alasan:alasan};
      if(aksi==="ganti"){if(!pilih){toast("Pilih barang pengganti dulu.",true);return;}p.kode=pilih.kode;}else p.nama=o.querySelector("#se-n").value;
      this.disabled=true;var r=await api(p);this.disabled=false;
      if(!r.ok){toast(r.msg||"Gagal.",true);return;}
      tutup();toast(r.msg+((r.warn&&r.warn.length)?" Perhatian: "+r.warn.join(" "):""));loadSerah();
    };
  }
  function pasang(){
    if(!window.SERAH)return;
    SERAH.forEach(function(g,gi){var card=document.getElementById("sg-"+g.id);if(!card)return;
      var rows=card.querySelectorAll("tbody tr");var ri=0;
      g.items.forEach(function(it,ii){
        var tr=null;while(ri<rows.length){var c=rows[ri++];if(c.querySelector("[data-l=Barang]")){tr=c;break;}}
        if(!tr)return;var td=tr.querySelector("[data-l=Barang]");
        td.insertAdjacentHTML("beforeend",'<div class="bar"><button class="gh" data-se="ganti" data-gi="'+gi+'" data-ii="'+ii+'">Ganti barang</button><button class="gh" data-se="nama" data-gi="'+gi+'" data-ii="'+ii+'">Ubah nama</button></div>');
      });
    });
    document.querySelectorAll("[data-se]").forEach(function(b){b.onclick=function(){buka(Number(b.getAttribute("data-gi")),Number(b.getAttribute("data-ii")),b.getAttribute("data-se"));};});
  }
  return {pasang:pasang,buka:buka};
})();
