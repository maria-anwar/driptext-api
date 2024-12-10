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

exports.getColumnWidth = async () => {
  try {
    const sheetsClient = google.sheets({ version: "v4", auth });
    const response = await sheetsClient.spreadsheets.get({
      spreadsheetId: "18Dgu3yK2pVvRp6t-zUAu7YNuIOw0qR7SgWaeDAdgWVU",
      ranges: [`2024-4-139_Invoice!A1:G1`], // Replace `Sheet1!A1:G1` with your range.
      fields: `sheets.data.columnMetadata.pixelSize`,
    });

    // Check and log the width of the desired column.
    // const columnWidth =
    //   response.result.sheets[0].data[0].columnMetadata[columnIndex].pixelSize;
    return response
  } catch (error) {
    console.log("get column width error: ", error);
  }
};

exports.freelancerInvoiceSpreadSheet = async (spreadsheetIddd) => {
  const sheetsClient = google.sheets({ version: "v4", auth });

  // 1. Create a new spreadsheet for the invoice
  const createSheetResponse = await sheetsClient.spreadsheets.create({
    resource: {
      properties: {
        title: `Design Freelancer Invoice`,
      },
    },
  });

  const spreadsheetId = createSheetResponse.data.spreadsheetId;

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
    ["", "", "", "", "Invoice No: ", "", ""],
    ["Company", "", "", "", "Date: ", "", ""],
    [
      "First name last name",
      "",
      "",
      "",
      "Performance Period: ",
      "",
      "01.03.2024-01.03.2024",
    ],
    ["City", "", "", "", "", "", ""],
    ["Street", "", "", "", "", "", ""],
    ["VAT: vat", "", "", "", "", "", ""],
    ["", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "date"],
    ["", "", "", "", "", "", ""],
    ["", "", "", "", "", "", ""],
    ["Invoice No. 1234", "", "", "", "", "", ""],
    [],
    [],
    [],
    ["Pos", "Description", "", "", "Amount", "Price", "Total"],
    [],
    [
      "1",
      "Content delivered in the performance period",
      "",
      "",
      "1",
      "9,000€",
      "9,000€",
    ],
    [],
    [],
    [],
    [],
    [],
    [],
    ["", "Subtotal", "", "", "", "", "9,000€"],
    [],
    ["", "", "0 %VAT", "", "", "", "0,00€"],
    [],
    ["", "Total", "", "", "", "", "9,000€"],
    [],
    ["Details of created content see attached.", "", "", "", "", "", ""],
    [],
    [
      "No VAT accoroding to Reverse-Charge. Payment is due within 7 days from the date of this invoice.",
      "",
      "",
      "",
      "",
      "",
      "",
    ],
    [],
    [
      "Thank you very much for your trust. We appreciate doing bussiness with you.",
      "",
      "",
      "",
      "",
      "",
      "",
    ],
    [],
    [],
    [],

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
        {
          repeatCell: {
            range: {
              sheetId: 0, // Replace with your sheet ID
              startRowIndex: 0, // Start from the first row (0-indexed)
              endRowIndex: 1000, // Use a large number to cover all rows (adjust as needed)
              startColumnIndex: 6, // Column G (0-indexed)
              endColumnIndex: 7, // Column G (exclusive)
            },
            cell: {
              userEnteredFormat: {
                horizontalAlignment: "RIGHT", // Align text to the right
              },
            },
            fields: "userEnteredFormat.horizontalAlignment",
          },
        },
        // Column G Right Aligned

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
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 5,
              endRowIndex: 6,
              startColumnIndex: 4,
              endColumnIndex: 6,
            },
            mergeType: "MERGE_ALL",
          },
        },
        {
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 6,
              endRowIndex: 7,
              startColumnIndex: 4,
              endColumnIndex: 6,
            },
            mergeType: "MERGE_ALL",
          },
        },
        {
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 7,
              endRowIndex: 8,
              startColumnIndex: 4,
              endColumnIndex: 6,
            },
            mergeType: "MERGE_ALL",
          },
        },
        {
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 6,
              endRowIndex: 7,
              startColumnIndex: 0,
              endColumnIndex: 2,
            },
            mergeType: "MERGE_ALL",
          },
        },
        {
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 7,
              endRowIndex: 8,
              startColumnIndex: 0,
              endColumnIndex: 2,
            },
            mergeType: "MERGE_ALL",
          },
        },
        {
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 8,
              endRowIndex: 9,
              startColumnIndex: 0,
              endColumnIndex: 2,
            },
            mergeType: "MERGE_ALL",
          },
        },
        {
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 9,
              endRowIndex: 10,
              startColumnIndex: 0,
              endColumnIndex: 2,
            },
            mergeType: "MERGE_ALL",
          },
        },
        {
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 10,
              endRowIndex: 11,
              startColumnIndex: 0,
              endColumnIndex: 2,
            },
            mergeType: "MERGE_ALL",
          },
        },
        {
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 15,
              endRowIndex: 16,
              startColumnIndex: 0,
              endColumnIndex: 2,
            },
            mergeType: "MERGE_ALL",
          },
        },
        {
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 19,
              endRowIndex: 20,
              startColumnIndex: 1,
              endColumnIndex: 4,
            },
            mergeType: "MERGE_ALL",
          },
        },
        {
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 20,
              endRowIndex: 21,
              startColumnIndex: 1,
              endColumnIndex: 4,
            },
            mergeType: "MERGE_ALL",
          },
        },
        {
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 21,
              endRowIndex: 22,
              startColumnIndex: 1,
              endColumnIndex: 4,
            },
            mergeType: "MERGE_ALL",
          },
        },
        {
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 34,
              endRowIndex: 35,
              startColumnIndex: 0,
              endColumnIndex: 7,
            },
            mergeType: "MERGE_ALL",
          },
        },
        {
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 36,
              endRowIndex: 37,
              startColumnIndex: 0,
              endColumnIndex: 7,
            },
            mergeType: "MERGE_ALL",
          },
        },
        {
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 38,
              endRowIndex: 39,
              startColumnIndex: 0,
              endColumnIndex: 7,
            },
            mergeType: "MERGE_ALL",
          },
        },
        {
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 42,
              endRowIndex: 43,
              startColumnIndex: 0,
              endColumnIndex: 3,
            },
            mergeType: "MERGE_ALL",
          },
        },
        {
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 43,
              endRowIndex: 44,
              startColumnIndex: 0,
              endColumnIndex: 3,
            },
            mergeType: "MERGE_ALL",
          },
        },
        {
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 44,
              endRowIndex: 45,
              startColumnIndex: 0,
              endColumnIndex: 3,
            },
            mergeType: "MERGE_ALL",
          },
        },
        {
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 45,
              endRowIndex: 46,
              startColumnIndex: 0,
              endColumnIndex: 3,
            },
            mergeType: "MERGE_ALL",
          },
        },
        {
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 42,
              endRowIndex: 43,
              startColumnIndex: 3,
              endColumnIndex: 5,
            },
            mergeType: "MERGE_ALL",
          },
        },
        {
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 43,
              endRowIndex: 44,
              startColumnIndex: 3,
              endColumnIndex: 5,
            },
            mergeType: "MERGE_ALL",
          },
        },
        {
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 44,
              endRowIndex: 45,
              startColumnIndex: 3,
              endColumnIndex: 5,
            },
            mergeType: "MERGE_ALL",
          },
        },
        {
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 45,
              endRowIndex: 46,
              startColumnIndex: 3,
              endColumnIndex: 5,
            },
            mergeType: "MERGE_ALL",
          },
        },
        {
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 42,
              endRowIndex: 43,
              startColumnIndex: 5,
              endColumnIndex: 7,
            },
            mergeType: "MERGE_ALL",
          },
        },
        {
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 43,
              endRowIndex: 44,
              startColumnIndex: 5,
              endColumnIndex: 7,
            },
            mergeType: "MERGE_ALL",
          },
        },
        {
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 44,
              endRowIndex: 45,
              startColumnIndex: 5,
              endColumnIndex: 7,
            },
            mergeType: "MERGE_ALL",
          },
        },
        {
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 45,
              endRowIndex: 46,
              startColumnIndex: 5,
              endColumnIndex: 7,
            },
            mergeType: "MERGE_ALL",
          },
        },
        {
          repeatCell: {
            range: {
              sheetId: 0, // Replace with your sheet ID
              startRowIndex: 42, // Start from the first row (0-indexed)
              endRowIndex: 46, // Use a large number to cover all rows (adjust as needed)
              startColumnIndex: 0, // Column G (0-indexed)
              endColumnIndex: 7, // Column G (exclusive)
            },
            cell: {
              userEnteredFormat: {
                
                textFormat: {
                 
                 
                  foregroundColor: {
                    red: 0.6, // Light gray color for the font
                    green: 0.6,
                    blue: 0.6,
                  },
                },
              },
            },
            fields:
              ",userEnteredFormat.textFormat",
          },
        },
        {
          repeatCell: {
            range: {
              sheetId: 0, // Replace with your sheet ID
              startRowIndex: 19, // Start from the first row (0-indexed)
              endRowIndex: 20, // Use a large number to cover all rows (adjust as needed)
              startColumnIndex: 0, // Column G (0-indexed)
              endColumnIndex: 7, // Column G (exclusive)
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: {
                  red: 0.8, // Gray color (0.5, 0.5, 0.5 for gray)
                  green: 0.8,
                  blue: 0.8,
                },
                textFormat: {
                  bold: true, // Make text bold
                },
              },
            },
            fields:
              "userEnteredFormat.backgroundColor,userEnteredFormat.textFormat",
          },
        },
        {
          repeatCell: {
            range: {
              sheetId: 0, // Replace with your sheet ID
              startRowIndex: 32, // Start from the first row (0-indexed)
              endRowIndex: 33, // Use a large number to cover all rows (adjust as needed)
              startColumnIndex: 0, // Column G (0-indexed)
              endColumnIndex: 7, // Column G (exclusive)
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: {
                  red: 0.8, // Gray color (0.5, 0.5, 0.5 for gray)
                  green: 0.8,
                  blue: 0.8,
                },
                textFormat: {
                  bold: true, // Make text bold
                },
              },
            },
            fields:
              "userEnteredFormat.backgroundColor,userEnteredFormat.textFormat",
          },
        },
        {
          repeatCell: {
            range: {
              sheetId: 0, // Replace with your sheet ID
              startRowIndex: 15, // Start from the first row (0-indexed)
              endRowIndex: 16, // Use a large number to cover all rows (adjust as needed)
              startColumnIndex: 0, // Column G (0-indexed)
              endColumnIndex: 1, // Column G (exclusive)
            },
            cell: {
              userEnteredFormat: {
                horizontalAlignment: "LEFT", // Align text to the right
                textFormat: {
                  bold: true, // Make text bold
                },
              },
            },
            fields:
              "userEnteredFormat.horizontalAlignment,userEnteredFormat.textFormat",
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
              pixelSize: 60, // Width for column A
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
              pixelSize: 100, // Width for column B
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
              pixelSize: 100, // Width for column C
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
              pixelSize: 180, // Width for column D
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
              pixelSize: 77, // Width for column E
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
              pixelSize: 69, // Width for column F
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
              pixelSize: 145, // Width for column G
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
        title: `Invoice-${invoiceData.invoiceNo}`,
      },
    },
  });

  const spreadsheetId = createSheetResponse.data.spreadsheetId;
  let vatName = ''
  let vatDescription = ''

  if (invoiceData.vat === 0) {
    vatName = "0 %VAT";
    vatDescription =
      "No VAT accoroding to Reverse-Charge. Payment is due within 7 days from the date of this invoice.";
  }
  if (invoiceData.vat > 0) {
    vatName = "19% VAT"
    vatDescription = "VAT CY Ltd (19%)";
  }

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
    [
      "",
      "",
      "",
      "",
      "Invoice No: ",
      "",
      `${dayjs().year()}-${dayjs().month() + 1}-${invoiceData.invoiceNo}`,
    ],
    [
      invoiceData.company,
      "",
      "",
      "",
      "Date: ",
      "",
      dayjs().format("DD.MM.YYYY"),
    ],
    [
      invoiceData.clientName,
      "",
      "",
      "",
      "Performance Period: ",
      "",
      invoiceData.performancePeriod,
    ],
    [invoiceData.city, "", "", "", "", "", ""],
    [invoiceData.street, "", "", "", "", "", ""],
    [
      `VAT: ${
        invoiceData?.vatId === "null"
          ? "No Vat Id Given"
          : invoiceData.invoiceNo
      }`,
      "",
      "",
      "",
      "",
      "",
      "",
    ],
    ["", "", "", "", "", "", ""],
    ["", "", "", "", "", "", dayjs().format("DD.MM.YYYY")],
    ["", "", "", "", "", "", ""],
    ["", "", "", "", "", "", ""],
    [
      `Invoice No. ${dayjs().year()}-${dayjs().month() + 1}-${
        invoiceData.invoiceNo
      }`,
      "",
      "",
      "",
      "",
      "",
      "",
    ],
    [],
    [],
    [],
    ["Pos", "Description", "", "", "Tasks", "Price", "Total"],
    [],
    ...invoiceData.items.map((item) => [
      "1",
      item.description,
      "",
      "",
      item.amount,
      `${Number(item.price).toFixed(2)}€`,
      `${Number(item.total).toFixed(2)}€`,
    ]),
    // [
    //   "1",
    //   "Content delivered in the performance period",
    //   "",
    //   "",
    //   "1",
    //   "9,000€",
    //   "9,000€",
    // ],
    [],
    [],
    [],
    [],
    [],
    [],
    [
      "",
      "Subtotal",
      "",
      "",
      "",
      "",
      `${Number(invoiceData.subtotal).toFixed(2)}€`,
    ],
    [],
    ["", "", vatName, "", "", "", `${Number(invoiceData.vat).toFixed(2)}€`],
    [],
    ["", "Total", "", "", "", "", `${Number(invoiceData.total).toFixed(2)}€`],
    [],
    ["Details of created content see attached.", "", "", "", "", "", ""],
    [],
    [vatDescription, "", "", "", "", "", ""],
    [],
    [
      "Thank you very much for your trust. We appreciate doing bussiness with you.",
      "",
      "",
      "",
      "",
      "",
      "",
    ],
    [],
    [],
    [],

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
        {
          repeatCell: {
            range: {
              sheetId: 0, // Replace with your sheet ID
              startRowIndex: 0, // Start from the first row (0-indexed)
              endRowIndex: 1000, // Use a large number to cover all rows (adjust as needed)
              startColumnIndex: 6, // Column G (0-indexed)
              endColumnIndex: 7, // Column G (exclusive)
            },
            cell: {
              userEnteredFormat: {
                horizontalAlignment: "RIGHT", // Align text to the right
              },
            },
            fields: "userEnteredFormat.horizontalAlignment",
          },
        },
        // Column G Right Aligned

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
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 5,
              endRowIndex: 6,
              startColumnIndex: 4,
              endColumnIndex: 6,
            },
            mergeType: "MERGE_ALL",
          },
        },
        {
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 6,
              endRowIndex: 7,
              startColumnIndex: 4,
              endColumnIndex: 6,
            },
            mergeType: "MERGE_ALL",
          },
        },
        {
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 7,
              endRowIndex: 8,
              startColumnIndex: 4,
              endColumnIndex: 6,
            },
            mergeType: "MERGE_ALL",
          },
        },
        {
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 6,
              endRowIndex: 7,
              startColumnIndex: 0,
              endColumnIndex: 2,
            },
            mergeType: "MERGE_ALL",
          },
        },
        {
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 7,
              endRowIndex: 8,
              startColumnIndex: 0,
              endColumnIndex: 2,
            },
            mergeType: "MERGE_ALL",
          },
        },
        {
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 8,
              endRowIndex: 9,
              startColumnIndex: 0,
              endColumnIndex: 2,
            },
            mergeType: "MERGE_ALL",
          },
        },
        {
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 9,
              endRowIndex: 10,
              startColumnIndex: 0,
              endColumnIndex: 2,
            },
            mergeType: "MERGE_ALL",
          },
        },
        {
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 10,
              endRowIndex: 11,
              startColumnIndex: 0,
              endColumnIndex: 2,
            },
            mergeType: "MERGE_ALL",
          },
        },
        {
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 15,
              endRowIndex: 16,
              startColumnIndex: 0,
              endColumnIndex: 2,
            },
            mergeType: "MERGE_ALL",
          },
        },
        {
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 19,
              endRowIndex: 20,
              startColumnIndex: 1,
              endColumnIndex: 4,
            },
            mergeType: "MERGE_ALL",
          },
        },
        {
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 20,
              endRowIndex: 21,
              startColumnIndex: 1,
              endColumnIndex: 4,
            },
            mergeType: "MERGE_ALL",
          },
        },
        {
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 21,
              endRowIndex: 22,
              startColumnIndex: 1,
              endColumnIndex: 4,
            },
            mergeType: "MERGE_ALL",
          },
        },
        {
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 34,
              endRowIndex: 35,
              startColumnIndex: 0,
              endColumnIndex: 7,
            },
            mergeType: "MERGE_ALL",
          },
        },
        {
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 36,
              endRowIndex: 37,
              startColumnIndex: 0,
              endColumnIndex: 7,
            },
            mergeType: "MERGE_ALL",
          },
        },
        {
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 38,
              endRowIndex: 39,
              startColumnIndex: 0,
              endColumnIndex: 7,
            },
            mergeType: "MERGE_ALL",
          },
        },
        {
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 42,
              endRowIndex: 43,
              startColumnIndex: 0,
              endColumnIndex: 3,
            },
            mergeType: "MERGE_ALL",
          },
        },
        {
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 43,
              endRowIndex: 44,
              startColumnIndex: 0,
              endColumnIndex: 3,
            },
            mergeType: "MERGE_ALL",
          },
        },
        {
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 44,
              endRowIndex: 45,
              startColumnIndex: 0,
              endColumnIndex: 3,
            },
            mergeType: "MERGE_ALL",
          },
        },
        {
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 45,
              endRowIndex: 46,
              startColumnIndex: 0,
              endColumnIndex: 3,
            },
            mergeType: "MERGE_ALL",
          },
        },
        {
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 42,
              endRowIndex: 43,
              startColumnIndex: 3,
              endColumnIndex: 5,
            },
            mergeType: "MERGE_ALL",
          },
        },
        {
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 43,
              endRowIndex: 44,
              startColumnIndex: 3,
              endColumnIndex: 5,
            },
            mergeType: "MERGE_ALL",
          },
        },
        {
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 44,
              endRowIndex: 45,
              startColumnIndex: 3,
              endColumnIndex: 5,
            },
            mergeType: "MERGE_ALL",
          },
        },
        {
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 45,
              endRowIndex: 46,
              startColumnIndex: 3,
              endColumnIndex: 5,
            },
            mergeType: "MERGE_ALL",
          },
        },
        {
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 42,
              endRowIndex: 43,
              startColumnIndex: 5,
              endColumnIndex: 7,
            },
            mergeType: "MERGE_ALL",
          },
        },
        {
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 43,
              endRowIndex: 44,
              startColumnIndex: 5,
              endColumnIndex: 7,
            },
            mergeType: "MERGE_ALL",
          },
        },
        {
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 44,
              endRowIndex: 45,
              startColumnIndex: 5,
              endColumnIndex: 7,
            },
            mergeType: "MERGE_ALL",
          },
        },
        {
          mergeCells: {
            range: {
              sheetId: 0,
              startRowIndex: 45,
              endRowIndex: 46,
              startColumnIndex: 5,
              endColumnIndex: 7,
            },
            mergeType: "MERGE_ALL",
          },
        },
        {
          repeatCell: {
            range: {
              sheetId: 0, // Replace with your sheet ID
              startRowIndex: 42, // Start from the first row (0-indexed)
              endRowIndex: 46, // Use a large number to cover all rows (adjust as needed)
              startColumnIndex: 0, // Column G (0-indexed)
              endColumnIndex: 7, // Column G (exclusive)
            },
            cell: {
              userEnteredFormat: {
                textFormat: {
                  foregroundColor: {
                    red: 0.6, // Light gray color for the font
                    green: 0.6,
                    blue: 0.6,
                  },
                },
              },
            },
            fields: ",userEnteredFormat.textFormat",
          },
        },
        {
          repeatCell: {
            range: {
              sheetId: 0, // Replace with your sheet ID
              startRowIndex: 19, // Start from the first row (0-indexed)
              endRowIndex: 20, // Use a large number to cover all rows (adjust as needed)
              startColumnIndex: 0, // Column G (0-indexed)
              endColumnIndex: 7, // Column G (exclusive)
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: {
                  red: 0.8, // Gray color (0.5, 0.5, 0.5 for gray)
                  green: 0.8,
                  blue: 0.8,
                },
                textFormat: {
                  bold: true, // Make text bold
                },
              },
            },
            fields:
              "userEnteredFormat.backgroundColor,userEnteredFormat.textFormat",
          },
        },
        {
          repeatCell: {
            range: {
              sheetId: 0, // Replace with your sheet ID
              startRowIndex: 32, // Start from the first row (0-indexed)
              endRowIndex: 33, // Use a large number to cover all rows (adjust as needed)
              startColumnIndex: 0, // Column G (0-indexed)
              endColumnIndex: 7, // Column G (exclusive)
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: {
                  red: 0.8, // Gray color (0.5, 0.5, 0.5 for gray)
                  green: 0.8,
                  blue: 0.8,
                },
                textFormat: {
                  bold: true, // Make text bold
                },
              },
            },
            fields:
              "userEnteredFormat.backgroundColor,userEnteredFormat.textFormat",
          },
        },
        {
          repeatCell: {
            range: {
              sheetId: 0, // Replace with your sheet ID
              startRowIndex: 15, // Start from the first row (0-indexed)
              endRowIndex: 16, // Use a large number to cover all rows (adjust as needed)
              startColumnIndex: 0, // Column G (0-indexed)
              endColumnIndex: 1, // Column G (exclusive)
            },
            cell: {
              userEnteredFormat: {
                horizontalAlignment: "LEFT", // Align text to the right
                textFormat: {
                  bold: true, // Make text bold
                },
              },
            },
            fields:
              "userEnteredFormat.horizontalAlignment,userEnteredFormat.textFormat",
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
              pixelSize: 60, // Width for column A
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
              pixelSize: 100, // Width for column B
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
              pixelSize: 100, // Width for column C
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
              pixelSize: 180, // Width for column D
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
              pixelSize: 77, // Width for column E
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
              pixelSize: 69, // Width for column F
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
              pixelSize: 145, // Width for column G
            },
            fields: "pixelSize",
          },
        },
        {
          updateSheetProperties: {
            properties: {
              sheetId: 0, // Replace with your sheet ID
              gridProperties: {
                hideGridlines: true,
              },
            },
            fields: "gridProperties.hideGridlines",
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

  const sheetUrlPdf = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=pdf&portrait=true&gid=0&gridlines=false`;
  const obj = await exportFinishedTasks(
    invoiceData.tasks,
    invoiceData.clientName
  );
  const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=0`;
  return {
    invoiceSheet: sheetUrl,
    invoice: sheetUrlPdf,
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
