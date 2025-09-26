// frontend/js/voice_script.js

const BACKEND_URL = "http://127.0.0.1:8000";

// DOM elements
const startButton = document.getElementById("startButton");
const stopButton = document.getElementById("stopButton");
const recordingStatus = document.getElementById("recordingStatus");
const transcribedTextDisplay = document.getElementById("transcribedText");
const languageSelect = document.getElementById("languageSelect");
const loadingVoiceSearch = document.getElementById("loadingVoiceSearch");
const voiceSearchResultsDiv = document.getElementById("voiceSearchResults");
const noVoiceResultsDiv = document.getElementById("noVoiceResults");
const voiceErrorDiv = document.getElementById("voiceError");
const voiceErrorMessage = document.getElementById("voiceErrorMessage");
const micPermissionGuide = document.getElementById("micPermissionGuide");
const micPermissionMessage = document.getElementById("micPermissionMessage");
const micDeniedMessage = document.getElementById("micDeniedMessage");

let recognition;
let isRecording = false;

// UI Helpers
function showLoadingSearch() {
  loadingVoiceSearch.classList.remove("hidden");
  voiceSearchResultsDiv.classList.add("hidden");
  noVoiceResultsDiv.classList.add("hidden");
  voiceErrorDiv.classList.add("hidden");
}
function hideLoadingSearch() {
  loadingVoiceSearch.classList.add("hidden");
}
function showNoResults() {
  noVoiceResultsDiv.classList.remove("hidden");
  voiceSearchResultsDiv.innerHTML = "";
  voiceSearchResultsDiv.classList.add("hidden");
}
function hideNoResults() {
  noVoiceResultsDiv.classList.add("hidden");
}
function showVoiceError(message) {
  voiceErrorMessage.textContent = message;
  voiceErrorDiv.classList.remove("hidden");
  voiceSearchResultsDiv.classList.add("hidden");
  noVoiceResultsDiv.classList.add("hidden");
}
function hideVoiceError() {
  voiceErrorDiv.classList.add("hidden");
}

// Image Display
function displayImageResults(results) {
  voiceSearchResultsDiv.innerHTML = "";
  if (results.length === 0) {
    showNoResults();
    return;
  }
  hideNoResults();
  voiceSearchResultsDiv.classList.remove("hidden");

  results.forEach((item) => {
    const card = document.createElement("div");
    card.className =
      "bg-white border border-gray-200 rounded-lg p-3 shadow-sm text-center flex flex-col justify-between";

    const imageUrl = item.thumbnail_link;

    card.innerHTML = `
        <a href="${imageUrl}" target="_blank" rel="noopener noreferrer" class="block mb-2">
            <img src="${imageUrl}" alt="${item.title}" class="w-full h-40 object-contain rounded-lg border border-gray-300 mx-auto" loading="lazy"
                 onerror="this.onerror=null;this.src='https://via.placeholder.com/150?text=No+Image';" />
        </a>
        <h3 class="text-md font-semibold text-gray-800">${item.title}</h3>
    `;
    voiceSearchResultsDiv.appendChild(card);
  });
}

// Speech Recognition Logic
function initializeSpeechRecognition() {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    showVoiceError(
      "متصفحك لا يدعم التعرف على الكلام. يرجى استخدام Chrome أو متصفح متوافق."
    );
    startButton.classList.add("hidden");
    micPermissionGuide.classList.add("hidden");
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = "ar-JO";

  recognition.onstart = () => {
    isRecording = true;
    startButton.classList.add("hidden");
    stopButton.classList.remove("hidden");
    stopButton.disabled = false;
    recordingStatus.classList.remove("hidden");
    transcribedTextDisplay.textContent = "استمع...";
    hideVoiceError();
    hideNoResults();
  };

  recognition.onresult = (event) => {
    let finalTranscript = "";
    let interimTranscript = "";
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }
    transcribedTextDisplay.textContent =
      finalTranscript || "جاري التعرف: " + interimTranscript;
    if (finalTranscript) {
      searchSignImagesFromText(finalTranscript);
    }
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
    if (event.error === "not-allowed" || event.error === "permission-denied") {
      micPermissionGuide.classList.remove("hidden");
      micPermissionMessage.classList.add("hidden");
      micDeniedMessage.classList.remove("hidden");
      startButton.classList.add("hidden");
    } else {
      showVoiceError(`خطأ في التعرف: ${event.error}. حاول مرة أخرى.`);
    }
  };

  recognition.onend = () => {
    isRecording = false;
    startButton.classList.remove("hidden");
    stopButton.classList.add("hidden");
    recordingStatus.classList.add("hidden");
  };
}

async function checkMicPermission() {
  if (window.location.protocol === "file:") {
    showVoiceError(
      "هذه الميزة لا تعمل عند فتح الملف مباشرة. يرجى تشغيل المشروع عبر خادم محلي (مثل إضافة Live Server في VS Code)."
    );
    micPermissionGuide.classList.remove("hidden");
    micPermissionMessage.innerHTML =
      '<p class="text-red-600 font-bold">خطأ في التشغيل</p><p>لا يمكن الوصول للميكروفون من بروتوكول file://</p>';
    startButton.classList.add("hidden");
    return;
  }

  if (!navigator.permissions || !navigator.permissions.query) {
    startButton.classList.remove("hidden");
    return;
  }
  try {
    const permissionStatus = await navigator.permissions.query({
      name: "microphone",
    });
    permissionStatus.onchange = checkMicPermission;

    if (permissionStatus.state === "granted") {
      micPermissionGuide.classList.add("hidden");
      startButton.classList.remove("hidden");
    } else if (permissionStatus.state === "denied") {
      micPermissionGuide.classList.remove("hidden");
      micPermissionMessage.classList.add("hidden");
      micDeniedMessage.classList.remove("hidden");
      startButton.classList.add("hidden");
    } else {
      micPermissionGuide.classList.remove("hidden");
      micPermissionMessage.classList.remove("hidden");
      micDeniedMessage.classList.add("hidden");
      startButton.classList.remove("hidden");
    }
  } catch (error) {
    console.error("Error checking mic permission:", error);
    showVoiceError("حدث خطأ أثناء التحقق من إذن الميكروفون.");
  }
}

async function searchSignImagesFromText(text) {
  const searchTerm = text.trim();
  if (!searchTerm) return;

  showLoadingSearch();
  hideVoiceError();
  hideNoResults();

  try {
    const response = await fetch(
      `${BACKEND_URL}/search-dictionary/?query=${encodeURIComponent(
        searchTerm
      )}`
    );
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `خطأ في الخادم: ${response.status}`);
    }
    const data = await response.json();
    displayImageResults(data.results);
  } catch (error) {
    console.error("Error fetching images from voice:", error);
    showVoiceError(`فشل البحث: ${error.message}`);
  } finally {
    hideLoadingSearch();
  }
}

// Event Listeners
startButton.addEventListener("click", () => {
  if (!isRecording) {
    if (!recognition) initializeSpeechRecognition();
    if (recognition) recognition.start();
  }
});
stopButton.addEventListener("click", () => {
  if (isRecording && recognition) recognition.stop();
});
document.addEventListener("DOMContentLoaded", checkMicPermission);
