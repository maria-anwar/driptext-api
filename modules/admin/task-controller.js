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
              };

              let createProjectTask = await ProjectTask.create(proectTaskObj);
              const totalFiles = await getFileCount(project.folderId);
              const fileName = `${project.id}-${totalFiles + 1}-${
                createProjectTask.keywords || "No Keywords"
              }`;
              const fileObj = await createTaskFile(project.folderId, fileName);
              console.log("after creating file");
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
  try {
    if (!req.role || req.role.toLowerCase() !== "projectmanger") {
      res.status(401).send({ message: "You are not authorized" });
      return;
    }

    const editTask = async (user, project, task, orgTask) => {
      //   console.log("task onBoarding: ", task);
      const updatedTask = await projectTasks.findOneAndUpdate(
        { _id: orgTask._id },
        {
          keywords: task.keywords,
          dueDate: task.dueDate,
          topic: task.topic,
          type: task.type,
          desiredNumberOfWords: task.wordCount,
          status: "Ready To Work",
        },
        { new: true }
      );
    };

    const importTasks = async (user, project, task) => {
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
        if (role.title == "leads" || role.title == "Leads") {
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

            console.log("updated project: ", upadteProject);

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
              await emails.onBoadingSuccess(user);

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
        } else if (role.title == "Client") {
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
            // onBoarding: createCompany._id,
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
              //   onBoarding: true,
              // boardingInfo: newOnBoarding._id,
              // duration: userPlan.subPlan.duration,
              // numberOfTasks: userPlan.plan.texts,
              //   projectStatus: projectStatus,
              tasks: taskCount + 1,
            },
            { new: true }
          );
          await Projects.findByIdAndUpdate(
            project._id,
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
          console.log("updated project: ", upadteProject);

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
            await emails.onBoadingSuccess(user);

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
    // console.log("file path: ", filePath);
    const tasks = [];
    let checkCSVError = "";

    // Parse the CSV file and extract task data
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on("data", (row) => {
        // Assuming the CSV has 'name', 'description', and 'status' columns
        // console.log("row: ", row);

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
          //   console.log("all tasks length: ", allTasks.length);
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
                console.log("old task");
                await editTask(user, project, importTask, orgTask, res);
                if (res.headersSent) {
                  responseSent = true;
                  break;
                }
                if (responseSent) {
                  break;
                }
              } else {
                console.log("new task...");
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

          //   if (allTasks.length === 0) {
          //     tasks.forEach( async (importTask) => {
          //       await importTasks(user, project, importTask);
          //     });
          //   }

          // // Bulk add the tasks to the project
          // project.projectTasks.push(...tasks);
          // await project.save();

          // // Delete the uploaded CSV file after processing
          fs.unlinkSync(filePath);

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
