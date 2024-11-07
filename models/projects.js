module.exports = (mongoose) => {
  const { Schema } = mongoose;
  const AutoIncrement = require("mongoose-sequence")(mongoose);

  const ProjectSchema = new Schema(
    {
      id: { type: Number, unique: true },
      projectId: { type: String, required: false, default: null },
      onBoarding: { type: Boolean, required: false, default: false },
      workStarted: { type: Boolean, required: false, default: false },
      projectName: { type: String, required: true, unique: false },
      tasks: { type: Number, unique: false, required: false, default: 0 },
      speech: { type: String, required: false, unique: false, default: null },
      keywords: { type: String, required: false, unique: false, default: null },
      folderLink: {
        type: String,
        required: false,
        unique: false,
        default: null,
      },
      folderId: { type: String, required: false, unique: false, default: null },
      onBoardingInfo: {
        type: Schema.Types.ObjectId,
        ref: "Company",
        required: false,
        default: null,
      },
      openTasks: { type: Number, required: false, default: 0 },
      finalTasks: { type: Number, required: false, default: 0 },
      //   duration: { type: String, required: false, unique: false },
      prespective: {
        type: String,
        required: false,
        unique: false,
        default: null,
      },
      //   numberOfTasks: { type: String, required: false, unique: false, default: 0 },
      projectStatus: {
        type: String,
        required: false,
        default: "Not initalized",
        unique: false,
      },
      user: { type: Schema.Types.ObjectId, ref: "User", required: true },
      projectTasks: [
        { type: Schema.Types.ObjectId, ref: "ProjectTask", default: null },
      ],
      plan: {
        type: Schema.Types.ObjectId,
        ref: "UserPlan",
        required: false,
        default: null,
      },
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
      // boardingInfo: {
      //   type: Schema.Types.ObjectId,
      //   ref: "Company",
      //   required: false,
      //   default: null,
      // },

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
