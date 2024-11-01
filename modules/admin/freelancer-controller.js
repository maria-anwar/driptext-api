const Joi = require("@hapi/joi");
const db = require("../../models");
const mongoose = require("mongoose");
const emails = require("../../utils/emails");
const dayjs = require("dayjs");
const csvParser = require("csv-parser");
const fs = require("fs");
const path = require("path");
const freelancerEmails = require("../../utils/sendEmail/freelancer/emails");

// const { RDS } = require("aws-sdk");

const Freelancers = db.Freelancer;
const Users = db.User;
const Roles = db.Role;
const projectTasks = db.ProjectTask;
const Projects = db.Project;
const UserPlan = db.UserPlan;
const ProjectTask = db.ProjectTask;
const Company = db.Company;
const freelancerPrices = db.FreelancerPrice;

const {
  createFolder,
  createTaskFile,
  getFileCount,
  findOrCreateFolderInParent,
  exportTasksToSheetInFolder,
} = require("../../utils/googleService/actions");

exports.getFreelancers = async (req, res) => {
  try {
    if (!req.role || req.role.toLowerCase() !== "projectmanger") {
      res.status(401).send({ message: "Your are not admin" });
      return;
    }
    const freelancers = await Freelancers.find();
    res.status(200).send({ message: "success", freelancers: freelancers });
  } catch (error) {
    res.status(500).send({ message: error.message || "Something went wrong" });
  }
};

