const { required } = require("joi");

module.exports = (mongoose) => {
	const { Schema } = mongoose;

	const Company = new Schema(
		{
			companyBackgorund: { type: String, required: false },
			companyAttributes: { type: String, required: true },
			comapnyServices: { type: String, required: false },
			customerContent: { type: String, required: false },
			customerIntrest: { type: String, required: false },
			contentPurpose: { type: String, required: false },
			contentInfo: { type: String, required: false },
			user: { type: Schema.Types.ObjectId, ref: "User", required: true },
			isActive: {
				type: String,
				required: true,
				default: "Y",
				enum: ["Y", "N"] // Optional: restrict to only 'Y' or 'N' values
			}
		},
		{
			timestamps: true
		}
	);

	return mongoose.model("Company", Company);
};
