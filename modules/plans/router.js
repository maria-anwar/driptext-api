"use strict";

const express = require("express");
const router = express.Router();
const plansController = require("./plans.controller");

router.post("/list", (req, res) => {
	plansController.list(req, res);
});

module.exports = router;
