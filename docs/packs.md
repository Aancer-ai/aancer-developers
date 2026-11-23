---
title: Extension packs (.ancpack) | AANCER Developers
description: The signed .ancpack format that carries every AANCER extension. Manifest fields, parameters, signing, trust keys, install and errors.
---

## Extension packs

Every AANCER extension travels in one file format: the signed extension pack, file extension `.ancpack`. A pack is a ZIP archive with a manifest, a signature and optional content files. One pack can carry one item or many: templates, agents, skills, themes, dashboards, hooks, embedded apps, links and more. The installation checks the signature and the hash of every file before it trusts anything. A pack then goes through three steps: **import** (verify and stage), **activate** (bind parameters and install the items) and **retire** (uninstall). The same file works for an upload in the admin screen, the REST API, an offline server folder and the certified catalog.

## Quick start

The smallest useful pack holds one skill.

```text
my-pack/
  manifest.json
  content/
    vendor-review.json
```

`manifest.json`:

```json
{
  "v": 2,
  "kind": "bundle",
  "id": "acme.business-skills",
  "version": "1.0.0",
  "title": "Acme business skills",
  "publisher": { "name": "Acme Example Ltd", "keyId": "pub-0123456789ab" },
  "requires": { "platform": ">=1.0.0" },
  "items": [
    {
      "kind": "skill",
      "schemaVersion": 1,
      "id": "vendor-review",
      "scope": "install",
      "spec": { "$ref": "content/vendor-review.json" }
    }
  ]
}
```

`content/vendor-review.json` is a skill spec (see [Skills](/developers/skills)). Sign it and import it:

```bash
aancer-pack keygen --out acme.key
aancer-pack sign manifest.json content/ -o acme.business-skills-1.0.0.ancpack --key acme.key
aancer-pack verify acme.business-skills-1.0.0.ancpack --pubkey acme.pub
```

Then an administrator adds your public key under **Platform Settings > Extensions > Trust keys** and imports the file with **Import pack**.

## File layout

What you write (the input to `aancer-pack sign`):

```text
my-pack/
  manifest.json            # the manifest; items point at content files with {"$ref": "content/<file>.json"}
  content/
    <item>.json            # one JSON object per item spec (or put the spec inline in manifest.json)
    logos/logo.png         # binary assets, only the allowed media types
```

What the installation reads (the signed archive):

```text
MANIFEST.json   # your manifest in signing form: every $ref gets a "$hash", binaries are listed in "assets"
MANIFEST.sig    # base64url Ed25519 signature over the canonical JSON of MANIFEST.json
content/...     # every file must be referenced by an item ($ref) or listed in assets
```

Rules for the archive:

- `MANIFEST.json` must be at the root.
- `MANIFEST.sig` must be present and not empty.
- Every other file must live under `content/`. No `..`, no backslashes in names.
- Every file under `content/` must be referenced by an item `$ref` or listed in `assets`. An extra file makes the whole pack fail the signature check.
- A `$ref` file must contain a JSON object.
- Use stored or deflate compression only. No encrypted entries.

## Field reference

