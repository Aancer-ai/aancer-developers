---
title: Skills | AANCER Developers
description: Write AANCER skills: reusable instructions that shape how chat and agents work. SKILL.md format, the skill pack item, enable and mandate rules.
---

## Skills

A skill is a named block of instructions, with optional reference files and preferred connectors, that changes how the AI works in chat and in agents. For example, a "Vendor review" skill lays down the method, scoring and output format for a supplier review. Skills live in the skills library of a workspace. In chat, the model sees an index of enabled skills (name and description) and loads the one it needs. An administrator can also **mandate** a skill in a workspace, so its instructions apply to every chat there. Agents can attach skills that always load for that agent.

Skills come from three places: users (a form or a SKILL.md upload), skill ZIP files, and signed packs. Skills from a pack arrive switched off in every workspace until an administrator enables or mandates them.

## Quick start

Write a `SKILL.md` file and upload it under **Library > Skills**.

```markdown
---
name: Vendor review
description: Structured review of a new supplier: risk, contract terms, data protection.
connectors: [google-drive]
---
# Vendor review

1. Identify the vendor and the service.
2. Score financial, operational and data-protection risk (low, medium, high) with one reason each.
3. List contract terms to negotiate.
4. End with a recommendation: proceed, proceed with conditions, or stop.
```

To ship the same skill in a pack, use this item:

```json
{
  "kind": "skill",
  "schemaVersion": 1,
  "id": "vendor-review",
  "scope": "install",
  "spec": {
    "id": "vendor-review",
    "name": "Vendor review",
    "description": "Structured review of a new supplier: risk, contract terms, data protection.",
    "instructions": "# Vendor review\n\n1. Identify the vendor and the service.\n2. Score financial, operational and data-protection risk (low, medium, high) with one reason each.\n3. List contract terms to negotiate.\n4. End with a recommendation: proceed, proceed with conditions, or stop.",
    "connectors": ["google-drive"],
    "triggers": ["vendor review", "new supplier"]
  }
}
```

## File layout

### SKILL.md

```text
---
name: <one line, at most 120 characters>
description: <one line, at most 1000 characters>
connectors: [<name>, <name>]        # optional, inline list or "- item" list, at most 20
---
<markdown body: the instructions, at most 20,000 characters>
```

- The file starts with a `---` front matter block.
- `name` and `description` are single lines. Multi-line values (`|` or `>`) are refused.
- Values may be in double or single quotes.
- Other keys in the front matter are ignored on upload.

### Skill ZIP

`SKILL.md` at the root, or inside one top-level folder, plus reference files next to it.

```text
vendor-review.zip
  vendor-review/
    SKILL.md
    scorecard-template.xlsx
    checklist.md
```

Allowed file types: `md`, `txt`, `csv`, `json`, `pdf`, `png`, `jpg`, `jpeg`, `docx`, `xlsx`. Every file is scanned for malware.

### Skill pack

```text
acme-business-skills/
  manifest.json
  content/
    vendor-review.json        # skill spec
    contract-check.json       # another skill spec
```

Pack skills cannot carry reference files. Put everything the model needs into `instructions`.

## Field reference

