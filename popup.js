// popup.js
const selectedTextEl = document.getElementById("selectedText");
const resultEl = document.getElementById("result");
const summarizeBtn = document.getElementById("summarizeBtn");
const explainBtn = document.getElementById("explainBtn");
const quizBtn = document.getElementById("quizBtn");

// Function to get selected text from active tab
async function fetchSelectionFromActiveTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) return "";
    
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tab.id, "GET_SELECTION", (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error getting selection:", chrome.runtime.lastError);
          resolve("");
        } else {
          resolve(response?.text || "");
        }
      });
    });
  } catch (error) {
    console.error("Error fetching selection:", error);
    return "";
  }
}

// Load selection when popup opens
async function loadSelection() {
  try {
    const text = await fetchSelectionFromActiveTab();
    selectedTextEl.value = text || "";
    
    // Update UI based on text length
    if (text && text.length >= 20) {
      resultEl.textContent = "Text loaded! Choose an action above.";
      resultEl.className = "ready";
    } else if (text) {
      resultEl.textContent = "Text selected. For best results, select more content.";
      resultEl.className = "warning";
    } else {
      resultEl.textContent = "Select text on the page first, then open this extension.";
      resultEl.className = "info";
    }
  } catch (error) {
    console.error("Error loading selection:", error);
    resultEl.textContent = "Error loading selection. Please refresh the page and try again.";
    resultEl.className = "error";
  }
}

