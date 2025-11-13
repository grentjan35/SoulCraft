// Minify and obfuscate tool for SoulCraft game
const fs = require('fs');
const path = require('path');
const { minify } = require('terser');
const crypto = require('crypto');

// Create the dist directory if it doesn't exist
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

// Function to generate a random variable name
function generateVarName(length = 5) {
  const hash = crypto.randomBytes(8).toString('hex');
  return '_' + hash.substring(0, length);
}

// Function to mangle reserved words with random prefixes and remove dev mode functionality
function mangleReservedWords(code) {
  // List of common game variables we want to mangle
  const words = ['player', 'socket', 'game', 'character', 'attack', 'hitbox', 'animation', 'state'];
  
  let mangledCode = code;
  words.forEach(word => {
    // Only replace actual variable usages, not string literals
    const regex = new RegExp(`\\b${word}\\b(?=\\s*[.:=,;(){}\\[\\]\\n])`, 'g');
    const replacement = generateVarName(8);
    mangledCode = mangledCode.replace(regex, replacement);
  });
  
  // Disable dev mode completely by replacing the devModeBtn click event handler
  mangledCode = mangledCode.replace(
    /devModeBtn\.addEventListener\(['"]click['"],\s*\(?.*?\)?\s*=>\s*\{[\s\S]*?\}\);/g,
    'devModeBtn.addEventListener("click", () => { console.log("Dev mode disabled in production."); });'
  );
  
  // Replace the DEV_PASSWORD with a random string to prevent guessing
  mangledCode = mangledCode.replace(
    /const\s+DEV_PASSWORD\s*=\s*['"](.*?)['"];/,
    `const DEV_PASSWORD = "${crypto.randomBytes(16).toString('hex')}";`
  );
  
  // Completely disable the openDevMode function
  mangledCode = mangledCode.replace(
    /function\s+openDevMode\s*\(\)\s*\{[\s\S]*?\}/,
    'function openDevMode() { console.log("Dev mode has been disabled in this version."); return false; }'
  );
  
  return mangledCode;
}

// Minify and obfuscate the game.js file
async function minifyGameJs() {
  console.log('Reading game.js...');
  const gameJs = fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8');
  
  console.log('Pre-processing code...');
  const preprocessed = mangleReservedWords(gameJs);
  
  console.log('Minifying with Terser...');
  const minified = await minify(preprocessed, {
    compress: {
      dead_code: true,
      drop_console: false, // Keep console for debugging
      drop_debugger: true,
      keep_fargs: false,
      passes: 3
    },
    mangle: {
      reserved: ['io', 'socket', 'fetch'], // Don't mangle these names
      properties: {
        regex: /^_/  // Only mangle properties that start with underscore
      }
    },
    output: {
      comments: false
    }
  });
  
  console.log('Writing minified file...');
  fs.writeFileSync(path.join(distDir, 'game.min.js'), minified.code);
  
  return minified.code;
}

// Process the HTML file to use minified JS and hide dev tools
function processHtml() {
  console.log('Processing HTML file...');
  let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  
  // Replace the game.js script tag with the minified version
  html = html.replace(
    '<script src="game.js"></script>',
    '<script src="dist/game.min.js"></script>'
  );
  
  // Remove the dev mode button from HTML
  html = html.replace(
    '<!-- Dev Mode Button -->\n    <button id="dev-mode-btn">🔧 Enter Dev Mode</button>',
    '<!-- Dev Mode Button Hidden in Production -->'
  );
  
  // Also hide the dev panel CSS to make it inaccessible
  html = html.replace(
    '#dev-mode-btn {',
    '#dev-mode-btn { display: none; visibility: hidden;'
  );
  
  fs.writeFileSync(path.join(distDir, 'index.html'), html);
}

// Copy necessary assets and create a complete distribution
function createFullDistribution() {
  console.log('Creating full distribution...');
  
  // Copy all asset folders
  const assetsDirs = ['assets'];
  assetsDirs.forEach(dir => {
    const srcDir = path.join(__dirname, dir);
    const targetDir = path.join(distDir, dir);
    
    // Check if directory exists
    if (fs.existsSync(srcDir) && fs.statSync(srcDir).isDirectory()) {
      console.log(`Copying ${dir} directory...`);
      copyDirectoryRecursive(srcDir, targetDir);
    }
  });
  
  // Copy individual files (like socket.io.js)
  const filesToCopy = ['/socket.io/socket.io.js', 'hitboxes.json'];
  filesToCopy.forEach(file => {
    try {
      const srcPath = path.join(__dirname, file);
      const destPath = path.join(distDir, file);
      
      // Ensure the destination directory exists
      const destDir = path.dirname(destPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      
      if (fs.existsSync(srcPath)) {
        console.log(`Copying ${file}...`);
        fs.copyFileSync(srcPath, destPath);
      } else {
        console.log(`Skipping ${file} (not found)...`);
      }
    } catch (err) {
      console.warn(`Warning: Could not copy ${file}:`, err.message);
    }
  });
}

// Helper function to recursively copy directories
function copyDirectoryRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirectoryRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Main process
async function main() {
  console.log('Starting minification process...');
  try {
    await minifyGameJs();
    processHtml();
    createFullDistribution();
    console.log('Minification complete! Files are in the /dist directory.');
    console.log('Use these files for production to protect your code.');
  } catch (error) {
    console.error('Error during minification:', error);
  }
}

// Run the process
main();
