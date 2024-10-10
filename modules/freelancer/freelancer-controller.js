"use strict";
const Joi = require("@hapi/joi");
const db = require("../../models");
const mongoose = require("mongoose");
const jwt = require("../../utils/jwt");
const dayjs = require("dayjs");
const { getWordCount } = require("../../utils/googleService/actions");

const Freelancers = db.Freelancer;
const Users = db.User;
const Roles = db.Role;
const ProjectTask = db.ProjectTask;
const Projects = db.Project;
const freelancerPrices = db.FreelancerPrice;

exports.create = async (req, res) => {
  try {
    const joiSchema = Joi.object({
      firstName: Joi.string().required(),
      lastName: Joi.string().required(),
      email: Joi.string().email().required(),
      country: Joi.string().optional().allow(null).allow(""),
      companyName: Joi.string().optional().allow(null).allow(""),
      vatId: Joi.string().required(),
      iban: Joi.string().required(),
      vatRegulation: Joi.string().required(),
      street: Joi.string().required(),
      postCode: Joi.string().required(),
      city: Joi.string().required(),
    });
    const { error, value } = joiSchema.validate(req.body);
    if (error) {
      //   emails.errorEmail(req, error);

      const message = error.details[0].message.replace(/"/g, "");
      return res.status(401).send({
        message: message,
      });
    }
    const session = await mongoose.startSession();
    session.startTransaction();

    const role = await Roles.findOne({ title: "Freelancer" });

    if (!role) {
      await session.commitTransaction();
      session.endSession();
      return res
        .status(500)
        .json({ message: "Freelancer role does not exists" });
    }

    const alreadyExistsInFreelancers = await Freelancers.findOne({
      email: req.body.email,
    });

    if (alreadyExistsInFreelancers) {
      await session.commitTransaction();
      session.endSession();
      return res.status(500).json({ message: "Email Already exists" });
    }

    const alreadyExistsInUsers = await Users.findOne({
      email: req.body.email,
    });

    if (alreadyExistsInUsers) {
      await session.commitTransaction();
      session.endSession();
      return res.status(500).json({ message: "Email Already exists" });
    }

    const tempUser = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      country: req.body.country,
      postCode: req.body.postCode,
      street: req.body.street,
      city: req.body.city,
      role: role._id,
      freelancerBillingInfo: {
        iban: req.body.iban,
        vatRegulation: req.body.vatRegulation,
      },
      password: req.body.password ? req.body.password : "123456@123456",
    };
    const user = await Freelancers.create(tempUser);
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ message: "freelancer created", freelancer: user });
  } catch (error) {
    res.status(500).json({ message: error?.message || "Something went wrong" });
  }
};

