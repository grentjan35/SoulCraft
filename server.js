// server.js - Fighting Arena Server
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const TICK_RATE = 60;
const DT = 1 / TICK_RATE;

const WORLD_WIDTH = 10000;
const WORLD_HEIGHT = 10000;
const WORLD_MIN_X = 0;
const WORLD_MAX_X = WORLD_WIDTH;
const WORLD_MIN_Y = 0;
const WORLD_MAX_Y = WORLD_HEIGHT;

const app = express();
const server = http.createServer(app);

// Socket.IO with CORS configuration for production
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? [process.env.RENDER_EXTERNAL_URL || '*']
      : '*',
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling']
});

app.use(express.static('public'));
app.use(express.json());

// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    players: Object.keys(players).length,
    uptime: process.uptime()
  });
});

let players = {}; // socketId -> player
let hitboxData = {};

// Load hitbox data
try {
  const data = fs.readFileSync(path.join(__dirname, 'public', 'hitboxes.json'), 'utf8');
  hitboxData = JSON.parse(data);
  console.log('✓ Hitbox data loaded successfully');
} catch (error) {
  console.log('⚠️  No hitbox data found, using defaults');
  hitboxData = {};
}

// API endpoint to save hitboxes
app.post('/api/save-hitboxes', (req, res) => {
  try {
    hitboxData = req.body;
    const hitboxPath = path.join(__dirname, 'public', 'hitboxes.json');
    
    // In production (Render), file system might be read-only
    // So we keep hitboxData in memory but try to save if possible
    try {
      fs.writeFileSync(hitboxPath, JSON.stringify(hitboxData, null, 2));
      console.log('✓ Hitboxes saved to file successfully!');
    } catch (writeError) {
      console.warn('⚠️  Could not save hitboxes to file (read-only filesystem), keeping in memory');
    }
    
    // UPDATE ALL EXISTING PLAYERS with new speed and size
    for (const id in players) {
      const p = players[id];
      const charData = hitboxData[p.character];
      if (charData) {
        p.baseSpeed = charData.speed || 200;
        p.speed = p.baseSpeed * (p.speedMultiplier || 1.0);
        console.log(`Updated ${p.name} (${p.character}) speed to ${p.speed}`);
      }
    }
    
    console.log('✓ Changes applied successfully!');
    console.log('  - Spartan speed:', hitboxData.spartan?.speed || 200);
    console.log('  - Warrior speed:', hitboxData.warrior?.speed || 200);
    console.log('  - Spartan size:', hitboxData.spartan?.gameScale || 1.0);
    console.log('  - Warrior size:', hitboxData.warrior?.gameScale || 1.0);
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving hitboxes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint to get hitboxes (useful for dev tools)
app.get('/api/hitboxes', (req, res) => {
  res.json(hitboxData);
});

function createPlayer(id, name = 'Player', character = 'spartan') {
  // Spawn near center of massive world
  const spawnX = 4500 + Math.random() * 1000;
  // Get speed from hitbox data (default 200 if not set)
  const characterSpeed = hitboxData[character]?.speed || 200;
  return {
    id,
    name,
    character,
    x: spawnX,
    y: 4700, // SPAWN IN AIR to fall down (near world center)
    vx: 0,
    vy: 0,
    baseSpeed: characterSpeed,
    speedMultiplier: 1.0,
    speed: characterSpeed,
    facingRight: true,
    onGround: false, // Start in air
    hp: 100,
    maxHp: 100,
    kills: 0,
    state: 'air', // Start in air state
    animationFrame: 0,
    animationTime: 0,
    isAttacking: false,
    attackCooldown: 0,
    attackStuckTimer: 0,
    airStuckTimer: 0,
    landingTime: 0,
    isShielding: false,
    shieldFrame: 0, // The frame to freeze on while shielding
    shieldReleasing: false, // Playing remaining shield animation
    shieldStuckTimer: 0,
    wantsToShield: false, // Flag to shield on landing
    isShieldSlamming: false, // Flag for shield slam attack
    isJumping: false,
    hasDoubleJump: false,
    jumpPressed: false,
    lastInputSeq: 0,
    invincible: true, // SPAWN INVINCIBILITY
    invincibleTime: 2.0, // 2 seconds
    alive: true, // Track if player is alive
    // Combo system for extra jumps
    lastDirection: 0, // -1 = left, 1 = right, 0 = none
    directionChangeTime: 0,
    comboJumps: 0, // Extra jumps earned from combos
    maxComboJumps: 5, // Maximum extra jumps you can store
    comboLevel: 0, // Tracks how many combos in a row (gets harder)

    // Shield recoil + landing damage
    shieldRecoilArmed: false,
    shieldRecoilCooldown: 0,

    lastDamagedAt: 0,
    regenAccumulator: 0,

    // Shop / upgrades
    damageBonus: 0,
    ownedItems: {
      santa_hat: false
    }
  };
}

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id, 'Total players:', Object.keys(players).length + 1);
  socket.on('joinGame', (data) => {
    const { name, character } = data;
    
    // Robust name validation and duplicate checking
    const trimmedName = (name || '').toString().trim();
    
    if (!trimmedName) {
      socket.emit('nameExists', { message: 'Invalid name provided!' });
      return;
    }
    
    if (trimmedName.length < 2 || trimmedName.length > 20) {
      socket.emit('nameExists', { message: 'Name must be 2-20 characters long!' });
      return;
    }
    
    // Check if this socket already has a player (prevent duplicates from same connection)
    if (players[socket.id]) {
      socket.emit('nameExists', { message: 'You are already in the game!' });
      return;
    }
    
    // Check if another player with same name already exists (case-insensitive)
    const nameExists = Object.values(players).some(player => 
      player.name.toLowerCase() === trimmedName.toLowerCase()
    );
    
    if (nameExists) {
      // Reject the connection if name already exists
      socket.emit('nameExists', { message: `The name "${trimmedName}" is already taken!` });
      return;
    }
    
    players[socket.id] = createPlayer(socket.id, name, character);
    
    // Load shield frame from hitbox data
    const shieldAnimData = hitboxData[character]?.animations?.shield;
    if (shieldAnimData && shieldAnimData.shieldFrame !== undefined) {
      players[socket.id].shieldFrame = shieldAnimData.shieldFrame;
    }
    
    socket.emit('welcome', { 
      id: socket.id,
      players: Object.values(players)
    });
    
    socket.broadcast.emit('playerJoined', { 
      player: players[socket.id]
    });
    
    console.log(`${name} joined as ${character}`);
  });

  socket.on('buyItem', (data) => {
    const p = players[socket.id];
    if (!p || !data || typeof data.itemId !== 'string') return;

    const itemId = data.itemId;
    if (itemId !== 'santa_hat') {
      socket.emit('purchaseResult', { ok: false, itemId, reason: 'unknown_item' });
      return;
    }

    const COST_KILLS = 3;
    if (p.ownedItems?.santa_hat) {
      socket.emit('purchaseResult', { ok: false, itemId, reason: 'already_owned' });
      return;
    }
    if ((p.kills || 0) < COST_KILLS) {
      socket.emit('purchaseResult', { ok: false, itemId, reason: 'not_enough_kills' });
      return;
    }

    p.kills -= COST_KILLS;
    if (!p.ownedItems) p.ownedItems = {};
    p.ownedItems.santa_hat = true;

    // Apply multiplicative speed bonus (×2) and additive damage bonus (+5)
    p.speedMultiplier = (p.speedMultiplier || 1.0) * 2.0;
    p.damageBonus = (p.damageBonus || 0) + 5;
    p.speed = (p.baseSpeed || p.speed || 200) * p.speedMultiplier;

    io.emit('shopUpdate', {
      id: p.id,
      ownedItems: p.ownedItems,
      kills: p.kills,
      speedMultiplier: p.speedMultiplier,
      damageBonus: p.damageBonus
    });
    socket.emit('purchaseResult', { ok: true, itemId });
  });

  socket.on('input', (data) => {
    const p = players[socket.id];
    if (!p) return;
    
    p.lastInputSeq = data.seq;
    p._latestInput = data;
    
    // Handle respawn request
    if (data.respawn && p.isDying && p.canRespawn) {
      p.hp = p.maxHp;
      p.x = 4500 + Math.random() * 1000;
      p.y = 4700;
      p.vx = 0;
      p.vy = 0;
      p.onGround = false;
      p.state = 'air';
      p.isAttacking = false;
      p.isDying = false;
      p.isCorpse = false;
      p.canRespawn = false;
      p.invincible = true;
      p.invincibleTime = 2.0;
      
      // RESET SHIELD STATE - FIX MOVEMENT BUG!
      p.isShielding = false;
      p.shieldReleasing = false;
      p.wantsToShield = false;
      p.isShieldSlamming = false;
      p.shieldStuckTimer = 0;
      
      io.emit('playerRespawned', { id: socket.id });
      return;
    }
    
    // Handle jump and double jump
    if (data.jump && !p.jumpPressed) {
      p.jumpPressed = true;
      
      // Only allow jump if NOT shielding
      if (!p.isShielding && !p.shieldReleasing) {
        // First jump (on ground)
        if (p.onGround && !p.isJumping) {
          p.isJumping = true;
          p.hasDoubleJump = true; // Enable double jump
          p.vy = -400; // Jump velocity
          p.onGround = false;
          p.state = 'air';
          p.animationFrame = 0;
          p.animationTime = 0;
          // Cancel attack if jumping
          p.isAttacking = false;
        }
        // Double jump (in air) - WORKS EVEN WHILE ATTACKING
        else if (!p.onGround && p.hasDoubleJump) {
          p.vy = -400; // Double jump velocity
          p.hasDoubleJump = false; // Use up standard double jump
          p.state = 'air';
          p.animationFrame = 0;
          p.animationTime = 0;
          // Cancel attack when double jumping
          p.isAttacking = false;
          p.attackStuckTimer = 0;
          
          // Emit double jump event for motion blur effect
          io.emit('playerDoubleJump', { id: p.id });
        }
        // COMBO JUMPS - Extra jumps from rapid left/right spam!
        else if (!p.onGround && p.comboJumps > 0) {
          p.vy = -380; // Slightly weaker than normal jump
          p.comboJumps--; // Use one combo jump
          p.state = 'air';
          p.animationFrame = 0;
          p.animationTime = 0;
          // Cancel attack
          p.isAttacking = false;
          p.attackStuckTimer = 0;
          
          console.log(`🚀 COMBO JUMP! ${p.name} has ${p.comboJumps} jumps left`);
          
          // Emit double jump event for motion blur effect
          io.emit('playerDoubleJump', { id: p.id });
        }
      }
    }
    
    // Reset jump press when key released
    if (!data.jump) {
      p.jumpPressed = false;
    }
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    const player = players[socket.id];
    
    if (player && player.hp > 0) {
      // Player was alive - trigger death animation
      player.hp = 0;
      
      // Random death direction (front or back)
      const deathType = Math.random() > 0.5 ? 'death_front' : 'death_behind';
      player.state = deathType;
      player.animationFrame = 0;
      player.animationTime = 0;
      player.isDying = true;
      player.isDisconnected = true; // Mark as disconnected
      
      // RESET SHIELD STATE ON DISCONNECT DEATH - FIX MOVEMENT BUG!
      player.isShielding = false;
      player.shieldReleasing = false;
      player.wantsToShield = false;
      player.isShieldSlamming = false;
      player.shieldStuckTimer = 0;
      
      console.log(`💀 Disconnected player ${player.name} dying with ${deathType}`);
      
      // Broadcast death
      io.emit('playerDied', { id: socket.id, killer: null, deathType: deathType });
      
      // Become corpse after death animation
      setTimeout(() => {
        if (players[socket.id]) {
          players[socket.id].isCorpse = true;
          players[socket.id].vx = 0;
          players[socket.id].vy = 0;
        }
      }, 1300);
      
      // Fade away and remove after 5 seconds
      setTimeout(() => {
        if (players[socket.id]) {
          io.emit('corpseFadeOut', { id: socket.id });
          
          // Remove after fade animation
          setTimeout(() => {
            delete players[socket.id];
            socket.broadcast.emit('playerLeft', { id: socket.id });
          }, 2000); // 2 second fade
        }
      }, 5000); // 5 seconds before fade starts
    } else {
      // Already dead or no player data - just remove
      delete players[socket.id];
      socket.broadcast.emit('playerLeft', { id: socket.id });
    }
  });
  
  socket.on('error', (error) => {
    console.error('Socket error for', socket.id, error);
  });
  
  // Chat messages
  socket.on('chatMessage', (data) => {
    const player = players[socket.id];
    if (player && data.message) {
      const message = String(data.message).slice(0, 200).trim();
      if (message) {
        io.emit('chatMessage', {
          id: socket.id,
          name: player.name,
          message: message,
          timestamp: Date.now()
        });
      }
    }
  });
  
  // Emoji events
  socket.on('emoji', (data) => {
    const player = players[socket.id];
    if (player && data.emojiNumber >= 1 && data.emojiNumber <= 9) {
      // Broadcast to other players (sender already shows it locally)
      socket.broadcast.emit('emoji', {
        playerId: socket.id,
        emojiNumber: data.emojiNumber
      });
    }
  });
});

 function killPlayer(target, killerId, deathType) {
   if (!target || target.isDying || target.isCorpse) return;
 
   target.hp = 0;
   target.state = deathType || 'death_front';
   target.animationFrame = 0;
   target.animationTime = 0;
   target.isDying = true;
   target.isCorpse = false;
   target.canRespawn = false;
 
   target.isShielding = false;
   target.shieldReleasing = false;
   target.wantsToShield = false;
   target.isShieldSlamming = false;
   target.shieldStuckTimer = 0;
 
   if (killerId && players[killerId]) {
     players[killerId].kills++;
   }
 
   io.emit('playerDied', { id: target.id, killer: killerId || null, deathType: target.state });
 
   setTimeout(() => {
     if (players[target.id] && target.isDying) {
       target.isCorpse = true;
       target.vx = 0;
       target.vy = 0;
     }
   }, 1300);
 
   const respawnTime = 3000 + Math.random() * 4000;
   setTimeout(() => {
     if (players[target.id] && target.isDying) {
       target.canRespawn = true;
       io.emit('canRespawn', { id: target.id });
     }
   }, respawnTime);
 }

