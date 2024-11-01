const cron = require("node-cron");
const db = require("../../models");
const emails = require("../emails");
const dayjs = require("dayjs");
const freelancerEmails = require("../../utils/sendEmail/freelancer/emails");
// const { projectName } = require("../../config/secrets");

const Users = db.User;
const Project = db.Project;
const Company = db.Company;
const UserPlans = db.UserPlan;
const ProjectTask = db.ProjectTask;
const Freelancers = db.Freelancer;

const onBoardingReminder = async () => {
  try {
    console.log("starting corn job");
    const projects = await Project.find({
      projectStatus: "Not initalized",
      createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // 24 hours ago
    }).populate("user");
    if (projects.length > 0) {
      projects.forEach(async (item) => {
        let user = await Company.findOne({ user: item.user._id });
        // if (user) {
        //   console.log("found: ", item.user)
        // }
        if (!user) {
          console.log("not found: ", item.user);
          await emails.onBoardingRequest(item.user, item);
        }
      });
    }
  } catch (error) {
    console.log("OnBoarding Reminder: ", error);
  }
};

const subscriptonCheck = async () => {
  try {
    const plans = await UserPlans.find({}).populate("plan").populate("subPlan");
    const today = dayjs();
    plans.forEach(async (item) => {
      if (item.subscripton) {
        if (today.isAfter(dayjs(item.endDate, "day"))) {
          await UserPlans.findOneAndUpdate(
            { _id: item._id },
            {
              plan: null,
              subPlan: null,
              subscription: null,
              startDate: null,
              endDate: null,
              duration: null,
              endMonthDate: null,
              totalTexts: 0,
              textsCount: 0,
              textsRemaining: 0,
              tasksPerMonth: 0,
              tasksPerMonthCount: 0,
            },
            { new: true }
          );

          return;
        }

        if (today.isAfter(dayjs(item.endMonthDate, "day"))) {
          const nextMonth = dayjs(item.endMonthDate).add(1, "month");

          await UserPlans.findOneAndUpdate(
            { _id: item._id },
            {
              endMonthDate: nextMonth.format("YYYY-MM-DD"),
              tasksPerMonth: item.plan.texts,
              tasksPerMonthCount: 0,
            },
            { new: true }
          );
        }
      }
    });
  } catch (error) {
    console.log("Error in subscription check: ", error);
  }
};

const taskDeadlineCheck = async () => {
  try {
    const allTasks = await ProjectTask.find({ isActive: "Y" }).populate([
      "texter",
      "lector",
      "seo",
      "metaLector",
    ]);

    for (const task of allTasks) {
      const now = dayjs();
      const due = dayjs(task.dueDate);

      const hoursDifference = now.diff(due, "hour");

      // texter
      if (
        task.status.toLowerCase() === "ready to work" ||
        task.status.toLowerCase() === "in progress" ||
        task.status.toLowerCase() === "in rivision"
      ) {
        if (hoursDifference >= 48) {
          await ProjectTask.findOneAndUpdate(
            { _id: task._id },
            {
              texter: null,
            },
            { new: true }
          );
        } else if (hoursDifference >= 24) {
          const freelancer = await Freelancers.findOne({ _id: task.texter });
          if (freelancer) {
             freelancerEmails.reminder24Hours(
               freelancer.email,
               {
                 name: task.taskName,
                 keyword: task.keywords,
                 documentLink: task.fileLink,
               },
               "Texter"
             );
          }
         
        }
      }

      // lector
      if (
        task.status.toLowerCase() === "ready for proofreading" ||
        task.status.toLowerCase() === "proofreading in progress"
      ) {
        if (hoursDifference >= 48) {
          await ProjectTask.findOneAndUpdate(
            { _id: task._id },
            {
              lector: null,
            },
            { new: true }
          );
        } else if (hoursDifference >= 24) {
          const freelancer = await Freelancers.findOne({ _id: task.lector });
          if (freelancer) {
            freelancerEmails.reminder24Hours(
              freelancer.email,
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

      // seo optimizer
      if (
        task.status.toLowerCase() === "ready for seo optimization" ||
        task.status.toLowerCase() === "seo optimization in progress"
      ) {
        if (hoursDifference >= 48) {
          await ProjectTask.findOneAndUpdate(
            { _id: task._id },
            {
              seo: null,
            },
            { new: true }
          );
        } else if (hoursDifference >= 24) {
          const freelancer = await Freelancers.findOne({ _id: task.seo });
          if (freelancer) {
            freelancerEmails.reminder24Hours(
              freelancer.email,
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

      // meta lector
      if (
        task.status.toLowerCase() === "ready for 2nd proofreading" ||
        task.status.toLowerCase() === "2nd proofreading in progress"
      ) {
        if (hoursDifference >= 48) {
          await ProjectTask.findOneAndUpdate(
            { _id: task._id },
            {
              metaLector: null,
            },
            { new: true }
          );
        } else if (hoursDifference >= 24) {
          const freelancer = await Freelancers.findOne({
            _id: task.metaLector,
          });
          if (freelancer) {
            freelancerEmails.reminder24Hours(
              freelancer.email,
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
    }
  } catch (error) {
    console.log("task deadline check error: ", error);
  }
};

module.exports = {
  onBoardingReminder,
  subscriptonCheck,
  taskDeadlineCheck,
};
