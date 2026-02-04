/**
 * Generate a secure random session secret for SESSION_SECRET env variable
 */

const crypto = require('crypto');

const secret = crypto.randomBytes(32).toString('hex');

console.log('\n✅ Generated Session Secret:\n');
console.log(secret);
console.log('\n📋 Add this to your .env.local file as:');
console.log(`SESSION_SECRET=${secret}\n`);
