const fs = require("fs");
const AWS = require("aws-sdk");
const secrets = require("../../../config/secrets");
const nodeMailer = require("../../nodeMailer");
const jwt = require("../../jwt");
const crypto = require("../../../utils/crypto");
const handlebars = require("handlebars");
const dayjs = require("dayjs");
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

Email.assignFreelancer48Hours = async (email, obj, language) => {
  try {
    let filePath = "";
    let emailSubject = "";
    if (language === "en") {
      filePath = path.join(
        __dirname,
        "..",
        "..",
        "..",
        "templates",
        "admin",
        "english",
        "assignFreelancer48hours.html"
      );

      emailSubject = `Important: Assign employees for ${obj.taskName} (${obj.taskKeyword})`;
    } else {
      filePath = path.join(
        __dirname,
        "..",
        "..",
        "..",
        "templates",
        "admin",
        "assignFreelancer48hours.html"
      );
      emailSubject = `Wichtig: Mitarbeiter für ${obj.taskName} (${obj.taskKeyword}) zuweisen`;
    }

    //  filePath = path.join(
    //   __dirname,
    //   "..",
    //   "..",
    //   "..",
    //   "templates",
    //   "admin",
    //   "assignFreelancer48hours.html"
    // );

    const data = fs.readFileSync(filePath, "utf8");
    let text = data;

    text = text.replace(/\[TASK_NAME\]/g, obj.taskName);
    text = text.replace(/\[KEYWORD\]/g, obj.taskKeyword);

    text = text.replace(/\[PROJECT_DOMAIN\]/g, obj.projectDomain);
    text = text.replace(/\[FREELANCER_NAME\]/g, obj.freelancerName);
    text = text.replace(/\[ROLE\]/g, obj.role);

    text = text.replace(
      /\[DASHBOARD_LINK\]/g,
      "https://driptext-admin-panel.vercel.app/dashboard"
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

Email.taskInRevision = async (freelancer, task, language) => {
  try {
    let filePath = "";
    let emailSubject = "";
    if (language === "en") {
      filePath = path.join(
        __dirname,
        "..",
        "..",
        "..",
        "templates",
        "admin",
        "english",
        "taskInRevision.html"
      );
      emailSubject = `Important: Please revise ${task.name} (${task.keyword})`;
    } else {
      filePath = path.join(
        __dirname,
        "..",
        "..",
        "..",
        "templates",
        "admin",
        "taskInRevision.html"
      );
      emailSubject = `Wichtig: Bitte überarbeite ${task.name} (${task.keyword})`;
    }

    const data = fs.readFileSync(filePath, "utf8");
    let text = data;

    text = text.replace(/\[TASK_NAME\]/g, task.name);
    text = text.replace(/\[KEYWORD\]/g, task.keyword);
    text = text.replace("[EDITOR_NAME]", task.editorName);
    text = text.replace("[GOOGLE_DOC_LINK]", task.fileLink);
    text = text.replace("[PROJECT_DOMAIN]", task.projectName);
    text = text.replace("[FREELANCER_FIRST_NAME]", freelancer.firstName);

    text = text.replace(
      /\[DASHBOARD_LINK\]/g,
      "https://driptext-admin-panel.vercel.app/dashboard"
    );

    text = text.replace("[ROLE]", task.role);
    text = text.replace("[FEEDBACK]", task.feedback);

    const params = {
      Source: `DripText <noreply@driptext.de>`,
      Destination: {
        ToAddresses: [freelancer.email],
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

Email.newBooking = async (email, obj, language) => {
  try {
    let filePath = "";
    let emailSubject = "";
    if (language === "en") {
      filePath = path.join(
        __dirname,
        "..",
        "..",
        "..",
        "templates",
        "admin",
        "english",
        "newBooking.html"
      );
      emailSubject = `New Booking (${obj.projectName}): Please assign a freelancer`;
    } else {
      filePath = path.join(
        __dirname,
        "..",
        "..",
        "..",
        "templates",
        "admin",
        "newBooking.html"
      );

      emailSubject = `Neue Buchung (${obj.projectName}): Bitte Freelancer zuweisen`;
    }

    const data = fs.readFileSync(filePath, "utf8");
    let text = data;

    text = text.replace(
      /\[DASHBOARD_LINK\]/g,
      "https://driptext-admin-panel.vercel.app/dashboard"
    );
    text = text.replace("[PROJECT_DOMAIN]", obj.projectName);
    text = text.replace("[CLIENT_FIRST_NAME]", obj.clientFirstName);
    text = text.replace("[CLIENT_LAST_NAME]", obj.clientLastName);
    text = text.replace("[EMAIL]", obj.clientEmail);

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
    let emailSubject = "";
    if (language === "en") {
      filePath = path.join(
        __dirname,
        "..",
        "..",
        "..",
        "templates",
        "admin",
        "english",
        "taskCompleted.html"
      );
      emailSubject = `Task ${obj.taskName} (${obj.keyword}) is completed`;
    } else {
      filePath = path.join(
        __dirname,
        "..",
        "..",
        "..",
        "templates",
        "admin",
        "taskCompleted.html"
      );
      emailSubject = `Auftrag ${obj.taskName} (${obj.keyword}) ist fertig`;
    }

    // const filePath = path.join(
    //   __dirname,
    //   "..",
    //   "..",
    //   "..",
    //   "templates",
    //   "admin",
    //   "taskCompleted.html"
    // );
    //console.log(filePath);
    const data = fs.readFileSync(filePath, "utf8");
    let text = data;

    text = text.replace(
      "[DASHBOARD_LINK]",
      "https://driptext-admin-panel.vercel.app/dashboard"
    );
    text = text.replace(/\[KEYWORD\]/g, obj.keyword);
    text = text.replace(/\[TASK_NAME\]/g, obj.taskName);
    text = text.replace("[CLIENT_FIRST_NAME]", obj.clientName);
    text = text.replace("[GOOGLE_DOC_LINK]", obj.fileLink);

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

Email.onBoardingCompleted = async (email, obj, language) => {
  try {
    let filePath = "";
    let emailSubject = "";
    if (language === "en") {
      filePath = path.join(
        __dirname,
        "..",
        "..",
        "..",
        "templates",
        "admin",
        "english",
        "onBoardingCompleted.html"
      );
      emailSubject = `Onboarding for [PROJECT_DOMAIN] completed`;
    } else {
      filePath = path.join(
        __dirname,
        "..",
        "..",
        "..",
        "templates",
        "admin",
        "onBoardingCompleted.html"
      );
      emailSubject = "Onboarding für [PROJECT_DOMAIN] abgeschlossen";
    }

    // const filePath = path.join(
    //   __dirname,
    //   "..",
    //   "..",
    //   "..",
    //   "templates",
    //   "admin",
    //   "onBoardingCompleted.html"
    // );
    //console.log(filePath);
    const data = fs.readFileSync(filePath, "utf8");
    let text = data;

    text = text.replace(
      "[DASHBOARD_LINK]",
      "https://driptext-admin-panel.vercel.app/dashboard"
    );
    text = text.replace("[CLIENT_FIRST_NAME]", `${obj.firstName}`);
    text = text.replace("[CLIENT_LAST_NAME]", `${obj.lastName}`);
    text = text.replace("[EMAIL]", obj.email);
    text = text.replace(/\[PROJECT_DOMAIN\]/g, obj.projectName);

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

Email.freelancerMonthlyInvoice = async (
  obj,
  invoiceLink,
  tasksLink,
  language
) => {
  try {
    let filePath = "";
    let emailSubject = "";
    const lastMonth = dayjs().subtract(1, "month").format("MMMM YYYY");

    if (language === "en") {
      filePath = path.join(
        __dirname,
        "..",
        "..",
        "..",
        "templates",
        "admin",
        "english",
        "freelancerMonthlyInvoice.html"
      );
      emailSubject = `DripText Billing ${lastMonth}`;
    } else {
      filePath = path.join(
        __dirname,
        "..",
        "..",
        "..",
        "templates",
        "admin",
        "freelancerMonthlyInvoice.html"
      );
      emailSubject = `DripText Abrechnung ${lastMonth}`;
    }
    // const filePath = path.join(
    //   __dirname,
    //   "..",
    //   "..",
    //   "..",
    //   "templates",
    //   "admin",
    //   "freelancerMonthlyInvoice.html"
    // );

    console.log("inside sending email");
    const data = fs.readFileSync(filePath, "utf8");
    let text = data;

    text = text.replace(/\[MONTH\]/g, lastMonth);

    text = text.replace("[INVOICE_LINK]", invoiceLink);
    text = text.replace("[TASKS_LINK]", tasksLink);
    text = text.replace("[FIRST_NAME]", obj.name);

    const params = {
      Source: `DripText <noreply@driptext.de>`,
      Destination: {
        ToAddresses: [obj.email],
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
    console.log("email sent");
    //console.log("on boarding request sent");
  } catch (error) {
    // throw error;
    console.log("error sending email: ", error);
  }
};

module.exports = Email;
