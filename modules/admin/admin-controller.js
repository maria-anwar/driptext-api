const Joi = require("@hapi/joi");
const db = require("../../models");
const mongoose = require("mongoose");
const emails = require("../../utils/emails");
const dayjs = require("dayjs")

// const { RDS } = require("aws-sdk");

const Freelancers = db.Freelancer;
const Users = db.User;
const Roles = db.Role;
const projectTasks = db.ProjectTask;
const Projects = db.Project;
const UserPlan = db.UserPlan;
const ProjectTask = db.ProjectTask;
const Company = db.Company;


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
      wordCount: Joi.number().required(),
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
            .select("id projectName keywords");

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
                  keywords: project.keywords,
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
              }
            } else if (
              (role.title == "leads" || role.title == "Leads") &&
              project.projectName !== projectName
            ) {
              res.status(403).send({
                message:
                  "This user is in Leads Role so you can not onboard another project/task",
              });
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
                keywords: project.keywords,
                desiredNumberOfWords: userPlan.plan.desiredWords,
                project: project._id,
                user: userId,
                onBoarding: createCompany._id,
                published: true,
              };

              let createProjectTask = await ProjectTask.create(proectTaskObj);
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
      res.status(401).send({
        message: message,
      });
      return;
    }
    const project = await Projects.findOne({
      _id: req.body.projectId,
    }).populate("projectTasks");
    if (!project) {
      res.status(404).send({ message: "project not found" });
      return;
    }
    const freelancer = await Freelancers.findOne({
      _id: req.boby.freelancerId,
    });
    if (!freelancer) {
      res.status(404).send({ message: "freelancer nor found" });
      return;
    }
    const session = await mongoose.startSession();
    session.startTransaction();

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
      _id: req.boby.freelancerId,
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
    res.status(200).send({message: "success"})
  } catch (error) {
    res.status(500).send({ message: error.message || "Something went wrong" });
  }
};


