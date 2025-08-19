// Configuration
const CONFIG = {
  googleSheetId: '1vII0tTC_-nesUhWj0nope9VjZQKbsHIl6OJQ0o5MSso',
  sheetName: 'prompt database',
  batchSize: 20, // Number of images to load at once
  throttleDelay: 200 // Delay between image batches
};

// DOM Elements
const elements = {
  promptsBtn: document.getElementById('promptsBtn'),
  aboutBtn: document.getElementById('aboutBtn'),
  searchPanel: document.getElementById('searchPanel'),
  searchInput: document.getElementById('searchInput'),
  clearSearch: document.getElementById('clearSearch'),
  promptsPage: document.getElementById('promptsPage'),
  aboutPage: document.getElementById('aboutPage'),
  promptsGrid: document.getElementById('promptsGrid'),
  expandedView: document.getElementById('expandedView'),
  closeExpanded: document.getElementById('closeExpanded'),
  expandedImage: document.getElementById('expandedImage'),
  expandedTitle: document.getElementById('expandedTitle'),
  expandedInstruction: document.getElementById('expandedInstruction'),
  expandedPrompt: document.getElementById('expandedPrompt'),
  copyPrompt: document.getElementById('copyPrompt')
};

// State
let allPrompts = [];
let filteredPrompts = [];
let loadedImages = 0;
let isLoadingImages = false;

// Initialize
function init() {
  setupEventListeners();
  loadPromptsFromGoogleSheet();

  // Show search panel on initial load since we're on the Prompts page
  elements.searchPanel.style.display = 'block';
}

// Event Listeners
function setupEventListeners() {
  elements.promptsBtn.addEventListener('click', () => {
    elements.promptsBtn.classList.add('active');
    elements.aboutBtn.classList.remove('active');
    elements.promptsPage.classList.add('active');
    elements.aboutPage.classList.remove('active');
    elements.searchPanel.style.display = 'block'; // Show search on prompts page
  });

  elements.aboutBtn.addEventListener('click', () => {
    elements.aboutBtn.classList.add('active');
    elements.promptsBtn.classList.remove('active');
    elements.aboutPage.classList.add('active');
    elements.promptsPage.classList.remove('active');
    elements.searchPanel.style.display = 'none'; // Hide search on about page
  });

  elements.clearSearch.addEventListener('click', () => {
    elements.searchInput.value = '';
    filterPrompts();
  });

  elements.searchInput.addEventListener('input', throttle(filterPrompts, 300));
  elements.closeExpanded.addEventListener('click', hideExpandedView);
  elements.copyPrompt.addEventListener('click', copyPromptToClipboard);

  // Lazy load images when scrolling
  window.addEventListener('scroll', throttle(lazyLoadImages, 200));
  window.addEventListener('resize', throttle(lazyLoadImages, 200));
}

