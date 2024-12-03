const fs = require("fs");
const AWS = require("aws-sdk");
const secrets = require("../../../config/secrets");
const nodeMailer = require("../../nodeMailer");
const jwt = require("../../jwt");
const crypto = require("../../../utils/crypto");
const handlebars = require("handlebars");

const path = require("path");
const baseURL = secrets.frontend_URL;

// SES configuration
const SES_CONFIG = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
};
const ses = new AWS.SES(SES_CONFIG);

const emailErrorTo = secrets.email.error;
const emailFrom = secrets.email.auth.from;
const bccEmail = process.env.BCC_EMAIL;
const awsSource = process.env.AWS_SOURCE;
const awsNoreplySource = process.env.AWS_NOREPLY_SOURCE;

//console.log(awsSource);
/**
 * Email component
 * @constructor
 */
function Email() {}

Email.contactSupport = async (email, info, language) => {
  try {
      let filePath = "";
      let emailSubject= ''
    if (language === "en") {
      filePath = path.join(
        __dirname,
        "..",
        "..",
        "..",
        "templates",
        "client",
        "english",
        "contactSupport.html"
      );
        emailSubject = `Support form from [CLIENT_FIRST_NAME] [CLIENT_LAST_NAME]`;
    } else {
      filePath = path.join(
        __dirname,
        "..",
        "..",
        "..",
        "templates",
        "client",
        "contactSupport.html"
      );
        emailSubject = `Support-Formular von [CLIENT_FIRST_NAME] [CLIENT_LAST_NAME]`;
    }
    // filePath = path.join(
    //   __dirname,
    //   "..",
    //   "..",
    //   "..",
    //   "templates",
    //   "client",
    //   "contactSupport.html"
    // );
    //console.log(filePath);
    const data = fs.readFileSync(filePath, "utf8");
    let text = data;

    text = text.replace("[CLIENT_FIRST_NAME]", info.firstName);
    text = text.replace("[CLIENT_LAST_NAME]", info.lastName);
    text = text.replace("[EMAIL]", info.email);
    text = text.replace("[MESSAGE]", info.message);

    const params = {
      Source: `DripText <noreply@driptext.de>`,
      Destination: {
        ToAddresses: [email],
        // CcAddresses: ["backoffice@driptext.de"],
      },
      Message: {
        Subject: {
          Data: emailSubject,
        },
        Body: {
          Html: {
            Data: text,
          },
        },
      },
    };
    await ses.sendEmail(params).promise();
    //console.log("on boarding request sent");
  } catch (error) {
    // throw error;
    console.log("error sending email: ", error);
  }
};

Email.onBoardingReminder = async (email, obj, language) => {
  try {
      let filePath = "";
      let emailSubject = ''
    if (language === "en") {
      filePath = path.join(
        __dirname,
        "..",
        "..",
        "..",
        "templates",
        "client",
        "english",
        "onBoardingReminder.html"
      );
        emailSubject = `Reminder: Please complete the onboarding for [PROJECT_DOMAIN]`;
    } else {
      filePath = path.join(
        __dirname,
        "..",
        "..",
        "..",
        "templates",
        "client",
        "onBoardingReminder.html"
      );
        emailSubject = `Reminder: Bitte Onboarding für [PROJECT_DOMAIN] ausfüllen`;
    }

    // const filePath = path.join(
    //   __dirname,
    //   "..",
    //   "..",
    //   "..",
    //   "templates",
    //   "client",
    //   "onBoardingReminder.html"
    // );
    //console.log(filePath);
    const data = fs.readFileSync(filePath, "utf8");
    let text = data;

    text = text.replace(/\[PROJECT_DOMAIN\]/g, obj.projectDomain);
    text = text.replace(
      "[DASHBOARD_LINK]",
      "https://driptext-app.vercel.app/client-dashboard"
    );

    const params = {
      Source: `DripText <noreply@driptext.de>`,
      Destination: {
        ToAddresses: [email],
        // CcAddresses: ["backoffice@driptext.de"],
      },
      Message: {
        Subject: {
          Data: emailSubject,
        },
        Body: {
          Html: {
            Data: text,
          },
        },
      },
    };
    await ses.sendEmail(params).promise();
    //console.log("on boarding request sent");
  } catch (error) {
    // throw error;
    console.log("error sending email: ", error);
  }
};