function updateGame(dt) {
  const GROUND_Y = 5000; // Massive world ground level
  const GRAVITY = 1200;
  
  for (const id in players) {
    const p = players[id];
    
    // Skip completely dead players (not alive and not a corpse)
    if (!p.alive && !p.isDying) continue;
    
    // Corpses only get physics, no input
    if (p.isCorpse) {
      // Apply gravity to corpse
      if (!p.onGround) {
        p.vy += GRAVITY * dt;
      }
      
      // Update position
      p.y += p.vy * dt;
      p.x += p.vx * dt;

      const corpseXBodyHitbox = hitboxData[p.character]?.animations?.idle?.bodyHitbox;
      const corpseXScale = hitboxData[p.character]?.gameScale || 1.0;
      if (corpseXBodyHitbox) {
        const leftX = p.x + corpseXBodyHitbox.x * corpseXScale;
        const rightX = leftX + corpseXBodyHitbox.width * corpseXScale;
        if (leftX < WORLD_MIN_X) {
          p.x += WORLD_MIN_X - leftX;
          p.vx = 0;
        } else if (rightX > WORLD_MAX_X) {
          p.x -= rightX - WORLD_MAX_X;
          p.vx = 0;
        }
      } else {
        p.x = Math.max(WORLD_MIN_X, Math.min(WORLD_MAX_X, p.x));
      }
      
      // Ground collision - ALWAYS use idle hitbox for consistent collision
      const corpseBodyHitbox = hitboxData[p.character]?.animations?.idle?.bodyHitbox;
      const corpseGameScale = hitboxData[p.character]?.gameScale || 1.0;
      
      if (corpseBodyHitbox) {
        // Calculate feet position (bottom of body hitbox)
        const corpseFeetOffset = (corpseBodyHitbox.y + corpseBodyHitbox.height) * corpseGameScale;
        const corpseFeetY = p.y + corpseFeetOffset;
        
        if (corpseFeetY >= GROUND_Y) {
          // Adjust corpse Y so feet are exactly on ground
          p.y = GROUND_Y - corpseFeetOffset;
          p.vy = 0;
          p.onGround = true;
        } else {
          p.onGround = false;
        }
      } else {
        // Fallback
        if (p.y >= GROUND_Y) {
          p.y = GROUND_Y;
          p.vy = 0;
          p.onGround = true;
        } else {
          p.onGround = false;
        }
      }
      
      // Friction
      p.vx *= 0.9;
      if (Math.abs(p.vx) < 1) p.vx = 0;
      
      continue; // Skip rest of game logic for corpses
    }
    
    // Skip dying players (playing death animation, not yet corpse)
    if (p.isDying) continue;
    
    const input = p._latestInput || { left: false, right: false, attack: false, jump: false };

    // Shield state invariants: if not in shield state, do NOT allow shield flags to lock movement
    if (p.state !== 'shield' && (p.isShielding || p.shieldReleasing)) {
      p.isShielding = false;
      p.shieldReleasing = false;
      p.wantsToShield = false;
      p.shieldStuckTimer = 0;
    }
    
    // Track previous ground state for landing detection
    const wasOnGround = p.onGround;

    // Update shield recoil cooldown
    if (p.shieldRecoilCooldown > 0) {
      p.shieldRecoilCooldown -= dt;
      if (p.shieldRecoilCooldown < 0) p.shieldRecoilCooldown = 0;
    }
    
    // Update attack cooldown
    if (p.attackCooldown > 0) {
      p.attackCooldown -= dt;
    }
    
    // Update spawn invincibility
    if (p.invincible) {
      if (p.invincibleTime > 0) {
        p.invincibleTime -= dt;
        if (p.invincibleTime <= 0) {
          p.invincible = false;
          p.invincibleTime = 0; // Reset to 0
          console.log(`Player ${p.id} invincibility ended`);
        }
      } else {
        // Failsafe: if invincible but time is 0 or negative, turn it off
        p.invincible = false;
        p.invincibleTime = 0;
        console.log(`Player ${p.id} invincibility force-ended (failsafe)`);
      }
    }

    if (p.hp > 0 && p.hp < p.maxHp) {
      const now = Date.now();
      const lastDamagedAt = p.lastDamagedAt || 0;
      const REGEN_DELAY_MS = 4000;
      const REGEN_PER_SEC = 5;

      if (now - lastDamagedAt >= REGEN_DELAY_MS) {
        p.regenAccumulator = (p.regenAccumulator || 0) + dt;
        const healAmount = Math.floor(p.regenAccumulator * REGEN_PER_SEC);
        if (healAmount > 0) {
          p.hp = Math.min(p.maxHp, p.hp + healAmount);
          p.regenAccumulator -= healAmount / REGEN_PER_SEC;
        }
      } else {
        p.regenAccumulator = 0;
      }
    }
    
    // Update landing animation timer
    if (p.landingTime > 0) {
      p.landingTime -= dt;
      if (p.landingTime <= 0) {
        // Landing finished - only change state if still in land state
        if (p.state === 'land') {
          p.state = 'idle';
          p.animationFrame = 0;
          p.animationTime = 0;
        }
      }
    }
    
    // Handle shield (hold S to shield) - Works in AIR and GROUND!
    if (input.shield && !p.isShielding) {
      // SHIELD WORKS BOTH IN AIR AND ON GROUND - same behavior
      p.isShielding = true;
      p.shieldReleasing = false;
      p.state = 'shield';
      p.animationFrame = 0; // Start from beginning of shield animation
      p.animationTime = 0;
      p.vx = 0; // Stop horizontal movement
      p.wantsToShield = true; // Flag to continue shielding on landing
      
      // Cancel all other actions
      p.isAttacking = false;
      p.attackCooldown = 0;
      p.landingTime = 0;
      
      const location = p.onGround ? 'on ground' : 'in air';
      console.log(`🛡️ ${p.name} started shielding ${location} - ALL ACTIONS CANCELLED`);
    } else if (!input.shield && p.isShielding && !p.shieldReleasing) {
      // Released shield - play remaining animation quickly
      p.isShielding = false;
      p.shieldReleasing = true;
      console.log(`🛡️ ${p.name} releasing shield, playing remaining frames`);
    } else if (!input.shield) {
      // Clear shield request if S is released
      p.wantsToShield = false;
    }
    
    // Handle attack (can attack in air, but not during landing, not while shielding OR releasing shield)
    if (input.attack && p.attackCooldown <= 0 && !p.isAttacking && !p.isShielding && !p.shieldReleasing && p.landingTime <= 0) {
      p.isAttacking = true;
      p.wasInAir = !p.onGround; // Track if attack started in air
      p.state = 'attack';
      p.animationFrame = 0;
      p.animationTime = 0;
      p.attackCooldown = 0.5;
      
      // CANCEL COMBO JUMPS when attacking
      p.comboJumps = 0;
      p.comboLevel = 0;
      console.log(`⚔️ ${p.name} attacked - combo jumps CANCELLED`);
      
      // STOP MOVEMENT only when attacking on ground (keep air momentum)
      if (p.onGround) {
        p.vx = 0;
      }
      checkAttackHits(p);
    }
    
    // Update animation (skip if dying - client handles death animation)
    if (!p.isDying) {
      const animData = hitboxData[p.character]?.animations?.[p.state];
      const maxFrames = animData?.frames || 16;
      
      // Shield animation logic
      if (p.state === 'shield') {
        const shieldFrame = p.shieldFrame || 0;
        
        if (p.isShielding) {
          // Playing shield animation ULTRA FAST until we reach shield frame, then freeze
          if (p.animationFrame < shieldFrame) {
            p.animationTime += dt;
            const ultraFastFrameTime = 0.015; // ULTRA fast (15ms per frame) - 2x faster!
            if (p.animationTime >= ultraFastFrameTime) {
              p.animationTime = 0;
              p.animationFrame++;
            }
          }
          // Freeze on shield frame while holding S
        } else if (p.shieldReleasing) {
          // Released S - play remaining animation ULTRA FAST
          p.animationTime += dt;
          const ultraFastFrameTime = 0.015; // ULTRA fast (15ms per frame) - 2x faster!
          if (p.animationTime >= ultraFastFrameTime) {
            p.animationTime = 0;
            p.animationFrame++;
            
            if (p.animationFrame >= maxFrames) {
              // Shield animation finished
              p.shieldReleasing = false;
              p.state = p.onGround ? 'idle' : 'air';
              p.animationFrame = 0;
              p.animationTime = 0;
              console.log(`🛡️ ${p.name} shield animation complete`);
            }
          }
        }
      } else {
        // Normal animation for non-shield states
        p.animationTime += dt;
        const frameTime = animData?.frameTime || 0.1;
        if (p.animationTime >= frameTime) {
          p.animationTime = 0;
          p.animationFrame++;
          
          // Check if attack animation finished
          if (p.state === 'attack' && p.isAttacking) {
            if (p.animationFrame >= maxFrames) {
              // Attack finished
              p.isAttacking = false;
              p.animationFrame = 0;
              p.animationTime = 0;
              
              // Determine next state based on current situation
              if (!p.onGround) {
                p.state = 'air';
              } else if (p.landingTime > 0) {
                p.state = 'land';
              } else {
                p.state = 'idle';
              }
            } else {
              checkAttackHits(p);
            }
          }
        }
      }
      
      // Failsafe: If attack is stuck, force reset after 1 second
      if (p.isAttacking && p.state === 'attack') {
        if (!p.attackStuckTimer) p.attackStuckTimer = 0;
        p.attackStuckTimer += dt;
        if (p.attackStuckTimer > 1.0) {
          console.log(`Force resetting stuck attack for player ${p.id}`);
          p.isAttacking = false;
          p.attackStuckTimer = 0;
          p.state = p.onGround ? 'idle' : 'air';
          p.animationFrame = 0;
        }
      } else {
        p.attackStuckTimer = 0;
      }
      
      // Failsafe: If shield is stuck, force reset after 2 seconds
      if ((p.isShielding || p.shieldReleasing) && p.state === 'shield') {
        if (!p.shieldStuckTimer) p.shieldStuckTimer = 0;
        p.shieldStuckTimer += dt;
        if (p.shieldStuckTimer > 2.0) {
          console.log(`Force resetting stuck shield for player ${p.id}`);
          p.isShielding = false;
          p.shieldReleasing = false;
          p.shieldStuckTimer = 0;
          p.state = p.onGround ? 'idle' : 'air';
          p.animationFrame = 0;
          p.animationTime = 0;
        }
      } else {
        p.shieldStuckTimer = 0;
      }
    }
    
    // Apply gravity
    if (!p.onGround) {
      p.vy += GRAVITY * dt;
    }
    
    // Capture velocity before collision resolution (used for landing impact damage)
    const preCollisionVy = p.vy;

    // Update Y position
    p.y += p.vy * dt;
    
    // Ground collision - ALWAYS use idle hitbox for consistent ground collision
    // This prevents jittering when switching between animations with different hitbox sizes
    const bodyHitbox = hitboxData[p.character]?.animations?.idle?.bodyHitbox;
    const gameScale = hitboxData[p.character]?.gameScale || 1.0;

    if (bodyHitbox) {
      const topOffset = bodyHitbox.y * gameScale;
      const topY = p.y + topOffset;
      if (topY < WORLD_MIN_Y) {
        p.y += WORLD_MIN_Y - topY;
        if (p.vy < 0) p.vy = 0;
      }
    } else {
      if (p.y < WORLD_MIN_Y) {
        p.y = WORLD_MIN_Y;
        if (p.vy < 0) p.vy = 0;
      }
    }
    
    if (bodyHitbox) {
      // Calculate feet position (bottom of body hitbox)
      const feetOffset = (bodyHitbox.y + bodyHitbox.height) * gameScale;
      const feetY = p.y + feetOffset;
      
      // Add tolerance to prevent micro-bouncing (5 pixel buffer)
      const GROUND_TOLERANCE = 5;
      
      if (feetY >= GROUND_Y - GROUND_TOLERANCE) {
        // Snap to ground if close enough
        p.y = GROUND_Y - feetOffset;
        p.vy = 0;
        p.onGround = true;
      } else {
        p.onGround = false;
      }
    } else {
      // Fallback to old method if no hitbox data
      if (p.y >= GROUND_Y - 5) {
        p.y = GROUND_Y;
        p.vy = 0;
        p.onGround = true;
      } else {
        p.onGround = false;
      }
    }
    
    // Handle landing state transitions
    if (p.onGround && !wasOnGround) {
      // Just landed
      p.isJumping = false;

      // Apply landing impact damage if this landing was caused by shield recoil
      if (p.shieldRecoilArmed) {
        // preCollisionVy is positive when falling downward
        const impactSpeed = Math.max(0, preCollisionVy);

        // Tune: starts hurting after a decent slam, scales up, capped
        const DAMAGE_START_SPEED = 600;
        const DAMAGE_PER_100_SPEED = 5;
        const MAX_IMPACT_DAMAGE = 50;

        let impactDamage = 0;
        if (impactSpeed > DAMAGE_START_SPEED) {
          impactDamage = Math.floor(((impactSpeed - DAMAGE_START_SPEED) / 100) * DAMAGE_PER_100_SPEED);
          if (impactDamage > MAX_IMPACT_DAMAGE) impactDamage = MAX_IMPACT_DAMAGE;
        }

        p.shieldRecoilArmed = false;

        if (impactDamage > 0 && p.hp > 0) {
          p.hp -= impactDamage;
          p.lastDamagedAt = Date.now();
          p.regenAccumulator = 0;

          io.emit('fallDamage', {
            id: p.id,
            damage: impactDamage,
            x: p.x,
            y: p.y
          });

          if (p.hp <= 0) {
            killPlayer(p, null, 'death_front');
          }
        }
      }
      
      // Check if player wants to shield on landing - CONTINUE SHIELD!
      if (p.wantsToShield) {
        // Skip landing animation, continue shield (DON'T reset animation!)
        p.isShielding = true;
        p.shieldReleasing = false;
        p.state = 'shield';
        // DON'T RESET ANIMATION - keep current frame to avoid reset loop!
        // p.animationFrame stays at current value (already at shield frame)
        // p.animationTime stays at current value
        p.vx = 0;
        p.wantsToShield = false;
        
        // Cancel all other actions
        p.isAttacking = false;
        p.attackCooldown = 0;
        p.landingTime = 0;
        
        console.log(`🛡️ ${p.name} landed while shielding - continuing shield hold at frame ${p.animationFrame}`);
      }
      // Trigger landing animation if just landed and not attacking or shielding
      else if (!p.isAttacking && !p.isShielding) {
        p.state = 'land';
        p.animationFrame = 0;
        p.animationTime = 0;
        p.landingTime = 0.1; // Very short landing (0.1 seconds)
      } else {
        // If attacking while landing, let attack finish but reset landing
        p.landingTime = 0;
      }
    }
    
    // Movement and state management (skip if dying, attacking, or shielding)
    if (!p.isAttacking && !p.isDying && !p.isShielding && !p.shieldReleasing) {
      // Only allow movement if not attacking, dying, or shielding
      if (input.left || input.right) {
        // Handle both keys pressed - left takes priority
        let direction = 0;
        if (input.left && input.right) {
          direction = -1; // Left priority
        } else if (input.left) {
          direction = -1;
        } else if (input.right) {
          direction = 1;
        }
        
        p.facingRight = direction > 0;
        
        // Combo system: detect rapid direction changes (gets progressively harder)
        if (p.lastDirection !== 0 && p.lastDirection !== direction) {
          // Direction changed!
          const timeSinceLastChange = Date.now() - p.directionChangeTime;
          
          // Calculate required speed based on combo level (gets faster each time)
          // Level 0: 300ms, Level 1: 270ms, Level 2: 240ms, Level 3: 210ms, Level 4: 180ms
          const requiredSpeed = 300 - (p.comboLevel * 30);
          const resetThreshold = 500 - (p.comboLevel * 20); // Also gets stricter
          
          // If changed direction quickly enough, award a combo jump
          if (timeSinceLastChange < requiredSpeed && p.comboJumps < p.maxComboJumps) {
            p.comboJumps++;
            p.comboLevel++; // Increase difficulty for next combo
            console.log(`🔥 COMBO x${p.comboLevel}! ${p.name} earned jump #${p.comboJumps} (${timeSinceLastChange}ms < ${requiredSpeed}ms)`);
          } else if (timeSinceLastChange > resetThreshold) {
            // Reset combo if too slow
            p.comboJumps = 0;
            p.comboLevel = 0;
            console.log(`💔 Combo broken for ${p.name} (too slow: ${timeSinceLastChange}ms)`);
          }
          
          p.directionChangeTime = Date.now();
        }
        p.lastDirection = direction;
        
        // Apply acceleration
        const targetVx = direction * p.speed;
        const acceleration = p.onGround ? 2000 : 1000; // Faster accel on ground
        
        // Check if we're changing direction (velocity and input are opposite)
        const changingDirection = (p.vx > 0 && direction < 0) || (p.vx < 0 && direction > 0);
        
        if (changingDirection) {
          // Apply VERY strong deceleration when changing direction
          const deceleration = p.onGround ? 3000 : 3500; // Even stronger in air for instant response
          p.vx += direction * deceleration * dt;
          
          // Clamp to target if we overshoot
          if ((direction > 0 && p.vx > targetVx) || (direction < 0 && p.vx < targetVx)) {
            p.vx = targetVx;
          }
        } else if (Math.abs(p.vx) < Math.abs(targetVx)) {
          // Normal acceleration when moving in same direction
          p.vx += direction * acceleration * dt;
          if (Math.abs(p.vx) > Math.abs(targetVx)) p.vx = targetVx;
        } else if (Math.abs(p.vx) > Math.abs(targetVx)) {
          // If we're going faster than target (e.g., from momentum), slow down
          const slowdown = p.onGround ? 2000 : 1200;
          const sign = p.vx > 0 ? -1 : 1;
          p.vx += sign * slowdown * dt;
          
          // Clamp to target
          if (Math.abs(p.vx) < Math.abs(targetVx)) {
            p.vx = targetVx;
          }
        }
        
        const moving = Math.abs(p.vx) > 10;
        
        // Set state based on ground and movement (only if not attacking)
        if (!p.onGround) {
          p.state = 'air';
        } else if (p.landingTime <= 0) {
          // Change to walk/idle if not landing
          p.state = moving ? 'walk' : 'idle';
        }
      } else {
        // No input - apply friction/deceleration
        if (p.onGround) {
          // Strong friction on ground
          p.vx *= 0.8;
          if (Math.abs(p.vx) < 1) p.vx = 0;
        } else {
          // Moderate air friction when no input
          p.vx *= 0.92;
          if (Math.abs(p.vx) < 1) p.vx = 0;
        }
        
        // Set state
        if (!p.onGround) {
          p.state = 'air';
        } else if (p.landingTime <= 0) {
          p.state = 'idle';
        }
      }
    }
    
    // Apply horizontal momentum ALWAYS (even during attacks)
    // Apply slight friction during attacks/shielding to slow down momentum gradually
    if (p.isShielding || p.shieldReleasing) {
      // Shielding: strong friction to stop quickly
      p.vx *= 0.7;
      if (Math.abs(p.vx) < 5) p.vx = 0;
    } else if (p.isAttacking && !p.onGround) {
      // In air attack: maintain momentum with gentle friction
      p.vx *= 0.98; // Very gentle friction in air
      if (Math.abs(p.vx) < 5) p.vx = 0;
    } else if (p.isAttacking && p.onGround) {
      // Ground attack: stronger friction to stop
      p.vx *= 0.85;
      if (Math.abs(p.vx) < 10) p.vx = 0;
    }
    
    p.x += p.vx * dt;

    const xBodyHitbox = hitboxData[p.character]?.animations?.idle?.bodyHitbox;
    const xScale = hitboxData[p.character]?.gameScale || 1.0;
    if (xBodyHitbox) {
      const leftX = p.x + xBodyHitbox.x * xScale;
      const rightX = leftX + xBodyHitbox.width * xScale;
      if (leftX < WORLD_MIN_X) {
        p.x += WORLD_MIN_X - leftX;
        p.vx = 0;
      } else if (rightX > WORLD_MAX_X) {
        p.x -= rightX - WORLD_MAX_X;
        p.vx = 0;
      }
    } else {
      p.x = Math.max(WORLD_MIN_X, Math.min(WORLD_MAX_X, p.x));
    }
    
    // Player-to-player collision (bodies push each other) - Support multiple body hitboxes
    if (!p.isDying && !p.isCorpse) {
      for (const otherId in players) {
        const other = players[otherId];
        if (other.id === p.id || other.isDying || other.isCorpse) continue;
        
        const pScale = hitboxData[p.character]?.gameScale || 1.0;
        const otherScale = hitboxData[other.character]?.gameScale || 1.0;
        
        // Get all body hitboxes for current frame
        const pAnimData = hitboxData[p.character]?.animations?.[p.state] || hitboxData[p.character]?.animations?.idle;
        const otherAnimData = hitboxData[other.character]?.animations?.[other.state] || hitboxData[other.character]?.animations?.idle;
        
        if (!pAnimData || !otherAnimData) continue;
        
        const pFrame = p.animationFrame % (pAnimData.frames || 1);
        const otherFrame = other.animationFrame % (otherAnimData.frames || 1);
        
        const pBodyHitboxes = pAnimData.bodyHitboxes?.filter(hb => hb.frame === pFrame) || 
                             (pAnimData.bodyHitbox ? [pAnimData.bodyHitbox] : []);
        const otherBodyHitboxes = otherAnimData.bodyHitboxes?.filter(hb => hb.frame === otherFrame) || 
                                 (otherAnimData.bodyHitbox ? [otherAnimData.bodyHitbox] : []);
        
        if (pBodyHitboxes.length === 0 || otherBodyHitboxes.length === 0) continue;
        
        // Check collision between ALL body hitboxes
        let collisionDetected = false;
        let minOverlapX = Infinity;
        let minOverlapY = Infinity;
        
        for (const pHitbox of pBodyHitboxes) {
          for (const otherHitbox of otherBodyHitboxes) {
            const pLeft = p.x + pHitbox.x * pScale;
            const pRight = pLeft + pHitbox.width * pScale;
            const pTop = p.y + pHitbox.y * pScale;
            const pBottom = pTop + pHitbox.height * pScale;
            
            const otherLeft = other.x + otherHitbox.x * otherScale;
            const otherRight = otherLeft + otherHitbox.width * otherScale;
            const otherTop = other.y + otherHitbox.y * otherScale;
            const otherBottom = otherTop + otherHitbox.height * otherScale;
            
            // Check for collision
            if (pLeft < otherRight && pRight > otherLeft &&
                pTop < otherBottom && pBottom > otherTop) {
              collisionDetected = true;
              const overlapX = Math.min(pRight - otherLeft, otherRight - pLeft);
              const overlapY = Math.min(pBottom - otherTop, otherBottom - pTop);
              minOverlapX = Math.min(minOverlapX, overlapX);
              minOverlapY = Math.min(minOverlapY, overlapY);
            }
          }
        }
        
        if (collisionDetected) {
          const pushDir = (p.x < other.x) ? -1 : 1;
          const SOFT_PUSH_CAP = 30;
          const SOFT_PUSH_FACTOR = 0.15;
          const softPush = Math.min(minOverlapX, SOFT_PUSH_CAP) * SOFT_PUSH_FACTOR;

          p.x += pushDir * softPush;
          other.x -= pushDir * softPush;

          const avgVx = (p.vx + other.vx) / 2;
          p.vx = avgVx;
          other.vx = avgVx;
        }
      }
    }
    
    // Failsafe: If stuck in air state while on ground for too long, force reset
    if (p.state === 'air' && p.onGround) {
      if (!p.airStuckTimer) p.airStuckTimer = 0;
      p.airStuckTimer += dt;
      if (p.airStuckTimer > 0.5) {
        console.log(`Force resetting stuck air state for player ${p.id}`);
        p.state = 'idle';
        p.animationFrame = 0;
        p.isJumping = false;
        p.isAttacking = false;
        p.landingTime = 0;
        p.airStuckTimer = 0;
      }
    } else {
      p.airStuckTimer = 0;
    }
    
    // Stop dead players from doing anything
    if (p.hp <= 0) {
      p.vx = 0;
      p.isAttacking = false;
      p.state = 'idle';
      p.isJumping = false;
      p.landingTime = 0;
    }
  }
}