JSON Schema: [skill.schema.json](https://aancer.ai/dev/schemas/skill.schema.json)

### Skill spec (pack item)

| Field | Type | Required | Rules |
|---|---|---|---|
| `id` | string | yes | `^[a-z0-9][a-z0-9._-]{0,63}$`. Use the same value as the item id |
| `name` | string | yes | 1 to 120 characters, not blank |
| `description` | string | yes | 1 to 1000 characters, not blank. The model reads it to decide when to load the skill |
| `instructions` | string | yes | 1 to 20,000 characters, Markdown |
| `connectors` | string[] | no | at most 20 connector names, each `^[a-z0-9@][a-z0-9@/._-]{0,99}$` |
| `triggers` | string[] | no | at most 10 phrases, each 1 to 80 characters |

No other fields are allowed.

At install, `triggers` are added to the description as ` Use when: a; b; c.` Keep `description` plus the `Use when:` text under 1000 characters in total, or that skill will not install.

`connectors` are a hint. They tell the model which connectors suit the skill. They grant no access.

### JSON body for the REST API

`POST /api/skills?workspaceId=<ws>` with `{ name, description, instructions, connectors?, scope? }`. `scope` is `private` (default) or `workspace`.

## Full examples

### A complete SKILL.md

```markdown
---
name: Vendor review
description: Runs a structured due-diligence review of a supplier or software vendor, tiered by how critical it is, with a weighted scorecard across security, privacy, financial health, contract, service and exit risk.
---
# Vendor review

## Purpose
Help a buyer decide whether a vendor is fit to rely on, and on what terms, with effort proportional to the risk.

## Inputs to ask for
1. The vendor, the product or service, and what it will be used for.
2. Spend per year, contract length and how many users or processes depend on it.

## Method
1. **Tier the vendor** (tier 1 critical, tier 2 important, tier 3 low).
2. **Review each area** and score it 1 to 5 with the evidence.
3. **Weight the areas** by tier and compute the weighted score out of 5.
4. **Recommend** approve, approve with conditions, or reject.

## Output format
1. **Recommendation** with tier and weighted score.
2. **Scorecard:** Area, Weight, Score, Evidence, Gaps.

## Limits
The review relies on what the vendor and the user provide; it does not verify claims independently.
```

### The same skill as a pack

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
    { "kind": "skill", "schemaVersion": 1, "id": "vendor-review", "scope": "install", "spec": { "$ref": "content/vendor-review.json" } }
  ]
}
```

`content/vendor-review.json`:

```json
{
  "id": "vendor-review",
  "name": "Vendor review",
  "description": "Runs a structured due-diligence review of a supplier or software vendor, tiered by how critical it is, with a weighted scorecard across security, privacy, financial health, contract, service and exit risk.",
  "instructions": "# Vendor review\n\n## Purpose\nHelp a buyer decide whether a vendor is fit to rely on, and on what terms, with effort proportional to the risk.\n\n## Method\n1. **Tier the vendor**.\n2. **Review each area** and score it 1 to 5 with the evidence.\n3. **Recommend** approve, approve with conditions, or reject.\n\n## Output format\n1. **Recommendation** with tier and weighted score.\n2. **Scorecard:** Area, Weight, Score, Evidence, Gaps.",
  "triggers": ["vendor review", "supplier due diligence", "should we use this vendor", "third-party risk", "vendor scorecard", "compare these suppliers"]
}
```

## Install and test

### User skills

| Action | API | Permission |
|---|---|---|
| Create from JSON | `POST /api/skills?workspaceId=<ws>` with the JSON body, returns 201 | `skills.manage_own` |
| Upload SKILL.md or ZIP | `POST /api/skills?workspaceId=<ws>` as multipart: one file, optional field `scope=workspace`, at most 20 MB | `skills.manage_own` |
| List | `GET /api/skills?workspaceId=<ws>` returns items with `enabled`, `mandated`, `locked`. Admins add `&all=1` to see pack skills that are off | `chat.use` |
| Edit, delete | `PUT /api/skills/{id}`, `DELETE /api/skills/{id}` | `skills.manage_own` |
| Export | `GET /api/skills/{id}/export.zip?workspaceId=<ws>` | `chat.use` |
| Switch on or off for me | `PUT /api/me/skills/{id} {enabled, workspaceId}` | `chat.use` |

UI: **Library > Skills**.

```bash
curl -X POST "https://aancer.example.com/api/skills?workspaceId=ws-procurement" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@SKILL.md" -F "scope=workspace"
```

### Pack skills

1. Sign, import and activate the pack. See [Packs](/developers/packs).
2. Enable the skill per workspace: `PUT /api/skills/{id}/workspaces {"workspaces": ["ws-procurement"]}`. The installed skill id is `pack:<packId>:<itemId>`.
3. Or mandate it: `PUT /api/skills/{id}/mandate {"workspaces": ["ws-procurement"], "alsoInAgents": true}`. A mandated skill applies to every chat in that workspace, and to agents when `alsoInAgents` is true.

Both need `skills.mandate` and admin rights in every changed workspace. Users cannot edit pack skills. A new pack version updates the content and keeps the enable and mandate choices. Retiring the pack removes the skill.

### Test it

Open a chat in the workspace and ask something that matches the description or a trigger phrase. If the answer does not follow the skill, make the description say more clearly when the skill applies, or mandate the skill in a test workspace to check the instructions on their own.

## Common errors

| Code | Message | Fix |
|---|---|---|
| `SKILL_INVALID` | the skill needs a name / the name is longer than 120 characters | |
| `SKILL_INVALID` | the skill needs a description / the description is longer than 1000 characters | For pack skills, count the `Use when:` text too |
| `SKILL_INVALID` | the skill has no instructions / the instructions are longer than 20000 characters | |
| `SKILL_INVALID` | invalid connector name: "..." / at most 20 connectors | Lower-case connector names, for example `google-drive` |
| `SKILL_INVALID` | SKILL.md must start with a front matter block between --- lines | |
| `SKILL_INVALID` | multi-line name is not supported; keep it on one line | |
| `SKILL_INVALID` | the ZIP has no SKILL.md at its root / file type not allowed / the ZIP is larger than 20 MB / the ZIP holds more than 200 files | |
| `SKILL_INVALID` | the skill was refused by content screening | Remove text that tries to override system rules or hide instructions |
| `SKILL_INVALID` | a workspace skill needs a workspace | Pass `workspaceId` |
| `SKILL_INVALID` | only skills installed from a pack are enabled per workspace | Use mandate, or ship the skill in a pack |
| `SKILL_NAME_TAKEN` | a skill named "..." already exists in this workspace | Names are unique per scope, ignoring case |
| `SKILL_MANDATE_LIMIT` | workspace ... already has 8 mandated skills | Remove a mandate first |
| `FORBIDDEN` | this skill is mandated in this workspace and cannot be switched off | |
| Pack import | `/items/<id>/spec: must NOT have additional properties` | Only the six fields in the table. There is no `files` field |

## Limits and editions

- Name 120 characters, description 1000, instructions 20,000. Up to 20 connectors and 10 triggers.
- ZIP upload: at most 20 MB and 200 files.
- The chat index shows up to 30 enabled skills. Up to 8 skills can be mandated per workspace.
- Skills are controlled by permissions: `skills.manage_own`, `skills.mandate`, `chat.use`.
- Check your edition on [aancer.ai/pricing](https://aancer.ai/pricing).
