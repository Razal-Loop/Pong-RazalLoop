// script.js
const canvas = document.getElementById('pongCanvas');
const ctx = canvas.getContext('2d');
const playerName = "Razal-Loop";
const playerTag = "The Addictive Game Experience!";
const playerAvatar = document.getElementById('avatar').src;
const difficultySelect = document.getElementById('difficulty');
const startBtn = document.getElementById('start-btn');
const gameContainer = document.getElementById('game-container');
const sndBounce = document.getElementById('snd-bounce');
const sndScore = document.getElementById('snd-score');
const sndPowerup = document.getElementById('snd-powerup');

const targetScore = 5;
const NEON_CYAN = "#0ff";
const NEON_YELLOW = "#ff0";
const NEON_PINK = "#f0f";

// Game settings (will be set by difficulty)
let PADDLE_WIDTH = 18;
let PADDLE_HEIGHT = 110;
let BALL_RADIUS = 13;
let PLAYER_X = 32;
let AI_X = canvas.width - PADDLE_WIDTH - 32;
let PADDLE_SPEED = 7;
let AI_SPEED = 5;
let BALL_BASE_SPEED_X = 7;
let BALL_BASE_SPEED_Y = 4;

let difficulty = "medium";
let playerY, aiY, ballX, ballY, ballSpeedX, ballSpeedY;
let playerScore = 0, aiScore = 0;
let isGameOver = false;
let isStarted = false;

// Power-up system
const powerUps = [
  { type: "paddle+", color: "#0ff", effect: "Increase paddle size", duration: 4000 },
  { type: "slowball", color: "#ff0", effect: "Slow down ball", duration: 4000 },
  { type: "fastball", color: "#f0f", effect: "Speed up ball", duration: 4000 }
];
let currentPowerUp = null;
let powerUpActive = false;
let powerUpX = null, powerUpY = null;

// Leaderboard system (localStorage)
function getLeaderboard() {
  return JSON.parse(localStorage.getItem("pongLeaderboard") || "[]");
}
function setLeaderboard(list) {
  localStorage.setItem("pongLeaderboard", JSON.stringify(list));
}
function updateLeaderboard() {
  const list = getLeaderboard();
  const ul = document.getElementById("leaderboard-list");
  ul.innerHTML = "";
  list.slice(0, 7).forEach(entry => {
    const li = document.createElement("li");
    li.textContent = `${entry.name} (${entry.difficulty}) - ${entry.score}`;
    ul.appendChild(li);
  });
}

// Sound effect helpers
function playBounce() { sndBounce.currentTime = 0; sndBounce.play(); }
function playScore() { sndScore.currentTime = 0; sndScore.play(); }
function playPowerup() { sndPowerup.currentTime = 0; sndPowerup.play(); }

// Mouse controls for player paddle
canvas.addEventListener('mousemove', function(e) {
  if (!isStarted || isGameOver) return;
  const rect = canvas.getBoundingClientRect();
  const mouseY = e.clientY - rect.top;
  playerY = mouseY - PADDLE_HEIGHT / 2;
  playerY = Math.max(0, Math.min(canvas.height - PADDLE_HEIGHT, playerY));
});

// Difficulty select
startBtn.onclick = function() {
  difficulty = difficultySelect.value;
  setDifficultySettings();
  document.getElementById('difficulty-select').style.display = 'none';
  isStarted = true;
  resetGame();
  loop();
};

// Restart game button
document.getElementById('restart-btn').onclick = function() {
  document.getElementById('gameover').style.display = 'none';
  isGameOver = false;
  isStarted = true;
  resetGame();
  loop();
};

function setDifficultySettings() {
  if (difficulty === "easy") {
    AI_SPEED = 3; BALL_BASE_SPEED_X = 6; BALL_BASE_SPEED_Y = 3;
  } else if (difficulty === "hard") {
    AI_SPEED = 9; BALL_BASE_SPEED_X = 10; BALL_BASE_SPEED_Y = 6;
  } else {
    AI_SPEED = 5; BALL_BASE_SPEED_X = 7; BALL_BASE_SPEED_Y = 4;
  }
}

