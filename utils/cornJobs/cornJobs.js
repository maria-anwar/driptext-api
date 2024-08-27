const cron = require("node-cron");
const db = require("../../models");
const emails = require("../emails");
const dayjs = require("dayjs");
// const { projectName } = require("../../config/secrets");

const Users = db.User;
const Project = db.Project;
const Company = db.Company;
const UserPlans = db.UserPlan;

const onBoardingReminder = async () => {
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
};

const subscriptonCheck = async () => {
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
};

module.exports = {
  onBoardingReminder,
  subscriptonCheck,
};
