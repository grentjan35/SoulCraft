// Medieval Battle Arena - Main Game
let socket = null;
let myId = null;
let myCharacter = null;
let myName = null;

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Enable pixelated/crisp rendering for retro look
ctx.imageSmoothingEnabled = false;
ctx.mozImageSmoothingEnabled = false;
ctx.webkitImageSmoothingEnabled = false;
ctx.msImageSmoothingEnabled = false;

// Fullscreen canvas that fills the entire window
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  // Re-apply pixelation after resize
  ctx.imageSmoothingEnabled = false;
  ctx.mozImageSmoothingEnabled = false;
  ctx.webkitImageSmoothingEnabled = false;
  ctx.msImageSmoothingEnabled = false;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Game world dimensions (camera will follow player)
const GAME_WIDTH = 1600;
const GAME_HEIGHT = 900;
const GROUND_Y = GAME_HEIGHT - 150;

// PIXELATION SETTINGS - Lower = More Pixelated!
const PIXEL_SCALE = 4; // Render at 1/4 resolution for SUPER chunky pixels!
const RENDER_WIDTH = GAME_WIDTH / PIXEL_SCALE;
const RENDER_HEIGHT = GAME_HEIGHT / PIXEL_SCALE;

let players = {};
let hitboxData = {};
let spriteSheets = {};
let inputSeq = 0;
const currentInput = { left: false, right: false, attack: false, jump: false };
let showHitboxes = false; // Toggle with 'H' key

// Background system
let backgroundImage = null;
let backgroundLoaded = false;
const backgroundFiles = [
  'output.jpg',
  'output (1).jpg',
  'output (2).jpg',
  'output (3).jpg',
  'output (4).jpg',
  'output (5).jpg'
];

// Collision effects
let particles = [];
let screenShake = { x: 0, y: 0, intensity: 0 };
let flashEffect = { alpha: 0 };

// Jump trails for motion blur (double jump effect)
let motionTrails = [];

// Atmospheric dust particles for immersion
let dustParticles = [];
function initDustParticles() {
  dustParticles = [];
  for (let i = 0; i < 100; i++) { // Doubled particles!
    dustParticles.push({
      x: Math.random() * GAME_WIDTH,
      y: Math.random() * GAME_HEIGHT,
      vx: (Math.random() - 0.5) * 30,
      vy: Math.random() * 15 + 5,
      size: Math.random() * 3 + 1, // Bigger particles
      opacity: Math.random() * 0.5 + 0.2, // More visible
      life: Math.random(),
      glowIntensity: Math.random() * 0.3 + 0.2 // Add glow
    });
  }
}

// Emoji system
let emojiImages = { spartan: {}, warrior: {} };
let activeEmojis = [];

// Sound system
const sounds = {
  hurt: [],
  slash: [],
  hit: [],
  chat: null
};

// Load sounds
function loadSounds() {
  // Load hurt sounds (10 variations)
  for (let i = 1; i <= 10; i++) {
    const audio = new Audio(`/assets/sounds/hurt/region ${i}.wav`);
    audio.volume = 0.5;
    sounds.hurt.push(audio);
  }
  
  // Load slash sounds (4 variations)
  const slashFiles = [
    'a_woosh_sound_from_a-1760392738094.mp3_trimmed.wav',
    'a_woosh_sound_from_a_#1-1760392753134.mp3_trimmed.wav',
    'a_woosh_sound_from_a_#2-1760392757572.mp3_trimmed.wav',
    'a_woosh_sound_from_a_#3-1760392761517.mp3_trimmed.wav'
  ];
  slashFiles.forEach(file => {
    const audio = new Audio(`/assets/sounds/slash/${file}`);
    audio.volume = 0.4;
    sounds.slash.push(audio);
  });
  
  // Load hit sounds (4 variations)
  const hitFiles = [
    'sword_slash_effects-1760392508026.mp3_trimmed.wav',
    'sword_slash_effects_#1-1760392508027.mp3_trimmed.wav',
    'sword_slash_effects_#2-1760392508027.mp3_trimmed.wav',
    'sword_slash_effects_#3-1760392508028.mp3_trimmed.wav'
  ];
  hitFiles.forEach(file => {
    const audio = new Audio(`/assets/sounds/hit/${file}`);
    audio.volume = 0.6;
    sounds.hit.push(audio);
  });
  
  // Load chat sound (no pitch variation)
  sounds.chat = new Audio('/assets/sounds/chat/chat.mp3');
  sounds.chat.volume = 0.3;
}

// Play sound with random pitch variation
function playSound(soundType, noPitchVariation = false) {
  let soundArray = sounds[soundType];
  
  // For chat, play directly without variation
  if (soundType === 'chat') {
    const sound = sounds.chat.cloneNode();
    sound.play().catch(e => console.log('Sound play failed:', e));
    return;
  }
  
  // Pick random sound from array
  if (!soundArray || soundArray.length === 0) return;
  const randomSound = soundArray[Math.floor(Math.random() * soundArray.length)];
  
  // Clone to allow overlapping sounds
  const sound = randomSound.cloneNode();
  
  // Add pitch variation (0.8 to 1.2 = deeper to higher)
  if (!noPitchVariation) {
    sound.playbackRate = 0.8 + Math.random() * 0.4;
  }
  
  sound.play().catch(e => console.log('Sound play failed:', e));
}

loadSounds();

// Load random background
async function loadRandomBackground() {
  const randomIndex = Math.floor(Math.random() * backgroundFiles.length);
  const selectedBg = backgroundFiles[randomIndex];
  
  backgroundImage = new Image();
  
  return new Promise((resolve, reject) => {
    backgroundImage.onload = () => {
      backgroundLoaded = true;
      console.log(`Loaded background: ${selectedBg}`);
      resolve();
    };
    backgroundImage.onerror = () => {
      console.error(`Failed to load background: ${selectedBg}`);
      reject();
    };
    backgroundImage.src = `/assets/backgrounds/${selectedBg}`;
  });
}

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
const leaderboardList = document.getElementById('leaderboard-list');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const chatSend = document.getElementById('chat-send');

