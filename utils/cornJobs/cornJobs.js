const cron = require("node-cron");
const db = require("../../models");
const emails = require("../emails");
// const { projectName } = require("../../config/secrets");

const Users = db.User;
const Project = db.Project;
const Company = db.Company;
const onBoardingReminder = async () => {
  console.log("starting corn job")
  const projects = await Project.find({
    projectStatus: "Not initalized",
    createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // 24 hours ago
  }).populate("user");
  if (projects.length > 0) {
    projects.forEach( async (item) => {
      let user = await Company.findOne({ user: item.user._id })
      // if (user) {
      //   console.log("found: ", item.user)
      // }
      if (!user) {
        console.log("not found: ", item.user)
        await emails.onBoardingRequest(item.user, item)
      }
    })
  }
};

module.exports = {
  onBoardingReminder,
};
