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

router.post("/emailCheck", (req, res) => {
  freelancerController.emailCheck(req, res);
});

module.exports = router;