exports.taskDecline = async (req, res) => {
  try {
    if (!req.role || req.role.toLowerCase() !== "freelancer") {
      res.status(401).send({ message: "Your are not freelancer" });
      return;
    }
    const joiSchema = Joi.object({
      taskId: Joi.string().required(),
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
    }
    if (
      task.status.toLowerCase() === "ready to work" ||
      task.status.toLowerCase() === "in progress"
    ) {
      await ProjectTask.findOneAndUpdate(
        { _id: req.body.taskId },
        {
          status: "Ready To Work",
          texter: null,
        },
        { new: true }
      );
    }
    if (
      task.status.toLowerCase() === "ready for proofreading" ||
      task.status.toLowerCase() === "proofreading in progress"
    ) {
      await ProjectTask.findOneAndUpdate(
        { _id: req.body.taskId },
        {
          status: "Ready For Proofreading",
          lector: null,
        },
        { new: true }
      );
    }
    if (
      task.status.toLowerCase() === "ready for seo optimization" ||
      task.status.toLowerCase() === "seo optimization in progress"
    ) {
      await ProjectTask.findOneAndUpdate(
        { _id: req.body.taskId },
        {
          status: "Ready For SEO Optimization",
          seo: null,
        },
        { new: true }
      );
    }
    if (
      task.status.toLowerCase() === "ready for 2nd proofreading" ||
      task.status.toLowerCase() === "proofreading in progress"
    ) {
      await ProjectTask.findOneAndUpdate(
        { _id: req.body.taskId },
        {
          status: "Ready For 2nd Proofreading",
          metaLector: null,
        },
        { new: true }
      );
    }

    res.status(200).send({ message: "success" });
  } catch (error) {
    res.status(500).send({ message: error.message || "Something went wrong" });
  }
};

exports.taskStart = async (req, res) => {
  try {
    if (!req.role || req.role.toLowerCase() !== "freelancer") {
      res.status(401).send({ message: "Your are not freelancer" });
      return;
    }
    const joiSchema = Joi.object({
      taskId: Joi.string().required(),
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
    }
    if (task.status.toLowerCase() === "ready to work") {
      await ProjectTask.findOneAndUpdate(
        { _id: req.body.taskId },
        {
          status: "In Progress",
        },
        { new: true }
      );
    }
    if (task.status.toLowerCase() === "ready for proofreading") {
      await ProjectTask.findOneAndUpdate(
        { _id: req.body.taskId },
        {
          status: "Proofreading In Progress",
        },
        { new: true }
      );
    }
    if (task.status.toLowerCase() === "ready for seo optimization") {
      await ProjectTask.findOneAndUpdate(
        { _id: req.body.taskId },
        {
          status: "SEO Optimization In Progress",
        },
        { new: true }
      );
    }
    if (task.status.toLowerCase() === "ready for 2nd proofreading") {
      await ProjectTask.findOneAndUpdate(
        { _id: req.body.taskId },
        {
          status: "2nd Proofreading In Progress",
        },
        { new: true }
      );
    }

    res.status(200).send({ message: "success" });
  } catch (error) {
    res.status(500).send({ message: error.message || "Something went wrong" });
  }
};

exports.finishTask = async (req, res) => {
  try {
    if (!req.role || req.role.toLowerCase() !== "freelancer") {
      res.status(401).send({ message: "Your are not freelancer" });
      return;
    }
    const joiSchema = Joi.object({
      taskId: Joi.string().required(),
      // pass: Joi.string().optional().default(""),
      feedback: Joi.string().optional().default(""),
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
    }
    if (
      task.status.toLowerCase() === "in progress" ||
      task.status.toLowerCase() === "in rivision"
    ) {
      await ProjectTask.findOneAndUpdate(
        { _id: req.body.taskId },
        {
          status: "Ready For Proofreading",
        },
        { new: true }
      );
    }
    if (task.status.toLowerCase() === "proofreading in progress") {
      // if (!req.body.pass) {
      //   res.status(500).send({ message: "pass value is not given" });
      //   return;
      // }

      if (!req.body.feedback) {
        await ProjectTask.findOneAndUpdate(
          { _id: req.body.taskId },
          {
            status: "Ready For SEO Optimization",
            feedback: null,
          },
          { new: true }
        );
      }
      if (req.body.feedback) {
        await ProjectTask.findOneAndUpdate(
          { _id: req.body.taskId },
          {
            status: "In Rivision",
            feedback: req.body.feedback,
          },
          { new: true }
        );
      }
    }
    if (task.status.toLowerCase() === "seo optimization in progress") {
      if (task.metaLector) {
        await ProjectTask.findOneAndUpdate(
          { _id: req.body.taskId },
          {
            status: "Ready For 2nd Proofreading",
          },
          { new: true }
        );
      }
      if (!task.metaLector) {
        const updateTask = await ProjectTask.findOneAndUpdate(
          { _id: req.body.taskId },
          {
            status: "Final",
          },
          { new: true }
        );

        const updatedProject = await Projects.findOneAndUpdate(
          { _id: task.project },
          {
            $inc: { openTasks: -1, finalTasks: 1 },
          },
          { new: true }
        );
      }
    }
    if (task.status.toLowerCase() === "2nd proofreading in progress") {
      await ProjectTask.findOneAndUpdate(
        { _id: req.body.taskId },
        {
          status: "Final",
        },
        { new: true }
      );
      const updatedProject = await Projects.findOneAndUpdate(
        { _id: task.project },
        {
          $inc: { openTasks: -1, finalTasks: 1 },
        },
        { new: true }
      );
    }

    res.status(200).send({ message: "success" });
  } catch (error) {
    res.status(500).send({ message: error.message || "Something went wrong" });
  }
};

exports.getTasks = async (req, res) => {
  try {
    if (!req.role || req.role.toLowerCase() !== "freelancer") {
      res.status(401).send({ message: "Your are not freelancer" });
      return;
    }
    const joiSchema = Joi.object({
      freelancerId: Joi.string().required(),
    });

    const { error, value } = joiSchema.validate(req.body);
    if (error) {
      //   emails.errorEmail(req, error);

      const message = error.details[0].message.replace(/"/g, "");
      return res.status(401).send({
        message: message,
      });
    }

    const tasks = await ProjectTask.find({
      isActive: "Y",
      $or: [
        { texter: req.body.freelancerId },
        { lector: req.body.freelancerId },
        { seo: req.body.freelancerId },
        { metaLector: req.body.freelancerId },
      ],
    }).populate({ path: "project", populate: ["plan", "onBoardingInfo"] });

    // Get the current month and year
    const today = dayjs(); // Current date
    const currentMonth = today.month(); // Current month (0-based, so 0 is January)
    const currentYear = today.year(); // Current year

    // Separate tasks into current and upcoming based on deadline
    const currentTasks = [];
    const upcomingTasks = [];

    tasks.forEach((task) => {
      const taskObj = task.toObject(); // Convert Mongoose document to plain object
      const deadline = dayjs(task.dueDate); // Convert deadline to dayjs object
      const taskMonth = deadline.month(); // Task deadline month (0-based)
      const taskYear = deadline.year(); // Task deadline year

      // Determine the active role(s)
      let activeRole = "";
      if ((task.texter || "").toString() === req.body.freelancerId)
        activeRole += "Texter";
      if ((task.lector || "").toString() === req.body.freelancerId)
        activeRole += (activeRole ? "," : "") + "Lector";
      if ((task.seo || "").toString() === req.body.freelancerId)
        activeRole += (activeRole ? "," : "") + "Seo-Optimizer";
      if ((task.metaLector || "").toString() === req.body.freelancerId)
        activeRole += (activeRole ? "," : "") + "Meta-Lector";

      // Add activeRole to task object
      taskObj.activeRole = activeRole;

      if (taskYear === currentYear && taskMonth === currentMonth) {
        // Task is due in the current month and year
        currentTasks.push(taskObj);
      } else if (
        taskYear > currentYear ||
        (taskYear === currentYear && taskMonth > currentMonth)
      ) {
        upcomingTasks.push(taskObj);
      } else {
        currentTasks.push(taskObj);
      }
    });

    const finalData = {
      currentTasks,
      upcomingTasks,
    };

    res.status(200).send({ message: "success", tasks: finalData });
  } catch (error) {
    res.status(500).send({ message: error.message || "Something went wrong" });
  }
};

exports.updateWordCountAllTasks = async () => {
  try {
    if (!req.role || req.role.toLowerCase() !== "freelancer") {
      res.status(401).send({ message: "Your are not freelancer" });
      return;
    }
    const joiSchema = Joi.object({
      freelancerId: Joi.string().required(),
    });

    const { error, value } = joiSchema.validate(req.body);
    if (error) {
      //   emails.errorEmail(req, error);

      const message = error.details[0].message.replace(/"/g, "");
      return res.status(401).send({
        message: message,
      });
    }

    const tasks = await ProjectTask.find({
      isActive: "Y",
      $or: [
        { texter: req.body.freelancerId },
        { lector: req.body.freelancerId },
        { seo: req.body.freelancerId },
        { metaLector: req.body.freelancerId },
      ],
    });
    for (const task of tasks) {
      let wordCount = await getWordCount(task.fileId);
      await ProjectTask.findOneAndUpdate(
        { _id: task._id },
        {
          actualNumberOfWords: wordCount,
        },
        { new: true }
      );
    }
    res.status(200).send({ message: "success" });
  } catch (error) {
    res.status(500).send({ message: error.message || "Something went wrong" });
  }
};

exports.updateWordCountTask = async (req, res) => {
  try {
    if (!req.role || req.role.toLowerCase() !== "freelancer") {
      res.status(401).send({ message: "Your are not freelancer" });
      return;
    }
    const joiSchema = Joi.object({
      taskId: Joi.string().required(),
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
    }
    const wordCount = await getWordCount(task.fileId);
    await ProjectTask.findOneAndUpdate(
      { _id: task._id },
      {
        actualNumberOfWords: wordCount,
      },
      { new: true }
    );

    res.status(200).send({ message: "success" });
  } catch (error) {
    res.status(500).send({ message: error.message || "Something went wrong" });
  }
};

exports.emailCheck = async (req, res) => {
  try {
    const joiSchema = Joi.object({
      // userId: Joi.string().required(),
      email: Joi.string().required(),
      // lastName: Joi.string().required(),
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
      res.status(500).json({ message: "This email exists as freelancer" });
      return;
    }

    res.status(200).json({ message: "success" });
  } catch (error) {
    res.status(500).send({ message: error.message || "Something went wrong" });
  }
};

