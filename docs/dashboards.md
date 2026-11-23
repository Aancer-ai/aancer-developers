---
title: Dashboards, datasets and models | AANCER Developers
description: Build AANCER dashboards as data: datasets, semantic models, widgets with declarative charts, KPIs, tables and forms, and dashboard layouts.
---

## Dashboards

An AANCER dashboard is data, not code. It is built from four object kinds that stack:

1. a **dataset**: a typed table stored in the installation;
2. a **model**: the semantic layer with entities, dimensions, measures, named filters, variables and joins;
3. a **widget**: a table, a chart, a KPI, Markdown text or a form, bound to a model query;
4. a **dashboard**: a 12-column grid of widgets plus global filters.

Charts are declarative chart specifications (JSON) without data: the platform runs the query and injects the result. Dashboards are versioned. You save a draft, then publish version N, with rollback and retire. You can build them in the UI under **Work > Dashboards**, through the REST API, or ship them in a signed pack with items of kind `dataset`, `model`, `widget` and `dashboard`. Every published dashboard also gets a 2D and 3D view switch, which needs no authoring.

## Quick start

One dataset, one model, one chart, one dashboard, as pack item specs.

```json
{ "id": "sales_orders", "title": "Sales orders",
  "columns": [
    { "id": "date", "type": "date", "required": true },
    { "id": "region", "type": "string", "required": true },
    { "id": "amount", "type": "number", "min": 0 }
  ],
  "retention": { "maxAgeDays": 730 } }
```

```json
{ "id": "sales",
  "entities": { "orders": { "dataset": "sales_orders" } },
  "dimensions": { "region": { "entity": "orders", "column": "region", "label": "Region" } },
  "measures": { "revenue": { "entity": "orders", "agg": "sum", "column": "amount", "label": "Revenue", "format": "currency" } } }
```

```json
{ "id": "revenue_by_region", "type": "chart", "title": "Revenue by region",
  "source": { "model": "sales", "query": { "measures": ["revenue"], "dimensions": ["region"] } },
  "chart": { "mark": "bar", "encoding": {
    "x": { "field": "region", "type": "nominal" },
    "y": { "field": "revenue", "type": "quantitative" } } } }
```

```json
{ "id": "sales-overview", "title": "Sales overview", "icon": "BarChart3",
  "layout": [ { "widget": "revenue_by_region", "x": 0, "y": 0, "w": 12, "h": 8 } ] }
```

## File layout

```text
acme-sales-dashboard/
  manifest.json                         # items: dataset, model, widget(s), dashboard
  content/
    dataset.sales_orders.json
    model.sales.json
    widget.revenue_by_region.json
    dashboard.sales-overview.json
```

Each item uses `"schemaVersion": 1` and `"scope": "workspace"` with `"workspace": "{{param.target_workspace}}"`. Declare `target_workspace` as a `workspace` pack parameter.

## Field reference