// Draw everything
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Center line
  ctx.save();
  ctx.strokeStyle = NEON_CYAN;
  ctx.lineWidth = 4;
  ctx.setLineDash([16, 18]);
  ctx.shadowBlur = 16;
  ctx.shadowColor = NEON_CYAN;
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();
  ctx.restore();

  // Paddles
  drawNeonRect(PLAYER_X, playerY, PADDLE_WIDTH, PADDLE_HEIGHT, NEON_CYAN);
  drawNeonRect(AI_X, aiY, PADDLE_WIDTH, PADDLE_HEIGHT, NEON_YELLOW);

  // Ball
  drawNeonBall(ballX, ballY, BALL_RADIUS, NEON_PINK);

  // Power-up
  if (currentPowerUp && !powerUpActive) {
    drawNeonPowerUp(powerUpX, powerUpY, currentPowerUp.color, currentPowerUp.type);
  }

  // Player details above paddle
  ctx.save();
  ctx.font = "bold 22px 'Montserrat', 'Segoe UI', Arial";
  ctx.textAlign = "left";
  ctx.shadowBlur = 14;
  ctx.shadowColor = NEON_CYAN;
  ctx.fillStyle = NEON_CYAN;
  ctx.fillText(playerName, PLAYER_X, playerY - 18);
  ctx.font = "italic 15px 'Montserrat', 'Segoe UI', Arial";
  ctx.fillStyle = "#fff";
  ctx.shadowBlur = 0;
  ctx.fillText(playerTag, PLAYER_X, playerY - 2);
  ctx.restore();

  // AI name above AI paddle
  ctx.save();
  ctx.font = "bold 22px 'Montserrat', 'Segoe UI', Arial";
  ctx.textAlign = "right";
  ctx.shadowBlur = 14;
  ctx.shadowColor = NEON_YELLOW;
  ctx.fillStyle = NEON_YELLOW;
  ctx.fillText("AI", AI_X + PADDLE_WIDTH, aiY - 18);
  ctx.restore();

  // Your avatar next to left paddle
  drawAvatar(PLAYER_X - 64, playerY + PADDLE_HEIGHT / 2 - 32, 56);

  // Power-up effect message
  if (powerUpActive && currentPowerUp) {
    ctx.save();
    ctx.font = "bold 32px 'Orbitron', Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = currentPowerUp.color;
    ctx.shadowBlur = 20;
    ctx.shadowColor = currentPowerUp.color;
    ctx.fillText(currentPowerUp.effect, canvas.width / 2, 60);
    ctx.restore();
  }

  // Game over overlay
  if (isGameOver) {
    ctx.save();
    ctx.font = "bold 48px 'Orbitron', Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = NEON_PINK;
    ctx.shadowBlur = 28;
    ctx.shadowColor = NEON_PINK;
    ctx.fillText("GAME OVER!", canvas.width / 2, canvas.height / 2 - 20);
    ctx.restore();
  }
}

function drawNeonRect(x, y, w, h, color) {
  ctx.save();
  ctx.shadowBlur = 18;
  ctx.shadowColor = color;
  ctx.fillStyle = "#222";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

function drawNeonBall(x, y, r, color) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.shadowBlur = 24;
  ctx.shadowColor = color;
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.restore();
}

function drawAvatar(x, y, size) {
  const img = document.getElementById('avatar');
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, x, y, size, size);
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2 + 3, 0, Math.PI * 2);
  ctx.strokeStyle = NEON_CYAN;
  ctx.lineWidth = 3;
  ctx.shadowBlur = 10;
  ctx.shadowColor = NEON_CYAN;
  ctx.stroke();
  ctx.restore();
}

function drawNeonPowerUp(x, y, color, label) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, 22, 0, Math.PI * 2);
  ctx.fillStyle = "#111";
  ctx.shadowBlur = 20;
  ctx.shadowColor = color;
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.font = "bold 18px 'Montserrat', Arial";
  ctx.textAlign = "center";
  ctx.fillStyle = color;
  ctx.fillText(label, x, y + 7);
  ctx.restore();
}

// Paddle collision detection
function paddleCollision(x, y) {
  // Player paddle
  if (
    x - BALL_RADIUS <= PLAYER_X + PADDLE_WIDTH &&
    y + BALL_RADIUS >= playerY &&
    y - BALL_RADIUS <= playerY + PADDLE_HEIGHT
  ) {
    ballSpeedX = Math.abs(ballSpeedX);
    ballSpeedY += (y - (playerY + PADDLE_HEIGHT / 2)) * 0.18;
    playBounce();
  }
  // AI paddle
  if (
    x + BALL_RADIUS >= AI_X &&
    y + BALL_RADIUS >= aiY &&
    y - BALL_RADIUS <= aiY + PADDLE_HEIGHT
  ) {
    ballSpeedX = -Math.abs(ballSpeedX);
    ballSpeedY += (y - (aiY + PADDLE_HEIGHT / 2)) * 0.18;
    playBounce();
  }
}

// Power-up collision
function powerUpCollision(x, y) {
  if (currentPowerUp && !powerUpActive) {
    const dx = x - powerUpX;
    const dy = y - powerUpY;
    if (Math.sqrt(dx * dx + dy * dy) < BALL_RADIUS + 22) {
      activatePowerUp();
    }
  }
}

