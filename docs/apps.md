---
title: Embedded apps | AANCER Developers
description: Add your own web application inside AANCER: the app manifest, single sign-on by one-time code, the bridge protocol, sandbox, navigation and approval.
---

## Embedded apps

An embedded app is a web application that you host yourself, on its own https origin, and that AANCER shows inside its own interface. Customers and partners use it to bring their own tools into AANCER: a shift planner, an order board, a quality checklist, an internal form. The app appears as an entry in the **Dashboards** navigation (and, if you like, as a card on Home), so people reach it next to their dashboards, agents and workflows.

AANCER shows the app in a sandboxed `<iframe>` and talks to it through a `postMessage` protocol called the **bridge** (`aancer-bridge/2`). Through the bridge the app can learn who the user is, read and write named datasets, query a BI model, move the user to another page and show a short notice. Each of these is a **capability**: it works only if the manifest declares it, an administrator approves it, and the user's own permissions in that workspace allow it.

AANCER can also sign the user in to your app without sending any platform token to the browser. The frame gets a one-time code that is valid for 60 seconds. Only your server, holding the app secret and a PKCE verifier, can exchange it for a short-lived token, which it checks against an introspection endpoint.

You ship the app as one `app` item in a signed pack. None of your code runs on the AANCER platform.

## Quick start

1. Host your app at its own origin, for example `https://planner.example.com`. It must not be the same origin as AANCER.
2. Send this header on the embedded page, with your AANCER address:

   ```text
   Content-Security-Policy: frame-ancestors https://aancer.example.com
   ```

3. Write the pack manifest:

   ```json
   {
     "v": 2,
     "kind": "bundle",
     "id": "acme.shift-board",
     "version": "1.0.0",
     "title": "Shift board",
     "publisher": { "name": "Acme Example Ltd", "keyId": "pub-0123456789ab" },
     "requires": { "platform": ">=1.0.0" },
     "parameters": [ { "id": "target_workspace", "type": "workspace", "label": "Workspace", "required": true } ],
     "items": [
       {
         "kind": "app",
         "schemaVersion": 2,
         "id": "shift-board",
         "scope": "workspace",
         "workspace": "{{param.target_workspace}}",
         "spec": {
           "id": "shift-board",
           "title": "Shift board",
           "icon": "Table",
           "group": "Operations",
           "order": 31,
           "url": "https://planner.example.com/board.html",
           "origin": "https://planner.example.com",
           "sso": { "mode": "none" },
           "capabilities": ["read:dataset:shift_plan"],
           "egress": { "hosts": [] },
           "embed": { "sandbox": ["allow-scripts", "allow-same-origin"] }
         }
       }
     ]
   }
   ```

4. In the page, say hello to the shell and read the dataset:

   ```js
   const PLATFORM = 'https://aancer.example.com';
   const bridge = await AancerBridge.connect({ platformOrigin: PLATFORM });
   const result = await bridge.call('read:dataset', { datasetId: 'shift_plan', limit: 100 });
   render(result.rows);
   ```

   `AancerBridge` is the small helper `bridge.js` from the examples repository (MIT licence). You can also write the messages yourself; see Bridge protocol below.

5. Sign the pack, import and activate it, then approve the app under **Manage app**. The app appears in the Dashboards navigation of that workspace.

## File layout

The pack carries only the manifest. Your app is a normal web application on your own server.

```text
acme-shift-planner/                # the pack
  manifest.json                    # one item of kind "app" (spec inline, or $ref to content/app.json)

shift-planner-app/                 # your app, deployed at https://planner.example.com
  server.mjs                       # serves the pages, redeems the sign-in code, checks tokens
  public/
    index.html                     # the embedded page
    app.js                         # your app logic
    bridge.js                      # bridge helper (frame side)
```

## Field reference

