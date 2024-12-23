const roles = require("./roles");
const dayjs = require("dayjs");

module.exports = (mongoose) => {
  const { Schema } = mongoose;

  const RoleSchema = new Schema(
    {
      freelancer: {
        type: Schema.Types.ObjectId,
        ref: "Freelancer",
        required: false,
        default: null,
      },
      role: { type: String, require: true },
      deadlineTasks: {
        type: [
          {
            date: { type: Date, default: dayjs().startOf("day").toDate() },
            task: { type: Schema.Types.ObjectId, ref: "ProjectTask" },
          },
        ],
        default: [], // Set default as an empty array
      },
      returnTasks: {
        type: [
          {
            date: { type: Date, default: dayjs().startOf("day").toDate() },
            task: { type: Schema.Types.ObjectId, ref: "ProjectTask" },
          },
        ],
        default: [], // Set default as an empty array
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

  return mongoose.model("TrafficLight", RoleSchema);
};
