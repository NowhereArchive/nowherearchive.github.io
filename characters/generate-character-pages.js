const fs = require('fs');
const path = require('path');

// Read the characters.json file
const charactersData = JSON.parse(fs.readFileSync('characters.json', 'utf8'));

// Read the templates
const voicelinesTemplate = fs.readFileSync('character-template.html', 'utf8');
const redirectTemplate = fs.readFileSync('character-redirect-template.html', 'utf8');

// Function to sanitize character names (same as in your JavaScript)
function sanitizeName(name) {
  return name.toLowerCase().replace(/\s+/g, '_');
}

// Function to capitalize words for display
function capitalizeWords(name) {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

console.log('Starting to generate character pages...');

// Process each character
charactersData.characters.forEach(character => {
  const sanitizedName = sanitizeName(character.name);
  const characterFolder = path.join(sanitizedName);
  const voicelinesFolder = path.join(characterFolder, 'voicelines');
  
  // Create the character folder if it doesn't exist
  if (!fs.existsSync(characterFolder)) {
    fs.mkdirSync(characterFolder, { recursive: true });
    console.log(`Created folder: ${characterFolder}`);
  }
  
  // Create the voicelines folder if it doesn't exist
  if (!fs.existsSync(voicelinesFolder)) {
    fs.mkdirSync(voicelinesFolder, { recursive: true });
    console.log(`Created folder: ${voicelinesFolder}`);
  }
  
  // Generate the voicelines index.html content
  const voicelinesContent = voicelinesTemplate
    .replace(/{{CHARACTER_NAME}}/g, sanitizedName)
    .replace(/{{CHARACTER_DISPLAY_NAME}}/g, character.displayName || capitalizeWords(character.name));
  
  // Write the voicelines index.html file
  const voicelinesIndexPath = path.join(voicelinesFolder, 'index.html');
  fs.writeFileSync(voicelinesIndexPath, voicelinesContent);
  console.log(`Generated: ${voicelinesIndexPath}`);
  
  // Generate the redirect index.html content
  const redirectContent = redirectTemplate
    .replace(/{{CHARACTER_DISPLAY_NAME}}/g, character.displayName || capitalizeWords(character.name));
  
  // Write the redirect index.html file in the character folder
  const redirectIndexPath = path.join(characterFolder, 'index.html');
  fs.writeFileSync(redirectIndexPath, redirectContent);
  console.log(`Generated redirect: ${redirectIndexPath}`);
});

console.log('\nCharacter page generation complete!');
console.log(`Generated ${charactersData.characters.length} character pages with redirects.`);