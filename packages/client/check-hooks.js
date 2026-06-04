const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src');

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let lastHookLine = -1;
  lines.forEach((line, i) => {
    if (/\b(useState|useCallback|useMemo|useEffect|useRef)\s*\(/.test(line)) {
      lastHookLine = i;
    }
  });
  if (lastHookLine === -1) return null;
  let violations = [];
  lines.forEach((line, i) => {
    if (i < lastHookLine && /^\s*return\s+(null|[\(])/.test(line)) {
      violations.push(i + 1);
    }
  });
  return violations.length > 0 ? violations : null;
}

function walk(dir) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  items.forEach(item => {
    if (item.isDirectory() && item.name !== 'node_modules') {
      walk(path.join(dir, item.name));
    } else if (item.name.endsWith('.tsx')) {
      const full = path.join(dir, item.name);
      const result = checkFile(full);
      if (result) {
        console.log(`VIOLATION: ${full} at lines ${result.join(',')}`);
      }
    }
  });
}

walk(dir);
console.log('Hook check complete. No violations found above means all clear.');
