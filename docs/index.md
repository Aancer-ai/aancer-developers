---
title: Build on AANCER | AANCER Developers
description: Build templates, agents, skills, themes, connectors, dashboards, hooks and embedded apps for AANCER. Formats, schemas, examples and a prompt for your AI.
---

## Build on AANCER

AANCER is an all-in-one platform for agentic AI that customers run in the cloud or on their own infrastructure. You can extend it without touching its code. Every extension is plain data in a signed file, called a pack. This section shows every format, with JSON Schemas, full examples, the install steps and the errors you may see. It is written so that a developer, or an AI assistant such as ChatGPT, Claude or Gemini, can produce a valid extension from it.

## What you can build

| Build | What it is | Page |
|---|---|---|
| Workflow templates | reusable workflows with typed parameters, deployed from the template gallery | [Templates](/developers/templates) |
| Agents | AI assistants with instructions, tools and limits, shipped as agent blueprints | [Agents](/developers/agents) |
| Skills | reusable instructions that shape how chat and agents work | [Skills](/developers/skills) |
| Themes | colours, fonts, logos, login page and UI wording | [Themes](/developers/themes) |
| Connectors | integrations with external systems, certified and signed by AANCER | [Connectors](/developers/connectors) |
| Dashboards | datasets, semantic models, charts, KPIs, tables and forms | [Dashboards](/developers/dashboards) |
| Hooks | start a workflow or agent when a platform event happens | [Hooks](/developers/hooks) |
| Embedded apps | your own web application inside AANCER, with single sign-on and data access | [Embedded apps](/developers/apps) |
| API and MCP | REST endpoints, and the MCP server for external AI clients | [REST API and MCP](/developers/api) |

## The pack model in one minute

- A **pack** is a ZIP file with the extension `.ancpack`. It holds `MANIFEST.json`, a signature `MANIFEST.sig`, and content files under `content/`.
- The manifest lists **items**. Each item has a `kind` (such as `template`, `skill` or `app`), a `schemaVersion`, an `id` and a `spec`.
- **Parameters** make a pack portable. Write `{{param.target_workspace}}` in a spec, and the administrator picks the workspace when activating the pack.
- You **sign** the pack with your own key using the `aancer-pack` CLI. An administrator adds your public key as a trust key once.
- Installing has three steps: **import** (checks everything, changes nothing), **activate** (installs the items), **retire** (removes them).
- A pack id plus version never changes. To ship a fix, bump the version.

```json
{
  "v": 2,
  "kind": "bundle",
  "id": "acme.business-skills",
  "version": "1.0.0",
  "title": "Acme business skills",
  "publisher": { "name": "Acme Example Ltd", "keyId": "pub-0123456789ab" },
  "items": [
    { "kind": "skill", "schemaVersion": 1, "id": "vendor-review", "scope": "install", "spec": { "$ref": "content/vendor-review.json" } }
  ]
}
```

Read [Packs](/developers/packs) for the full format.

## Build with your AI assistant

Copy this prompt into ChatGPT, Claude or Gemini. Replace the last paragraph with what you want to build.

```text
You are helping me build an extension for the AANCER platform.

Before you write anything:
1. Read https://aancer.ai/dev/llms.txt. It lists every AANCER developer page and schema.
2. Read https://aancer.ai/developers-packs and https://aancer.ai/dev/schemas/pack-manifest.schema.json.
3. Read the page and the JSON Schema for the extension type I need, for example
   https://aancer.ai/developers-templates and https://aancer.ai/dev/schemas/template.schema.json.

Rules:
- Use only fields that appear in the schema. Do not invent fields. Unknown fields are refused.
- Output a folder: manifest.json plus content/<file>.json for each item spec.
- Use "v": 2, "kind": "bundle", a pack id like "<publisher>.<name>", and a strict semver version.
- Never put real ids of an installation (connections, knowledge sets, workspaces, approvers) into a spec.
  Use pack parameters ({{param.<id>}}) or template parameters with bindings instead.
- Never put keys, tokens or passwords into any file.
- Check every limit in the field tables (lengths, counts, allowed values).
- After the files, list the commands to sign the pack with the aancer-pack CLI and the steps to
  import and activate it in a test installation.

What I want to build:
<describe it here, for example: "A workflow template that takes a support e-mail, classifies it
with a local model, asks a team lead to approve the reply, then sends it.">
```

Tips for good results:

