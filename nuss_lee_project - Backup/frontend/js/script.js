// frontend/js/script.js

// IMPORTANT: Update this URL if your backend is running on a different address or port!
// For local development, it's typically http://127.0.0.1:8000 or http://localhost:8000
const BACKEND_URL = "http://127.0.0.1:8000";

// Get references to DOM elements
const imageUpload = document.getElementById("imageUpload");
const imagePreview = document.getElementById("imagePreview");
const fileNameDisplay = document.getElementById("fileName");
const uploadButtonText = document.getElementById("uploadButtonText");
const promptInput = document.getElementById("promptInput");
const analyzeButton = document.getElementById("analyzeButton");
const loadingIndicator = document.getElementById("loadingIndicator");
const resultsDiv = document.getElementById("results");
const analysisOutput = document.getElementById("analysisOutput");
const errorDiv = document.getElementById("error");
const errorMessage = document.getElementById("errorMessage");

let selectedFile = null; // Variable to store the currently selected image file

// Set default prompt text when the page loads
document.addEventListener("DOMContentLoaded", () => {
  if (promptInput && !promptInput.value.trim()) {
    // Only set default if textarea is empty
    promptInput.value =
      "انت خبير بلغة الإشارة وبحياة الصم والبكم. شغلك الوحيد إنك تحلل الصور اللي إلها علاقة بالصم والبكم مثل إشارات الأيدي أو الأدوات المساعدة أو المواقف الحياتية الخاصة فيهم. ممنوع تحكي عن نصوص مكتوبة أو فواتير أو فلوس أو أي شي مالي. إذا الصورة ما إلها علاقة بالصم والبكم لازم تجاوب بجملة وحدة: هاي الصورة مش متعلقة بالصم والبكم. إذا كانت الصورة فعلاً عن الصم والبكم لازم توصف شو شايف بشكل واضح وتشرح إشارات الأيدي إذا موجودة، وتبين معناها وكيف ممكن تنفهم، وتحكي باللهجة الأردنية بشكل إنساني وبسيط كإنك تشرح لشخص عادي.";
  }
});

// Event listener for image file selection
if (imageUpload) {
  imageUpload.addEventListener("change", function (event) {
    selectedFile = event.target.files[0]; // Get the first selected file
    if (selectedFile) {
      fileNameDisplay.textContent = `الصورة المختارة: ${selectedFile.name}`;
      uploadButtonText.textContent = "تغيير الصورة"; // Change button text

      // Display image preview
      const reader = new FileReader();
      reader.onload = function (e) {
        imagePreview.src = e.target.result;
        imagePreview.classList.remove("hidden"); // Show the image preview
      };
      reader.readAsDataURL(selectedFile); // Read file as data URL for preview

      analyzeButton.disabled = false; // Enable the analyze button
      hideResults(); // Hide previous results
      hideError(); // Hide previous errors
    } else {
      // If no file is selected, reset UI
      fileNameDisplay.textContent = "";
      uploadButtonText.textContent = "اختر صورة لتحليلها";
      imagePreview.src = "#";
      imagePreview.classList.add("hidden");
      analyzeButton.disabled = true; // Disable the analyze button
    }
  });
}

// Event listener for paste functionality
document.addEventListener("paste", function (event) {
  event.preventDefault(); // Prevent default paste behavior

  const items = event.clipboardData.items;
  let imagePasted = false;

  for (let i = 0; i < items.length; i++) {
    if (items[i].type.startsWith("image/")) {
      const file = items[i].getAsFile();
      if (file) {
        selectedFile = file; // Set the pasted image as the selected file
        fileNameDisplay.textContent = `الصورة المختارة: (من الحافظة) ${
          file.name || "صورة ملصقة"
        }`;
        uploadButtonText.textContent = "تغيير الصورة"; // Change button text

        const reader = new FileReader();
        reader.onload = function (e) {
          imagePreview.src = e.target.result;
          imagePreview.classList.remove("hidden"); // Show the image preview
        };
        reader.readAsDataURL(selectedFile);

        analyzeButton.disabled = false; // Enable the analyze button
        hideResults(); // Hide previous results
        hideError(); // Hide previous errors
        imagePasted = true;
        break; // Only process the first image found
      }
    }
  }
});

// Event listener for the "Analyze Image" button click
if (analyzeButton) {
  analyzeButton.addEventListener("click", async () => {
    if (!selectedFile) {
      showError("الرجاء اختيار صورة أولاً.");
      return;
    }

    showLoading(); // Show loading indicator
    hideResults(); // Hide any previous results
    hideError(); // Hide any previous errors
    analyzeButton.disabled = true; // Disable button to prevent multiple submissions

    // Create FormData object to send file and text to backend
    const formData = new FormData();
    formData.append("file", selectedFile); // Append the image file (uploaded or pasted)
    formData.append("prompt_text", promptInput.value); // Append the prompt text

    try {
      // Send POST request to the backend API
      const response = await fetch(`${BACKEND_URL}/analyze-image/`, {
        method: "POST",
        body: formData, // FormData automatically sets content-type header
      });

      // Check if the response was successful (status code 200-299)
      if (!response.ok) {
        const errorData = await response.json(); // Attempt to parse error message from backend
        throw new Error(
          errorData.detail || `خطأ في الخادم: ${response.status}`
        );
      }

      // Parse the JSON response from the backend
      const data = await response.json();
      displayResults(data.analysis_result); // Display the analysis result
    } catch (error) {
      console.error("An error occurred during backend communication:", error);
      showError(`حدث خطأ: ${error.message || "فشل في الاتصال بالخدمة."}`);
    } finally {
      hideLoading(); // Hide loading indicator
      analyzeButton.disabled = false; // Re-enable the analyze button
    }
  });
}

// Helper functions for UI manipulation
function showLoading() {
  if (loadingIndicator) loadingIndicator.classList.remove("hidden");
}

function hideLoading() {
  if (loadingIndicator) loadingIndicator.classList.add("hidden");
}

function displayResults(result) {
  if (analysisOutput) analysisOutput.textContent = result;
  if (resultsDiv) resultsDiv.classList.remove("hidden");
}

function hideResults() {
  if (resultsDiv) resultsDiv.classList.add("hidden");
  if (analysisOutput) analysisOutput.textContent = "";
}

function showError(message) {
  if (errorMessage) errorMessage.textContent = message;
  if (errorDiv) errorDiv.classList.remove("hidden");
}

function hideError() {
  if (errorDiv) errorDiv.classList.add("hidden");
  if (errorMessage) errorMessage.textContent = "";
}
