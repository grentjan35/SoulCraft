// Deployment verification script
// Run this locally to test if your assets will load correctly on Render.com

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying deployment readiness for Render.com...\n');

// Check critical files exist
const requiredFiles = [
  'package.json',
  'server.js',
  'render.yaml',
  'public/index.html',
  'public/game.js',
  'public/hitboxes.json'
];

const requiredDirs = [
  'public/assets',
  'public/assets/player sprites',
  'public/assets/player sprites/knight',
  'public/assets/sounds'
];

console.log('📁 Checking required files...');
let allFilesExist = true;

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING!`);
    allFilesExist = false;
  }
});

console.log('\n📂 Checking required directories...');
requiredDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`✅ ${dir}`);
  } else {
    console.log(`❌ ${dir} - MISSING!`);
    allFilesExist = false;
  }
});

// Check knight animation folders
console.log('\n🗡️ Checking knight animation folders...');
const knightAnimations = [
  'attack',
  'death from behind', 
  'death from front',
  'idle',
  'jump',
  'run',
  'shield'
];

knightAnimations.forEach(anim => {
  const animPath = `public/assets/player sprites/knight/${anim}`;
  if (fs.existsSync(animPath)) {
    const files = fs.readdirSync(animPath);
    console.log(`✅ ${anim} (${files.length} files)`);
  } else {
    console.log(`❌ ${anim} - MISSING!`);
    allFilesExist = false;
  }
});

// Check package.json dependencies
console.log('\n📦 Checking package.json...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  if (packageJson.dependencies?.express && packageJson.dependencies?.['socket.io']) {
    console.log('✅ Required dependencies present');
  } else {
    console.log('❌ Missing required dependencies');
    allFilesExist = false;
  }
  
  if (packageJson.engines?.node && packageJson.engines?.npm) {
    console.log(`✅ Node.js version specified: ${packageJson.engines.node}`);
  } else {
    console.log('⚠️ No Node.js version specified (recommended)');
  }
} catch (error) {
  console.log('❌ Invalid package.json');
  allFilesExist = false;
}

// Check render.yaml
console.log('\n🚀 Checking render.yaml...');
if (fs.existsSync('render.yaml')) {
  const renderYaml = fs.readFileSync('render.yaml', 'utf8');
  if (renderYaml.includes('startCommand: node server.js')) {
    console.log('✅ Render configuration looks correct');
  } else {
    console.log('❌ Invalid render.yaml start command');
    allFilesExist = false;
  }
}

// Final summary
console.log('\n' + '='.repeat(50));
if (allFilesExist) {
  console.log('🎉 All checks passed! Your app should deploy successfully to Render.com.');
  console.log('\n📝 Deployment tips:');
  console.log('   • Push your code to GitHub');
  console.log('   • Connect your GitHub repo to Render.com');
  console.log('   • Make sure to use the "Web Service" type');
  console.log('   • Node.js version 18+ will be used automatically');
} else {
  console.log('❌ Some files are missing. Please fix the issues above before deploying.');
}

console.log('\n🔧 Common Render.com fixes:');
console.log('   • Case sensitivity: Use lowercase folder names (knight, not Knight)');
console.log('   • Static files: All assets must be in the "public" folder');
console.log('   • Port: Use process.env.PORT || 3000');
console.log('   • Health check: Add /health endpoint for Render monitoring');
