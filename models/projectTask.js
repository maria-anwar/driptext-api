module.exports = (mongoose) => {
  const { Schema } = mongoose;
  const AutoIncrement = require("mongoose-sequence")(mongoose);

  const ProjectTaskSchema = new Schema(
    {
      taskId: { type: Number, unique: true },
      status: {
        type: String,
        required: true,
        default: "Ready to Start",
      },
      keywords: { type: String, required: false, unique: false },
      dueDate: { type: String, required: false, unique: false },
      topic: { type: String, required: false, unique: false },
      type: { type: String, required: false, unique: false },
      desiredNumberOfWords: { type: String, required: false, unique: false },
      actualNumberOfWords: { type: String, required: false, unique: false },
      googleLink: { type: String, required: false, unique: false },
      comments: { type: String, required: false, unique: false },
      published: { type: Boolean, required: false, default: false },
      assignedTexter: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: false,
      },
      assignedLector: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: false,
      },
      project: { type: Schema.Types.ObjectId, ref: "Project", required: false },
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
  ProjectTaskSchema.plugin(AutoIncrement, { inc_field: "taskId" });
  // ProjectTaskSchema.plugin(AutoIncrement, { inc_field: "tasks" });

  return mongoose.model("ProjectTask", ProjectTaskSchema);
};
