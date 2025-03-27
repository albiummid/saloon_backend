import { createSubscriptionPlan } from "../service/subscription.service";
import Subscription from "./models/SubscriptionPlan";
const defaultSubs = [
	{
		name: "Bronze",
		recurring: {
			interval: "month",
			intervalCount: 1,
		},
		price: {
			amount: 13.99,
			currency: "eur",
		},
	},
	{
		name: "Gold",
		recurring: {
			interval: "month",
			intervalCount: 3,
		},
		price: {
			amount: 50,
			currency: "eur",
		},
	},
	{
		name: "Diamond",
		recurring: {
			interval: "month",
			intervalCount: 6,
		},
		price: {
			amount: 100,
			currency: "eur",
		},
	},
	{
		name: "Platinum",
		recurring: {
			interval: "year",
			intervalCount: 1,
		},
		price: {
			amount: 210,
			currency: "eur",
		},
	},
];
export const seedDatabase = async () => {
	let subscription = await Subscription.find({ isActive: true });
	if (subscription.length === 0) {
		console.log("SEEDING_STARTED...");
		for (let item of defaultSubs) {
			await createSubscriptionPlan(item as any);
		}
		console.log("...SEEDING_COMPLETED");
	}
};
