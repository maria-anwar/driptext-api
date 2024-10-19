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

exports.addTask = async (req, res) => {
  //console.log("on boarding api called ... !!");
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
      wordCount: Joi.number().required(),
      comment: Joi.string().optional().allow("").allow(null),
      projectName: Joi.string().required(),
      projectId: Joi.string().required(),
      userId: Joi.string().required(),
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

      //   let companyInfoObj = {
      //     companyBackgorund: req.body.companyBackgorund,
      //     companyAttributes: req.body.companyAttributes,
      //     comapnyServices: req.body.comapnyServices,
      //     customerContent: req.body.customerContent,
      //     customerIntrest: req.body.customerIntrest,
      //     contentPurpose: req.body.contentPurpose,
      //     contentInfo: req.body.contentInfo,
      //   };

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
            .select("id projectName keywords folderId projectStatus");

          if (getuser && project) {
            if (
              role.title == "leads" ||
              role.title == "Leads" ||
              project.projectStatus.toLowerCase() === "free trial"
            ) {
              let taskCount = await ProjectTask.countDocuments({
                project: projectId,
              });
              if (taskCount === 0) {
                let projectStatus;
                let taskStatus = "Uninitialized";
                // if (speech !== "" && prespective !== "") {
                // projectStatus = "Free Trial";
                // taskStatus = "Ready to Start";
                // }

                // let createCompany = await Company.create({
                //   ...companyInfoObj,
                //   user: project.user._id,
                // });

                let proectTaskObj = {
                  keywords: req.body.keyword,
                  type: req.body.keywordType,
                  dueDate: req.body.dueDate,
                  topic: req.body.topic,
                  comments: req.body.comment,
                  project: project._id,
                  desiredNumberOfWords: req.body.wordCount,
                  //   status: taskStatus,
                  user: userId,
                  //   onBoarding: createCompany._id,
                  published: true,
                  metaLector: project.metaLector,
                  //   tasks: taskCount,
                };

                let upadteProject = await Projects.findOneAndUpdate(
                  { _id: project._id },
                  {
                    // speech: speech,
                    // prespective: prespective,
                    // projectStatus: projectStatus,
                    // onBoarding: true,
                    // boardingInfo: newOnBoarding._id,
                    // duration: "1",
                    // numberOfTasks: "1",
                    openTasks: 1,
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
                //console.log("after creating file");
                if (
                  createProjectTask.keywords &&
                  createProjectTask.type &&
                  createProjectTask.topic &&
                  createProjectTask.dueDate
                ) {
                  taskStatus = "Ready To Work";
                }
                const updateProjectTask = await ProjectTask.findOneAndUpdate(
                  { _id: createProjectTask._id },
                  {
                    status: taskStatus,
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
            } else if (role.title == "Client") {
              let taskCount = await ProjectTask.countDocuments({
                project: project._id,
              });

              let userPlan = await UserPlan.findOne({
                user: userId,
                project: projectId,
              }).populate("plan");

              //console.log("user plan: ", userPlan);

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
                userPlan.tasksPerMonthCount >= userPlan.tasksPerMonth
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
              let taskStatus = "Uninitialized";
              // if (speech !== "" && prespective !== "") {
              //   projectStatus = "Ready";
              // }

              //   let createCompany = await Company.create({
              //     ...companyInfoObj,
              //     user: project.user._id,
              //   });

              let proectTaskObj = {
                keywords: req.body.keyword,
                type: req.body.keywordType,
                dueDate: req.body.dueDate,
                topic: req.body.topic,
                comments: req.body.comment,
                desiredNumberOfWords: req.body.wordCount,
                project: project._id,
                user: userId,
                // onBoarding: createCompany._id,
                published: true,
                ...(taskCount % 9 === 0 && {
                  metaLector: project.metaLector,
                }),
              };

              let createProjectTask = await ProjectTask.create(proectTaskObj);
              const totalFiles = await getFileCount(project.folderId);
              const fileName = `${project.id}-${totalFiles + 1}-${
                createProjectTask.keywords || "No Keywords"
              }`;
              const fileObj = await createTaskFile(project.folderId, fileName);
              //console.log("after creating file");
              if (
                createProjectTask.keywords &&
                createProjectTask.type &&
                createProjectTask.topic &&
                createProjectTask.dueDate
              ) {
                taskStatus = "Ready To Work";
              }
              const updateProjectTask = await ProjectTask.findOneAndUpdate(
                { _id: createProjectTask._id },
                {
                  status: taskStatus,
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
                  //   onBoarding: true,
                  // boardingInfo: newOnBoarding._id,
                  // duration: userPlan.subPlan.duration,
                  // numberOfTasks: userPlan.plan.texts,
                  // projectStatus: projectStatus,
                  $inc: { openTasks: 1 },
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

exports.editTask = async (req, res) => {
  try {
    if (!req.role || req.role.toLowerCase() !== "projectmanger") {
      res.status(401).send({ message: "Your are not admin" });
      return;
    }
    const joiSchema = Joi.object({
      taskId: Joi.string().required(),
      dueDate: Joi.date().required(),
      topic: Joi.string().required(),
      keyword: Joi.string().required(),
      wordCount: Joi.number().required(),
      keywordType: Joi.string().required(),
      comment: Joi.string().optional().allow("").allow(null),
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
    const task = await projectTasks.findOneAndUpdate(
      { _id: req.body.taskId },
      {
        dueDate: req.body.dueDate,
        topic: req.body.topic,
        keywords: req.body.keyword,
        desiredNumberOfWords: req.body.wordCount,
        type: req.body.keywordType,
        comments: req.body.comment,
      },
      { new: true }
    );

    res.status(200).json({ message: "success" });
  } catch (error) {
    res.status(500).json({ message: error?.message || "Something went wrong" });
  }
};

exports.wordCountTask = async (req, res) => {
  try {
    if (!req.role || req.role.toLowerCase() !== "projectmanger") {
      res.status(401).send({ message: "Your are not admin" });
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
    const task = await projectTasks.findOne({ _id: req.body.taskId });
    if (!task) {
      res.status(404).send({ message: "Task not found" });
    }
    const wordCount = await getWordCount(task.fileId);
    await projectTasks.findOneAndUpdate(
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
    }).populate(["projectTasks", "onBoardingInfo"]);
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
  res.setTimeout(600000, async () => {
    try {
      console.log("inside project import tasks api ....");

      // Check if user is project manager
      if (!req.role || req.role.toLowerCase() !== "projectmanager") {
        return res.status(401).send({ message: "You are not authorized" });
      }

      // Validate request body
      const joiSchema = Joi.object({
        projectId: Joi.string().required(),
      });
      const { error, value } = joiSchema.validate(req.body);
      if (error) {
        const message = error.details[0].message.replace(/"/g, "");
        return res.status(400).send({ message });
      }

      // Check if a file was uploaded
      if (!req.file) {
        return res.status(400).send({ message: "No file uploaded" });
      }

      // Find project
      const project = await Projects.findOne({ _id: req.body.projectId });
      if (!project) {
        return res.status(404).send({ message: "Project not found" });
      }

      // Find user associated with project
      const user = await Users.findOne({ _id: project.user }).populate({
        path: "role",
        select: "title",
      });
      if (!user) {
        return res.status(500).send({ message: "User does not exist" });
      }

      const filePath = req.file.path;

      // Helper function to handle task creation
      const createOrUpdateTask = async (task, project, user, isFreeTrial) => {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
          const taskCount = await ProjectTask.countDocuments({
            project: project._id,
          });

          // Free Trial Restriction
          if (isFreeTrial && taskCount > 0) {
            await session.abortTransaction();
            return { status: 403, message: "As free trial gives only 1 task" };
          }

          let taskObj = {
            keywords: task.keywords,
            dueDate: task.dueDate,
            topic: task.topic,
            type: task.type,
            status: "Ready To Work",
            published: true,
            desiredNumberOfWords: task.wordCount,
            project: project._id,
            user: user._id,
          };

          // Create Project Task
          const createdTask = await ProjectTask.create(taskObj);

          // Update Project Information
          await Projects.findByIdAndUpdate(
            project._id,
            {
              $push: { projectTasks: createdTask._id },
              $inc: { openTasks: 1 },
            },
            { new: true }
          );

          // Commit transaction
          await session.commitTransaction();
          session.endSession();

          return { status: 200, data: createdTask };
        } catch (error) {
          await session.abortTransaction();
          session.endSession();
          return { status: 500, message: error.message };
        }
      };

      // Logic for free trial or client
      if (
        user.role.title.toLowerCase() === "leads" ||
        project.projectStatus.toLowerCase() === "free trial"
      ) {
        const result = await createOrUpdateTask(task, project, user, true);
        return res
          .status(result.status)
          .send({ message: result.message, data: result.data });
      } else if (user.role.title.toLowerCase() === "client") {
        // Handle client subscription logic here
        const result = await createOrUpdateTask(task, project, user, false);
        return res
          .status(result.status)
          .send({ message: result.message, data: result.data });
      } else {
        return res.status(403).send({ message: "Project not found!" });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).send({ message: "Something went wrong" });
    }
  });
};


exports.getAllTasks = async (req, res) => {
  try {
    if (!req.role || req.role.toLowerCase() !== "projectmanger") {
      res.status(401).send({ message: "Your are not admin" });
      return;
    }

    const allTasks = await projectTasks.find({ isActive: "Y" });

    res.status(200).send({ message: "success", data: allTasks });
  } catch (error) {
    res.status(500).send({ message: error.message || "Something went wrong" });
  }
};

exports.getTaskDetail = async (req, res) => {
  try {
    if (!req.role || req.role.toLowerCase() !== "projectmanger") {
      res.status(401).send({ message: "Your are not admin" });
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

    const task = await projectTasks
      .findOne({ _id: req.body.taskId })
      .populate(["user", "project", "texter", "lector", "seo", "metaLector"]);

    res.status(200).send({ message: "Success", data: task });
  } catch (error) {
    res.status(500).send({ message: error.message || "Something went wrong" });
  }
};
