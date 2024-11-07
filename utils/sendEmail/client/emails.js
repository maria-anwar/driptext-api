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

Email.contactSupport = async (email, info) => {
  try {
    // const data = fs.readFileSync("./templates/awsPasswordUpdateEmail.html", "utf8");
    // const filePath = path.join(__dirname, "templates", "awsPasswordUpdateEmail.html");
    const filePath = path.join(
      __dirname,
      "..",
      "..",
      "..",
      "templates",
      "client",
      "contactSupport.html"
    );
    //console.log(filePath);
    const data = fs.readFileSync(filePath, "utf8");
    let text = data;
    // //console.log(text);
    // const forgetPasswordToken = jwt.signToken({
    //   userId: user.id,
    //   roleId: user.role,
    //   email: user.email,
    // });

    // const link = `https://driptext-app.vercel.app/auth/forgetkey/${forgetPasswordToken}`;
    // text = text.replace("[USER_NAME]", `${user.firstName} ${user.lastName}`);

    text = text.replace("[CLIENT_FIRST_NAME]", info.firstName);
    text = text.replace("[CLIENT_LAST_NAME]", info.lastName);
    text = text.replace("[EMAIL]", info.email);
    text = text.replace("[MESSAGE]", info.message);

    //console.log("projectName: ", `${project.projectName}`);
    // text = text.replace(/{{project\.domain}}/g, `${project.projectName}`);

    const params = {
      Source: `DripText <noreply@driptext.de>`,
      Destination: {
        ToAddresses: [email],
        // CcAddresses: ["backoffice@driptext.de"],
      },
      Message: {
        Subject: {
          Data: `Sample Contact Support Template`,
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

Email.onBoardingReminder = async (email, obj) => {
  try {
    // const data = fs.readFileSync("./templates/awsPasswordUpdateEmail.html", "utf8");
    // const filePath = path.join(__dirname, "templates", "awsPasswordUpdateEmail.html");
    const filePath = path.join(
      __dirname,
      "..",
      "..",
      "..",
      "templates",
      "client",
      "onBoardingReminder.html"
    );
    //console.log(filePath);
    const data = fs.readFileSync(filePath, "utf8");
    let text = data;
    // //console.log(text);
    // const forgetPasswordToken = jwt.signToken({
    //   userId: user.id,
    //   roleId: user.role,
    //   email: user.email,
    // });

    // const link = `https://driptext-app.vercel.app/auth/forgetkey/${forgetPasswordToken}`;
    // text = text.replace("[USER_NAME]", `${user.firstName} ${user.lastName}`);

    text = text.replace(/\[PROJECT_DOMAIN\]/g, obj.projectDomain);
    text = text.replace(
      "[DASHBOARD_LINK]",
      "https://driptext-app.vercel.app/client-dashboard"
    );

    //console.log("projectName: ", `${project.projectName}`);
    // text = text.replace(/{{project\.domain}}/g, `${project.projectName}`);

    const params = {
      Source: `DripText <noreply@driptext.de>`,
      Destination: {
        ToAddresses: [email],
        // CcAddresses: ["backoffice@driptext.de"],
      },
      Message: {
        Subject: {
          Data: `Erinnerung: Bitte fülle das Onboarding aus`,
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

Email.taskCompleted = async (email, obj) => {
  try {
    // const data = fs.readFileSync("./templates/awsPasswordUpdateEmail.html", "utf8");
    // const filePath = path.join(__dirname, "templates", "awsPasswordUpdateEmail.html");
    const filePath = path.join(
      __dirname,
      "..",
      "..",
      "..",
      "templates",
      "client",
      "taskCompleted.html"
    );
    //console.log(filePath);
    const data = fs.readFileSync(filePath, "utf8");
    let text = data;
    // //console.log(text);
    // const forgetPasswordToken = jwt.signToken({
    //   userId: user.id,
    //   roleId: user.role,
    //   email: user.email,
    // });

    // const link = `https://driptext-app.vercel.app/auth/forgetkey/${forgetPasswordToken}`;
    // text = text.replace("[USER_NAME]", `${user.firstName} ${user.lastName}`);

    text = text.replace("[TASK_NAME]", obj.taskName);
      text = text.replace("[TASK_LINK]", obj.documentLink);
    text = text.replace("[KEYWORD]", obj.keyword);
      
    text = text.replace(
      "[DASHBOARD_LINK]",
      "https://driptext-app.vercel.app/client-dashboard"
    );

    //console.log("projectName: ", `${project.projectName}`);
    // text = text.replace(/{{project\.domain}}/g, `${project.projectName}`);

    const params = {
      Source: `DripText <noreply@driptext.de>`,
      Destination: {
        ToAddresses: [email],
        // CcAddresses: ["backoffice@driptext.de"],
      },
      Message: {
        Subject: {
          Data: `Auftrag ${obj.taskName} (${obj.keyword}) ist abgeschlossen`,
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

Email.workStarted = async (email, obj) => {
  try {
    // const data = fs.readFileSync("./templates/awsPasswordUpdateEmail.html", "utf8");
    // const filePath = path.join(__dirname, "templates", "awsPasswordUpdateEmail.html");
    const filePath = path.join(
      __dirname,
      "..",
      "..",
      "..",
      "templates",
      "client",
      "workStarted.html"
    );
    //console.log(filePath);
    const data = fs.readFileSync(filePath, "utf8");
    let text = data;
    // //console.log(text);
    // const forgetPasswordToken = jwt.signToken({
    //   userId: user.id,
    //   roleId: user.role,
    //   email: user.email,
    // });

    // const link = `https://driptext-app.vercel.app/auth/forgetkey/${forgetPasswordToken}`;
    // text = text.replace("[USER_NAME]", `${user.firstName} ${user.lastName}`);

   
    text = text.replace(/\[PROJECT_NAME\]/g, obj.projectName);

    text = text.replace(
      "[DASHBOARD_LINK]",
      "https://driptext-app.vercel.app/client-dashboard"
    );

    //console.log("projectName: ", `${project.projectName}`);
    // text = text.replace(/{{project\.domain}}/g, `${project.projectName}`);

    const params = {
      Source: `DripText <noreply@driptext.de>`,
      Destination: {
        ToAddresses: [email],
        // CcAddresses: ["backoffice@driptext.de"],
      },
      Message: {
        Subject: {
          Data: `Work Has Started On Your Project`,
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

module.exports = Email;
