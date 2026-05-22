/**
 * Patch mqtt-packet to handle Facebook's non-standard MQTT packets.
 * Facebook sends PUBACK/SUBACK packets with non-zero reserved header flag bits
 * which violates the MQTT spec. This patch disables that strict validation.
 */
const fs = require('fs');
const path = require('path');

function findFiles(dir, name, results = []) {
  try {
    for (const item of fs.readdirSync(dir)) {
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
  .filter(f => f.includes(path.join('mqtt-packet', '')));

if (parserFiles.length === 0) {
  console.log('[fix-mqtt] No mqtt-packet/parser.js found, skipping.');
  process.exit(0);
}

let patchedCount = 0;
for (const file of parserFiles) {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  // Method 1: Disable the if-block that checks reserved header bits
  // Pattern: if (fixedHeader & 0x0F) { ... emit error ... return false }
  content = content.replace(
    /if\s*\(\s*(fixedHeader|fixed|flags)\s*&\s*0x0[fF]\s*\)\s*\{[^}]*emit\s*\([^)]*Invalid header flag bits[^)]*\)[^}]*\}/gs,
    '/* [fix-mqtt] skipped strict header flag check for Facebook MQTT compatibility */'
  );

  // Method 2: Directly disable the if-condition (safer, just makes check always false)
  content = content
    .replace(
      /if\s*\(\s*(fixedHeader)\s*&\s*0x0[fF]\s*\)/g,
      'if (false /* fix-mqtt: disabled strict header check */ && ($1 & 0x0F))'
    )
    .replace(
      /if\s*\(\s*(fixed)\s*&\s*0x0[fF]\s*\)/g,
      'if (false /* fix-mqtt: disabled strict header check */ && ($1 & 0x0F))'
    )
    .replace(
      /if\s*\(\s*(flags)\s*&\s*0x0[fF]\s*\)/g,
      'if (false /* fix-mqtt: disabled strict header check */ && ($1 & 0x0F))'
    );

  // Method 3: Target the exact error emit line as last resort
  content = content.replace(
    /(?:parser|this)\.emit\s*\(\s*['"]error['"]\s*,\s*new\s+Error\s*\(\s*['"]Invalid header flag bits[^'"]*['"]\s*\)\s*\)/g,
    '/* [fix-mqtt] suppressed Facebook-incompatible error */'
  );

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('[fix-mqtt] ✅ Patched:', file);
    patchedCount++;
  } else {
    console.log('[fix-mqtt] ⚠️  No match found in:', file);
    // Print relevant lines for debugging
    const lines = content.split('\n');
    const relevant = lines.filter(l => l.includes('flag') || l.includes('0x0F') || l.includes('0x0f') || l.includes('puback'));
    console.log('[fix-mqtt] Relevant lines:', relevant.slice(0, 10).join('\n'));
  }
}

console.log(`[fix-mqtt] Done. Patched ${patchedCount}/${parserFiles.length} files.`);
