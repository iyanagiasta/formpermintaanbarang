/* Analisa Barang (Tambahan 31): barang pilihan -> stok -> dipotong proyek aktif -> buffer -> akan datang -> status beli.
   Mendukung proyek rencana (what-if, tidak disimpan) dan daftar analisa bernama (disimpan). Khusus admin. */
var AB=(function(){
  var S={items:[],rc:{nama:"",prio:"Biasa",items:[]},tunda:false,hasil:null,daftar:[],tunggu:false},el=null,api0=null,toast0=null;
  function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
  function fq(n){return Number(n||0).toLocaleString("id-ID",{maximumFractionDigits:3});}
  function rp(n){return n==null?"-":"Rp "+Number(n).toLocaleString("id-ID",{maximumFractionDigits:0});}
  function num(v){var t=String(v==null?"":v).trim().replace(/\s/g,"");if(!t)return 0;if(t.indexOf(",")>=0)t=t.replace(/\./g,"").replace(",",".");var n=Number(t);return isFinite(n)?n:0;}
  function stCls(s){return /^Cukup/.test(s)?"d":s==="Kurang, sudah dipesan"?"b":s==="Kurang, sebagian dipesan"?"w":"l";}
  function cari(inp,out,pick){
    var tm=null,seq=0;
    inp.oninput=function(){var v=inp.value.trim();clearTimeout(tm);if(v.length<2){out.innerHTML="";return;}
      tm=setTimeout(async function(){var my=++seq,jj=!!(el.querySelector("#abj")||{}).checked,r=(window.IDX&&await IDX.siap()&&IDX.ada())?IDX.analisaCari(v,jj):await api0({action:"adminAnalisaCari",q:v,jasa:jj});if(my!==seq||!r.ok)return;
        out.innerHTML=(r.rows||[]).slice(0,40).map(function(c,i){return '<div class="abh" data-i="'+i+'" style="padding:7px 10px;border-top:1px solid var(--line);cursor:pointer"><b>'+esc(c.nama)+'</b><small style="display:block;opacity:.7">'+esc(c.kode)+' &middot; stok '+fq(c.stok)+' '+esc(c.satuan||"")+(c.nRab?' &middot; ada di RAB '+c.nRab+' baris':'')+'</small></div>';}).join("")||'<div class="note">Tidak ada.</div>';
        out.querySelectorAll(".abh").forEach(function(d){d.onclick=function(){pick(r.rows[Number(d.getAttribute("data-i"))]);inp.value="";out.innerHTML="";};});},(window.IDX&&IDX.ada()?80:250));};
  }
  function gambar(){
    var h='<div class="card"><b>Analisa Barang</b><div class="note">Pilih barang yang ingin dicek. Sistem mengurangi stok gudang (Moka + Accurate) dengan kebutuhan proyek aktif menurut prioritas, lalu buffer paket, lalu menampilkan sisa stok, barang yang akan datang, dan status beli. Stok Bekas tidak dihitung.</div>'+
      '<label class="fl"><input type="checkbox" id="abj"> Tampilkan juga jasa/pekerjaan di hasil pencarian (bawaan: disembunyikan)</label><div style="position:relative"><input id="abq" autocomplete="off" placeholder="Ketik nama atau kode barang, lalu pilih..." style="width:100%"><div id="abh" style="background:var(--card);border:1px solid var(--line);border-radius:8px;max-height:340px;overflow:auto"></div></div>'+
      '<div class="fr" id="abchips">'+(S.items.length?S.items.map(function(x,i){return '<span class="bd b" style="padding:4px 8px">'+esc(x.nama)+' <a href="#" data-rm="'+i+'" style="text-decoration:none">&times;</a></span>';}).join(" "):'<span class="note">Belum ada barang dipilih.</span>')+'</div>'+
      '<details class="pet"><summary>Isi cepat: tempel daftar atau ambil dari PPBJ</summary>'+
      '<div class="note">Tempel daftar kode atau nama barang dari Excel / RAB, satu barang per baris.</div><textarea id="abtp" rows="4" style="width:100%" placeholder="mis.&#10;Pipa PVC 2 inch&#10;J1-00123&#10;Lem PVC"></textarea><div class="bar"><button class="gh" id="abtpg">Tambahkan semua</button></div><div id="abtpi" class="note"></div>'+
      '<div class="note" style="margin-top:8px">Atau ambil semua barang dari rincian material (RAB) satu PPBJ / proyek.</div><div class="fr"><input id="abpp" placeholder="No PPBJ atau nama proyek" style="flex:1;min-width:180px"><button class="gh" id="abppg">Ambil barangnya</button></div><div id="abppi"></div></details>'+
      '<details class="pet"'+(S.rc.items.length?" open":"")+'><summary>Proyek rencana (what-if, tidak disimpan)</summary><div class="note">Ketik barang dan jumlah untuk proyek yang belum masuk sistem. Hasilnya menunjukkan barang yang akan kurang dan proyek mana yang terdampak.</div>'+
      '<div class="fr"><input id="abrn" placeholder="Nama proyek rencana" value="'+esc(S.rc.nama)+'" style="flex:1;min-width:160px"><select id="abrp">'+["Tinggi","Biasa","Rendah"].map(function(p){return '<option'+(S.rc.prio===p?" selected":"")+'>'+p+'</option>';}).join("")+'</select></div>'+
      '<div style="position:relative"><input id="abrq" autocomplete="off" placeholder="Cari barang untuk proyek rencana..." style="width:100%"><div id="abrh" style="background:var(--card);border:1px solid var(--line);border-radius:8px;max-height:220px;overflow:auto"></div></div>'+
      (S.rc.items.length?'<table><thead><tr><th>Barang</th><th class="nm">Jumlah</th><th></th></tr></thead><tbody>'+S.rc.items.map(function(x,i){return '<tr><td>'+esc(x.nama)+'<small>'+esc(x.kode)+'</small></td><td class="nm"><input data-rq="'+i+'" value="'+esc(x.qty)+'" inputmode="decimal" style="width:90px"></td><td><a href="#" data-rr="'+i+'">hapus</a></td></tr>';}).join("")+'</tbody></table>':"")+'</details>'+
      '<label class="fl" style="align-items:flex-start"><input type="checkbox" id="abt"'+(S.tunda?" checked":"")+'> <span>Sertakan proyek berstatus Ditunda Sebentar (bawaan: Aktif saja)</span></label>'+
      '<div class="bar"><button class="sv" id="abgo">Analisa</button><button class="gh" id="abx"'+(S.hasil?"":" disabled")+'>Unduh Excel</button><button class="gh" id="abs">Simpan daftar...</button><button class="gh" id="abc">Kosongkan</button></div>'+
      '<div class="fr"><select id="abd" style="min-width:200px"><option value="">Daftar tersimpan ('+S.daftar.length+')</option>'+S.daftar.map(function(d,i){return '<option value="'+i+'">'+esc(d.nama)+' ('+d.barang.length+' barang'+(d.rencana?", + rencana":"")+')</option>';}).join("")+'</select><button class="gh" id="abdb">Buka</button><button class="gh" id="abdh">Hapus</button></div></div>';
    h+=S.hasil?hasilHtml():"";
    el.innerHTML=h;pasang();
  }
  function hasilHtml(){
    var r=S.hasil,R=r.ringkas;
    var t='<div class="sum"><div><b>'+R.barang+'</b><span>Barang dianalisa</span></div><div><b'+(R.kurang?' style="color:var(--red,#a82424)"':'')+'>'+R.kurang+'</b><span>Barang kurang</span></div><div><b>'+R.perluBeli+'</b><span>Perlu dibeli</span></div><div><b>'+rp(R.nilaiBeli)+'</b><span>Perkiraan anggaran beli (jumlah perlu dibeli &times; harga terbaru)'+(R.tanpaHarga?" &middot; "+R.tanpaHarga+" barang tanpa harga":"")+'</span></div></div>';
    var cp=[];r.data.forEach(function(a){(a.cukup||[]).forEach(function(c){cp.push({a:a,c:c});});});
    if(cp.length){cp.sort(function(x,y){return (x.c.n/x.c.set)-(y.c.n/y.c.set)||x.c.n-y.c.n;});
      t+='<div class="card"><b>Cukup untuk berapa proyek</b><div class="note">Barang di paket Buffer. Sisa stok setelah kebutuhan semua proyek aktif dibagi kebutuhan satu proyek (qty per set). Angka kecil: setelah pesanan datang.</div><div class="tw"><table><thead><tr><th>Barang</th><th>Paket</th><th class="nm">Per proyek</th><th>Cukup untuk</th><th>Setelah pesanan datang</th></tr></thead><tbody>'+
        cp.map(function(x){var c=x.c,k=c.n<c.set;return '<tr><td><b>'+esc(x.a.nama)+'</b><small>'+esc(x.a.kode)+'</small></td><td>'+esc(c.paket)+'</td><td class="nm">'+fq(c.qty)+' '+esc(x.a.satuan||"")+'</td><td><b style="color:'+(k?'var(--red,#a82424)':'inherit')+'">'+c.n+' dari '+c.set+' proyek</b>'+(k?' <small>kurang '+c.kurang+' proyek</small>':'')+'</td><td>'+(c.n2!==c.n?c.n2+' proyek':'<small>sama</small>')+'</td></tr>';}).join("")+'</tbody></table></div></div>';}
    t+='<div class="note">'+esc(r.catatan)+'</div>';
    return t+r.data.map(function(a){
      var tampilBaris=a.baris.map(function(b){return '<tr'+(b.rencana?' style="background:rgba(26,108,171,.10)"':'')+'><td data-l="Proyek"><b>'+esc(b.ppbj)+'</b><small>'+esc(b.proyek)+(b.jenis?" &middot; "+esc(b.jenis):"")+'</small></td><td data-l="Prioritas">'+esc(b.prio)+'</td><td class="nm" data-l="RAB">'+fq(b.rab)+'</td><td class="nm" data-l="Diserahkan">'+fq(b.serah)+'</td><td class="nm" data-l="Butuh">'+fq(b.butuh)+'</td><td class="nm" data-l="Terpenuhi">'+fq(b.dapat)+'</td><td class="nm" data-l="Kurang">'+(b.kurang>0?'<b style="color:var(--red,#a82424)">'+fq(b.kurang)+'</b>':"-")+'</td></tr>';}).join("");
      var tampilSudah=a.sudah.map(function(b){return '<tr style="opacity:.7"><td data-l="Proyek"><b>'+esc(b.ppbj)+'</b><small>'+esc(b.proyek)+' &middot; '+esc(b.jenis)+'</small></td><td data-l="Prioritas">'+esc(b.prio)+'</td><td class="nm">'+fq(b.rab)+'</td><td class="nm">'+fq(b.serah)+'</td><td class="nm">0</td><td class="nm" colspan="2"><small>sudah terpenuhi</small></td></tr>';}).join("");
      return '<div class="card"><b>'+esc(a.nama)+'</b> <small>'+esc(a.kode)+' &middot; '+esc(a.satuan||"")+'</small>'+(window.OLH?OLH(a.kode):'')+' <span class="bd '+stCls(a.status)+'">'+esc(a.status)+'</span>'+(a.hanyaBuffer?' <span class="bd w">kurang hanya untuk buffer</span>':"")+(a.ada?"":' <span class="bd l">belum ada di stok</span>')+
      '<div class="sum"><div><b>'+fq(a.fisik)+'</b><span>Stok awal (Moka '+fq(a.moka)+' + Accurate '+fq(a.accurate)+')</span></div><div><b>'+fq(a.bebas)+'</b><span>Stok bebas (setelah alokasi '+fq(a.alokasi)+' dan permintaan berjalan '+fq(a.diminta)+')</span></div><div><b>'+fq(a.sisaAkhir)+'</b><span>Sisa setelah proyek dan buffer</span></div><div><b>'+fq(a.akanDatang)+'</b><span>Akan datang (sudah dipesan)</span></div>'+(a.beli>0?'<div><b style="color:var(--red,#a82424)">'+fq(a.beli)+'</b><span>Perlu dibeli'+(a.nilaiBeli!=null?" ("+rp(a.nilaiBeli)+")":"")+'</span></div>':"")+'</div>'+
      ((a.cukup||[]).length?'<div class="note" style="border-left:3px solid var(--accent,#1b6ca8);padding-left:8px"><b>Cukup untuk:</b> '+a.cukup.map(function(c){return '<b>'+c.n+' dari '+c.set+' proyek '+esc(c.paket)+'</b>'+(c.n<c.set?' (kurang '+c.kurang+' proyek)':'')+(c.n2!==c.n?' &middot; setelah pesanan datang: '+c.n2+' proyek':'');}).join('; ')+'</div>':'')+
      (a.mulaiKurang?'<div class="note" style="border-left:3px solid var(--red,#a82424);padding-left:8px">'+(a.amanSebelum&&a.amanSebelum.length?'Stok cukup untuk '+esc(a.amanSebelum.join(", "))+'; ':'')+'<b>mulai kurang di '+a.mulaiKurang.list.map(function(m){return esc(m.ppbj)+(m.proyek?' ('+esc(m.proyek)+')':'')+' kurang '+fq(m.kurang);}).join(", ")+'</b>'+'. Proyek sesudahnya dalam urutan ikut menunggu barang.</div>':'')+
      (a.akanDatang>0?'<div class="note">Akan datang '+fq(a.akanDatang)+': '+(a.akanPo>0?'PO '+fq(a.akanPo):'')+(a.akanPo>0&&a.akanBuf>0?' + ':'')+(a.akanBuf>0?'PPBJ buffer '+esc(a.ppbjBuf||"")+' '+fq(a.akanBuf)+' (belum ada PO)':'')+'.</div>':'')+
      ((a.pengganti||[]).length?'<div class="note"><b>Barang pengganti yang ada stoknya:</b> '+a.pengganti.map(function(g){return esc(g.nama)+' <small>'+esc(g.kode)+'</small> stok '+fq(g.bebas)+' '+esc(g.satuan||"")+' <small>('+esc(g.alasan)+')</small> <a href="#" data-ag="'+esc(g.kode)+'" data-an="'+esc(g.nama)+'">+ analisa</a>';}).join('; ')+'</div>':'')+
      (a.dampak&&a.dampak.length?'<div class="note" style="border-left:3px solid var(--red,#a82424);padding-left:8px"><b>Dampak proyek rencana:</b> '+a.dampak.map(function(d){return esc(d.ppbj)+" ("+esc(d.prio)+") kehilangan "+fq(d.tambah);}).join("; ")+'.</div>':"")+
      '<div class="note" style="margin:8px 0 4px"><small>Urutan baris = urutan dilayani: proyek Aktif dulu (Ditunda Sebentar sesudahnya), prioritas Tinggi &rarr; Biasa &rarr; Rendah, lalu PPBJ terlama.</small></div>'+
      '<table><thead><tr><th>Proyek aktif</th><th>Prioritas</th><th class="nm">RAB</th><th class="nm">Diserahkan</th><th class="nm">Butuh</th><th class="nm">Terpenuhi</th><th class="nm">Kurang</th></tr></thead><tbody>'+(tampilBaris||tampilSudah?tampilBaris+tampilSudah:'<tr><td colspan="7"><small>Tidak ada proyek aktif yang membutuhkan barang ini.</small></td></tr>')+
      '<tr><td colspan="4"><b>Buffer paket</b>'+(a.paket.length?'<small>'+esc(a.paket.join(", "))+'</small>':"")+'</td><td class="nm">'+fq(a.buffer)+'</td><td class="nm">'+fq(a.bufDapat)+'</td><td class="nm">'+(a.bufKurang>0?'<b style="color:var(--red,#a82424)">'+fq(a.bufKurang)+'</b>':"-")+'</td></tr>'+
      (a.mintaLuar>0?'<tr><td colspan="7"><small>Permintaan di luar proyek (sudah mengurangi stok bebas): '+fq(a.mintaLuar)+'</small></td></tr>':"")+'</tbody></table></div>';
    }).join("");
  }
  function pasang(){
    cari(el.querySelector("#abq"),el.querySelector("#abh"),function(c){if(!S.items.some(function(x){return x.kode===c.kode;}))S.items.push({kode:c.kode,nama:c.nama});gambar();});
    cari(el.querySelector("#abrq"),el.querySelector("#abrh"),function(c){bacaRc();if(!S.rc.items.some(function(x){return x.kode===c.kode;}))S.rc.items.push({kode:c.kode,nama:c.nama,qty:1});gambar();});
    el.querySelectorAll("[data-rm]").forEach(function(a){a.onclick=function(e){e.preventDefault();S.items.splice(Number(a.getAttribute("data-rm")),1);gambar();};});
    el.querySelectorAll("[data-rr]").forEach(function(a){a.onclick=function(e){e.preventDefault();bacaRc();S.rc.items.splice(Number(a.getAttribute("data-rr")),1);gambar();};});
    el.querySelector("#abgo").onclick=jalan;el.querySelector("#abx").onclick=excel;
    el.querySelectorAll("[data-ag]").forEach(function(a){a.onclick=function(e){e.preventDefault();var k=a.getAttribute("data-ag");if(!S.items.some(function(x){return x.kode===k;}))S.items.push({kode:k,nama:a.getAttribute("data-an")});gambar();jalan();};});
    el.querySelector("#abtpg").onclick=tempel;
    el.querySelector("#abppg").onclick=ambilPpbj;el.querySelector("#abpp").onkeydown=function(e){if(e.key==="Enter")ambilPpbj();};
    el.querySelector("#abc").onclick=function(){S.items=[];S.rc={nama:"",prio:"Biasa",items:[]};S.hasil=null;gambar();};
    el.querySelector("#abs").onclick=simpan;
    el.querySelector("#abdb").onclick=function(){var v=el.querySelector("#abd").value;if(v==="")return;var d=S.daftar[Number(v)];S.items=d.barang.slice();S.rc=d.rencana?{nama:d.rencana.nama||"",prio:d.rencana.prio||"Biasa",items:d.rencana.items.slice()}:{nama:"",prio:"Biasa",items:[]};S.hasil=null;gambar();jalan();};
    el.querySelector("#abdh").onclick=async function(){var v=el.querySelector("#abd").value;if(v==="")return;var d=S.daftar[Number(v)];if(!confirm('Hapus daftar "'+d.nama+'"?'))return;var r=await api0({action:"adminAnalisaHapus",nama:d.nama});toast0(r.msg||"",!r.ok);if(r.ok){await muatDaftar();gambar();}};
  }
  /* T125: tempel daftar barang (satu per baris) */
  async function tempel(){
    var ta=el.querySelector("#abtp"),info=el.querySelector("#abtpi"),baris=ta.value.split(/\n+/).map(function(x){return x.replace(/\t.*$/,"").trim();}).filter(Boolean).slice(0,80);
    if(!baris.length){info.textContent="Tempel minimal satu baris.";return;}
    var b=el.querySelector("#abtpg");b.disabled=true;info.textContent="Mencocokkan "+baris.length+" baris...";
    var adaIdx=!!(window.IDX&&await IDX.siap()&&IDX.ada()),tambah=0,gagal=[],lewat=0;
    for(var i=0;i<baris.length;i++){
      var v=baris[i],r;try{r=adaIdx?IDX.analisaCari(v,false):await api0({action:"adminAnalisaCari",q:v,jasa:false});}catch(e){r=null;}
      var rows=(r&&r.ok&&r.rows)||[],pas=rows.filter(function(c){return String(c.kode).toUpperCase()===v.toUpperCase();})[0]||rows[0];
      if(!pas){gagal.push(v);continue;}
      if(S.items.some(function(x){return x.kode===pas.kode;})){lewat++;continue;}
      S.items.push({kode:pas.kode,nama:pas.nama});tambah++;
    }
    b.disabled=false;var pesan=tambah+" barang ditambahkan"+(lewat?", "+lewat+" sudah ada":"")+(gagal.length?". Tidak ketemu: "+gagal.slice(0,10).join(", ")+(gagal.length>10?" dan "+(gagal.length-10)+" lainnya":""):"")+".";
    gambar();var inf=el.querySelector("#abtpi");if(inf){inf.textContent=pesan;inf.closest("details").open=true;}
  }
  /* T125: ambil semua barang dari RAB satu PPBJ / proyek */
  async function ambilPpbj(pasti){
    var inp=el.querySelector("#abpp"),out=el.querySelector("#abppi"),q=(typeof pasti==="string"?pasti:inp.value).trim();if(q.length<2){out.innerHTML='<div class="note">Ketik No PPBJ atau nama proyek.</div>';return;}
    out.innerHTML='<div class="note">Mencari...</div>';
    var r=await api0({action:"adminAnalisaPpbj",q:q,pasti:typeof pasti==="string"});
    if(!r.ok){out.innerHTML='<div class="note err">'+esc(r.msg||"Gagal.")+'</div>';return;}
    if(r.pilihan){out.innerHTML='<div class="note">Pilih proyek:</div><div class="fr">'+r.pilihan.map(function(p){return '<button type="button" class="gh" data-pp="'+esc(p.ppbj)+'">'+esc(p.ppbj)+(p.ket?' &middot; '+esc(p.ket):'')+(p.status&&p.status!=="Aktif"?' <small>('+esc(p.status)+')</small>':'')+'</button>';}).join("")+'</div>';
      out.querySelectorAll("[data-pp]").forEach(function(b){b.onclick=function(){ambilPpbj(b.getAttribute("data-pp"));};});return;}
    var n=0;r.barang.forEach(function(x){if(!S.items.some(function(y){return y.kode===x.kode;})){S.items.push({kode:x.kode,nama:x.nama});n++;}});
    gambar();var o2=el.querySelector("#abppi");if(o2){o2.innerHTML='<div class="note">'+n+' barang dari '+esc(r.ppbj)+(r.ket?' ('+esc(r.ket)+')':'')+' ditambahkan'+(r.lebih?' (dibatasi 80 barang)':'')+'.</div>';o2.closest("details").open=true;}
  }
  function bacaRc(){var n=el.querySelector("#abrn"),p=el.querySelector("#abrp");if(n)S.rc.nama=n.value;if(p)S.rc.prio=p.value;el.querySelectorAll("[data-rq]").forEach(function(i){S.rc.items[Number(i.getAttribute("data-rq"))].qty=i.value;});var t=el.querySelector("#abt");if(t)S.tunda=t.checked;}
  function payload(){bacaRc();return {kodes:S.items.map(function(x){return x.kode;}),sertakanDitunda:S.tunda,rencana:S.rc.items.length?{nama:S.rc.nama||"Proyek rencana",prio:S.rc.prio,items:S.rc.items.map(function(x){return {kode:x.kode,nama:x.nama,qty:num(x.qty)};})}:null};}
  async function jalan(){
    var p=payload();if(!p.kodes.length&&!p.rencana){toast0("Pilih minimal satu barang.",true);return;}
    var b=el.querySelector("#abgo");b.disabled=true;var r=await api0(Object.assign({action:"adminAnalisaBarang"},p));b.disabled=false;
    if(!r.ok){toast0(r.msg||"Gagal.",true);return;}S.hasil=r;gambar();
  }
  async function simpan(){
    var p=payload();if(!p.kodes.length&&!p.rencana){toast0("Pilih minimal satu barang dulu.",true);return;}
    var n=prompt("Nama daftar (mis. Pipa PVC):");if(!n)return;
    var r=await api0({action:"adminAnalisaSimpan",nama:n,barang:S.items,rencana:S.rc.items.length?{nama:S.rc.nama,prio:S.rc.prio,items:S.rc.items.map(function(x){return {kode:x.kode,nama:x.nama,qty:num(x.qty)};})}:null});
    toast0(r.msg||"",!r.ok);if(r.ok){await muatDaftar();gambar();}
  }
  function excel(){
    if(!S.hasil)return;if(typeof XLSX==="undefined"){toast0("Pembaca Excel belum termuat. Periksa internet lalu muat ulang halaman.",true);return;}
    var d=S.hasil.data,sum=[["Kode","Nama","Satuan","Moka","Accurate","Stok awal","Alokasi proyek","Permintaan berjalan","Stok bebas","Terpenuhi ke proyek","Sisa setelah proyek","Buffer","Terpenuhi buffer","Sisa akhir","Akan datang","Kurang proyek","Kurang buffer","Status","Perlu dibeli","Harga","Nilai beli","Akan datang dari PO","Akan datang dari PPBJ buffer","PPBJ buffer","Cukup untuk (proyek, paling sedikit)","Cukup untuk per paket","Mulai kurang di","Barang pengganti"]];
    d.forEach(function(a){sum.push([a.kode,a.nama,a.satuan,a.moka,a.accurate,a.fisik,a.alokasi,a.diminta,a.bebas,a.dapatProyek,a.sisaSetelahProyek,a.buffer,a.bufDapat,a.sisaAkhir,a.akanDatang,a.kurangProyek+a.kurangRencana,a.bufKurang,a.status,a.beli,a.harga==null?"":a.harga,a.nilaiBeli==null?"":a.nilaiBeli,a.akanPo||0,a.akanBuf||0,a.ppbjBuf||"",a.cukupMin==null?"":a.cukupMin,(a.cukup||[]).map(function(c){return c.paket+": "+c.n+" dari "+c.set+(c.n2!==c.n?" (setelah datang "+c.n2+")":"");}).join("; "),a.mulaiKurang?a.mulaiKurang.list.map(function(m){return m.ppbj+" kurang "+m.kurang;}).join("; "):"",(a.pengganti||[]).map(function(g){return g.kode+" "+g.nama+" (stok "+g.bebas+")";}).join("; ")]);});
    var rin=[["Kode","Nama","No PPBJ / Baris","Proyek","Jenis","Prioritas","Status proyek","RAB","Sudah diserahkan","Butuh","Terpenuhi","Kurang"]];
    d.forEach(function(a){a.baris.forEach(function(b){rin.push([a.kode,a.nama,b.ppbj,b.proyek,b.jenis,b.prio,b.status,b.rab,b.serah,b.butuh,b.dapat,b.kurang]);});
      a.sudah.forEach(function(b){rin.push([a.kode,a.nama,b.ppbj,b.proyek,b.jenis,b.prio,"Aktif (terpenuhi)",b.rab,b.serah,0,0,0]);});
      rin.push([a.kode,a.nama,"Buffer paket",a.paket.join(", "),"","","",a.buffer,"",a.buffer,a.bufDapat,a.bufKurang]);
      if(a.mintaLuar>0)rin.push([a.kode,a.nama,"Permintaan di luar proyek","","","","","","",a.mintaLuar,"",""]);});
    var wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(sum),"Ringkasan per barang");XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rin),"Rincian barang x proyek");
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([["Analisa Barang"],[S.hasil.catatan],[],["Dibuat",new Date().toLocaleString("id-ID")]].concat(S.hasil.rencana?[["Proyek rencana (what-if)",S.hasil.rencana.nama+" - prioritas "+S.hasil.rencana.prio]]:[])),"Catatan");
    XLSX.writeFile(wb,"analisa_barang.xlsx");
  }
  async function muatDaftar(){var r=await api0({action:"adminAnalisaDaftar"});S.daftar=r.ok?(r.data||[]):[];}
  async function mount(box,api,toast){el=box;api0=api;toast0=toast;el.innerHTML='<div class="card msg">Memuat...</div>';await muatDaftar();gambar();if(S.tunggu){S.tunggu=false;jalan();}}
  /** T125: dibuka dari tab lain (Stok & Harga, Telusur, Buffer) dengan barang terpilih. items: [{kode,nama}] */
  function bukaDengan(items,tambah){
    if(!tambah)S.items=[];(items||[]).forEach(function(x){if(x&&x.kode&&!S.items.some(function(y){return y.kode===x.kode;}))S.items.push({kode:x.kode,nama:x.nama||x.kode});});
    S.hasil=null;S.tunggu=true;if(typeof goTab==="function")goTab("analisa");
  }
  return {mount:mount,bukaDengan:bukaDengan};
})();
