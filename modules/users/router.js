"use strict";

const express = require("express");
const router = express.Router();
const fileUpload = require("../../utils/fileUpload");
const { upload } = fileUpload("users");
const usersController = require("./user.controller");

// router.post("/list", (req, res) => {
// 	if (req.role == "Administrator" || req.role == "Client") {
// 		usersController.listUsers(req, res);
// 	} else {
// 		res.status(403).send({ message: "Forbidden Access" });
// 	}
// });

// router.post("/list/departments", (req, res) => {
// 	if (req.role == "Administrator" || req.role == "Client") {
// 		usersController.listDepartments(req, res);
// 	} else {
// 		res.status(403).send({ message: "Forbidden Access" });
// 	}
// });

// router.post("/list/designations", (req, res) => {
// 	if (req.role == "Administrator" || req.role == "Client") {
// 		usersController.listDesignations(req, res);
// 	} else {
// 		res.status(403).send({ message: "Forbidden Access" });
// 	}
// });

router.post("/create", (req, res) => {
	usersController.create(req, res);
});

// router.post("/update", (req, res) => {
// 	if (req.role == "Administrator" || req.role == "Client") {
// 		usersController.update(req, res);
// 	} else {
// 		res.status(403).send({ message: "Forbidden Access" });
// 	}
// });

// router.post("/update/profile", usersController.updateProfile);
// router.post("/update/profile/image", upload.single("image"), usersController.updateProfileImage);
// router.post("/update/password", usersController.changePassword);
// router.post("/detail", usersController.detail);

// router.post("/delete", (req, res) => {
// 	if (req.role == "Administrator" || req.role == "Client") {
// 		usersController.delete(req, res);
// 	} else {
// 		res.status(403).send({ message: "Forbidden Access" });
// 	}
// });

// router.post("/reset/credentials", (req, res) => {
// 	if (req.role == "Administrator" || req.role == "Client") {
// 		usersController.reset(req, res);
// 	} else {
// 		res.status(403).send({ message: "Forbidden Access" });
// 	}
// });

module.exports = router;
