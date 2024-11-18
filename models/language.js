module.exports = (mongoose) => {
  const { Schema } = mongoose;

  const LanguageSchema = new Schema(
    {
      userId: {
        type: String,
        required: true,
        unique: false,
        // default: "German",
      },

      language: {
        type: String,
        required: true,
        unique: false,
        // default: "German",
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

  return mongoose.model("Language", LanguageSchema);
};
