# Invoice desk (agent blueprint plus template)

Pack `acme.invoice-desk`. An agent blueprint that uses a workflow template from the same pack, a knowledge set chosen at activation, and web search.

What it shows:

- `{"kind": "workflow", "ref": "invoice-summary-approval"}` names the template item of this pack. When a person creates the agent, AANCER links the workflow deployed from that template in the same workspace.
- `{"kind": "knowledge", "ref": "{{param.policies}}"}`: a blueprint never names a knowledge set of another installation. It uses a pack parameter.
- The `web` tool needs a `declarations.dataFlows` entry with destination `web-search`.

The template starts from a web call. An agent can use such a workflow as a tool only when it is a certified agent, which needs the Certified Agents licence feature. Workflows with a Manual or Form start work for every agent.
