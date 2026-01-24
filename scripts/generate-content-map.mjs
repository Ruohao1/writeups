import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const contentDir = path.join(projectRoot, "content");
const outDir = path.join(projectRoot, "build");
const outFile = path.join(outDir, "content-map.ts");
const publicDir = path.join(projectRoot, "public");

const DOC_CANDIDATES = ["README.mdx", "README.md", "index.mdx", "index.md"];
const DOC_EXTS = new Set([".md", ".mdx"]);

function normalizeSlashes(p) {
  return p.replaceAll(path.sep, "/");
}

function walkFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walkFiles(full));
    else out.push(full);
  }
  return out;
}

function copyFileSync(src, dst) {
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}

function findEntry(folderAbs) {
  for (const name of DOC_CANDIDATES) {
    const p = path.join(folderAbs, name);
    if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
  }
  return null;
}

if (!fs.existsSync(contentDir)) {
  console.error(`Content dir not found: ${contentDir}`);
  process.exit(1);
}

// Each top-level dir under content = one slug
const slugDirs = fs
  .readdirSync(contentDir, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

const items = [];

for (const slug of slugDirs) {
  const folderAbs = path.join(contentDir, slug);
  const entryAbs = findEntry(folderAbs);
  if (!entryAbs) continue;

  // 1) Copy assets (everything except md/mdx) into public/<slug>/...
  const files = walkFiles(folderAbs);
  for (const abs of files) {
    const ext = path.extname(abs).toLowerCase();
    if (DOC_EXTS.has(ext)) continue; // don't copy docs
    const relFromFolder = path.relative(folderAbs, abs); // e.g. "img/recon.png"
    const destAbs = path.join(publicDir, slug, relFromFolder);
    copyFileSync(abs, destAbs);
  }

  // 2) Generate import path for the entry doc
  // If your tsconfig paths has "@/*": ["./*"] then this works:
  const relFromProject = path.relative(projectRoot, entryAbs); // "content/wonderland/README.md"
  const importPath = `@/${normalizeSlashes(relFromProject)}`;

  items.push({ slug, importPath });
}

items.sort((a, b) => a.slug.localeCompare(b.slug));

fs.mkdirSync(outDir, { recursive: true });

const lines = [];
lines.push(`/* Auto-generated. Do not edit. */`);
lines.push(`export const contentLoaders = {`);
for (const it of items) {
  lines.push(`  ${JSON.stringify(it.slug)}: () => import(${JSON.stringify(it.importPath)}),`);
}
lines.push(`} as const;`);
lines.push(`export type ContentSlug = keyof typeof contentLoaders;`);
lines.push(`export const contentSlugs = Object.keys(contentLoaders) as ContentSlug[];`);

fs.writeFileSync(outFile, lines.join("\n") + "\n", "utf8");
console.log(`Generated ${outFile} with ${items.length} entries.`);
console.log(`Copied assets into ${path.join("public")} /<slug>/...`);
