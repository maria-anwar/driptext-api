const { required } = require("joi");

module.exports = (mongoose) => {
	const { Schema } = mongoose;

    const paymentMethod = new Schema({
        type: {type:String, required: false},
        reference_id: {type: String, required: false},
        gateway: {type: String, required: false},
        gateway_account_id: {type: String, required: false},
        status: {type: String, required: false}
    })

    const subscriptionItem = new Schema({
        item_price_id: {type: String, required: false},
        item_type: {type: String, required: false},
        quantity: {type: String, required: false},
        unit_price: {type: String, required: false},
        amount: {type: String, required: false},
        current_term_start: {type: String, required: false},
        current_term_end: {type: String, required: false},
        next_billing_at: {type: String, required: false},
        free_quantity: {type: String, required: false}
    })

	const Billing = new Schema(
		{
            userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
			subscriptionId: {type: String, required: false},
            subscriptionStatus: {type: String, required: false},
            subscriptionItem: [{subscriptionItem}],
            customer_id: {type: String, required: false},
            customer_first_name: {type: String, required: false},
            customer_last_name: {type: String, required: false},
            customer_email: {type: String, required: false},
            payment_method: paymentMethod,
		},
		{
			timestamps: true
		}
	);

	return mongoose.model("Billing", Billing);
};
