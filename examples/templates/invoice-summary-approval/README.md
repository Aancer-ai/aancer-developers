# Invoice summary with approval (workflow template)

Pack `acme.invoice-summary`. A web call trigger, a local AI summary, a human approval step and a post to a chat channel.

What it shows:

- An AI step on a local model tier (`local-standard`) with data classification `internal`.
- The AI Act block filled in, because the template has an AI step: risk class, intended purpose and human oversight.
- Approvers bound through an `approvers` parameter.
- Earlier outputs used with `{{sum}}` and `{{trigger.body.text}}`.

Install: sign, import, activate with `target_workspace` set to the workspace that should get the template.
