const db = require("../../models");
const encryptHelper = require("../../utils/encryptHelper");
const emails = require("../../utils/emails");
// const Op = db.Sequelize.Op;

const Roles = db.Role;

exports.list = (req, res) => {
	try {
		Roles.find({}).select('title ')
			.then((data) => {
				encryptHelper(data);
				res.send({
					message: "Roles list retrived",
					data
				});
			})
			.catch((err) => {
				emails.errorEmail(req, err);
				res.status(500).send({
					message: err.message || "Some error occurred while retrieving roles."
				});
			});
	} catch (err) {
		emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred."
		});
	}
};
