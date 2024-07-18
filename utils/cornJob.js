const db = require("../models");
const encryptHelper = require("./encryptHelper");
const emails = require("./emails");
const crypto = require("./crypto");
const Joi = require("@hapi/joi");
// const { Op } = require("sequelize");

const CourseModule = db.courseModules;
const CourseTasks = db.courseTasks;
const CourseTaskContent = db.courseTaskContent;
const CourseTaskTypes = db.courseTaskTypes;
const CourseTaskProgress = db.courseTaskProgress;
const Course = db.courses;
const CourseEnrollment = db.courseEnrollments;
const CourseAssignment = db.courseAssignments;
const CourseAchivements = db.courseAchievements;
const User = db.users;
const Client = db.clients;

exports.checkCourseCompletion = async (req, res) => {
	try {
		const date = new Date();
		const dateString = date.toISOString().split("T")[0];
		const achivedIds = [];
		const courseAchievements = await CourseAchivements.findAll({
			where: { isActive: "Y" },
			attributes: ["id", "courseEnrollmentId"]
		});

		courseAchievements.forEach((e) => {
			achivedIds.push(e.courseEnrollmentId);
		});

		const dateOne = await CourseEnrollment.findAll({
			where: {
				isActive: "Y",
				id: {
					[Op.not]: achivedIds
				},
				[Op.and]: [{ completionDateOne: { [Op.lte]: dateString } }, { completionDateTwo: { [Op.gte]: dateString } }]
			},
			include: [
				{
					model: CourseAssignment,
					where: {
						isActive: "Y",
						[Op.and]: [{ dateFrom: { [Op.lte]: dateString } }, { dateTo: { [Op.gte]: dateString } }]
					},

					include: [
						{
							model: Course,
							where: {
								isActive: "Y",
								status: "P"
							},
							attributes: ["id", "title"]
						}
					],
					attributes: ["id", "dateFrom", "dateTo", "clientId", "courseId"]
				},
				{
					model: CourseEnrollmentUsers,
					where: {
						isActive: "Y"
					},
					include: [
						{
							model: User,
							where: { isActive: "Y" },
							include: [
								{
									model: User,
									as: "manager",
									attributes: ["id", "firstName", "lastName", "email"]
								}
							],
							attributes: ["id", "firstName", "lastName", "email", "clientId", "managerId", "roleId"]
						}
					],
					attributes: ["id", "courseEnrollmentId", "progress"]
				}
			],
			attributes: ["id", "courseAssignmentId", "completionDateOne", "completionDateTwo"]
		});

		const dateTwo = await Course.findAll({
			where: { isActive: "Y", status: "P" },
			include: [
				{
					model: CourseAssignment,
					where: {
						isActive: "Y",
						[Op.and]: [{ dateFrom: { [Op.lte]: dateString } }, { dateTo: { [Op.gte]: dateString } }]
					},
					attributes: ["id", "dateFrom", "dateTo", "courseId"],
					include: [
						{
							model: CourseEnrollment,
							where: { id: { [Op.not]: achivedIds }, completionDateTwo: { [Op.lt]: dateString }, isActive: "Y" },
							include: [
								{
									model: CourseEnrollmentUsers,
									include: [
										{
											model: User,
											where: { isActive: "Y" },
											include: [
												{
													model: User,
													as: "manager",
													include: [
														{
															model: User,
															as: "manager",
															attributes: ["id", "firstName", "lastName", "email"]
														}
													],
													attributes: ["id", "firstName", "lastName", "email"]
												}
											],
											attributes: ["id", "firstName", "lastName", "email", "clientId", "managerId", "roleId"]
										}
									],
									attributes: ["id", "progress"]
								}
							],

							attributes: ["id", "courseAssignmentId", "completionDateOne", "completionDateTwo"]
						}
					]
				}
			],
			attributes: ["id", "title"]
		});

		const separatedUsers = await separateUsersByManager(dateOne);
		const organizedUsers = await dataTwo(dateTwo);

		emails.cornJob(separatedUsers, organizedUsers);
	} catch (err) {
		emails.errorEmail(req, err);
		res.status(500).send({
			message: err.message || "Some error occurred."
		});
	}
};

function dataTwo(data) {
	let updatedData = [];
	data.forEach((course) => {
		course.courseAssignments.forEach((assignment) => {
			assignment.courseEnrollments.forEach((enrollment) => {
				enrollment.courseEnrollmentUsers.forEach((enrolledUser) => {
					if (enrolledUser.user.manager) {
						if (enrolledUser.user.manager.manager) {
							if (typeof updatedData[enrolledUser.user.manager.manager.id] == "undefined") {
								updatedData[enrolledUser.user.manager.manager.id] = {
									manager: {
										id: enrolledUser.user.manager.manager.id,
										firstName: enrolledUser.user.manager.manager.firstName,
										lastName: enrolledUser.user.manager.manager.lastName,
										email: enrolledUser.user.manager.manager.email
									},
									courses: []
								};
							}

							if (typeof updatedData[enrolledUser.user.manager.manager.id].courses[course.id] == "undefined") {
								updatedData[enrolledUser.user.manager.manager.id].courses[course.id] = {
									course: {
										id: course.id,
										title: course.title,
										completionDateOne: enrollment.completionDateOne,
										completionDateTwo: enrollment.completionDateTwo
									},
									enrolledUsers: []
								};
							}

							updatedData[enrolledUser.user.manager.manager.id].courses[course.id].enrolledUsers.push({
								id: enrolledUser.user.id,
								firstName: enrolledUser.user.firstName,
								lastName: enrolledUser.user.lastName,
								email: enrolledUser.user.email,
								manager: {
									id: enrolledUser.user.manager.id,
									firstName: enrolledUser.user.manager.firstName,
									lastName: enrolledUser.user.manager.lastName,
									email: enrolledUser.user.manager.email
								}
							});
						}
					}
				});
			});
		});
	});
	return updatedData;
}

function separateUsersByManager(courseData) {
	const result = [];

	const managerMap = new Map();

	courseData.forEach((courseAssignment) => {
		const {
			courseAssignmentId,
			completionDateOne,
			completionDateTwo,
			courseAssignment: {
				courseId,

				course: { title }
			}
		} = courseAssignment;

		courseAssignment.courseEnrollmentUsers.forEach((user) => {
			const {
				user: {
					id: userId,
					firstName,
					lastName,
					email,
					manager: { id: managerId, firstName: managerFirstName, lastName: managerLastName, email: managerEmail }
				}
			} = user;

			const key = `${courseId}-${managerId}`;

			if (!managerMap.has(key)) {
				managerMap.set(key, {
					course: { courseId, title, completionDateOne, completionDateTwo },
					manager: { id: managerId, firstName: managerFirstName, lastName: managerLastName, email: managerEmail },
					users: []
				});
			}
			managerMap.get(key).users.push({ userId, firstName, lastName, email, progress: user.progress });
		});
	});

	managerMap.forEach((value) => {
		result.push(value);
	});

	return result;
}
