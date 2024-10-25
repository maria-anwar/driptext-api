module.exports = (mongoose) => {
  const { Schema } = mongoose;
  const SubscriptionSchema = new Schema(
    {
      // plan: {
      //   type: Schema.Types.ObjectId,
      //   ref: "Plan",
      //   required: true,
      //   //   unique: false,
      // },
      // user: {
      //   type: Schema.Types.ObjectId,
      //   ref: "User",
      //   required: true,
      //   //   unique: false,
      // },
      // subPlan: {
      //   type: Schema.Types.ObjectId,
      //   ref: "SubPlan",
      //   required: true,
      //   //   unique: false,
      // },
      // projectId: {
      //   type: Schema.Types.ObjectId,
      //   ref: "Project",
      //   required: true,
      // //   unique: false,
      //     },

      startDate: {
        type: Date,
        required: true,
      },
      endDate: {
        type: Date,
        required: true,
      },

      subscriptionData:{}
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

  return mongoose.model("Subscription", SubscriptionSchema);
};
