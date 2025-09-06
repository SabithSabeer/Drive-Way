const bcrypt = require('bcrypt');

async function generateHash() {
  const password = 'admin123'; // your admin password
  const hash = await bcrypt.hash(password, 12);
  console.log(hash); // Copy this hash
}

generateHash();
