const fs = require("fs");
const path = require("path");

const jsonPath = path.join(__dirname, "..", "test-report", "results.json");
const htmlPath = path.join(__dirname, "..", "test-report", "index.html");

if (!fs.existsSync(jsonPath)) {
  console.warn("No test results found at test-report/results.json. Run npm test first.");
  process.exit(0);
}

const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDuration(ms) {
  if (ms == null || ms < 0) return "-";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatDate(ts) {
  if (!ts) return "-";
  return new Date(ts).toLocaleString();
}

const statusClass = data.success ? "success" : "failure";
const statusText = data.success ? "All tests passed" : "Some tests failed";

const results = data.testResults || [];
const lastEnd = results.length ? Math.max(...results.map((r) => r.endTime || 0)) : 0;
const duration = lastEnd ? lastEnd - data.startTime : null;

const summaryHtml = `
  <div class="summary ${statusClass}">
    <h1>Test Report</h1>
    <p class="status">${escapeHtml(statusText)}</p>
    <div class="stats">
      <span>Tests: ${data.numPassedTests}/${data.numTotalTests} passed</span>
      <span>Suites: ${data.numPassedTestSuites}/${data.numTotalTestSuites} passed</span>
      <span>Duration: ${formatDuration(duration)}</span>
      <span>Run at: ${formatDate(data.startTime)}</span>
    </div>
  </div>
`;

const fileResults = (data.testResults || []).map((file) => {
  const fileName = path.basename(file.name);
  const fileStatusClass = file.status === "passed" ? "passed" : "failed";
  const testsHtml = (file.assertionResults || [])
    .map((t) => {
      const testStatusClass = t.status === "passed" ? "passed" : "failed";
      const failureHtml =
        t.failureMessages?.length > 0
          ? `<pre class="failure-msg">${escapeHtml(t.failureMessages.join("\n\n"))}</pre>`
          : "";
      return `
        <div class="test ${testStatusClass}">
          <span class="test-icon">${t.status === "passed" ? "✓" : "✗"}</span>
          <span class="test-title">${escapeHtml(t.title)}</span>
          <span class="test-duration">${formatDuration(t.duration)}</span>
          ${failureHtml}
        </div>
      `;
    })
    .join("");

  return `
    <div class="file ${fileStatusClass}">
      <div class="file-header">
        <span class="file-icon">${file.status === "passed" ? "✓" : "✗"}</span>
        <span class="file-name">${escapeHtml(fileName)}</span>
        <span class="file-stats">${file.assertionResults?.filter((t) => t.status === "passed").length || 0}/${file.assertionResults?.length || 0} passed</span>
      </div>
      <div class="tests">${testsHtml}</div>
    </div>
  `;
}).join("");

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Report - ${escapeHtml(statusText)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 24px; background: #1a1a2e; color: #eaeaea; line-height: 1.5; }
    .summary { padding: 24px; border-radius: 8px; margin-bottom: 24px; }
    .summary.success { background: #0d3320; border: 1px solid #22c55e; }
    .summary.failure { background: #331a0d; border: 1px solid #ef4444; }
    .summary h1 { margin: 0 0 8px 0; font-size: 1.5rem; }
    .summary .status { margin: 0 0 16px 0; font-weight: 600; }
    .summary.success .status { color: #22c55e; }
    .summary.failure .status { color: #ef4444; }
    .stats { display: flex; flex-wrap: wrap; gap: 16px; font-size: 0.9rem; opacity: 0.9; }
    .file { border: 1px solid #333; border-radius: 8px; margin-bottom: 16px; overflow: hidden; }
    .file.passed { border-color: #22c55e40; }
    .file.failed { border-color: #ef444440; }
    .file-header { padding: 12px 16px; background: #252540; display: flex; align-items: center; gap: 12px; }
    .file-icon { font-weight: bold; }
    .file.passed .file-icon { color: #22c55e; }
    .file.failed .file-icon { color: #ef4444; }
    .file-name { flex: 1; font-weight: 500; }
    .file-stats { font-size: 0.85rem; opacity: 0.8; }
    .tests { padding: 8px; }
    .test { padding: 8px 16px; display: flex; align-items: flex-start; gap: 12px; border-radius: 4px; }
    .test:hover { background: #252540; }
    .test.passed .test-icon { color: #22c55e; }
    .test.failed .test-icon { color: #ef4444; }
    .test-title { flex: 1; }
    .test-duration { font-size: 0.85rem; opacity: 0.7; }
    .failure-msg { margin: 8px 0 0 28px; padding: 12px; background: #1a1a1a; border-radius: 4px; font-size: 0.8rem; overflow-x: auto; white-space: pre-wrap; color: #fca5a5; border-left: 3px solid #ef4444; }
  </style>
</head>
<body>
  ${summaryHtml}
  <div class="files">${fileResults}</div>
</body>
</html>
`;

const dir = path.dirname(htmlPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}
fs.writeFileSync(htmlPath, html);
console.log("HTML report written to test-report/index.html");
