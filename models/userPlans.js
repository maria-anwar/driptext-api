const { ref, required } = require("joi");

module.exports = (mongoose) => {
	const { Schema } = mongoose;

	const UserSchema = new Schema(
		{
			plan: { type: Schema.Types.ObjectId, ref: "Plan", required: false, unique: false },
			user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: false },
			subPlan: { type: Schema.Types.ObjectId, ref: "SubPlan", required: false, unique: false },
			projectId: { type: Schema.Types.ObjectId, ref: "Project", required: false, unique: false },
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

	return mongoose.model("UserPlan", UserSchema);
};
