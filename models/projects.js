module.exports = (mongoose) => {
	const { Schema } = mongoose;

	const ProjectSchema = new Schema(
		{
			id: { type: Number, required: true, unique: true },
			projectName: { type: String, required: true },
			speech: { type: String, required: false },
			perspective: { type: String, required: false },
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

	return mongoose.model("Project", ProjectSchema);
};
