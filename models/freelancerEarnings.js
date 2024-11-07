module.exports = (mongoose) => {
  const { Schema } = mongoose;

  const freelancersEarningsSchema = new Schema(
    {
      freelancer: {
        type: Schema.Types.ObjectId,
        ref: "Freelancer",
        required: false,
        default: null,
      },
      project: { type: Schema.Types.ObjectId, ref: "Project", required: false },
      task: {
        type: Schema.Types.ObjectId,
        ref: "ProjectTask",
        required: false,
      },
      role: { type: String, required: false, unique: false, default: null },
      date: { type: Date, required: false, unique: false, default: null },
      finishedDate: { type: Date, required: false, unique: false, default: null },

      finishedDate: {
        type: Date,
        required: false,
        unique: false,
        default: null,
      },
      billedWords: {
        type: Number,
        required: false,
        unique: false,
        default: null,
      },
      difference: {
        type: Number,
        required: false,
        unique: false,
        default: null,
      },
      price: { type: Number, required: false, unique: false, default: null },
      finalize: {
        type: Boolean,
        required: false,
        unique: false,
        default: false,
      },

      isActive: {
        type: String,
        required: true,
        default: "Y",
        enum: ["Y", "N"], // Optional: restrict to only 'Y' or 'N' values
      },
    },
    {
      toJSON: {
        transform(doc, ret) {
          delete ret.__v;
        },
      },
      timestamps: true,
    }
  );

  return mongoose.model("FreelancerEarning", freelancersEarningsSchema);
};
