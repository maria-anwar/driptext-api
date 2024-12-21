const bcrypt = require("bcrypt");

// Hash a password
const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

// Verify a password
const verifyPassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

module.exports = { hashPassword, verifyPassword };
