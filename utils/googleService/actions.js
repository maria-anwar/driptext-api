const dayjs = require("dayjs");
const { drive, docs, sheets, auth } = require("./googleService");
const { google } = require("googleapis");

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

exports.createInvoiceInGoogleSheets = async (invoiceData) => {
  const sheetsClient = google.sheets({ version: "v4", auth });

  // 1. Create a new spreadsheet for the invoice
  const createSheetResponse = await sheetsClient.spreadsheets.create({
    resource: {
      properties: {
        title: `Invoice ${invoiceData.creditNo}`,
      },
    },
  });

  const spreadsheetId = createSheetResponse.data.spreadsheetId;

  // Hardcoded layout as per the template
  const values = [
    // Header
    ["", "", "", "", "", "", ""],
    [
      "DripText Ltd. – Poseidonos Ave 47, Limnaria Westblock A2, Office 25",
      "",
      "",
      "",
      "",
      "",
      "",
    ],
    ["", "", "", "", "", "", ""],
    ["", "", "", "", "", "", ""],
    ["", "", "", "Credit No:", "", invoiceData.creditNo],
    ["", "", "", "Date:", "", invoiceData.date],
    ["", "", "", "Performance Period:", "", "01.08.2023-31.08.2023"],
    ["Julia Schmitt Ltd", "", "", "", "", "", ""],
    ["Eptakomis 1", "", "", "", "", "", ""],
    ["7100 Aradippou, Cyprus", "", "", "", "", "", ""],
    ["VAT: CY10430062", "", "", "", "", "", ""],

    // Column Headers for Items
    ["Pos.", "Description", "", "Amount", "Price", "Total"],

    // Items (example hardcoded items)
    [1, "Service A", "", 2, 100, 200],

    // Totals
    ["", "", "", "Subtotal", "", 850],
    ["", "", "", "VAT", "", 0],
    ["", "", "", "Total", "", 850],
    ["", "", "", "", "", "", ""],

    // Footer (bank account details)
    [
      "",
      "No VAT as the service is not taxed in the domestic market.",
      "",
      "",
      "",
      "",
    ],
    ["", "", "", "", "", "", ""],
    // ["", "", "", "", "", "", ""],

    // Footer (bank account details)
    [
      "",
      "No VAT as the service is not taxed in the domestic market.",
      "",
      "",
      "",
      "",
    ],
    ["", "", "", "", "", "", ""],
    // ["", "", "", "", "", "", ""],

    // Footer (bank account details)
    [
      "",
      "No VAT as the service is not taxed in the domestic market.",
      "",
      "",
      "",
      "",
    ],
    ["", "", "", "", "", "", ""],

    ["DripText Ltd.:", "", "", "Contact", "", "Bank Account:"],
    [
      "Makariou Avenue 59,3rd Floor, Office 301",
      "",
      "",
      "hallo@driptext.de",
      "",
      "DripText Ltd.",
    ],
    [
      "6017 Laranaca,Cyprus",
      "",
      "",
      "Accounting:",
      "",
      "IBAN: LT53 3250 0668 1851 9925",
    ],
    ["VAT:CY10424462P", "", "", "backoffice@driptext.de", "", "BIC: REVOLT21"],
  ];

  const updateValuesRequest = {
    spreadsheetId: spreadsheetId,
    range: "Sheet1!A1",
    valueInputOption: "RAW",
    resource: { values },
  };
  await sheetsClient.spreadsheets.values.update(updateValuesRequest);

  // 2. Format the spreadsheet
  const formatRequest = {
    spreadsheetId: spreadsheetId,
    resource: {
      requests: [
        // Merge Cells for the Address Header
        {
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 1,
              endRowIndex: 2,
              startColumnIndex: 0,
              endColumnIndex: 7,
            },
            mergeType: "MERGE_ALL",
          },
        },
        // Merge Cells for the Company Name
        // {
        //   mergeCells: {
        //     range: {
        //       sheetId: 0,
        //       startRowIndex: 4,
        //       endRowIndex: 5,
        //       startColumnIndex: 0,
        //       endColumnIndex: 7,
        //     },
        //     mergeType: "MERGE_ALL",
        //   },
        // },
        // Set background for "Pos." header
        {
          repeatCell: {
            range: {
              sheetId: 0,
              startRowIndex: 11,
              endRowIndex: 12,
              startColumnIndex: 0,
              endColumnIndex: 6,
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: {
                  red: 0.8,
                  green: 0.8,
                  blue: 0.8,
                },
                textFormat: {
                  bold: true,
                },
              },
            },
            fields:
              "userEnteredFormat.backgroundColor,userEnteredFormat.textFormat.bold",
          },
        },
        // Set background for "Pos." header
        {
          repeatCell: {
            range: {
              sheetId: 0,
              startRowIndex: 13,
              endRowIndex: 16,
              startColumnIndex: 3,
              endColumnIndex: 6,
            },
            cell: {
              userEnteredFormat: {
                // backgroundColor: {
                //   red: 0.8,
                //   green: 0.8,
                //   blue: 0.8,
                // },
                textFormat: {
                  bold: true,
                },
              },
            },
            fields:
              "userEnteredFormat.textFormat.bold",
          },
        },
        // Add borders for item list and totals
        {
          updateBorders: {
            range: {
              sheetId: 0,
              startRowIndex: 12,
              endRowIndex: 13, // Adjust based on number of items
              startColumnIndex: 0,
              endColumnIndex: 6,
            },
            top: { style: "SOLID" },
            bottom: { style: "SOLID" },
            // left: { style: "SOLID" },
            // right: { style: "SOLID" },
          },
        },
        // Footer Formatting (Bank details)
        {
          repeatCell: {
            range: {
              sheetId: 0,
              startRowIndex: 11,
              endRowIndex: 12,
              startColumnIndex: 0,
              endColumnIndex: 6,
            },
            cell: {
              userEnteredFormat: {
                horizontalAlignment: "RIGHT",
              },
            },
            fields: "userEnteredFormat.horizontalAlignment",
          },
        },
        // Resize columns for the layout
        {
          updateDimensionProperties: {
            range: {
              sheetId: 0,
              dimension: "COLUMNS",
              startIndex: 0,
              endIndex: 6,
            },
            properties: {
              pixelSize: 120, // Adjust width based on your needs
            },
            fields: "pixelSize",
          },
        },
      ],
    },
  };

  await sheetsClient.spreadsheets.batchUpdate(formatRequest);

  // 3. Set view-only permissions
  const driveClient = google.drive({ version: "v3", auth });
  await driveClient.permissions.create({
    fileId: spreadsheetId,
    resource: {
      role: "reader",
      type: "anyone",
    },
  });

  const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/view`;
  return sheetUrl;
};



exports.getFileCount = async (folderId) => {
  console.log("inside file count- folder id: ", folderId);
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false`,
    fields: "files(id)", // We only need the file IDs, not the full file details
  });

  const files = res.data.files;
  console.log("files: ", files);
  return files.length;
};

