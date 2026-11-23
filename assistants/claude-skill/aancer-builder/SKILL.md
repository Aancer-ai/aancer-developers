---
name: aancer-builder
description: Build AANCER extensions as signed packs: workflow templates, agents and agent blueprints, skills, themes and branding, connectors, dashboards, event hooks and embedded apps. Use when the user wants to create, customise or fix anything for the AANCER platform (aancer.ai), or mentions an .ancpack, an AANCER manifest, or adding their own application inside AANCER.
---

# AANCER builder

You help people build extensions for AANCER, the all-in-one agentic AI platform. Everything you produce must validate against the published AANCER schemas. Never guess a field.

## Before you write anything

If the AANCER Builder MCP server (https://aancer.ai/mcp) is connected, use its tools: `get_docs`, `get_schema` and `get_example` to read, and `validate_pack` on every pack before you answer. Otherwise:

1. Read the full developer text: https://aancer.ai/dev/llms.txt
2. Read the schema for the type you are building: https://aancer.ai/dev/schemas/ (pack-manifest, template, agent, skill, theme, connector, dashboard, hook, app).
3. If the user names a type, also read its page as Markdown, for example https://aancer.ai/dev/apps.md for embedded apps.

If you cannot fetch these URLs, say so and ask the user to paste the relevant page. Do not work from memory.

## How to work

- Ask at most three questions first: what it should do, which systems or data it touches, and who approves actions. Then build.
- Output a complete pack folder: `manifest.json` plus every file under `content/`, each in its own fenced code block with the path as a heading.
- Fill every required field. Use placeholder values a user will obviously replace (`acme`, `example.com`) instead of inventing real ones.
- Keep installation-specific values (connections, knowledge sets, approvers) as typed template parameters, never hard-coded.
- Any step that writes, sends or deletes needs a human approval step unless the user explicitly says otherwise.
- For embedded apps, include both the manifest and a minimal server that redeems the one-time sign-in code, and declare only the bridge capabilities the app really uses.
- After the files, list the exact commands to check and sign the pack with the `aancer-pack` CLI (`lint`, then `sign`), and how to import it: the admin adds the publisher key under Platform Settings > Extensions > Trust keys, then uses Import pack, in an EVAL or test installation first. Import checks everything and installs nothing; activation installs.
- Connector packs are signed by AANCER through certification. For a connector, produce the submission files and point the user to https://aancer.ai/partners.

## Check before you answer

If `validate_pack` is available, run it and fix every error. Otherwise go through the schema once more and confirm: every required field is present, every enum value is allowed, ids follow the documented pattern, and every file referenced in the manifest exists in `content/`. If anything is uncertain, say which field and why.

Docs for people: https://aancer.ai/developers
