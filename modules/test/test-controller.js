"use strict";
const Joi = require("@hapi/joi");
const db = require("../../models");
const mongoose = require("mongoose");
const jwt = require("../../utils/jwt");
const { drive, docs } = require("../../utils/googleService/googleService");
const {
  getWordCount,
  createInvoiceInGoogleSheets,
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

const calculateInvoice = async () => {
  // Get the start and end dates for the previous month, ensuring no time component
  const startOfPreviousMonth = dayjs("2024-12-1")
    .subtract(1, "month")
    .startOf("month")
    .format("YYYY-MM-DD"); // Formats to '2024-10-01'

  const endOfPreviousMonth = dayjs("2024-12-1")
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

exports.testCounter = async (req, res) => {
  try {

    const counter = mongoose.connection.collection("counters")
    const counterData = await counter.findOne({id:"id"})

    res.status(200).send({ message: "Success", data: counterData });
    
  } catch (error) {
    res.status(500).send({message: error?.message || "Something went wrong"})
  }
}

exports.test = async (req, res) => {
  try {
    const tempData = [];
    const earnings = await calculateInvoice();
    for (const earning of earnings) {
      let temp = {
        creditNo: "2024-10-001",
        date: "2024-10-22",
        performancePeriod: "2024-09-01 to 2024-09-30",
        clientName: "John Doe Ltd.",
        vatDescription:"",
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
      const startOfPreviousMonth = dayjs("2024-12-1")
        .subtract(1, "month")
        .startOf("month")
        .format("YYYY-MM-DD"); // Formats to '2024-10-01'

      const endOfPreviousMonth = dayjs("2024-12-1")
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
        vatDescription = "VAT CY Ltd (19%)"
      }
      temp.company = earning.freelancer.company
        temp.city = earning.freelancer.city
        temp.street = earning.freelancer.street
        temp.vatId = earning.freelancer.vatIdNo
        temp.vatDescription = vatDescription
        total = subTotal + vat;
      temp.subtotal = subTotal;
      temp.vat = vat;
      temp.total = total;

      tempData.push(temp);
    }

    const finalData = []

    // for (const temp of tempData) {
    //   const link = await createInvoiceInGoogleSheets(temp)
    //   finalData.push(link)
    // }

    // const data = await createInvoiceInGoogleSheets(invoiceData);

    res.status(200).send({ message: "Success", data: earnings });
  } catch (error) {
    res.status(500).json({ error: error.message || "Something went wrong" });
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
