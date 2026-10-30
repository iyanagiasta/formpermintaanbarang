/* Opname Bahan Kimia: dipakai oleh kimia.html (operator) dan tab "Opname Kimia" di admin.html.
   Bergantung pada fungsi global api(body) yang menambahkan kode akses, serta esc() dan toast(). */
var KM=(function(){
  var S=null,P="",TAB="bulanan",draft={},form=null,semua=false,cache={},el=null,banding=null,param=null,bukaForm=false;
  function E(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
  function T(m,bad){if(typeof toast==="function")toast(m,bad);else alert(m);}
  function nf(n,d){if(n==null||n==="")return "-";d=d==null?2:d;return Number(n).toLocaleString("id-ID",{minimumFractionDigits:d,maximumFractionDigits:d});}
  function pn(v){var x=parseFloat(String(v==null?"":v).replace(/\./g,function(m,o,s){return /,/.test(s)?"":".";}).replace(",","."));return isNaN(x)?0:x;}
  var BLN=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  function blnTxt(p){return BLN[Number(p.slice(5,7))-1]+" "+p.slice(0,4);}
  function tglTxt(t){return t&&/^\d{4}-\d{2}-\d{2}$/.test(t)?t.slice(8)+"/"+t.slice(5,7)+"/"+t.slice(0,4):(t||"");}
  function css(){
    if(document.getElementById("kmcss"))return;var s=document.createElement("style");s.id="kmcss";
    s.textContent=".km .tw{overflow-x:auto;max-width:100%}.km .grid2{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px}.km .stbox{border:1px solid var(--line,#ccd);border-radius:4px;padding:10px;background:var(--card,#fff)}"+
    ".km .stbox h4{margin:0 0 6px;font-size:14px}.km .stbox label{display:block;font-size:12px;color:var(--mut,#567);margin:6px 0 2px}.km .stbox input,.km .stbox select{width:100%}"+
    ".km .lv{display:inline-block;padding:2px 8px;border-radius:3px;font-size:11px;font-weight:700;letter-spacing:.3px;margin-right:6px}.km .lv.blok{background:var(--bad-bg,#fbe0e0);color:var(--bad-t,#8a1c1c)}.km .lv.warn{background:var(--warn-bg,#fff0cf);color:var(--warn-t,#6b4300)}.km .lv.ok{background:var(--ok-bg,#dff1e5);color:var(--ok-t,#14602f)}.km .lv.info{background:var(--info-bg,#dcebf5);color:var(--info-t,#0a4a70)}"+
    ".km .tm{border:1px solid var(--line,#ccd);border-left:4px solid var(--warn-t,#6b4300);border-radius:3px;padding:10px 12px;margin:8px 0;background:var(--card,#fff)}.km .tm.blok{border-left-color:var(--bad-t,#8a1c1c)}.km .tm.done{border-left-color:var(--ok-t,#14602f)}"+
    ".km .tm ul{margin:4px 0 4px 18px;padding:0}.km .tm textarea{width:100%;min-height:54px}.km .rumus{font-size:12.5px;color:var(--mut,#567);margin:2px 0 8px}"+
    ".km .fotos{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px}.km .fto{border:1px solid var(--line,#ccd);border-radius:4px;padding:6px;background:var(--card,#fff);font-size:12px}.km .fto img{width:100%;height:110px;object-fit:cover;display:block;background:var(--hover,#e8eef2);cursor:zoom-in}.km .fto .nopic{height:110px;display:grid;place-items:center;color:var(--mut,#567);background:var(--hover,#e8eef2)}"+
    ".km .final{border-left:4px solid var(--ok-t,#14602f)}.km .num{text-align:right;white-space:nowrap}.km .pv{font-size:13px;font-weight:700;margin-top:6px}.km table input{width:100%}"+
    ".kmov{position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:9999;display:flex;align-items:center;justify-content:center;padding:12px}.kmov img{max-width:100%;max-height:100%}";
    document.head.appendChild(s);
  }
  async function muat(p){
    css();if(p!=null)P=p;
    el.innerHTML='<div class="card msg">Memuat...</div>';
    var r;try{r=await api({action:"kimiaPeriode",periode:P});}catch(e){el.innerHTML='<div class="card msg err">Gagal terhubung ke server. Periksa internet lalu muat ulang.</div>';return false;}
    if(!r.ok){el.innerHTML='<div class="card msg err">'+E(r.msg||"Gagal")+'</div>';return false;}
    S=r;P=r.periode;render();return true;
  }
  function mount(root,opts){el=root;if(opts&&opts.periode)P=opts.periode;return muat();}
  function adm(){return S&&S.peran==="admin";}
  function final(){return S&&S.status==="Final";}
  function bahanP(kode){return S.param.bahan.filter(function(b){return b.kode===kode;})[0];}
  function tangkiBahan(b){return b.faktor>0?(b.tangki.length?b.tangki:S.param.tangki):[];}
  function kgStok(b,d){var t=0,tk=d.tangki||{};Object.keys(tk).forEach(function(k){t+=pn(tk[k])*(b.faktor||0);});return {kem:pn(d.kemasan)*(b.kgKem||0),lepas:pn(d.lepas),lar:t,total:pn(d.kemasan)*(b.kgKem||0)+pn(d.lepas)+t};}

  /* ---------- tampilan ---------- */
  function render(){
    var h='<div class="km">'+kepala();
    if(TAB==="bulanan")h+=bulanan();else if(TAB==="banding")h+='<div id="kmbd"></div>';else if(TAB==="param")h+='<div id="kmpr"></div>';
    h+='</div>';el.innerHTML=h;pasang();
    if(TAB==="banding")loadBanding();if(TAB==="param")loadParam();
    if(TAB==="bulanan")muatFoto();
  }
  function kepala(){
    var opt=S.periodeDaftar.map(function(x){return '<option value="'+x.p+'"'+(x.p===P?" selected":"")+'>'+blnTxt(x.p)+' ('+x.status+')</option>';}).join("");
    var h='<div class="card'+(final()?' final':'')+'"><div class="fr" style="margin:0"><b>Periode</b><select id="kmp">'+opt+'</select>'+
     '<span class="bd '+(final()?'d':'w')+'">'+(final()?'FINAL - terkunci':'DRAF - bisa diisi')+'</span>'+
     (final()?'<span class="note">'+(S.sumber==="Impor"?'Diimpor dari file Accounting':'Final oleh '+E(S.finalOleh)+' ('+E(S.finalWaktu)+')')+'</span>':'')+
     '<span class="note" style="margin-left:auto">Masuk sebagai '+E(S.nama)+' ('+(adm()?'admin':'operator')+')</span></div>';
    if(adm()){
      h+='<div class="fr noprint"><button class="chip '+(TAB==="bulanan"?"on":"")+'" data-t="bulanan">Bulanan</button><button class="chip '+(TAB==="banding"?"on":"")+'" data-t="banding">Perbandingan</button><button class="chip '+(TAB==="param"?"on":"")+'" data-t="param">Parameter</button>'+
       '<span style="flex:1"></span><button class="gh" id="kmx">Unduh Excel</button><button class="gh" id="kmc">Cetak / PDF</button></div>';
    }
    return h+'</div>';
  }
  function rumusTxt(r){return r.pemakaian==null?'Stok akhir belum diisi':nf(r.saldoAwal)+' + '+nf(r.penerimaan)+' - '+nf(r.stokAkhir)+' = '+nf(r.pemakaian)+' kg';}
  function bulanan(){
    var H=S.hasil,h="";
    // waktu hitung
    var b=H.bulan,ed=!final();
    h+='<div class="card"><p style="margin:0 0 8px"><b>Waktu hitung stok</b> <span class="note">Patokan: tanggal 30, pukul 14:00. Catat apakah dihitung sebelum atau sesudah kiriman di hari yang sama.</span></p>'+
     '<div class="fr"><label class="fl">Tanggal</label><input type="date" id="kmtg" value="'+E(b.tglHitung)+'"'+(ed?"":" disabled")+' min="'+P+'-01" max="'+P+'-31"><label class="fl">Jam</label><input type="time" id="kmjm" value="'+E(b.jam)+'"'+(ed?"":" disabled")+'>'+
     '<select id="kmur"'+(ed?"":" disabled")+'><option value="">Tidak ada kiriman di hari itu</option><option value="sebelum"'+(b.urutan==="sebelum"?" selected":"")+'>Dihitung SEBELUM kiriman masuk</option><option value="sesudah"'+(b.urutan==="sesudah"?" selected":"")+'>Dihitung SESUDAH kiriman masuk</option></select>'+
     (ed?'<button id="kmwk" class="sv">Simpan</button>':'')+'</div></div>';
    // ringkasan
    var rows=H.bahan.filter(function(r){return semua||r.ada;});
    h+='<div class="card"><div class="fr" style="margin:0 0 6px"><b>Ringkasan (kg)</b><span class="note">Pemakaian = Saldo Awal + Penerimaan - Stok Akhir. Hari periode: '+H.hari+'.'+(H.prevPeriode?' Saldo awal dari '+blnTxt(H.prevPeriode)+'.':' Belum ada bulan sebelumnya.')+'</span>'+
     '<label class="note" style="margin-left:auto"><input type="checkbox" id="kmall"'+(semua?" checked":"")+'> tampilkan bahan tanpa transaksi</label></div>';
    h+=rows.length?'<div class="tw"><table><thead><tr><th>Bahan</th><th class="n">Saldo awal</th><th class="n">Penerimaan</th><th class="n">Stok akhir</th><th class="n">Pemakaian</th><th class="n">Rata/hari</th><th class="n">vs bulan lalu</th></tr></thead><tbody>'+
     rows.map(function(r){return '<tr><td><b>'+E(r.nama)+'</b><small>'+E(rumusTxt(r))+'</small></td><td class="n">'+nf(r.saldoAwal)+'</td><td class="n">'+nf(r.penerimaan)+'</td><td class="n">'+(r.stokAkhir==null?'<span class="bd w">belum</span>':nf(r.stokAkhir))+'</td><td class="n"><b>'+(r.pemakaian==null?"-":nf(r.pemakaian))+'</b></td><td class="n">'+nf(r.rata)+'</td><td class="n">'+(r.deltaPct==null?"-":(r.deltaPct>0?"+":"")+nf(r.deltaPct,1)+"%")+'</td></tr>';}).join("")+'</tbody></table></div>':'<div class="msg">Belum ada data bulan ini.</div>';
    h+='</div>';
    // temuan
    h+=temuanHtml();
    if(!final()||true)h+=stokHtml();
    h+=penerimaanHtml();
    h+=fotoHtml();
    if(adm()&&!final())h+='<div class="card noprint"><b>Finalisasi bulan</b><p class="note">Final mengunci seluruh data bulan ini dan menjadikan stok akhir sebagai saldo awal bulan berikutnya. Syarat: tidak ada hal yang harus dibereskan dan semua temuan sudah dijawab.</p><div class="fr"><button id="kmfn" class="sv"'+(S.bisaFinal?"":" disabled")+'>FINAL bulan ini</button>'+(S.bisaFinal?'':'<span class="note">'+(S.blok?S.blok+' hal harus dibereskan. ':'')+(S.belumJawab?S.belumJawab+' temuan belum dijawab.':'')+'</span>')+'</div></div>';
    if(adm()&&final()&&S.bisaBuka)h+='<div class="card noprint"><b>Koreksi bulan Final</b><p class="note">Membuka kembali menjadikan bulan ini Draf. Alasan tercatat di riwayat.</p><div class="fr"><button id="kmbk" class="rm bahaya">Buka kembali bulan ini</button></div></div>';
    h+='<details class="card"><summary><b>Riwayat perubahan bulan ini</b> ('+S.riwayat.length+')</summary>'+(S.riwayat.length?'<div class="tw"><table><thead><tr><th>Waktu</th><th>Oleh</th><th>Aksi</th><th>Rincian</th></tr></thead><tbody>'+S.riwayat.map(function(x){return '<tr><td>'+E(x.waktu)+'</td><td>'+E(x.oleh)+' <small>'+E(x.peran)+'</small></td><td>'+E(x.aksi)+'</td><td>'+E(x.rincian)+'</td></tr>';}).join("")+'</tbody></table></div>':'<div class="msg">Belum ada.</div>')+'</details>';
    return h;
  }
  function temuanHtml(){
    var T_=S.hasil.temuan;if(!T_.length)return '<div class="card"><span class="lv ok">BERSIH</span> Tidak ada temuan. Semua pemeriksaan otomatis lolos.</div>';
    var nm={blok:"HARUS DIBERESKAN",warn:"PERLU KONFIRMASI",info:"INFO"};
    return '<div class="card"><p style="margin:0 0 4px"><b>Pemeriksaan otomatis</b> <span class="note">'+S.blok+' harus dibereskan, '+S.belumJawab+' belum dijawab. Sistem tidak menyimpulkan penyebab; pertanyaan di bawah ditujukan ke pihak terkait.</span></p>'+
     T_.map(function(t,i){var jwb=t.jawab?'<div class="note"><b>Jawaban:</b> '+E(t.jawab)+' <small>('+E(t.jawabOleh)+(t.jawabWaktu?', '+E(t.jawabWaktu):'')+')</small></div>':'';
      return '<div class="tm '+t.level+(t.jawab?' done':'')+'"><span class="lv '+(t.jawab&&t.level==="warn"?"ok":t.level)+'">'+(t.jawab&&t.level==="warn"?"SUDAH DIJAWAB":nm[t.level])+'</span><b>'+E(t.judul)+'</b>'+(t.bahan?' <small>'+E(t.bahan)+'</small>':'')+'<div>'+E(t.uraian)+'</div>'+
       (t.penyebab.length?'<div class="note">Kemungkinan penyebab:</div><ul>'+t.penyebab.map(function(x){return '<li>'+E(x)+'</li>';}).join("")+'</ul>':'')+
       (t.tanya.length?'<div class="note">Yang perlu ditanyakan:</div><ul>'+t.tanya.map(function(x){return '<li><b>'+E(x.siapa)+':</b> '+E(x.tanya)+'</li>';}).join("")+'</ul>':'')+jwb+
       (adm()&&t.level==="warn"&&!final()?'<div class="noprint"><textarea data-jk="'+E(t.kunci)+'" placeholder="Hasil konfirmasi / jawaban (wajib sebelum Final)">'+E(t.jawab||"")+'</textarea><button class="sv" data-jb="'+E(t.kunci)+'">Simpan jawaban</button></div>':'')+'</div>';}).join("")+'</div>';
  }
  function dr(kode){var b=bahanP(kode),s=S.hasil.bahan.filter(function(r){return r.kode===kode;})[0],st=s&&s.stok;return draft[kode]||{kemasan:st?st.kemasan:"",lepas:st?st.lepas:"",tangki:st?JSON.parse(JSON.stringify(st.tangki)):{},ket:st?st.ket:""};}
  function stokHtml(){
    var ed=!final(),h='<div class="card"><p style="margin:0 0 8px"><b>Stok akhir</b> <span class="note">Isi jumlah kemasan di gudang, kg lepas, dan liter tiap tangki. Konversi ke kg dihitung otomatis. Isi 0 bila memang kosong.</span></p><div class="grid2">';
    S.param.bahan.forEach(function(b){
      var d=dr(b.kode),k=kgStok(b,d),tk=tangkiBahan(b),sav=S.hasil.bahan.filter(function(r){return r.kode===b.kode;})[0],ada=sav&&sav.stok;
      h+='<div class="stbox" data-b="'+E(b.kode)+'"><h4>'+E(b.nama)+(ada?' <span class="bd d">tersimpan</span>':' <span class="bd w">belum</span>')+'</h4>';
      if(b.kgKem>0)h+='<label>Jumlah '+E(b.kemasan||"kemasan")+' di gudang ('+nf(b.kgKem,0)+' kg/'+E(b.kemasan||"kemasan")+')</label><input type="text" inputmode="decimal" data-f="kemasan" value="'+E(d.kemasan)+'"'+(ed?"":" disabled")+'>';
      h+='<label>Kg lepas (di luar kemasan)</label><input type="text" inputmode="decimal" data-f="lepas" value="'+E(d.lepas)+'"'+(ed?"":" disabled")+'>';
      tk.forEach(function(t){h+='<label>'+E(t)+' (liter, x '+String(b.faktor).replace(".",",").slice(0,8)+')</label><input type="text" inputmode="decimal" data-tk="'+E(t)+'" value="'+E(d.tangki[t]==null?"":d.tangki[t])+'"'+(ed?"":" disabled")+'>';});
      h+='<label>Keterangan</label><input type="text" data-f="ket" list="kmket" value="'+E(d.ket)+'"'+(ed?"":" disabled")+' placeholder="mis. Sudah dilarutkan">'+
       '<div class="pv" data-pv="'+E(b.kode)+'">'+nf(k.total)+' kg'+(k.lar?' <small>(kemasan '+nf(k.kem)+' + lepas '+nf(k.lepas)+' + larutan '+nf(k.lar)+')</small>':'')+'</div>'+(ed?'<button class="sv" data-ss="'+E(b.kode)+'" style="margin-top:8px">Simpan stok</button>':'')+'</div>';
    });
    return h+'</div><datalist id="kmket"><option value="Sudah dilarutkan"><option value="Masih dalam bentuk powder"><option value="Sebagian dilarutkan, sebagian powder"></datalist></div>';
  }
  function fRow(){return form||(form={id:"",tanggal:"",kode:S.param.bahan[0]?S.param.bahan[0].kode:"",noSJ:"",sjVol:"",sjSat:"Kg",vol:"",sat:"Kg",bj:"",supplier:"",faktur:"",catatan:""});}
  function penerimaanHtml(){
    var H=S.hasil,ed=!final(),h='<div class="card"><p style="margin:0 0 8px"><b>Penerimaan (per surat jalan)</b> <span class="note">Satu baris per surat jalan, dicatat di bulan sesuai tanggal surat jalan. Baris lama tidak pernah ditimpa; koreksi tercatat di riwayat.</span></p>';
    h+=H.penerimaan.length?'<div class="tw"><table><thead><tr><th>Tanggal</th><th>Bahan</th><th>No SJ</th><th class="n">Diterima</th><th class="n">Kg</th><th>Supplier</th><th>Dicatat</th>'+(ed?'<th class="noprint"></th>':'')+'</tr></thead><tbody>'+
     H.penerimaan.map(function(x){return '<tr><td>'+tglTxt(x.tanggal)+'</td><td>'+E(x.nama)+'</td><td>'+(x.noSJ?E(x.noSJ):'<span class="bd w">kosong</span>')+(x.faktur?'<small>Faktur '+E(x.faktur)+'</small>':'')+'</td><td class="n">'+nf(x.vol)+' '+E(x.sat)+(x.bj?'<small>BJ '+String(x.bj).replace(".",",")+'</small>':'')+'</td><td class="n"><b>'+nf(x.kg)+'</b></td><td>'+(x.supplier?E(x.supplier):'<span class="bd w">kosong</span>')+'</td><td>'+E(x.oleh)+'<small>'+E(x.waktu)+'</small></td>'+
      (ed?'<td class="noprint"><div class="act"><button class="gh" data-pu="'+E(x.id)+'">Ubah</button>'+(adm()?'<button class="rm bahaya" data-pb="'+E(x.id)+'">Batal</button>':'')+'</div></td>':'')+'</tr>';}).join("")+'</tbody></table></div>':'<div class="msg">Belum ada penerimaan bulan ini.</div>';
    if(ed){var f=fRow(),b=bahanP(f.kode)||{kemasan:"",faktor:0},sats=["Kg","Liter"].concat(b.kemasan?[b.kemasan]:[]);
      h+='<div class="noprint" style="margin-top:12px;border-top:1px solid var(--line);padding-top:10px"><b>'+(f.id?'Ubah penerimaan':'Tambah penerimaan')+'</b><div class="fr">'+
       '<input type="date" data-pf="tanggal" value="'+E(f.tanggal)+'" min="'+P+'-01" max="'+P+'-31"><select data-pf="kode">'+S.param.bahan.map(function(x){return '<option value="'+E(x.kode)+'"'+(x.kode===f.kode?" selected":"")+'>'+E(x.nama)+'</option>';}).join("")+'</select>'+
       '<input type="text" data-pf="noSJ" placeholder="No surat jalan" value="'+E(f.noSJ)+'" style="width:160px"><input type="text" data-pf="faktur" placeholder="No faktur (opsional)" value="'+E(f.faktur)+'" style="width:160px"></div>'+
       '<div class="fr"><label class="fl">Tertulis di SJ</label><input type="text" inputmode="decimal" data-pf="sjVol" placeholder="Volume SJ" value="'+E(f.sjVol)+'" style="width:110px"><select data-pf="sjSat">'+sats.map(function(s){return '<option'+(s===f.sjSat?" selected":"")+'>'+E(s)+'</option>';}).join("")+'</select>'+
       '<label class="fl">Diterima</label><input type="text" inputmode="decimal" data-pf="vol" placeholder="Volume diterima" value="'+E(f.vol)+'" style="width:130px"><select data-pf="sat">'+sats.map(function(s){return '<option'+(s===f.sat?" selected":"")+'>'+E(s)+'</option>';}).join("")+'</select>'+
       (f.sat==="Liter"?'<input type="text" inputmode="decimal" data-pf="bj" placeholder="BJ (kosong = '+String(b.faktor||"").replace(".",",").slice(0,7)+')" value="'+E(f.bj)+'" style="width:140px">':'')+'<span class="pv" id="kmpvt"></span></div>'+
       '<div class="fr"><select data-pf="supplier"><option value="">- pilih supplier -</option>'+S.param.supplier.map(function(s){return '<option'+(s===f.supplier?" selected":"")+'>'+E(s)+'</option>';}).join("")+'</select><button class="gh" id="kmsup">+ Supplier baru</button>'+
       '<input type="text" data-pf="catatan" placeholder="Catatan (opsional)" value="'+E(f.catatan)+'" style="flex:1;min-width:160px"></div><div class="fr"><button class="sv" id="kmps">'+(f.id?'Simpan perubahan':'Tambah penerimaan')+'</button>'+(f.id?'<button class="gh" id="kmpc">Batal ubah</button>':'')+'</div></div>';}
    return h+'</div>';
  }
  function fotoHtml(){
    var F=S.hasil.foto,ed=!final(),h='<div class="card"><p style="margin:0 0 8px"><b>Foto tangki dan stok</b> <span class="note">Foto tiap tangki yang terisi wajib ada sebelum Final. Foto diperkecil otomatis dan disimpan di Google Drive.</span></p>';
    if(ed)h+='<div class="fr noprint"><select id="kmfj"><option>Tangki</option><option>Gudang</option><option>Lain</option></select><select id="kmft">'+S.param.tangki.map(function(t){return '<option>'+E(t)+'</option>';}).join("")+'</select>'+
      '<input type="file" id="kmff" accept="image/*" multiple><input type="text" id="kmfc" placeholder="Catatan foto (opsional)" style="flex:1;min-width:140px"><button class="sv" id="kmfu">Unggah foto</button></div><div id="kmfs" class="note"></div>';
    h+=F.length?'<div class="fotos">'+F.map(function(f){return '<div class="fto"><div data-fi="'+E(f.id)+'">'+(cache[f.id]?'<img src="'+cache[f.id]+'" alt="'+E(f.jenis+" "+f.tangki)+'" data-big="'+E(f.id)+'">':'<div class="nopic">memuat...</div>')+'</div><b>'+E(f.jenis)+(f.tangki?' - '+E(f.tangki):'')+'</b><br>'+E(f.oleh)+'<br><small>'+E(f.waktu)+'</small>'+(f.catatan?'<br><small>'+E(f.catatan)+'</small>':'')+
      (ed&&(adm()||f.oleh===S.nama)?'<br><button class="rm bahaya" data-fh="'+E(f.id)+'" style="margin-top:4px">Hapus</button>':'')+'</div>';}).join("")+'</div>':'<div class="msg">Belum ada foto bulan ini.</div>';
    return h+'</div>';
  }
  async function muatFoto(){
    var F=S.hasil.foto.filter(function(f){return !cache[f.id];}),q=F.slice(),n=0;
    async function w(){while(q.length){var f=q.shift();try{var r=await api({action:"kimiaFotoGet",id:f.id});if(r.ok)cache[f.id]="data:"+r.mime+";base64,"+r.data;}catch(e){}
      var d=el&&el.querySelector('[data-fi="'+f.id+'"]');if(d)d.innerHTML=cache[f.id]?'<img src="'+cache[f.id]+'" alt="foto" data-big="'+E(f.id)+'">':'<div class="nopic">tidak terbaca</div>';}}
    await Promise.all([w(),w()]);
  }
  function besar(id){var o=document.createElement("div");o.className="kmov";o.innerHTML='<img src="'+cache[id]+'" alt="foto besar">';o.onclick=function(){o.remove();};document.body.appendChild(o);}
  function kecil(file){return new Promise(function(ok,gagal){var u=URL.createObjectURL(file),im=new Image();im.onload=function(){var m=1280,s=Math.min(1,m/Math.max(im.width,im.height)),c=document.createElement("canvas");c.width=Math.round(im.width*s);c.height=Math.round(im.height*s);c.getContext("2d").drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);ok(c.toDataURL("image/jpeg",0.82).split(",")[1]);};im.onerror=function(){URL.revokeObjectURL(u);gagal(new Error("Foto tidak bisa dibaca"));};im.src=u;});}

  /* ---------- aksi ---------- */
  function pvTerima(){
    var f=fRow(),b=bahanP(f.kode),o=document.getElementById("kmpvt");if(!o||!b)return;var v=pn(f.vol),kg=0,s=String(f.sat).toLowerCase();
    if(s==="kg")kg=v;else if(s==="liter")kg=v*(pn(f.bj)>0?pn(f.bj):(b.faktor||0));else if(b.kemasan&&s===b.kemasan.toLowerCase())kg=v*b.kgKem;
    o.textContent=v>0?"= "+nf(kg)+" kg":"";
  }
  function pasang(){
    var q=function(s){return el.querySelector(s);},qa=function(s){return Array.prototype.slice.call(el.querySelectorAll(s));};
    q("#kmp").onchange=function(){draft={};form=null;muat(this.value);};
    qa("[data-t]").forEach(function(b){b.onclick=function(){TAB=b.getAttribute("data-t");render();};});
    var x=q("#kmx");if(x)x.onclick=excel;var c=q("#kmc");if(c)c.onclick=cetak;
    var all=q("#kmall");if(all)all.onchange=function(){semua=this.checked;render();};
    var wk=q("#kmwk");if(wk)wk.onclick=async function(){var r=await api({action:"kimiaBulanSimpan",periode:P,tglHitung:q("#kmtg").value,jam:q("#kmjm").value,urutan:q("#kmur").value});T(r.msg||"Gagal",!r.ok);if(r.ok)muat();};
    qa("[data-jb]").forEach(function(b){b.onclick=async function(){var k=b.getAttribute("data-jb"),t=q('[data-jk="'+k.replace(/"/g,'\\"')+'"]').value;var r=await api({action:"kimiaJawab",periode:P,kunci:k,teks:t});T(r.msg||"Gagal",!r.ok);if(r.ok)muat();};});
    // stok
    qa(".stbox").forEach(function(box){var kode=box.getAttribute("data-b"),b=bahanP(kode);
      function baca(){var d={kemasan:"",lepas:"",tangki:{},ket:""};box.querySelectorAll("[data-f]").forEach(function(i){d[i.getAttribute("data-f")]=i.value;});box.querySelectorAll("[data-tk]").forEach(function(i){if(i.value!=="")d.tangki[i.getAttribute("data-tk")]=i.value;});return d;}
      box.addEventListener("input",function(){var d=baca();draft[kode]=d;var k=kgStok(b,d);box.querySelector("[data-pv]").innerHTML=nf(k.total)+" kg"+(k.lar?" <small>(kemasan "+nf(k.kem)+" + lepas "+nf(k.lepas)+" + larutan "+nf(k.lar)+")</small>":"");});
      var sv=box.querySelector("[data-ss]");if(sv)sv.onclick=async function(){var d=baca();sv.disabled=true;var r=await api({action:"kimiaStokSimpan",periode:P,kode:kode,kemasan:d.kemasan,lepas:d.lepas,tangki:d.tangki,ket:d.ket});sv.disabled=false;T(r.msg||"Gagal",!r.ok);if(r.ok){delete draft[kode];muat();}};});
    // penerimaan
    qa("[data-pf]").forEach(function(i){var k=i.getAttribute("data-pf");i.addEventListener(i.tagName==="SELECT"||i.type==="date"?"change":"input",function(){var f=fRow();f[k]=i.value;if(k==="kode"){f.sat="Kg";f.sjSat="Kg";f.bj="";}if(k==="sat"||k==="kode"){var pos=0;render();return;}pvTerima();});});
    pvTerima();
    var ps=q("#kmps");if(ps)ps.onclick=async function(){var f=fRow();ps.disabled=true;var r=await api({action:"kimiaTerimaSimpan",periode:P,id:f.id,tanggal:f.tanggal,kode:f.kode,noSJ:f.noSJ,sjVol:f.sjVol,sjSat:f.sjSat,vol:f.vol,sat:f.sat,bj:f.bj,supplier:f.supplier,faktur:f.faktur,catatan:f.catatan});ps.disabled=false;T(r.msg||"Gagal",!r.ok);if(r.ok){form=null;muat();}};
    var pc=q("#kmpc");if(pc)pc.onclick=function(){form=null;render();};
    qa("[data-pu]").forEach(function(b){b.onclick=function(){var x=S.hasil.penerimaan.filter(function(y){return y.id===b.getAttribute("data-pu");})[0];form={id:x.id,tanggal:x.tanggal,kode:x.kode,noSJ:x.noSJ,sjVol:x.sjVol,sjSat:x.sjSat||"Kg",vol:x.vol,sat:x.sat,bj:x.bj||"",supplier:x.supplier,faktur:x.faktur,catatan:x.catatan};render();var f=el.querySelector("[data-pf=tanggal]");if(f)f.scrollIntoView({block:"center"});};});
    qa("[data-pb]").forEach(function(b){b.onclick=async function(){var a=prompt("Alasan membatalkan baris penerimaan ini (wajib):");if(!a)return;var r=await api({action:"kimiaTerimaBatal",periode:P,id:b.getAttribute("data-pb"),alasan:a});T(r.msg||"Gagal",!r.ok);if(r.ok)muat();};});
    var sp=q("#kmsup");if(sp)sp.onclick=async function(){var n=prompt("Nama supplier baru (tulis lengkap, mis. PT. Contoh Jaya):");if(!n)return;var r=await api({action:"kimiaListSimpan",jenis:"supplier",nama:n});T(r.msg||"Gagal",!r.ok);if(r.ok){fRow().supplier=n.trim();muat();}};
    // foto
    var fu=q("#kmfu");if(fu)fu.onclick=async function(){
      var fl=q("#kmff").files,jn=q("#kmfj").value,tk=q("#kmft").value,ct=q("#kmfc").value,st=q("#kmfs");if(!fl.length){T("Pilih foto dulu.",true);return;}
      fu.disabled=true;var ok=0,err="";
      for(var i=0;i<fl.length;i++){st.textContent="Mengunggah "+(i+1)+" dari "+fl.length+"...";try{var b64=await kecil(fl[i]);var r=await api({action:"kimiaFotoUnggah",periode:P,jenis:jn,tangki:jn==="Tangki"?tk:"",mime:"image/jpeg",data:b64,catatan:ct});if(r.ok)ok++;else{err=r.msg;break;}}catch(e){err=e.message;break;}}
      fu.disabled=false;T(ok+" foto tersimpan"+(err?". "+err:"."),!!err);muat();};
    qa("[data-big]").forEach(function(i){i.onclick=function(){besar(i.getAttribute("data-big"));};});
    qa("[data-fh]").forEach(function(b){b.onclick=async function(){if(!confirm("Hapus foto ini dari laporan? (file tetap tersimpan di Drive)"))return;var r=await api({action:"kimiaFotoHapus",periode:P,id:b.getAttribute("data-fh")});T(r.msg||"Gagal",!r.ok);if(r.ok)muat();};});
    var fn=q("#kmfn");if(fn)fn.onclick=async function(){if(!confirm("FINAL bulan "+blnTxt(P)+"?\nSemua data bulan ini dikunci dan stok akhir menjadi saldo awal bulan berikutnya."))return;fn.disabled=true;var r=await api({action:"kimiaFinal",periode:P});T(r.msg||"Gagal",!r.ok);if(r.ok)muat();else fn.disabled=false;};
    var bk=q("#kmbk");if(bk)bk.onclick=async function(){var a=prompt("Alasan membuka kembali bulan "+blnTxt(P)+" (wajib):");if(!a)return;var r=await api({action:"kimiaBukaLagi",periode:P,alasan:a});T(r.msg||"Gagal",!r.ok);if(r.ok)muat();};
  }

  /* ---------- perbandingan ---------- */
  async function loadBanding(){
    var box=el.querySelector("#kmbd");box.innerHTML='<div class="card msg">Memuat...</div>';
    var fin=S.periodeDaftar.filter(function(x){return x.status==="Final";}).slice(0,6),rs=[];
    for(var i=0;i<fin.length;i++){var r=await api({action:"kimiaPeriode",periode:fin[i].p});if(r.ok)rs.push(r);}
    if(!rs.length){box.innerHTML='<div class="card msg">Belum ada bulan Final.</div>';return;}
    var kd={};rs.forEach(function(r){r.hasil.bahan.forEach(function(b){if(b.ada)kd[b.kode]=b.nama;});});
    var h='<div class="card"><b>Pemakaian per bulan (kg)</b><div class="tw"><table><thead><tr><th>Bahan</th>'+rs.map(function(r){return '<th class="n">'+blnTxt(r.periode)+'</th>';}).join("")+'</tr></thead><tbody>'+
     Object.keys(kd).map(function(k){return '<tr><td><b>'+E(kd[k])+'</b></td>'+rs.map(function(r){var b=r.hasil.bahan.filter(function(x){return x.kode===k;})[0];return '<td class="n">'+(b&&b.pemakaian!=null?nf(b.pemakaian):"-")+'<small>'+(b&&b.rata!=null?nf(b.rata)+"/hari":"")+'</small></td>';}).join("")+'</tr>';}).join("")+'</tbody></table></div></div>';
    box.innerHTML=h;
  }

  /* ---------- parameter (admin) ---------- */
  async function loadParam(){
    var box=el.querySelector("#kmpr");box.innerHTML='<div class="card msg">Memuat...</div>';
    var r=await api({action:"kimiaParam"});if(!r.ok){box.innerHTML='<div class="card msg err">'+E(r.msg)+'</div>';return;}param=r;
    var h='<div class="card"><b>Bahan kimia</b><p class="note">Perubahan faktor atau kg per kemasan hanya berlaku untuk bulan yang masih Draf. Bulan Final tidak berubah.</p><div class="tw"><table><thead><tr><th>Bahan</th><th>Kemasan</th><th class="n">Kg/kemasan</th><th class="n">Faktor larutan</th><th>Tangki</th><th>Supplier sah</th><th>Aktif</th><th></th></tr></thead><tbody>'+
     r.bahan.map(function(b){return '<tr><td><b>'+E(b.nama)+'</b><small>'+E(b.kode)+' &middot; '+E(b.kelompok)+'</small></td><td>'+E(b.kemasan||"-")+'</td><td class="n">'+(b.kgKem?nf(b.kgKem,2):"-")+'</td><td class="n">'+(b.faktor?String(Math.round(b.faktor*1e6)/1e6).replace(".",","):"-")+'</td><td>'+E(b.tangki.join(", ")||(b.faktor?"semua":"-"))+'</td><td>'+E(b.supplier.join(", ")||"-")+'</td><td>'+(b.aktif?'<span class="bd d">aktif</span>':'<span class="bd l">nonaktif</span>')+'</td><td><button class="gh" data-be="'+E(b.kode)+'">Ubah</button></td></tr>';}).join("")+'</tbody></table></div><div class="fr"><button class="sv" id="kmbn">+ Bahan baru</button></div><div id="kmbf"></div></div>';
    h+='<div class="card"><b>Tangki</b><div class="fr">'+r.tangki.map(function(t){return '<button class="chip '+(t.aktif?"on":"")+'" data-tl="tangki|'+E(t.nama)+'|'+(t.aktif?1:0)+'" title="Klik untuk '+(t.aktif?"nonaktifkan":"aktifkan")+'">'+E(t.nama)+(t.aktif?"":" (nonaktif)")+'</button>';}).join("")+'<button class="gh" id="kmtn">+ Tangki</button></div></div>';
    h+='<div class="card"><b>Supplier</b><div class="fr">'+r.supplier.map(function(t){return '<button class="chip '+(t.aktif?"on":"")+'" data-tl="supplier|'+E(t.nama)+'|'+(t.aktif?1:0)+'" title="Klik untuk '+(t.aktif?"nonaktifkan":"aktifkan")+'">'+E(t.nama)+(t.aktif?"":" (nonaktif)")+'</button>';}).join("")+'<button class="gh" id="kmsn">+ Supplier</button></div></div>';
    h+='<div class="card"><b>Operator</b><p class="note">Setiap operator punya kode sendiri; semua isian dan foto tercatat atas namanya. Kode tidak ditampilkan; isi kode baru untuk menggantinya.</p><div class="tw"><table><thead><tr><th>Nama</th><th>Status</th><th></th></tr></thead><tbody>'+
     (r.operator.length?r.operator.map(function(o){return '<tr><td><b>'+E(o.nama)+'</b></td><td>'+(o.aktif?'<span class="bd d">aktif</span>':'<span class="bd l">nonaktif</span>')+'</td><td><div class="act" style="flex-direction:row"><button class="gh" data-ok="'+E(o.nama)+'">Ganti kode</button><button class="gh" data-oa="'+E(o.nama)+'|'+(o.aktif?1:0)+'">'+(o.aktif?"Nonaktifkan":"Aktifkan")+'</button></div></td></tr>';}).join(""):'<tr><td colspan="3" class="msg">Belum ada operator.</td></tr>')+'</tbody></table></div><div class="fr"><input type="text" id="kmon" placeholder="Nama operator" style="width:180px"><input type="text" id="kmok" placeholder="Kode (min. 5 karakter)" style="width:180px"><button class="sv" id="kmoa">Tambah operator</button></div></div>';
    box.innerHTML=h;
    box.querySelector("#kmbn").onclick=function(){bahanForm(null);};
    box.querySelectorAll("[data-be]").forEach(function(b){b.onclick=function(){bahanForm(param.bahan.filter(function(x){return x.kode===b.getAttribute("data-be");})[0]);};});
    box.querySelectorAll("[data-tl]").forEach(function(b){b.onclick=async function(){var a=b.getAttribute("data-tl").split("|");var rr=await api({action:"kimiaListSimpan",jenis:a[0],nama:a[1],aktif:a[2]!=="1"});T(rr.msg||"Gagal",!rr.ok);if(rr.ok)muat();};});
    box.querySelector("#kmtn").onclick=async function(){var n=prompt("Nama tangki baru:");if(!n)return;var rr=await api({action:"kimiaListSimpan",jenis:"tangki",nama:n});T(rr.msg||"Gagal",!rr.ok);if(rr.ok)muat();};
    box.querySelector("#kmsn").onclick=async function(){var n=prompt("Nama supplier baru:");if(!n)return;var rr=await api({action:"kimiaListSimpan",jenis:"supplier",nama:n});T(rr.msg||"Gagal",!rr.ok);if(rr.ok)muat();};
    box.querySelector("#kmoa").onclick=async function(){var rr=await api({action:"kimiaOperatorSimpan",nama:box.querySelector("#kmon").value,kodeBaru:box.querySelector("#kmok").value});T(rr.msg||"Gagal",!rr.ok);if(rr.ok)loadParam();};
    box.querySelectorAll("[data-ok]").forEach(function(b){b.onclick=async function(){var k=prompt("Kode baru untuk "+b.getAttribute("data-ok")+" (min. 5 karakter):");if(!k)return;var rr=await api({action:"kimiaOperatorSimpan",nama:b.getAttribute("data-ok"),kodeBaru:k});T(rr.msg||"Gagal",!rr.ok);};});
    box.querySelectorAll("[data-oa]").forEach(function(b){b.onclick=async function(){var a=b.getAttribute("data-oa").split("|");var rr=await api({action:"kimiaOperatorSimpan",nama:a[0],aktif:a[1]!=="1"});T(rr.msg||"Gagal",!rr.ok);if(rr.ok)loadParam();};});
  }
  function bahanForm(b){
    var box=el.querySelector("#kmbf"),n=b||{kode:"",nama:"",kelompok:"",kemasan:"",kgKem:0,faktor:0,tangki:[],supplier:[],aktif:true,catatan:"",urut:""};
    box.innerHTML='<div style="border-top:1px solid var(--line);margin-top:10px;padding-top:10px"><b>'+(b?'Ubah '+E(b.nama):'Bahan baru')+'</b><div class="fr"><input type="text" id="kb_n" placeholder="Nama bahan" value="'+E(n.nama)+'" style="flex:1;min-width:200px"><input type="text" id="kb_k" placeholder="Kelompok (PAC, Polimer...)" value="'+E(n.kelompok)+'" style="width:160px"></div>'+
     '<div class="fr"><input type="text" id="kb_kem" placeholder="Kemasan (Sak/Pail, kosong bila tidak ada)" value="'+E(n.kemasan)+'" style="width:230px"><input type="text" inputmode="decimal" id="kb_kg" placeholder="Kg per kemasan" value="'+(n.kgKem||"")+'" style="width:140px"><input type="text" inputmode="decimal" id="kb_f" placeholder="Faktor larutan (kg per liter), 0 = tanpa tangki" value="'+(n.faktor||"")+'" style="width:300px"></div>'+
     '<div class="fr"><input type="text" id="kb_t" placeholder="Tangki yang dipakai, pisahkan dengan | (kosong = semua)" value="'+E(n.tangki.join("|"))+'" style="flex:1;min-width:240px"></div><div class="fr"><input type="text" id="kb_s" placeholder="Supplier sah, pisahkan dengan |" value="'+E(n.supplier.join("|"))+'" style="flex:1;min-width:240px"><input type="text" inputmode="numeric" id="kb_u" placeholder="Urutan" value="'+E(n.urut)+'" style="width:90px"></div>'+
     '<div class="fr"><label><input type="checkbox" id="kb_a"'+(n.aktif?" checked":"")+'> aktif</label><input type="text" id="kb_c" placeholder="Catatan" value="'+E(n.catatan)+'" style="flex:1;min-width:200px"><button class="sv" id="kb_ok">Simpan bahan</button></div></div>';
    box.querySelector("#kb_ok").onclick=async function(){
      var q=function(i){return box.querySelector("#"+i);},sp=function(v){return v.split("|").map(function(x){return x.trim();}).filter(Boolean);};
      var r=await api({action:"kimiaBahanSimpan",kode:n.kode,nama:q("kb_n").value,kelompok:q("kb_k").value,kemasan:q("kb_kem").value,kgKem:q("kb_kg").value,faktor:q("kb_f").value,tangki:sp(q("kb_t").value),supplier:sp(q("kb_s").value),urut:q("kb_u").value,aktif:q("kb_a").checked,catatan:q("kb_c").value});
      T(r.msg||"Gagal",!r.ok);if(r.ok)muat();};
  }

  /* ---------- Excel & cetak (admin) ---------- */
  function periodeTxt(){var H=S.hasil,b=H.bulan,a=Number(P.slice(5,7));return "Periode 1 - "+(b.tglHitung&&b.tglHitung.slice(0,7)===P?Number(b.tglHitung.slice(8)):H.hari)+" "+BLN[a-1]+" "+P.slice(0,4)+(b.jam?" pukul "+b.jam+" WIB":"");}
  function excel(){
    if(typeof XLSX==="undefined"){T("Pustaka Excel belum termuat. Periksa internet lalu muat ulang.",true);return;}
    var H=S.hasil,wb=XLSX.utils.book_new(),NF="#,##0.00";
    function add(nm,rows,w,num){var ws=XLSX.utils.aoa_to_sheet(rows);ws["!cols"]=(w||[]).map(function(x){return {wch:x};});(num||[]).forEach(function(c){for(var r=0;r<rows.length;r++){var a=XLSX.utils.encode_cell({r:r,c:c}),cell=ws[a];if(cell&&typeof cell.v==="number")cell.z=NF;}});XLSX.utils.book_append_sheet(wb,ws,nm);}
    var ket=function(r){return r.pemakaian==null?"Stok akhir belum diisi":nf(r.saldoAwal)+" + "+nf(r.penerimaan)+" - "+nf(r.stokAkhir)+" = "+nf(r.pemakaian)+" kg";};
    var rows=H.bahan.filter(function(r){return r.ada;});
    var R=[["LAPORAN STOCK OPNAME BAHAN KIMIA"],["PT SARANA CATUR TIRTA KELOLA"],[periodeTxt()],["Status: "+(final()?"FINAL"+(S.finalOleh?" oleh "+S.finalOleh:""):"DRAF (belum final)")],["Satuan: kilogram (kg). Pemakaian = Saldo Awal + Penerimaan - Stok Akhir."],[],
     ["No","Nama Barang","Saldo Awal (kg)","Penerimaan (kg)","Stok Akhir (kg)","Pemakaian (kg)","Rata-rata per hari (kg)","Pemakaian bulan lalu (kg)","Selisih rata-rata vs bulan lalu (%)","Perhitungan"]];
    rows.forEach(function(r,i){R.push([i+1,r.nama,r.saldoAwal,r.penerimaan,r.stokAkhir==null?"":r.stokAkhir,r.pemakaian==null?"":r.pemakaian,r.rata==null?"":r.rata,r.prevPemakaian==null?"":r.prevPemakaian,r.deltaPct==null?"":r.deltaPct,ket(r)]);});
    R.push([],["Saldo awal diambil dari stok akhir bulan "+(H.prevPeriode?blnTxt(H.prevPeriode):"(tidak ada)")+" yang sudah Final."],["Stok akhir = stok kemasan di gudang + stok larutan di tangki (liter x faktor konversi)."],[],[],
     ["Dibuat oleh (operator)","","Diperiksa (Admin Gudang)","","Mengetahui (Accounting)"],[],[],[ "( "+Object.keys(H.bahan.reduce(function(o,r){if(r.stok&&r.stok.oleh)o[r.stok.oleh]=1;return o;},{})).join(", ")+" )","","( "+(final()&&S.finalOleh?S.finalOleh:"................")+" )","","( ................ )"]);
    add("Ringkasan",R,[5,38,16,16,16,16,18,20,22,60],[2,3,4,5,6,7,8]);
    // penerimaan
    var PR=[["DATA PENERIMAAN BAHAN KIMIA"],[periodeTxt()],[],["No","Tanggal","Nama Barang","No Surat Jalan","Volume SJ","Sat SJ","Volume Terima","Sat Terima","BJ / Faktor","Kg","Supplier","No Faktur","Dicatat oleh","Catatan"]],no=0;
    H.bahan.forEach(function(b){var ps=H.penerimaan.filter(function(x){return x.kode===b.kode;});if(!ps.length)return;PR.push([b.nama.toUpperCase()]);var sum=0;
      ps.forEach(function(x){no++;sum+=x.kg;PR.push([no,tglTxt(x.tanggal),x.nama,x.noSJ,x.sjVol,x.sjSat,x.vol,x.sat,x.bj||"",x.kg,x.supplier,x.faktur,x.oleh,x.catatan]);});PR.push(["","","Jumlah "+b.nama,"","","","","","",sum]);PR.push([]);});
    if(no===0)PR.push(["Tidak ada penerimaan pada periode ini."]);
    add("Penerimaan",PR,[5,12,36,18,12,8,14,10,10,14,32,16,16,34],[4,6,8,9]);
    // stok akhir
    var TK=S.param.tangki,SA=[["KONDISI ENDING STOCK BAHAN KIMIA"],[periodeTxt()+(H.bulan.urutan?" - "+(H.bulan.urutan==="sebelum"?"stok dihitung sebelum kiriman hari itu masuk":"stok dihitung sesudah kiriman hari itu masuk"):"")],[],
      ["No","Tanggal","Nama Barang","Bentuk"].concat(TK.map(function(t){return t+" (liter)";})).concat(["Total liter","Kemasan (jumlah)","Kg lepas","Kg dari kemasan","Kg dari larutan","TOTAL KG","Keterangan"])],n2=0;
    rows.forEach(function(r){var st=r.stok;if(!st)return;n2++;var tl=0;TK.forEach(function(t){tl+=Number(st.tangki[t])||0;});
      SA.push([n2,tglTxt(H.bulan.tglHitung),r.nama,"Larutan + kemasan"].concat(TK.map(function(t){return st.tangki[t]!=null?Number(st.tangki[t]):"";})).concat([tl||"",st.kemasan?st.kemasan+" "+(r.kemasan||""):"",st.lepas||"",st.kgKemasan,st.kgLarutan,st.total,st.ket]));});
    if(!n2)SA.push(["Stok akhir belum diisi."]);
    SA.push([],["Faktor konversi yang dipakai:"]);rows.forEach(function(r){SA.push(["",""," "+r.nama,r.faktor?"liter x "+String(Math.round(r.faktor*1e6)/1e6).replace(".",","):"tanpa tangki",r.kgKem?r.kgKem+" kg per "+r.kemasan:""]);});
    add("Stok Akhir",SA,[5,12,36,18].concat(TK.map(function(){return 14;})).concat([12,16,10,16,16,14,34]),TK.map(function(t,i){return 4+i;}).concat([4+TK.length,6+TK.length,7+TK.length,8+TK.length,9+TK.length,10+TK.length]));
    // perbandingan
    var PB=[["PERBANDINGAN DENGAN BULAN LALU"],[periodeTxt()+(H.prevPeriode?" dibanding "+blnTxt(H.prevPeriode):"")],[],["Bahan","Pemakaian bulan ini (kg)","Rata-rata per hari","Pemakaian bulan lalu (kg)","Rata-rata per hari bulan lalu","Selisih rata-rata (%)"]];
    rows.forEach(function(r){PB.push([r.nama,r.pemakaian==null?"":r.pemakaian,r.rata==null?"":r.rata,r.prevPemakaian==null?"":r.prevPemakaian,r.prevRata==null?"":r.prevRata,r.deltaPct==null?"":r.deltaPct]);});
    add("Perbandingan",PB,[38,22,18,22,24,20],[1,2,3,4,5]);
    // temuan
    var TM=[["TEMUAN PEMERIKSAAN OTOMATIS DAN KONFIRMASI"],[periodeTxt()],[],["No","Tingkat","Bahan","Temuan","Uraian","Pertanyaan (siapa: apa)","Jawaban / hasil konfirmasi","Dijawab oleh","Waktu"]];
    H.temuan.forEach(function(t,i){TM.push([i+1,t.level==="blok"?"Harus dibereskan":t.level==="warn"?"Perlu konfirmasi":"Info",t.bahan,t.judul,t.uraian,t.tanya.map(function(x){return x.siapa+": "+x.tanya;}).join("\n"),t.jawab,t.jawabOleh,t.jawabWaktu]);});
    if(!H.temuan.length)TM.push(["","","","Tidak ada temuan."]);
    add("Temuan",TM,[5,18,26,34,60,60,50,16,18]);
    // foto
    var FT=[["DAFTAR FOTO"],["Foto asli tersimpan di Google Drive: Opname Kimia SCTK / "+P],[],["No","Jenis","Tangki","Diunggah oleh","Waktu","Nama file","Catatan"]];
    H.foto.forEach(function(f,i){FT.push([i+1,f.jenis,f.tangki,f.oleh,f.waktu,f.nama,f.catatan]);});
    add("Foto",FT,[5,12,20,18,18,50,34]);
    // riwayat
    var RW=[["RIWAYAT PERUBAHAN"],[periodeTxt()],[],["Waktu","Oleh","Peran","Aksi","Rincian"]];S.riwayat.slice().reverse().forEach(function(x){RW.push([x.waktu,x.oleh,x.peran,x.aksi,x.rincian]);});
    add("Riwayat",RW,[18,18,10,26,90]);
    XLSX.writeFile(wb,"Stock_Opname_Bahan_Kimia_"+P+".xlsx");
  }
  async function cetak(){
    var H=S.hasil,w=window.open("","_blank");if(!w){T("Pop-up diblokir browser. Izinkan pop-up untuk situs ini lalu coba lagi.",true);return;}
    w.document.write("<p>Menyiapkan laporan...</p>");
    var rows=H.bahan.filter(function(r){return r.ada;}),ft="";
    var F=H.foto.slice(0,12);for(var i=0;i<F.length;i++){if(!cache[F[i].id]){try{var r=await api({action:"kimiaFotoGet",id:F[i].id});if(r.ok)cache[F[i].id]="data:"+r.mime+";base64,"+r.data;}catch(e){}}}
    F.forEach(function(f){if(cache[f.id])ft+='<div class="ft"><img src="'+cache[f.id]+'"><div>'+E(f.jenis+(f.tangki?" - "+f.tangki:""))+"<br>"+E(f.oleh+", "+f.waktu)+"</div></div>";});
    var tb=function(h,b){return "<table><thead><tr>"+h.map(function(x){return "<th>"+E(x)+"</th>";}).join("")+"</tr></thead><tbody>"+b+"</tbody></table>";};
    var d='<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Stock Opname Bahan Kimia '+P+'</title><style>body{font:12px "Segoe UI",Arial,sans-serif;color:#111;margin:18mm 14mm}h1{font-size:16px;margin:0}h2{font-size:13px;margin:16px 0 4px;border-bottom:1.5px solid #0c3b57;padding-bottom:2px}table{width:100%;border-collapse:collapse;margin:4px 0}th,td{border:1px solid #9aa;padding:3px 5px;text-align:left;vertical-align:top}th{background:#e6eef3}td.n,th.n{text-align:right;white-space:nowrap}.ft{display:inline-block;width:30%;margin:0 1% 8px 0;font-size:10px;vertical-align:top}.ft img{width:100%;height:120px;object-fit:cover}.ttd{display:flex;gap:20px;margin-top:30px}.ttd div{flex:1;text-align:center;height:90px}small{color:#555}@media print{@page{size:A4 landscape;margin:10mm}}</style></head><body>'+
     '<h1>LAPORAN STOCK OPNAME BAHAN KIMIA</h1><div>PT SARANA CATUR TIRTA KELOLA</div><div>'+E(periodeTxt())+" &middot; "+(final()?"FINAL":"DRAF (belum final)")+"</div><div><small>Satuan kg. Pemakaian = Saldo Awal + Penerimaan - Stok Akhir.</small></div>"+
     "<h2>Ringkasan</h2>"+tb(["Bahan","Saldo awal","Penerimaan","Stok akhir","Pemakaian","Rata/hari","Perhitungan"],rows.map(function(r){return "<tr><td>"+E(r.nama)+'</td><td class="n">'+nf(r.saldoAwal)+'</td><td class="n">'+nf(r.penerimaan)+'</td><td class="n">'+nf(r.stokAkhir)+'</td><td class="n"><b>'+nf(r.pemakaian)+'</b></td><td class="n">'+nf(r.rata)+"</td><td>"+E(rumusTxt(r))+"</td></tr>";}).join(""))+
     "<h2>Penerimaan</h2>"+tb(["Tanggal","Bahan","No SJ","Diterima","Kg","Supplier","Dicatat"],H.penerimaan.map(function(x){return "<tr><td>"+tglTxt(x.tanggal)+"</td><td>"+E(x.nama)+"</td><td>"+E(x.noSJ)+'</td><td class="n">'+nf(x.vol)+" "+E(x.sat)+'</td><td class="n">'+nf(x.kg)+"</td><td>"+E(x.supplier)+"</td><td>"+E(x.oleh)+"</td></tr>";}).join("")||'<tr><td colspan="7">Tidak ada.</td></tr>')+
     "<h2>Stok akhir</h2>"+tb(["Bahan","Kemasan","Kg lepas","Larutan tangki (liter)","Kg kemasan","Kg larutan","Total kg","Keterangan"],rows.filter(function(r){return r.stok;}).map(function(r){var s=r.stok;return "<tr><td>"+E(r.nama)+"</td><td>"+(s.kemasan?s.kemasan+" "+E(r.kemasan):"-")+'</td><td class="n">'+nf(s.lepas)+"</td><td>"+E(Object.keys(s.tangki).map(function(k){return k+": "+nf(s.tangki[k],0);}).join("; ")||"-")+'</td><td class="n">'+nf(s.kgKemasan)+'</td><td class="n">'+nf(s.kgLarutan)+'</td><td class="n"><b>'+nf(s.total)+"</b></td><td>"+E(s.ket)+"</td></tr>";}).join(""))+
     (H.temuan.length?"<h2>Temuan dan konfirmasi</h2>"+tb(["Temuan","Uraian","Jawaban / konfirmasi"],H.temuan.map(function(t){return "<tr><td>"+E(t.judul)+" <small>"+E(t.bahan)+"</small></td><td>"+E(t.uraian)+"</td><td>"+E(t.jawab||"-")+(t.jawabOleh?" <small>("+E(t.jawabOleh)+")</small>":"")+"</td></tr>";}).join("")):"")+
     (ft?"<h2>Foto</h2>"+ft:"")+'<div class="ttd"><div>Dibuat oleh<br><br><br><br>( operator )</div><div>Diperiksa<br><br><br><br>( '+E(final()&&S.finalOleh?S.finalOleh:"Admin Gudang")+' )</div><div>Mengetahui<br><br><br><br>( Accounting )</div></div></body></html>';
    w.document.open();w.document.write(d);w.document.close();setTimeout(function(){w.focus();w.print();},400);
  }
  return {mount:mount,muat:muat};
})();
