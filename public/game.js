// Medieval Battle Arena - Main Game
let socket = null;
let myId = null;
let myCharacter = null;
let myName = null;

let santaHatImage = null;
let shopUI = {
  container: null,
  button: null,
  overlay: null,
  card: null,
  status: null,
  buyButton: null,
  isOpen: false
};

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

function loadShopAssets() {
  if (santaHatImage) return;
  santaHatImage = new Image();
  santaHatImage.src = '/assets/store/santa%20hat.png';
}

function initShopUI() {
  if (shopUI.container) return;

  // Add CSS styles for holographic effects
  const style = document.createElement('style');
  style.textContent = `
    @keyframes holographic {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    
    @keyframes shimmer {
      0% { transform: translateX(-100%) skewX(-15deg); }
      100% { transform: translateX(100%) skewX(-15deg); }
    }
    
    @keyframes float {
      0%, 100% { transform: translateY(0px) scale(1); }
      50% { transform: translateY(-5px) scale(1.02); }
    }
    
    @keyframes glow {
      0%, 100% { box-shadow: 0 0 20px rgba(218, 165, 32, 0.3), 0 0 40px rgba(218, 165, 32, 0.1); }
      50% { box-shadow: 0 0 30px rgba(218, 165, 32, 0.5), 0 0 60px rgba(218, 165, 32, 0.2); }
    }
    
    .shop-button {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      background: linear-gradient(135deg, rgba(20, 12, 8, 0.9), rgba(40, 24, 16, 0.9));
      position: relative;
      overflow: hidden;
    }
    
    .shop-button::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(218, 165, 32, 0.3), transparent);
      transition: left 0.5s;
    }
    
    .shop-button:hover::before {
      left: 100%;
    }
    
    .shop-button:hover {
      transform: translateY(-2px) scale(1.05);
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3), 0 0 15px rgba(218, 165, 32, 0.4);
      background: linear-gradient(135deg, rgba(30, 18, 12, 0.95), rgba(50, 30, 20, 0.95));
    }
    
    .shop-overlay {
      backdrop-filter: blur(8px);
      animation: fadeIn 0.3s ease-out;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    .shop-panel {
      animation: slideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      background: linear-gradient(135deg, rgba(20, 12, 8, 0.95), rgba(30, 18, 12, 0.95));
      position: relative;
      overflow: hidden;
    }
    
    .shop-panel::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: linear-gradient(
        45deg,
        transparent 30%,
        rgba(218, 165, 32, 0.1) 50%,
        transparent 70%
      );
      animation: holographic 3s ease-in-out infinite;
    }
    
    @keyframes slideIn {
      from { 
        opacity: 0;
        transform: scale(0.8) translateY(-20px);
      }
      to { 
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }
    
    .shop-card {
      background: linear-gradient(135deg, rgba(0, 0, 0, 0.4), rgba(20, 12, 8, 0.3));
      border: 2px solid transparent;
      background-clip: padding-box;
      position: relative;
      transition: all 0.3s ease;
      animation: float 4s ease-in-out infinite;
    }
    
    .shop-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(45deg, #8b4513, #daa520, #8b4513);
      border-radius: 12px;
      padding: 2px;
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: exclude;
      mask-composite: exclude;
      opacity: 0.8;
    }
    
    .shop-card:hover {
      transform: translateY(-5px) scale(1.02);
      animation: glow 2s ease-in-out infinite;
    }
    
    .shop-card::after {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.2),
        transparent
      );
      animation: shimmer 2.5s infinite;
    }
    
    .shop-hat-image {
      transition: all 0.3s ease;
      filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
    }
    
    .shop-hat-image:hover {
      transform: rotate(5deg) scale(1.1);
      filter: drop-shadow(0 6px 12px rgba(218, 165, 32, 0.4));
    }
    
    .shop-buy-button {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
      background: linear-gradient(135deg, rgba(218, 165, 32, 0.2), rgba(255, 215, 0, 0.3));
      border: 2px solid #daa520;
    }
    
    .shop-buy-button::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 0;
      height: 0;
      background: radial-gradient(circle, rgba(255, 215, 0, 0.3), transparent);
      transition: all 0.3s ease;
      transform: translate(-50%, -50%);
    }
    
    .shop-buy-button:hover::before {
      width: 100%;
      height: 100%;
    }
    
    .shop-buy-button:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(218, 165, 32, 0.4);
      background: linear-gradient(135deg, rgba(255, 215, 0, 0.3), rgba(218, 165, 32, 0.4));
    }
    
    .shop-buy-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }
    
    .shop-close-button {
      transition: all 0.3s ease;
      background: rgba(139, 69, 19, 0.2);
    }
    
    .shop-close-button:hover {
      background: rgba(139, 69, 19, 0.4);
      transform: rotate(90deg);
    }
  `;
  document.head.appendChild(style);

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '100%';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '9999';

  const button = document.createElement('button');
  button.textContent = 'SHOP';
  button.className = 'shop-button';
  button.style.position = 'absolute';
  button.style.top = '10px';
  button.style.left = '50%';
  button.style.transform = 'translateX(-50%)';
  button.style.pointerEvents = 'auto';
  button.style.padding = '12px 24px';
  button.style.borderRadius = '12px';
  button.style.border = '2px solid #8b4513';
  button.style.color = '#f4e4c1';
  button.style.fontFamily = 'MedievalSharp, serif';
  button.style.fontSize = '20px';
  button.style.fontWeight = 'bold';
  button.style.cursor = 'pointer';
  button.style.textShadow = '0 2px 4px rgba(0, 0, 0, 0.5)';

  const overlay = document.createElement('div');
  overlay.className = 'shop-overlay';
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.display = 'none';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.background = 'rgba(0,0,0,0.6)';
  overlay.style.pointerEvents = 'auto';
  overlay.style.zIndex = '9998';

  const panel = document.createElement('div');
  panel.className = 'shop-panel';
  panel.style.width = '420px';
  panel.style.maxWidth = '92vw';
  panel.style.border = '2px solid #8b4513';
  panel.style.borderRadius = '14px';
  panel.style.color = '#f4e4c1';
  panel.style.boxShadow = '0 16px 60px rgba(0,0,0,0.5)';
  panel.style.padding = '16px';
  panel.style.fontFamily = 'MedievalSharp, serif';
  panel.style.position = 'relative';
  panel.style.zIndex = '1';

  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.justifyContent = 'space-between';
  header.style.position = 'relative';
  header.style.zIndex = '2';

  const title = document.createElement('div');
  title.textContent = 'SHOP';
  title.style.fontSize = '24px';
  title.style.letterSpacing = '2px';
  title.style.fontWeight = 'bold';
  title.style.textShadow = '0 3px 6px rgba(0, 0, 0, 0.7)';

  const close = document.createElement('button');
  close.className = 'shop-close-button';
  close.textContent = 'X';
  close.style.pointerEvents = 'auto';
  close.style.border = '2px solid #8b4513';
  close.style.color = '#f4e4c1';
  close.style.borderRadius = '10px';
  close.style.width = '40px';
  close.style.height = '36px';
  close.style.cursor = 'pointer';
  close.style.fontSize = '16px';
  close.style.fontWeight = 'bold';

  const card = document.createElement('div');
  card.className = 'shop-card';
  card.style.marginTop = '14px';
  card.style.borderRadius = '12px';
  card.style.padding = '14px';
  card.style.position = 'relative';
  card.style.zIndex = '2';

  // Santa Hat image container
  const imageContainer = document.createElement('div');
  imageContainer.style.display = 'flex';
  imageContainer.style.justifyContent = 'center';
  imageContainer.style.marginBottom = '12px';

  const hatImg = document.createElement('img');
  hatImg.className = 'shop-hat-image';
  hatImg.src = '/assets/store/santa%20hat.png';
  hatImg.style.width = '80px';
  hatImg.style.height = '80px';
  hatImg.style.objectFit = 'contain';
  hatImg.style.imageRendering = 'pixelated';
  hatImg.style.border = '2px solid rgba(218,165,32,0.4)';
  hatImg.style.borderRadius = '8px';
  hatImg.style.background = 'rgba(0,0,0,0.2)';
  hatImg.style.padding = '4px';

  imageContainer.appendChild(hatImg);

  const itemName = document.createElement('div');
  itemName.textContent = 'Santa Hat';
  itemName.style.fontSize = '20px';
  itemName.style.fontWeight = 'bold';
  itemName.style.textShadow = '0 2px 4px rgba(0, 0, 0, 0.5)';

  const quality = document.createElement('div');
  quality.textContent = 'Quality: Legendary';
  quality.style.marginTop = '6px';
  quality.style.color = '#daa520';
  quality.style.fontWeight = 'bold';
  quality.style.textShadow = '0 1px 2px rgba(0, 0, 0, 0.7)';

  const cost = document.createElement('div');
  cost.textContent = 'Cost: 3 kills';
  cost.style.marginTop = '6px';
  cost.style.fontSize = '16px';

  const perks = document.createElement('div');
  perks.textContent = 'Perks: ×2 speed, +5 damage';
  perks.style.marginTop = '6px';
  perks.style.fontSize = '16px';
  perks.style.color = '#87ceeb'; // Sky blue for perks

  const status = document.createElement('div');
  status.textContent = '';
  status.style.marginTop = '10px';
  status.style.minHeight = '18px';
  status.style.color = '#f4e4c1';
  status.style.fontWeight = 'bold';

  const buyButton = document.createElement('button');
  buyButton.className = 'shop-buy-button';
  buyButton.textContent = 'BUY';
  buyButton.style.marginTop = '10px';
  buyButton.style.padding = '12px 20px';
  buyButton.style.borderRadius = '10px';
  buyButton.style.color = '#f4e4c1';
  buyButton.style.cursor = 'pointer';
  buyButton.style.fontSize = '16px';
  buyButton.style.fontWeight = 'bold';
  buyButton.style.textShadow = '0 2px 4px rgba(0, 0, 0, 0.5)';

  header.appendChild(title);
  header.appendChild(close);

  card.appendChild(imageContainer);
  card.appendChild(itemName);
  card.appendChild(quality);
  card.appendChild(cost);
  card.appendChild(perks);
  card.appendChild(status);
  card.appendChild(buyButton);

  panel.appendChild(header);
  panel.appendChild(card);
  overlay.appendChild(panel);
  container.appendChild(button);

  document.body.appendChild(container);
  document.body.appendChild(overlay);

  // Create mute button container
  const muteContainer = document.createElement('div');
  muteContainer.id = 'mute-container';
  muteContainer.style.position = 'fixed';
  muteContainer.style.bottom = '10px';
  muteContainer.style.right = '10px';
  muteContainer.style.zIndex = '10000';
  muteContainer.style.display = 'flex';
  muteContainer.style.flexDirection = 'column';
  muteContainer.style.alignItems = 'flex-end';
  muteContainer.style.gap = '5px';

  // Create main mute button
  const mainMuteButton = document.createElement('button');
  mainMuteButton.id = 'main-mute-button';
  mainMuteButton.textContent = '🔊';
  mainMuteButton.title = 'Sound Options';
  mainMuteButton.style.width = '40px';
  mainMuteButton.style.height = '40px';
  mainMuteButton.style.borderRadius = '50%';
  mainMuteButton.style.border = '2px solid #8b4513';
  mainMuteButton.style.backgroundColor = 'rgba(20, 12, 8, 0.9)';
  mainMuteButton.style.color = '#f4e4c1';
  mainMuteButton.style.fontSize = '20px';
  mainMuteButton.style.cursor = 'pointer';
  mainMuteButton.style.display = 'flex';
  mainMuteButton.style.alignItems = 'center';
  mainMuteButton.style.justifyContent = 'center';
  mainMuteButton.style.transition = 'all 0.3s ease';
  mainMuteButton.style.order = '2'; // Keep at bottom

  // Create individual mute buttons (hidden by default)
  const muteMusicButton = document.createElement('button');
  muteMusicButton.textContent = '🎵';
  muteMusicButton.title = 'Toggle Music';
  muteMusicButton.style.width = '35px';
  muteMusicButton.style.height = '35px';
  muteMusicButton.style.borderRadius = '50%';
  muteMusicButton.style.border = '2px solid #8b4513';
  muteMusicButton.style.backgroundColor = 'rgba(20, 12, 8, 0.9)';
  muteMusicButton.style.color = '#f4e4c1';
  muteMusicButton.style.fontSize = '16px';
  muteMusicButton.style.cursor = 'pointer';
  muteMusicButton.style.display = 'none';
  muteMusicButton.style.alignItems = 'center';
  muteMusicButton.style.justifyContent = 'center';
  muteMusicButton.style.transition = 'all 0.3s ease';
  muteMusicButton.style.order = '1'; // Above main button

  const muteSoundsButton = document.createElement('button');
  muteSoundsButton.textContent = '⚔️';
  muteSoundsButton.title = 'Toggle Game Sounds';
  muteSoundsButton.style.width = '35px';
  muteSoundsButton.style.height = '35px';
  muteSoundsButton.style.borderRadius = '50%';
  muteSoundsButton.style.border = '2px solid #8b4513';
  muteSoundsButton.style.backgroundColor = 'rgba(20, 12, 8, 0.9)';
  muteSoundsButton.style.color = '#f4e4c1';
  muteSoundsButton.style.fontSize = '16px';
  muteSoundsButton.style.cursor = 'pointer';
  muteSoundsButton.style.display = 'none';
  muteSoundsButton.style.alignItems = 'center';
  muteSoundsButton.style.justifyContent = 'center';
  muteSoundsButton.style.transition = 'all 0.3s ease';
  muteSoundsButton.style.order = '0'; // Topmost

  // Add hover effects
  const addHoverEffect = (button) => {
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.1)';
      button.style.backgroundColor = 'rgba(40, 24, 16, 0.95)';
    });
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)';
      button.style.backgroundColor = 'rgba(20, 12, 8, 0.9)';
    });
  };

  addHoverEffect(mainMuteButton);
  addHoverEffect(muteMusicButton);
  addHoverEffect(muteSoundsButton);

  // Toggle menu visibility
  let menuOpen = false;
  mainMuteButton.addEventListener('click', () => {
    menuOpen = !menuOpen;
    muteMusicButton.style.display = menuOpen ? 'flex' : 'none';
    muteSoundsButton.style.display = menuOpen ? 'flex' : 'none';
  });

  // Individual mute functions
  muteMusicButton.addEventListener('click', () => {
    if (sounds.backgroundMusic) {
      if (sounds.backgroundMusic.volume === 0) {
        sounds.backgroundMusic.volume = previousVolumes.backgroundMusic || 0.3;
        muteMusicButton.style.opacity = '1';
      } else {
        previousVolumes.backgroundMusic = sounds.backgroundMusic.volume;
        sounds.backgroundMusic.volume = 0;
        muteMusicButton.style.opacity = '0.5';
      }
    }
  });

  muteSoundsButton.addEventListener('click', () => {
    const isSoundsMuted = currentMuteState === MUTE_STATES.ALL_MUTED;
    if (isSoundsMuted) {
      unmuteAllSounds();
      muteSoundsButton.style.opacity = '1';
      currentMuteState = MUTE_STATES.UNMUTED;
    } else {
      muteAllSounds();
      muteSoundsButton.style.opacity = '0.5';
      currentMuteState = MUTE_STATES.ALL_MUTED;
    }
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!muteContainer.contains(e.target) && menuOpen) {
      menuOpen = false;
      muteMusicButton.style.display = 'none';
      muteSoundsButton.style.display = 'none';
    }
  });

  muteContainer.appendChild(muteSoundsButton);
  muteContainer.appendChild(muteMusicButton);
  muteContainer.appendChild(mainMuteButton);
  document.body.appendChild(muteContainer);

  window.muteButton = mainMuteButton;
  window.muteContainer = muteContainer;

  // Create mute button popup message
  function showMuteButtonPopup() {
    const popup = document.createElement('div');
    popup.id = 'mute-button-popup';
    popup.textContent = 'New mute button!';
    popup.style.position = 'fixed';
    popup.style.bottom = '60px';
    popup.style.right = '10px';
    popup.style.padding = '8px 12px';
    popup.style.backgroundColor = 'rgba(218, 165, 32, 0.9)';
    popup.style.color = '#000';
    popup.style.borderRadius = '8px';
    popup.style.fontSize = '14px';
    popup.style.fontWeight = 'bold';
    popup.style.zIndex = '10001';
    popup.style.pointerEvents = 'none';
    popup.style.transition = 'opacity 0.3s ease';
    popup.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
    
    document.body.appendChild(popup);
    
    // Remove popup after 1 second
    setTimeout(() => {
      popup.style.opacity = '0';
      setTimeout(() => {
        if (popup.parentNode) {
          popup.parentNode.removeChild(popup);
        }
      }, 300);
    }, 1000);
  }

  // Show popup on first game start
  let hasShownPopup = localStorage.getItem('muteButtonPopupShown');
  if (!hasShownPopup) {
    // Delay popup to show after game loads
    setTimeout(() => {
      showMuteButtonPopup();
      localStorage.setItem('muteButtonPopupShown', 'true');
    }, 2000);
  }

  function setOpen(nextOpen) {
    shopUI.isOpen = nextOpen;
    overlay.style.display = nextOpen ? 'flex' : 'none';
    if (shopUI.status) shopUI.status.textContent = '';
    updateShopUI();
  }

  button.addEventListener('click', () => setOpen(true));
  close.addEventListener('click', () => setOpen(false));
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) setOpen(false);
  });

  buyButton.addEventListener('click', () => {
    if (!socket || !myId) return;
    if (shopUI.status) shopUI.status.textContent = '';
    socket.emit('buyItem', { itemId: 'santa_hat' });
  });

  shopUI.container = container;
  shopUI.button = button;
  shopUI.overlay = overlay;
  shopUI.card = card;
  shopUI.status = status;
  shopUI.buyButton = buyButton;

  updateShopUI();
}

