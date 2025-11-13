// server-prod.js - Production server that serves minified files
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

// Check if the dist directory exists
const distDir = path.join(__dirname, 'public', 'dist');
if (fs.existsSync(distDir)) {
  console.log('✅ Using minified distribution files for extra security');
  
  // Serve the dist directory first
  app.use(express.static(path.join(__dirname, 'public', 'dist')));
  
  // Serve from public as fallback for files not in dist
  app.use(express.static('public'));
} else {
  console.log('⚠️ Dist directory not found. Run "npm run minify" first for code protection.');
  console.log('⚠️ Using unprotected files for now.');
  app.use(express.static('public'));
}

app.use(express.json());

// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    players: Object.keys(players).length,
    uptime: process.uptime()
  });
});

// The rest of your server code remains identical
// Just copy and paste the rest of your server.js code below this comment

// Load the rest of the server code from the original file
const serverCode = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');

// Extract everything after the server setup
const mainCodeRegex = /let players = \{\};[\s\S]+/;
const mainCode = serverCode.match(mainCodeRegex);

if (mainCode) {
  // Evaluate the main server code in this context
  eval(mainCode[0]);
} else {
  console.error('❌ Failed to load server logic! Please check server.js file.');
  process.exit(1);
}
