const fs = require("fs");
const path = require("path");

const SRC = "/Users/suhaib/Desktop/hina-tourism/api-server-main/src";

// global var->absolute-file map: scan every .js under a dir, resolve each require relative to its own file
function buildGlobalReqMap(rootDir) {
  const map = {};
  (function walk(d) {
    let ents; try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      if (e.name === "node_modules") continue;
      const fp = path.join(d, e.name);
      if (e.isDirectory()) walk(fp);
      else if (e.name.endsWith(".js")) {
        const t = fs.readFileSync(fp, "utf8");
        for (const m of t.matchAll(/const\s+(\w+)\s*=\s*require\(["'](\.[^"']+)["']\)/g)) {
          let r = path.resolve(path.dirname(fp), m[2]);
          if (!r.endsWith(".js")) r += ".js";
          if (fs.existsSync(r)) map[m[1]] = r; // last writer wins; router vars are ~unique
        }
      }
    }
  })(rootDir);
  return map;
}

// ---- 1. parse mounts using a prebuilt global reqMap
function parseMounts(mountFile, reqMap) {
  const txt = fs.readFileSync(mountFile, "utf8");
  const mounts = [];
  for (const m of txt.matchAll(/router\.use\(\s*["']([^"']+)["']\s*,\s*(\w+)\s*\)/g)) {
    const prefix = m[1], varName = m[2];
    mounts.push({ prefix, file: reqMap[varName] || null, varName });
  }
  return mounts;
}

// ---- 2. extract (method, subpath) from a router file
function extractRoutes(file) {
  if (!fs.existsSync(file)) return [];
  const txt = fs.readFileSync(file, "utf8");
  const routes = [];
  // router.get("/x", ...)  /  router.route("/x").get(...).post(...)
  for (const m of txt.matchAll(/\.(get|post|put|patch|delete)\(\s*["'`]([^"'`]*)["'`]/g)) {
    routes.push({ method: m[1].toUpperCase(), sub: m[2] });
  }
  for (const m of txt.matchAll(/\.route\(\s*["'`]([^"'`]*)["'`]\s*\)((?:\s*\.(?:get|post|put|patch|delete)\([^)]*\))+)/g)) {
    const sub = m[1];
    for (const mm of m[2].matchAll(/\.(get|post|put|patch|delete)\(/g)) {
      routes.push({ method: mm[1].toUpperCase(), sub });
    }
  }
  return routes;
}

function joinPath(...parts) {
  let p = ("/" + parts.join("/")).replace(/\/+/g, "/");
  if (p.length > 1) p = p.replace(/\/$/, "");
  return p;
}

// ---- 3. build endpoint list for a mount group
function buildEndpoints(mountFile, reqMap, apiPrefix) {
  const mounts = parseMounts(mountFile, reqMap);
  const eps = [];
  let unresolved = [];
  for (const { prefix, file, varName } of mounts) {
    if (!file) { unresolved.push(prefix + " (" + varName + ")"); continue; }
    for (const r of extractRoutes(file)) {
      const full = joinPath(apiPrefix, prefix, r.sub).split("?")[0];
      eps.push({ method: r.method, full, prefix, file: path.relative(SRC, file) });
    }
  }
  if (unresolved.length) console.log("[unresolved mounts]", unresolved.join(", "));
  return eps;
}

// ---- 4. load frontend corpus
function loadCorpus(dirs) {
  let corpus = "";
  function walk(d) {
    let ents;
    try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      if (e.name === "node_modules" || e.name === ".git" || e.name === "dist" || e.name === "build") continue;
      const fp = path.join(d, e.name);
      if (e.isDirectory()) walk(fp);
      else if (/\.(js|jsx|ts|tsx)$/.test(e.name)) {
        try { corpus += "\n" + fs.readFileSync(fp, "utf8"); } catch {}
      }
    }
  }
  for (const d of dirs) walk(d);
  return corpus;
}

// ---- 5. match: does corpus contain this path? (params -> wildcard, ignore leading /b2b vs not)
function pathRegex(full, stripRe) {
  // strip the part the frontend baseURL already supplies
  const tail = full.replace(stripRe, "");
  const segs = tail.split("/").filter(Boolean);
  const parts = segs.map(s => {
    if (s.startsWith(":")) return "[^/\"'`]+?"; // a param value (may contain ${ a?b }, spaces)
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  });
  // allow the call to start at any segment boundary; require the static skeleton in order
  return new RegExp(parts.join("/"));
}

function runDiff(label, eps, corpus, stripRe) {
  const seen = new Set(); const uniq = [];
  for (const e of eps) { const k = e.method + " " + e.full; if (!seen.has(k)) { seen.add(k); uniq.push(e); } }
  const unused = [];
  for (const e of uniq) { if (!pathRegex(e.full, stripRe).test(corpus)) unused.push(e); }
  console.log("\n===== " + label + " =====");
  console.log("Total distinct endpoints (method+path):", uniq.length);
  console.log("Endpoints with NO frontend caller:", unused.length, "(" + Math.round(100*unused.length/uniq.length) + "%)");
  const byPrefix = {};
  for (const e of unused) (byPrefix[e.prefix] ||= []).push(e);
  for (const p of Object.keys(byPrefix).sort()) {
    console.log("## mount " + p);
    for (const e of byPrefix[p].sort((a,b)=>a.full.localeCompare(b.full)))
      console.log("  " + e.method.padEnd(7) + e.full + "    [" + e.file + "]");
  }
  return { uniq, unused };
}

// ===================== B2B =====================
const b2bReqMap = buildGlobalReqMap(path.join(SRC, "b2b/routes"));
const b2bEps = buildEndpoints(path.join(SRC, "b2b/index.js"), b2bReqMap, "/api/v1/b2b");
const b2bCorpus = loadCorpus([
  "/Users/suhaib/Desktop/hina-tourism/b2b-front-main/src",
  "/Users/suhaib/Desktop/hina-tourism/b2b-hina-tourism/src",
]);
runDiff("B2B SURFACE (vs b2b-front-main + b2b-hina-tourism)", b2bEps, b2bCorpus, /^\/+api\/v1\/+/);

// ===================== ADMIN =====================
const admReqMap = buildGlobalReqMap(path.join(SRC, "admin/routes"));
const admEps = buildEndpoints(path.join(SRC, "admin/index.js"), admReqMap, "/api/v1/admin");
const admCorpus = loadCorpus(["/Users/suhaib/Desktop/hina-tourism/admin-front-main/src"]);
runDiff("ADMIN SURFACE (vs admin-front-main)", admEps, admCorpus, /^\/+api\/v1\/+admin\/+/);
