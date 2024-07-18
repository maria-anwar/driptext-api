module.exports = (mongoose) => {
	const { Schema } = mongoose;

	const SubPlanSchema = new Schema(
		{
			title: { type: String, required: false },
			duration: { type: Number, required: false },
			price: { type: String, required: false },
			texts: { type: Number, required: false },
			plan: { type: Schema.Types.ObjectId, ref: "Plan", required: false },

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

	return mongoose.model("SubPlan", SubPlanSchema);
};
