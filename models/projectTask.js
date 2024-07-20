const { required } = require("joi");

module.exports = (mongoose) => {
	const { Schema } = mongoose;

	const ProjectTaskSchema = new Schema(
		{
			id: { type: Number, required: true, unique: true },
			tasks: { type: String, required: true },
			status: {
				type: String,
				required: true,
				default: "ready to start"
			},
			keywords: { type: String, required: false },
			dueDate: { type: String, required: false },
			project: { type: Schema.Types.ObjectId, ref: "Project", required: true },
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
