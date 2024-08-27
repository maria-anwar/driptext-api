"use strict";
const Joi = require("@hapi/joi");
const db = require("../../models");
const mongoose = require("mongoose");
const jwt = require("../../utils/jwt");



const Freelancers = db.Freelancer;
const Users = db.User;
const Roles = db.Role;
const Billings = db.Billing.Billings;
exports.test = async (req, res) => {
    try {
        const billing = await Billings.find({});

        res.status(200).json({data: billing})
        
    } catch (error) {
        res.status(500).json({error: error})
    }

}