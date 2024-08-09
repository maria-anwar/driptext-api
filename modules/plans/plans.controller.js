const db = require("../../models");
const encryptHelper = require("../../utils/encryptHelper");
const emails = require("../../utils/emails");

const Plans = db.Plan;

exports.list = (req, res) => {
	try {
		Plans.find({})
			.select("title value subplan")
			.populate({ path: "subplan" })
			.then((data) => {
				// encryptHelper(data);
				res.send({
					message: "Plans list retrived",
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
