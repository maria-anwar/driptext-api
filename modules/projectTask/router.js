"use strict";

const express = require("express");
const router = express.Router();
const projectTaskController = require("./projectTask.controller");

router.post("/detail", (req, res) => {
	projectTaskController.detail(req, res);
});

module.exports = router;
