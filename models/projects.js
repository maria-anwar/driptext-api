module.exports = (mongoose) => {
	const { Schema } = mongoose;
	const AutoIncrement = require("mongoose-sequence")(mongoose);

	const ProjectSchema = new Schema(
    {
      id: { type: Number, unique: true },
      projectId: { type: String, required: false, default: null },
      onBoarding: { type: Boolean, required: false, default: false },

      projectName: { type: String, required: true, unique: false },
      tasks: { type: Number, unique: false, required: false, default: 0 },
        speech: { type: String, required: false, unique: false, default: null },
      keywords: { type: String, required: false, unique: false, default: null },
      //   duration: { type: String, required: false, unique: false },
        perspective: { type: String, required: false, unique: false, default: null },
      //   numberOfTasks: { type: String, required: false, unique: false, default: 0 },
      projectStatus: {
        type: String,
        required: false,
        default: "Not initalized",
        unique: false,
      },
      user: { type: Schema.Types.ObjectId, ref: "User", required: true },
      projectTasks: [
        { type: Schema.Types.ObjectId, ref: "Project", default: null },
      ],
      plan: {
        type: Schema.Types.ObjectId,
        ref: "UserPlan",
        required: false,
        default: null,
      },

      isActive: {
        type: String,
        required: true,
        default: "Y",
        enum: ["Y", "N"], // Optional: restrict to only 'Y' or 'N' values
      },
    },
    {
      timestamps: true,
    }
  );
	ProjectSchema.plugin(AutoIncrement, { inc_field: "id" });

	return mongoose.model("Project", ProjectSchema);
};
