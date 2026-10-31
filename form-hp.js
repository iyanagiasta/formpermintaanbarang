/* Tampilan HP untuk Form Permintaan dan Form Pengembalian.
   Tidak mengubah data: kartu adalah baris tabel yang sama. Hanya menambah tombol +/-, ringkasan baris, lampu stok, dan bilah bawah.
   Aktif bila layar <= 700 px. Dimatikan sementara saat membuat PDF (body.cap) supaya hasil PDF/cetak tetap sama. */
(function () {
  var d = document, B = d.body, rows = d.getElementById("rows");
  if (!rows) return;
  var mq = window.matchMedia ? window.matchMedia("(max-width:700px)") : { matches: false };
  var cetak = /[?&]m=cetak/.test(location.search);
  function pasangHp() { B.classList.toggle("hp", !!mq.matches && !cetak); }
  pasangHp();
  if (mq.addEventListener) mq.addEventListener("change", pasangHp); else if (mq.addListener) mq.addListener(pasangHp);

  function num(v) { var n = parseFloat(String(v == null ? "" : v).replace(",", ".")); return isNaN(n) ? 0 : n; }
  function fm(n) { return String(Math.round(n * 100) / 100).replace(".", ","); }
  function q(tr, s) { return tr.querySelector(s); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* lampu stok dibaca dari info stok yang sudah dibuat oleh renderStok */
  function lampu(tr) {
    var box = q(tr, ".stinfo");
    if (!box || !box.firstChild) return "";
    if (box.querySelector(".stbad")) return "merah";
    if (box.querySelector(".stw")) return "kuning";
    if (box.querySelector(".stok")) return "hijau";
    var ada = false;
    box.querySelectorAll("span").forEach(function (s) { if (!s.classList.contains("z")) ada = true; });
    return ada ? "hijau" : "merah";
  }
  var TEKS = { hijau: "Stok cukup", kuning: "Stok terbatas", merah: "Stok kurang / tidak ada" };
  function lengkap(tr) {
    var n = q(tr, ".nama").value.trim(), j = num(q(tr, ".jml").value);
    return !!n && j > 0 && !!(q(tr, ".kode").value.trim() || q(tr, ".sat").value.trim() || tr.classList.contains("baru") === false);
  }
  function ringkas(tr) {
    var lp = lampu(tr);
    if (lp) tr.setAttribute("data-lampu", lp); else tr.removeAttribute("data-lampu");
    var r = q(tr, ".hp-ring"); if (!r) return;
    var n = q(tr, ".nama").value.trim(), j = q(tr, ".jml").value.trim(), s = q(tr, ".sat").value.trim();
    r.querySelector("b").textContent = n || "(barang kosong)";
    r.querySelector("span").textContent = (j ? j + " " + s : "jumlah belum diisi") + (lp ? "  ·  " + TEKS[lp] : "");
  }
  function hitung() {
    var n = 0, pertama = null;
    rows.querySelectorAll("tr").forEach(function (tr) {
      if (q(tr, ".nama").value.trim()) { n++; tr.classList.remove("kosong"); return; }
      /* di HP hanya satu kartu kosong yang ditampilkan (yang pertama); yang lain disembunyikan di layar, tetap ada untuk PDF */
      if (!pertama || tr.contains(d.activeElement)) { if (pertama && !pertama.contains(d.activeElement)) pertama.classList.add("kosong"); pertama = tr; tr.classList.remove("kosong"); }
      else tr.classList.add("kosong");
    });
    var t = d.getElementById("hpjum"); if (t) t.innerHTML = "<b>" + n + " barang</b>";
  }
  function tingkatkan(tr) {
    if (tr.__hp) return; tr.__hp = 1;
    var jml = q(tr, ".jml"), td = jml && jml.parentNode;
    if (td) {
      var m = d.createElement("button"); m.type = "button"; m.className = "stp nop"; m.textContent = "−"; m.setAttribute("aria-label", "Kurangi jumlah");
      var p = d.createElement("button"); p.type = "button"; p.className = "stp nop"; p.textContent = "+"; p.setAttribute("aria-label", "Tambah jumlah");
      td.insertBefore(m, jml); td.appendChild(p);
      function ubah(dl) {
        var v = Math.max(0, num(jml.value) + dl);
        jml.value = v ? fm(v) : "";
        jml.dispatchEvent(new Event("input", { bubbles: true }));
        jml.dispatchEvent(new Event("change", { bubbles: true }));
      }
      m.addEventListener("click", function () { ubah(-1); });
      p.addEventListener("click", function () { ubah(1); });
    }
    var rg = d.createElement("td"); rg.className = "nop hp-ring";
    rg.innerHTML = '<button type="button"><b></b><span></span></button>';
    tr.appendChild(rg);
    rg.firstChild.addEventListener("click", function () { tr.classList.remove("lipat"); var nm = q(tr, ".nama"); tr.__tahan = Date.now() + 700; function fk() { try { nm.focus(); } catch (e) {} } fk(); setTimeout(fk, 30); setTimeout(fk, 120); });
    var box = q(tr, ".stinfo");
    if (box && window.MutationObserver) new MutationObserver(function () { ringkas(tr); }).observe(box, { childList: true, subtree: true, characterData: true });
    ringkas(tr);
  }
  function semua() { rows.querySelectorAll("tr").forEach(tingkatkan); hitung(); }
  if (window.MutationObserver) new MutationObserver(semua).observe(rows, { childList: true });
  semua();

  /* ringkasan diperbarui saat mengetik; kartu terisi dilipat saat fokus pindah */
  rows.addEventListener("input", function (e) { var tr = e.target.closest && e.target.closest("tr"); if (tr) { tr.classList.remove("lipat"); tr.__tahan = Date.now() + 900; ringkas(tr); hitung(); } });
  rows.addEventListener("change", function (e) { var tr = e.target.closest && e.target.closest("tr"); if (tr) { ringkas(tr); hitung(); } });
  rows.addEventListener("focusin", function (e) { var tr = e.target.closest && e.target.closest("tr"); if (tr && !e.target.closest(".hp-ring")) tr.classList.remove("lipat"); });
  function cobaLipat(tr) {
    if (!B.classList.contains("hp") || !tr.parentNode || tr.contains(d.activeElement)) return;
    var sisa = (tr.__tahan || 0) - Date.now();
    if (sisa > 0) { setTimeout(function () { cobaLipat(tr); }, sisa + 30); return; }
    var dd = d.querySelector(".dd"); if (dd && dd.style.display === "block" && dd._owner && tr.contains(dd._owner)) return;
    ringkas(tr); if (lengkap(tr)) tr.classList.add("lipat");
  }
  rows.addEventListener("focusout", function (e) {
    var tr = e.target.closest && e.target.closest("tr"); if (!tr) return;
    setTimeout(function () { cobaLipat(tr); }, 220);
  });
  /* pilihan dari daftar saran: setelah nama terpilih, geser ke kartu agar daftar tidak tertutup keyboard */
  rows.addEventListener("focusin", function (e) {
    if (!B.classList.contains("hp") || !e.target.classList || !e.target.classList.contains("nama")) return;
    var tr = e.target.closest("tr");
    setTimeout(function () { try { var y = tr.getBoundingClientRect().top + window.pageYOffset - 70; window.scrollTo({ top: y < 0 ? 0 : y, behavior: "smooth" }); } catch (x) {} }, 120);
  });

  /* bilah bawah: jumlah barang, tambah, scan, kirim */
  var bar = d.createElement("div"); bar.id = "hpbar";
  var adaScan = typeof window.scanBuka === "function";
  bar.innerHTML = '<div class="hn" id="hpjum"></div><button type="button" id="hpadd">+ Barang</button>' + (adaScan ? '<button type="button" id="hpscan" aria-label="Scan barang">&#128247; Scan</button>' : "") + '<button type="button" class="pr" id="hpkirim">Kirim</button>';
  B.appendChild(bar);
  d.getElementById("hpadd").onclick = function () {
    var tr = null, rs0 = rows.querySelectorAll("tr");
    for (var i = 0; i < rs0.length; i++) { if (!q(rs0[i], ".nama").value.trim()) { tr = rs0[i]; break; } }
    if (!tr) { window.addRow(); var rs = rows.querySelectorAll("tr"); tr = rs[rs.length - 1]; hitung(); }
    setTimeout(function () { try { q(tr, ".nama").focus(); } catch (e) {} }, 60);
  };
  if (adaScan) d.getElementById("hpscan").onclick = function () { window.scanBuka(); };
  var send = d.getElementById("sendBtn"), hk = d.getElementById("hpkirim");
  hk.onclick = function () { if (send) send.click(); else if (window.kirim) window.kirim(); };
  function sinkKirim() { if (!send) return; hk.disabled = send.disabled; hk.textContent = send.disabled ? "Mengirim..." : "Kirim"; }
  if (send && window.MutationObserver) new MutationObserver(sinkKirim).observe(send, { attributes: true, childList: true, characterData: true, subtree: true });
  /* bilah bawah disembunyikan saat keyboard terbuka (isian aktif) */
  d.addEventListener("focusin", function (e) { var t = e.target; if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) B.classList.add("ketik"); });
  d.addEventListener("focusout", function () { setTimeout(function () { var a = d.activeElement; if (!(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))) B.classList.remove("ketik"); }, 120); });
  setInterval(function () { if (B.classList.contains("hp")) { rows.querySelectorAll("tr").forEach(ringkas); hitung(); } }, 1200);
  hitung();
})();
