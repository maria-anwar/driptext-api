"use strict";

const express = require("express");
const router = express.Router();
const fileUpload = require("../../utils/fileUpload");
const { upload } = fileUpload("users");
const adminController = require("./admin-controller");
const projectController = require("./project-controller");
const freelancerController = require("./freelancer-controller");
const taskController = require("./task-controller");
const jwt = require("../../utils/jwt");
const multer = require("multer");
const csvUpload = multer({ dest: "csvuploads/" });
// const timeout = require("connect-timeout");

router.post("/createProjectManager", (req, res) => {
  adminController.createProjectManager(req, res);
});
router.post("/editProjectManager", jwt.protect, (req, res) => {
  adminController.editProjectManager(req, res);
});

router.get("/getProjects", jwt.protect, (req, res) => {
  projectController.getProjects(req, res);
});

router.post("/getProjectDetail", jwt.protect, (req, res) => {
  projectController.projectDetail(req, res);
});

router.post("/wordCountProject", jwt.protect, (req, res) => {
  projectController.wordCountAllTasksInProject(req, res);
});

router.get("/getFreelancers", jwt.protect, (req, res) => {
  freelancerController.getFreelancers(req, res);
});
router.get("/getAllUsers", jwt.protect, (req, res) => {
  adminController.getAllUsers(req, res);
});

router.get("/getAllClients", jwt.protect, (req, res) => {
  adminController.getAllClients(req, res);
});

router.get("/getAllTasksCost", jwt.protect, (req, res) => {
  adminController.allTasksCost(req, res);
});

router.post("/getProjectTaskCost", jwt.protect, (req, res) => {
  adminController.projectTasksCost(req, res);
});

router.post("/updateUserStatus", jwt.protect, (req, res) => {
  adminController.changeUserStatus(req, res);
});

router.post("/getTracking", jwt.protect, (req, res) => {
  adminController.tracking(req, res);
});

router.post("/getForecasting", jwt.protect, (req, res) => {
  adminController.forecasting(req, res);
});

router.post("/addTask", jwt.protect, (req, res) => {
  taskController.addTask(req, res);
});

router.post("/archiveProject", jwt.protect, (req, res) => {
  projectController.archivedProject(req, res);
});

router.post("/editTask", jwt.protect, (req, res) => {
  taskController.editTask(req, res);
});

router.post("/getTaskDetail", jwt.protect, (req, res) => {
  taskController.getTaskDetail(req, res);
});

router.get("/getAllTasks", jwt.protect, (req, res) => {
  taskController.getAllTasks(req, res);
});
router.post("/wordCountTask", jwt.protect, (req, res) => {
  taskController.wordCountTask(req, res);
});

router.post("/editProject", jwt.protect, (req, res) => {
  projectController.editProject(req, res);
});

router.post("/assignFreelancersByProject", jwt.protect, (req, res) => {
  freelancerController.assignFreelancersByProject(req, res);
});

router.post("/assignFreelancersByTask", jwt.protect, (req, res) => {
  freelancerController.assignFreelancerByTask(req, res);
});
router.post("/updateAdminProfile", jwt.protect, (req, res) => {
  adminController.updateAdminProfile(req, res);
});

router.post("/exportTasks", jwt.protect, (req, res) => {
  taskController.projectTasksExport(req, res);
});

router.post("/setPrices", jwt.protect, (req, res) => {
  freelancerController.setPrices(req, res);
});

router.get("/getPrices", jwt.protect, (req, res) => {
  freelancerController.getPrices(req, res);
});

router.post(
  "/importTasks",
  // jwt.protect,
  csvUpload.single("file"),
  (req, res) => {
    taskController.importProjectTasks(req, res);
  }
);

module.exports = router;
