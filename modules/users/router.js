"use strict";

const express = require("express");
const router = express.Router();
const fileUpload = require("../../utils/fileUpload");
const { upload } = fileUpload("users");
const usersController = require("./user.controller");
const jwt = require("../../utils/jwt");

router.post("/create", (req, res) => {
	usersController.create(req, res);
});

router.post("/update", jwt.protect, (req, res) => {
	usersController.update(req, res);
});
router.post("/create/onboarding", (req, res) => {
	usersController.onboarding(req, res);
});

module.exports = router;