function checkAttackHits(attacker) {
  // Dead players cannot attack
  if (attacker.hp <= 0) return;
  
  const animData = hitboxData[attacker.character]?.animations?.attack;
  if (!animData || !animData.attackHitboxes) return;
  
  const frameHitboxes = animData.attackHitboxes.filter(hb => hb.frame === attacker.animationFrame);
  
  // Get game scales for proper collision detection
  const attackerScale = hitboxData[attacker.character]?.gameScale || 1.0;
  
  for (const targetId in players) {
    if (targetId === attacker.id) continue;
    const target = players[targetId];
    
    // Skip invincible players, but allow hitting corpses
    if (target.invincible) continue;
    
    // Can't damage corpses, but can push them
    const canDamage = target.hp > 0;
    
    const targetScale = hitboxData[target.character]?.gameScale || 1.0;
    
    // Get all body hitboxes for target's current frame
    const targetAnimData = hitboxData[target.character]?.animations?.[target.state];
    if (!targetAnimData) continue;
    
    const targetFrame = target.animationFrame % (targetAnimData.frames || 1);
    const targetBodyHitboxes = targetAnimData.bodyHitboxes?.filter(hb => hb.frame === targetFrame) || 
                              (targetAnimData.bodyHitbox ? [targetAnimData.bodyHitbox] : []);
    
    if (targetBodyHitboxes.length === 0) continue;
    
    const targetSpriteFacesLeft = hitboxData[target.character]?.facing === 'left';
    const targetIsFlipped = targetSpriteFacesLeft ? target.facingRight : !target.facingRight;
    
    for (const attackHb of frameHitboxes) {
      // Use EXACT same formula as game.js!
      const attackerSpriteFacesLeft = hitboxData[attacker.character]?.facing === 'left';
      const attackerIsFlipped = attackerSpriteFacesLeft ? attacker.facingRight : !attacker.facingRight;
      
      const attackX = attacker.x + attackHb.x * attackerScale * (attackerIsFlipped ? -1 : 1) - (attackerIsFlipped ? attackHb.width * attackerScale : 0);
      const attackY = attacker.y + attackHb.y * attackerScale;
      
      // Check collision with ALL target body hitboxes
      let hitDetected = false;
      for (const targetBodyHitbox of targetBodyHitboxes) {
        const targetX = target.x + targetBodyHitbox.x * targetScale * (targetIsFlipped ? -1 : 1) - (targetIsFlipped ? targetBodyHitbox.width * targetScale : 0);
        const targetY = target.y + targetBodyHitbox.y * targetScale;
        
        if (attackX < targetX + (targetBodyHitbox.width * targetScale) &&
            attackX + (attackHb.width * attackerScale) > targetX &&
            attackY < targetY + (targetBodyHitbox.height * targetScale) &&
            attackY + (attackHb.height * attackerScale) > targetY) {
          hitDetected = true;
          break;
        }
      }
      
      if (hitDetected) {
        // CHECK IF TARGET IS SHIELDING - BLOCK/REDUCE DAMAGE!
        let isBlocked = false;
        let damageReduction = 0;
        
        if (target.isShielding && target.state === 'shield') {
          // Get shield hitboxes for target's current frame
          const targetShieldAnimData = hitboxData[target.character]?.animations?.shield;
          if (targetShieldAnimData && targetShieldAnimData.shieldHitboxes) {
            const targetShieldFrame = target.animationFrame % (targetShieldAnimData.frames || 1);
            const targetShieldHitboxes = targetShieldAnimData.shieldHitboxes.filter(hb => hb.frame === targetShieldFrame);
            
            // Check if attack hits shield hitbox
            for (const shieldHb of targetShieldHitboxes) {
              const shieldX = target.x + shieldHb.x * targetScale * (targetIsFlipped ? -1 : 1) - (targetIsFlipped ? shieldHb.width * targetScale : 0);
              const shieldY = target.y + shieldHb.y * targetScale;
              
              // Check if attack overlaps with shield
              if (attackX < shieldX + (shieldHb.width * targetScale) &&
                  attackX + (attackHb.width * attackerScale) > shieldX &&
                  attackY < shieldY + (shieldHb.height * targetScale) &&
                  attackY + (attackHb.height * attackerScale) > shieldY) {
                isBlocked = true;
                damageReduction = 0.9; // 90% damage reduction!
                console.log(`🛡️ SHIELD BLOCK! ${target.name} blocked ${attacker.name}'s attack!`);
                
                // Emit shield block event for visual/audio feedback
                io.emit('shieldBlock', {
                  defenderId: target.id,
                  attackerId: attacker.id,
                  x: target.x,
                  y: target.y
                });
                break;
              }
            }
          }
        }

        // If blocked by shield: launch attacker backward/upward
        if (isBlocked && attacker.shieldRecoilCooldown <= 0) {
          const recoilDir = attacker.facingRight ? -1 : 1;
          const RECOIL_VX = 500;
          const RECOIL_VY = 800;

          attacker.vx = recoilDir * RECOIL_VX;
          attacker.vy = -RECOIL_VY;
          attacker.onGround = false;
          attacker.state = 'air';
          attacker.isAttacking = false;
          attacker.attackCooldown = Math.max(attacker.attackCooldown, 0.6);

          attacker.shieldRecoilArmed = true;
          attacker.shieldRecoilCooldown = 0.35;

          io.emit('shieldRecoil', {
            attackerId: attacker.id,
            defenderId: target.id,
            x: attacker.x,
            y: attacker.y
          });
        }
        
        // Apply knockback (works on corpses too!)
        const knockbackForce = target.isCorpse ? 400 : (isBlocked ? 100 : 300); // Much less knockback when blocked
        const direction = attacker.facingRight ? 1 : -1;
        target.vx = direction * knockbackForce;
        target.vy = target.isCorpse ? -150 : (isBlocked ? -50 : -200); // Minimal launch when blocked
        target.onGround = false;
        
        // Only deal damage if alive
        if (canDamage) {
          const baseDamage = 10 + (attacker.damageBonus || 0);
          const finalDamage = Math.ceil(baseDamage * (1 - damageReduction)); // Apply damage reduction

          target.hp -= finalDamage;
          target.lastDamagedAt = Date.now();
          target.regenAccumulator = 0;
          
          // Emit hit event for visual effects
          io.emit('playerHit', { 
            attackerId: attacker.id, 
            targetId: target.id,
            damage: finalDamage,
            blocked: isBlocked
          });
        } else if (target.isCorpse) {
          // Emit corpse hit event for blood particles
          io.emit('corpseHit', {
            targetId: target.id,
            x: target.x,
            y: target.y
          });
        }
        
        if (canDamage && target.hp <= 0) {
          const hitFromBehind = attacker.facingRight === target.facingRight;
          const deathType = hitFromBehind ? 'death_behind' : 'death_front';
          console.log(`💀 Death: ${target.name} killed by ${attacker.name}`);
          console.log(`   Attacker facing: ${attacker.facingRight ? 'RIGHT' : 'LEFT'}, Target facing: ${target.facingRight ? 'RIGHT' : 'LEFT'}`);
          console.log(`   Hit from behind: ${hitFromBehind}, Animation: ${deathType}`);
          killPlayer(target, attacker.id, deathType);
        }
        break;
      }
    }
  }
}

