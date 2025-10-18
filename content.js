// content.js

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Content script received message:", request);
  
  if (request === "GET_SELECTION") {
    try {
      // Get selected text
      const selectedText = window.getSelection().toString().trim();
      console.log("Selected text found:", selectedText.substring(0, 50) + "...");
      
      // If no selection, try to get page text as fallback
      if (!selectedText) {
        const pageText = document.body.innerText.trim().substring(0, 1000);
        console.log("No selection, using page text:", pageText.substring(0, 50) + "...");
        sendResponse({ text: pageText });
      } else {
        sendResponse({ text: selectedText });
      }
    } catch (error) {
      console.error("Error getting selection:", error);
      sendResponse({ text: "" });
    }
  }
  return true; // Keep message channel open for async response
});

// Also inject our script when page loads
console.log("AI Study Companion content script loaded");