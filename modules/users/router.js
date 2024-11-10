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

router.post("/emailSubscription", jwt.protect, (req, res) => {
  usersController.emailSubscription(req, res);
});

router.post("/contactSupport", jwt.protect, (req, res) => {
  usersController.contactSupport(req, res);
});

router.post("/create/onboarding", (req, res) => {
	usersController.onboarding(req, res);
});

router.post("/userplan", (req, res) => {
	usersController.findUserPlan(req, res);
});

router.post("/emailCheck", (req, res) => {
	usersController.checkEmail(req, res);

})

module.exports = router;
