/**
 * Fix .env.local file - generate password hash and session secret
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const envPath = path.join(__dirname, '..', '.env.local');

if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local file not found!');
  process.exit(1);
}

let envContent = fs.readFileSync(envPath, 'utf-8');

console.log('🔧 Fixing .env.local file...\n');

// Check if password hash needs to be generated
const passwordHashMatch = envContent.match(/ADMIN_PASSWORD_HASH=(.+)/);
const plainPassword = passwordHashMatch ? passwordHashMatch[1].trim() : null;

if (plainPassword && !plainPassword.startsWith('$2a$') && !plainPassword.startsWith('$2b$')) {
  console.log('🔐 Generating password hash for:', plainPassword);
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(plainPassword, salt);
  
  envContent = envContent.replace(
    /ADMIN_PASSWORD_HASH=.*/,
    `ADMIN_PASSWORD_HASH=${hash}`
  );
  console.log('✅ Password hash generated\n');
} else if (passwordHashMatch && (plainPassword.startsWith('$2a$') || plainPassword.startsWith('$2b$'))) {
  console.log('✅ Password hash already looks correct\n');
} else {
  console.log('⚠️  No password found. Using default "Hermit@19"...');
  const hash = bcrypt.hashSync('Hermit@19', bcrypt.genSaltSync(10));
  if (!envContent.includes('ADMIN_PASSWORD_HASH=')) {
    envContent += `ADMIN_PASSWORD_HASH=${hash}\n`;
  } else {
    envContent = envContent.replace(/ADMIN_PASSWORD_HASH=.*/, `ADMIN_PASSWORD_HASH=${hash}`);
  }
  console.log('✅ Default password hash generated\n');
}

// Generate session secret if still using default
if (envContent.includes('SESSION_SECRET=change-this-secret-in-production')) {
  const sessionSecret = crypto.randomBytes(32).toString('hex');
  envContent = envContent.replace(
    /SESSION_SECRET=.*/,
    `SESSION_SECRET=${sessionSecret}`
  );
  console.log('✅ Session secret generated\n');
} else {
  console.log('✅ Session secret already set\n');
}

// Check for service role key
if (!envContent.includes('SUPABASE_SERVICE_ROLE_KEY=')) {
  console.log('⚠️  SUPABASE_SERVICE_ROLE_KEY is missing!');
  console.log('   You need to add this from Supabase Dashboard → Settings → API\n');
}

// Save the file
fs.writeFileSync(envPath, envContent);

console.log('✅ .env.local file updated!\n');
console.log('📋 Next steps:');
console.log('1. Add SUPABASE_SERVICE_ROLE_KEY to .env.local (if not already added)');
console.log('2. Run database migrations in Supabase Dashboard');
console.log('3. Restart your dev server: npm run dev\n');
