---
title: REST API and MCP server | AANCER Developers
description: The AANCER REST API for packs, agents, dashboards, hooks and apps, and the MCP server that lets Claude, ChatGPT and others use your agents.
---

## REST API and MCP

AANCER has two programmable surfaces. The **REST API** under `/api` manages everything on these pages: packs, agents, templates, skills, dashboards, hooks and embedded apps. The **MCP server** at `/mcp/v1` lets external AI clients, such as Claude, ChatGPT or your own agent, find and ask AANCER agents and use tools an administrator has approved. AANCER can also act as an MCP client: administrators register external MCP servers and approve their tools one by one, so agents and workflows can use them.

Packs are always created on your machine, signed with the `aancer-pack` CLI, and installed through the REST API or the admin screens. No MCP tool creates, validates or installs a pack.

## Quick start

Import and activate a pack:

```bash
export AANCER=https://aancer.example.com
curl -X POST "$AANCER/api/extensions/packs/import" \
  -H "Authorization: Bearer $TOKEN" \
  --data-binary @acme.business-skills-1.0.0.ancpack

curl -X POST "$AANCER/api/extensions/packs/acme.business-skills/activate" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"version":"1.0.0"}'
```

Ask an AANCER agent over MCP:

```bash
curl -X POST "$AANCER/mcp/v1" \
  -H "Authorization: Bearer $MCP_TOKEN" -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"my-client","version":"1.0"}}}'
```

## REST API basics

- Base address: `https://<your installation>/api`.
- Authentication: the browser session, or a bearer token issued by the identity provider your installation uses for sign-in.
- Bodies are JSON unless stated. Pack import takes the raw `.ancpack` bytes.
- Errors have the shape `{ "error": "<message>", "code": "<CODE>", "details"?: [...] }`. Validation details are `{ itemId?, path, message }` with paths like `/items/<itemId>/spec/<field>`.
- Every call checks the caller's permissions in the workspace. A missing permission returns 403 `{ "error": "Permission denied", "permission": "<name>" }`, without a `code`.

## Endpoint reference

### Packs and extensions

| Method and path | Permission | Body and answer |
|---|---|---|
| `POST /api/extensions/packs/import` | `extensions.manage` | raw `.ancpack` bytes. Add `?activate=1` to activate in the same call. `201` new or `200` known, with `{ packId, version, title, state, signer, items[], parameters[], upgradeFrom, warnings[], certification?, revocation?, keptBehind? }` |
| `POST /api/extensions/packs/{packId}/activate` | `extensions.manage` or `extensions.manage_own` | `{ version, parameters?: { <id>: "<value>" or null } }`. `null` unbinds an optional parameter. Answer `{ packId, activeVersion, previousVersion, objects, warnings? }` |
| `POST /api/extensions/packs/{packId}/rollback` | `extensions.manage` | `{ version }` |
| `POST /api/extensions/packs/{packId}/retire` | `extensions.manage` | |
| `GET /api/extensions/packs` | `extensions.view` | filter with `state`, `kind`, `workspaceId` |
| `GET /api/extensions/packs/{packId}` | `extensions.view` | detail with every version |
| `GET /api/extensions/objects` | `extensions.view` | installed objects; filter with `kind`, `workspaceId`, `state`, `packId` |
| `GET /api/extensions/schemas` | `extensions.view` | supported kinds and schema versions |
| `GET /api/extensions/export-key` | signed in | `{ available }`: whether this installation can sign exports |
| `POST /api/extensions/packs/{packId}/revocation-override` | `extensions.manage` | `{ version, reason }`: keep a withdrawn version running |
| `DELETE /api/extensions/packs/{packId}/revocation-override` | `extensions.manage` | `{ version }`: end that decision |
| `GET /api/extensions/trust-keys` | `extensions.view` | list of trusted keys |
| `POST /api/extensions/trust-keys` | `extensions.manage` | `{ keyId, label?, publicKeyPem }`, answers `201` |
| `DELETE /api/extensions/trust-keys/{keyId}` | `extensions.manage` | answers `204` |
| `POST /api/extensions/packs/scan-dir` | `extensions.manage` | import packs from the server folder |

To test a pack, import it into an EVAL or test installation: import is installation-wide, checks everything and changes nothing until you activate. A pack that contains workflow templates also passes the template permission check on activate and rollback.

### Other areas

