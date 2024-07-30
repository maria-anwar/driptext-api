"use strict";

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const basename = path.basename(__filename);
const db = {};

// MongoDB connection string
const dbURI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/driptextdb";

// Connect to MongoDB
mongoose.connect(dbURI);

mongoose.connection.on("connected", () => {
	console.log("Mongoose is connected to", dbURI);
});

mongoose.connection.on("error", (err) => {
	console.error("Mongoose connection error:", err);
});

mongoose.connection.on("disconnected", () => {
	console.log("Mongoose is disconnected");
});

// Dynamically load models
fs.readdirSync(__dirname)
	.filter((file) => {
		return file.indexOf(".") !== 0 && file !== basename && file.slice(-3) === ".js";
	})
	.forEach((file) => {
		const model = require(path.join(__dirname, file))(mongoose);
		db[model.modelName] = model;
	});

db.mongoose = mongoose;

module.exports = db;