- Name the extension type. "A workflow template", "an agent blueprint" and "an embedded app" lead to different formats.
- Paste back the exact import error if there is one. Every page has a "Common errors" table the assistant can use.
- Ask the assistant to validate each file against the JSON Schema before it answers.

## Connect the AANCER Builder MCP server

Your assistant can also use AANCER's public builder server directly. It reads the docs, the schemas and the examples, and it checks a pack before you sign it. It is read-only and needs no account.

- Endpoint: `https://aancer.ai/mcp` (Streamable HTTP, no authentication)
- Tools: `list_extension_types`, `get_docs`, `get_schema`, `get_example`, `validate_pack`, `search_docs`
- Prompt: `build_extension` walks the assistant through docs, schema, example, files and validation

| Client | How to connect |
|---|---|
| Claude (web and desktop) | Settings, Connectors, add a custom connector with the URL `https://aancer.ai/mcp` |
| Claude Code | `claude mcp add --transport http aancer-builder https://aancer.ai/mcp` |
| ChatGPT | Turn on developer mode for connectors, then create a connector with the URL `https://aancer.ai/mcp` and no authentication |
| Gemini CLI | Add `"aancer-builder": {"httpUrl": "https://aancer.ai/mcp"}` under `mcpServers` in `~/.gemini/settings.json` |
| Cursor, VS Code and other MCP clients | Add an HTTP server named `aancer-builder` with the URL `https://aancer.ai/mcp` |

Then ask, for example: "Use the AANCER builder tools to make a workflow template that triages supplier invoices with a human approval, and validate it."

`validate_pack` checks the published schemas and the pack structure. Your installation runs further checks on import: the signature, licence features and references to items that exist there.

## JSON Schemas

| Schema | Covers |
|---|---|
| [pack-manifest.schema.json](https://aancer.ai/dev/schemas/pack-manifest.schema.json) | the pack manifest |
| [template.schema.json](https://aancer.ai/dev/schemas/template.schema.json) | `template` item spec |
| [agent.schema.json](https://aancer.ai/dev/schemas/agent.schema.json) | `agent-blueprint` item spec, plus the REST agent configuration |
| [skill.schema.json](https://aancer.ai/dev/schemas/skill.schema.json) | `skill` item spec |
| [theme.schema.json](https://aancer.ai/dev/schemas/theme.schema.json) | `theme` item spec, plus `locale` |
| [connector.schema.json](https://aancer.ai/dev/schemas/connector.schema.json) | `connector` item spec |
| [dashboard.schema.json](https://aancer.ai/dev/schemas/dashboard.schema.json) | `dataset`, `model`, `widget` and `dashboard` item specs |
| [hook.schema.json](https://aancer.ai/dev/schemas/hook.schema.json) | `hook` item spec |
| [app.schema.json](https://aancer.ai/dev/schemas/app.schema.json) | `app` item spec, plus `link` and `card` |

All schemas use JSON Schema draft 2020-12.

## Examples

The [AANCER developers repository on GitHub](https://github.com/Aancer-ai/aancer-developers) holds a complete, valid pack for every type: two workflow templates, two agent blueprints, a skill, a theme, a connector source folder, a sales dashboard, a hook and two embedded apps with working app code. The examples and schemas are MIT licensed. The AANCER platform itself is proprietary.

## Tools

- **aancer-pack CLI**: creates keys, signs, verifies, inspects and lints packs. Node 20 or newer. Available to partners and builders on request: [contact us](https://aancer.ai/contact).
- **AANCER Builder MCP server** at `https://aancer.ai/mcp`: `validate_pack` checks a pack against the schemas before you sign it. See [Connect the AANCER Builder MCP server](#connect-the-aancer-builder-mcp-server).
- **A test installation**: import your pack into an EVAL or test installation. Import checks everything and installs nothing until you activate. [Start a free EVAL](https://aancer.ai/contact?intent=eval).

## Start here

1. Read [Packs](/developers/packs).
2. Pick your type from the table above and copy its Quick start.
3. Sign with `aancer-pack`, import into a test installation, read the summary, activate.
4. Partners who want to publish in the certified catalog add `listing` and `declarations` and run `aancer-pack lint`. See the [partner programme](https://aancer.ai/partners).

## Limits and editions

Each page lists the limits for its type and any licence feature it needs, such as Embedded apps, Certified Agents or the MCP server. Check your edition on [aancer.ai/pricing](https://aancer.ai/pricing).
