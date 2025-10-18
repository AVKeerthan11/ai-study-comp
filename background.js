// background.js

const GEMINI_API_KEY = "AIzaSyB92lVdoX1DusBrv7FgCGhI7M5VcQCbAaM";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
// Call Gemini API with timeout
async function callGeminiAPI(prompt) {
  return new Promise(async (resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("API request timed out after 30 seconds"));
    }, 30000);

    try {
      console.log("Sending request to Gemini API...");
      
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error Response:", errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Gemini API response received");

      // Handle response format
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        resolve(data.candidates[0].content.parts[0].text);
      } else if (data.error) {
        reject(new Error(data.error.message || "API error"));
      } else {
        console.log("Unexpected response format:", data);
        reject(new Error("Unexpected API response format"));
      }
    } catch (error) {
      clearTimeout(timeout);
      reject(error);
    }
  });
}

// Check if Chrome Built-in AI is available
async function checkChromeAIAvailability() {
  return false; // Force using Gemini API for now
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "summarize") {
    handleSummarize(request.text, sendResponse);
    return true;
  }
  
  if (request.action === "explain") {
    handleExplain(request.text, sendResponse);
    return true;
  }
  
  if (request.action === "quiz") {
    handleQuiz(request.text, sendResponse);
    return true;
  }
  
  return false;
});

// Common handler for all AI functions
async function handleAIRequest(text, prompt, sendResponse) {
  try {
    console.log("Starting AI request for:", prompt.substring(0, 50) + "...");
    
    const useChromeAI = await checkChromeAIAvailability();
    
    if (useChromeAI) {
      // Use Chrome Built-in AI
      const result = await ai.prompt.execute(prompt);
      sendResponse({ success: true, result: result, source: "chrome_ai" });
    } else {
      // Use Gemini API
      const result = await callGeminiAPI(prompt);
      sendResponse({ success: true, result: result, source: "gemini_api" });
    }
    
  } catch (error) {
    console.error("AI Request Error:", error);
    sendResponse({ 
      success: false, 
      error: `AI service error: ${error.message}. Please check your API key and internet connection.` 
    });
  }
}

// Summarize function
async function handleSummarize(text, sendResponse) {
  const prompt = `Please provide a concise 2-3 sentence summary of the following text. Focus on the main points:\n\n${text}`;
  await handleAIRequest(text, prompt, sendResponse);
}

// Explain function
async function handleExplain(text, sendResponse) {
  const prompt = `Explain the following text in simple, easy-to-understand terms for a student. Use clear language and examples if helpful:\n\n${text}`;
  await handleAIRequest(text, prompt, sendResponse);
}

// Quiz function
async function handleQuiz(text, sendResponse) {
  // In handleQuiz function, update the prompt:
const prompt = `Create 3 multiple-choice quiz questions based on this text. 
For each question, provide:
1. [Question text]
A) [Option A] 
B) [Option B]
C) [Option C]
D) [Option D]

At the end, write: Answers: 1. A, 2. B, 3. C (use letters A, B, C, D for answers)

Text: ${text}`;
  await handleAIRequest(text, prompt, sendResponse);
}

// Test API connection
async function testGeminiAPI() {
  try {
    console.log("Testing Gemini API connection...");
    const result = await callGeminiAPI("Say 'API test successful' in one sentence.");
    console.log("✅ Gemini API test successful:", result);
    return true;
  } catch (error) {
    console.error("❌ Gemini API test failed:", error);
    return false;
  }
}

chrome.runtime.onInstalled.addListener(() => {
  console.log("AI Study Companion installed");
  testGeminiAPI();
});