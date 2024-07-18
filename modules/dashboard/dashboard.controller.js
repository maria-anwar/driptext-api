// const db = require("../../models");
// const { Op } = require("sequelize");
// const encryptHelper = require("../../utils/encryptHelper");
// const emails = require("../../utils/emails");
// const crypto = require("../../utils/crypto");
// const Joi = require("@hapi/joi");
// const Sequelize = require("sequelize");
// const Users = db.users;
// const UserProfile = db.userProfile;
// const Roles = db.roles;
// const Clients = db.clients;
// const Courses = db.courses;
// const CourseTasks = db.courseTasks;
// const CourseEnrollments = db.courseEnrollments;
// const CourseAssignments = db.courseAssignments;
// const CourseDepartments = db.courseDepartments;
// const CourseTaskAssessments = db.courseTaskAssessments;
// const CourseEnrollmentUsers = db.courseEnrollmentUsers;
// const CourseTaskProgress = db.courseTaskProgress;
// const CourseModules = db.courseModules;
// const CourseTaskTypes = db.courseTaskTypes;
// const CourseSyllabus = db.courseSyllabus;
// const CourseAchievements = db.courseAchievements;
// const CourseEnrollmentTypes = db.courseEnrollmentTypes;
// const UserDepartments = db.userDepartments;
// const Teams = db.teams;
// const TeamUsers = db.teamUsers;

// exports.adminDashboard = async (req, res) => {
// 	try {
// 		// const clients = await Clients.findAll({
// 		// 	include: [
// 		// 		{
// 		// 			model: Users,
// 		// 			where: { isActive: "Y" },
// 		// 			required: false,
// 		// 			attributes: { exclude: ["isActive", "createdAt", "updatedAt"] },
// 		// 			include: [
// 		// 				{
// 		// 					model: Courses,
// 		// 					where: { isActive: "Y" },
// 		// 					required: false,
// 		// 					attributes: { exclude: ["isActive", "createdAt", "updatedAt"] },
// 		// 					include: [
// 		// 						{
// 		// 							model: CourseTasks,
// 		// 							where: { isActive: "Y" },
// 		// 							required: false,
// 		// 							attributes: { exclude: ["isActive", "createdAt", "updatedAt"] }
// 		// 						}
// 		// 					]
// 		// 				}
// 		// 			]
// 		// 		}
// 		// 	]
// 		// });
// 		// const dashboardData = clients.map((client) => {
// 		// 	const users = client.users.map((user) => {
// 		// 		const courses = user.courses.map((course) => {
// 		// 			const totalTasks = course.courseTasks.length;
// 		// 			const draftTasks = course.courseTasks.filter((task) => task.status === "D").length;
// 		// 			const publishedTasks = course.courseTasks.filter((task) => task.status === "P").length;

// 		// 			return {
// 		// 				...course.toJSON(),
// 		// 				totalTasks,
// 		// 				draftTasks,
// 		// 				publishedTasks
// 		// 			};
// 		// 		});

// 		// 		return {
// 		// 			...user.toJSON(),
// 		// 			courses
// 		// 		};
// 		// 	});

// 		// 	return {
// 		// 		...client.toJSON(),
// 		// 		users,
// 		// 		userCount: users.length
// 		// 	};
// 		// });

// 		const allUsers = await Users.count({
// 			where: {
// 				isActive: "Y",
// 				[Op.not]: {
// 					roleId: 1
// 				}
// 			},
// 			include: [
// 				{
// 					model: Clients,
// 					where: { isActive: "Y" }
// 				}
// 			]
// 		});
// 		const allClients = await Clients.count({
// 			where: {
// 				isActive: "Y"
// 			}
// 		});

// 		const allCourses = await Courses.count({ where: { isActive: "Y" } });
// 		const allTeams = await Teams.count({
// 			where: { isActive: "Y" },
// 			include: [
// 				{
// 					model: Clients,
// 					where: { isActive: "Y" }
// 				}
// 			]
// 		});
// 		const activeEnrollments = await CourseEnrollments.count({
// 			where: { isActive: "Y" }
// 		});
// 		var data = {
// 			stats: {
// 				totalUsers: allUsers,
// 				totalClients: allClients,
// 				totalTeams: allTeams,
// 				totalCourses: allCourses,
// 				activeEnrollments: activeEnrollments
// 			}
// 		};

// 		res.send({
// 			message: "Retrieved statistics for the Admin",
// 			data
// 		});
// 	} catch (err) {
// 		emails.errorEmail(req, err);
// 		res.status(500).send({
// 			message: err.message || "Some error occurred."
// 		});
// 	}
// };

