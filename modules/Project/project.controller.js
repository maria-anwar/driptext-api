const Joi = require("@hapi/joi");

const db = require("../../models");
const encryptHelper = require("../../utils/encryptHelper");
const emails = require("../../utils/emails");
const crypto = require("../../utils/crypto");
const dayjs = require("dayjs");

const Users = db.User;
const UserPlan = db.UserPlan;
const Roles = db.Role;
const Project = db.Project;
const ProjectTask = db.ProjectTask;
const Freelancers = db.Freelancer;
const Company = db.Company;


exports.create = async (req, res) => {
  try {
    const joiSchema = Joi.object({
      projectName: Joi.string().required(),
      id: Joi.string().required(),
      keywords: Joi.string().required(),
      userId: Joi.string().required(),
      numberOfTasks: Joi.string().required(),
      projectStatus: Joi.string().optional().allow(null).allow(""),
      speech: Joi.string().optional().allow(null).allow(""),
      perspective: Joi.string().optional().allow(null).allow(""),
    });
    const { error, value } = joiSchema.validate(req.body);

    if (error) {
      emails.errorEmail(req, error);

      const message = error.details[0].message.replace(/"/g, "");
      res.status(400).send({
        message: message,
      });
    } else {
      const userExists = await Users.find({
        _id: req.body.userId,
        isActive: "Y",
      }).populate("role");
      if (!userExists) {
        res.send({ message: "User Not Found" });
      } else {
        let projectObj = {
          projectName: req.body.projectName,
          keywords: req.body.keywords,
          user: req.body.userId,
          projectStatus: req.body.projectStatus,
          speech: req.body.speech ? req.body.speech : "",
          perspective: req.body.perspective ? req.body.perspective : "",
        };
        if (userExists.role.title == "Leads") {
          projectObj.numberOfTasks;

          Project.create(projectObj).then((response) => {
            // let projectTaskObj={
            // }
          });
        }
        const projectName = req.body.projectName;
        const id = req.body.id;
      }
    }
  } catch (err) {
    emails.errorEmail(req, err);
    res.status(500).send({
      message: err.message || "Some error occurred.",
    });
  }
};

exports.updateOnBoarding = async (req, res) => {
  try {
     const joiSchema = Joi.object({
       projectId: Joi.string().required(),
       speech: Joi.string().required(),
       prespective: Joi.string().required(),
       companyBackgorund: Joi.string().optional().allow("").allow(null),
       companyAttributes: Joi.string().optional().allow("").allow(null),
       comapnyServices: Joi.string().optional().allow("").allow(null),
       customerContent: Joi.string().optional().allow("").allow(null),
       customerIntrest: Joi.string().optional().allow("").allow(null),
       contentPurpose: Joi.string().optional().allow("").allow(null),
       contentInfo: Joi.string().optional().allow("").allow(null),
     });
     const { error, value } = joiSchema.validate(req.body);

     if (error) {
       // emails.errorEmail(req, error);

       const message = error.details[0].message.replace(/"/g, "");
       res.status(401).send({
         message: message,
       });
       return;
     }
    
     const updatedProject = await Project.findOneAndUpdate(
       { _id: req.body.projectId },
       {
         // projectId: projId,
         speech: req.body.speech,
         prespective: req.body.prespective,
       },
       { new: true }
     );
    
     const updatedonBoardingInfo = await Company.findOneAndUpdate(
       { _id: updatedProject.onBoardingInfo },
       {
         companyBackgorund: req.body.companyBackgorund,
         companyAttributes: req.body.companyAttributes,
         comapnyServices: req.body.comapnyServices,
         customerContent: req.body.customerContent,
         customerIntrest: req.body.customerIntrest,
         contentPurpose: req.body.contentPurpose,
         contentInfo: req.body.contentInfo,
       },
       { new: true }
     );
    
    res.status(200).send({message: "Success"})
    
  } catch (error) {
    res.status(500).send({message: error?.message || "Something went wrong"})
  }
}

exports.detail = async (req, res) => {
  try {
    const joiSchema = Joi.object({
      userId: Joi.string().required(),
    });
    const { error, value } = joiSchema.validate(req.body);

    if (error) {
      // emails.errorEmail(req, error);

      const message = error.details[0].message.replace(/"/g, "");
      res.status(401).send({
        message: message,
      });
    } else {
      const userId = req.body.userId;
      const isFreelancer = await Freelancers.findOne({ _id: userId });

      if (isFreelancer) {
        res
          .status(500)
          .json({ message: "This email already exists as freelancer" });
        return;
      }

      Users.find({ _id: userId })
        .populate({
          path: "projects",
          populate: [
            {
              path: "plan",
            },
            {
              path: "onBoardingInfo",
            },
          ],
        })
        .select("email firstName isSubScribed lastName")
        .then(async (response) => {
          res.send({ message: "List of the client projects", data: response });
        })
        .catch((err) => {
          res.status(500).send({
            message: err.message || "Some error occurred.",
          });
        });
    }
  } catch (err) {
    // emails.errorEmail(req, err);
    res.status(500).send({
      message: err.message || "Some error occurred.",
    });
  }
};

exports.checkBeforeCreate = async (req, res) => {
  try {
    const joiSchema = Joi.object({
      userId: Joi.string().required(),
      projectName: Joi.string().required(),
    });
    const { error, value } = joiSchema.validate(req.body);

    if (error) {
      // emails.errorEmail(req, error);

      const message = error.details[0].message.replace(/"/g, "");
      res.status(401).send({
        message: message,
      });
      return;
    }
    const project = await Project.findOne({
      user: req.body.userId,
      projectName: req.body.projectName,
    }).populate("plan");
    if (
      project &&
      project.plan.subscription &&
      dayjs(new Date()).isBefore(dayjs(project.plan.endDate, "day"))
    ) {
      res
        .status(500)
        .send({ message: "This Project's Subscription Already Exists" });
      return;
    }

    res.status(200).send({ message: "success" });
  } catch (error) {
    res.status(500).send({ message: error.message || "Something went wrong" });
  }
};
