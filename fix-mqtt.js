/**
 * Patch mqtt-packet (and bundled mqtt) to handle Facebook's non-standard MQTT packets.
 *
 * Root cause: mqtt-packet v9.0.2 parser.js line ~63:
 *   return this._emitError(new Error(constants.requiredHeaderFlagsErrors[cmdIndex]))
 * 
 * Facebook sends PUBACK/SUBACK packets with non-zero reserved header bits.
 * The spec says these MUST be 0, but Facebook sets them. This patch skips the check.
 */
const fs = require('fs');
const path = require('path');

function findFiles(dir, predicate, results = [], depth = 0) {
  if (depth > 12) return results;
  try {
    for (const item of fs.readdirSync(dir)) {
      const full = path.join(dir, item);
      try {
        const stat = fs.statSync(full);
        if (stat.isDirectory() && item !== '.git' && item !== '.bin') {
          findFiles(full, predicate, results, depth + 1);
        } else if (stat.isFile() && predicate(item, full)) {
          results.push(full);
        }
      } catch (e) {}
    }
  } catch (e) {}
  return results;
}

const nmDir = path.join(__dirname, 'node_modules');

// Find ALL JS files containing "Invalid header flag bits"
console.log('[fix-mqtt] Scanning node_modules for "Invalid header flag bits"...');
const matchingFiles = findFiles(nmDir, (name) => name.endsWith('.js')).filter(f => {
  try { return fs.readFileSync(f, 'utf8').includes('Invalid header flag bits'); } catch (e) { return false; }
});
console.log(`[fix-mqtt] Found ${matchingFiles.length} file(s):`, matchingFiles.map(f => path.relative(nmDir, f)));

let patchedCount = 0;

for (const file of matchingFiles) {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  // ── Pattern A: mqtt-packet v9 style ──
  // return this._emitError(new Error(constants.requiredHeaderFlagsErrors[cmdIndex]))
  content = content.replace(
    /return\s+this\._emitError\s*\(\s*new\s+Error\s*\(\s*constants\.requiredHeaderFlagsErrors\s*\[\s*cmdIndex\s*\]\s*\)\s*\)/g,
    '/* [fix-mqtt] skip non-standard header flag check for Facebook MQTT */'
  );

  // ── Pattern B: any _emitError with "Invalid header flag bits" error ──
  content = content.replace(
    /(?:return\s+)?(?:this\._emitError|parser\._emitError)\s*\(\s*new\s+Error\s*\(\s*['"`]Invalid header flag bits[^'"`]*['"`]\s*\)\s*\)/g,
    '/* [fix-mqtt] skip invalid header flag bits error */'
  );

  // ── Pattern C: emit('error') with "Invalid header flag bits" ──
  content = content.replace(
    /(?:return\s+)?(?:this|parser)\.emit\s*\(\s*['"]error['"]\s*,\s*new\s+Error\s*\(\s*['"`]Invalid header flag bits[^'"`]*['"`]\s*\)\s*\)/g,
    '/* [fix-mqtt] skip invalid header flag bits error */'
  );

  // ── Pattern D: bundled mqtt / minified code - find the check block ──
  // if(t!==e[r]){...emitError...requiredHeaderFlagsErrors...}  or similar
  content = content.replace(
    /if\s*\([^)]*requiredHeaderFlags[^)]*\)\s*\{[^}]*requiredHeaderFlagsErrors[^}]*\}/gs,
    '/* [fix-mqtt] skip required header flags check */'
  );

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('[fix-mqtt] ✅ Patched:', path.relative(nmDir, file));
    patchedCount++;
  } else {
    // Show context for debugging if nothing matched
    const lines = content.split('\n');
    lines.forEach((line, i) => {
      if (line.includes('requiredHeaderFlagsErrors') || line.includes('Invalid header flag')) {
        console.log(`[fix-mqtt] ⚠️ No patch applied — ${path.relative(nmDir, file)} line ${i+1}: ${line.trim().slice(0, 120)}`);
      }
    });
  }
}

console.log(`\n[fix-mqtt] Done. Patched ${patchedCount}/${matchingFiles.length} files.`);
