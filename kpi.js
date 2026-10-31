/* KPI Gudang (tab admin). Bergantung pada api(), toast(), XLSX. */
var KPI=(function(){
  var el=null,P="",R=null;
  function E(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
  function nf(n,d){if(n==null||n==="")return "-";d=d==null?1:d;return Number(n).toLocaleString("id-ID",{minimumFractionDigits:0,maximumFractionDigits:d});}
  function rp(n){return n==null?"-":"Rp "+Math.round(n).toLocaleString("id-ID");}
  var BLN=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  function blnTxt(p){return BLN[Number(p.slice(5,7))-1]+" "+p.slice(0,4);}
  function opsi(){var t=new Date(),o=[];for(var i=0;i<12;i++){var d=new Date(t.getFullYear(),t.getMonth()-i,1),v=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");o.push(v);}return o;}
  function css(){if(document.getElementById("kpicss"))return;var s=document.createElement("style");s.id="kpicss";
    s.textContent=".kpx .kpg{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px}.kpx .kpc{border:1px solid var(--line,#ccd);border-radius:6px;padding:12px;background:var(--card,#fff)}"+
    ".kpx .kpc h4{margin:0 0 4px;font-size:13px}.kpx .kpv{font-size:26px;font-weight:700;line-height:1.1}.kpx .kpv small{font-size:13px;font-weight:600;color:var(--mut,#567)}.kpx .kps{font-size:12px;color:var(--mut,#567);margin-top:6px}"+
    ".kpx .kpst{display:inline-block;border-radius:20px;padding:2px 9px;font-size:11px;font-weight:700;margin-left:6px;vertical-align:middle}.kpx .kpst.ok{background:#d9f0df;color:#14612b}.kpx .kpst.warn{background:#fff3cd;color:#7a5b00}.kpx .kpst.bad{background:#f8d7da;color:#8a1c28}.kpx .kpst.na{background:#e4e9ec;color:#334}"+
    "html[data-tema=gelap] .kpx .kpst.ok{background:#17402a;color:#a9e6bd}html[data-tema=gelap] .kpx .kpst.warn{background:#4a3a0a;color:#f3d98a}html[data-tema=gelap] .kpx .kpst.bad{background:#4d1d22;color:#f4b8bf}html[data-tema=gelap] .kpx .kpst.na{background:#2a3a44;color:#cfe0ea}"+
    ".kpx .kpd{font-weight:600}.kpx .num{text-align:right;white-space:nowrap}@media (max-width:760px){.kpx td.num,.kpx td{white-space:normal;text-align:left}.kpx table{width:100%;min-width:0}}.kpx .tw{overflow-x:auto;max-width:100%}";document.head.appendChild(s);}
  function T(k){return R.target["KPI Target "+k];}
  function sts(v,tg,rendahBaik){if(v==null)return {c:"na",t:"belum ada data"};var ok=rendahBaik?v<=tg:v>=tg,mid=rendahBaik?v<=tg*1.2+1e-9:v>=tg-10;return ok?{c:"ok",t:"tercapai"}:mid?{c:"warn",t:"mendekati"}:{c:"bad",t:"di bawah target"};}
  function dlt(a,b,sat,rendahBaik){if(a==null||b==null)return "";var d=a-b;if(Math.abs(d)<0.05)return "sama dengan bulan lalu";var naik=d>0,baik=rendahBaik?!naik:naik;return (naik?"naik ":"turun ")+nf(Math.abs(d))+(sat||"")+" dari bulan lalu"+(baik?"":" (perlu perhatian)");}
  function card(j,v,sat,s,sub,dl){return '<div class="kpc"><h4>'+E(j)+(s?'<span class="kpst '+s.c+'">'+E(s.t)+'</span>':'')+'</h4><div class="kpv">'+v+(sat?' <small>'+E(sat)+'</small>':'')+'</div><div class="kps">'+sub+'</div>'+(dl?'<div class="kps kpd">'+E(dl)+'</div>':'')+'</div>';}
  async function muat(p){
    css();if(p)P=p;if(!P)P=opsi()[0];
    el.innerHTML='<div class="card msg">Menghitung KPI...</div>';
    var r;try{r=await api({action:"adminKpi",periode:P});}catch(e){el.innerHTML='<div class="card msg err">Gagal terhubung ke server.</div>';return;}
    if(!r.ok){el.innerHTML='<div class="card msg err">'+E(r.msg||"Gagal")+'</div>';return;}
    R=r;render();
  }
  function mount(root){el=root;return muat();}
  function render(){
    var K=R.K,Q=R.Kprev,h='<div class="kpx">';
    h+='<div class="card"><div class="fr" style="margin:0"><b>Periode</b><select id="kpp">'+opsi().map(function(o){return '<option value="'+o+'"'+(o===P?" selected":"")+'>'+blnTxt(o)+'</option>';}).join("")+'</select><span class="note">Dibanding '+blnTxt(R.sebelumnya)+'. Semua waktu dihitung dalam jam kerja.</span><span style="flex:1"></span><button class="gh" id="kpx">Unduh Excel</button></div></div>';
    var L=K.layanan,Lq=Q.layanan,tL=T("Layanan Gudang (jam kerja)"),tLp=T("Layanan Persen"),tT=T("Terpenuhi Persen"),tA=T("Akurasi Stok Persen"),tM=T("Barang Mati Persen"),tR=T("Pengembalian Diterima (jam kerja)"),tC=T("Kepatuhan Pencatatan Persen"),tK=T("Lokasi Rak Persen"),tG=T("Kelengkapan TTD (jam kerja)"),tP=T("Persetujuan PIC (jam kerja)");
    h+='<div class="card"><b>Ringkasan KPI</b><div class="note" style="margin-bottom:8px">Target adalah usulan awal dan bisa diubah di bagian paling bawah.</div><div class="kpg">';
    h+=card("Kecepatan layanan gudang",L.persenDalamTarget==null?"-":nf(L.persenDalamTarget)+"%","dalam "+tL+" jam kerja",sts(L.persenDalamTarget,tLp),'Dari PIC menyetujui sampai ditandai diserahkan (atau Serah Barang bila belum ditandai). Rata-rata '+nf(L.rata)+' jam, tengah '+nf(L.median)+' jam, '+L.n+' dokumen.'+(L.menungguBarangN?' '+L.menungguBarangN+' dokumen sempat menunggu barang (rata-rata '+nf(L.menungguBarangRata)+' jam, tidak dihitung sebagai keterlambatan gudang).':''),dlt(L.persenDalamTarget,Lq.persenDalamTarget,"%"));
    var TP=K.terpenuhi,KB=K.kesiapanBuffer;
    h+=card("Tingkat terpenuhi barang buffer",TP.persen==null?"-":nf(TP.persen)+"%","permintaan",sts(TP.persen,tT),TP.terpenuhi+' dari '+TP.baris+' baris permintaan barang buffer langsung terpenuhi dari stok.'+(KB?' Kesiapan hari ini: '+KB.aman+' dari '+KB.total+' barang buffer aman ('+nf(KB.persen)+'%).':'<br>Belum ada paket buffer.'),dlt(TP.persen,Q.terpenuhi.persen,"%"));
    var AK=K.akurasi;
    h+=card("Akurasi stok (opname)",AK.persen==null?"-":nf(AK.persen)+"%","cocok",sts(AK.persen,tA),AK.cocok+' dari '+AK.barangDihitung+' barang cocok; '+AK.selisih+' selisih, nilai '+rp(AK.nilaiSelisih)+'.',dlt(AK.persen,Q.akurasi.persen,"%"));
    var BM=K.kondisi.barangMati;
    h+=card("Barang mati (lebih dari 90 hari)",BM.persenNilai==null?"-":nf(BM.persenNilai)+"%","dari nilai stok",sts(BM.persenNilai,tM,true),BM.jumlah+' barang, nilai '+rp(BM.nilai)+' dari stok '+rp(K.kondisi.nilaiStok)+'. Kondisi hari ini.');
    var KD=K.kondisi.kedaluwarsa;
    h+=card("Risiko kedaluwarsa",KD.lewat+KD.h30,"barang",{c:KD.lewat>0?"bad":(KD.h30>0?"warn":"ok"),t:KD.lewat>0?"ada yang lewat":(KD.h30>0?"segera":"aman")},KD.lewat+' sudah lewat, '+KD.h30+' dalam 30 hari. Nilai berisiko '+rp(KD.nilaiRisiko)+'. Kondisi hari ini.');
    var PG=K.pengembalian;
    h+=card("Pengembalian barang sisa proyek",PG.dokumen,"dokumen",PG.dalamTarget==null?null:sts(PG.dalamTarget,tLp),'Qty kembali '+nf(PG.qty,2)+', nilai '+rp(PG.nilai)+'. Siap diterima sampai diterima fisik: rata-rata '+nf(PG.rataJam)+' jam kerja (target '+tR+' jam).'+(PG.menungguTerima?' '+PG.menungguTerima+' dokumen masih menunggu diterima.':''),dlt(PG.nilai,Q.pengembalian.nilai,"",false));
    var PH=K.penghematan;
    h+=card("Penghematan dari stok",rp(PH.nilai),"",null,'Nilai barang yang dipenuhi dari stok Moka dan Accurate sehingga tidak perlu beli, dari '+PH.dokumen+' dokumen. Barang bekas dipakai: '+PH.barisBekas+' baris ('+nf(PH.qtyBekas,2)+' unit, tidak dinilai).',dlt(PH.nilai,Q.penghematan.nilai,"",false));
    var BK=K.beban;
    h+=card("Beban kerja",BK.total,"permintaan",null,'Rata-rata '+nf(BK.rataPerHariAktif)+' per hari aktif ('+BK.hariAktif+' hari). Tersibuk: '+(BK.hariTersibuk?BK.hariTersibuk.tgl+' ('+BK.hariTersibuk.n+')':'-')+', jam '+(BK.jamTersibuk?BK.jamTersibuk.jam+' ('+BK.jamTersibuk.n+')':'-')+'. Ditolak '+K.permintaan.ditolak+', belum diserahkan '+K.permintaan.belumDiserahkan+(K.permintaan.tindakLanjut?', perlu tindak lanjut (ditolak setelah barang ditandai diserahkan) '+K.permintaan.tindakLanjut:'')+'.',dlt(BK.total,Q.beban.total,""));
    var PC=K.pencatatan;
    h+=card("Kepatuhan pencatatan penyerahan",PC.persen==null?"-":nf(PC.persen)+"%","lengkap",sts(PC.persen,tC),PC.lengkap+' dari '+PC.dokumen+' dokumen punya departemen dan PPBJ; dicatat belakangan (lebih dari 2 jam kerja) '+PC.dicatatBelakangan+'.',dlt(PC.persen,Q.pencatatan.persen,"%"));
    var RK=K.kondisi.rak,MM=K.kondisi.masterMenunggu;
    h+=card("Kerapian lokasi barang",RK.persen==null?"-":nf(RK.persen)+"%","punya rak",sts(RK.persen,tK),RK.adaRak+' dari '+RK.berstok+' barang berstok punya lokasi rak. Pengajuan master barang menunggu: '+MM.jumlah+' ('+MM.lebih7Hari+' lebih dari 7 hari).');
    var LK=K.lengkap;
    h+=card("Kelengkapan tanda tangan",LK.persenDalamTarget==null?"-":nf(LK.persenDalamTarget)+"%","dalam "+tG+" jam kerja",sts(LK.persenDalamTarget,tLp),'Dari PIC menyetujui sampai tanda tangan terakhir. Rata-rata '+nf(LK.rata)+' jam. Belum lengkap: '+LK.belumLengkap+(LK.daftarBelum.length?' ('+E(LK.daftarBelum.join(", "))+')':'')+'.',dlt(LK.persenDalamTarget,Q.lengkap.persenDalamTarget,"%"));
    h+='</div></div>';
    // tunggu per pihak
    var W=K.tunggu;
    h+='<div class="card"><b>Waktu tunggu per pihak</b><div class="note">Siapa yang menahan proses. Gudang hanya bertanggung jawab pada tahap "disetujui PIC sampai diserahkan" di atas. Penyerahan boleh dilakukan setelah PIC menyetujui, sehingga tanda tangan berikutnya menyusul.</div><div class="tw"><table><thead><tr><th>Tahap</th><th>Pemilik waktu</th><th class="num">Dokumen</th><th class="num">Rata-rata (jam kerja)</th><th class="num">Terlama</th></tr></thead><tbody>'+
     [["Dikirim sampai disetujui PIC","PIC",W.pic],["Disetujui PIC sampai disetujui atasan","Atasan",W.atasan],["Disetujui atasan sampai Staff Gudang","Staff Gudang",W.staffGudang],["Staff Gudang sampai Manager Gudang","Manager Gudang",W.managerGudang]].map(function(x){return '<tr><td data-l="Tahap">'+x[0]+'</td><td data-l="Pemilik waktu">'+x[1]+'</td><td class="num" data-l="Dokumen">'+x[2].n+'</td><td class="num" data-l="Rata-rata (jam kerja)"><b>'+nf(x[2].rata)+'</b></td><td class="num" data-l="Terlama">'+nf(x[2].maks)+'</td></tr>';}).join("")+'</tbody></table></div>'+
     (W.pictTerlama.length?'<div class="note" style="margin-top:8px">Persetujuan PIC terlama (target '+tP+' jam): '+W.pictTerlama.map(function(x){return E(x.doc)+' ('+E(x.pihak)+', '+nf(x.jam)+' jam)';}).join("; ")+'.</div>':'')+'</div>';
    // detail
    var det='';
    if(L.terlama.length)det+='<div><b>Penyerahan paling lama</b><ul>'+L.terlama.map(function(x){return '<li>'+E(x.doc)+' - '+nf(x.jam)+' jam kerja ('+E(x.dept||"-")+')</li>';}).join("")+'</ul></div>';
    if(TP.gagal.length)det+='<div><b>Barang buffer yang tidak langsung terpenuhi</b><ul>'+TP.gagal.map(function(x){return '<li>'+E(x.nama)+': diminta '+nf(x.minta,2)+', dari stok '+nf(x.dariStok,2)+'</li>';}).join("")+'</ul></div>';
    if(KB&&KB.kurang.length)det+='<div><b>Barang buffer di bawah batas hari ini</b><ul>'+KB.kurang.map(function(x){return '<li>'+E(x.nama)+' ('+E(x.status)+'): stok bebas '+nf(x.bebas,2)+', buffer '+nf(x.buffer,2)+', kurang '+nf(x.kurang,2)+'</li>';}).join("")+'</ul></div>';
    if(K.beban.perDept.length)det+='<div><b>Permintaan per departemen</b><ul>'+K.beban.perDept.map(function(x){return '<li>'+E(x.dept)+': '+x.n+'</li>';}).join("")+'</ul></div>';
    if(det)h+='<details class="card" open><summary><b>Rincian penyebab dan daftar</b></summary><div class="grid2" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">'+det+'</div></details>';
    // biaya
    var B=R.biaya;
    h+='<div class="card"><b>Biaya dan pemakaian per proyek</b><div class="note">Nilai = harga stok x jumlah diserahkan dari Moka dan Accurate. Barang tanpa harga dan Bekas tidak ikut dijumlahkan. RAB dihitung dari kebutuhan proyek yang diisi PIC, dikali harga stok.</div>'+
     (B.proyek.length?'<div class="tw"><table><thead><tr><th>PPBJ</th><th>Departemen</th><th class="num">Keluar bulan ini</th><th class="num">Keluar total</th><th class="num">RAB</th><th class="num">Sisa RAB</th><th class="num">Terpakai</th></tr></thead><tbody>'+B.proyek.map(function(x){return '<tr><td data-l="PPBJ"><b>'+E(x.ppbj)+'</b><small>'+E(x.ket)+(x.status?' &middot; '+E(x.status):'')+'</small></td><td data-l="Departemen">'+E(x.dept||"-")+'</td><td class="num" data-l="Keluar bulan ini">'+rp(x.keluarBulan)+'</td><td class="num" data-l="Keluar total">'+rp(x.keluarTotal)+'</td><td class="num" data-l="RAB">'+(x.rab?rp(x.rab):"-")+(x.barangTanpaHarga?'<small>'+x.barangTanpaHarga+' barang tanpa harga</small>':'')+'</td><td class="num" data-l="Sisa RAB">'+(x.sisa==null?"-":rp(x.sisa))+'</td><td class="num" data-l="Terpakai">'+(x.persenTerpakai==null?"-":nf(x.persenTerpakai)+"%")+'</td></tr>';}).join("")+'</tbody></table></div>':'<div class="msg">Belum ada data.</div>')+'</div>';
    h+='<div class="card"><b>Pemakaian per departemen (bulan ini)</b>'+(B.departemen.length?'<div class="tw"><table><thead><tr><th>Departemen</th><th class="num">Dokumen</th><th class="num">Baris barang</th><th class="num">Nilai</th></tr></thead><tbody>'+B.departemen.map(function(x){return '<tr><td data-l="Departemen"><b>'+E(x.dept)+'</b></td><td class="num" data-l="Dokumen">'+x.dokumen+'</td><td class="num" data-l="Baris barang">'+x.baris+'</td><td class="num" data-l="Nilai">'+rp(x.nilai)+'</td></tr>';}).join("")+'</tbody></table></div>':'<div class="msg">Belum ada penyerahan bulan ini.</div>')+'</div>';
    // target
    h+='<details class="card"><summary><b>Target KPI</b> (bisa diubah)</summary><div class="note">Usulan awal. Ubah sesuai kebijakan gudang; perubahan berlaku untuk semua bulan.</div><div class="tw"><table><tbody>'+
     R.targetDef.map(function(d,i){return '<tr><td>'+E(d.kunci.replace("KPI Target ",""))+'<small>'+E(d.ket)+'</small></td><td style="width:120px"><input type="text" inputmode="decimal" data-tg="'+E(d.kunci)+'" value="'+E(R.target[d.kunci])+'" style="width:100px"></td></tr>';}).join("")+'</tbody></table></div><div class="fr"><button class="sv" id="kpt">Simpan target</button></div></details></div>';
    el.innerHTML=h;
labelTabel(el);
    el.querySelector("#kpp").onchange=function(){muat(this.value);};
    el.querySelector("#kpx").onclick=excel;
    el.querySelector("#kpt").onclick=async function(){var v={};el.querySelectorAll("[data-tg]").forEach(function(i){v[i.getAttribute("data-tg")]=i.value;});var r=await api({action:"adminKpiTarget",nilai:v});toast(r.msg||"Gagal",!r.ok);if(r.ok)muat();};
  }
  function labelTabel(root){root.querySelectorAll("table").forEach(function(t){var th=[].map.call(t.querySelectorAll("thead th"),function(x){return x.textContent.trim();});if(!th.length)return;t.querySelectorAll("tbody tr").forEach(function(tr){[].forEach.call(tr.children,function(td,i){if(td.tagName==="TD"&&!td.hasAttribute("data-l")&&th[i]&&!td.hasAttribute("colspan"))td.setAttribute("data-l",th[i]);});});});}
  function excel(){
    if(typeof XLSX==="undefined"){toast("Pustaka Excel belum termuat. Periksa internet lalu muat ulang.",true);return;}
    var K=R.K,Q=R.Kprev,wb=XLSX.utils.book_new();
    function add(n,rows,w){var ws=XLSX.utils.aoa_to_sheet(rows);ws["!cols"]=(w||[]).map(function(x){return {wch:x};});XLSX.utils.book_append_sheet(wb,ws,n);}
    var tL=T("Layanan Gudang (jam kerja)");
    add("KPI",[["KPI GUDANG"],["PT SARANA CATUR TIRTA KELOLA"],["Periode "+blnTxt(P)+" (dibanding "+blnTxt(R.sebelumnya)+"). Waktu dalam jam kerja."],[],["KPI","Nilai bulan ini","Satuan","Target","Bulan lalu","Keterangan"],
     ["Layanan gudang dalam "+tL+" jam kerja",K.layanan.persenDalamTarget,"%",T("Layanan Persen"),Q.layanan.persenDalamTarget,"Rata-rata "+nf(K.layanan.rata)+" jam, "+K.layanan.n+" dokumen"],
     ["Tingkat terpenuhi barang buffer",K.terpenuhi.persen,"%",T("Terpenuhi Persen"),Q.terpenuhi.persen,K.terpenuhi.terpenuhi+" dari "+K.terpenuhi.baris+" baris"],
     ["Kesiapan stok buffer (hari ini)",K.kesiapanBuffer?K.kesiapanBuffer.persen:"","%",T("Terpenuhi Persen"),"",K.kesiapanBuffer?K.kesiapanBuffer.aman+" dari "+K.kesiapanBuffer.total+" barang aman":""],
     ["Akurasi stok (opname)",K.akurasi.persen,"%",T("Akurasi Stok Persen"),Q.akurasi.persen,K.akurasi.cocok+" dari "+K.akurasi.barangDihitung+" barang cocok"],
     ["Barang mati (nilai dibanding stok)",K.kondisi.barangMati.persenNilai,"%",T("Barang Mati Persen"),"","Nilai "+Math.round(K.kondisi.barangMati.nilai)],
     ["Kedaluwarsa (lewat + 30 hari)",K.kondisi.kedaluwarsa.lewat+K.kondisi.kedaluwarsa.h30,"barang",0,"",""],
     ["Pengembalian: dokumen",K.pengembalian.dokumen,"dokumen","",Q.pengembalian.dokumen,"Nilai "+Math.round(K.pengembalian.nilai)],
     ["Penghematan dari stok",K.penghematan.nilai,"Rp","",Q.penghematan.nilai,""],
     ["Beban kerja: permintaan",K.beban.total,"permintaan","",Q.beban.total,"Rata-rata "+nf(K.beban.rataPerHariAktif)+" per hari aktif"],
     ["Kepatuhan pencatatan penyerahan",K.pencatatan.persen,"%",T("Kepatuhan Pencatatan Persen"),Q.pencatatan.persen,""],
     ["Lokasi rak barang berstok",K.kondisi.rak.persen,"%",T("Lokasi Rak Persen"),"",""],
     ["Kelengkapan tanda tangan dalam "+T("Kelengkapan TTD (jam kerja)")+" jam kerja",K.lengkap.persenDalamTarget,"%",T("Layanan Persen"),Q.lengkap.persenDalamTarget,"Belum lengkap: "+K.lengkap.belumLengkap]],[48,16,10,10,12,50]);
    var W=K.tunggu;add("Waktu Tunggu",[["WAKTU TUNGGU PER PIHAK (jam kerja)"],["Periode "+blnTxt(P)],[],["Tahap","Pemilik","Dokumen","Rata-rata","Terlama"],
     ["Dikirim sampai disetujui PIC","PIC",W.pic.n,W.pic.rata,W.pic.maks],["PIC sampai atasan","Atasan",W.atasan.n,W.atasan.rata,W.atasan.maks],["Atasan sampai Staff Gudang","Staff Gudang",W.staffGudang.n,W.staffGudang.rata,W.staffGudang.maks],["Staff Gudang sampai Manager Gudang","Manager Gudang",W.managerGudang.n,W.managerGudang.rata,W.managerGudang.maks]],[40,18,10,12,12]);
    add("Biaya Proyek",[["BIAYA DAN PEMAKAIAN PER PROYEK"],["Periode "+blnTxt(P)+". Nilai = harga stok x jumlah diserahkan (Moka + Accurate)."],[],["PPBJ","Keterangan","Departemen","Status","Keluar bulan ini","Keluar total","RAB","Sisa RAB","Terpakai (%)"]].concat(R.biaya.proyek.map(function(x){return [x.ppbj,x.ket,x.dept,x.status,x.keluarBulan,x.keluarTotal,x.rab,x.sisa==null?"":x.sisa,x.persenTerpakai==null?"":x.persenTerpakai];})),[16,36,16,14,16,16,16,16,12]);
    add("Biaya Departemen",[["PEMAKAIAN PER DEPARTEMEN"],["Periode "+blnTxt(P)],[],["Departemen","Dokumen","Baris barang","Nilai"]].concat(R.biaya.departemen.map(function(x){return [x.dept,x.dokumen,x.baris,x.nilai];})),[24,10,14,16]);
    XLSX.writeFile(wb,"KPI_Gudang_"+P+".xlsx");
  }
  return {mount:mount,muat:muat};
})();
