// Medieval Battle Arena - Main Game
let socket = null;
let myId = null;
let myCharacter = null;
let myName = null;

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 600;

let players = {};
let hitboxData = {};
let spriteSheets = {};
let inputSeq = 0;
const currentInput = { left: false, right: false, attack: false, jump: false };
let showHitboxes = false; // Toggle with 'H' key

// Collision effects
let particles = [];
let screenShake = { x: 0, y: 0, intensity: 0 };
let flashEffect = { alpha: 0 };

// UI Elements
const characterSelect = document.getElementById('character-select');
const gameContainer = document.getElementById('game-container');
const nameInput = document.getElementById('name-input');
const startBtn = document.getElementById('start-btn');
const characterCards = document.querySelectorAll('.character-card');
const deathScreen = document.getElementById('death-screen');
const killerNameEl = document.getElementById('killer-name');
const respawnTimerEl = document.getElementById('respawn-timer');
const hpBar = document.getElementById('hp-bar');
const playerNameEl = document.getElementById('player-name');
const playerCountEl = document.getElementById('player-count');
const fpsEl = document.getElementById('fps');

let selectedCharacter = null;

// Character selection
characterCards.forEach(card => {
  card.addEventListener('click', () => {
    characterCards.forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    selectedCharacter = card.dataset.character;
    updateStartButton();
  });
});

nameInput.addEventListener('input', updateStartButton);
nameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !startBtn.disabled) {
    startGame();
  }
});

function updateStartButton() {
  const hasName = nameInput.value.trim().length > 0;
  const hasCharacter = selectedCharacter !== null;
  startBtn.disabled = !(hasName && hasCharacter);
}

startBtn.addEventListener('click', startGame);

// Reload hitboxes button
async function reloadHitboxes() {
  try {
    const response = await fetch('/hitboxes.json?t=' + Date.now()); // Cache bust
    hitboxData = await response.json();
    console.log('✓ Hitboxes reloaded!');
    console.log('Spartan game scale:', hitboxData.spartan?.gameScale);
    console.log('Warrior game scale:', hitboxData.warrior?.gameScale);
    console.log('Your custom hitboxes are now active!');
    alert('Hitboxes reloaded! Your custom hitboxes and scale are now active.');
  } catch (error) {
    console.error('Error reloading hitboxes:', error);
    alert('Failed to reload hitboxes!');
  }
}

async function startGame() {
  myName = nameInput.value.trim();
  myCharacter = selectedCharacter;
  
  // Load hitbox data
  try {
    const response = await fetch('/hitboxes.json');
    hitboxData = await response.json();
  } catch (error) {
    console.error('Error loading hitbox data:', error);
  }
  
  // Load sprite sheets
  await loadSpriteSheets();
  
  // Connect to server
  socket = io();
  
  socket.on('connect', () => {
    console.log('Connected to server');
    socket.emit('joinGame', { name: myName, character: myCharacter });
  });
  
  socket.on('welcome', (data) => {
    myId = data.id;
    data.players.forEach(p => {
      players[p.id] = p;
    });
    
    characterSelect.style.display = 'none';
    gameContainer.style.display = 'block';
    playerNameEl.textContent = myName;
    
    // Setup reload button
    const reloadBtn = document.getElementById('reload-hitboxes');
    if (reloadBtn) {
      reloadBtn.addEventListener('click', reloadHitboxes);
    }
    
    requestAnimationFrame(gameLoop);
  });
  
  socket.on('playerJoined', (data) => {
    players[data.player.id] = data.player;
  });
  
  socket.on('playerLeft', (data) => {
    delete players[data.id];
  });
  
  socket.on('state', (state) => {
    state.players.forEach(sp => {
      if (players[sp.id]) {
        Object.assign(players[sp.id], sp);
      } else {
        players[sp.id] = sp;
      }
    });
    
    // Update HUD
    if (players[myId]) {
      const hpPercent = (players[myId].hp / players[myId].maxHp) * 100;
      hpBar.style.width = hpPercent + '%';
      
      if (hpPercent > 60) {
        hpBar.style.background = 'linear-gradient(90deg, #8b0000 0%, #dc143c 100%)';
      } else if (hpPercent > 30) {
        hpBar.style.background = 'linear-gradient(90deg, #ff4500 0%, #ff6347 100%)';
      } else {
        hpBar.style.background = 'linear-gradient(90deg, #8b0000 0%, #b22222 100%)';
      }
    }
    
    playerCountEl.textContent = `Players: ${Object.keys(players).length}`;
  });
  
  // Listen for hit events to create effects
  socket.on('playerHit', (data) => {
    if (data.targetId === myId) {
      // Screen shake for being hit
      screenShake.intensity = 15;
      flashEffect.alpha = 0.4;
    } else if (data.attackerId === myId) {
      // Small shake for hitting someone
      screenShake.intensity = 8;
    }
    
    // Create impact particles
    const target = players[data.targetId];
    if (target) {
      createImpactParticles(target.x, target.y - 20, 20);
    }
  });
  
  socket.on('playerDied', (data) => {
    const deadPlayer = players[data.id];
    if (deadPlayer) {
      // Create death explosion particles
      createDeathParticles(deadPlayer.x, deadPlayer.y, 40);
      screenShake.intensity = 25;
      flashEffect.alpha = 0.6;
    }
    
    if (data.id === myId) {
      const killer = players[data.killer];
      killerNameEl.textContent = killer ? killer.name : 'Unknown';
      deathScreen.style.display = 'flex';
      
      let countdown = 3;
      respawnTimerEl.textContent = `Respawning in ${countdown}...`;
      const timer = setInterval(() => {
        countdown--;
        if (countdown > 0) {
          respawnTimerEl.textContent = `Respawning in ${countdown}...`;
        } else {
          clearInterval(timer);
        }
      }, 1000);
    }
  });
  
  socket.on('playerRespawned', (data) => {
    if (data.id === myId) {
      deathScreen.style.display = 'none';
    }
    // Create respawn particles
    const player = players[data.id];
    if (player) {
      createRespawnParticles(player.x, player.y, 30);
    }
  });
}

