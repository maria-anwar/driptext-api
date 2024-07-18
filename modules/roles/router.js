"use strict";

const express = require("express");
const router = express.Router();
const rolesController = require("./roles.controller");

router.post("/list", (req, res) => {
		rolesController.list(req, res);
	}
);

module.exports = router;
