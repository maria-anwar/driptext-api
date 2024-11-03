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


Email.taskInRevision = async (email, task) => {
  try {
    // const data = fs.readFileSync("./templates/awsPasswordUpdateEmail.html", "utf8");
    // const filePath = path.join(__dirname, "templates", "awsPasswordUpdateEmail.html");
    const filePath = path.join(
      __dirname,
      "..",
      "..",
      "..",
      "templates",
      "freelancers",
      "taskAssign.html"
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

    text = text.replace(/\[TASK_NAME\]/g, task.name);
    text = text.replace("[KEYWORD]", task.keyword);
    text = text.replace("[EDITOR_NAME]", task.editorName);
    text = text.replace(
      "[TASK_LINK]",
      "https://driptext-app.vercel.app/freelancer-dashboard"
    );
    text = text.replace("[PROJECT_NAME]", task.projectName);
    text = text.replace("[ROLE]", task.role);
    text = text.replace("[FEEDBACK]", task.feedback);

    //console.log("projectName: ", `${project.projectName}`);
    // text = text.replace(/{{project\.domain}}/g, `${project.projectName}`);

    const params = {
      Source: `DripText <noreply@driptext.de>`,
      Destination: {
        ToAddresses: [email],
        CcAddresses: ["backoffice@driptext.de"],
      },
      Message: {
        Subject: {
          Data: `Auftrag ${task.name} (${task.keyword}) wurde zurückgegeben - Bitte überarbeiten`,
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
