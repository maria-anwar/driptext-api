"use strict";

const express = require("express");
const router = express.Router();
const chargebeeController = require("./chargebee.controller.js");
 
router.post('/create_payment_intent', chargebeeController.createPaymentIntent);
module.exports = router;
