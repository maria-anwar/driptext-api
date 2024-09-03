"use strict";

const express = require("express");
const router = express.Router();
const fileUpload = require("../../utils/fileUpload");
const { upload } = fileUpload("users");
const adminController = require("./admin-controller");
const jwt = require("../../utils/jwt");

router.post("/create", (req, res) => {
  adminController.create(req, res);
});

router.get("/getProjects", jwt.protect, (req, res) => {
  adminController.getProjects(req, res)
})

router.post("/getProjectDetail", jwt.protect, (req, res) => {
  adminController.projectDetail(req, res);
});
router.get("/getFreelancers", jwt.protect, (req, res) => {
  adminController.getFreelancers(req, res);
});
router.get("/getAllUsers", jwt.protect, (req, res) => {
  adminController.getAllUsers(req, res);
});

module.exports = router;
