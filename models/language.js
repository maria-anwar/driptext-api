module.exports = (mongoose) => {
  const { Schema } = mongoose;

  const LanguageSchema = new Schema(
    {
      user: { type: Schema.Types.ObjectId, ref: "User", required: true },
      language: { type: String, required: false, unique: false, default: "German" },
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

  return mongoose.model("Language", LanguageSchema);
};
