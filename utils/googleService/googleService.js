const { google } = require("googleapis");
const path = require("path");

// Initialize Google Auth and Drive/Docs API instances
const auth = new google.auth.GoogleAuth({
  keyFile: path.resolve(__dirname, "./googleService_credentials.json"), // Update with your service account key file path
  scopes: ["https://www.googleapis.com/auth/drive"],
});

const drive = google.drive({ version: "v3", auth });
const docs = google.docs({ version: "v1", auth });

// Export drive and docs so that they can be used in other files
module.exports = { drive, docs };
