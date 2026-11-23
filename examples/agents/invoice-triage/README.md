# Invoice triage (agent blueprint)

Pack `acme.invoice-triage`. The smallest useful agent blueprint: instructions, one conversation starter, a model tier and two tools.

- `mail.send_email` is a connector tool reference (`<connector>.<action>`). Use a connector that exists in the target installation.
- `frame` with `render` lets the agent show structured results.

After activation nothing runs yet. A person chooses Create agent from the blueprint in Agents. The new agent starts as a draft with safe defaults: write confirmation always on, and run limits of 12 steps, 20 tool calls, 1 USD and 5 minutes.
