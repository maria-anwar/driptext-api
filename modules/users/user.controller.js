const Joi = require("@hapi/joi");
const mongoose = require("mongoose");
const db = require("../../models");
const encryptHelper = require("../../utils/encryptHelper");
const emails = require("../../utils/emails");
const crypto = require("../../utils/crypto");
const fs = require("fs");
const handlebars = require("handlebars");
const { alternatives } = require("joi");

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
			vatId: Joi.number().optional().allow(null).allow(""),
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

			const message = error.details[0].message.replace(/"/g, "");
			res.status(401).send({
				message: "Some Error" + message
			});
		} else {
			const billResponse = req.body.response;
			const userObj = {
				firstName: req.body.firstName?.trim(),
				lastName: req.body.lastName?.trim(),
				email: req.body.email.trim(),
				country: req.body.country ? req.body.country : null,
				vatIdNo: req.body.vatId ? req.body.vatId : null,
				companyName: req.body.companyName ? req.body.companyName : null,
				password: req.body.password ? req.body.password : "123456@123456",
				role: req.body.roleId,
				isSubscribed: req.body.isSubscribed ? req.body.isSubscribed : "N"
			};
			const session = await mongoose.startSession();
			session.startTransaction();

			let alredyExist = await Users.findOne({ email: userObj.email }).populate("role");

			let userRole = await Roles.findOne({ _id: userObj.role });
			if (userRole.title == "Client" && !req.body.planId && !req.body.subPlanId) {
				await session.commitTransaction();
				session.endSession();
				res.status(403).send({
					message: "Plan and SubPlan ID's are required for the client role"
				});
				return 1;
			}

			if (!alredyExist) {
				Users.create(userObj)
					.then(async (user) => {
						var userPlanObj = {};

						var projectObj = {
							projectName: req.body.projectName,
							keywords: req.body.keywords ? req.body.keywords : null,
							user: user._id,
							tasks: 0
						};

						if (req.body.planId) {
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
						if (req.body.response) {
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

						let createProject = await Projects.create(projectObj);
						let nameChar = createProject.projectName.slice(0, 2);
						let idChar = createProject._id.toString().slice(-4);
						let projectId = nameChar + "-" + idChar;

						await Projects.findByIdAndUpdate(createProject._id, { projectId: projectId }, { new: true });
						await Users.findByIdAndUpdate(user._id, { $push: { projects: createProject._id } }, { new: true });

						userPlanObj.projectId = createProject._id;

						let createUserPlan = await UserPlan.create(userPlanObj);

						if (createUserPlan && createProject) {
							if (createBilling !== "") {
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
								emails
									.sendBillingInfo(clientData.clientEmail, "Your Billing Information", clientData)
									.then((res) => {
										console.log("billing email success: ", res);
									})
									.catch((err) => {
										console.log("billing email error: ", err);
									});
							}
							await emails.AwsEmailPassword(user);
							let getuser = await Users.findOne({ _id: user._id })
								.select("firstName lastName email role password")
								.populate({ path: "role", select: "title" });

							await session.commitTransaction();
							session.endSession();
							res.status(200).send({ message: "User Added", data: getuser, project: createProject });
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
			} else if (alredyExist && (alredyExist.role.title == "Leads" || alredyExist.role.title == "leads")) {
				const userRole = await Roles.findOne({ _id: userObj.role });
				if (userRole.title !== "Client") {
					res.status(403).send({ message: "You are a registered user, Buy Subscription." });
				} else {
					userObj.password = alredyExist.password;
					Users.findByIdAndUpdate({ _id: alredyExist._id.toString() }, userObj, { new: true })
						.then(async (user) => {
							console.log(user);

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
							let createUserPlan = await UserPlan.findOneAndUpdate({ user: user._id }, userPlanObj, { new: true });

							var userPlanObj = {};
							let userPlan = await UserPlan.findOne({
								_id: createUserPlan._id
							})
								.populate("plan")
								.populate("subPlan");

							var projectObj = {
								projectName: req.body.projectName,
								keywords: req.body.keywords ? req.body.keywords : null,
								user: user._id,
								duration: userPlan.subPlan.duration,
								numberOfTasks: userPlan.plan.texts
								// tasks: taskCount
							};

							let subscriptionItems;
							let paymentMethod;
							let billingResponse;
							let createBilling = "";

							if (req.body.response) {
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

							let createProject = await Projects.findOneAndUpdate(
								{ user: user._id, projectName: projectObj.projectName },
								projectObj,
								{
									new: true
								}
							);
							let nameChar = createProject.projectName.slice(0, 2);
							let idChar = createProject._id.toString().slice(-4);
							let projectId = nameChar + "-" + idChar;

							await Projects.findByIdAndUpdate({ _id: createProject._id }, { projectId: projectId }, { new: true });

							// await Users.findByIdAndUpdate(
							// 	{ _id: alredyExist._id },
							// 	{ $push: { projects: createProject._id } },
							// 	{ new: true }
							// );
							if (createBilling !== "") {
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
								emails
									.sendBillingInfo(clientData.clientEmail, "Your Billing Information", clientData)
									.then((res) => {
										console.log("billing email success: ", res);
									})
									.catch((err) => {
										console.log("billing email error: ", err);
									});
							}
							if (createUserPlan && createProject) {
								emails.AwsEmailPassword(user);

								let getuser = await Users.findOne({ _id: user._id })
									.select("firstName lastName email role password")
									.populate({ path: "role", select: "title" });

								await session.commitTransaction();
								session.endSession();
								res.status(200).send({ message: "User Added", data: getuser, project: createProject });
							}
						})
						.catch(async (err) => {
							// emails.errorEmail(req, err);
							await session.abortTransaction();
							session.endSession();
							res.status(500).send({
								message: err.message || "Some error occurred while creating the User."
							});
						});
				}
			} else if (alredyExist && alredyExist.role.title === "Client") {
				//alreexist && client role

				const userRole = await Roles.findOne({ _id: userObj.role });
				if (userRole.title !== "Client") {
					res.status(403).send({ message: "You have to buy Subscription." });
				}
				userObj.password = alredyExist.password;
				Users.findByIdAndUpdate({ _id: alredyExist._id }, userObj, { new: true })
					.then(async (user) => {
						var userPlanObj = {};

						var projectObj = {
							projectName: req.body.projectName,
							keywords: req.body.keywords ? req.body.keywords : null,
							user: user._id,
							task: 0
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

						let nameChar = createProject.projectName.slice(0, 2);
						let idChar = createProject._id.toString().slice(-4);
						let projectId = nameChar + "-" + idChar;

						let updateProjectId = await Projects.findByIdAndUpdate(
							{ _id: createProject._id },
							{ projectId: projectId },
							{ new: true }
						);

						let pushProjectId = await Users.findByIdAndUpdate(
							{ _id: alredyExist._id },
							{ $push: { projects: createProject._id } },
							{ new: true }
						);
						userPlanObj.projectId = createProject._id;

						let createUserPlan = await UserPlan.create(userPlanObj);
						let createBilling = await Billing.create(billingResponse);

						if (createUserPlan && createProject && createBilling) {
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
							emails
								.sendBillingInfo(clientData.clientEmail, "Your Billing Information", clientData)
								.then((res) => {
									console.log("billing email success: ", res);
								})
								.catch((err) => {
									console.log("billing email error: ", err);
								});

							await emails.AwsEmailPassword(user);

							await session.commitTransaction();
							session.endSession();
							res.send({ message: "User Added", data: user, project: createProject });
						}
					})
					.catch(async (err) => {
						// emails.errorEmail(req, err);
						await session.abortTransaction();
						session.endSession();
						res.status(500).send({
							message: err.message || "Some error occurred while creating the User."
						});
					});
			} else {
				res.status(401).send({ message: "UnAuthorized for this action." });
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
			res.status(401).send({
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
				res.status(200).send({
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
			projectId: Joi.string().required(),
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
			res.status(401).send({
				message: message
			});
		} else {
			const userId = req.body.userId ? req.body.userId : null;
			const projectId = req.body.projectId;
			const projectName = req.body.projectName.trim();
			const speech = req.body.speech.trim();
			const prespective = req.body.prespective.trim();

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
			}
			let getuser = await Users.findOne(whereClause).populate({
				path: "role",
				select: "title"
			});
			if (getuser) {
				var role = getuser.role;
				var project = await Projects.findOne({
					_id: projectId,
					user: userId
				});
				if (project) {
					var project = await Projects.findOne({
						_id: projectId,
						user: userId
					})
						.populate({
							path: "user",
							select: "email role",
							populate: { path: "role", select: "title" }
						})
						.select("id projectName keywords");
				} else {
					res.status(404).send({ message: "Project not found!" });
				}
			}
			if (getuser && project) {
				if ((role.title == "leads" || role.title == "Leads") && project.projectName == projectName) {
					let taskCount = await ProjectTask.countDocuments({
						project: projectId
					});
					if (taskCount == 0) {
						let projectStatus;
						let taskStatus;
						if (speech !== "" && prespective !== "") {
							projectStatus = "Free Trial";
							taskStatus = "Ready to Start";
						}
						let proectTaskObj = {
							keywords: project.keywords,
							project: project._id,
							desiredNumberOfWords: "1500",
							status: taskStatus,
							tasks: taskCount
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

						let nameChar = upadteProject.projectName.slice(0, 2);
						let idChar = createProjectTask._id.toString().slice(-4);
						let taskId = nameChar + "-" + idChar;

						let updateTaskId = await ProjectTask.findByIdAndUpdate(
							{ _id: createProjectTask._id },
							{ taskName: taskId },
							{ new: true }
						);

						if (upadteProject && createProjectTask) {
							await session.commitTransaction();
							session.endSession();
							await emails.onBoadingSuccess(getuser);

							res.send({
								message: "OnBoarding successful",
								data: createProjectTask
							});
						}
					} else {
						res.status(403).send({ message: "As free trial gives only 1 task" });
					}
				} else if ((role.title == "leads" || role.title == "Leads") && project.projectName != projectName) {
					res.status(403).send({
						message: "You are Leads Role so you can not onboard another project/task"
					});
				} else if (role.title == "Client" && project.projectName == projectName) {
					let taskCount = await ProjectTask.countDocuments({
						project: project._id
					});

					let userPlan = await UserPlan.findOne({ user: userId, projectId: projectId })
						.populate("plan")
						.populate("subPlan");

					if (taskCount <= userPlan.plan.texts - 1) {
						let projectStatus;
						let taskStatus;
						if (speech !== "" && prespective !== "") {
							projectStatus = "Ready";
						}

						let proectTaskObj = {
							keywords: project.keywords,
							desiredNumberOfWords: userPlan.plan.desiredWords,
							project: project._id
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
								projectStatus: projectStatus,
								tasks: taskCount
							},
							{ new: true }
						);

						let createProjectTask = await ProjectTask.create(proectTaskObj);
						let nameChar = upadteProject.projectName.slice(0, 2);
						let idChar = createProjectTask._id.toString().slice(-4);
						let taskId = nameChar + "-" + idChar;

						let updateTaskId = await ProjectTask.findByIdAndUpdate(
							{ _id: createProjectTask._id },
							{ taskName: taskId },
							{ new: true }
						);

						if (upadteProject && createProjectTask) {
							await session.commitTransaction();
							session.endSession();
							await emails.onBoadingSuccess(getuser);

							res.send({
								message: "OnBoarding successful",
								data: createProjectTask
							});
						}
					} else {
						res.status(403).send({
							message: "You cannot create more Tasks because you have reached subscription limit."
						});
					}
				} else {
					res.status(403).send({
						message: "Project not found!"
					});
				}
			}
			// else if (role && role.title == "Client") {
			// 	let userPlan = await UserPlan.findOne({ user: userId })
			// 		.populate({ path: "plan" })
			// 		.populate({ path: "subPlan" });

			// 	companyInfoObj.user = userId;

			// 	if (speech !== "" && prespective !== "") {
			// 		projectStatus = "Ready";
			// 	}

			// 	let createCompany = await Company.create(companyInfoObj);

			// 	let createProject = await Projects.create({
			// 		projectName: projectName,
			// 		speech: speech,
			// 		prespective: prespective,
			// 		duration: userPlan.subPlan.duration,
			// 		numberOfTasks: userPlan.plan.texts,
			// 		projectStatus: projectStatus,
			// 		tasks: 1,
			// 		user: userId,
			// 	});

			// 	let proectTaskObj = {
			// 		status: "Ready to Start",
			// 		keywords: createProject.keywords ? createProject.keywords : null,
			// 		desiredNumberOfWords: userPlan.plan.desiredWords,
			// 		project: createProject._id,
			// 	};
			// 	let createProjectTask = await ProjectTask.create(proectTaskObj);

			// 	if (createProject && createProjectTask) {
			// 		await session.commitTransaction();
			// 		session.endSession();
			// 		await emails.onBoadingSuccess(getuser);
			// 		res.send({
			// 			message: "OnBoarding successful",
			// 			data: createProjectTask,
			// 		});
			// 	}
			// }
			else if (role && role.title == "leads") {
				await session.commitTransaction();
				session.endSession();
				res.status(403).send({ message: "As free trial gives only 1 task" });
			} else {
				await session.commitTransaction();
				session.endSession();
				res.status(401).send({ message: "You are not a valid user" });
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

exports.findUserPlan = async (req, res) => {
	UserPlan.find({ user: "66b8c02ac454e13575527fee" })
		.then((response) => {
			res.send(response);
		})
		.catch((err) => {
			console.log(err);
		});
};
