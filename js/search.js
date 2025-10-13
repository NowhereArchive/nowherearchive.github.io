document.addEventListener('DOMContentLoaded', async function () {
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    let characters = [];
    let chapters = [];

    // Load characters data
    async function loadCharacters() {
        try {
            const response = await fetch('characters/characters.json');
            const data = await response.json();
            characters = data.characters || [];
            console.log('Loaded characters:', characters.length);
        } catch (error) {
            console.error('Error loading characters:', error);
            characters = [];
        }
    }

    // Load chapters data with new structure
    async function loadChapters() {
        try {
            const response = await fetch('CGs/chapters.json');
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
        } catch (error) {
            console.error('Error loading chapters:', error);
            chapters = [];
        }
    }

    // Wait for data to be loaded before allowing search
    await Promise.all([loadCharacters(), loadChapters()]);
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

        const resultsContainer = document.createElement('div');
        resultsContainer.className = 'search-results';
        resultsContainer.innerHTML = '';

        if (results.length === 0) {
            resultsContainer.innerHTML = `<div class="search-result-item no-results">No results found for "${query}"</div>`;
        } else {
            // Show up to 8 results for better UX
            const maxResults = 8;
            results.slice(0, maxResults).forEach(result => {
                const item = document.createElement('div');
                item.className = 'search-result-item';

                const typeLabel = result.type === 'character' ? 'Character' : 'CG';
                const subtitle = result.subtitle ? ` • ${result.subtitle}` : '';

                item.innerHTML = `
                    <div class="result-title">${result.displayName}</div>
                    <div class="result-type">${typeLabel}${subtitle}</div>
                `;
                item.addEventListener('click', result.action);
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

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && searchInput.value.trim()) {
                const firstResult = document.querySelector('.search-result-item:not(.no-results)');
                if (firstResult) {
                    firstResult.click();
                }
            }
        });

        // Escape key to close results and blur input
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const results = document.querySelector('.search-results');
                if (results) results.remove();
                searchInput.blur();
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