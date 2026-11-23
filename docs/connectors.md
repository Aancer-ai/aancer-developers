---
title: Connectors | AANCER Developers
description: Build an AANCER connector: the TypeScript piece, pack.json, the connector item spec, network egress rules, and certification by AANCER.
---

## Connectors

A connector is an integration with one external system: a set of actions and triggers that workflows, agents, chat tools and knowledge sources call. AANCER offers 750+ connectors. Most of them come from the connector library that ships with each release, and an administrator installs them from the catalog with one click and no restart.

You can build your own connector for a system that is not covered, such as an in-house ERP or a regional service. A connector is written in TypeScript with the AANCER connector framework (`@aancer/connector-framework`, which ships with the aancer-pack connector kit). It reaches an installation as a signed **connector pack**: a pack with exactly one `connector` item, whose built code sits in `content/piece.tar`.

Connector code runs inside AANCER, so the rules are stricter than for other packs. **Connector packs are signed by AANCER through certification.** Partners build and test the connector, then submit it. AANCER reviews it, builds the archive and signs the pack. A pack signed with any other key is refused.

Outbound network access is denied by default. A connector can reach only the hosts it declares, and only after an administrator clicks **Enable**.

## Quick start

A connector with one action that echoes its input.

`package.json`:

```json
{
  "name": "@aancer/piece-example-echo",
  "version": "0.1.0",
  "main": "./dist/src/index.js",
  "dependencies": {
    "@aancer/connector-framework": "*"
  }
}
```

`src/index.ts`:

```ts
import { createAction, createPiece, PieceAuth, Property } from '@aancer/connector-framework';

const echo = createAction({
  name: 'echo',
  displayName: 'Echo',
  description: 'Returns the text you send.',
  props: {
    text: Property.ShortText({ displayName: 'Text', required: true }),
  },
  async run({ propsValue }) {
    return { text: propsValue.text };
  },
});

export const exampleEcho = createPiece({
  displayName: 'Example echo',
  auth: PieceAuth.None(),
  minimumSupportedRelease: '0.82.0',
  logoUrl: 'https://cdn.example.com/echo.png',
  authors: ['acme'],
  actions: [echo],
  triggers: [],
});
```

`pack.json`:

```json
{
  "displayName": "Example echo",
  "description": "Echoes its input back. Useful to test connector install.",
  "category": "Developer",
  "egressHosts": []
}
```

Submit these files for certification. The result is a signed connector pack that any AANCER installation accepts.

## File layout

What you write:

```text
example-echo/
  package.json         # name @aancer/piece-<name>, version x.y.z, main ./dist/src/index.js
  package-lock.json    # locked runtime dependencies
  pack.json            # pack metadata, see below
  tsconfig.json
  src/
    index.ts           # createPiece(...) export
    lib/*.ts           # actions and triggers
  test/*.ts
```

What the certified pack contains:

```text
conn.example-echo-0.1.0.ancpack
  MANIFEST.json        # pack manifest with one connector item
  MANIFEST.sig         # AANCER platform signature
  content/piece.tar    # the built connector: dist/, a cleaned package.json, runtime node_modules/
```

## Field reference

