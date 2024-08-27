const { ref, required } = require("joi");

module.exports = (mongoose) => {
  const { Schema } = mongoose;

  const UserSchema = new Schema(
    {
      plan: {
        type: Schema.Types.ObjectId,
        ref: "Plan",
        required: false,
        unique: false,
        default: null,
      },
      user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      subPlan: {
        type: Schema.Types.ObjectId,
        ref: "SubPlan",
        required: false,
        unique: false,
        default: null,
      },
      project: {
        type: Schema.Types.ObjectId,
        ref: "Project",
        required: false,
      },
      subscription: {
        type: Schema.Types.ObjectId,
        ref: "Subscription",
        required: false,
        unique: false,
        default: null,
      },
      startDate: {
        type: Date,
        default: null,
      },
      endDate: {
        type: Date,
        default: null,
      },
      totalTexts: {
        type: Number,
        default: 0,
      },
      duration: {
        type: Number,
        default: null,
      },
      textsCount: {
        type: Number,
        default: 0,
      },
      textsRemaining: {
        type: Number,
        default: 0,
      },
      tasksPerMonth: {
        type: Number,
        default: 0,
      },
      tasksPerMonthCount: {
        type: Number,
        default: 0,
      },
      endMonthDate: {
        type: Date,
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
      toJSON: {
        transform(doc, ret) {
          delete ret.password;
          delete ret.salt;
          delete ret.__v;
        },
      },
      timestamps: true,
    }
  );

  return mongoose.model("UserPlan", UserSchema);
};