// Parse quiz questions from AI response
// Fixed quiz parsing function
// Fixed quiz parsing function - handles both numbers and letters
function parseQuizResponse(quizText) {
  const questions = [];
  const lines = quizText.split('\n').filter(line => line.trim());
  let currentQuestion = null;
  
  console.log('Raw quiz text:', quizText);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Look for question lines (1., 2., 3.)
    if (line.match(/^\d+\.\s+.+/)) {
      if (currentQuestion) questions.push(currentQuestion);
      currentQuestion = {
        question: line.replace(/^\d+\.\s*/, ''),
        options: [],
        correctAnswer: ''
      };
    } 
    // Look for options (A), B), C), D) or 1), 2), 3), 4))
    else if (line.match(/^[A-D1-4][\.\)]\s+.+/i) && currentQuestion) {
      currentQuestion.options.push(line);
    }
    // Look for answer line
    else if ((line.toLowerCase().includes('answer') || line.toLowerCase().includes('correct')) && currentQuestion) {
      console.log('Found answer line:', line);
      
      // Try multiple patterns to extract answers
      let answersFound = false;
      
      // Pattern 1: "Answers: 1. A, 2. B, 3. C" or "Answers: A, B, C"
      const answerPattern1 = line.match(/(\d+\.\s*)?[A-D]/gi);
      if (answerPattern1) {
        const cleanAnswers = answerPattern1.map(a => a.replace(/^\d+\.\s*/i, '').toUpperCase());
        console.log('Pattern 1 answers:', cleanAnswers);
        
        cleanAnswers.forEach((answer, index) => {
          if (questions[index]) {
            questions[index].correctAnswer = answer;
            answersFound = true;
          } else if (currentQuestion && index === questions.length) {
            currentQuestion.correctAnswer = answer;
            answersFound = true;
          }
        });
      }
      
      // Pattern 2: "1-A, 2-B, 3-C" or "1:A, 2:B, 3:C"
      if (!answersFound) {
        const answerPattern2 = line.match(/\d+[\-\:]\s*[A-D]/gi);
        if (answerPattern2) {
          answerPattern2.forEach(pair => {
            const match = pair.match(/(\d+)[\-\:]\s*([A-D])/i);
            if (match) {
              const qIndex = parseInt(match[1]) - 1;
              const answer = match[2].toUpperCase();
              if (questions[qIndex]) {
                questions[qIndex].correctAnswer = answer;
                answersFound = true;
              }
            }
          });
        }
      }
      
      // Pattern 3: Just letters "A, B, C" in sequence
      if (!answersFound) {
        const simpleAnswers = line.match(/\b[A-D]\b/gi);
        if (simpleAnswers && simpleAnswers.length >= questions.length) {
          simpleAnswers.forEach((answer, index) => {
            if (questions[index]) {
              questions[index].correctAnswer = answer.toUpperCase();
              answersFound = true;
            }
          });
        }
      }
      
      console.log('Answers found:', answersFound);
    }
  }
  
  if (currentQuestion) questions.push(currentQuestion);
  
  // Final fallback: if no answers found, assign based on option order
  questions.forEach((q, index) => {
    if (!q.correctAnswer && q.options.length > 0) {
      // Extract the first letter of the first option as default answer
      const firstOptionMatch = q.options[0].match(/^([A-D1-4])[\.\)]/i);
      if (firstOptionMatch) {
        let defaultAnswer = firstOptionMatch[1].toUpperCase();
        // Convert numbers 1-4 to letters A-D
        if (defaultAnswer === '1') defaultAnswer = 'A';
        if (defaultAnswer === '2') defaultAnswer = 'B';
        if (defaultAnswer === '3') defaultAnswer = 'C';
        if (defaultAnswer === '4') defaultAnswer = 'D';
        q.correctAnswer = defaultAnswer;
      } else {
        q.correctAnswer = 'A'; // Ultimate fallback
      }
      console.log(`Assigned default answer for Q${index + 1}: ${q.correctAnswer}`);
    }
  });
  
  console.log('Final parsed questions:', questions);
  return questions;
}
// Display interactive quiz
function displayInteractiveQuiz(questions) {
  let quizHTML = '<div class="quiz-container">';
  quizHTML += '<h4>🧠 Test Your Knowledge</h4>';
  
  questions.forEach((q, index) => {
    quizHTML += `
      <div class="quiz-question">
        <div class="question-text">${q.question}</div>
        <div class="quiz-options">
          ${q.options.map(opt => {
            // Extract the option letter/number - handle both "A)" and "1)" formats
            const optionMatch = opt.match(/^([A-D1-4])[\.\)]/i);
            let optionKey = optionMatch ? optionMatch[1].toUpperCase() : 'A';
            
            // Convert numbers to letters if needed
            if (optionKey === '1') optionKey = 'A';
            if (optionKey === '2') optionKey = 'B';
            if (optionKey === '3') optionKey = 'C';
            if (optionKey === '4') optionKey = 'D';
            
            return `
              <div class="quiz-option" data-question="${index}" data-option="${optionKey}">
                ${opt}
              </div>
            `;
          }).join('')}
        </div>
        <div class="quiz-feedback" id="feedback-${index}"></div>
      </div>
    `;
  });
  
  quizHTML += `
    <div class="quiz-actions">
      <button id="checkAnswers" class="quiz-button">Check Answers</button>
      <button id="tryAgain" class="quiz-button secondary">Try Another Quiz</button>
    </div>
  </div>`;
  
  resultEl.innerHTML = quizHTML;
  resultEl.className = "success";
  
  // Add event listeners for option selection
  document.querySelectorAll('.quiz-option').forEach(option => {
    option.addEventListener('click', function() {
      const questionIndex = this.dataset.question;
      const optionValue = this.dataset.option;
      
      // Remove selected class from all options in this question
      document.querySelectorAll(`.quiz-option[data-question="${questionIndex}"]`).forEach(opt => {
        opt.classList.remove('selected');
      });
      
      // Add selected class to clicked option
      this.classList.add('selected');
      this.dataset.selected = 'true';
    });
  });
  
  // Check answers button
  document.getElementById('checkAnswers').addEventListener('click', function() {
    checkQuizAnswers(questions);
  });
  
  // Try again button
  document.getElementById('tryAgain').addEventListener('click', function() {
    quizBtn.click();
  });
}

