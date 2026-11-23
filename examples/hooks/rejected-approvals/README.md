# Rejected approvals (event hook)

Pack `acme.approval-alerts`. When an approval in the workspace is decided with the outcome `rejected`, the hook starts the workflow `flow_notify_requester`.

Before you activate:

- The workflow `flow_notify_requester` must exist in the target workspace and be published with the AANCER Event trigger for `approval.decided`. Otherwise the hook is saved switched off with the warning `HANDLER_INACTIVE`.
- Replace `flow_notify_requester` with your workflow id.

Test the filter first. `sample-event.json` is a body for `POST /api/event-hooks/test`. The test only evaluates the filter; it never starts the workflow.

```bash
curl -X POST https://aancer.example.com/api/event-hooks/test \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  --data @sample-event.json
```
