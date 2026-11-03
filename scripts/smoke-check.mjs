import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = process.cwd();
const failures = [];
const checked = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if ([".git", "node_modules", ".vercel"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.endsWith(".js")) {
      try { new vm.Script(fs.readFileSync(full, "utf8"), { filename: path.relative(root, full) }); checked.push(path.relative(root, full)); }
      catch (error) { failures.push(`JavaScript syntax: ${path.relative(root, full)} — ${error.message}`); }
    }
  }
}
walk(root);

const htmlFiles = ["index.html", "owner/index.html", "contact/index.html", "project/index.html"];
for (const file of htmlFiles) {
  if (!fs.existsSync(path.join(root, file))) { failures.push(`Missing required page: ${file}`); continue; }
  const html = fs.readFileSync(path.join(root, file), "utf8");
  const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicates.length) failures.push(`Duplicate IDs in ${file}: ${[...new Set(duplicates)].join(", ")}`);
  for (const match of html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)) {
    const src = match[1];
    if (/^(https?:|data:|\/\/)/i.test(src)) continue;
    const local = src.startsWith("/") ? src.slice(1) : path.join(path.dirname(file), src);
    const clean = path.normalize(local.split("?")[0]);
    if (!fs.existsSync(path.join(root, clean))) failures.push(`Missing script ${src} referenced by ${file}`);
  }
}
const required = [
  ["contact.js", "portfolio_inquiries"],
  ["owner/inquiries.js", "client-inquiry-list"],
  ["owner/owner.js", "positionHistory"],
  ["owner/advanced.js", "portfolio_versions"],
  ["analytics.js", "portfolio_analytics"],
  ["script.js", '["https:", "http:"]'],
  ["project/project.js", 'host === "youtube.com" || host.endsWith(".youtube.com")'],
  ["public-effects.js", "prefers-reduced-motion"]
];
for (const [file, marker] of required) {
  const full = path.join(root, file);
  if (!fs.existsSync(full) || !fs.readFileSync(full, "utf8").includes(marker)) failures.push(`Required feature marker missing: ${file} → ${marker}`);
}
console.log(`Checked ${checked.length} JavaScript files and ${htmlFiles.length} HTML pages.`);
if (failures.length) {
  console.error(failures.map(item => "FAIL: " + item).join("\n"));
  process.exit(1);
}
console.log("Portfolio smoke checks passed.");
