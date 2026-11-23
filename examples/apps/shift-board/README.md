# Shift board (embedded app without sign-in)

Pack `acme.shift-board`. A static page on `https://board.example.com` that reads the dataset `shift_plan` through the bridge. It uses `sso.mode: "none"`, so it gets no credential and needs no app server logic. The pack also adds a navigation link to an intranet page.

Any static web server works, as long as it sends `Content-Security-Policy: frame-ancestors <your AANCER address>` and no `X-Frame-Options: DENY` or `SAMEORIGIN`.

After activation an administrator approves the origin and the capability `read:dataset:shift_plan`. The person who opens the app also needs permission to view datasets in that workspace.
