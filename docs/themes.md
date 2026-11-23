---
title: Themes and branding | AANCER Developers
description: Brand AANCER with a theme pack: colour tokens, fonts, logos, login page and e-mail colours, plus locale overlays that rename UI words.
---

## Themes

The look of AANCER is a set of design tokens such as `--bg`, `--ac` and `--t0`, defined for seven theme blocks: `light` (default), `dark`, `midnight`, `high-contrast`, `trust-authority`, `legal` and `terminal`. A **theme pack** is a signed pack with one `theme` item. It overrides those tokens and sets the platform name, tagline, fonts, logos, login page and e-mail colours. It is corporate identity as data: no code, no redeploy, nothing loaded from the internet. Fonts and logos ship inside the pack.

A theme can apply to the whole installation (including the login page and invitation e-mails) or to one workspace (the app shell only). A `locale` item in the same pack can rename UI words to match your organisation's vocabulary.

Without a pack, an administrator can set simple branding by hand under **Platform Settings > Branding**.

## Quick start

A theme with tokens only, no files. Use schema version 2.

```json
{
  "v": 2, "kind": "bundle", "id": "acme.ci", "version": "1.0.0", "title": "Acme corporate identity",
  "publisher": { "name": "Acme Example Ltd", "keyId": "pub-0123456789ab" },
  "requires": { "platform": ">=1.0.0" },
  "items": [
    {
      "kind": "theme", "schemaVersion": 2, "id": "acme-ci", "scope": "install",
      "spec": {
        "id": "acme-ci",
        "platformName": "Acme Cloud",
        "tagline": "Sovereign AI for Acme",
        "defaultTheme": "light",
        "typography": { "ui": "system-ui, sans-serif" },
        "themes": {
          "light": { "--bg": "#FAFAF7", "--s1": "#FAFAF7", "--s2": "#FFFFFF", "--t0": "#1B2430", "--ac": "#0F6E74", "--aci": "#FFFFFF", "--pr": "#0B1F3A" },
          "dark":  { "--bg": "#0E1420", "--s1": "#0E1420", "--s2": "#151C2A", "--t0": "#E9EDF3", "--ac": "#5CC6C9", "--aci": "#0B1F22" }
        },
        "login": { "backgroundColor": "#0B1F3A", "tagline": "Welcome to Acme Cloud", "legalFooter": "Acme Example Ltd" },
        "email": { "headerBackground": "#0B1F3A", "buttonColor": "#0F6E74" }
      }
    }
  ]
}
```

Keep the item `id` and `spec.id` equal.

## File layout

```text
acme-ci/
  manifest.json            # one theme item, "spec": {"$ref": "content/theme.json"}
  content/
    theme.json             # the theme document
    fonts/<name>.woff2     # woff2 only, at most 2 MiB each
    logos/<name>.png       # png, svg, jpg or ico, at most 2 MiB each
```

File names under `fonts/` and `logos/` use lower-case `[a-z0-9._-]` only. `aancer-pack sign` lists every file in `assets` with its hash.

## Field reference

