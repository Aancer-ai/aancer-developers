---
title: Event hooks | AANCER Developers
description: Start AANCER workflows or agents when platform events happen. The hook format, event catalog, filters, delivery, retries and replay.
---

## Event hooks

A hook is a small JSON object, data and never code, that says: "when platform event X happens in this workspace, and these filter clauses all match, start workflow W or agent A". Events come from a fixed catalog of ten, such as `run.failed`, `approval.decided` and `dataset.rows.published`. Delivery is reliable: each event is recorded, the hook is evaluated, and the handler is started once per hook and event, with retries, dead letters, manual retry and replay. Hooks belong to a workspace, at most 100 per workspace. You create them under **Automations > Hooks**, with the REST API, or ship them in a signed pack as `kind: "hook"`.

Hooks do not call URLs. To notify an external system, let the handler workflow do it with a connector step.

## Quick start

Start a workflow when an approval is rejected.

```json
{
  "id": "rejected_approvals",
  "title": "Rejected approvals",
  "event": { "name": "approval.decided", "version": 1 },
  "filter": [
    { "path": "payload.outcome", "op": "eq", "value": "rejected" }
  ],
  "handler": { "type": "workflow", "ref": "flow_notify_requester" }
}
```

The workflow `flow_notify_requester` must be published with the **AANCER Event** trigger set to the event `approval.decided`. In its steps, use `{{trigger.payload.approvalId}}`, `{{trigger.payload.note}}` and so on.

## File layout

```text
acme-approval-alerts/
  manifest.json          # one hook item, workspace scope
  content/
    hook.json            # the hook spec
```

Manifest item:

```json
{ "kind": "hook", "schemaVersion": 1, "id": "rejected_approvals", "scope": "workspace",
  "workspace": "{{param.target_workspace}}", "spec": { "$ref": "content/hook.json" } }
```

A pack hook must have a workspace. The workflow or agent it names must already exist in that workspace.

## Field reference

