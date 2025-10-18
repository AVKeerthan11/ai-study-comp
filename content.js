// content.js
function getSelectedText() {
  const sel = window.getSelection();
  return sel ? sel.toString() : "";
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request === "GET_SELECTION") {
    sendResponse({ text: getSelectedText() });
  }
});
