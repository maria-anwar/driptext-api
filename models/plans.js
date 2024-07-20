const { required } = require("joi");

module.exports = (mongoose) => {
	const { Schema } = mongoose;

	const PlanSchema = new Schema(
		{
			title: { type: String, required: false },
			value: { type: Number, required: true },
			texts: { type: Number, required: false },
			subplan: [{ type: Schema.Types.ObjectId, ref: "SubPlan", required: true }],
			isActive: {
				type: String,
				required: true,
				default: "Y",
				enum: ["Y", "N"] // Optional: restrict to only 'Y' or 'N' values
			}
		},
		{
			toJSON: {
				transform(doc, ret) {
					delete ret.password;
					delete ret.salt;
					delete ret.__v;
				}
			},
			timestamps: true
		}
	);

	return mongoose.model("Plan", PlanSchema);
};
