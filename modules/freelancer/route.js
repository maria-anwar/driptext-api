const express = require("express");
const router = express.Router();
const freelancerController = require("./freelancer-controller");
const jwt = require("../../utils/jwt");

router.post("/create", (req, res) => {
  freelancerController.create(req, res);
});

router.post("/getTasks", jwt.protect, (req, res) => {
  freelancerController.getTasks(req, res);
});

router.post("/updateWordCountAllTasks", jwt.protect, (req, res) => {
  freelancerController.updateWordCountAllTasks(req, res);
});

router.post("/updateWordCount", jwt.protect, (req, res) => {
  freelancerController.updateWordCountTask(req, res);
});

router.post("/emailCheck", (req, res) => {
  freelancerController.emailCheck(req, res);
});

module.exports = router;
