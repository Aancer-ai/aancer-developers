# Request intake (workflow template)

Pack `acme.request-intake`. A template with two steps: a web call trigger and a connector step that posts the text to a chat channel.

What it shows:

- The chat connection is not in the steps. It is a `connection` parameter bound to `connectorAuth`.
- The channel is a `string` parameter with a default, bound to `connectorInputs.channel`.
- The pack parameter `target_workspace` decides where the template is published. Leave it empty to publish it for the whole installation.

`connector-chat` is a placeholder connector name. Replace it with a connector that is installed in the target installation.

Install: sign the pack, import it under Platform Settings, Extensions, then Activate. The template then shows in the Automations template gallery, and the person who deploys it fills in the parameters.
