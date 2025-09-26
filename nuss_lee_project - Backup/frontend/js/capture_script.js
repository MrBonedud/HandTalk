// frontend/js/capture_script.js

const BACKEND_URL = "http://127.0.0.1:8000";

const cameraFeed = document.getElementById("cameraFeed");
const capturedImagePreview = document.getElementById("capturedImagePreview");
const canvas = document.getElementById("canvas");
const initiateCameraButton = document.getElementById("initiateCameraButton");
const captureButton = document.getElementById("captureButton");
const retakeButton = document.getElementById("retakeButton");
const promptInput = document.getElementById("promptInput");
const analyzeButton = document.getElementById("analyzeButton");
const loadingIndicator = document.getElementById("loadingIndicator");
const resultsDiv = document.getElementById("results");
const analysisOutput = document.getElementById("analysisOutput");
const errorDiv = document.getElementById("error");
const errorMessage = document.getElementById("errorMessage");
const cameraPermissionGuide = document.getElementById("cameraPermissionGuide");
const permissionDeniedMessage = document.getElementById(
  "permissionDeniedMessage"
);

let currentStream;
let capturedFile = null;

function showLoading() {
  loadingIndicator.classList.remove("hidden");
}
function hideLoading() {
  loadingIndicator.classList.add("hidden");
}
function displayResults(result) {
  analysisOutput.textContent = result;
  resultsDiv.classList.remove("hidden");
}
function hideResults() {
  resultsDiv.classList.add("hidden");
  analysisOutput.textContent = "";
}
function showError(message) {
  errorMessage.textContent = message;
  errorDiv.classList.remove("hidden");
}
function hideError() {
  errorDiv.classList.add("hidden");
  errorMessage.textContent = "";
}

async function startCameraStream() {
  hideError();
  capturedImagePreview.src = "#";
  capturedImagePreview.classList.add("hidden");
  cameraFeed.classList.remove("hidden");
  analyzeButton.disabled = true;
  retakeButton.classList.add("hidden");
  captureButton.classList.remove("hidden");
  cameraPermissionGuide.classList.add("hidden");
  permissionDeniedMessage.classList.add("hidden");

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    cameraFeed.srcObject = stream;
    currentStream = stream;
    captureButton.disabled = false;
  } catch (err) {
    console.error("Error accessing camera:", err);
    stopCamera();
    cameraFeed.classList.add("hidden");
    captureButton.classList.add("hidden");

    if (
      err.name === "NotAllowedError" ||
      err.name === "PermissionDeniedError"
    ) {
      cameraPermissionGuide.classList.remove("hidden");
      initiateCameraButton.classList.add("hidden");
      permissionDeniedMessage.classList.remove("hidden");
    } else {
      showError("فشل الوصول إلى الكاميرا. تأكد من أنها موصولة.");
      cameraPermissionGuide.classList.remove("hidden");
      initiateCameraButton.classList.remove("hidden");
    }
  }
}

function stopCamera() {
  if (currentStream) {
    currentStream.getTracks().forEach((track) => track.stop());
    currentStream = null;
  }
}

async function checkCameraPermission() {
  if (window.location.protocol === "file:") {
    showError(
      "هذه الميزة لا تعمل عند فتح الملف مباشرة. يرجى تشغيل المشروع عبر خادم محلي."
    );
    cameraPermissionGuide.classList.remove("hidden");
    initiateCameraButton.classList.add("hidden");
    return;
  }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showError("هذا المتصفح لا يدعم الوصول إلى الكاميرا.");
    initiateCameraButton.classList.add("hidden");
    cameraPermissionGuide.classList.remove("hidden");
    return;
  }
  try {
    const permissionStatus = await navigator.permissions.query({
      name: "camera",
    });
    if (permissionStatus.state === "granted") {
      cameraPermissionGuide.classList.add("hidden");
      initiateCameraButton.classList.remove("hidden");
      initiateCameraButton.click();
    } else {
      cameraPermissionGuide.classList.remove("hidden");
      initiateCameraButton.classList.remove("hidden");
    }
  } catch (error) {
    // Fallback for browsers that don't support permissions.query
    cameraPermissionGuide.classList.remove("hidden");
    initiateCameraButton.classList.remove("hidden");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  checkCameraPermission();
  if (promptInput && !promptInput.value.trim()) {
    promptInput.value =
      "انت خبير بلغة الإشارة وبحياة الصم والبكم. شغلك الوحيد إنك تحلل الصور اللي إلها علاقة بالصم والبكم مثل إشارات الأيدي أو الأدوات المساعدة أو المواقف الحياتية الخاصة فيهم. ممنوع تحكي عن نصوص مكتوبة أو فواتير أو فلوس أو أي شي مالي. إذا الصورة ما إلها علاقة بالصم والبكم لازم تجاوب بجملة وحدة: هاي الصورة مش متعلقة بالصم والبكم. إذا كانت الصورة فعلاً عن الصم والبكم لازم توصف شو شايف بشكل واضح وتشرح إشارات الأيدي إذا موجودة، وتبين معناها وكيف ممكن تنفهم، وتحكي باللهجة الأردنية بشكل إنساني وبسيط كإنك تشرح لشخص عادي.";
  }
});

window.addEventListener("beforeunload", stopCamera);
initiateCameraButton.addEventListener("click", startCameraStream);

captureButton.addEventListener("click", () => {
  hideError();
  const context = canvas.getContext("2d");
  canvas.width = cameraFeed.videoWidth;
  canvas.height = cameraFeed.videoHeight;
  context.drawImage(cameraFeed, 0, 0, canvas.width, canvas.height);

  canvas.toBlob((blob) => {
    if (blob) {
      capturedFile = new File([blob], "captured_image.png", {
        type: "image/png",
      });
      capturedImagePreview.src = URL.createObjectURL(blob);
      capturedImagePreview.classList.remove("hidden");
      cameraFeed.classList.add("hidden");
      stopCamera();
      captureButton.classList.add("hidden");
      retakeButton.classList.remove("hidden");
      analyzeButton.disabled = false;
    }
  }, "image/png");
});

retakeButton.addEventListener("click", () => {
  capturedFile = null;
  capturedImagePreview.src = "#";
  capturedImagePreview.classList.add("hidden");
  retakeButton.classList.add("hidden");
  startCameraStream();
});

analyzeButton.addEventListener("click", async () => {
  if (!capturedFile) {
    showError("الرجاء التقاط صورة أولاً.");
    return;
  }

  showLoading();
  hideResults();
  hideError();
  analyzeButton.disabled = true;

  const formData = new FormData();
  formData.append("file", capturedFile);
  formData.append("prompt_text", promptInput.value);

  try {
    const response = await fetch(`${BACKEND_URL}/analyze-image/`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `خطأ من الخادم: ${response.status}`);
    }

    const data = await response.json();
    displayResults(data.analysis_result);
  } catch (error) {
    console.error("An error occurred during fetch:", error);
    showError(
      `فشل الاتصال بالخادم الخلفي: ${error.message}. تأكد من أن الخادم يعمل.`
    );
  } finally {
    hideLoading();
    analyzeButton.disabled = false;
  }
});
