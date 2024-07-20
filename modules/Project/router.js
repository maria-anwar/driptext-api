"use strict";

const express = require("express");
const router = express.Router();
const projectController = require("./project.controller");

router.post("/create", (req, res) => {
	projectController.create(req, res);
});

module.exports = router;
