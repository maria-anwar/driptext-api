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

Email.welcomeFreelancer = async (freelancer, language) => {
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
        "freelancers",
        "english",
        "welcome.html"
      );
      emailSubject = `Welcome to DripText!`;
    } else {
      filePath = path.join(
        __dirname,
        "..",
        "..",
        "..",
        "templates",
        "freelancers",
        "welcome.html"
      );
      emailSubject = `Willkommen bei DripText!`;
    }
    //  filePath = path.join(
    //   __dirname,
    //   "..",
    //   "..",
    //   "..",
    //   "templates",
    //   "freelancers",
    //   "welcome.html"
    // );
    //console.log(filePath);
    const data = fs.readFileSync(filePath, "utf8");
    let text = data;

    text = text.replace(
      "[DASHBOARD_LINK]",
      "https://driptext-app.vercel.app/freelancer-dashboard"
    );
    text = text.replace(
      "[FREELANCER_NAME]",
      `${freelancer.firstName} ${freelancer.lastName}`
    );

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

Email.taskAssign = async (freelancer, task, role, language) => {
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
         "freelancers",
         "english",
         "taskAssign.html"
       );
       emailSubject = `New task assigned: ${task.name} (${task.keyword})`;
     } else {
       filePath = path.join(
         __dirname,
         "..",
         "..",
         "..",
         "templates",
         "freelancers",
         "taskAssign.html"
       );
       emailSubject = `Neuer Auftrag zugewiesen: ${task.name} (${task.keyword})`;
     }
   
    // const filePath = path.join(
    //   __dirname,
    //   "..",
    //   "..",
    //   "..",
    //   "templates",
    //   "freelancers",
    //   "taskAssign.html"
    // );
    //console.log(filePath);
    const data = fs.readFileSync(filePath, "utf8");
    let text = data;
    
    text = text.replace(
      "[DASHBOARD_LINK]",
      "https://driptext-app.vercel.app/freelancer-dashboard"
    );
    text = text.replace("[ROLE]", role);
    text = text.replace("[GOOGLE_DOC_LINK]", task.fileLink);
    text = text.replace("[FREELANCER_FIRST_NAME]", freelancer.firstName);
    text = text.replace(/\[TASK_NAME\]/g, task.name);
    text = text.replace(/\[KEYWORD\]/g, task.keyword);

    //console.log("projectName: ", `${project.projectName}`);
    // text = text.replace(/{{project\.domain}}/g, `${project.projectName}`);

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