Email.taskCompleted = async (email, obj, language) => {
  try {
      let filePath = "";
      let emailSubject =  ''
    if (language === "en") {
      filePath = path.join(
        __dirname,
        "..",
        "..",
        "..",
        "templates",
        "client",
        "english",
        "taskCompleted.html"
      );
        emailSubject = `Text [TASK_NAME] ([KEYWORD]) is completed`;
    } else {
      filePath = path.join(
        __dirname,
        "..",
        "..",
        "..",
        "templates",
        "client",
        "taskCompleted.html"
      );
        emailSubject = `Text [TASK_NAME] ([KEYWORD]) ist fertig`;
    }

    // const filePath = path.join(
    //   __dirname,
    //   "..",
    //   "..",
    //   "..",
    //   "templates",
    //   "client",
    //   "taskCompleted.html"
    // );
    //console.log(filePath);
    const data = fs.readFileSync(filePath, "utf8");
    let text = data;

    text = text.replace("[TASK_NAME]", obj.taskName);
    text = text.replace("[TASK_LINK]", obj.documentLink);
    text = text.replace("[KEYWORD]", obj.keyword);

    text = text.replace(
      "[DASHBOARD_LINK]",
      "https://driptext-app.vercel.app/client-dashboard"
    );

    const params = {
      Source: `DripText <noreply@driptext.de>`,
      Destination: {
        ToAddresses: [email],
        CcAddresses: ["pm@DripText.de"],
      },
      Message: {
        Subject: {
          Data: emailSubject,
        },
        Body: {
          Html: {
            Data: text,
          },
        },
      },
    };
    await ses.sendEmail(params).promise();
    //console.log("on boarding request sent");
  } catch (error) {
    // throw error;
    console.log("error sending email: ", error);
  }
};

Email.workStarted = async (email, obj, language) => {
  try {
      let filePath = "";
      let emailSubject = ''
   if (language === "en") {
     filePath = path.join(
       __dirname,
       "..",
       "..",
       "..",
       "templates",
       "client",
       "english",
       "workStarted.html"
     );
       emailSubject = `We are starting with the text creation for [PROJECT_DOMAIN]`;
   } else {
     filePath = path.join(
       __dirname,
       "..",
       "..",
       "..",
       "templates",
       "client",
       "workStarted.html"
     );
       emailSubject = `Wir beginnen mit der Texterstellung für [PROJECT_DOMAIN]`;
   }
    // const filePath = path.join(
    //   __dirname,
    //   "..",
    //   "..",
    //   "..",
    //   "templates",
    //   "client",
    //   "workStarted.html"
    // );
    //console.log(filePath);
    const data = fs.readFileSync(filePath, "utf8");
    let text = data;
    

    text = text.replace(/\[PROJECT_NAME\]/g, obj.projectName);

    text = text.replace(
      "[DASHBOARD_LINK]",
      "https://driptext-app.vercel.app/client-dashboard"
    );

    

    const params = {
      Source: `DripText <noreply@driptext.de>`,
      Destination: {
        ToAddresses: [email],
        // CcAddresses: ["backoffice@driptext.de"],
      },
      Message: {
        Subject: {
          Data: emailSubject,
        },
        Body: {
          Html: {
            Data: text,
          },
        },
      },
    };
    await ses.sendEmail(params).promise();
    //console.log("on boarding request sent");
  } catch (error) {
    // throw error;
    console.log("error sending email: ", error);
  }
};

Email.montlyText = async (language) => {
    try {
        let filePath = "";
        let emailSubject = ''
      if (language === "en") {
        filePath = path.join(
          __dirname,
          "..",
          "..",
          "..",
          "templates",
          "client",
          "english",
          "monthlyTexts.html"
        );
          emailSubject = `All texts for [PROJECT_DOMAIN] for [CURRENT MONTH] completed`;
      } else {
        filePath = path.join(
          __dirname,
          "..",
          "..",
          "..",
          "templates",
          "client",
          "monthlyTexts.html"
        );
          emailSubject = `Alle Texte für [PROJECT_DOMAIN] für [CURRENT MONTH] abgeschlossen`;
      }
      // const filePath = path.join(
      //   __dirname,
      //   "..",
      //   "..",
      //   "..",
      //   "templates",
      //   "client",
      //   "workStarted.html"
      // );
      //console.log(filePath);
      const data = fs.readFileSync(filePath, "utf8");
      let text = data;

      text = text.replace(/\[PROJECT_NAME\]/g, obj.projectName);

      text = text.replace(
        "[DASHBOARD_LINK]",
        "https://driptext-app.vercel.app/client-dashboard"
      );

      const params = {
        Source: `DripText <noreply@driptext.de>`,
        Destination: {
          ToAddresses: [email],
          // CcAddresses: ["backoffice@driptext.de"],
        },
        Message: {
          Subject: {
            Data: emailSubject,
          },
          Body: {
            Html: {
              Data: text,
            },
          },
        },
      };
      await ses.sendEmail(params).promise();
      //console.log("on boarding request sent");
    } catch (error) {
      // throw error;
      console.log("error sending email: ", error);
    }

}

module.exports = Email;