JSON Schema: [app.schema.json](https://aancer.ai/dev/schemas/app.schema.json). `$defs/link` and `$defs/card` cover navigation links and Home cards.

### App item

| Field | Type | Required | Rules |
|---|---|---|---|
| `kind` | string | yes | `"app"` |
| `schemaVersion` | integer | yes | `2` |
| `id` | string | yes | `^[a-z0-9][a-z0-9._-]{0,63}$`. Keep it equal to `spec.id` |
| `scope` | string | no | `workspace` (the app shows in one workspace) or `install` (every workspace). Default `install` |
| `workspace` | string | if scope is `workspace` | a workspace id or `{{param.<id>}}` |
| `spec` | object | yes | the app spec, inline or `{"$ref": "content/app.json"}` |

### App spec

| Field | Type | Required | Rules |
|---|---|---|---|
| `id` | string | yes | `^[a-z0-9][a-z0-9._-]{0,63}$`. Approvals, the app secret and network rules are keyed by it. One active pack per app id |
| `title` | string | yes | 1 to 80 characters. The navigation label and frame title |
| `icon` | string | no | at most 40 characters, an icon name such as `Clock`, `Table` or `Calendar` |
| `group` | string | no | at most 40 characters. The heading the app is listed under in the navigation |
| `order` | integer | no | 0 or more, default 100. Sorting is by group, order, then title |
| `url` | string | yes | https only, 9 to 2048 characters. No user or password, no `#fragment`. The only placeholder is `{{workspace}}` |
| `origin` | string | yes | exactly the origin of `url`: scheme, host and port, no trailing slash |
| `sso` | object | yes | `{ "mode": "code" or "none", "scopes"?: ["profile", "workspace"] }` |
| `capabilities` | string[] | yes | up to 20, unique. See Capabilities. `[]` is valid |
| `egress` | object | no | `{ "hosts": [...] }`: up to 20 extra hosts, `api.example.com` or `*.example.com`. Never `*` |
| `embed` | object | no | `{ "sandbox": [...] }`: up to 5 of `allow-scripts`, `allow-forms`, `allow-same-origin`, `allow-popups`, `allow-downloads` |

No other fields are allowed.

`url` rules in detail:

- `{{workspace}}` is replaced by the URL-encoded workspace id, but only if the `workspace` identity scope is approved. Otherwise it becomes an empty string.
- The host must not be a loopback, link-local or cloud metadata address. An IP address as host needs the operator to allow private origins; use a DNS name.
- The app origin must differ from the AANCER origin. Use a separate host name such as `planner.example.com`.

### Sign-in modes and scopes

| `sso.mode` | What happens | Default scopes |
|---|---|---|
| `code` | the frame receives a one-time code; your server redeems it and gets the user's identity | `profile`, `workspace` |
| `none` | no sign-in; the app uses the bridge only | none |

| Scope | Gives your app |
|---|---|
| `profile` | user id (`sub`), e-mail, display name |
| `workspace` | workspace id and the user's role label |

The role is a label for display. Do not use it to decide what a user may do. The bridge already applies the user's real permissions.

### Capabilities

| Capability | Lets the app | User permission needed in the workspace |
|---|---|---|
| `read:me` | read the user's identity (within the approved scopes) | none |
| `read:dataset:<id>` | read rows of dataset `<id>` | `datasets.view_own` |
| `write:dataset:<id>` | append or upsert rows in dataset `<id>` | `datasets.write_own` |
| `query:model:<id>` | run a query on BI model `<id>` | `dashboards.view_own` |
| `navigate` | move the user to another AANCER page | none |
| `notify` | show a short notice in AANCER | none |

Dataset ids in capabilities match `[a-z][a-z0-9_]{0,63}` (no dashes). Model ids match `[a-z][a-z0-9_.-]{0,63}`.

A capability works in a session only if it is declared in the manifest, approved by an administrator, and granted when the session starts.

### Sandbox

The frame is `<iframe src="<url>" sandbox="..." referrerpolicy="no-referrer" allow="">`. The default sandbox is `["allow-scripts", "allow-forms", "allow-same-origin"]`. Keep `allow-scripts` and `allow-same-origin`, or the bridge cannot work. Top-level navigation and modal dialogs are never allowed. Add `allow-popups` if your app opens links in a new tab, and `allow-downloads` if it offers file downloads.

## Your server's headers

The embedded page must allow AANCER to frame it:

```text
Content-Security-Policy: frame-ancestors https://aancer.example.com
```

- Accepted sources: the exact AANCER origin, its host, `*.example.com` or `https://*.example.com` matching the AANCER host, or `*`. `'none'` refuses.
- Do not send `X-Frame-Options: DENY` or `SAMEORIGIN`.
- AANCER checks this header when the app is activated and when it opens, with a HEAD request (GET as fallback).

If the check fails because the header is missing or does not allow AANCER, an approved app opens in a new browser tab at its own URL instead of the frame. The bridge does not exist there. If the app cannot be reached, the user sees a retry card.

We also recommend `default-src 'self'`, `Cache-Control: no-store`, `X-Content-Type-Options: nosniff` and `Referrer-Policy: no-referrer`.

## Bridge protocol

The bridge is `postMessage` between your page (the frame) and the AANCER shell (the parent window).

Rules for your page:

- Post to `window.parent` with the exact AANCER origin as `targetOrigin`. Never `*`.
- Accept a message only when `event.origin` is the AANCER origin and `event.source === window.parent`.
- Every message is an object with `v: 1` and a string `id` that you choose. Answers carry the same `id`.
- Send `hello` within 10 seconds of loading, or the shell shows a "no hello" note.

### Messages

| Direction | Message | Answer |
|---|---|---|
| app to shell | `{ v: 1, id, type: "hello", protocol: "aancer-bridge/2", codeChallenge? }` | `{ v: 1, id, type: "hello-ack", protocol, nonce, capabilities, user, sso }` |
| | | `{ type: "hello-nack", code: "BRIDGE_PROTOCOL_MISMATCH", expected }` when the protocol does not match |
| app to shell | `{ v: 1, id, type: "call", nonce, op, args }` | `{ v: 1, id, type: "result", ok: true, data }` or `{ v: 1, id, type: "result", ok: false, code }` |
| shell to app | `{ v: 1, id, type: "session", state: "revoked", reason }` | none |

The `nonce` from `hello-ack` goes into every `call`.

In `hello-ack`:

- `capabilities`: the capabilities granted to this session.
- `user`: `{ displayName, locale }` with the `profile` scope, otherwise `{ locale }`. For display only.
- `sso`: `{ mode: "code", code, expiresIn }` when you sent a `codeChallenge`; `{ mode: "code" }` when you did not; `{ mode: "code", error }` on a problem; `{ mode: "none" }` for apps without sign-in.

### Operations

| `op` | `args` | `data` | Capability |
|---|---|---|---|
| `read:me` | none | with `profile`: `sub`, `email`, `name`; with `workspace`: `workspaceId`, `role` | `read:me` |
| `read:dataset` | `{ datasetId, limit?, cursor? }`. `limit` default 200, max 500 | `{ rows, nextCursor, total }` | `read:dataset:<id>` |
| `write:dataset` | `{ datasetId, mode, rows }`. `mode` is `append` or `upsert`; `rows` is a non-empty array | `{ written, datasetId }` | `write:dataset:<id>` |
| `query:model` | `{ modelId, query? }`. `query` is a model query (see [Dashboards](/developers/dashboards)) | the query result | `query:model:<id>` |
| `navigate` | `{ path }`, matching `^/[a-z0-9\-/]*$`, for example `/dashboards/sales-overview` | `null` | `navigate` |
| `notify` | `{ text }`, cut to 200 characters and prefixed with the app title | `null` | `notify` |
| `authorize` | `{ codeChallenge }` | `{ code, expiresIn }` | `sso.mode: "code"` |

Writes go through the same path as a workflow Publish step: column checks, quotas, and the `dataset.rows.published` event. So a hook can react to rows your app writes.

### A minimal bridge client

```js
// bridge-min.js: hello plus one call, no dependencies
function connect(platformOrigin, codeChallenge) {
  const pending = new Map();
  let nonce = null;
  window.addEventListener('message', (event) => {
    if (event.origin !== platformOrigin || event.source !== window.parent) return;
    const msg = event.data;
    if (!msg || msg.v !== 1) return;
    if (msg.type === 'session' && msg.state === 'revoked') { onEnd(msg.reason); return; }
    const p = pending.get(msg.id);
    if (p) { pending.delete(msg.id); p(msg); }
  });
  function send(msg) {
    return new Promise((resolve) => {
      pending.set(msg.id, resolve);
      window.parent.postMessage(msg, platformOrigin);
    });
  }
  const newId = () => crypto.randomUUID();
  return send({ v: 1, id: newId(), type: 'hello', protocol: 'aancer-bridge/2', codeChallenge })
    .then((ack) => {
      if (ack.type !== 'hello-ack') throw new Error(ack.code || 'HELLO_REFUSED');
      nonce = ack.nonce;
      return {
        capabilities: ack.capabilities, user: ack.user, sso: ack.sso,
        call: (op, args) => send({ v: 1, id: newId(), type: 'call', nonce, op, args })
          .then((r) => { if (!r.ok) throw new Error(r.code); return r.data; }),
      };
    });
}
function onEnd(reason) { document.body.textContent = 'Session ended: ' + reason; }
```

## Sign-in by one-time code

Use `sso.mode: "code"` when your app has its own server and needs to know who the user is. The flow is OAuth 2.0 authorization code with PKCE (S256).

```text
your server            your page (frame)            AANCER shell            AANCER API
    | 1 PKCE pair            |                            |                        |
    |-- challenge ---------->|                            |                        |
    |                        |-- hello + codeChallenge -->|                        |
    |                        |<-- hello-ack (sso.code) ---|                        |
    |<-- code ---------------|                            |                        |
    |-- 3 POST /api/apps/oauth/token (Basic appId:secret, code, verifier) -------->|
    |<-- access_token (5 minutes) -------------------------------------------------|
    |-- 4 POST /api/apps/introspect (Basic appId:secret, token) ------------------>|
    |<-- active, sub, email, name, workspaceId, role ------------------------------|
```

### 1. Make a PKCE pair on your server

The verifier is 43 to 128 characters of `[A-Za-z0-9._~-]`. The challenge is base64url(sha256(verifier)), exactly 43 characters. Keep the verifier on the server. Send only the challenge to the page.

```js
import { randomBytes, createHash } from 'node:crypto';
const verifier = randomBytes(32).toString('base64url');                       // 43 characters
const challenge = createHash('sha256').update(verifier).digest('base64url');  // 43 characters
```

### 2. Get the code in the page

Send `hello` with `codeChallenge`. The `hello-ack` carries `sso.code`. The code is valid for 60 seconds and works once. Post it to your own server.

### 3. Redeem the code on your server

```http
POST https://aancer.example.com/api/apps/oauth/token
Authorization: Basic base64(<app id>:<app secret>)
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&code=<code>&code_verifier=<verifier>
```

JSON bodies are also accepted. The body must be under 4 kB. Answer:

```json
{ "access_token": "...", "token_type": "Bearer", "expires_in": 300, "scope": "profile workspace", "session_id": "..." }
```

### 4. Check the token on every request

```http
POST https://aancer.example.com/api/apps/introspect
Authorization: Basic base64(<app id>:<app secret>)
Content-Type: application/json

{ "token": "<access_token>" }
```

Answer when valid:

```json
{ "active": true, "token_type": "Bearer", "client_id": "shift-planner", "aud": "shift-planner",
  "sub": "u_123", "email": "jane@example.com", "name": "Jane Doe", "workspaceId": "ws-ops", "role": "Member",
  "scope": "profile workspace", "scopes": ["profile", "workspace"], "sid": "...", "appId": "shift-planner",
  "exp": 1763640000, "iat": 1763639700 }
```

Otherwise `{ "active": false }`. You may cache a positive answer for up to 30 seconds. A token becomes inactive after logout, a password change, a change of the user's access, a withdrawn approval, a retired or updated pack, or when the AANCER tab is closed.

### 5. Renew

When introspection says inactive and the user is still in the frame, make a new PKCE pair and call `authorize` through the bridge with the new challenge. Redeem the new code. Do not reuse a code: a second redemption ends the user's app session.

### Server example (Node.js, no dependencies)

```js
// server.mjs (excerpt): redeem the code and read the user
const PLATFORM = process.env.PLATFORM_ORIGIN;          // https://aancer.example.com
const APP_ID = process.env.APP_ID;                     // shift-planner
const APP_SECRET = process.env.APP_SECRET;             // from "Create app secret"
const basic = 'Basic ' + Buffer.from(`${APP_ID}:${APP_SECRET}`).toString('base64');

async function redeem(code, verifier) {
  const res = await fetch(`${PLATFORM}/api/apps/oauth/token`, {
    method: 'POST',
    headers: { Authorization: basic, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, code_verifier: verifier }),
  });
  if (!res.ok) throw new Error(`token ${res.status}`);
  return res.json();                                   // { access_token, expires_in, ... }
}

async function introspect(token) {
  const res = await fetch(`${PLATFORM}/api/apps/introspect`, {
    method: 'POST',
    headers: { Authorization: basic, 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  return res.json();                                   // { active, sub, email, name, ... }
}
```

The full server, with sessions and the required headers, is in the examples repository under `examples/apps/shift-planner`.

### Session end

The shell sends `{ type: "session", state: "revoked", reason }` when the app session ends. Reasons: `logout`, `membership_changed`, `access_changed`, `retired`, `withdrawn`, `approval_withdrawn`, `app_updated`, `code_replayed`, `password_changed`, `password_reset`, `not_licensed`. Clear your own session and show a short message.

## Full examples

### App with sign-in, for one workspace

```json
{
  "v": 2,
  "kind": "bundle",
  "id": "acme.shift-planner",
  "version": "2.0.0",
  "title": "Shift planner",
  "publisher": { "name": "Acme Example Ltd", "keyId": "pub-0123456789ab" },
  "requires": { "platform": ">=1.0.0" },
  "parameters": [ { "id": "target_workspace", "type": "workspace", "label": "Workspace", "required": true } ],
  "items": [
    {
      "kind": "app",
      "schemaVersion": 2,
      "id": "shift-planner",
      "scope": "workspace",
      "workspace": "{{param.target_workspace}}",
      "spec": {
        "id": "shift-planner",
        "title": "Shift planner",
        "icon": "Clock",
        "group": "Operations",
        "order": 30,
        "url": "https://planner.example.com/?ws={{workspace}}",
        "origin": "https://planner.example.com",
        "sso": { "mode": "code", "scopes": ["profile", "workspace"] },
        "capabilities": ["read:me", "read:dataset:shift_plan", "write:dataset:shift_requests", "navigate", "notify"],
        "egress": { "hosts": [] },
        "embed": { "sandbox": ["allow-scripts", "allow-forms", "allow-same-origin"] }
      }
    }
  ]
}
```

### App for every workspace, with a Home card and a navigation link

```json
{
  "v": 2, "kind": "bundle", "id": "acme.ops-apps", "version": "1.0.0", "title": "Operations apps",
  "publisher": { "name": "Acme Example Ltd", "keyId": "pub-0123456789ab" },
  "requires": { "platform": ">=1.0.0" },
  "items": [
    { "kind": "app", "schemaVersion": 2, "id": "shift-planner", "scope": "install",
      "spec": { "id": "shift-planner", "title": "Shift planner", "icon": "Clock", "group": "Operations", "order": 30,
        "url": "https://planner.example.com/embed?ws={{workspace}}", "origin": "https://planner.example.com",
        "sso": { "mode": "code", "scopes": ["profile", "workspace"] },
        "capabilities": ["read:me", "read:dataset:shift_plan", "navigate", "notify"],
        "egress": { "hosts": [] },
        "embed": { "sandbox": ["allow-scripts", "allow-forms", "allow-same-origin"] } } },
    { "kind": "card", "schemaVersion": 1, "id": "shift-card", "scope": "install",
      "spec": { "id": "shift-card", "title": "Shift planner", "body": "Plan next week's shifts.", "href": "app:shift-planner", "icon": "Clock", "order": 10 } },
    { "kind": "link", "schemaVersion": 1, "id": "hr-intranet", "scope": "install",
      "spec": { "id": "hr-intranet", "label": "HR intranet", "url": "https://intranet.example.com/hr", "group": "Operations", "order": 90, "openIn": "new-tab" } }
  ]
}
```

`link` fields: `id`, `label` (1 to 80), `url` (https), `icon`, `group` (40), `order`, `openIn` (`new-tab` only). `card` fields: `id`, `title` (1 to 80), `body` (1 to 280, plain text, no `<` or `>`), `href` (`app:<id>`, `dashboard:<id>` or an https URL), `icon`, `group`, `order`. Home shows up to 6 cards.

### Writing rows from the app

```js
const bridge = await AancerBridge.connect({ platformOrigin: PLATFORM });
await bridge.call('write:dataset', {
  datasetId: 'shift_requests',
  mode: 'append',
  rows: [{ employee: 'u_123', date: '2026-12-01', shift: 'early', note: 'Swap with late shift' }],
});
await bridge.call('notify', { text: 'Your request was sent.' });
await bridge.call('navigate', { path: '/dashboards/shift-overview' });
```

The dataset `shift_requests` must exist in the workspace with matching columns. Ship it in the same pack as a `dataset` item (see [Dashboards](/developers/dashboards)).

## Where the app shows

- **Navigation**: under **Dashboards**, in the group named by `group`, sorted by `order` and then title. The page address is `/dashboards/app/<id>`.
- **Home**: through a `card` item with `"href": "app:<id>"`.
- A workspace-scoped app shows only in its workspace. An install-scoped app shows in every workspace.
- Users need the permission "Open embedded apps" (`apps.view_own`).

## Install and approve

### In the UI

1. **Platform Settings > Extensions > Trust keys > Add trust key**, once per publisher.
2. **Import pack**, then **Activate**, and pick the workspace.
3. Open the pack and choose **Manage app**, then **Approve**. The administrator sees and approves the origin, every capability and the identity scopes.
4. **Create app secret**. It is shown once. Give it to the person who runs your app server, for example as the `APP_SECRET` environment variable.
5. Users open the app from the Dashboards navigation.

The activation also runs the frame check. A warning `APP_EMBED_REFUSED` means your `frame-ancestors` header is missing or wrong.

### With the REST API

| Step | Call | Permission |
|---|---|---|
| Add trust key | `POST /api/extensions/trust-keys {keyId, label, publicKeyPem}` | `extensions.manage` |
| Import | `POST /api/extensions/packs/import` (raw bytes) | `extensions.manage` |
| Activate | `POST /api/extensions/packs/{packId}/activate {version, parameters: {target_workspace: "ws-ops"}}` | `extensions.manage` or `extensions.manage_own` |
| List apps | `GET /api/apps?workspaceId=ws-ops` | `apps.view_own` |
| Approve | `POST /api/apps/{id}/approve {workspaceId?, origins: [origin], capabilities: [...], scopes: [...]}` | `apps.manage_own` in the workspace, or `extensions.manage` for install-scoped apps |
| Create or rotate the secret | `POST /api/apps/{id}/introspect-secret/rotate` returns `201 {secret, previousValidUntil}` | same as approve |
| End the previous secret now | `POST /api/apps/{id}/introspect-secret/previous/end` | same |
| Withdraw approval | `POST /api/apps/{id}/approval/withdraw` | same |
| Run the frame check again | `POST /api/apps/{id}/embed-check/run` | same |
| Allow or remove an extra host | `POST /api/apps/{id}/egress/approve {host}`, `DELETE /api/apps/{id}/egress/{host}` | same |

After a rotation the previous secret stays valid for one hour by default, so you can update your server without downtime.

### Updates

Bump the pack `version`. A new origin, a new capability or a new identity scope must be approved again. Fewer or equal requests need no new approval. Open sessions of the old version end with `app_updated`. Retiring the pack removes approvals, the secret and network rules; a later pack with the same app id starts unapproved.

### Testing

Import and activate the pack in an EVAL or test workspace. Open the app, then check: the frame loads (header correct), `hello-ack` arrives (origin correct), each `call` returns `ok: true` (capability approved and user permission present). For sign-in apps, check that your server gets `active: true` from introspection.

## Common errors

Import and manifest errors (path `/items/<itemId>/spec/...`):

| Message | Fix |
|---|---|
| https only (`APP_URL_INVALID`) | Use https |
| origin must equal the URL origin (`APP_URL_INVALID`) | Set `origin` to scheme, host and port of `url`, no trailing slash |
| the app origin must differ from this platform's own address (`APP_URL_INVALID`) | Host the app on its own host name |
| the host is hard-blocked (loopback, link-local or metadata) (`APP_URL_INVALID`) | Use a real DNS name |
| placeholder {{x}} is not allowed (only {{workspace}}) (`APP_URL_INVALID`) | Only `{{workspace}}` |
| credentials in the URL are not allowed / fragments are not allowed | Remove `user:pass@` and `#...` |
| unknown capability '...' (`APP_CAPABILITY_UNKNOWN`) | Use the capability list. Dataset ids have no dashes |
| a bare wildcard is not allowed (`APP_EGRESS_WILDCARD`) | `api.example.com` or `*.example.com` |
| sandbox token '...' is not allowed | Only the five tokens listed |
| must have required property 'sso' | Add `sso` |
| warning `APP_WORKSPACE_PLACEHOLDER_EMPTY` | Add `"workspace"` to `sso.scopes`, or drop `{{workspace}}` from the URL |
| `APP_ID_TAKEN`: The app id '...' is already used by the active pack '...' | Retire that pack, or use another app id |

Runtime errors:

| Code | Message | Fix |
|---|---|---|
| `FEATURE_NOT_LICENSED` | Embedded apps are not included in the licence of this installation. | The installation needs the Embedded apps licence feature |
| `APP_NOT_FOUND` | App '...' is not active in this workspace. | Activate the pack for this workspace |
| `APP_ORIGIN_UNAPPROVED`, `APP_CAPABILITIES_CHANGED` | App '...' has changes an administrator must approve first. | Approve under Manage app |
| `APP_SECRET_MISSING` | App '...' has no app secret yet. | Create the app secret |
| `APP_EMBED_REFUSED` | The app has not allowed this platform to embed it (frame-ancestors). | Fix the header, remove `X-Frame-Options` |
| `APP_SESSION_INVALID` | The app session is not valid. | Reopen the app |
| `APP_PKCE_REQUIRED` | A PKCE challenge is required: a codeChallenge of 43 base64url characters. | Send an S256 challenge |
| `APP_AUTHORIZE_RATE_LIMITED` | Too many sign-in codes were requested for this app session. | Renew only when introspection says inactive |
| `CAPABILITY_NOT_DECLARED` | The app did not declare '...'. | Declare it and ship a new version |
| `CAPABILITY_FORBIDDEN` | '...' is not approved for this app session. / Your seat lacks ... in this workspace. | Approve it, or give the user the permission |
| `APP_WRITE_MODE_INVALID` | Apps may only append or upsert. | Use `append` or `upsert` |
| `APP_WRITE_ROWS_INVALID` | rows must be a non-empty array. | |
| `NAVIGATE_REFUSED` | | Use an AANCER path such as `/dashboards/...` |
| `BRIDGE_UNAVAILABLE` | | AANCER could not be reached; retry |
| token `invalid_client` (401) | Client authentication failed: send HTTP Basic with the app id and the app secret. | Check `APP_ID` and `APP_SECRET` |
| token `invalid_grant` (400) | The code is not valid (unknown, expired, already used, or not issued for this app and verifier). | Get a new code through `authorize` |
| token `invalid_request` (400) | code and code_verifier are required; the verifier is 43 to 128 unreserved characters. | |
| token `unsupported_grant_type` (400) | Only grant_type=authorization_code is supported. | |

## Limits and editions

- Up to 20 capabilities and 20 extra hosts per app. The sign-in code lives 60 seconds; tokens live 5 minutes by default.
- Embedded apps need the Embedded apps licence feature. Without it, apps do not show and their calls are refused.
- Users need `apps.view_own`. Approving needs `apps.manage_own`, or `extensions.manage` for install-scoped apps.
- Check your edition on [aancer.ai/pricing](https://aancer.ai/pricing).
