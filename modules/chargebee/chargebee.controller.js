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
    const now = new Date();

    // Get the date components
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0"); // Months are 0-based
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    const milliseconds = String(now.getMilliseconds()).padStart(3, "0");

    // Generate a random component
    const randomComponent = Math.random().toString(36).substring(2, 10); // Random alphanumeric string

    // Combine components into an ID
    const uniqueId = `${year}${month}${day}${hours}${minutes}${seconds}${milliseconds}-${randomComponent}`;
  
    const result = await chargebee.hosted_page
      .checkout_new_for_items({
        subscription: {
          cf_subscription: uniqueId, // Add the custom field under the subscription object
        },
        subscription_items: [
          {
            item_price_id: "3-months-4-texts-EUR-Every-3-months",
            quantity: 1,
          },
        ],
        customer: {
          first_name: firstName,
          last_name: lastName,
          email: email,
          // cf_subscription: uniqueId,
        },
      })
      .request();

    console.log("Payment intent created:", result.hosted_page);
    res.json(result.hosted_page);
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).send('Internal Server Error');
  }
};
