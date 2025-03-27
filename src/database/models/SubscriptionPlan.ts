import { model, Schema } from "mongoose";

// Insert table fields here
const fields = {
	name: {
		type: String,
		required: true,
	},
	recurring: {
		interval: {
			type: String,
			enums: ["month", "year", "week", "day"],
			required: true,
		},
		intervalCount: {
			type: Number,
			required: true,
		},
	},
	price: {
		amount: {
			type: Number,
			required: true,
		},
		currency: {
			type: String,
			required: true,
		},
	},
	isActive: {
		type: Boolean,
		default: true,
	},
	stripeData: {
		type: Object,
		default: null,
	},
};

// Exporting model
export default model(
	"SubscriptionPlan",
	new Schema(fields, {
		timestamps: true,
	})
);
