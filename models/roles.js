module.exports = (mongoose) => {
	const { Schema } = mongoose;
  
	const RoleSchema = new Schema({
		title: { type: String, required: true, unique: false },
		isActive: {
			type: String,
			required: true,
			default: "Y",
			enum: ["Y", "N"] // Optional: restrict to only 'Y' or 'N' values
		},
	}, {
	  toJSON: {
		transform(doc, ret) {
		  delete ret.__v;
		}
	  },
	  timestamps: true
	});
  
	return mongoose.model('Role', RoleSchema);
  };
  