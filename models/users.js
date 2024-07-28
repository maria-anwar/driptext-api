module.exports = (mongoose) => {
	const { Schema } = mongoose;

	const UserSchema = new Schema(
		{
			email: { type: String, required: true },
			password: { type: String, required: false },
			companyName: { type: String, required: false },
			firstName: { type: String },
			lastName: { type: String },
			country: { type: String },
			phone: { type: String, required: false },
			vatIdNo: { type: String },
			role: { type: Schema.Types.ObjectId, ref: "Role", required: false },
			isSubScribed: { type: String, required: true, default: "N" },
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

	return mongoose.model("User", UserSchema);
};
