import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const contentDir = path.join(projectRoot, "content");
const outDir = path.join(projectRoot, "build");
const outFile = path.join(outDir, "content-map.ts");
const outMetadataFile = path.join(outDir, "content-metadata.ts");
const publicDir = path.join(projectRoot, "public");

const DOC_CANDIDATES = ["README.mdx", "README.md", "index.mdx", "index.md"];
const DOC_EXTS = new Set([".md", ".mdx"]);

const DEFAULT_CATEGORY = "Misc";
const DEFAULT_PLATFORM = "Other";

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

function stripQuotes(value) {
  if (!value) return value;
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseInlineArray(value) {
  const inner = value.trim().slice(1, -1);
  if (!inner.trim()) return [];
  return inner
    .split(",")
    .map((item) => stripQuotes(item))
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseFrontmatter(source) {
  const trimmed = source.trimStart();
  if (!trimmed.startsWith("---")) return { data: {}, body: source };

  const lines = trimmed.split(/\r?\n/);
  if (lines.length < 3) return { data: {}, body: source };

  let endIndex = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i].trim() === "---") {
      endIndex = i;
      break;
    }
  }
  if (endIndex === -1) return { data: {}, body: source };

  const frontmatterLines = lines.slice(1, endIndex);
  const body = lines.slice(endIndex + 1).join("\n");
  const data = {};
  let currentKey = null;

  for (const line of frontmatterLines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    if (trimmedLine.startsWith("- ") && currentKey && Array.isArray(data[currentKey])) {
      data[currentKey].push(stripQuotes(trimmedLine.slice(2)));
      continue;
    }

    const sepIndex = trimmedLine.indexOf(":");
    if (sepIndex === -1) continue;

    const key = trimmedLine.slice(0, sepIndex).trim();
    const rawValue = trimmedLine.slice(sepIndex + 1).trim();
    currentKey = key;

    if (!rawValue) {
      data[key] = [];
      continue;
    }

    if (rawValue.startsWith("[") && rawValue.endsWith("]")) {
      data[key] = parseInlineArray(rawValue);
      continue;
    }

    data[key] = stripQuotes(rawValue);
  }

  return { data, body };
}

function parseFrontmatterExport(source) {
  const match = source.match(/<!--\s*frontmatter:\s*(\{[\s\S]*?\})\s*-->/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch (err) {
    console.warn("Failed to parse frontmatter comment JSON.");
    return null;
  }
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

function platformToSlug(platform) {
  return platform
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9-]/g, "");
}

const entries = [];

