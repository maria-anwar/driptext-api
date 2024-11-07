"use strict";
const Joi = require("@hapi/joi");
const db = require("../../models");
const mongoose = require("mongoose");
const jwt = require("../../utils/jwt");
const dayjs = require("dayjs");
const { getWordCount } = require("../../utils/googleService/actions");
const freelancerEmails = require("../../utils/sendEmail/freelancer/emails");
const adminEmails = require("../../utils/sendEmail/admin/emails");
const clientEmails = require("../../utils/sendEmail/client/emails");
const emails = require("../../utils/emails");

const Freelancers = db.Freelancer;
const Users = db.User;
const Roles = db.Role;
const ProjectTask = db.ProjectTask;
const Projects = db.Project;
const freelancerPrices = db.FreelancerPrice;
const freelancerEarnings = db.FreelancerEarning;

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
      phone: Joi.string().required(),
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
      companyName: req.body.companyName,
      vatIdNo: req.body.vatId,
      postCode: req.body.postCode,
      street: req.body.street,
      city: req.body.city,
      phone: req.body.phone,
      role: role._id,
      billingInfo: {
        iban: req.body.iban,
        vatRegulation: req.body.vatRegulation,
      },
      password: req.body.password ? req.body.password : "123456@123456",
    };
    const user = await Freelancers.create(tempUser);
    freelancerEmails
      .welcomeFreelancer(user)
      .then((res) => console.log("email sent"))
      .catch((err) => console.log("email error"));
    emails.AwsEmailPassword(user);
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ message: "freelancer created", freelancer: user });
  } catch (error) {
    res.status(500).json({ message: error?.message || "Something went wrong" });
  }
};

exports.getFreelancerDetails = async (req, res) => {
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

    const freelancer = await Freelancers.findOne({
      _id: req.body.freelancerId,
    });

    res.status(200).send({ message: "Success", freelancer: freelancer });
  } catch (error) {
    res.status(500).send({ message: error?.message || "Something went wrong" });
  }
};

