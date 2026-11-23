// Page of the shift planner app. MIT licence.
// Change PLATFORM_ORIGIN to the address of your AANCER installation.
const PLATFORM_ORIGIN = "https://aancer.example.com";

const statusEl = document.getElementById("status");
let appSession = null;

async function getPkce() {
  const res = await fetch("/session/pkce", { method: "POST" });
  return res.json(); // { pkceId, challenge }
}

async function redeem(pkceId, code) {
  const res = await fetch("/session/redeem", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pkceId, code }),
  });
  if (!res.ok) throw new Error("sign-in failed");
  return res.json(); // { sessionId, name }
}

async function signIn(bridge, firstPkce) {
  let pkce = firstPkce;
  let code = bridge.sso && bridge.sso.code;
  if (!code) {
    // No code in hello-ack (or it expired): ask for a fresh one.
    pkce = await getPkce();
    ({ code } = await bridge.authorize(pkce.challenge));
  }
  appSession = await redeem(pkce.pkceId, code);
}

async function showPlan(bridge) {
  const data = await bridge.call("read:dataset", { datasetId: "shift_plan", limit: 50 });
  const tbody = document.querySelector("#plan tbody");
  tbody.innerHTML = "";
  for (const row of data.rows || []) {
    const tr = document.createElement("tr");
    for (const key of ["date", "shift", "person"]) {
      const td = document.createElement("td");
      td.textContent = row[key] == null ? "" : String(row[key]);
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  document.getElementById("plan").hidden = false;
}

async function main() {
  try {
    const pkce = await getPkce();
    const bridge = await AancerBridge.connect({ platformOrigin: PLATFORM_ORIGIN, codeChallenge: pkce.challenge });

    bridge.onSessionEnd((reason) => {
      appSession = null;
      statusEl.textContent = `Session ended (${reason}). Reopen the app from AANCER.`;
    });

    await signIn(bridge, pkce);
    statusEl.textContent = `Signed in${appSession.name ? " as " + appSession.name : ""}.`;

    await showPlan(bridge);

    const form = document.getElementById("request");
    form.hidden = false;
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const date = new FormData(form).get("date");
      await bridge.call("write:dataset", { datasetId: "shift_requests", mode: "append", rows: [{ date, status: "requested" }] });
      await bridge.call("notify", { text: `Shift request for ${date} sent.` });
      form.reset();
    });
  } catch (err) {
    statusEl.textContent = `Could not connect: ${err.code || err.message}`;
  }
}

main();
