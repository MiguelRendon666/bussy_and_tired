const fs = require('fs'), path = require('path');
const d = __dirname, r = (f) => fs.readFileSync(path.join(d, f), 'utf8');
const core = r('core.js').replace(/\nif \(typeof module[\s\S]*$/, '\n');
const html = `<title>Geometry Dash Web</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lilita+One&display=swap">
<style>
${r('style.css')}
</style>
${r('body.html')}
<script>
${core}
${r('levels.js')}
${r('app1.js')}
${r('render2.js')}
${r('render3.js')}
${r('render4.js')}
${r('app2.js')}
${r('app3.js')}
</script>
`;
fs.writeFileSync(path.join(d, 'geometry-dash.html'), html);
console.log('built', (html.length / 1024).toFixed(1) + ' KB');
