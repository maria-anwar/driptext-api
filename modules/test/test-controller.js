"use strict";
const Joi = require("@hapi/joi");
const db = require("../../models");
const mongoose = require("mongoose");
const jwt = require("../../utils/jwt");
const { drive, docs } = require("../../utils/googleService/googleService")
const {getWordCount, createInvoiceInGoogleSheets} = require("../../utils/googleService/actions");
const { getSubscriptionInvoice } = require("../../utils/chargebee/actions");



const Freelancers = db.Freelancer;
const Users = db.User;
const Roles = db.Role;
const Billings = db.Billing.Billings;

exports.customerInvoice = async (req, res) => {
  try {
    console.log("inside subscription invoice api")
    const subscriptionInvoice = await getSubscriptionInvoice("344");
    console.log("response: ", subscriptionInvoice.download)
    res.status(200).send({message: "Success", data: subscriptionInvoice.download})
  } catch (error) {
    res.status(500).send({message: error.message || "Something went wrong"})
  }
}

exports.test = async (req, res) => {
  try {
    const invoiceData = {
      creditNo: "2024-10-001",
      date: "2024-10-22",
      performancePeriod: "2024-09-01 to 2024-09-30",
      clientName: "John Doe Ltd.",
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
    const data = await createInvoiceInGoogleSheets(invoiceData);
    
    res.status(200).send({message: "Success", data: data})
     
        
    } catch (error) {
        res.status(500).json({error: error.message ||"Something went wrong"})
    }

}

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
        res.status(200).send({message: "success", folderLink: folderLink})
    } catch (error) {
        res.status(500).send({message: error.message || "Something went wrong"})
    }
}