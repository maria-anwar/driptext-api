const cron = require("node-cron");
const db = require("../../models");
const emails = require("../emails");
const dayjs = require("dayjs");
const freelancerEmails = require("../../utils/sendEmail/freelancer/emails");
const adminEmails = require("../../utils/sendEmail/admin/emails");
const clientEmails = require("../../utils/sendEmail/client/emails");
const { createInvoiceInGoogleSheets } = require("../googleService/actions");
// const { projectName } = require("../../config/secrets");

const Users = db.User;
const Project = db.Project;
const Company = db.Company;
const UserPlans = db.UserPlan;
const ProjectTask = db.ProjectTask;
const Freelancers = db.Freelancer;
const freelancerEarnings = db.FreelancerEarning;

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

          await clientEmails.onBoardingReminder(item.user.email, {
            projectDomain: item.projectName,
          });
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
    const allTasks = await ProjectTask.find({
      isActive: "Y",
      status: { $ne: "Final" },
    }).populate(["texter", "lector", "seo", "metaLector"]);

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
          }
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

const calculateInvoice = async () => {
  // Get the start and end dates for the previous month, ensuring no time component
  const startOfPreviousMonth = dayjs()
    .subtract(1, "month")
    .startOf("month")
    .format("YYYY-MM-DD"); // Formats to '2024-10-01'

  const endOfPreviousMonth = dayjs()
    .subtract(1, "month")
    .endOf("month")
    .format("YYYY-MM-DD"); // Formats to '2024-10-31'

  console.log("Previous month start date:", startOfPreviousMonth);
  console.log("Previous month end date:", endOfPreviousMonth);

  const startOfPreviousMonthDate = new Date(startOfPreviousMonth);
  const endOfPreviousMonthDate = new Date(endOfPreviousMonth);
  // Aggregation pipeline
  const earnings = await freelancerEarnings.aggregate([
    {
      $match: {
        finishedDate: {
          $gte: startOfPreviousMonthDate,
          $lt: dayjs(endOfPreviousMonthDate).add(1, "day").toDate(), // Includes the last day entirely
        },
        task: { $ne: null },
        project: { $ne: null },
        freelancer: { $ne: null },
      },
    },
    {
      $lookup: {
        from: "projectTasks", // Name of the task collection
        localField: "task",
        foreignField: "_id",
        as: "task",
      },
    },
    {
      $lookup: {
        from: "projects", // Name of the project collection
        localField: "project",
        foreignField: "_id",
        as: "project",
      },
    },
    {
      $lookup: {
        from: "freelancers", // Name of the freelancer collection
        localField: "freelancer",
        foreignField: "_id",
        as: "freelancer",
      },
    },
    {
      $unwind: { path: "$task", preserveNullAndEmptyArrays: true },
    },
    {
      $unwind: { path: "$project", preserveNullAndEmptyArrays: true },
    },
    {
      $unwind: { path: "$freelancer", preserveNullAndEmptyArrays: true },
    },
    {
      $group: {
        _id: "$freelancer", // Group by freelancer
        earnings: { $push: "$$ROOT" }, // Push the entire document into the 'earnings' array
      },
    },
    {
      $project: {
        freelancer: "$_id",
        earnings: { $ifNull: ["$earnings", []] }, // Ensure earnings is an array
        _id: 0, // Exclude _id from output
      },
    },
  ]);

  // console.log("freelancer earnings: ", earnings)

  return earnings;
};

const monthlyFreelancingInvoicing = async () => {
  try {
    const tempData = [];
    const earnings = await calculateInvoice();
    for (const earning of earnings) {
      let temp = {
        creditNo: "2024-10-001",
        date: "2024-10-22",
        performancePeriod: "2024-09-01 to 2024-09-30",
        clientName: "John Doe Ltd.",
        freelancerEmail: "",
        vatDescription: "",
        company: "",
        city: "",
        street: "",
        vatId: "",
        items: [
          {
            pos: 1,
            description: "AI-generated content for September 2024",
            amount: 10,
            price: 100,
            total: 1000,
          },
          {
            pos: 2,
            description: "Editing services for AI content",
            amount: 5,
            price: 150,
            total: 750,
          },
          {
            pos: 3,
            description: "Consultation on AI-driven content strategy",
            amount: 2,
            price: 200,
            total: 400,
          },
        ],
        subtotal: 2150, // Sum of all the item totals
        vat: 0, // VAT percentage
        total: 2150, // Subtotal + VAT
      };
      let subTotal = 0;
      let total = 0;
      let totalTasks = 0;
      let vat = 0;
      let vatDescription =
        "No VAT as the service is not taxed in the domestic market.";
      temp.creditNo = dayjs().startOf("day").format("YYYY-MM-DD");
      temp.date = dayjs().startOf("day").format("YYYY-MM-DD");
      const startOfPreviousMonth = dayjs()
        .subtract(1, "month")
        .startOf("month")
        .format("YYYY-MM-DD"); // Formats to '2024-10-01'

      const endOfPreviousMonth = dayjs()
        .subtract(1, "month")
        .endOf("month")
        .format("YYYY-MM-DD"); // Formats to '2024-10-31'

      console.log("Previous month start date:", startOfPreviousMonth);
      console.log("Previous month end date:", endOfPreviousMonth);

      const startOfPreviousMonthDate = new Date(startOfPreviousMonth);
      const endOfPreviousMonthDate = new Date(endOfPreviousMonth);

      temp.performancePeriod = `${dayjs(startOfPreviousMonthDate).format(
        "YYYY-MM-DD"
      )} to ${dayjs(endOfPreviousMonthDate).format("YYYY-MM-DD")}`;
      temp.clientName = `${earning.freelancer.firstName} ${earning.freelancer.lastName}`;

      for (const taskEarning of earning.earnings) {
        subTotal = subTotal + taskEarning.price;
        totalTasks = totalTasks + 1;
      }

      const tempItem = [
        {
          pos: 1,
          description: `Freelancer Invoice For ${dayjs(
            startOfPreviousMonthDate
          ).format("MMMM YYYY")}`,
          amount: totalTasks,
          price: subTotal,
          total: subTotal,
        },
      ];

      temp.items = tempItem;
      if (
        earning.freelancer.billingInfo.vatRegulation
          .toLowerCase()
          .includes("cy ltd")
      ) {
        const result = (19 / 100) * subTotal;
        vat = result;
        vatDescription = "VAT CY Ltd (19%)";
      }
      temp.company = earning.freelancer.company;
      temp.city = earning.freelancer.city;
      temp.street = earning.freelancer.street;
      temp.vatId = earning.freelancer.vatIdNo;
      temp.vatDescription = vatDescription;
      total = subTotal + vat;
      temp.subtotal = subTotal;
      temp.vat = vat;
      temp.total = total;
      temp.freelancerEmail = earning.freelancer.email;

      tempData.push(temp);
    }

    const finalData = [];

    for (const temp of tempData) {
      const link = await createInvoiceInGoogleSheets(temp);
      finalData.push({ link, freelancerEmail: temp.freelancerEmail });
    }

    for (const data of finalData) {
      freelancerEmails.monthlyInvoice(data.freelancerEmail, data.link);
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
        adminEmails.freelancerMonthlyInvoice(admin.email, data.link);
      }
    }

    // const data = await createInvoiceInGoogleSheets(invoiceData);

    //  res.status(200).send({ message: "Success", data: earnings });
  } catch (err) {}
};

module.exports = {
  onBoardingReminder,
  subscriptonCheck,
  taskDeadlineCheck,
  monthlyFreelancingInvoicing
};
