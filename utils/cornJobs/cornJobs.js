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
const TrafficLight = db.TrafficLight;
const Language = db.Language;

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
        if (!user && item.user?.emailSubscription) {
          console.log("not found: ", item.user);
          const userLanguage = await Language.findOne({
            userId: item.user._id,
          });

          await clientEmails.onBoardingReminder(
            item.user.email,
            {
              projectDomain: item.projectName,
              firstName: user.firstName
            },
            userLanguage?.language || "de"
          );
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
          const prevFreelacer = task.texter;
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
          const project = await Project.findOne({_id: task.project})
          for (const admin of admins) {
            const userLanguage = await Language.findOne({ userId: admin._id })
            
            adminEmails.assignFreelancer48Hours(admin.email, {
              freelancerName: `${prevFreelacer.firstName} ${prevFreelacer.lastName}`,
              freelancerRole: "Texter",
              taskName: task.taskName,
              taskKeyword: task.keywords,
              projectDomain: project?.projectName

            },userLanguage?.language || "de")
          }
        } else if (hoursDifference >= 24) {
          const freelancer = await Freelancers.findOne({ _id: task.texter });
          if (freelancer) {
            const userLanguage = await Language.findOne({
              userId: freelancer._id,
            });
            freelancerEmails.reminder24Hours(
              freelancer,
              {
                name: task.taskName,
                keyword: task.keywords,
                documentLink: task.fileLink,
              },
              "Texter",
              userLanguage?.language || "de"
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
          const prevFreelacer = task?.lector;

          await ProjectTask.findOneAndUpdate(
            { _id: task._id },
            {
              lector: null,
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
            const project = await Project.findOne({ _id: task.project });
            for (const admin of admins) {
              const userLanguage = await Language.findOne({
                userId: admin._id,
              });

              adminEmails.assignFreelancer48Hours(
                admin.email,
                {
                  freelancerName: `${prevFreelacer.firstName} ${prevFreelacer.lastName}`,
                  freelancerRole: "Lector",
                  taskName: task.taskName,
                  taskKeyword: task.keywords,
                  projectDomain: project?.projectName,
                },
                userLanguage?.language || "de"
              );
            }
        } else if (hoursDifference >= 24) {
          const freelancer = await Freelancers.findOne({ _id: task.lector });
          if (freelancer) {
            const userLanguage = await Language.findOne({
              userId: freelancer._id,
            });
            freelancerEmails.reminder24Hours(
              freelancer,
              {
                name: task.taskName,
                keyword: task.keywords,
                documentLink: task.fileLink,
              },
              "Lector",
              userLanguage?.language || "de"
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
          const prevFreelacer = task?.seo;

          await ProjectTask.findOneAndUpdate(
            { _id: task._id },
            {
              seo: null,
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
            const project = await Project.findOne({ _id: task.project });
            for (const admin of admins) {
              const userLanguage = await Language.findOne({
                userId: admin._id,
              });

              adminEmails.assignFreelancer48Hours(
                admin.email,
                {
                  freelancerName: `${prevFreelacer.firstName} ${prevFreelacer.lastName}`,
                  freelancerRole: "SEO Optimizer",
                  taskName: task.taskName,
                  taskKeyword: task.keywords,
                  projectDomain: project?.projectName,
                },
                userLanguage?.language || "de"
              );
            }
        } else if (hoursDifference >= 24) {
          const freelancer = await Freelancers.findOne({ _id: task.seo });
          if (freelancer) {
            const userLanguage = await Language.findOne({
              userId: freelancer._id,
            });
            freelancerEmails.reminder24Hours(
              freelancer,
              {
                name: task.taskName,
                keyword: task.keywords,
                documentLink: task.fileLink,
              },
              "SEO-Optimizer",
              userLanguage?.language || "de"
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
          const prevFreelacer = task?.metaLector;

          await ProjectTask.findOneAndUpdate(
            { _id: task._id },
            {
              metaLector: null,
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
            const project = await Project.findOne({ _id: task.project });
            for (const admin of admins) {
              const userLanguage = await Language.findOne({
                userId: admin._id,
              });

              adminEmails.assignFreelancer48Hours(
                admin.email,
                {
                  freelancerName: `${prevFreelacer.firstName} ${prevFreelacer.lastName}`,
                  freelancerRole: "Meta Lector",
                  taskName: task.taskName,
                  taskKeyword: task.keywords,
                  projectDomain: project?.projectName,
                },
                userLanguage?.language || "de"
              );
            }
        } else if (hoursDifference >= 24) {
          const freelancer = await Freelancers.findOne({
            _id: task.metaLector,
          });
          if (freelancer) {
            const userLanguage = await Language.findOne({
              userId: freelancer._id,
            });
            freelancerEmails.reminder24Hours(
              freelancer,
              {
                name: task.taskName,
                keyword: task.keywords,
                documentLink: task.fileLink,
              },
              "Meta Lector",
              userLanguage?.language || "de"
            );
          }
        }
      }
    }
  } catch (error) {
    console.log("task deadline check error: ", error);
  }
};

const trafficLightDealineCheck = async () => {
  try {
    const allTasks = await ProjectTask.find({
      finishedDate: null,
      isActive: "Y",
    }).exec();

    const today = dayjs().startOf("day");

    allTasks.forEach(async (task) => {
      if (task.dueDate && today.isAfter(dayjs(task.dueDate))) {
        if (
          task.status.toLowerCase() === "ready to work" ||
          task.status.toLowerCase() === "ready for rivision (lector)" ||
          task.status.toLowerCase() === "ready for rivision (meta lector)" ||
          task.status.toLowerCase() === "in progress" ||
          task.status.toLowerCase() === "in rivision (lector)" ||
          task.status.toLowerCase() === "in rivision (meta lector)"
        ) {
          if (task.texter) {
            // Texter
            const trafficLight = await TrafficLight.findOne({
              freelancer: task.texter,
              role: "Texter",
            }).exec();
            if (trafficLight) {
              const body = {
                date: dayjs().startOf("day"),
                task: task._id,
              };
              const alreadyPresent = await TrafficLight.findOne({
                deadlineTasks: { $elemMatch: { task: task._id } },
              }).exec();
              if (!alreadyPresent) {
                const updatedTrafficLight = await TrafficLight.findOneAndUpdate(
                  { freelancer: task.texter },
                  {
                    $push: { deadlineTasks: body },
                  },
                  { new: true }
                );
              }
            } else {
              const body = {
                date: dayjs().startOf("day"),
                task: task._id,
              };
              const newTrafficLight = await TrafficLight.create({
                freelancer: task.texter,
                role: "Texter",
                deadlineTasks: [body],
              });
            }
          }
        }

        if (
          task.status.toLowerCase() === "ready for proofreading" ||
          task.status.toLowerCase() === "proofreading in progress"
        ) {
          // Lector
          if (task.lector) {
            const trafficLight = await TrafficLight.findOne({
              freelancer: task.lector,
              role: "Lector",
            }).exec();
            if (trafficLight) {
              const body = {
                date: dayjs().startOf("day"),
                task: task._id,
              };

              const alreadyPresent = await TrafficLight.findOne({
                deadlineTasks: { $elemMatch: { task: task._id } },
              }).exec();

              if (!alreadyPresent) {
                const updatedTrafficLight = await TrafficLight.findOneAndUpdate(
                  { freelancer: task.lector },
                  {
                    $push: { deadlineTasks: body },
                  },
                  { new: true }
                );
              }
            } else {
              const body = {
                date: dayjs().startOf("day"),
                task: task._id,
              };
              const newTrafficLight = await TrafficLight.create({
                freelancer: task.lector,
                role: "Lector",
                deadlineTasks: [body],
              });
            }
          }
        }

        if (
          task.status.toLowerCase() === "ready for seo optimization" ||
          task.status.toLowerCase() === "seo optimization in progress"
        ) {
          // seo optmizier
          if (task.seo) {
            const trafficLight = await TrafficLight.findOne({
              freelancer: task.seo,
              role: "SEO-Optimizer",
            }).exec();
            if (trafficLight) {
              const body = {
                date: dayjs().startOf("day"),
                task: task._id,
              };
              const alreadyPresent = await TrafficLight.findOne({
                deadlineTasks: { $elemMatch: { task: task._id } },
              }).exec();

              if (!alreadyPresent) {
                const updatedTrafficLight = await TrafficLight.findOneAndUpdate(
                  { freelancer: task.seo },
                  {
                    $push: { deadlineTasks: body },
                  },
                  { new: true }
                );
              }
            } else {
              const body = {
                date: dayjs().startOf("day"),
                task: task._id,
              };
              const newTrafficLight = await TrafficLight.create({
                freelancer: task.seo,
                role: "SEO-Optimizer",
                deadlineTasks: [body],
              });
            }
          }
        }

        if (
          task.status.toLowerCase() === "ready for 2nd proofreading" ||
          task.status.toLowerCase() === "2nd proofreading in progress"
        ) {
          // Meta Lector
          if (task.metaLector) {
            const trafficLight = await TrafficLight.findOne({
              freelancer: task.metaLector,
              role: "Meta Lector",
            }).exec();
            if (trafficLight) {
              const body = {
                date: dayjs().startOf("day"),
                task: task._id,
              };
              const alreadyPresent = await TrafficLight.findOne({
                deadlineTasks: { $elemMatch: { task: task._id } },
              }).exec();

              if (!alreadyPresent) {
                const updatedTrafficLight = await TrafficLight.findOneAndUpdate(
                  { freelancer: task.metaLector },
                  {
                    $push: { deadlineTasks: body },
                  },
                  { new: true }
                );
              }
            } else {
              const body = {
                date: dayjs().startOf("day"),
                task: task._id,
              };
              const newTrafficLight = await TrafficLight.create({
                freelancer: task.metaLector,
                role: "Meta Lector",
                deadlineTasks: [body],
              });
            }
          }
        }
      }
    });
  } catch (error) {
    console.log("traffic light deadline check: ", error);
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
        from: "projecttasks", // Name of the task collection
        localField: "task",
        foreignField: "_id",
        as: "task",
      },
    },
    // {
    //   $lookup: {
    //     from: "projects", // Name of the project collection
    //     localField: "project",
    //     foreignField: "_id",
    //     as: "project",
    //   },
    // },
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
    // {
    //   $unwind: { path: "$project", preserveNullAndEmptyArrays: true },
    // },
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
    console.log("monthly invoice job ...");
    const tempData = [];
    const earnings = await calculateInvoice();
    for (const earning of earnings) {
      let temp = {
        freelancerId: earning.freelancer._id,
        tasks: earning.earnings.map((item) => {
          const desiredWords = item.task.desiredNumberOfWords;
          const actualWords = item.task.actualNumberOfWords;

          // Calculate 10% of the desired words
          const tenPercentOfDesiredWords = desiredWords * 0.1;

          let calculatedWords = 0;

          // Check if actualWords are more than 10% greater than desiredWords
          if (actualWords > desiredWords + tenPercentOfDesiredWords) {
            calculatedWords = desiredWords * 1.1;
          } else {
            calculatedWords = actualWords;
          }

          return {
            ...item.task,
            role: item.role,
            calculatedWords: calculatedWords.toString().split(".").at(0),
            freelancerName: `${earning.freelancer.firstName} ${earning.freelancer.lastName}`
          };
        }),
        creditNo: "2024-10-001",
        date: "2024-10-22",
        performancePeriod: "2024-09-01 to 2024-09-30",
        clientName: earning.freelancer.firstName,
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
      temp.creditNo = dayjs().startOf("day").format("DD.MM.YYYY");
      temp.date = dayjs().startOf("day").format("DD.MM.YYYY");
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
        "DD.MM.YYYY"
      )} to ${dayjs(endOfPreviousMonthDate).format("DD.MM.YYYY")}`;
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
      const obj = await createInvoiceInGoogleSheets(temp);
      finalData.push({
        invoice: obj.invoice,
        tasks: obj.tasks,
        freelancerEmail: temp.freelancerEmail,
        freelancerName: temp.clientName,
        freelancerId: temp.freelancerId,
      });
    }

    for (const data of finalData) {
      const userLanguage = await Language.findOne({
        userId: data.freelancerId,
      });
      freelancerEmails.monthlyInvoice(
        {
          name: data.freelancerName,
          email: data.freelancerEmail,
        },
        data.invoice,
        data.tasks,
        userLanguage?.language || "de"
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
      console.log("admins length: ", admins.length);
      for (const admin of admins) {
        console.log("sending email");
        // mariaanwar996@gmail.com
        const userLanguage = await Language.findOne({ userId: admin._id });
        await adminEmails.freelancerMonthlyInvoice(
          {
            name: data.freelancerName,
            email: admin.email,
          },
          data.invoice,
          data.tasks,
          userLanguage?.language || "de"
        );
      }
    }

    // const data = await createInvoiceInGoogleSheets(invoiceData);

    //  res.status(200).send({ message: "Success", data: earnings });
  } catch (err) {
    console.log("error in freelancer monthly invoicing job: ", err);
  }
};

const clientMonthlyTasks = async () => {
  try {

    const data = await ProjectTask
    
  } catch (error) {
    console.log("client monthly tasks email: ", error)
  }
}

module.exports = {
  onBoardingReminder,
  subscriptonCheck,
  taskDeadlineCheck,
  monthlyFreelancingInvoicing,
  trafficLightDealineCheck,
};
