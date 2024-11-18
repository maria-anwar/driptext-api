const db = require("../../models");
const Joi = require("@hapi/joi");

const Language = db.Language;

exports.updateLanguage = async (req, res) => {
  try {
    const joiSchema = Joi.object({
      userId: Joi.string().required(),
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
    let language = "";
    language = await Language.findOne({
      userId: req.body.userId,
    });
    if (language) {
      language = await Language.findOneAndUpdate(
        { userId: req.body.userId },
        {
          language: req.body.language,
        },
        { new: true }
      );
    }

    if (!language) {
      language = await Language.create({
        userId: req.body.userId,
        language: req.body.language,
      });
    }

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
