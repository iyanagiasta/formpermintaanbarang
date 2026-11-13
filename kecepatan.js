/* Tambahan 39: tab Kecepatan (admin). Menampilkan hasil pengukur kecepatan (ukur.js + server): aksi paling lambat, persen mencapai target,
   rincian server/jaringan/kunci, per versi, perangkat, halaman, pertumbuhan sheet, catatan analisa; unduh Excel (rinci 30 hari dan ringkasan). */
var KPF=(function(){
  var S={hari:7,data:null},el=null,api0=null,toast0=null;
  function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
  function ms(v){return v==null?"-":(v>=10000?(v/1000).toFixed(1)+" dtk":v+" ms");}
  function f(v,u){return v==null?"-":v+(u||"");}
  function warna(p){return p>=95?"d":p>=80?"w":"b";}
  async function load(){
    el.innerHTML='<div class="card msg">Memuat data kecepatan...</div>';
    try{var pc=api0({action:"adminCepatGet"}).catch(function(){return null;});var r=await api0({action:"adminPerfLaporan",hari:S.hari});S.cepat=await pc;
      if(!r||!r.ok){toast0((r&&r.msg)||"Gagal memuat.",true);el.innerHTML='<div class="card msg">'+esc((r&&r.msg)||"Gagal memuat.")+'</div>';return;}
      S.data=r;gambar();
    }catch(e){toast0("Gagal terhubung ke server.",true);}
  }
  function tabel(judul,kol,baris){
    return '<div class="card"><b>'+esc(judul)+'</b>'+(baris.length?'<table><thead><tr>'+kol.map(function(k){return '<th>'+esc(k)+'</th>';}).join("")+'</tr></thead><tbody>'+baris.join("")+'</tbody></table>':'<div class="note">Belum ada data.</div>')+'</div>';
  }
  function gambar(){
    var d=S.data,t=d.total,chip=[[1,"Hari ini"],[7,"7 hari"],[30,"30 hari"]];
    var aksi=d.aksi.map(function(a){
      return '<tr><td data-l="Aksi"><b>'+esc(a.aksi)+'</b></td><td class="nm" data-l="Jumlah">'+a.n+'</td><td class="nm" data-l="Rata-rata">'+ms(a.rata)+'</td><td class="nm" data-l="P95">'+ms(a.p95)+'</td><td class="nm" data-l="Terburuk">'+ms(a.maks)+'</td>'+
        '<td class="nm" data-l="Target">'+ms(a.target)+'</td><td data-l="Tercapai"><span class="bd '+warna(a.pct)+'">'+a.pct+'%</span></td><td class="nm" data-l="Server">'+ms(a.srv)+'</td><td class="nm" data-l="Jaringan">'+ms(a.net)+'</td>'+
        '<td class="nm" data-l="Kunci">'+ms(a.kunci)+'</td><td class="nm" data-l="Dingin">'+f(a.dingin,"%")+'</td><td class="nm" data-l="Data">'+f(a.kb," KB")+'</td><td class="nm" data-l="Cache kena">'+f(a.hit,"%")+'</td><td class="nm" data-l="Gagal">'+a.gagal+'</td><td data-l="Tahap (ms)" style="font-size:11px">'+esc(a.tahap||"-")+'</td></tr>';});
    var grp=function(x){return '<tr><td data-l="Nama"><b>'+esc(x.nama)+'</b></td><td class="nm" data-l="Jumlah">'+x.n+'</td><td class="nm" data-l="Rata-rata">'+ms(x.rata)+'</td><td class="nm" data-l="P95">'+ms(x.p95)+'</td><td data-l="Tercapai"><span class="bd '+warna(x.pct)+'">'+x.pct+'%</span></td><td class="nm" data-l="Gagal">'+x.gagal+'</td></tr>';};
    var uk=(d.ukuran||[]).map(function(x){return '<tr><td data-l="Sheet"><b>'+esc(x.sheet)+'</b></td><td class="nm" data-l="Baris">'+x.baris+'</td><td class="nm" data-l="Tambah">'+(x.tambah==null?"-":(x.tambah>=0?"+":"")+x.tambah)+'</td></tr>';});
    el.innerHTML=kartuSakelar()+'<div class="card"><b>Kecepatan aplikasi</b><div class="note">Dicatat otomatis dari pemakaian nyata. Panggilan cepat dan berhasil hanya diambil sebagian (hasil sudah dibobot); yang lambat atau gagal selalu dicatat. Isinya hanya angka dan nama aksi. Rincian disimpan '+d.simpanHari+' hari, ringkasan harian disimpan seterusnya.</div>'+
      '<div class="tabs">'+chip.map(function(c){return '<button data-kh="'+c[0]+'" class="'+(S.hari===c[0]?"on":"")+'">'+c[1]+'</button>';}).join("")+'</div>'+
      '<div class="bar"><button class="gh" id="kpr">Segarkan</button><button class="gh" id="kpd">Unduh rincian (Excel)</button><button class="gh" id="kpg">Unduh ringkasan harian (Excel)</button></div>'+
      '<div class="note">Periode '+esc(d.awal)+' s.d. hari ini. Versi kode sekarang: '+esc(d.kodeTag)+'. '+d.dicatat+' catatan tersimpan mewakili sekitar '+t.n+' panggilan.</div>'+
      '<div class="note"><b>'+t.n+'</b> panggilan &middot; rata-rata <b>'+ms(t.rata)+'</b> &middot; P95 <b>'+ms(t.p95)+'</b> &middot; mencapai target <span class="bd '+warna(t.pct)+'">'+t.pct+'%</span> &middot; gagal '+t.gagal+'</div></div>'+
      '<div class="card"><b>Catatan analisa otomatis</b>'+((d.catatan||[]).length?'<ul>'+d.catatan.map(function(c){return '<li>'+esc(c)+'</li>';}).join("")+'</ul>':'<div class="note">'+(t.n?"Semua aksi yang cukup datanya mencapai target.":"Belum ada data. Pakai aplikasi beberapa saat lalu segarkan.")+'</div>')+
      '<div class="note">Waktu akses sheet (mencari sheet) kini diukur terpisah; lihat tabel di bawah.</div></div>'+
      ((d.sheetSering||[]).length?'<div class="card"><b>Sheet paling sering diakses</b> <span class="note">(akses per panggilan; makin kecil makin baik)</span><table><thead><tr><th>Sheet</th><th class="nm">Akses</th><th class="nm">Per panggilan</th></tr></thead><tbody>'+d.sheetSering.map(function(x){return '<tr><td data-l="Sheet">'+esc(x.sheet)+'</td><td class="nm" data-l="Akses">'+x.akses+'</td><td class="nm" data-l="Per panggilan">'+x.perPanggilan+'</td></tr>';}).join("")+'</tbody></table></div>':'')+
      ((d.gagalJenis||[]).length?'<div class="card"><b>Jenis kegagalan</b><ul>'+d.gagalJenis.map(function(x){return '<li>'+esc(x.jenis)+': '+x.jumlah+'x</li>';}).join("")+'</ul></div>':'')+
      '<div class="card"><b>Per aksi</b> <span class="note">(urut P95 terlama; P95 = 95% panggilan lebih cepat dari angka ini)</span>'+(aksi.length?'<table><thead><tr><th>Aksi</th><th class="nm">Jumlah</th><th class="nm">Rata-rata</th><th class="nm">P95</th><th class="nm">Terburuk</th><th class="nm">Target</th><th>Tercapai</th><th class="nm">Server</th><th class="nm">Jaringan</th><th class="nm">Kunci</th><th class="nm">Dingin</th><th class="nm">Data</th><th class="nm">Cache kena</th><th class="nm">Gagal</th><th>Tahap di server (ms)</th></tr></thead><tbody>'+aksi.join("")+'</tbody></table>':'<div class="note">Belum ada data.</div>')+'</div>'+
      tabel("Per versi aplikasi / kode (bandingkan sebelum dan sesudah memasang paket)",["Versi","Jumlah","Rata-rata","P95","Tercapai","Gagal"],(d.versi||[]).map(grp))+
      tabel("Per perangkat",["Perangkat","Jumlah","Rata-rata","P95","Tercapai","Gagal"],(d.perangkat||[]).map(grp))+
      tabel("Per halaman (15 terlama)",["Halaman","Jumlah","Rata-rata","P95","Tercapai","Gagal"],(d.halaman||[]).map(grp))+
      tabel("Per hari",["Tanggal","Jumlah","Rata-rata","P95","Tercapai","Gagal"],(d.harian||[]).map(grp))+
      tabel("Ukuran sheet terbesar"+(d.ukuranTgl?" (perubahan sejak "+d.ukuranTgl.dari+")":""),["Sheet","Baris","Tambah"],uk);
    el.querySelectorAll("[data-kh]").forEach(function(b){b.onclick=function(){S.hari=+b.getAttribute("data-kh");load();};});
    pasangSakelar();
    el.querySelector("#kpr").onclick=load;
    el.querySelector("#kpd").onclick=function(){unduh(this,"detail");};
    el.querySelector("#kpg").onclick=function(){unduh(this,"ringkas");};
  }
  /* Tambahan 116: sakelar kecepatan. Tiap sakelar bisa dimatikan bila ada masalah: sistem kembali ke cara lama tanpa pasang ulang kode. */
  function kartuSakelar(){
    var c=S.cepat;if(!c||!c.ok)return "";
    var e=c.etalase||{},baris=(c.sakelar||[]).map(function(x){return [x.k,x.judul,x.ket,x.hidup];});
    baris.push(["Etalase","Hitung laporan berat di belakang","Pemicu tiap 5 menit (06.00-20.00) menyiapkan laporan berat lebih dulu, sehingga saat dibuka langsung tampil. Memakai jatah waktu pemicu Google: hari ini "+String(e.menitHariIni||0).replace(".",",")+" dari maks "+e.menitMaks+" menit."+(e.terakhir?" Terakhir: "+e.terakhir:""),!!e.aktif]);
    return '<div class="card" id="kcSak"><b>Sakelar kecepatan</b><div class="note">Semua hidup = paling cepat. Bila ada yang terasa salah, matikan sakelarnya: sistem kembali ke cara lama seketika.</div>'+
      baris.map(function(x){return '<label style="display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-top:1px solid var(--line,#ddd);cursor:pointer"><input type="checkbox" data-ks="'+esc(x[0])+'"'+(x[3]?" checked":"")+' style="margin-top:3px;width:18px;height:18px;flex:none"><span style="min-width:0"><b>'+esc(x[1])+'</b> <span class="bd '+(x[3]?"d":"w")+'">'+(x[3]?"Hidup":"Mati")+'</span><br><small>'+esc(x[2])+'</small></span></label>';}).join("")+'</div>';
  }
  function pasangSakelar(){
    el.querySelectorAll("[data-ks]").forEach(function(cb){cb.onchange=async function(){
      var k=cb.getAttribute("data-ks"),h=cb.checked;cb.disabled=true;
      try{var r=await api0({action:"adminCepatSet",k:k,hidup:h});if(!r||!r.ok){toast0((r&&r.msg)||"Gagal.",true);cb.checked=!h;cb.disabled=false;return;}
        S.cepat=r;var box=el.querySelector("#kcSak");if(box){box.outerHTML=kartuSakelar();pasangSakelar();}toast0("Sakelar "+(h?"dihidupkan":"dimatikan")+".");}
      catch(e){toast0("Gagal terhubung ke server.",true);cb.checked=!h;cb.disabled=false;}
    };});
  }
  async function unduh(btn,jenis){
    if(typeof XLSX==="undefined"){toast0("Pembuat Excel belum termuat. Periksa internet lalu muat ulang.",true);return;}
    var tek=btn.textContent;btn.disabled=true;btn.textContent="Mengambil data...";
    try{var r=await api0({action:"adminPerfUnduh"});if(!r||!r.ok){toast0((r&&r.msg)||"Gagal.",true);return;}
      var wb=XLSX.utils.book_new(),t=new Date(),p=function(n){return String(n).padStart(2,"0");},cap=t.getFullYear()+p(t.getMonth()+1)+p(t.getDate());
      if(jenis==="detail"){XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([r.headDetail].concat(r.detail)),"Rincian");}
      else{XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([r.headRingkas].concat(r.ringkas)),"Ringkasan Harian");XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([r.headUkuran].concat(r.ukuran)),"Ukuran Sheet");}
      XLSX.writeFile(wb,NB.buat("xlsx","Kecepatan Aplikasi",jenis==="detail"?"Rincian":"Ringkasan"));
      toast0((jenis==="detail"?r.detail.length+" baris rincian":r.ringkas.length+" baris ringkasan")+" diunduh."+(r.terpotong&&jenis==="detail"?" (dipotong 30.000 terbaru)":""));
    }catch(e){toast0("Gagal: "+(e&&e.message||e),true);}
    finally{btn.disabled=false;btn.textContent=tek;}
  }
  function mount(pane,api,toast){el=pane;api0=api;toast0=toast;load();}
  return {mount:mount};
})();
