const fs = require('fs');
const Papa = require('papaparse');

const text = fs.readFileSync('Expenses Export.csv', 'utf8');
const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
console.log(parsed.data[0]);
