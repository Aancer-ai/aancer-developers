---
title: Workflow templates | AANCER Developers
description: Build reusable AANCER workflow templates: the record, typed parameters, bindings, workflow steps, validation rules and how to ship them in a pack.
---

## Workflow templates

A workflow in AANCER is a graph of steps: a trigger, AI calls, knowledge lookups, agents, connector actions, human approvals, conditions, loops and more. A **workflow template** is a reusable, reviewed copy of a workflow. Everything that names a resource of one installation is taken out and turned into a typed **parameter**: connections, knowledge sets, agents, personas, datasets, approvers and trigger secrets. The person who deploys the template fills these in. Templates travel between installations as a pack item of kind `template`. Inside an installation you can also create templates from an existing workflow, review them and export them as a pack.

## Quick start

A webhook that posts the request to a chat channel. The chat connection is a parameter.

```json
{
  "kind": "template",
  "schemaVersion": 1,
  "id": "request-intake",
  "scope": "install",
  "spec": {
    "id": "tpl-acme-request-intake",
    "version": 1,
    "workspace": "{{param.target_workspace}}",
    "record": {
      "name": "Request intake",
      "description": "Takes a request and posts it to the team.",
      "icon": "🧩",
      "industry": "operations",
      "complexity": "starter",
      "locale": "en",
      "aiAct": { "riskClass": "unclassified", "annexIiiCategory": "none", "intendedPurpose": "", "humanOversight": "", "transparencyNote": "" },
      "compliance": { "dataCategories": [], "dataSubjects": [], "lawfulBasis": "", "retentionDays": null },
      "parameters": [
        { "id": "conn_1", "type": "connection", "label": "Chat connection", "required": true, "connector": "connector-chat" }
      ],
      "bindings": [
        { "parameterId": "conn_1", "stepId": "a", "path": "connectorAuth" }
      ],
      "translations": {},
      "flow": {
        "name": "Request intake",
        "rootStepId": "t",
        "steps": [
          { "id": "t", "type": "trigger", "name": "When called", "position": { "x": 0, "y": 0 }, "triggerType": "webhook", "nextStepId": "a" },
          { "id": "a", "type": "connector", "name": "Post", "position": { "x": 0, "y": 120 }, "connectorPiece": "connector-chat", "connectorAction": "send", "connectorInputs": { "channel": "general" } }
        ]
      },
      "builtAgainst": { "catalogHash": "", "platformVersion": "1.0.0" },
      "createdAt": "2026-11-15T00:00:00.000Z"
    }
  }
}
```

Put this item in a pack manifest and declare the workspace parameter:

```json
"parameters": [ { "id": "target_workspace", "type": "workspace", "label": "Workspace", "required": false } ]
```

`connector-chat` is a placeholder. Use the connector name of a real connector in the target installation.

## File layout

```text
acme-request-intake/
  manifest.json                  # pack manifest, one template item
  content/
    request-intake.json          # the item spec: { id, version, workspace?, record }
```

A template is one pack item. Its `spec` is inline or in `content/<name>.json`. If the administrator should choose the workspace, declare a `workspace` pack parameter (for example `target_workspace`, `required: false`) and set `spec.workspace` to `{{param.target_workspace}}`. If it stays unbound, the template is published for the whole installation.

## Field reference

