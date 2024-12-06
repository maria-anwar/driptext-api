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

exports.freelancerInvoiceSpreadSheet = async (spreadsheetId) => {
  const sheetsClient = google.sheets({ version: "v4", auth });

  // 1. Create a new spreadsheet for the invoice
  // const createSheetResponse = await sheetsClient.spreadsheets.create({
  //   resource: {
  //     properties: {
  //       title: `Design Freelancer Invoice`,
  //     },
  //   },
  // });

  // const spreadsheetId = createSheetResponse.data.spreadsheetId;

  console.log("spreadsheet id: ", spreadsheetId);

  // Hardcoded layout as per the template
  const values = [
    // Header
    ["", "", "", "", "", "", ""],
    ["", "", "", "", "", "", ""],
    [
      `       DripText Ltd. - Makariou Avenue 59, 3rd Floor, Office 301 - 6017 Larnaca, Cyprus`,
      "",
      "",
      "",
      "",
      "",
      "",
    ],
    ["", "", "", "", "", "", ""],
    ["", "", "", "", "", "", ""],
    ["", "", "", "", "Credit No: ", `Credit No`],
    ["", "", "", "", "Date: ", `Date`],
    ["", "", "", "", "Performance Period: ", `performance period`],
    ["Company", "", "", "", "", "", ""],
    ["City", "", "", "", "", "", ""],
    ["Street", "", "", "", "", "", ""],
    [`VAT: vat`, "", "", "", "", "", ""],

    // Column Headers for Items
    ["", "Pos. Description", "", "", "", ""],

    // Items (example hardcoded items)
    ["", "", "", "", "", ""],
    // [1, "Service A", "", 2, 100, 200],

    // Totals
    ["", "", "", "", "", `Subtotal: subtotal`],
    ["", "", "", "", "", `VAT: vat`],
    ["", "", "", "", "", `Total:`],
    ["", "", "", "", "", "", ""],

    // Footer (bank account details)
    ["", "vat description", "", "", "", ""],
    ["", "", "", "", "", "", ""],
    ["", "", "", "", "", "", ""],

    [
      "DripText Ltd.: Contact Bank Account: Makariou Avenue 59,3rd Floor, Office 301 hallo@driptext.de DripText Ltd.",
      "",
      "",
      "",
      "",
      "",
      "",
    ],
    [
      "6017 Laranaca,Cyprus Accounting: IBAN: LT53 3250 0668 1851 9925 VAT:CY10424462P backoffice@driptext.de BIC: REVOLT21",
      "",
      "",
      "",
      "",
      "",
      "",
    ],

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
        // removing other cells
        {
          deleteDimension: {
            range: {
              sheetId: 0, // Assuming it's the first sheet; replace with your sheet ID
              dimension: "COLUMNS",
              startIndex: 7, // Column H (0-indexed)
            },
          },
        },
        // Every cell of sheet text wrap
        {
          repeatCell: {
            range: {
              sheetId: 0, // Replace with your sheet ID
            },
            cell: {
              userEnteredFormat: {
                wrapStrategy: "WRAP", // Enable text wrapping
              },
            },
            fields: "userEnteredFormat.wrapStrategy",
          },
        },
        // Merge Top Line
        {
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 2,
              endRowIndex: 3,
              startColumnIndex: 0,
              endColumnIndex: 6,
            },
            mergeType: "MERGE_ALL",
          },
        },

        {
          repeatCell: {
            range: {
              sheetId: 0, // Replace with your sheet ID
              startRowIndex: 2, // Start row index of merged cells
              endRowIndex: 3, // End row index of merged cells
              startColumnIndex: 0, // Start column index of merged cells
              endColumnIndex: 6, // End column index of merged cells
            },
            cell: {
              userEnteredFormat: {
                horizontalAlignment: "LEFT", // Align text to the left
                textFormat: {
                  fontSize: 8, // Optional: Adjust font size
                },
              },
            },
            fields: "userEnteredFormat(horizontalAlignment,textFormat)",
          },
        },

        

        // widths of columns
        // Set width for column A (0)
        {
          updateDimensionProperties: {
            range: {
              sheetId: 0, // Replace with your sheet ID
              dimension: "COLUMNS",
              startIndex: 0,
              endIndex: 1,
            },
            properties: {
              pixelSize: 100, // Width for column A
            },
            fields: "pixelSize",
          },
        },
        // Set width for column B (1)
        {
          updateDimensionProperties: {
            range: {
              sheetId: 0, // Replace with your sheet ID
              dimension: "COLUMNS",
              startIndex: 1,
              endIndex: 2,
            },
            properties: {
              pixelSize: 120, // Width for column B
            },
            fields: "pixelSize",
          },
        },
        // Set width for column C (2)
        {
          updateDimensionProperties: {
            range: {
              sheetId: 0, // Replace with your sheet ID
              dimension: "COLUMNS",
              startIndex: 2,
              endIndex: 3,
            },
            properties: {
              pixelSize: 130, // Width for column C
            },
            fields: "pixelSize",
          },
        },
        // Set width for column D (3)
        {
          updateDimensionProperties: {
            range: {
              sheetId: 0, // Replace with your sheet ID
              dimension: "COLUMNS",
              startIndex: 3,
              endIndex: 4,
            },
            properties: {
              pixelSize: 140, // Width for column D
            },
            fields: "pixelSize",
          },
        },
        // Set width for column E (4)
        {
          updateDimensionProperties: {
            range: {
              sheetId: 0, // Replace with your sheet ID
              dimension: "COLUMNS",
              startIndex: 4,
              endIndex: 5,
            },
            properties: {
              pixelSize: 150, // Width for column E
            },
            fields: "pixelSize",
          },
        },
        // Set width for column F (5)
        {
          updateDimensionProperties: {
            range: {
              sheetId: 0, // Replace with your sheet ID
              dimension: "COLUMNS",
              startIndex: 5,
              endIndex: 6,
            },
            properties: {
              pixelSize: 160, // Width for column F
            },
            fields: "pixelSize",
          },
        },
        // Set width for column G (6)
        {
          updateDimensionProperties: {
            range: {
              sheetId: 0, // Replace with your sheet ID
              dimension: "COLUMNS",
              startIndex: 6,
              endIndex: 7,
            },
            properties: {
              pixelSize: 170, // Width for column G
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

  // const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=pdf&portrait=true&gid=0&gridlines=false`;
  const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=0`;

  return sheetUrl;
};

exports.createInvoiceInGoogleSheets = async (invoiceData) => {
  const sheetsClient = google.sheets({ version: "v4", auth });

  // 1. Create a new spreadsheet for the invoice
  const createSheetResponse = await sheetsClient.spreadsheets.create({
    resource: {
      properties: {
        title: `${invoiceData.creditNo}`,
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
    ["", "", "", "", "Credit No: ", `${invoiceData.creditNo}`],
    ["", "", "", "", "Date: ", `${invoiceData.date}`],
    [
      "",
      "",
      "",
      "",
      "Performance Period: ",
      `${invoiceData.performancePeriod}`,
    ],
    [invoiceData.company, "", "", "", "", "", ""],
    [invoiceData.city, "", "", "", "", "", ""],
    [invoiceData.street, "", "", "", "", "", ""],
    [
      `VAT: ${
        invoiceData?.vatId || invoiceData.vatId.toString() === "null"
          ? "No VAT-Id Given"
          : invoiceData?.vatId
      }`,
      "",
      "",
      "",
      "",
      "",
      "",
    ],

    // Column Headers for Items
    ["", "Pos. Description", "", "", "", ""],

    // Items (example hardcoded items)
    ...invoiceData.items.map((item, index) => [
      "", // Position
      `${index + 1} ${item.description}`,
      "",
      "",
      "",
      "",
    ]),
    // [1, "Service A", "", 2, 100, 200],

    // Totals
    [
      "",
      "",
      "",
      "",
      "",
      `Subtotal: ${Number(invoiceData.subtotal).toFixed(2)}`,
    ],
    ["", "", "", "", "", `VAT: ${Number(invoiceData.vat).toFixed(2)}`],
    ["", "", "", "", "", `Total: ${Number(invoiceData.total).toFixed(2)}`],
    ["", "", "", "", "", "", ""],

    // Footer (bank account details)
    ["", invoiceData.vatDescription, "", "", "", ""],
    ["", "", "", "", "", "", ""],
    ["", "", "", "", "", "", ""],

    [
      "DripText Ltd.: Contact Bank Account: Makariou Avenue 59,3rd Floor, Office 301 hallo@driptext.de DripText Ltd.",
      "",
      "",
      "",
      "",
      "",
      "",
    ],
    [
      "6017 Laranaca,Cyprus Accounting: IBAN: LT53 3250 0668 1851 9925 VAT:CY10424462P backoffice@driptext.de BIC: REVOLT21",
      "",
      "",
      "",
      "",
      "",
      "",
    ],

    // ["DripText Ltd.:", "", "", "Contact", "", "Bank Account:"],
    // [
    //   "Makariou Avenue 59,3rd Floor, Office 301",
    //   "",
    //   "",
    //   "hallo@driptext.de",
    //   "",
    //   "DripText Ltd.",
    // ],
    // [
    //   "6017 Laranaca,Cyprus",
    //   "",
    //   "",
    //   "Accounting:",
    //   "",
    //   "IBAN: LT53 3250 0668 1851 9925",
    // ],
    // ["VAT:CY10424462P", "", "", "backoffice@driptext.de", "", "BIC: REVOLT21"],
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
                // backgroundColor: {
                //   red: 0.8,
                //   green: 0.8,
                //   blue: 0.8,
                // },
                // horizontalAlignment: "LEFT",

                textFormat: {
                  bold: true,
                },
              },
            },
            fields: "userEnteredFormat(textFormat.bold)",
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
                horizontalAlignment: "RIGHT",

                textFormat: {
                  bold: true,
                },
              },
            },
            fields: "userEnteredFormat(horizontalAlignment,textFormat.bold)",
          },
        },
        {
          repeatCell: {
            range: {
              sheetId: 0,
              startRowIndex: 4,
              endRowIndex: 7,
              startColumnIndex: 4,
              endColumnIndex: 5,
            },
            cell: {
              userEnteredFormat: {
                // backgroundColor: {
                //   red: 0.8,
                //   green: 0.8,
                //   blue: 0.8,
                // },
                horizontalAlignment: "RIGHT",

                // textFormat: {
                //   bold: true,
                // },
              },
            },
            fields: "userEnteredFormat(horizontalAlignment)",
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

  const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=pdf&portrait=true&gid=0&gridlines=false`;
  const obj = await exportFinishedTasks(
    invoiceData.tasks,
    invoiceData.clientName
  );
  // const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=0`;
  return {
    invoice: sheetUrl,
    tasks: obj.tasksPdf,
    tasksSheet: obj.tasksGoogleSheet,
  };
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

const exportFinishedTasks = async (tasks, freelancerName) => {
  console.log("inside export finished tasks function");
  const lastMonth = dayjs().subtract(1, "month").format("MMMM YYYY");

  // Step 1: Create the Google Sheet
  const request = {
    resource: {
      properties: {
        title: `Finished Tasks In ${lastMonth} By ${freelancerName}`,
      },
    },
    fields: "spreadsheetId",
  };

  const createResponse = await sheets.spreadsheets.create(request);
  const spreadsheetId = createResponse.data.spreadsheetId;

  // Step 2: Prepare Task Data
  const taskData = tasks.map((task, index) => [
    task.finishedDate ? dayjs(task.finishedDate).format("DD.MM.YYYY") : "",
    task.role,
    task.keywords || "",
    task.status || "",
    task.type || "",
    task.desiredNumberOfWords || "",
    task.actualNumberOfWords || "",
    task?.calculatedWords,
  ]);

  const title = `Finished Tasks In ${lastMonth} By ${freelancerName}`;

  // Prepare data with heading
  const values = [
    [title],
    [],
    [
      "Finished Date",
      "Role",
      "Keywords",
      "Status",
      "Type",
      "Expec. Words",
      "Actual Words",
      "Billed Words",
    ], // Headers
    ...taskData,
  ];

  // Step 3: Update the Google Sheet with data
  const updateRequest = {
    spreadsheetId,
    range: "Sheet1!A1",
    valueInputOption: "RAW",
    resource: { values },
  };

  await sheets.spreadsheets.values.update(updateRequest);

  // Step 4: Apply Bold Formatting to the Header Row
  const batchUpdateRequest = {
    spreadsheetId,
    resource: {
      requests: [
        // Merge cells in the first row to span all columns
        {
          mergeCells: {
            range: {
              sheetId: 0, // Default sheet is Sheet1 with ID 0
              startRowIndex: 0, // Title row
              endRowIndex: 1,
              startColumnIndex: 0, // Start from the first column
              endColumnIndex: 8, // Adjust this to match the number of columns (8 for example)
            },
            mergeType: "MERGE_ALL",
          },
        },
        {
          repeatCell: {
            range: {
              sheetId: 0,
              startRowIndex: 0, // Title row after merging
              endRowIndex: 1,
              startColumnIndex: 0,
              endColumnIndex: 8, // Same as the number of columns to apply format
            },
            cell: {
              userEnteredFormat: {
                horizontalAlignment: "CENTER",
                wrapStrategy: "WRAP",
                textFormat: {
                  bold: true,
                  fontSize: 16, // Adjust font size as needed
                },
              },
              userEnteredValue: {
                stringValue: title,
              },
            },
            fields:
              "userEnteredFormat(horizontalAlignment, wrapStrategy, textFormat), userEnteredValue",
          },
        },
        {
          repeatCell: {
            range: {
              sheetId: 0,
              startRowIndex: 2, // Header row
              endRowIndex: 3,
              startColumnIndex: 0,
              endColumnIndex: 8, // Apply to header columns as needed
            },
            cell: {
              userEnteredFormat: {
                horizontalAlignment: "CENTER",
                wrapStrategy: "WRAP",
                textFormat: {
                  bold: true,
                  fontSize: 10,
                },
              },
            },
            fields:
              "userEnteredFormat(horizontalAlignment, wrapStrategy, textFormat)",
          },
        },
        {
          repeatCell: {
            range: {
              sheetId: 0,
              startRowIndex: 3, // Start from the first task row
              endRowIndex: values.length,
              startColumnIndex: 0,
              endColumnIndex: 8, // Adjust this if you have more columns
            },
            cell: {
              userEnteredFormat: {
                horizontalAlignment: "CENTER",
                wrapStrategy: "WRAP",
                textFormat: {
                  fontSize: 10, // Adjust font size as needed
                },
              },
            },
            fields:
              "userEnteredFormat(horizontalAlignment, wrapStrategy, textFormat)",
          },
        },
      ],
    },
  };

  await sheets.spreadsheets.batchUpdate(batchUpdateRequest);

  // Step 5: Make the Google Sheet Publicly Accessible
  const driveClient = google.drive({ version: "v3", auth });
  await driveClient.permissions.create({
    fileId: spreadsheetId,
    resource: {
      role: "reader",
      type: "anyone",
    },
  });

  // Step 6: Export Links
  const tasksGoogleSheet = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  const tasksPdf = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=pdf&portrait=true&gid=0&gridlines=false`;

  return {
    tasksPdf,
    tasksGoogleSheet,
  };
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
    task.dueDate ? dayjs(task.dueDate).format("DD.MM.YYYY") : "",
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
  const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

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
