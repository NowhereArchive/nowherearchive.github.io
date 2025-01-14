let characterList = [];
let targetCharacter = null;


const suggestionsDiv = document.getElementById("suggestions");
const inputField = document.getElementById("guess-input");
const feedbackDiv = document.getElementById("feedback");

fetch("characters.json")
  .then((response) => response.json())
  .then((data) => {
    characterList = data;

    targetCharacter = characterList[Math.floor(Math.random() * characterList.length)];
    console.log("Target character:", targetCharacter.name);
  })
  .catch((error) => console.error("Error loading characters:", error));


inputField.addEventListener("input", showSuggestions);
inputField.addEventListener("focus", showSuggestions);

function showSuggestions() {
  const query = inputField.value.toLowerCase();
  suggestionsDiv.innerHTML = "";

  const matches = query
    ? characterList.filter((char) =>
        char.name.toLowerCase().startsWith(query)
      )
    : characterList;

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

const historyTableBody = document.querySelector("#history-table tbody");
const maxGuesses = 5;
let guessCount = 0;
let gameWon = false;


let guessedCharacters = new Set();

document.getElementById("submit-button").addEventListener("click", () => {
  if (gameWon || guessCount >= maxGuesses) {
    return;
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

  if (guessedCharacters.has(guessedCharacter.name)) {
    return;
  }

  guessCount++;
  
  guessedCharacters.add(guessedCharacter.name);

  addGuessToHistory(guessedCharacter);

  if (checkWin(guessedCharacter)) {
    gameWon = true;
    showMessage("You win! You guessed the character correctly!");
    disableGame();
  } else if (guessCount >= maxGuesses) {
    showMessage(`You lose! You've used all your guesses. The correct character was: ${targetCharacter.name}`);
    disableGame();
  }

  inputField.value = "";
});

document.getElementById("restart-button").addEventListener("click", () => {
  guessCount = 0;
  gameWon = false;

  guessedCharacters.clear();

  targetCharacter = characterList[Math.floor(Math.random() * characterList.length)];

  historyTableBody.innerHTML = "";

  const messageDiv = document.getElementById("game-message");
  messageDiv.textContent = "";
  messageDiv.style.display = "none";

  const inputField = document.getElementById("guess-input");
  const submitButton = document.getElementById("submit-button");

  inputField.disabled = false;
  submitButton.disabled = false;

  const restartButton = document.getElementById("restart-button");
  restartButton.style.display = "none";

  inputField.value = "";
});


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

function addGuessToHistory(guessedCharacter) {
  const row = document.createElement("tr");

  const guessCell = document.createElement("td");
  guessCell.textContent = guessedCharacter.name;
  row.appendChild(guessCell);

  for (let trait in guessedCharacter.traits) {
    const traitCell = document.createElement("td");
    const guessedValue = guessedCharacter.traits[trait];
    const correctValue = targetCharacter.traits[trait];

    if (guessedValue === correctValue) {
      traitCell.style.backgroundColor = "#4caf50";
      traitCell.style.color = "white";
    } else {
      traitCell.style.backgroundColor = "#e53935";
      traitCell.style.color = "white";
    }

    traitCell.textContent = guessedValue;
    row.appendChild(traitCell);
  }

  historyTableBody.appendChild(row);
}

function showMessage(message) {
  const messageDiv = document.getElementById("game-message");
  messageDiv.textContent = message;
  messageDiv.style.display = "block";
}

function disableGame() {
    const inputField = document.getElementById("guess-input");

  const submitButton = document.getElementById("submit-button");
  
  
  inputField.disabled = true;
  submitButton.disabled = true;
  
  const restartButton = document.getElementById("restart-button");
  restartButton.style.display = "inline-block";
}

document.addEventListener("click", function (event) {
    const suggestionsDiv = document.getElementById("suggestions");
    const inputField = document.getElementById("guess-input");
  
    if (!inputField.contains(event.target) && !suggestionsDiv.contains(event.target)) {
      suggestionsDiv.style.display = "none";
    }
});

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