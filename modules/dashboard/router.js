"use strict";

const express = require("express");
const router = express.Router();
const dashboardController = require("./dashboard.controller");

// router.post("/", (req, res) => {
// 	if (req.role == "Administrator") {
// 		dashboardController.adminDashboard(req, res);
// 	} else if (req.role == "User") {
// 		dashboardController.userDashboard(req, res);
// 	} else if (req.role == "Client") {
// 		dashboardController.clientDashboard(req, res);
// 	}
// });

module.exports = router;