// exports.userDashboard = async (req, res) => {
// 	try {
// 		const userId = crypto.decrypt(req.userId);
// 		const clientId = crypto.decrypt(req.clientId);

// 		const coursesEnrolled = await CourseEnrollments.count({
// 			where: {
// 				isActive: "Y"
// 			},
// 			include: [
// 				{
// 					model: CourseAssignments,
// 					where: { isActive: "Y" },
// 					include: [
// 						{
// 							model: Courses,
// 							where: { isActive: "Y", status: "P" }
// 						}
// 					]
// 				},
// 				{
// 					model: CourseEnrollmentUsers,
// 					where: { userId: userId, isActive: "Y" }
// 				}
// 			]
// 		});

// 		const coursesInProgress = await CourseEnrollments.count({
// 			where: { isActive: "Y" },
// 			include: [
// 				{
// 					model: CourseAssignments,
// 					where: { isActive: "Y" },
// 					include: [
// 						{
// 							model: Courses,
// 							where: { isActive: "Y", status: "P" }
// 						}
// 					]
// 				},
// 				{
// 					model: CourseEnrollmentUsers,
// 					where: { userId: userId, progress: { [Op.lt]: 100, [Op.gt]: 0 }, isActive: "Y" }
// 				}
// 			]
// 		});

// 		const coursesCompleted = await CourseEnrollments.count({
// 			where: { isActive: "Y" },
// 			include: [
// 				{
// 					model: CourseAssignments,
// 					where: { isActive: "Y" },
// 					include: [
// 						{
// 							model: Courses,
// 							where: { isActive: "Y", status: "P" }
// 						}
// 					]
// 				},
// 				{
// 					model: CourseEnrollmentUsers,
// 					where: { progress: { [Op.eq]: 100 }, userId, isActive: "Y" }
// 				}
// 			]
// 		});

// 		const coursesInqueue = await CourseEnrollments.count({
// 			where: { isActive: "Y" },
// 			include: [
// 				{
// 					model: CourseAssignments,
// 					where: { isActive: "Y" },
// 					include: [
// 						{
// 							model: Courses,
// 							where: { isActive: "Y", status: "P" }
// 						}
// 					]
// 				},
// 				{
// 					model: CourseEnrollmentUsers,
// 					where: { progress: { [Op.eq]: 0 }, userId, isActive: "Y" }
// 				}
// 			]
// 		});

// 		const tasksCompleted = await CourseTasks.count({
// 			where: { isActive: "Y" },
// 			include: [
// 				{
// 					model: CourseModules,
// 					where: { isActive: "Y" },
// 					include: [
// 						{
// 							model: CourseSyllabus,
// 							where: { isActive: "Y" },
// 							include: [
// 								{
// 									model: Courses,
// 									where: { isActive: "Y" },
// 									include: [
// 										{
// 											model: CourseAssignments,
// 											where: { isActive: "Y" },
// 											include: [
// 												{
// 													model: CourseEnrollments,
// 													where: { isActive: "Y" },
// 													include: [
// 														{
// 															model: CourseEnrollmentUsers,
// 															where: { userId, isActive: "Y" }
// 														}
// 													]
// 												}
// 											]
// 										}
// 									]
// 								}
// 							]
// 						}
// 					]
// 				},
// 				{
// 					model: CourseTaskProgress,
// 					where: {
// 						isActive: "Y",
// 						userId,
// 						percentage: {
// 							[Op.eq]: 100
// 						}
// 					}
// 				}
// 			]
// 		});
// 		const tasksTotal = await CourseTasks.count({
// 			where: { isActive: "Y" },
// 			include: [
// 				{
// 					model: CourseModules,
// 					where: { isActive: "Y" },
// 					include: [
// 						{
// 							model: CourseSyllabus,
// 							where: { isActive: "Y" },
// 							include: [
// 								{
// 									model: Courses,
// 									where: { isActive: "Y" },
// 									include: [
// 										{
// 											model: CourseAssignments,
// 											where: { isActive: "Y" },
// 											include: [
// 												{
// 													model: CourseEnrollments,
// 													where: { isActive: "Y" },
// 													include: [
// 														{
// 															model: CourseEnrollmentUsers,
// 															where: { userId, isActive: "Y" }
// 														}
// 													]
// 												}
// 											]
// 										}
// 									]
// 								}
// 							]
// 						}
// 					]
// 				}
// 			]
// 		});
// 		const tasksPercentage = (tasksCompleted / tasksTotal) * 100;

