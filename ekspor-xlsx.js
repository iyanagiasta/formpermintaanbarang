/* Penulis berkas Excel (.xlsx) minimal untuk Ekspor Data Perusahaan. Tanpa pustaka tambahan selain JSZip.
   Teks ditulis sebagai inlineStr (tidak pernah dianggap rumus), angka sebagai angka, baris judul tebal + dibekukan + penyaring. */
(function (g) {
  "use strict";
  var BAD = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g;
  function esc(s) { return String(s).replace(BAD, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function kol(i) { var s = ""; i++; while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }
  function namaSheet(n, dipakai) {
    var b = String(n || "Sheet").replace(/[\[\]\:\*\?\/\\]/g, "-").replace(/^'+|'+$/g, "").slice(0, 31) || "Sheet", c = b, i = 2;
    while (dipakai[c.toLowerCase()]) { var suf = "~" + i++; c = b.slice(0, 31 - suf.length) + suf; }
    dipakai[c.toLowerCase()] = 1; return c;
  }
  function Sheet(nama) { this.nama = nama; this.potong = []; this.n = 0; this.lebar = []; this.maxKol = 0; }
  Sheet.prototype.tambah = function (rows) {
    var out = [], self = this;
    rows.forEach(function (r) {
      var rn = ++self.n, hdr = rn === 1, cs = [];
      if (r.length > self.maxKol) self.maxKol = r.length;
      for (var j = 0; j < r.length; j++) {
        var v = r[j], ref = kol(j) + rn, st = hdr ? ' s="1"' : "";
        if (v === "" || v == null) { if (hdr) cs.push('<c r="' + ref + '"' + st + "/>"); continue; }
        if (typeof v === "number" && isFinite(v)) cs.push('<c r="' + ref + '"' + st + "><v>" + v + "</v></c>");
        else if (typeof v === "boolean") cs.push('<c r="' + ref + '" t="b"' + st + "><v>" + (v ? 1 : 0) + "</v></c>");
        else cs.push('<c r="' + ref + '" t="inlineStr"' + st + '><is><t xml:space="preserve">' + esc(v) + "</t></is></c>");
        if (rn <= 200) { var L = Math.min(String(v).split("\n")[0].length, 60); if (!(self.lebar[j] >= L)) self.lebar[j] = L; }
      }
      out.push('<row r="' + rn + '">' + cs.join("") + "</row>");
    });
    this.potong.push(out.join(""));
  };
  Sheet.prototype.xml = function () {
    var cols = "";
    if (this.maxKol) { cols = "<cols>"; for (var j = 0; j < this.maxKol; j++) cols += '<col min="' + (j + 1) + '" max="' + (j + 1) + '" width="' + Math.max(8, Math.min(60, (this.lebar[j] || 6) + 2)) + '" customWidth="1"/>'; cols += "</cols>"; }
    var af = this.n > 1 && this.maxKol ? '<autoFilter ref="A1:' + kol(this.maxKol - 1) + this.n + '"/>' : "";
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' + cols + "<sheetData>" + this.potong.join("") + "</sheetData>" + af + "</worksheet>";
  };
  function Buku(JSZip) { this.JSZip = JSZip; this.sheets = []; this.dipakai = {}; }
  Buku.prototype.sheet = function (nama) { var s = new Sheet(namaSheet(nama, this.dipakai)); this.sheets.push(s); return s; };
  /** Hasil: Uint8Array berkas .xlsx */
  Buku.prototype.hasil = function () {
    var z = new this.JSZip(), n = this.sheets.length || 1;
    if (!this.sheets.length) this.sheet("Kosong");
    n = this.sheets.length;
    var ct = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>';
    var wb = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>';
    var rel = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">';
    this.sheets.forEach(function (s, i) {
      var k = i + 1;
      ct += '<Override PartName="/xl/worksheets/sheet' + k + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
      wb += '<sheet name="' + esc(s.nama).replace(/"/g, "&quot;") + '" sheetId="' + k + '" r:id="rId' + k + '"/>';
      rel += '<Relationship Id="rId' + k + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + k + '.xml"/>';
      z.file("xl/worksheets/sheet" + k + ".xml", s.xml());
    });
    rel += '<Relationship Id="rId' + (n + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
    z.file("[Content_Types].xml", ct + "</Types>");
    z.file("_rels/.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
    z.file("xl/workbook.xml", wb + "</sheets></workbook>");
    z.file("xl/_rels/workbook.xml.rels", rel);
    z.file("xl/styles.xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDCE9F5"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>');
    return z.generateAsync({type: "uint8array", compression: "DEFLATE"});
  };
  g.EKSX = {Buku: Buku, kol: kol};
  if (typeof module !== "undefined") module.exports = g.EKSX;
})(typeof window !== "undefined" ? window : globalThis);