const topLevelDirs = fs
  .readdirSync(contentDir, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .filter((name) => !name.startsWith("."));

for (const dir of topLevelDirs) {
  const dirAbs = path.join(contentDir, dir);
  const directEntry = findEntry(dirAbs);

  if (directEntry) {
    entries.push({
      platformFromDir: null,
      slug: dir,
      folderAbs: dirAbs,
      entryAbs: directEntry,
    });
    continue;
  }

  const slugDirs = fs
    .readdirSync(dirAbs, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => !name.startsWith("."));

  for (const slug of slugDirs) {
    const folderAbs = path.join(dirAbs, slug);
    const entryAbs = findEntry(folderAbs);
    if (!entryAbs) continue;
    entries.push({
      platformFromDir: dir,
      slug,
      folderAbs,
      entryAbs,
    });
  }
}

const items = [];
const metadataItems = [];

for (const entry of entries) {
  const { slug, folderAbs, entryAbs, platformFromDir } = entry;

  const source = fs.readFileSync(entryAbs, "utf8");
  const exportFrontmatter = parseFrontmatterExport(source);
  const frontmatter = exportFrontmatter ?? parseFrontmatter(source).data;

  const title = frontmatter.title || slug;
  const date = frontmatter.date || null;
  const platform = frontmatter.platform || platformFromDir || DEFAULT_PLATFORM;
  const platformSlug = platformToSlug(platform);
  const category = frontmatter.category || DEFAULT_CATEGORY;
  const tags = Array.isArray(frontmatter.tags)
    ? frontmatter.tags
    : frontmatter.tags
      ? [frontmatter.tags]
      : [];
  const summary = frontmatter.summary || null;
  const image = frontmatter.image || null;
  const difficulty = frontmatter.difficulty || null;
  const event = frontmatter.event || null;
  const key = `${platformSlug}/${slug}`;

  // 1) Copy assets (everything except md/mdx) into public/<platform>/<slug>/...
  const files = walkFiles(folderAbs);
  for (const abs of files) {
    const ext = path.extname(abs).toLowerCase();
    if (DOC_EXTS.has(ext)) continue; // don't copy docs
    const relFromFolder = path.relative(folderAbs, abs); // e.g. "img/recon.png"
    const destAbs = path.join(publicDir, platformSlug, slug, relFromFolder);
    copyFileSync(abs, destAbs);
  }

  metadataItems.push({
    key,
    slug,
    title,
    date,
    platform,
    platformSlug,
    category,
    tags,
    summary,
    image,
    difficulty,
    event,
  });

  // 2) Generate import path for the entry doc
  // If your tsconfig paths has "@/*": ["./*"] then this works:
  const relFromProject = path.relative(projectRoot, entryAbs); // "content/wonderland/README.md"
  const importPath = `@/${normalizeSlashes(relFromProject)}`;

  items.push({ key, slug, importPath });
}

items.sort((a, b) => a.key.localeCompare(b.key));
metadataItems.sort((a, b) => a.key.localeCompare(b.key));

fs.mkdirSync(outDir, { recursive: true });

const lines = [];
lines.push(`/* Auto-generated. Do not edit. */`);
lines.push(`export const contentLoaders = {`);
for (const it of items) {
  lines.push(`  ${JSON.stringify(it.key)}: () => import(${JSON.stringify(it.importPath)}),`);
}
lines.push(`} as const;`);
lines.push(`export type ContentSlug = keyof typeof contentLoaders;`);
lines.push(`export const contentSlugs = Object.keys(contentLoaders) as ContentSlug[];`);

fs.writeFileSync(outFile, lines.join("\n") + "\n", "utf8");

const metadataLines = [];
metadataLines.push("/* Auto-generated. Do not edit. */");
metadataLines.push("export type ContentMetadata = {");
metadataLines.push("  key: string;");
metadataLines.push("  slug: string;");
metadataLines.push("  title: string;");
metadataLines.push("  date: string | null;");
metadataLines.push("  platform: string;");
metadataLines.push("  platformSlug: string;");
metadataLines.push("  category: string;");
metadataLines.push("  tags: string[];");
metadataLines.push("  summary: string | null;");
metadataLines.push("  image: string | null;");
metadataLines.push("  difficulty: string | null;");
metadataLines.push("  event: string | null;");
metadataLines.push("};");
metadataLines.push("export const contentMetadata: ContentMetadata[] = [");
for (const item of metadataItems) {
  metadataLines.push(`  ${JSON.stringify(item)},`);
}
metadataLines.push("];");
metadataLines.push("export const contentMetadataByKey = Object.fromEntries(");
metadataLines.push("  contentMetadata.map((item) => [item.key, item])");
metadataLines.push(") as Record<string, ContentMetadata>;");
metadataLines.push("export const contentMetadataBySlug = contentMetadata.reduce(");
metadataLines.push("  (acc, item) => {");
metadataLines.push("    acc[item.slug] = acc[item.slug] ?? []; ");
metadataLines.push("    acc[item.slug].push(item);");
metadataLines.push("    return acc;");
metadataLines.push("  },");
metadataLines.push("  {} as Record<string, ContentMetadata[]>\n);");

fs.writeFileSync(outMetadataFile, metadataLines.join("\n") + "\n", "utf8");
console.log(`Generated ${outFile} with ${items.length} entries.`);
console.log(`Generated ${outMetadataFile} with ${metadataItems.length} entries.`);
console.log(`Copied assets into ${path.join("public")} /<platform>/<slug>/...`);