// 		const tasksAssessments = await CourseTaskProgress.findAll({
// 			where: {
// 				isActive: "Y",
// 				userId
// 			},
// 			include: [
// 				{
// 					model: CourseTasks,
// 					where: { isActive: "Y" },
// 					attributes: [],
// 					include: [
// 						{
// 							model: CourseTaskTypes,
// 							attributes: [],
// 							where: { isActive: "Y", title: "Assessment" }
// 						}
// 					]
// 				}
// 			],
// 			attributes: ["percentage"]
// 		});
// 		var taskAssessmentsPercentages = 0;
// 		tasksAssessments.forEach((element) => {
// 			taskAssessmentsPercentages += Number(element.percentage);
// 		});
// 		var assessmentsPercentage = taskAssessmentsPercentages / tasksAssessments.length;

// 		var CoursesCompletions = await Courses.findAll({
// 			where: { isActive: "Y", status: "P" },
// 			attributes: ["id", "title"],
// 			include: [
// 				{
// 					model: CourseAssignments,
// 					where: { isActive: "Y" },
// 					include: [
// 						{
// 							model: CourseEnrollments,
// 							where: { isActive: "Y" },
// 							include: [
// 								{
// 									model: CourseEnrollmentUsers,
// 									where: { userId: userId, isActive: "Y" },
// 									attributes: ["progress"]
// 								}
// 							],
// 							attributes: ["id", "completionDateOne"]
// 						}
// 					],
// 					attributes: ["createdAt"]
// 				}
// 			]
// 		});

// 		// var upcomingTasks = {};
// 		// var enrollments = await CourseEnrollments.findAll({
// 		// 	where: { isActive: "Y" },
// 		// 	attributes: ["id"],
// 		// 	include: [
// 		// 		{
// 		// 			model: CourseTaskProgress,
// 		// 			where: {
// 		// 				// userId: userId,
// 		// 				isActive: "Y"
// 		// 			},
// 		// 			attributes: ["percentage", "id", "courseId"],
// 		// 			include: [
// 		// 				{
// 		// 					model: CourseTasks,
// 		// 					where: { isActive: "Y" },
// 		// 					attributes: ["title", "estimatedTime"],
// 		// 					include: [
// 		// 						{
// 		// 							model: CourseTaskTypes,
// 		// 							where: { isActive: "Y" },
// 		// 							attributes: ["title"]
// 		// 						},
// 		// 						{
// 		// 							model: CourseModules,
// 		// 							where: { isActive: "Y" },
// 		// 							attributes: ["id"],
// 		// 							include: [
// 		// 								{
// 		// 									model: CourseSyllabus,
// 		// 									where: { isActive: "Y" },
// 		// 									attributes: ["id"],
// 		// 									include: [
// 		// 										{
// 		// 											model: Courses,
// 		// 											where: { isActive: "Y" },
// 		// 											attributes: ["title"]
// 		// 										}
// 		// 									]
// 		// 								}
// 		// 							]
// 		// 						}
// 		// 					]
// 		// 				}
// 		// 			]
// 		// 		},
// 		// 		{
// 		// 			model: CourseEnrollmentUsers,
// 		// 			where: { userId: userId }
// 		// 		}
// 		// 	]
// 		// });
// 		// const upcomingTasks = {};
// 		// enrollments.forEach((course) => {
// 		// 	course.courseTaskProgresses.forEach((task) => {
// 		// 		const courseId = task.courseId;
// 		// 		if (task.percentage != "0") {
// 		// 			return;
// 		// 		}
// 		// 		if (!upcomingTasks[courseId]) {
// 		// 			upcomingTasks[courseId] = task;
// 		// 		}
// 		// 	});
// 		// });
// 		// const upcomingTasksArray = Object.values(upcomingTasks);

// 		var allTasks = await CourseEnrollmentUsers.findAll({
// 			where: {
// 				userId: userId,
// 				isActive: "Y"
// 			},
// 			include: [
// 				{
// 					model: CourseEnrollments,
// 					where: { isActive: "Y" },
// 					include: [
// 						{
// 							model: CourseAssignments,
// 							where: { isActive: "Y" },

// 							include: [
// 								{
// 									model: Courses,
// 									where: { isActive: "Y", status: "P" },
// 									include: [
// 										{
// 											model: CourseSyllabus,
// 											where: { isActive: "Y" },
// 											include: [
// 												{
// 													model: CourseModules,
// 													where: { isActive: "Y" },
// 													include: [
// 														{
// 															model: CourseTasks,
// 															where: { isActive: "Y" },
// 															include: [
// 																{
// 																	model: CourseTaskProgress,
// 																	required: false,
// 																	where: { userId: userId }
// 																},
// 																{
// 																	model: CourseTaskTypes
// 																}
// 															]
// 														}
// 													]
// 												}
// 											],
// 											attributes: ["title"]
// 										}
// 									],
// 									attributes: ["id", "title"]
// 								}
// 							],
// 							attributes: ["id"]
// 						}
// 					],
// 					attributes: ["id", "courseAssignmentId"]
// 				}
// 			],
// 			attributes: ["id", "userId"]
// 		});

