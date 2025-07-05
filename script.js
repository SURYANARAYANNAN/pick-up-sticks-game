document.addEventListener('DOMContentLoaded', () => {
    const gameArea = document.getElementById('gameArea');
    const currentScoreDisplay = document.getElementById('currentScore');
    const sticksRemainingDisplay = document.getElementById('sticksRemaining');
    const messageDisplay = document.getElementById('message');
    const restartButton = document.getElementById('restartGame');

    const gameOverScreen = document.getElementById('gameOver');
    const finalScoreDisplay = document.getElementById('finalScore');
    const highScoreDisplay = document.getElementById('highScoreDisplay');
    const playAgainButton = document.getElementById('playAgain');

    const pickupSound = document.getElementById('pickupSound');
    const foulSound = document.getElementById('foulSound');

    // NEW: Difficulty elements
    const difficultyButtons = document.querySelectorAll('.difficulty-btn');
    let currentDifficulty = 'medium'; // Default difficulty

    // NEW: Timer elements
    const timerDisplay = document.getElementById('timeRemaining');
    let gameTimer; // To store setInterval ID
    let timeLeft; // Seconds remaining
    const initialTime = { // Time in seconds for each difficulty
        easy: 120, // 2 minutes
        medium: 90, // 1.5 minutes
        hard: 60 // 1 minute
    };

    // NEW: Sound control
    const toggleSoundButton = document.getElementById('toggleSound');
    let isSoundMuted = false; // Initial state

    // NEW: Pause button
    const pauseGameButton = document.getElementById('pauseGame');
    let isGamePaused = false;

    // --- Stick Configurations for Difficulties ---
    const difficultyConfigs = {
        easy: {
            stickTypes: [
                { color: 'red', points: 10, count: 10 },
                { color: 'blue', points: 5, count: 8 },
                { color: 'green', points: 3, count: 6 },
                { color: 'yellow', points: 2, count: 4 },
                { color: 'black', points: 1, count: 1 }
            ],
            overlapTolerance: 40 // More forgiving
        },
        medium: {
            stickTypes: [
                { color: 'red', points: 10, count: 15 },
                { color: 'blue', points: 5, count: 10 },
                { color: 'green', points: 3, count: 8 },
                { color: 'yellow', points: 2, count: 5 },
                { color: 'black', points: 1, count: 1 }
            ],
            overlapTolerance: 30 // Balanced
        },
        hard: {
            stickTypes: [
                { color: 'red', points: 10, count: 20 },
                { color: 'blue', points: 5, count: 15 },
                { color: 'green', points: 3, count: 10 },
                { color: 'yellow', points: 2, count: 7 },
                { color: 'black', points: 1, count: 1 }
            ],
            overlapTolerance: 20 // Less forgiving
        }
    };

    let sticks = []; // Array to hold all stick objects/elements
    let currentScore = 0;
    let isGameActive = true; // State variable to control game flow
    let highScore = localStorage.getItem('pickUpSticksHighScore') || 0; // Load high score


    function initializeGame() {
        // Clear previous game state
        clearInterval(gameTimer); // Stop any existing timer
        isGamePaused = false;
        pauseGameButton.textContent = '❚❚ Pause';
        pauseGameButton.classList.remove('paused');

        gameArea.innerHTML = '';
        sticks = [];
        currentScore = 0;
        isGameActive = true;
        currentScoreDisplay.textContent = currentScore;
        gameOverScreen.style.display = 'none';
        highScoreDisplay.textContent = highScore;

        // Reset gameArea visibility
        gameArea.style.opacity = '1';
        gameArea.style.pointerEvents = 'auto';
        gameOverScreen.style.backgroundColor = 'rgba(0, 0, 0, 1)'; // Ensure fully opaque on start

        const config = difficultyConfigs[currentDifficulty];
        let totalSticks = 0;

        // Create stick elements based on current difficulty
        config.stickTypes.forEach(type => {
            for (let i = 0; i < type.count; i++) {
                const stickElement = document.createElement('div');
                stickElement.classList.add('stick', type.color);
                stickElement.dataset.points = type.points;
                stickElement.dataset.color = type.color;

                const gameAreaRect = gameArea.getBoundingClientRect();
                const stickWidth = 8;
                const stickHeight = 100;

                let randomTop = Math.random() * (gameAreaRect.height - stickHeight);
                let randomLeft = Math.random() * (gameAreaRect.width - stickWidth);
                
                const padding = 10;
                randomTop = Math.max(padding, Math.min(randomTop, gameAreaRect.height - stickHeight - padding));
                randomLeft = Math.max(padding, Math.min(randomLeft, gameAreaRect.width - stickWidth - padding));

                stickElement.style.top = `${randomTop}px`;
                stickElement.style.left = `${randomLeft}px`;

                const randomRotation = Math.random() * 360;
                stickElement.style.transform = `rotate(${randomRotation}deg)`;
                stickElement.style.setProperty('--rotation', `${randomRotation}deg`); 

                sticks.push({
                    element: stickElement,
                    points: type.points,
                    color: type.color,
                    isPickedUp: false
                });
                gameArea.appendChild(stickElement);
                totalSticks++;
            }
        });

        sticks.forEach((stick, index) => {
            stick.element.style.zIndex = index;
        });

        sticksRemainingDisplay.textContent = totalSticks;
        messageDisplay.textContent = 'Pick a stick!';
        addEventListeners();
        startTimer(); // Start the timer for the new game
    }

    function addEventListeners() {
        // Remove existing listeners to prevent duplicates on restart
        sticks.forEach(stick => {
            stick.element.removeEventListener('click', handleStickClick);
        });
        restartButton.removeEventListener('click', initializeGame);
        playAgainButton.removeEventListener('click', initializeGame);
        toggleSoundButton.removeEventListener('click', toggleSound);
        pauseGameButton.removeEventListener('click', togglePauseGame);

        // Add new listeners
        sticks.forEach(stick => {
            stick.element.addEventListener('click', handleStickClick);
        });
        restartButton.addEventListener('click', initializeGame);
        playAgainButton.addEventListener('click', initializeGame);

        // Difficulty buttons
        difficultyButtons.forEach(button => {
            button.removeEventListener('click', setDifficulty); // Remove old listeners
            button.addEventListener('click', setDifficulty); // Add new listeners
        });
        // Set active class on current difficulty button
        difficultyButtons.forEach(button => {
            if (button.dataset.difficulty === currentDifficulty) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });

        toggleSoundButton.addEventListener('click', toggleSound);
        pauseGameButton.addEventListener('click', togglePauseGame);
    }

    // NEW: Function to set difficulty
    function setDifficulty(event) {
        if (isGameActive) { // Only allow changing difficulty at the start of a game or after game over
            if (confirm("Changing difficulty will restart the game. Are you sure?")) {
                currentDifficulty = event.target.dataset.difficulty;
                initializeGame();
            }
        } else {
            currentDifficulty = event.target.dataset.difficulty;
            initializeGame(); // Restart game with new difficulty
        }
    }

    // NEW: Timer functions
    function startTimer() {
        clearInterval(gameTimer); // Clear any existing timer
        timeLeft = initialTime[currentDifficulty];
        updateTimerDisplay();
        gameTimer = setInterval(() => {
            if (!isGamePaused && isGameActive) {
                timeLeft--;
                updateTimerDisplay();
                if (timeLeft <= 0) {
                    clearInterval(gameTimer);
                    messageDisplay.textContent = "Time's Up! Game Over!";
                    endGame();
                }
            }
        }, 1000);
    }

    function updateTimerDisplay() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // NEW: Sound control function
    function toggleSound() {
        isSoundMuted = !isSoundMuted;
        pickupSound.muted = isSoundMuted;
        foulSound.muted = isSoundMuted;
        toggleSoundButton.textContent = isSoundMuted ? '🔇 Sound Off' : '🔊 Sound On';
    }

    // NEW: Pause game function
    function togglePauseGame() {
        if (!isGameActive) return; // Can't pause if game is already over

        isGamePaused = !isGamePaused;
        if (isGamePaused) {
            pauseGameButton.textContent = '▶ Resume';
            pauseGameButton.classList.add('paused');
            messageDisplay.textContent = 'Game Paused. Click Resume to continue.';
            gameArea.style.pointerEvents = 'none'; // Disable clicks on sticks
        } else {
            pauseGameButton.textContent = '❚❚ Pause';
            pauseGameButton.classList.remove('paused');
            messageDisplay.textContent = 'Pick a stick!';
            gameArea.style.pointerEvents = 'auto'; // Re-enable clicks
        }
    }


    function handleStickClick(event) {
        if (!isGameActive || isGamePaused) { // Don't allow clicks if game is over or paused
            return;
        }

        const clickedStickElement = event.target;
        const stickData = sticks.find(s => s.element === clickedStickElement);

        if (!stickData || stickData.isPickedUp) {
            return;
        }

        // Logic for "NO SHAKE"
        if (!isStickFree(stickData)) {
            // Foul detected!
            messageDisplay.textContent = `Foul! You moved other sticks. Game Over! Score: ${currentScore}`;
            
            clickedStickElement.style.outline = '3px solid red';
            
            document.body.classList.add('foul-flash');
            setTimeout(() => {
                document.body.classList.remove('foul-flash');
            }, 300);

            if (!isSoundMuted && foulSound) {
                foulSound.currentTime = 0;
                foulSound.play().catch(e => console.error("Foul sound play failed:", e));
            }

            isGameActive = false;
            clearInterval(gameTimer); // Stop timer on foul

            setTimeout(() => {
                clickedStickElement.style.outline = 'none';
                endGame();
            }, 1500); 
            return;
        }

        pickUpStick(stickData);
    }

    function isStickFree(selectedStickData) {
        // Get the current bounding rectangle of the selected stick
        const selectedRect = selectedStickData.element.getBoundingClientRect();

        // Use overlap tolerance based on current difficulty
        const overlapTolerance = difficultyConfigs[currentDifficulty].overlapTolerance;

        // Iterate through all other sticks
        for (const otherStickData of sticks) {
            // Skip if it's the same stick, or if the other stick is already picked up
            if (selectedStickData === otherStickData || otherStickData.isPickedUp) {
                continue;
            }

            const otherRect = otherStickData.element.getBoundingClientRect();

            // Check for overlap between the two stick's bounding boxes with tolerance
            const isOverlapping = !(
                selectedRect.right < otherRect.left + overlapTolerance ||
                selectedRect.left > otherRect.right - overlapTolerance ||
                selectedRect.bottom < otherRect.top + overlapTolerance ||
                selectedRect.top > otherRect.bottom - overlapTolerance
            );

            if (isOverlapping) {
                const selectedZIndex = parseInt(selectedStickData.element.style.zIndex || 0);
                const otherZIndex = parseInt(otherStickData.element.style.zIndex || 0);

                if (otherZIndex > selectedZIndex) {
                    // The other stick is on top of the selected one
                    return false; // Stick is not free
                }
            }
        }
        return true; // No other overlapping, higher z-index stick found, so it's free
    }

    function pickUpStick(stickData) {
        if (stickData.isPickedUp) return;

        stickData.isPickedUp = true;
        stickData.element.style.cursor = 'default';
        stickData.element.style.pointerEvents = 'none';

        if (!isSoundMuted && pickupSound) {
            pickupSound.currentTime = 0;
            pickupSound.play().catch(e => console.error("Pickup sound play failed:", e));
        }

        // NEW: Show score breakdown
        showScorePopup(stickData.element, stickData.points);

        // New animation style
        stickData.element.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out, top 0.3s ease-out';
        stickData.element.style.transform = 'scale(0.5) rotate(45deg)';
        stickData.element.style.opacity = '0';

        // Move it up slightly
        const currentTop = parseFloat(stickData.element.style.top) || 0;
        stickData.element.style.top = `${currentTop - 20}px`;

        currentScore += stickData.points;
        currentScoreDisplay.textContent = currentScore;

        sticksRemainingDisplay.textContent = parseInt(sticksRemainingDisplay.textContent) - 1;
        messageDisplay.textContent = `You picked up a ${stickData.color} stick (+${stickData.points} points)!`;

        // After the animation, remove the element from the DOM
        setTimeout(() => {
            if (stickData.element && stickData.element.parentNode === gameArea) {
                gameArea.removeChild(stickData.element);
            }
            if (parseInt(sticksRemainingDisplay.textContent) === 0) {
                endGame();
            }
        }, 300); // Match the transition duration
    }

    // NEW: Function to show score popup
    function showScorePopup(stickElement, points) {
        const popup = document.createElement('div');
        popup.classList.add('score-popup');
        popup.textContent = `+${points}`;

        // Position it relative to the stick
        const rect = stickElement.getBoundingClientRect();
        const gameAreaRect = gameArea.getBoundingClientRect();

        popup.style.left = `${rect.left - gameAreaRect.left + rect.width / 2}px`;
        popup.style.top = `${rect.top - gameAreaRect.top - 20}px`; // Above the stick

        gameArea.appendChild(popup);

        // Remove the popup after its animation
        setTimeout(() => {
            if (popup.parentNode === gameArea) {
                gameArea.removeChild(popup);
            }
        }, 1000); // Match animation duration
    }


    function endGame() {
        isGameActive = false;
        clearInterval(gameTimer); // Stop timer when game ends
        messageDisplay.textContent = `Game Over! Final Score: ${currentScore}`;
        finalScoreDisplay.textContent = currentScore;

        // Update high score
        if (currentScore > highScore) {
            highScore = currentScore;
            localStorage.setItem('pickUpSticksHighScore', highScore);
            messageDisplay.textContent += " NEW HIGH SCORE!";
        }
        highScoreDisplay.textContent = highScore;

        // Ensure gameArea content is completely faded out
        gameArea.style.opacity = '0';
        gameArea.style.pointerEvents = 'none';

        gameOverScreen.style.display = 'flex';
        gameOverScreen.style.flexDirection = 'column';
        gameOverScreen.style.alignItems = 'center';
    }

    // Initialize the game when the page loads
    initializeGame();
});