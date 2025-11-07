// Developer Tools - Hitbox Editor
let hitboxData = {};
let currentCharacter = 'spartan';
let currentAnimation = 'idle';
let currentFrame = 0;
let currentTool = 'body'; // 'body' or 'attack'
let isFlipped = false;
let spriteScale = 3;

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let currentImage = null;
let imageFrames = [];
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let dragEnd = { x: 0, y: 0 };
let selectedHitbox = null;

// Sprite name patterns for different characters/animations
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

// UI Elements
const characterSelect = document.getElementById('character-select');
const animationSelect = document.getElementById('animation-select');
const frameDisplay = document.getElementById('frame-display');
const prevFrameBtn = document.getElementById('prev-frame');
const nextFrameBtn = document.getElementById('next-frame');
const flipCheckbox = document.getElementById('flip-sprite');
const facingInfo = document.getElementById('facing-info');
const spriteScaleSlider = document.getElementById('sprite-scale');
const scaleValueDisplay = document.getElementById('scale-value');
const frameTimeSlider = document.getElementById('frame-time');
const frameTimeDisplay = document.getElementById('frame-time-value');
const saveBtn = document.getElementById('save-btn');
const resetBtn = document.getElementById('reset-btn');
const toolBodyBtn = document.getElementById('tool-body');
const toolAttackBtn = document.getElementById('tool-attack');
const addAttackBtn = document.getElementById('add-attack');
const attackList = document.getElementById('attack-list');
const saveStatus = document.getElementById('save-status');

// Load hitbox data
async function loadHitboxData() {
  try {
    const response = await fetch('/hitboxes.json');
    hitboxData = await response.json();
    
    // Load saved sprite scale if exists
    if (hitboxData[currentCharacter]?.spriteScale) {
      spriteScale = hitboxData[currentCharacter].spriteScale;
      spriteScaleSlider.value = spriteScale;
      scaleValueDisplay.textContent = spriteScale + 'x';
    }
    
    // Load saved flip state if exists
    if (hitboxData[currentCharacter]?.flipped !== undefined) {
      isFlipped = hitboxData[currentCharacter].flipped;
      flipCheckbox.checked = isFlipped;
    }
    
    updateUI();
    loadCurrentAnimation();
  } catch (error) {
    console.error('Error loading hitbox data:', error);
    hitboxData = {
      spartan: { facing: 'left', spriteScale: 3, flipped: false, animations: {} },
      warrior: { facing: 'right', spriteScale: 3, flipped: false, animations: {} }
    };
  }
}

// Load animation frames
async function loadCurrentAnimation() {
  const charName = currentCharacter.charAt(0).toUpperCase() + currentCharacter.slice(1);
  const basePath = `/assets/player sprites/${charName}/${currentAnimation}/`;
  const spritePattern = spritePatterns[currentCharacter][currentAnimation];
  
  imageFrames = [];
  console.log(`Loading ${currentCharacter} ${currentAnimation} from ${basePath}`);
  
  // Try to load frames
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
            imageFrames.push(img);
            rowLoaded = true;
            console.log(`Loaded frame ${imageFrames.length}: ${filename}`);
            resolve();
          };
          img.onerror = () => {
            clearTimeout(timeout);
            reject(new Error('failed to load'));
          };
          img.src = fullPath;
        });
      } catch (e) {
        // If we haven't loaded any frames in this row and we're at column 0, stop
        if (c === 0 && !rowLoaded) {
          break;
        }
        // If we loaded frames but this one failed, continue to next row
        if (rowLoaded) {
          break;
        }
      }
    }
    // If we didn't load any frames in this row, we're done
    if (!rowLoaded && r > 0) {
      break;
    }
  }
  
  console.log(`Loaded ${imageFrames.length} frames for ${currentCharacter} ${currentAnimation}`);
  
  if (imageFrames.length === 0) {
    console.error('No frames loaded for', currentCharacter, currentAnimation);
    saveStatus.textContent = '⚠️ No sprites found!';
    saveStatus.style.background = '#ef4444';
  } else {
    saveStatus.textContent = `✓ Loaded ${imageFrames.length} frames`;
    saveStatus.style.background = '#22c55e';
    setTimeout(() => {
      saveStatus.textContent = 'Ready';
      saveStatus.style.background = '#333';
    }, 2000);
  }
  
  // Initialize hitbox data if needed
  if (!hitboxData[currentCharacter].animations[currentAnimation]) {
    hitboxData[currentCharacter].animations[currentAnimation] = {
      frames: imageFrames.length,
      frameTime: 0.1, // Default 0.1 seconds per frame
      bodyHitbox: null, // No default hitbox - user must draw it!
      attackHitboxes: []
    };
  } else {
    hitboxData[currentCharacter].animations[currentAnimation].frames = imageFrames.length;
  }
  
  // Load frame time for this animation
  const animData = hitboxData[currentCharacter].animations[currentAnimation];
  if (animData.frameTime !== undefined) {
    frameTimeSlider.value = animData.frameTime;
    frameTimeDisplay.textContent = animData.frameTime.toFixed(2) + 's';
  }
  
  currentFrame = 0;
  updateUI();
  draw();
}

