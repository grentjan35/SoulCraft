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
  // Ground is at Y=450, spawn players standing on it
  return {
    id,
    name: String(name).slice(0, 20),
    character,
    x: 200 + Math.random() * 400,
    y: 450, // Ground level
    vx: 0,
    vy: 0,
    onGround: true,
    facingRight: true,
    speed: 200,
    hp: 100,
    maxHp: 100,
    state: 'idle',
    animationFrame: 0,
    animationTime: 0,
    isAttacking: false,
    attackCooldown: 0,
    lastInputSeq: 0
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
    
    // Handle jump
    if (data.jump && p.onGround) {
      p.vy = -400; // Jump velocity
      p.onGround = false;
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
});

function updateGame(dt) {
  const GROUND_Y = 450;
  const GRAVITY = 1200;
  
  for (const id in players) {
    const p = players[id];
    const input = p._latestInput || { left: false, right: false, attack: false, jump: false };
    
    // Update attack cooldown
    if (p.attackCooldown > 0) {
      p.attackCooldown -= dt;
    }
    
    // Handle attack
    if (input.attack && p.attackCooldown <= 0 && !p.isAttacking) {
      p.isAttacking = true;
      p.state = 'attack';
      p.animationFrame = 0;
      p.animationTime = 0;
      p.attackCooldown = 0.5;
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
      if (p.state === 'attack') {
        const maxFrames = animData?.frames || 16;
        if (p.animationFrame >= maxFrames) {
          p.isAttacking = false;
          p.state = 'idle';
          p.animationFrame = 0;
        } else {
          checkAttackHits(p);
        }
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
    } else {
      p.onGround = false;
    }
    
    // Movement
    if (!p.isAttacking) {
      let moving = false;
      
      if (input.left) {
        p.vx = -p.speed;
        p.facingRight = false;
        moving = true;
      } else if (input.right) {
        p.vx = p.speed;
        p.facingRight = true;
        moving = true;
      } else {
        p.vx *= 0.8;
        if (Math.abs(p.vx) < 1) p.vx = 0;
      }
      
      p.state = moving ? 'walk' : 'idle';
      p.x += p.vx * dt;
      p.x = Math.max(50, Math.min(750, p.x));
    }
  }
}

function checkAttackHits(attacker) {
  const animData = hitboxData[attacker.character]?.animations?.attack;
  if (!animData || !animData.attackHitboxes) return;
  
  const frameHitboxes = animData.attackHitboxes.filter(hb => hb.frame === attacker.animationFrame);
  
  // Get game scales for proper collision detection
  const attackerScale = hitboxData[attacker.character]?.gameScale || 1.0;
  
  for (const targetId in players) {
    if (targetId === attacker.id) continue;
    const target = players[targetId];
    
    // Skip dead players
    if (target.hp <= 0) continue;
    
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
          io.emit('playerDied', { id: target.id, killer: attacker.id });
          setTimeout(() => {
            if (players[target.id]) {
              target.hp = target.maxHp;
              target.x = 200 + Math.random() * 400;
              target.y = 450; // Respawn at ground level
              target.vx = 0;
              target.vy = 0;
              target.onGround = true;
              target.state = 'idle';
              target.isAttacking = false;
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
      state: p.state,
      animationFrame: p.animationFrame,
      lastInputSeq: p.lastInputSeq
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
    console.log('\n🌐 For Internet Play:');
    console.log('   1. Download ngrok: https://ngrok.com/download');
    console.log('   2. Run: ngrok http 3000');
    console.log('   3. Share the https URL it gives you!');
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
