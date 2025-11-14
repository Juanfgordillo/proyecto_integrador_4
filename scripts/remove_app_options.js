const fs = require('fs');
const p = 'c:/Users/juanf/Documents/proyecto_integrador_4/server.js';
let s = fs.readFileSync(p, 'utf8');
const oldBlock = `// 2. Manejar preflight OPTIONS - CORREGIDO\napp.options('*', (req, res) => {\n  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');\n  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');\n  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');\n  res.header('Access-Control-Allow-Credentials', 'true');\n  res.sendStatus(200);\n});\n`;
if (s.includes(oldBlock)) {
  s = s.replace(oldBlock, "// Preflight handled by cors middleware (removed manual app.options block)\n");
  fs.writeFileSync(p, s, 'utf8');
  console.log('Replaced old app.options block');
} else {
  console.log('Old block not found; attempting generic remove of app.options(*)');
  s = s.replace(/app\.options\([^\)]*\)\s*=>\s*\{[\s\S]*?\}\s*;\n/, '// Removed app.options(*) block\n');
  fs.writeFileSync(p, s, 'utf8');
  console.log('Attempted generic removal');
}