exports.assignFreelancersByProject = async (req, res) => {
  console.log("inside freelancers by project api");
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    if (!req.role || req.role.toLowerCase() !== "projectmanger") {
      res.status(401).send({ message: "Your are not admin" });
      return;
    }
    const joiSchema = Joi.object({
      projectId: Joi.string().required(),
      freelancerId: Joi.string().required(),
      role: Joi.string().required(),
    });

    const { error, value } = joiSchema.validate(req.body);

    if (error) {
      // emails.errorEmail(req, error);

      const message = error.details[0].message.replace(/"/g, "");
      await session.abortTransaction();
      session.endSession();
      res.status(401).send({
        message: message,
      });
      return;
    }

    const project = await Projects.findOne({
      _id: req.body.projectId,
    }).populate("projectTasks");
    if (!project) {
      await session.abortTransaction();
      session.endSession();
      res.status(404).send({ message: "project not found" });
      return;
    }
    const freelancer = await Freelancers.findOne({
      _id: req.body.freelancerId,
    });
    if (!freelancer) {
      await session.abortTransaction();
      session.endSession();
      res.status(404).send({ message: "freelancer nor found" });

      return;
    }

    // Texter
    if (req.body.role.toLowerCase() === "texter") {
      const updatedProject = await Projects.findOneAndUpdate(
        { _id: req.body.projectId },
        { texter: req.body.freelancerId },
        { new: true }
      );
      const projectTasks =
        project?.projectTasks && project.projectTasks.length > 0
          ? project.projectTasks
          : null;
      if (projectTasks) {
        for (const task of projectTasks) {
          await ProjectTask.findOneAndUpdate(
            { _id: task._id },
            { texter: req.body.freelancerId },
            { new: true }
          );
          freelancerEmails.taskAssign(
            freelancer.email,
            { name: task.taskName, keyword: task.keywords },
            "Texter"
          );
        }
      }
    }

    // Lector
    if (req.body.role.toLowerCase() === "lector") {
      const updatedProject = await Projects.findOneAndUpdate(
        { _id: req.body.projectId },
        { lector: req.body.freelancerId },
        { new: true }
      );
      const projectTasks =
        project?.projectTasks && project.projectTasks.length > 0
          ? project.projectTasks
          : null;
      if (projectTasks) {
        for (const task of projectTasks) {
          await ProjectTask.findOneAndUpdate(
            { _id: task._id },
            { lector: req.body.freelancerId },
            { new: true }
          );
           freelancerEmails.taskAssign(
             freelancer.email,
             { name: task.taskName, keyword: task.keywords },
             "Lector"
           );
        }
      }
    }

    // SEO-Optimizer
    if (req.body.role.toLowerCase() === "seo-optimizer") {
      const updatedProject = await Projects.findOneAndUpdate(
        { _id: req.body.projectId },
        { seo: req.body.freelancerId },
        { new: true }
      );
      const projectTasks =
        project?.projectTasks && project.projectTasks.length > 0
          ? project.projectTasks
          : null;
      if (projectTasks) {
        for (const task of projectTasks) {
          await ProjectTask.findOneAndUpdate(
            { _id: task._id },
            { seo: req.body.freelancerId },
            { new: true }
          );
           freelancerEmails.taskAssign(
             freelancer.email,
             { name: task.taskName, keyword: task.keywords },
             "SEO-Optimizer"
           );
        }
      }
    }

    // Meta-Lector
    if (req.body.role.toLowerCase() === "meta-lector") {
      const updatedProject = await Projects.findOneAndUpdate(
        { _id: req.body.projectId },
        { metaLector: req.body.freelancerId },
        { new: true }
      );
      const projectTasks =
        project?.projectTasks && project.projectTasks.length > 0
          ? project.projectTasks
          : null;
      if (
        projectTasks &&
        projectTasks.length === 1 &&
        updatedProject.projectStatus.toLowerCase() === "free trial"
      ) {
        for (const task of projectTasks) {
          await ProjectTask.findOneAndUpdate(
            { _id: task._id },
            { metaLector: req.body.freelancerId },
            { new: true }
          );
        }
      } else {
        if (projectTasks && projectTasks.length > 1) {
          let count = 0;
          for (const task of projectTasks) {
            count++;
            if (count % 10 === 0) {
              await ProjectTask.findOneAndUpdate(
                { _id: task._id },
                { metaLector: req.body.freelancerId },
                { new: true }
              );
               freelancerEmails.taskAssign(
                 freelancer.email,
                 { name: task.taskName, keyword: task.keywords },
                 "Meta Lector"
               );
            }
          }
        }
      }
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

exports.assignFreelancerByTask = async (req, res) => {
  try {
    if (!req.role || req.role.toLowerCase() !== "projectmanger") {
      res.status(401).send({ message: "Your are not admin" });
      return;
    }
    const joiSchema = Joi.object({
      taskId: Joi.string().required(),
      freelancerId: Joi.string().required(),
      role: Joi.string().required(),
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

    const task = await ProjectTask.findOne({ _id: req.body.taskId });
    if (!task) {
      res.status(404).send({ message: "Task not found" });
      return;
    }

    const freelancer = await Freelancers.findOne({
      _id: req.body.freelancerId,
    });
    if (!freelancer) {
      res.status(404).send({ message: "freelancer nor found" });
      return;
    }

    // Texter
    if (req.body.role.toLowerCase() === "texter") {
      const updatedTask = await ProjectTask.findOneAndUpdate(
        { _id: req.body.taskId },
        { texter: req.body.freelancerId },
        { new: true }
      );
      freelancerEmails.taskAssign(
        freelancer.email,
        { name: updatedTask.taskName, keyword: updatedTask.keywords },
        "Texter"
      );
    }

    // Lector
    if (req.body.role.toLowerCase() === "lector") {
      const updatedTask = await ProjectTask.findOneAndUpdate(
        { _id: req.body.taskId },
        { lector: req.body.freelancerId },
        { new: true }
      );
      freelancerEmails.taskAssign(
        freelancer.email,
        { name: updatedTask.taskName, keyword: updatedTask.keywords },
        "Lector"
      );
    }

    // SEO-Optimizer
    if (req.body.role.toLowerCase() === "seo-optimizer") {
      const updatedTask = await ProjectTask.findOneAndUpdate(
        { _id: req.body.taskId },
        { seo: req.body.freelancerId },
        { new: true }
      );
      freelancerEmails.taskAssign(
        freelancer.email,
        { name: updatedTask.taskName, keyword: updatedTask.keywords },
        "SEO-Optimizer"
      );
    }
    res.status(200).send({ message: "success" });
  } catch (error) {
    res.status(500).send({ message: error.message || "Something went wrong" });
  }
};

exports.setPrices = async (req, res) => {
  try {
    if (!req.role || req.role.toLowerCase() !== "projectmanger") {
      res.status(401).send({ message: "Your are not admin" });
      return;
    }
    const joiSchema = Joi.object({
      texter: Joi.number().required(),
      lector: Joi.number().required(),
      seo: Joi.number().required(),
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

    const freelancerPrice = await freelancerPrices.findOne({});

    if (!freelancerPrice) {
      const newFreelancerPrice = await freelancerPrices.create({
        texter: req.body.texter,
        lector: req.body.lector,
        seoOptimizer: req.body.seo,
        metaLector: req.body.lector,
      });
    }

    if (freelancerPrice) {
      const updatedFreelancerPrice = await freelancerPrices.findOneAndUpdate(
        { _id: freelancerPrice._id },
        {
          texter: req.body.texter,
          lector: req.body.lector,
          seoOptimizer: req.body.seo,
          metaLector: req.body.lector,
        },
        { new: true }
      );
    }

    res.status(200).send({ message: "success" });
  } catch (error) {
    res.status(500).send({ message: error.message || "Something went wrong" });
  }
};

exports.getPrices = async (req, res) => {
  try {
    if (!req.role || req.role.toLowerCase() !== "projectmanger") {
      res.status(401).send({ message: "Your are not admin" });
      return;
    }
    const freelancerPrice = await freelancerPrices.findOne({});

    res.status(200).send({ message: "success", data: freelancerPrice });
  } catch (error) {
    res.status(500).send({ message: error.message || "Something went wrong" });
  }
};
