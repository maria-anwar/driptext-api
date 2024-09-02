const Joi = require("@hapi/joi");
const db = require("../../models");
const mongoose = require("mongoose");
// const { RDS } = require("aws-sdk");

const Freelancers = db.Freelancer;
const Users = db.User;
const Roles = db.Role;
const projectTasks = db.ProjectTask;
const Projects = db.Project;
exports.create = async (req, res) => {
  try {
    const joiSchema = Joi.object({
      // userId: Joi.string().required(),
      email: Joi.string().required(),
      firstName: Joi.string().required(),
      lastName: Joi.string().required(),
    });
    const { error, value } = joiSchema.validate(req.body);

    if (error) {
      emails.errorEmail(req, error);

      const message = error.details[0].message.replace(/"/g, "");
      res.status(401).send({
        message: message,
      });
      return;
    }

    const isFreelancer = await Freelancers.findOne({ email: req.body.email });
    if (isFreelancer) {
      res.status(500).send({ message: "email already exists as freelancer" });
      return;
    }
    const isUser = await Users.findOne({ email: req.body.email });
    if (isUser) {
      res.status(500).send({ message: "email already exists as user" });
      return;
    }
    const role = await Roles.findOne({ title: "ProjectManger" });
    if (!role) {
      res.status(500).send({ message: "project manager role does not exists" });
      return;
    }
    const session = await mongoose.startSession();
    session.startTransaction();

    const body = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      role: role._id,
      password: "123456@123456",
    };

    const admin = await Users.create(body);

    await session.commitTransaction();
    session.endSession();
    res.status(200).send({ message: "success", admin: admin });
  } catch (error) {
    res.status(500).send({ message: error.message || "Something went wrong" });
  }
};

exports.getProjects = async (req, res) => {
  try {
    console.log("req.role: ", req.role);
    if (!req.role || req.role.toLowerCase() !== "projectmanger") {
      res.status(401).send({ message: "Your are not admin" });
      return;
    }
    const projects = await projectTasks
      .find({ published: true })
      .select("project status")
      .populate({ path: "project", populate: "plan" });

    let openTasks = 0;
    let finalTasks = 0;
    projects.forEach((item) => {
      if (item.status.toLowerCase() === "final") {
        finalTasks = finalTasks + 1;
      }
      if (item.status.toLowerCase() === "open") {
        openTasks = openTasks + 1;
      }
    });

    const projectsData = projects.map((item) => {
      // const temp = {...item.project.toObject(), openTasks, finalTasks}
      return { ...item.project.toObject(), openTasks, finalTasks };
    });
    // Create a Map to filter out duplicates based on project._id
    const uniqueProjectsData = [
      ...new Map(
        projectsData.map((item) => [item._id.toString(), item])
      ).values(),
    ];

    res.status(200).send({ message: "success", projects: uniqueProjectsData });
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

    const project = await Projects.findOne({
      _id: req.body.projectId,
    }).populate(["user", "plan", "projectTasks", "boardingInfo"]);
    if (!project) {
      res.status(500).send({ message: "Project not found" });
      return;
    }

    res.status(200).send({ message: "success", project: project });
  } catch (error) {
    res.status(500).send({ message: error.message || "Something went wrong" });
  }
};

exports.getFreelancers = async (req, res) => {
  try {
    if (!req.role || req.role.toLowerCase() !== "projectmanger") {
      res.status(401).send({ message: "Your are not admin" });
      return;
    }
    const freelancers = await Freelancers.find()
    res.status(200).send({message: "success", freelancers: freelancers})
  } catch (error) {
    res.status(500).send({ message: error.message || "Something went wrong" });
  }
};