// Particle system for collision effects
function createImpactParticles(x, y, count) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 300,
      vy: (Math.random() - 0.5) * 300 - 100,
      life: 1.0,
      maxLife: 1.0,
      size: Math.random() * 4 + 2,
      color: `hsl(${Math.random() * 30}, 70%, 50%)` // Gold/red colors
    });
  }
}

function createDeathParticles(x, y, count) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 400,
      vy: (Math.random() - 0.5) * 400 - 150,
      life: 1.5,
      maxLife: 1.5,
      size: Math.random() * 6 + 3,
      color: `hsl(0, ${50 + Math.random() * 50}%, ${30 + Math.random() * 30}%)` // Dark red colors
    });
  }
}

function createRespawnParticles(x, y, count) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count;
    particles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * 200,
      vy: Math.sin(angle) * 200,
      life: 1.0,
      maxLife: 1.0,
      size: 4,
      color: '#daa520' // Gold
    });
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 600 * dt; // Gravity
    p.life -= dt;
    
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
  
  // Update screen shake
  if (screenShake.intensity > 0) {
    screenShake.x = (Math.random() - 0.5) * screenShake.intensity;
    screenShake.y = (Math.random() - 0.5) * screenShake.intensity;
    screenShake.intensity *= 0.9;
    if (screenShake.intensity < 0.5) {
      screenShake.intensity = 0;
      screenShake.x = 0;
      screenShake.y = 0;
    }
  }
  
  // Update flash effect
  if (flashEffect.alpha > 0) {
    flashEffect.alpha *= 0.9;
    if (flashEffect.alpha < 0.01) flashEffect.alpha = 0;
  }
}

