const fs = require('fs');
const path = require('path');

// Read the chapters.json file
const chaptersData = JSON.parse(fs.readFileSync('chapters.json', 'utf8'));

// Read the template
const template = fs.readFileSync('chapter-template.html', 'utf8');

console.log('Starting to generate chapter pages...');

// Process each category and its chapters
Object.entries(chaptersData).forEach(([category, chapters]) => {
  console.log(`\nProcessing category: ${category}`);
  
  // Process each chapter in the category
  chapters.forEach(chapter => {
    const chapterFolder = path.join(chapter.name);
    
    // Create the chapter folder if it doesn't exist
    if (!fs.existsSync(chapterFolder)) {
      fs.mkdirSync(chapterFolder, { recursive: true });
      console.log(`Created folder: ${chapterFolder}`);
    }
    
    // Generate the index.html content by replacing the placeholders
    const indexContent = template
      .replace(/{{CHAPTER_NAME}}/g, chapter.name)
      .replace(/{{CHAPTER_DISPLAY_NAME}}/g, chapter.displayName);
    
    // Write the index.html file in the chapter folder
    const indexPath = path.join(chapterFolder, 'index.html');
    fs.writeFileSync(indexPath, indexContent);
    console.log(`Generated: ${indexPath}`);
  });
});

// Count total chapters
const totalChapters = Object.values(chaptersData).reduce(
  (total, categoryChapters) => total + categoryChapters.length, 0
);

console.log('\nChapter page generation complete!');
console.log(`Generated ${totalChapters} chapter pages across ${Object.keys(chaptersData).length} categories.`);
console.log('\nYou can now access chapters at URLs like:');
console.log('- /CGs/chapter00/');
console.log('- /CGs/chapter01/');
console.log('- /CGs/rainburst/');
console.log('- etc.');