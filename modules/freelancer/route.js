const express = require("express");
const router = express.Router();
const freelancerController = require("./freelancer-controller");

router.post("/create", (req, res) => {
  freelancerController.create(req, res);
});

router.post("/emailCheck", (req, res) => {
  freelancerController.emailCheck(req, res);
});

module.exports = router;
