const Joi = require("@hapi/joi");
const db = require("../../models");
const mongoose = require("mongoose");
const emails = require("../../utils/emails");
const dayjs = require("dayjs");
const csvParser = require("csv-parser");
const fs = require("fs");
const path = require("path");

// const { RDS } = require("aws-sdk");

const Freelancers = db.Freelancer;
const Users = db.User;
const Roles = db.Role;
const projectTasks = db.ProjectTask;
const Projects = db.Project;
const UserPlan = db.UserPlan;
const ProjectTask = db.ProjectTask;
const Company = db.Company;
const {
  createFolder,
  createTaskFile,
  getFileCount,
  findOrCreateFolderInParent,
  exportTasksToSheetInFolder,
} = require("../../utils/googleService/actions");

exports.getProjects = async (req, res) => {
  try {
    console.log("req.role: ", req.role);
    if (!req.role || req.role.toLowerCase() !== "projectmanger") {
      res.status(401).send({ message: "Your are not admin" });
      return;
    }

    const projects = await Projects.find({}).populate("plan");

    res.status(200).send({ message: "success", projects: projects });
  } catch (error) {
    res.status(500).send({ message: error.message || "Something went wrong" });
  }
};

exports.projectDetail = async (req, res) => {
  try {
    if (!req.role || req.role.toLowerCase() !== "projectmanger") {
      res.status(401).send({ message: "Your are not admin" });
      return;
    }

    const joiSchema = Joi.object({
      projectId: Joi.string().required(),
    });
    const { error, value } = joiSchema.validate(req.body);

    if (error) {
      // emails.errorEmail(req, error);

      const message = error.details[0].message.replace(/"/g, "");
      res.status(401).send({
        message: message,
      });
      return;
    }
    // "user", "plan", "projectTasks", "boardingInfo";
    const project = await Projects.findOne({
      _id: req.body.projectId,
    }).populate([
      { path: "user" },
      { path: "plan" },
      {
        path: "projectTasks",
      },
      { path: "onBoardingInfo" },
    ]);
    if (!project) {
      res.status(500).send({ message: "Project not found" });
      return;
    }

    res.status(200).send({ message: "success", project: project });
  } catch (error) {
    res.status(500).send({ message: error.message || "Something went wrong" });
  }
};

exports.editProject = async (req, res) => {
  try {
    if (!req.role || req.role.toLowerCase() !== "projectmanger") {
      res.status(401).send({ message: "Your are not admin" });
      return;
    }
    const joiSchema = Joi.object({
      projectId: Joi.string().required(),
      domain: Joi.string().required(),
      speech: Joi.string().required(),
      prespective: Joi.string().required(),
    });
    const { error, value } = joiSchema.validate(req.body);

    if (error) {
      // emails.errorEmail(req, error);

      const message = error.details[0].message.replace(/"/g, "");
      res.status(401).send({
        message: message,
      });
      return;
    }
    const project = await Projects.findOne({ _id: req.body.projectId });
    if (!project) {
      res.status(404).send({ message: "Project Not Found" });
      return;
    }
    const session = await mongoose.startSession();
    session.startTransaction();

    let nameChar = req.body.domain.slice(0, 2).toUpperCase();
    let idChar = project._id.toString().slice(-4);
    let projId = nameChar + "-" + idChar;

    const updatedProject = await Projects.findOneAndUpdate(
      { _id: req.body.projectId },
      {
        projectName: req.body.domain,
        projectId: projId,
        speech: req.body.speech,
        prespective: req.body.prespective,
      },
      { new: true }
    );

    for (const task of project.projectTasks) {
      let nameChar = req.body.domain.slice(0, 2).toUpperCase();
      let idChar = task.toString().slice(-4);
      let taskId = nameChar + "-" + idChar;
      await projectTasks.findOneAndUpdate(
        { _id: task },
        {
          taskName: taskId,
        },
        { new: true }
      );
    }

    await session.commitTransaction();
    session.endSession();
    res.status(200).json({ message: "success" });
  } catch (error) {
    res.status(500).json({ message: error?.message || "Something went wrong" });
  }
};

exports.archivedProject = async (req, res) => {
  try {
    if (!req.role || req.role.toLowerCase() !== "projectmanger") {
      res.status(401).send({ message: "Your are not admin" });
      return;
    }
    const joiSchema = Joi.object({
      projectId: Joi.string().required(),
      isArchived: Joi.boolean().required(),
    });
    const { error, value } = joiSchema.validate(req.body);

    if (error) {
      // emails.errorEmail(req, error);

      const message = error.details[0].message.replace(/"/g, "");
      res.status(401).send({
        message: message,
      });
      return;
    }
    const session = await mongoose.startSession();
    session.startTransaction();
    const project = await Projects.findOneAndUpdate(
      { _id: req.body.projectId },
      {
        isActive: req.body.isArchived ? "N" : "Y",
      },
      { new: true }
    );

    for (const task of project.projectTasks) {
      await projectTasks.findOneAndUpdate(
        { _id: task },
        {
          isActive: req.body.isArchived ? "N" : "Y",
        },
        { new: true }
      );
    }
    await session.commitTransaction();
    session.endSession();
    res.status(200).json({ message: "success" });
  } catch (error) {
    res.status(200).json({ message: error?.message || "Something went wrong" });
  }
};
