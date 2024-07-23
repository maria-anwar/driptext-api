module.exports = (mongoose) => {
	const { Schema } = mongoose;

	const ProjectTaskSchema = new Schema(
		{
			id: { type: Number, required: true, unique: false },
			tasks: { type: String, required: false, unique: false },
			status: {
				type: String,
				required: true,
				default: "ready to start"
			},
			keywords: { type: String, required: false, unique: false },
			dueDate: { type: String, required: false, unique: false },
			topic: { type: String, required: false, unique: false },
			type: { type: String, required: false, unique: false },
			desiredNumberOfWords: { type: String, required: false, unique: false },
			actualNumberOfWords: { type: String, required: false, unique: false },
			googleLink: { type: String, required: false, unique: false },
			comments: { type: String, required: false, unique: false },
			assignedTexter: { type: Schema.Types.ObjectId, ref: "User", required: false },
			assignedLector: { type: Schema.Types.ObjectId, ref: "User", required: false },
			project: { type: Schema.Types.ObjectId, ref: "Project", required: false },
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

	return mongoose.model("ProjectTask", ProjectTaskSchema);
};
