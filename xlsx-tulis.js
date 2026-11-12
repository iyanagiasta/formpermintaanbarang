/* Tambahan 99: penulis .xlsx kecil berbasis JSZip (gaya, gabung sel, logo, daftar pilihan, rumus, area cetak, pindah halaman).
   Dipakai BAST (bast.js). SheetJS versi gratis tidak bisa menyimpan gaya, karena itu file ini ada. Tanpa ketergantungan selain JSZip. */
(function (root) {
  'use strict';
  function xe(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ''); }
  function kol(c) { var s = ''; while (c > 0) { var m = (c - 1) % 26; s = String.fromCharCode(65 + m) + s; c = Math.floor((c - 1) / 26); } return s; }
  function ref(r, c) { return kol(c) + r; }
  function serial(d) { return (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(1899, 11, 30)) / 86400000; }
  function Buku() {
    this.sh = []; this.fonts = ['<font><sz val="10"/><name val="Arial"/></font>']; this.fills = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'];
    this.borders = ['<border><left/><right/><top/><bottom/><diagonal/></border>']; this.fmts = []; this.xfs = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>']; this.peta = {}; this.img = 0;
  }
  function cari(arr, x) { var i = arr.indexOf(x); if (i < 0) { arr.push(x); i = arr.length - 1; } return i; }
  /** gaya: {font:{name,sz,b,i,u,color}, fill:'RRGGBB', border:{l,r,t,b} (true=tipis), al:{h,v,wrap,shrink}, fmt:'#,##0'} */
  Buku.prototype.gaya = function (g) {
    if (!g) return 0; var k = JSON.stringify(g); if (this.peta[k] != null) return this.peta[k];
    var f = g.font || {}, fo = '<font>' + (f.b ? '<b/>' : '') + (f.i ? '<i/>' : '') + (f.u ? '<u/>' : '') + '<sz val="' + (f.sz || 10) + '"/>' + (f.color ? '<color rgb="FF' + f.color + '"/>' : '') + '<name val="' + xe(f.name || 'Arial') + '"/></font>';
    var fi = g.fill ? cari(this.fills, '<fill><patternFill patternType="solid"><fgColor rgb="FF' + g.fill + '"/><bgColor indexed="64"/></patternFill></fill>') : 0;
    var b = g.border || {}, bs = function (n, on) { return on ? '<' + n + ' style="thin"><color indexed="64"/></' + n + '>' : '<' + n + '/>'; };
    var bo = cari(this.borders, '<border>' + bs('left', b.l) + bs('right', b.r) + bs('top', b.t) + bs('bottom', b.b) + '<diagonal/></border>');
    var nf = 0; if (g.fmt) { var j = this.fmts.indexOf(g.fmt); if (j < 0) { this.fmts.push(g.fmt); j = this.fmts.length - 1; } nf = 164 + j; }
    var a = g.al || {}, al = (a.h || a.v || a.wrap || a.shrink) ? '<alignment' + (a.h ? ' horizontal="' + a.h + '"' : '') + ' vertical="' + (a.v || 'center') + '"' + (a.wrap ? ' wrapText="1"' : '') + (a.shrink ? ' shrinkToFit="1"' : '') + '/>' : '';
    var x = '<xf numFmtId="' + nf + '" fontId="' + cari(this.fonts, fo) + '" fillId="' + fi + '" borderId="' + bo + '" xfId="0"' + (nf ? ' applyNumberFormat="1"' : '') + ' applyFont="1"' + (fi ? ' applyFill="1"' : '') + (bo ? ' applyBorder="1"' : '') + (al ? ' applyAlignment="1">' + al + '</xf>' : '/>');
    this.peta[k] = cari(this.xfs, x); return this.peta[k];
  };
  Buku.prototype.sheet = function (nama, opsi) { var s = new Lembar(this, nama, opsi || {}); this.sh.push(s); return s; };
  function Lembar(b, nama, o) { this.b = b; this.nama = String(nama).slice(0, 31); this.o = o; this.sel = {}; this.gab = []; this.lebar = {}; this.tinggi = {}; this.dv = []; this.gbr = []; this.link = []; this.cetak = null; this.pecah = []; this.beku = null; }
  /** nilai: angka | teks | Date | {f:'SUM(A1:A2)'} | null. */
  Lembar.prototype.set = function (r, c, v, g) { var k = r + ':' + c, s = this.b.gaya(g); this.sel[k] = {r: r, c: c, v: v, s: s}; return this; };
  Lembar.prototype.gaya = function (r, c, g) { var k = r + ':' + c, x = this.sel[k]; if (x) x.s = this.b.gaya(g); else this.sel[k] = {r: r, c: c, v: null, s: this.b.gaya(g)}; return this; };
  Lembar.prototype.gabung = function (r1, c1, r2, c2) { this.gab.push(ref(r1, c1) + ':' + ref(r2, c2)); return this; };
  Lembar.prototype.kolom = function (c, w) { this.lebar[c] = w; return this; };
  Lembar.prototype.baris = function (r, h) { this.tinggi[r] = h; return this; };
  Lembar.prototype.pilihan = function (sqref, rumus) { this.dv.push([sqref, rumus]); return this; };
  Lembar.prototype.gambar = function (bytes, r, c, w, h) { this.gbr.push({b: bytes, r: r, c: c, w: w, h: h}); return this; };
  Lembar.prototype.tautan = function (r, c, lokasi) { this.link.push([ref(r, c), lokasi]); return this; };
  Lembar.prototype.atur = function (o) { this.cetak = o; return this; };
  Lembar.prototype.pindah = function (r) { this.pecah.push(r); return this; };
  Lembar.prototype.bekukan = function (r, c) { this.beku = [r, c]; return this; };
  Lembar.prototype.xml = function (idx, drw) {
    var rows = {}, maxR = 1, maxC = 1;
    Object.keys(this.sel).forEach(function (k) { var x = this.sel[k]; (rows[x.r] = rows[x.r] || []).push(x); maxR = Math.max(maxR, x.r); maxC = Math.max(maxC, x.c); }, this);
    Object.keys(this.tinggi).forEach(function (r) { if (!rows[r]) rows[r] = []; });
    var o = this.cetak || {}, sd = '';
    Object.keys(rows).map(Number).sort(function (a, b) { return a - b; }).forEach(function (r) {
      var h = this.tinggi[r]; sd += '<row r="' + r + '"' + (h ? ' ht="' + h + '" customHeight="1"' : '') + '>';
      rows[r].sort(function (a, b) { return a.c - b.c; }).forEach(function (x) {
        var a = ' r="' + ref(x.r, x.c) + '"' + (x.s ? ' s="' + x.s + '"' : ''), v = x.v;
        if (v == null || v === '') sd += '<c' + a + '/>';
        else if (typeof v === 'object' && v.f) sd += '<c' + a + (v.t ? ' t="' + v.t + '"' : '') + '><f>' + xe(String(v.f).replace(/^=/, '')) + '</f></c>';
        else if (v instanceof Date) sd += '<c' + a + '><v>' + serial(v) + '</v></c>';
        else if (typeof v === 'number' && isFinite(v)) sd += '<c' + a + '><v>' + v + '</v></c>';
        else sd += '<c' + a + ' t="inlineStr"><is><t xml:space="preserve">' + xe(v) + '</t></is></c>';
      });
      sd += '</row>';
    }, this);
    var cols = Object.keys(this.lebar).map(Number).sort(function (a, b) { return a - b; }).map(function (c) { return '<col min="' + c + '" max="' + c + '" width="' + this.lebar[c] + '" customWidth="1"/>'; }, this).join('');
    var x = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">';
    x += '<sheetPr>' + (this.o.warna ? '<tabColor rgb="FF' + this.o.warna + '"/>' : '') + (o.fitW ? '<pageSetUpPr fitToPage="1"/>' : '') + '</sheetPr>';
    x += '<dimension ref="A1:' + ref(maxR, maxC) + '"/><sheetViews><sheetView workbookViewId="0"' + (this.o.garis === false ? ' showGridLines="0"' : '') + (idx === 0 ? ' tabSelected="1"' : '') + '>';
    if (this.beku) x += '<pane' + (this.beku[1] > 1 ? ' xSplit="' + (this.beku[1] - 1) + '"' : '') + (this.beku[0] > 1 ? ' ySplit="' + (this.beku[0] - 1) + '"' : '') + ' topLeftCell="' + ref(this.beku[0], this.beku[1]) + '" activePane="bottomLeft" state="frozen"/>';
    x += '</sheetView></sheetViews><sheetFormatPr defaultRowHeight="12.75"/>' + (cols ? '<cols>' + cols + '</cols>' : '') + '<sheetData>' + sd + '</sheetData>';
    if (this.gab.length) x += '<mergeCells count="' + this.gab.length + '">' + this.gab.map(function (m) { return '<mergeCell ref="' + m + '"/>'; }).join('') + '</mergeCells>';
    if (this.dv.length) x += '<dataValidations count="' + this.dv.length + '">' + this.dv.map(function (d) { return '<dataValidation type="list" allowBlank="1" showErrorMessage="0" sqref="' + d[0] + '"><formula1>' + xe(d[1]) + '</formula1></dataValidation>'; }).join('') + '</dataValidations>';
    if (this.link.length) x += '<hyperlinks>' + this.link.map(function (l) { return '<hyperlink ref="' + l[0] + '" location="' + xe(l[1]) + '" display="' + xe(l[1]) + '"/>'; }).join('') + '</hyperlinks>';
    if (o.tengah) x += '<printOptions horizontalCentered="1"/>';
    var mg = o.margin || [0.4, 0.4, 0.6, 0.6];
    x += '<pageMargins left="' + mg[0] + '" right="' + mg[1] + '" top="' + mg[2] + '" bottom="' + mg[3] + '" header="0.3" footer="0.3"/>';
    if (o.fitW || o.kertas) x += '<pageSetup paperSize="' + (o.kertas || 9) + '" orientation="' + (o.lanskap ? 'landscape' : 'portrait') + '"' + (o.fitW ? ' fitToWidth="1" fitToHeight="0"' : '') + '/>';
    if (this.pecah.length) x += '<rowBreaks count="' + this.pecah.length + '" manualBreakCount="' + this.pecah.length + '">' + this.pecah.map(function (r) { return '<brk id="' + r + '" max="16383" man="1"/>'; }).join('') + '</rowBreaks>';
    if (drw) x += '<drawing r:id="rId1"/>';
    return x + '</worksheet>';
  };
  function emu(px) { return Math.round(px * 9525); }
  /** Hasil: Promise<Uint8Array>. JSZip wajib ada (window.JSZip atau argumen). */
  Buku.prototype.simpan = function (JSZip) {
    JSZip = JSZip || root.JSZip; var z = new JSZip(), b = this, ct = [], rels = [], sheetsX = [], dn = [], nImg = 0, nDrw = 0;
    b.sh.forEach(function (s, i) {
      var drw = s.gbr.length > 0;
      z.file('xl/worksheets/sheet' + (i + 1) + '.xml', s.xml(i, drw));
      ct.push('<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>');
      rels.push('<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>');
      sheetsX.push('<sheet name="' + xe(s.nama) + '" sheetId="' + (i + 1) + '"' + (s.o.sembunyi ? ' state="hidden"' : '') + ' r:id="rId' + (i + 1) + '"/>');
      if (s.cetak && s.cetak.area) dn.push('<definedName name="_xlnm.Print_Area" localSheetId="' + i + '">\'' + xe(s.nama.replace(/'/g, "''")) + '\'!' + s.cetak.area.replace(/([A-Z]+)(\d+)/g, '$$$1$$$2') + '</definedName>');
      if (drw) {
        nDrw++; var anc = '', dr = [];
        s.gbr.forEach(function (g, j) {
          nImg++; z.file('xl/media/image' + nImg + '.jpeg', g.b);
          dr.push('<Relationship Id="rId' + (j + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image' + nImg + '.jpeg"/>');
          anc += '<xdr:oneCellAnchor><xdr:from><xdr:col>' + (g.c - 1) + '</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>' + (g.r - 1) + '</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:ext cx="' + emu(g.w) + '" cy="' + emu(g.h) + '"/>' +
            '<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="' + (j + 2) + '" name="Gambar ' + (j + 1) + '"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId' + (j + 1) + '"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>' +
            '<xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + emu(g.w) + '" cy="' + emu(g.h) + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>';
        });
        z.file('xl/drawings/drawing' + nDrw + '.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' + anc + '</xdr:wsDr>');
        z.file('xl/drawings/_rels/drawing' + nDrw + '.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + dr.join('') + '</Relationships>');
        z.file('xl/worksheets/_rels/sheet' + (i + 1) + '.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing' + nDrw + '.xml"/></Relationships>');
        ct.push('<Override PartName="/xl/drawings/drawing' + nDrw + '.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>');
      }
    });
    var nS = b.sh.length;
    rels.push('<Relationship Id="rId' + (nS + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>');
    z.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="jpeg" ContentType="image/jpeg"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' + ct.join('') +
      '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>');
    z.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>');
    z.file('docProps/core.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:creator>Sistem Gudang SCTK</dc:creator></cp:coreProperties>');
    z.file('docProps/app.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Microsoft Excel</Application></Properties>');
    z.file('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + rels.join('') + '</Relationships>');
    z.file('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="0"/></bookViews><sheets>' + sheetsX.join('') + '</sheets>' + (dn.length ? '<definedNames>' + dn.join('') + '</definedNames>' : '') + '<calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>');
    z.file('xl/styles.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      (b.fmts.length ? '<numFmts count="' + b.fmts.length + '">' + b.fmts.map(function (f, i) { return '<numFmt numFmtId="' + (164 + i) + '" formatCode="' + xe(f) + '"/>'; }).join('') + '</numFmts>' : '') +
      '<fonts count="' + b.fonts.length + '">' + b.fonts.join('') + '</fonts><fills count="' + b.fills.length + '">' + b.fills.join('') + '</fills><borders count="' + b.borders.length + '">' + b.borders.join('') + '</borders>' +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="' + b.xfs.length + '">' + b.xfs.join('') + '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>');
    return z.generateAsync({type: 'uint8array', compression: 'DEFLATE'});
  };
  var XT = {buku: function () { return new Buku(); }, kol: kol, ref: ref};
  if (typeof module !== 'undefined' && module.exports) module.exports = XT; else root.XT = XT;
})(typeof window !== 'undefined' ? window : globalThis);
