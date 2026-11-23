# Example echo (connector source)

A minimal connector with one action that returns its input. This folder is connector source, not a signed pack.

Connector packs are signed by AANCER through certification. You submit the source; AANCER builds the code into `content/piece.tar`, reviews it and signs the pack. An installation accepts connector packs only with the AANCER signature.

Files:

- `package.json`: the package name must be `@aancer/piece-<name>` and the version strict `x.y.z`.
- `src/index.ts`: the connector, written with the AANCER connector framework (`@aancer/connector-framework`, which ships with the aancer-pack connector kit).
- `pack.json`: catalog name, description, category and the hosts the connector may reach (`egressHosts`). This one needs no network, so the list is empty.
- `manifest.json` and `content/connector.json`: the shape of the certified pack manifest and connector item. Certification fills in the real values: the platform `keyId`, the `sha256` of `content/piece.tar`, `framework`, `deps` and `build`, and produces the archive and the signature. The values here are placeholders, so this folder is the source you submit, not a pack you can import.

Rules for your own connector:

- Name every host you call in `egressHosts`. A bare `*` is not allowed. Network access stays closed until an administrator enables the connector.
- For a system that runs at the customer, use `egressFromConnection` so the host comes from the connection.
- Runtime dependencies must use MIT, ISC, BSD-2-Clause, BSD-3-Clause, Apache-2.0 or 0BSD licences, with no install scripts and no native add-ons.