function updateShopUI() {
  if (!shopUI.buyButton || !players[myId]) return;
  const me = players[myId];
  const owned = !!me.ownedItems?.santa_hat;
  const kills = me.kills || 0;
  const canBuy = !owned && kills >= 3;

  if (owned) {
    shopUI.buyButton.textContent = 'OWNED';
    shopUI.buyButton.disabled = true;
    shopUI.buyButton.style.opacity = '0.6';
    shopUI.buyButton.style.cursor = 'default';
  } else {
    shopUI.buyButton.textContent = canBuy ? 'BUY' : `NEED ${Math.max(0, 3 - kills)} KILLS`;
    shopUI.buyButton.disabled = !canBuy;
    shopUI.buyButton.style.opacity = canBuy ? '1' : '0.6';
    shopUI.buyButton.style.cursor = canBuy ? 'pointer' : 'default';
  }
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Game world dimensions (INFINITE scrolling in all directions!)
const GAME_WIDTH = 10000; // Massive world width
const GAME_HEIGHT = 10000; // Massive world height
const GROUND_Y = 5000; // Ground positioned in middle of world

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
const backgroundFiles = []; // No background images available

// Collision effects
let particles = [];
let screenShake = { x: 0, y: 0, intensity: 0 };
let flashEffect = { alpha: 0 };

// Jump trails for motion blur (double jump effect)
let motionTrails = [];

// Santa Hat red movement trails
let santaMotionTrails = [];

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

// HEAVY SNOW particle system - so much snow!!!
let snowParticles = [];
function initSnowParticles() {
  snowParticles = [];
  // Create INSANE AMOUNT of snow particles for blizzard effect
  for (let i = 0; i < 1500; i++) { // 1500 SNOWFLAKES!!! SO MUCH SNOW!!!
    snowParticles.push({
      x: Math.random() * GAME_WIDTH,
      y: Math.random() * GAME_HEIGHT - GAME_HEIGHT, // Start above screen
      vx: (Math.random() - 0.5) * 40, // Even more horizontal drift
      vy: Math.random() * 250 + 150, // INSANE falling speed
      size: Math.random() * 8 + 3, // MUCH bigger snowflakes
      opacity: Math.random() * 0.9 + 0.3, // Higher visibility
      life: Math.random(),
      wobble: Math.random() * Math.PI * 2, // For swaying motion
      wobbleSpeed: Math.random() * 4 + 3 // Even faster wobble
    });
  }
}

// Emoji system
let emojiImages = { knight: {}, spartan: {}, warrior: {} };
let activeEmojis = [];
const EMOJI_COUNT = 8; // Number of emoji images available (1-8)
const CHAT_BUBBLE_DURATION = 3; // Chat bubbles display for 3 seconds

// Tree system for parallax background
let treeImages = [];
let trees = [];
let treeVerticalOffset = 110; // Permanent tree vertical offset

// Snow hills system for background
let snowHills = [];
const TREE_LAYERS = {
  background: { parallax: 0.05, scale: 1.5, y_offset: 0 },   // Far trees - now LARGE
  midground: { parallax: 0.15, scale: 1.0, y_offset: -20 },  // Mid trees - same
  foreground: { parallax: 0.25, scale: 0.6, y_offset: -40 }  // Near trees - now SMALL
};

// Sound system
const sounds = {
  hurt: [],
  slash: [],
  hit: [],
  chat: null,
  custom: {}, // Custom sounds loaded from /assets/sounds/
  backgroundMusic: null // Background music
};

// Mute system
const MUTE_STATES = {
  UNMUTED: 'unmuted',
  MUSIC_ONLY: 'music_only',
  ALL_MUTED: 'all_muted'
};
let currentMuteState = MUTE_STATES.UNMUTED;
let previousVolumes = {}; // Store previous volumes to restore when unmuted

// Track last played frame for each player to avoid replaying sounds
const lastPlayedFrame = {};
// Track the highest frame seen for each player/animation to detect loops
const highestFrameSeen = {};

// OPTIMIZED Sound Loading - Using New 1.wav, 2.wav, 3.wav... Pattern!
async function loadSounds() {
  // Sound loading started
  
  // Sound folders with USER'S EXACT specifications! 
  const soundCategories = [
    { folder: 'death', key: 'death', maxFiles: 2, volume: 0.5, extensions: ['wav'] }, // When any player dies ✅
    { folder: 'shield hit', key: 'shield_block', maxFiles: 4, volume: 0.4, extensions: ['wav'] }, // When shielded player gets hit ✅
    { folder: 'sword slash', key: 'attack_slash', maxFiles: 2, volume: 0.1, extensions: ['wav'] }, // When player attacks - very quiet
    { folder: 'woosh', key: 'jump', maxFiles: 4, volume: 0.4, extensions: ['wav'] }, // When player jumps/double jumps ✅
    { folder: 'hit', key: 'hit', maxFiles: 2, volume: 0.15, extensions: ['wav'] }, // Regular hits - very quiet  
    { folder: 'footsteps', key: 'footsteps', maxFiles: 8, volume: 0.3, extensions: ['wav'] } // Footsteps ✅
  ];
  
  const loadPromises = [];
  
  for (const category of soundCategories) {
    const basePath = `/assets/sounds/${category.folder}/`;
    const soundArray = sounds[category.key] || [];
    
    // Loading sound files...
    
    // Try to load numbered files with both extensions
    for (let i = 1; i <= category.maxFiles; i++) {
      for (const ext of category.extensions) {
        const audio = new Audio();
        const soundPath = basePath + `${i}.${ext}`;
        
        const promise = loadSingleSound(audio, soundPath)
          .then(() => {
            audio.volume = category.volume;
            soundArray.push(audio);
            // Sound loaded
            return audio;
          })
          .catch(() => {
            // File doesn't exist, skip silently
            return null;
          });
        
        loadPromises.push(promise);
      }
    }
    
    // Store the sound array
    sounds[category.key] = soundArray;
  }
  
  // Wait for all sounds to finish loading
  await Promise.all(loadPromises);
  
  // Sound loading completed
}

// Load and initialize background music
async function loadBackgroundMusic() {
  try {
    const backgroundMusic = new Audio('/assets/background music.mp3');
    backgroundMusic.volume = 0.3; // 30% volume - increased from 15% to balance with game sounds
    backgroundMusic.loop = true; // Loop forever
    backgroundMusic.preload = 'auto';
    
    // Set up event handlers
    backgroundMusic.addEventListener('canplaythrough', () => {
      // Start playing background music
      backgroundMusic.play().catch(e => {
        console.log('Background music autoplay prevented:', e);
        // Will start on first user interaction
      });
    });
    
    backgroundMusic.addEventListener('error', (e) => {
      console.warn('Background music failed to load:', e);
    });
    
    sounds.backgroundMusic = backgroundMusic;
    
  } catch (error) {
    console.warn('Could not load background music:', error);
  }
}

// Start background music on first user interaction (for browser autoplay compliance)
function startBackgroundMusicOnInteraction() {
  if (sounds.backgroundMusic && sounds.backgroundMusic.paused) {
    sounds.backgroundMusic.play().catch(e => {
      console.log('Background music play failed:', e);
    });
  }
}

// Mute/Unmute sounds with multiple states
function toggleMute() {
  // Cycle through states: UNMUTED -> MUSIC_ONLY -> ALL_MUTED -> UNMUTED
  switch (currentMuteState) {
    case MUTE_STATES.UNMUTED:
      currentMuteState = MUTE_STATES.MUSIC_ONLY;
      muteBackgroundMusicOnly();
      break;
    case MUTE_STATES.MUSIC_ONLY:
      currentMuteState = MUTE_STATES.ALL_MUTED;
      muteAllSounds();
      break;
    case MUTE_STATES.ALL_MUTED:
      currentMuteState = MUTE_STATES.UNMUTED;
      unmuteAllSounds();
      break;
  }
  
  updateMuteButton();
}

// Mute only background music
function muteBackgroundMusicOnly() {
  if (sounds.backgroundMusic) {
    previousVolumes.backgroundMusic = sounds.backgroundMusic.volume;
    sounds.backgroundMusic.volume = 0;
  }
}

// Mute all sounds
function muteAllSounds() {
  // Mute background music
  if (sounds.backgroundMusic) {
    previousVolumes.backgroundMusic = sounds.backgroundMusic.volume;
    sounds.backgroundMusic.volume = 0;
  }
  
  // Mute all sound categories
  Object.keys(sounds).forEach(key => {
    if (key !== 'backgroundMusic' && Array.isArray(sounds[key])) {
      sounds[key].forEach(audio => {
        if (audio && audio.volume !== undefined) {
          if (!previousVolumes[key]) previousVolumes[key] = [];
          previousVolumes[key].push(audio.volume);
          audio.volume = 0;
        }
      });
    }
  });
}

// Unmute all sounds
function unmuteAllSounds() {
  // Restore background music volume
  if (sounds.backgroundMusic && previousVolumes.backgroundMusic !== undefined) {
    sounds.backgroundMusic.volume = previousVolumes.backgroundMusic;
  }
  
  // Restore all sound category volumes
  Object.keys(sounds).forEach(key => {
    if (key !== 'backgroundMusic' && Array.isArray(sounds[key]) && previousVolumes[key]) {
      sounds[key].forEach((audio, index) => {
        if (audio && previousVolumes[key][index] !== undefined) {
          audio.volume = previousVolumes[key][index];
        }
      });
    }
  });
}

// RENDER.COM OPTIMIZED - Fast sound loader with aggressive caching
function loadSingleSound(audio, src) {
  return new Promise((resolve, reject) => {
    // Render.com timeout - more lenient for slower connections
    const timeout = setTimeout(() => {
      reject(new Error('Sound load timeout - render.com connection'));
    }, 4000); // 4 second timeout for render.com
    
    audio.oncanplaythrough = () => {
      clearTimeout(timeout);
      resolve(audio);
    };
    
    // Fallback - resolve on loadeddata if canplaythrough doesn't fire
    audio.onloadeddata = () => {
      clearTimeout(timeout);
      resolve(audio);
    };
    
    audio.onerror = () => {
      clearTimeout(timeout);
      reject(new Error(`Sound load failed: ${src}`));
    };
    
    // RENDER.COM OPTIMIZATIONS
    audio.preload = 'auto'; // Aggressive preloading
    audio.crossOrigin = 'anonymous'; // Enable CORS
    audio.src = src;
  });
}

// Enhanced 3D positional sound player with distance and stereo panning
function playSound(soundType, noPitchVariation = false, sourceX = null, sourceY = null) {
  // Don't play if all sounds are muted
  if (currentMuteState === MUTE_STATES.ALL_MUTED) return;
  
  // For chat, skip since we don't have chat sound
  if (soundType === 'chat') {
    return;
  }
  
  let soundArray = sounds[soundType];
  
  // Pick random sound from array
  if (!soundArray || soundArray.length === 0) {
    // No sounds available
    return;
  }
  
  const randomSound = soundArray[Math.floor(Math.random() * soundArray.length)];
  
  // Clone to allow overlapping sounds
  const sound = randomSound.cloneNode();
  
  // Add pitch variation (0.8 to 1.2 = deeper to higher) for variety
  if (!noPitchVariation) {
    sound.playbackRate = 0.8 + Math.random() * 0.4;
  }
  
  // Apply 3D positional audio if source position provided
  if (sourceX !== null && sourceY !== null && myId && players[myId]) {
    apply3DAudio(sound, sourceX, sourceY);
  }
  
  // Play with error handling
  sound.play().catch(e => console.log('Sound play failed:', soundType, e));
}

// Load custom sounds from /assets/sounds/
async function loadCustomSounds() {
  // Load sounds from folders (for variations)
  const soundFolders = [
    { folder: 'footsteps', files: ['foots.wav', 'fots.wav', 'osodos.wav', 'ots.wav', 'slice_1.wav', 'slice_2.wav', 'slice_3.wav', 'slice_4.wav'] },
    { folder: 'woosh', files: ['woosh1.mp3', 'woosh2.mp3', 'woosh3.mp3'] },
    { folder: 'hit', files: ['hit1.mp3', 'hit2.mp3', 'hit3.mp3'] }
  ];
  
  // Load folder-based sounds (with variations)
  for (const { folder, files } of soundFolders) {
    const variations = [];
    for (const filename of files) {
      const audio = new Audio(`/assets/sounds/${folder}/${filename}`);
      audio.volume = 0.6;
      
      try {
        await new Promise((resolve, reject) => {
          audio.oncanplaythrough = resolve;
          audio.onerror = reject;
          setTimeout(reject, 500);
        });
        variations.push(audio);
      } catch (e) {
        // File doesn't exist, skip
      }
    }
    
    if (variations.length > 0) {
      sounds.custom[folder] = variations; // Store as array for random selection
    }
  }
  
  // Try to load individual sound files (backwards compatibility)
  const soundFiles = [
    'whoosh.mp3', 'slash.mp3', 'impact.mp3'
  ];
  
  for (const filename of soundFiles) {
    const soundName = filename.replace(/\.\w+$/, '');
    const audio = new Audio(`/assets/sounds/${filename}`);
    audio.volume = 0.6;
    
    try {
      await new Promise((resolve, reject) => {
        audio.oncanplaythrough = resolve;
        audio.onerror = reject;
        setTimeout(reject, 500);
      });
      sounds.custom[soundName] = audio;
    } catch (e) {
      // Sound doesn't exist, skip it
    }
  }
  
  // Custom sounds loaded
}

// Play random sound with 3D positional audio support
function playRandomSound(soundName, volume = 0.6, minPitch = 0.9, maxPitch = 1.1, sourceX = null, sourceY = null) {
  // Don't play if all sounds are muted
  if (currentMuteState === MUTE_STATES.ALL_MUTED) return;
  
  // Map sound names to USER'S EXACT specifications
  const soundMapping = {
    'attack': 'attack_slash',     // sword slash folder when attacking
    'shield_hit': 'shield_block', // shield hit folder when blocked hit  
    'jump': 'jump',               // woosh folder for jumps/double jumps
    'death': 'death',             // death folder when any player dies
    'hit': 'hit',                 // hit folder for regular hits
    'footsteps': 'footsteps',     // footsteps folder
    // Legacy support
    'woosh': 'jump',
    'shield': 'shield_block'
  };
  
  const mappedSoundName = soundMapping[soundName] || soundName;
  const soundArray = sounds[mappedSoundName];
  
  if (!soundArray || soundArray.length === 0) {
    // Sound not found
    return;
  }
  
  // Pick random sound from array
  const randomSound = soundArray[Math.floor(Math.random() * soundArray.length)];
  const sound = randomSound.cloneNode();
  
  sound.volume = volume;
  sound.playbackRate = minPitch + Math.random() * (maxPitch - minPitch);
  
  // Apply 3D positional audio if source position provided
  if (sourceX !== null && sourceY !== null && myId && players[myId]) {
    apply3DAudio(sound, sourceX, sourceY);
  }
  
  sound.play().catch(e => console.log('Random sound play failed:', e));
}

// Play frame-specific sounds for animations
function playFrameSound(playerId, character, state, animationFrame) {
  // Only play frame sounds for specific states that need frame-by-frame audio
  if (state === 'attack') {
    // Play attack sound on specific frames
    if (animationFrame === 1) {
      playRandomSound('attack', 0.1, 0.9, 1.1);
    }
  } else if (state === 'hit') {
    // Play hit sound on first frame
    if (animationFrame === 0) {
      playRandomSound('hit', 0.15, 0.9, 1.1);
    }
  }
}

// Play animation-specific sounds
function playAnimationSound(state, frame, x = null, y = null) {
  // Map states to appropriate sounds
  switch (state) {
    case 'attack':
      if (frame === 0) {
        playRandomSound('attack', 0.1, 0.9, 1.1, x, y);
      }
      break;
    case 'hit':
      if (frame === 0) {
        playRandomSound('hit', 0.15, 0.9, 1.1, x, y);
      }
      break;
    case 'death':
      if (frame === 0) {
        playRandomSound('death', 0.9, 0.8, 1.0, x, y);
      }
      break;
    case 'shield':
      if (frame === 0) {
        playRandomSound('shield_hit', 0.8, 0.9, 1.1, x, y);
      }
      break;
    // Other states like 'walk', 'idle', 'air' are handled elsewhere
  }
}

// 3D POSITIONAL AUDIO SYSTEM
function apply3DAudio(sound, sourceX, sourceY) {
  const listener = players[myId];
  if (!listener) return;
  
  // Calculate distance between sound source and listener
  const dx = sourceX - listener.x;
  const dy = sourceY - listener.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // 3D Audio settings
  const maxHearingDistance = 800; // Maximum distance to hear sounds
  const minVolume = 0.05; // Minimum volume (5%)
  const maxVolume = 1.0; // Maximum volume multiplier
  
  // Calculate distance-based volume reduction
  let volumeMultiplier = 1.0;
  if (distance > 50) { // Start reducing volume after 50 pixels
    volumeMultiplier = Math.max(minVolume, 1.0 - (distance - 50) / (maxHearingDistance - 50));
  }
  
  // Apply volume reduction
  const currentVolume = sound.volume;
  sound.volume = currentVolume * volumeMultiplier;
  
  // Skip if too far away (save performance)
  if (distance > maxHearingDistance) {
    sound.volume = 0;
    return;
  }
  
  // STEREO PANNING - Create left/right audio positioning
  try {
    // Create audio context for advanced audio processing
    if (!window.audioContext) {
      window.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // Create panner node for 3D positioning
    const source = window.audioContext.createMediaElementSource(sound);
    const panner = window.audioContext.createStereoPanner();
    const gainNode = window.audioContext.createGain();
    
    // Calculate stereo pan (-1 = left, 0 = center, 1 = right)
    const screenWidth = canvas.width;
    const listenerScreenX = listener.x - camera.x;
    const sourceScreenX = sourceX - camera.x;
    const panValue = Math.max(-1, Math.min(1, (sourceScreenX - listenerScreenX) / (screenWidth * 0.5)));
    
    panner.pan.value = panValue;
    gainNode.gain.value = volumeMultiplier;
    
    // Connect audio nodes
    source.connect(panner);
    panner.connect(gainNode);
    gainNode.connect(window.audioContext.destination);
    
  } catch (e) {
    // Fallback if Web Audio API not supported
    // 3D audio not supported
  }
}

// Load random background
async function loadRandomBackground() {
  if (backgroundFiles.length === 0) {
    // Using solid color background
    backgroundLoaded = false;
    return Promise.resolve();
  }
  
  const randomIndex = Math.floor(Math.random() * backgroundFiles.length);
  const selectedBg = backgroundFiles[randomIndex];
  
  backgroundImage = new Image();
  
  return new Promise((resolve, reject) => {
    backgroundImage.onload = () => {
      backgroundLoaded = true;
      resolve();
    };
    backgroundImage.onerror = () => {
      console.error(`Failed to load background: ${selectedBg}`);
      backgroundLoaded = false;
      resolve(); // Don't reject, just continue without background
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
const respawnCountdownEl = document.getElementById('respawn-countdown');
const respawnBtn = document.getElementById('respawn-btn');
const hpBar = document.getElementById('hp-bar');
const playerNameEl = document.getElementById('player-name');
const playerCountEl = document.getElementById('player-count');
const leaderboardList = document.getElementById('leaderboard-list');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const chatSend = document.getElementById('chat-send');
const chatToggle = document.getElementById('chat-toggle');
const chatContainer = document.getElementById('chat-container');
const chatInputContainer = document.getElementById('chat-input-container');

let selectedCharacter = null;
let camera = { x: 0, y: 0, targetX: 0, targetY: 0 }; // Smooth camera with interpolation
let chatOpen = false;

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

startBtn.addEventListener('click', () => {
  startBackgroundMusicOnInteraction(); // Start background music on first interaction
  startGame();
});

// Reload hitboxes (can be called from console)
async function reloadHitboxes() {
  try {
    const response = await fetch('/hitboxes.json?t=' + Date.now()); // Cache bust
    hitboxData = await response.json();
    alert('Changes applied! Your custom settings are now active!');
  } catch (error) {
    console.error('Error applying changes:', error);
    alert('Failed to apply changes!');
  }
}

// Prevent multiple simultaneous game starts
let gameStarting = false;

// Utility function to restore form state after errors
function restoreFormState() {
  gameStarting = false;
  nameInput.disabled = false;
  characterCards.forEach(card => {
    card.style.pointerEvents = 'auto';
    card.style.opacity = '1';
  });
  startBtn.style.display = 'block';
  updateStartButton(); // Re-check if button should be enabled
}

async function startGame() {
  // Prevent multiple simultaneous starts
  if (gameStarting) {
    return;
  }
  
  gameStarting = true;
  
  // Comprehensive input validation
  const playerName = nameInput.value.trim();
  if (!playerName) {
    alert('Please enter a warrior name!');
    gameStarting = false;
    return;
  }
  
  if (playerName.length < 2) {
    alert('Warrior name must be at least 2 characters long!');
    gameStarting = false;
    return;
  }
  
  if (playerName.length > 20) {
    alert('Warrior name must be 20 characters or less!');
    gameStarting = false;
    return;
  }
  
  if (!selectedCharacter) {
    alert('Please select a character!');
    gameStarting = false;
    return;
  }
  
  // Disable all inputs to prevent changes during loading
  nameInput.disabled = true;
  characterCards.forEach(card => {
    card.style.pointerEvents = 'none';
    card.style.opacity = '0.6';
  });
  
  // Hide play button immediately and show loading state
  startBtn.style.display = 'none';
  
  // Create enhanced loading message
  const connectingMessage = document.createElement('div');
  connectingMessage.className = 'connecting-message';
  connectingMessage.innerHTML = '<span class="loading-spinner"></span>Initializing battle systems...';
  connectingMessage.style.width = '100%';
  connectingMessage.style.textAlign = 'center';
  connectingMessage.style.padding = '18px';
  connectingMessage.style.background = 'linear-gradient(135deg, #8b4513 0%, #a0522d 100%)';
  connectingMessage.style.border = '3px solid #8b4513';
  connectingMessage.style.borderRadius = '8px';
  connectingMessage.style.color = '#f4e4c1';
  connectingMessage.style.fontSize = '24px';
  connectingMessage.style.fontWeight = '900';
  connectingMessage.style.fontFamily = '\'Cinzel\', serif';
  startBtn.parentNode.appendChild(connectingMessage);
  
  myName = nameInput.value.trim();
  myCharacter = selectedCharacter;
  
  // Load hitbox data
  try {
    const response = await fetch('/hitboxes.json');
    hitboxData = await response.json();
  } catch (error) {
    console.error('Error loading hitbox data:', error);
  }
  
  // Show loading screen with progress bar
  connectingMessage.innerHTML = `
    <div style="text-align: center;">
      <div class="loading-spinner" style="margin-bottom: 15px;"></div>
      <div class="loading-progress-text" style="color: #f4e4c1; font-size: 18px; margin-bottom: 10px;">Preparing battle arena...</div>
      <div class="loading-progress-bar" style="width: 300px; height: 8px; background: rgba(139,69,19,0.3); border-radius: 4px; margin: 0 auto; overflow: hidden;">
        <div class="loading-progress-fill" style="height: 100%; width: 0%; background: linear-gradient(90deg, #daa520, #cd7f32); transition: width 0.3s ease; border-radius: 4px;"></div>
      </div>
      <div style="color: #8b4513; font-size: 14px; margin-top: 8px;">Loading knight animations with optimized system...</div>
    </div>
  `;
  
  // Load sprite sheets with new optimized system
  try {
    await loadSpriteSheets();
    
    // Final loading message
    document.querySelector('.loading-progress-text').textContent = 'Entering battle arena...';
    
    // Small delay to show completion
    await new Promise(resolve => setTimeout(resolve, 500));
    
  } catch (error) {
    console.error('Critical error loading sprites:', error);
    alert('Failed to load game assets. Please check your connection and try again.');
    
    // Restore form state on error
    restoreFormState();
    connectingMessage.remove();
    return;
  }
  
  // Load emojis (optional)
  try {
    await loadEmojiImages();
  } catch (error) {
    console.warn('Could not load emoji images:', error);
  }
  
  // Load optimized numbered sounds (1.wav, 2.wav, 3.wav...)
  try {
    document.querySelector('.loading-progress-text').textContent = 'Loading sound effects...';
    await loadSounds();
  } catch (error) {
    console.warn('Could not load some sounds:', error);
  }
  
  // Load and start background music
  try {
    await loadBackgroundMusic();
  } catch (error) {
    console.warn('Could not load background music:', error);
  }
  
  // Skip old custom sound loading - all sounds now use numbered system
  
  // Load random background
  try {
    await loadRandomBackground();
  } catch (error) {
    console.warn('Could not load background:', error);
  }
  
  // Connect to server
  socket = io();
  
  // Handle name already exists error
  socket.on('nameExists', (data) => {
    alert(`${data.message}\n\nPlease choose a different warrior name.`);
    
    // Restore form state
    restoreFormState();
    connectingMessage.remove();
    
    // Disconnect the socket
    socket.disconnect();
  });
  
  socket.on('connect', () => {
    socket.emit('joinGame', { name: myName, character: myCharacter });
  });
  
  socket.on('welcome', async (data) => {
    myId = data.id;
    data.players.forEach(p => {
      players[p.id] = p;
    });
    
    characterSelect.style.display = 'none';
    gameContainer.style.display = 'block';
    playerNameEl.textContent = myName;
    
    // Initialize atmospheric effects
    initDustParticles();
    initSnowParticles();
    
    // Load tree assets and initialize trees
    await loadTreeImages();
    initTrees();
    initSnowHills();

    initShopUI();
    loadShopAssets();
    
    requestAnimationFrame(gameLoop);
  });
  
  socket.on('playerJoined', (data) => {
    players[data.player.id] = data.player;
  });
  
  // Listen for corpse fade out (disconnected players)
  socket.on('corpseFadeOut', (data) => {
    const player = players[data.id];
    if (player) {
      player.isFading = true;
      player.fadeAlpha = 1.0; // Start fully visible
    }
  });
  
  socket.on('playerLeft', (data) => {
    delete players[data.id];
  });
  
  socket.on('state', (state) => {
    state.players.forEach(sp => {
      const oldFrame = players[sp.id]?.animationFrame;
      const oldState = players[sp.id]?.state;
      const existingPlayer = players[sp.id];
      
      // If player is dying on client (even if animation complete), DON'T override their death state
      if (existingPlayer && existingPlayer.isDying) {
        existingPlayer.x = sp.x;
        existingPlayer.y = sp.y;
        existingPlayer.hp = sp.hp;
        existingPlayer.kills = sp.kills;
        existingPlayer.invincible = sp.invincible;
        existingPlayer.invincibleTime = sp.invincibleTime;
        existingPlayer.alive = sp.alive;
        existingPlayer.facingRight = sp.facingRight;
        return; 
      }
      
      if (players[sp.id]) {
        const previousFrame = players[sp.id].animationFrame;
        
        if (sp.state === 'attack' && oldState === 'attack') {
          if (sp.animationFrame > previousFrame + 1) {
            sp.animationFrame = previousFrame + 1;
          }
        }
        
        Object.assign(players[sp.id], sp);
      } else {
        players[sp.id] = sp;
      }
      
      const trackingKey = `${sp.id}_${sp.state}`;
      const lastHighest = highestFrameSeen[trackingKey] || 0;
        
      if (sp.animationFrame < lastHighest) {
        Object.keys(lastPlayedFrame).forEach(key => {
          if (key.startsWith(`${sp.id}_${sp.state}_`)) {
            delete lastPlayedFrame[key];
          }
        });
        highestFrameSeen[trackingKey] = sp.animationFrame;
      } else {
        highestFrameSeen[trackingKey] = Math.max(lastHighest, sp.animationFrame);
      }
      
      if (oldState !== sp.state) {
        const trackingKey = `${sp.id}_${sp.state}`;
        Object.keys(lastPlayedFrame).forEach(key => {
          if (key.startsWith(`${sp.id}_`)) {
            delete lastPlayedFrame[key];
          }
        });
        delete highestFrameSeen[trackingKey];
        
        if (sp.state === 'air' && oldState !== 'air') {
          const jumpPlayer = players[sp.id];
          playRandomSound('jump', 0.5, 0.9, 1.3, jumpPlayer?.x, jumpPlayer?.y);
        }
        
        playAnimationSound(sp.state, 0, sp.x, sp.y);
      }
      
      if ((oldFrame !== sp.animationFrame || oldState !== sp.state) && 
          (sp.state !== 'attack' || !lastPlayedFrame[`${sp.id}_${sp.state}_${sp.animationFrame}`])) {
        playFrameSound(sp.id, sp.character, sp.state, sp.animationFrame);
      }
      
      if (sp.state === 'walk' && oldFrame !== sp.animationFrame) {
        if (sp.animationFrame % 4 === 0) {
          playRandomSound('footsteps', 0.4, 0.9, 1.1, sp.x, sp.y);
        }
      }
    });
    
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

    updateShopUI();
  });
  
  // Listen for hit events to create effects
  socket.on('playerHit', (data) => {
    if (data.blocked) {
      const targetPlayer = players[data.targetId];
      playRandomSound('shield_hit', 0.4, 1.2, 1.5, targetPlayer?.x, targetPlayer?.y);
      
      if (data.targetId === myId) {
        screenShake.intensity = 5;
        flashEffect.alpha = 0.1; 
      } else if (data.attackerId === myId) {
        screenShake.intensity = 3;
      }
      
      createShieldBlockParticles(targetPlayer.x, targetPlayer.y - 20, 15);
    } else {
      const hitTarget = players[data.targetId];
      playSound('hurt', false, hitTarget?.x, hitTarget?.y);
      playRandomSound('hit', 0.3, 0.9, 1.2, hitTarget?.x, hitTarget?.y);
      
      if (data.targetId === myId) {
        screenShake.intensity = 15;
        flashEffect.alpha = 0.4;
      } else if (data.attackerId === myId) {
        screenShake.intensity = 8;
      }
      
      createImpactParticles(hitTarget.x, hitTarget.y - 20, 20);
    }
  });
  
  // Listen for shield block events
  socket.on('shieldBlock', (data) => {
    const defender = players[data.defenderId];
    if (defender) {
      createShieldBlockParticles(data.x, data.y - 20, 20);
      
      shakeScreen(8, 0.2);
    }
  });

  socket.on('shieldRecoil', (data) => {
    const attacker = players[data.attackerId];
    if (attacker) {
      createShieldBlockParticles(attacker.x, attacker.y - 20, 12);
    }

    if (data.attackerId === myId) {
      screenShake.intensity = 12;
      flashEffect.alpha = 0.2;
    }
  });

  socket.on('fallDamage', (data) => {
    const p = players[data.id];
    if (p) {
      createImpactParticles(data.x, data.y - 20, 18);
      playRandomSound('hit', 0.25, 0.8, 1.1, data.x, data.y);
    }

    if (data.id === myId) {
      screenShake.intensity = 14;
      flashEffect.alpha = 0.35;
    }
  });

  socket.on('shopUpdate', (data) => {
    const p = players[data.id];
    if (p) {
      if (data.ownedItems) p.ownedItems = data.ownedItems;
      if (typeof data.kills === 'number') p.kills = data.kills;
      if (typeof data.speedMultiplier === 'number') p.speedMultiplier = data.speedMultiplier;
      if (typeof data.damageBonus === 'number') p.damageBonus = data.damageBonus;
    }
    updateShopUI();
  });

  socket.on('purchaseResult', (data) => {
    if (!data || !shopUI.status) return;
    if (data.ok) {
      shopUI.status.textContent = 'Purchased!';
    } else {
      const reason = data.reason || 'failed';
      if (reason === 'not_enough_kills') shopUI.status.textContent = 'Not enough kills.';
      else if (reason === 'already_owned') shopUI.status.textContent = 'Already owned.';
      else shopUI.status.textContent = 'Purchase failed.';
    }
    updateShopUI();
  });
  
  // Listen for corpse hit events to create blood
  socket.on('corpseHit', (data) => {
    playRandomSound('hit', 0.3, 0.9, 1.2, data.x, data.y);
    
    createDeathParticles(data.x, data.y, 15); 
    screenShake.intensity = 5;
  });
  
  socket.on('playerDied', (data) => {
    const deadPlayer = players[data.id];
    const killer = players[data.killer];
    
    if (deadPlayer) {
      deadPlayer.state = data.deathType || 'death_front';
      deadPlayer.animationFrame = 0;
      deadPlayer.animationTime = 0;
      deadPlayer.isDying = true; 
      deadPlayer.deathAnimationComplete = false; 
      
      if (data.id === myId) {
        currentInput.left = false;
        currentInput.right = false;
        currentInput.attack = false;
        currentInput.jump = false;
        
        // Show death screen with gloomy overlay
        deathScreen.style.display = 'flex';
        killerNameEl.textContent = killer?.name || 'Unknown';
        respawnBtn.disabled = true;
        respawnBtn.style.opacity = '0.5';
        respawnBtn.style.cursor = 'not-allowed';
        
        // Random countdown 3-7 seconds
        let countdown = Math.floor(3 + Math.random() * 5); // 3-7 seconds
        respawnCountdownEl.textContent = countdown;
        const countdownInterval = setInterval(() => {
          countdown--;
          respawnCountdownEl.textContent = Math.max(0, countdown);
          if (countdown <= 0) {
            clearInterval(countdownInterval);
          }
        }, 1000);
      }
      
      // Play death hurt sound with 3D positioning
      playSound('hurt', false, deadPlayer?.x, deadPlayer?.y);
      
      // Create death explosion particles
      createDeathParticles(deadPlayer.x, deadPlayer.y, 40);
      screenShake.intensity = 25;
      flashEffect.alpha = 0.6;
    }
    
    // Show kill message - EVERYONE SEES IT
    if (killer && deadPlayer) {
      console.log('⚔️ Creating kill message!');
      const killMsg = document.createElement('div');
      killMsg.className = 'kill-message';
      
      // Personalized messages based on involvement
      if (data.id === myId) {
        // You died
        killMsg.innerHTML = `<span style="color: #ff4444;">☠️ You were slain by <span style="color: #daa520;">${killer.name}</span></span>`;
        console.log('⚔️ You died message');
      } else if (data.killer === myId) {
        // You killed someone
        killMsg.innerHTML = `<span style="color: #44ff44;">⚔️ You slew <span style="color: #daa520;">${deadPlayer.name}</span>!</span>`;
        console.log('⚔️ You killed message');
      } else {
        // Someone else killed someone else - EVERYONE SEES THIS
        killMsg.innerHTML = `<span style="color: #f4e4c1;">⚔️ <span style="color: #daa520;">${killer.name}</span> slew <span style="color: #daa520;">${deadPlayer.name}</span></span>`;
        console.log('⚔️ Kill message (spectator view)');
      }
      
      console.log('⚔️ Appending to chat:', chatMessages);
      chatMessages.appendChild(killMsg);
      chatMessages.scrollTop = chatMessages.scrollHeight;
      console.log('⚔️ Kill message added!');
      
      // Remove after 8 seconds (longer so people can see)
      setTimeout(() => killMsg.remove(), 8000);
    } else {
      console.log('⚠️ No kill message - killer or deadPlayer missing');
    }
    
  });
  
  socket.on('canRespawn', (data) => {
    if (data.id === myId) {
      // Enable respawn button
      respawnBtn.disabled = false;
      respawnBtn.style.opacity = '1';
      respawnBtn.style.cursor = 'pointer';
      respawnTimerEl.textContent = 'You may now respawn';
    }
  });
  
  socket.on('playerRespawned', (data) => {
    // Player respawned - hide death screen if it's me
    if (data.id === myId) {
      deathScreen.style.display = 'none';
      
      // Reset input state to prevent stuck controls
      currentInput.left = false;
      currentInput.right = false;
      currentInput.attack = false;
      currentInput.jump = false;
    }
    
    // Clear death flags for respawned player
    if (players[data.id]) {
      players[data.id].isDying = false;
      players[data.id].deathAnimationComplete = false;
      players[data.id].isCorpse = false;
      console.log(`✨ ${players[data.id].name} respawned!`);
    }
  });
  
  // Respawn button click
  respawnBtn.addEventListener('click', () => {
    if (!respawnBtn.disabled) {
      currentInput.respawn = true;
    }
  });
  
  // Chat messages
  socket.on('chatMessage', (data) => {
    // Play chat sound (no pitch variation)
    playSound('chat');
    
    addChatMessage(data.name, data.message, data.id === myId);

    setPlayerChatBubble(data.id, data.message);
  });
  
  // Emoji events
  socket.on('emoji', (data) => {
    spawnEmoji(data.playerId, data.emojiNumber);
  });
  
  // Double jump event - create motion trail effect + WOOSH sound
  socket.on('playerDoubleJump', (data) => {
    // WOOSH sounds for jumps and double jumps with 3D positioning
    const jumpPlayer = players[data.id];
    playRandomSound('jump', 0.5, 0.9, 1.3, jumpPlayer?.x, jumpPlayer?.y);
    
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
  
  // Shield slam events removed - shield is now just defensive hold
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

function setPlayerChatBubble(playerId, message) {
  const p = players[playerId];
  if (!p) return;

  const text = String(message || '').trim();
  if (!text) {
    p.chatBubble = null;
    return;
  }

  p.chatBubble = {
    text,
    life: CHAT_BUBBLE_DURATION,
    maxLife: CHAT_BUBBLE_DURATION
  };
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
    const message = chatInput.value.trim();
    if (message) {
      // Has text → Send it
      sendChatMessage();
      closeChat(); // Blur cursor after sending
    } else {
      // Empty → Close chat (blur cursor)
      closeChat();
    }
    e.preventDefault();
  }
  if (e.key === 'Escape') {
    closeChat();
  }
});

// Chat toggle button
chatToggle.addEventListener('click', () => {
  chatContainer.classList.toggle('collapsed');
  if (chatContainer.classList.contains('collapsed')) {
    chatToggle.textContent = '▶ Chat';
  } else {
    chatToggle.textContent = '▼ Chat';
  }
});

// Enter key to open/close chat
document.addEventListener('keydown', (e) => {
  // Don't interfere with name input or if in dev mode
  if (document.activeElement === nameInput || document.getElementById('dev-panel').style.display !== 'none') {
    return;
  }
  
  if (e.key === 'Enter') {
    // If chat is not open, open it
    if (!chatOpen) {
      openChat();
      e.preventDefault();
    }
    // If chat is open, handled by chatInput keydown listener
  }
});

function openChat() {
  chatOpen = true;
  currentInput.left = false;
  currentInput.right = false;
  currentInput.attack = false;
  currentInput.jump = false;
  currentInput.shield = false;
  chatInput.focus(); // Focus = cursor appears |
  chatInput.select(); // Select any existing text
}

function closeChat() {
  chatOpen = false;
  currentInput.left = false;
  currentInput.right = false;
  currentInput.attack = false;
  currentInput.jump = false;
  currentInput.shield = false;
  chatInput.blur(); // Blur = cursor disappears
  canvas.focus();
}

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
  // Create LOTS of small blood particles for realistic effect
  for (let i = 0; i < count * 2; i++) { // Double the count
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 400 + 100;
    particles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 150, // Slight upward bias
      life: 1.5 + Math.random() * 0.5,
      maxLife: 2.0,
      size: Math.random() * 2 + 1, // Small particles (1-3 pixels)
      color: Math.random() > 0.3 ? '#dc143c' : '#8B0000' // Mostly bright red
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

function createShieldBlockParticles(x, y, count) {
  // Blue sparks for shield block effect
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 300 + 100;
    particles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 100,
      life: 0.8 + Math.random() * 0.4,
      maxLife: 1.2,
      size: Math.random() * 3 + 2, // Bigger sparks
      color: Math.random() > 0.5 ? '#3b82f6' : '#60a5fa' // Blue sparks
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

  // Update Santa Hat movement trails
  for (let i = santaMotionTrails.length - 1; i >= 0; i--) {
    const trail = santaMotionTrails[i];
    trail.life -= dt;
    if (trail.life <= 0) {
      santaMotionTrails.splice(i, 1);
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

  // Update HEAVY SNOW particles - so much snow!!!
  for (let i = 0; i < snowParticles.length; i++) {
    const snow = snowParticles[i];
    
    // Update wobble for natural swaying motion
    snow.wobble += snow.wobbleSpeed * dt;
    const wobbleX = Math.sin(snow.wobble) * 35; // EXTREME swaying
    
    // Update position with wobble effect
    snow.x += (snow.vx + wobbleX) * dt;
    snow.y += snow.vy * dt;
    snow.life += dt * 0.5;
    
    // Wrap around horizontally and respawn at top when falling off screen
    if (snow.x < 0) snow.x = GAME_WIDTH;
    if (snow.x > GAME_WIDTH) snow.x = 0;
    if (snow.y > GAME_HEIGHT) {
      // Respawn at random position above screen
      snow.y = -100;
      snow.x = Math.random() * GAME_WIDTH;
      snow.vx = (Math.random() - 0.5) * 40;
      snow.vy = Math.random() * 250 + 150;
    }
    
    // Faster twinkling effect
    snow.opacity = 0.7 + Math.sin(snow.life * 8) * 0.3;
  }
}

function updateChatBubbles(dt) {
  for (const id in players) {
    const p = players[id];
    if (!p || !p.chatBubble) continue;

    p.chatBubble.life -= dt;
    if (p.chatBubble.life <= 0) {
      p.chatBubble = null;
    }
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

// Draw HEAVY SNOW on top of everything - so much snow!!!
function drawSnow() {
  ctx.save();
  
  // Don't apply pixelation to snow for smoother, more realistic snowflakes
  ctx.imageSmoothingEnabled = true;
  
  // Apply parallax effect - snow moves slower than camera for depth (like background)
  const parallaxX = camera.x * 0.15; // Slightly less parallax than background
  const parallaxY = camera.y * 0.1;  // Slightly less parallax than background
  
  snowParticles.forEach(snow => {
    ctx.globalAlpha = snow.opacity;
    
    // Draw snowflake as a small white circle with subtle glow
    const x = (snow.x - parallaxX) / PIXEL_SCALE;
    const y = (snow.y - parallaxY) / PIXEL_SCALE;
    const size = snow.size / PIXEL_SCALE;
    
    // Add subtle glow effect for larger snowflakes
    if (size > 2) {
      const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, size * 2.5);
      glowGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      glowGradient.addColorStop(0.5, 'rgba(240, 248, 255, 0.5)');
      glowGradient.addColorStop(1, 'rgba(220, 240, 255, 0)');
      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(x, y, size * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Main snowflake
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  });
  
  ctx.restore();
}

// =============================================================================
// EMOJI SYSTEM
// =============================================================================

// Load tree images
async function loadTreeImages() {
  const treeImage = new Image();
  treeImage.src = '/assets/trees/tree.png';
  
  return new Promise((resolve) => {
    treeImage.onload = () => {
      treeImages.push(treeImage);
      console.log('Tree asset loaded successfully - dimensions:', treeImage.width, 'x', treeImage.height);
      resolve();
    };
    treeImage.onerror = () => {
      console.log('Failed to load tree asset - check path: /assets/trees/tree.png');
      resolve();
    };
  });
}

// Initialize snow hills
function initSnowHills() {
  snowHills = [];
  
  // Create snow hills all over the level with varied sizes
  const totalHills = 25;
  for (let i = 0; i < totalHills; i++) {
    // Random position across the map width
    const x = Math.random() * GAME_WIDTH * 1.5 - GAME_WIDTH * 0.25;
    
    // Random size - some small, some big
    const sizeVariation = Math.random();
    let width, height;
    
    if (sizeVariation < 0.4) {
      // Small hills
      width = 100 + Math.random() * 150;
      height = 40 + Math.random() * 60;
    } else if (sizeVariation < 0.8) {
      // Medium hills
      width = 200 + Math.random() * 200;
      height = 80 + Math.random() * 80;
    } else {
      // Big hills
      width = 300 + Math.random() * 300;
      height = 120 + Math.random() * 120;
    }
    
    // Position hills to touch ground line exactly
    const y = GROUND_Y - height; // Hills touch ground line
    
    // Random parallax for depth
    const parallax = 0.01 + Math.random() * 0.03; // Very slow parallax for background
    
    snowHills.push({
      x: x,
      y: y,
      width: width,
      height: height,
      parallax: parallax,
      opacity: 0.6 + Math.random() * 0.3 // 0.6 to 0.9 opacity
    });
  }
}

// Initialize parallax trees
function initTrees() {
  trees = [];
  
  // Create trees all on collision line (red line) with varied sizes
  const totalTrees = 40; // Increased from 20 to 40
  for (let i = 0; i < totalTrees; i++) {
    let x;
    
    // Bundle more trees around center while keeping some scattered
    if (i < totalTrees * 0.6) {
      // 60% of trees bundled around center
      x = GAME_WIDTH/2 + (Math.random() - 0.5) * GAME_WIDTH * 0.8;
    } else {
      // 40% scattered across entire map
      x = Math.random() * GAME_WIDTH;
    }
    
    // Random size - some small, some HUGE
    const sizeVariation = Math.random();
    let width, height;
    
    if (sizeVariation < 0.3) {
      // Small trees
      width = 60 + Math.random() * 40;
      height = 80 + Math.random() * 60;
    } else if (sizeVariation < 0.7) {
      // Medium trees
      width = 120 + Math.random() * 80;
      height = 160 + Math.random() * 120;
    } else {
      // HUGE trees
      width = 200 + Math.random() * 150;
      height = 300 + Math.random() * 200;
    }
    
    // Position tree so bottom edge touches ground line exactly
    const y = GROUND_Y - height;
    
    // Random depth - ensure more trees in front layer
    let layer, parallax, opacity;
    const depthRandom = Math.random();
    
    if (depthRandom < 0.3) {
      // Behind character
      layer = 'background';
      parallax = 0.02; // Much slower
      opacity = 0.7;
    } else if (depthRandom < 0.5) {
      // Mid depth
      layer = 'midground';
      parallax = 0.05; // Much slower
      opacity = 0.85;
    } else {
      // In front of character - 50% of trees now in front!
      layer = 'foreground';
      parallax = 0.08; // Much slower
      opacity = 1.0;
    }
    
    trees.push({
      x: x,
      y: y,
      layer: layer,
      width: width,
      height: height,
      parallax: parallax,
      opacity: opacity
    });
  }
}

// Load emoji images
async function loadEmojiImages() {
  const emojiPromises = [];
  
  // Load emojis for all characters (using same emojis for all)
  for (let i = 1; i <= EMOJI_COUNT; i++) {
    const img = new Image();
    img.src = `/assets/emojis/${i}.png`; // Assuming .png format
    
    // Store the image in all character slots
    for (const char of Object.keys(emojiImages)) {
      emojiImages[char][i] = img;
    }
    
    // Create a promise for this image load
    const loadPromise = new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = () => {
        console.warn(`Failed to load emoji ${i}.png`);
        resolve();
      };
    });
    
    emojiPromises.push(loadPromise);
  }
  
  await Promise.all(emojiPromises);
  console.log(`Loaded ${EMOJI_COUNT} emojis`);
  return emojiImages;
}

// Spawn emoji above player
function spawnEmoji(playerId, emojiNumber) {
  const player = players[playerId];
  if (!player || !player.character || emojiNumber < 1 || emojiNumber > EMOJI_COUNT) return;
  
  const emojiImg = emojiImages[player.character]?.[emojiNumber];
  if (!emojiImg || !emojiImg.complete || emojiImg.naturalWidth === 0) {
    console.warn(`Emoji ${emojiNumber} not loaded`);
    return;
  }
  
  // Remove any existing emoji for this player
  const existingIndex = activeEmojis.findIndex(e => e.playerId === playerId);
  if (existingIndex !== -1) {
    activeEmojis.splice(existingIndex, 1);
  }
  
  // Add new emoji
  activeEmojis.push({
    playerId: playerId,
    character: player.character,
    number: emojiNumber,
    img: emojiImg,
    life: 2.5, // 2.5 seconds lifetime
    maxLife: 2.5,
    x: player.x,
    y: player.y - 80, // Position above player
    scale: 1.5, // Slightly larger size
    startTime: Date.now()
  });
  
  // Play a sound effect when emoji appears
  playSound('jump', 0.3);
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

// Draw snow hills
function drawSnowHills() {
  ctx.save();
  
  // Apply parallax effect for snow hills
  snowHills.forEach(hill => {
    const parallaxX = camera.x * hill.parallax;
    const parallaxY = 0; // No vertical parallax for hills
    
    // Calculate screen position
    const screenX = (hill.x - parallaxX) / PIXEL_SCALE;
    const screenY = hill.y / PIXEL_SCALE;
    const scaledWidth = hill.width / PIXEL_SCALE;
    const scaledHeight = hill.height / PIXEL_SCALE;
    
    // Draw snow hill as white/gray curved shape
    const hillGradient = ctx.createLinearGradient(screenX, screenY, screenX, screenY + scaledHeight);
    hillGradient.addColorStop(0, '#ffffff'); // White at top
    hillGradient.addColorStop(0.7, '#e8f4f8'); // Light blue
    hillGradient.addColorStop(1, '#d0e8f0'); // Slightly darker blue
    
    ctx.fillStyle = hillGradient;
    
    // Draw hill as rounded rectangle (hill shape)
    ctx.beginPath();
    ctx.moveTo(screenX, screenY + scaledHeight);
    ctx.quadraticCurveTo(screenX + scaledWidth * 0.25, screenY + scaledHeight * 0.3, screenX + scaledWidth * 0.5, screenY);
    ctx.quadraticCurveTo(screenX + scaledWidth * 0.75, screenY + scaledHeight * 0.3, screenX + scaledWidth, screenY + scaledHeight);
    ctx.closePath();
    ctx.fill();
  });
  
  ctx.restore();
}

// Draw parallax trees
function drawTrees() {
  if (treeImages.length === 0) return;
  
  const treeImage = treeImages[0];
  
  // Sort trees by layer (background to foreground)
  const sortedTrees = [...trees].sort((a, b) => {
    const layerOrder = { background: 0, midground: 1, foreground: 2 };
    return layerOrder[a.layer] - layerOrder[b.layer];
  });
  
  sortedTrees.forEach(tree => {
    ctx.save();
    
    // Apply parallax effect for trees - only horizontal, no vertical parallax
    const parallaxX = camera.x * tree.parallax;
    const parallaxY = 0; // NO vertical parallax so trees stay on ground
    
    // Calculate screen position with parallax
    const screenX = (tree.x - parallaxX) / PIXEL_SCALE;
    const screenY = tree.y / PIXEL_SCALE; // No vertical parallax
    const scaledWidth = tree.width / PIXEL_SCALE;
    const scaledHeight = tree.height / PIXEL_SCALE;
    
    // Apply individual tree opacity
    ctx.globalAlpha = tree.opacity;
    
    // Draw tree OR fallback rectangle
    if (treeImage && treeImage.complete && treeImage.naturalWidth > 0) {
      ctx.drawImage(treeImage, screenX, screenY, scaledWidth, scaledHeight);
    } else {
      // Fallback: draw colored rectangle to show tree position
      const colors = {
        background: 'rgba(100, 100, 200, 0.5)',
        midground: 'rgba(100, 200, 100, 0.5)',
        foreground: 'rgba(200, 100, 100, 0.5)'
      };
      ctx.fillStyle = colors[tree.layer] || 'rgba(150, 150, 150, 0.5)';
      ctx.fillRect(screenX, screenY, scaledWidth, scaledHeight);
      
      // Draw border to make it more visible
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.strokeRect(screenX, screenY, scaledWidth, scaledHeight);
    }
    
    ctx.restore();
  });
}

// Draw emojis
function drawEmojis() {
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  
  activeEmojis.forEach(emoji => {
    const player = players[emoji.playerId];
    if (!player || !emoji.img || !emoji.img.complete || emoji.img.naturalWidth === 0) return;

    const charData = hitboxData[player.character];
    const animData = charData?.animations?.[player.state];
    const wrappedFrame = player.animationFrame % (animData?.frames || 1);
    const nameHitboxScale = (charData?.gameScale || 1.0) / PIXEL_SCALE;

    const x = player.x / PIXEL_SCALE;
    const y = player.y / PIXEL_SCALE;

    const frameBodyHitboxes = animData?.bodyHitboxes?.filter(hb => hb.frame === wrappedFrame) || [];
    let hitboxTop;
    if (frameBodyHitboxes.length > 0) {
      const topY = Math.min(...frameBodyHitboxes.map(hb => hb.y));
      hitboxTop = y + topY * nameHitboxScale;
    } else if (animData?.bodyHitbox) {
      hitboxTop = y + animData.bodyHitbox.y * nameHitboxScale;
    } else {
      hitboxTop = y - 40 / PIXEL_SCALE;
    }

    const frames = spriteSheets[player.character]?.[player.state];
    const frame = frames && frames.length > 0 ? frames[player.animationFrame % frames.length] : null;
    const gameScale = (charData?.gameScale || 1.0) / PIXEL_SCALE;
    const width = frame ? frame.width * gameScale : 120 / PIXEL_SCALE;
    const fontSize = Math.max(6, width * 0.1);
    const nameY = hitboxTop - 8;

    const size = 24;
    const scale = 1.0 + (Math.sin(Date.now() * 0.002) * 0.1);

    const fadeIn = Math.min(1, (2.5 - emoji.life) * 2);
    const fadeOut = Math.min(1, emoji.life * 2);
    const alpha = Math.min(fadeIn, fadeOut);

    const floatOffset = Math.sin(Date.now() * 0.002) * 5;
    const emojiX = x;
    const emojiY = nameY - (fontSize * 1.4) + floatOffset;
    
    ctx.save();
    ctx.globalAlpha = alpha * 0.9;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    ctx.drawImage(
      emoji.img,
      emojiX - (size * scale) / 2,
      emojiY - (size * scale) / 2,
      size * scale,
      size * scale
    );

    ctx.restore();
  });
    
  ctx.restore();
}

function drawChatBubbles() {
  ctx.save();
  ctx.imageSmoothingEnabled = true;

  for (const id in players) {
    const p = players[id];
    if (!p || !p.chatBubble || !p.chatBubble.text) continue;
    if ((p.hp <= 0 || p.alive === false) && !p.isDying) continue;

    const charData = hitboxData[p.character];
    const animData = charData?.animations?.[p.state];
    const wrappedFrame = p.animationFrame % (animData?.frames || 1);
    const nameHitboxScale = (charData?.gameScale || 1.0) / PIXEL_SCALE;

    const x = p.x / PIXEL_SCALE;
    const y = p.y / PIXEL_SCALE;

    const frameBodyHitboxes = animData?.bodyHitboxes?.filter(hb => hb.frame === wrappedFrame) || [];
    let hitboxTop;
    if (frameBodyHitboxes.length > 0) {
      const topY = Math.min(...frameBodyHitboxes.map(hb => hb.y));
      hitboxTop = y + topY * nameHitboxScale;
    } else if (animData?.bodyHitbox) {
      hitboxTop = y + animData.bodyHitbox.y * nameHitboxScale;
    } else {
      hitboxTop = y - 40 / PIXEL_SCALE;
    }

    const frames = spriteSheets[p.character]?.[p.state];
    const frame = frames && frames.length > 0 ? frames[p.animationFrame % frames.length] : null;
    const gameScale = (charData?.gameScale || 1.0) / PIXEL_SCALE;
    const width = frame ? frame.width * gameScale : 120 / PIXEL_SCALE;
    const fontSize = Math.max(5, width * 0.08);
    const nameY = hitboxTop - 8;

    const fadeIn = Math.min(1, (p.chatBubble.maxLife - p.chatBubble.life) * 4);
    const fadeOut = Math.min(1, p.chatBubble.life * 2);
    const alpha = Math.min(fadeIn, fadeOut);

    let text = p.chatBubble.text;
    if (text.length > 48) text = text.slice(0, 47) + '…';

    ctx.font = `${fontSize}px MedievalSharp, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const paddingX = Math.max(4, fontSize * 0.4);
    const paddingY = Math.max(3, fontSize * 0.25);
    const textWidth = ctx.measureText(text).width;
    const bubbleWidth = textWidth + paddingX * 2;
    const bubbleHeight = fontSize + paddingY * 2;
    const bubbleX = x - bubbleWidth / 2;
    const bubbleY = nameY - bubbleHeight - (fontSize * 0.9);

    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(26, 15, 10, 0.85)';
    ctx.strokeStyle = 'rgba(218, 165, 32, 0.9)';
    ctx.lineWidth = Math.max(1, fontSize * 0.1);

    const r = Math.max(4, fontSize * 0.5);
    ctx.beginPath();
    ctx.moveTo(bubbleX + r, bubbleY);
    ctx.lineTo(bubbleX + bubbleWidth - r, bubbleY);
    ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY, bubbleX + bubbleWidth, bubbleY + r);
    ctx.lineTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight - r);
    ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight, bubbleX + bubbleWidth - r, bubbleY + bubbleHeight);
    ctx.lineTo(bubbleX + r, bubbleY + bubbleHeight);
    ctx.quadraticCurveTo(bubbleX, bubbleY + bubbleHeight, bubbleX, bubbleY + bubbleHeight - r);
    ctx.lineTo(bubbleX, bubbleY + r);
    ctx.quadraticCurveTo(bubbleX, bubbleY, bubbleX + r, bubbleY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f4e4c1';
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = Math.max(1, fontSize * 0.12);
    ctx.strokeText(text, x, bubbleY + bubbleHeight / 2);
    ctx.fillText(text, x, bubbleY + bubbleHeight / 2);
  }

  ctx.restore();
}

// Sprite name patterns
const spritePatterns = {
  knight: {
    idle: 'idle',
    walk: 'run',
    attack: 'attack',
    powerup: 'idle',
    shield: 'shield'
  },
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
  knight: {
    air: '1',
    land: '2'
  },
  spartan: {
    air: 'air',
    land: 'land'
  },
  warrior: {
    air: 'air',
    land: 'land'
  }
};

// Preloading system with progress tracking
let loadingProgress = { loaded: 0, total: 0, currentAnimation: '' };
let preloadCompleted = false;

// Optimized sprite loading using new 1.png, 2.png... pattern
async function loadSpriteSheets() {
  // Starting sprite loading
  
  const char = 'knight';
  spriteSheets[char] = {};
  
  // Knight animation folders with expected frame counts (for faster loading)
  const knightAnimations = [
    { folder: 'idle', key: 'idle', maxFrames: 16 },
    { folder: 'run', key: 'walk', maxFrames: 16 },
    { folder: 'attack', key: 'attack', maxFrames: 10 },
    { folder: 'shield', key: 'shield', maxFrames: 11 },
    { folder: 'death from front', key: 'death_front', maxFrames: 16 },
    { folder: 'death from behind', key: 'death_behind', maxFrames: 10 },
    { folder: 'jump', key: 'jump', maxFrames: 0 } // Special case - we'll use for air/land
  ];
  
  // Calculate total expected frames for progress tracking
  loadingProgress.total = knightAnimations.reduce((sum, anim) => sum + anim.maxFrames, 0);
  loadingProgress.loaded = 0;
  
  const loadPromises = [];
  
  for (const animation of knightAnimations) {
    const basePath = `/assets/player sprites/knight/${animation.folder}/`;
    loadingProgress.currentAnimation = animation.folder;
    
    // Loading animation frames
    
    if (animation.folder === 'jump') {
      // Special handling for jump - use first frame for air, second for land
      const airImg = new Image();
      const landImg = new Image();
      
      loadPromises.push(
        loadSingleImage(airImg, basePath + '1.png').then(() => {
          spriteSheets[char]['air'] = [airImg];
          updateProgress();
        }),
        loadSingleImage(landImg, basePath + '2.png').then(() => {
          spriteSheets[char]['land'] = [landImg];
          updateProgress();
        }).catch(() => {
          // If no second frame, use first frame for land too
          spriteSheets[char]['land'] = [airImg];
          updateProgress();
        })
      );
      continue;
    }
    
    // Load numbered frames in PARALLEL BATCHES for maximum speed (1.png, 2.png, 3.png...)
    const frames = [];
    const framePromises = [];
    
    // Create all image elements and load requests simultaneously
    for (let i = 1; i <= animation.maxFrames; i++) {
      const img = new Image();
      const imagePath = basePath + `${i}.png`;
      
      // Preload image with high priority
      const promise = loadSingleImage(img, imagePath)
        .then(() => {
          frames[i - 1] = img; // Maintain order
          updateProgress();
          return img;
        })
        .catch(() => {
          console.warn(`⚠️ Frame ${i} not found for ${animation.folder}`);
          updateProgress(); // Still count as "processed"
          return null;
        });
      
      framePromises.push(promise);
    }
    
    // Wait for ALL frames to load in parallel (much faster than sequential)
    const loadedFrames = await Promise.all(framePromises);
    const validFrames = loadedFrames.filter(frame => frame !== null);
    
    if (validFrames.length > 0) {
      spriteSheets[char][animation.key] = validFrames;
      
      // Also map 'death' to 'death_front' as default
      if (animation.key === 'death_front') {
        spriteSheets[char]['death'] = validFrames;
      }
      
      // Update hitbox data with actual frame count
      if (hitboxData[char]?.animations?.[animation.key]) {
        hitboxData[char].animations[animation.key].frames = validFrames.length;
      }
      
      // Loaded frames for animation
    } else {
      console.error(`  ❌ No frames loaded for ${animation.folder}!`);
    }
  }
  
  // Wait for all animations to finish loading
  await Promise.all(loadPromises);
  
  preloadCompleted = true;
  // All frames loaded
  
  // Update progress bar to 100%
  updateProgressBar(100);
}

// Image cache for faster loading
const imageCache = new Map();

// RENDER.COM OPTIMIZED - Ultra-fast cached image loader
function loadSingleImage(img, src) {
  return new Promise((resolve, reject) => {
    // Check cache first for instant loading
    if (imageCache.has(src)) {
      const cachedImg = imageCache.get(src);
      if (cachedImg.complete && cachedImg.naturalWidth > 0) {
        // Use cached image immediately - INSTANT!
        img.src = cachedImg.src;
        img.width = cachedImg.width;
        img.height = cachedImg.height;
        resolve(img);
        return;
      }
    }
    
    // Timeout for slow connections (render.com optimization)
    const timeout = setTimeout(() => {
      reject(new Error('Image load timeout - render.com slow connection'));
    }, 5000); // 5 second timeout for render.com
    
    img.onload = () => {
      clearTimeout(timeout);
      // Aggressive caching for render.com
      imageCache.set(src, img);
      resolve(img);
    };
    
    img.onerror = () => {
      clearTimeout(timeout);
      reject(new Error(`Image load failed: ${src}`));
    };
    
    // RENDER.COM OPTIMIZATIONS
    img.crossOrigin = 'anonymous';
    img.loading = 'eager'; // Highest priority loading
    img.decoding = 'sync'; // Synchronous decoding for instant display
    img.fetchPriority = 'high'; // Modern browsers - high priority fetch
    
    // Preload hint for better caching
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = src;
    document.head.appendChild(link);
    
    img.src = src;
  });
}

// Update loading progress
function updateProgress() {
  loadingProgress.loaded++;
  const percent = Math.min(95, (loadingProgress.loaded / loadingProgress.total) * 100);
  updateProgressBar(percent);
}

// Update progress bar UI
function updateProgressBar(percent) {
  const progressBar = document.querySelector('.loading-progress-fill');
  const progressText = document.querySelector('.loading-progress-text');
  
  if (progressBar) {
    progressBar.style.width = percent + '%';
  }
  
  if (progressText) {
    if (percent >= 100) {
      progressText.textContent = 'Ready to battle!';
    } else {
      progressText.textContent = `Loading ${loadingProgress.currentAnimation}... ${Math.round(percent)}%`;
    }
  }
}

// Input handling
document.addEventListener('keydown', (e) => {
  startBackgroundMusicOnInteraction(); // Start background music on first interaction
  
  if (chatOpen || document.activeElement === chatInput || document.activeElement === nameInput) {
    return;
  }
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
  if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') {
    currentInput.shield = true;
  }
  
  // Emoji keys 1-8 (matching your emoji files)
  if (e.key >= '1' && e.key <= '8') {
    const emojiNum = parseInt(e.key);
    if (socket && socket.connected && myId) {
      socket.emit('emoji', { emojiNumber: emojiNum });
      // Show locally with immediate feedback
      spawnEmoji(myId, emojiNum);
    }
  }
});

document.addEventListener('keyup', (e) => {
  if (chatOpen || document.activeElement === chatInput || document.activeElement === nameInput) {
    return;
  }
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
  if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') {
    currentInput.shield = false;
  }
  // H key hitbox toggle disabled
  // if (e.key === 'h' || e.key === 'H') {
  //   showHitboxes = !showHitboxes;
  //   console.log('Hitboxes:', showHitboxes ? 'ON' : 'OFF');
  // }
});

// Mouse controls removed - Space is now attack

// ...
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

  updateChatBubbles(dt);
  
  // Create trails for moving corpses and handle fading
  for (const id in players) {
    const p = players[id];
    
    // Fade out disconnected corpses
    if (p.isFading) {
      p.fadeAlpha -= dt * 0.5; // Fade over 2 seconds
      if (p.fadeAlpha < 0) p.fadeAlpha = 0;
    }
    
    if (p.isCorpse && (Math.abs(p.vx) > 50 || Math.abs(p.vy) > 50)) {
      // Corpse is moving fast - create trail effect
      if (!p.trailTimer) p.trailTimer = 0;
      p.trailTimer += dt;
      
      if (p.trailTimer >= 0.05) { // Create trail every 50ms
        p.trailTimer = 0;
        motionTrails.push({
          x: p.x,
          y: p.y,
          character: p.character,
          state: p.state,
          animationFrame: p.animationFrame,
          facingRight: p.facingRight,
          life: 0.3,
          maxLife: 0.3
        });
      }
    }
  }
  
  // Update death animations
  for (const id in players) {
    const p = players[id];
    if (p.isDying && !p.deathAnimationComplete) {
      const animData = hitboxData[p.character]?.animations[p.state];
      if (animData) {
        p.animationTime += dt;
        const frameTime = animData.frameTime || 0.1;
        
        if (p.animationTime >= frameTime) {
          p.animationTime = 0;
          p.animationFrame++;
          
          // PLAY SOUNDS for animation frames
          playAnimationSound(p.state, p.animationFrame);
          
          console.log(`${p.name} death frame: ${p.animationFrame}/${animData.frames} (${p.state})`);
          
          // Check if death animation finished
          if (p.animationFrame >= animData.frames) {
            p.animationFrame = animData.frames - 1; // Stay on last frame
            p.deathAnimationComplete = true; // Stop advancing frames
            console.log(`Death animation COMPLETE for ${p.name}, FROZEN on frame ${p.animationFrame}`);
          }
        }
      } else {
        console.warn(`⚠️ No animation data for ${p.state} on ${p.character}`);
      }
    }
  }
  
  // Update camera - SMOOTH ALL-DIRECTIONAL SCROLLING!
  if (players[myId]) {
    const target = players[myId];
    
    // Calculate target camera position (center on player)
    camera.targetX = target.x;
    camera.targetY = target.y;
    
    // Smooth camera interpolation (lerp) for buttery smooth movement
    const cameraSmooth = 0.1; // Lower = smoother but slower, Higher = snappier
    camera.x += (camera.targetX - camera.x) * cameraSmooth;
    camera.y += (camera.targetY - camera.y) * cameraSmooth;
    
    // NO EDGE CLAMPING - Camera follows player EVERYWHERE!
    // This enables true all-directional scrolling platformer camera
  }
  
  // Create Santa Hat red trail when moving
  const me = players[myId];
  if (me && me.ownedItems?.santa_hat && (currentInput.left || currentInput.right) && !me.isDying && me.hp > 0) {
    // Only create trail if actually moving (not just holding direction while stopped)
    if (Math.abs(me.vx) > 50) {
      // Create red trail occasionally
      if (Math.random() < 0.3) { // 30% chance per frame
        santaMotionTrails.push({
          x: me.x,
          y: me.y,
          character: me.character,
          state: me.state,
          animationFrame: me.animationFrame,
          facingRight: me.facingRight,
          life: 0.2,
          maxLife: 0.2
        });
      }
    }
  }

  // Send input
  if (socket && socket.connected) {
    inputSeq++;
    const toSend = {
      seq: inputSeq,
      left: currentInput.left,
      right: currentInput.right,
      attack: currentInput.attack,
      jump: currentInput.jump,
      shield: currentInput.shield || false,
      respawn: currentInput.respawn || false
    };
    socket.emit('input', toSend);
    
    // Reset respawn flag after sending
    if (currentInput.respawn) {
      currentInput.respawn = false;
    }
  }
  
  // Render
  render();
  
  requestAnimationFrame(gameLoop);
}

function render() {
  // Camera zoom level - Lower = more zoomed out (see more world), Higher = more zoomed in
  const CAMERA_ZOOM = 0.8; // 0.5 = good balance, 0.3 = zoomed out, 0.8 = zoomed in
  
  // Clear entire canvas first (black background for letterboxing)
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.save();
  
  // PIXELATION: Scale down rendering for chunky pixels
  ctx.scale(PIXEL_SCALE, PIXEL_SCALE);
  
  // Draw background FIRST (before camera transform) - BACK LAYER
  // Use destination-over to ensure it stays BEHIND everything
  ctx.save();
  
  // Draw nice blue gradient background
  const skyGradient = ctx.createLinearGradient(0, 0, 0, RENDER_HEIGHT);
  skyGradient.addColorStop(0, '#87CEEB'); // Sky blue at top
  skyGradient.addColorStop(0.5, '#98D8E8'); // Lighter blue
  skyGradient.addColorStop(1, '#B0E0E6'); // Powder blue at bottom
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, RENDER_WIDTH, RENDER_HEIGHT);
  
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
  
  // Apply screen shake and camera AFTER background - CENTER CAMERA ON PLAYER!
  // Calculate screen center in game coordinates (accounting for pixelation and zoom)
  const viewWidth = canvas.width / PIXEL_SCALE / CAMERA_ZOOM;
  const viewHeight = canvas.height / PIXEL_SCALE / CAMERA_ZOOM;
  const centerX = viewWidth / 2;
  const centerY = viewHeight / 2;
  
  // Apply zoom first, then translate to center player
  ctx.scale(CAMERA_ZOOM, CAMERA_ZOOM);
  ctx.translate(screenShake.x + centerX - camera.x / PIXEL_SCALE, screenShake.y + centerY - camera.y / PIXEL_SCALE);
  
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
  
  // Draw snow hills in background
  drawSnowHills();
  
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
  
  // Draw Santa Hat red trails (tinted red)
  santaMotionTrails.forEach(trail => {
    const alpha = (trail.life / trail.maxLife) * 0.6; // Slightly more visible
    
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
    
    // Apply red tint
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgba(255, 50, 50, 1)';
    ctx.fillRect(-width / 2, -height / 2, width, height);
    ctx.globalCompositeOperation = 'source-over';
    
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
    // Don't draw dead players UNLESS they're playing death animation
    if ((p.hp <= 0 || p.alive === false) && !p.isDying) continue;
    drawPlayer(p, id === myId);
  }
  
  // Draw parallax trees (after players so front trees appear in front)
  drawTrees();
  
  // Draw particles
  drawParticles();
  
  // Draw emojis
  drawEmojis();

  drawChatBubbles();
    
  ctx.restore();
  
  // Draw flash effect (not affected by shake)
  if (flashEffect.alpha > 0) {
    ctx.fillStyle = `rgba(220, 20, 60, ${flashEffect.alpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Draw HEAVY SNOW on top of everything - so much snow!!!
  drawSnow();
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
  
  // Draw INTENSE ambient glow around player - SCALED (fade out when dying/dead)
  if (!player.isDying && !player.isCorpse && player.hp > 0) {
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
  }
  
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
  
  // Apply fade alpha for disconnected corpses
  if (player.isFading && player.fadeAlpha !== undefined) {
    ctx.globalAlpha = player.fadeAlpha;
  }
  
  ctx.drawImage(frame, -width / 2, -height / 2, width, height);
  
  ctx.globalAlpha = 1;
  ctx.restore();
  
  // Calculate position relative to top of hitbox (reuse charData from above)
  const nameAnimData = charData?.animations?.[player.state];
  const nameHitboxScale = (charData?.gameScale || 1.0) / PIXEL_SCALE;
  
  // Find the topmost body hitbox for this frame
  const wrappedFrame = player.animationFrame % (nameAnimData?.frames || 1);
  const frameBodyHitboxes = nameAnimData?.bodyHitboxes?.filter(hb => hb.frame === wrappedFrame) || [];
  
  let hitboxTop;
  if (frameBodyHitboxes.length > 0) {
    // Find the topmost Y position among all body hitboxes
    const topY = Math.min(...frameBodyHitboxes.map(hb => hb.y));
    hitboxTop = y + topY * nameHitboxScale;
  } else if (nameAnimData?.bodyHitbox) {
    // Fallback to legacy single body hitbox
    hitboxTop = y + nameAnimData.bodyHitbox.y * nameHitboxScale;
  } else {
    // No hitbox data, use sprite top
    hitboxTop = y - height / 2;
  }
  
  // Draw name (enable smooth rendering for text only) - smaller and positioned above hitbox
  ctx.imageSmoothingEnabled = true;
  ctx.fillStyle = isMe ? '#daa520' : '#f4e4c1';
  const fontSize = Math.max(6, width * 0.1); // Smaller font (10% of width)
  ctx.font = `${fontSize}px MedievalSharp, serif`;
  ctx.textAlign = 'center';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = Math.max(1, fontSize * 0.12);
  const nameY = hitboxTop - 8; // Just above hitbox
  ctx.strokeText(player.name, x, nameY);
  ctx.fillText(player.name, x, nameY);
  ctx.imageSmoothingEnabled = false;

  // Draw Santa hat under the name (on the head)
  let hatHeight = 0;
  if (player.ownedItems?.santa_hat && santaHatImage && santaHatImage.complete && santaHatImage.naturalWidth > 0) {
    ctx.imageSmoothingEnabled = true;
    const hatWidth = Math.max(10, width * 0.28);
    hatHeight = hatWidth * (santaHatImage.naturalHeight / santaHatImage.naturalWidth);
    const hatX = x - hatWidth / 2;
    const hatY = nameY + 4;
    ctx.drawImage(santaHatImage, hatX, hatY, hatWidth, hatHeight);
    ctx.imageSmoothingEnabled = false;
  }
  
  // Draw HP bar with smooth animation - only show under name when Santa hat is owned
  if (player.ownedItems?.santa_hat && !player.isDying && !player.isCorpse && player.hp > 0) {
    const hpBarWidth = Math.max(20, width * 0.6); // 60% of character width
    const hpBarHeight = Math.max(2, width * 0.05); // Smaller height
    const hpPercent = player.hp / player.maxHp;
    
    // Smooth HP animation - lerp to target HP
    if (!player.displayHp) player.displayHp = player.hp;
    const hpDiff = player.hp - player.displayHp;
    if (Math.abs(hpDiff) > 0.1) {
      player.displayHp += hpDiff * 0.15; // Smooth interpolation
    } else {
      player.displayHp = player.hp;
    }
    const displayPercent = player.displayHp / player.maxHp;
    
    // Position HP bar directly under the name (Santa hat is already drawn above)
    const hpBarY = nameY + 2;
    
    // Background (black) - use screen coordinates
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(x - hpBarWidth / 2, hpBarY, hpBarWidth, hpBarHeight);
    
    // Medieval red/gold HP bar with smooth animation
    ctx.fillStyle = displayPercent > 0.6 ? '#8b0000' : displayPercent > 0.3 ? '#ff4500' : '#dc143c';
    ctx.fillRect(x - hpBarWidth / 2, hpBarY, hpBarWidth * displayPercent, hpBarHeight);
    
    // HP bar border
    ctx.strokeStyle = '#8b4513';
    ctx.lineWidth = Math.max(0.5, hpBarHeight * 0.25);
    ctx.strokeRect(x - hpBarWidth / 2, hpBarY, hpBarWidth, hpBarHeight);
  }
  
  // Draw hitboxes if enabled (press H to toggle)
  if (showHitboxes) {
    const animData = hitboxData[player.character]?.animations?.[player.state];
    if (animData) {
      // Use EXACT same logic as dev tools!
      // Sprite faces left, when player goes right, we flip (isFlipped = true)
      const spriteFacesLeft = charData?.facing === 'left';
      const isFlipped = spriteFacesLeft ? player.facingRight : !player.facingRight;
      
      // Use the ORIGINAL gameScale (not divided by PIXEL_SCALE) for hitbox calculations
      const hitboxScale = (hitboxData[player.character]?.gameScale || 1.0) / PIXEL_SCALE;
      
      // Draw body hitboxes (gold) - YOUR custom hitboxes! Support multiple
      // FIX: Wrap frame number to match animation loop
      const wrappedFrame = player.animationFrame % (animData.frames || 1);
      const frameBodyHitboxes = animData.bodyHitboxes?.filter(hb => hb.frame === wrappedFrame) || [];
      
      if (frameBodyHitboxes.length > 0) {
        // Draw multiple body hitboxes
        frameBodyHitboxes.forEach(bh => {
          const bodyX = x + bh.x * hitboxScale * (isFlipped ? -1 : 1) - (isFlipped ? bh.width * hitboxScale : 0);
          const bodyY = y + bh.y * hitboxScale;
          
          ctx.strokeStyle = '#daa520';
          ctx.lineWidth = 3;
          ctx.strokeRect(bodyX, bodyY, bh.width * hitboxScale, bh.height * hitboxScale);
          ctx.fillStyle = 'rgba(218, 165, 32, 0.3)';
          ctx.fillRect(bodyX, bodyY, bh.width * hitboxScale, bh.height * hitboxScale);
          
          // Only draw feet line if not in 'land' state (prevents green box on landing)
          if (player.state !== 'land') {
            const feetY = bodyY + bh.height * hitboxScale;
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(bodyX - 20, feetY);
            ctx.lineTo(bodyX + bh.width * hitboxScale + 20, feetY);
            ctx.stroke();
          }
        });
      } else if (animData.bodyHitbox) {
        // Legacy single body hitbox support
        const bh = animData.bodyHitbox;
        const bodyX = x + bh.x * hitboxScale * (isFlipped ? -1 : 1) - (isFlipped ? bh.width * hitboxScale : 0);
        const bodyY = y + bh.y * hitboxScale;
        
        ctx.strokeStyle = '#daa520';
        ctx.lineWidth = 3;
        ctx.strokeRect(bodyX, bodyY, bh.width * hitboxScale, bh.height * hitboxScale);
        ctx.fillStyle = 'rgba(218, 165, 32, 0.3)';
        ctx.fillRect(bodyX, bodyY, bh.width * hitboxScale, bh.height * hitboxScale);
        
        // Only draw feet line if not in 'land' state (prevents green box on landing)
        if (player.state !== 'land') {
          const feetY = bodyY + bh.height * hitboxScale;
          ctx.strokeStyle = '#00ff00';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(bodyX - 20, feetY);
          ctx.lineTo(bodyX + bh.width * hitboxScale + 20, feetY);
          ctx.stroke();
        }
      }
      
      // Draw attack hitboxes (red) - YOUR custom attack hitboxes!
      if (player.state === 'attack' && animData.attackHitboxes) {
        const frameHitboxes = animData.attackHitboxes.filter(hb => hb.frame === wrappedFrame);
        frameHitboxes.forEach(hb => {
          // Calculate attack hitbox position in screen space
          const attackX = x + hb.x * hitboxScale * (isFlipped ? -1 : 1) - (isFlipped ? hb.width * hitboxScale : 0);
          const attackY = y + hb.y * hitboxScale;
          
          ctx.strokeStyle = '#dc143c';
          ctx.lineWidth = 3;
          ctx.strokeRect(attackX, attackY, hb.width * hitboxScale, hb.height * hitboxScale);
          ctx.fillStyle = 'rgba(220, 20, 60, 0.4)';
          ctx.fillRect(attackX, attackY, hb.width * hitboxScale, hb.height * hitboxScale);
        });
      }
      
      // Draw shield hitboxes (blue) - YOUR custom shield hitboxes!
      if (player.state === 'shield' && animData.shieldHitboxes) {
        const frameHitboxes = animData.shieldHitboxes.filter(hb => hb.frame === wrappedFrame);
        frameHitboxes.forEach(hb => {
          // Calculate shield hitbox position in screen space
          const shieldX = x + hb.x * hitboxScale * (isFlipped ? -1 : 1) - (isFlipped ? hb.width * hitboxScale : 0);
          const shieldY = y + hb.y * hitboxScale;
          
          ctx.strokeStyle = '#3b82f6'; // Blue for shield
          ctx.lineWidth = 4; // Thicker to emphasize protection
          ctx.strokeRect(shieldX, shieldY, hb.width * hitboxScale, hb.height * hitboxScale);
          ctx.fillStyle = 'rgba(59, 130, 246, 0.5)'; // More opaque blue
          ctx.fillRect(shieldX, shieldY, hb.width * hitboxScale, hb.height * hitboxScale);
          
          // Add shield icon/text
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 16px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('🛡️', shieldX + (hb.width * hitboxScale) / 2, shieldY - 5);
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
let devCurrentCharacter = 'knight';
let devCurrentAnimation = 'idle';
let devCurrentFrame = 0;
let devCurrentTool = 'body';
let devIsFlipped = false;
let devSpriteScale = 3;
let devZoom = 1.0; // Canvas zoom level
let devImageFrames = [];
let devIsDragging = false;
let devDragStart = { x: 0, y: 0 };
let devDragEnd = { x: 0, y: 0 };

const devModeBtn = document.getElementById('dev-mode-btn');
// Hide the dev tools button
if (devModeBtn) {
  devModeBtn.style.display = 'none';
}
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
const devSetShieldFrameBtn = document.getElementById('dev-set-shield-frame');
const devScopeSingle = document.getElementById('dev-scope-single');
const devScopeAll = document.getElementById('dev-scope-all');
const devSpriteScaleSlider = document.getElementById('dev-sprite-scale');
const devScaleInput = document.getElementById('dev-scale-input');
const devSpeedSlider = document.getElementById('dev-speed-slider');
const devSpeedInput = document.getElementById('dev-speed-input');
const devFrameTimeSlider = document.getElementById('dev-frame-time');
const devFrameTimeInput = document.getElementById('dev-frame-time-input');
const devSaveBtn = document.getElementById('dev-save-btn');
const devResetBtn = document.getElementById('dev-reset-btn');
const devToolBodyBtn = document.getElementById('dev-tool-body');
const devToolAttackBtn = document.getElementById('dev-tool-attack');
const devToolShieldBtn = document.getElementById('dev-tool-shield');
const devAddAttackBtn = document.getElementById('dev-add-attack');
const devAttackList = document.getElementById('dev-attack-list');
const devAddShieldBtn = document.getElementById('dev-add-shield');
const devShieldList = document.getElementById('dev-shield-list');
const devSaveStatus = document.getElementById('dev-save-status');
const devAttackControls = document.getElementById('dev-attack-controls');
const devShieldControls = document.getElementById('dev-shield-controls');
const devAddSoundBtn = document.getElementById('dev-add-sound');
const devSoundList = document.getElementById('dev-sound-list');

// Sprite patterns for dev tools
const devSpritePatterns = {
  knight: {
    idle: 'idle',
    walk: 'run',
    attack: 'attack',
    shield: 'shield',
    death_front: 'death fron front',
    death_behind: 'death from back',
    air: '1',
    land: '2'
  },
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
    
    // Load gameScale (for gameplay) and set devSpriteScale (for display)
    if (devHitboxData[devCurrentCharacter]?.gameScale !== undefined) {
      devSpriteScale = devHitboxData[devCurrentCharacter].gameScale;
      devSpriteScaleSlider.value = devSpriteScale;
      devScaleInput.value = devSpriteScale.toFixed(1);
    } else {
      // Default to 1.0 if not set
      devSpriteScale = 1.0;
      devSpriteScaleSlider.value = 1.0;
      devScaleInput.value = '1.0';
    }
    
    // Load speed
    if (devHitboxData[devCurrentCharacter]?.speed !== undefined) {
      const speedValue = devHitboxData[devCurrentCharacter].speed / 50; // Convert back to 0-10 scale
      devSpeedSlider.value = speedValue;
      devSpeedInput.value = speedValue.toFixed(1);
    } else {
      // Default to 5 (250 speed)
      devSpeedSlider.value = 5;
      devSpeedInput.value = '5.0';
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
      knight: { facing: 'left', spriteScale: 3, gameScale: 1.0, flipped: false, animations: {} },
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
    const basePath = `/assets/player sprites/${charName.toLowerCase()}/jump/`;
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
    // Determine folder name (for knight's special folders)
    let folderName = devCurrentAnimation;
    if (devCurrentCharacter === 'knight') {
      if (devCurrentAnimation === 'walk') folderName = 'run';
      if (devCurrentAnimation === 'death_front') folderName = 'death from front';
      if (devCurrentAnimation === 'death_behind') folderName = 'death from behind';
    }
    
    // Load sprite sheet frames for regular animations
    const basePath = `/assets/player sprites/${charName.toLowerCase()}/${folderName}/`;
    
    // Try to load ALL possible grid positions (non-sequential files)
    const possibleFiles = [];
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        const paddedR = String(r).padStart(2, '0');
        const paddedC = String(c).padStart(2, '0');
        possibleFiles.push({ r, c, filename: `${spritePattern}_r${paddedR}_c${paddedC}.png` });
      }
    }
    
    // Try loading each file, keep the ones that exist
    const loadedFrames = [];
    for (const fileInfo of possibleFiles) {
      const img = new Image();
      const fullPath = basePath + fileInfo.filename;
      
      try {
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('timeout')), 1000);
          img.onload = () => {
            clearTimeout(timeout);
            loadedFrames.push({ img, r: fileInfo.r, c: fileInfo.c });
            resolve();
          };
          img.onerror = () => {
            clearTimeout(timeout);
            reject(new Error('failed'));
          };
          img.src = fullPath;
        });
      } catch (e) {
        // File doesn't exist, skip it
      }
    }
    
    // Sort frames by row then column to get correct order
    loadedFrames.sort((a, b) => {
      if (a.r !== b.r) return a.r - b.r;
      return a.c - b.c;
    });
    
    // Extract just the images
    devImageFrames = loadedFrames.map(f => f.img);
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
      attackHitboxes: [],
      shieldHitboxes: []
    };
  } else {
    devHitboxData[devCurrentCharacter].animations[devCurrentAnimation].frames = devImageFrames.length;
    // Ensure shieldHitboxes exists for old data
    if (!devHitboxData[devCurrentCharacter].animations[devCurrentAnimation].shieldHitboxes) {
      devHitboxData[devCurrentCharacter].animations[devCurrentAnimation].shieldHitboxes = [];
    }
  }
  
  const animData = devHitboxData[devCurrentCharacter].animations[devCurrentAnimation];
  if (animData.frameTime !== undefined) {
    devFrameTimeSlider.value = animData.frameTime;
    devFrameTimeInput.value = animData.frameTime.toFixed(2);
  }
  
  devCurrentFrame = 0;
  updateDevUI();
  
  // Force multiple redraws to ensure images show
  drawDevCanvas();
  requestAnimationFrame(() => {
    drawDevCanvas();
    requestAnimationFrame(() => drawDevCanvas());
  });
}

// Update dev UI
function updateDevUI() {
  const animData = devHitboxData[devCurrentCharacter]?.animations[devCurrentAnimation];
  if (!animData) return;
  
  // Show shield frame indicator
  const isShieldFrame = animData.shieldFrame === devCurrentFrame;
  const shieldIndicator = isShieldFrame ? ' 🛡️ SHIELD' : '';
  devFrameDisplay.textContent = `Frame: ${devCurrentFrame + 1} / ${devImageFrames.length}${shieldIndicator}`;
  
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
  updateDevShieldList();
  updateDevSoundList();
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

// Update shield list
function updateDevShieldList() {
  const animData = devHitboxData[devCurrentCharacter]?.animations[devCurrentAnimation];
  if (!animData) return;
  
  devShieldList.innerHTML = '';
  const frameHitboxes = animData.shieldHitboxes?.filter(hb => hb.frame === devCurrentFrame) || [];
  
  frameHitboxes.forEach((hb, index) => {
    const div = document.createElement('div');
    div.style.cssText = 'padding: 5px; margin: 5px 0; background: rgba(23,40,61,0.5); border-radius: 3px;';
    div.innerHTML = `
      <span style="font-size: 11px;">Shield ${index + 1}: (${Math.round(hb.x)}, ${Math.round(hb.y)}) ${Math.round(hb.width)}x${Math.round(hb.height)}</span>
      <button onclick="deleteDevShieldHitbox(${index})" style="padding: 3px 8px; font-size: 11px; background: #ef4444; margin-left: 5px;">Del</button>
    `;
    devShieldList.appendChild(div);
  });
}

// Delete shield hitbox
window.deleteDevShieldHitbox = function(index) {
  const animData = devHitboxData[devCurrentCharacter].animations[devCurrentAnimation];
  const frameHitboxes = animData.shieldHitboxes.filter(hb => hb.frame === devCurrentFrame);
  const hitboxToDelete = frameHitboxes[index];
  const globalIndex = animData.shieldHitboxes.indexOf(hitboxToDelete);
  animData.shieldHitboxes.splice(globalIndex, 1);
  updateDevUI();
  drawDevCanvas();
};

// Update sound list
function updateDevSoundList() {
  const animData = devHitboxData[devCurrentCharacter]?.animations[devCurrentAnimation];
  if (!animData) return;
  
  if (!animData.frameSounds) {
    animData.frameSounds = [];
  }
  
  devSoundList.innerHTML = '';
  
  // Show all sounds for this animation
  animData.frameSounds.forEach((sound, index) => {
    const div = document.createElement('div');
    div.style.cssText = 'padding: 8px; margin: 5px 0; background: rgba(59,130,246,0.2); border-radius: 3px; border-left: 3px solid #3b82f6;';
    div.innerHTML = `
      <div style="color: #f4e4c1; font-size: 14px; margin-bottom: 5px;">
        Frame ${sound.frame}: <strong>${sound.sound}</strong>
      </div>
      <div style="color: #888; font-size: 12px;">
        Volume: ${sound.volume || 0.6} | Pitch: ${sound.pitch || 1.0}
        <button onclick="deleteDevSound(${index})" style="float: right; background: #dc2626; color: white; border: none; padding: 2px 6px; border-radius: 2px; cursor: pointer; font-size: 10px;">Delete</button>
      </div>
    `;
    devSoundList.appendChild(div);
  });
  
  if (animData.frameSounds.length === 0) {
    devSoundList.innerHTML = '<div style="color: #888; font-size: 12px; padding: 10px; text-align: center;">No sounds added yet</div>';
  }
}

// Delete sound
window.deleteDevSound = function(index) {
  const animData = devHitboxData[devCurrentCharacter].animations[devCurrentAnimation];
  animData.frameSounds.splice(index, 1);
  updateDevSoundList();
};

// Add sound button handler
devAddSoundBtn.addEventListener('click', () => {
  const animData = devHitboxData[devCurrentCharacter].animations[devCurrentAnimation];
  if (!animData.frameSounds) {
    animData.frameSounds = [];
  }
  
  // Get available sound names
  const availableSounds = Object.keys(sounds.custom);
  if (availableSounds.length === 0) {
    alert('No sounds loaded! Add .mp3 files to /assets/sounds/ folder first.');
    return;
  }
  
  // Prompt for sound details
  const soundName = prompt(`Enter sound name (available: ${availableSounds.join(', ')}):`, availableSounds[0] || 'swing1');
  if (!soundName) return;
  
  const volume = parseFloat(prompt('Enter volume (0.0 to 1.0):', '0.6'));
  if (isNaN(volume)) return;
  
  const pitch = parseFloat(prompt('Enter pitch (0.5 to 2.0, 1.0 = normal):', '1.0'));
  if (isNaN(pitch)) return;
  
  // Add sound to current frame
  animData.frameSounds.push({
    frame: devCurrentFrame,
    sound: soundName,
    volume: volume,
    pitch: pitch
  });
  
  updateDevSoundList();
  
  devSaveStatus.textContent = '✓ Sound added!';
  devSaveStatus.style.background = '#22c55e';
  setTimeout(() => {
    devSaveStatus.textContent = 'Ready';
    devSaveStatus.style.background = '#333';
  }, 2000);
});

// Draw dev canvas
function drawDevCanvas() {
  devCtx.clearRect(0, 0, devCanvas.width, devCanvas.height);
  
  // Grid
  devCtx.strokeStyle = '#333';
  devCtx.lineWidth = 1;
  const gridSize = 50 * devZoom;
  for (let i = 0; i < devCanvas.width; i += gridSize) {
    devCtx.beginPath();
    devCtx.moveTo(i, 0);
    devCtx.lineTo(i, devCanvas.height);
    devCtx.stroke();
  }
  for (let i = 0; i < devCanvas.height; i += gridSize) {
    devCtx.beginPath();
    devCtx.moveTo(0, i);
    devCtx.lineTo(devCanvas.width, i);
    devCtx.stroke();
  }
  
  if (devImageFrames.length === 0) {
    // Show "No image loaded" text
    devCtx.fillStyle = '#888';
    devCtx.font = '16px MedievalSharp';
    devCtx.textAlign = 'center';
    devCtx.fillText('No sprites loaded', devCanvas.width / 2, devCanvas.height / 2);
    return;
  }
  
  const img = devImageFrames[devCurrentFrame];
  if (!img || !img.complete || img.naturalWidth === 0) {
    // Image not ready yet, try again soon
    requestAnimationFrame(() => drawDevCanvas());
    return;
  }
  
  const centerX = devCanvas.width / 2;
  const centerY = devCanvas.height / 2;
  // Apply BOTH sprite scale and zoom
  const width = img.width * devSpriteScale * devZoom;
  const height = img.height * devSpriteScale * devZoom;
  
  devCtx.save();
  devCtx.translate(centerX, centerY);
  
  if (devIsFlipped) {
    devCtx.scale(-1, 1);
  }
  
  devCtx.drawImage(img, -width / 2, -height / 2, width, height);
  devCtx.restore();
  
  // Draw hitboxes - they scale with sprite scale AND zoom
  const animData = devHitboxData[devCurrentCharacter]?.animations[devCurrentAnimation];
  if (!animData) return;
  
  const totalScale = devSpriteScale * devZoom;
  
  // Body hitboxes (green) - support multiple
  const frameBodyHitboxes = animData.bodyHitboxes?.filter(hb => hb.frame === devCurrentFrame) || [];
  if (frameBodyHitboxes.length > 0) {
    frameBodyHitboxes.forEach(hb => {
      let x = centerX + hb.x * totalScale;
      let y = centerY + hb.y * totalScale;
      
      if (devIsFlipped) {
        x = centerX - hb.x * totalScale - hb.width * totalScale;
      }
      
      devCtx.strokeStyle = '#22c55e';
      devCtx.lineWidth = 2;
      devCtx.strokeRect(x, y, hb.width * totalScale, hb.height * totalScale);
      devCtx.fillStyle = 'rgba(34, 197, 94, 0.2)';
      devCtx.fillRect(x, y, hb.width * totalScale, hb.height * totalScale);
    });
  } else if (animData.bodyHitbox) {
    // Legacy single body hitbox support
    const hb = animData.bodyHitbox;
    let x = centerX + hb.x * totalScale;
    let y = centerY + hb.y * totalScale;
    
    if (devIsFlipped) {
      x = centerX - hb.x * totalScale - hb.width * totalScale;
    }
    
    devCtx.strokeStyle = '#22c55e';
    devCtx.lineWidth = 2;
    devCtx.strokeRect(x, y, hb.width * totalScale, hb.height * totalScale);
    devCtx.fillStyle = 'rgba(34, 197, 94, 0.2)';
    devCtx.fillRect(x, y, hb.width * totalScale, hb.height * totalScale);
  }
  
  // Attack hitboxes (red)
  const frameHitboxes = animData.attackHitboxes?.filter(hb => hb.frame === devCurrentFrame) || [];
  frameHitboxes.forEach(hb => {
    let x = centerX + hb.x * totalScale;
    let y = centerY + hb.y * totalScale;
    
    if (devIsFlipped) {
      x = centerX - hb.x * totalScale - hb.width * totalScale;
    }
    
    devCtx.strokeStyle = '#dc143c';
    devCtx.lineWidth = 2;
    devCtx.strokeRect(x, y, hb.width * totalScale, hb.height * totalScale);
    devCtx.fillStyle = 'rgba(220, 20, 60, 0.2)';
    devCtx.fillRect(x, y, hb.width * totalScale, hb.height * totalScale);
  });
  
  // Shield hitboxes (blue)
  const frameShieldHitboxes = animData.shieldHitboxes?.filter(hb => hb.frame === devCurrentFrame) || [];
  frameShieldHitboxes.forEach(hb => {
    let x = centerX + hb.x * totalScale;
    let y = centerY + hb.y * totalScale;
    
    if (devIsFlipped) {
      x = centerX - hb.x * totalScale - hb.width * totalScale;
    }
    
    devCtx.strokeStyle = '#3b82f6';
    devCtx.lineWidth = 2;
    devCtx.strokeRect(x, y, hb.width * totalScale, hb.height * totalScale);
    devCtx.fillStyle = 'rgba(59, 130, 246, 0.2)';
    devCtx.fillRect(x, y, hb.width * totalScale, hb.height * totalScale);
  });
  
  // Draw current drag
  if (devIsDragging) {
    const x = Math.min(devDragStart.x, devDragEnd.x);
    const y = Math.min(devDragStart.y, devDragEnd.y);
    const w = Math.abs(devDragEnd.x - devDragStart.x);
    const h = Math.abs(devDragEnd.y - devDragStart.y);
    
    let strokeColor = '#22c55e';
    let fillColor = 'rgba(34, 197, 94, 0.2)';
    if (devCurrentTool === 'attack') {
      strokeColor = '#dc143c';
      fillColor = 'rgba(220, 20, 60, 0.2)';
    } else if (devCurrentTool === 'shield') {
      strokeColor = '#3b82f6';
      fillColor = 'rgba(59, 130, 246, 0.2)';
    }
    
    devCtx.strokeStyle = strokeColor;
    devCtx.lineWidth = 2;
    devCtx.setLineDash([5, 5]);
    devCtx.strokeRect(x, y, w, h);
    devCtx.setLineDash([]);
    devCtx.fillStyle = fillColor;
    devCtx.fillRect(x, y, w, h);
  }
  
  // Show zoom level
  devCtx.fillStyle = '#daa520';
  devCtx.font = '12px MedievalSharp';
  devCtx.textAlign = 'left';
  devCtx.fillText(`Zoom: ${(devZoom * 100).toFixed(0)}%`, 10, 20);
}

// Event handlers
devCharacterSelect.addEventListener('change', (e) => {
  devCurrentCharacter = e.target.value;
  loadDevHitboxData();
  // Force redraw after character change
  setTimeout(() => {
    drawDevCanvas();
    requestAnimationFrame(() => drawDevCanvas());
  }, 100);
});

devAnimationSelect.addEventListener('change', (e) => {
  devCurrentAnimation = e.target.value;
  loadDevCurrentAnimation();
  // Force redraw after animation change
  setTimeout(() => {
    drawDevCanvas();
    requestAnimationFrame(() => drawDevCanvas());
  }, 100);
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

devSetShieldFrameBtn.addEventListener('click', () => {
  const animData = devHitboxData[devCurrentCharacter]?.animations[devCurrentAnimation];
  if (animData && devCurrentAnimation === 'shield') {
    animData.shieldFrame = devCurrentFrame;
    devSaveStatus.textContent = `✓ Shield frame set to ${devCurrentFrame}`;
    devSaveStatus.style.background = '#22c55e';
    console.log(`Set shield frame to ${devCurrentFrame} for ${devCurrentCharacter}`);
    
    setTimeout(() => {
      devSaveStatus.textContent = 'Ready';
      devSaveStatus.style.background = '#333';
    }, 2000);
  } else {
    devSaveStatus.textContent = '⚠️ Must be on "shield" animation!';
    devSaveStatus.style.background = '#ef4444';
    setTimeout(() => {
      devSaveStatus.textContent = 'Ready';
      devSaveStatus.style.background = '#333';
    }, 2000);
  }
});

// Scale slider and input sync
devSpriteScaleSlider.addEventListener('input', (e) => {
  const gameScale = parseFloat(e.target.value);
  devScaleInput.value = gameScale.toFixed(1);
  devSpriteScale = gameScale; // Update display scale
  devHitboxData[devCurrentCharacter].gameScale = gameScale;
  drawDevCanvas();
});

devScaleInput.addEventListener('input', (e) => {
  let gameScale = parseFloat(e.target.value);
  if (gameScale < 0.1) gameScale = 0.1;
  if (gameScale > 5) gameScale = 5;
  devSpriteScaleSlider.value = gameScale;
  devSpriteScale = gameScale; // Update display scale
  devHitboxData[devCurrentCharacter].gameScale = gameScale;
  drawDevCanvas();
});

// Speed slider and input sync
devSpeedSlider.addEventListener('input', (e) => {
  const speed = parseFloat(e.target.value);
  devSpeedInput.value = speed.toFixed(1);
  // Speed: 0-10 scale, convert to actual speed (0 = 0, 5 = 250, 10 = 500 SUPER FAST!)
  devHitboxData[devCurrentCharacter].speed = speed * 50;
  console.log(`Speed set to ${speed} (actual: ${speed * 50})`);
});

devSpeedInput.addEventListener('input', (e) => {
  let speed = parseFloat(e.target.value);
  if (speed < 0) speed = 0;
  if (speed > 10) speed = 10;
  devSpeedSlider.value = speed;
  devHitboxData[devCurrentCharacter].speed = speed * 50;
  console.log(`Speed set to ${speed} (actual: ${speed * 50})`);
});

// Frame time slider and input sync
devFrameTimeSlider.addEventListener('input', (e) => {
  const frameTime = parseFloat(e.target.value);
  devFrameTimeInput.value = frameTime.toFixed(2);
  const animData = devHitboxData[devCurrentCharacter].animations[devCurrentAnimation];
  if (animData) {
    animData.frameTime = frameTime;
  }
});

devFrameTimeInput.addEventListener('input', (e) => {
  let frameTime = parseFloat(e.target.value);
  if (frameTime < 0.05) frameTime = 0.05;
  if (frameTime > 0.5) frameTime = 0.5;
  devFrameTimeSlider.value = frameTime;
  const animData = devHitboxData[devCurrentCharacter].animations[devCurrentAnimation];
  if (animData) {
    animData.frameTime = frameTime;
  }
});

devToolBodyBtn.addEventListener('click', () => {
  devCurrentTool = 'body';
  devToolBodyBtn.style.background = '#22c55e';
  devToolAttackBtn.style.background = '#daa520';
  devToolShieldBtn.style.background = '#daa520';
  devAttackControls.style.display = 'none';
  devShieldControls.style.display = 'none';
});

devToolAttackBtn.addEventListener('click', () => {
  devCurrentTool = 'attack';
  devToolBodyBtn.style.background = '#daa520';
  devToolAttackBtn.style.background = '#22c55e';
  devToolShieldBtn.style.background = '#daa520';
  devAttackControls.style.display = 'block';
  devShieldControls.style.display = 'none';
});

devToolShieldBtn.addEventListener('click', () => {
  devCurrentTool = 'shield';
  devToolBodyBtn.style.background = '#daa520';
  devToolAttackBtn.style.background = '#daa520';
  devToolShieldBtn.style.background = '#22c55e';
  devAttackControls.style.display = 'none';
  devShieldControls.style.display = 'block';
});

devCanvas.addEventListener('mousedown', (e) => {
  const rect = devCanvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  
  // Right-click to delete hitbox
  if (e.button === 2) {
    e.preventDefault();
    deleteHitboxAtPosition(mouseX, mouseY);
    return;
  }
  
  // Left-click to create hitbox
  devDragStart.x = mouseX;
  devDragStart.y = mouseY;
  devDragEnd = { ...devDragStart };
  devIsDragging = true;
});

// Prevent context menu on canvas
devCanvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
});

// Delete hitbox at mouse position
function deleteHitboxAtPosition(mouseX, mouseY) {
  const animData = devHitboxData[devCurrentCharacter]?.animations[devCurrentAnimation];
  if (!animData) return;
  
  const centerX = devCanvas.width / 2;
  const centerY = devCanvas.height / 2;
  const totalScale = devSpriteScale * devZoom;
  
  // Check body hitboxes
  if (devCurrentTool === 'body') {
    const frameHitboxes = animData.bodyHitboxes?.filter(hb => hb.frame === devCurrentFrame) || [];
    for (let i = frameHitboxes.length - 1; i >= 0; i--) {
      const hb = frameHitboxes[i];
      let x = centerX + hb.x * totalScale;
      let y = centerY + hb.y * totalScale;
      
      if (devIsFlipped) {
        x = centerX - hb.x * totalScale - hb.width * totalScale;
      }
      
      if (mouseX >= x && mouseX <= x + hb.width * totalScale &&
          mouseY >= y && mouseY <= y + hb.height * totalScale) {
        const globalIndex = animData.bodyHitboxes.indexOf(hb);
        animData.bodyHitboxes.splice(globalIndex, 1);
        
        // Update legacy bodyHitbox if needed
        const firstBodyHitbox = animData.bodyHitboxes.find(hb => hb.frame === 0);
        if (firstBodyHitbox) {
          animData.bodyHitbox = { x: firstBodyHitbox.x, y: firstBodyHitbox.y, width: firstBodyHitbox.width, height: firstBodyHitbox.height };
        } else {
          animData.bodyHitbox = null;
        }
        
        updateDevUI();
        drawDevCanvas();
        return;
      }
    }
  }
  
  // Check attack hitboxes
  if (devCurrentTool === 'attack') {
    const frameHitboxes = animData.attackHitboxes?.filter(hb => hb.frame === devCurrentFrame) || [];
    for (let i = frameHitboxes.length - 1; i >= 0; i--) {
      const hb = frameHitboxes[i];
      let x = centerX + hb.x * totalScale;
      let y = centerY + hb.y * totalScale;
      
      if (devIsFlipped) {
        x = centerX - hb.x * totalScale - hb.width * totalScale;
      }
      
      if (mouseX >= x && mouseX <= x + hb.width * totalScale &&
          mouseY >= y && mouseY <= y + hb.height * totalScale) {
        const globalIndex = animData.attackHitboxes.indexOf(hb);
        animData.attackHitboxes.splice(globalIndex, 1);
        updateDevUI();
        drawDevCanvas();
        return;
      }
    }
  }
  
  // Check shield hitboxes
  if (devCurrentTool === 'shield') {
    const frameHitboxes = animData.shieldHitboxes?.filter(hb => hb.frame === devCurrentFrame) || [];
    for (let i = frameHitboxes.length - 1; i >= 0; i--) {
      const hb = frameHitboxes[i];
      let x = centerX + hb.x * totalScale;
      let y = centerY + hb.y * totalScale;
      
      if (devIsFlipped) {
        x = centerX - hb.x * totalScale - hb.width * totalScale;
      }
      
      if (mouseX >= x && mouseX <= x + hb.width * totalScale &&
          mouseY >= y && mouseY <= y + hb.height * totalScale) {
        const globalIndex = animData.shieldHitboxes.indexOf(hb);
        animData.shieldHitboxes.splice(globalIndex, 1);
        updateDevUI();
        drawDevCanvas();
        return;
      }
    }
  }
}

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
  
  // Convert from canvas coordinates to sprite-relative coordinates
  // Account for BOTH sprite scale AND zoom
  const totalScale = devSpriteScale * devZoom;
  
  let relX = (x - centerX) / totalScale;
  let relY = (y - centerY) / totalScale;
  const relW = w / totalScale;
  const relH = h / totalScale;
  
  if (devIsFlipped) {
    relX = (centerX - x - w) / totalScale;
  }
  
  const animData = devHitboxData[devCurrentCharacter].animations[devCurrentAnimation];
  const isAllFrames = devScopeAll.checked;
  
  if (devCurrentTool === 'body') {
    // Support multiple body hitboxes
    if (!animData.bodyHitboxes) animData.bodyHitboxes = [];
    if (isAllFrames) {
      // Add to all frames
      for (let i = 0; i < devImageFrames.length; i++) {
        animData.bodyHitboxes.push({ frame: i, x: relX, y: relY, width: relW, height: relH });
      }
    } else {
      // Add to current frame only
      animData.bodyHitboxes.push({ frame: devCurrentFrame, x: relX, y: relY, width: relW, height: relH });
    }
    
    // Keep legacy single bodyHitbox for backwards compatibility (use first one)
    const firstBodyHitbox = animData.bodyHitboxes.find(hb => hb.frame === 0);
    if (firstBodyHitbox) {
      animData.bodyHitbox = { x: firstBodyHitbox.x, y: firstBodyHitbox.y, width: firstBodyHitbox.width, height: firstBodyHitbox.height };
    }
  } else if (devCurrentTool === 'attack') {
    if (isAllFrames) {
      // Add to all frames
      for (let i = 0; i < devImageFrames.length; i++) {
        animData.attackHitboxes.push({ frame: i, x: relX, y: relY, width: relW, height: relH });
      }
    } else {
      // Add to current frame only
      animData.attackHitboxes.push({ frame: devCurrentFrame, x: relX, y: relY, width: relW, height: relH });
    }
  } else if (devCurrentTool === 'shield') {
    if (!animData.shieldHitboxes) animData.shieldHitboxes = [];
    if (isAllFrames) {
      // Add to all frames
      for (let i = 0; i < devImageFrames.length; i++) {
        animData.shieldHitboxes.push({ frame: i, x: relX, y: relY, width: relW, height: relH });
      }
    } else {
      // Add to current frame only
      animData.shieldHitboxes.push({ frame: devCurrentFrame, x: relX, y: relY, width: relW, height: relH });
    }
  }
  
  updateDevUI();
  drawDevCanvas();
});

// Scroll wheel zoom
devCanvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const zoomSpeed = 0.1;
  
  if (e.deltaY < 0) {
    // Scroll up = zoom in
    devZoom = Math.min(devZoom + zoomSpeed, 5.0);
  } else {
    // Scroll down = zoom out
    devZoom = Math.max(devZoom - zoomSpeed, 0.2);
  }
  
  drawDevCanvas();
});

devSaveBtn.addEventListener('click', async () => {
  try {
    devSaveStatus.textContent = 'Saving...';
    devSaveStatus.style.background = '#daa520';
    
    const response = await fetch('/api/save-hitboxes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(devHitboxData)
    });
    
    const result = await response.json();
    if (result.success) {
      devSaveStatus.textContent = '✓ Saved! Reloading...';
      devSaveStatus.style.background = '#22c55e';
      
      // RELOAD hitboxes from server to apply ALL changes (size, speed, etc)
      await reloadHitboxes();
      
      devSaveStatus.textContent = '✓ All changes applied!';
      
      setTimeout(() => {
        devSaveStatus.textContent = 'Ready';
        devSaveStatus.style.background = '#333';
      }, 3000);
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
      knight: { facing: 'left', spriteScale: 3, gameScale: 1.0, flipped: false, animations: {} },
      spartan: { facing: 'left', spriteScale: 3, gameScale: 1.0, flipped: false, animations: {} },
      warrior: { facing: 'right', spriteScale: 3, gameScale: 1.0, flipped: false, animations: {} }
    };
    loadDevCurrentAnimation();
  }
});
