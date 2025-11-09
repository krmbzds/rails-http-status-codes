class HttpStatusCodesApp {
  constructor() {
    this.statusCodes = [];
    this.filteredCodes = [];
    this.currentView = "cards"; // cards, list, categories
    this.selectedCategories = new Set(); // selected categories for toggle behavior
    this.init();
  }

  async init() {
    this.bindEvents();
    await this.loadStatusCodes();
    this.updateDropdownText();
    this.render();
  }

  bindEvents() {
    const searchInput = document.getElementById("search");
    const categoryButtons = document.querySelectorAll(".category-btn");
    const themeToggle = document.getElementById("theme-toggle");
    const viewButtons = document.querySelectorAll(".view-btn");
    const dropdownToggle = document.getElementById("dropdown-toggle");
    const dropdownMenu = document.getElementById("dropdown-menu");
    const dropdownCheckboxes = document.querySelectorAll(
      '.dropdown-item input[type="checkbox"]',
    );

    searchInput.addEventListener(
      "input",
      this.debounce(() => this.filterCodes(), 300),
    );

    categoryButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.setCategoryFilter(
          e.target.closest(".category-btn").dataset.category,
        );
      });
    });

    // Dropdown functionality
    if (dropdownToggle && dropdownMenu) {
      dropdownToggle.addEventListener("click", () => {
        dropdownMenu.classList.toggle("show");
      });

      // Close dropdown when clicking outside
      document.addEventListener("click", (e) => {
        if (!e.target.closest(".category-dropdown")) {
          dropdownMenu.classList.remove("show");
        }
      });

      // Handle checkbox changes
      dropdownCheckboxes.forEach((checkbox) => {
        checkbox.addEventListener("change", (e) => {
          this.setCategoryFilter(e.target.dataset.category);
        });
      });
    }

    themeToggle.addEventListener("click", () => this.toggleTheme());

    viewButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.setView(e.target.closest(".view-btn").dataset.view);
      });
    });

    // Initialize theme
    this.initTheme();
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  async loadStatusCodes() {
    try {
      this.showLoading();
      const response = await fetch("reference/status_codes.json");

      if (!response.ok) {
        throw new Error(`Failed to load status codes: ${response.status}`);
      }

      const data = await response.json();
      this.statusCodes = data.status_codes || [];
      this.filteredCodes = [...this.statusCodes];

      this.updateLastUpdated(data.generated_at);
      this.hideLoading();
    } catch (error) {
      this.showError(error.message);
    }
  }

  filterCodes() {
    const searchTerm = document.getElementById("search").value.toLowerCase();

    this.filteredCodes = this.statusCodes.filter((code) => {
      const matchesSearch =
        !searchTerm ||
        code.code.toString().startsWith(searchTerm) ||
        code.message.toLowerCase().includes(searchTerm) ||
        code.symbol.toLowerCase().includes(searchTerm);

      // Match if no categories selected or code's category is in selected set
      const matchesCategory =
        this.selectedCategories.size === 0 ||
        this.selectedCategories.has(code.category);

      return matchesSearch && matchesCategory;
    });

    this.render();
  }

  setCategoryFilter(category) {
    // Toggle individual category
    if (this.selectedCategories.has(category)) {
      this.selectedCategories.delete(category);
    } else {
      this.selectedCategories.add(category);
    }

    // Update button states
    const button = document.querySelector(
      `.category-btn[data-category="${category}"]`,
    );
    if (button) {
      button.classList.toggle("active");
    }

    // Update checkbox states
    const checkbox = document.querySelector(
      `.dropdown-item input[data-category="${category}"]`,
    );
    if (checkbox) {
      checkbox.checked = this.selectedCategories.has(category);
    }

    // Update dropdown text
    this.updateDropdownText();

    this.filterCodes();
  }

  updateDropdownText() {
    const dropdownText = document.getElementById("dropdown-text");
    if (!dropdownText) return;

    if (this.selectedCategories.size === 0) {
      dropdownText.textContent = "Select Categories";
    } else if (this.selectedCategories.size === 1) {
      dropdownText.textContent = Array.from(this.selectedCategories)[0];
    } else {
      dropdownText.textContent = `${this.selectedCategories.size} Categories Selected`;
    }
  }

  render() {
    this.renderStatusCodes();
    this.addCopyEventListeners();
  }

  addCopyEventListeners() {
    const copyButtons = document.querySelectorAll(".copy-btn");

    copyButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const symbol = btn.dataset.symbol;
        this.copyToClipboard(symbol, btn);
      });
    });
  }

  setView(view) {
    this.currentView = view;

    // Update active button
    document.querySelectorAll(".view-btn").forEach((btn) => {
      btn.classList.remove("active");
    });
    document.querySelector(`[data-view="${view}"]`).classList.add("active");

    this.render();
  }

  groupByCategory(codes) {
    const groups = {};
    codes.forEach((code) => {
      if (!groups[code.category]) {
        groups[code.category] = [];
      }
      groups[code.category].push(code);
    });
    return groups;
  }

  renderStatusCodes() {
    const container = document.getElementById("status-codes");

    if (this.filteredCodes.length === 0) {
      container.innerHTML = `
                <div class="no-results">
                    <p>No status codes found matching your criteria.</p>
                </div>
            `;
      return;
    }

    switch (this.currentView) {
      case "cards":
        container.innerHTML = this.filteredCodes
          .map((code) => this.createStatusCodeCard(code))
          .join("");
        container.className = "status-codes-grid";
        break;
      case "list":
        container.innerHTML = this.filteredCodes
          .map((code) => this.createStatusCodeListItem(code))
          .join("");
        container.className = "status-codes-list";
        break;
      case "categories":
        const grouped = this.groupByCategory(this.filteredCodes);
        container.innerHTML = this.createCategoryView(grouped);
        container.className = "status-codes-categories";
        break;
    }
  }

  createStatusCodeCard(code) {
    const categoryClass = code.category.toLowerCase().replace(" ", "-");

    return `
            <div class="status-code-card ${categoryClass}">
                <div class="status-code-header">
                    <div class="status-code-number">${code.code}</div>
                    <div class="status-code-category ${categoryClass}">${code.category}</div>
                </div>
                <div class="status-code-message">${code.message}</div>
                <div class="status-code-symbol">:${code.symbol}</div>
                <div class="status-code-actions">
                    <a href="${code.mdn_url}" target="_blank" rel="noopener" class="status-code-link" style="display: flex; align-items: center; justify-content: center;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 302 302" xml:space="preserve" style="display: block;">
                            <g fill="currentColor">
                                <path d="M120,14.2L35.3,287.8H0.4L85.2,14.2H120z"/>
                                <path d="M150.9,14.2v273.6h-30.8V14.2H150.9z"/>
                                <path d="M270.8,14.2L186,287.8h-34.9l84.8-273.6H270.8z"/>
                                <path d="M301.6,14.2v273.6h-30.8V14.2H301.6z"/>
                            </g>
                        </svg>
                    </a>
                    <button class="copy-btn status-code-link" data-symbol="${code.symbol}" style="display: flex; align-items: center; justify-content: center;">
                        <svg aria-hidden="true" focusable="false" class="octicon octicon-copy" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" display="inline-block" overflow="visible" style="vertical-align:text-bottom">
                            <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"></path>
                            <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;
  }

  createStatusCodeListItem(code) {
    const categoryClass = code.category.toLowerCase().replace(" ", "-");

    return `
            <div class="status-code-list-item ${categoryClass}">
                <div class="status-code-list-number">${code.code}</div>
                <div class="status-code-list-info">
                    <div class="status-code-list-message">${code.message}</div>
                    <div class="status-code-list-symbol">:${code.symbol}</div>
                </div>
                <div class="status-code-list-actions">
                    <a href="${code.mdn_url}" target="_blank" rel="noopener" class="status-code-link" style="display: flex; align-items: center; justify-content: center;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 302 302" xml:space="preserve" style="display: block;">
                            <g fill="currentColor">
                                <path d="M120,14.2L35.3,287.8H0.4L85.2,14.2H120z"/>
                                <path d="M150.9,14.2v273.6h-30.8V14.2H150.9z"/>
                                <path d="M270.8,14.2L186,287.8h-34.9l84.8-273.6H270.8z"/>
                                <path d="M301.6,14.2v273.6h-30.8V14.2H301.6z"/>
                            </g>
                        </svg>
                    </a>
                    <button class="copy-btn status-code-link" data-symbol="${code.symbol}" style="display: flex; align-items: center; justify-content: center;">
                        <svg aria-hidden="true" focusable="false" class="octicon octicon-copy" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" display="inline-block" overflow="visible" style="vertical-align:text-bottom">
                            <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"></path>
                            <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;
  }

  createCategoryView(grouped) {
    const categories = [
      "Informational",
      "Success",
      "Redirection",
      "Client Error",
      "Server Error",
    ];

    return categories
      .map((category) => {
        const codes = grouped[category] || [];
        if (codes.length === 0) return "";

        return `
                <div class="category-section">
                    <h3 class="category-header">${category} (${codes.length})</h3>
                    <div class="category-grid">
                        ${codes.map((code) => this.createCategoryItem(code)).join("")}
                    </div>
                </div>
            `;
      })
      .join("");
  }

  createCategoryItem(code) {
    return `
            <div class="category-item">
                <div class="category-item-number">${code.code}</div>
                <div class="category-item-info">
                    <div class="category-item-message">${code.message}</div>
                    <div class="category-item-symbol">:${code.symbol}</div>
                </div>
                <div class="category-item-actions">
                    <a href="${code.mdn_url}" target="_blank" rel="noopener" class="status-code-link" style="display: flex; align-items: center; justify-content: center;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 302 302" xml:space="preserve" style="display: block;">
                            <g fill="currentColor">
                                <path d="M120,14.2L35.3,287.8H0.4L85.2,14.2H120z"/>
                                <path d="M150.9,14.2v273.6h-30.8V14.2H150.9z"/>
                                <path d="M270.8,14.2L186,287.8h-34.9l84.8-273.6H270.8z"/>
                                <path d="M301.6,14.2v273.6h-30.8V14.2H301.6z"/>
                            </g>
                        </svg>
                    </a>
                    <button class="copy-btn status-code-link" data-symbol="${code.symbol}" style="display: flex; align-items: center; justify-content: center;">
                        <svg aria-hidden="true" focusable="false" class="octicon octicon-copy" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" display="inline-block" overflow="visible" style="vertical-align:text-bottom">
                            <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"></path>
                            <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;
  }

  copyToClipboard(text, button) {
    navigator.clipboard
      .writeText(":" + text.toString())
      .then(() => {
        // Add a brief visual feedback
        if (button) {
          button.classList.add("copy-success");
        }

        setTimeout(() => {
          if (button) {
            button.classList.remove("copy-success");
          }
        }, 500);
      })
      .catch((err) => {
        console.error("Failed to copy: ", err);
      });
  }

  showLoading() {
    document.getElementById("loading").style.display = "block";
    document.getElementById("error").style.display = "none";
    document.getElementById("status-codes-container").style.display = "none";
  }

  hideLoading() {
    document.getElementById("loading").style.display = "none";
    document.getElementById("status-codes-container").style.display = "block";
  }

  showError(message) {
    const errorElement = document.getElementById("error");
    errorElement.textContent = message;
    errorElement.style.display = "block";
    document.getElementById("loading").style.display = "none";
    document.getElementById("status-codes-container").style.display = "none";
  }

  showSuccess(message) {
    // Create a temporary success message
    const successDiv = document.createElement("div");
    successDiv.className = "success-message";
    successDiv.textContent = message;
    successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: var(--green);
            color: var(--bg);
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 1000;
            max-width: 90vw;
            word-wrap: break-word;
        `;

    document.body.appendChild(successDiv);

    // Remove after 3 seconds
    setTimeout(() => {
      if (document.body.contains(successDiv)) {
        document.body.removeChild(successDiv);
      }
    }, 3000);
  }

  updateLastUpdated(timestamp) {
    if (!timestamp) return;

    // Parse the ISO-8601 UTC timestamp and display it in ISO-8601 UTC format
    const date = new Date(timestamp);
    const iso8601UTC = date.toISOString();

    document.getElementById("footer-updated").textContent = iso8601UTC;
  }

  initTheme() {
    // Check for saved theme preference or default to dark
    const savedTheme = localStorage.getItem("theme") || "dark";
    this.setTheme(savedTheme);
  }

  toggleTheme() {
    const currentTheme = document.body.classList.contains("light-theme")
      ? "light"
      : "dark";
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    this.setTheme(newTheme);
  }

  setTheme(theme) {
    const body = document.body;
    const themeIcon = document.getElementById("theme-icon");

    if (theme === "light") {
      body.classList.add("light-theme");
      themeIcon.innerHTML = `
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            `;
      themeIcon.classList.remove("moon");
      themeIcon.classList.add("sun");
    } else {
      body.classList.remove("light-theme");
      themeIcon.innerHTML = `
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            `;
      themeIcon.classList.remove("sun");
      themeIcon.classList.add("moon");
    }

    // Save theme preference
    localStorage.setItem("theme", theme);
  }
}

// Add CSS dynamically
const style = document.createElement("style");
style.textContent = `
    .no-results {
        grid-column: 1 / -1;
        text-align: center;
        padding: 3rem 1rem;
        color: var(--comment);
        font-size: 1.1rem;
    }
`;
document.head.appendChild(style);

// Initialize the app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.app = new HttpStatusCodesApp();
});