// Update UI
function updateUI() {
  const animData = hitboxData[currentCharacter]?.animations[currentAnimation];
  if (!animData) return;
  
  frameDisplay.textContent = `Frame: ${currentFrame + 1} / ${imageFrames.length}`;
  facingInfo.textContent = isFlipped ? 
    (hitboxData[currentCharacter].facing === 'left' ? 'Right' : 'Left') :
    hitboxData[currentCharacter].facing.charAt(0).toUpperCase() + hitboxData[currentCharacter].facing.slice(1);
  
  // Update body hitbox info
  if (animData.bodyHitbox) {
    document.getElementById('body-x').textContent = Math.round(animData.bodyHitbox.x);
    document.getElementById('body-y').textContent = Math.round(animData.bodyHitbox.y);
    document.getElementById('body-w').textContent = Math.round(animData.bodyHitbox.width);
    document.getElementById('body-h').textContent = Math.round(animData.bodyHitbox.height);
  }
  
  // Update attack hitbox list
  updateAttackList();
}

// Update attack hitbox list
function updateAttackList() {
  const animData = hitboxData[currentCharacter]?.animations[currentAnimation];
  if (!animData) return;
  
  attackList.innerHTML = '';
  const frameHitboxes = animData.attackHitboxes.filter(hb => hb.frame === currentFrame);
  
  frameHitboxes.forEach((hb, index) => {
    const div = document.createElement('div');
    div.className = 'hitbox-item';
    div.innerHTML = `
      <span>Attack ${index + 1}: (${Math.round(hb.x)}, ${Math.round(hb.y)}) ${Math.round(hb.width)}x${Math.round(hb.height)}</span>
      <button onclick="deleteAttackHitbox(${index})">Delete</button>
    `;
    attackList.appendChild(div);
  });
}

// Delete attack hitbox
window.deleteAttackHitbox = function(index) {
  const animData = hitboxData[currentCharacter].animations[currentAnimation];
  const frameHitboxes = animData.attackHitboxes.filter(hb => hb.frame === currentFrame);
  const hitboxToDelete = frameHitboxes[index];
  const globalIndex = animData.attackHitboxes.indexOf(hitboxToDelete);
  animData.attackHitboxes.splice(globalIndex, 1);
  updateUI();
  draw();
};

