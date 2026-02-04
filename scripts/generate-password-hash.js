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
    console.log("\nPassword hash:");
    console.log(hash);
    console.log("\nAdd this to your .env file as ADMIN_PASSWORD_HASH=");
    rl.close();
  } catch (error) {
    console.error("Error generating hash:", error);
    rl.close();
  }
});
