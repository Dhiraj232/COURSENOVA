const pdfParseModule = require('pdf-parse');
console.log("pdfParseModule exports:", Object.keys(pdfParseModule));

if (pdfParseModule.PDFParse) {
    const proto = pdfParseModule.PDFParse.prototype;
    console.log("PDFParse prototype methods:", Object.getOwnPropertyNames(proto));
} else {
    console.log("PDFParse is not defined in the module.");
}
