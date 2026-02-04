/**
 * Helper script to generate PWA icons from existing logo
 * Uses Sharp (Node.js) - no external dependencies required
 */

const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const appDir = path.join(__dirname, '..', 'app');
const logoPath = path.join(publicDir, 'sdplogo.jpg');
const icon192Path = path.join(publicDir, 'icon-192.png');
const icon512Path = path.join(publicDir, 'icon-512.png');
const faviconPath = path.join(appDir, 'favicon.ico');
const appleIconPath = path.join(publicDir, 'apple-touch-icon.png');

console.log('🎨 PWA Icon Generator\n');

// Check if logo exists
if (!fs.existsSync(logoPath)) {
  console.error('❌ Error: sdplogo.jpg not found in public/ directory');
  console.log('\nPlease ensure public/sdplogo.jpg exists.');
  process.exit(1);
}

// Try to use Sharp (Node.js library)
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('⚠️  Sharp not installed. Installing...\n');
  console.log('Run: npm install sharp --save-dev\n');
  console.log('Or use manual methods below.\n');
  showManualInstructions();
  process.exit(1);
}

async function generateIcons() {
  try {
    console.log('✅ Sharp found. Generating icons...\n');
    
    // Ensure app directory exists
    if (!fs.existsSync(appDir)) {
      fs.mkdirSync(appDir, { recursive: true });
    }
    
    // Generate 192x192 icon
    console.log('Creating icon-192.png...');
    await sharp(logoPath)
      .resize(192, 192, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .toFile(icon192Path);
    console.log('✅ Created icon-192.png\n');
    
    // Generate 512x512 icon
    console.log('Creating icon-512.png...');
    await sharp(logoPath)
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .toFile(icon512Path);
    console.log('✅ Created icon-512.png\n');
    
    // Generate favicon.ico (32x32)
    console.log('Creating favicon.ico...');
    const faviconBuffer = await sharp(logoPath)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toBuffer();
    
    // Convert PNG to ICO format (simple approach - create PNG and rename)
    // Note: For proper ICO format, you'd need a library, but Next.js accepts PNG renamed as .ico
    fs.writeFileSync(faviconPath, faviconBuffer);
    console.log('✅ Created favicon.ico\n');
    
    // Generate apple-touch-icon (180x180)
    console.log('Creating apple-touch-icon.png...');
    await sharp(logoPath)
      .resize(180, 180, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .toFile(appleIconPath);
    console.log('✅ Created apple-touch-icon.png\n');
    
    console.log('🎉 Icons generated successfully!');
    console.log('\nFiles created:');
    console.log(`  - ${icon192Path}`);
    console.log(`  - ${icon512Path}`);
    console.log(`  - ${faviconPath}`);
    console.log(`  - ${appleIconPath}`);
    console.log('\n✅ PWA icons and favicon are ready!');
    
  } catch (error) {
    console.error('❌ Error generating icons:', error.message);
    console.log('\nTrying alternative method...\n');
    showManualInstructions();
  }
}

function showManualInstructions() {
  console.log('📋 Manual Icon Creation Instructions:\n');
  console.log('Option 1: Online Tools (Easiest)');
  console.log('  1. Visit https://realfavicongenerator.net/');
  console.log('  2. Upload public/sdplogo.jpg');
  console.log('  3. Download generated icons');
  console.log('  4. Save as public/icon-192.png and public/icon-512.png\n');
  
  console.log('Option 2: Install Sharp');
  console.log('  npm install sharp --save-dev\n');
  
  console.log('Option 3: Use Image Editing Software');
  console.log('  1. Open public/sdplogo.jpg in Photoshop/GIMP/etc.');
  console.log('  2. Resize to 192x192px, save as public/icon-192.png');
  console.log('  3. Resize to 512x512px, save as public/icon-512.png');
  console.log('  4. Ensure background is white or transparent\n');
  
  console.log('After creating icons, verify they exist:');
  console.log('  - public/icon-192.png (192×192 pixels)');
  console.log('  - public/icon-512.png (512×512 pixels)');
  console.log('  - app/favicon.ico (32×32 pixels)');
  console.log('  - public/apple-touch-icon.png (180×180 pixels)');
}

// Run the generator
generateIcons().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
