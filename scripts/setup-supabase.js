/**
 * Interactive Supabase Setup Helper
 * Guides you through configuring Supabase step by step
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const envLocalPath = path.join(__dirname, '..', '.env.local');
const envExamplePath = path.join(__dirname, '..', '.env.example');

console.log('\n🚀 Supabase Configuration Helper\n');
console.log('This script will help you set up Supabase for your SDP Member Portal.\n');

// Check if .env.local exists
if (!fs.existsSync(envLocalPath)) {
  console.log('📋 Creating .env.local from .env.example...');
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envLocalPath);
    console.log('✅ Created .env.local\n');
  } else {
    console.log('⚠️  .env.example not found. Creating basic .env.local...');
    fs.writeFileSync(envLocalPath, '');
  }
}

// Read current .env.local
let envContent = fs.existsSync(envLocalPath) 
  ? fs.readFileSync(envLocalPath, 'utf-8')
  : '';

const questions = [
  {
    key: 'NEXT_PUBLIC_SUPABASE_URL',
    prompt: 'Enter your Supabase Project URL (from Settings → API):\n> ',
    description: 'Project URL',
  },
  {
    key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    prompt: 'Enter your Supabase anon public key:\n> ',
    description: 'Anon Key',
  },
  {
    key: 'SUPABASE_SERVICE_ROLE_KEY',
    prompt: 'Enter your Supabase service_role key (keep secret!):\n> ',
    description: 'Service Role Key',
  },
];

function askQuestion(index) {
  if (index >= questions.length) {
    // Generate password hash and session secret
    generateSecrets();
    return;
  }

  const q = questions[index];
  rl.question(q.prompt, (answer) => {
    if (!answer.trim()) {
      console.log('⚠️  Skipping this step. You can add it manually later.\n');
      askQuestion(index + 1);
      return;
    }

    // Update or add the env variable
    const regex = new RegExp(`^${q.key}=.*$`, 'm');
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${q.key}=${answer.trim()}`);
    } else {
      envContent += `${q.key}=${answer.trim()}\n`;
    }

    console.log(`✅ ${q.description} saved\n`);
    askQuestion(index + 1);
  });
}

function generateSecrets() {
  console.log('\n🔐 Generating security credentials...\n');

  // Generate session secret
  const crypto = require('crypto');
  const sessionSecret = crypto.randomBytes(32).toString('hex');
  
  // Add session secret
  const sessionRegex = /^SESSION_SECRET=.*$/m;
  if (sessionRegex.test(envContent)) {
    envContent = envContent.replace(sessionRegex, `SESSION_SECRET=${sessionSecret}`);
  } else {
    envContent += `SESSION_SECRET=${sessionSecret}\n`;
  }
  console.log('✅ Session secret generated');

  // Prompt for admin password
  rl.question('\n🔑 Enter admin password (or press Enter to use default "admin123"):\n> ', async (password) => {
    const adminPassword = password.trim() || 'admin123';
    
    try {
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(adminPassword, salt);
      
      // Add password hash
      const hashRegex = /^ADMIN_PASSWORD_HASH=.*$/m;
      if (hashRegex.test(envContent)) {
        envContent = envContent.replace(hashRegex, `ADMIN_PASSWORD_HASH=${hash}`);
      } else {
        envContent += `ADMIN_PASSWORD_HASH=${hash}\n`;
      }
      
      // Ensure ADMIN_EMAIL is set
      if (!envContent.includes('ADMIN_EMAIL=')) {
        envContent += `ADMIN_EMAIL=admin@sdp.org\n`;
      }

      // Save .env.local
      fs.writeFileSync(envLocalPath, envContent);
      
      console.log('\n✅ Admin password hash generated');
      console.log(`\n📝 Configuration saved to .env.local`);
      console.log(`\n📋 Admin Login Credentials:`);
      console.log(`   Email: admin@sdp.org (or your ADMIN_EMAIL)`);
      console.log(`   Password: ${adminPassword}`);
      console.log(`\n⚠️  Keep these credentials secure!`);
      
      console.log('\n📚 Next Steps:');
      console.log('1. Run database migrations in Supabase Dashboard → SQL Editor');
      console.log('   - Execute supabase/migrations/001_create_members.sql');
      console.log('   - Execute supabase/migrations/002_create_events_announcements.sql');
      console.log('2. Restart your dev server: npm run dev');
      console.log('3. Test enrollment at http://localhost:3000/enroll');
      console.log('4. Test admin login at http://localhost:3000/admin\n');
      
      rl.close();
    } catch (error) {
      console.error('❌ Error generating password hash:', error.message);
      console.log('\nYou can generate it manually:');
      console.log('  node scripts/generate-password-hash.js\n');
      rl.close();
    }
  });
}

// Start asking questions
console.log('📝 Let\'s configure your Supabase connection.\n');
console.log('You can find these values in Supabase Dashboard → Settings → API\n');
askQuestion(0);
