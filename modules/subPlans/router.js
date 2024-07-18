"use strict";

const express = require("express");
const router = express.Router();
const subPlansController = require("./subPlans.controller");

router.post("/list", (req, res) => {
	subPlansController.list(req, res);
});

router.post("/detail", (req, res) => {
	subPlansController.detail(req, res);
});

module.exports = router;
