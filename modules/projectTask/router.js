"use strict";

const express = require("express");
const router = express.Router();
const projectTaskController = require("./projectTask.controller");

router.post("/detail", (req, res) => {
	projectTaskController.detail(req, res);
});

router.post("/projectTaskUpdate", (req, res) => {
	projectTaskController.projectTaskUpdate(req, res);
});

module.exports = router;
