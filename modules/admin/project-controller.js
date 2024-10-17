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
  getWordCount,
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
      companyBackgorund: Joi.string().optional().allow("").allow(null),
      companyAttributes: Joi.string().optional().allow("").allow(null),
      comapnyServices: Joi.string().optional().allow("").allow(null),
      customerContent: Joi.string().optional().allow("").allow(null),
      customerIntrest: Joi.string().optional().allow("").allow(null),
      contentPurpose: Joi.string().optional().allow("").allow(null),
      contentInfo: Joi.string().optional().allow("").allow(null),
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
    if (project) {
      const alreadyExist = await Projects.findOne({
        _id: { $ne: project._id },
        projectName: req.body.domain,
      });
      if (alreadyExist) {
        res.status(500).send({ message: "This project Name already exists" });
        return;
      }
    }
    if (!project) {
      res.status(404).send({ message: "Project Not Found" });
      return;
    }
    if (project.onBoardingInfo) {
      const updatedonBoardingInfo = await Company.findOneAndUpdate(
        { _id: project.onBoardingInfo },
        {
          companyBackgorund: req.body.companyBackgorund,
          companyAttributes: req.body.companyAttributes,
          comapnyServices: req.body.comapnyServices,
          customerContent: req.body.customerContent,
          customerIntrest: req.body.customerIntrest,
          contentPurpose: req.body.contentPurpose,
          contentInfo: req.body.contentInfo,
        },
        { new: true }
      );
    }

    if (!project.onBoardingInfo) {
      const newOnBoarding = await Company.create({
        companyBackgorund: req.body.companyBackgorund,
        companyAttributes: req.body.companyAttributes,
        comapnyServices: req.body.comapnyServices,
        customerContent: req.body.customerContent,
        customerIntrest: req.body.customerIntrest,
        contentPurpose: req.body.contentPurpose,
        contentInfo: req.body.contentInfo,
        user: project.user,
      });
      await Projects.findOneAndUpdate(
        { _id: req.body.projectId },
        {
          onBoardingInfo: newOnBoarding._id
        },
        { new: true }
      );
    }

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

    res.status(200).json({ message: "success" });
  } catch (error) {
    res.status(500).json({ message: error?.message || "Something went wrong" });
  }
};

exports.wordCountAllTasksInProject = async (req, res) => {
  if (!req.role || req.role.toLowerCase() !== "projectmanger") {
    res.status(401).send({ message: "Your are not admin" });
    return;
  }
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const joiSchema = Joi.object({
      projectId: Joi.string().required(),
    });
    const { error, value } = joiSchema.validate(req.body);

    if (error) {
      // emails.errorEmail(req, error);
      await session.abortTransaction();
      session.endSession();

      const message = error.details[0].message.replace(/"/g, "");
      res.status(401).send({
        message: message,
      });
      return;
    }
    const project = await Projects.findOne({
      _id: req.body.projectId,
    }).populate({ path: "projectTasks", select: "fileId" });
    if (!project) {
      await session.abortTransaction();
      session.endSession();
      res.status(404).send({ message: "Project not found" });
    }

    for (const task of project.projectTasks) {
      let wordCount = await getWordCount(task.fileId);
      await projectTasks.findOneAndUpdate(
        { _id: task._id },
        {
          actualNumberOfWords: wordCount,
        },
        { new: true }
      );
    }

    await session.commitTransaction();
    session.endSession();
    res.status(200).send({ message: "success" });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).send({ message: error.message || "Something went wrong" });
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
