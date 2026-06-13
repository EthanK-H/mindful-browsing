/* Build a single self-contained HTML by inlining theme.css, sprites.js
   and audio.js into index.html. Run: node build.js  ->  gearbound.html */
const fs = require('fs');
const path = require('path');
const dir = __dirname;

let h = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(dir, 'theme.css'), 'utf8');
const sprites = fs.readFileSync(path.join(dir, 'sprites.js'), 'utf8');
const monArt = fs.readFileSync(path.join(dir, 'monster-art.js'), 'utf8');
const audio = fs.readFileSync(path.join(dir, 'audio.js'), 'utf8');

h = h.replace('<link rel="stylesheet" href="theme.css">', '<style>\n' + css + '\n</style>');
h = h.replace('<script src="sprites.js"></script>', '<script>\n' + sprites + '\n</script>');
h = h.replace('<script src="monster-art.js"></script>', '<script>\n' + monArt + '\n</script>');
h = h.replace('<script src="audio.js"></script>', '<script>\n' + audio + '\n</script>');

if (h.includes('href="theme.css"') || h.includes('src="sprites.js"') ||
    h.includes('src="monster-art.js"') || h.includes('src="audio.js"')) {
  console.error('Inlining failed — placeholders not found.');
  process.exit(1);
}

fs.writeFileSync(path.join(dir, 'gearbound.html'), h);
console.log('Wrote gearbound.html (' + (h.length / 1024 | 0) + ' KB)');
