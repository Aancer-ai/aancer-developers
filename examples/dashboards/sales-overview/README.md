# Sales overview (dashboard)

Pack `acme.sales-dashboard`. Seven items that stack:

- datasets `sales_orders` and `regions`
- model `sales` with measures `revenue`, `units` and `orders`, a named filter `this_month` and a left join on region
- widgets `revenue_by_region` (bar chart), `revenue_this_month` (KPI) and `recent_orders` (table)
- dashboard `sales-overview` with a period filter and a layout on the 12-column grid

All items are workspace items, placed by the pack parameter `target_workspace`. On activation the dashboard is created and published. The datasets start empty: fill them from a workflow Publish step, an agent, an import or an embedded app.

The chart fragment carries no data, no `$schema` and no URLs. AANCER injects the query result.
