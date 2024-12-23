const fs = require("fs");
const AWS = require("aws-sdk");
const secrets = require("../config/secrets");
const nodeMailer = require("./nodeMailer");
const jwt = require("./jwt");
const crypto = require("../utils/crypto");
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

Email.errorEmail = async (req, error) => {
  try {
    const data = fs.readFileSync("./templates/emailError.html", "utf8");
    var text = data;
    const userInfo = {
      userId: req.userId ? crypto.decrypt(req.userId) : "NULL",
      roleId: req.roleId ? crypto.decrypt(req.roleId) : "NULL",
      role: req.role ? req.role : "NULL",
    };
    // =================== device info ====================
    const DeviceDetector = require("device-detector-js");
    const deviceDetector = new DeviceDetector();
    const userAgent =
      req.headers && req.headers["user-agent"]
        ? req.headers["user-agent"]
        : null;
    const deviceInfo = userAgent ? deviceDetector.parse(userAgent) : null;
    //=====================================================
    text = text.replace("[USER_INFO]", JSON.stringify(userInfo));
    text = text.replace("[DEVICE_INFO]", JSON.stringify(deviceInfo));
    text = text.replace("[API]", JSON.stringify(req.originalUrl));
    text = text.replace("[METHOD]", req.method ? req.method : null);
    text = text.replace("[REQ_BODY]", JSON.stringify(req.body));
    text = text.replace("[REQ_PARAMS]", JSON.stringify(req.params));
    text = text.replace("[ERROR]", error);
    var mailOptions = {
      from: `LMS <${emailFrom}>`,
      to: emailErrorTo,
      subject: "ERROR in LMS(" + req.headers.origin + ")",
      html: text,
    };
    return nodeMailer(mailOptions);
  } catch (error) {
    //console.log(error);
    // throw error;
    console.log("error sending email: ", error);
  }
};

Email.emailPassword = async (user) => {
  try {
    const filePath = path.join(
      __dirname,
      "..",
      "templates",
      "awsPasswordUpdateEmail.html"
    );
    //console.log(filePath);
    const data = fs.readFileSync(filePath, "utf8");
    // const data = fs.readFileSync("./templates/passwordEmail.html", "utf8");

    var text = data;
    const forgetPasswordToken = jwt.signToken({
      userId: user.id,
      roleId: user.role,
      email: user.email,
    });

    var link = "http://localhost:5173/auth/forgetkey/" + forgetPasswordToken;
    text = text.replace("[USER_NAME]", `${user.firstName} ${user.lastName}`);
    text = text.replace("[BUTTON_LINK_1]", link);

    var mailOptions = {
      from: `DripText <${emailFrom}>`,
      to: `${user.email}`,
      subject: "Action Required: Set Up Your New Password",
      html: text,
    };

    return nodeMailer(mailOptions);
  } catch (error) {
    //console.log(error);
    // throw error;
    console.log("error sending email: ", error);
  }
};

Email.cornJob = async (dateOne, dateTwo) => {
  try {
    const emailTemplateSource = fs.readFileSync(
      "./templates/cornJob.html",
      "utf8"
    );
    const emailTemplateSource2 = fs.readFileSync(
      "./templates/cornJob2.html",
      "utf8"
    );

    const emailTemplate = handlebars.compile(emailTemplateSource);
    const emailTemplate2 = handlebars.compile(emailTemplateSource2);

    dateTwo.forEach(({ manager, courses }) => {
      const subject = "Courses Information";
      const html = emailTemplate2({ managers: [{ manager, courses }] });

      var mailOptions = {
        from: `LMS <${emailFrom}>`,
        to: manager.email,
        bcc: emailErrorTo,
        subject: subject,
        html: html,
      };
      return nodeMailer(mailOptions);
    });
    dateOne.forEach((entry) => {
      const htmlContent = emailTemplate(entry);

      var mailOptions = {
        from: `LMS <${emailFrom}>`,
        to: entry.manager.email,
        bcc: emailErrorTo,
        subject: "Course Completion Reminder",
        html: htmlContent,
      };
      return nodeMailer(mailOptions);
    });
  } catch (error) {
    //console.log(error);
    // throw error;
    console.log("error sending email: ", error);
  }
};

