module.exports = (mongoose) => {
  const { Schema } = mongoose;

  const RoleSchema = new Schema(
    {
      texter: { type: Number, required: true, unique: false },
      lector: { type: Number, required: true, unique: false },
      seoOptimizer: { type: Number, required: true, unique: false },
      metaLector: { type: Number, required: true, unique: false },

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

  return mongoose.model("FreelancerPrice", RoleSchema);
};
