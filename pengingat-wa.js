/* T169: teks pesan Kotak Pengingat WhatsApp disusun langsung di browser dari data adminPengingatDaftar (salin instan).
   Isi kalimat sama persis dengan pwaTeks*_ di Code.gs (diuji berdampingan). Tautan diisi sesudah server membuatnya. */
var PWX=(function(){
  var PENUTUP="\n\nTerima kasih.\nHormat kami,\nStaff Gudang\nPT Sarana Catur Tirta Kelola";
  function salam(d){var j=d.getHours();return j<11?"pagi":j<15?"siang":j<18?"sore":"malam";}
  function p2(n){return (n<10?"0":"")+n;}
  function waktu(d){return p2(d.getDate())+"/"+p2(d.getMonth()+1)+"/"+d.getFullYear()+" "+p2(d.getHours())+":"+p2(d.getMinutes());}
  function nada(h,B){return h>=2*B?2:h>=B?1:0;}
  function jenisTeks(items){
    var r=items.some(function(x){return x.jenis==="Permintaan";}),k=items.some(function(x){return x.jenis==="Pengembalian";});
    return r&&k?"permintaan dan pengembalian barang":k?"pengembalian barang sisa proyek":"permintaan barang";
  }
  function kalimatLewat(items,B){
    var k=items.filter(function(x){return nada(x.hari,B)>=1;}).length,kk=items.filter(function(x){return nada(x.hari,B)>=2;}).length;
    if(!k)return "";
    return " "+(k===items.length?(items.length===1?"Permintaan ini":"Seluruhnya"):k+" di antaranya")+" telah melewati batas waktu persetujuan ("+B+" hari)."+(kk?" Mohon kiranya dapat diprioritaskan.":"");
  }
  function barang(list,n,M){
    var t=(list||[]).slice(0,M).map(function(b){return "   - "+b.kode+" - "+b.nama+" - "+(Math.round(Number(b.jml)*100)/100)+" "+b.sat;});
    if(n>M)t.push("   - +"+(n-M)+" barang lainnya (lengkapnya di tautan)");
    return t.join("\n");
  }
  function rinciDok(x,no,B,M){
    var l=["*"+no+x.doc+"* - menunggu "+x.lama+(nada(x.hari,B)>=1?" (melewati batas waktu)":""),"   Pemohon: "+x.pemohon+" ("+x.dept+")","   Dikirim: "+(x.kirim||"-")];
    l.push("   Proyek/PPBJ: "+(x.ppbj?x.ppbj+(x.proyek?" - "+x.proyek:""):"-"));
    if(x.alasan)l.push("   Alasan: "+String(x.alasan).replace(/\s+/g," ").slice(0,200));
    l.push("   Barang ("+x.nItem+" item):");l.push(barang(x.barang,x.nItem,M));
    if(x.riwayat&&x.riwayat.length)l.push("   Riwayat: "+x.riwayat.map(function(h){return h.tahap+(h.nama?" "+h.nama:"")+" menyetujui "+h.waktu+(h.cat?" (catatan: "+h.cat+")":"");}).join("; "));
    return l.join("\n");
  }
  /* R = data adminPengingatDaftar (batas, maksBarang, hariTautan) */
  function gab(R,g,link,now,tingkat){
    var B=R.batas,M=R.maksBarang,rinci=tingkat!=="ringkas";
    var h=g.items.map(function(x,i){return rinci?rinciDok(x,(i+1)+". ",B,M):(i+1)+". "+x.doc+" - "+x.dept+" - "+x.pemohon+" - menunggu "+x.lama+(nada(x.hari,B)>=1?" (melewati batas waktu)":"");}).join(rinci?"\n\n":"\n");
    return "Selamat "+salam(now)+", "+g.sapaan+" "+g.nama+".\n\nDengan hormat, terdapat "+g.items.length+" "+jenisTeks(g.items)+" yang menunggu persetujuan "+g.sapaan+" sebagai "+g.peran+"."+kalimatLewat(g.items,B)+"\n\n"+h+
      "\n\nMohon berkenan menindaklanjutinya melalui tautan berikut (berlaku "+R.hariTautan+" hari sejak dikirim):\n"+link+PENUTUP;
  }
  function satu(R,g,x,link,now,tingkat){
    var B=R.batas,rinci=tingkat!=="ringkas";
    return "Selamat "+salam(now)+", "+g.sapaan+" "+g.nama+".\n\nDengan hormat, "+jenisTeks([x])+" No. "+x.doc+" dari "+x.pemohon+" ("+x.dept+") telah menunggu persetujuan "+g.sapaan+" sebagai "+g.peran+" selama "+x.lama+"."+kalimatLewat([x],B)+
      (rinci?"\n\n"+rinciDok(x,"",B,R.maksBarang):"")+"\n\nMohon berkenan menindaklanjutinya melalui tautan berikut:\n"+link+PENUTUP;
  }
  function ppbj(R,x,link,now,tingkat){
    var rinci=tingkat!=="ringkas",det="";
    if(rinci)det="\n\n*"+x.doc+"*\n   Pemohon: "+x.pemohon+" ("+x.dept+")\n   Dikirim: "+(x.kirim||"-")+(x.alasan?"\n   Alasan: "+String(x.alasan).replace(/\s+/g," ").slice(0,200):"")+"\n   Barang ("+x.nItem+" item):\n"+barang(x.barang,x.nItem,R.maksBarang);
    return "Selamat "+salam(now)+", "+x.sapaan+" "+x.nama+".\n\nDengan hormat, Nomor PPBJ untuk permintaan barang No. "+x.doc+" dari "+x.pemohon+" ("+x.dept+") yang dikirim "+x.hari+" hari yang lalu belum diinformasikan ke Gudang."+(x.hari>=6?" Mohon kiranya dapat diprioritaskan.":"")+
      " Mohon berkenan menyiapkan PPBJ, melakukan penyesuaian di Accurate, lalu mengisi nomornya melalui tautan berikut:\n"+link+det+PENUTUP;
  }
  function esk(R,g,now){
    var B=R.batas,t=g.esk,lw=g.items.filter(function(x){return nada(x.hari,B)>=1;});
    var h=lw.map(function(x,i){return (i+1)+". "+x.doc+" - "+x.dept+" - "+x.pemohon+" - menunggu "+x.lama;}).join("\n");
    return "Selamat "+salam(now)+", "+t.sapaan+" "+t.nama+".\n\nDengan hormat, kami menyampaikan bahwa terdapat "+lw.length+" "+jenisTeks(lw)+" yang telah melewati batas waktu persetujuan ("+B+" hari) dan masih menunggu "+g.sapaan+" "+g.nama+" sebagai "+g.peran+":\n"+h+
      "\n\nMohon bantuan "+t.sapaan+" untuk mengingatkan atau menindaklanjutinya sesuai kewenangan."+PENUTUP;
  }
  function rekap(R,now){
    var B=R.batas,L=[],nS=0,lewat=0;
    R.orang.forEach(function(g){
      nS+=g.jumlah;lewat+=g.items.filter(function(x){return nada(x.hari,B)>=1;}).length;
      var docs=g.items.slice(0,6).map(function(x){return x.doc;}).join(", ")+(g.items.length>6?" +"+(g.items.length-6)+" lagi":"");
      L.push("- "+g.sapaan+" "+(g.terdaftar?g.nama:"(belum terdaftar)")+" ("+g.peran+"): "+g.items.length+" permintaan ("+docs+"), terlama "+g.terlama+" hari");
    });
    var pp=R.ppbj.slice().sort(function(a,b){return b.hari-a.hari;});
    return "*Rekap Permintaan Menunggu* - "+waktu(now)+"\n\n"+(L.length?"Menunggu persetujuan ("+nS+" permintaan):\n"+L.join("\n")+"\nMelewati batas waktu ("+B+" hari): "+lewat+" permintaan":"Tidak ada permintaan yang menunggu persetujuan.")+
      "\n\n"+(pp.length?"No PPBJ belum diisi: "+pp.length+" permintaan ("+pp.slice(0,6).map(function(x){return x.doc;}).join(", ")+(pp.length>6?" +"+(pp.length-6)+" lagi":"")+"), terlama "+pp[0].hari+" hari":"Semua permintaan sudah ber-No PPBJ.")+
      "\n\nRekap ini hanya informasi dan tidak memuat tautan.\nStaff Gudang\nPT Sarana Catur Tirta Kelola";
  }
  /* ---- T169: No PPBJ belum diisi, per PIC ---- */
  function picBaris(x,i,M,rinci){
    var st=x.serah?"barang sudah diserahkan, tinggal Nomor PPBJ":x.status?"status: "+String(x.status).toLowerCase():"";
    var l=(rinci?"*":"")+(i+1)+". "+x.doc+(rinci?"*":"")+" - "+x.hari+" hari - "+x.pemohon+" ("+x.dept+")"+(st?" - "+st:"");
    if(rinci){
      if(x.tgl)l+="\n   Dikirim: "+x.tgl.split("-").reverse().join("/");
      if(x.alasan)l+="\n   Alasan: "+x.alasan;
      l+="\n   Barang ("+x.nItem+" item):\n"+barang(x.barang,x.nItem,M);
    }
    return l;
  }
  function pic(R,g,now,tingkat){
    var rinci=tingkat!=="ringkas",n=g.items.length,ns=g.nSerah,lama=g.items.some(function(x){return x.hari>=6;});
    var sbg=g.tanpaPic?"sebagai pemohon (PIC belum dipilih)":"sebagai PIC";
    var h=g.items.map(function(x,i){return picBaris(x,i,R.maksBarang,rinci);}).join(rinci?"\n\n":"\n");
    return "Selamat "+salam(now)+", "+g.sapaan+" "+g.nama+".\n\nDengan hormat, terdapat "+n+" permintaan barang dengan "+g.sapaan+" "+sbg+" yang Nomor PPBJ-nya belum diinformasikan ke Gudang."+
      (ns?" "+(ns===n?(n===1?"Barangnya":"Seluruh barangnya"):ns+" di antaranya barangnya")+" sudah diserahkan, sehingga hanya tinggal Nomor PPBJ untuk kelengkapan administrasi.":"")+(lama?" Mohon kiranya dapat diprioritaskan.":"")+
      "\n\n"+h+"\n\nMohon berkenan menyiapkan PPBJ, melakukan penyesuaian di Accurate, lalu mengisi nomornya melalui tautan berikut. Satu nomor dapat dipakai untuk beberapa permintaan sekaligus:\n"+g.link+PENUTUP;
  }
  function picEsk(R,g,t,now){
    var it=g.items.filter(function(x){return x.dept===t.dept;});
    var h=it.map(function(x,i){return (i+1)+". "+x.doc+" - "+x.hari+" hari - "+x.pemohon+(x.serah?" (barang sudah diserahkan)":"");}).join("\n");
    return "Selamat "+salam(now)+", "+t.sapaan+" "+t.nama+".\n\nDengan hormat, kami menyampaikan bahwa terdapat "+it.length+" permintaan barang Departemen "+t.dept+" yang Nomor PPBJ-nya belum diinformasikan ke Gudang dan masih menunggu "+g.sapaan+" "+g.nama+" sebagai PIC"+(g.terakhir?" (sudah kami ingatkan pada "+g.terakhir+")":"")+":\n"+h+
      "\n\nMohon bantuan "+t.sapaan+" untuk mengingatkan atau menindaklanjutinya sesuai kewenangan."+PENUTUP;
  }
  return {salam:salam,waktu:waktu,nada:nada,gab:gab,satu:satu,ppbj:ppbj,esk:esk,rekap:rekap,pic:pic,picEsk:picEsk};
})();
if(typeof module!=="undefined")module.exports=PWX;