// 		let comingTask = [];
// 		encryptHelper(allTasks);

// 		allTasks.forEach((enrollment) => {
// 			enrollment.courseEnrollment.courseAssignment.course.courseSyllabus.courseModules.forEach((module) => {
// 				module.courseTasks.forEach((tasks) => {
// 					if (tasks.courseTaskProgresses.length == 0) {
// 						let Obj = {
// 							enrollmentId: enrollment.courseEnrollment.id,
// 							courseId: enrollment.courseEnrollment.courseAssignment.course.id,
// 							courseName: enrollment.courseEnrollment.courseAssignment.course.title,
// 							taskId: tasks.id,
// 							taskName: tasks.title,
// 							taskType: tasks.courseTaskType.title,
// 							estimatedTime: tasks.estimatedTime
// 						};
// 						comingTask.push(Obj);
// 					}
// 				});
// 			});
// 		});
// 		let upcomingTasks = getFirstObjectsWithCourseChange(comingTask);
// 		// var upcomingTasksArray = Object.values(upcomingTasks);

// 		var data = {
// 			stats: {
// 				courses: {
// 					enrolled: coursesEnrolled,
// 					inprogress: coursesInProgress,
// 					inqueue: coursesInqueue,
// 					completed: coursesCompleted
// 				},
// 				percentages: {
// 					task: tasksPercentage || 0,
// 					assessments: assessmentsPercentage || 0
// 				}
// 			},
// 			tasks: {
// 				upcoming: upcomingTasks
// 			},
// 			courses: {
// 				completion: encryptHelper(CoursesCompletions)
// 			}
// 		};

// 		res.send({
// 			message: "Retrieved statistics for the user",
// 			data
// 		});
// 	} catch (err) {
// 		emails.errorEmail(req, err);
// 		res.status(500).send({
// 			message: err.message || "Some error occurred."
// 		});
// 	}
// };

// exports.clientDashboard = async (req, res) => {
// 	try {
// 		const clientId = crypto.decrypt(req.clientId);

// 		const totalCoursesEnrolled = await CourseEnrollments.count({
// 			where: {
// 				isActive: "Y"
// 			},
// 			include: [
// 				{
// 					model: CourseAssignments,
// 					where: { isActive: "Y", clientId },
// 					include: [
// 						{
// 							model: Courses,
// 							where: { isActive: "Y", status: "P" }
// 						}
// 					]
// 				}
// 			]
// 		});

// 		const totalCourseAssigned = await CourseAssignments.count({
// 			where: { isActive: "Y", clientId },
// 			include: [
// 				{
// 					model: Courses,
// 					where: { isActive: "Y", status: "P" }
// 				}
// 			]
// 		});

// 		const totalTeams = await Teams.count({
// 			where: { isActive: "Y", clientId }
// 		});

// 		const users = await Users.findAndCountAll({
// 			where: { isActive: "Y", clientId },
// 			include: [
// 				{
// 					model: UserProfile,
// 					attribute: ["imageUrl"]
// 				}
// 			],
// 			attributes: ["id", "firstName", "lastName"]
// 		});

// 		const teamsUsers = await Teams.findAll({
// 			where: { isActive: "Y", clientId },
// 			include: [
// 				{
// 					model: TeamUsers,
// 					where: { clientId, isActive: "Y" },
// 					include: [
// 						{
// 							model: Users,
// 							where: { isActive: "Y" },
// 							include: [
// 								{
// 									model: UserProfile,
// 									attribute: ["imageUrl"]
// 								}
// 							],
// 							attributes: ["id", "firstName", "lastName"]
// 						}
// 					],
// 					attributes: ["teamId"]
// 				}
// 			],
// 			attributes: ["id", "title"]
// 		});

