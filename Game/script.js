let characterList = [];
let targetCharacter = null;
let guessCount = 0;
const maxGuesses = 5;
let gameWon = false;
let guessedCharacters = new Set();

const suggestionsDiv = document.getElementById("suggestions");
const inputField = document.getElementById("guess-input");
const historyTableBody = document.querySelector("#history-table tbody");
const messageDiv = document.getElementById("game-message");
const restartButton = document.getElementById("restart-button");
const giveUpButton = document.getElementById("give-up-button");

fetch("characters.json")
  .then((response) => response.json())
  .then((data) => {
    characterList = data;
    targetCharacter = characterList[Math.floor(Math.random() * characterList.length)];
    console.log("Target character:", targetCharacter.name);
    hideLoadingSpinner();
  })
  .catch((error) => console.error("Error loading characters:", error));

function showLoadingSpinner() {
  document.getElementById("loading-spinner").style.display = "block";
}

function hideLoadingSpinner() {
  document.getElementById("loading-spinner").style.display = "none";
}

inputField.addEventListener("input", showSuggestions);
inputField.addEventListener("focus", showSuggestions);

function showSuggestions() {
  const query = inputField.value.toLowerCase();
  suggestionsDiv.innerHTML = "";

  const matches = query
    ? characterList.filter((char) => char.name.toLowerCase().startsWith(query))
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

document.getElementById("submit-button").addEventListener("click", () => {
  if (gameWon || guessCount >= maxGuesses) return;

  const guess = inputField.value.trim();
  if (!guess) return;

  const guessedCharacter = characterList.find(
    (char) => char.name.toLowerCase() === guess.toLowerCase()
  );

  if (!guessedCharacter) {
    showMessage("Invalid character name. Please try again.", "error");
    return;
  }

  if (guessedCharacters.has(guessedCharacter.name)) {
    showMessage("You've already guessed this character.", "error");
    return;
  }

  guessCount++;
  guessedCharacters.add(guessedCharacter.name);
  addGuessToHistory(guessedCharacter);

  if (checkWin(guessedCharacter)) {
    gameWon = true;
    showMessage("You win! You guessed the character correctly!", "success");
    disableGame();
  } else if (guessCount >= maxGuesses) {
    showMessage(`You lose! The correct character was: ${targetCharacter.name}`, "error");
    disableGame();
  }

  inputField.value = "";
});

restartButton.addEventListener("click", () => {
  guessCount = 0;
  gameWon = false;
  guessedCharacters.clear();
  targetCharacter = characterList[Math.floor(Math.random() * characterList.length)];
  historyTableBody.innerHTML = "";
  messageDiv.textContent = "";
  messageDiv.style.display = "none";
  inputField.disabled = false;
  document.getElementById("submit-button").disabled = false;
  restartButton.style.display = "none";
  giveUpButton.style.display = "inline-block";
  inputField.value = "";
});

giveUpButton.addEventListener("click", () => {
  showMessage(`The correct character was: ${targetCharacter.name}`, "error");
  disableGame();
});

function checkWin(guessedCharacter) {
  return Object.keys(guessedCharacter.traits).every(
    (trait) => guessedCharacter.traits[trait] === targetCharacter.traits[trait]
  );
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

function showMessage(message, type = "success") {
  messageDiv.textContent = message;
  messageDiv.className = type;
  messageDiv.style.display = "block";
}

function disableGame() {
  inputField.disabled = true;
  document.getElementById("submit-button").disabled = true;
  restartButton.style.display = "inline-block";
  giveUpButton.style.display = "none";
}

document.addEventListener("click", (event) => {
  if (!inputField.contains(event.target) && !suggestionsDiv.contains(event.target)) {
    suggestionsDiv.style.display = "none";
  }
});

function handleSmallScreens() {
  document.querySelector('.navbar-toggler').addEventListener('click', () => {
    let navbarMenu = document.querySelector('.navbar-menu');
    navbarMenu.classList.toggle('active');
  });
}


let selectedSuggestionIndex = -1;

inputField.addEventListener("keydown", (event) => {
  const suggestions = document.querySelectorAll(".suggestion-box");

  if (event.key === "ArrowDown") {
    event.preventDefault();
    selectedSuggestionIndex = Math.min(selectedSuggestionIndex + 1, suggestions.length - 1);
    updateSelectedSuggestion(suggestions);
    scrollIntoView(suggestions[selectedSuggestionIndex]);
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, -1);
    updateSelectedSuggestion(suggestions);
    if (selectedSuggestionIndex >= 0) {
      scrollIntoView(suggestions[selectedSuggestionIndex]);
    }
  } else if (event.key === "Enter") {
    event.preventDefault();
    if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < suggestions.length) {
      const selectedSuggestion = suggestions[selectedSuggestionIndex];
      inputField.value = selectedSuggestion.textContent;
      suggestionsDiv.style.display = "none";
      selectedSuggestionIndex = -1;
    } else if (inputField.value.trim()) {
      document.getElementById("submit-button").click();
    }
  }
});

function scrollIntoView(element) {
  if (element) {
    element.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }
}

function updateSelectedSuggestion(suggestions) {
  suggestions.forEach((suggestion, index) => {
    if (index === selectedSuggestionIndex) {
      suggestion.style.backgroundColor = "#4caf50";
      suggestion.style.color = "white";
    } else {
      suggestion.style.backgroundColor = "";
      suggestion.style.color = "";
    }
  });
}

inputField.addEventListener("input", () => {
  selectedSuggestionIndex = -1;
});

handleSmallScreens();