function drawParticles() {
  particles.forEach(p => {
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

// Sprite name patterns
const spritePatterns = {
  spartan: {
    idle: 'idle spartan',
    walk: 'walk',
    attack: 'movemnt',
    powerup: 'spartan powerup'
  },
  warrior: {
    idle: 'sprite-256px-16',
    walk: 'walk big guy',
    attack: 'slash',
    powerup: 'powerup'
  }
};

async function loadSpriteSheets() {
  const characters = ['spartan', 'warrior'];
  const animations = ['idle', 'walk', 'attack', 'powerup'];
  
  for (const char of characters) {
    spriteSheets[char] = {};
    
    for (const anim of animations) {
      const frames = [];
      const charName = char.charAt(0).toUpperCase() + char.slice(1);
      const basePath = `/assets/player sprites/${charName}/${anim}/`;
      const pattern = spritePatterns[char][anim];
      
      console.log(`Loading ${char} ${anim}...`);
      
      // Try to load frames
      for (let r = 0; r < 10; r++) {
        let rowLoaded = false;
        for (let c = 0; c < 10; c++) {
          const img = new Image();
          const paddedR = String(r).padStart(3, '0');
          const paddedC = String(c).padStart(3, '0');
          const filename = `${pattern}_r${paddedR}_c${paddedC}.png`;
          
          try {
            await new Promise((resolve, reject) => {
              const timeout = setTimeout(() => reject(new Error('timeout')), 500);
              img.onload = () => {
                clearTimeout(timeout);
                frames.push(img);
                rowLoaded = true;
                resolve();
              };
              img.onerror = () => {
                clearTimeout(timeout);
                reject(new Error('failed'));
              };
              img.src = basePath + filename;
            });
          } catch (e) {
            if (c === 0 && !rowLoaded) break;
            if (rowLoaded) break;
          }
        }
        if (!rowLoaded && r > 0) break;
      }
      
      console.log(`  Loaded ${frames.length} frames for ${char} ${anim}`);
      spriteSheets[char][anim] = frames;
    }
  }
}

// Input handling
document.addEventListener('keydown', (e) => {
  if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
    currentInput.left = true;
  }
  if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
    currentInput.right = true;
  }
  if (e.key === ' ' || e.key === 'j' || e.key === 'J') {
    currentInput.attack = true;
  }
  if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') {
    currentInput.jump = true;
  }
});

document.addEventListener('keyup', (e) => {
  if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
    currentInput.left = false;
  }
  if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
    currentInput.right = false;
  }
  if (e.key === ' ' || e.key === 'j' || e.key === 'J') {
    currentInput.attack = false;
  }
  if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') {
    currentInput.jump = false;
  }
  if (e.key === 'h' || e.key === 'H') {
    showHitboxes = !showHitboxes;
    const indicator = document.getElementById('hitbox-indicator');
    if (indicator) {
      indicator.style.display = showHitboxes ? 'block' : 'none';
    }
    console.log('Hitboxes:', showHitboxes ? 'ON' : 'OFF');
  }
});

let lastTime = 0;
let frameCount = 0;
let fpsTime = 0;

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.1); // Cap dt
  lastTime = timestamp;
  
  // FPS counter
  frameCount++;
  fpsTime += dt;
  if (fpsTime >= 1) {
    fpsEl.textContent = `FPS: ${frameCount}`;
    frameCount = 0;
    fpsTime = 0;
  }
  
  // Update particles and effects
  updateParticles(dt);
  
  // Send input
  if (socket && socket.connected) {
    inputSeq++;
    const toSend = {
      seq: inputSeq,
      left: currentInput.left,
      right: currentInput.right,
      attack: currentInput.attack,
      jump: currentInput.jump
    };
    socket.emit('input', toSend);
  }
  
  // Render
  render();
  
  requestAnimationFrame(gameLoop);
}