JSON Schema: [template.schema.json](https://aancer.ai/dev/schemas/template.schema.json)

### Item spec

| Field | Type | Required | Rules |
|---|---|---|---|
| `id` | string | yes | 1 to 64 characters. The installation computes its own row id on import |
| `version` | integer | yes | 1 or higher |
| `workspace` | string | no | exactly `{{param.<id>}}` of a `workspace` pack parameter. A literal workspace id is refused |
| `record` | object | yes | the template record below |

### Template record

| Field | Type | Required | Rules |
|---|---|---|---|
| `name` | string | yes | 1 to 80 characters |
| `description` | string | yes | 1 to 300 characters |
| `longDescription` | string | no | detail text |
| `icon` | string | yes | 1 to 40 characters, usually an emoji |
| `industry` | string | yes | `healthcare`, `legal`, `financial`, `hr`, `manufacturing`, `retail`, `saas`, `marketing`, `operations`, `devops` |
| `industries` | string[] | no | extra tags |
| `complexity` | string | yes | `starter`, `intermediate`, `advanced` |
| `estimatedTimeSaved` | string | no | for example `"3h/week"` |
| `locale` | string | yes | at most 20 characters, for example `en` |
| `dataClassification` | string | no | free text |
| `aiAct` | object | yes | `{ riskClass, annexIiiCategory, intendedPurpose, humanOversight, transparencyNote }`. `riskClass`: `unclassified`, `minimal`, `limited`, `high`, `prohibited` |
| `compliance` | object | yes | `{ dataCategories: string[], dataSubjects: string[], lawfulBasis, retentionDays }`. `lawfulBasis`: `contract`, `consent`, `legitimate-interest`, `legal-obligation` or `""`. `retentionDays`: integer 0 to 36500, or `null` |
| `parameters` | array | yes | at most 50. See Template parameters |
| `bindings` | array | yes | which parameter fills which step field |
| `translations` | object | yes | `{ "<locale>": { name?, description?, longDescription?, parameters?: { "<paramId>": { label?, help? } } } }`. May be `{}` |
| `flow` | object | yes | `{ name, description?, rootStepId, steps }`, 2 to 200 steps |
| `builtAgainst` | object | no | `{ catalogHash, platformVersion }` |
| `createdAt` | string | yes | ISO 8601 date and time, for example `2026-11-20T00:00:00.000Z` |

Do not send `derived`. The installation computes it.

### Template parameters

| Field | Type | Required | Rules |
|---|---|---|---|
| `id` | string | yes | `^[a-z][a-z0-9_]{0,39}$`, unique |
| `type` | string | yes | `connection`, `knowledgeSet`, `agent`, `persona`, `dataset`, `approvers`, `secret`, `string`, `number`, `boolean`, `select` |
| `label` | string | yes | not empty |
| `help` | string | no | |
| `required` | boolean | no | |
| `default` | string, number or boolean | no | must match the type. Not allowed for `connection`, `knowledgeSet`, `agent`, `persona`, `dataset`, `approvers`, `secret` |
| `options` | string[] | for `select` | at least one; a `select` default must be one of them |
| `connector` | string | no | for `connection`: the connector it must belong to |

These template parameters are separate from pack parameters. Pack parameters are bound when the pack is activated. Template parameters are filled each time someone deploys the template.

### Bindings

A binding is `{ "parameterId": "...", "stepId": "...", "path": "..." }`. `path` is dot-separated. A parameter may fill only these fields:

| Path | Parameter type |
|---|---|
| `connectorAuth` | `connection` |
| `knowledgeSetId` | `knowledgeSet` |
| `agentRef`, `agentId` | `agent` |
| `personaId` | `persona` |
| `datasetId` | `dataset` |
| `approvers` | `approvers` |
| `triggerAuthFields.<key>` (trigger step only) | `secret` (a secret fills nothing else) |
| `connectorInputs.<key>` (not `connectorInputs.auth`), `triggerInputs.<key>` | `string`, `number`, `boolean`, `select` |
| `systemPrompt`, `userPromptTemplate`, `routingInstructions`, `agentGoal`, `routerQuestion`, `searchQuery`, `approvalMessage`, `approvalReasoning` | `string`, `select` |

A code step is never a binding target.

**No resource may stay in the steps.** Leave these fields out of every step and bind a parameter instead: `connectorAuth`, `knowledgeSetId`, `agentRef`, `agentId`, `personaId`, `datasetId`, `approvers`, `triggerAuthFields`, `webhookPath`, `agentApprovers`, `capturedOutput`. Text must not contain `{{connections[`.

### Workflow steps

Every step has `id`, `type`, `name` and `position {x, y}`. Optional: `description`, `nextStepId` (the next step), `continueOnFailure`, `retryOnFailure`, `retryCount`, `retryDelayMs`, `fieldModes` (`{ "<field>": "manual" | "auto" | "prompt" | "none" }`).

Exactly one step has `type: "trigger"`, and `flow.rootStepId` points at it. There must be at least one other step. Refer to earlier output with `{{trigger.body.<field>}}`, `{{<stepId>}}` or `{{<stepId>.<field>}}`.

| `type` | Fields (required in bold) |
|---|---|
| `trigger` | **`triggerType`**: `webhook`, `schedule`, `event`, `piece`. `schedule` (cron), `triggerTimezone` (IANA), `triggerAuthType` (`none`, `basic`, `header`, `hmac`), `triggerPiece`, `triggerName`, `triggerInputs`, `triggerPieceVersion` for a connector trigger |
| `aancer-ai` | `modelTier` (`local-standard`, `local-advanced`, `cloud-reasoning`), `dataClassification` (`sovereign`, `internal`, `permitted`), `systemPrompt`, `userPromptTemplate`, `maxTokens` |
| `rag` | as `aancer-ai`, plus a `knowledgeSetId` binding to a `knowledgeSet` parameter |
| `agent` | **`agentGoal`**, `agentToolRefs`, `agentMaxSteps` (1 to 50, default 10), `agentMaxBudgetUsd` (default 1.00), `agentRequireApproval` (default true), `agentOutputFields` |
| `connector` | **`connectorPiece`** (connector name), `connectorAction`, `connectorInputs` |
| `approval` | `approvalMessage`, `approvalReasoning`, `approvalTimeout` (hours, default 24), `approvalOnReject` (`stop`, `continue`), plus an `approvers` binding |
| `condition` | **`conditionExpression`**, **`branches [{id, label, nextStepId}]`** (at least one) |
| `router` | **`routingInstructions`**, **`routerBranches [{id, label, nextStepId, isDefault}]`** with exactly one default |
| `ai-router` | **`routerInput`**, **`routerQuestion`**, **`routerRoutes [{id, label, description}]`** (2 to 12, ids unique and not empty, not `otherwise`; every edge must be a declared route), `routerMode` (`single`, `multi`), `routerConfidenceFloor` (0 to 1) |
| `loop` | **`loopExpression`**, `loopBodyStepId` |
| `code` | `codeLanguage` (`javascript`, `python`), `codeSource`, `codeInputs {name: "{{ref}}"}` |
| `guardrails` | `guardTarget`, `guardOnFail` (`block`, `annotate`) |
| `file-search` | `searchQuery`, `searchMode` (`hybrid`, `vector`), `searchMaxHits` (1 to 20), plus a `knowledgeSetId` binding |
| `publish` | `publishMode` (`append`, `upsert`, `replace`), `publishRows`, `whenFull` (`remove_oldest`, `fail`), plus a `datasetId` binding |
| `output` | no required fields |

A step with `dataClassification: "sovereign"` cannot use `modelTier: "cloud-reasoning"`.

### AI Act fields

If the template has AI steps (`aancer-ai`, `rag`, `agent`, `router`, `ai-router`), set `aiAct.riskClass` to `minimal`, `limited` or `high` and fill `aiAct.intendedPurpose`.

AANCER treats a template as high risk when `riskClass` is `high`, or when its industry, name or description (including translations) contains one of these terms: `hr` (as a word), `rrhh`, `talent`, `employ`, `hiring`, `recruit`, `candidate`, `screen`, `performance review`, `offboard`, `onboard`, `education`, `edu` (as a word), `proctor`, `grading`, `student`, `exam`. The match is a plain substring test, so words such as "screenshot", "employee" and "example" also count. A high-risk template with AI steps needs `aiAct.annexIiiCategory` (not `none`) and `aiAct.humanOversight`, and should contain an approval step. If the declared `riskClass` is lower than this rule derives, you get the warning `TPL_RISK_DECLARED_BELOW_DERIVED` and the template is treated as high risk.

### What the installation works out for you

Do not send these. AANCER derives them from the steps: which steps run locally, in the cloud, call a connector or wait for approval; whether the template is fully sovereign, mixed or sends data to a connector; the connectors it needs; and the hosts named in connector inputs.

## Full examples

### Local AI summary, human approval, then post

```json
{
  "kind": "template", "schemaVersion": 1, "id": "invoice-summary-approval", "scope": "install",
  "spec": {
    "id": "tpl-acme-invoice-summary",
    "version": 1,
    "workspace": "{{param.target_workspace}}",
    "record": {
      "name": "Invoice summary with approval",
      "description": "Summarises an incoming invoice with a local model, asks a person to approve, then posts the summary to a chat channel.",
      "icon": "🧾", "industry": "financial", "complexity": "intermediate", "locale": "en",
      "aiAct": {
        "riskClass": "limited", "annexIiiCategory": "none",
        "intendedPurpose": "Summarise supplier invoices for a person who approves them.",
        "humanOversight": "A person approves every summary in an approval step before it is posted.",
        "transparencyNote": "The summary is written by an AI model."
      },
      "compliance": { "dataCategories": ["invoice data"], "dataSubjects": [], "lawfulBasis": "contract", "retentionDays": 90 },
      "parameters": [
        { "id": "approvers_1", "type": "approvers", "label": "Who approves the summary", "required": true },
        { "id": "conn_1", "type": "connection", "label": "Chat connection", "required": true, "connector": "connector-chat" },
        { "id": "channel", "type": "string", "label": "Channel to post to", "required": true, "default": "finance" }
      ],
      "bindings": [
        { "parameterId": "approvers_1", "stepId": "approve", "path": "approvers" },
        { "parameterId": "conn_1", "stepId": "post", "path": "connectorAuth" },
        { "parameterId": "channel", "stepId": "post", "path": "connectorInputs.channel" }
      ],
      "translations": {},
      "flow": {
        "name": "Invoice summary with approval",
        "rootStepId": "t",
        "steps": [
          { "id": "t", "type": "trigger", "name": "Invoice received", "position": { "x": 0, "y": 0 }, "triggerType": "webhook", "nextStepId": "sum" },
          { "id": "sum", "type": "aancer-ai", "name": "Summarise", "position": { "x": 0, "y": 120 },
            "modelTier": "local-standard", "dataClassification": "internal",
            "systemPrompt": "You summarise supplier invoices: supplier, amount, due date, cost centre.",
            "userPromptTemplate": "{{trigger.body.text}}", "maxTokens": 600, "nextStepId": "approve" },
          { "id": "approve", "type": "approval", "name": "Approve summary", "position": { "x": 0, "y": 240 },
            "approvalMessage": "Approve this invoice summary?", "approvalReasoning": "{{sum}}", "approvalTimeout": 24, "nextStepId": "post" },
          { "id": "post", "type": "connector", "name": "Post to channel", "position": { "x": 0, "y": 360 },
            "connectorPiece": "connector-chat", "connectorAction": "send", "connectorInputs": { "text": "{{sum}}" } }
        ]
      },
      "builtAgainst": { "catalogHash": "", "platformVersion": "1.0.0" },
      "createdAt": "2026-11-20T00:00:00.000Z"
    }
  }
}
```

### Weekly scheduled answer from a knowledge set, with a German translation

```json
{
  "kind": "template", "schemaVersion": 1, "id": "weekly-policy-digest", "scope": "install",
  "spec": {
    "id": "tpl-acme-weekly-policy-digest",
    "version": 1,
    "record": {
      "name": "Weekly policy digest",
      "description": "Every Monday, answers a fixed question from a knowledge set with a local model and keeps the answer in the run history.",
      "icon": "📚", "industry": "operations", "complexity": "starter", "locale": "en",
      "aiAct": { "riskClass": "minimal", "annexIiiCategory": "none", "intendedPurpose": "Summarise internal policy changes for staff.", "humanOversight": "", "transparencyNote": "" },
      "compliance": { "dataCategories": [], "dataSubjects": [], "lawfulBasis": "", "retentionDays": null },
      "parameters": [
        { "id": "ks_1", "type": "knowledgeSet", "label": "Policy knowledge set", "required": true },
        { "id": "question", "type": "string", "label": "Question to answer each week", "required": true, "default": "What changed in our policies this week?" }
      ],
      "bindings": [
        { "parameterId": "ks_1", "stepId": "ask", "path": "knowledgeSetId" },
        { "parameterId": "question", "stepId": "ask", "path": "userPromptTemplate" }
      ],
      "translations": {
        "de": {
          "name": "Wöchentlicher Richtlinien-Überblick",
          "description": "Beantwortet jeden Montag eine feste Frage aus einer Wissenssammlung.",
          "parameters": { "ks_1": { "label": "Wissenssammlung" }, "question": { "label": "Wöchentliche Frage" } }
        }
      },
      "flow": {
        "name": "Weekly policy digest",
        "rootStepId": "t",
        "steps": [
          { "id": "t", "type": "trigger", "name": "Every Monday 08:00", "position": { "x": 0, "y": 0 },
            "triggerType": "schedule", "schedule": "0 8 * * 1", "triggerTimezone": "Europe/Berlin", "nextStepId": "ask" },
          { "id": "ask", "type": "rag", "name": "Answer from policies", "position": { "x": 0, "y": 120 },
            "modelTier": "local-standard", "dataClassification": "internal",
            "systemPrompt": "Answer only from the retrieved passages. Say when nothing changed.", "maxTokens": 800 }
        ]
      },
      "builtAgainst": { "catalogHash": "", "platformVersion": "1.0.0" },
      "createdAt": "2026-11-20T00:00:00.000Z"
    }
  }
}
```

There is no `workspace` here, so activation publishes it for the whole installation. A translation needs a name, a description and every parameter label, otherwise you get the warning `TPL_TRANSLATION_INCOMPLETE`.

## Install and test

### As a pack

1. Put the item in a pack and sign it. See [Packs](/developers/packs).
2. Import it: **Platform Settings > Extensions > Import pack**, or `POST /api/extensions/packs/import`. Import runs every check on this page. A missing connector is not an import error.
3. Activate it: `POST /api/extensions/packs/{packId}/activate` with `{"version":"1.0.0","parameters":{"target_workspace":"ws-ops"}}`. **Activation is the approval.** The template is published as decided by the person who activates it. That person needs `templates.publish_own` in the bound workspace, or `templates.publish_install` when it is unbound. A template with a code step also needs `automations.use_custom_code`.
4. Deploy it: the template shows in the template gallery. The person deploying it fills in the template parameters. Deploying is refused until every connector it needs is installed.

### Inside an installation

You can also build a workflow in the designer and turn it into a template.

| Step | API | UI |
|---|---|---|
| Create a workflow from JSON | `POST /api/automations` with `{name, workspaceId, status: "draft", rootStepId, steps}` | Automations > Designer |
| Create a template draft from it | `POST /api/automations/templates/authored {workspaceId, fromFlowId, name?, locale?}` | Automations > Templates > New |
| Edit details | `PUT /api/automations/templates/authored/{id} {rev, record?, parameters?, bindings?, translations?, valueChoices?}` | template editor |
| Validate | `POST /api/automations/templates/authored/{id}/validate` returns `{ok, errors[], warnings[]}` | |
| Submit for review | `POST .../{id}/submit {rev, targetScope: "workspace" or "install", note?}` | |
| Approve or reject | `POST .../{id}/approve {rev, note?, riskClassConfirmed?}`, `POST .../{id}/reject {rev, note}` | Automations > Template reviews |
| Export as a pack | `POST .../{id}/export {}` returns a signed `.ancpack` | |

Every write (`PUT`, `submit`, `approve`, `reject`) needs the integer `rev` you last read; a stale or missing `rev` returns `TEMPLATE_REV_CONFLICT`. `riskClassConfirmed: true` is needed on approve only when the template has AI steps. The `validate` call is the quickest way to check a template while you build it. Authors cannot approve their own templates when the target is the whole installation and the installation's second-approver setting is on. Each user can hold at most 100 unpublished drafts per workspace.

An exported pack is signed with the installation's export key. To move it to a second installation, open **Platform Settings > Extensions > Trust keys** on the first one and choose **Show key for another installation**. On the second installation, add a trust key and paste it: the key id is filled in for you.

## Common errors

Pack import errors appear as `PACK_SCHEMA_INVALID` details with the path `/items/<itemId>/spec/record/...` and the code in brackets.

| Code | Message | Fix |
|---|---|---|
| `TPL_FLOW_NO_TRIGGER` | The workflow has no trigger yet. / The workflow has more than one trigger. Keep exactly one. | One `trigger` step, and `rootStepId` points at it |
| `TPL_FLOW_EMPTY` | The workflow only has a trigger. Add at least one step. | Add a step |
| `TPL_FLOW_SERIALIZE` | Connector step is missing connectorPiece. / Agent step is missing agentGoal. / First step must be a trigger. | Fix the step |
| `TPL_FLOW_SERIALIZE` | Sovereignty conflict: classification=sovereign cannot route to cloud-reasoning tier. | Use a local tier or lower the classification |
| `TPL_META_REQUIRED`, `TPL_META_LENGTH`, `TPL_META_ENUM` | Enter a name. / Keep a short description to 300 characters. / Choose an industry from the list. / The creation date is missing. | Use the values and limits above. Always send `createdAt` |
| `TPL_PARAM_INVALID` | This kind of parameter cannot have a default. / A secret cannot have a default value. / The default value does not match the parameter type. | Remove the default or fix its type |
| `TPL_BINDING_ORPHAN` | This value points to a parameter that no longer exists. | Match `parameterId` and `stepId` |
| `TPL_BINDING_PATH_FORBIDDEN` | The parameter "..." cannot fill this field of step "...". | Follow the bindings table |
| `TPL_RESIDUAL_BINDING` | This still points to something of your own installation. | Remove the resource field from the step and add a binding |
| `TPL_SECRET_FOUND` | This looks like a credential. Remove it or make the field a parameter. | No keys or tokens in any text |
| `TPL_AIACT_REQUIRED` | Choose a risk class: this template has AI steps. / State the intended purpose. | Fill `aiAct` |
| `TPL_PROHIBITED` | A template for a prohibited practice cannot be shared. | |
| `TPL_TOO_LARGE` | The template is larger than 1 MB. / at most 200 steps / at most 50 parameters | Split it |
| `TPL_PACK_WORKSPACE` | must be a pack parameter, written as {{param.<id>}} | Use a `workspace` pack parameter |
| `TPL_PACK_WORKSPACE_UNKNOWN` | the workspace it is bound to (...) does not exist here or is archived. | Bind an existing workspace at activation |
| `TPL_PACK_UNREADABLE` | its content could not be read. | Rebuild and re-sign the pack |
| `TPL_PARAM_DUPLICATE` | Two parameters share the id "...". | Make parameter ids unique |
| `TPL_FIELD_MODE` | a step field uses a field mode that is not allowed | Use one of the field modes the designer offers |
| `TPL_GUARD_MODE` | a guardrail or file-search step uses a mode that is not allowed | Use one of the modes the designer offers |
| `TEMPLATE_REV_CONFLICT` | the template changed since you read it | Read it again and send the new `rev` |

Warnings do not block: `TPL_RISK_DECLARED_BELOW_DERIVED` (see the high-risk rule above), `TPL_CATALOG_DRIFT` (the connector catalog changed since the template was built: update it from its workflow), `TPL_PARAM_UNUSED`, `TPL_CODE_STEP_PRESENT` (whoever deploys it runs that code), `TPL_PII_FOUND` (an e-mail address, phone number or IBAN in the text), `TPL_NO_HUMAN_OVERSIGHT_STEP`, `TPL_TRANSLATION_INCOMPLETE`.

## Limits and editions

- At most 200 steps, 50 parameters and 1 MB per template.
- Connector names and their action inputs depend on the connectors installed in the target installation. AANCER offers 750+ connectors.
- Templates are controlled by permissions: `templates.author_own`, `templates.publish_own`, `templates.publish_install`, `automations.use_custom_code`.
- An agent can only use a workflow that starts from a webhook, a schedule or an event if the agent is certified. This needs the Certified Agents licence feature. See [Agents](/developers/agents).
- Check your edition on [aancer.ai/pricing](https://aancer.ai/pricing).
