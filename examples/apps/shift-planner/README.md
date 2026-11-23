# Shift planner (embedded app with sign-in)

Pack `acme.shift-planner`, plus the app itself. The app runs on your own server at `https://planner.example.com`. AANCER shows it in the Dashboards navigation and on a Home card.

What it shows:

- `sso.mode: "code"`: AANCER hands the frame a one-time code. `server.mjs` redeems it with the app secret and a PKCE verifier, then checks the token with the introspection endpoint. No AANCER token ever reaches the browser.
- `public/bridge.js`: a small client for the `aancer-bridge/2` postMessage protocol.
- Capabilities `read:me`, `notify`, `navigate`, `read:dataset:shift_plan` and `write:dataset:shift_requests`.
- The page sends `Content-Security-Policy: frame-ancestors https://aancer.example.com` so AANCER may embed it.

Run the app:

```bash
PLATFORM_ORIGIN=https://aancer.example.com APP_ID=shift-planner APP_SECRET=... PORT=8080 node server.mjs
```

Put it behind https on its own origin. Then in AANCER: add your trust key, import and activate the pack, open the app under Manage app, approve the origin, capabilities and identity scopes, and create the app secret. The secret is shown once; give it to the app server as `APP_SECRET`.

Embedded apps need the Embedded apps licence feature.
