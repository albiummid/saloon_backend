import { addMonths, addYears, isBefore } from "date-fns";
import Subscription from "../database/models/Subscription";
import SubscriptionOwner from "../database/models/SubscriptionOwner";
import { ErrorHandler } from "../middleware/error";
import { getUserById } from "./user.service";

export const getSubscriptionById = async (id: string) => {
    const data = await Subscription.findById(id);
    if (!data) throw new ErrorHandler("No data found", 404);
    return data;
};

export const giveSubscriptionToUser = async (
    userId: string,
    subscriptionId: string
) => {
    const subscription = await getSubscriptionById(subscriptionId);
    const user = await getUserById(userId);
    if (user.userType === "Client") {
        throw new ErrorHandler("Client can't buy subscription", 400);
    }
    const issuedAt = Date.now();
    return await SubscriptionOwner.create({
        userId,
        issuedAt,
        expireAt:
            subscription.renewalPeriod === "Monthly"
                ? addMonths(issuedAt, 1)
                : subscription.renewalPeriod === "Yearly"
                ? addYears(issuedAt, 1)
                : Date.now(), //immediately invalidate
    });
};

export const checkHasValidSubscription = async (userId: string) => {
    const subs = await getUserSubscription(userId);

    return isBefore(Date.now(), subs?.expireAt);
};

export const getUserSubscription = async (userId: string) => {
    const subs = await SubscriptionOwner.findOne({ userId }).sort({
        createdAt: -1,
    });
    if (!subs) {
        throw new ErrorHandler("No subscription found for this user", 400);
    }
    return subs;
};