function snapshot() {
  return {
    t: Date.now(),
    players: Object.values(players).map(p => ({
      id: p.id,
      name: p.name,
      character: p.character,
      x: Math.round(p.x),
      y: Math.round(p.y),
      facingRight: p.facingRight,
      hp: p.hp,
      maxHp: p.maxHp,
      kills: p.kills,
      state: p.state,
      animationFrame: p.animationFrame,
      lastInputSeq: p.lastInputSeq,
      invincible: p.invincible, // SEND INVINCIBILITY STATE
      invincibleTime: p.invincibleTime, // SEND TIMER
      alive: p.alive, // SEND ALIVE STATE
      isDying: p.isDying, // SEND DYING STATE
      isCorpse: p.isCorpse, // SEND CORPSE STATE
      canRespawn: p.canRespawn, // SEND RESPAWN AVAILABILITY

      // Shop
      ownedItems: p.ownedItems || { santa_hat: false },
      speedMultiplier: p.speedMultiplier || 1.0,
      damageBonus: p.damageBonus || 0
    }))
  };
}

setInterval(() => {
  updateGame(DT);
  io.emit('state', snapshot());
}, 1000 / TICK_RATE);

server.listen(PORT, '0.0.0.0', async () => {
  const localIP = getLocalIP();
  console.log('\n======================================');
  console.log('⚔️  Medieval Battle Arena Server Started!');
  console.log('======================================');
  console.log(`\n🏰 Port: ${PORT}`);
  console.log(`🏰 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  if (process.env.RENDER_EXTERNAL_URL) {
    console.log(`🌐 Public URL: ${process.env.RENDER_EXTERNAL_URL}`);
  } else {
    console.log(`🏰 Local: http://localhost:${PORT}`);
    console.log(`🏰 Network (WiFi): http://${localIP}:${PORT}`);
  }
  
  console.log('======================================\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

// Get local IP address for network play
function getLocalIP() {
  const nets = require('os').networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}
