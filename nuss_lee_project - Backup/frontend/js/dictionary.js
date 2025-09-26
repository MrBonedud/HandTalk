// frontend/js/dictionary.js

const BACKEND_URL = "http://127.0.0.1:8000";

const searchInput = document.getElementById("searchInput");
const languageSelect = document.getElementById("languageSelect");
const searchButton = document.getElementById("searchButton");
const clearSearchBtn = document.getElementById("clearSearchBtn");
const dictionaryResults = document.getElementById("dictionaryResults");
const loadingDictionary = document.getElementById("loadingDictionary");
const noResultsDiv = document.getElementById("noResults");
const dictionaryErrorDiv = document.getElementById("dictionaryError");
const dictionaryErrorMessage = document.getElementById(
  "dictionaryErrorMessage"
);

let searchTimeout;

function showLoading() {
  loadingDictionary.classList.remove("hidden");
  dictionaryResults.classList.add("hidden");
  noResultsDiv.classList.add("hidden");
  dictionaryErrorDiv.classList.add("hidden");
}
function hideLoading() {
  loadingDictionary.classList.add("hidden");
}
function showNoResults() {
  noResultsDiv.classList.remove("hidden");
  dictionaryResults.innerHTML = "";
  dictionaryResults.classList.add("hidden");
}
function hideNoResults() {
  noResultsDiv.classList.add("hidden");
}
function showDictionaryError(message) {
  dictionaryErrorMessage.textContent = message;
  dictionaryErrorDiv.classList.remove("hidden");
  dictionaryResults.classList.add("hidden");
  noResultsDiv.classList.add("hidden");
}
function hideDictionaryError() {
  dictionaryErrorDiv.classList.add("hidden");
}

async function fetchSignImages() {
  const searchTerm = searchInput.value.trim();

  if (!searchTerm) {
    dictionaryResults.innerHTML = "";
    hideNoResults();
    hideDictionaryError();
    clearSearchBtn.classList.add("hidden");
    return;
  }

  showLoading();
  hideNoResults();
  hideDictionaryError();
  clearSearchBtn.classList.remove("hidden");

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
    console.error("Error fetching dictionary images:", error);
    showDictionaryError(`فشل في البحث عن الصور: ${error.message}`);
  } finally {
    hideLoading();
  }
}

function displayImageResults(results) {
  dictionaryResults.innerHTML = "";
  if (results.length === 0) {
    showNoResults();
    return;
  }
  hideNoResults();
  dictionaryResults.classList.remove("hidden");

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
    dictionaryResults.appendChild(card);
  });
}

searchInput.addEventListener("input", () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(fetchSignImages, 500);
});

searchInput.addEventListener("keypress", (event) => {
  if (event.key === "Enter") {
    clearTimeout(searchTimeout);
    fetchSignImages();
  }
});

searchButton.addEventListener("click", fetchSignImages);

clearSearchBtn.addEventListener("click", () => {
  searchInput.value = "";
  clearSearchBtn.classList.add("hidden");
  dictionaryResults.innerHTML = "";
  hideNoResults();
  hideDictionaryError();
});
