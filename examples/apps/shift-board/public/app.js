// Shift board: a static app with no sign-in (sso.mode "none"). MIT licence.
// It only reads the dataset shift_plan through the bridge.
// Change PLATFORM_ORIGIN to the address of your AANCER installation.
const PLATFORM_ORIGIN = "https://aancer.example.com";

const statusEl = document.getElementById("status");

async function main() {
  try {
    const bridge = await AancerBridge.connect({ platformOrigin: PLATFORM_ORIGIN });
    const data = await bridge.call("read:dataset", { datasetId: "shift_plan", limit: 100 });
    const tbody = document.querySelector("#plan tbody");
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
    statusEl.textContent = `${(data.rows || []).length} shifts.`;
  } catch (err) {
    statusEl.textContent = `Could not load the plan: ${err.code || err.message}`;
  }
}

main();
