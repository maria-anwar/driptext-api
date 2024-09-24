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
      .populate({ path: "project", populate: "plan" })
      .populate({ path: "user", match: { isActive: "Y" } });

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
    // "user", "plan", "projectTasks", "boardingInfo";
    const project = await Projects.findOne({
      _id: req.body.projectId,
    }).populate([
      { path: "user" },
      { path: "plan" },
      {
        path: "projectTasks",
        match: { published: true },
        populate: { path: "onBoarding" },
      },
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

exports.addTask = async (req, res) => {
  console.log("on boarding api called ... !!");
  if (!req.role || req.role.toLowerCase() !== "projectmanger") {
    res.status(401).send({ message: "Your are not admin" });
    return;
  }
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const joiSchema = Joi.object({
      dueDate: Joi.date().required(),
      topic: Joi.string().required(),
      keyword: Joi.string().required(),
      keywordType: Joi.string().required(),
      // wordCount: Joi.number().required(),
      comment: Joi.string().optional().allow("").allow(null),
      projectName: Joi.string().required(),
      projectId: Joi.string().required(),
      userId: Joi.string().required(),
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
    } else {
      const userId = req.body.userId ? req.body.userId : null;
      const projectId = req.body.projectId;
      const projectName = req.body.projectName.trim();
      // const speech = req.body.speech.trim();
      // const prespective = req.body.prespective.trim();

      let companyInfoObj = {
        companyBackgorund: req.body.companyBackgorund,
        companyAttributes: req.body.companyAttributes,
        comapnyServices: req.body.comapnyServices,
        customerContent: req.body.customerContent,
        customerIntrest: req.body.customerIntrest,
        contentPurpose: req.body.contentPurpose,
        contentInfo: req.body.contentInfo,
      };

      var whereClause;
      if (userId) {
        whereClause = {
          _id: userId,
          isActive: "Y",
        };
      }
      let getuser = await Users.findOne(whereClause).populate({
        path: "role",
        select: "title",
      });
      if (getuser) {
        var role = getuser.role;
        var project = await Projects.findOne({
          _id: projectId,
          user: userId,
        });
        if (project) {
          var project = await Projects.findOne({
            _id: projectId,
            user: userId,
          })
            .populate({
              path: "user",
              select: "email role",
              populate: { path: "role", select: "title" },
            })
            .select("id projectName keywords folderId");

          if (getuser && project) {
            if (
              (role.title == "leads" || role.title == "Leads") &&
              project.projectName == projectName
            ) {
              let taskCount = await ProjectTask.countDocuments({
                project: projectId,
              });
              if (taskCount == 0) {
                let projectStatus;
                let taskStatus;
                // if (speech !== "" && prespective !== "") {
                projectStatus = "Free Trial";
                taskStatus = "Ready to Start";
                // }

                let createCompany = await Company.create({
                  ...companyInfoObj,
                  user: project.user._id,
                });

                let proectTaskObj = {
                  keywords: req.body.keyword,
                  type: req.body.keywordType,
                  dueDate: req.body.dueDate,
                  topic: req.body.topic,
                  comments: req.body.comment,
                  project: project._id,
                  desiredNumberOfWords: "1500",
                  status: taskStatus,
                  user: userId,
                  onBoarding: createCompany._id,
                  published: true,
                  //   tasks: taskCount,
                };

                let upadteProject = await Projects.findOneAndUpdate(
                  { _id: project._id },
                  {
                    // speech: speech,
                    // prespective: prespective,
                    // projectStatus: projectStatus,
                    onBoarding: true,
                    // boardingInfo: newOnBoarding._id,
                    // duration: "1",
                    // numberOfTasks: "1",
                    tasks: 1,
                  },
                  { new: true }
                );

                let createProjectTask = await ProjectTask.create(proectTaskObj);
                const totalFiles = await getFileCount(project.folderId);
                const fileName = `${project.id}-${totalFiles + 1}-${
                  createProjectTask.keywords || "No Keywords"
                }`;
                const fileObj = await createTaskFile(
                  project.folderId,
                  fileName
                );
                console.log("after creating file");
                const updateProjectTask = await ProjectTask.findOneAndUpdate(
                  { _id: createProjectTask._id },
                  {
                    fileLink: fileObj.fileLink,
                    fileId: fileObj.fileId,
                    taskName: fileName,
                  },
                  { new: true }
                );
                await Projects.findByIdAndUpdate(
                  projectId,
                  { $push: { projectTasks: createProjectTask._id } },
                  { new: true }
                );

                const updatedUserPlan = await UserPlan.findOneAndUpdate(
                  { user: project.user._id, project: project._id },
                  {
                    $inc: {
                      textsCount: 1,
                      textsRemaining: -1,
                      tasksPerMonthCount: 1,
                    },
                  },
                  { new: true }
                );

                let nameChar = upadteProject.projectName
                  .slice(0, 2)
                  .toUpperCase();
                let idChar = createProjectTask._id.toString().slice(-4);
                let taskId = nameChar + "-" + idChar;

                let updateTaskId = await ProjectTask.findByIdAndUpdate(
                  { _id: createProjectTask._id },
                  { taskName: taskId },
                  { new: true }
                );

                if (upadteProject && createProjectTask) {
                  await session.commitTransaction();
                  session.endSession();
                  await emails.onBoadingSuccess(getuser);

                  res.send({
                    message: "OnBoarding successful",
                    data: createProjectTask,
                  });
                }
              } else {
                res
                  .status(403)
                  .send({ message: "As free trial gives only 1 task" });

                return;
              }
            } else if (
              (role.title == "leads" || role.title == "Leads") &&
              project.projectName !== projectName
            ) {
              res.status(403).send({
                message:
                  "This user is in Leads Role so you can not onboard another project/task",
              });
              return;
            } else if (
              role.title == "Client" &&
              project.projectName == projectName
            ) {
              let taskCount = await ProjectTask.countDocuments({
                project: project._id,
              });

              let userPlan = await UserPlan.findOne({
                user: userId,
                project: projectId,
              }).populate("plan");

              console.log("user plan: ", userPlan);

              if (!userPlan.subscription) {
                res
                  .status(500)
                  .send({ message: "User don't have subscription" });
                return;
              }

              if (
                dayjs(new Date()).isAfter(
                  dayjs(userPlan.endMonthDate, "day")
                ) ||
                userPlan.tasksPerMonthCount === userPlan.tasksPerMonth
              ) {
                res
                  .status(500)
                  .send({ message: "This user have reached monthly limit" });

                return;
              }
              if (userPlan.textsRemaining === 0) {
                res
                  .status(500)
                  .send({ message: "This user's subscription is expired" });
                return;
              }
              if (dayjs(new Date()).isAfter(dayjs(userPlan.endDate, "day"))) {
                res
                  .status(500)
                  .send({ message: "This user's subscription is expired" });
                return;
              }

              // if (taskCount <= userPlan.plan.texts - 1) {
              let projectStatus;
              let taskStatus;
              // if (speech !== "" && prespective !== "") {
              //   projectStatus = "Ready";
              // }

              let createCompany = await Company.create({
                ...companyInfoObj,
                user: project.user._id,
              });

              let proectTaskObj = {
                keywords: req.body.keyword,
                type: req.body.keywordType,
                dueDate: req.body.dueDate,
                topic: req.body.topic,
                comments: req.body.comment,
                desiredNumberOfWords: userPlan.plan.desiredWords,
                project: project._id,
                user: userId,
                onBoarding: createCompany._id,
                published: true,
              };

              let createProjectTask = await ProjectTask.create(proectTaskObj);
              const totalFiles = await getFileCount(project.folderId);
              const fileName = `${project.id}-${totalFiles + 1}-${
                createProjectTask.keywords || "No Keywords"
              }`;
              const fileObj = await createTaskFile(project.folderId, fileName);
              console.log("after creating file");
              const updateProjectTask = await ProjectTask.findOneAndUpdate(
                { _id: createProjectTask._id },
                {
                  fileLink: fileObj.fileLink,
                  fileId: fileObj.fileId,
                  taskName: fileName,
                },
                { new: true }
              );
              let upadteProject = await Projects.findOneAndUpdate(
                { _id: project._id },
                {
                  // speech: speech,
                  // prespective: prespective,
                  onBoarding: true,
                  // boardingInfo: newOnBoarding._id,
                  // duration: userPlan.subPlan.duration,
                  // numberOfTasks: userPlan.plan.texts,
                  // projectStatus: projectStatus,
                  tasks: taskCount + 1,
                },
                { new: true }
              );
              await Projects.findByIdAndUpdate(
                projectId,
                { $push: { projectTasks: createProjectTask._id } },
                { new: true }
              );

              await UserPlan.findOneAndUpdate(
                { user: project.user._id, project: project._id },
                {
                  $inc: {
                    textsCount: 1,
                    textsRemaining: -1,
                    tasksPerMonthCount: 1,
                  },
                },
                { new: true }
              );

              let nameChar = upadteProject.projectName
                .slice(0, 2)
                .toUpperCase();
              let idChar = createProjectTask._id.toString().slice(-4);
              let taskId = nameChar + "-" + idChar;

              let updateTaskId = await ProjectTask.findByIdAndUpdate(
                { _id: createProjectTask._id },
                { taskName: taskId },
                { new: true }
              );

              if (upadteProject && createProjectTask) {
                await session.commitTransaction();
                session.endSession();
                await emails.onBoadingSuccess(getuser);

                res.send({
                  message: "OnBoarding successful",
                  data: createProjectTask,
                });
              }
              // } else {
              //   res.status(403).send({
              //     message:
              //       "You cannot create more Tasks because you have reached subscription limit.",
              //   });
              // }
            } else {
              res.status(403).send({
                message: "Project not found!",
              });
              return;
            }
          } else if (role && role.title == "leads") {
            await session.commitTransaction();
            session.endSession();
            res
              .status(403)
              .send({ message: "As free trial gives only 1 task" });
            return;
          } else {
            await session.commitTransaction();
            session.endSession();
            res.status(401).send({ message: "User not found!" });
            return;
          }
        } else {
          res.status(404).send({ message: "Project not found!" });
          return;
        }
      } else {
        await session.commitTransaction();
        session.endSession();
        res.status(401).send({ message: "User not found!" });
        return;
      }
    }
  } catch (err) {
    // emails.errorEmail(req, err);
    await session.abortTransaction();
    session.endSession();
    res.status(500).send({
      message: err.message || "Some error occurred.",
    });
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
    }

    // Lector
    if (req.body.role.toLowerCase() === "lector") {
      const updatedTask = await ProjectTask.findOneAndUpdate(
        { _id: req.body.taskId },
        { lector: req.body.freelancerId },
        { new: true }
      );
    }

    // SEO-Optimizer
    if (req.body.role.toLowerCase() === "seo-optimizer") {
      const updatedTask = await ProjectTask.findOneAndUpdate(
        { _id: req.body.taskId },
        { seo: req.body.freelancerId },
        { new: true }
      );
    }
    res.status(200).send({ message: "success" });
  } catch (error) {
    res.status(500).send({ message: error.message || "Something went wrong" });
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

exports.projectTasksExport = async (req, res) => {
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
    }).populate({
      path: "projectTasks",
      match: { published: true },
      populate: {
        path: "onBoarding",
        model: "Company",
      },
    });
    if (!project) {
      res.status(500).send({ message: "project not found" });
      return;
    }

    // Specify the parent folder ID (where the new folder will be created)
    const parentFolderId = project.folderId;

    // Create a new folder in the specified parent folder
    const newFolderId = await findOrCreateFolderInParent(
      parentFolderId,
      "Task Export Links"
    );

    // Create a Google Sheet inside the newly created folder and get the export URL
    const { exportUrl } = await exportTasksToSheetInFolder(
      project.projectTasks,
      newFolderId
    );

    // Send the export URL to the frontend for download
    res.status(200).send({ exportUrl });
  } catch (error) {
    res.status(500).send({ message: error.message || "Something went wrong" });
  }
};

