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

exports.createTaskFile = async (folderId, taskName) => {
  const fileMetadata = {
    name: taskName,
    mimeType: "application/vnd.google-apps.document",
    parents: [folderId], // Place the file inside the project folder
  };

  const file = await drive.files.create({
    resource: fileMetadata,
    fields: "id, webViewLink",
  });

  const fileId = file.data.id;
  const fileLink = file.data.webViewLink;

  await drive.permissions.create({
    fileId: folderId,
    resource: {
      role: "writer", // Anyone can read the folder
      type: "anyone", // Available to anyone
    },
  });

  // Save fileId and fileLink in MongoDB associated with the task
  return { fileId, fileLink };
};

exports.getFileCount = async (folderId) => {
  console.log("inside file count- folder id: ", folderId)
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false`,
    fields: 'files(id)', // We only need the file IDs, not the full file details
  });

  const files = res.data.files;
  console.log("files: ", files)
  return files.length;
}
