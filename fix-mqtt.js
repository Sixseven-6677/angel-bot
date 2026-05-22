/**
 * Patch mqtt-packet and bundled mqtt to handle Facebook's non-standard MQTT packets.
 *
 * Root cause identified in mqtt-packet v9.0.2 parser.js ~line 63:
 *   return this._emitError(new Error(constants.requiredHeaderFlagsErrors[cmdIndex]))
 *
 * This is inside a check that validates MQTT fixed header flag bits.
 * Facebook sends PUBACK/SUBACK packets with non-zero reserved header bits (violates spec).
 * This patch removes the error so the parser can continue processing these packets.
 *
 * The error string "Invalid header flag bits" is defined in constants.js and
 * referenced via constants.requiredHeaderFlagsErrors[cmdIndex] in parser.js —
 * so a simple grep for the string won't find the actual throw in parser.js.
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

// ── Target 1: mqtt-packet/parser.js (uses variable reference, not string literal) ──
const parserJsPath = path.join(nmDir, 'mqtt-packet', 'parser.js');
if (fs.existsSync(parserJsPath)) {
  let content = fs.readFileSync(parserJsPath, 'utf8');
  const original = content;

  // Fix 1: Remove the strict header flags check (line 61-64)
  // Facebook sends PUBACK/SUBACK with non-zero reserved header bits
  content = content.replace(
    /return\s+this\._emitError\s*\(\s*new\s+Error\s*\(\s*constants\.requiredHeaderFlagsErrors\s*\[\s*cmdIndex\s*\]\s*\)\s*\)/g,
    '/* [fix-mqtt] skipped requiredHeaderFlags check for Facebook MQTT compatibility */'
  );

  // Fix 2: Replace the "Not supported" default case with a silent skip
  // Facebook sends proprietary/reserved packet types (cmd type 0 = 'reserved')
  // Instead of emitting an error, just ignore unknown packet types
  content = content.replace(
    /(\s*default:\s*\n\s*)this\._emitError\s*\(\s*new\s+Error\s*\(\s*['"]Not supported['"]\s*\)\s*\)/g,
    '$1/* [fix-mqtt] silently ignore unknown/proprietary packet types from Facebook MQTT */'
  );

  if (content !== original) {
    fs.writeFileSync(parserJsPath, content);
    const fixes = [];
    if (content.includes('skipped requiredHeaderFlags')) fixes.push('header-flags');
    if (content.includes('silently ignore unknown')) fixes.push('not-supported');
    console.log('[fix-mqtt] ✅ Patched mqtt-packet/parser.js:', fixes.join(', '));
  } else {
    const lines = content.split('\n');
    console.log('[fix-mqtt] ⚠️  Regex did not match mqtt-packet/parser.js. Lines 55-145:');
    lines.slice(54, 145).forEach((l, i) => console.log(`  ${i+55}: ${l}`));
  }
} else {
  console.log('[fix-mqtt] ⚠️  mqtt-packet/parser.js not found');
}

// ── Target 2: ALL files containing "Invalid header flag bits" as a string literal ──
// (bundled mqtt dist files: mqtt.js, mqtt.esm.js, mqtt.min.js)
console.log('\n[fix-mqtt] Scanning for bundled "Invalid header flag bits" string...');
const allJsFiles = findFiles(nmDir, (name) => name.endsWith('.js')).filter(f => {
  try { return fs.readFileSync(f, 'utf8').includes('Invalid header flag bits'); } catch (e) { return false; }
});
console.log(`[fix-mqtt] Found ${allJsFiles.length} bundled file(s):`, allJsFiles.map(f => path.relative(nmDir, f)));

for (const file of allJsFiles) {
  // Skip test files and constants definition files
  if (file.includes('test.js') || file.includes('constants.js')) {
    console.log('[fix-mqtt] Skipping:', path.relative(nmDir, file));
    continue;
  }

  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  // Pattern A: variable-based error using constants reference
  content = content.replace(
    /return\s+this\._emitError\s*\(\s*new\s+Error\s*\(\s*constants\.requiredHeaderFlagsErrors\s*\[\s*cmdIndex\s*\]\s*\)\s*\)/g,
    '/* [fix-mqtt] skip */'
  );

  // Pattern B: direct string error emit (for bundled files that inline the string)
  content = content.replace(
    /(?:return\s+)?(?:this\._emitError|parser\._emitError)\s*\(\s*new\s+Error\s*\(\s*["'`]Invalid header flag bits[^"'`]*["'`]\s*\)\s*\)/g,
    '/* [fix-mqtt] skip invalid header flag bits */'
  );

  // Pattern C: minified form - find the pattern around "Invalid header flag bits"
  // Minified: might look like: return n._emitError(new Error("Invalid header flag bits..."))
  content = content.replace(
    /[a-zA-Z_$](?:\.[a-zA-Z_$]+)?\._emitError\(new Error\("Invalid header flag bits[^"]*"\)\)/g,
    '/* [fix-mqtt] skip */'
  );

  // Pattern D: minified with variable reference - any _emitError with requiredHeaderFlagsErrors
  content = content.replace(
    /[a-zA-Z_$](?:\.[a-zA-Z_$]+)?\._emitError\(new Error\([a-zA-Z_$][a-zA-Z0-9_$]*\.requiredHeaderFlagsErrors\[[a-zA-Z_$][a-zA-Z0-9_$]*\]\)\)/g,
    '/* [fix-mqtt] skip */'
  );

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('[fix-mqtt] ✅ Patched:', path.relative(nmDir, file));
  } else {
    // For debugging: show lines containing "Invalid header flag"
    const lines = content.split('\n');
    lines.forEach((line, i) => {
      if (line.includes('Invalid header flag')) {
        const snippet = line.substring(Math.max(0, line.indexOf('Invalid header flag') - 50), line.indexOf('Invalid header flag') + 100);
        console.log(`[fix-mqtt] ⚠️  ${path.relative(nmDir, file)} line ${i+1}: ...${snippet}...`);
      }
    });
  }
}

console.log('\n[fix-mqtt] Done.');
