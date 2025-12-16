const fs = require('fs');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8').toString());

const [major, minor] = pkg.version.split('.');
const prefix = `${major}.${minor}.`;

const now = new Date();
const start = new Date(now.getFullYear(), 0, 0);
const diff = now - start;
const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

const hh = String(now.getHours()).padStart(2, '0');
const mm = String(now.getMinutes()).padStart(2, '0');

const newVersion = `${prefix}${String(dayOfYear).padStart(3, '0')}${hh}${mm}`;

pkg.version = newVersion;
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));

console.log('Version set to: ', newVersion);