JSON Schema: [pack-manifest.schema.json](https://aancer.ai/dev/schemas/pack-manifest.schema.json)

### Manifest

| Field | Type | Required | Rules |
|---|---|---|---|
| `v` | integer | yes | must be `2` |
| `kind` | string | yes | must be `"bundle"` |
| `id` | string | yes | `^[a-z0-9][a-z0-9._-]{2,63}$`. Use `<publisher>.<name>`, for example `acme.invoice-desk` |
| `version` | string | yes | strict semver: `MAJOR.MINOR.PATCH`, optional `-pre`. No `+build` part |
| `title` | string | no | shown in the admin screen. Required (1 to 120 characters) when `listing` is present |
| `publisher` | object | no | `{ "name": "...", "keyId": "..." }`. `keyId` names the key that signed the pack |
| `requires.platform` | string | no | `>=X.Y.Z`, optionally followed by ` <X.Y.Z` |
| `requires.points` | object | no | map of kind to schema version, for example `{"skill": "1"}`. Informational |
| `parameters` | array | no | values the administrator fills in at activation. See Parameters |
| `assets` | array | no | binary files with their hashes. `aancer-pack sign` writes this for you |
| `items` | array | yes | 1 to 256 items. See Items |
| `listing` | object | no | catalog listing. Needed for a certified catalog submission |
| `declarations` | object | no | licence, data flows, network access, AI use. Needed for a certified catalog submission |
| `certification` | object | no | added by AANCER certification. Never write it yourself |

### Items

| Field | Type | Required | Rules |
|---|---|---|---|
| `kind` | string | yes | one of `theme`, `locale`, `dataset`, `model`, `widget`, `dashboard`, `hook`, `app`, `link`, `card`, `skill`, `connector`, `template`, `agent-blueprint` |
| `schemaVersion` | integer | yes | the item format version. See the table below |
| `id` | string | yes | `^[a-z0-9][a-z0-9._-]{0,63}$`, unique within the pack |
| `scope` | string | no | `install` (default) or `workspace`. `agent-blueprint` and `connector` must be `install` |
| `workspace` | string | if scope is `workspace` | a workspace id or `{{param.<id>}}`. Not allowed with `install` scope |
| `spec` | object | yes | the item spec inline, or `{"$ref": "content/<file>.json"}` |

Supported schema versions:

| Kind | Versions | Page |
|---|---|---|
| `template` | 1 | [Templates](/developers/templates) |
| `agent-blueprint` | 1 | [Agents](/developers/agents) |
| `skill` | 1 | [Skills](/developers/skills) |
| `theme` | 2 (1 for simple branding) | [Themes](/developers/themes) |
| `locale` | 1 | [Themes](/developers/themes) |
| `connector` | 1 | [Connectors](/developers/connectors) |
| `dataset`, `model`, `widget`, `dashboard` | 1 | [Dashboards](/developers/dashboards) |
| `hook` | 1 | [Hooks](/developers/hooks) |
| `app` | 2 | [Embedded apps](/developers/apps) |
| `link`, `card` | 1 | [Embedded apps](/developers/apps) |

An item with a schema version that the installation does not support is staged as `unsupported`. It is not an error, but nothing is installed. `GET /api/extensions/schemas` returns the table for a given installation.

### Parameters

Parameters let one pack work in any installation. The administrator binds them at activation.

| Field | Type | Required | Rules |
|---|---|---|---|
| `id` | string | yes | `^[a-z][a-z0-9_]{0,63}$`, unique |
| `type` | string | yes | `connection`, `workspace`, `dataset`, `string`, `secret`, `workflow`, `agent` |
| `label` | string | no | shown in the activation dialog |
| `required` | boolean | no | default `true` |
| `connector` | string | no | for `connection`: the connector the connection must belong to |
| `default` | any | no | used when no value is sent and none was bound before |

Reference a parameter as the whole string `{{param.<id>}}` anywhere in a spec or in an item's `workspace`. Every referenced parameter must be declared. At activation every value is a string. A `workspace` value must name an existing workspace. A `connection` value must name an existing connection. A `secret` is stored encrypted.

### Assets

| Field | Type | Rules |
|---|---|---|
| `path` | string | starts with `content/`, no `..` |
| `sha256` | string | 64 lower-case hex characters |
| `contentType` | string | `font/woff2`, `image/png`, `image/svg+xml`, `image/jpeg`, `image/x-icon`. `application/x-tar` only as the `archive` of a connector item |

`aancer-pack sign` lists every binary file for you. Each asset is at most 4 MiB. A connector archive is at most 96 MiB.

### Catalog blocks

You only need `listing` and `declarations` to submit a pack to the certified catalog. When they are present they are checked strictly and unknown fields are refused.

`listing`:

| Field | Rules |
|---|---|
| `v` | `1` |
| `summary` | required, 1 to 280 characters |
| `description` | plain text, at most 4000 characters |
| `category` | required. One of `operations`, `finance`, `hr`, `legal`, `sales`, `marketing`, `customer-service`, `it`, `devops`, `security`, `compliance`, `procurement`, `manufacturing`, `healthcare`, `retail`, `education`, `public-sector`, `productivity`, `analytics`, `other` |
| `tags` | at most 8, each `^[a-z0-9][a-z0-9-]{0,31}$` |
| `icon` | path of an image listed in `assets` |
| `screenshots` | at most 5 image paths listed in `assets` |
| `releaseNotes` | at most 4000 characters |
| `supportUrl` | https URL, at most 300 characters, no credentials |
| `locales` | keys `en`, `de`, `es`, `ar`; each `{ title?, summary?, description? }` |

`declarations`:

| Field | Rules |
|---|---|
| `v` | `1` |
| `licence` | one of `0BSD`, `AGPL-3.0-only`, `AGPL-3.0-or-later`, `Apache-2.0`, `BSD-2-Clause`, `BSD-3-Clause`, `BSL-1.0`, `CC-BY-4.0`, `CC-BY-SA-4.0`, `CC0-1.0`, `EPL-2.0`, `EUPL-1.2`, `GPL-2.0-only`, `GPL-2.0-or-later`, `GPL-3.0-only`, `GPL-3.0-or-later`, `ISC`, `LGPL-2.1-only`, `LGPL-2.1-or-later`, `LGPL-3.0-only`, `LGPL-3.0-or-later`, `MIT`, `MIT-0`, `MPL-2.0`, `OFL-1.1`, `Unlicense`, `Zlib`, or `LicenseRef-<name>` (`<name>`: 1 to 64 letters, digits, `.` or `-`) |
| `thirdParty` | at most 256 of `{ name, licence }`. `licence` follows the same rule |
| `egress` | at most 64 of `{ host, port, purpose }`. `host` is a lower-case DNS name, no wildcard, no IP address |
| `dataFlows` | at most 32 of `{ purpose, data[], personalData, destination, host? }`. `destination` is `installation`, `external` or `web-search`. An `external` flow names a `host` that is also listed in `egress` |
| `aiUse` | `{ intendedPurpose (1 to 500), annexIII (boolean), humanOversight (1 to 120) }` |
| `attestations` | `{ "ownsRights": true, "noProhibitedPractice": true }`. Both must be `true` |

### Pack id rules for the catalog

A catalog pack id is `<publisherId>.<name>`. `publisherId` matches `^[a-z0-9][a-z0-9-]{2,31}$`. These prefixes are reserved and cannot be used: anything starting with `aancer`, plus `platform`, `system`, `test`, `install`, `inst`, `pack`, `v1`, `template`, `solution`, `dashboard`, `export`, `conn`.

## Full examples

### A pack for the certified catalog

```json
{
  "v": 2,
  "kind": "bundle",
  "id": "acme.invoice-triage",
  "version": "1.0.0",
  "title": "Invoice triage",
  "publisher": { "name": "Acme Example Ltd", "keyId": "pub-0123456789ab" },
  "requires": { "platform": ">=1.0.0" },
  "listing": {
    "v": 1,
    "summary": "Sorts incoming invoices and drafts the booking proposal.",
    "description": "Plain text, up to 4000 characters.",
    "category": "finance",
    "tags": ["invoices", "accounts-payable"],
    "icon": "content/listing/icon.png",
    "releaseNotes": "First release.",
    "supportUrl": "https://support.example.com/invoice-triage",
    "locales": {
      "de": { "title": "Rechnungssortierung", "summary": "Sortiert eingehende Rechnungen und entwirft den Buchungsvorschlag." }
    }
  },
  "declarations": {
    "v": 1,
    "licence": "LicenseRef-Acme-Commercial",
    "thirdParty": [{ "name": "amount-parser", "licence": "MIT" }],
    "dataFlows": [
      { "purpose": "Read invoice documents to extract amounts", "data": ["invoice-documents"], "personalData": true, "destination": "installation" },
      { "purpose": "Open the help page in the browser", "data": ["none"], "personalData": false, "destination": "external", "host": "support.example.com" }
    ],
    "egress": [{ "host": "support.example.com", "port": 443, "purpose": "Help page opened by the user" }],
    "aiUse": { "intendedPurpose": "Drafts a booking proposal a person approves", "annexIII": false, "humanOversight": "approval-step" },
    "attestations": { "ownsRights": true, "noProhibitedPractice": true }
  },
  "items": [
    { "kind": "skill", "schemaVersion": 1, "id": "invoice-triage", "scope": "install", "spec": { "$ref": "content/skill.json" } },
    { "kind": "link", "schemaVersion": 1, "id": "triage-help", "scope": "install",
      "spec": { "id": "triage-help", "label": "Invoice triage help", "url": "https://support.example.com/invoice-triage", "icon": "ExternalLink", "order": 90, "openIn": "new-tab" } }
  ]
}
```

`content/listing/icon.png` must be in the folder you sign. The signer adds it to `assets`.

### A workspace pack with parameters

```json
{
  "v": 2,
  "kind": "bundle",
  "id": "acme.sales-dashboard",
  "version": "1.2.0",
  "title": "Sales overview",
  "publisher": { "name": "Acme Example Ltd", "keyId": "pub-0123456789ab" },
  "requires": { "platform": ">=1.0.0" },
  "parameters": [
    { "id": "target_workspace", "type": "workspace", "label": "Workspace", "required": true }
  ],
  "items": [
    { "kind": "dataset", "schemaVersion": 1, "id": "sales_orders", "scope": "workspace",
      "workspace": "{{param.target_workspace}}", "spec": { "$ref": "content/dataset.sales_orders.json" } },
    { "kind": "dashboard", "schemaVersion": 1, "id": "sales-overview", "scope": "workspace",
      "workspace": "{{param.target_workspace}}", "spec": { "$ref": "content/dashboard.sales-overview.json" } }
  ]
}
```

## Signing

### The aancer-pack CLI

The `aancer-pack` CLI is available to partners and builders on request: [contact us](https://aancer.ai/contact). It needs Node 20 or newer and has no other dependencies.

| Command | What it does |
|---|---|
| `aancer-pack keygen --out acme.key` | makes an Ed25519 key pair (`acme.key`, `acme.pub`) and prints your key id `pub-<12 hex>`. Never overwrites a key |
| `aancer-pack sign manifest.json content/ -o <file>.ancpack --key acme.key` | builds the signing form, zips and signs |
| `aancer-pack verify <file>.ancpack --pubkey acme.pub [--publisher-pubkey acme.pub]` | checks the signature, prints OK. `--publisher-pubkey` also checks the publisher signature of a certified pack |
| `aancer-pack inspect <file>.ancpack` | shows id, version, items and content hash |
| `aancer-pack mirror --from <catalog address> --to <dir> --pubkey platform.pub` | copies the certified catalog and its packs into a folder, verified, for a mirror inside your own network |
| `aancer-pack lint manifest.json content/` or `aancer-pack lint <file>.ancpack` | checks catalog readiness, prints one `<path>: <what to change>` line per problem. Add `--json` for machine-readable output |

Exit codes: `0` ok, `2` invalid input or usage, `3` signature or verification refused.

`lint` also demands `publisher.name` (1 to the name limit) and a `publisher.keyId` in one of the forms `pub-<12 hex>`, `inst-<12 hex>` or `install`.

Put the `pub-<12 hex>` id that `keygen` prints into `publisher.keyId`. Keep the `.key` file private. Share only the `.pub` file.

### What gets signed

You do not need this if you use the CLI. It is here so you can check a pack by hand.

1. Start from `manifest.json`.
2. Replace every `{"$ref": "content/x.json"}` with `{"$ref": "content/x.json", "$hash": "sha256:<hex of the file bytes>"}`.
3. Add `assets` with the sha256 of every binary file under `content/`.
4. Remove any `sig` or `signature` field.
5. Serialise as canonical JSON: object keys sorted at every level, compact separators, arrays in order, no non-finite numbers.
6. Sign those bytes with Ed25519. Write the base64url signature to `MANIFEST.sig`, and the signing form to `MANIFEST.json`.

### Who may sign

An installation accepts a pack when one of these keys verifies it:

1. the AANCER platform key;
2. the installation's own export key (`inst-<12 hex>`), for templates, agents and dashboards exported from that installation;
3. a partner key that an administrator added under **Platform Settings > Extensions > Trust keys**. The manifest's `publisher.keyId` must equal the key id the administrator entered.

A pack signed by the installation's own key always verifies with that key and is not affected by catalog withdrawals. A pack whose signer is known but whose signature does not match is refused with `PACK_SIGNATURE_INVALID`.

Connector packs are accepted only with the AANCER platform key. Partners submit connectors for certification and AANCER signs them. See [Connectors](/developers/connectors).

## Install and test

To test a pack, import it into an EVAL or test installation. Import is installation-wide: it checks everything and installs nothing. Only activation changes the installation. A pack that contains workflow templates also passes the template permission check on activate and rollback.

### In the UI

1. **Platform Settings > Extensions > Trust keys > Add trust key**. Paste your public key. Use your `publisher.keyId` as the key id.
2. **Import pack**. The summary lists items, parameters and warnings.
3. **Activate**. Fill in the parameters.
4. Later: **Roll back** to an older version, or **Retire** to uninstall.

Importing needs the `extensions.manage` permission. Activating a pack whose items are all workspace-scoped and target workspaces you manage also works with `extensions.manage_own`.

### With the REST API

```bash
# 1. add the trust key (once per publisher)
curl -X POST https://aancer.example.com/api/extensions/trust-keys \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"keyId":"pub-0123456789ab","label":"Acme Example Ltd","publicKeyPem":"-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"}'

# 2. import (raw bytes as the body)
curl -X POST https://aancer.example.com/api/extensions/packs/import \
  -H "Authorization: Bearer $TOKEN" \
  --data-binary @acme.sales-dashboard-1.2.0.ancpack

# 3. activate with parameter values
curl -X POST https://aancer.example.com/api/extensions/packs/acme.sales-dashboard/activate \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"version":"1.2.0","parameters":{"target_workspace":"ws-sales"}}'
```

| Call | What it does |
|---|---|
| `POST /api/extensions/packs/import` | raw `.ancpack` bytes, optionally `?activate=1`. Returns `201` (new) or `200` with a summary: items, parameters, warnings, `upgradeFrom`, and when relevant `certification`, `revocation`, `keptBehind` |
| `POST /api/extensions/packs/{packId}/activate` | `{ "version": "...", "parameters": { "<id>": "<value>" } }`. A `null` value unbinds an optional parameter |
| `POST /api/extensions/packs/{packId}/rollback` | `{ "version": "..." }` |
| `POST /api/extensions/packs/{packId}/retire` | uninstall |
| `GET /api/extensions/packs`, `GET /api/extensions/packs/{packId}` | list and detail |
| `GET /api/extensions/objects` | installed objects, filter by `kind`, `workspaceId`, `state`, `packId` |
| `GET /api/extensions/schemas` | supported kinds and schema versions |
| `GET /api/extensions/trust-keys` | list trust keys |
| `POST /api/extensions/trust-keys` | add a key, answers `201` |
| `DELETE /api/extensions/trust-keys/{keyId}` | remove a key, answers `204` |

### The certified catalog in your installation

Certified packs are listed in the installation's catalog. An administrator opens a listing and chooses **Get** to import it; a newer certified version shows **Update available**. The installation receives the catalog over its catalog channel. Installations without direct internet access upload the signed catalog file (`catalog-snapshot.json`) by hand, or point the channel at a mirror in their own network built with `aancer-pack mirror`.

| Call | Permission | What it does |
|---|---|---|
| `GET /api/marketplace/certified/status` | `marketplace.view` | channel status and last refresh |
| `PUT /api/marketplace/certified/settings` | `extensions.manage` | catalog channel settings |
| `POST /api/marketplace/certified/refresh` | `extensions.manage` | fetch the catalog now |
| `POST /api/marketplace/certified/snapshot` | `extensions.manage` | upload a catalog file (raw body, up to 8 MiB) |
| `GET /api/marketplace/certified/items`, `/items/{packId}`, `/facets` | `marketplace.view` | browse listings, kinds and available updates |
| `POST /api/marketplace/certified/items/{packId}/get` | `marketplace.import_pack` | import a listed pack |

### Withdrawn versions

AANCER can withdraw a certified pack version, for example after a security finding, and names the version that fixes it. A withdrawn version is no longer imported (`PACK_REVOKED`). For a critical withdrawal the installation stops the installed version (a forced stop); otherwise the version is flagged for the administrator. Where the installation allows it, an administrator can record a decision to keep a withdrawn version running, with a reason, and end that decision later:

| Call | Body |
|---|---|
| `POST /api/extensions/packs/{packId}/revocation-override` | `{ version, reason }` |
| `DELETE /api/extensions/packs/{packId}/revocation-override` | `{ version }` |

Both need `extensions.manage`. Activating a newer version ends the decision for older ones.

### Offline install

An operator can drop `.ancpack` files into the installation's packs folder. Every file is imported at start. A pack is activated when every required parameter has a value in `packs.env`, written as `PACK_<pack id with non-alphanumerics as _>__<param>=value`. For example `PACK_acme_sales_dashboard__target_workspace=ws-sales`. Administrators can rescan the folder with **Scan server folder**.

### Versions

A pack id plus version is permanent. Importing the same version again with the same content does nothing. Importing it with different content fails: bump the version. Activating a newer version replaces the older one. With equal `MAJOR.MINOR.PATCH`, a pre-release such as `1.2.0-rc1` is older than `1.2.0`.

## Common errors

| Code | Status | Message | Fix |
|---|---|---|---|
| `PACK_UNSIGNED` | 422 | This pack is not signed (MANIFEST.sig is missing). | Sign it with `aancer-pack sign` |
| `PACK_MALFORMED` | 400 | The pack could not be read. / MANIFEST.json is missing | Rebuild the ZIP with the CLI |
| `PACK_SIGNATURE_INVALID` | 400 | This pack could not be verified, the signature is invalid. | A file changed after signing, a file under `content/` is not referenced or listed, or `publisher.keyId` names another key. Re-sign after every change |
| `PACK_SIGNER_UNKNOWN` | 422 | This pack was signed by an unknown key (pub-...). Add the publisher's key under Extensions > Trust keys first. | The administrator adds your public key with the same key id |
| `PACK_SIGNER_NOT_ALLOWED` | 403 | Connector packs must be signed by the platform key. | Submit connectors for certification |
| `PACK_SCHEMA_INVALID` | 422 | The pack failed validation: `<path>: <message>` | Fix the field at the path. Item errors use `/items/<itemId>/spec/...` |
| `PACK_SCHEMA_INVALID` | 422 | `/parameters: parameter 'x' is referenced but not declared` | Declare it in `parameters` |
| `PACK_SCHEMA_INVALID` | 422 | `/items/0/scope: agent-blueprint items are install-scoped` | Use `"scope": "install"` |
| `PACK_SCHEMA_INVALID` | 422 | `/items/0/workspace: required for workspace scope` | Add `workspace` or use install scope |
| `PACK_SCHEMA_INVALID` | 422 | `/version: must be strict semver` | Use `1.0.0`, not `1.0` or `v1.0.0` |
| `PACK_SCHEMA_INVALID` | 422 | the unzipped content is larger than the limit | Keep the unzipped content under 32 MiB (128 MiB for a connector pack) |
| `EXTENSION_KIND_UNKNOWN` | 422 | This platform does not know the extension kind '...'. | Use a kind from the table above |
| `PACK_PLATFORM_INCOMPATIBLE` | 422 | This pack needs platform version ...; this installation runs ... | Lower `requires.platform`, or the installation upgrades |
| `PACK_VERSION_CONFLICT` | 409 | Pack ... is already imported with different content. Bump the version. | Bump `version` |
| `PACK_TOO_LARGE` | 413 | This file is larger than the ... MB limit for one pack on this installation. | Applies to the file size only: keep the file under 64 MiB |
| `PACK_PARAMETER_MISSING` | 422 | Required parameters are missing: ... | Send them at activation, or set `"required": false` |
| `PACK_PARAMETER_INVALID` | 422 | Parameter values are invalid: ... | Send existing ids as strings |
| `EXTENSION_REFERENCED` | 409 | Other active extensions still reference objects in this pack: ... | Remove the dependants first |
| `PACK_REVOKED` | 403 | This pack version was withdrawn by the platform (...). | Install the version named in the message |
| `PACK_LICENCE_REQUIRED` | 403 | This connector pack needs an active licence. | Activate the licence, then import again |
| `PACK_LICENCE_MISMATCH` | 403 | This connector pack was issued for a different licence. | Ask for a pack issued to this installation |
| `PACK_CONTENT_FORBIDDEN` | 422 | The connector archive contains forbidden content: ... | Remove the named files |
| `PACK_PIECE_NAME_TAKEN` | 409 | A connector named ... is already installed on this platform. | Use another package name |
| `EXTENSION_NOT_FOUND` | 404 | ... not found. | Check the pack id or object id |
| `PACK_NOT_REVOKED` | 409 | This pack version is not withdrawn with a forced stop, so there is nothing to keep running. | Only for versions stopped by a withdrawal |
| `PACK_REVOCATION_OVERRIDE_FORBIDDEN` | 403 | This installation does not allow a withdrawn pack to keep running. | Install the fixed version |

`aancer-pack lint` adds catalog checks, for example "a submission needs a listing block", "a submission must not carry a certification block" and "pack id must be '<publisher id>.<name>'".

## Limits and editions

- Pack file: 64 MiB by default. The operator can change it.
- Unzipped content: 32 MiB per pack, 128 MiB for a pack with a connector. Each asset: 4 MiB; a connector archive (`application/x-tar`): 96 MiB. Items: 256 per pack.
- Importing and activating packs is controlled by permissions (`extensions.manage`, `extensions.manage_own`).
- Some item kinds need a licence feature: embedded apps, certified agents and licensed connectors. Each page says so.
- Check your edition on [aancer.ai/pricing](https://aancer.ai/pricing).