let selectedCharacter = null;
let camera = { x: 0, y: 0 };

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

// Reload hitboxes (can be called from console)
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
  
  // Lock button and show loading state
  startBtn.disabled = true;
  startBtn.classList.add('loading');
  startBtn.innerHTML = '<span class="loading-spinner"></span>Connecting to server, may take a few seconds...';
  
  // Load hitbox data
  try {
    const response = await fetch('/hitboxes.json');
    hitboxData = await response.json();
  } catch (error) {
    console.error('Error loading hitbox data:', error);
  }
  
  // Load sprite sheets
  await loadSpriteSheets();
  
  // Load emojis
  await loadEmojiImages();
  
  // Load random background
  await loadRandomBackground();
  
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
    
    // Initialize atmospheric effects
    initDustParticles();
    
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
    // Play hurt sound for the target
    playSound('hurt');
    
    // Play hit sound (weapon impact)
    playSound('hit');
    
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
      // Play death hurt sound
      playSound('hurt');
      
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
          respawnTimerEl.textContent = 'Respawning...';
        }
      }, 1000);
    }
  });
  
  socket.on('playerRespawned', (data) => {
    // Player respawned - hide death screen if it's me
    if (data.id === myId) {
      deathScreen.style.display = 'none';
    }
  });
  
  // Chat messages
  socket.on('chatMessage', (data) => {
    // Play chat sound (no pitch variation)
    playSound('chat');
    
    addChatMessage(data.name, data.message, data.id === myId);
  });
  
  // Emoji events
  socket.on('emoji', (data) => {
    spawnEmoji(data.playerId, data.emojiNumber);
  });
  
  // Double jump event - create motion trail effect
  socket.on('playerDoubleJump', (data) => {
    const player = players[data.id];
    if (player) {
      // Create multiple sprite-based trails for motion blur
      for (let i = 0; i < 8; i++) {
        setTimeout(() => {
          const p = players[data.id];
          if (p) {
            motionTrails.push({
              x: p.x,
              y: p.y,
              character: p.character,
              state: p.state,
              animationFrame: p.animationFrame,
              facingRight: p.facingRight,
              life: 0.25,
              maxLife: 0.25
            });
          }
        }, i * 25); // Stagger trails
      }
    }
  });
}

// Chat functions
function addChatMessage(name, message, isMe) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'chat-message';
  
  const nameSpan = document.createElement('span');
  nameSpan.className = 'chat-name';
  nameSpan.textContent = name + ': ';
  
  const textSpan = document.createElement('span');
  textSpan.className = 'chat-text';
  textSpan.textContent = message;
  
  messageDiv.appendChild(nameSpan);
  messageDiv.appendChild(textSpan);
  
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  // Keep only last 50 messages
  while (chatMessages.children.length > 50) {
    chatMessages.removeChild(chatMessages.firstChild);
  }
}

function sendChatMessage() {
  const message = chatInput.value.trim();
  if (message && socket && socket.connected) {
    socket.emit('chatMessage', { message });
    chatInput.value = '';
  }
}

chatSend.addEventListener('click', sendChatMessage);
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    sendChatMessage();
  }
});