// 		const coursesEnrolled = await CourseEnrollments.findAll({
// 			where: { isActive: "Y" },
// 			include: [
// 				{
// 					model: CourseEnrollmentTypes,
// 					attributes: ["title"]
// 				},
// 				{
// 					model: UserDepartments,
// 					attributes: ["title"]
// 				},
// 				{
// 					model: Teams,
// 					attributes: ["title"]
// 				},
// 				{
// 					model: CourseEnrollmentUsers,
// 					attributes: ["id"],
// 					include: [
// 						{
// 							model: Users,
// 							where: { isActive: "Y" },
// 							attributes: ["firstName", "lastName"]
// 						}
// 					]
// 				},
// 				{
// 					model: CourseAssignments,
// 					where: { isActive: "Y", clientId },
// 					include: [
// 						{
// 							model: Courses,
// 							where: { isActive: "Y", status: "P" },
// 							include: [
// 								{
// 									model: CourseDepartments,
// 									where: { isActive: "Y" },
// 									attributes: ["title"]
// 								}
// 							],
// 							attributes: ["title", "code", "approximateTime"]
// 						}
// 					],
// 					attributes: ["courseId"]
// 				}
// 			],
// 			attributes: ["id", "completionDateOne", "createdAt"],
// 			order: [["createdAt", "DESC"]],
// 			limit: 4
// 		});

// 		const coursesPast = await CourseEnrollments.findAll({
// 			where: { isActive: "C" },
// 			include: [
// 				{
// 					model: CourseAssignments,
// 					where: { isActive: "Y", clientId },
// 					include: [
// 						{
// 							model: Courses,
// 							where: { isActive: "Y", status: "P" },
// 							include: [
// 								{
// 									model: CourseDepartments,
// 									where: { isActive: "Y" },
// 									attributes: ["title"]
// 								}
// 							],
// 							attributes: ["title", "code", "approximateTime"]
// 						}
// 					],
// 					attributes: ["courseId"]
// 				}
// 			],
// 			attributes: ["id", "completionDateOne", "completionDateTwo"]
// 		});

// 		const coursesCompletion = await Courses.findAll({
// 			where: { isActive: "Y" },
// 			attributes: ["id", "title"],
// 			include: [
// 				{
// 					model: CourseAssignments,
// 					where: { isActive: "Y", clientId },
// 					include: [
// 						{
// 							model: CourseEnrollments,
// 							where: { isActive: "Y" },
// 							attributes: ["completionDateOne"]
// 						}
// 					],
// 					attributes: ["createdAt"]
// 				}
// 			]
// 		});

// 		const recentAchivements = await CourseAchievements.findAll({
// 			where: { isActive: "Y" },
// 			include: [
// 				{
// 					model: CourseEnrollmentUsers,
// 					where: { isActive: "Y" },
// 					include: [
// 						{
// 							model: CourseEnrollments,
// 							where: { isActive: "Y" },
// 							include: [
// 								{
// 									model: CourseAssignments,
// 									where: { clientId, isActive: "Y" },
// 									include: [
// 										{
// 											model: Courses,
// 											where: { isActive: "Y" },
// 											attributes: ["title", "code"]
// 										}
// 									],
// 									attributes: ["courseId"]
// 								}
// 							],
// 							attributes: ["required"]
// 						},
// 						{
// 							model: Users,
// 							where: { isActive: "Y" },
// 							attributes: ["id", "firstName", "lastName"]
// 						}
// 					],
// 					attributes: ["progress"]
// 				}
// 			],
// 			order: [["id", "DESC"]],
// 			limit: 5,
// 			attributes: ["createdAt", "result"]
// 		});

// 		var data = {
// 			stats: {
// 				allUsers: users.count,
// 				teams: totalTeams,
// 				allCourses: totalCourseAssigned,
// 				activeCourses: totalCoursesEnrolled
// 			},
// 			courses: {
// 				upcoming: encryptHelper(coursesCompletion),
// 				enrolled: encryptHelper(coursesEnrolled),
// 				past: encryptHelper(coursesPast)
// 			},
// 			achievements: encryptHelper(recentAchivements),
// 			users: encryptHelper(users.rows),
// 			teams: encryptHelper(teamsUsers)
// 		};

// 		res.send({
// 			message: "Retrieved statistics for the client",
// 			data: data
// 		});
// 	} catch (err) {
// 		console.log(err);
// 		emails.errorEmail(req, err);
// 		res.status(500).send({
// 			message: err.message || "Some error occurred while retrieving assignment courses."
// 		});
// 	}
// };

// function getFirstObjectsWithCourseChange(data) {
// 	const result = [];
// 	let currentCourse = null;

// 	for (let i = 0; i < data.length; i++) {
// 		const currentItem = data[i];

// 		if (currentCourse !== currentItem.courseName) {
// 			result.push(currentItem);
// 			currentCourse = currentItem.courseName;
// 		}
// 	}

// 	return result;
// }