Email.reminder24Hours = async (freelancer, task, role, language) => {
  try {
    let filePath = "";
    let emailSubject = ""
     if (language === "en") {
       filePath = path.join(
         __dirname,
         "..",
         "..",
         "..",
         "templates",
         "freelancers",
         "english",
         "reminder24Hours.html"
       );
       emailSubject = `Important: Only 24 hours left for ${task.name} (${task.keyword})`;
     } else {
       filePath = path.join(
         __dirname,
         "..",
         "..",
         "..",
         "templates",
         "freelancers",
         "reminder24Hours.html"
       );
       emailSubject = `Wichtig: Nur noch 24h Zeit für ${task.name} (${task.keyword})`;
     }
    // const filePath = path.join(
    //   __dirname,
    //   "..",
    //   "..",
    //   "..",
    //   "templates",
    //   "freelancers",
    //   "taskAssign.html"
    // );
    //console.log(filePath);
    const data = fs.readFileSync(filePath, "utf8");
    let text = data;
    
    text = text.replace(
      "[DASHBOARD_LINK]",
      "https://driptext-app.vercel.app/freelancer-dashboard"
    );
    text = text.replace("[ROLE]", role);
    text = text.replace("[FREELANCER_FIRST_NAME]", freelancer.firstName);
    text = text.replace(/\[TASK_NAME\]/g, task.name);
    text = text.replace(/\[KEYWORD\]/g, task.keyword);
    text = text.replace("[GOOGLE_DOC_LINK]", task.documentLink);

    //console.log("projectName: ", `${project.projectName}`);
    // text = text.replace(/{{project\.domain}}/g, `${project.projectName}`);

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

Email.taskInRevision = async (freelancer, task, language) => {
  try {
    let filePath = "";
    let emailSubject = '';
    if (language === "en") {
      filePath = path.join(
        __dirname,
        "..",
        "..",
        "..",
        "templates",
        "freelancers",
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
        "freelancers",
        "taskInRevision.html"
      );
      emailSubject = `Wichtig: Bitte überarbeite ${task.name} (${task.keyword})`;
    }
    // const filePath = path.join(
    //   __dirname,
    //   "..",
    //   "..",
    //   "..",
    //   "templates",
    //   "freelancers",
    //   "taskAssign.html"
    // );
    //console.log(filePath);
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
      "https://driptext-app.vercel.app/freelancer-dashboard"
    );

    text = text.replace("[ROLE]", task.role);
    text = text.replace("[FEEDBACK]", task.feedback);

    //console.log("projectName: ", `${project.projectName}`);
    // text = text.replace(/{{project\.domain}}/g, `${project.projectName}`);

    const params = {
      Source: `DripText <noreply@driptext.de>`,
      Destination: {
        ToAddresses: [freelancer.email],
        CcAddresses: ["pm@driptext.de"],
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

Email.finishTask = async (freelancer, task, role, language) => {
  try {
    let filePath = "";
    let emailSubject = ""
    if (language === "en") {
      filePath = path.join(
        __dirname,
        "..",
        "..",
        "..",
        "templates",
        "freelancers",
        "english",
        "finishTask.html"
      );
      emailSubject = `The task ${task.name} (${task.keyword}) is complete.`;
    } else {
      filePath = path.join(
        __dirname,
        "..",
        "..",
        "..",
        "templates",
        "freelancers",
        "finishTask.html"
      );
      emailSubject = `Auftrag ${task.name} (${task.keyword}) ist fertig`;
    }
    // const filePath = path.join(
    //   __dirname,
    //   "..",
    //   "..",
    //   "..",
    //   "templates",
    //   "freelancers",
    //   "finishTask.html"
    // );
    //console.log(filePath);
    const data = fs.readFileSync(filePath, "utf8");
    let text = data;
    

    text = text.replace(/\[TASK_NAME\]/g, task.name);
    text = text.replace(/\[KEYWORD\]/g, task.keyword);
    text = text.replace("[FREELANCER_FIRST_NAME]", freelancer.firstName);
    text = text.replace("[GOOGLE_DOC_LINK]", task.fileLink);
    text = text.replace("[ROLE]", role);


    // text = text.replace("[EDITOR_NAME]", task.editorName);
    text = text.replace(
      "[DASHBOARD_LINK]",
      "https://driptext-app.vercel.app/freelancer-dashboard"
    );
    

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

Email.monthlyInvoice = async (obj, invoiceLink, tasksLink, language) => {
  try {
    let filePath = "";
    let emailSubject = ""
    const lastMonth = dayjs().subtract(1, "month").format("MMMM YYYY");
    if (language === "en") {
      filePath = path.join(
        __dirname,
        "..",
        "..",
        "..",
        "templates",
        "freelancers",
        "english",
        "monthlyInvoice.html"
      );
      emailSubject = `DripText billing for ${lastMonth}`;
    } else {
      filePath = path.join(
        __dirname,
        "..",
        "..",
        "..",
        "templates",
        "freelancers",
        "monthlyInvoice.html"
      );
      emailSubject = `DripText Abrechnung ${lastMonth}`;
    }
    // const filePath = path.join(
    //   __dirname,
    //   "..",
    //   "..",
    //   "..",
    //   "templates",
    //   "freelancers",
    //   "monthlyInvoice.html"
    // );
    //console.log(filePath);
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
        CcAddresses: ["backoffice@driptext.de"],
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

module.exports = Email;
