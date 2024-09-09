// const { google } = require("googleapis");

// // Replace with your actual client credentials
// const oauth2Client = new google.auth.OAuth2(
//   "291229389863-gun8uba8bvd9cfkf29en0abaq98icqmd.apps.googleusercontent.com", // Replace with your client ID
//   "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", // Replace with your client secret
//   "http://localhost:5173/oauth2callback" // Replace with your redirect URI, e.g., http://localhost:3000/oauth2callback
// );

// // Generate a URL where you can obtain the authorization code
// const authUrl = oauth2Client.generateAuthUrl({
//   access_type: "offline", // Ensures you get a refresh token
//   scope: ["https://www.googleapis.com/auth/drive.file"], // Example scope: Google Drive file access
// });

// console.log("Authorize this app by visiting this URL:", authUrl);

// // After receiving the authorization code from the callback URL, you exchange it for tokens:
// const getToken = (code) => {
//   oauth2Client.getToken(code, (err, tokens) => {
//     if (err) {
//       return console.error("Error retrieving access token", err);
//     }
//     oauth2Client.setCredentials(tokens);
//     console.log("Access Token and Refresh Token set successfully!");
//   });
// };

// // Export oauth2Client so it can be used in other parts of your application
// module.exports = oauth2Client;