exports.importProjectTasks = async (req, res) => {
  try {
    if (!req.role || req.role.toLowerCase() !== "projectmanger") {
      res.status(401).send({ message: "You are not authorized" });
      return;
    }

    const editTask = async (user, project, task, orgTask) => {
      console.log("task onBoarding: ", task)
      const updatedTask = await projectTasks.findOneAndUpdate(
        { _id: orgTask._id },
        {
          keywords: task.keywords,
          dueDate: task.dueDate,
          topic: task.topic,
          type: task.type,
        },
        { new: true }
      );
      const updatedOnBoarding = await Company.findOneAndUpdate(
        { _id: orgTask.onBoarding._id },
        {
          companyBackgorund: task.companyBackground,
          companyAttributes: task.companyAttributes,
          comapnyServices: task.companyServices,
          customerContent: task.customerContent,
          customerIntrest: task.customerInterest,
          contentPurpose: task.contentPurpose,
          contentInfo: task.ContentInfo,
        },
        { new: true }
      );
    }

    const importTasks = async (user, project, task) => {
      try {
        console.log("task inside import tasks: ", task);
        let error = "";
        let role = user.role;
        let companyInfoObj = {
          companyBackgorund: task.companyBackground,
          companyAttributes: task.companyAttributes,
          comapnyServices: task.companyServices,
          customerContent: task.customerContent,
          customerIntrest: task.customerInterest,
          contentPurpose: task.contentPurpose,
          contentInfo: task.ContentInfo,
        };
        if (role.title == "leads" || role.title == "Leads") {
          let taskCount = await ProjectTask.countDocuments({
            project: project._id,
          });
          if (taskCount == 0) {
            let projectStatus;
            let taskStatus;
            // if (speech !== "" && prespective !== "") {
            projectStatus = "Free Trial";
            taskStatus = "Ready to Start";
            // }

            let createCompany = await Company.create({
              ...companyInfoObj,
              user: project.user._id,
            });

            let proectTaskObj = {
              keywords: task.keywords,
              dueDate: task.dueDate,
              topic: task.topic,
              type: task.type,
              published: true,
              project: project._id,
              desiredNumberOfWords: "1500",
              status: taskStatus,
              user: user._id,
              onBoarding: createCompany._id,
              //   tasks: taskCount,
            };

            let upadteProject = await Projects.findOneAndUpdate(
              { _id: project._id },
              {
                // speech: speech,
                // prespective: prespective,
                projectStatus: projectStatus,
                onBoarding: true,
                // boardingInfo: newOnBoarding._id,
                // duration: "1",
                // numberOfTasks: "1",
                tasks: 1,
              },
              { new: true }
            );

            let createProjectTask = await ProjectTask.create(proectTaskObj);
            console.log("before creating file");
            const totalFiles = await getFileCount(project.folderId);
            const fileName = `${project.projectId}-${totalFiles + 1}-${
              createProjectTask.keywords || "No Keywords"
            }`;
            const fileObj = await createTaskFile(project.folderId, fileName);
            console.log("after creating file");
            // const updateProjectTask = await ProjectTask.findOneAndUpdate(
            //   { _id: createProjectTask._id },
            //   {
            //     fileLink: fileObj.fileLink,
            //     fileId: fileObj.fileId,
            //     taskName: fileName,
            //   },
            //   { new: true }
            // );
            await Projects.findByIdAndUpdate(
              project._id,
              { $push: { projectTasks: createProjectTask._id } },
              { new: true }
            );

            const updatedUserPlan = await UserPlan.findOneAndUpdate(
              { user: project.user._id, project: project._id },
              {
                $inc: {
                  textsCount: 1,
                  textsRemaining: -1,
                  tasksPerMonthCount: 1,
                },
              },
              { new: true }
            );

            let nameChar = upadteProject.projectName.slice(0, 2).toUpperCase();
            let idChar = createProjectTask._id.toString().slice(-4);
            let taskId = nameChar + "-" + idChar;

            let updateTaskId = await ProjectTask.findByIdAndUpdate(
              { _id: createProjectTask._id },
              {
                taskName: taskId,
                fileLink: fileObj.fileLink,
                fileId: fileObj.fileId,
              },
              { new: true }
            );

            if (upadteProject && createProjectTask) {
              // await session.commitTransaction();
              // session.endSession();
              await emails.onBoadingSuccess(getuser);

              // res.send({
              //   message: "OnBoarding successful",
              //   data: createProjectTask,
              // });
            }
          } else {
            // error = "As free trial gives only 1 task";
            res
              .status(403)
              .send({ message: "As free trial gives only 1 task" });

            return;
          }
        } else if (
          role.title == "Client" &&
          project.projectName == projectName
        ) {
          let taskCount = await ProjectTask.countDocuments({
            project: project._id,
          });

          let userPlan = await UserPlan.findOne({
            user: user._id,
            project: project._id,
          }).populate("plan");

          // console.log("user plan: ", userPlan);

          if (!userPlan.subscription) {
            // error = "Client don't have subscription";
            res.status(500).send({ message: "Client don't have subscription" });
            return;
          }

          if (
            dayjs(new Date()).isAfter(dayjs(userPlan.endMonthDate, "day")) ||
            userPlan.tasksPerMonthCount === userPlan.tasksPerMonth
          ) {
            // error = "Client have reached monthly limit";
            res
              .status(500)
              .send({ message: "Client have reached monthly limit" });

            return;
          }
          if (userPlan.textsRemaining === 0) {
            // error = "Client's subscription is expired";
            res
              .status(500)
              .send({ message: "Client's subscription is expired" });
            return;
          }
          if (dayjs(new Date()).isAfter(dayjs(userPlan.endDate, "day"))) {
            // error = "Client's subscription is expired";
            res
              .status(500)
              .send({ message: "Client's subscription is expired" });
            return;
          }

          // if (taskCount <= userPlan.plan.texts - 1) {
          let projectStatus;
          let taskStatus;
          if (speech !== "" && prespective !== "") {
            projectStatus = "Ready";
          }

          let createCompany = await Company.create({
            ...companyInfoObj,
            user: project.user._id,
          });

          let proectTaskObj = {
            keywords: task.keywords,
            dueDate: task.dueDate,
            topic: task.topic,
            type: task.type,
            published: true,
            desiredNumberOfWords: userPlan.plan.desiredWords,
            project: project._id,
            user: user._id,
            onBoarding: createCompany._id,
          };

          let createProjectTask = await ProjectTask.create(proectTaskObj);
          console.log("before creating file");
          const totalFiles = await getFileCount(project.folderId);
          const fileName = `${project.projectId}-${totalFiles + 1}-${
            createProjectTask.keywords || "No Keywords"
          }`;
          const fileObj = await createTaskFile(project.folderId, fileName);
          // const updateProjectTask = await ProjectTask.findOneAndUpdate(
          //   { _id: createProjectTask._id },
          //   {
          //     fileLink: fileObj.fileLink,
          //     fileId: fileObj.fileId,
          //     tasktName: fileName,
          //   },
          //   { new: true }
          // );
          console.log("after creating file");
          let upadteProject = await Projects.findOneAndUpdate(
            { _id: project._id },
            {
              // speech: speech,
              // prespective: prespective,
              onBoarding: true,
              // boardingInfo: newOnBoarding._id,
              // duration: userPlan.subPlan.duration,
              // numberOfTasks: userPlan.plan.texts,
              projectStatus: projectStatus,
              tasks: taskCount + 1,
            },
            { new: true }
          );
          await Projects.findByIdAndUpdate(
            projectId,
            { $push: { projectTasks: createProjectTask._id } },
            { new: true }
          );

          await UserPlan.findOneAndUpdate(
            { user: project.user._id, project: project._id },
            {
              $inc: {
                textsCount: 1,
                textsRemaining: -1,
                tasksPerMonthCount: 1,
              },
            },
            { new: true }
          );

          let nameChar = upadteProject.projectName.slice(0, 2).toUpperCase();
          let idChar = createProjectTask._id.toString().slice(-4);
          let taskId = nameChar + "-" + idChar;

          let updateTaskId = await ProjectTask.findByIdAndUpdate(
            { _id: createProjectTask._id },
            {
              taskName: taskId,
              fileLink: fileObj.fileLink,
              fileId: fileObj.fileId,
            },
            { new: true }
          );

          if (upadteProject && createProjectTask) {
            // await session.commitTransaction();
            // session.endSession();
            await emails.onBoadingSuccess(getuser);

            // res.send({
            //   message: "OnBoarding successful",
            //   data: createProjectTask,
            // });
          }
          // } else {
          //   res.status(403).send({
          //     message:
          //       "You cannot create more Tasks because you have reached subscription limit.",
          //   });
          // }
        } else {
          // error = "Project not found!";
          res.status(403).send({
            message: "Project not found!",
          });
          return;
        }
      } catch (error) {
        res
          .status(500)
          .send({ message: error.message || "Something went wrong" });
        return;
      }
    };

    const joiSchema = Joi.object({
      projectId: Joi.string().required(),
    });

    const { error, value } = joiSchema.validate(req.body);
    if (error) {
      const message = error.details[0].message.replace(/"/g, "");
      res.status(400).send({ message });
      return;
    }

    // Check if a file was uploaded
    if (!req.file) {
      return res.status(400).send({ message: "No file uploaded" });
    }

    const project = await Projects.findOne({ _id: req.body.projectId });
    if (!project) {
      res.status(404).send({ message: "Project not found" });
      return;
    }

    const user = await Users.findOne({ _id: project.user }).populate({
      path: "role",
      select: "title",
    });

    if (!user) {
      res.status(500).send({ message: "User does not exists" });
      return;
    }

    const filePath = req.file.path;
    console.log("file path: ", filePath);
    const tasks = [];
    let checkCSVError = "";

    // Parse the CSV file and extract task data
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on("data", (row) => {
        // Assuming the CSV has 'name', 'description', and 'status' columns
        console.log("row: ", row);
        if (
          !row["Company Background"] ||
          !row["Company Attributes"] ||
          !row["Company Services"] ||
          !row["Customer Content"] ||
          !row["Customer Interest"] ||
          !row["Content Purpose"] ||
          !row["Content Info"]
        ) {
          checkCSVError =
            "Please make sure you have complete onBoarding details of each task (Company Background, Company Attributes, Company Services, Customer Content, Customer Interest, Content Purpose, Content Info)";
          return;
        }

        if (!row["Keywords"]) {
          checkCSVError = "Keywords required for each task in csv file";
          return;
        }

        if (!row["Due Date"] || !dayjs(row["Due Date"]).isValid()) {
          checkCSVError = `Make sure due date is given and is valid date YYYY-MM-DD`;
          return;
        }
        const task = {
          keywords: row["Keywords"],
          dueDate: dayjs(row["Due Date"]).toDate(),
          topic: row["Topic"],
          type: row["Type"],
          companyBackground: row["Company Background"],
          companyAttributes: row["Company Attributes"],
          companyServices: row["Company Services"],
          customerContent: row["Customer Content"],
          customerInterest: row["Customer Interest"],
          contentPurpose: row["Content Purpose"],
          contentInfo: row["Content Info"],
        };
        tasks.push(task);
      })
      .on("end", async () => {
        try {
          if (checkCSVError) {
            res.status(500).send({ message: checkCSVError });
            return;
          }

          const allTasks = await projectTasks
            .find({ project: project._id, published: true })
            .populate("onBoarding");

          if (!allTasks) {
            res.status(500).send({ message: "Could not get project tasks" });
            return;
          }
          console.log("all tasks length: ", allTasks.length);
          let responseSent = false;
          if (allTasks.length > 0) {
            for (const importTask of tasks) {
              for (const orgTask of allTasks) {
                if (importTask.keywords.toLowerCase().trim() === orgTask.keywords.toLowerCase().trim()) {
                  await editTask(user, project, importTask, orgTask, res)
                  if (res.headersSent) {
                    responseSent = true;
                    break; // Exit the loop once a response is sent
                  }

                } else {
                  await importTasks(user, project, importTask, res);

                  if (res.headersSent) {
                    responseSent = true;
                    break; // Exit the loop once a response is sent
                  }
                }
              }

              if (responseSent) {
                break; // Exit outer loop if the response is already sent
              }
            }
          }

          if (allTasks.length === 0) {
            console.log("inside 0 length if");
            for (const importTask of tasks) {
              await importTasks(user, project, importTask, res);

              if (res.headersSent) {
                responseSent = true;
                break; // Exit the loop once a response is sent
              }

              if (responseSent) {
                break; // Exit outer loop if the response is already sent
              }
            }
          }

          // if (allTasks.length === 0) {
          //   tasks.forEach( async (importTask) => {
          //     await importTasks(user, project, importTask);
          //   });
          // }

          // // Bulk add the tasks to the project
          // project.projectTasks.push(...tasks);
          // await project.save();

          // // Delete the uploaded CSV file after processing
          // fs.unlinkSync(filePath);

          if (!responseSent) {
            res.status(200).send({
              message: "Tasks imported successfully",
              // tasks,
            });
          }
        } catch (error) {
          console.error("Error saving tasks:", error);
          res.status(500).send({ message: "Failed to save tasks" });
        }
      })
      .on("error", (error) => {
        console.error("Error parsing CSV file:", error);
        res.status(500).send({ message: "Error parsing CSV file" });
      });
  } catch (error) {
    res.status(500).send({ message: error.message || "Something went wrong" });
  }
};
