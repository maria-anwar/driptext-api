module.exports = (mongoose) => {
  const { Schema } = mongoose;
  const AutoIncrement = require("mongoose-sequence")(mongoose);

  const ProjectTaskSchema = new Schema(
    {
      taskName: { type: String, unique: true, default: null },
      status: {
        type: String,
        required: true,
        default: "Ready to Start",
      },
      keywords: { type: String, required: false, unique: false, default: null },
      dueDate: { type: String, required: false, unique: false, default: null },
      topic: { type: String, required: false, unique: false, default: null },
      type: { type: String, required: false, unique: false, default: null },
      desiredNumberOfWords: {
        type: String,
        required: false,
        unique: false,
        default: null,
      },
      actualNumberOfWords: {
        type: String,
        required: false,
        unique: false,
        default: null,
      },
      googleLink: {
        type: String,
        required: false,
        unique: false,
        default: null,
      },
      comments: { type: String, required: false, unique: false, default: null },
      published: { type: Boolean, required: false, default: false },
      readyToWork: { type: Boolean, required: false, default: false },
      texter: {
        type: Schema.Types.ObjectId,
        ref: "Freelancer",
        required: false,
        default: null,
      },
      lector: {
        type: Schema.Types.ObjectId,
        ref: "Freelancer",
        required: false,
        default: null,
      },
      seo: {
        type: Schema.Types.ObjectId,
        ref: "Freelancer",
        required: false,
        default: null,
      },
      metaLector: {
        type: Schema.Types.ObjectId,
        ref: "Freelancer",
        required: false,
        default: null,
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
