# Vendor review (skill)

Pack `acme.business-skills` with one skill item. `SKILL.md` is the human-readable source; `content/vendor-review.json` is the item spec built from it.

Rules to keep:

- At install, the triggers are added to the description as ` Use when: a; b; c.` Keep the description plus that text at or under 1000 characters.
- `connectors` is a hint for the model, not a permission.
- Pack skills arrive switched off. An administrator enables them per workspace, or mandates them.

You can also upload `SKILL.md` directly in Library, Skills, without a pack. A direct upload ignores `triggers`.
