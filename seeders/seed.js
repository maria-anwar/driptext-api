const mongoose = require("mongoose");
const dotenv = require("dotenv");
const db = require("../models");

dotenv.config();
const Users = db.User;
// const UserProfile = db.userProfile;
const Roles = db.Role;
const Plans = db.Plan;
const SubPlans = db.SubPlan;

async function seedDatabase() {
	try {
		await mongoose.connect("mongodb://127.0.0.1:27017/driptextdb");

		console.log("MongoDB connected...");

		const date = new Date();

		// Insert roles
		const roles = await Roles.insertMany([
			{ title: "Administrator", createdAt: date, updatedAt: date },
			{ title: "Client", createdAt: date, updatedAt: date },
			{ title: "ProjectManger", createdAt: date, updatedAt: date },
			{ title: "leads", createdAt: date, updatedAt: date },
			{ title: "Freelancer", createdAt: date, updatedAt: date }
		]);
		console.log("Roles inserted:", roles);

		// Insert users
		const users = await Users.insertMany([
			{
				firstName: "Admin",
				lastName: "Account",
				email: "admin@drip.com",
				password: "admin123",
				role: roles.find((role) => role.title == "Administrator")._id,
				createdAt: date,
				updatedAt: date
			},
			{
				firstName: "Hamza",
				lastName: "khan",
				email: "hamza@gmail.com",
				password: "hamza123",
				role: roles.find((role) => role.title == "Client")._id,
				createdAt: date,
				updatedAt: date
			},
			{
				firstName: "Subhan",
				lastName: "khan",
				email: "subhan@gmail.com",
				password: "subhan123",
				role: roles.find((role) => role.title == "ProjectManger")._id,
				createdAt: date,
				updatedAt: date
			},
			{
				firstName: "Ali",
				lastName: "Khan",
				email: "ali@gmail.com",
				password: "ali123",
				role: roles.find((role) => role.title == "Freelancer")._id,
				createdAt: date,
				updatedAt: date
			},
			{
				firstName: "Ahmad",
				lastName: "Murtaza",
				email: "ahmad@gmail.com",
				password: "ahmad123",
				role: roles.find((role) => role.title == "Freelancer")._id,
				createdAt: date,
				updatedAt: date
			}
		]);
		console.log("Users inserted:", users);

		const plans = await Plans.insertMany([
			{ title: "4 Texts", value: 4, createdAt: date, updatedAt: date },
			{ title: "8 Texts", value: 8, createdAt: date, updatedAt: date },
			{ title: "12 Texts", value: 12, createdAt: date, updatedAt: date }
		]);
		console.log("Roles inserted:", plans);

		const subplans = await SubPlans.insertMany([
			{
				title: "3 Months",
				duration: 3,
				price: "420",
				texts: plans.find((plan) => plan.title == "4 Texts").value,
				plan: plans.find((plan) => plan.title == "4 Texts")._id,
				createdAt: date,
				updatedAt: date
			},
			{
				title: "6 Months",
				duration: 6,
				price: "360",
				texts: plans.find((plan) => plan.title == "4 Texts").value,
				plan: plans.find((plan) => plan.title == "4 Texts")._id,
				createdAt: date,
				updatedAt: date
			},
			{
				title: "12 Months",
				duration: 12,
				price: "300",
				texts: plans.find((plan) => plan.title == "4 Texts").value,
				plan: plans.find((plan) => plan.title == "4 Texts")._id,
				createdAt: date,
				updatedAt: date
			},
			{
				title: "3 Months",
				duration: 3,
				price: "840",
				texts: plans.find((plan) => plan.title == "8 Texts").value,
				plan: plans.find((plan) => plan.title == "8 Texts")._id,
				createdAt: date,
				updatedAt: date
			},
			{
				title: "6 Months",
				duration: 6,
				price: "720",
				texts: plans.find((plan) => plan.title == "8 Texts").value,
				plan: plans.find((plan) => plan.title == "8 Texts")._id,
				createdAt: date,
				updatedAt: date
			},
			{
				title: "12 Months",
				duration: 12,
				price: "600",
				texts: plans.find((plan) => plan.title == "8 Texts").value,
				plan: plans.find((plan) => plan.title == "8 Texts")._id,
				createdAt: date,
				updatedAt: date
			},
			{
				title: "3 Months",
				duration: 3,
				price: "1260",
				texts: plans.find((plan) => plan.title == "12 Texts").value,
				plan: plans.find((plan) => plan.title == "12 Texts")._id,
				createdAt: date,
				updatedAt: date
			},
			{
				title: "6 Months",
				duration: 6,
				price: "1080",
				texts: plans.find((plan) => plan.title == "12 Texts").value,
				plan: plans.find((plan) => plan.title == "12 Texts")._id,
				createdAt: date,
				updatedAt: date
			},
			{
				title: "12 Months",
				duration: 12,
				price: "900",
				texts: plans.find((plan) => plan.title == "12 Texts").value,
				plan: plans.find((plan) => plan.title == "12 Texts")._id,
				createdAt: date,
				updatedAt: date
			}
		]);
		console.log("Roles inserted:", plans);
		await mongoose.disconnect();
		console.log("MongoDB disconnected...");
	} catch (err) {
		console.error("Error seeding database:", err);
	}
}

seedDatabase();
