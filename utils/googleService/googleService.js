// require("dotenv").config();
const { google } = require("googleapis");
const path = require("path");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env.production") });

// Prepare the credentials dynamically using environment variables
const credentials = {
  type: process.env.TYPE,
  project_id: process.env.PROJECT_ID,
  private_key_id: process.env.PRIVATE_KEY_ID,
  private_key: process.env.PRIVATE_KEY, // Ensure proper newlines in the private key
  client_email: process.env.CLIENT_EMAIL,
  client_id: process.env.CLIENT_ID,
  auth_uri: process.env.AUTH_URL,
  token_uri: process.env.TOKEN_URL,
  auth_provider_x509_cert_url: process.env.AUTH_PROVIDER_x509_CERT_URL,
  client_x509_cert_url: process.env.CLIENT_x509_CERT_URL,
  universe_domain: process.env.UNIVERSE_DOMAIN,
};

// console.log("path.resolve: ", path.resolve(process.cwd()));

// console.log("credentials: ", credentials)
// Initialize Google Auth and Drive/Docs API instances
const auth = new google.auth.GoogleAuth({
  credentials,
  // keyFile: path.resolve(__dirname, "./googleService_credentials.json"), // Update with your service account key file path
  scopes: [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/documents",
    "https://www.googleapis.com/auth/spreadsheets",
  ],
});

const drive = google.drive({ version: "v3", auth });
const docs = google.docs({ version: "v1", auth });
const sheets = google.sheets({ version: "v4", auth }); 

// Export drive and docs so that they can be used in other files
module.exports = { drive, docs, sheets, auth };