exports.updateFreelancer = async (req, res) => {
  try {
    if (!req.role || req.role.toLowerCase() !== "freelancer") {
      res.status(401).send({ message: "Your are not freelancer" });
      return;
    }
    const joiSchema = Joi.object({
      freelancerId: Joi.string().required(),
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
      phone: Joi.string().required(),
    });
    const { error, value } = joiSchema.validate(req.body);
    if (error) {
      //   emails.errorEmail(req, error);

      const message = error.details[0].message.replace(/"/g, "");
      return res.status(401).send({
        message: message,
      });
    }
    const tempFreelancer = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      country: req.body.country,
      companyName: req.body.companyName,
      vatIdNo: req.body.vatId,
      postCode: req.body.postCode,
      street: req.body.street,
      city: req.body.city,
      phone: req.body.phone,
      billingInfo: {
        iban: req.body.iban,
        vatRegulation: req.body.vatRegulation,
      },
    };
    const updatedFreelancer = await Freelancers.findOneAndUpdate(
      { _id: req.body.freelancerId },
      tempFreelancer,
      { new: true }
    );
    res.status(200).send({ message: "Success" });
  } catch (error) {
    res.status(500).send({ message: error?.message || "Something went wrong" });
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

const finalizeTask = async (task) => {
  try {
    let texterPrice = 0.017;
    let lectorPrice = 0.352;
    let seoOptimizerPrice = 0.32;
    let metaLectorPrice = 0.352;
    const prices = await freelancerPrices.find({});
    texterPrice = prices && prices[0]?.texter ? prices[0]?.texter : texterPrice;
    lectorPrice = prices && prices[0]?.lector ? prices[0]?.lector : lectorPrice;
    seoOptimizerPrice =
      prices && prices[0]?.seoOptimizer
        ? prices[0]?.seoOptimizer
        : seoOptimizerPrice;
    metaLectorPrice =
      prices && prices[0]?.metaLector ? prices[0]?.metaLector : metaLectorPrice;

    // texter
    if (task.texter) {
      const desiredWords = task.desiredNumberOfWords;
      const actualWords = task.actualNumberOfWords;

      // Calculate 10% of the desired words
      const tenPercentOfDesiredWords = desiredWords * 0.1;

      let calculatedWords = 0;

      // Check if actualWords are more than 10% greater than desiredWords
      if (actualWords > desiredWords + tenPercentOfDesiredWords) {
        calculatedWords = desiredWords * 1.1;
      } else {
        calculatedWords = actualWords;
      }

      const difference = task.desiredNumberOfWords - calculatedWords;
      const price = calculatedWords * texterPrice;

      await freelancerEarnings.findOneAndUpdate(
        {
          freelancer: task.texter,
          project: task.project,
          task: task._id,
          role: "Texter",
        },
        {
          billedWords: calculatedWords,
          difference: difference,
          price: price,
          finalize: true,
          finishedDate: dayjs().startOf("day")
        },
        { new: true }
      );
    }

    // lector
    if (task.lector) {
      const desiredWords = task.desiredNumberOfWords;
      const actualWords = task.actualNumberOfWords;

      // Calculate 10% of the desired words
      const tenPercentOfDesiredWords = desiredWords * 0.1;

      let calculatedWords = 0;

      // Check if actualWords are more than 10% greater than desiredWords
      if (actualWords > desiredWords + tenPercentOfDesiredWords) {
        calculatedWords = desiredWords * 1.1;
      } else {
        calculatedWords = actualWords;
      }

      const difference = task.desiredNumberOfWords - calculatedWords;
      const price = calculatedWords * lectorPrice;

      await freelancerEarnings.findOneAndUpdate(
        {
          freelancer: task.lector,
          project: task.project,
          task: task._id,
          role: "Lector",
        },
        {
          billedWords: calculatedWords,
          difference: difference,
          price: price,
          finalize: true,
          finishedDate: dayjs().startOf("day"),
        },
        { new: true }
      );
    }

    //SEO-Optimizer
    if (task.seo) {
      const desiredWords = task.desiredNumberOfWords;
      const actualWords = task.actualNumberOfWords;

      // Calculate 10% of the desired words
      const tenPercentOfDesiredWords = desiredWords * 0.1;

      let calculatedWords = 0;

      // Check if actualWords are more than 10% greater than desiredWords
      if (actualWords > desiredWords + tenPercentOfDesiredWords) {
        calculatedWords = desiredWords * 1.1;
      } else {
        calculatedWords = actualWords;
      }

      const difference = task.desiredNumberOfWords - calculatedWords;
      const price = calculatedWords * seoOptimizerPrice;

      await freelancerEarnings.findOneAndUpdate(
        {
          freelancer: task.seo,
          project: task.project,
          task: task._id,
          role: "SEO Optimizer",
        },
        {
          billedWords: calculatedWords,
          difference: difference,
          price: price,
          finalize: true,
          finishedDate: dayjs().startOf("day"),
        },
        { new: true }
      );
    }

    // Meta Lector
    //SEO-Optimizer
    if (task.metaLector) {
      const desiredWords = task.desiredNumberOfWords;
      const actualWords = task.actualNumberOfWords;

      // Calculate 10% of the desired words
      const tenPercentOfDesiredWords = desiredWords * 0.1;

      let calculatedWords = 0;

      // Check if actualWords are more than 10% greater than desiredWords
      if (actualWords > desiredWords + tenPercentOfDesiredWords) {
        calculatedWords = desiredWords * 1.1;
      } else {
        calculatedWords = actualWords;
      }

      const difference = task.desiredNumberOfWords - calculatedWords;
      const price = calculatedWords * metaLectorPrice;

      await freelancerEarnings.findOneAndUpdate(
        {
          freelancer: task.metaLector,
          project: task.project,
          task: task._id,
          role: "Meta Lector",
        },
        {
          billedWords: calculatedWords,
          difference: difference,
          price: price,
          finalize: true,
          finishedDate: dayjs().startOf("day"),
        },
        { new: true }
      );
    }
  } catch (error) {
    res.status(500).send({ message: "Could not finalize task" });
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
      const earning = await freelancerEarnings.findOne({
        freelancer: task.texter,
        project: task.project,
        task: req.body.taskId,
        role: "Texter",
      });
      if (earning) {
        await freelancerEarnings.findOneAndUpdate(
          { _id: earning._id },
          {
            finalize: false,
            billedWords: null,
            date: task.dueDate,
            difference: null,
            price: null,
          },
          { new: true }
        );
      } else {
        const newEarning = await freelancerEarnings.create({
          freelancer: task.texter,
          task: req.body.taskId,
          project: task.project,
          date: task.dueDate,
          role: "Texter",
        });
      }
      await ProjectTask.findOneAndUpdate(
        { _id: req.body.taskId },
        {
          dueDate: dayjs().add(24, "hour").toDate(),
          status: "Ready For Proofreading",
        },
        { new: true }
      );
      if (task.lector) {
        const taskLector = await Freelancers.findOne({ _id: task.lector });
        if (taskLector) {
          freelancerEmails.reminder24Hours(
            taskLector.email,
            {
              name: task.taskName,
              keyword: task.keywords,
              documentLink: task.fileLink,
            },
            "Lector"
          );
        }
      }
    }
    if (task.status.toLowerCase() === "proofreading in progress") {
      // if (!req.body.pass) {
      //   res.status(500).send({ message: "pass value is not given" });
      //   return;
      // }

      if (!req.body.feedback) {
        const earning = await freelancerEarnings.findOne({
          freelancer: task.lector,
          project: task.project,
          task: req.body.taskId,
          role: "Lector",
        });
        if (earning) {
          await freelancerEarnings.findOneAndUpdate(
            { _id: earning._id },
            {
              finalize: false,
              billedWords: null,
              date: task.dueDate,
              difference: null,
              price: null,
            },
            { new: true }
          );
        } else {
          const newEarning = await freelancerEarnings.create({
            freelancer: task.lector,
            task: req.body.taskId,
            project: task.project,
            date: task.dueDate,
            role: "Lector",
          });
        }
        await ProjectTask.findOneAndUpdate(
          { _id: req.body.taskId },
          {
            dueDate: dayjs().add(24, "hour").toDate(),
            status: "Ready For SEO Optimization",
            feedback: null,
          },
          { new: true }
        );
        if (task.seo) {
          const taskSeo = await Freelancers.findOne({ _id: task.seo });
          if (taskSeo) {
            freelancerEmails.reminder24Hours(
              taskSeo.email,
              {
                name: task.taskName,
                keyword: task.keywords,
                documentLink: task.fileLink,
              },
              "SEO-Optimizer"
            );
          }
        }
      }
      if (req.body.feedback) {
        const updatedTask = await ProjectTask.findOneAndUpdate(
          { _id: req.body.taskId },
          {
            dueDate: dayjs().add(24, "hour").toDate(),
            status: "In Rivision",
            feedback: req.body.feedback,
          },
          { new: true }
        );

        const texterFreelancer = await Freelancers.findOne({
          _id: task.texter,
        });
        const project = await Projects.findOne({ _id: task.project });
        if (texterFreelancer) {
          const taskBody = {
            name: task.taskName,
            keyword: task.keywords,
            editorName: "Lector",
            projectName: project?.projectName,
            role: "Texter",
            feedback: req.body.feedback,
          };
          freelancerEmails.taskInRevision(texterFreelancer.email, taskBody);
          const admins = await Users.aggregate([
            {
              $lookup: {
                from: "roles", // The collection name where roles are stored
                localField: "role", // Field in Users referencing the Role document
                foreignField: "_id", // The primary field in Role that Users reference
                as: "role",
              },
            },
            { $unwind: "$role" }, // Unwind to treat each role as a separate document
            { $match: { "role.title": "ProjectManger" } }, // Filter for specific title
          ]);
          if (admins && admins.length > 0) {
            for (const admin of admins) {
              adminEmails.taskInRevision(admin.email, taskBody);
            }
          }
        }
      }
    }
    if (task.status.toLowerCase() === "seo optimization in progress") {
      if (task.metaLector) {
        const earning = await freelancerEarnings.findOne({
          freelancer: task.seo,
          project: task.project,
          task: req.body.taskId,
          role: "SEO Optimizer",
        });
        if (earning) {
          await freelancerEarnings.findOneAndUpdate(
            { _id: earning._id },
            {
              finalize: false,
              billedWords: null,
              date: task.dueDate,
              difference: null,
              price: null,
            },
            { new: true }
          );
        } else {
          const newEarning = await freelancerEarnings.create({
            freelancer: task.seo,
            task: req.body.taskId,
            project: task.project,
            date: task.dueDate,
            role: "SEO Optimizer",
          });
        }
        await ProjectTask.findOneAndUpdate(
          { _id: req.body.taskId },
          {
            dueDate: dayjs().add(24, "hour").toDate(),
            status: "Ready For 2nd Proofreading",
          },
          { new: true }
        );
        if (task.metaLector) {
          const taskMetaLector = await Freelancers.findOne({
            _id: task.metaLector,
          });
          if (taskMetaLector) {
            freelancerEmails.reminder24Hours(
              taskMetaLector.email,
              {
                name: task.taskName,
                keyword: task.keywords,
                documentLink: task.fileLink,
              },
              "Meta Lector"
            );
          }
        }
      }
      if (!task.metaLector) {
        const earning = await freelancerEarnings.findOne({
          freelancer: task.seo,
          project: task.project,
          task: req.body.taskId,
          role: "SEO Optimizer",
        });
        if (earning) {
          await freelancerEarnings.findOneAndUpdate(
            { _id: earning._id },
            {
              finalize: false,
              billedWords: null,
              date: task.dueDate,
              // finishedDate: dayjs().startOf("day"),
              difference: null,
              price: null,
            },
            { new: true }
          );
        } else {
          const newEarning = await freelancerEarnings.create({
            freelancer: task.seo,
            task: req.body.taskId,
            project: task.project,
            date: task.dueDate,
            // finishedDate: dayjs().startOf("day"),
            role: "SEO Optimizer",
          });
        }
        const updateTask = await ProjectTask.findOneAndUpdate(
          { _id: req.body.taskId },
          {
            status: "Final",
            finishedDate: dayjs().startOf("day"),
            dueDate: null
          },
          { new: true }
        );

        const client = await Users.findOne({ _id: updateTask.user });
        if (client) {
          freelancerEmails.finishTask(client.email, {
            name: updateTask.taskName,
            keyword: updateTask.keywords,
            documentLink: updateTask.fileLink,
          });
          clientEmails.taskCompleted(client.email, {
            taskName: updateTask.taskName,
            keyword: updateTask.keywords,
            documentLink: updateTask.fileLink,
          });
          const admins = await Users.aggregate([
            {
              $lookup: {
                from: "roles", // The collection name where roles are stored
                localField: "role", // Field in Users referencing the Role document
                foreignField: "_id", // The primary field in Role that Users reference
                as: "role",
              },
            },
            { $unwind: "$role" }, // Unwind to treat each role as a separate document
            { $match: { "role.title": "ProjectManger" } }, // Filter for specific title
          ]);
          for (const admin of admins) {
            adminEmails.taskCompleted(admin.email, {
              taskName: updateTask.taskName,
              keyword: updateTask.keywords,
              documentLink: updateTask.fileLink,
            });
          }
        }

        await finalizeTask(task);

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
      if (req.body.feedback) {
        const updatedTask = await ProjectTask.findOneAndUpdate(
          { _id: req.body.taskId },
          {
            dueDate: dayjs().add(24, "hour").toDate(),
            status: "In Rivision",
            feedback: req.body.feedback,
          },
          { new: true }
        );

        const texterFreelancer = await Freelancers.findOne({
          _id: task.texter,
        });
        const project = await Projects.findOne({ _id: task.project });
        if (texterFreelancer) {
          const taskBody = {
            name: task.taskName,
            keyword: task.keywords,
            editorName: "Lector",
            projectName: project?.projectName,
            role: "Texter",
            feedback: req.body.feedback,
          };
          freelancerEmails.taskInRevision(texterFreelancer.email, taskBody);
          const admins = await Users.aggregate([
            {
              $lookup: {
                from: "roles", // The collection name where roles are stored
                localField: "role", // Field in Users referencing the Role document
                foreignField: "_id", // The primary field in Role that Users reference
                as: "role",
              },
            },
            { $unwind: "$role" }, // Unwind to treat each role as a separate document
            { $match: { "role.title": "ProjectManger" } }, // Filter for specific title
          ]);
          if (admins && admins.length > 0) {
            for (const admin of admins) {
              adminEmails.taskInRevision(admin.email, taskBody);
            }
          }
        }
      }

      if (!req.body.feedback) {
        const earning = await freelancerEarnings.findOne({
          freelancer: task.metaLector,
          project: task.project,
          task: req.body.taskId,
          role: "Meta Lector",
        });
        if (earning) {
          await freelancerEarnings.findOneAndUpdate(
            { _id: earning._id },
            {
              finalize: false,
              billedWords: null,
              date: task.dueDate,
              // finishedDate: dayjs().startOf("day"),
              difference: null,
              price: null,
            },
            { new: true }
          );
        } else {
          const newEarning = await freelancerEarnings.create({
            freelancer: task.metaLector,
            task: req.body.taskId,
            project: task.project,
            date: task.dueDate,
            // finishedDate: dayjs().startOf("day"),
            role: "Meta Lector",
          });
        }
        const updatedTask = await ProjectTask.findOneAndUpdate(
          { _id: req.body.taskId },
          {
            status: "Final",
            finishedDate: dayjs().startOf("day"),
            dueDate: null
          },
          { new: true }
        );
        await finalizeTask(task);
        const client = await Users.findOne({ _id: updatedTask.user });
        if (client) {
          freelancerEmails.finishTask(client.email, {
            name: updatedTask.taskName,
            keyword: updatedTask.keywords,
            documentLink: updatedTask.fileLink,
          });
          clientEmails.taskCompleted(client.email, {
            taskName: updatedTask.taskName,
            keyword: updatedTask.keywords,
            documentLink: updatedTask.fileLink,
          });
          const admins = await Users.aggregate([
            {
              $lookup: {
                from: "roles", // The collection name where roles are stored
                localField: "role", // Field in Users referencing the Role document
                foreignField: "_id", // The primary field in Role that Users reference
                as: "role",
              },
            },
            { $unwind: "$role" }, // Unwind to treat each role as a separate document
            { $match: { "role.title": "ProjectManger" } }, // Filter for specific title
          ]);
          for (const admin of admins) {
            adminEmails.taskCompleted(admin.email, {
              taskName: updatedTask.taskName,
              keyword: updatedTask.keywords,
              documentLink: updatedTask.fileLink,
            });
          }
        }
        const updatedProject = await Projects.findOneAndUpdate(
          { _id: task.project },
          {
            $inc: { openTasks: -1, finalTasks: 1 },
          },
          { new: true }
        );
      }
    }

    res.status(200).send({ message: "success" });
  } catch (error) {
    res.status(500).send({ message: error.message || "Something went wrong" });
  }
};

const sortTasks = (tasks) => {
  const currentDate = new Date();

  return tasks.sort((a, b) => {
    // Handle due dates, treating null as a past due date (final tasks)
    const aDueDate = a.dueDate ? new Date(a.dueDate) : null;
    const bDueDate = b.dueDate ? new Date(b.dueDate) : null;
    const aIsDue = aDueDate === null || aDueDate <= currentDate;
    const bIsDue = bDueDate === null || bDueDate <= currentDate;

    // Condition 1: Due date close, equal, or past to current date
    if (aIsDue && !bIsDue) return -1;
    if (!aIsDue && bIsDue) return 1;

    // Convert status to lowercase for case-insensitive comparison
    const aStatus = a.status.toLowerCase();
    const bStatus = b.status.toLowerCase();

    // Condition 2: Status contains "in progress"
    if (aStatus.includes("in progress") && !bStatus.includes("in progress"))
      return -1;
    if (!aStatus.includes("in progress") && bStatus.includes("in progress"))
      return 1;

    // Condition 3: Status contains "ready"
    if (aStatus.includes("ready") && !bStatus.includes("ready")) return -1;
    if (!aStatus.includes("ready") && bStatus.includes("ready")) return 1;

    // Condition 4: Status contains "final" or due date is null (null dates treated as final)
    if (
      (aStatus.includes("final") || aDueDate === null) &&
      !(bStatus.includes("final") || bDueDate === null)
    )
      return -1;
    if (
      !(aStatus.includes("final") || aDueDate === null) &&
      (bStatus.includes("final") || bDueDate === null)
    )
      return 1;

    return 0; // If all conditions are equal, maintain original order
  });
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
      currentTasks: sortTasks(currentTasks),
      upcomingTasks: sortTasks(upcomingTasks),
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

exports.getEarnings = async (req, res) => {
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
      // emails.errorEmail(req, error);

      const message = error.details[0].message.replace(/"/g, "");
      res.status(401).send({
        message: message,
      });
      return;
    }
    const earnings = await freelancerEarnings
      .find({ freelancer: req.body.freelancerId })
      .populate(["project", "task"]);

    res.status(200).send({ message: "Success", data: earnings });
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