JSON Schema: [connector.schema.json](https://aancer.ai/dev/schemas/connector.schema.json) (the connector item spec)

### pack.json

| Field | Type | Required | Rules |
|---|---|---|---|
| `displayName` | string | yes | 1 to 80 characters. The name in the catalog |
| `title` | string | no | pack title. Default `<displayName> connector` |
| `description` | string | no | at most 300 characters. Default: the `package.json` description |
| `category` | string | no | `AI`, `Comms`, `Commerce`, `Core`, `Business`, `Finance`, `Productivity`, `Content`, `Developer`, `Support`, `Forms`, `HR`, `Payments`, `Marketing`, `Sales`, `Other`. Default `Other` |
| `licence` | string | no | `"required"` for a paid connector bound to one customer licence. Leave it out for a free connector. A paid connector's pack version gets the suffix `-l<first 8 hex of the licence id>` |
| `framework` | string | no | `major.minor` of the connector framework the connector is built against |
| `egressHosts` | string[] | no | at most 64 fixed hosts the connector calls. Default `[]` |
| `egressFromConnection` | object | no | `{ hostProp, portProp, defaultPort }`: take the host from the connection settings. For systems each customer hosts themselves |

### Connector item spec

This is what certification writes into the pack. You do not write it by hand, but it shows exactly what the installation checks.

| Field | Type | Required | Rules |
|---|---|---|---|
| `pieceName` | string | yes | `@aancer/piece-<name>`, name `^[a-z0-9][a-z0-9-]{1,62}$`. Must be unique on the installation |
| `pieceVersion` | string | yes | strict `x.y.z`, no pre-release |
| `displayName` | string | yes | 1 to 80 characters |
| `description` | string | no | at most 300 characters |
| `category` | string | yes | see the category list above |
| `archive` | string | yes | `content/piece.tar` |
| `framework` | string | yes | `major.minor` of the connector framework, written by certification |
| `egressHosts` | string[] | yes | at most 64. Hostname with optional `*.` prefix and `:port`. A bare `*` is refused |
| `egressFromConnection` | object | no | `{ hostProp (1 to 64), portProp (1 to 64), defaultPort (1 to 65535) }` |
| `licenceId` | string | no | lower-case UUID of the customer licence for a paid connector. Absent means free |
| `deps` | array | yes | the bill of materials: up to 2000 of `{ name, version, license }` |
| `build` | object | no | build facts recorded by certification |
| `knowledgeSource` | object | no | for a connector that feeds knowledge sets: `{ contract: 1, label (1 to 40), actions: { list, item, download, estimate? }, siteProps? (up to 5), sharedConnectionView? }`. Action names match `^[a-z][a-z0-9_]{0,63}$` |
| `metadata` | boolean | no | `true` when the archive root holds `aancer-metadata.json` |

No other fields are allowed.

### Network egress

There are two ways to let a connector reach the network:

1. **Fixed hosts** (`egressHosts`): for a cloud API such as `api.example.com` or `*.example.org`. When an administrator clicks **Enable**, these hosts are added to the installation's allow-list.
2. **Host from the connection** (`egressFromConnection`): for a system each customer runs, such as an on-premises database. The administrator types host and port into the connection and switches its egress on. Only that `host:port` is allowed. Loopback, link-local and cloud metadata addresses are always blocked.

Disable or uninstall removes the grant. Connections and credentials are kept.

### Authentication

The connector carries its own authentication: `PieceAuth.None()`, `PieceAuth.SecretText(...)`, `PieceAuth.CustomAuth({ props: {...} })` or the framework's OAuth2 properties. Secrets are stored encrypted in the connection.

### Build rules

Certification refuses a connector that breaks any of these rules. Check them before you submit:

- No `install`, `preinstall`, `postinstall` or `prepare` scripts in any dependency.
- No native add-ons (`*.node`, `binding.gyp`, `prebuilds/`), no symlinks.
- Do not bundle the connector framework itself.
- `npm audit --omit=dev` reports 0 vulnerabilities.
- Dependency licences: MIT, ISC, BSD-2-Clause, BSD-3-Clause, Apache-2.0 or 0BSD.
- The built connector loads without network access.
- At most 2000 packages, 20,000 files and 32 MiB per file.
- `package-lock.json` is committed.

## Full examples

### A paid connector for a customer-hosted database

`pack.json`:

```json
{
  "title": "Example ERP connector",
  "displayName": "Example ERP",
  "description": "Read-only orders, invoices, production status and customers from the ERP database.",
  "category": "Business",
  "licence": "required",
  "egressHosts": [],
  "egressFromConnection": { "hostProp": "server", "portProp": "port", "defaultPort": 1433 }
}
```

The connection properties in the piece must include `server` and `port`:

```ts
import { PieceAuth, Property } from '@aancer/connector-framework';

export const erpAuth = PieceAuth.CustomAuth({
  displayName: 'ERP connection',
  required: true,
  props: {
    server: Property.ShortText({ displayName: 'Server', required: true }),
    port: Property.Number({ displayName: 'Port', defaultValue: 1433, required: true }),
    database: Property.ShortText({ displayName: 'Database', required: true }),
    username: Property.ShortText({ displayName: 'User name', required: true }),
    password: PieceAuth.SecretText({ displayName: 'Password', required: true }),
  },
  validate: async () => ({ valid: true }),
});
```

### The signed manifest of a free connector

```json
{
  "v": 2,
  "kind": "bundle",
  "id": "conn.example-echo",
  "version": "0.1.0",
  "title": "Example echo connector",
  "publisher": { "name": "Evntx FZCO", "keyId": "platform-<12 hex>" },
  "parameters": [],
  "assets": [
    { "path": "content/piece.tar", "sha256": "<64 hex characters>", "contentType": "application/x-tar" }
  ],
  "items": [
    {
      "kind": "connector",
      "schemaVersion": 1,
      "id": "example-echo",
      "scope": "install",
      "spec": {
        "pieceName": "@aancer/piece-example-echo",
        "pieceVersion": "0.1.0",
        "displayName": "Example echo",
        "description": "Echoes its input back. Useful to test connector install.",
        "category": "Developer",
        "archive": "content/piece.tar",
        "framework": "<major.minor>",
        "egressHosts": ["api.example.com"],
        "deps": [{ "name": "ms", "version": "2.1.3", "license": "MIT" }]
      }
    }
  ]
}
```

## Install and test

### Submit for certification

Build and test the connector with the connector kit on your own machine. Then submit the source folder through the [AANCER partner programme](https://aancer.ai/partners). AANCER runs the build rules, a security review and the archive checks, then signs the pack with the platform key. You get back a `conn.<name>-<version>.ancpack` file.

### Install a certified connector pack

| Action | UI | API |
|---|---|---|
| Upload the pack | Admin > Connectivity > Connectors > **Add from files**, or Platform Settings > Extensions > **Import pack** | `POST /api/extensions/packs/import?activate=1` with the raw `.ancpack` bytes (`extensions.manage`) |
| Install from the release library | Catalog > **Install** | `POST /api/admin/connectors/install {"ids": ["<catalog id>"]}` (`connectors.install`) |
| Enable network access | Catalog > **Enable** | `POST /api/admin/connectors/{id}/enable` |
| Disable | Catalog > **Disable** | `POST /api/admin/connectors/{id}/disable` |
| Uninstall | Catalog > **Uninstall** | `POST /api/admin/connectors/uninstall {"ids": [...]}` |
| Browse | Admin > Connectivity > Connectors | `GET /api/admin/connectors/browse` (`connectors.view`) |

An installed connector is usable about 90 seconds later. No restart is needed. Then create a connection, and use the connector in a workflow, an agent or chat.

## Common errors

| Code | Message | Fix |
|---|---|---|
| `PACK_SIGNER_NOT_ALLOWED` | Connector packs must be signed by the platform key. This pack was signed by another key. | Submit the connector for certification |
| `PACK_SCHEMA_INVALID` | `/egressHosts/0: a bare '*' is not allowed; name the hosts` | List the real hosts |
| `PACK_SCHEMA_INVALID` | `/egressHosts/0: must be a hostname (optionally *.domain and :port)` | No scheme or path, just the host |
| `PACK_SCHEMA_INVALID` | `/items: a connector pack carries no other kinds` | Put other items in a separate pack |
| `PACK_CONTENT_FORBIDDEN` | The connector archive contains forbidden content: ... native addon (*.node) | Remove native dependencies |
| `PACK_PIECE_NAME_TAKEN` | A connector named ... is already installed on this platform. | Choose a unique connector name |
| `PACK_VERSION_CONFLICT` | Pack ... is already imported with different content. Bump the version. | Raise `version` in `package.json` |
| `PACK_LICENCE_REQUIRED` | This connector pack needs an active licence. | Activate the licence first |
| `PACK_LICENCE_MISMATCH` | This connector pack was issued for a different licence. | Request a pack issued for this installation |
| `CONNECTOR_NOT_INSTALLED` | Install this connector first, then enable it. | |
| `CONNECTOR_LICENCE_REQUIRED` | This connector is not part of your licence. | |
| `CREDENTIAL_REQUIRED` | Add the provider API key first. | Configure the connector |
| `EXTENSION_REFERENCED` | Enabled flows use this connector: ... | Disable those workflows first |
| Validation | A connector must declare at least one allowed egress host before it can be enabled. | Add `egressHosts` or `egressFromConnection` |

## Limits and editions

- One connector per pack. Archive at most 96 MiB, unzipped at most 128 MiB.
- Connectors are installation-wide. There is no per-workspace install.
- Connector packs are signed by AANCER through certification. Partners submit them.
- Some catalog connectors are licensed and can be installed but not enabled without the matching licence feature. Paid partner connectors are bound to one customer licence.
- Check your edition on [aancer.ai/pricing](https://aancer.ai/pricing).