// Update leaderboard
function updateLeaderboard() {
  const sortedPlayers = Object.values(players).sort((a, b) => b.kills - a.kills);
  
  leaderboardList.innerHTML = '';
  
  sortedPlayers.forEach((p, index) => {
    const entry = document.createElement('div');
    entry.className = 'leaderboard-entry' + (p.id === myId ? ' me' : '');
    
    const rank = document.createElement('span');
    rank.className = 'leaderboard-rank';
    rank.textContent = `#${index + 1}`;
    
    const name = document.createElement('span');
    name.className = 'leaderboard-name';
    name.textContent = p.name;
    
    const kills = document.createElement('span');
    kills.className = 'leaderboard-kills';
    kills.textContent = `${p.kills} ⚔️`;
    
    entry.appendChild(rank);
    entry.appendChild(name);
    entry.appendChild(kills);
    
    leaderboardList.appendChild(entry);
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
      size: Math.random() * 2 + 1, // SMALLER for pixelated look
      color: '#8B0000' // BLOOD RED
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
      size: Math.random() * 3 + 1, // SMALLER for pixelated look
      color: '#8B0000' // BLOOD RED
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
  
  // Screen shake decay
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
  
  // Flash effect decay
  if (flashEffect.alpha > 0) {
    flashEffect.alpha -= dt * 2;
    if (flashEffect.alpha < 0) flashEffect.alpha = 0;
  }
  
  // Update motion trails
  for (let i = motionTrails.length - 1; i >= 0; i--) {
    const trail = motionTrails[i];
    trail.life -= dt;
    if (trail.life <= 0) {
      motionTrails.splice(i, 1);
    }
  }
  
  // Update atmospheric dust particles
  for (let i = 0; i < dustParticles.length; i++) {
    const dust = dustParticles[i];
    dust.x += dust.vx * dt;
    dust.y += dust.vy * dt;
    dust.life += dt * 0.5;
    
    // Wrap around screen
    if (dust.x < 0) dust.x = GAME_WIDTH;
    if (dust.x > GAME_WIDTH) dust.x = 0;
    if (dust.y > GAME_HEIGHT) {
      dust.y = 0;
      dust.x = Math.random() * GAME_WIDTH;
    }
    
    // Intense pulsing opacity for shimmer effect
    dust.opacity = 0.3 + Math.sin(dust.life * 3) * 0.2;
  }
}


function drawParticles() {
  particles.forEach(p => {
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    // SCALE particles for pixelation
    ctx.arc(p.x / PIXEL_SCALE, p.y / PIXEL_SCALE, p.size / PIXEL_SCALE, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

// =============================================================================
// EMOJI SYSTEM
// =============================================================================

// Load emoji images
async function loadEmojiImages() {
  const characters = {
    'spartan': 'spartan emojis',
    'warrior': 'warrior emojis'
  };
  
  for (const [char, folderName] of Object.entries(characters)) {
    for (let i = 1; i <= 9; i++) {
      const img = new Image();
      const path = `/assets/emojis/${folderName}/${i}.png`;
      
      try {
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = path;
        });
        emojiImages[char][i] = img;
        console.log(`✓ Loaded emoji: ${char} #${i} from ${folderName}`);
      } catch (error) {
        console.log(`⚠️ Could not load emoji: ${path}`);
      }
    }
  }
  console.log('Emoji loading complete!');
}

// Spawn emoji above player
function spawnEmoji(playerId, emojiNumber) {
  const player = players[playerId];
  if (!player || !player.character) return;
  
  const emojiImg = emojiImages[player.character]?.[emojiNumber];
  if (!emojiImg) return;
  
  // Remove any existing emoji for this player
  const existingIndex = activeEmojis.findIndex(e => e.playerId === playerId);
  if (existingIndex !== -1) {
    activeEmojis.splice(existingIndex, 1);
  }
  
  // Add new emoji
  activeEmojis.push({
    playerId: playerId, // Track which player this belongs to
    img: emojiImg,
    life: 2.5, // 2.5 seconds lifetime
    maxLife: 2.5
  });
}

// Update emoji animations
function updateEmojis(dt) {
  for (let i = activeEmojis.length - 1; i >= 0; i--) {
    const emoji = activeEmojis[i];
    emoji.life -= dt;
    
    if (emoji.life <= 0) {
      activeEmojis.splice(i, 1);
    }
  }
}

// Draw emojis - SCALED for pixelation
function drawEmojis() {
  for (const emoji of activeEmojis) {
    const player = players[emoji.playerId];
    if (!player) continue; // Player disconnected
    
    // Fade out in last 0.5 seconds
    const alpha = Math.min(1, emoji.life / 0.5);
    ctx.save();
    ctx.globalAlpha = alpha;
    
    // Medium size - scaled for pixelation
    const size = 50 / PIXEL_SCALE;
    const x = player.x / PIXEL_SCALE;
    const y = player.y / PIXEL_SCALE - 70 / PIXEL_SCALE; // Above player's head
    ctx.drawImage(emoji.img, x - size / 2, y - size / 2, size, size);
    
    ctx.restore();
  }
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

// Jump animations are in the jump folder
const jumpPatterns = {
  spartan: {
    air: 'air',
    land: 'land'
  },
  warrior: {
    air: 'air',
    land: 'land'
  }
};

async function loadSpriteSheets() {
  const characters = ['spartan', 'warrior'];
  const animations = ['idle', 'walk', 'attack', 'powerup'];
  const jumpAnimations = ['air', 'land'];
  
  for (const char of characters) {
    spriteSheets[char] = {};
    
    // Load regular animations
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
    
    // Load jump animations from jump folder (single PNG files)
    for (const anim of jumpAnimations) {
      const charName = char.charAt(0).toUpperCase() + char.slice(1);
      const basePath = `/assets/player sprites/${charName}/jump/`;
      const filename = `${jumpPatterns[char][anim]}.png`;
      
      console.log(`Loading ${char} ${anim} from jump folder as single PNG...`);
      
      const img = new Image();
      try {
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('timeout')), 1000);
          img.onload = () => {
            clearTimeout(timeout);
            console.log(`  ✓ Loaded ${char} ${anim}`);
            resolve();
          };
          img.onerror = () => {
            clearTimeout(timeout);
            console.log(`  ✗ Failed to load ${char} ${anim}`);
            reject(new Error('failed'));
          };
          img.src = basePath + filename;
        });
        // Store as single-frame array for consistency
        spriteSheets[char][anim] = [img];
      } catch (e) {
        console.log(`  ⚠️ Could not load ${basePath}${filename}`);
        spriteSheets[char][anim] = [];
      }
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
  if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') {
    currentInput.jump = true;
  }
  if (e.key === ' ') {
    currentInput.attack = true;
  }
  
  // Emoji keys 1-9
  if (e.key >= '1' && e.key <= '9') {
    const emojiNum = parseInt(e.key);
    if (socket && socket.connected && myId) {
      socket.emit('emoji', { emojiNumber: emojiNum });
      // Show locally too
      spawnEmoji(myId, emojiNum);
    }
  }
});

document.addEventListener('keyup', (e) => {
  if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
    currentInput.left = false;
  }
  if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
    currentInput.right = false;
  }
  if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') {
    currentInput.jump = false;
  }
  if (e.key === ' ') {
    currentInput.attack = false;
  }
  if (e.key === 'h' || e.key === 'H') {
    showHitboxes = !showHitboxes;
    console.log('Hitboxes:', showHitboxes ? 'ON' : 'OFF');
  }
});

// Mouse controls removed - Space is now attack

