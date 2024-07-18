const nodemailer = require("nodemailer");
const secrets = require("../config/secrets");

const emailSend = secrets.email.send;
const emailAPIKey = secrets.email.auth.api_key;

async function nodeMailer(mailOptions) {
	// console.log(mailOptions);
	return 1;
	if (emailSend == "active") {
		console.log("hellow");
		const transporter = await nodemailer.createTransport({
			host: "smtp.sendgrid.net",
			port: 465,
			auth: {
				user: "apikey",
				pass: emailAPIKey
			}
		});
		try {
			await transporter.verify();
		} catch (error) {
			throw error;
		}
		const info = await transporter.sendMail(mailOptions);
		console.log("Email sent to ", mailOptions.to, info);
		return info;
	} else {
		return 1;
	}
}

module.exports = nodeMailer;
