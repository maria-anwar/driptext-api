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
const freelancerEarnings = db.FreelancerEarning;
const freelancerPrices = db.FreelancerPrice;
const Language = db.Language;

const {
  createFolder,
  createTaskFile,
  getFileCount,
  findOrCreateFolderInParent,
  exportTasksToSheetInFolder,
} = require("../../utils/googleService/actions");

exports.createProjectManager = async (req, res) => {
  try {
    const joiSchema = Joi.object({
      email: Joi.string().required(),
      firstName: Joi.string().required(),
      lastName: Joi.string().required(),
      password: Joi.string().required(),
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
      password: req.body.password,
    };

    const admin = await Users.create(body);

    const language = await Language.create({
      userId: admin._id,
      language: "de",
    });

    await session.commitTransaction();
    session.endSession();
    res.status(200).send({ message: "success", admin: admin });
  } catch (error) {
    res.status(500).send({ message: error.message || "Something went wrong" });
  }
};

exports.tracking = async (req, res) => {
  try {
    if (!req.role || req.role.toLowerCase() !== "projectmanger") {
      res.status(401).send({ message: "Your are not admin" });
      return;
    }
    const joiSchema = Joi.object({
      clientId: Joi.string().required(),
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

    const projects = await Projects.find({
      user: req.body.clientId,
      // plan: { $ne: null },
    })
      .populate({
        path: "projectTasks",
        match: { status: { $nin: ["Ready To Work"] } },
      })
      .exec();
    // const filteredProjects = projects.filter(
    //   (project) => project.projectTask && project.projectTask.length > 0
    // );
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

    // Use Promise.all to handle async mapping
    const finalData = await Promise.all(
      projects.map(async (item) => {
        let revenue = 0;
        let cost = 0;
        let margin = 0;

        revenue = (item?.projectTasks ? item.projectTasks.length : 0) * 0.764;
        if (item?.projectTasks && item.projectTasks.length > 0) {
          item.projectTasks.forEach((task) => {
            const temp =
              texterPrice +
              lectorPrice +
              seoOptimizerPrice +
              (task.metaLector ? metaLectorPrice : 0);
            cost = cost + temp;
          });
        }

        margin = revenue - cost;
        return {
          revenue,
          cost,
          margin,
          inProgressTasks: item.projectTasks ? item.projectTasks.length : 0,
          project: item,
        };
      })
    );

    res.status(200).send({ message: "Success", data: finalData });
  } catch (error) {
    res.status(500).send({ message: error.message || "Something went wrong" });
  }
};

exports.forecasting = async (req, res) => {
  try {
    if (!req.role || req.role.toLowerCase() !== "projectmanger") {
      res.status(401).send({ message: "Your are not admin" });
      return;
    }
    const joiSchema = Joi.object({
      clientId: Joi.string().required(),
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

    const projects = await Projects.find({
      user: req.body.clientId,
      // plan: { $ne: null },
    })
      .populate({
        path: "projectTasks",
        match: { status: "Ready To Work" },
      })
      .exec();
    // const filteredProjects = projects.filter(
    //   (project) => project.projectTask && project.projectTask.length > 0
    // );
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

    // Use Promise.all to handle async mapping
    const finalData = await Promise.all(
      projects.map(async (item) => {
        let revenue = 0;
        let cost = 0;
        let margin = 0;

        revenue = (item?.projectTasks ? item.projectTasks.length : 0) * 0.764;
        if (item?.projectTasks && item.projectTasks.length > 0) {
          item.projectTasks.forEach((task) => {
            const temp =
              texterPrice +
              lectorPrice +
              seoOptimizerPrice +
              (task.metaLector ? metaLectorPrice : 0);
            cost = cost + temp;
          });
          // cost = texterPrice + lectorPrice + seoOptimizerPrice;
        }

        margin = revenue - cost;
        return {
          revenue,
          cost,
          margin,
          openTasks: item.projectTasks ? item.projectTasks.length : 0,
          project: item,
        };
      })
    );

    res.status(200).send({ message: "Success", data: finalData });
  } catch (error) {
    res.status(500).send({ message: error.message || "Something went wrong" });
  }
};

exports.getAllClients = async (req, res) => {
  try {
    if (!req.role || req.role.toLowerCase() !== "projectmanger") {
      res.status(401).send({ message: "Your are not admin" });
      return;
    }
    const users = await Users.find({})
      .populate({
        path: "role",
        match: { title: { $regex: /^client$|^leads$/i } },
      })
      .exec();
    const clients = users.filter((user) => user.role !== null);
    res.status(200).send({ message: "Success", data: clients });
  } catch (error) {
    res.status(500).send({ message: error.message || "Something went wrong" });
  }
};

exports.allTasksCost = async (req, res) => {
  try {
    if (!req.role || req.role.toLowerCase() !== "projectmanger") {
      res.status(401).send({ message: "Your are not admin" });
      return;
    }
    let texterCost = 0;
    let lectorCost = 0;
    let seoCost = 0;
    let metaLectorCost = 0;
    let totalRevenue = 0;
    let totalCost = 0;
    let totalMargin = 0;
    let totalStartedTasks = 0;
    let userPlanIds = [];

    const allTasks = await ProjectTask.find({}).populate("project").exec();
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

    allTasks.forEach((task) => {
      const desiredWords = task.desiredNumberOfWords;
      const actualWords = task.actualNumberOfWords;

      // Calculate 10% of the desired words
      const tenPercentOfDesiredWords = desiredWords * 0.1;

      let calculatedWords = 0;
      let tempPrice = 0;

      // Check if actualWords are more than 10% greater than desiredWords
      if (actualWords > desiredWords + tenPercentOfDesiredWords) {
        calculatedWords = desiredWords * 1.1;
      } else {
        calculatedWords = actualWords;
      }
      // texter
      if (task.texter) {
        const price = calculatedWords * texterPrice;
        // tempPrice = tempPrice + price
        texterCost = texterCost + price;
      }

      // lector
      if (task.lector) {
        const price = calculatedWords * lectorPrice;
        // tempPrice = tempPrice + price;

        lectorCost = lectorCost + price;
      }

      // seo optimizer
      if (task.seo) {
        const price = calculatedWords * seoOptimizerPrice;
        // tempPrice = tempPrice + price;

        seoCost = seoCost + price;
      }

      // meta lector
      if (task.metaLector) {
        const price = calculatedWords * metaLectorPrice;
        // tempPrice = tempPrice + price;

        metaLectorCost = metaLectorCost + price;
      }

      if (task.project.plan) {
        if (!userPlanIds.includes(task.project.plan)) {
          userPlanIds.push(task.project.plan);
        }
      }

      // final task
      if (task.status.toLowerCase() === "final") {
        // totalFinalTasks = totalFinalTasks + 1;
      }

      // open task
      if (task.status.toLowerCase() !== "ready to work") {
        totalStartedTasks = totalStartedTasks + 1;

        const temp =
          texterPrice +
          lectorPrice +
          seoOptimizerPrice +
          (task.metaLector ? metaLectorPrice : 0);
        totalCost = totalCost + temp;
      }
    });

    const userPlanPromises = userPlanIds.map((obj) =>
      UserPlan.findOne({ _id: obj }).populate("subPlan").exec()
    );

    const userPlans = await Promise.all(userPlanPromises);

    userPlans.forEach((userPlan) => {
      if (userPlan) {
        totalRevenue += Number(userPlan.price);
      }
    });

    // totalRevenue = totalStartedTasks * 0.764;
    totalMargin = totalRevenue - totalCost;

    const finalData = {
      texterCost,
      lectorCost,
      seoCost,
      metaLectorCost,
      totalRevenue,
      totalCost,
      totalMargin,
    };

    res.status(200).send({ message: "Success", data: finalData });
  } catch (error) {
    res.status(500).send({ message: error?.message || "Something went wrong" });
  }
};

exports.editProjectManager = async (req, res) => {
  try {
    if (!req.role || req.role.toLowerCase() !== "projectmanger") {
      res.status(401).send({ message: "Your are not admin" });
      return;
    }
    const joiSchema = Joi.object({
      id: Joi.string().required(),
      firstName: Joi.string().required(),
      lastName: Joi.string().required(),
      email: Joi.string().required(),
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

    const isFreelancer = await Freelancers.findOne({ email: req.body.email });
    if (isFreelancer) {
      res
        .status(500)
        .send({ message: "This email already exists as freelancer" });
      return;
    }

    const alreadyExists = await Users.findOne({
      email: req.body.email.trim(),
      _id: { $ne: req.body.id },
    });
    if (alreadyExists) {
      res.status(500).send({ message: "Email already exists" });
      return;
    }

    const updatedAdmin = await Users.findOneAndUpdate(
      { _id: req.body.id },
      {
        firstName: req.body.firstName.trim(),
        lastName: req.body.lastName.trim(),
        email: req.body.email.trim(),
      },
      { new: true }
    );

    res.status(200).send({ message: "success" });
  } catch (error) {
    res.status(500).send({ message: error.message || "something went wrong" });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    if (!req.role || req.role.toLowerCase() !== "projectmanger") {
      res.status(401).send({ message: "Your are not admin" });
      return;
    }

    const freelancers = await Freelancers.find()
      .populate("role")
      .select("firstName lastName email role isActive");
    const users = await Users.find()
      .populate("role")
      .select("firstName lastName email role isActive");
    // Merge the two arrays
    const combinedArray = freelancers.concat(users);

    // Shuffle the merged array using Fisher-Yates shuffle algorithm
    for (let i = combinedArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [combinedArray[i], combinedArray[j]] = [
        combinedArray[j],
        combinedArray[i],
      ];
    }

    res.status(200).send({ message: "Success", users: combinedArray });
  } catch (error) {
    res.status(500).send({ message: error.message || "Something went wrong" });
  }
};

exports.changeUserStatus = async (req, res) => {
  try {
    if (!req.role || req.role.toLowerCase() !== "projectmanger") {
      res.status(401).send({ message: "Your are not admin" });
      return;
    }
    const joiSchema = Joi.object({
      userId: Joi.string().required(),
      isActive: Joi.boolean().required(),
    });
    const { error, value } = joiSchema.validate(req.body);

    if (error) {
      const message = error.details[0].message.replace(/"/g, "");
      res.status(401).send({
        message: message,
      });
      return;
    }
    const isActiveValue = req.body.isActive ? "Y" : "N";
    const user = await Users.findOneAndUpdate(
      { _id: req.body.userId },
      { isActive: isActiveValue },
      { new: true }
    );
    if (user) {
      res.status(200).send({ message: "success" });
      return;
    } else {
      const freelancer = await Freelancers.findOneAndUpdate(
        { _id: req.body.userId },
        { isActive: isActiveValue },
        { new: true }
      );
      if (freelancer) {
        res.status(200).send({ message: "success" });
        return;
      }

      if (!freelancer) {
        res.status(500).send({ message: "user not found" });
        return;
      }
    }
  } catch (error) {
    res.status(200).send({ message: error.message || "Something went wrong" });
  }
};

exports.updateAdminProfile = async (req, res) => {
  try {
    if (!req.role || req.role.toLowerCase() !== "projectmanger") {
      res.status(401).send({ message: "Your are not admin" });
      return;
    }
    const joiSchema = Joi.object({
      id: Joi.string().required(),
      firstName: Joi.string().required(),
      lastName: Joi.string().required(),
      email: Joi.string().required(),
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

    const isFreelancer = await Freelancers.findOne({ email: req.body.email });
    if (isFreelancer) {
      res
        .status(500)
        .send({ message: "This email already exists as freelancer" });
      return;
    }

    const alreadyExists = await Users.findOne({
      email: req.body.email.trim(),
      _id: { $ne: req.body.id },
    });
    if (alreadyExists) {
      res.status(500).send({ message: "Email already exists" });
      return;
    }

    const updatedAdmin = await Users.findOneAndUpdate(
      { _id: req.body.id },
      {
        firstName: req.body.firstName.trim(),
        lastName: req.body.lastName.trim(),
        email: req.body.email.trim(),
      },
      { new: true }
    );

    res.status(200).send({ message: "success", data: updatedAdmin });
  } catch (error) {
    res.status(500).send({ message: error.message || "something went wrong" });
  }
};
