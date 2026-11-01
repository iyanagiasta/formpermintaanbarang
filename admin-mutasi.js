/* Mutasi Pintar (Tambahan 23): Kartu Stok, Laporan Persediaan, Stok per Tanggal, Pemeriksaan, Analisis, ringkasan, tautan baca,
   telusur (klik), dan cari dengan kalimat biasa. Dipakai oleh tab Mutasi di admin.html (memakai api, esc, fmtN, rp, toast, pane, unduhXlsx, prediksi). */
var MX=(function(){
  var ALAT=[["kartu","Kartu Stok"],["lap","Laporan Persediaan"],["tgl","Stok per Tanggal"],["periksa","Pemeriksaan"],["analisis","Analisis Stok"]];
  var STD=[["rinci","Rincian"],["dept","Per departemen"],["proyek","Per proyek / PPBJ"],["barang","Per barang"]];
  var S={kartu:{kode:"",nama:"",dari:"",sampai:"",data:null},lap:{dari:"",sampai:"",data:null,q:""},tgl:{tanggal:"",data:null,q:""},periksa:{dari:"",sampai:"",data:null,buka:""},analisis:{tidur:90,habis:14,jendela:90,data:null}};
  var X={catatan:""};
  function iso(d){var p=function(n){return String(n).padStart(2,"0");};return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate());}
  function hari(n){var t=new Date();return iso(new Date(t.getFullYear(),t.getMonth(),t.getDate()-n));}
  function awalBulan(){var t=new Date();return iso(new Date(t.getFullYear(),t.getMonth(),1));}
  function ada(v){return ALAT.some(function(a){return a[0]===v;});}
  function tombol(cur){return ALAT.map(function(a){return '<button class="chip'+(cur===a[0]?" on":"")+'" data-mv="'+a[0]+'">'+a[1]+'</button>';}).join("");}
  function $(i){return document.getElementById(i);}
  function warna(q){return q<0?"var(--red,#a82424)":"var(--grn,#14602f)";}
  function tgl(s){var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s||""));return m?m[3]+"/"+m[2]+"/"+m[1]:String(s||"");}
  function salin(teks,ok){
    function fb(){var t=document.createElement("textarea");t.value=teks;t.style.cssText="position:fixed;opacity:0";document.body.appendChild(t);t.select();var b=false;try{b=document.execCommand("copy");}catch(e){}document.body.removeChild(t);return b;}
    if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(teks).then(function(){toast(ok||"Tersalin.");},function(){toast(fb()?(ok||"Tersalin."):"Gagal menyalin. Salin manual.",!fb());});}
    else toast(fb()?(ok||"Tersalin."):"Gagal menyalin. Salin manual.",false);
  }
  function tiles(a){return '<div class="sum">'+a.map(function(t){return '<div><b'+(t[2]?' style="color:'+t[2]+'"':'')+'>'+t[0]+'</b><span>'+t[1]+'</span></div>';}).join("")+'</div>';}
  function tab(kep,baris,rata){return '<table><thead><tr>'+kep.map(function(k,i){return '<th'+(rata&&rata.indexOf(i)>=0?' class="nm"':'')+'>'+k+'</th>';}).join("")+'</tr></thead><tbody>'+baris.join("")+'</tbody></table>';}
  function ksLink(kode,nama){return '<b class="ks" data-ks="'+esc(kode)+'" data-kn="'+esc(nama)+'" title="Buka Kartu Stok barang ini">'+esc(nama)+'</b><small>'+esc(kode)+'</small>';}
  function pasangKs(root){Array.prototype.forEach.call(root.querySelectorAll("[data-ks]"),function(b){b.onclick=function(e){e.preventDefault();bukaKartu(b.getAttribute("data-ks"),b.getAttribute("data-kn"));};});}
  function pasangCetak(root){Array.prototype.forEach.call(root.querySelectorAll("[data-cetak]"),function(b){b.onclick=async function(){
    var w=window.open("","_blank");b.disabled=true;
    try{var x=await api({action:"adminCetakLink",ref:b.getAttribute("data-cetak")});
      if(x.ok&&x.url){if(w)w.location.href=x.url;else window.location.href=x.url;}else{if(w)w.close();toast(x.msg||"Gagal membuka bukti.",true);}
    }catch(e){if(w)w.close();toast("Gagal terhubung ke server.",true);}
    b.disabled=false;};});}
  function periodeBar(pfx,s,tambah){
    return '<label class="fl">Dari <input type="date" id="'+pfx+'_d" value="'+esc(s.dari)+'"></label><label class="fl">Sampai <input type="date" id="'+pfx+'_s" value="'+esc(s.sampai)+'"></label>'+
      [["bulan","Bulan ini"],["lalu","Bulan lalu"],["30","30 hari"],["tahun","Tahun ini"]].map(function(p){return '<button class="chip" data-pp="'+p[0]+'">'+p[1]+'</button>';}).join("")+(tambah||"");
  }
  function periodeAtur(root,pfx,s,muat){
    Array.prototype.forEach.call(root.querySelectorAll("[data-pp]"),function(b){b.onclick=function(){
      var t=new Date(),k=b.getAttribute("data-pp");
      if(k==="bulan"){s.dari=awalBulan();s.sampai=hari(0);}
      else if(k==="lalu"){s.dari=iso(new Date(t.getFullYear(),t.getMonth()-1,1));s.sampai=iso(new Date(t.getFullYear(),t.getMonth(),0));}
      else if(k==="30"){s.dari=hari(29);s.sampai=hari(0);}
      else {s.dari=iso(new Date(t.getFullYear(),0,1));s.sampai=hari(0);}
      $(pfx+"_d").value=s.dari;$(pfx+"_s").value=s.sampai;muat();};});
  }
  async function panggil(b,wadah){
    wadah.innerHTML='<div class="card msg">Memuat...</div>';
    try{var r=await api(b);if(!r.ok){wadah.innerHTML='<div class="card msg">'+esc(r.msg||"Gagal.")+'</div>';toast(r.msg||"Gagal.",true);return null;}return r;}
    catch(e){wadah.innerHTML='<div class="card msg">Gagal terhubung ke server.</div>';toast("Gagal terhubung ke server.",true);return null;}
  }

  /* ---------- kerangka: baris tombol tampilan + wadah alat ---------- */
  function gambar(){
    pane().innerHTML='<div class="card"><div class="bar">'+STD.map(function(v){return '<button class="chip" data-mv="'+v[0]+'">'+v[1]+'</button>';}).join("")+'<span class="note" style="margin:0 4px">|</span>'+tombol(MVIEW)+'</div></div><div id="mx"></div>';
    Array.prototype.forEach.call(pane().querySelectorAll("[data-mv]"),function(b){b.onclick=function(){MVIEW=b.getAttribute("data-mv");if(ada(MVIEW))gambar();else drawMutasi();};});
    var el=$("mx");
    ({kartu:vKartu,lap:vLap,tgl:vTgl,periksa:vPeriksa,analisis:vAnalisis})[MVIEW](el);
  }
  function bukaKartu(kode,nama){S.kartu.kode=kode;S.kartu.nama=nama||kode;S.kartu.data=null;MVIEW="kartu";gambar();}

  /* ---------- 1. Kartu Stok ---------- */
  function vKartu(el){
    var s=S.kartu;
    el.innerHTML='<div class="card"><div class="bar"><div style="position:relative;flex:1;min-width:220px"><input id="ks_q" placeholder="Ketik nama atau kode barang..." value="'+esc(s.nama)+'" style="width:100%"></div>'+periodeBar("ks",s)+'<button class="sv" id="ks_go">Tampilkan</button></div><div class="note">Kartu Stok = riwayat satu barang dari yang terlama, lengkap dengan saldo berjalan. Kosongkan tanggal untuk melihat seluruh riwayat.</div></div><div id="ks_h"></div>';
    prediksi($("ks_q"),function(x){s.kode=x.kode;s.nama=x.nama;s.data=null;muat();});
    $("ks_go").onclick=function(){muat();};
    periodeAtur(el,"ks",s,function(){muat();});
    if(s.kode&&!s.data)muat();else if(s.data)tampil();
    async function muat(){
      s.dari=$("ks_d").value;s.sampai=$("ks_s").value;
      if(!s.kode){toast("Pilih barang dari daftar saran yang muncul saat mengetik.",true);return;}
      var r=await panggil({action:"adminKartuStok",kode:s.kode,dari:s.dari,sampai:s.sampai},$("ks_h"));if(!r)return;s.data=r;tampil();
    }
    function tampil(){
      var r=s.data,i=r.info,h="";
      var badge=r.tanpaRiwayat?'<span class="tag w">Belum ada catatan mutasi untuk barang ini</span>':
        r.cocok===true?'<span class="tag">&#10003; Saldo hasil mutasi sama dengan stok di sistem ('+fmtN(r.stokKini)+')</span>':
        r.cocok===false?'<span class="tag w">Saldo hasil mutasi '+fmtN(r.akhirSemua!=null?r.akhirSemua:(r.stokKini-r.selisihKini))+' &ne; stok di sistem '+fmtN(r.stokKini)+' (selisih '+fmtN(r.selisihKini)+')</span>':"";
      h+='<div class="card"><b style="font-size:17px">'+esc(i.nama)+'</b> <small>'+esc(i.kode)+(i.satuan?' &middot; '+esc(i.satuan):'')+(i.harga!=null?' &middot; harga '+rp(i.harga):'')+'</small><div style="margin-top:6px">'+badge+(r.lompat?' <span class="tag w">'+r.lompat+' lompatan saldo</span>':'')+'</div></div>';
      h+=tiles([[fmtN(r.awal),"Saldo awal"],[fmtN(r.masuk),"Masuk","var(--grn,#14602f)"],[fmtN(r.keluar),"Keluar","var(--red,#a82424)"],[fmtN(r.penyesuaian),"Penyesuaian (opname/koreksi/unggah)"],[fmtN(r.akhir),"Saldo akhir"]]);
      h+='<div class="bar"><button class="gh" id="ks_x"'+(r.rows.length?"":" disabled")+'>Unduh Excel</button></div>';
      h+=r.rows.length?tab(["Waktu","Jenis","Sumber","Qty","Saldo","Saldo sumber","Referensi / Dept / Proyek","Keterangan",""],r.rows.map(function(m){
        return '<tr'+(m.lompat?' style="background:rgba(168,36,36,.12)"':'')+'><td data-l="Waktu">'+esc(m.waktu)+'</td><td data-l="Jenis">'+esc(m.jenis)+'</td><td data-l="Sumber">'+esc(m.sumber)+'</td><td class="nm" data-l="Qty"><b style="color:'+warna(m.qty)+'">'+(m.qty>0?"+":"")+fmtN(m.qty)+'</b></td><td class="nm" data-l="Saldo"><b>'+fmtN(m.saldo)+'</b></td><td class="nm" data-l="Saldo sumber">'+fmtN(m.saldoSumber)+'</td>'+
          '<td data-l="Referensi">'+esc(m.ref)+'<small>'+esc(m.dept)+(m.proyek?' &middot; '+esc(m.proyek):'')+'</small></td><td data-l="Keterangan"><small style="margin:0">'+esc(m.ket)+(m.oleh?' ['+esc(m.oleh)+']':'')+(m.lompat?'<br><b style="color:var(--red,#a82424)">Saldo melompat '+(m.lompat>0?"+":"")+fmtN(m.lompat)+' tanpa transaksi yang menjelaskan</b>':'')+'</small></td><td>'+(m.ref&&m.jenis==="Serah"?'<button class="gh" data-cetak="'+esc(m.ref)+'">Bukti</button>':'')+'</td></tr>';}),[3,4,5]):'<div class="card msg">Tidak ada catatan pada periode ini.</div>';
      h+='<div class="note">'+(r.terpotong?'Hanya 1.500 catatan terbaru yang ditampilkan; unduh Excel untuk semuanya. ':'')+'Baris merah = saldo tidak nyambung dengan transaksi sebelumnya (kemungkinan ada perubahan langsung di spreadsheet atau transaksi yang tidak tercatat).</div>';
      $("ks_h").innerHTML=h;pasangCetak($("ks_h"));
      $("ks_x").onclick=async function(){var b=this;b.disabled=true;
        try{var u=await api({action:"adminKartuStok",kode:s.kode,dari:s.dari,sampai:s.sampai,unduh:true});if(!u.ok){toast(u.msg||"Gagal.",true);}else{
          var rows=[["Kartu Stok",u.info.nama,u.info.kode,"Periode",s.dari?tgl(s.dari)+" s.d. "+tgl(s.sampai||hari(0)):"Seluruh riwayat"],["Saldo awal",u.awal,"Masuk",u.masuk,"Keluar",u.keluar,"Penyesuaian",u.penyesuaian,"Saldo akhir",u.akhir],[],["Waktu","Jenis","Sumber","Qty","Saldo","Saldo Sumber","Referensi","Departemen","Proyek","Keterangan","Oleh","Harga","Lompatan Saldo"]].concat(u.rows.map(function(m){return [m.waktu,m.jenis,m.sumber,m.qty,m.saldo,m.saldoSumber,m.ref,m.dept,m.proyek,m.ket,m.oleh,m.harga==null?"":m.harga,m.lompat||""];}));
          unduhXlsx("kartu_stok_"+u.info.kode+".xlsx","Kartu Stok",rows,[18,14,10,10,10,12,18,14,18,30,12,10,12]);}
        }catch(e){toast("Gagal terhubung ke server.",true);}b.disabled=false;};
      pasangKs($("ks_h"));
    }
  }

  /* ---------- 2. Laporan Mutasi Persediaan ---------- */
  function vLap(el){
    var s=S.lap;if(!s.dari){s.dari=awalBulan();s.sampai=hari(0);}
    el.innerHTML='<div class="card"><div class="bar">'+periodeBar("lp",s)+'<input id="lp_q" placeholder="Saring nama / kode barang" value="'+esc(s.q)+'" style="min-width:180px"><button class="sv" id="lp_go">Tampilkan</button><button class="gh" id="lp_x" disabled>Unduh Excel</button></div><div class="note">Saldo awal + masuk &minus; keluar &plusmn; penyesuaian = saldo akhir, per barang. Format yang lazim diminta auditor.</div></div><div id="lp_h"></div>';
    $("lp_go").onclick=muat;periodeAtur(el,"lp",s,muat);
    $("lp_q").oninput=function(){s.q=this.value;if(s.data)tampil();};
    $("lp_x").onclick=async function(){var b=this;b.disabled=true;
      try{var u=await api({action:"adminMutasiLaporan",dari:s.dari,sampai:s.sampai,unduh:true});if(!u.ok)toast(u.msg||"Gagal.",true);else{
        var rows=[["Laporan Mutasi Persediaan",tgl(u.dari)+" s.d. "+tgl(u.sampai)],[u.catatan],[],["Kode","Nama Barang","Satuan","Saldo Awal","Masuk","Keluar","Penyesuaian","Saldo Akhir","Selisih Tak Terjelaskan","Harga","Nilai Awal","Nilai Masuk","Nilai Keluar","Nilai Penyesuaian","Nilai Akhir"]].concat(u.rows.map(function(x){return [x.kode,x.nama,x.satuan,x.awal,x.masuk,x.keluar,x.adj,x.akhir,x.takJelas||"",x.harga==null?"":x.harga,x.nAwal==null?"":x.nAwal,x.nMasuk,x.nKeluar,x.nAdj,x.nAkhir==null?"":x.nAkhir];}));
        rows.push([],["TOTAL NILAI","","","","","","","","","",u.nilai.awal,u.nilai.masuk,u.nilai.keluar,u.nilai.adj,u.nilai.akhir]);
        unduhXlsx("laporan_persediaan_"+u.dari+"_sd_"+u.sampai+".xlsx","Persediaan",rows,[16,40,8,11,11,11,11,11,12,11,14,14,14,14,14]);}
      }catch(e){toast("Gagal terhubung ke server.",true);}b.disabled=false;};
    if(s.data)tampil();else muat();
    async function muat(){
      s.dari=$("lp_d").value;s.sampai=$("lp_s").value;
      var r=await panggil({action:"adminMutasiLaporan",dari:s.dari,sampai:s.sampai},$("lp_h"));if(!r)return;s.data=r;$("lp_x").disabled=false;tampil();
    }
    function tampil(){
      var r=s.data,q=(s.q||"").toLowerCase().trim(),L=r.rows.filter(function(x){return !q||(x.nama+" "+x.kode).toLowerCase().indexOf(q)>=0;}),h="";
      h+=tiles([[rp(r.nilai.awal),"Nilai saldo awal"],[rp(r.nilai.masuk),"Nilai masuk"],[rp(r.nilai.keluar),"Nilai keluar"],[rp(r.nilai.adj),"Penyesuaian bersih"],[rp(r.nilai.akhir),"Nilai saldo akhir"]]);
      h+='<div class="note">'+esc(r.catatan)+(r.tanpaHarga?' '+r.tanpaHarga+' barang belum punya harga sehingga nilainya tidak terhitung.':'')+(r.takJelas?' <b style="color:var(--red,#a82424)">'+r.takJelas+' barang punya selisih yang tidak terjelaskan transaksi (tanda &ne;); lihat tab Pemeriksaan.</b>':'')+'</div>';
      h+=L.length?tab(["Barang","Awal","Masuk","Keluar","Penyesuaian","Akhir","Nilai akhir",""],L.map(function(x){
        return '<tr'+(x.takJelas?' style="background:rgba(168,36,36,.12)"':'')+'><td data-l="Barang">'+ksLink(x.kode,x.nama)+'</td><td class="nm" data-l="Awal">'+fmtN(x.awal)+'</td><td class="nm" data-l="Masuk"><span style="color:var(--grn,#14602f)">'+(x.masuk?"+"+fmtN(x.masuk):"-")+'</span></td><td class="nm" data-l="Keluar"><span style="color:var(--red,#a82424)">'+(x.keluar?"-"+fmtN(x.keluar):"-")+'</span></td><td class="nm" data-l="Penyesuaian">'+(x.adj?(x.adj>0?"+":"")+fmtN(x.adj):"-")+'</td><td class="nm" data-l="Akhir"><b>'+fmtN(x.akhir)+'</b> '+esc(x.satuan)+'</td><td class="nm" data-l="Nilai akhir">'+rp(x.nAkhir)+'</td><td>'+(x.takJelas?'<span title="Selisih tak terjelaskan '+fmtN(x.takJelas)+'" style="color:var(--red,#a82424);font-weight:700">&ne; '+fmtN(x.takJelas)+'</span>':'')+'</td></tr>';}),[1,2,3,4,5,6]):'<div class="card msg">Tidak ada barang bergerak pada periode ini.</div>';
      h+='<div class="note">'+(r.terpotong?'Hanya 3.000 barang pertama yang ditampilkan; unduh Excel untuk semuanya. ':'')+'Klik nama barang untuk membuka Kartu Stok-nya.</div>';
      $("lp_h").innerHTML=h;pasangKs($("lp_h"));
    }
  }

  /* ---------- 3. Stok per Tanggal ---------- */
  function vTgl(el){
    var s=S.tgl;if(!s.tanggal)s.tanggal=hari(1);
    el.innerHTML='<div class="card"><div class="bar"><label class="fl">Tanggal <input type="date" id="tg_t" value="'+esc(s.tanggal)+'"></label><button class="chip" data-tp="kemarin">Kemarin</button><button class="chip" data-tp="bulanlalu">Akhir bulan lalu</button><button class="chip" data-tp="tahunlalu">Akhir tahun lalu</button><input id="tg_q" placeholder="Saring nama / kode barang" value="'+esc(s.q)+'" style="min-width:180px"><button class="sv" id="tg_go">Tampilkan</button><button class="gh" id="tg_x" disabled>Unduh Excel</button></div><div class="note">Stok semua barang pada akhir tanggal yang dipilih, dihitung mundur dari catatan mutasi. Cocok untuk batas waktu (cut-off) akhir bulan atau akhir tahun.</div></div><div id="tg_h"></div>';
    $("tg_go").onclick=muat;
    Array.prototype.forEach.call(el.querySelectorAll("[data-tp]"),function(b){b.onclick=function(){var t=new Date(),k=b.getAttribute("data-tp");
      $("tg_t").value=k==="kemarin"?hari(1):k==="bulanlalu"?iso(new Date(t.getFullYear(),t.getMonth(),0)):iso(new Date(t.getFullYear()-1,11,31));muat();};});
    $("tg_q").oninput=function(){s.q=this.value;if(s.data)tampil();};
    $("tg_x").onclick=async function(){var b=this;b.disabled=true;
      try{var u=await api({action:"adminStokPada",tanggal:s.tanggal,unduh:true});if(!u.ok)toast(u.msg||"Gagal.",true);else{
        var rows=[["Stok per tanggal",tgl(u.tanggal)],[u.catatan||""],[],["Kode","Nama Barang","Satuan","Bekas","Moka","Accurate","Total","Harga","Nilai (Moka+Accurate)","Stok Sekarang"]].concat(u.rows.map(function(x){return [x.kode,x.nama,x.satuan,x.q[0],x.q[1],x.q[2],x.total,x.harga==null?"":x.harga,x.nilai==null?"":x.nilai,x.kini];}));
        unduhXlsx("stok_per_"+u.tanggal+".xlsx","Stok",rows,[16,40,8,10,10,10,10,12,16,12]);}
      }catch(e){toast("Gagal terhubung ke server.",true);}b.disabled=false;};
    if(s.data)tampil();else muat();
    async function muat(){
      s.tanggal=$("tg_t").value;if(!s.tanggal){toast("Pilih tanggal.",true);return;}
      var r=await panggil({action:"adminStokPada",tanggal:s.tanggal},$("tg_h"));if(!r)return;s.data=r;$("tg_x").disabled=false;tampil();
    }
    function tampil(){
      var r=s.data,q=(s.q||"").toLowerCase().trim(),L=r.rows.filter(function(x){return !q||(x.nama+" "+x.kode).toLowerCase().indexOf(q)>=0;}),h="";
      h+=tiles([[tgl(r.tanggal),"Posisi akhir tanggal"],[r.total,"Barang berstok"],[rp(r.nilai),"Nilai stok (Moka + Accurate)"]]);
      if(r.catatan)h+='<div class="note"><b>Catatan:</b> '+esc(r.catatan)+'</div>';
      h+=L.length?tab(["Barang","Bekas","Moka","Accurate","Total","Sekarang","Nilai"],L.map(function(x){
        var beda=Math.abs(x.kini-x.total)>0.0005;
        return '<tr><td data-l="Barang">'+ksLink(x.kode,x.nama)+'</td><td class="nm" data-l="Bekas">'+fmtN(x.q[0])+'</td><td class="nm" data-l="Moka">'+fmtN(x.q[1])+'</td><td class="nm" data-l="Accurate">'+fmtN(x.q[2])+'</td><td class="nm" data-l="Total"><b>'+fmtN(x.total)+'</b> '+esc(x.satuan)+'</td><td class="nm" data-l="Sekarang">'+(beda?'<span style="color:var(--mut)">':'<span>')+fmtN(x.kini)+'</span></td><td class="nm" data-l="Nilai">'+rp(x.nilai)+'</td></tr>';}),[1,2,3,4,5,6]):'<div class="card msg">Tidak ada stok pada tanggal ini.</div>';
      h+='<div class="note">'+(r.terpotong?'Hanya 3.000 barang pertama yang ditampilkan; unduh Excel untuk semuanya. ':'')+'Nilai memakai harga saat ini; stok Bekas tidak dinilai.</div>';
      $("tg_h").innerHTML=h;pasangKs($("tg_h"));
    }
  }

  /* ---------- 4. Pemeriksaan + Segel ---------- */
  var JENIS_P=[
    ["lompat","Saldo melompat","wajib","Saldo barang tidak nyambung dengan transaksi sebelumnya. Bisa berarti ada transaksi yang tidak tercatat atau data diubah langsung di spreadsheet."],
    ["sinkron","Stok &ne; hasil mutasi","wajib","Stok di sheet Stok berbeda dengan saldo akhir menurut catatan mutasi."],
    ["tanpaHarga","Tanpa harga","info","Transaksi Moka/Accurate yang belum punya harga, jadi nilainya belum terhitung."],
    ["adjBesar","Koreksi / opname besar","info","Penyesuaian stok bernilai besar (batas bisa diubah di sheet Pengaturan: Batas Koreksi Besar)."],
    ["keluarTanpaDok","Keluar tanpa dokumen","info","Barang keluar yang tidak punya nomor dokumen."],
    ["qtyJanggal","Jumlah keluar tak lazim","info","Jumlah keluar lebih dari 5 kali kebiasaan barang itu."],
    ["lonjakHarga","Lonjakan harga beli","info","Harga beli berubah lebih dari 30% dari pembelian sebelumnya."]];
  function kolomP(j,x){
    var d='<td data-l="Waktu">'+esc(x.waktu||"")+'</td><td data-l="Barang">'+ksLink(x.kode,x.nama)+'</td>';
    if(j==="sinkron")return '<td data-l="Barang">'+ksLink(x.kode,x.nama)+'</td><td data-l="Sumber">'+esc(x.sumber)+'</td><td class="nm" data-l="Menurut mutasi">'+fmtN(x.mutasi)+'</td><td class="nm" data-l="Di sheet Stok">'+fmtN(x.stok)+'</td><td class="nm" data-l="Selisih"><b>'+(x.selisih>0?"+":"")+fmtN(x.selisih)+'</b></td>';
    var tam={lompat:'<td data-l="Jenis">'+esc(x.jenis)+' '+esc(x.sumber)+'</td><td class="nm" data-l="Qty">'+fmtN(x.qty)+'</td><td class="nm" data-l="Selisih"><b>'+(x.selisih>0?"+":"")+fmtN(x.selisih)+'</b></td>',
      tanpaHarga:'<td data-l="Jenis">'+esc(x.jenis)+' '+esc(x.sumber)+'</td><td class="nm" data-l="Qty">'+fmtN(x.qty)+'</td><td data-l="Dokumen">'+esc(x.ref)+'</td>',
      adjBesar:'<td data-l="Jenis">'+esc(x.jenis)+' '+esc(x.sumber)+'</td><td class="nm" data-l="Qty">'+fmtN(x.qty)+'</td><td class="nm" data-l="Nilai">'+rp(x.nilai)+'</td>',
      keluarTanpaDok:'<td data-l="Jenis">'+esc(x.jenis)+' '+esc(x.sumber)+'</td><td class="nm" data-l="Qty">'+fmtN(x.qty)+'</td>',
      qtyJanggal:'<td data-l="Dokumen">'+esc(x.ref)+'</td><td class="nm" data-l="Qty">'+fmtN(x.qty)+'</td><td class="nm" data-l="Biasanya">'+fmtN(x.biasanya)+'</td>',
      lonjakHarga:'<td class="nm" data-l="Harga">'+rp(x.harga)+'</td><td class="nm" data-l="Sebelumnya">'+rp(x.sebelumnya)+'</td><td class="nm" data-l="Perubahan"><b>'+(x.persen>0?"+":"")+x.persen+'%</b></td>'}[j];
    return d+tam;
  }
  var KEPALA_P={sinkron:["Barang","Sumber","Menurut mutasi","Di sheet Stok","Selisih"],lompat:["Waktu","Barang","Jenis","Qty","Selisih"],tanpaHarga:["Waktu","Barang","Jenis","Qty","Dokumen"],adjBesar:["Waktu","Barang","Jenis","Qty","Nilai"],keluarTanpaDok:["Waktu","Barang","Jenis","Qty"],qtyJanggal:["Waktu","Barang","Dokumen","Qty","Biasanya"],lonjakHarga:["Waktu","Barang","Harga","Sebelumnya","Perubahan"]};
  function vPeriksa(el){
    var s=S.periksa;if(!s.dari){s.dari=hari(30);s.sampai=hari(0);}
    el.innerHTML='<div class="card"><div class="bar"><label class="fl">Periksa transaksi dari <input type="date" id="pk_d" value="'+esc(s.dari)+'"></label><label class="fl">sampai <input type="date" id="pk_s" value="'+esc(s.sampai)+'"></label><button class="sv" id="pk_go">Periksa sekarang</button></div><div class="note">Saldo melompat, stok tidak sinkron, dan segel bulanan diperiksa untuk seluruh riwayat. Temuan lainnya hanya untuk periode di atas.</div></div><div id="pk_h"></div>';
    $("pk_go").onclick=muat;
    if(s.data)tampil();else muat();
    async function muat(){
      s.dari=$("pk_d").value;s.sampai=$("pk_s").value;
      var r=await panggil({action:"adminMutasiPeriksa",dari:s.dari,sampai:s.sampai},$("pk_h"));if(!r)return;s.data=r;tampil();
    }
    function tampil(){
      var r=s.data,h="",wajib=r.hitung.lompat+r.hitung.sinkron+r.segelBerubah,info=0;
      JENIS_P.forEach(function(j){if(j[2]==="info")info+=r.hitung[j[0]]||0;});
      h+=wajib?'<div class="card" style="border-left:6px solid var(--red,#a82424)"><b>Perlu dicek: '+wajib+' temuan penting</b><div class="note" style="margin-top:4px">Saldo melompat '+r.hitung.lompat+', stok tidak sinkron '+r.hitung.sinkron+', segel berubah '+r.segelBerubah+'. Temuan lain (info): '+info+'.</div></div>':
        '<div class="card" style="border-left:6px solid var(--grn,#14602f)"><b>Data mutasi utuh</b><div class="note" style="margin-top:4px">Tidak ada saldo melompat, stok sinkron dengan mutasi, dan semua segel bulanan utuh. Temuan info lain: '+info+'.</div></div>';
      if(r.baruSegel)h+='<div class="note">'+r.baruSegel+' bulan yang sudah lewat baru saja disegel otomatis.</div>';
      if(r.tanpaRiwayat)h+='<div class="note">'+r.tanpaRiwayat+' barang berstok tidak punya catatan mutasi sama sekali (kemungkinan stok awal yang tidak diunggah lewat sistem), jadi tidak ikut diperiksa.</div>';
      h+='<div class="bar">'+JENIS_P.map(function(j){var n=r.hitung[j[0]]||0;return '<button class="chip'+(s.buka===j[0]?" on":"")+'" data-pj="'+j[0]+'" title="'+esc(j[3].replace(/&ne;/g,"≠"))+'">'+j[1]+': <b>'+n+'</b></button>';}).join("")+'<button class="chip'+(s.buka==="segel"?" on":"")+'" data-pj="segel">Segel bulanan: <b>'+r.segel.length+'</b></button></div>';
      h+='<div id="pk_d2"></div>';
      $("pk_h").innerHTML=h;
      Array.prototype.forEach.call($("pk_h").querySelectorAll("[data-pj]"),function(b){b.onclick=function(){s.buka=b.getAttribute("data-pj");tampil();};});
      if(!s.buka){var p=JENIS_P.filter(function(j){return r.hitung[j[0]];})[0];s.buka=p?p[0]:(r.segel.length?"segel":"");if(s.buka){tampil();return;}}
      var w=$("pk_d2");
      if(s.buka==="segel"){
        var blm=r.segel.filter(function(x){return x.status==="belum";}).length;
        w.innerHTML='<div class="note">Segel = sidik jari digital (SHA-256) dari seluruh catatan mutasi satu bulan, disimpan di sheet SegelMutasi. Kalau ada baris yang diubah atau dihapus setelah disegel, status berubah menjadi <b>berubah</b>. Bulan berjalan baru disegel setelah bulan berakhir.</div>'+
          (r.segel.length?tab(["Bulan","Status","Baris sekarang","Baris saat disegel","Disegel","Sidik"],r.segel.map(function(x){
            var c=x.status==="utuh"?"var(--grn,#14602f)":x.status==="berubah"?"var(--red,#a82424)":"var(--mut)";
            return '<tr><td data-l="Bulan"><b>'+esc(x.periode)+'</b></td><td data-l="Status"><b style="color:'+c+'">'+(x.status==="utuh"?"&#10003; Utuh":x.status==="berubah"?"&#9888; Berubah setelah disegel":"Belum disegel")+'</b></td><td class="nm" data-l="Baris sekarang">'+x.baris+'</td><td class="nm" data-l="Baris saat disegel">'+(x.barisSegel==null?"-":x.barisSegel)+'</td><td data-l="Disegel">'+esc(x.disegel||"-")+(x.oleh?'<small>'+esc(x.oleh)+'</small>':'')+'</td><td data-l="Sidik"><code>'+esc(x.sidik||"-")+'</code></td></tr>';}),[2,3]):'<div class="card msg">Belum ada bulan yang bisa disegel.</div>')+
          (blm?'<div class="bar"><button class="sv" id="pk_sg">Segel '+blm+' bulan yang belum</button></div>':"");
        var sg=$("pk_sg");if(sg)sg.onclick=async function(){sg.disabled=true;try{var x=await api({action:"adminMutasiSegel",aksi:"segel"});if(!x.ok)toast(x.msg||"Gagal.",true);else{toast(x.baru+" bulan disegel.");muat();}}catch(e){toast("Gagal terhubung ke server.",true);}sg.disabled=false;};
      }else if(s.buka){
        var j=JENIS_P.filter(function(a){return a[0]===s.buka;})[0],L=r.daftar[s.buka]||[];
        w.innerHTML='<div class="note">'+j[3]+(r.hitung[s.buka]>L.length?' Menampilkan '+L.length+' dari '+r.hitung[s.buka]+'.':'')+'</div>'+(L.length?tab(KEPALA_P[s.buka],L.map(function(x){return '<tr>'+kolomP(s.buka,x)+'</tr>';}),s.buka==="sinkron"?[2,3,4]:[3,4]):'<div class="card msg">Tidak ada temuan jenis ini.</div>');
        pasangKs(w);
      }
    }
  }

  /* ---------- 5. Analisis Stok ---------- */
  function vAnalisis(el){
    var s=S.analisis;
    el.innerHTML='<div class="card"><div class="bar"><label class="fl">Barang tidur jika tak keluar &gt; <input type="number" id="an_t" min="7" value="'+s.tidur+'" style="width:70px"> hari</label><label class="fl">Calon beli jika habis &lt; <input type="number" id="an_h" min="1" value="'+s.habis+'" style="width:60px"> hari</label><label class="fl">Pemakaian dihitung dari <input type="number" id="an_j" min="7" value="'+s.jendela+'" style="width:70px"> hari terakhir</label><button class="sv" id="an_go">Hitung</button></div><div class="note">Angka-angka ini usulan dan bisa Anda ubah. Jasa tidak ikut dihitung.</div></div><div id="an_h2"></div>';
    $("an_go").onclick=muat;
    if(s.data)tampil();else muat();
    async function muat(){
      s.tidur=Number($("an_t").value)||90;s.habis=Number($("an_h").value)||14;s.jendela=Number($("an_j").value)||90;
      var r=await panggil({action:"adminMutasiAnalisis",hariTidur:s.tidur,hariHabis:s.habis,jendela:s.jendela},$("an_h2"));if(!r)return;s.data=r;tampil();
    }
    function tampil(){
      var r=s.data,h="";
      h+=tiles([[r.nCalon,"Calon beli (habis < "+r.hariHabis+" hari)","var(--red,#a82424)"],[r.nTidur,"Barang tidur (> "+r.hariTidur+" hari tak keluar)"],[rp(r.nilaiTidur),"Nilai yang mengendap"+(r.tidurTanpaHarga?" ("+r.tidurTanpaHarga+" barang tanpa harga)":"")]]);
      h+='<h3 style="margin:14px 0 6px">Calon beli</h3>'+(r.calonBeli.length?tab(["Barang","Stok","Pemakaian/hari","Cukup untuk","Usul beli (30 hari)"],r.calonBeli.map(function(x){return '<tr><td data-l="Barang">'+ksLink(x.kode,x.nama)+'</td><td class="nm" data-l="Stok">'+fmtN(x.stok)+' '+esc(x.satuan)+'</td><td class="nm" data-l="Pemakaian/hari">'+fmtN(x.perHari)+'</td><td class="nm" data-l="Cukup untuk"><b style="color:var(--red,#a82424)">'+fmtN(x.hari)+' hari</b></td><td class="nm" data-l="Usul beli">'+fmtN(x.usul)+'</td></tr>';}),[1,2,3,4]):'<div class="card msg">Tidak ada barang yang diperkirakan habis dalam waktu dekat.</div>');
      h+='<h3 style="margin:14px 0 6px">Barang tidur</h3><div class="bar"><button class="gh" id="an_xt"'+(r.tidur.length?"":" disabled")+'>Unduh Excel (semua barang tidur)</button></div>'+(r.tidur.length?tab(["Barang","Stok","Terakhir keluar","Nilai"],r.tidur.map(function(x){return '<tr><td data-l="Barang">'+ksLink(x.kode,x.nama)+'</td><td class="nm" data-l="Stok">'+fmtN(x.stok)+' '+esc(x.satuan)+'</td><td data-l="Terakhir keluar">'+(x.terakhir?esc(x.terakhir)+' <small>('+x.umur+' hari lalu)</small>':'<small>belum pernah keluar</small>')+'</td><td class="nm" data-l="Nilai">'+rp(x.nilai)+'</td></tr>';}),[1,3]):'<div class="card msg">Tidak ada barang tidur.</div>')+(r.nTidur>r.tidur.length?'<div class="note">Menampilkan '+r.tidur.length+' dari '+r.nTidur+' menurut nilai terbesar.</div>':'');
      h+='<h3 style="margin:14px 0 6px">Barang paling sering keluar</h3>'+(r.cepat.length?tab(["Barang","Keluar (kali)","Jumlah","Per hari","Stok","Cukup untuk"],r.cepat.map(function(x){return '<tr><td data-l="Barang">'+ksLink(x.kode,x.nama)+'</td><td class="nm" data-l="Kali">'+x.kali+'</td><td class="nm" data-l="Jumlah">'+fmtN(x.jumlah)+'</td><td class="nm" data-l="Per hari">'+fmtN(x.perHari)+'</td><td class="nm" data-l="Stok">'+fmtN(x.stok)+' '+esc(x.satuan)+'</td><td class="nm" data-l="Cukup untuk">'+(x.hari==null?"-":fmtN(x.hari)+" hari")+'</td></tr>';}),[1,2,3,4,5]):'<div class="card msg">Belum ada barang keluar pada jendela ini.</div>');
      h+='<h3 style="margin:14px 0 6px">Usulan opname minggu ini</h3><div class="bar"><button class="gh" id="an_so"'+(r.opname.length?"":" disabled")+'>Salin daftar</button></div>'+(r.opname.length?tab(["Barang","Stok","Nilai","Alasan"],r.opname.map(function(x){return '<tr><td data-l="Barang">'+ksLink(x.kode,x.nama)+'</td><td class="nm" data-l="Stok">'+fmtN(x.stok)+' '+esc(x.satuan)+'</td><td class="nm" data-l="Nilai">'+rp(x.nilai)+'</td><td data-l="Alasan"><small style="margin:0">'+esc(x.alasan||"-")+'</small></td></tr>';}),[1,2]):'<div class="card msg">Belum ada barang berstok.</div>');
      h+='<div class="note">'+esc(r.catatan)+' Urutan opname: nilai stok besar, sering selisih/koreksi, lama tidak dihitung, dan saldo yang pernah melompat.</div>';
      $("an_h2").innerHTML=h;pasangKs($("an_h2"));
      var so=$("an_so");if(so)so.onclick=function(){salin("Usulan opname bergilir ("+tgl(hari(0))+"):\n"+r.opname.slice(0,10).map(function(x,i){return (i+1)+". "+x.nama+" ("+x.kode+") - stok "+fmtN(x.stok)+" "+(x.satuan||"")+(x.alasan?" - "+x.alasan:"");}).join("\n"),"Daftar opname tersalin.");};
      var xt=$("an_xt");if(xt)xt.onclick=async function(){xt.disabled=true;
        try{var u=await api({action:"adminMutasiAnalisis",hariTidur:s.tidur,hariHabis:s.habis,jendela:s.jendela,unduh:true});if(!u.ok)toast(u.msg||"Gagal.",true);else
          unduhXlsx("barang_tidur_"+hari(0)+".xlsx","Barang Tidur",[["Kode","Nama Barang","Satuan","Stok","Terakhir Keluar","Umur (hari)","Nilai"]].concat(u.tidur.map(function(x){return [x.kode,x.nama,x.satuan,x.stok,x.terakhir,x.umur==null?"":x.umur,x.nilai==null?"":x.nilai];})),[16,40,8,10,14,10,14]);
        }catch(e){toast("Gagal terhubung ke server.",true);}xt.disabled=false;};
    }
  }

  /* ---------- ringkasan + tautan baca (dipasang di bawah kartu ringkasan tampilan standar) ---------- */
  function bar(){
    return (X.catatan?'<div class="note"><b>Dibaca dari kalimat Anda:</b> '+esc(X.catatan)+' <em style="font-style:normal">(klik Reset untuk membatalkan)</em></div>':"")+
      '<div class="bar"><button class="gh" id="mx_ring">Ringkasan otomatis &amp; perbandingan</button><button class="gh" id="mx_tautan">Tautan baca untuk atasan</button><span class="note" style="margin:0 0 0 auto">Klik kartu angka atau baris rekap untuk menelusuri.</span></div><div id="mx_pnl"></div>';
  }
  function pasang(){
    var root=pane();
    Array.prototype.forEach.call(root.querySelectorAll("[data-sm]"),function(b){b.style.cursor="pointer";b.title="Klik untuk menampilkan rinciannya";b.onclick=function(){
      var k=b.getAttribute("data-sm");mfBaca();
      if(k==="keluar"){MF.jenis="Serah";MF.arah="keluar";}else if(k==="masuk"){MF.jenis="";MF.arah="masuk";}else{MF.jenis="";MF.arah="";}
      MVIEW="rinci";X.catatan="";loadMutasi(true);};});
    Array.prototype.forEach.call(root.querySelectorAll("[data-dd]"),function(b){b.onclick=function(){
      var v=b.getAttribute("data-dd");mfBaca();
      if(MVIEW==="dept")MF.dept=v;else if(MVIEW==="proyek")MF.proyek=v;else MF.q=v;
      MVIEW="rinci";X.catatan="";loadMutasi(true);};});
    pasangKs(root);
    var rg=$("mx_ring"),tt=$("mx_tautan");
    if(rg)rg.onclick=async function(){
      mfBaca();var w=$("mx_pnl");w.innerHTML='<div class="card msg">Menyusun ringkasan...</div>';
      try{var r=await api(Object.assign({action:"adminMutasiRingkas"},MF));if(!r.ok){w.innerHTML="";toast(r.msg||"Gagal.",true);return;}
        var b=r.banding,h='<div class="card"><b>Ringkasan</b><p style="margin:6px 0">'+esc(r.teks)+'</p><div class="bar" style="margin:0"><button class="sv" id="mx_sl">Salin ringkasan</button><button class="gh" id="mx_tt">Tutup</button></div></div>';
        if(b){function pc(o){return o.persen==null?"-":'<b style="color:'+(o.persen>=0?"var(--red,#a82424)":"var(--grn,#14602f)")+'">'+(o.persen>=0?"&#9650; +":"&#9660; ")+o.persen+"%</b>";}
          h+=tab(["Dibanding "+tgl(b.dari)+" s.d. "+tgl(b.sampai),"Sekarang","Sebelumnya","Perubahan"],[["Jumlah catatan",b.n,fmtN],["Nilai barang keluar",b.keluar,rp],["Nilai barang masuk",b.masuk,rp]].map(function(x){return '<tr><td>'+x[0]+'</td><td class="nm">'+x[2](x[1].sekarang)+'</td><td class="nm">'+x[2](x[1].lalu)+'</td><td class="nm">'+pc(x[1])+'</td></tr>';}),[1,2,3]);}
        w.innerHTML=h;$("mx_sl").onclick=function(){salin(r.teks,"Ringkasan tersalin.");};$("mx_tt").onclick=function(){w.innerHTML="";};
      }catch(e){w.innerHTML="";toast("Gagal terhubung ke server.",true);}};
    if(tt)tt.onclick=function(){
      var w=$("mx_pnl");mfBaca();
      w.innerHTML='<div class="card"><b>Tautan baca untuk atasan</b><div class="note" style="margin:4px 0 8px">Atasan hanya bisa membaca dan mengunduh Excel. Berlaku 90 hari, bisa dicabut dari Laporan Atasan. Tidak ada email yang dikirim.</div>'+
        '<label style="display:block;margin:4px 0"><input type="radio" name="mx_m" value="bulan" checked> Selalu tampilkan <b>bulan berjalan</b> (tanggal ikut berubah tiap bulan)</label>'+
        '<label style="display:block;margin:4px 0"><input type="radio" name="mx_m" value="tetap"> Tanggal tetap: <b>'+tgl(MF.dari)+' s.d. '+tgl(MF.sampai)+'</b></label>'+
        '<div class="note">Filter lain yang ikut: jenis, arah, sumber, departemen, proyek (kolom cari bebas tidak ikut).</div>'+
        '<div class="bar" style="margin-top:8px"><input id="mx_lb" placeholder="Nama penerima, mis. Pak GM" style="min-width:200px"><button class="sv" id="mx_buat">Buat tautan</button><button class="gh" id="mx_tt">Tutup</button></div><div id="mx_hs"></div></div>';
      $("mx_tt").onclick=function(){w.innerHTML="";};
      $("mx_buat").onclick=async function(){var bt=this;bt.disabled=true;mfBaca();
        var m=(document.querySelector('input[name="mx_m"]:checked')||{}).value;
        try{var r=await api({action:"adminMutasiTautan",label:($("mx_lb").value||"").trim()||"Mutasi baca-saja",dari:m==="bulan"?"@bulan":MF.dari,sampai:MF.sampai,jenis:MF.jenis,arah:MF.arah,sumber:MF.sumber,dept:MF.dept,proyek:MF.proyek});
          if(!r.ok){toast(r.msg||"Gagal.",true);}else{$("mx_hs").innerHTML='<div class="note" style="margin-top:8px">'+esc(r.msg)+' Berlaku sampai '+esc(r.sampai)+'.</div><div class="bar"><input id="mx_lk" readonly value="'+esc(r.link)+'" style="flex:1;min-width:220px"><button class="sv" id="mx_cp">Salin tautan</button></div>';
            $("mx_cp").onclick=function(){salin(r.link,"Tautan tersalin.");};}
        }catch(e){toast("Gagal terhubung ke server.",true);}bt.disabled=false;};
    };
  }

  /* ---------- cari dengan kalimat biasa ---------- */
  function rx(s){return s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");}
  function parse(F,opsi){
    var q=" "+String(F.q||"").toLowerCase().replace(/\s+/g," ").trim()+" ",paham=[],t=new Date(),y=t.getFullYear(),m=t.getMonth();
    if(q.trim().length<4){return "";}
    function ambil(re){var mm=re.exec(q);if(!mm)return null;q=q.replace(re," ");return mm;}
    var mm;
    if(ambil(/ hari ini /)){F.dari=F.sampai=iso(t);paham.push("periode hari ini");}
    else if(ambil(/ kemarin /)){F.dari=F.sampai=hari(1);paham.push("periode kemarin");}
    else if(ambil(/ minggu ini /)){var dw=(t.getDay()+6)%7;F.dari=iso(new Date(y,m,t.getDate()-dw));F.sampai=iso(t);paham.push("periode minggu ini");}
    else if(ambil(/ minggu lalu /)){var dw2=(t.getDay()+6)%7,s0=new Date(y,m,t.getDate()-dw2-7);F.dari=iso(s0);F.sampai=iso(new Date(s0.getFullYear(),s0.getMonth(),s0.getDate()+6));paham.push("periode minggu lalu");}
    else if(ambil(/ bulan ini /)){F.dari=iso(new Date(y,m,1));F.sampai=iso(t);paham.push("periode bulan ini");}
    else if(ambil(/ bulan lalu /)){F.dari=iso(new Date(y,m-1,1));F.sampai=iso(new Date(y,m,0));paham.push("periode bulan lalu");}
    else if(ambil(/ tahun ini /)){F.dari=iso(new Date(y,0,1));F.sampai=iso(t);paham.push("periode tahun ini");}
    else if(ambil(/ tahun lalu /)){F.dari=iso(new Date(y-1,0,1));F.sampai=iso(new Date(y-1,11,31));paham.push("periode tahun lalu");}
    else if((mm=ambil(/ (\d{1,3}) hari( terakhir)? /))){var n=Math.max(1,Number(mm[1]));F.dari=hari(n-1);F.sampai=hari(0);paham.push("periode "+n+" hari terakhir");}
    if(ambil(/ keluar /)){F.arah="keluar";paham.push("hanya barang keluar");}
    else if(ambil(/ masuk /)){F.arah="masuk";paham.push("hanya barang masuk");}
    [["pembelian","Pembelian"],["pengembalian","Pengembalian"],["opname","Opname"],["koreksi","Koreksi"],["serah","Serah"]].some(function(j){if(ambil(new RegExp(" "+j[0]+" "))){F.jenis=j[1];paham.push("jenis "+j[1]);return true;}return false;});
    if(ambil(/ unggah stok /)){F.jenis="Unggah Stok";paham.push("jenis Unggah Stok");}
    [["moka","Moka"],["accurate","Accurate"],["bekas","Bekas"]].some(function(j){if(ambil(new RegExp(" "+j[0]+" "))){F.sumber=j[1];paham.push("sumber "+j[1]);return true;}return false;});
    var o=opsi||{};
    (o.dept||[]).slice().sort(function(a,b){return b.length-a.length;}).some(function(d){
      if(String(d).length<2)return false;var re=new RegExp("( dept| departemen)? "+rx(String(d).toLowerCase())+" ");if(re.test(q)){q=q.replace(re," ");F.dept=d;paham.push("departemen "+d);return true;}return false;});
    (o.proyek||[]).slice().sort(function(a,b){return b.length-a.length;}).some(function(p){
      if(String(p).length<3)return false;var re=new RegExp("( proyek| ppbj)? "+rx(String(p).toLowerCase())+" ");if(re.test(q)){q=q.replace(re," ");F.proyek=p;paham.push("proyek "+p);return true;}return false;});
    q=q.replace(/ (tampilkan|lihat|tolong|semua|transaksi|mutasi|di|ke|pada|untuk|yang|dari|dept|departemen|proyek|ppbj) /g," ").replace(/ (di|ke|pada|untuk|yang|dari|dept|departemen|proyek|ppbj) /g," ");
    if(!paham.length)return "";
    F.q=q.replace(/\s+/g," ").trim();
    return paham.join(", ")+(F.q?"; kata dicari: \""+F.q+"\"":"");
  }

  return {ada:ada,tombol:tombol,gambar:gambar,bar:bar,pasang:pasang,parse:parse,bukaKartu:bukaKartu,ksLink:ksLink,get catatan(){return X.catatan;},set catatan(v){X.catatan=v;}};
})();
