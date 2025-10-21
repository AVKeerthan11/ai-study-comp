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
  if (request.action === "studySession") {
  handleStudySession(request.text, sendResponse);
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
async function handleStudySession(text, sendResponse) {
  try {
    const prompt = `Create a comprehensive study session with 5 multiple-choice questions based on this text. 
    For each question, provide:
    1. [Question text]
    A) [Option A] 
    B) [Option B]
    C) [Option C]
    D) [Option D]
    
    At the end, write: Answers: 1. X, 2. X, 3. X, 4. X, 5. X (replace X with correct letters A-D)
    
    Text: ${text}`;

    const quizText = await callGeminiAPI(prompt);
    const questions = parseStudySessionQuestions(quizText);
    
    sendResponse({ 
      success: true, 
      questions: questions 
    });
    
  } catch (error) {
    console.error("Study session error:", error);
    sendResponse({ 
      success: false, 
      error: "Failed to create study session" 
    });
  }
}

// Parse study session questions
function parseStudySessionQuestions(quizText) {
  const questions = [];
  const lines = quizText.split('\n').filter(line => line.trim());
  let currentQuestion = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.match(/^\d+\.\s+.+/)) {
      if (currentQuestion) questions.push(currentQuestion);
      currentQuestion = {
        question: line.replace(/^\d+\.\s*/, ''),
        options: [],
        correctAnswer: ''
      };
    } 
    else if (line.match(/^[A-D][\.\)]\s+.+/i) && currentQuestion) {
      currentQuestion.options.push(line);
    }
    else if (line.toLowerCase().includes('answer') && currentQuestion) {
      const answerLetters = line.match(/[A-D]/gi);
      if (answerLetters) {
        answerLetters.forEach((answer, index) => {
          if (questions[index]) {
            questions[index].correctAnswer = answer.toUpperCase();
          } else if (currentQuestion && index === questions.length) {
            currentQuestion.correctAnswer = answer.toUpperCase();
          }
        });
      }
    }
  }
  
  if (currentQuestion) questions.push(currentQuestion);
  
  // Ensure we have exactly 5 questions
  const finalQuestions = questions.slice(0, 5);
  
  // Fill in missing answers
  finalQuestions.forEach((q, index) => {
    if (!q.correctAnswer && q.options.length > 0) {
      const firstOption = q.options[0].match(/^([A-D])[\.\)]/i);
      q.correctAnswer = firstOption ? firstOption[1].toUpperCase() : 'A';
    }
  });
  
  return finalQuestions;
}
async function handleStudySession(text, sendResponse) {
  try {
    // For now, use simulated questions for demo
    const simulatedQuestions = [
      {
        question: "What is the main topic discussed in the text?",
        options: ["A) Historical events", "B) Technical concepts", "C) Fictional story", "D) Personal opinion"],
        correctAnswer: "B"
      },
      {
        question: "The text appears to be primarily:",
        options: ["A) Entertaining", "B) Informational", "C) Persuasive", "D) Fictional"],
        correctAnswer: "B"
      },
      {
        question: "What would help understand this text better?",
        options: ["A) Reading quickly", "B) Breaking it down", "C) Skipping details", "D) Focusing on conclusions"],
        correctAnswer: "B"
      },
      {
        question: "The content seems most useful for:",
        options: ["A) Entertainment", "B) Learning", "C) Shopping", "D) Socializing"],
        correctAnswer: "B"
      },
      {
        question: "How would you describe the text's complexity?",
        options: ["A) Very simple", "B) Moderately complex", "C) Highly technical", "D) Completely confusing"],
        correctAnswer: "B"
      }
    ];
    
    sendResponse({ 
      success: true, 
      questions: simulatedQuestions 
    });
    
  } catch (error) {
    console.error("Study session error:", error);
    sendResponse({ 
      success: false, 
      error: "Study session feature in development" 
    });
  }
}