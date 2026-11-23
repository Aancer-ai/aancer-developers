# AANCER builder assistants

One instruction set, three assistants. Each one reads https://aancer.ai/dev/llms.txt and the schemas at https://aancer.ai/dev/schemas/ before it writes a pack.

## Builder MCP server (all assistants)

Connect `https://aancer.ai/mcp` (Streamable HTTP, no authentication) in any MCP client: Claude connectors, Claude Code (`claude mcp add --transport http aancer-builder https://aancer.ai/mcp`), ChatGPT developer mode connectors, Gemini CLI, Cursor, VS Code. It serves the docs, schemas and examples and validates packs with `validate_pack`. Source: `mcp-server/` in the website repo, container `aancer-cs-mcp` on the web host.

## Claude (Skill)

Folder: `claude-skill/aancer-builder/` (SKILL.md). Zip the folder and upload it in Claude: Settings, Capabilities, Skills. For Claude Code, copy it to `~/.claude/skills/aancer-builder/`.

## ChatGPT

Connect the builder MCP server `https://aancer.ai/mcp` as a custom connector in developer mode, with no authentication. For a plain chat, paste the prompt from https://aancer.ai/developers#build-with-your-ai-assistant.

## Gemini (Gem)

Public Gem: https://gemini.google.com/gem/1-QrMUAZtHW0-ooIxLo6OXNqbvnTuxO0C?usp=sharing

It was created at gemini.google.com, Gems, New Gem, with these settings:

- **Name:** AANCER Builder
- **Instructions:** the same SKILL.md body.
- **Knowledge:** add the same `llms.txt` and schema files.

## Keep them current

The docs are generated from `content/developers/` by `scripts/gen_developers.py`. When a release changes a pack format, update the Markdown and schemas there, publish the site, then re-upload the knowledge files to the GPT and the Gem.
