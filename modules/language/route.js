"use strict";

const express = require("express");
const router = express.Router();
const languageController = require("./languageController");

router.post("/addLanguage", (req, res) => {
  languageController.addLanguage(req, res);
});

router.post("/updateLanguage", (req, res) => {
  languageController.updateLanguage(req, res);
});

router.post("/getLanguage", (req, res) => {
  languageController.getLanguage(req, res);
});

module.exports = router;
