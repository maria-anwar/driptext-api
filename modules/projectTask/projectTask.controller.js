const Joi = require("@hapi/joi");

const db = require("../../models");
const encryptHelper = require("../../utils/encryptHelper");
const emails = require("../../utils/emails");
const crypto = require("../../utils/crypto");

const Users = db.User;
const Roles = db.Role;
const ProjectTask = db.ProjectTask;

exports.detail = async (req, res) => {
	try {
		const joiSchema = Joi.object({
			projectId: Joi.string().required()
		});
		const { error, value } = joiSchema.validate(req.body);

		if (error) {
			// emails.errorEmail(req, error);

			const message = error.details[0].message.replace(/"/g, "");
			res.status(400).send({
				message: message
			});
		} else {
			const projectId = req.body.projectId;

			ProjectTask.find({ project: projectId })
				.select("-assignedLector -assignedTexter -comments")
				.then((response) => {
					res.send({ message: "Detail of the project task", data: response });
				});
		}
	} catch (err) {
		// emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred."
		});
	}
};
