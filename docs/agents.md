---
title: Agents and agent blueprints | AANCER Developers
description: Define AANCER agents through the REST API and ship them as agent blueprints in a pack. Fields, tool rules, publishing, certified agents and errors.
---

## Agents

An agent in AANCER is a versioned, governed AI assistant that belongs to a workspace. It has instructions, a model tier, tools (connector actions, knowledge sets, workflows, other agents, web search and platform tools), conversation starters, an optional input form, optional structured output, run limits, a write-approval policy and an automated decision disclosure. You edit a **draft** and **publish** numbered versions. Each publish issues a signed passport that binds the version to a hash of its configuration.

To move an agent between installations, or to offer it to customers, you use an **agent blueprint**: a pack item of kind `agent-blueprint`. A blueprint carries content only: instructions, starters, model tier, tool references and skills. Activating a blueprint creates no agent. A person creates an agent from it with one click, and that agent is an ordinary agent of the target installation.

There are two formats on this page:

| Format | Use it for | How you send it |
|---|---|---|
| Agent blueprint | shipping an agent design in a pack | pack item `agent-blueprint`, schema version 1 |
| Agent configuration | creating or editing an agent in one installation | REST: `PUT /api/agents/{id}/draft` |

## Quick start

A blueprint that sorts invoices. It uses a mail connector action and the platform's render tool.

```json
{
  "v": 2,
  "kind": "bundle",
  "id": "acme.invoice-triage",
  "version": "1.0.0",
  "title": "Invoice triage agent",
  "publisher": { "name": "Acme Example Ltd", "keyId": "pub-0123456789ab" },
  "requires": { "platform": ">=1.0.0" },
  "items": [
    {
      "kind": "agent-blueprint",
      "schemaVersion": 1,
      "id": "invoice-triage",
      "scope": "install",
      "spec": {
        "name": "Invoice triage",
        "description": "Sorts incoming invoices and drafts the booking proposal.",
        "category": "finance",
        "icon": "receipt",
        "instructions": "You sort incoming invoices. For each one, name the supplier, the amount and the cost centre, and draft a booking proposal. Never book anything yourself.",
        "starters": ["Sort today's invoices"],
        "model": { "tier": "local-standard" },
        "tools": [
          { "kind": "connector", "ref": "mail.send_email" },
          { "kind": "frame", "ref": "render" }
        ],
        "skills": [],
        "riskHint": null
      }
    }
  ]
}
```

`mail.send_email` is a placeholder. Use `<connector name>.<action name>` of a connector in the target installation.

## File layout

```text
acme-invoice-desk/
  manifest.json                       # pack manifest
  content/
    invoice-clerk.json                # agent-blueprint spec
    invoice-summary-approval.json     # template spec the blueprint uses as a tool
```

A blueprint item must use `"scope": "install"`.

## Field reference