JSON Schema: [dashboard.schema.json](https://aancer.ai/dev/schemas/dashboard.schema.json). It has one definition per kind: `dataset`, `model`, `widget`, `dashboard`. Ids match `^[a-z0-9][a-z0-9._-]{0,63}$`; dataset column ids match `^[a-z][a-z0-9_]{0,63}$`.

### Dataset

| Field | Type | Required | Rules |
|---|---|---|---|
| `id` | string | yes | id pattern |
| `title` | string | no | at most 120 characters |
| `columns` | array | yes | 1 to 200 of `{ id, type, label?, required?, min?, max?, maxLength? }`. Column `id` matches `^[a-z][a-z0-9_]{0,63}$`, unique. `type`: `string`, `number`, `integer`, `boolean`, `date`, `datetime`, `json` |
| `key` | string[] | no | up to 8 columns used for upserts |
| `retention` | object | yes | at least one of `maxAgeDays` (1 to 3650) and `maxRows` (1 to 5,000,000) |
| `personalData` | object | no | `{ classes: string[], subjectColumn?: string or null }`. With classes, `subjectColumn` names a declared column and `seedRows` are not used |
| `source` | string | no | `workflow`, `agent`, `chat`, `import`, `pack`, `manual` |
| `seedRows` | object[] | no | up to 5000 initial rows |

Workflows fill datasets with a Publish step, agents with the dataset tool, and embedded apps through the bridge.

### Model

| Field | Type | Required | Rules |
|---|---|---|---|
| `id` | string | yes | id pattern |
| `title` | string | no | at most 120 characters |
| `entities` | object | yes | 1 to 3. Each has exactly one of `dataset` (a dataset id) or `connection` (a connection id or `{{param.x}}`). A connection entity needs `query`: one saved SQL statement (no `;`, `--` or `/*`) of at most 4000 characters with `:param` binds, and `params {name: {type: string, number or date, default?}}` |
| `dimensions` | object | yes | up to 100 of `{ entity, column, label?, granularity? }`. `granularity`: list of `day`, `week`, `month`, `quarter`, `year` |
| `measures` | object | yes | 1 to 100 of `{ entity, agg, column?, label?, format? }`. `agg`: `count`, `sum`, `avg`, `min`, `max`, `distinct`. `format`: `number`, `integer`, `percent`, `currency` |
| `filters` | object | no | up to 100 of `{ dimension, op, value?, param?, label? }`. `op`: `eq`, `neq`, `in`, `gt`, `gte`, `lt`, `lte`, `between`, `in_period`, `contains`. Example: `{"dimension": "date", "op": "in_period", "value": "current_month"}` |
| `variables` | object | no | up to 50 of `{ type, default?, label? }`. `type`: `string`, `number`, `date` |
| `joins` | array | no | up to 3 of `{ id, left: {entity, column}, right: {entity, column}, type }`. `type`: `inner` or `left`. Dataset entities only |

Every dataset also gets an automatic model `m-<datasetId>` with every column as a dimension, `count`, and `sum_<col>` and `avg_<col>` for numeric columns.

### Widget

| Field | Type | Required | Rules |
|---|---|---|---|
| `id` | string | yes | id pattern |
| `type` | string | yes | `table`, `chart`, `kpi`, `markdown`, `form` |
| `title` | string | yes | at most 120 characters |
| `source` | object | for table, chart, kpi | `{ model, query }`. See Model query |
| `table` | object | no | `{ columns?: [{ field, label?, width?, format? }] (up to 50), pageSize?: 1 to 200 }` |
| `chart` | object | for chart | a declarative chart specification (JSON). See Chart rules |
| `kpi` | object | for kpi | `{ measure, compare?: { filter, label? }, format?, label? }` |
| `markdown` | object | for markdown | `{ text }`, at most 20,000 characters, no scripts |
| `form` | object | for form | `{ card, target, onSuccess?: { message? }, personalData?: { classes } }`. See Form widgets |
| `interactions` | object | no | cross-filtering: `{ emit?: { dimension }, listen?: boolean }` |
| `actions` | array | no | up to 5 buttons. See Widget actions |

### Model query

| Field | Rules |
|---|---|
| `measures` | at least 1 measure id of the model |
| `dimensions` | up to 4 dimension ids |
| `filters` | named model filters |
| `variables` | values for model variables |
| `order` | `[{ field, dir: "asc" or "desc" }]` |
| `limit` | 1 to 5000 rows, default 500 |
| `granularity` | `{ "<time dimension>": "day" ... "year" }` |

Up to 8 measures and 3 joins per query.

### Chart rules

- Use `mark` (or `layer`) plus `encoding`. `transform` and `config` are allowed.
- Allowed marks: `bar`, `line`, `area`, `point`, `arc`, `circle`, `square`, `tick`, `rect`, `rule`, `text`, `trail`, `boxplot`, `errorbar`, `errorband`, `geoshape`. No `image`.
- No `data`, no `$schema`, no `url`, and no string with `http://`, `https://`, `//`, `data:` or `url(` anywhere.
- Encode fields by the measure and dimension ids of the query.
- For a good 3D view, use a single mark (`bar`, `line`, `area`, `point`, `arc`) with a nominal or temporal x and a quantitative y.

### Form widgets

`card` is an Adaptive Card, version 1.5 or lower, with a subset of elements:

- Elements: `TextBlock`, `RichTextBlock`, `TextRun`, `Container`, `ColumnSet`, `Column`, `FactSet`, `ActionSet`, `Image` (inline `data:` image under 64 KiB only), `Input.Text`, `Input.Number`, `Input.Date`, `Input.Time`, `Input.Toggle`, `Input.ChoiceSet`.
- Actions: exactly one `Action.Submit` at the top level, plus `Action.ShowCard` and `Action.ToggleVisibility`.
- Up to 40 inputs. Input ids match `^[A-Za-z_][A-Za-z0-9_]{0,63}$`.
- Not allowed: `Action.OpenUrl`, `Action.Execute`, `Media`, `ImageSet`, `Table`, `Carousel`, `selectAction`.

`target` is `{ "kind": "workflow", "flowId": "<id>" }` or `{ "kind": "agent", "agentRef": "<ref>", "prompt": "Handle: {{inputs}}" }`.

### Widget actions

`{ id, label (1 to 60), icon?, handler: { type: "workflow" or "agent", ref }, input?: "{{row}}" or "{{selection}}", confirm?, placement?: "row" or "toolbar" }`. A KPI widget only has toolbar actions.

### Dashboard

| Field | Type | Required | Rules |
|---|---|---|---|
| `id` | string | yes | id pattern |
| `title` | string | yes | 1 to 120 characters |
| `icon` | string | no | `LayoutDashboard`, `BarChart3`, `LineChart`, `PieChart`, `Table2`, `Gauge`, `TrainFront`, `Truck`, `Factory`, `Wallet`, `Receipt`, `Users`, `Briefcase`, `ClipboardList`, `Activity`, `Package`, `ShoppingCart`, `Building2`, `Landmark`, `Leaf` |
| `group` | string | no | at most 60 characters, the heading in the navigation |
| `order` | integer | no | default 100 |
| `filters` | array | no | up to 12 of `{ id, model, filter, control, label?, param?, dimension? }`. `control`: `period`, `select`, `text`, `number`. `filter` must exist on the model |
| `layout` | array | yes | up to 40 of `{ widget, x (0 to 11), y (0 or more), w (1 to 12), h (1 to 40), static? }` |

Layout rules: `x + w` is at most 12, widgets do not overlap, each widget appears once. A grid row is 40 px high.

## Full examples

### A sales dashboard pack

`manifest.json`:

```json
{
  "v": 2, "kind": "bundle", "id": "acme.sales-dashboard", "version": "1.0.0", "title": "Sales overview",
  "publisher": { "name": "Acme Example Ltd", "keyId": "pub-0123456789ab" },
  "requires": { "platform": ">=1.0.0" },
  "parameters": [ { "id": "target_workspace", "type": "workspace", "label": "Workspace", "required": true } ],
  "items": [
    { "kind": "dataset", "schemaVersion": 1, "id": "sales_orders", "scope": "workspace", "workspace": "{{param.target_workspace}}", "spec": { "$ref": "content/dataset.sales_orders.json" } },
    { "kind": "dataset", "schemaVersion": 1, "id": "regions", "scope": "workspace", "workspace": "{{param.target_workspace}}", "spec": { "$ref": "content/dataset.regions.json" } },
    { "kind": "model", "schemaVersion": 1, "id": "sales", "scope": "workspace", "workspace": "{{param.target_workspace}}", "spec": { "$ref": "content/model.sales.json" } },
    { "kind": "widget", "schemaVersion": 1, "id": "revenue_by_region", "scope": "workspace", "workspace": "{{param.target_workspace}}", "spec": { "$ref": "content/widget.revenue_by_region.json" } },
    { "kind": "widget", "schemaVersion": 1, "id": "revenue_this_month", "scope": "workspace", "workspace": "{{param.target_workspace}}", "spec": { "$ref": "content/widget.revenue_this_month.json" } },
    { "kind": "dashboard", "schemaVersion": 1, "id": "sales-overview", "scope": "workspace", "workspace": "{{param.target_workspace}}", "spec": { "$ref": "content/dashboard.sales-overview.json" } }
  ]
}
```

`content/dataset.sales_orders.json`:

```json
{
  "id": "sales_orders",
  "title": "Sales orders",
  "columns": [
    { "id": "order_id", "type": "string", "required": true },
    { "id": "date", "type": "date", "required": true },
    { "id": "region", "type": "string", "required": true, "maxLength": 32 },
    { "id": "product", "type": "string" },
    { "id": "amount", "type": "number", "min": 0 },
    { "id": "units", "type": "integer", "min": 0 }
  ],
  "key": ["order_id"],
  "retention": { "maxAgeDays": 730, "maxRows": 500000 }
}
```

`content/dataset.regions.json`:

```json
{
  "id": "regions",
  "title": "Regions",
  "columns": [
    { "id": "region", "type": "string", "required": true },
    { "id": "manager_team", "type": "string" }
  ],
  "key": ["region"],
  "retention": { "maxRows": 1000 }
}
```

`content/model.sales.json`:

```json
{
  "id": "sales",
  "title": "Sales",
  "entities": {
    "orders": { "dataset": "sales_orders" },
    "regions": { "dataset": "regions" }
  },
  "dimensions": {
    "date": { "entity": "orders", "column": "date", "granularity": ["day", "month", "quarter"] },
    "region": { "entity": "orders", "column": "region", "label": "Region" },
    "team": { "entity": "regions", "column": "manager_team", "label": "Team" }
  },
  "measures": {
    "revenue": { "entity": "orders", "agg": "sum", "column": "amount", "label": "Revenue", "format": "currency" },
    "units": { "entity": "orders", "agg": "sum", "column": "units", "label": "Units", "format": "integer" },
    "orders": { "entity": "orders", "agg": "count", "label": "Orders" }
  },
  "filters": {
    "this_month": { "dimension": "date", "op": "in_period", "value": "current_month", "label": "This month" }
  },
  "joins": [
    { "id": "by_region", "left": { "entity": "orders", "column": "region" }, "right": { "entity": "regions", "column": "region" }, "type": "left" }
  ]
}
```

`content/widget.revenue_by_region.json`:

```json
{
  "id": "revenue_by_region",
  "type": "chart",
  "title": "Revenue by region",
  "source": { "model": "sales", "query": { "measures": ["revenue"], "dimensions": ["region"], "filters": ["this_month"], "limit": 50 } },
  "interactions": { "emit": { "dimension": "region" }, "listen": true },
  "chart": {
    "mark": "bar",
    "encoding": {
      "x": { "field": "region", "type": "nominal" },
      "y": { "field": "revenue", "type": "quantitative" }
    }
  }
}
```

`content/widget.revenue_this_month.json`:

```json
{
  "id": "revenue_this_month",
  "type": "kpi",
  "title": "Revenue this month",
  "source": { "model": "sales", "query": { "measures": ["revenue"], "filters": ["this_month"] } },
  "kpi": { "measure": "revenue", "format": "currency", "label": "Revenue" },
  "interactions": { "listen": true }
}
```

`content/dashboard.sales-overview.json`:

```json
{
  "id": "sales-overview",
  "title": "Sales overview",
  "icon": "BarChart3",
  "group": "Sales",
  "order": 10,
  "filters": [
    { "id": "period", "model": "sales", "filter": "this_month", "control": "period", "label": "Period" }
  ],
  "layout": [
    { "widget": "revenue_this_month", "x": 0, "y": 0, "w": 4, "h": 4 },
    { "widget": "revenue_by_region", "x": 4, "y": 0, "w": 8, "h": 8 }
  ]
}
```

### A form widget that starts a workflow (REST)

```http
POST /api/widgets?workspaceId=ws-sales
Content-Type: application/json

{ "definition": {
    "id": "discount_request", "type": "form", "title": "Request a discount",
    "form": {
      "card": {
        "type": "AdaptiveCard", "version": "1.5",
        "body": [
          { "type": "Input.Text", "id": "customer", "label": "Customer", "isRequired": true },
          { "type": "Input.Number", "id": "percent", "label": "Discount in percent", "min": 1, "max": 30 }
        ],
        "actions": [ { "type": "Action.Submit", "title": "Send" } ]
      },
      "target": { "kind": "workflow", "flowId": "flow_discount_request" },
      "onSuccess": { "message": "Submitted, request {{runId}}" }
    } } }
```

### Pin a chart from chat

`POST /api/charts/pin` turns a chat chart into a dataset, a model and a widget on a dashboard:

```json
{ "workspaceId": "ws-sales", "newDashboardTitle": "My sales", "title": "Units by region",
  "spec": { "mark": "bar", "encoding": {
    "x": { "field": "Region", "type": "nominal" },
    "y": { "field": "Units Sold", "type": "quantitative", "aggregate": "sum" } } },
  "rows": [ { "Region": "North", "Units Sold": 120 }, { "Region": "South", "Units Sold": 95 } ] }
```

## Install and test

### As a pack

Sign and import the pack (see [Packs](/developers/packs)), then activate it with `{"version":"1.0.0","parameters":{"target_workspace":"ws-sales"}}`. On activation the dashboard is created and published. When the pack is retired, objects are removed only if nobody changed them, and a dataset that holds rows is never removed automatically.

### With the REST API

| Call | Permission | Notes |
|---|---|---|
| `POST /api/models`, `PUT /api/models/{id}` | `dashboards.edit_own` | `{definition}` |
| `POST /api/models/{id}/query` | `dashboards.view_own` | run a model query, useful for testing |
| `POST /api/widgets`, `PUT /api/widgets/{id}` | `dashboards.edit_own` | `{definition}`. Saving compiles the query, so an unknown measure fails here |
| `POST /api/dashboards` | `dashboards.edit_own` | `{workspaceId, definition}`, returns a draft |
| `PUT /api/dashboards/{id}/draft` | `dashboards.edit_own` | `{definition, ifVersion}` with the current `draftVersion` |
| `POST /api/dashboards/{id}/publish`, `/rollback {version}`, `/retire` | `dashboards.publish_own` | |
| `POST /api/dashboards/{id}/export` | `dashboards.publish_own` | returns a signed pack |
| `POST /api/dashboards/assist` | `dashboards.edit_own` | `{modelId, intent}`, returns a proposal; nothing is saved |
| `POST /api/dashboards/{id}/share` | `result.share` | read-only share link, 1 to 720 hours |
| `POST /api/widgets/{widgetId}/actions/{actionId}` | `dashboards.view_own` and run rights | runs a widget action |
| `POST /api/charts/pin` | `dashboards.edit_own` | see above |

The workspace comes from `?workspaceId=` or the body's `workspaceId`.

In the UI: **Work > Dashboards**, then Add widget, **Help me build**, Save draft, Publish, Share. In chat, use **Pin to dashboard**.

## Common errors

| Code | Message | Fix |
|---|---|---|
| `VALIDATION` | definition is required | Wrap the object in `{"definition": ...}` |
| `WIDGET_SPEC_INVALID` | /source: a chart widget needs a source (model + query) | Add `source` |
| `WIDGET_SPEC_INVALID` | /source/query/measures: at least one measure | Name a measure of the model |
| `WIDGET_SPEC_INVALID` | /chart/data: a chart fragment must not carry data; the platform injects the query result | Remove `data` |
| `WIDGET_SPEC_INVALID` | /chart: no URLs, $schema or external resources allowed in a chart fragment | Remove `$schema`, `url` and links |
| `WIDGET_SPEC_INVALID` | /chart/mark: a chart fragment needs a mark (or layer) / image marks are not allowed | Use an allowed mark |
| `WIDGET_SPEC_INVALID` | /actions: a KPI widget only has toolbar actions | `"placement": "toolbar"` |
| `WIDGET_SPEC_INVALID` | Action.OpenUrl is not allowed: form cards carry no external links | Stay in the card subset |
| `WIDGET_SOURCE_FORBIDDEN` | Model '...' is not available in this workspace. | Create or import the model first |
| `MODEL_ENTITY_UNKNOWN` | exactly one of dataset or connection / connection entities need a saved query / joins need dataset entities | Fix the entity |
| `DATASET_NOT_FOUND` | Dataset '...' not found. | The model names a missing dataset |
| `DASHBOARD_INVALID` | /layout/0: exceeds the 12-column grid / overlaps widget ... / widget placed twice | Fix `x`, `w` and overlaps |
| `DASHBOARD_INVALID` | /icon: icon must be one of the allowed set | Use an icon from the list |
| `DASHBOARD_INVALID` | /filters: filter '...' is not defined on model '...' | Add the filter to the model |
| `DASHBOARD_VERSION_CONFLICT` | The dashboard draft changed since you loaded it. Reload and retry. | Send the new `draftVersion` |
| `SHARE_CONTAINS_FORM` | Dashboard contains a form widget; forms cannot be shared anonymously. | Remove the form or share internally |
| `EXPORT_CONTAINS_PERSONAL_DATA` | Widget '...' is bound to a dataset snapshot that carries personal data; it cannot be exported. | |
| `FORM_TARGET_INVALID` | The target workflow is paused or not published. | Publish the workflow |

## Limits and editions

- Datasets: up to 200 columns. Models: 3 entities, 100 dimensions, 100 measures, 3 joins. Queries: 5000 rows, 4 dimensions, 8 measures.
- Dashboards: up to 40 widgets and 12 filters. Widgets: up to 5 actions. Forms: up to 40 inputs.
- Widget actions are limited to 30 runs per minute per user and workspace.
- Public share links need the public sharing licence feature.
- Dashboards are controlled by permissions: `dashboards.view_own`, `dashboards.edit_own`, `dashboards.publish_own`.
- Check your edition on [aancer.ai/pricing](https://aancer.ai/pricing).
