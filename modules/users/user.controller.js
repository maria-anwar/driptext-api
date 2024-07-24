const Joi = require("@hapi/joi");

const db = require("../../models");
const encryptHelper = require("../../utils/encryptHelper");
const emails = require("../../utils/emails");
const crypto = require("../../utils/crypto");

const Users = db.User;
const Roles = db.Role;
const UserPlan = db.UserPlan;
const Projects = db.Project;

exports.create = async (req, res) => {
	try {
		console.log("req", req)
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
						console.log("here")
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

// exports.update = async (req, res) => {
// 	try {
// 		const joiSchema = Joi.object({
// 			userId: Joi.string().required(),
// 			firstName: Joi.string().required(),
// 			lastName: Joi.string().required(),
// 			email: Joi.string().required(),
// 			managerId: Joi.string().optional().allow(null).allow(""),
// 			departmentId: Joi.string().optional().allow(null).allow(""),
// 			designationId: Joi.string().optional().allow(null).allow("")
// 		});
// 		const { error, value } = joiSchema.validate(req.body);

// 		if (error) {
// 			emails.errorEmail(req, error);

// 			const message = error.details[0].message.replace(/"/g, "");
// 			res.status(400).send({
// 				message: message
// 			});
// 		} else {
// 			const userId = crypto.decrypt(req.body.userId);
// 			const userExists = await Users.findOne({ where: { email: req.body.email?.trim(), isActive: "Y" } });

// 			if (userExists) {
// 				res.status(401).send({
// 					title: "Email already exists!",
// 					mesage: "Email already registered."
// 				});
// 				return;
// 			}
// 			const user = {
// 				firstName: req.body.firstName?.trim(),
// 				lastName: req.body.lastName?.trim(),
// 				email: req.body.email,
// 				managerId: req.body.managerId ? crypto.decrypt(req.body.managerId) : null,
// 				userDepartmentId: req.body.departmentId ? crypto.decrypt(req.body.departmentId) : null,
// 				userDesignationId: req.body.designationId ? crypto.decrypt(req.body.designationId) : null
// 			};

// 			var updateUser = await Users.update(user, { where: { id: userId, isActive: "Y" } });
// 			if (updateUser == 1) {
// 				res.send({
// 					message: "User updated successfully."
// 				});
// 			} else {
// 				res.status(500).send({
// 					message: "Failed to update user."
// 				});
// 			}
// 		}
// 	} catch (err) {
// 		emails.errorEmail(req, err);
// 		res.status(500).send({
// 			message: err.message || "Some error occurred."
// 		});
// 	}
// };

// exports.updateProfile = async (req, res) => {
// 	try {
// 		const joiSchema = Joi.object({
// 			firstName: Joi.string().required(),
// 			lastName: Joi.string().required(),
// 			email: Joi.string().required(),
// 			jobTitle: Joi.string().optional().allow(null).allow(""),
// 			phoneNumber: Joi.string().optional().allow(null).allow(""),
// 			skype: Joi.string().optional().allow(null).allow(""),
// 			address: Joi.string().optional().allow(null).allow(""),
// 			city: Joi.string().optional().allow(null).allow(""),
// 			state: Joi.string().optional().allow(null).allow(""),
// 			zipcode: Joi.string().optional().allow(null).allow(""),
// 			country: Joi.string().optional().allow(null).allow("")
// 		});
// 		const { error, value } = joiSchema.validate(req.body);

// 		if (error) {
// 			emails.errorEmail(req, error);

// 			const message = error.details[0].message.replace(/"/g, "");
// 			res.status(400).send({
// 				message: message
// 			});
// 		} else {
// 			const userId = crypto.decrypt(req.userId);
// 			const profileId = crypto.decrypt(req.profileId);

// 			var user = {
// 				firstName: req.body.firstName?.trim(),
// 				lastName: req.body.lastName?.trim(),
// 				email: req.body.email?.trim()
// 			};
// 			var profile = {
// 				jobTitle: req.body.jobTitle,
// 				phoneNumber: req.body.phoneNumber,
// 				skype: req.body.skype,
// 				address: req.body.address,
// 				city: req.body.city,
// 				state: req.body.state,
// 				zipcode: req.body.zipcode,
// 				country: req.body.country
// 			};

// 			var transaction = await sequelize.transaction();

// 			var updateUser = await Users.update(user, { where: { id: userId, isActive: "Y" }, transaction });
// 			var updateProfile = await UserProfile.update(profile, { where: { id: profileId, isActive: "Y" }, transaction });

// 			if (updateUser == 1 && updateProfile == 1) {
// 				if (transaction) await transaction.commit();
// 				res.send({
// 					message: "User profile updated successfully."
// 				});
// 			} else {
// 				if (transaction) await transaction.rollback();
// 				res.send({
// 					message: "Failed to update user profile."
// 				});
// 			}
// 		}
// 	} catch (err) {
// 		emails.errorEmail(req, err);
// 		res.status(500).send({
// 			message: err.message || "Some error occurred."
// 		});
// 	}
// };

// exports.updateProfileImage = async (req, res) => {
// 	try {
// 		const joiSchema = Joi.object({
// 			image: Joi.any()
// 		});
// 		const { error, value } = joiSchema.validate(req.body);

// 		if (error) {
// 			emails.errorEmail(req, error);

// 			const message = error.details[0].message.replace(/"/g, "");
// 			res.status(400).send({
// 				message: message
// 			});
// 		} else {
// 			let userId = crypto.decrypt(req.userId);
// 			// console.log(req.file);
// 			let imageUrl = "uploads/users/" + req.file.filename;
// 			var updateUser = await UserProfile.update({ imageUrl }, { where: { userId: userId, isActive: "Y" } });

// 			if (updateUser == 1) {
// 				res.status(200).send({ message: "User Profile Image is Updated" });
// 			} else {
// 				res.send({
// 					message: "Failed to update user profile image."
// 				});
// 			}
// 		}
// 	} catch (err) {
// 		emails.errorEmail(req, err);
// 		res.status(500).send({
// 			message: err.message || "Some error occurred."
// 		});
// 	}
// };

// exports.listUsers = (req, res) => {
// 	try {
// 		const where = { isActive: "Y" };
// 		if (req.role == "Client") {
// 			where.clientId = crypto.decrypt(req.clientId);
// 		}

// 		Users.findAll({
// 			where,
// 			include: [
// 				{
// 					model: UserProfile,
// 					attributes: { exclude: ["isActive", "createdAt", "updatedAt"] }
// 				},
// 				{
// 					model: Users,
// 					as: "manager",
// 					attributes: ["firstName", "lastName"]
// 				},
// 				{
// 					model: UserDepartments,
// 					attributes: ["title"]
// 				},
// 				{
// 					model: UserDesignations,
// 					attributes: ["title"]
// 				},
// 				{
// 					model: Roles,
// 					where: { isActive: "Y" },
// 					attributes: ["title"]
// 				},
// 				{
// 					model: Clients,
// 					where: { isActive: "Y" },
// 					attributes: ["name", "website", "logoURL"]
// 				}
// 			],
// 			attributes: { exclude: ["createdAt", "updatedAt", "password"] }
// 		})
// 			.then((data) => {
// 				encryptHelper(data);
// 				res.send({
// 					messgae: "Users list retrived",
// 					data
// 				});
// 			})
// 			.catch((err) => {
// 				emails.errorEmail(req, err);
// 				res.status(500).send({
// 					message: err.message || "Some error occurred while retrieving Users."
// 				});
// 			});
// 	} catch (err) {
// 		emails.errorEmail(req, err);
// 		res.status(500).send({
// 			message: err.message || "Some error occurred."
// 		});
// 	}
// };

// exports.listDepartments = (req, res) => {
// 	try {
// 		UserDepartments.findAll({
// 			where: { isActive: "Y" },
// 			attributes: ["id", "title"]
// 		})
// 			.then((data) => {
// 				encryptHelper(data);
// 				res.send({
// 					messgae: "Departments list retrieved",
// 					data
// 				});
// 			})
// 			.catch((err) => {
// 				emails.errorEmail(req, err);
// 				res.status(500).send({
// 					message: err.message || "Some error occurred while retrieving Departments."
// 				});
// 			});
// 	} catch (err) {
// 		emails.errorEmail(req, err);
// 		res.status(500).send({
// 			message: err.message || "Some error occurred."
// 		});
// 	}
// };

// exports.listDesignations = (req, res) => {
// 	try {
// 		UserDesignations.findAll({
// 			where: { isActive: "Y" },
// 			attributes: ["id", "title"]
// 		})
// 			.then((data) => {
// 				encryptHelper(data);
// 				res.send({
// 					messgae: "Designations list retrieved",
// 					data
// 				});
// 			})
// 			.catch((err) => {
// 				emails.errorEmail(req, err);
// 				res.status(500).send({
// 					message: err.message || "Some error occurred while retrieving Designations."
// 				});
// 			});
// 	} catch (err) {
// 		emails.errorEmail(req, err);
// 		res.status(500).send({
// 			message: err.message || "Some error occurred."
// 		});
// 	}
// };

// exports.detail = (req, res) => {
// 	try {
// 		Users.findOne({
// 			where: { id: crypto.decrypt(req.userId), isActive: "Y" },
// 			include: [
// 				{
// 					model: UserProfile,
// 					attributes: { exclude: ["id", "userId", "isActive", "createdAt", "updatedAt"] }
// 				},
// 				{
// 					model: UserDepartments,
// 					attributes: ["title"]
// 				},
// 				{
// 					model: UserDesignations,
// 					attributes: ["title"]
// 				},
// 				{
// 					model: Users,
// 					as: "manager",
// 					attributes: ["firstName", "lastName"]
// 				},
// 				{
// 					model: Roles,
// 					attributes: ["title"]
// 				}
// 			],
// 			attributes: {
// 				exclude: [
// 					"isActive",
// 					"password",
// 					"createdAt",
// 					"updatedAt",
// 					"userDepartmentId",
// 					"userDesignationId",
// 					"roleId",
// 					"managerId",
// 					"clientId"
// 				]
// 			}
// 		})
// 			.then((data) => {
// 				encryptHelper(data);
// 				res.send({
// 					message: "User info retrieved",
// 					data
// 				});
// 			})
// 			.catch((err) => {
// 				emails.errorEmail(req, err);
// 				res.status(500).send({
// 					message: err.message || "Some error occurred while retrieving user."
// 				});
// 			});
// 	} catch (err) {
// 		emails.errorEmail(req, err);
// 		res.status(500).send({
// 			message: err.message || "Some error occurred."
// 		});
// 	}
// };

// exports.changePassword = async (req, res) => {
// 	try {
// 		const joiSchema = Joi.object({
// 			oldPassword: Joi.string().required(),
// 			password: Joi.string().min(8).max(16).required(),
// 			passwordConfirmation: Joi.any()
// 				.valid(Joi.ref("password"))
// 				.required()
// 				.label("Password and confirm password doesn't match.")
// 		});
// 		const { error, value } = joiSchema.validate(req.body);

// 		if (error) {
// 			emails.errorEmail(req, error);

// 			const message = error.details[0].message.replace(/"/g, "");
// 			res.status(400).send({
// 				message: message
// 			});
// 		} else {
// 			const id = crypto.decrypt(req.userId);
// 			const oldPassword = req.body.oldPassword;
// 			const newPassword = req.body.password;

// 			const user = await Users.findOne({ where: { id: id, isActive: "Y", password: oldPassword } });

// 			if (user) {
// 				Users.update({ password: newPassword }, { where: { id: id, isActive: "Y", password: oldPassword } })
// 					.then((num) => {
// 						if (num == 1) {
// 							res.send({
// 								message: `User password updated successfully!`
// 							});
// 						} else {
// 							res.send({
// 								message: `Cannot update User password. Maybe User was not found or req body is empty.`
// 							});
// 						}
// 					})
// 					.catch((err) => {
// 						emails.errorEmail(req, err);
// 						res.status(500).send({
// 							message: "Error updating User password"
// 						});
// 					});
// 			} else {
// 				res.status(406).send({
// 					message: `Old password does not match.`
// 				});
// 			}
// 		}
// 	} catch (err) {
// 		emails.errorEmail(req, err);
// 		res.status(500).send({
// 			message: err.message || "Some error occurred."
// 		});
// 	}
// };

// exports.delete = (req, res) => {
// 	try {
// 		const userId = crypto.decrypt(req.body.userId);

// 		Users.update({ isActive: "N" }, { where: { id: userId } })
// 			.then(async (num) => {
// 				if (num == 1) {
// 					res.send({
// 						message: "User was deleted successfully."
// 					});
// 				} else {
// 					res.send({
// 						message: `Cannot delete User. Maybe User was not found!`
// 					});
// 				}
// 			})
// 			.catch((err) => {
// 				emails.errorEmail(req, err);
// 				res.status(500).send({
// 					message: "Error deleting User"
// 				});
// 			});
// 	} catch (err) {
// 		emails.errorEmail(req, err);
// 		res.status(500).send({
// 			message: err.message || "Some error occurred."
// 		});
// 	}
// };

// exports.reset = (req, res) => {
// 	try {
// 		const joiSchema = Joi.object({
// 			userId: Joi.string().required(),
// 			newPassword: Joi.string().min(8).max(16).required()
// 		});
// 		const { error, value } = joiSchema.validate(req.body);
// 		if (error) {
// 			emails.errorEmail(req, error);
// 			const message = error.details[0].message.replace(/"/g, "");
// 			res.status(400).send({
// 				message: message
// 			});
// 		} else {
// 			const userId = crypto.decrypt(req.body.userId);
// 			const newPassword = req.body.newPassword;
// 			Users.findOne({ where: { id: userId, isActive: "Y" } })
// 				.then((response) => {
// 					if (response) {
// 						Users.update({ password: newPassword }, { where: { id: userId, isActive: "Y" } })
// 							.then((response) => {
// 								res.send({ message: "Credentiales are updated" });
// 							})
// 							.catch((err) => {
// 								emails.errorEmail(req, err);
// 								res.status(500).send({
// 									message: err.message || "Some error occurred."
// 								});
// 							});
// 					}
// 				})
// 				.catch((err) => {
// 					emails.errorEmail(req, err);
// 					res.status(500).send({
// 						message: err.message || "Some error occurred."
// 					});
// 				});
// 		}
// 	} catch (err) {
// 		emails.errorEmail(req, err);
// 		res.status(500).send({
// 			message: err.message || "Some error occurred."
// 		});
// 	}
// };