// Draw canvas
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw grid
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  for (let i = 0; i < canvas.width; i += 50) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, canvas.height);
    ctx.stroke();
  }
  for (let i = 0; i < canvas.height; i += 50) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(canvas.width, i);
    ctx.stroke();
  }
  
  // Draw current frame
  if (imageFrames[currentFrame]) {
    const img = imageFrames[currentFrame];
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    ctx.save();
    ctx.translate(centerX, centerY);
    if (isFlipped) {
      ctx.scale(-spriteScale, spriteScale);
    } else {
      ctx.scale(spriteScale, spriteScale);
    }
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();
    
    // Draw hitboxes
    const animData = hitboxData[currentCharacter]?.animations[currentAnimation];
    if (animData) {
      // Draw body hitbox
      if (animData.bodyHitbox) {
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 2;
        ctx.strokeRect(
          centerX + animData.bodyHitbox.x * spriteScale * (isFlipped ? -1 : 1) - (isFlipped ? animData.bodyHitbox.width * spriteScale : 0),
          centerY + animData.bodyHitbox.y * spriteScale,
          animData.bodyHitbox.width * spriteScale,
          animData.bodyHitbox.height * spriteScale
        );
        ctx.fillStyle = 'rgba(74, 222, 128, 0.2)';
        ctx.fillRect(
          centerX + animData.bodyHitbox.x * spriteScale * (isFlipped ? -1 : 1) - (isFlipped ? animData.bodyHitbox.width * spriteScale : 0),
          centerY + animData.bodyHitbox.y * spriteScale,
          animData.bodyHitbox.width * spriteScale,
          animData.bodyHitbox.height * spriteScale
        );
      }
      
      // Draw attack hitboxes for current frame
      const frameHitboxes = animData.attackHitboxes.filter(hb => hb.frame === currentFrame);
      frameHitboxes.forEach(hb => {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.strokeRect(
          centerX + hb.x * spriteScale * (isFlipped ? -1 : 1) - (isFlipped ? hb.width * spriteScale : 0),
          centerY + hb.y * spriteScale,
          hb.width * spriteScale,
          hb.height * spriteScale
        );
        ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
        ctx.fillRect(
          centerX + hb.x * spriteScale * (isFlipped ? -1 : 1) - (isFlipped ? hb.width * spriteScale : 0),
          centerY + hb.y * spriteScale,
          hb.width * spriteScale,
          hb.height * spriteScale
        );
      });
    }
  }
  
  // Draw current drag
  if (isDragging) {
    ctx.strokeStyle = currentTool === 'body' ? '#4ade80' : '#ef4444';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    const x = Math.min(dragStart.x, dragEnd.x);
    const y = Math.min(dragStart.y, dragEnd.y);
    const w = Math.abs(dragEnd.x - dragStart.x);
    const h = Math.abs(dragEnd.y - dragStart.y);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);
  }
}

// Canvas mouse events
canvas.addEventListener('mousedown', (e) => {
  const rect = canvas.getBoundingClientRect();
  dragStart = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
  dragEnd = { ...dragStart };
  isDragging = true;
});

canvas.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  const rect = canvas.getBoundingClientRect();
  dragEnd = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
  draw();
});

canvas.addEventListener('mouseup', (e) => {
  if (!isDragging) return;
  isDragging = false;
  
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  
  const x = Math.min(dragStart.x, dragEnd.x);
  const y = Math.min(dragStart.y, dragEnd.y);
  const w = Math.abs(dragEnd.x - dragStart.x);
  const h = Math.abs(dragEnd.y - dragStart.y);
  
  if (w < 5 || h < 5) return; // Too small
  
  // Convert to sprite coordinates
  const spriteX = ((x - centerX) / spriteScale) * (isFlipped ? -1 : 1) + (isFlipped ? w / spriteScale : 0);
  const spriteY = (y - centerY) / spriteScale;
  const spriteW = w / spriteScale;
  const spriteH = h / spriteScale;
  
  const animData = hitboxData[currentCharacter].animations[currentAnimation];
  
  if (currentTool === 'body') {
    animData.bodyHitbox = {
      x: spriteX,
      y: spriteY,
      width: spriteW,
      height: spriteH
    };
  } else if (currentTool === 'attack') {
    animData.attackHitboxes.push({
      frame: currentFrame,
      x: spriteX,
      y: spriteY,
      width: spriteW,
      height: spriteH
    });
  }
  
  updateUI();
  draw();
});

// Event listeners
characterSelect.addEventListener('change', (e) => {
  currentCharacter = e.target.value;
  
  // Load saved sprite scale for this character
  if (hitboxData[currentCharacter]?.spriteScale) {
    spriteScale = hitboxData[currentCharacter].spriteScale;
    spriteScaleSlider.value = spriteScale;
    scaleValueDisplay.textContent = spriteScale + 'x';
  }
  
  // Load saved flip state for this character
  if (hitboxData[currentCharacter]?.flipped !== undefined) {
    isFlipped = hitboxData[currentCharacter].flipped;
    flipCheckbox.checked = isFlipped;
  } else {
    isFlipped = false;
    flipCheckbox.checked = false;
  }
  
  loadCurrentAnimation();
});

