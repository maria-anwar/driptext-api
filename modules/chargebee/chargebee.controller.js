const chargebee = require("../../config/chargebee.js");
const Joi = require("@hapi/joi");

exports.createPaymentIntent = async (req, res) => {
  try {
    console.log("Request Body:", req.body);

    const schema = Joi.object({
      id: Joi.string().required(),
      firstName: Joi.string().required(),
      lastName: Joi.string().required(),
      email: Joi.string().email().required()
    });
    console.log("15")
    const { error, value } = schema.validate(req.body);
    console.log("15")
    if (error) {
      const message = error.details[0].message.replace(/"/g, "");
      return res.status(400).send({ message });
    }

    const { id, firstName, lastName, email } = value;
    console.log("khfhds")
    const result = await chargebee.hosted_page.checkout_new_for_items({
      subscription_items: [
        {
          item_price_id:  "cbdemo_advanced-USD-monthly",
          quantity: 1
        }
      ],
      customer: {
        first_name: firstName,
        last_name: lastName,
        email: email
      }
    }).request();

    console.log("Payment intent created:", result.hosted_page);
    res.json(result.hosted_page);
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).send('Internal Server Error');
  }
};
