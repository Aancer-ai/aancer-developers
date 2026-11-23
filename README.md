# AANCER for developers

Everything you need to build extensions for [AANCER](https://aancer.ai), the all-in-one agentic AI platform: workflow templates, agents, skills, themes and branding, connectors, dashboards, event hooks and embedded apps (your own application inside AANCER).

- **Docs:** https://aancer.ai/developers (also as Markdown in [`docs/`](docs/))
- **For AI assistants:** https://aancer.ai/dev/llms.txt holds the full developer text in one file
- **JSON Schemas:** [`schemas/`](schemas/), also at https://aancer.ai/dev/schemas/
- **Examples:** complete packs in [`examples/`](examples/)
- **Builder MCP server:** connect `https://aancer.ai/mcp` in Claude, ChatGPT, Gemini CLI, Cursor or VS Code to read the docs and validate packs (`validate_pack`)
- **Assistants:** an AANCER Builder skill for Claude, and the setup for a Custom GPT and a Gemini Gem, in [`assistants/`](assistants/)

## Build with your AI assistant

Paste this into ChatGPT, Claude or Gemini:

```
Read https://aancer.ai/dev/llms.txt and the schema for the extension type at
https://aancer.ai/dev/schemas/ first. Then build an AANCER pack that <what it should do>.
Output manifest.json and every content/ file, and the aancer-pack commands to sign it.
```

These are docs, examples and schemas only. The AANCER platform is proprietary. The MIT licence in `LICENSE` covers the files in this repository, not the platform.

## Layout


```
docs/                            the developer docs as Markdown (same as aancer.ai/developers)
assistants/                      AANCER Builder: Claude Skill, Custom GPT and Gemini Gem setup
schemas/                         JSON Schemas (draft 2020-12), also published at https://aancer.ai/dev/schemas/
  pack-manifest.schema.json      manifest.json of every pack
  template.schema.json           workflow templates
  agent.schema.json              agent blueprints (and the agent definition for the REST API)
  skill.schema.json              chat and agent skills
  theme.schema.json              themes and white-label branding (plus locale overlays)
  connector.schema.json          connectors
  dashboard.schema.json          datasets, models, widgets and dashboards
  hook.schema.json               event hooks
  app.schema.json                embedded apps (plus navigation links and home cards)
examples/
  templates/request-intake               web call to chat message
  templates/invoice-summary-approval     local AI summary, human approval, post
  agents/invoice-triage                  a small agent blueprint
  agents/invoice-desk                    agent blueprint plus the template it uses, web search declared
  skills/vendor-review                   a skill, with its SKILL.md source
  themes/acme-ci                         a corporate identity theme, tokens only
  connectors/example-echo                connector source for certification
  dashboards/sales-overview              datasets, model, three widgets and a dashboard
  hooks/rejected-approvals               start a workflow when an approval is rejected
  apps/shift-planner                     embedded app with sign-in by one-time code, with app server
  apps/shift-board                       embedded app without sign-in, reads a dataset
```

Each example folder has a `manifest.json`, its item specs under `content/`, and a README.

## Sign a pack

AANCER installs only signed packs. You sign with the `aancer-pack` CLI, which is available as a download for partners and builders. It needs Node 20 or later.

```bash
aancer-pack keygen --out acme.key        # writes acme.key and acme.pub, prints your key id (pub-<12 hex>)
aancer-pack sign manifest.json content/ -o acme.request-intake-1.0.0.ancpack --key acme.key
aancer-pack verify acme.request-intake-1.0.0.ancpack --pubkey acme.pub
```

Put the key id that `keygen` prints into `publisher.keyId` of your manifest before you sign. The examples use the placeholder `pub-0123456789ab`.

## Install and test

There is no validate-only API yet. To test a pack, import it into an EVAL or test workspace:

1. In AANCER, open Platform Settings, then Extensions, then Trust keys, and add your public key with the same key id.
2. Choose Import pack and upload the `.ancpack` file. Import checks everything and changes nothing until you activate.
3. Choose Activate and fill in the parameters, for example the target workspace.

## Connectors

Connector packs are signed by AANCER through certification. Partners submit the connector source; AANCER builds, reviews and signs it. See `examples/connectors/example-echo`.

## Placeholders

All names, hosts and ids are placeholders (`acme`, `example.com`). Replace them with your own.