animationSelect.addEventListener('change', (e) => {
  currentAnimation = e.target.value;
  loadCurrentAnimation();
  
  // Load frame time for new animation
  const animData = hitboxData[currentCharacter]?.animations[currentAnimation];
  if (animData && animData.frameTime !== undefined) {
    frameTimeSlider.value = animData.frameTime;
    frameTimeDisplay.textContent = animData.frameTime.toFixed(2) + 's';
  } else {
    frameTimeSlider.value = 0.1;
    frameTimeDisplay.textContent = '0.1s';
  }
});

prevFrameBtn.addEventListener('click', () => {
  if (currentFrame > 0) {
    currentFrame--;
    updateUI();
    draw();
  }
});

nextFrameBtn.addEventListener('click', () => {
  if (currentFrame < imageFrames.length - 1) {
    currentFrame++;
    updateUI();
    draw();
  }
});

flipCheckbox.addEventListener('change', (e) => {
  isFlipped = e.target.checked;
  updateUI();
  draw();
});

spriteScaleSlider.addEventListener('input', (e) => {
  spriteScale = parseFloat(e.target.value);
  scaleValueDisplay.textContent = spriteScale + 'x';
  
  // Save scale to hitbox data
  if (hitboxData[currentCharacter]) {
    hitboxData[currentCharacter].spriteScale = spriteScale;
  }
  
  draw();
});

frameTimeSlider.addEventListener('input', (e) => {
  const frameTime = parseFloat(e.target.value);
  frameTimeDisplay.textContent = frameTime.toFixed(2) + 's';
  
  // Save frame time to current animation
  const animData = hitboxData[currentCharacter]?.animations[currentAnimation];
  if (animData) {
    animData.frameTime = frameTime;
  }
});

toolBodyBtn.addEventListener('click', () => {
  currentTool = 'body';
  toolBodyBtn.classList.add('active');
  toolAttackBtn.classList.remove('active');
});

toolAttackBtn.addEventListener('click', () => {
  currentTool = 'attack';
  toolAttackBtn.classList.add('active');
  toolBodyBtn.classList.remove('active');
});

addAttackBtn.addEventListener('click', () => {
  currentTool = 'attack';
  toolAttackBtn.classList.add('active');
  toolBodyBtn.classList.remove('active');
});

resetBtn.addEventListener('click', () => {
  if (confirm('Reset all hitboxes for current frame?')) {
    const animData = hitboxData[currentCharacter].animations[currentAnimation];
    animData.attackHitboxes = animData.attackHitboxes.filter(hb => hb.frame !== currentFrame);
    updateUI();
    draw();
  }
});

saveBtn.addEventListener('click', saveHitboxData);

// Save hitbox data
async function saveHitboxData() {
  try {
    saveStatus.textContent = 'Saving...';
    saveStatus.style.background = '#f59e0b';
    
    // Save EVERYTHING - sprite scale AND flip state
    if (hitboxData[currentCharacter]) {
      hitboxData[currentCharacter].spriteScale = spriteScale;
      hitboxData[currentCharacter].flipped = isFlipped; // Save flip state!
    }
    
    const response = await fetch('/api/save-hitboxes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(hitboxData)
    });
    
    if (response.ok) {
      saveStatus.textContent = '✓ Saved & Reloaded!';
      saveStatus.style.background = '#22c55e';
      console.log('Hitboxes saved successfully!');
      console.log('Server will use these hitboxes immediately.');
      setTimeout(() => {
        saveStatus.textContent = 'Ready';
        saveStatus.style.background = '#333';
      }, 2000);
    } else {
      throw new Error('Save failed');
    }
  } catch (error) {
    console.error('Error saving:', error);
    saveStatus.textContent = '✗ Error';
    saveStatus.style.background = '#ef4444';
    setTimeout(() => {
      saveStatus.textContent = 'Ready';
      saveStatus.style.background = '#333';
    }, 2000);
  }
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault();
    saveHitboxData();
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    if (currentFrame > 0) {
      currentFrame--;
      updateUI();
      draw();
    }
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    if (currentFrame < imageFrames.length - 1) {
      currentFrame++;
      updateUI();
      draw();
    }
  }
});

// Initialize
loadHitboxData();
