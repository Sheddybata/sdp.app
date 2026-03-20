const bcrypt = require("bcryptjs");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("Enter password to hash: ", async (password) => {
  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    console.log("\nPassword hash (must be exactly 60 characters):");
    console.log(hash);
    console.log(`\nLength: ${hash.length} (if not 60, something went wrong)`);
    console.log("\nOption A — double quotes (stops $ from being eaten by some loaders):");
    console.log(`ADMIN_PASSWORD_HASH="${hash}"`);
    const b64 = Buffer.from(hash, "utf8").toString("base64");
    console.log("\nOption B — base64 (no $ characters; use this if length in logs is still ~25):");
    console.log(`ADMIN_PASSWORD_HASH_B64=${b64}`);
    console.log("\nThen restart: npm run dev");
    rl.close();
  } catch (error) {
    console.error("Error generating hash:", error);
    rl.close();
  }
});
