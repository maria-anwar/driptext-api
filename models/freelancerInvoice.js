module.exports = (mongoose) => {
  const { Schema } = mongoose;

  const FreelancerInvoiceSchema = new Schema(
    {
      freelancer: { type: String, default: null },
      invoiceSheet: { type: String, default: null },
          tasksSheet: { type: String, default: null },
      count: {type: Number}
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

  return mongoose.model("FreelancerInvoice", FreelancerInvoiceSchema);
};