// Update AI paddle
function updateAI() {
  const aiCenter = aiY + PADDLE_HEIGHT / 2;
  let targetY = ballY + Math.random() * 26 - 13;
  if (aiCenter < targetY - 16) {
    aiY += AI_SPEED;
  } else if (aiCenter > targetY + 16) {
    aiY -= AI_SPEED;
  }
  aiY = Math.max(0, Math.min(canvas.height - PADDLE_HEIGHT, aiY));
}

// Ball reset
function resetBall(startLeft = true) {
  ballX = canvas.width / 2;
  ballY = canvas.height / 2;
  ballSpeedX = (startLeft ? 1 : -1) * BALL_BASE_SPEED_X;
  ballSpeedY = (Math.random() > 0.5 ? 1 : -1) * BALL_BASE_SPEED_Y;
}

// Power-up spawn
function maybeSpawnPowerUp() {
  if (currentPowerUp || powerUpActive) return;
  if (Math.random() < 0.008) {
    const idx = Math.floor(Math.random() * powerUps.length);
    currentPowerUp = powerUps[idx];
    powerUpX = Math.random() * (canvas.width * 0.6) + canvas.width * 0.2;
    powerUpY = Math.random() * (canvas.height * 0.7) + canvas.height * 0.15;
  }
}

function activatePowerUp() {
  powerUpActive = true;
  playPowerup();
  if (currentPowerUp.type === "paddle+") {
    PADDLE_HEIGHT *= 1.5;
    setTimeout(() => {
      PADDLE_HEIGHT /= 1.5;
      powerUpActive = false;
      currentPowerUp = null;
    }, currentPowerUp.duration);
  } else if (currentPowerUp.type === "slowball") {
    ballSpeedX *= 0.5; ballSpeedY *= 0.5;
    setTimeout(() => {
      ballSpeedX *= 2; ballSpeedY *= 2;
      powerUpActive = false;
      currentPowerUp = null;
    }, currentPowerUp.duration);
  } else if (currentPowerUp.type === "fastball") {
    ballSpeedX *= 1.7; ballSpeedY *= 1.7;
    setTimeout(() => {
      ballSpeedX /= 1.7; ballSpeedY /= 1.7;
      powerUpActive = false;
      currentPowerUp = null;
    }, currentPowerUp.duration);
  }
}

// Game Over
function showGameOver(winner) {
  isGameOver = true;
  isStarted = false;
  document.getElementById('winner-text').textContent =
    winner === "player"
      ? `🏆 ${playerName} Wins!`
      : `🤖 AI Wins!`;
  document.getElementById('gameover').style.display = 'block';
  // Save leaderboard
  if (winner === "player") {
    const list = getLeaderboard();
    list.push({ name: playerName, score: playerScore, difficulty });
    list.sort((a, b) => b.score - a.score);
    setLeaderboard(list);
    updateLeaderboard();
  }
}

// Update scoreboard
function updateScoreboard() {
  document.getElementById('score-player').textContent = playerScore;
  document.getElementById('score-ai').textContent = aiScore;
}

// Game loop
function update() {
  if (!isStarted || isGameOver) return;

  ballX += ballSpeedX;
  ballY += ballSpeedY;

  if (ballY - BALL_RADIUS < 0) {
    ballY = BALL_RADIUS;
    ballSpeedY = -ballSpeedY;
    playBounce();
  }
  if (ballY + BALL_RADIUS > canvas.height) {
    ballY = canvas.height - BALL_RADIUS;
    ballSpeedY = -ballSpeedY;
    playBounce();
  }

  paddleCollision(ballX, ballY);
  powerUpCollision(ballX, ballY);

  if (ballX - BALL_RADIUS < 0) {
    aiScore++;
    playScore();
    updateScoreboard();
    if (aiScore >= targetScore) {
      showGameOver("ai");
    } else {
      resetBall(false);
      PADDLE_HEIGHT = 110; // reset paddle size on score
    }
  }
  if (ballX + BALL_RADIUS > canvas.width) {
    playerScore++;
    playScore();
    updateScoreboard();
    if (playerScore >= targetScore) {
      showGameOver("player");
    } else {
      resetBall(true);
      PADDLE_HEIGHT = 110;
    }
  }

  updateAI();
  maybeSpawnPowerUp();
}

// Main loop
function loop() {
  draw();
  update();
  if (isStarted && !isGameOver) requestAnimationFrame(loop);
}

// Reset everything
function resetGame() {
  playerY = canvas.height / 2 - PADDLE_HEIGHT / 2;
  aiY = canvas.height / 2 - PADDLE_HEIGHT / 2;
  playerScore = 0; aiScore = 0;
  currentPowerUp = null; powerUpActive = false;
  updateScoreboard();
  updateLeaderboard();
  resetBall();
}

// Initial leaderboard
updateLeaderboard();
