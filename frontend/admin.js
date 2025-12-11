// Basic client-side password (not secure for production)
// Change this value to something else before you deploy.
const ADMIN_PASSWORD = "admin123";

(async function initAdmin() {
  try {
    const ok = await askPassword();
    if (!ok) {
      document.body.innerHTML = "<div style='padding:40px;color:#fff'><h2>Access denied</h2><p>Wrong password.</p></div>";
      return;
    }
    // wire UI
    const refreshBtn = document.getElementById('refreshBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const searchBox = document.getElementById('searchBox');

    refreshBtn.addEventListener('click', loadData);
    downloadBtn.addEventListener('click', downloadCSV);
    searchBox.addEventListener('input', () => renderRows(window.__assessments || [], searchBox.value.trim()));

    // initial load
    await loadData();
  } catch (e) {
    console.error(e);
    showMessage("Failed to load admin UI: " + e.message, true);
  }
})();

async function askPassword(){
  const entered = prompt("Enter admin key:");
  window.__ADMIN_KEY = entered; // store temporarily
  return true;
}

}

function showMessage(msg, isError=false){
  const el = document.getElementById('message');
  el.textContent = msg;
  el.style.color = isError ? "#ff9aa2" : "#c7f9d3";
}

async function loadData(){
  showMessage("Loading...");
  try {
    const base = window.location.origin; // will work with Render domain
    const res = await fetch(base + "/api/assessments", {
  headers: {
    "x-admin-key": window.__ADMIN_KEY
  }
});
;
    if (!res.ok) throw new Error("API returned " + res.status);
    const data = await res.json();
    // sort by created_at descending if available
    data.sort((a,b) => (new Date(b.created_at || 0)) - (new Date(a.created_at || 0)));
    window.__assessments = data;
    renderRows(data, document.getElementById('searchBox').value.trim());
    showMessage("Loaded " + data.length + " records");
  } catch (err) {
    console.error(err);
    showMessage("Failed to load data: " + err.message, true);
  }
}

function renderRows(rows, filter){
  const tbody = document.getElementById('resultsTbody');
  tbody.innerHTML = "";
  filter = (filter || "").toLowerCase();

  const filtered = rows.filter(r => {
    if (!filter) return true;
    return (String(r.student_id || "") + " " +
            String(r.main_platform || "") + " " +
            String(r.hours_per_day || "") + " " +
            String(r.negative_impact_label || "")).toLowerCase().includes(filter);
  });

  for (const r of filtered){
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.student_id ?? ""}</td>
      <td>${r.hours_per_day ?? ""}</td>
      <td>${r.short_video_minutes ?? ""}</td>
      <td>${escapeHtml(r.main_platform) ?? ""}</td>
      <td>${r.sleep_quality ?? ""}</td>
      <td>${r.procrastination ?? ""}</td>
      <td>${r.stress_level ?? ""}</td>
      <td>${r.performance ?? ""}</td>
      <td>${formatNumber(r.escapism_score)}</td>
      <td>${formatNumber(r.social_connection_score)}</td>
      <td>${formatNumber(r.learning_score)}</td>
      <td>${r.negative_impact_label ?? ""}</td>
      <td>${r.created_at ?? ""}</td>
    `;
    tbody.appendChild(tr);
  }

  if (filtered.length === 0){
    tbody.innerHTML = `<tr><td colspan="13" style="padding:12px;color:#94a3b8">No records found</td></tr>`;
  }
}

function formatNumber(x){ return (x===null || x===undefined) ? "" : Number(x).toFixed(2); }

function escapeHtml(s){
  if (!s) return "";
  return String(s).replace(/[&<>"]/g, c=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
}

function downloadCSV(){
  const rows = window.__assessments || [];
  if (!rows.length) return alert("No data to download");
  const header = ["student_id","hours_per_day","short_video_minutes","main_platform","sleep_quality","procrastination","stress_level","performance","escapism_score","social_connection_score","learning_score","negative_impact_label","created_at"];
  const csv = [header.join(",")];
  for (const r of rows){
    const line = header.map(h => {
      let v = r[h]===null || r[h]===undefined ? "" : String(r[h]);
      // escape quotes
      if (v.includes(",") || v.includes('"')) v = '"' + v.replace(/"/g, '""') + '"';
      return v;
    }).join(",");
    csv.push(line);
  }
  const blob = new Blob([csv.join("\\n")], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'assessments.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
// Secure admin endpoint
app.get('/api/assessments', (req, res) => {
  const adminKey = req.headers["x-admin-key"];
  if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  db.all('SELECT * FROM students ORDER BY created_at DESC LIMIT 500', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});
