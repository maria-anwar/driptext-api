module.exports = (mongoose) => {
	const { Schema } = mongoose;

	const ProjectSchema = new Schema(
		{
			id: { type: Number, required: false, unique: false },
			projectName: { type: String, required: true, unique: false },
			speech: { type: String, required: false, unique: false },
			keywords: { type: String, required: false, unique: false },
			perspective: { type: String, required: false, unique: false },
			numberOfTasks: { type: String, required: false, unique: false },
			projectStatus: { type: String, required: false, default: "Not initalized", unique: false },
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
