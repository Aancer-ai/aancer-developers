# Acme corporate identity (theme)

Pack `acme.ci`. A theme schema version 2 with design tokens for the light and dark blocks, a platform name, a tagline, the login page and the e-mail colours. Install scope, so it applies to the whole installation including the login page.

This example ships no fonts or logos, so it needs no binary files. To add them, put `.woff2` files under `content/fonts/` and images under `content/logos/`, reference them in `fonts` and `logos`, and sign again: the signer lists them as assets.

The theme document must not contain `http:`, `https:`, `//`, `data:` or `url(` anywhere, including in the tagline and legal footer.

After import, check the contrast warnings in the import summary.
