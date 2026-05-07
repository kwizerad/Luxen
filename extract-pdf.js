const fs = require('fs');
const pdf = require('pdf-parse');

const pdfPath = "IBIBAZO BY'AMATEGEKO Y'UMUHANDA.pdf";
const dataBuffer = fs.readFileSync(pdfPath);

pdf(dataBuffer).then(data => {
    console.log('Total pages:', data.numpages);
    console.log('\n--- FULL TEXT ---\n');
    console.log(data.text);
}).catch(err => {
    console.error('Error:', err);
});
