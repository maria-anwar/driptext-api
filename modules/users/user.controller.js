const Joi = require("@hapi/joi");

const db = require("../../models");
const encryptHelper = require("../../utils/encryptHelper");
const emails = require("../../utils/emails");
const crypto = require("../../utils/crypto");

const Users = db.User;
const Roles = db.Role;
const UserPlan = db.UserPlan;
const Projects = db.Project;
const ProjectTask = db.ProjectTask;
const Company = db.Company;

exports.create = async (req, res) => {
	try {
		console.log("req", req);
		const joiSchema = Joi.object({
			firstName: Joi.string().required(),
			lastName: Joi.string().required(),
			projectName: Joi.string().required(),
			keywords: Joi.string().required(),
			email: Joi.string().email().required(),
			roleId: Joi.string().optional().allow(null).allow(""),
			planId: Joi.string().optional().allow(null).allow(""),
			subPlanId: Joi.string().optional().allow(null).allow(""),
			password: Joi.string().optional().allow(null).allow("")
		});
		const { error, value } = joiSchema.validate(req.body);

		if (error) {
			// emails.errorEmail(req, error);

			const message = error.details[0].message.replace(/"/g, "");
			res.status(400).send({
				message: message
			});
		} else {
			const userObj = {
				firstName: req.body.firstName?.trim(),
				lastName: req.body.lastName?.trim(),
				email: req.body.email,
				password: req.body.password ? req.body.password : "123456@123456",
				role: req.body.roleId
			};

			// if (req.role == "Administrator") {
			// 	userObj.clientId = crypto.decrypt(req.body.clientId);
			// 	userObj.roleId = crypto.decrypt(req.body.roleId);
			// } else if (req.role == "Client") {
			// 	userObj.clientId = crypto.decrypt(req.clientId);
			// 	userObj.roleId = 3;
			// }

			// let transaction = await sequelize.transaction();
			Users.create(userObj)
				.then(async (user) => {
					var userPlanObj = {};

					var projectObj = {
						projectName: req.body.projectName,
						keywords: req.body.keywords,
						user: user._id
					};

					if (req.body.planId) {
						userPlanObj = {
							user: user._id,
							plan: req.body.planId,
							plan: req.body.subPlanId
						};
					} else {
						userPlanObj = {
							user: user._id
						};
					}
					let createProject = await Projects.create(projectObj);
					let createUserPlan = await UserPlan.create(userPlanObj);

					if (createUserPlan && createProject) {
						console.log("here");
						emails.AwsEmailPassword(user);
						res.send({ message: "User Added" });
					}
				})
				.catch(async (err) => {
					// emails.errorEmail(req, err);
					res.status(500).send({
						message: err.message || "Some error occurred while creating the Quiz."
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

exports.update = async (req, res) => {
	try {
		const joiSchema = Joi.object({
			// userId: Joi.string().required(),
			firstName: Joi.string().required(),
			lastName: Joi.string().required(),
			email: Joi.string().required()
		});
		const { error, value } = joiSchema.validate(req.body);

		if (error) {
			emails.errorEmail(req, error);

			const message = error.details[0].message.replace(/"/g, "");
			res.status(400).send({
				message: message
			});
		} else {
			const userId = req.userId;

			const user = {
				firstName: req.body.firstName?.trim(),
				lastName: req.body.lastName?.trim(),
				email: req.body.email
			};

			var updateUser = await Users.findOneAndUpdate({ _id: userId, isActive: "Y" }, user, { new: true });
			if (updateUser) {
				res.send({
					message: "User updated successfully.",
					data: updateUser
				});
			} else {
				res.status(500).send({
					message: "Failed to update user."
				});
			}
		}
	} catch (err) {
		emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred."
		});
	}
};

exports.onboarding = async (req, res) => {
	try {
		const joiSchema = Joi.object({
			speech: Joi.string().required(),
			prespective: Joi.string().required(),
			projectName: Joi.string().required(),
			userId: Joi.string().optional().allow("").allow(null),
			companyBackgorund: Joi.string().optional().allow("").allow(null),
			companyAttributes: Joi.string().optional().allow("").allow(null),
			comapnyServices: Joi.string().optional().allow("").allow(null),
			customerContent: Joi.string().optional().allow("").allow(null),
			customerIntrest: Joi.string().optional().allow("").allow(null),
			contentPurpose: Joi.string().optional().allow("").allow(null),
			contentInfo: Joi.string().optional().allow("").allow(null)
		});
		const { error, value } = joiSchema.validate(req.body);

		if (error) {
			// emails.errorEmail(req, error);

			const message = error.details[0].message.replace(/"/g, "");
			res.status(400).send({
				message: message
			});
		} else {
			const userId = req.body.userId ? req.body.userId : null;
			const projectName = req.body.projectName;
			const speech = req.body.speech;
			const prespective = req.body.prespective;

			let companyInfoObj = {
				companyBackgorund: req.body.companyBackgorund,
				companyAttributes: req.body.companyAttributes,
				comapnyServices: req.body.comapnyServices,
				customerContent: req.body.customerContent,
				customerIntrest: req.body.customerIntrest,
				contentPurpose: req.body.contentPurpose,
				contentInfo: req.body.contentInfo
			};

			var whereClause;
			if (userId) {
				whereClause = {
					_id: userId,
					isActive: "Y"
				};
			} else {
				whereClause = {
					projectName: projectName,
					isActive: "Y"
				};
			}

			let project = await Projects.findOne(whereClause)
				.populate({ path: "user", select: "email role", populate: { path: "role", select: "title" } })
				.select("id projectName keywords");
			let role = project.user.role;
			if (project && role) {
				if ((role.title = "Leads")) {
					let proectTaskObj = {
						tasks: "1",
						keywords: project.keywords,
						project: project._id
					};
					companyInfoObj.user = project.user._id;

					let createCompany = await Company.create(companyInfoObj);
					let upadteProject = await Projects.findOneAndUpdate(
						{ _id: project._id },
						{ speech: speech, prespective: prespective },
						{ new: true }
					);
					let createProjectTask = await ProjectTask.create(proectTaskObj);
					if (upadteProject && createProjectTask) {
						res.send({ message: "OnBoarding successful", data: createProjectTask });
					}
				}
			}

			// res.send({ data: project });
		}
	} catch (err) {
		// emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred."
		});
	}
};
