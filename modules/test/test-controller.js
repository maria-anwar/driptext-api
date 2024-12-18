"use strict";
const Joi = require("@hapi/joi");
const db = require("../../models");
const mongoose = require("mongoose");
const jwt = require("../../utils/jwt");
const { drive, docs } = require("../../utils/googleService/googleService");
const {
  getWordCount,
  createInvoiceInGoogleSheets,
  exportFinishedTasks,
  freelancerInvoiceSpreadSheet,
  getColumnWidth,
  designFinishExportTasksSheet,
} = require("../../utils/googleService/actions");
const { getSubscriptionInvoice } = require("../../utils/chargebee/actions");
const freelancerEmails = require("../../utils/sendEmail/freelancer/emails");
const emails = require("../../utils/emails");
const dayjs = require("dayjs");

const Freelancers = db.Freelancer;
const Users = db.User;
const Roles = db.Role;
const Billings = db.Billing.Billings;
const freelancerEarnings = db.FreelancerEarning;
const counter = db.Counters;
const ProjectTask = db.ProjectTask;
const FreelancerInvoice = db.FreelancerInvoice;
const FreelancrPrice = db.FreelancerPrice;


exports.designFinishedTasksShert = async (req, res) => {
  try {

    const data = await designFinishExportTasksSheet()
    // const data = await getColumnWidth()


    res.status(200).send({message: "Success", data})
    
  } catch (error) {
    res.status(500).send({message: error?.message || "Something went wrong"})
  }
}

exports.clientMonthlyTasks = async (req, res) => {
  try {
    // Get the start and end date for the previous month using dayjs
    // const startOfPreviousMonth = dayjs()
    //   .subtract(1, "month")
    //   .startOf("month")
    //   .toDate();
    // const endOfPreviousMonth = dayjs()
    //   .subtract(1, "month")
    //   .endOf("month")
    //   .toDate();
     const startOfPreviousMonth = dayjs()
       .startOf("month")
       .toDate();
     const endOfPreviousMonth = dayjs()
       .endOf("month")
       .toDate();
    
    console.log("start of month: ", startOfPreviousMonth)
    console.log("end of month: ", endOfPreviousMonth)

    const data = await ProjectTask.aggregate([
      // Filter tasks with a non-null 'finishedDate' within the previous month
      {
        $match: {
          status: "Final",
          finishedDate: { $ne: null },
          finishedDate: {
            $gte: startOfPreviousMonth,
            $lte: endOfPreviousMonth,
          },
        },
      },
      // Group by user (_id)
      {
        $group: {
          _id: "$user", // Grouping by user _id
          tasks: { $push: "$$ROOT" }, // Push the full task document into the 'tasks' array
        },
      },
      // Populate the user details (as a single object)
      {
        $lookup: {
          from: "users", // Correct the collection name to 'users' (or adjust it to your actual collection name)
          localField: "_id", // We're joining on the grouped user _id
          foreignField: "_id", // The field in the 'users' collection we're matching on
          as: "userDetails", // The result will be an array, but it will have only one user document if the match is successful
        },
      },
      // Optionally, you can flatten the userDetails array to get the first element as an object instead of an array
      {
        $addFields: {
          userDetails: { $arrayElemAt: ["$userDetails", 0] }, // Flatten to get a single user object
        },
      },
    ]);

    console.log(data);

    res.status(200).send({ message: "Success", data: data });
  } catch (error) {
    res.status(500).send({message: error?.message || "Something went wrong"})
  }
}

exports.designFreelancerInvoice = async (req, res) => {
  try {

    const url = await freelancerInvoiceSpreadSheet(
      "1tbgscnf0-NNGlbXOE2FhefABCPohqC6WOFOWzvllPK8"
    );

    // const columnWidth = await getColumnWidth()

    res.status(200).send({ url });
    
  } catch (error) {
    res.status(500).send({message: error?.message || "Something went wrong"})
  }
}

exports.customerInvoice = async (req, res) => {
  try {
    console.log("inside subscription invoice api");
    const subscriptionInvoice = await getSubscriptionInvoice("344");
    console.log("response: ", subscriptionInvoice.download);
    res
      .status(200)
      .send({ message: "Success", data: subscriptionInvoice.download });
  } catch (error) {
    res.status(500).send({ message: error.message || "Something went wrong" });
  }
};

exports.testEmail = async (req, res) => {
  try {
    await emails.sendInvoiceToCustomer({ firstName: "frist Name", lastName:"last name", projectDomain:"project domain", email: "abdullahmuneer402@gmail.com" }, "abc", "de")
    res.status(200).send({message: "email sent"})
    
  } catch (error) {
    res.statuss(500).send({message: error?.message || "something went wrong"})
  }
}

