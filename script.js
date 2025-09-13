// Configuration
const CONFIG = {
  batchSize: 20, // Number of images to load at once
  throttleDelay: 200 // Delay between image batches
};

// DOM Elements
const elements = {
  promptsBtn: document.getElementById('promptsBtn'),
  aboutBtn: document.getElementById('aboutBtn'),
  contactBtn: document.getElementById('contactBtn'),
  searchPanel: document.getElementById('searchPanel'),
  filterPanel: document.getElementById('filterPanel'),
  filterToggle: document.getElementById('filterToggle'),
  categoryDropdown: document.getElementById('categoryDropdown'),
  searchInput: document.getElementById('searchInput'),
  clearSearch: document.getElementById('clearSearch'),
  promptsPage: document.getElementById('promptsPage'),
  aboutPage: document.getElementById('aboutPage'),
  contactPage: document.getElementById('contactPage'),
  promptsGrid: document.getElementById('promptsGrid'),
  contactForm: document.getElementById('contactForm'),
  footerAbout: document.getElementById('footerAbout'),
  footerContact: document.getElementById('footerContact'),
  applyFilters: document.getElementById('applyFilters'),
  resetFilters: document.getElementById('resetFilters'),
  mobileFilterOverlay: document.getElementById('mobileFilterOverlay'),
  closeMobileFilter: document.getElementById('closeMobileFilter'),
  mobileApplyFilters: document.getElementById('mobileApplyFilters'),
  mobileResetFilters: document.getElementById('mobileResetFilters')
};

// State
let allPrompts = [];
let filteredPrompts = [];
let loadedImages = 0;
let isLoadingImages = false;
let selectedCategories = new Set(['all']);
let tempSelectedCategories = new Set(['all']);

// Initialize
function init() {
  setupEventListeners();
  loadPromptsFromJSON();

  // Show search and filter panels on initial load since we're on the Prompts page
  elements.searchPanel.style.display = 'block';
  elements.filterPanel.style.display = 'block';
}

// Event Listeners
function setupEventListeners() {
  elements.promptsBtn.addEventListener('click', () => {
    switchToPage('prompts');
  });

  elements.aboutBtn.addEventListener('click', () => {
    switchToPage('about');
  });

  elements.contactBtn.addEventListener('click', () => {
    switchToPage('contact');
  });

  elements.footerAbout.addEventListener('click', (e) => {
    e.preventDefault();
    switchToPage('about');
  });

  elements.footerContact.addEventListener('click', (e) => {
    e.preventDefault();
    switchToPage('contact');
  });

  elements.clearSearch.addEventListener('click', () => {
    elements.searchInput.value = '';
    filterPrompts();
  });

  elements.searchInput.addEventListener('input', throttle(filterPrompts, 300));

  // Filter toggle - show appropriate filter UI based on screen size
  elements.filterToggle.addEventListener('click', (e) => {
    e.stopPropagation();

    if (window.innerWidth <= 768) {
      // Show mobile overlay on small screens
      showMobileFilterOverlay();
    } else {
      // Show desktop dropdown on larger screens
      elements.categoryDropdown.classList.toggle('show');
      elements.filterToggle.classList.toggle('active');
    }
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!elements.filterPanel.contains(e.target) && 
        elements.categoryDropdown.classList.contains('show')) {
      elements.categoryDropdown.classList.remove('show');
      elements.filterToggle.classList.remove('active');
    }
  });

  // Category buttons - desktop
  document.querySelectorAll('.category-container .category-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent event from bubbling to document
      handleCategorySelection(btn);
    });
  });

  // Category buttons - mobile overlay
  document.querySelectorAll('.mobile-category-container .category-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleMobileCategorySelection(btn);
    });
  });

  // Apply and reset filters - desktop
  elements.applyFilters.addEventListener('click', () => {
    selectedCategories = new Set(tempSelectedCategories);
    filterPrompts();
    elements.categoryDropdown.classList.remove('show');
    elements.filterToggle.classList.remove('active');
  });

  elements.resetFilters.addEventListener('click', () => {
    tempSelectedCategories = new Set(['all']);
    updateCategoryButtons(tempSelectedCategories);
    selectedCategories = new Set(tempSelectedCategories);
    filterPrompts();
    elements.categoryDropdown.classList.remove('show');
    elements.filterToggle.classList.remove('active');
  });

  // Apply and reset filters - mobile
  elements.mobileApplyFilters.addEventListener('click', () => {
    selectedCategories = new Set(tempSelectedCategories);
    filterPrompts();
    hideMobileFilterOverlay();
  });

  elements.mobileResetFilters.addEventListener('click', () => {
    tempSelectedCategories = new Set(['all']);
    updateMobileCategoryButtons(tempSelectedCategories);
    selectedCategories = new Set(tempSelectedCategories);
    filterPrompts();
    hideMobileFilterOverlay();
  });

  // Close mobile filter
  elements.closeMobileFilter.addEventListener('click', () => {
    hideMobileFilterOverlay();
  });

  // Contact form submission
  elements.contactForm.addEventListener('submit', handleContactSubmit);

  // Lazy load images when scrolling
  window.addEventListener('scroll', throttle(lazyLoadImages, 200));
  window.addEventListener('resize', throttle(lazyLoadImages, 200));
}

