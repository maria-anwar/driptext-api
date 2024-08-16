const Joi = require("@hapi/joi");

const db = require("../../models");
const encryptHelper = require("../../utils/encryptHelper");
const emails = require("../../utils/emails");
const crypto = require("../../utils/crypto");

const Users = db.User;
const UserPlan = db.UserPlan;
const Roles = db.Role;
const Project = db.Project;
const ProjectTask = db.ProjectTask;

exports.create = async (req, res) => {
	try {
		const joiSchema = Joi.object({
			projectName: Joi.string().required(),
			id: Joi.string().required(),
			keywords: Joi.string().required(),
			userId: Joi.string().required(),
			numberOfTasks: Joi.string().required(),
			projectStatus: Joi.string().optional().allow(null).allow(""),
			speech: Joi.string().optional().allow(null).allow(""),
			perspective: Joi.string().optional().allow(null).allow("")
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
				let projectObj = {
					projectName: req.body.projectName,
					keywords: req.body.keywords,
					user: req.body.userId,
					projectStatus: req.body.projectStatus,
					speech: req.body.speech ? req.body.speech : "",
					perspective: req.body.perspective ? req.body.perspective : ""
				};
				if (userExists.role.title == "Leads") {
					projectObj.numberOfTasks;

					Project.create(projectObj).then((response) => {
						// let projectTaskObj={
						// }
					});
				}
				const projectName = req.body.projectName;
				const id = req.body.id;
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
			// emails.errorEmail(req, error);

			const message = error.details[0].message.replace(/"/g, "");
			res.status(401).send({
				message: message
			});
		} else {
			const userId = req.body.userId;

			Users.find({ _id: userId })
				.populate("projects")
				.select("email firstName isSubScribed lastName")
				.then(async (response) => {
					res.send({ message: "List of the client projects", data: response });
				})
				.catch((err) => {
					res.status(500).send({
						message: err.message || "Some error occurred."
					});
				});
		}
	} catch (err) {
		// emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred."
		});
	}
};
