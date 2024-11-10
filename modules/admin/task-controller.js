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
const {
  createFolder,
  createTaskFile,
  getFileCount,
  findOrCreateFolderInParent,
  exportTasksToSheetInFolder,
  getWordCount,
} = require("../../utils/googleService/actions");
const { getTaskCounter } = require("../../utils/counter/counter");

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
            .select(
              "id projectName keywords folderId projectStatus metaLector projectId"
            );

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
                const freelancer = await Freelancers.findOne({
                  _id: project.metaLector,
                });
                if (freelancer) {
                  freelancerEmails.taskAssign(
                    freelancer.email,
                    {
                      name: createProjectTask.taskName,
                      keyword: createProjectTask.keywords,
                    },
                    "Meta Lector"
                  );
                }
                const totalFiles = await getFileCount(project.folderId);
                const fileName = `${project.projectId}-${totalFiles + 1}-${
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
                const taskCounter = await getTaskCounter()
                let taskId = `${project.projectId}-${taskCounter?.seq}`;

                let updateTaskId = await ProjectTask.findByIdAndUpdate(
                  { _id: createProjectTask._id },
                  { taskName: taskId },
                  { new: true }
                );

                if (upadteProject && createProjectTask) {
                  await session.commitTransaction();
                  session.endSession();
                  // await emails.onBoadingSuccess(getuser);
                  if (updateProjectTask.texter) {
                    const taskTexter = await Freelancers.findOne({
                      _id: updateProjectTask.texter,
                    });
                    if (taskTexter) {
                      freelancerEmails.reminder24Hours(
                        taskTexter.email,
                        {
                          name: updateProjectTask.taskName,
                          keyword: updateProjectTask.keywords,
                          documentLink: updateProjectTask.fileLink,
                        },
                        "Texter"
                      );
                    }
                  }

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
                dueDate: dayjs(req.body.dueDate).startOf("day"),
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
              if (taskCount % 9 === 0) {
                const freelancer = await Freelancers.findOne({
                  _id: project.metaLector,
                });
                if (freelancer) {
                  freelancerEmails.taskAssign(
                    freelancer.email,
                    {
                      name: createProjectTask.taskName,
                      keyword: createProjectTask.keywords,
                    },
                    "Meta Lector"
                  );
                }
              }
              const totalFiles = await getFileCount(project.folderId);
              const fileName = `${project.projectId}-${totalFiles + 1}-${
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
              const taskCounter = await getTaskCounter();
              let taskId = `${project.projectId}-${taskCounter?.seq}`;

              let updateTaskId = await ProjectTask.findByIdAndUpdate(
                { _id: createProjectTask._id },
                { taskName: taskId },
                { new: true }
              );

              if (upadteProject && createProjectTask) {
                await session.commitTransaction();
                session.endSession();
                // await emails.onBoadingSuccess(getuser);
                if (updateProjectTask.texter) {
                  const taskTexter = await Freelancers.findOne({
                    _id: updateProjectTask.texter,
                  });
                  if (taskTexter) {
                    freelancerEmails.reminder24Hours(
                      taskTexter.email,
                      {
                        name: updateProjectTask.taskName,
                        keyword: updateProjectTask.keywords,
                        documentLink: updateProjectTask.fileLink,
                      },
                      "Texter"
                    );
                  }
                }

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
        dueDate: dayjs(req.body.dueDate).startOf("day"),
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
  try {
    console.log("inside project import tasks api ....");
    if (!req.role || req.role.toLowerCase() !== "projectmanger") {
      res.status(401).send({ message: "You are not authorized" });
      return;
    }

    const editTask = async (user, project, task, orgTask, res) => {
      //   //console.log("task onBoarding: ", task);
      const updatedTask = await projectTasks.findOneAndUpdate(
        { _id: orgTask._id },
        {
          // keywords: task.keywords,
          dueDate: task.dueDate,
          topic: task.topic,
          type: task.type,
          desiredNumberOfWords: task.wordCount,
          status: "Ready To Work",
        },
        { new: true }
      );
    };

    const importTasks = async (user, project, task, res) => {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        console.log("task inside import tasks: ");
        let error = "";
        let role = user.role;
        // let companyInfoObj = {
        //   companyBackgorund: task.companyBackground,
        //   companyAttributes: task.companyAttributes,
        //   comapnyServices: task.companyServices,
        //   customerContent: task.customerContent,
        //   customerIntrest: task.customerInterest,
        //   contentPurpose: task.contentPurpose,
        //   contentInfo: task.ContentInfo,
        // };
        if (
          role.title == "leads" ||
          role.title == "Leads" ||
          project.projectStatus.toLowerCase() === "free trial"
        ) {
          let taskCount = await ProjectTask.countDocuments({
            project: project._id,
          });
          if (taskCount == 0) {
            let projectStatus;
            let taskStatus;
            // if (speech !== "" && prespective !== "") {
            // projectStatus = "Free Trial";
            // taskStatus = "Ready to Start";
            // }

            // let createCompany = await Company.create({
            //   ...companyInfoObj,
            //   user: project.user._id,
            // });

            let proectTaskObj = {
              keywords: task.keywords,
              dueDate: task.dueDate,
              topic: task.topic,
              type: task.type,
              published: true,
              project: project._id,
              desiredNumberOfWords: task.wordCount,
              status: "Ready To Work",
              user: user._id,
              //   onBoarding: createCompany._id,
              //   tasks: taskCount,
              metaLector: project.metaLector,
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
            const freelancer = await Freelancers.findOne({
              _id: project.metaLector,
            });
            if (freelancer) {
              freelancerEmails.taskAssign(
                freelancer.email,
                {
                  name: createProjectTask.taskName,
                  keyword: createProjectTask.keywords,
                },
                "Meta Lector"
              );
            }
            //console.log("before creating file");
            const totalFiles = await getFileCount(project.folderId);
            const fileName = `${project.projectId}-${totalFiles + 1}-${
              createProjectTask.keywords || "No Keywords"
            }`;
            const fileObj = await createTaskFile(project.folderId, fileName);
            //console.log("after creating file");
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

            //console.log("updated project: ", upadteProject);

            let nameChar = upadteProject.projectName.slice(0, 2).toUpperCase();
            let idChar = createProjectTask._id.toString().slice(-4);
            const taskCounter = await getTaskCounter();
            let taskId = `${project.projectId}-${taskCounter?.seq}`;

            let updatedTask = await ProjectTask.findByIdAndUpdate(
              { _id: createProjectTask._id },
              {
                taskName: taskId,
                fileLink: fileObj.fileLink,
                fileId: fileObj.fileId,
              },
              { new: true }
            );

            if (upadteProject && createProjectTask) {
              await session.commitTransaction();
              session.endSession();
              // emails.onBoadingSuccess(user);
              if (updatedTask.texter) {
                const taskTexter = await Freelancers.findOne({
                  _id: updatedTask.texter,
                });
                if (taskTexter) {
                  freelancerEmails.reminder24Hours(
                    taskTexter.email,
                    {
                      name: updatedTask.taskName,
                      keyword: updatedTask.keywords,
                      documentLink: updatedTask.fileLink,
                    },
                    "Texter"
                  );
                }
              }

              // res.send({
              //   message: "OnBoarding successful",
              //   data: createProjectTask,
              // });
            }
          } else {
            // error = "As free trial gives only 1 task";
            await session.abortTransaction();
            session.endSession();
            res
              .status(403)
              .send({ message: "As free trial gives only 1 task" });
            responseSent = true;
            return;
          }
        } else if (role.title == "Client") {
          let taskCount = await ProjectTask.countDocuments({
            project: project._id,
          });

          let userPlan = await UserPlan.findOne({
            user: user._id,
            project: project._id,
          }).populate("plan");

          // //console.log("user plan: ", userPlan);

          if (!userPlan.subscription) {
            // error = "Client don't have subscription";
            await session.abortTransaction();
            session.endSession();
            res.status(500).send({ message: "Client don't have subscription" });
            responseSent = true;
            return;
          }

          if (
            dayjs(new Date()).isAfter(dayjs(userPlan.endMonthDate, "day")) ||
            userPlan.tasksPerMonthCount === userPlan.tasksPerMonth ||
            userPlan.tasksPerMonthCount > userPlan.tasksPerMonth
          ) {
            // error = "Client have reached monthly limit";
            await session.abortTransaction();
            session.endSession();
            res
              .status(500)
              .send({ message: "Client have reached monthly limit" });
            responseSent = true;
            return;
          }
          if (userPlan.textsRemaining === 0) {
            // error = "Client's subscription is expired";
            await session.abortTransaction();
            session.endSession();
            res
              .status(500)
              .send({ message: "Client's subscription is expired" });
            responseSent = true;
            return;
          }
          if (dayjs(new Date()).isAfter(dayjs(userPlan.endDate, "day"))) {
            // error = "Client's subscription is expired";
            await session.abortTransaction();
            session.endSession();
            res
              .status(500)
              .send({ message: "Client's subscription is expired" });
            responseSent = true;
            return;
          }

          // if (taskCount <= userPlan.plan.texts - 1) {
          let projectStatus;
          let taskStatus;
          // if (speech !== "" && prespective !== "") {
          //   projectStatus = "Ready";
          // }

          //   let createCompany = await Company.create({
          //     ...companyInfoObj,
          //     user: project.user._id,
          //   });

          let proectTaskObj = {
            keywords: task.keywords,
            dueDate: task.dueDate,
            topic: task.topic,
            type: task.type,
            status: "Ready To Work",
            published: true,
            desiredNumberOfWords: task.wordCount,
            project: project._id,
            user: user._id,
            ...(taskCount % 9 === 0 && { metaLector: project.metaLector }),
            // onBoarding: createCompany._id,
          };

          let createProjectTask = await ProjectTask.create(proectTaskObj);
          if (taskCount % 9 === 0) {
            const freelancer = await Freelancers.findOne({
              _id: project.metaLector,
            });
            if (freelancer) {
              freelancerEmails.taskAssign(
                freelancer.email,
                {
                  name: createProjectTask.taskName,
                  keyword: createProjectTask.keywords,
                },
                "Meta Lector"
              );
            }
          }
          //console.log("before creating file");
          const totalFiles = await getFileCount(project.folderId);
          const fileName = `${project.projectId}-${totalFiles + 1}-${
            createProjectTask.keywords || "No Keywords"
          }`;
          const fileObj = await createTaskFile(project.folderId, fileName);

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
          // const updateProjectTask = await ProjectTask.findOneAndUpdate(
          //   { _id: createProjectTask._id },
          //   {
          //     fileLink: fileObj.fileLink,
          //     fileId: fileObj.fileId,
          //     tasktName: fileName,
          //   },
          //   { new: true }
          // );
          //console.log("after creating file");
          let upadteProject = await Projects.findOneAndUpdate(
            { _id: project._id },
            {
              // speech: speech,
              // prespective: prespective,
              //   onBoarding: true,
              // boardingInfo: newOnBoarding._id,
              // duration: userPlan.subPlan.duration,
              // numberOfTasks: userPlan.plan.texts,
              //   projectStatus: projectStatus,
              $inc: { openTasks: 1 },
              tasks: taskCount + 1,
            },
            { new: true }
          );
          await Projects.findByIdAndUpdate(
            project._id,
            { $push: { projectTasks: createProjectTask._id } },
            { new: true }
          );

          //console.log("updated project: ", upadteProject);

          let nameChar = upadteProject.projectName.slice(0, 2).toUpperCase();
          let idChar = createProjectTask._id.toString().slice(-4);
         const taskCounter = await getTaskCounter();
         let taskId = `${project.projectId}-${taskCounter?.seq}`;

          let updatedTask = await ProjectTask.findByIdAndUpdate(
            { _id: createProjectTask._id },
            {
              taskName: taskId,
              fileLink: fileObj.fileLink,
              fileId: fileObj.fileId,
            },
            { new: true }
          );

          if (upadteProject && createProjectTask) {
            await session.commitTransaction();
            session.endSession();
            // emails.onBoadingSuccess(user);
              if (updatedTask.texter) {
                const taskTexter = await Freelancers.findOne({
                  _id: updatedTask.texter,
                });
                if (taskTexter) {
                  freelancerEmails.reminder24Hours(
                    taskTexter.email,
                    {
                      name: updatedTask.taskName,
                      keyword: updatedTask.keywords,
                      documentLink: updatedTask.fileLink,
                    },
                    "Texter"
                  );
                }
              }

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
          await session.abortTransaction();
          session.endSession();
          res.status(403).send({
            message: "Project not found!",
          });
          responseSent = true;
          return;
        }
      } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res
          .status(500)
          .send({ message: error.message || "Something went wrong" });
        responseSent = true;
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
    // //console.log("file path: ", filePath);
    const tasks = [];
    let checkCSVError = "";

    // Parse the CSV file and extract task data
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on("data", (row) => {
        // Assuming the CSV has 'name', 'description', and 'status' columns
        // //console.log("row: ", row);

        if (
          !row["Keywords"] ||
          !row["Type"] ||
          !row["Topic"] ||
          !row["Word Count Expectation"]
        ) {
          checkCSVError =
            "Keywords, Type, Topic, and Word Count fields are required for each task in csv file";
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
          wordCount: row["Word Count Expectation"],
        };
        tasks.push(task);
      })
      .on("end", async () => {
        try {
          if (checkCSVError) {
            res.status(500).send({ message: checkCSVError });
            return;
          }

          const allTasks = await projectTasks.find({ project: project._id });
          const savedTasksKeywords = allTasks.map((item) =>
            item.keywords.toLowerCase().trim()
          );
          if (!allTasks) {
            res.status(500).send({ message: "Could not get project tasks" });
            return;
          }
          //   //console.log("all tasks length: ", allTasks.length);
          let responseSent = false;
          if (allTasks.length > 0) {
            for (const importTask of tasks) {
              if (
                savedTasksKeywords.includes(
                  importTask.keywords.toLowerCase().trim()
                )
              ) {
                let orgTask = allTasks.find(
                  (item) =>
                    item.keywords.toLowerCase().trim() ===
                    importTask.keywords.toLowerCase().trim()
                );
                //console.log("old task");
                await editTask(user, project, importTask, orgTask, res);
                if (res.headersSent) {
                  responseSent = true;
                  break;
                }
                if (responseSent) {
                  break;
                }
              } else {
                //console.log("new task...");
                await importTasks(user, project, importTask, res);
                if (res.headersSent) {
                  responseSent = true;
                  break;
                }
                if (responseSent) {
                  break;
                }
              }
            }
          }

          if (allTasks.length === 0) {
            console.log("inside 0 length if");
            for (const importTask of tasks) {
              console.log("loop step ....");
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

          console.log("out side loop: ", responseSent);

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

exports.getAllTasks = async (req, res) => {
  try {
    if (!req.role || req.role.toLowerCase() !== "projectmanger") {
      res.status(401).send({ message: "Your are not admin" });
      return;
    }

    const allTasks = await projectTasks.find({ isActive: "Y" });

    const finalTasks = sortTasks(allTasks)

    res.status(200).send({ message: "success", data: finalTasks });
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
