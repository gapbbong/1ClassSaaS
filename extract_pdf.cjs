const fs = require('fs');
const pdf = require('pdf-parse');

let dataBuffer = fs.readFileSync('src/docs/school_map.pdf');

pdf(dataBuffer).then(function(data) {
    fs.writeFileSync('tmp_pdf_text.txt', data.text);
    console.log("PDF extraction successful. Output saved to tmp_pdf_text.txt");
}).catch(err => {
    console.error("Error extracting PDF:", err);
});
