# AANCER builder assistants

One instruction set, three assistants. Each one reads https://aancer.ai/dev/llms.txt and the schemas at https://aancer.ai/dev/schemas/ before it writes a pack.

## Builder MCP server (all assistants)

Connect `https://aancer.ai/mcp` (Streamable HTTP, no authentication) in any MCP client: Claude connectors, Claude Code (`claude mcp add --transport http aancer-builder https://aancer.ai/mcp`), ChatGPT developer mode connectors, Gemini CLI, Cursor, VS Code. It serves the docs, schemas and examples and validates packs with `validate_pack`. Source: `mcp-server/` in the website repo, container `aancer-cs-mcp` on the web host.

## Claude (Skill)

Folder: `claude-skill/aancer-builder/` (SKILL.md). Zip the folder and upload it in Claude: Settings, Capabilities, Skills. For Claude Code, copy it to `~/.claude/skills/aancer-builder/`.

## ChatGPT (Custom GPT)

Create at chatgpt.com/gpts/editor with the AANCER account.

- **Name:** AANCER Builder
- **Description:** Builds AANCER extensions: workflow templates, agents, skills, themes, connectors, dashboards, hooks and embedded apps, as packs that validate against the official schemas.
- **Instructions:** paste the body of `claude-skill/aancer-builder/SKILL.md` (everything below the front matter).
- **Knowledge:** upload `llms.txt` from https://aancer.ai/dev/llms.txt and the nine `*.schema.json` files from https://aancer.ai/dev/schemas/. Re-upload after each docs update.
- **Capabilities:** Web search on (so it can fetch the live docs), Code interpreter on (to validate JSON), image generation off.
- **Conversation starters:**
  - Build a workflow template that triages incoming invoices with a human approval.
  - Create a theme pack in our corporate colours.
  - Add our own web app inside AANCER as an embedded app.
  - Write an agent blueprint that answers supplier questions from our knowledge.

## Gemini (Gem)

Create at gemini.google.com, Gems, New Gem, with the AANCER Google account.

- **Name:** AANCER Builder
- **Instructions:** the same SKILL.md body.
- **Knowledge:** add the same `llms.txt` and schema files.

## Keep them current

The docs are generated from `content/developers/` by `scripts/gen_developers.py`. When a release changes a pack format, update the Markdown and schemas there, publish the site, then re-upload the knowledge files to the GPT and the Gem.
