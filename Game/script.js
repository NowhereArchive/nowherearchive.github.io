let characterList = [];
let targetCharacter = null;


const suggestionsDiv = document.getElementById("suggestions");
const inputField = document.getElementById("guess-input");
const feedbackDiv = document.getElementById("feedback");

// Fetch the character list from the JSON file
fetch("characters.json")
  .then((response) => response.json())
  .then((data) => {
    characterList = data;

    // Randomly pick a target character
    targetCharacter = characterList[Math.floor(Math.random() * characterList.length)];
    console.log("Target character:", targetCharacter.name); // For debugging
  })
  .catch((error) => console.error("Error loading characters:", error));


// Display suggestions when typing or focusing the input field
inputField.addEventListener("input", showSuggestions);
inputField.addEventListener("focus", showSuggestions);

function showSuggestions() {
  const query = inputField.value.toLowerCase();
  suggestionsDiv.innerHTML = ""; // Clear previous suggestions

  const matches = query
    ? characterList.filter((char) =>
        char.name.toLowerCase().startsWith(query)
      )
    : characterList; // If no query, show all characters

  if (matches.length > 0) {
    suggestionsDiv.style.display = "block";

    matches.forEach((char) => {
      const suggestion = document.createElement("div");
      suggestion.textContent = char.name;
      suggestion.classList.add("suggestion-box");
      suggestion.addEventListener("click", () => {
        inputField.value = char.name;
        suggestionsDiv.style.display = "none";
      });
      suggestionsDiv.appendChild(suggestion);
    });
  } else {
    suggestionsDiv.style.display = "none";
  }
}

// Track the guesses in history table
const historyTableBody = document.querySelector("#history-table tbody");
const maxGuesses = 5; // Max number of guesses
let guessCount = 0; // Track how many guesses the player has made
let gameWon = false; // Flag to indicate if the game has been won


let guessedCharacters = new Set(); // To track guessed characters

// Handle the submission and check traits
document.getElementById("submit-button").addEventListener("click", () => {
  if (gameWon || guessCount >= maxGuesses) {
    return; // Don't allow guesses if the game is over
  }

  const guess = inputField.value.trim();

  if (!guess) {
    return;
  }

  const guessedCharacter = characterList.find(
    (char) => char.name.toLowerCase() === guess.toLowerCase()
  );

  if (!guessedCharacter) {
    return;
  }

  // Check if the character has already been guessed
  if (guessedCharacters.has(guessedCharacter.name)) {
    return;
  }

  guessCount++; // Increment the guess count
  
  // Add the guessed character to the set to prevent further guesses
  guessedCharacters.add(guessedCharacter.name);

  // Add the guess to the history table
  addGuessToHistory(guessedCharacter);

  // Check if the guess is correct
  if (checkWin(guessedCharacter)) {
    gameWon = true;
    showMessage("You win! You guessed the character correctly!");
    disableGame(); // Disable further guesses
  } else if (guessCount >= maxGuesses) {
    showMessage(`You lose! You've used all your guesses. The correct character was: ${targetCharacter.name}`);
    disableGame(); // Disable further guesses
  }

  inputField.value = ""; // Clear input
});

// Restart the game
document.getElementById("restart-button").addEventListener("click", () => {
  // Reset variables
  guessCount = 0;
  gameWon = false;

  // Reset the guessed characters set
  guessedCharacters.clear();

  // Reset the target character (randomly pick a new character)
  targetCharacter = characterList[Math.floor(Math.random() * characterList.length)];

  // Clear the history table
  historyTableBody.innerHTML = "";

  // Reset the game message
  const messageDiv = document.getElementById("game-message");
  messageDiv.textContent = "";
  messageDiv.style.display = "none";

  // Reset the input and button
  const inputField = document.getElementById("guess-input");
  const submitButton = document.getElementById("submit-button");

  inputField.disabled = false;
  submitButton.disabled = false;

  // Hide the restart button again
  const restartButton = document.getElementById("restart-button");
  restartButton.style.display = "none";

  // Clear the input field
  inputField.value = "";
});


// Check if all traits match the target character
function checkWin(guessedCharacter) {
  let allCorrect = true;

  for (let trait in guessedCharacter.traits) {
    if (guessedCharacter.traits[trait] !== targetCharacter.traits[trait]) {
      allCorrect = false;
      break;
    }
  }

  return allCorrect;
}

// Add guess details to history table
function addGuessToHistory(guessedCharacter) {
  const row = document.createElement("tr");

  const guessCell = document.createElement("td");
  guessCell.textContent = guessedCharacter.name;
  row.appendChild(guessCell);

  // For each trait, add a cell to the row
  for (let trait in guessedCharacter.traits) {
    const traitCell = document.createElement("td");
    const guessedValue = guessedCharacter.traits[trait];
    const correctValue = targetCharacter.traits[trait];

    // Color cells based on correctness (green for correct, red for incorrect)
    if (guessedValue === correctValue) {
      traitCell.style.backgroundColor = "#4caf50"; // Green
      traitCell.style.color = "white";
    } else {
      traitCell.style.backgroundColor = "#e53935"; // Red
      traitCell.style.color = "white";
    }

    traitCell.textContent = guessedValue;
    row.appendChild(traitCell);
  }

  historyTableBody.appendChild(row); // Append the row to the table
}

// Show a message when the game is over (win or loss)
function showMessage(message) {
  const messageDiv = document.getElementById("game-message");
  messageDiv.textContent = message;
  messageDiv.style.display = "block"; // Make sure the message is visible
}

// Disable further input and button after game over
function disableGame() {
    const inputField = document.getElementById("guess-input");

  const submitButton = document.getElementById("submit-button");
  
  
  inputField.disabled = true;
  submitButton.disabled = true;
  
  // Show the restart button
  const restartButton = document.getElementById("restart-button");
  restartButton.style.display = "inline-block";
}

// Close the suggestions dropdown when clicking outside the input or suggestions box
document.addEventListener("click", function (event) {
    const suggestionsDiv = document.getElementById("suggestions");
    const inputField = document.getElementById("guess-input");
  
    // Check if the clicked target is not the input field or the suggestions dropdown
    if (!inputField.contains(event.target) && !suggestionsDiv.contains(event.target)) {
      suggestionsDiv.style.display = "none"; // Hide the suggestions dropdown
    }
});

// Script to handle navbar toggling on small screens
function handleSmallScreens() {
  document.querySelector('.navbar-toggler')
      .addEventListener('click', () => {
          let navbarMenu = document.querySelector('.navbar-menu');

          if (!navbarMenu.classList.contains('active')) {
              navbarMenu.classList.add('active');
          } else {
              navbarMenu.classList.remove('active');
          }
      });
}

handleSmallScreens();