const db = require("../../models");
const jwt = require("../../utils/jwt");
const encryptHelper = require("../../utils/encryptHelper");
const emails = require("../../utils/emails");
const Joi = require("@hapi/joi");
const crypto = require("../../utils/crypto")

// const Clients = db.clients;
const Users = db.User;
// const UserProfile = db.userProfile;
const Roles = db.Role;
const Freelancers = db.Freelancer;
const Language = db.Language;


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
    
    const FreelancerExists = await Freelancers.findOne({
      email: req.body.email.trim(),
      isActive: "Y",
    }).select("firstName lastName email role password");
    if (FreelancerExists) {
      const freelancer = await Freelancers.findOne({
        email: req.body.email.trim(),
        password: req.body.password,
        isActive: "Y",
      })
        .select("firstName lastName email role password")
        .populate({ path: "role", select: "title" });
      
      // const decryptedPassword = crypto.decrypt(freelancer.password)

      if (
        freelancer &&
        crypto.decrypt(freelancer.password) == req.body.password
      ) {
        // encryptHelper(user);
        console.log("logdin");
        const token = jwt.signToken({
          userId: freelancer._id,
          roleId: freelancer.role,
          role: freelancer.role.title,
        });
        res.status(200).send({
          message: "Logged in successful",
          data: { user: freelancer },
          token,
        });
      } else {
        res.status(403).send({
          title: "Incorrect Logins",
          message: "Incorrect Logins",
        });
      }
    } else {
      //    res.status(401).send({
      //      title: "Incorrect Email.",
      //      message:
      //        "Email does not exist in our system, Please verify you have entered correct email.",
      //    });
      const userExist = await Users.findOne({
        email: req.body.email.trim(),
        isActive: "Y",
      }).select("firstName lastName email role password");
      if (userExist) {
        const user = await Users.findOne({
          email: req.body.email.trim(),
          password: req.body.password,
          isActive: "Y",
        })
          .select("firstName lastName email role password emailSubscription")
          .populate({ path: "role", select: "title" });
        
        // const decryptedPassword = crypto.decrypt(user.password)

        if (user && crypto.decrypt(user.password) == req.body.password) {
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
            title: "email or password is incorrect",
            message: "email or password is incorrect",
          });
        }
      } else {
        //   res.status(401).send({
        //   	title: "Incorrect Email.",
        //   	message: "Email does not exist in our system, Please verify you have entered correct email."
        //   });
        const userExist = await Users.findOne({
          email: req.body.email.trim(),
          isActive: "Y",
        }).select("firstName lastName email role password");
        if (userExist) {
          const user = await Users.findOne({
            email: req.body.email.trim(),
            password: req.body.password,
            isActive: "Y",
          })
            .select("firstName lastName email role password emailSubscription")
            .populate({ path: "role", select: "title" });
          
          // const decryptedPassword = crypto.decrypt(user.password)

          if (user && crypto.decrypt(user.password) == req.body.password) {
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
              title: "email or password is incorrect",
              message: "email or password is incorrect",
            });
          }
        } else {
          res.status(401).send({
            title: "Incorrect Email.",
            message:
              "Email does not exist in our system, Please verify you have entered correct email.",
          });
        }
      }
    }
  } catch (err) {
    // emails.errorEmail(req, err);
    console.log(err);
    res.status(500).send({
      message: err.message || "Some error occurred.",
    });
  }
};