// Show mobile filter overlay
function showMobileFilterOverlay() {
  // Sync temp selection with current selection
  tempSelectedCategories = new Set(selectedCategories);
  updateMobileCategoryButtons(tempSelectedCategories);
  elements.mobileFilterOverlay.classList.add('show');
  document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

// Hide mobile filter overlay
function hideMobileFilterOverlay() {
  elements.mobileFilterOverlay.classList.remove('show');
  document.body.style.overflow = ''; // Re-enable scrolling
}

// Handle category selection for desktop
function handleCategorySelection(btn) {
  const category = btn.dataset.category;

  if (category === 'all') {
    tempSelectedCategories.clear();
    tempSelectedCategories.add('all');
    updateCategoryButtons(tempSelectedCategories);
  } else {
    tempSelectedCategories.delete('all');

    if (tempSelectedCategories.has(category)) {
      tempSelectedCategories.delete(category);
      btn.classList.remove('active');

      if (tempSelectedCategories.size === 0) {
        tempSelectedCategories.add('all');
        document.querySelector('.category-container [data-category="all"]').classList.add('active');
      }
    } else {
      tempSelectedCategories.add(category);
      btn.classList.add('active');
      document.querySelector('.category-container [data-category="all"]').classList.remove('active');
    }
  }
}

// Handle category selection for mobile
function handleMobileCategorySelection(btn) {
  const category = btn.dataset.category;

  if (category === 'all') {
    tempSelectedCategories.clear();
    tempSelectedCategories.add('all');
    updateMobileCategoryButtons(tempSelectedCategories);
  } else {
    tempSelectedCategories.delete('all');

    if (tempSelectedCategories.has(category)) {
      tempSelectedCategories.delete(category);
      btn.classList.remove('active');

      if (tempSelectedCategories.size === 0) {
        tempSelectedCategories.add('all');
        document.querySelector('.mobile-category-container [data-category="all"]').classList.add('active');
      }
    } else {
      tempSelectedCategories.add(category);
      btn.classList.add('active');
      document.querySelector('.mobile-category-container [data-category="all"]').classList.remove('active');
    }
  }
}

// Update category buttons based on selection (desktop)
function updateCategoryButtons(categories) {
  document.querySelectorAll('.category-container .category-btn').forEach(btn => {
    const category = btn.dataset.category;
    if (categories.has(category)) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

// Update category buttons based on selection (mobile)
function updateMobileCategoryButtons(categories) {
  document.querySelectorAll('.mobile-category-container .category-btn').forEach(btn => {
    const category = btn.dataset.category;
    if (categories.has(category)) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

// Switch between pages
function switchToPage(page) {
  // Reset all pages and buttons
  elements.promptsPage.classList.remove('active');
  elements.aboutPage.classList.remove('active');
  elements.contactPage.classList.remove('active');
  elements.promptsBtn.classList.remove('active');
  elements.aboutBtn.classList.remove('active');
  elements.contactBtn.classList.remove('active');

  // Hide search and filter panels by default
  elements.searchPanel.style.display = 'none';
  elements.filterPanel.style.display = 'none';
  elements.categoryDropdown.classList.remove('show');
  elements.filterToggle.classList.remove('active');

  // Hide mobile filter overlay if visible
  hideMobileFilterOverlay();

  // Activate selected page and button
  switch(page) {
    case 'prompts':
      elements.promptsPage.classList.add('active');
      elements.promptsBtn.classList.add('active');
      elements.searchPanel.style.display = 'block';
      elements.filterPanel.style.display = 'block';
      break;
    case 'about':
      elements.aboutPage.classList.add('active');
      elements.aboutBtn.classList.add('active');
      break;
    case 'contact':
      elements.contactPage.classList.add('active');
      elements.contactBtn.classList.add('active');
      break;
  }
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

// Handle contact form submission
function handleContactSubmit(e) {
  e.preventDefault();

  // In a real implementation, you would send this data to a server
  // For now, we'll just show a confirmation and reset the form
  alert('Thank you for your message! We will get back to you soon.');
  elements.contactForm.reset();

  // Here you would typically send the form data to your backend
  // using fetch() or XMLHttpRequest
}

// Search Functions
function filterPrompts() {
  const searchTerm = elements.searchInput.value.toLowerCase();

  filteredPrompts = allPrompts.filter(prompt => {
    // Check search term
    const matchesSearch = !searchTerm || 
      prompt.title.toLowerCase().includes(searchTerm) ||
      prompt.description.toLowerCase().includes(searchTerm) ||
      prompt.category.toLowerCase().includes(searchTerm);

    // Check category filter
    const matchesCategory = selectedCategories.has('all') || 
      selectedCategories.has(prompt.category.toLowerCase());

    return matchesSearch && matchesCategory;
  });

  renderPromptCards();
}

// Data Loading
async function loadPromptsFromJSON() {
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

    const response = await fetch('prompt.json');
    const data = await response.json();
    processJSONData(data);
  } catch (error) {
    console.error('Error loading prompts:', error);
    showError();
  }
}

function processJSONData(prompts) {
  allPrompts = prompts.map(prompt => ({
    id: prompt.id,
    fileName: prompt.fileName,
    title: prompt.title || '',
    image: prompt.image || '',
    description: prompt.description || '',
    category: prompt.category || ''
  })).reverse(); // Show newest first

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
        <div class="tags" hidden>${prompt.category}</div>
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
        <div class="tags" hidden>${prompt.category}</div>
      </div>
    `;

    // Add fade-in effect
    const imgElement = card.querySelector('.card-image');
    setTimeout(() => {
      imgElement.classList.add('loaded');
    }, 50);

    // Redirect to prompt page on click
    card.addEventListener('click', () => {
      window.location.href = `prompt/${prompt.fileName}`;
    });
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
        <div class="tags" hidden>${prompt.category}</div>
      </div>
    `;

    // Redirect to prompt page on click
    card.addEventListener('click', () => {
      window.location.href = `prompt/${prompt.fileName}`;
    });
    loadedImages++;
  };
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
