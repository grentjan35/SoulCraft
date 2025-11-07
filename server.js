// server.js - Fighting Arena Server
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const TICK_RATE = 60;
const DT = 1 / TICK_RATE;

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
    
    console.log('✓ Hitboxes reloaded successfully!');
    console.log('  - Spartan attack hitboxes:', hitboxData.spartan?.animations?.attack?.attackHitboxes?.length || 0);
    console.log('  - Warrior attack hitboxes:', hitboxData.warrior?.animations?.attack?.attackHitboxes?.length || 0);
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
  const spawnX = 400 + Math.random() * 800;
  return {
    id,
    name,
    character,
    x: spawnX,
    y: 200, // SPAWN IN AIR to fall down
    vx: 0,
    vy: 0,
    speed: 200,
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
    isJumping: false,
    hasDoubleJump: false,
    jumpPressed: false,
    lastInputSeq: 0,
    invincible: true, // SPAWN INVINCIBILITY
    invincibleTime: 2.0, // 2 seconds
    alive: true // Track if player is alive
  };
}

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id, 'Total players:', Object.keys(players).length + 1);
  socket.on('joinGame', (data) => {
    const { name, character } = data;
    players[socket.id] = createPlayer(socket.id, name, character);
    
    socket.emit('welcome', { 
      id: socket.id,
      players: Object.values(players)
    });
    
    socket.broadcast.emit('playerJoined', { 
      player: players[socket.id]
    });
    
    console.log(`${name} joined as ${character}`);
  });

  socket.on('input', (data) => {
    const p = players[socket.id];
    if (!p) return;
    
    p.lastInputSeq = data.seq;
    p._latestInput = data;
    
    // Handle jump and double jump
    if (data.jump && !p.jumpPressed) {
      p.jumpPressed = true;
      
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
        p.hasDoubleJump = false; // Can't triple jump
        p.state = 'air';
        p.animationFrame = 0;
        p.animationTime = 0;
        // Cancel attack when double jumping
        p.isAttacking = false;
        p.attackStuckTimer = 0;
        
        // Emit double jump event for motion blur effect
        io.emit('playerDoubleJump', { id: p.id });
      }
    }
    
    // Reset jump press when key released
    if (!data.jump) {
      p.jumpPressed = false;
    }
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    delete players[socket.id];
    socket.broadcast.emit('playerLeft', { id: socket.id });
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

function updateGame(dt) {
  const GROUND_Y = 750; // Updated for larger world
  const GRAVITY = 1200;
  
  for (const id in players) {
    const p = players[id];
    
    // Skip dead players - they don't update!
    if (!p.alive) continue;
    
    const input = p._latestInput || { left: false, right: false, attack: false, jump: false };
    
    // Track previous ground state for landing detection
    const wasOnGround = p.onGround;
    
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
    
    // Handle attack (can attack in air, but not during landing)
    if (input.attack && p.attackCooldown <= 0 && !p.isAttacking && p.landingTime <= 0) {
      p.isAttacking = true;
      p.wasInAir = !p.onGround; // Track if attack started in air
      p.state = 'attack';
      p.animationFrame = 0;
      p.animationTime = 0;
      p.attackCooldown = 0.5;
      // STOP MOVEMENT only when attacking on ground (keep air momentum)
      if (p.onGround) {
        p.vx = 0;
      }
      checkAttackHits(p);
    }
    
    // Update animation
    p.animationTime += dt;
    const animData = hitboxData[p.character]?.animations?.[p.state];
    const frameTime = animData?.frameTime || 0.1; // Use custom frame time or default
    if (p.animationTime >= frameTime) {
      p.animationTime = 0;
      p.animationFrame++;
      
      // Check if attack animation finished
      if (p.state === 'attack' && p.isAttacking) {
        const maxFrames = animData?.frames || 16;
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
    }
    
    // Apply gravity
    if (!p.onGround) {
      p.vy += GRAVITY * dt;
    }
    
    // Update Y position
    p.y += p.vy * dt;
    
    // Ground collision
    if (p.y >= GROUND_Y) {
      p.y = GROUND_Y;
      p.vy = 0;
      p.onGround = true;
      
      // Reset jump flag and handle landing whenever touching ground
      if (!wasOnGround) {
        p.isJumping = false;
        
        // Trigger landing animation if just landed and not attacking
        if (!p.isAttacking) {
          p.state = 'land';
          p.animationFrame = 0;
          p.animationTime = 0;
          p.landingTime = 0.1; // Very short landing (0.1 seconds)
        } else {
          // If attacking while landing, let attack finish but reset landing
          p.landingTime = 0;
        }
      }
    } else {
      p.onGround = false;
    }
    
    // Movement and state management
    if (p.hp > 0) {
      let moving = false;
      
      // Handle movement (only if not attacking)
      if (!p.isAttacking) {
        if (input.left) {
          p.vx = -p.speed;
          p.facingRight = false;
          moving = true;
          // Cancel landing if moving
          if (p.landingTime > 0) {
            p.landingTime = 0;
          }
        } else if (input.right) {
          p.vx = p.speed;
          p.facingRight = true;
          moving = true;
          // Cancel landing if moving
          if (p.landingTime > 0) {
            p.landingTime = 0;
          }
        } else {
          p.vx *= 0.8;
          if (Math.abs(p.vx) < 1) p.vx = 0;
        }
        
        // Set state based on ground and movement (only if not attacking)
        if (!p.onGround) {
          p.state = 'air';
        } else if (p.landingTime <= 0) {
          // Change to walk/idle if not landing
          p.state = moving ? 'walk' : 'idle';
        }
      } else {
        // KEEP VELOCITY AT 0 while attacking ON GROUND (allow air momentum!)
        if (p.onGround) {
          p.vx = 0;
        }
        // In air: keep momentum (vx stays as is)
      }
      
      p.x += p.vx * dt;
      p.x = Math.max(50, Math.min(1550, p.x)); // Wider world bounds
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
    
    // Skip dead or invincible players
    if (target.hp <= 0 || target.invincible) continue;
    
    const targetBodyHitbox = hitboxData[target.character]?.animations?.[target.state]?.bodyHitbox;
    if (!targetBodyHitbox) continue;
    
    const targetScale = hitboxData[target.character]?.gameScale || 1.0;
    
    for (const attackHb of frameHitboxes) {
      // Use EXACT same formula as game.js!
      const attackerSpriteFacesLeft = hitboxData[attacker.character]?.facing === 'left';
      const attackerIsFlipped = attackerSpriteFacesLeft ? attacker.facingRight : !attacker.facingRight;
      
      const attackX = attacker.x + attackHb.x * attackerScale * (attackerIsFlipped ? -1 : 1) - (attackerIsFlipped ? attackHb.width * attackerScale : 0);
      const attackY = attacker.y + attackHb.y * attackerScale;
      
      const targetSpriteFacesLeft = hitboxData[target.character]?.facing === 'left';
      const targetIsFlipped = targetSpriteFacesLeft ? target.facingRight : !target.facingRight;
      
      const targetX = target.x + targetBodyHitbox.x * targetScale * (targetIsFlipped ? -1 : 1) - (targetIsFlipped ? targetBodyHitbox.width * targetScale : 0);
      const targetY = target.y + targetBodyHitbox.y * targetScale;
      
      if (attackX < targetX + (targetBodyHitbox.width * targetScale) &&
          attackX + (attackHb.width * attackerScale) > targetX &&
          attackY < targetY + (targetBodyHitbox.height * targetScale) &&
          attackY + (attackHb.height * attackerScale) > targetY) {
        
        // Apply knockback
        const knockbackForce = 300;
        const direction = attacker.facingRight ? 1 : -1;
        target.vx = direction * knockbackForce;
        target.vy = -200; // Launch upward
        target.onGround = false;
        
        // Deal damage
        target.hp -= 10;
        
        // Emit hit event for visual effects
        io.emit('playerHit', { 
          attackerId: attacker.id, 
          targetId: target.id,
          damage: 10
        });
        
        if (target.hp <= 0) {
          target.hp = 0;
          target.alive = false; // Mark as dead (hide from game)
          target.vx = 0;
          target.vy = 0;
          attacker.kills++; // Increment kill count
          io.emit('playerDied', { id: target.id, killer: attacker.id });
          setTimeout(() => {
            if (players[target.id]) {
              target.hp = target.maxHp;
              target.x = 400 + Math.random() * 800;
              target.y = 200; // SPAWN IN AIR to fall down
              target.vx = 0;
              target.vy = 0;
              target.onGround = false; // Start in air
              target.state = 'air';
              target.isAttacking = false;
              target.invincible = true; // SPAWN INVINCIBILITY
              target.invincibleTime = 2.0; // 2 seconds
              target.alive = true; // NOW ALIVE - show in game
              io.emit('playerRespawned', { id: target.id });
            }
          }, 3000);
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
      alive: p.alive // SEND ALIVE STATE
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
