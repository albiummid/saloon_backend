import Appointment from "../database/models/Appointment";
import Payment from "../database/models/Payment";
import PaymentIntent from "../database/models/PaymentIntent";
import ProviderService from "../database/models/ProviderService";
import User from "../database/models/User";
import {
	generatePaymentIntent,
	getPaymentIntentStatus,
	getStatusMessage,
	stripe,
} from "../libraries/stripe";
import { handleAsyncHttp } from "../middleware/controller";
import {
	acceptAppointmentById,
	getAppointmentPaymentAmount,
} from "../service/appointment.service";
import { getPaymentById } from "../service/payment.service";
import {
	checkHasValidSubscription,
	getSubscriptionById,
	giveSubscriptionToUser,
} from "../service/subscription.service";

export const handleCreateAppointmentPaymentIntent = handleAsyncHttp(
	async (req, res) => {
		const { appointmentId, currency } = req.body;

		const appointment = await Appointment.findById(appointmentId, null, {
			populate: [
				"providerId",
				"clientId",
				"providerServiceId",
				"paymentId",
			],
		});
		if (!appointment) {
			return res.error("Appointment not found", 400);
		}

		const { totalAmount, dueAmount, payAmount } =
			await getAppointmentPaymentAmount(appointmentId);

		let payment: any = appointment.paymentId;

		if (!payment) {
			payment = await Payment.create({
				appointmentId,
				currency,
				totalAmount,
				providerServiceId: appointment.providerServiceId?._id,
				dueAmount,
				paymentMode:
					appointment.paymentMode === "Pre-deposit"
						? "Pre-deposit"
						: "Regular",
			});
			appointment.paymentId = payment._id;
			await appointment.save();
		}
		const intent = await generatePaymentIntent(Math.round(payAmount * 100), currency, {
			// transfer_data: {
			//     destination: provider.providerSettings?.stripeAccountId,
			// },
		});

		return res.success("Payment intent created", {
			clientSecret: intent.client_secret,
			payment,
			intentId: intent.id,
		});
	}
);

export const handleSuccessfulAppointmentPayment = handleAsyncHttp(
	async (req, res) => {
		const { paymentId, stripeData, intentId } = req.body;
		const payment = await getPaymentById(paymentId);
		const paymentIntent = await getPaymentIntentStatus(intentId);
		if (paymentIntent.status !== "succeeded") {
			return res.error("Payment is not successful");
		}

		if (payment.status === "Pending") {
			payment.status =
				payment.paymentMode === "Pre-deposit" ? "Ongoing" : "Paid";
			payment.successfulPayments.push({
				amount: paymentIntent.amount,
				stripeData,
			});
		} else if (payment.status === "Ongoing") {
			// 2nd phase of payment
			payment.status = "Paid";
			payment.successfulPayments.push({
				amount: paymentIntent.amount,
				stripeData,
			});
		}
		await payment.save();
		await acceptAppointmentById(payment.appointmentId.toString());

		res.success(
			"Payment successful",
			{
				payment,
				appointment: await Appointment.findById(payment.appointmentId),
			},
			200
		);
	}
);

export const handleCreateSubscriptionPlanPaymentIntent = handleAsyncHttp(
	async (req, res) => {
		const { subscriptionId, currency, userId } = req.body;
		if (!subscriptionId) {
			console.error("!subscriptionId")
		}
		if (!currency) {
			console.error("!currency")
		}
		if (!userId) {
			console.error("!userId")
		}
		const userSubscription = await checkHasValidSubscription(userId);
		if (userSubscription.isValid) {
			return res.error("User already has a valid subscription", 400);
		}
		const subscriptionPlan = await getSubscriptionById(subscriptionId); //subPlan
		const price = (subscriptionPlan.price?.amount as number) * 100;
		const intent = await generatePaymentIntent(price, currency);
		const paymentIntent = await PaymentIntent.create({
			amount: price,
			amountCurrency: currency,
			intentData: intent,
			userId,
		});
		res.success("Intent", paymentIntent, 200);
	}
);

export const handleSuccessfulSubscriptionPayment = handleAsyncHttp(
	async (req, res) => {
		const { intentId, userId, subscriptionId } = req.body;

		const paymentIntent = await PaymentIntent.findById(intentId);

		const stripeIntent = await getPaymentIntentStatus(
			paymentIntent?.intentData.id
		);
		await PaymentIntent.findByIdAndUpdate(paymentIntent?._id, {
			status: stripeIntent.status,
			intentData: stripeIntent,
		});
		if (stripeIntent.status === "succeeded") {
			const subs = await giveSubscriptionToUser(
				userId,
				subscriptionId,
				intentId
			);
			res.success(getStatusMessage(stripeIntent.status), subs);
		} else {
			res.success(
				getStatusMessage(stripeIntent.status),
				paymentIntent,
				400
			);
		}
	}
);

export const handleCreateCheckoutSession = handleAsyncHttp(async (req, res) => {
	const { priceId, customerEmail } = req.body;
	const session = await stripe.checkout.sessions.create({
		payment_method_types: ["card"],
		mode: "subscription", // Change to "payment" for one-time services
		customer_email: customerEmail,
		line_items: [
			{
				price: priceId, // Use a Stripe Price ID for subscriptions
				quantity: 1,
			},
		],
		success_url: "https://albi.netlify.app/payment-success",
		cancel_url: "https://albi.netlify.app/payment-failed",
	});

	res.success("success", { sessionId: session.id, url: session.url });
});
