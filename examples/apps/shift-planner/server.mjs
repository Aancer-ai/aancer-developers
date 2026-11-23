// Example app server for an AANCER embedded app with sign-in by one-time code (sso.mode "code").
// Node 20+, standard library only. MIT licence. In-memory sessions: for a demo, not for production.
//
// Environment:
//   PLATFORM_ORIGIN  https://aancer.example.com   (your AANCER installation)
//   APP_ID           shift-planner                (the app id from manifest.json)
//   APP_SECRET       the app secret the administrator created in AANCER
//   PORT             8080
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { createHash, randomBytes } from "node:crypto";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const PLATFORM_ORIGIN = process.env.PLATFORM_ORIGIN || "https://aancer.example.com";
const APP_ID = process.env.APP_ID || "shift-planner";
const APP_SECRET = process.env.APP_SECRET || "";
const PORT = Number(process.env.PORT || 8080);
const PUBLIC_DIR = fileURLToPath(new URL("./public/", import.meta.url));

// pkceId -> verifier, and sessionId -> { token, identity, checkedAt }
const verifiers = new Map();
const sessions = new Map();

const basicAuth = "Basic " + Buffer.from(`${APP_ID}:${APP_SECRET}`).toString("base64");

function securityHeaders(contentType) {
  return {
    "Content-Type": contentType,
    "Content-Security-Policy": `frame-ancestors ${PLATFORM_ORIGIN}; default-src 'self'`,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  };
}

function sendJson(res, status, body) {
  res.writeHead(status, securityHeaders("application/json"));
  res.end(JSON.stringify(body));
}

function newPkcePair() {
  const verifier = randomBytes(48).toString("base64url"); // 64 characters
  const challenge = createHash("sha256").update(verifier).digest("base64url"); // 43 characters
  const pkceId = randomBytes(16).toString("hex");
  verifiers.set(pkceId, verifier);
  return { pkceId, challenge };
}

async function readBody(req) {
  let data = "";
  for await (const chunk of req) {
    data += chunk;
    if (data.length > 4096) throw new Error("body too large");
  }
  return data ? JSON.parse(data) : {};
}

async function redeemCode(code, verifier) {
  const res = await fetch(`${PLATFORM_ORIGIN}/api/apps/oauth/token`, {
    method: "POST",
    headers: { Authorization: basicAuth, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", code, code_verifier: verifier }),
  });
  if (!res.ok) throw new Error(`token endpoint answered ${res.status}`);
  return res.json(); // { access_token, token_type, expires_in, scope, session_id }
}

async function introspect(token) {
  const res = await fetch(`${PLATFORM_ORIGIN}/api/apps/introspect`, {
    method: "POST",
    headers: { Authorization: basicAuth, "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) return { active: false };
  return res.json(); // { active, sub, email, name, workspaceId, role, scope, exp, ... }
}

// Check the token again when the cached answer is older than 30 seconds.
async function currentIdentity(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return null;
  if (Date.now() - session.checkedAt > 30_000) {
    const answer = await introspect(session.token);
    if (!answer.active) {
      sessions.delete(sessionId);
      return null;
    }
    session.identity = answer;
    session.checkedAt = Date.now();
  }
  return session.identity;
}

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8" };

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  try {
    // 1. The page asks for a PKCE challenge. The verifier stays on the server.
    if (req.method === "POST" && url.pathname === "/session/pkce") {
      return sendJson(res, 200, newPkcePair());
    }

    // 2. The page sends the one-time code it got from the bridge. The server redeems it.
    if (req.method === "POST" && url.pathname === "/session/redeem") {
      const { pkceId, code } = await readBody(req);
      const verifier = verifiers.get(pkceId);
      verifiers.delete(pkceId);
      if (!verifier || !code) return sendJson(res, 400, { error: "pkceId and code are required" });

      const token = await redeemCode(code, verifier);
      const identity = await introspect(token.access_token);
      if (!identity.active) return sendJson(res, 401, { error: "token is not active" });

      const sessionId = randomBytes(24).toString("hex");
      sessions.set(sessionId, { token: token.access_token, identity, checkedAt: Date.now() });
      return sendJson(res, 200, { sessionId, name: identity.name || null });
    }

    // 3. An app API call. Authorise on the introspected identity, never on the role label alone.
    if (req.method === "GET" && url.pathname === "/api/me") {
      const identity = await currentIdentity(req.headers["x-app-session"]);
      if (!identity) return sendJson(res, 401, { error: "sign in again" });
      return sendJson(res, 200, { sub: identity.sub, name: identity.name, workspaceId: identity.workspaceId });
    }

    // Static files from public/.
    const file = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
    const path = normalize(join(PUBLIC_DIR, file));
    if (!path.startsWith(PUBLIC_DIR)) return sendJson(res, 404, { error: "not found" });
    const body = await readFile(path);
    res.writeHead(200, securityHeaders(MIME[extname(path)] || "application/octet-stream"));
    res.end(body);
  } catch (err) {
    if (err.code === "ENOENT") return sendJson(res, 404, { error: "not found" });
    console.error(err);
    sendJson(res, 500, { error: "internal error" });
  }
}).listen(PORT, () => console.log(`shift-planner app on port ${PORT}, platform ${PLATFORM_ORIGIN}`));
