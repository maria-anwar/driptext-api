const { drive, docs } = require("./googleService");

exports.createFolder = async (folderName) => {
  const fileMetadata = {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder",
  };

  // Create the project folder in Google Drive
  const folder = await drive.files.create({
    resource: fileMetadata,
    fields: "id, webViewLink",
  });

  const folderId = folder.data.id;
  const folderLink = folder.data.webViewLink;

  // Set permissions to make the folder publicly accessible
  await drive.permissions.create({
    fileId: folderId,
    resource: {
      role: "writer", // Anyone can read the folder
      type: "anyone", // Available to anyone
    },
  });

  return {
    folderId,
    folderLink,
  };
};
