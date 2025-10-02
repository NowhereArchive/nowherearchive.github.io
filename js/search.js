document.addEventListener('DOMContentLoaded', async function () {
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    let characters = [];
    let chapters = [];

    // Load characters data
    async function loadCharacters() {
        try {
            const response = await fetch('../characters/characters.json');
            const data = await response.json();
            characters = data.characters || [];
            console.log('Loaded characters:', characters);
        } catch (error) {
            console.error('Error loading characters:', error);
            characters = [];
        }
    }

    // Load chapters data
    async function loadChapters() {
        try {
            const response = await fetch('../CGs/chapters.json');
            const data = await response.json();
            chapters = data.chapters;
        } catch (error) {
            console.error('Error loading chapters:', error);
        }
    }

    // Wait for data to be loaded before allowing search
    await Promise.all([loadCharacters(), loadChapters()]);
    console.log('Data loaded:', {
        characters,
        chapters
    });

    // Function to navigate to character page
    function navigateToCharacter(characterName) {
        window.location.href = `characters/${characterName}/Voicelines`;
    }

    // Function to navigate to chapter page
    function navigateToChapter(chapterName) {
        // First convert to kebab-case, then encode URI components
        window.location.href = `CGs/${chapterName}`;
    }

    function performSearch(query) {
        if (!query.trim()) return;

        const queryLower = query.toLowerCase();

        // Search characters
        const characterResults = queryLower === 'character' ? [] : characters.filter(char => {
            // Check if any character property matches the query
            const searchableProps = [
                char.name?.toLowerCase(),
                char.displayName?.toLowerCase(),
                char.rank?.toLowerCase(),
                char.libram?.toLowerCase(),
                char.tendency?.toLowerCase(),
                char.category?.toLowerCase(),
                ...Object.values(char.traits || {}).map(trait => trait.toLowerCase())
            ].filter(Boolean);
            
            return searchableProps.some(property => 
                property.includes(queryLower) && 
                !['character', 'cg'].includes(property)
            );
        });

        // Search chapters (exclude if only matching 'cg' in category)
        const chapterResults = queryLower === 'cg' ? [] : chapters.filter(chapter => {
            const hasMatchingName = chapter.displayName.toLowerCase().includes(queryLower);
            const hasMatchingCategory = chapter.category && 
                chapter.category.toLowerCase().includes(queryLower) && 
                chapter.category.toLowerCase() !== 'cg';
            return hasMatchingName || hasMatchingCategory;
        });

        // Combine and sort results
        const results = [
            ...characterResults.map(char => ({
                type: 'character',
                name: char.name,
                displayName: char.displayName,
                action: () => navigateToCharacter(char.name)
            })),
            ...chapterResults.map(chapter => ({
                type: 'chapter',
                name: chapter.displayName,
                displayName: chapter.displayName,
                category: chapter.category,
                action: () => navigateToChapter(chapter.name)
            }))
        ];

        displayResults(results, query);
    }

    // Display search results
    function displayResults(results, query) {
        const resultsContainer = document.createElement('div');
        resultsContainer.className = 'search-results';
        resultsContainer.innerHTML = '';

        const filteredResults = results.filter(result => {
            if (query.toLowerCase() === 'character' || query.toLowerCase() === 'cg') {
                return true; // Show all results when specifically searching for these terms
            }
            return !(result.type === 'character' && query.toLowerCase() === 'character') &&
                !(result.type === 'chapter' && query.toLowerCase() === 'cg');
        });

        if (filteredResults.length === 0) {
            resultsContainer.innerHTML = `<div class="search-result-item no-results">No results found for "${query}"</div>`;
        } else {
            filteredResults.slice(0, 5).forEach(result => {
                const item = document.createElement('div');
                item.className = 'search-result-item';
                item.innerHTML = `
                    <div class="result-title">${result.displayName}</div>
                    <div class="result-type">${result.type === 'character' ? '' : result.type}${result.category ? ` • ${result.category}` : ''}</div>
                `;
                item.addEventListener('click', result.action);
                resultsContainer.appendChild(item);
            });
        }

        // Remove existing results if any
        const existingResults = document.querySelector('.search-results');
        if (existingResults) {
            existingResults.remove();
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

    // Event listeners
    searchButton.addEventListener('click', () => performSearch(searchInput.value));

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
            const firstResult = document.querySelector('.search-result-item');
            if (firstResult && !firstResult.classList.contains('no-results')) {
                firstResult.click();
            }
        }
    });

    // Add search shortcut (press / to focus search)
    document.addEventListener('keydown', (e) => {
        if (e.key === '/' && document.activeElement !== searchInput) {
            e.preventDefault();
            searchInput.focus();
        }
    });
});
