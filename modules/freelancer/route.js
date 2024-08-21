const express = require("express");
const router = express.Router();
const freelancerController = require("./freelancer-controller");

router.post("/create", (req, res) => {
  freelancerController.create(req, res);
});


module.exports = router;
