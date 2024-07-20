const Joi = require("@hapi/joi");

const db = require("../../models");
const encryptHelper = require("../../utils/encryptHelper");
const emails = require("../../utils/emails");
const crypto = require("../../utils/crypto");

const Users = db.User;
const Roles = db.Role;
const Project = db.Project;

exports.create = async (req, res) => {
	try {
		const joiSchema = Joi.object({
			projectName: Joi.string().required(),
			id: Joi.string().required(),
			userId: Joi.string().optional().allow(null).allow("")
		});
		const { error, value } = joiSchema.validate(req.body);

		if (error) {
			emails.errorEmail(req, error);

			const message = error.details[0].message.replace(/"/g, "");
			res.status(400).send({
				message: message
			});
		} else {
			const userExists = await Users.find({ _id: req.body.userId, isActive: "Y" }).populate("role");
			if (!userExists) {
				res.send({ message: "User Not Found" });
			} else {
				const projectName = req.body.projectName;
				const id = req.body.id;

				if (userExists.title == "Leads") {
				}
			}
		}
	} catch (err) {
		emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred."
		});
	}
};

exports.detail = async (req, res) => {
	try {
		const joiSchema = Joi.object({
			userId: Joi.string().required()
		});
		const { error, value } = joiSchema.validate(req.body);

		if (error) {
			emails.errorEmail(req, error);

			const message = error.details[0].message.replace(/"/g, "");
			res.status(400).send({
				message: message
			});
		} else {
			const userId = req.body.userId;

			Project.find({ user: userId })
				.select("projectName keywords")
				.then((response) => {
					res.send({ message: "List of the client projects", data: response });
				});
		}
	} catch (err) {
		emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred."
		});
	}
};