exports.findOrCreateFolderInParent = async (parentFolderId, folderName) => {
  try {
    // List the files in the parent folder to check if the folder already exists
    const response = await drive.files.list({
      q: `'${parentFolderId}' in parents and name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: "files(id, name)",
      spaces: "drive",
    });

    // If the folder already exists, return its ID
    if (response.data.files.length > 0) {
      console.log(
        `Folder "${folderName}" already exists with ID: ${response.data.files[0].id}`
      );
      return response.data.files[0].id;
    }

    // If the folder doesn't exist, create it
    const fileMetadata = {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentFolderId],
    };

    const newFolder = await drive.files.create({
      resource: fileMetadata,
      fields: "id",
    });

    console.log(`Folder "${folderName}" created with ID: ${newFolder.data.id}`);
    return newFolder.data.id;
  } catch (error) {
    console.error("Error finding or creating folder:", error);
  }
};

exports.exportTasksToSheetInFolder = async (tasks, folderId) => {
  console.log("inside export tasks function");
  // console.log(
  //   "sample",
  //   tasks[0].keywords || "",
  //   tasks[0].dueDate ? dayjs(tasks[0].dueDate).format("YYYY-MM-DD") : "",
  //   tasks[0].topic || "",
  //   tasks[0].type || "",
  //   tasks[0].onBoarding.companyBackgorund || "",
  //   tasks[0].onBoarding.companyAttributes || "",
  //   tasks[0].onBoarding.companyServices || "",
  //   tasks[0].onBoarding.customerContent || "",
  //   tasks[0].onBoarding.customerIntrest || "",
  //   tasks[0].onBoarding.contentPurpose || "",
  //   tasks[0].onBoarding.contentInfo || ""
  // );
  // Step 1: Create a new Google Sheet in the specific folder
  const request = {
    resource: {
      properties: {
        title: "Project Tasks Export",
      },
      // parents: [folderId], // Specify the folder ID here to save the file in that folder
    },
    fields: "spreadsheetId",
  };

  const createResponse = await sheets.spreadsheets.create(request);
  const spreadsheetId = createResponse.data.spreadsheetId;

  // Step 2: Retrieve the current parent (root folder) of the spreadsheet
  const fileResponse = await drive.files.get({
    fileId: spreadsheetId,
    fields: "parents",
  });
  const previousParent = fileResponse.data.parents[0]; // Assuming it's in root

  // Step 3: Move the spreadsheet to the desired folder and remove from root folder
  await drive.files.update({
    fileId: spreadsheetId,
    addParents: folderId, // Add to desired folder
    removeParents: previousParent, // Remove from root folder
    fields: "id, parents",
  });

  // Step 2: Write tasks to the sheet
  const taskData = tasks.map((task, index) => [
    task.dueDate ? dayjs(task.dueDate).format("YYYY-MM-DD") : "",
    task.status,
    task.topic || "",
    task.keywords || "",
    task.type || "",
    task.desiredNumberOfWords || "",
  ]);

  const updateRequest = {
    spreadsheetId,
    range: "Sheet1!A1",
    valueInputOption: "RAW",
    resource: {
      values: [
        [
          "Due Date",
          "Status",
          "Topic",
          "Keywords",
          "Type",
          "Word Count Expectation",
        ], // Headers
        ...taskData,
      ],
    },
  };

  await sheets.spreadsheets.values.update(updateRequest);

  // Step 3: Export the Google Sheet as an Excel file (optional)
  const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;

  return { spreadsheetId, exportUrl };
};

exports.getWordCount = async (docId) => {
  try {
    // Fetch the document metadata from Google Docs API
    const doc = await docs.documents.get({
      documentId: docId,
    });

    // Extract the content of the document
    const content = doc.data.body.content;

    // Function to count words
    let wordCount = 0;

    content.forEach((element) => {
      if (element.paragraph) {
        element.paragraph.elements.forEach((elem) => {
          if (elem.textRun && elem.textRun.content) {
            // Split the content to count words
            const words = elem.textRun.content.trim().split(/\s+/);
            wordCount += words.length;
          }
        });
      }
    });

    console.log(`Word Count: ${wordCount}`);
    return wordCount;
  } catch (error) {
    // console.error("Error fetching document:", error);
    throw error;
  }
};