const calculateInvoice = async () => {
  // Get the start and end dates for the previous month, ensuring no time component
  // const startOfPreviousMonth = dayjs()
  //   .subtract(1, "month")
  //   .startOf("month")
  //   .format("YYYY-MM-DD");

  // const endOfPreviousMonth = dayjs()
  //   .subtract(1, "month")
  //   .endOf("month")
  //   .format("YYYY-MM-DD");
  const startOfPreviousMonth = dayjs().startOf("month").format("YYYY-MM-DD");

  const endOfPreviousMonth = dayjs().endOf("month").format("YYYY-MM-DD");

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
          $lte: endOfPreviousMonthDate, // Includes the last day entirely
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

exports.testCounter = async (req, res) => {
  try {
    const counter = mongoose.connection.collection("counters");
    const counterData = await counter.findOne({ id: "id" });

    res.status(200).send({ message: "Success", data: counterData });
  } catch (error) {
    res.status(500).send({ message: error?.message || "Something went wrong" });
  }
};

exports.test = async (req, res) => {
  try {
    console.log("monthly invoice job ...");
    const tempData = [];
    const earnings = await calculateInvoice();
    const invoiceCount = await FreelancerInvoice.countDocuments({});
    const freelancerPrice = await FreelancrPrice.findOne({});
    console.log("freelancer price: ", freelancerPrice);
    const texterPrice = freelancerPrice?.texter || 0.07;
    const lectorPrice = freelancerPrice?.lector || 0.06;
    const seoPrice = freelancerPrice?.seoOptimizer || 0.05;
    const metaLectorPrice = freelancerPrice?.metaLector || 0.06;
    console.log("earning length: ", earnings.length);
    for (const earning of earnings) {
      let temp = {
        freelancerId: earning.freelancer._id,
        tasks: earning.earnings.map((item) => {
          let pricePerWord = 0;
          if (item.role.toLowerCase() === "texter") {
            pricePerWord = texterPrice;
          }
          if (item.role.toLowerCase() === "lector") {
            pricePerWord = lectorPrice;
          }
          if (item.role.toLowerCase() === "seo optimizer") {
            pricePerWord = seoPrice;
          }
          if (item.role.toLowerCase() === "meta lector") {
            pricePerWord = metaLectorPrice;
          }

          return {
            ...item.task,
            role: item.role,
            pricePerWord: pricePerWord.toString(),
            billedWords: Math.ceil(item.billedWords).toString(),
            total: Number(item.price).toFixed(2),
            freelancerName: `${earning.freelancer.firstName} ${earning.freelancer.lastName}`,
          };
        }),
        invoiceNo: (invoiceCount + 1).toString(),
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
      )}-${dayjs(endOfPreviousMonthDate).format("DD.MM.YYYY")}`;
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
          .includes("cy company")
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
      temp.vatRegulation = earning?.freelancer?.billingInfo?.vatRegulation;

      tempData.push(temp);
    }

    const finalData = [];

    for (const temp of tempData) {
      const obj = await createInvoiceInGoogleSheets(temp);
      await FreelancerInvoice.create({
        freelancer: temp.freelancerId,
        invoiceSheet: obj.invoiceSheet,
        tasksSheet: obj.tasksSheet,
        count: invoiceCount + 1,
      });
      finalData.push({
        invoice: obj.invoice,
        invoiceSheet: obj.invoiceSheet,
        tasks: obj.tasks,
        tasksSheet: obj.tasksSheet,
        freelancerEmail: temp.freelancerEmail,
        freelancerName: temp.clientName,
        freelancerId: temp.freelancerId,
      });
    }

  

    // const data = await createInvoiceInGoogleSheets(invoiceData);

     res.status(200).send({ message: "Success", data: finalData });
  } catch (err) {
    console.log("error in freelancer monthly invoicing job: ", err);
    res.status(500).send({message: err?.message || "Something went wrong"})
  }
};

exports.earningTwo = async (req, res) => {
  try {
    const data = await calculateInvoice();
    // const data = await freelancerEarnings.find({finalize: true}).populate("task").exec()

    res.status(200).send({ message: "Success", data: data });
  } catch (error) {
    res.status(500).send({ message: error?.message || "Something went wrong" });
  }
};

exports.sendEmail = async (req, res) => {
  try {
    emails
      .onBoadingSuccess({ email: "abdullahmuneer402@gmail.com" })
      .then((res) => console.log("on boarding email sent"))
      .catch((err) => console.log("sent email error: ", err));
    res.status(200).send({ message: "Success" });
  } catch (error) {
    res
      .status(500)
      .send({ messagee: error?.message || "Something went wrong" });
  }
};

exports.createFolder = async (req, res) => {
  try {
    const fileMetadata = {
      name: "test folder 2",
      mimeType: "application/vnd.google-apps.folder",
    };

    // Create the project folder in Google Drive
    const folder = await drive.files.create({
      resource: fileMetadata,
      fields: "id, webViewLink",
    });

    const folderId = folder.data.id;
    const folderLink = folder.data.webViewLink;

    // Set permissions to make the folder publicly accessible
    await drive.permissions.create({
      fileId: folderId,
      resource: {
        role: "writer", // Anyone can read the folder
        type: "anyone", // Available to anyone
      },
    });
    res.status(200).send({ message: "success", folderLink: folderLink });
  } catch (error) {
    res.status(500).send({ message: error.message || "Something went wrong" });
  }
};