exports.create = async (req, res) => {
  try {
    const joiSchema = Joi.object({
      firstName: Joi.string().required(),
      lastName: Joi.string().required(),
      email: Joi.string().email().required(),
      password: Joi.string().min(8).max(16).required(),
      clientId: Joi.string().optional().allow(null).allow(""),
      roleId: Joi.string().optional().allow(null).allow(""),
    });
    const { error, value } = joiSchema.validate(req.body);

    if (error) {
      emails.errorEmail(req, error);

      const message = error.details[0].message.replace(/"/g, "");
      res.status(400).send({
        message: message,
      });
    } else {
      const userExists = await Users.findOne({ email: req.body.email?.trim() });

      if (userExists) {
        res.status(401).send({
          title: "Email already exists!",
          mesage: "Email already registered.",
        });
      } else {
        const userObj = {
          firstName: req.body.firstName?.trim(),
          lastName: req.body.lastName?.trim(),
          email: req.body.email,
          password: crypto.encrypt(req.body.password),
        };

        console.log(userObj);

        // let transaction = await sequelize.transaction();
        Users.create(userObj)
          .then(async (user) => {
            res.send({ message: "User created", user });
          })
          .catch(async (err) => {
            emails.errorEmail(req, err);
            res.status(500).send({
              message:
                err.message || "Some error occurred while creating the Quiz.",
            });
          });
      }
    }
  } catch (err) {
    emails.errorEmail(req, err);
    res.status(500).send({
      message: err.message || "Some error occurred.",
    });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    var email = req.body.email.trim();
    const user = await Users.findOne({ email: email }).populate("role");
    if (!user) {
      const freelancer = await Freelancers.findOne({
        email: req.body.email.trim(),
      });
      if (freelancer) {
        const userLanguage = await Language.findOne({userId: freelancer._id})
        emails.forgotPassword(freelancer, userLanguage?.language || "de");
        res.status(200).send({ message: "Email send to user." });
      } else {
        res.status(401).send({
          title: "Incorrect Email.",
          message:
            "Email does not exist in our system, Please verify you have entered correct email.",
        });
      }
    }
    console.log("user: ", user);
    if (user) {
      const userLanguage = await Language.findOne({userId: user._id})
      if (user.role.title.toLowerCase() === "projectmanger") {
        emails.forgotPasswordAdmin(user, userLanguage?.language || "de");
        res.status(200).send({ message: "Email send to user." });
      } else {
        emails.forgotPassword(user, userLanguage?.language || "de");
        res.status(200).send({ message: "Email send to user." });
      }
    } else {
      res.status(401).send({
        title: "Incorrect Email.",
        message:
          "Email does not exist in our system, Please verify you have entered correct email.",
      });
    }
  } catch (err) {
    emails.errorEmail(req, err);
    res.status(500).send({
      message: err.message || "Some error occurred while reset password.",
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const joiSchema = Joi.object({
      password: Joi.string().min(8).max(16).required(),
      confirmPassword: Joi.any().valid(Joi.ref("password")).required(),
    });
    const { error, value } = joiSchema.validate(req.body);
    if (error) {
      // emails.errorEmail(req, error);

      const message = error.details[0].message.replace(/"/g, "");
      res.status(400).send({
        message: message,
      });
    } else {
      var email = req.email.trim();
      let user = "";
      let freelancer = "";
      user = await Users.findOne({
        email: email,
        isActive: "Y",
      });
      if (!user) {
        freelancer = await Freelancers.findOne({ email: email, isActive: "Y" });
      }

      if (user) {
        var password = req.body.password;

        Users.findOneAndUpdate(
          { email: email.trim() },
          { password: password },
          { new: true }
        )
          .then((result) => {
            res.send({
              message: "User password reset successfully.",
            });
          })
          .catch((err) => {
            emails.errorEmail(req, err);
            res.status(500).send({
              message: "Error while reset User password",
            });
          });
      } else if (freelancer) {
        var password = req.body.password;

        Freelancers.findOneAndUpdate(
          { email: email.trim() },
          { password: password },
          { new: true }
        )
          .then((result) => {
            res.send({
              message: "Freelancer password reset successfully.",
            });
          })
          .catch((err) => {
            emails.errorEmail(req, err);
            res.status(500).send({
              message: "Error while reset User password",
            });
          });
      } else {
        res.status(401).send({
          title: "Incorrect Email.",
          message:
            "Email does not exist in our system, Please verify you have entered correct email.",
        });
      }
    }
  } catch (err) {
    emails.errorEmail(req, err);
    res.status(500).send({
      message: err.message || "Some error occurred while reset password.",
    });
  }
};