JSON Schema: [hook.schema.json](https://aancer.ai/dev/schemas/hook.schema.json)

### Hook spec

| Field | Type | Required | Rules |
|---|---|---|---|
| `id` | string | yes | `^[a-z0-9][a-z0-9._-]{0,63}$`, unique per workspace |
| `title` | string | no | at most 120 characters. Default: the id |
| `event.name` | string | yes | one of the ten event names below |
| `event.version` | integer | no | `1` |
| `filter` | array | no | up to 8 clauses `{ path, op, value? }`. All must match. For "or", write two hooks |
| `handler.type` | string | yes | `workflow` or `agent` |
| `handler.ref` | string | yes | a workflow id, or an agent reference such as `agent:digest` |
| `delivery.maxConcurrency` | integer | no | 1 to 20, default 1 |
| `delivery.retry.max` | integer | no | 0 to 10. The installation may cap it lower (default 3) |
| `delivery.retry.backoffSeconds` | integer[] | no | up to 10 values, each 1 to 86400. Default `[30, 120, 480]`. The last value repeats |
| `enabled` | boolean | no | default `true` |

With the REST API you can also send `dataClassification` (`sovereign`, `internal` or `permitted`): the data class for agent handler runs. Leave it out of pack specs. For a pack hook, a workspace admin sets it after install.

### Filter clauses

- `path`: `actor.role`, or a dot path starting with `payload.` or `resource.`.
- `op`: `eq`, `neq`, `in`, `gt`, `gte`, `lt`, `lte`, `contains`, `exists`.
- `value`: required for every op except `exists`. `in` needs an array. `exists` with `value: false` means "absent".
- Types are strict: `"5"` does not equal `5`. `gt`, `gte`, `lt`, `lte` compare numbers only. `contains` is a case-insensitive substring match on text, or an element match on arrays. A type mismatch is simply false.

### Event catalog

Every handler receives this envelope:

```json
{
  "id": "evt_01",
  "name": "approval.decided",
  "version": 1,
  "workspaceId": "ws-finance",
  "occurredAt": "2026-11-20T10:00:00Z",
  "actor": { "sub": "u_admin", "role": "admin" },
  "resource": { "type": "approval", "id": "apr_01" },
  "payload": { "approvalId": "apr_01", "runId": "run_03", "flowId": "flow_invoices", "outcome": "rejected", "decidedBy": "u_admin", "note": "Amount exceeds budget" },
  "dataCategories": ["CONTACT"]
}
```

| Event | Payload fields (always) | Payload fields (sometimes) |
|---|---|---|
| `run.completed` | `runId`, `flowId` | `flowName`, `durationMs`, `stepCount`, `triggeredBy` |
| `run.failed` | `runId`, `flowId`, `status` (`FAILED`, `INTERNAL_ERROR`, `TIMEOUT`) | `flowName`, `errorRef` |
| `approval.decided` | `approvalId`, `runId`, `outcome` (`approved`, `rejected`), `decidedBy` | `flowId`, `note`, `via` (`web`, `teams`, `slack`) |
| `approval.requested` | `approvalId`, `runId`, `toolId`, `surface`, `expiresAt` | `conversationId` |
| `dataset.rows.published` | `datasetId`, `mode` (`append`, `upsert`, `replace`), `inserted`, `rowCount`, `source` | `updated`, `runId` |
| `dashboard.published` | `dashboardId`, `version`, `publishedBy` | |
| `document.ingested` | `knowledgeSetId`, `documentId` | `fileType`, `bytes`, `ocr` |
| `user.provisioned` | `sub`, `roleName`, `via` (`invite`, `scim`, `sso`, `admin`) | |
| `workspace.member.changed` | `workspaceId`, `sub`, `change` (`added`, `removed`, `role_changed`) | `roleName` |
| `schedule.run.completed` | `taskId`, `runId`, `trigger` (`schedule`, `manual`) | `conversationId`, `agentId` |

Events never carry document content or raw error text. `GET /api/events/catalog` returns the live catalog with schemas and sample events.

### What the handler gets

- **Workflow**: the workflow must be published with the **AANCER Event** trigger. If the trigger names an event, it must be the hook's event. The trigger output is `{ event, eventName, eventId, workspaceId, occurredAt, payload }`, so steps use `{{trigger.event}}` or `{{trigger.payload.datasetId}}`.
- **Agent**: a governed agent run. The task text holds the event name, time, workspace, resource and the payload as JSON.

A delivery counts as delivered when the run starts. If the run fails later, the failure is shown on the delivery, but it is not retried automatically.

## Full examples

### Alert when a dataset receives new rows

```json
{
  "id": "orders_alert",
  "title": "New orders alert",
  "event": { "name": "dataset.rows.published", "version": 1 },
  "filter": [
    { "path": "payload.datasetId", "op": "eq", "value": "sales_orders" },
    { "path": "payload.inserted", "op": "gt", "value": 0 }
  ],
  "handler": { "type": "workflow", "ref": "flow_orders_alert" },
  "delivery": { "maxConcurrency": 1, "retry": { "max": 3, "backoffSeconds": [30, 120, 480] } },
  "enabled": true
}
```

### An agent digest after every completed run, as a pack

```json
{
  "v": 2, "kind": "bundle", "id": "acme.run-digest", "version": "1.0.0", "title": "Run digest",
  "publisher": { "name": "Acme Example Ltd", "keyId": "pub-0123456789ab" },
  "requires": { "platform": ">=1.0.0" },
  "parameters": [ { "id": "target_workspace", "type": "workspace", "label": "Workspace", "required": true } ],
  "items": [
    { "kind": "hook", "schemaVersion": 1, "id": "run_digest", "scope": "workspace", "workspace": "{{param.target_workspace}}",
      "spec": { "id": "run_digest", "title": "Digest", "event": { "name": "run.completed" }, "handler": { "type": "agent", "ref": "agent:digest" } } }
  ]
}
```

### Failed runs of one workflow, with more retries

```json
{
  "id": "invoice_run_failed",
  "event": { "name": "run.failed" },
  "filter": [
    { "path": "payload.flowId", "op": "in", "value": ["flow_invoices", "flow_invoices_eu"] },
    { "path": "payload.status", "op": "neq", "value": "TIMEOUT" }
  ],
  "handler": { "type": "workflow", "ref": "flow_open_ticket" },
  "delivery": { "retry": { "max": 5, "backoffSeconds": [60, 300, 900] } }
}
```

## Install and test

### Test the filter first

`POST /api/event-hooks/test` checks a hook against a sample event. It never starts the handler.

```http
POST /api/event-hooks/test
Content-Type: application/json

{ "workspaceId": "ws-finance",
  "hook": { "id": "rejected_approvals", "event": { "name": "approval.decided" },
            "filter": [ { "path": "payload.outcome", "op": "eq", "value": "rejected" } ],
            "handler": { "type": "workflow", "ref": "flow_notify_requester" } },
  "sampleEvent": { "id": "evt_1", "name": "approval.decided", "version": 1, "workspaceId": "ws-finance",
                   "occurredAt": "2026-11-20T10:00:00Z", "actor": { "sub": "u_admin", "role": "admin" },
                   "resource": { "type": "approval", "id": "apr_01" },
                   "payload": { "approvalId": "apr_01", "runId": "run_03", "outcome": "rejected", "decidedBy": "u_admin" },
                   "dataCategories": ["CONTACT"] } }
```

Answer: `{"matches": true, "clauses": [{"path": "payload.outcome", "op": "eq", "matched": true}], "errors": []}`. In the UI, the hook editor has a **Test filter** button.

### Create it

| Call | Permission | Notes |
|---|---|---|
| `GET /api/events/catalog` | signed in | events, schemas, samples |
| `POST /api/event-hooks` | `hooks.manage_own` | `{workspaceId, definition}`, returns 201 |
| `GET /api/event-hooks?workspaceId=&event=` | `hooks.view_own` | |
| `PUT /api/event-hooks/{id}` | `hooks.manage_own` | not for pack hooks |
| `POST /api/event-hooks/{id}/enable`, `/disable` | `hooks.manage_own` | enable checks the handler again |
| `DELETE /api/event-hooks/{id}` | `hooks.manage_own` | retire |
| `GET /api/event-hooks/{id}/deliveries?state=` | `hooks.view_own` | `pending`, `delivered`, `failed`, `dead_lettered` |
| `POST /api/event-hooks/{id}/deliveries/{deliveryId}/retry` | `hooks.manage_own` | failed or dead-lettered only |
| `POST /api/event-hooks/{id}/replay {from, to, dryRun?}` | `hooks.manage_own` | up to 30 days and 1000 events |
| `PUT /api/event-hooks/{id}/data-classification` | `workspaces.manage_settings_own` | `{workspaceId, dataClassification}` |

### As a pack

Sign, import and activate the pack (see [Packs](/developers/packs)). Activation creates or updates the hook. Retiring the pack retires it. A pack hook can only be changed with a new pack version, except for its data class.

If the handler workflow is not yet published with an Event trigger, the hook is saved disabled with a warning. Publish the workflow, then enable the hook.

## Common errors

| Code | Message | Fix |
|---|---|---|
| `VALIDATION` | definition is required | Wrap the hook in `{"definition": ...}` |
| `HOOK_FILTER_INVALID` | /id: must match ^[a-z0-9][a-z0-9._-]{0,63}$ | Lower-case id |
| `HOOK_FILTER_INVALID` | /id: a hook with this id already exists | Choose another id, or use PUT |
| `HOOK_EVENT_UNKNOWN` | /event/name: unknown event '...' | Use a catalog name |
| `HOOK_FILTER_INVALID` | /filter: at most 8 clauses (OR = two hooks) | Split into two hooks |
| `HOOK_FILTER_INVALID` | /filter/0/path: path must start with payload., resource. or be actor.role | |
| `HOOK_FILTER_INVALID` | /filter/0/value: in needs an array value / value is required | |
| `HOOK_LIMIT_EXCEEDED` | At most 100 hooks per workspace. | Retire unused hooks |
| `HOOK_HANDLER_NOT_FOUND` | Workflow '...' does not exist. / Agent '...' does not exist. | Create it first |
| `HOOK_HANDLER_FORBIDDEN` | Workflow '...' belongs to another workspace. | |
| warning `HANDLER_INACTIVE` | the workflow is not published with an Event trigger; deliveries will fail until it is. | Publish it with the AANCER Event trigger, then enable |
| `HOOK_MANAGED_BY_PACK` | This hook is managed by pack '...'; edit the pack. | Ship a new pack version |
| `DELIVERY_NOT_RETRYABLE` | A '...' delivery cannot be retried. | Only failed or dead-lettered deliveries |
| `HOOK_DISABLED` | A disabled hook cannot replay; enable it first. | |
| `HOOK_REPLAY_TOO_LARGE` | The replay window is limited to 30 days. / More than 1000 events match; narrow the window. | |
| delivery `lastError` | HANDLER_INACTIVE: Workflow '...' listens to '...', not '...'. | Make the trigger event and the hook event match |
| `PACK_SCHEMA_INVALID` | /items/.../spec: must NOT have additional properties | For example `dataClassification` in a pack spec. Remove it |

## Limits and editions

- 100 hooks per workspace, 8 filter clauses per hook, 20 concurrent deliveries per hook.
- Replay reaches events the installation still keeps, up to 30 days per replay.
- Hooks are controlled by permissions: `hooks.view_own`, `hooks.manage_own`. Firing a workflow also needs the workflow to be allowed to run.
- Check your edition on [aancer.ai/pricing](https://aancer.ai/pricing).
