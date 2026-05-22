/**
 * Fix for Facebook MQTT non-standard PUBACK/SUBACK packets
 * Facebook sends packets with header flag bits set to non-zero values
 * which violates the MQTT spec but is what Facebook uses
 */
const fs = require('fs');
const path = require('path');

function findFiles(dir, name, results = []) {
  try {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const full = path.join(dir, item);
      try {
        const stat = fs.statSync(full);
        if (stat.isDirectory() && item !== '.git' && item !== '.bin') {
          findFiles(full, name, results);
        } else if (item === name) {
          results.push(full);
        }
      } catch (e) {}
    }
  } catch (e) {}
  return results;
}

const parserFiles = findFiles(path.join(__dirname, 'node_modules'), 'parser.js')
  .filter(f => f.includes('mqtt-packet'));

if (parserFiles.length === 0) {
  console.log('[fix-mqtt] No mqtt-packet parser found, skipping.');
  process.exit(0);
}

for (const file of parserFiles) {
  let content = fs.readFileSync(file, 'utf8');

  if (!content.includes('Invalid header flag bits')) {
    console.log('[fix-mqtt] Already patched or different version:', file);
    continue;
  }

  // Remove the strict header flag bits validation for PUBACK/SUBACK/etc
  content = content.replace(
    /if\s*\(fixedHeader\s*&\s*0x0[fF]\)\s*\{[^}]*Invalid header flag bits[^}]*\}/g,
    '/* [patched] Facebook MQTT sends non-zero header flag bits */'
  );

  // Alternative pattern - single line emit
  content = content.replace(
    /parser\.emit\s*\(\s*['"]error['"]\s*,\s*new Error\s*\(['"](Invalid header flag bits)[^)]*\)\s*\)/g,
    '/* [patched] $1 - allowed for Facebook MQTT */'
  );

  fs.writeFileSync(file, content);
  console.log('[fix-mqtt] Patched:', file);
}

console.log('[fix-mqtt] Done.');