JSON Schema: [agent.schema.json](https://aancer.ai/dev/schemas/agent.schema.json). The root is the blueprint spec. `$defs/agentConfig` is the REST agent configuration.

### Agent blueprint spec

| Field | Type | Required | Rules |
|---|---|---|---|
| `name` | string | yes | 1 to 120 characters |
| `description` | string | no | at most 2000 characters |
| `category` | string | no | free text, at most 80 characters |
| `icon` | string | no | at most 40 characters, an icon name such as `receipt` |
| `instructions` | string | yes | 1 to 50,000 characters |
| `starters` | string[] | no | at most 12, each 1 to 500 characters |
| `model` | object | yes | exactly `{ "tier": "<tier>" }`. Tier: `local-standard`, `local-advanced`, `cloud-reasoning`. Never a fixed model route |
| `tools` | array | no | at most 64 of `{ kind, ref }`, no duplicates. See Tool references |
| `skills` | string[] | no | at most 32, each 1 to 120 characters |
| `riskHint` | `"high"` or `null` | no | |

No other fields are allowed.

### Tool references in a blueprint

| `kind` | `ref` must be |
|---|---|
| `knowledge` | a pack parameter `{{param.<id>}}`. Never a knowledge set id |
| `workflow` | the item id of a `template` item in the same pack, or a pack parameter |
| `agent` | the item id of another `agent-blueprint` item in the same pack, or a pack parameter |
| `web` | a tool name such as `search`. The pack must declare a data flow with `destination: "web-search"` |
| `connector` | a connector name, optionally with an action: `name` or `name.action`. Letters, digits, `_ . @ / -` |
| `dataset`, `frame` | the platform tool's action name, for example `append` or `render` |

`code` and `mcp` tools cannot be part of a blueprint.

Pack parameters have no knowledge type. Declare a knowledge parameter as `"type": "string"` and let the administrator enter the knowledge set id.

### What happens on "Create agent"

When a person creates an agent from a blueprint, the new draft takes the blueprint's instructions, starters, model tier, tools and skills. Everything else uses the defaults: limits of 12 steps, 20 tool calls, 1 USD and 300 seconds, write confirmation `always`, no automated decisions. Tool references are resolved in the person's workspace:

- a `workflow` item becomes the newest workflow deployed there from that pack template;
- an `agent` item becomes the newest agent created there from that blueprint;
- a parameter becomes its bound value.

A reference that cannot be filled is left out and listed in `skipped[]` with the reason `parameter_not_set`, `workflow_not_deployed` or `agent_not_created`. Deploy the template first, then create the agent.

### Agent configuration (REST)

Send it with `PUT /api/agents/{id}/draft` as `{ "config": { ... } }`. Saving a draft refuses malformed values. Publishing also refuses missing values and tools that are not available.

| Field | Type | Required | Rules | Default |
|---|---|---|---|---|
| `instructions` | string | yes | not empty at publish, at most 50,000 characters | `""` |
| `model` | object | yes | exactly one of `{tier}` or `{route}`. `route` is a fixed model route of the installation | `{tier: "local-advanced"}` |
| `temperature` | number | no | 0 to 2 | |
| `tools` | array | yes | may be empty, no duplicates. See below | `[]` |
| `input` | object | yes | `{kind: "prompt"}` or `{kind: "form", fields: [...]}` with 1 to 40 fields | `{kind: "prompt"}` |
| `starters` | string[] | yes | at most 12, each 1 to 500 characters | `[]` |
| `output` | object | no | `{fields: [...]}`, 1 to 50 fields | |
| `limits` | object | yes | `maxSteps` (at most 200), `maxToolCalls` (at most 500), `maxUsd` (at most 1000), `maxWallMs` (at most 86,400,000). All above 0 | `12, 20, 1, 300000` |
| `approval.confirmWrites` | string | yes | `always` or `workspace_default` | `always` |
| `art22.automatedDecisionMaking` | string | yes | `none`, `assistive`, `decisive` | `none` |
| `art22.humanOversightRequired` | boolean | yes | must be `true` when `decisive` | `true` |
| `personaId` | string or null | no | a persona id of the installation | |
| `memory.perUser` | boolean | no | opt-in memory per user | |
| `skills` | string[] | no | skill ids visible in the workspace, always loaded for this agent | |

Rule: when `automatedDecisionMaking` is not `none`, or `humanOversightRequired` is `true`, `confirmWrites` must be `always`.

Tool entries are `{ kind, id, fields?, connection? }`:

- `kind`: `connector`, `knowledge`, `workflow`, `mcp`, `agent`, `code`, `web`, `frame`, `dataset`, `fn`.
- `id`: for `connector`, `<connector name>` or `<connector name>.<action>`; for `knowledge`, a knowledge set id; for `workflow`, a workflow id; for `agent`, an agent id; for platform tools, the action name. `"*"` (every tool of that kind) is allowed only for `connector`, `knowledge`, `workflow` and `mcp`.
- `fields`: `{ "<input>": { "mode": "fixed" | "preselected", "value": ... } }`. A `fixed` field needs a value.
- `connection`: `{ "mode": "user" }` or `{ "mode": "preselected", "id": "<connection id>" }`.

Form fields: `{ id, type, label, required?, help?, options?, accept?, maxFiles? }`. `id` matches `^[a-z][a-z0-9_]{0,63}$`. `type` is `text`, `multiline`, `number`, `checkbox`, `date`, `email`, `select`, `multiselect` or `file`. `select` and `multiselect` need `options [{value, label}]`. `file` takes `accept` (media types) and `maxFiles` (1 to 10).

Output fields: `{ id, type, description?, values?, required? }`. `type` is `text`, `number`, `boolean`, `enum` or `json`. An `enum` needs `values`. With `output` set, the agent ends each run by returning these fields.

## Full examples

### A blueprint that uses a pack template, a knowledge parameter and web search

```json
{
  "v": 2, "kind": "bundle", "id": "acme.invoice-desk", "version": "1.0.0", "title": "Invoice desk",
  "publisher": { "name": "Acme Example Ltd", "keyId": "pub-0123456789ab" },
  "requires": { "platform": ">=1.0.0" },
  "parameters": [
    { "id": "target_workspace", "type": "workspace", "label": "Workspace", "required": false },
    { "id": "policies", "type": "string", "label": "Knowledge set with the booking rules", "required": false }
  ],
  "declarations": {
    "v": 1, "licence": "Apache-2.0",
    "dataFlows": [
      { "purpose": "Read invoices the person shares in the conversation", "data": ["invoice documents"], "personalData": true, "destination": "installation" },
      { "purpose": "Look up a supplier on the web when asked", "data": ["supplier names"], "personalData": false, "destination": "web-search" }
    ],
    "egress": [],
    "aiUse": { "intendedPurpose": "Drafts booking proposals that a person checks", "annexIII": false, "humanOversight": "A person confirms every write before it happens" },
    "attestations": { "ownsRights": true, "noProhibitedPractice": true }
  },
  "items": [
    { "kind": "agent-blueprint", "schemaVersion": 1, "id": "invoice-clerk", "scope": "install",
      "spec": { "$ref": "content/invoice-clerk.json" } },
    { "kind": "template", "schemaVersion": 1, "id": "invoice-summary-approval", "scope": "install",
      "spec": { "$ref": "content/invoice-summary-approval.json" } }
  ]
}
```

`content/invoice-clerk.json`:

```json
{
  "name": "Invoice clerk",
  "description": "Reads invoices, names supplier, amount and cost centre, and drafts the booking proposal.",
  "category": "finance",
  "icon": "receipt",
  "instructions": "You help the accounts team. For each invoice, name the supplier, the amount and the cost centre, check them against the booking rules, and draft a booking proposal. Never book anything yourself.",
  "starters": ["Check this invoice", "Draft the booking proposal"],
  "model": { "tier": "local-advanced" },
  "tools": [
    { "kind": "knowledge", "ref": "{{param.policies}}" },
    { "kind": "workflow", "ref": "invoice-summary-approval" },
    { "kind": "web", "ref": "search" },
    { "kind": "frame", "ref": "render" }
  ],
  "skills": [],
  "riskHint": null
}
```

`content/invoice-summary-approval.json` is the template spec from [Templates](/developers/templates). Without the template item in the same pack, import fails. That template starts from a webhook, so the agent can only run it as a certified agent.

### An agent configuration with a form and structured output

```json
{
  "instructions": "You triage incoming support requests. Classify each request, look up the answer in the product handbook, and draft a reply. Ask before sending anything.",
  "model": { "tier": "local-advanced" },
  "temperature": 0.2,
  "tools": [
    { "kind": "knowledge", "id": "ks_handbook" },
    { "kind": "connector", "id": "mail.send_email", "connection": { "mode": "user" } }
  ],
  "input": { "kind": "form", "fields": [
    { "id": "customer", "type": "text", "label": "Customer name", "required": true },
    { "id": "priority", "type": "select", "label": "Priority", "options": [ { "value": "low", "label": "Low" }, { "value": "high", "label": "High" } ] },
    { "id": "attachment", "type": "file", "label": "Ticket export", "accept": ["application/pdf"], "maxFiles": 2 }
  ] },
  "starters": ["Triage this request"],
  "output": { "fields": [
    { "id": "category", "type": "enum", "values": ["billing", "bug", "how_to"], "required": true },
    { "id": "draft_reply", "type": "text", "required": true }
  ] },
  "limits": { "maxSteps": 12, "maxToolCalls": 20, "maxUsd": 1, "maxWallMs": 300000 },
  "approval": { "confirmWrites": "always" },
  "art22": { "automatedDecisionMaking": "assistive", "humanOversightRequired": true },
  "memory": { "perUser": false },
  "skills": []
}
```

`ks_handbook` and `mail.send_email` are placeholders. Tool ids must exist and be enabled in the agent's workspace.

## Install and test

### Blueprint in a pack

1. Sign and import the pack. See [Packs](/developers/packs). Import checks the spec, the same-pack references and the web-search declaration.
2. Activate the pack. If it contains templates, deploy them in the workspace.
3. In **Agents**, choose **Create agent** from the blueprint, or call `POST /api/agents` with `{"workspaceId":"ws-ops","name":"Invoice clerk","blueprintId":"pack:acme.invoice-desk:invoice-clerk"}`. Check `blueprint.skipped[]` in the response.
4. Open the draft, test it, and publish it.

### Agent through the REST API

```bash
# create
curl -X POST https://aancer.example.com/api/agents \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"workspaceId":"ws-support","name":"Support triage","description":"Classifies requests and drafts replies"}'

# save the draft configuration
curl -X PUT https://aancer.example.com/api/agents/$AGENT_ID/draft \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d @agent-config.json      # {"config": {...}}

# preview, then publish
curl https://aancer.example.com/api/agents/$AGENT_ID/publish-preview -H "Authorization: Bearer $TOKEN"
curl -X POST https://aancer.example.com/api/agents/$AGENT_ID/publish \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"changeNote":"First version"}'
```

| Call | Permission | Notes |
|---|---|---|
| `POST /api/agents {workspaceId, name, description?, icon?, blueprintId?}` | `agents.create_own` | `blueprintId` is `pack:<packId>:<itemId>` |
| `PUT /api/agents/{id}/draft {config, ifUpdatedAt?}` | `agents.edit_own` | saves the configuration |
| `PATCH /api/agents/{id}` | `agents.edit_own` | name, description, icon, up to 3 labels |
| `GET /api/agents/{id}/publish-preview` | `agents.publish_own` | shows what publishing would certify |
| `POST /api/agents/{id}/publish {changeNote?}` | `agents.publish_own` | returns `{version, passportId, configHash, warnings}` |
| `GET /api/agents/{id}/versions`, `POST /api/agents/{id}/versions/{n}/restore`, `GET /api/agents/{id}/diff?from=&to=` | | versions |
| `POST /api/agents/{id}/export-for-submission` | `agents.publish_own` and edit access | see below |

### Export an agent as a blueprint pack

`POST /api/agents/{id}/export-for-submission` with `{"packId":"acme.support-triage","licence":"Apache-2.0","ownsRights":true,"noProhibitedPractice":true}` returns a signed one-item blueprint pack, made from the published version. Add `"preview": true` to see the content first. Knowledge, workflow and agent tools become pack parameters. Connections, fixed field values, skills, the form, output, limits, memory and persona are not exported. A tool wildcard, a fixed model route, a code or MCP tool, or anything that looks like a credential stops the export.

### Certified agents

Publishing always issues a passport. In addition, an installation can require certification: then a run may only use the tools, model tier ceiling and budgets that the certificate covers. A knowledge set or workflow added after certification shows "Not certified" until you certify again. Workflows that start from a **webhook, schedule or event** run only for certified agents: "Only certified agents can run workflows that start from a web call, a schedule or an event." Workflows with a Manual or Form start work for every agent.

Certificates are issued by the installation. You cannot write or edit one.

## Common errors

Blueprint import errors appear as `PACK_SCHEMA_INVALID` details with the path `/items/<itemId>/spec/...`.

| Code | Message | Fix |
|---|---|---|
| `AGENT_BLUEPRINT_MODEL` | must be a model tier, written as { "tier": "<name>" }. A blueprint never names a model route | Use `{"tier": "local-advanced"}` |
| `AGENT_BLUEPRINT_TOOL_KIND` | a blueprint cannot carry a tool of kind "code" | Remove `code` and `mcp` tools |
| `AGENT_BLUEPRINT_TOOL_DUPLICATE` | this tool is listed twice | Remove the duplicate |
| `AGENT_BLUEPRINT_REF` | must be a pack parameter, written as {{param.<id>}} | Knowledge tools always use a parameter |
| `AGENT_BLUEPRINT_REF` | names the template "...", which is not an item of this pack | Add the template item, or use a parameter |
| `AGENT_BLUEPRINT_WEB_UNDECLARED` | web search needs a declared data flow with the destination "web-search" | Add the data flow to `declarations` |
| (shape) | must NOT have additional properties / must NOT have more than 12 items | Fix shape errors first; the other checks run after them |
| `AGENT_BLUEPRINT_NOT_AVAILABLE` | This blueprint is no longer available: its pack was retired or withdrawn. | Activate the pack again |
| `AGENT_DRAFT_INVALID` | Instructions are required. / Choose exactly one of a model tier or a route. | Fix the configuration |
| `AGENT_DRAFT_INVALID` | A wildcard is only allowed for all connectors, knowledge, workflows or MCP tools. | Name the tool |
| `AGENT_DRAFT_INVALID` | This agent makes automated decisions or requires human oversight, so writes must be confirmed by a person. Set write confirmation to always. | `"confirmWrites": "always"` |
| `AGENT_DRAFT_INVALID` | Decisive automated decisions require human oversight. | `"humanOversightRequired": true` |
| `AGENT_TOOL_UNAVAILABLE` | This tool is not available to you in this workspace. | Enable the connector or knowledge set in that workspace |
| `AGENT_VERSION_CONFLICT` | (409) | Reload and retry with the new `ifUpdatedAt` |
| `CLOUD_TIER_NOT_ALLOWED` | | The workspace policy refuses `cloud-reasoning`; use a local tier |

## Limits and editions

- Up to 64 tools and 12 starters per blueprint. Up to 50,000 characters of instructions.
- Certified agents need the Certified Agents licence feature. Without it, agents still publish with a passport, but they cannot use webhook, schedule or event workflows as tools.
- The `cloud-reasoning` tier can be switched off by workspace policy.
- Check your edition on [aancer.ai/pricing](https://aancer.ai/pricing).
