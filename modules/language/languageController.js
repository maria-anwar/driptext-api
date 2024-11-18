const db = require("../../models");
const Joi = require("@hapi/joi");

const Language = db.Language;

exports.addLanguage = async (req, res) => {
  try {
    const joiSchema = Joi.object({
      userId: Joi.string().required(),
      // pass: Joi.string().optional().default(""),
      language: Joi.string().required(),
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
    const alreadyExists = await Language.findOne({ userId: req.body.userId });
    if (alreadyExists) {
      res.status(500).send({ message: "This user language is already exists" });
      return;
    }
    const language = await Language.create({
      user: req.body.userId,
      language: req.body.language,
    });
    res.status(200).send({ message: "Success", language: language });
  } catch (error) {
    res.status(500).send({ message: error.message || "Something went wrong" });
  }
};

exports.updateLanguage = async (req, res) => {
  try {
    const joiSchema = Joi.object({
      userId: Joi.string().required(),
      // pass: Joi.string().optional().default(""),
      language: Joi.string().required(),
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

    const language = await Language.findOne({
      userId: req.body.userId,
    });
    if (!language) {
      res.status(500).send({ message: "Language Not found" });
      return;
    }
    const updatedLanguage = await Language.findOneAndUpdate(
      { userId: req.body.userId },
      {
        language: req.body.language,
      },
      { new: true }
    );
    res.status(200).send({ message: "Success", language: language });
  } catch (error) {
    res.status(500).send({ message: error.message || "Something went wrong" });
  }
};

exports.getLanguage = async (req, res) => {
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
      return;
    }

    const language = await Language.findOne({
      userId: req.body.userId,
    });
    if (!language) {
      res.status(500).send({ message: "Language Not found" });
      return;
    }

    res.status(200).send({ message: "Success", language: language });
  } catch (error) {
    res.status(500).send({ message: error.message || "Something went wrong" });
  }
};