function render() {
  ctx.save();
  
  // Apply screen shake
  ctx.translate(screenShake.x, screenShake.y);
  
  // Clear canvas with medieval background
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#3d2817');
  gradient.addColorStop(0.5, '#5c4033');
  gradient.addColorStop(1, '#3d2817');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw stone floor
  ctx.fillStyle = '#4a4a4a';
  ctx.fillRect(0, 450, canvas.width, 150);
  
  // Draw floor cracks/details
  ctx.strokeStyle = '#2a2a2a';
  ctx.lineWidth = 2;
  for (let i = 0; i < canvas.width; i += 100) {
    ctx.beginPath();
    ctx.moveTo(i, 450);
    ctx.lineTo(i + 50, 600);
    ctx.stroke();
  }
  
  // Draw floor line
  ctx.strokeStyle = '#8b4513';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 450);
  ctx.lineTo(canvas.width, 450);
  ctx.stroke();
  
  // Draw players
  for (const id in players) {
    const p = players[id];
    // Don't draw dead players
    if (p.hp <= 0) continue;
    drawPlayer(p, id === myId);
  }
  
  // Draw particles
  drawParticles();
  
  ctx.restore();
  
  // Draw flash effect (not affected by shake)
  if (flashEffect.alpha > 0) {
    ctx.fillStyle = `rgba(220, 20, 60, ${flashEffect.alpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function drawPlayer(player, isMe) {
  const frames = spriteSheets[player.character]?.[player.state];
  if (!frames || frames.length === 0) {
    // Draw placeholder
    ctx.fillStyle = isMe ? '#4ade80' : '#9ad0ff';
    ctx.fillRect(player.x - 25, player.y - 40, 50, 80);
    return;
  }
  
  const frameIndex = player.animationFrame % frames.length;
  const frame = frames[frameIndex];
  if (!frame || !frame.complete) return;
  
  // Use GAME scale from hitbox data (NOT the dev tools editing scale!)
  const gameScale = hitboxData[player.character]?.gameScale || 1.0;
  const width = frame.width * gameScale;
  const height = frame.height * gameScale;
  
  ctx.save();
  ctx.translate(player.x, player.y);
  
  // Flip sprite: sprite in file faces a certain way, we flip it to match player movement
  const charData = hitboxData[player.character];
  const spriteFacesLeft = charData?.facing === 'left';
  
  // If sprite faces left in file but player wants right, flip it
  // If sprite faces right in file but player wants left, flip it
  const shouldFlip = (spriteFacesLeft && player.facingRight) || (!spriteFacesLeft && !player.facingRight);
  
  if (shouldFlip) {
    ctx.scale(-1, 1);
  }
  
  ctx.drawImage(frame, -width / 2, -height / 2, width, height);
  ctx.restore();
  
  // Draw name
  ctx.fillStyle = isMe ? '#daa520' : '#f4e4c1';
  ctx.font = '14px MedievalSharp, serif';
  ctx.textAlign = 'center';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 3;
  ctx.strokeText(player.name, player.x, player.y - height / 2 - 10);
  ctx.fillText(player.name, player.x, player.y - height / 2 - 10);
  
  // Draw HP bar
  const hpBarWidth = 60;
  const hpBarHeight = 6;
  const hpPercent = player.hp / player.maxHp;
  
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(player.x - hpBarWidth / 2, player.y - height / 2 - 25, hpBarWidth, hpBarHeight);
  
  // Medieval red/gold HP bar
  ctx.fillStyle = hpPercent > 0.6 ? '#8b0000' : hpPercent > 0.3 ? '#ff4500' : '#dc143c';
  ctx.fillRect(player.x - hpBarWidth / 2, player.y - height / 2 - 25, hpBarWidth * hpPercent, hpBarHeight);
  
  // HP bar border
  ctx.strokeStyle = '#8b4513';
  ctx.lineWidth = 2;
  ctx.strokeRect(player.x - hpBarWidth / 2, player.y - height / 2 - 25, hpBarWidth, hpBarHeight);
  
  // Draw hitboxes if enabled (press H to toggle)
  if (showHitboxes) {
    const animData = hitboxData[player.character]?.animations?.[player.state];
    if (animData) {
      // Use EXACT same logic as dev tools!
      // Sprite faces left, when player goes right, we flip (isFlipped = true)
      const spriteFacesLeft = charData?.facing === 'left';
      const isFlipped = spriteFacesLeft ? player.facingRight : !player.facingRight;
      
      // Draw body hitbox (green) - YOUR custom hitbox!
      if (animData.bodyHitbox) {
        const bh = animData.bodyHitbox;
        // EXACT formula from dev tools
        const bodyX = player.x + bh.x * gameScale * (isFlipped ? -1 : 1) - (isFlipped ? bh.width * gameScale : 0);
        const bodyY = player.y + bh.y * gameScale;
        
        ctx.strokeStyle = '#daa520';
        ctx.lineWidth = 2;
        ctx.strokeRect(bodyX, bodyY, bh.width * gameScale, bh.height * gameScale);
        ctx.fillStyle = 'rgba(218, 165, 32, 0.2)';
        ctx.fillRect(bodyX, bodyY, bh.width * gameScale, bh.height * gameScale);
      }
      
      // Draw attack hitboxes (red) - YOUR custom attack hitboxes!
      if (player.state === 'attack' && animData.attackHitboxes) {
        const frameHitboxes = animData.attackHitboxes.filter(hb => hb.frame === player.animationFrame);
        frameHitboxes.forEach(hb => {
          // EXACT formula from dev tools
          const attackX = player.x + hb.x * gameScale * (isFlipped ? -1 : 1) - (isFlipped ? hb.width * gameScale : 0);
          const attackY = player.y + hb.y * gameScale;
          
          ctx.strokeStyle = '#dc143c';
          ctx.lineWidth = 2;
          ctx.strokeRect(attackX, attackY, hb.width * gameScale, hb.height * gameScale);
          ctx.fillStyle = 'rgba(220, 20, 60, 0.3)';
          ctx.fillRect(attackX, attackY, hb.width * gameScale, hb.height * gameScale);
        });
      }
    }
  }
}