// Throttle function for performance
function throttle(func, limit) {
  let lastFunc;
  let lastRan;
  return function() {
    const context = this;
    const args = arguments;
    if (!lastRan) {
      func.apply(context, args);
      lastRan = Date.now();
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(function() {
        if ((Date.now() - lastRan) >= limit) {
          func.apply(context, args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };
}

// Search Functions
function filterPrompts() {
  const searchTerm = elements.searchInput.value.toLowerCase();

  filteredPrompts = searchTerm 
    ? allPrompts.filter(prompt => 
        prompt.title.toLowerCase().includes(searchTerm) ||
        prompt.prompt.toLowerCase().includes(searchTerm) ||
        prompt.tags.toLowerCase().includes(searchTerm))
    : [...allPrompts];

  renderPromptCards();
}

// Data Loading
async function loadPromptsFromGoogleSheet() {
  try {
    // Show loading state
    elements.promptsGrid.innerHTML = Array(12).fill(`
      <div class="prompt-card loading">
        <div class="card-image"></div>
        <div class="card-content">
          <div class="card-title"></div>
        </div>
      </div>
    `).join('');

    const url = `https://docs.google.com/spreadsheets/d/${CONFIG.googleSheetId}/gviz/tq?tqx=out:json&sheet=${CONFIG.sheetName}`;
    const response = await fetch(url);
    const text = await response.text();
    const json = JSON.parse(text.substr(47).slice(0, -2));
    processSheetData(json.table.rows);
  } catch (error) {
    console.error('Error loading prompts:', error);
    showError();
  }
}

function processSheetData(rows) {
  // Skip header row if exists
  const startRow = rows[0].c[0].v.toLowerCase() === 'title' ? 1 : 0;

  allPrompts = rows.slice(startRow).map(row => ({
    title: row.c[0]?.v || '',
    image: row.c[1]?.v || '',
    instruction: row.c[2]?.v || '',
    prompt: row.c[3]?.v || '',
    tags: row.c[4]?.v || ''
  })).reverse(); // Added reverse() here to show newest first

  filteredPrompts = [...allPrompts];
  renderPromptCards();
}

function showError() {
  elements.promptsGrid.innerHTML = `
    <div class="empty-state">
      <i class="fas fa-exclamation-triangle"></i>
      <p>Failed to load prompts. Please try again later.</p>
    </div>
  `;
}

// Rendering
function renderPromptCards() {
  if (filteredPrompts.length === 0) {
    elements.promptsGrid.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-search"></i>
        <p>No prompts found. Try a different search term.</p>
      </div>
    `;
    return;
  }

  // Show loading state initially
  elements.promptsGrid.innerHTML = filteredPrompts.map((prompt, index) => `
    <div class="prompt-card loading" data-index="${index}" data-title="${prompt.title}">
      <div class="card-image"></div>
      <div class="card-content">
        <div class="card-title"></div>
        <div class="tags" hidden>${prompt.tags}</div>
      </div>
    </div>
  `).join('');

  // Start lazy loading images
  loadedImages = 0;
  lazyLoadImages();
}

// Improved image loading with lazy loading and batching
function lazyLoadImages() {
  if (isLoadingImages) return;

  const cards = document.querySelectorAll('.prompt-card.loading');
  if (cards.length === 0) return;

  isLoadingImages = true;
  const viewportHeight = window.innerHeight;
  const scrollPosition = window.scrollY || window.pageYOffset;

  let loadedInThisBatch = 0;

  for (let i = 0; i < cards.length && loadedInThisBatch < CONFIG.batchSize; i++) {
    const card = cards[i];
    const rect = card.getBoundingClientRect();
    const isVisible = (rect.top <= viewportHeight * 2) && 
                     (rect.bottom >= -viewportHeight * 0.5);

    if (isVisible) {
      const index = parseInt(card.dataset.index);
      const prompt = filteredPrompts[index];
      loadImageForCard(card, prompt);
      loadedInThisBatch++;
    }
  }

  setTimeout(() => {
    isLoadingImages = false;
    // Check if there are more images to load
    if (document.querySelectorAll('.prompt-card.loading').length > 0) {
      lazyLoadImages();
    }
  }, CONFIG.throttleDelay);
}

function loadImageForCard(card, prompt) {
  const img = new Image();
  img.src = `images/${prompt.image}`;

  img.onload = () => {
    card.classList.remove('loading');
    card.innerHTML = `
      <img class="card-image" src="images/${prompt.image}" alt="${prompt.title}" loading="lazy">
      <div class="card-content">
        <h3 class="card-title">${prompt.title}</h3>
        <div class="tags" hidden>${prompt.tags}</div>
      </div>
    `;

    // Add fade-in effect
    const imgElement = card.querySelector('.card-image');
    setTimeout(() => {
      imgElement.classList.add('loaded');
    }, 50);

    card.addEventListener('click', () => showExpandedView(prompt.title));
    loadedImages++;
  };

  img.onerror = () => {
    card.classList.remove('loading');
    card.innerHTML = `
      <div class="card-image" style="background: #eee; display: grid; place-items: center;">
        <i class="fas fa-image" style="font-size: 2em; color: #ccc;"></i>
      </div>
      <div class="card-content">
        <h3 class="card-title">${prompt.title}</h3>
        <div class="tags" hidden>${prompt.tags}</div>
      </div>
    `;
    card.addEventListener('click', () => showExpandedView(prompt.title));
    loadedImages++;
  };
}

// Expanded View
function showExpandedView(title) {
  const prompt = allPrompts.find(p => p.title === title);
  if (!prompt) return;

  elements.expandedImage.src = `images/${prompt.image}`;
  elements.expandedImage.alt = prompt.title;
  elements.expandedTitle.textContent = prompt.title;
  elements.expandedInstruction.textContent = prompt.instruction;
  elements.expandedPrompt.textContent = prompt.prompt;

  elements.expandedView.style.display = 'block';
  document.body.style.overflow = 'hidden';
}

function hideExpandedView() {
  elements.expandedView.style.display = 'none';
  document.body.style.overflow = 'auto';
}

// Clipboard
function copyPromptToClipboard() {
  navigator.clipboard.writeText(elements.expandedPrompt.textContent).then(() => {
    const btn = elements.copyPrompt;
    btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
    btn.classList.add('copied');

    setTimeout(() => {
      btn.innerHTML = '<i class="fas fa-copy"></i> Copy';
      btn.classList.remove('copied');
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy:', err);
    elements.copyPrompt.innerHTML = '<i class="fas fa-exclamation-circle"></i> Error';
    setTimeout(() => {
      elements.copyPrompt.innerHTML = '<i class="fas fa-copy"></i> Copy';
    }, 2000);
  });
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
