/**
 * Patch mqtt-related files to handle Facebook's non-standard MQTT packets.
 * Facebook sends PUBACK/SUBACK packets with non-zero reserved header flag bits
 * which some MQTT parsers reject. This patch disables that strict validation.
 */
const fs = require('fs');
const path = require('path');

function findFiles(dir, predicate, results = [], depth = 0) {
  if (depth > 10) return results;
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

// Step 1: Find ALL files containing "Invalid header flag bits"
console.log('[fix-mqtt] Searching for "Invalid header flag bits" across all node_modules...');
const allJsFiles = findFiles(nmDir, (name) => name.endsWith('.js'));
const matchingFiles = allJsFiles.filter(f => {
  try {
    return fs.readFileSync(f, 'utf8').includes('Invalid header flag bits');
  } catch (e) { return false; }
});

console.log(`[fix-mqtt] Found ${matchingFiles.length} file(s) with the error string:`);
matchingFiles.forEach(f => console.log(' -', f));

if (matchingFiles.length === 0) {
  console.log('[fix-mqtt] No files found. Searching for related error patterns...');
  // Broaden search
  const broader = allJsFiles.filter(f => {
    try {
      const c = fs.readFileSync(f, 'utf8');
      return c.includes('puback') && (c.includes('flag') || c.includes('0x0F') || c.includes('0x0f'));
    } catch (e) { return false; }
  });
  console.log(`[fix-mqtt] Found ${broader.length} puback+flag file(s):`);
  broader.forEach(f => {
    const content = fs.readFileSync(f, 'utf8');
    const lines = content.split('\n');
    const relevant = lines.filter(l =>
      (l.includes('puback') || l.includes('0x0F') || l.includes('0x0f') || l.includes('flag')) &&
      (l.includes('if') || l.includes('error') || l.includes('Error'))
    );
    console.log('\nFile:', f);
    console.log('Relevant lines:', relevant.slice(0, 15).join('\n'));
  });
  process.exit(0);
}

// Step 2: Show context around "Invalid header flag bits" in each file
for (const file of matchingFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, i) => {
    if (line.includes('Invalid header flag bits')) {
      console.log(`\n[fix-mqtt] Context in ${path.relative(nmDir, file)}:`);
      lines.slice(Math.max(0, i - 5), i + 6).forEach((l, j) => {
        console.log(`  ${i - 5 + j + 1}: ${l}`);
      });
    }
  });
}

// Step 3: Apply the fix
let patchedCount = 0;
for (const file of matchingFiles) {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  // Pattern A: if (...) { this._emitError(...) }  or  { return this._emitError(...) }
  content = content.replace(
    /if\s*\([^)]*\)\s*\{[^}]*_emitError\s*\([^)]*Invalid header flag bits[^)]*\)[^}]*\}/gs,
    '/* [fix-mqtt] skipped for Facebook MQTT */'
  );

  // Pattern B: if (...) { ... emit/throw ... Invalid header flag bits ... }
  content = content.replace(
    /if\s*\([^)]*\)\s*\{[^}]*Invalid header flag bits[^}]*\}/gs,
    '/* [fix-mqtt] skipped for Facebook MQTT */'
  );

  // Pattern C: single-line check + emit
  content = content.replace(
    /\bif\s*\(\s*\w+\s*[&|]\s*0x0[fF]\s*\)\s*\{\s*(?:return\s+)?(?:this\._emitError|parser\.emit|this\.emit)\s*\([^)]*\)\s*;?\s*(?:return\s+\w+;\s*)?\}/g,
    '/* [fix-mqtt] skipped strict header check for Facebook MQTT */'
  );

  // Pattern D: the _emitError call on the same line as the check
  content = content.replace(
    /if\s*\(\s*(\w+)\s*&\s*0x0[fF]\s*\)\s*return\s+(?:this\.)?_emitError\s*\(/g,
    'if (false /* fix-mqtt */ && ($1 & 0x0F)) return /* this._emitError( */'
  );

  // Pattern E: direct check for flags/fixedHeader
  content = content
    .replace(/if\s*\(\s*(fixedHeader|fixed|flags|headerFlags|cmd)\s*&\s*0x0[fF]\s*\)/g,
             'if (false /* fix-mqtt: skip non-zero header bits check */)');

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('[fix-mqtt] ✅ Patched:', file);
    patchedCount++;
  } else {
    console.log('[fix-mqtt] ⚠️  Regex did not match, file unchanged:', file);
    // Print the raw lines with the error string for manual inspection
    const lines = content.split('\n');
    lines.forEach((l, i) => {
      if (l.includes('Invalid header flag bits')) {
        console.log(`  Line ${i + 1}: ${l}`);
        // Print surrounding 3 lines
        for (let k = Math.max(0, i-3); k <= Math.min(lines.length-1, i+3); k++) {
          console.log(`  ${k+1}: ${lines[k]}`);
        }
      }
    });
  }
}

console.log(`\n[fix-mqtt] Done. Patched ${patchedCount}/${matchingFiles.length} files.`);
