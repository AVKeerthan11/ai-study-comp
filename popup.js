// popup.js
const selectedTextEl = document.getElementById("selectedText");
const resultEl = document.getElementById("result");
const summarizeBtn = document.getElementById("summarizeBtn");
const explainBtn = document.getElementById("explainBtn");
const quizBtn = document.getElementById("quizBtn");

async function fetchSelectionFromActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tab.id, "GET_SELECTION", (response) => {
      resolve(response?.text || "");
    });
  });
}

async function loadSelection() {
  const text = await fetchSelectionFromActiveTab();
  selectedTextEl.value = text || "";
}
document.addEventListener("DOMContentLoaded", loadSelection);

// For today we'll just show basic handlers
summarizeBtn.addEventListener("click", async () => {
  const text = selectedTextEl.value.trim();
  if (!text) { resultEl.textContent = "Select text on the page first."; return; }
  resultEl.textContent = "Ready to call Summarizer API (Day 2)";
});

explainBtn.addEventListener("click", () => {
  resultEl.textContent = "Ready to call Prompt API for explanation (Day 2)";
});

quizBtn.addEventListener("click", () => {
  resultEl.textContent = "Ready to call Writer API for quiz generation (Day 2)";
});
