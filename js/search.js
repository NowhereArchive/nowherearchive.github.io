document.addEventListener('DOMContentLoaded', async function () {
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    let characters = [];
    let chapters = [];
    let selectedIndex = -1;
    let currentResults = [];

    // Show loading state
    function showLoading() {
        const searchContainer = document.querySelector('.search-container');
        if (searchContainer && !searchContainer.querySelector('.search-loading')) {
            const loading = document.createElement('div');
            loading.className = 'search-loading';
            loading.innerHTML = '<div class="loading-spinner"></div><p>Loading search data...</p>';
            loading.style.cssText = 'position: absolute; top: 100%; left: 0; right: 0; background: var(--surface-light, #1e1e1e); padding: 1rem; text-align: center; border-radius: 8px; margin-top: 8px; z-index: 100;';
            searchContainer.appendChild(loading);
        }
    }

    // Hide loading state
    function hideLoading() {
        const loading = document.querySelector('.search-loading');
        if (loading) {
            loading.remove();
        }
    }

    // Show error state
    function showError(message) {
        const searchContainer = document.querySelector('.search-container');
        if (searchContainer) {
            const error = document.createElement('div');
            error.className = 'search-error';
            error.innerHTML = `<p style="color: var(--accent, #ff3a3a); margin: 0;">${message}</p>`;
            error.style.cssText = 'position: absolute; top: 100%; left: 0; right: 0; background: var(--surface-light, #1e1e1e); padding: 1rem; text-align: center; border-radius: 8px; margin-top: 8px; z-index: 100;';
            searchContainer.appendChild(error);
            setTimeout(() => error.remove(), 5000);
        }
    }

    // Load characters data
    async function loadCharacters() {
        try {
            const response = await fetch('characters/characters.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            characters = data.characters || [];
            console.log('Loaded characters:', characters.length);
            return true;
        } catch (error) {
            console.error('Error loading characters:', error);
            showError('Failed to load characters data. Some search results may be unavailable.');
            characters = [];
            return false;
        }
    }

    // Load chapters data with new structure
    async function loadChapters() {
        try {
            const response = await fetch('CGs/chapters.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            // Flatten the new structure into a searchable array
            chapters = [];
            Object.keys(data).forEach(category => {
                data[category].forEach(chapter => {
                    chapters.push({
                        name: chapter.name,
                        displayName: chapter.displayName,
                        category: category
                    });
                });
            });

            console.log('Loaded chapters:', chapters.length);
            return true;
        } catch (error) {
            console.error('Error loading chapters:', error);
            showError('Failed to load chapters data. Some search results may be unavailable.');
            chapters = [];
            return false;
        }
    }

    // Show loading and wait for data to be loaded
    showLoading();
    await Promise.all([loadCharacters(), loadChapters()]);
    hideLoading();
    
    console.log('Data loaded:', {
        characterCount: characters.length,
        chapterCount: chapters.length
    });

    // Function to navigate to character page
    function navigateToCharacter(characterName) {
        window.location.href = `characters/${characterName}/voicelines`;
    }

    // Function to navigate to chapter page
    function navigateToChapter(chapterName) {
        window.location.href = `CGs/${chapterName}`;
    }

    function performSearch(query) {
        if (!query.trim()) {
            const results = document.querySelector('.search-results');
            if (results) results.remove();
            return;
        }

        const queryLower = query.toLowerCase();

        // Search characters
        const characterResults = characters.filter(char => {
            // Check if any character property matches the query
            const searchableProps = [
                char.name ?.toLowerCase(),
                char.displayName ?.toLowerCase(),
                char.rank ?.toLowerCase(),
                char.libram ?.toLowerCase(),
                char.tendency ?.toLowerCase(),
                char.category ?.toLowerCase(),
                ...Object.values(char.traits || {}).map(trait => trait ?.toLowerCase())
            ].filter(Boolean);

            return searchableProps.some(property =>
                property.includes(queryLower)
            );
        });

        // Search chapters
        const chapterResults = chapters.filter(chapter => {
            const matchesName = chapter.displayName.toLowerCase().includes(queryLower);
            const matchesCategory = chapter.category ?.toLowerCase().includes(queryLower);
            const matchesChapterNum = chapter.name.toLowerCase().includes(queryLower);

            return matchesName || matchesCategory || matchesChapterNum;
        });

        // Combine and sort results
        const results = [
            ...characterResults.map(char => ({
                type: 'character',
                name: char.name,
                displayName: char.displayName,
                subtitle: char.rank || char.category || '',
                action: () => navigateToCharacter(char.name)
            })),
            ...chapterResults.map(chapter => ({
                type: 'cg',
                name: chapter.name,
                displayName: chapter.displayName,
                subtitle: chapter.category,
                action: () => navigateToChapter(chapter.name)
            }))
        ];

        displayResults(results, query);
    }

    // Display search results
    function displayResults(results, query) {
        // Remove existing results if any
        const existingResults = document.querySelector('.search-results');
        if (existingResults) {
            existingResults.remove();
        }

        // Reset selected index
        selectedIndex = -1;
        currentResults = results;

        const resultsContainer = document.createElement('div');
        resultsContainer.className = 'search-results';
        resultsContainer.setAttribute('role', 'listbox');
        resultsContainer.setAttribute('aria-label', 'Search results');
        resultsContainer.innerHTML = '';

        if (results.length === 0) {
            resultsContainer.innerHTML = `<div class="search-result-item no-results" role="option">No results found for "${query}"</div>`;
        } else {
            // Show up to 8 results for better UX
            const maxResults = 8;
            const displayResults = results.slice(0, maxResults);
            
            displayResults.forEach((result, index) => {
                const item = document.createElement('div');
                item.className = 'search-result-item';
                item.setAttribute('role', 'option');
                item.setAttribute('aria-selected', 'false');
                item.setAttribute('data-index', index);
                item.setAttribute('tabindex', '-1');

                const typeLabel = result.type === 'character' ? 'Character' : 'CG';
                const subtitle = result.subtitle ? ` • ${result.subtitle}` : '';

                item.innerHTML = `
                    <div class="result-title">${result.displayName}</div>
                    <div class="result-type">${typeLabel}${subtitle}</div>
                `;
                
                item.addEventListener('click', () => {
                    result.action();
                });
                
                item.addEventListener('mouseenter', () => {
                    // Remove highlight from all items
                    document.querySelectorAll('.search-result-item').forEach(i => {
                        i.classList.remove('highlighted');
                        i.setAttribute('aria-selected', 'false');
                    });
                    // Highlight current item
                    item.classList.add('highlighted');
                    item.setAttribute('aria-selected', 'true');
                    selectedIndex = index;
                });
                
                resultsContainer.appendChild(item);
            });

            // Add result count if there are more
            if (results.length > maxResults) {
                const moreResults = document.createElement('div');
                moreResults.className = 'search-result-item no-results';
                moreResults.style.cursor = 'default';
                moreResults.textContent = `+${results.length - maxResults} more results`;
                resultsContainer.appendChild(moreResults);
            }
        }

        // Add new results
        const searchContainer = document.querySelector('.search-container');
        if (searchContainer) {
            searchContainer.appendChild(resultsContainer);
        }
    }

    // Handle keyboard navigation
    function handleKeyboardNavigation(e) {
        const results = document.querySelectorAll('.search-result-item:not(.no-results)');
        if (results.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                selectedIndex = (selectedIndex + 1) % results.length;
                updateHighlight(results);
                break;
            case 'ArrowUp':
                e.preventDefault();
                selectedIndex = selectedIndex <= 0 ? results.length - 1 : selectedIndex - 1;
                updateHighlight(results);
                break;
            case 'Enter':
                if (selectedIndex >= 0 && selectedIndex < results.length) {
                    e.preventDefault();
                    results[selectedIndex].click();
                }
                break;
        }
    }

    function updateHighlight(results) {
        results.forEach((item, index) => {
            if (index === selectedIndex) {
                item.classList.add('highlighted');
                item.setAttribute('aria-selected', 'true');
                item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            } else {
                item.classList.remove('highlighted');
                item.setAttribute('aria-selected', 'false');
            }
        });
    }

    // Close results when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            const results = document.querySelector('.search-results');
            if (results) results.remove();
        }
    });

    // Prevent search container clicks from closing results
    const searchContainer = document.querySelector('.search-container');
    if (searchContainer) {
        searchContainer.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    // Event listeners
    if (searchButton) {
        searchButton.addEventListener('click', () => performSearch(searchInput.value));
    }

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            if (e.target.value.length > 1) {
                performSearch(e.target.value);
            } else {
                const results = document.querySelector('.search-results');
                if (results) results.remove();
            }
        });

        // Enhanced keyboard navigation
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const results = document.querySelector('.search-results');
                if (results) results.remove();
                searchInput.blur();
                selectedIndex = -1;
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const results = document.querySelectorAll('.search-result-item:not(.no-results)');
                if (results.length > 0) {
                    if (selectedIndex >= 0 && selectedIndex < results.length) {
                        results[selectedIndex].click();
                    } else {
                        results[0].click();
                    }
                }
            } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                handleKeyboardNavigation(e);
            }
        });
    }

    // Add search shortcut (press / to focus search)
    document.addEventListener('keydown', (e) => {
        if (e.key === '/' && document.activeElement !== searchInput) {
            e.preventDefault();
            searchInput.focus();
        }
    });
});