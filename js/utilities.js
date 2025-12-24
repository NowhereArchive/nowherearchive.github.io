// Utility functions for back to top, breadcrumbs, and other shared functionality

// Back to Top Button
(function() {
    'use strict';
    
    function initBackToTop() {
        // Create back to top button
        const backToTop = document.createElement('button');
        backToTop.className = 'back-to-top';
        backToTop.setAttribute('aria-label', 'Back to top');
        backToTop.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="19" x2="12" y2="5"></line>
                <polyline points="5 12 12 5 19 12"></polyline>
            </svg>
        `;
        document.body.appendChild(backToTop);

        // Show/hide button based on scroll position
        function toggleBackToTop() {
            if (window.scrollY > 300) {
                backToTop.classList.add('visible');
            } else {
                backToTop.classList.remove('visible');
            }
        }

        // Scroll to top on click
        backToTop.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });

        // Listen for scroll events
        window.addEventListener('scroll', toggleBackToTop);
        toggleBackToTop(); // Check initial state
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBackToTop);
    } else {
        initBackToTop();
    }
})();

// Breadcrumbs Generator
(function() {
    'use strict';
    
    function generateBreadcrumbs() {
        const breadcrumbContainers = document.querySelectorAll('[data-breadcrumbs]');
        
        breadcrumbContainers.forEach(container => {
            const path = container.getAttribute('data-breadcrumbs');
            const paths = path.split('/').filter(p => p);
            
            const breadcrumb = document.createElement('nav');
            breadcrumb.className = 'breadcrumbs';
            breadcrumb.setAttribute('aria-label', 'Breadcrumb');
            
            const list = document.createElement('ol');
            list.setAttribute('itemscope', '');
            list.setAttribute('itemtype', 'https://schema.org/BreadcrumbList');
            
            // Home link
            const homeItem = document.createElement('li');
            homeItem.setAttribute('itemprop', 'itemListElement');
            homeItem.setAttribute('itemscope', '');
            homeItem.setAttribute('itemtype', 'https://schema.org/ListItem');
            homeItem.innerHTML = `
                <a href="/" itemprop="item">
                    <span itemprop="name">Home</span>
                </a>
                <meta itemprop="position" content="1">
            `;
            list.appendChild(homeItem);
            
            // Build path links
            let currentPath = '';
            paths.forEach((segment, index) => {
                currentPath += '/' + segment;
                const item = document.createElement('li');
                item.setAttribute('itemprop', 'itemListElement');
                item.setAttribute('itemscope', '');
                item.setAttribute('itemtype', 'https://schema.org/ListItem');
                
                const displayName = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/_/g, ' ');
                
                if (index === paths.length - 1) {
                    // Last item (current page)
                    item.innerHTML = `
                        <span class="current" itemprop="name">${displayName}</span>
                        <meta itemprop="position" content="${index + 2}">
                    `;
                } else {
                    // Link item
                    item.innerHTML = `
                        <a href="${currentPath}" itemprop="item">
                            <span itemprop="name">${displayName}</span>
                        </a>
                        <meta itemprop="position" content="${index + 2}">
                    `;
                }
                
                list.appendChild(item);
            });
            
            breadcrumb.appendChild(list);
            container.appendChild(breadcrumb);
        });
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', generateBreadcrumbs);
    } else {
        generateBreadcrumbs();
    }
})();

// Error Handler
(function() {
    'use strict';
    
    window.showError = function(message, container) {
        const errorContainer = container || document.body;
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-container';
        errorDiv.innerHTML = `
            <h3>Error</h3>
            <p>${message}</p>
            <button onclick="this.parentElement.remove()">Dismiss</button>
        `;
        errorContainer.appendChild(errorDiv);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (errorDiv.parentElement) {
                errorDiv.remove();
            }
        }, 10000);
    };
    
    // Global error handler for unhandled errors
    window.addEventListener('error', (event) => {
        console.error('Unhandled error:', event.error);
        // Optionally show user-friendly error message
        // showError('An unexpected error occurred. Please refresh the page.');
    });
    
    // Handle promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        // Optionally show user-friendly error message
        // showError('A network error occurred. Please check your connection.');
    });
})();

// Loading State Helper
(function() {
    'use strict';
    
    window.showLoading = function(container, message) {
        const loadingContainer = container || document.body;
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading-container';
        loadingDiv.innerHTML = `
            <div class="loading-spinner"></div>
            <p>${message || 'Loading...'}</p>
        `;
        loadingContainer.appendChild(loadingDiv);
        return loadingDiv;
    };
    
    window.hideLoading = function(loadingElement) {
        if (loadingElement && loadingElement.parentElement) {
            loadingElement.remove();
        }
    };
})();