Email.addUser = async (user) => {
  try {
    const data = fs.readFileSync("./templates/emailAddUser.html", "utf8");
    var text = data;

    text = text.replace("[USER_NAME]", user.firstName + " " + user.lastName);
    text = text.replace("[PASSWORD]", user.password);
    text = text.replace("[SIGNIN_BUTTON]", process.env.frontend_URL);

    var mailOptions = {
      from: `LMS <${emailFrom}>`,
      to: user.email,
      subject: "Welcome To Learning Memangement System",
      html: text,
    };

    return nodeMailer(mailOptions);
  } catch (error) {
    //console.log(error);
    // throw error;
    console.log("error sending email: ", error);
  }
};

Email.forgotPassword = async (user, language) => {
  try {
    const forgetPasswordToken = jwt.signToken({
      userId: user.id,
      roleId: user.roleId,
      email: user.email,
    });

    var link =
      "https://driptext-app.vercel.app/" +
      "auth/forgetkey/" +
      forgetPasswordToken;
    
    let data = ''
    let emailSubject = ''
    if (language === "en") {
      data = fs.readFileSync("./templates/english/emailForgotPassword.html", "utf8");
      emailSubject = `Oops, forgot your password? No problem!`;
    } else {
      data = fs.readFileSync("./templates/emailForgotPassword.html", "utf8");
      emailSubject = `Ups, Passwort vergessen? Kein Problem!`;
    }

    var text = data;
    text = text.replace("[USER_NAME]", user.firstName + " " + user.lastName);
    text = text.replace("[BUTTON_LINK_1]", link);
    text = text.replace("[TEXT_LINK]", link);
    const params = {
      Source: `DripText <noreply@driptext.de>`,
      Destination: {
        ToAddresses: [user.email],
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
    const result = await ses.sendEmail(params).promise();
    //console.log("Email sent successfully", result);

    // var mailOptions = {
    //   from: `DripText <noreply@driptext.de>`,
    //   to: user.email,
    //   subject: "Reset Password",
    //   html: text,
    // };

    // nodeMailer(mailOptions);
  } catch (error) {
    //console.log(error);
    // throw error;
    console.log("error sending email: ", error);
  }
};

Email.forgotPasswordAdmin = async (user, language) => {
  try {
    const forgetPasswordToken = jwt.signToken({
      userId: user.id,
      roleId: user.roleId,
      email: user.email,
    });

    var link =
      "https://driptext-admin-panel.vercel.app/" +
      "auth/forgetkey/" +
      forgetPasswordToken;
    
    let data = ''
    let emailSubject = ''
    if (language === 'en') {
      data = fs.readFileSync("./templates/english/emailForgotPassword.html", "utf8");
      emailSubject = `Oops, forgot your password? No problem!`;
    } else {
      data = fs.readFileSync("./templates/emailForgotPassword.html", "utf8");
      emailSubject = `Ups, Passwort vergessen? Kein Problem!`;

      
    }

    //  data = fs.readFileSync(
    //   "./templates/emailForgotPassword.html",
    //   "utf8"
    // );
    var text = data;
    text = text.replace("[USER_NAME]", user.firstName + " " + user.lastName);
    text = text.replace("[BUTTON_LINK_1]", link);
    text = text.replace("[TEXT_LINK]", link);
    const params = {
      Source: `DripText <noreply@driptext.de>`,
      Destination: {
        ToAddresses: [user.email],
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
    const result = await ses.sendEmail(params).promise();
    //console.log("Email sent successfully", result);

    // var mailOptions = {
    //   from: `DripText <noreply@driptext.de>`,
    //   to: user.email,
    //   subject: "Reset Password",
    //   html: text,
    // };

    // nodeMailer(mailOptions);
  } catch (error) {
    //console.log(error);
    // throw error;
    console.log("error sending email: ", error);
  }
};

Email.AwsEmailPassword = async (user, language) => {
  try {
    let filePath = "";
    let emailSubject = ''
    if (language === "en") {
      filePath = path.join(
        __dirname,
        "..",
        "templates",
        "english",
        "awsPasswordUpdateEmail.html"
      );
      emailSubject = `Access to the DripText WebApp`;
    } else {
      filePath = path.join(
        __dirname,
        "..",
        "templates",
        "awsPasswordUpdateEmail.html"
      );
      emailSubject = `Zugang zur DripText WebApp`;
    }
  
    const data = fs.readFileSync(filePath, "utf8");
    let text = data;
    // //console.log(text);
    const forgetPasswordToken = jwt.signToken({
      userId: user.id,
      roleId: user.role,
      email: user.email,
    });

    const link = `https://driptext-app.vercel.app/auth/forgetkey/${forgetPasswordToken}`;
    text = text.replace("[CLIENT_FIRST_NAME]", `${user.firstName} ${user.lastName}`);
    text = text.replace("[BUTTON_LINK_1]", link);

    const params = {
      Source: `DripText <noreply@driptext.de>`,
      Destination: {
        ToAddresses: [user.email],
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
    // //console.log(params);
    await ses.sendEmail(params).promise();
  } catch (error) {
    // throw error;
    console.log("error sending email: ", error);
  }
};

Email.sendBillingInfo = async (to, subject, clientData) => {
  try {
    //console.log("inside billing info");
    const filePath = path.join(
      __dirname,
      "..",
      "templates",
      "billingInfo.html"
    );
    const data = fs.readFileSync(filePath, "utf8");
    const template = handlebars.compile(data);
    const htmlContent = template(clientData);
    const params = {
      Source: `DripText <noreply@driptext.de>`,
      Destination: {
        ToAddresses: [to],
      },
      Message: {
        Subject: {
          Data: "Welcome Driptext! Your Subscription Is Now Active.",
        },
        Body: {
          Html: {
            Data: htmlContent,
          },
        },
      },
    };
    // const params = {
    // 	Source: emailFrom,
    // 	Destination: {
    // 	ToAddresses: [to],
    // 	BccAddresses: [bccEmail] // Optional: BCC to the error email
    // 	},
    // 	Message: {
    // 	Body: {
    // 		Html: {
    // 		Charset: "UTF-8",
    // 		Data: htmlContent
    // 		}
    // 	},
    // 	Subject: {
    // 		Charset: 'UTF-8',
    // 		Data: subject
    // 	}
    // 	}
    // };

    const result = await ses.sendEmail(params).promise();
    //console.log("Email sent successfully", result);
  } catch (error) {
    console.error("Error sending email", error);
  }
};

Email.onBoadingSuccess = async (user, project, language) => {
  try {
    let filePath = ''
    let emailSubject = ''
    if (language === 'en') {
       filePath = path.join(
         __dirname,
         "..",
         "templates",
         "english",
         "onBoardingSuccessEmail.html"
       );
      emailSubject = `Onboarding for ${project.projectName}`;
    } else {
       filePath = path.join(
         __dirname,
         "..",
         "templates",
         "onBoardingSuccessEmail.html"
       );
      emailSubject = `Onboarding für ${project.projectName}`;
      
    }
    //  filePath = path.join(
    //   __dirname,
    //   "..",
    //   "templates",
    //   "onBoardingSuccessEmail.html"
    // );
    //console.log(filePath);
    const data = fs.readFileSync(filePath, "utf8");
    let text = data;

    text = text.replace("[PROJECT_NAME]", project.projectName);
    text = text.replace("[CLIENT_FIRST_NAME]", user.firstName);

    // text = text.replace(
    //   "[PROJECT_LINK]",
    //   "https://driptext-app.vercel.app/client-dashboard"
    // );
    text = text.replace(
      "[DASHBOARD_LINK]",
      "https://driptext-app.vercel.app/client-dashboard"
    );

    //console.log(text);
    // const forgetPasswordToken = jwt.signToken({
    //   userId: user.id,
    //   roleId: user.role,
    //   email: user.email,
    // });

    // const link = `https://driptext-app.vercel.app/auth/forgetkey/${forgetPasswordToken}`;
    // text = text.replace("[USER_NAME]", `${user.firstName} ${user.lastName}`);
    // text = text.replace("[BUTTON_LINK_1]", link);

    const params = {
      Source: `DripText <noreply@driptext.de>`,
      Destination: {
        ToAddresses: [user.email],
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
    //console.log("on boarding success");
  } catch (error) {
    console.log("error sending email: ", error);
  }
};

Email.sendInvoiceToCustomer = async (user, link, language) => {
  try {
    let filePath = ''
    let emailSubject = ''
    if (language === 'en') {
       filePath = path.join(
         __dirname,
         "..",
         "templates",
         "english",
         "customerInvoice.html"
       );
      emailSubject = `DripText subscription for ${user.projectDomain} created`;
    } else {
       filePath = path.join(
         __dirname,
         "..",
         "templates",
         "customerInvoice.html"
       );
      emailSubject = `DripText-Abo für ${user.projectDomain} erstellt`;
    }
    //  filePath = path.join(
    //   __dirname,
    //   "..",
    //   "templates",
    //   "customerInvoice.html"
    // );
    //console.log(filePath);
    const data = fs.readFileSync(filePath, "utf8");
    let text = data;

    
    text = text.replace("[BUTTON_LINK_1]", link);
    text = text.replace(/\[CLIENT_FIRST_NAME\]/g, `${user.firstName}`);
    text = text.replace(/\[CLIENT_LAST_NAME\]/g, `${user.lastName}`);
    text = text.replace(/\[PROJECT_DOMAIN\]/g, `${user.projectDomain}`);
    text = text.replace("[EMAIL]", user.email);
    text = text.replace(
      /\[DASHBOARD_LINK\]/g,
      "https://driptext-app.vercel.app/client-dashboard"
    );

    const params = {
      Source: `DripText <noreply@driptext.de>`,
      Destination: {
        ToAddresses: [user.email],
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
    //console.log("on boarding success");
  } catch (error) {
    // throw error;
    console.log("error sending email: ", error);
    // throw new Error(`error sending customer invoice in email function: ${error}`)
  }
};

Email.onBoardingRequest = async (user, project, language) => {
  try {
    let filePath = ''
    let emailSubject = ''
    if (language === 'en') {
       filePath = path.join(
         __dirname,
         "..",
         "templates",
         "english",
         "requestOnBoarding.html"
       );
      emailSubject = `Welcome to DripText!`;
    } else {
       filePath = path.join(
         __dirname,
         "..",
         "templates",
         "requestOnBoarding.html"
       );
      emailSubject = `Willkommen bei DripText!`;
    }
    //  filePath = path.join(
    //   __dirname,
    //   "..",
    //   "templates",
    //   "requestOnBoarding.html"
    // );
    //console.log(filePath);
    const data = fs.readFileSync(filePath, "utf8");
    let text = data;
   
    text = text.replace(/\[PROJECT_DOMAIN\]/g, `${project.projectName}`);
    text = text.replace(/\[CLIENT_FIRST_NAME\]/g, `${user.firstName}`);
     text = text.replace(
       /\[BUTTON_LINK_1\]/g,
       "https://driptext-app.vercel.app/client-dashboard"
     );
    text = text.replace(
      /\[DASHBOARD_LINK\]/g,
      "https://driptext-app.vercel.app/client-dashboard"
    );


    const params = {
      Source: `DripText <noreply@driptext.de>`,
      Destination: {
        ToAddresses: [user.email],
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

module.exports = Email;
