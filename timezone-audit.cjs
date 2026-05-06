const fs = require("fs");
const path = require("path");

const TARGET_DIRS = ["src"];

const PATTERNS = [
  { name: "new Date()", regex: /new Date\(\)/g },
  { name: "new Date(value)", regex: /new Date\([^)]+\)/g },
  { name: "toLocaleString", regex: /\.toLocaleString\(/g },
  { name: "toLocaleTimeString", regex: /\.toLocaleTimeString\(/g },
  { name: "getTimezoneOffset", regex: /getTimezoneOffset\(/g },
  { name: "Date.parse", regex: /Date\.parse\(/g },
  { name: "toISOString", regex: /\.toISOString\(/g },
  { name: "Intl.DateTimeFormat", regex: /Intl\.DateTimeFormat/g },
  { name: "getHours/getMinutes", regex: /\.(getHours|getMinutes|getSeconds)\(/g },
];

const ALLOWED_EXT = [".ts", ".tsx", ".js", ".jsx"];

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const issues = [];

  PATTERNS.forEach((pattern) => {
    const matches = [];
    lines.forEach((line, idx) => {
      const lineMatches = line.match(pattern.regex);
      if (lineMatches) {
        matches.push({ line: idx + 1, content: line.trim().substring(0, 120) });
      }
    });
    if (matches.length > 0) {
      issues.push({ type: pattern.name, matches });
    }
  });

  if (issues.length > 0) {
    console.log(`\n🚨 FILE: ${filePath}`);
    issues.forEach((i) => {
      console.log(`   ❌ ${i.type} → ${i.matches.length} occurrences`);
      i.matches.forEach((m) => {
        console.log(`      L${m.line}: ${m.content}`);
      });
    });
  }
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const fullPath = path.join(dir, file);
    if (file === "node_modules" || file === "dist" || file === ".git") return;
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath);
    } else if (ALLOWED_EXT.includes(path.extname(fullPath))) {
      scanFile(fullPath);
    }
  });
}

console.log("\n🧪 TIMEZONE AUDIT STARTED...\n");
TARGET_DIRS.forEach((dir) => {
  if (fs.existsSync(dir)) walk(dir);
});
console.log("\n✅ AUDIT COMPLETE");
