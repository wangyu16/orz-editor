const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

function checkFile(filename) {
    const filePath = path.resolve(__dirname, '..', filename);
    if (fs.existsSync(filePath)) {
        const config = dotenv.parse(fs.readFileSync(filePath));
        console.log(`Keys in ${filename}:`, Object.keys(config));
    } else {
        console.log(`${filename} not found.`);
    }
}

checkFile('.env.local');
checkFile('.env');
