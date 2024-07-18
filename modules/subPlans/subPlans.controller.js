const db = require("../../models");
const encryptHelper = require("../../utils/encryptHelper");
const emails = require("../../utils/emails");
const Joi = require("@hapi/joi");

const SubPlans = db.SubPlan;

exports.list = (req, res) => {
	try {
		SubPlans.find({})
			.select("title duration price texts ")
			.populate({ path: "plan", select: "title value" })
			.then((data) => {
				// encryptHelper(data);
				res.send({
					message: "Sub Plans list retrived",
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

exports.detail = (req, res) => {
	try {
		const joiSchema = Joi.object({
			id: Joi.string().required()
		});
		const { error, value } = joiSchema.validate(req.body);
		if (error) {
			emails.errorEmail(req, error);

			const message = error.details[0].message.replace(/"/g, "");
			res.status(400).send({
				message: message
			});
		} else {
			const id = req.body.id;
			SubPlans.find({ plan: id })
				.select("title duration price texts ")
				.populate({ path: "plan", select: "title value" })
				.then((data) => {
					// encryptHelper(data);
					res.send({
						message: "Sub Plans list retrived",
						data
					});
				})
				.catch((err) => {
					emails.errorEmail(req, err);
					res.status(500).send({
						message: err.message || "Some error occurred while retrieving roles."
					});
				});
		}
	} catch (err) {
		emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred."
		});
	}
};