// Check quiz answers
// Fixed answer checking
function checkQuizAnswers(questions) {
  let score = 0;
  const totalQuestions = questions.length;
  
  console.log('Checking answers for questions:', questions);
  
  questions.forEach((q, index) => {
    const selectedOption = document.querySelector(`.quiz-option[data-question="${index}"].selected`);
    const feedbackEl = document.getElementById(`feedback-${index}`);
    
    if (selectedOption) {
      const selectedAnswer = selectedOption.dataset.option.toUpperCase();
      const correctAnswer = q.correctAnswer.toUpperCase();
      
      console.log(`Question ${index + 1}:`);
      console.log(`- Selected: ${selectedAnswer}`);
      console.log(`- Correct: ${correctAnswer}`);
      console.log(`- Options: ${q.options}`);
      
      if (selectedAnswer === correctAnswer) {
        feedbackEl.innerHTML = '✅ Correct! Well done!';
        feedbackEl.className = 'quiz-feedback correct';
        score++;
        console.log(`- Result: CORRECT`);
      } else {
        feedbackEl.innerHTML = `❌ Incorrect. Correct answer: ${q.correctAnswer}`;
        feedbackEl.className = 'quiz-feedback incorrect';
        console.log(`- Result: INCORRECT`);
      }
    } else {
      feedbackEl.innerHTML = `⚠️ Not answered. Correct answer: ${q.correctAnswer}`;
      feedbackEl.className = 'quiz-feedback unanswered';
      console.log(`- Result: UNANSWERED`);
    }
  });
  
  // ... rest of score display code
}

// Send text to background for AI processing
async function processWithAI(action, text) {
  try {
    resultEl.textContent = "Processing...";
    resultEl.className = "processing";
    
    const response = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Request timed out. Please try again."));
      }, 45000);
      
      chrome.runtime.sendMessage({ 
        action: action, 
        text: text 
      }, (response) => {
        clearTimeout(timeout);
        resolve(response);
      });
    });
    
    if (response.success) {
      if (action === "quiz") {
        // Parse and display interactive quiz
        const questions = parseQuizResponse(response.result);
        if (questions.length > 0) {
          displayInteractiveQuiz(questions);
        } else {
          // Fallback to plain text display
          resultEl.textContent = response.result;
          resultEl.className = "success";
        }
      } else {
        resultEl.textContent = response.result;
        resultEl.className = "success";
      }
    } else {
      resultEl.textContent = response.error || "Something went wrong. Please try again.";
      resultEl.className = "error";
    }
  } catch (error) {
    console.error("Error processing with AI:", error);
    resultEl.textContent = `Error: ${error.message}`;
    resultEl.className = "error";
  }
}

// Event Listeners
summarizeBtn.addEventListener("click", async () => {
  const text = selectedTextEl.value.trim();
  if (!text) {
    resultEl.textContent = "Please select text on the page first.";
    resultEl.className = "error";
    return;
  }
  
  if (text.length < 50) {
    resultEl.textContent = "Please select more text to summarize (at least 50 characters).";
    resultEl.className = "warning";
    return;
  }
  
  await processWithAI("summarize", text);
});

explainBtn.addEventListener("click", async () => {
  const text = selectedTextEl.value.trim();
  if (!text) {
    resultEl.textContent = "Please select text on the page first.";
    resultEl.className = "error";
    return;
  }
  
  if (text.length < 20) {
    resultEl.textContent = "Please select some text to explain.";
    resultEl.className = "warning";
    return;
  }
  
  await processWithAI("explain", text);
});

quizBtn.addEventListener("click", async () => {
  const text = selectedTextEl.value.trim();
  if (!text) {
    resultEl.textContent = "Please select text on the page first.";
    resultEl.className = "error";
    return;
  }
  
  if (text.length < 100) {
    resultEl.textContent = "Please select more text for a good quiz (at least 100 characters).";
    resultEl.className = "warning";
    return;
  }
  
  await processWithAI("quiz", text);
});

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", loadSelection);

// Refresh selection when popup is focused
document.addEventListener("focus", loadSelection);