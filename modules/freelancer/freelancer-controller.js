"use strict";
const Joi = require("@hapi/joi");
const db = require("../../models");
const mongoose = require("mongoose");
const jwt = require("../../utils/jwt");



const Freelancers = db.Freelancer;
const Roles = db.Role;
exports.create = async (req, res) => {
  try {
    const joiSchema = Joi.object({
      firstName: Joi.string().required(),
      lastName: Joi.string().required(),
      email: Joi.string().email().required(),
      country: Joi.string().optional().allow(null).allow(""),
      companyName: Joi.string().optional().allow(null).allow(""),
      vatId: Joi.string().required(),
      iban: Joi.string().required(),
      vatRegulation: Joi.string().required(),
      street: Joi.string().required(),
      postCode: Joi.string().required(),
      city: Joi.string().required(),
    });
    const { error, value } = joiSchema.validate(req.body);
    if (error) {
    //   emails.errorEmail(req, error);

      const message = error.details[0].message.replace(/"/g, "");
      return res.status(401).send({
        message: message,
      });
    }
      const session = await mongoose.startSession();
      session.startTransaction();

    const role = await Roles.findOne({ title: "Freelancer" });

      if (!role) {
        await session.commitTransaction();
        session.endSession();
      return res
        .status(500)
        .json({ message: "Freelancer role does not exists" });
      }
      
      const alreadyExists = await Freelancers.findOne({ email: req.body.email })
      
      if (alreadyExists) {
          await session.commitTransaction();
          session.endSession();
          return res
            .status(500)
            .json({ message: "Email Already exists" });
          
      }

    const tempUser = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      country: req.body.country,
      postCode: req.body.postCode,
      street: req.body.street,
      city: req.body.city,
      role: role._id,
      freelancerBillingInfo: {
        iban: req.body.iban,
        vatRegulation: req.body.vatRegulation,
      },
      password: req.body.password ? req.body.password : "123456@123456",
    };
      const user = await Freelancers.create(tempUser);
      await session.commitTransaction();
      session.endSession();

    res.status(200).json({ message: "freelancer created", freelancer: user });
  } catch (error) {
    res.status(500).json({ message: error?.message || "Something went wrong" });
  }
};

exports.login = async (req, res) => {
  try {
    const joiSchema = Joi.object({
      
      email: Joi.string().email().required(),
      password: Joi.string().required(),

    });
    const { error, value } = joiSchema.validate(req.body);
    if (error) {
      //   emails.errorEmail(req, error);

      const message = error.details[0].message.replace(/"/g, "");
      return res.status(401).send({
        message: message,
      });
    }
    const userExist = await Freelancers.findOne({
      email: req.body.email.trim(),
      isActive: "Y",
    }).select("firstName lastName email role password");
    if (userExist) {
      const user = await Freelancers.findOne({
        email: req.body.email.trim(),
        password: req.body.password,
        isActive: "Y",
      })
        .select("firstName lastName email role password")
        .populate({ path: "role", select: "title" });

      if (userExist && user.password == req.body.password) {
        // encryptHelper(user);
        console.log("logdin");
        const token = jwt.signToken({
          userId: user._id,
          roleId: user.role,
          role: user.role.title,
        });
        res.status(200).send({
          message: "Logged in successful",
          data: { user },
          token,
        });
      } else {
        res.status(403).send({
          title: "Incorrect Logins",
          message: "Incorrect Logins",
        });
      }
    } else {
      res.status(401).send({
        title: "Incorrect Email.",
        message:
          "Email does not exist in our system, Please verify you have entered correct email.",
      });
    }
  } catch (err) {
    // emails.errorEmail(req, err);
    console.log(err);
    res.status(500).send({
      message: err.message || "Some error occurred.",
    });
  }
};