JSON Schema: [theme.schema.json](https://aancer.ai/dev/schemas/theme.schema.json). The root is the version 2 theme. `$defs/themeV1` is the simple branding form and `$defs/locale` is the locale overlay.

### Theme item

| Field | Type | Required | Rules |
|---|---|---|---|
| `kind` | string | yes | `"theme"` |
| `schemaVersion` | integer | yes | `2`. Version `1` is the simple six-field branding form |
| `id` | string | yes | `^[a-z0-9][a-z0-9._-]{0,63}$`, equal to `spec.id` |
| `scope` | string | no | `install` (default) or `workspace`. One active theme per installation and one per workspace |
| `workspace` | string | if scope is `workspace` | a workspace id or `{{param.<id>}}` |
| `spec` | object | yes | the theme document, or `{"$ref": "content/theme.json"}` |

### Theme document (version 2)

| Field | Type | Required | Rules |
|---|---|---|---|
| `id` | string | yes | `^[a-z0-9][a-z0-9._-]{0,63}$` |
| `platformName` | string | yes | 1 to 64 characters. Replaces "AANCER" in the shell and on the login page |
| `tagline` | string | no | at most 120 characters |
| `defaultTheme` | string | no | the block a new user sees first: `light`, `dark`, `midnight`, `high-contrast`, `trust-authority`, `legal`, `terminal` |
| `fonts` | array | no | at most 12 font files |
| `fonts[].family` | string | yes | 1 to 64 characters, the name you use in `typography` |
| `fonts[].src` | string | yes | `content/fonts/<file>.woff2`, a real woff2 file |
| `fonts[].weight` | string | no | for example `"400"` or `"400 700"`. Default `"400"` |
| `fonts[].style` | string | no | `normal` or `italic` |
| `fonts[].display` | string | no | `swap` (default), `block`, `fallback`, `optional`, `auto` |
| `fonts[].unicodeRange` | string | no | at most 200 characters |
| `typography` | object | no | CSS font stacks: `ui`, `mono`, `display`, `label`, each at most 200 characters |
| `logos` | object | no | `light`, `dark`, `monochrome`, `favicon`, `emailHeader`. Each a path under `content/logos/` |
| `themes` | object | yes | keys are theme block ids; `light` is required. Each block maps token to value |
| `login` | object | no | `backgroundColor`, `backgroundImage` (path under `content/logos/`), `tagline` (120), `legalFooter` (500). Install scope only |
| `email` | object | no | `headerBackground`, `bodyBackground`, `textColor`, `buttonColor`, each a colour. Install scope only |

Every family in `typography` must be declared in `fonts` or be a generic family such as `system-ui`, `sans-serif`, `serif`, `monospace`, `ui-monospace`, `ui-sans-serif`, `-apple-system`, `'segoe ui'`, `roboto`, `'helvetica neue'`, `arial`, `menlo` or `consolas`.

Colour values: `#rgb`, `#rrggbb`, `rgb(r,g,b)` or `rgba(r,g,b,a)` with `a` written as `0`, `1` or a decimal such as `0.3` or `.3`. No `var()`, `hsl()` or colour names. `--shadow-card` takes free CSS of at most 200 characters.

The theme document must not contain `http:`, `https:`, `//`, `data:` or `url(` anywhere. This includes text fields such as the tagline and the legal footer. Ship files in `content/` instead.

SVG logos must not contain `<script`, event handler attributes, `<foreignObject` or references to external resources.

### Tokens you can set

| Token | Paints |
|---|---|
| `--bg` | page background |
| `--s0` to `--s4` | surfaces, lowest to highest |
| `--t0`, `--t1`, `--t2` | text: headings, body, muted |
| `--ac`, `--aci`, `--acs`, `--acb` | accent, text on accent, accent surface, accent border |
| `--pr`, `--prs`, `--prb` | primary buttons, surface, border |
| `--te`, `--tei`, `--tes`, `--teb` | success colours |
| `--am`, `--ams`, `--amb` | warning colours |
| `--re`, `--res`, `--reb` | danger colours |
| `--b`, `--bm`, `--bs` | borders: light, medium, strong |
| `--scrollbar` | scrollbar thumb |
| `--anchor`, `--anchor-raised`, `--ink-on-anchor`, `--ink-on-anchor-dim` | the dark navigation rail and its text |
| `--shadow-card` | card shadow |

Fonts are set through `typography`, not tokens. Motion tokens cannot be changed.

### How blocks combine

Tokens you leave out keep the stock value. Your `light` block is applied over the stock light block. Every other block is the stock block, plus your accent colours (`--ac`, `--aci`, `--acs`, `--acb`, `--pr`, `--prs`, `--prb`), plus your own block for that id if you wrote one. The dark blocks (`dark`, `midnight`, `trust-authority`, `terminal`) take the accent from your `dark` block if it sets one. Otherwise AANCER brightens your light accent for dark backgrounds.

### Contrast checks

Every resolved block is checked:

- Text pairs warn below 4.5:1: `--t0` on `--bg`, `--t0` on `--s2`, `--t1` on `--s1`, `--t2` on `--s1`, `--aci` on `--ac`, `--tei` on `--te`, `--ink-on-anchor` on `--anchor`, `--ink-on-anchor-dim` on `--anchor`.
- Interface colours warn below 3:1: `--ac`, `--pr`, `--re`, `--am`, `--te` on `--s1`.
- Import is refused below 1.5:1 for `--t0` on `--bg`, `--t0` on `--s2`, `--aci` on `--ac` and `--ink-on-anchor` on `--anchor`.

### Simple branding (version 1)

| Field | Type | Required | Rules |
|---|---|---|---|
| `platformName` | string | no | 1 to 64 characters |
| `tagline` | string | no | at most 160 characters |
| `logoUrl`, `logoDarkUrl`, `faviconUrl` | string or null | no | a relative path served by the installation, such as `/branding/logo.png` |
| `primaryColor` | string | yes | `#rrggbb`, becomes the accent |
| `secondaryColor` | string | yes | `#rrggbb`, becomes the primary button colour |
| `loginBackgroundColor` | string or null | no | `#rrggbb` |
| `defaultTheme` | string | no | `light`, `dark`, `midnight`, `high-contrast` |

Use version 2 for new work.

### Locale overlay

A `locale` item renames UI strings: `{ "locale": "de", "keys": { "<UI key>": "<text>" } }`.

| Field | Rules |
|---|---|
| `locale` | `en`, `de`, `es` or `ar` |
| `keys` | 1 to 2000 entries. Each key must be an existing UI string key. Each value at most 500 characters |

Values cannot contain `<` or `>` or the names of third-party products. Keys starting with `_meta` are not overridable. Placeholders such as `{{count}}` must match the original string. A locale overlay applies to the whole installation: use install scope, one overlay per locale.

## Full examples

### Theme with a font and logos, scoped to one workspace, plus a locale overlay for the installation

`manifest.json`:

```json
{
  "v": 2, "kind": "bundle", "id": "acme.workspace-ci", "version": "1.0.0", "title": "Acme workspace identity",
  "publisher": { "name": "Acme Example Ltd", "keyId": "pub-0123456789ab" },
  "requires": { "platform": ">=1.0.0" },
  "parameters": [ { "id": "target_workspace", "type": "workspace", "label": "Workspace", "required": true } ],
  "items": [
    { "kind": "theme", "schemaVersion": 2, "id": "acme-ws-ci", "scope": "workspace", "workspace": "{{param.target_workspace}}",
      "spec": { "$ref": "content/theme.json" } },
    { "kind": "locale", "schemaVersion": 1, "id": "de-words", "scope": "install",
      "spec": { "locale": "de", "keys": { "nav.knowledge": "Wissen" } } }
  ]
}
```

`content/theme.json`:

```json
{
  "id": "acme-ws-ci",
  "platformName": "Acme",
  "tagline": "Your data. Your AI.",
  "defaultTheme": "light",
  "fonts": [
    { "family": "Acme Sans", "src": "content/fonts/acme-sans.woff2", "weight": "400 700", "style": "normal", "display": "swap" }
  ],
  "typography": {
    "ui": "'Acme Sans', system-ui, sans-serif",
    "display": "'Acme Sans', system-ui, sans-serif"
  },
  "themes": {
    "light": {
      "--bg": "#ffffff", "--s0": "#f3f6f7", "--s1": "#ffffff", "--s2": "#ffffff", "--s3": "#f3f6f7", "--s4": "#e6ecee",
      "--t0": "#14232a", "--t1": "#3c4f57", "--t2": "#5b6c73",
      "--ac": "#0f6e74", "--aci": "#ffffff", "--acs": "#e3f2f2", "--acb": "rgba(15,110,116,0.30)",
      "--pr": "#14232a", "--prs": "#e9eef0", "--prb": "rgba(20,35,42,0.30)",
      "--b": "#d3dcdf", "--bm": "#b8c5ca", "--bs": "#8a9aa0", "--scrollbar": "#b8c5ca",
      "--anchor": "#14232a", "--anchor-raised": "#22343c", "--ink-on-anchor": "#ffffff", "--ink-on-anchor-dim": "#c3cfd3",
      "--shadow-card": "0 1px 3px rgba(20,35,42,0.08), 0 4px 14px rgba(20,35,42,0.06)"
    },
    "dark": {
      "--bg": "#0f1a1f", "--s0": "#0a1317", "--s1": "#0f1a1f", "--s2": "#17252b", "--s3": "#1f2f36", "--s4": "#2a3c44",
      "--t0": "#eef3f4", "--t1": "#c3cfd3", "--t2": "#9fb0b6",
      "--ac": "#5cc6c9", "--aci": "#0a1317", "--acs": "#12343a", "--acb": "rgba(92,198,201,0.35)",
      "--pr": "#c3cfd3", "--prs": "#1f2f36", "--prb": "rgba(195,207,211,0.35)",
      "--b": "#2a3c44", "--bm": "#3a4f58", "--bs": "#4e646d", "--scrollbar": "#3a4f58",
      "--anchor": "#081014", "--anchor-raised": "#1f2f36", "--ink-on-anchor": "#eef3f4", "--ink-on-anchor-dim": "#9fb0b6",
      "--shadow-card": "0 1px 3px rgba(0,0,0,0.45), 0 4px 14px rgba(0,0,0,0.3)"
    }
  },
  "logos": {
    "light": "content/logos/logo.png",
    "dark": "content/logos/logo-dark.png",
    "favicon": "content/logos/mark.png"
  }
}
```

The folder also holds `content/fonts/acme-sans.woff2`, `content/logos/logo.png`, `content/logos/logo-dark.png` and `content/logos/mark.png`. `login` and `email` are left out because they apply to install-scoped themes only.

## Install and test

### In the UI

1. **Platform Settings > Extensions > Trust keys > Add trust key**, once per publisher.
2. **Import pack**. The summary lists items, fonts, logos and contrast warnings.
3. **Activate**. Pick the workspace if the theme is workspace-scoped.
4. Reload the browser.

Under **Platform Settings > Look & feel**, an administrator can switch between stock and imported themes, and offer themes for users to choose. Retiring the pack returns to the stock look, or to the manual branding if one was set.

### With the REST API

| Call | Permission |
|---|---|
| `POST /api/extensions/packs/import` (raw bytes) | `extensions.manage` |
| `POST /api/extensions/packs/{packId}/activate {version, parameters}` | `extensions.manage` (`extensions.manage_own` for workspace-only packs) |
| `GET /api/extensions/themes` | lists stock and imported themes |
| `POST /api/extensions/themes/apply {packId or null, version?}` | switch the active theme |
| `PUT /api/extensions/themes/{packId}/offer {offered: true}` | let users choose it |
| `PUT /api/appearance/me {packId or null}` | a user picks an offered theme (`appearance.choose`) |
| `GET /api/branding` | public, the active branding |
| `GET`, `PUT /api/admin/branding` | manual branding without a pack (`platform.configure_branding`) |

While an install-scoped theme pack is active, manual branding is read-only.

Test in an EVAL or test installation first: import shows every contrast warning before anything changes.

## Common errors

| Message | Fix |
|---|---|
| external or inline resources are not allowed (no http, //, data:, url() anywhere) (`THEME_EXTERNAL_ASSET`) | Ship files in `content/`. Remove URLs and `//` from every text, including tagline and footer |
| `/themes/<id>`: unknown theme id | Use one of the seven block ids |
| `/themes/<id>/<token>`: not a themable token | Use a token from the table. Fonts go in `typography` |
| colour must be #rgb, #rrggbb or rgba(r,g,b,a) | No `var()`, `hsl()` or names |
| `/typography/<k>`: font family '...' is not declared in fonts[] and is not a generic family | Declare the font in `fonts` |
| must be a pack file under content/fonts or content/logos | Fix the path. Lower-case file names only |
| fonts must live under content/fonts/ / logos must live under content/logos/ | Move the file |
| `<path>` is not in the pack (`PACK_SIGNATURE_INVALID`) | Add the file and sign again |
| `<path>` is not a woff2 font (`THEME_ASSET_MIME`) | Convert the font to woff2 |
| `<path>`: contains `<script>` / an event handler attribute / references an external resource (`THEME_ASSET_MIME`) | Clean the SVG |
| `<path>` exceeds ... bytes (`THEME_ASSET_TOO_LARGE`) | Fonts and logos at most 2 MiB each |
| `<a>` on `<b>` is illegible (`THEME_ILLEGIBLE`) | Pick colours with more contrast |
| warning `CONTRAST_AA: light --aci on --ac = 3.05:1 (needs 4.5:1)` | Optional, but fix it for readability |
| `THEME_ALREADY_ACTIVE`: Theme pack '...' is already active; retire it first | Retire the other theme, or switch under Look & feel |
| locale: key is not in the shipped bundle (`LOCALE_KEY_UNKNOWN`) | Use an existing UI key |
| locale: markup is not allowed / interpolation slots must match the shipped text | No `<` or `>`; keep the same `{{slots}}` |
| `LOCALE_ALREADY_ACTIVE` | One overlay per locale for the installation |
| locale: vendor names are not allowed in UI copy (`LOCALE_VENDOR_STRING`) | Remove the product name from the text |
| locale: `_meta` keys are not overridable | Remove the key |

## Limits and editions

- Fonts and logos: at most 2 MiB each, 12 fonts per theme. Pack limits apply (see [Packs](/developers/packs)).
- `login` and `email` apply to install-scoped themes only.
- Theme packs are controlled by permissions: `extensions.manage`, `platform.configure_branding`, `appearance.choose`.
- A theme pack changes colours, fonts, logos and names. Removing the "powered by AANCER" attribution is a separate licence feature.
- Check your edition on [aancer.ai/pricing](https://aancer.ai/pricing).