| Area | Base path | Details |
|---|---|---|
| Agents | `/api/agents` | [Agents](/developers/agents) |
| Workflow templates | `/api/automations/templates/authored` | [Templates](/developers/templates) |
| Workflows | `/api/automations` | [Templates](/developers/templates) |
| Skills | `/api/skills` | [Skills](/developers/skills) |
| Datasets, models, widgets, dashboards | `/api/models`, `/api/widgets`, `/api/dashboards`, `/api/charts/pin` | [Dashboards](/developers/dashboards) |
| Event hooks | `/api/event-hooks`, `/api/events/catalog` | [Hooks](/developers/hooks) |
| Embedded apps | `/api/apps` | [Embedded apps](/developers/apps) |
| Connectors | `/api/admin/connectors` | [Connectors](/developers/connectors) |
| Themes and branding | `/api/extensions/themes`, `/api/branding` | [Themes](/developers/themes) |

## MCP server

This section is about the MCP server of your own AANCER installation, which gives assistants access to your workspace. For building extensions, use the public AANCER Builder server at `https://aancer.ai/mcp` instead (see [the overview](/developers#connect-the-aancer-builder-mcp-server)).

AANCER speaks the Model Context Protocol over Streamable HTTP, JSON-RPC 2.0, protocol version `2025-06-18`.

- Endpoint: `POST https://<your installation>/mcp/v1`
- Header: `Authorization: Bearer mcp_<64 hex characters>`
- After `initialize`, send the `Mcp-Session-Id` header you received.
- Methods: `initialize`, `notifications/initialized`, `tools/list`, `tools/call`, `resources/list`, `resources/read`.
- `DELETE /mcp/v1` ends the session. `GET /mcp/v1` answers `405`.

### Tools

| Tool | Arguments | What it does |
|---|---|---|
| `find_agent` | `{ query }` | finds agents the token may use |
| `ask_agent` | `{ agent, message, conversationId? }` | runs an agent and returns its answer |
| `list_agent_runs` | `{ agent? }` | lists recent runs |
| approved tools | as approved | external MCP tools that an administrator approved and marked as shareable |

Governance stays in force. When an agent wants to write and the write needs a person's approval, `ask_agent` returns `status: "approval_required"` with an `approvalUrl`. Answers above the workspace's data classification are withheld and only the run id is returned.

Resources: knowledge sets the token may read, as `aancer://kb/<setId>`.

### Tokens

| Token | Who creates it | Call | Scope |
|---|---|---|---|
| Personal | any user with `mcp.tokens_own` in the workspace; the installation needs the licence features `chatSurfaces` and `mcpServerFacade` | `POST /api/me/mcp-tokens { workspaceId, name, expiresInDays }` (`name` required, up to 100 characters; 1 to 365 days, default 90) returns `201 { id, token, expiresAt }` | the agent tools |
| Facade | an administrator with `mcp.facade.issue_token` | `POST /api/admin/mcp/facade/tokens` returns `201 { id, token }` | chosen tools and resources |

The token value is shown once. Store it like a password.

Facade token body:

```json
{
  "displayName": "Claude for the finance team",
  "workspaceId": "ws-finance",
  "allowedOrigins": ["https://claude.ai"],
  "scope": {
    "tools": ["mcp.crm.lookup_account"],
    "resources": ["aancer://kb/ks_policies"]
  },
  "dataClassification": "internal"
}
```

`GET /api/admin/mcp/facade/exposable?workspaceId=ws-finance` lists the tools and resources you can put in `scope`. If you set `allowedOrigins`, browser requests must send a matching `Origin` header. `dataClassification` is `sovereign`, `internal` or `permitted`.

### Connect an MCP client

Most clients take a server address and a header. For example:

```json
{
  "mcpServers": {
    "aancer": {
      "type": "http",
      "url": "https://aancer.example.com/mcp/v1",
      "headers": { "Authorization": "Bearer mcp_0123456789abcdef..." }
    }
  }
}
```

Then ask the client: "Use find_agent to find the invoice agent, then ask it to summarise this week's open invoices."

### AANCER as an MCP client

Administrators register external MCP servers under `/api/admin/mcp/servers` with `{ displayName, endpointUrl, transport: "streamable-http", authMode: "bearer" or "none", credential?, openEgress? }`. The rate limit is not part of the body; a new server starts at 60 calls per minute. They then approve each tool with a data classification ceiling, an approval requirement, the workspaces that may use it and a budget per call. Approved tools appear as `mcp.<serverId>.<toolName>` and can be used in agents and workflows. Network access to the server goes through the installation's allow-list.

## Full example: build, sign, install and use

```bash
# 1. write manifest.json and content/ (see the page for your extension type)
# 2. sign
aancer-pack sign manifest.json content/ -o acme.invoice-desk-1.0.0.ancpack --key acme.key
aancer-pack verify acme.invoice-desk-1.0.0.ancpack --pubkey acme.pub

# 3. import into a test installation and read the summary
curl -s -X POST "$AANCER/api/extensions/packs/import" \
  -H "Authorization: Bearer $TOKEN" --data-binary @acme.invoice-desk-1.0.0.ancpack | jq '.items, .warnings'

# 4. activate
curl -s -X POST "$AANCER/api/extensions/packs/acme.invoice-desk/activate" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"version":"1.0.0","parameters":{"target_workspace":"ws-test","policies":"ks_booking_rules"}}'

# 5. create an agent from the blueprint
curl -s -X POST "$AANCER/api/agents" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"workspaceId":"ws-test","name":"Invoice clerk","blueprintId":"pack:acme.invoice-desk:invoice-clerk"}'
```

## Common errors

| Code | Status | Message | Fix |
|---|---|---|---|
| `PACK_UNSIGNED` | 422 | This pack is not signed (MANIFEST.sig is missing). | Sign with `aancer-pack sign` |
| `PACK_SIGNATURE_INVALID` | 400 | This pack could not be verified, the signature is invalid. | Re-sign after every change |
| `PACK_SIGNER_UNKNOWN` | 422 | This pack was signed by an unknown key (...). | Add the trust key |
| `PACK_SCHEMA_INVALID` | 422 | The pack failed validation: ... | Fix the named path. Also used when the unzipped pack is too large |
| `PACK_TOO_LARGE` | 413 | The pack file is too large. | Applies to the file size only |
| `PACK_REVOKED` | 403 | This pack version was withdrawn by the platform (...). | Install the fixed version named in the message |
| `PACK_LICENCE_REQUIRED` | 403 | This connector pack needs an active licence. | Activate the licence, then import again |
| `PACK_LICENCE_MISMATCH` | 403 | This connector pack was issued for a different licence. | Ask for a pack issued to this installation |
| `PACK_CONTENT_FORBIDDEN` | 422 | The connector archive contains forbidden content: ... | Remove the named files |
| `PACK_PIECE_NAME_TAKEN` | 409 | A connector named ... is already installed on this platform. | Use another package name |
| `EXTENSION_NOT_FOUND` | 404 | ... not found. | Check the pack id or object id |
| `PACK_VERSION_CONFLICT` | 409 | Pack ... is already imported with different content. Bump the version. | Bump the version |
| `PACK_PARAMETER_MISSING` | 422 | Required parameters are missing: ... | Send them on activate |
| `EXTENSION_REFERENCED` | 409 | Other active extensions still reference objects in this pack: ... | Retire dependants first |
| `FORBIDDEN` | 403 | You are not allowed to do that. | Check the permission in the answer |
| (no code) | 403 | Permission denied | The answer names the missing `permission` |
| `VALIDATION` | 400 | version is required | Send `version` on activate |
| MCP | 401 | Authorization: Bearer mcp_… required | Send the `Authorization` header |
| MCP | 401 | Invalid token format — expected mcp_… token | Use an MCP token, not a session or API token |
| MCP | 401 | Invalid or revoked token | Issue a new token |
| `MCP_FACADE_REQUIRES_APPROVAL` | JSON-RPC error | The tool call needs a person's approval before it runs | Approve it in AANCER, then call again |
| MCP | 403 | The MCP Server facade is not included in your current license. | The installation needs the MCP server licence feature |
| MCP | 403 | Origin not in token allow-list | Match `allowedOrigins`, or issue a token without it for server use |
| `INVALID_TOKEN_SCOPE` | 400 on issue, 403 on `/mcp/v1` | scope must be { tools: string[], resources: string[] } | Fix the token body, or use a tool inside the token's scope |

## Limits and editions

- The MCP server and personal MCP tokens need licence features of your installation. Registering external MCP servers is available to administrators with the MCP permissions.
- Pack import and activation are controlled by permissions, with per-type licence features listed on each page.
- Check your edition on [aancer.ai/pricing](https://aancer.ai/pricing).
