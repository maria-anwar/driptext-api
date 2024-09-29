"use strict";
const Joi = require("@hapi/joi");
const db = require("../../models");
const mongoose = require("mongoose");
const jwt = require("../../utils/jwt");
const { drive, docs } = require("../../utils/googleService/googleService")
const {getWordCount} = require("../../utils/googleService/actions")



const Freelancers = db.Freelancer;
const Users = db.User;
const Roles = db.Role;
const Billings = db.Billing.Billings;
exports.test = async (req, res) => {
    try {
      const wordCount = await getWordCount(
        "1_dG8YOIq1jKHe1al-ySNDjvnkfrPHSEHDXbsV0UiOOY"
      );
      res.status(200).send({message: "Success", wordCount})
        
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