"use strict";

const express = require("express");
const router = express.Router();
const projectController = require("./project.controller");

router.post("/create", (req, res) => {
	projectController.create(req, res);
});

router.post("/detail", (req, res) => {
	projectController.detail(req, res);
});

router.post("/updateOnBoarding", (req, res) => {
  projectController.updateOnBoarding(req, res);
});

router.post("/checkInsert", (req, res) => {
  projectController.checkBeforeCreate(req, res);
});

module.exports = router;
