"use strict";

const express = require("express");
const router = express.Router();
const fileUpload = require("../../utils/fileUpload");
const { upload } = fileUpload("users");
const testController = require("./test-controller");
const jwt = require("../../utils/jwt");

router.get("/test", (req, res) => {
  testController.test(req, res);
});

router.get("/testEmail", (req, res) => {
  testController.testEmail(req, res);
});

router.get("/earningTest", (req, res) => {
  testController.earningTwo(req, res);
});
router.get("/subscriptionInvoice", (req, res) => {
  testController.customerInvoice(req, res);
});

router.get("/sendEmail", (req, res) => {
  testController.sendEmail(req, res);
});

router.get("/testCounter", (req, res) => {
  testController.testCounter(req, res);
});

router.get("/createFolder", (req, res) => {
  testController.createFolder(req, res);
});


module.exports = router;
