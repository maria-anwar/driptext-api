const Joi = require("@hapi/joi");
const mongoose = require("mongoose");
const db = require("../../models");
const encryptHelper = require("../../utils/encryptHelper");
const emails = require("../../utils/emails");
const crypto = require("../../utils/crypto");
const fs = require("fs");
const handlebars = require("handlebars");

const Users = db.User;
const Roles = db.Role;
const UserPlan = db.UserPlan;
const Projects = db.Project;
const ProjectTask = db.ProjectTask;
const Company = db.Company;
const Billing = db.Billing;

exports.create = async (req, res) => {
	try {
		const joiSchema = Joi.object({
			firstName: Joi.string().required(),
			lastName: Joi.string().required(),
			projectName: Joi.string().required(),
			keywords: Joi.string().optional().allow("").allow(null),
			email: Joi.string().email().required(),
			roleId: Joi.string().required(),
			country: Joi.string().optional().allow(null).allow(""),
			vatId: Joi.string().optional().allow(null).allow(""),
			companyName: Joi.string().optional().allow(null).allow(""),
			planId: Joi.string().optional().allow(null).allow(""),
			subPlanId: Joi.string().optional().allow(null).allow(""),
			password: Joi.string().optional().allow(null).allow(""),
			isSubscribed: Joi.string().optional().allow("").allow(null),
			response: Joi.object().optional().allow("").allow(null)
		});
		const { error, value } = joiSchema.validate(req.body);

		if (error) {
			// emails.errorEmail(req, error);

			// const message = error.details[0].message.replace(/"/g, "");
			res.status(400).send({
				message: "Some Error"
			});
		} else {
			console.log("1");
			const billResponse = req.body.response;
			const userObj = {
				firstName: req.body.firstName?.trim(),
				lastName: req.body.lastName?.trim(),
				email: req.body.email,
				country: req.body.country ? req.body.country : null,
				vatIdNo: req.body.vatId ? req.body.vatId : null,
				companyName: req.body.companyName ? req.body.companyName : null,
				password: req.body.password ? req.body.password : "123456@123456",
				role: req.body.roleId,
				isSubscribed: req.body.isSubscribed ? req.body.isSubscribed : "N"
			};
			const session = await mongoose.startSession();
			session.startTransaction();
			console.log("2");

			let alredyExist = await Users.findOne({ email: userObj.email }).populate("role");

			let userRole = await Roles.findOne({ _id: userObj.role });
			console.log("22");
			if (userRole.title == "Client" && !req.body.planId && !req.body.subPlanId) {
				await session.commitTransaction();
				session.endSession();
				res.send({ message: "Plan and SubPlan ID's are required for the client role" });
				return 1;
			}
			console.log("3");

			if (!alredyExist) {
				console.log("4");
				// let transaction = await sequelize.transaction();
				Users.create(userObj)
					.then(async (user) => {
						console.log("5");
						var userPlanObj = {};

						var projectObj = {
							projectName: req.body.projectName,
							keywords: req.body.keywords ? req.body.keywords : null,
							user: user._id
						};

						if (req.body.planId) {
							console.log("6");
							userPlanObj = {
								user: user._id,
								plan: req.body.planId,
								subPlan: req.body.subPlanId
							};
						} else {
							console.log("7");
							userPlanObj = {
								user: user._id
							};
						}

						let subscriptionItems;
						let paymentMethod;
						let billingResponse;
						let createBilling = "";
						console.log("8");
						if (req.body.response) {
							console.log("9");
							subscriptionItems = {
								item_price_id: billResponse.subscription.subscription_items[0].item_price_id,
								item_type: billResponse.subscription.subscription_items[0].item_type,
								quantity: billResponse.subscription.subscription_items[0].quantity,
								unit_price: billResponse.subscription.subscription_items[0].unit_price,
								amount: billResponse.subscription.subscription_items[0].amount,
								current_term_start: billResponse.subscription.subscription_items[0].current_term_start,
								current_term_end: billResponse.subscription.subscription_items[0].current_term_end,
								next_billing_at: billResponse.subscription.subscription_items[0].next_billing_at,
								free_quantity: billResponse.subscription.subscription_items[0].free_quantity
							};

							paymentMethod = {
								type: billResponse.customer.payment_method.type,
								reference_id: billResponse.customer.payment_method.reference_id,
								gateway: billResponse.customer.payment_method.gateway,
								gateway_account_id: billResponse.customer.payment_method.gateway_account_id,
								status: billResponse.customer.payment_method.status
							};

							billingResponse = {
								userId: user._id,
								subscriptionId: billResponse.subscription.id,
								subscriptionStatus: billResponse.subscription.status,
								subscriptionItem: [subscriptionItems],
								customer_id: billResponse.customer.id,
								customer_first_name: billResponse.customer.first_name,
								customer_last_name: billResponse.customer.last_name,
								customer_email: billResponse.customer.email,
								payment_method: paymentMethod
							};
							createBilling = await Billing.create(billingResponse);
						}
						console.log("10");
						let createProject = await Projects.create(projectObj);
						let createUserPlan = await UserPlan.create(userPlanObj);

						if (createUserPlan && createProject) {
							console.log("11");
							// console.log("In Email block")
							// Data to be injected into the template

							if (createBilling !== "") {
								console.log("12");
								const clientData = {
									clientName: `${req.body.firstName} ${req.body.lastName}`,
									clientEmail: `${req.body.email}`,
									subscriptionStatus: `${billResponse.subscription.status}`,
									subscriptionStartDate: `${billResponse.subscription.subscription_items[0].current_term_start}`,
									subscriptionEndDate: `${billResponse.subscription.subscription_items[0].current_term_end}`,
									paymentMethodType: `${billResponse.customer.payment_method.type}`,
									amount: `${billResponse.subscription.subscription_items[0].unit_price}`
								};
								// Send email
								emails.sendBillingInfo(clientData.clientEmail, "Your Billing Information", clientData);
							}
							console.log("13");
							// console.log("here");
							emails.emailPassword(user);

							await session.commitTransaction();
							session.endSession();
							res.send({ message: "User Added", data: user });
						}
					})
					.catch(async (err) => {
						console.log("14");
						// emails.errorEmail(req, err);
						await session.abortTransaction();
						session.endSession();
						res.status(500).send({
							message: err.message || "Some error occurred while creating the Quiz."
						});
					});
			} else if (alredyExist && (alredyExist.role.title == "Leads" || alredyExist.role.title == "leads")) {
				const userRole = await Roles.findOne({ _id: userObj.role });
				if (userRole.title !== "Client") {
					res.send("You have to buy Subscription.");
				}
				Users.findOneAndUpdate({ _id: alredyExist._id }, userObj, { new: true })
					.then(async (user) => {
						var userPlanObj = {};

						var projectObj = {
							projectName: req.body.projectName,
							keywords: req.body.keywords ? req.body.keywords : null,
							user: user._id
						};

						if (req.body.planId) {
							userPlanObj = {
								user: user._id,
								plan: req.body.planId,
								subPlan: req.body.subPlanId
							};
						} else {
							userPlanObj = {
								user: user._id
							};
						}
						let createProject = await Projects.create(projectObj);
						let createUserPlan = await UserPlan.create(userPlanObj);

						if (createUserPlan && createProject) {
							// console.log("here");
							emails.AwsEmailPassword(user);

							await session.commitTransaction();
							session.endSession();
							res.send({ message: "User Added", data: user });
						}
					})
					.catch(async (err) => {
						// emails.errorEmail(req, err);
						await session.abortTransaction();
						session.endSession();
						res.status(500).send({
							message: err.message || "Some error occurred while creating the Quiz."
						});
					});
			} else {
				const userRole = await Roles.findOne({ _id: userObj.role });
				if (userRole.title !== "Client") {
					res.send("You have to buy Subscription.");
				}
				Users.findOneAndUpdate({ _id: alredyExist._id }, userObj, { new: true })
					.then(async (user) => {
						var userPlanObj = {};

						var projectObj = {
							projectName: req.body.projectName,
							keywords: req.body.keywords ? req.body.keywords : null,
							user: user._id
						};

						if (req.body.planId) {
							userPlanObj = {
								user: user._id,
								plan: req.body.planId,
								subPlan: req.body.subPlanId
							};
						} else {
							userPlanObj = {
								user: user._id
							};
						}
						let subscriptionItems;
						let paymentMethod;
						let billingResponse;
						if (billResponse !== "" && billResponse !== null) {
							subscriptionItems = {
								item_price_id: billResponse.subscription.subscription_items[0].item_price_id,
								item_type: billResponse.subscription.subscription_items[0].item_type,
								quantity: billResponse.subscription.subscription_items[0].quantity,
								unit_price: billResponse.subscription.subscription_items[0].unit_price,
								amount: billResponse.subscription.subscription_items[0].amount,
								current_term_start: billResponse.subscription.subscription_items[0].current_term_start,
								current_term_end: billResponse.subscription.subscription_items[0].current_term_end,
								next_billing_at: billResponse.subscription.subscription_items[0].next_billing_at,
								free_quantity: billResponse.subscription.subscription_items[0].free_quantity
							};

							paymentMethod = {
								type: billResponse.customer.payment_method.type,
								reference_id: billResponse.customer.payment_method.reference_id,
								gateway: billResponse.customer.payment_method.gateway,
								gateway_account_id: billResponse.customer.payment_method.gateway_account_id,
								status: billResponse.customer.payment_method.status
							};

							billingResponse = {
								userId: user._id,
								subscriptionId: billResponse.subscription.id,
								subscriptionStatus: billResponse.subscription.status,
								subscriptionItem: [{ subscriptionItems }],
								customer_id: billResponse.customer.id,
								customer_first_name: billResponse.customer.first_name,
								customer_last_name: billResponse.customer.last_name,
								customer_email: billResponse.customer.email,
								payment_method: paymentMethod
							};
						}

						let createProject = await Projects.create(projectObj);
						let createUserPlan = await UserPlan.create(userPlanObj);
						let createBilling = await Billing.create(billingResponse);

						if (createUserPlan && createProject && createBilling) {
							// console.log("here");
							emails.AwsEmailPassword(user);

							await session.commitTransaction();
							session.endSession();
							res.send({ message: "User Added", data: user });
						}
					})
					.catch(async (err) => {
						// emails.errorEmail(req, err);
						await session.abortTransaction();
						session.endSession();
						res.status(500).send({
							message: err.message || "Some error occurred while creating the Quiz."
						});
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
exports.update = async (req, res) => {
	try {
		const joiSchema = Joi.object({
			// userId: Joi.string().required(),
			firstName: Joi.string().required(),
			lastName: Joi.string().required()
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
				lastName: req.body.lastName?.trim()
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
	const session = await mongoose.startSession();
	session.startTransaction();
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

			let projectStatus;
			let taskStatus;

			var whereClause;
			if (userId) {
				whereClause = {
					user: userId,
					projectName: projectName,
					isActive: "Y"
				};
			}
			// } else {
			// 	whereClause = {
			// 		projectName: projectName,
			// 		isActive: "Y"
			// 	};
			// }

			// let getUserRole = await Users.findOne({ _id: userId }).populate({ path: "role" });

			let getproject = await Projects.findOne(whereClause);
			if (getproject) {
				var project = await Projects.findOne(whereClause)
					.populate({ path: "user", select: "email role", populate: { path: "role", select: "title" } })
					.select("id projectName keywords");
				var role = project.user.role;
			}

			if (role && project) {
				if ((role.title == "leads" || role.title == "Leads") && project.projectName == projectName) {
					let taskCount = await ProjectTask.countDocuments({ project: project._id });
					if (taskCount == 0) {
						if (speech !== "" && prespective !== "") {
							projectStatus = "Free Trial";
							taskStatus = "Ready to Start";
						}
						let proectTaskObj = {
							keywords: project.keywords,
							project: project._id,
							desiredNumberOfWords: "1500",
							status: taskStatus,
							tasks: taskCount + 1
						};
						companyInfoObj.user = project.user._id;

						let createCompany = await Company.create(companyInfoObj);

						let upadteProject = await Projects.findOneAndUpdate(
							{ _id: project._id },
							{
								speech: speech,
								prespective: prespective,
								projectStatus: projectStatus,
								duration: "1",
								numberOfTasks: "1",
								tasks: 1
							},
							{ new: true }
						);

						let createProjectTask = await ProjectTask.create(proectTaskObj);

						if (upadteProject && createProjectTask) {
							await session.commitTransaction();
							session.endSession();
							res.send({ message: "OnBoarding successful", data: createProjectTask });
						}
					} else {
						res.send({ message: "As free trial gives only 1 task" });
					}
				} else if ((role.title == "leads" || role.title == "Leads") && project.projectName != projectName) {
					res.send({ message: "You are Leads Role so you can not onboard another project/task" });
				} else if (role.title == "Client" && project.projectName != projectName) {
					console.log("in");
					let userPlan = await UserPlan.findOne({ user: userId })
						.populate({ path: "plan" })
						.populate({ path: "subPlan" });
					console.log(userPlan);

					// let getProject = await Projects.findOne({ projectName: projectName, user: userId });

					companyInfoObj.user = project.user._id;

					if (speech !== "" && prespective !== "") {
						projectStatus = "Ready";
					}

					let createCompany = await Company.create(companyInfoObj);

					let createProject = await Projects.create({
						projectName: projectName,
						speech: speech,
						prespective: prespective,
						duration: userPlan.subPlan.duration,
						numberOfTasks: userPlan.plan.texts,
						projectStatus: projectStatus,
						tasks: 1,
						user: userId
					});

					let proectTaskObj = {
						keywords: project.keywords,
						desiredNumberOfWords: userPlan.plan.desiredWords,
						project: createProject._id
					};
					let createProjectTask = await ProjectTask.create(proectTaskObj);

					if (createProject && createProjectTask) {
						await session.commitTransaction();
						session.endSession();
						res.send({ message: "OnBoarding successful", data: createProjectTask });
					}

					// res.send(userPlan);
				} else if (project.projectName == projectName && role.title == "Client") {
					let taskCount = await ProjectTask.countDocuments({ project: project._id });
					let userPlan = await UserPlan.findOne({ user: userId })
						.populate({ path: "plan" })
						.populate({ path: "subPlan" });
					if (taskCount <= userPlan.plan.texts) {
						const checkStatusOfProject = await Projects.findOne({ id: project._id });
						if (checkStatusOfProject.status === "in progress") {
							taskStatus = "Ready to start";
						}
						let proectTaskObj = {
							keywords: project.keywords,
							desiredNumberOfWords: userPlan.plan.desiredWords,
							project: project._id,
							status: taskStatus
						};

						companyInfoObj.user = project.user._id;

						let createCompany = await Company.findOneAndUpdate({ user: userId }, companyInfoObj, { new: true });

						let upadteProject = await Projects.findOneAndUpdate(
							{ _id: project._id },
							{
								speech: speech,
								prespective: prespective,
								duration: userPlan.subPlan.duration,
								numberOfTasks: userPlan.plan.texts,
								tasks: taskCount + 1
							},
							{ new: true }
						);

						let createProjectTask = await ProjectTask.create(proectTaskObj);

						if (upadteProject && createProjectTask) {
							await session.commitTransaction();
							session.endSession();
							res.send({ message: "OnBoarding successful", data: createProjectTask });
						}
					} else {
						res.send({ message: "You have reached your Task limit please upgrade your package" });
					}
				}
			} else {
				// let getProject = await Projects.findOne({ projectName: projectName, user: userId });

				console.log("in");
				let userPlan = await UserPlan.findOne({ user: userId })
					.populate({ path: "plan" })
					.populate({ path: "subPlan" });
				console.log(userPlan);

				companyInfoObj.user = userId;

				let createCompany = await Company.create(companyInfoObj);

				if (prespective !== "" && speech !== "") {
					projectStatus = "Ready";
				}

				let createProject = await Projects.create({
					projectName: projectName,
					speech: speech,
					prespective: prespective,
					duration: userPlan.subPlan.duration,
					numberOfTasks: userPlan.plan.texts,
					projectStatus: projectStatus,
					tasks: 1,
					user: userId
				});

				let proectTaskObj = {
					// keywords: project.keywords,
					desiredNumberOfWords: userPlan.plan.desiredWords,
					project: createProject._id
				};

				let createProjectTask = await ProjectTask.create(proectTaskObj);

				if (createProject && createProjectTask) {
					await session.commitTransaction();
					session.endSession();
					res.send({ message: "OnBoarding successful", data: createProjectTask });
				}
			}
		}
	} catch (err) {
		// emails.errorEmail(req, err);
		await session.abortTransaction();
		session.endSession();
		res.status(500).send({
			message: err.message || "Some error occurred."
		});
	}
};