let lastTime = 0;
let frameCount = 0;
let fpsTime = 0;

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.1); // Cap dt
  lastTime = timestamp;
  
  // Update timer for leaderboard
  frameCount++;
  fpsTime += dt;
  if (fpsTime >= 1) {
    frameCount = 0;
    fpsTime = 0;
    updateLeaderboard(); // Update leaderboard every second
  }
  
  // Update particles and effects
  updateParticles(dt);
  
  // Update emojis
  updateEmojis(dt);
  
  // Update camera
  if (players[myId]) {
    const target = players[myId];
    camera.x = target.x - canvas.width / 2;
    camera.y = target.y - canvas.height / 2;
    
    // Clamp camera to world bounds
    camera.x = Math.max(0, Math.min(GAME_WIDTH - canvas.width, camera.x));
    camera.y = Math.max(0, Math.min(GAME_HEIGHT - canvas.height, camera.y));
  }
  
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
  // Clear entire canvas first (black background for letterboxing)
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.save();
  
  // Calculate scale to fill screen while maintaining aspect ratio
  const scaleX = canvas.width / GAME_WIDTH;
  const scaleY = canvas.height / GAME_HEIGHT;
  const scale = Math.min(scaleX, scaleY);
  
  // Center the game if there's extra space
  const offsetX = (canvas.width - GAME_WIDTH * scale) / 2;
  const offsetY = (canvas.height - GAME_HEIGHT * scale) / 2;
  
  // Apply scale and centering
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);
  
  // PIXELATION: Scale down rendering for chunky pixels
  ctx.scale(PIXEL_SCALE, PIXEL_SCALE);
  
  // Draw background FIRST (before camera transform) - BACK LAYER
  // Use destination-over to ensure it stays BEHIND everything
  ctx.save();
  if (backgroundLoaded && backgroundImage) {
    // Fake parallax: Background moves slower than camera for depth
    const parallaxX = camera.x * 0.2;
    const parallaxY = camera.y * 0.15;
    
    // Draw background SUPER PIXELATED (render at 1/8 size then scale up)
    const bgPixelScale = 8; // HEAVY pixelation
    const bgX = -parallaxX / PIXEL_SCALE;
    const bgY = -parallaxY / PIXEL_SCALE;
    
    // Disable smoothing for chunky pixels
    ctx.imageSmoothingEnabled = false;
    
    // Draw background at much smaller size for pixelation
    ctx.drawImage(
      backgroundImage, 
      0, 0, backgroundImage.width, backgroundImage.height,  // Source
      bgX, bgY, RENDER_WIDTH, RENDER_HEIGHT  // Destination (stretched = pixelated)
    );
    
    // Immersive effect 1: Dark vignette overlay
    const vignetteGradient = ctx.createRadialGradient(
      RENDER_WIDTH / 2, RENDER_HEIGHT / 2, RENDER_WIDTH * 0.3,
      RENDER_WIDTH / 2, RENDER_HEIGHT / 2, RENDER_WIDTH * 0.8
    );
    vignetteGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignetteGradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.3)');
    vignetteGradient.addColorStop(1, 'rgba(0, 0, 0, 0.7)');
    ctx.fillStyle = vignetteGradient;
    ctx.fillRect(0, 0, RENDER_WIDTH, RENDER_HEIGHT);
    
    // Immersive effect 2: Atmospheric fog/mist overlay
    const fogGradient = ctx.createLinearGradient(0, 0, 0, RENDER_HEIGHT);
    fogGradient.addColorStop(0, 'rgba(50, 40, 30, 0.2)');
    fogGradient.addColorStop(0.5, 'rgba(50, 40, 30, 0.05)');
    fogGradient.addColorStop(1, 'rgba(30, 20, 15, 0.3)');
    ctx.fillStyle = fogGradient;
    ctx.fillRect(0, 0, RENDER_WIDTH, RENDER_HEIGHT);
  }
  ctx.restore();
  
  // Apply screen shake and camera AFTER background
  ctx.translate(screenShake.x - camera.x, screenShake.y - camera.y);
  
  // Draw atmospheric dust particles with glow (behind everything) - SCALED
  dustParticles.forEach(dust => {
    const x = dust.x / PIXEL_SCALE;
    const y = dust.y / PIXEL_SCALE;
    const size = dust.size / PIXEL_SCALE;
    
    // Glow effect
    const dustGlow = ctx.createRadialGradient(x, y, 0, x, y, size * 3);
    dustGlow.addColorStop(0, `rgba(255, 240, 200, ${dust.opacity * 0.6})`);
    dustGlow.addColorStop(0.5, `rgba(255, 220, 180, ${dust.opacity * 0.3})`);
    dustGlow.addColorStop(1, 'rgba(255, 200, 150, 0)');
    ctx.fillStyle = dustGlow;
    ctx.beginPath();
    ctx.arc(x, y, size * 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Core particle
    ctx.globalAlpha = dust.opacity;
    ctx.fillStyle = '#fffacd';
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  
  // Draw stone floor - SCALED
  const groundY = GROUND_Y / PIXEL_SCALE;
  ctx.fillStyle = '#4a4a4a';
  ctx.fillRect(0, groundY, RENDER_WIDTH, RENDER_HEIGHT - groundY);
  
  // Draw floor cracks/details - SCALED
  ctx.strokeStyle = '#2a2a2a';
  ctx.lineWidth = 2 / PIXEL_SCALE;
  for (let i = 0; i < RENDER_WIDTH; i += 100 / PIXEL_SCALE) {
    ctx.beginPath();
    ctx.moveTo(i, groundY);
    ctx.lineTo(i + 50 / PIXEL_SCALE, RENDER_HEIGHT);
    ctx.stroke();
  }
  
  // Draw floor line - SCALED
  ctx.strokeStyle = '#8b4513';
  ctx.lineWidth = 3 / PIXEL_SCALE;
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(RENDER_WIDTH, groundY);
  ctx.stroke();
  
  // Draw world bounds - SCALED
  ctx.strokeStyle = '#8b4513';
  ctx.lineWidth = 4 / PIXEL_SCALE;
  ctx.strokeRect(0, 0, RENDER_WIDTH, RENDER_HEIGHT);
  
  // Draw motion trails (sprite-based with fade)
  motionTrails.forEach(trail => {
    const alpha = (trail.life / trail.maxLife) * 0.5; // Fade out
    
    // Get sprite frame
    const frames = spriteSheets[trail.character]?.[trail.state];
    if (!frames || frames.length === 0) return;
    
    const frameIndex = trail.animationFrame % frames.length;
    const frame = frames[frameIndex];
    if (!frame || !frame.complete) return;
    
    // Scale for pixelation
    const x = trail.x / PIXEL_SCALE;
    const y = trail.y / PIXEL_SCALE;
    const gameScale = (hitboxData[trail.character]?.gameScale || 1.0) / PIXEL_SCALE;
    const width = frame.width * gameScale;
    const height = frame.height * gameScale;
    
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    
    // Flip sprite if needed
    const charData = hitboxData[trail.character];
    const spriteFacesLeft = charData?.facing === 'left';
    const shouldFlip = (spriteFacesLeft && trail.facingRight) || (!spriteFacesLeft && !trail.facingRight);
    if (shouldFlip) {
      ctx.scale(-1, 1);
    }
    
    ctx.drawImage(frame, -width / 2, -height / 2, width, height);
    ctx.restore();
  });
  
  // Draw players
  for (const id in players) {
    const p = players[id];
    // Don't draw dead players (check both hp and alive flag)
    if (p.hp <= 0 || p.alive === false) continue;
    drawPlayer(p, id === myId);
  }
  
  // Draw particles
  drawParticles();
  
  // Draw emojis
  drawEmojis();
  
  ctx.restore();
  
  // Draw flash effect (not affected by shake)
  if (flashEffect.alpha > 0) {
    ctx.fillStyle = `rgba(220, 20, 60, ${flashEffect.alpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

// Draw just the sprite (for trails)
function drawPlayerSprite(player, drawExtras = true) {
  const frames = spriteSheets[player.character]?.[player.state];
  if (!frames || frames.length === 0) return;
  
  const frameIndex = player.animationFrame % frames.length;
  const frame = frames[frameIndex];
  if (!frame || !frame.complete) return;
  
  const gameScale = hitboxData[player.character]?.gameScale || 1.0;
  const width = frame.width * gameScale;
  const height = frame.height * gameScale;
  
  ctx.save();
  ctx.translate(player.x, player.y);
  
  const charData = hitboxData[player.character];
  const spriteFacesLeft = charData?.facing === 'left';
  const shouldFlip = (spriteFacesLeft && player.facingRight) || (!spriteFacesLeft && !player.facingRight);
  
  if (shouldFlip) {
    ctx.scale(-1, 1);
  }
  
  ctx.drawImage(frame, -width / 2, -height / 2, width, height);
  ctx.restore();
}

function drawPlayer(player, isMe) {
  const frames = spriteSheets[player.character]?.[player.state];
  if (!frames || frames.length === 0) {
    // Draw placeholder
    ctx.fillStyle = isMe ? '#4ade80' : '#9ad0ff';
    ctx.fillRect(player.x / PIXEL_SCALE - 25, player.y / PIXEL_SCALE - 40, 50, 80);
    return;
  }
  
  const frameIndex = player.animationFrame % frames.length;
  const frame = frames[frameIndex];
  if (!frame || !frame.complete) return;
  
  // SCALE player position for pixelation
  const x = player.x / PIXEL_SCALE;
  const y = player.y / PIXEL_SCALE;
  
  // Use GAME scale from hitbox data (NOT the dev tools editing scale!)
  const gameScale = (hitboxData[player.character]?.gameScale || 1.0) / PIXEL_SCALE;
  const width = frame.width * gameScale;
  const height = frame.height * gameScale;
  
  // Draw INTENSE ambient glow around player - SCALED
  // Outer glow (large, subtle)
  const outerGlow = ctx.createRadialGradient(x, y, 0, x, y, 120 / PIXEL_SCALE);
  outerGlow.addColorStop(0, 'rgba(255, 180, 80, 0.3)');
  outerGlow.addColorStop(0.4, 'rgba(255, 140, 60, 0.15)');
  outerGlow.addColorStop(0.7, 'rgba(255, 100, 40, 0.08)');
  outerGlow.addColorStop(1, 'rgba(255, 80, 20, 0)');
  ctx.fillStyle = outerGlow;
  ctx.beginPath();
  ctx.arc(x, y, 120 / PIXEL_SCALE, 0, Math.PI * 2);
  ctx.fill();
  
  // Inner glow (smaller, intense)
  const innerGlow = ctx.createRadialGradient(x, y, 0, x, y, 60 / PIXEL_SCALE);
  innerGlow.addColorStop(0, 'rgba(255, 220, 150, 0.4)');
  innerGlow.addColorStop(0.5, 'rgba(255, 180, 100, 0.2)');
  innerGlow.addColorStop(1, 'rgba(255, 140, 60, 0)');
  ctx.fillStyle = innerGlow;
  ctx.beginPath();
  ctx.arc(x, y, 60 / PIXEL_SCALE, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.save();
  ctx.translate(x, y);
  
  // Flip sprite: sprite in file faces a certain way, we flip it to match player movement
  const charData = hitboxData[player.character];
  const spriteFacesLeft = charData?.facing === 'left';
  
  // If sprite faces left in file but player wants right, flip it
  // If sprite faces right in file but player wants left, flip it
  const shouldFlip = (spriteFacesLeft && player.facingRight) || (!spriteFacesLeft && !player.facingRight);
  
  if (shouldFlip) {
    ctx.scale(-1, 1);
  }
  
  // DRAMATIC flicker effect if invincible (only if invincibleTime > 0)
  if (player.invincible && player.invincibleTime > 0) {
    // Fast flicker on/off
    const flickerSpeed = Date.now() / 150; // Fast flicker
    const isVisible = Math.floor(flickerSpeed) % 2 === 0;
    if (!isVisible) {
      ctx.globalAlpha = 0.3; // Semi-transparent when "off"
    }
  }
  
  ctx.drawImage(frame, -width / 2, -height / 2, width, height);
  
  ctx.globalAlpha = 1;
  ctx.restore();
  
  // Draw name (enable smooth rendering for text only)
  ctx.imageSmoothingEnabled = true;
  ctx.fillStyle = isMe ? '#daa520' : '#f4e4c1';
  ctx.font = '14px MedievalSharp, serif';
  ctx.textAlign = 'center';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 3;
  ctx.strokeText(player.name, player.x, player.y - height / 2 - 10);
  ctx.fillText(player.name, player.x, player.y - height / 2 - 10);
  ctx.imageSmoothingEnabled = false;
  
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

// =============================================================================
// DEVELOPER TOOLS - Integrated Hitbox Editor
// =============================================================================

const DEV_PASSWORD = "intercept";
let devModeActive = false;
let devHitboxData = {};
let devCurrentCharacter = 'spartan';
let devCurrentAnimation = 'idle';
let devCurrentFrame = 0;
let devCurrentTool = 'body';
let devIsFlipped = false;
let devSpriteScale = 3;
let devImageFrames = [];
let devIsDragging = false;
let devDragStart = { x: 0, y: 0 };
let devDragEnd = { x: 0, y: 0 };

const devModeBtn = document.getElementById('dev-mode-btn');
const devPanel = document.getElementById('dev-panel');
const devClose = document.getElementById('dev-close');
const devCanvas = document.getElementById('dev-canvas');
const devCtx = devCanvas.getContext('2d');

// Dev UI Elements
const devCharacterSelect = document.getElementById('dev-character-select');
const devAnimationSelect = document.getElementById('dev-animation-select');
const devFrameDisplay = document.getElementById('dev-frame-display');
const devPrevFrameBtn = document.getElementById('dev-prev-frame');
const devNextFrameBtn = document.getElementById('dev-next-frame');
const devFlipCheckbox = document.getElementById('dev-flip-sprite');
const devFacingInfo = document.getElementById('dev-facing-info');
const devSpriteScaleSlider = document.getElementById('dev-sprite-scale');
const devScaleValueDisplay = document.getElementById('dev-scale-value');
const devFrameTimeSlider = document.getElementById('dev-frame-time');
const devFrameTimeDisplay = document.getElementById('dev-frame-time-value');
const devSaveBtn = document.getElementById('dev-save-btn');
const devResetBtn = document.getElementById('dev-reset-btn');
const devToolBodyBtn = document.getElementById('dev-tool-body');
const devToolAttackBtn = document.getElementById('dev-tool-attack');
const devAddAttackBtn = document.getElementById('dev-add-attack');
const devAttackList = document.getElementById('dev-attack-list');
const devSaveStatus = document.getElementById('dev-save-status');
const devAttackControls = document.getElementById('dev-attack-controls');

// Sprite patterns for dev tools
const devSpritePatterns = {
  spartan: {
    idle: 'idle spartan',
    walk: 'walk',
    attack: 'movemnt',
    air: 'air',
    land: 'land'
  },
  warrior: {
    idle: 'sprite-256px-16',
    walk: 'walk big guy',
    attack: 'slash',
    air: 'air',
    land: 'land'
  }
};

// Password prompt
devModeBtn.addEventListener('click', () => {
  const password = prompt('Enter developer password:');
  if (password === DEV_PASSWORD) {
    openDevMode();
  } else if (password !== null) {
    alert('Incorrect password!');
  }
});

function openDevMode() {
  devPanel.classList.add('active');
  devModeActive = true;
  loadDevHitboxData();
}

devClose.addEventListener('click', () => {
  devPanel.classList.remove('active');
  devModeActive = false;
});

// Load hitbox data for dev mode
async function loadDevHitboxData() {
  try {
    const response = await fetch('/hitboxes.json');
    devHitboxData = await response.json();
    
    if (devHitboxData[devCurrentCharacter]?.spriteScale) {
      devSpriteScale = devHitboxData[devCurrentCharacter].spriteScale;
      devSpriteScaleSlider.value = devSpriteScale;
      devScaleValueDisplay.textContent = devSpriteScale + 'x';
    }
    
    if (devHitboxData[devCurrentCharacter]?.flipped !== undefined) {
      devIsFlipped = devHitboxData[devCurrentCharacter].flipped;
      devFlipCheckbox.checked = devIsFlipped;
    }
    
    updateDevUI();
    loadDevCurrentAnimation();
  } catch (error) {
    console.error('Error loading dev hitbox data:', error);
    devHitboxData = {
      spartan: { facing: 'left', spriteScale: 3, gameScale: 1.0, flipped: false, animations: {} },
      warrior: { facing: 'right', spriteScale: 3, gameScale: 1.0, flipped: false, animations: {} }
    };
  }
}

// Load animation frames for dev mode
async function loadDevCurrentAnimation() {
  const charName = devCurrentCharacter.charAt(0).toUpperCase() + devCurrentCharacter.slice(1);
  const spritePattern = devSpritePatterns[devCurrentCharacter][devCurrentAnimation];
  
  devImageFrames = [];
  
  // Check if this is a jump animation (single PNG)
  const isJumpAnim = ['air', 'land'].includes(devCurrentAnimation);
  
  if (isJumpAnim) {
    // Load single PNG from jump folder
    const basePath = `/assets/player sprites/${charName}/jump/`;
    const filename = `${spritePattern}.png`;
    const fullPath = basePath + filename;
    
    const img = new Image();
    try {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('timeout')), 1000);
        img.onload = () => {
          clearTimeout(timeout);
          devImageFrames.push(img);
          resolve();
        };
        img.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('failed'));
        };
        img.src = fullPath;
      });
    } catch (e) {
      console.log(`Failed to load ${fullPath}`);
    }
  } else {
    // Load sprite sheet frames for regular animations
    const basePath = `/assets/player sprites/${charName}/${devCurrentAnimation}/`;
    
    for (let r = 0; r < 10; r++) {
      let rowLoaded = false;
      for (let c = 0; c < 10; c++) {
        const paddedR = String(r).padStart(3, '0');
        const paddedC = String(c).padStart(3, '0');
        const filename = `${spritePattern}_r${paddedR}_c${paddedC}.png`;
        const fullPath = basePath + filename;
        
        const img = new Image();
        
        try {
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('timeout')), 1000);
            img.onload = () => {
              clearTimeout(timeout);
              devImageFrames.push(img);
              rowLoaded = true;
              resolve();
            };
            img.onerror = () => {
              clearTimeout(timeout);
              reject(new Error('failed'));
            };
            img.src = fullPath;
          });
        } catch (e) {
          if (c === 0 && !rowLoaded) break;
          if (rowLoaded) break;
        }
      }
      if (!rowLoaded && r > 0) break;
    }
  }
  
  if (devImageFrames.length === 0) {
    devSaveStatus.textContent = '⚠️ No sprites found!';
    devSaveStatus.style.background = '#ef4444';
  } else {
    devSaveStatus.textContent = `✓ Loaded ${devImageFrames.length} frames`;
    devSaveStatus.style.background = '#22c55e';
    setTimeout(() => {
      devSaveStatus.textContent = 'Ready';
      devSaveStatus.style.background = '#333';
    }, 2000);
  }
  
  if (!devHitboxData[devCurrentCharacter].animations[devCurrentAnimation]) {
    devHitboxData[devCurrentCharacter].animations[devCurrentAnimation] = {
      frames: devImageFrames.length,
      frameTime: 0.1,
      bodyHitbox: null,
      attackHitboxes: []
    };
  } else {
    devHitboxData[devCurrentCharacter].animations[devCurrentAnimation].frames = devImageFrames.length;
  }
  
  const animData = devHitboxData[devCurrentCharacter].animations[devCurrentAnimation];
  if (animData.frameTime !== undefined) {
    devFrameTimeSlider.value = animData.frameTime;
    devFrameTimeDisplay.textContent = animData.frameTime.toFixed(2) + 's';
  }
  
  devCurrentFrame = 0;
  updateDevUI();
  drawDevCanvas();
}

// Update dev UI
function updateDevUI() {
  const animData = devHitboxData[devCurrentCharacter]?.animations[devCurrentAnimation];
  if (!animData) return;
  
  devFrameDisplay.textContent = `Frame: ${devCurrentFrame + 1} / ${devImageFrames.length}`;
  devFacingInfo.textContent = devIsFlipped ? 
    (devHitboxData[devCurrentCharacter].facing === 'left' ? 'Right' : 'Left') :
    devHitboxData[devCurrentCharacter].facing.charAt(0).toUpperCase() + devHitboxData[devCurrentCharacter].facing.slice(1);
  
  if (animData.bodyHitbox) {
    document.getElementById('dev-body-x').textContent = Math.round(animData.bodyHitbox.x);
    document.getElementById('dev-body-y').textContent = Math.round(animData.bodyHitbox.y);
    document.getElementById('dev-body-w').textContent = Math.round(animData.bodyHitbox.width);
    document.getElementById('dev-body-h').textContent = Math.round(animData.bodyHitbox.height);
  }
  
  updateDevAttackList();
}

// Update attack list
function updateDevAttackList() {
  const animData = devHitboxData[devCurrentCharacter]?.animations[devCurrentAnimation];
  if (!animData) return;
  
  devAttackList.innerHTML = '';
  const frameHitboxes = animData.attackHitboxes.filter(hb => hb.frame === devCurrentFrame);
  
  frameHitboxes.forEach((hb, index) => {
    const div = document.createElement('div');
    div.style.cssText = 'padding: 5px; margin: 5px 0; background: rgba(61,40,23,0.5); border-radius: 3px;';
    div.innerHTML = `
      <span style="font-size: 11px;">Attack ${index + 1}: (${Math.round(hb.x)}, ${Math.round(hb.y)}) ${Math.round(hb.width)}x${Math.round(hb.height)}</span>
      <button onclick="deleteDevAttackHitbox(${index})" style="padding: 3px 8px; font-size: 11px; background: #ef4444; margin-left: 5px;">Del</button>
    `;
    devAttackList.appendChild(div);
  });
}

// Delete attack hitbox
window.deleteDevAttackHitbox = function(index) {
  const animData = devHitboxData[devCurrentCharacter].animations[devCurrentAnimation];
  const frameHitboxes = animData.attackHitboxes.filter(hb => hb.frame === devCurrentFrame);
  const hitboxToDelete = frameHitboxes[index];
  const globalIndex = animData.attackHitboxes.indexOf(hitboxToDelete);
  animData.attackHitboxes.splice(globalIndex, 1);
  updateDevUI();
  drawDevCanvas();
};

// Draw dev canvas
function drawDevCanvas() {
  devCtx.clearRect(0, 0, devCanvas.width, devCanvas.height);
  
  // Grid
  devCtx.strokeStyle = '#333';
  devCtx.lineWidth = 1;
  for (let i = 0; i < devCanvas.width; i += 50) {
    devCtx.beginPath();
    devCtx.moveTo(i, 0);
    devCtx.lineTo(i, devCanvas.height);
    devCtx.stroke();
  }
  for (let i = 0; i < devCanvas.height; i += 50) {
    devCtx.beginPath();
    devCtx.moveTo(0, i);
    devCtx.lineTo(devCanvas.width, i);
    devCtx.stroke();
  }
  
  if (devImageFrames.length === 0) return;
  
  const img = devImageFrames[devCurrentFrame];
  if (!img || !img.complete) return;
  
  const centerX = devCanvas.width / 2;
  const centerY = devCanvas.height / 2;
  const width = img.width * devSpriteScale;
  const height = img.height * devSpriteScale;
  
  devCtx.save();
  devCtx.translate(centerX, centerY);
  
  if (devIsFlipped) {
    devCtx.scale(-1, 1);
  }
  
  devCtx.drawImage(img, -width / 2, -height / 2, width, height);
  devCtx.restore();
  
  // Draw hitboxes
  const animData = devHitboxData[devCurrentCharacter]?.animations[devCurrentAnimation];
  if (!animData) return;
  
  // Body hitbox
  if (animData.bodyHitbox) {
    const hb = animData.bodyHitbox;
    let x = centerX + hb.x * devSpriteScale;
    let y = centerY + hb.y * devSpriteScale;
    
    if (devIsFlipped) {
      x = centerX - hb.x * devSpriteScale - hb.width * devSpriteScale;
    }
    
    devCtx.strokeStyle = '#22c55e';
    devCtx.lineWidth = 2;
    devCtx.strokeRect(x, y, hb.width * devSpriteScale, hb.height * devSpriteScale);
    devCtx.fillStyle = 'rgba(34, 197, 94, 0.2)';
    devCtx.fillRect(x, y, hb.width * devSpriteScale, hb.height * devSpriteScale);
  }
  
  // Attack hitboxes
  const frameHitboxes = animData.attackHitboxes.filter(hb => hb.frame === devCurrentFrame);
  frameHitboxes.forEach(hb => {
    let x = centerX + hb.x * devSpriteScale;
    let y = centerY + hb.y * devSpriteScale;
    
    if (devIsFlipped) {
      x = centerX - hb.x * devSpriteScale - hb.width * devSpriteScale;
    }
    
    devCtx.strokeStyle = '#dc143c';
    devCtx.lineWidth = 2;
    devCtx.strokeRect(x, y, hb.width * devSpriteScale, hb.height * devSpriteScale);
    devCtx.fillStyle = 'rgba(220, 20, 60, 0.2)';
    devCtx.fillRect(x, y, hb.width * devSpriteScale, hb.height * devSpriteScale);
  });
  
  // Draw current drag
  if (devIsDragging) {
    const x = Math.min(devDragStart.x, devDragEnd.x);
    const y = Math.min(devDragStart.y, devDragEnd.y);
    const w = Math.abs(devDragEnd.x - devDragStart.x);
    const h = Math.abs(devDragEnd.y - devDragStart.y);
    
    devCtx.strokeStyle = devCurrentTool === 'body' ? '#22c55e' : '#dc143c';
    devCtx.lineWidth = 2;
    devCtx.setLineDash([5, 5]);
    devCtx.strokeRect(x, y, w, h);
    devCtx.setLineDash([]);
    devCtx.fillStyle = devCurrentTool === 'body' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(220, 20, 60, 0.2)';
    devCtx.fillRect(x, y, w, h);
  }
}

// Event handlers
devCharacterSelect.addEventListener('change', (e) => {
  devCurrentCharacter = e.target.value;
  loadDevHitboxData();
});

devAnimationSelect.addEventListener('change', (e) => {
  devCurrentAnimation = e.target.value;
  loadDevCurrentAnimation();
});

devPrevFrameBtn.addEventListener('click', () => {
  devCurrentFrame = Math.max(0, devCurrentFrame - 1);
  updateDevUI();
  drawDevCanvas();
});

devNextFrameBtn.addEventListener('click', () => {
  devCurrentFrame = Math.min(devImageFrames.length - 1, devCurrentFrame + 1);
  updateDevUI();
  drawDevCanvas();
});

devFlipCheckbox.addEventListener('change', (e) => {
  devIsFlipped = e.target.checked;
  devHitboxData[devCurrentCharacter].flipped = devIsFlipped;
  updateDevUI();
  drawDevCanvas();
});

devSpriteScaleSlider.addEventListener('input', (e) => {
  devSpriteScale = parseFloat(e.target.value);
  devScaleValueDisplay.textContent = devSpriteScale.toFixed(1) + 'x';
  devHitboxData[devCurrentCharacter].spriteScale = devSpriteScale;
  drawDevCanvas();
});

devFrameTimeSlider.addEventListener('input', (e) => {
  const frameTime = parseFloat(e.target.value);
  devFrameTimeDisplay.textContent = frameTime.toFixed(2) + 's';
  const animData = devHitboxData[devCurrentCharacter].animations[devCurrentAnimation];
  if (animData) {
    animData.frameTime = frameTime;
  }
});

devToolBodyBtn.addEventListener('click', () => {
  devCurrentTool = 'body';
  devToolBodyBtn.style.background = '#22c55e';
  devToolAttackBtn.style.background = '#daa520';
  devAttackControls.style.display = 'none';
});

devToolAttackBtn.addEventListener('click', () => {
  devCurrentTool = 'attack';
  devToolBodyBtn.style.background = '#daa520';
  devToolAttackBtn.style.background = '#22c55e';
  devAttackControls.style.display = 'block';
});

devCanvas.addEventListener('mousedown', (e) => {
  const rect = devCanvas.getBoundingClientRect();
  devDragStart.x = e.clientX - rect.left;
  devDragStart.y = e.clientY - rect.top;
  devDragEnd = { ...devDragStart };
  devIsDragging = true;
});

devCanvas.addEventListener('mousemove', (e) => {
  if (!devIsDragging) return;
  const rect = devCanvas.getBoundingClientRect();
  devDragEnd.x = e.clientX - rect.left;
  devDragEnd.y = e.clientY - rect.top;
  drawDevCanvas();
});

devCanvas.addEventListener('mouseup', () => {
  if (!devIsDragging) return;
  devIsDragging = false;
  
  const x = Math.min(devDragStart.x, devDragEnd.x);
  const y = Math.min(devDragStart.y, devDragEnd.y);
  const w = Math.abs(devDragEnd.x - devDragStart.x);
  const h = Math.abs(devDragEnd.y - devDragStart.y);
  
  if (w < 5 || h < 5) return;
  
  const centerX = devCanvas.width / 2;
  const centerY = devCanvas.height / 2;
  
  let relX = (x - centerX) / devSpriteScale;
  let relY = (y - centerY) / devSpriteScale;
  const relW = w / devSpriteScale;
  const relH = h / devSpriteScale;
  
  if (devIsFlipped) {
    relX = (centerX - x - w) / devSpriteScale;
  }
  
  const animData = devHitboxData[devCurrentCharacter].animations[devCurrentAnimation];
  
  if (devCurrentTool === 'body') {
    animData.bodyHitbox = { x: relX, y: relY, width: relW, height: relH };
  } else {
    animData.attackHitboxes.push({ frame: devCurrentFrame, x: relX, y: relY, width: relW, height: relH });
  }
  
  updateDevUI();
  drawDevCanvas();
});

devSaveBtn.addEventListener('click', async () => {
  try {
    const response = await fetch('/api/save-hitboxes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(devHitboxData)
    });
    
    const result = await response.json();
    if (result.success) {
      devSaveStatus.textContent = '✓ Saved successfully!';
      devSaveStatus.style.background = '#22c55e';
      
      // Reload in main game
      hitboxData = devHitboxData;
      
      setTimeout(() => {
        devSaveStatus.textContent = 'Ready';
        devSaveStatus.style.background = '#333';
      }, 2000);
    } else {
      devSaveStatus.textContent = '⚠️ Save failed!';
      devSaveStatus.style.background = '#ef4444';
    }
  } catch (error) {
    console.error('Save error:', error);
    devSaveStatus.textContent = '⚠️ Save error!';
    devSaveStatus.style.background = '#ef4444';
  }
});

devResetBtn.addEventListener('click', () => {
  if (confirm('Reset ALL hitbox data? This cannot be undone!')) {
    devHitboxData = {
      spartan: { facing: 'left', spriteScale: 3, gameScale: 1.0, flipped: false, animations: {} },
      warrior: { facing: 'right', spriteScale: 3, gameScale: 1.0, flipped: false, animations: {} }
    };
    loadDevCurrentAnimation();
  }
});
