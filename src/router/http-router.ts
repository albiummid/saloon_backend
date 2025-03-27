import { Router } from "express";
import { authenticateJWT } from "../middleware/auth";
import { appointmentRouter } from "./routes/appointment.route";
import { authRouter } from "./routes/auth.route";
import { chatRouter } from "./routes/chat.route";
import { fileUploadRouter } from "./routes/file-upload.route";
import { paymentRouter } from "./routes/payment.router";
import { providerScheduleRouter } from "./routes/provider-schedule.route";
import { providerServiceRouter } from "./routes/provider-service.route";
import { subscriptionRouter } from "./routes/subscription.route";
import { userNotificationRouter } from "./routes/user-notification.route";
import { userRestrictionRouter } from "./routes/user-restriction.route";
import { userRouter } from "./routes/user.route";

const rootRouter = Router();

// V1 Router
export const v1Router = Router();

v1Router.use("/auth", authRouter);
v1Router.use("/user", userRouter);
v1Router.use("/user-restriction", userRestrictionRouter);
v1Router.use("/provider-service", providerServiceRouter);
v1Router.use("/file-upload", fileUploadRouter);
v1Router.use("/chat", chatRouter);
v1Router.use("/provider-schedule", providerScheduleRouter);
v1Router.use("/appointment", appointmentRouter);
v1Router.use("/payment", paymentRouter);
v1Router.use("/subscription", subscriptionRouter);
v1Router.use("/user-notification", userNotificationRouter);

// health check
v1Router.get("/health-check", (req, res) => {
	res.status(200).json({
		success: true,
		status: "OK",
	});
});

// Register version specific router
rootRouter.use("/api/v1", authenticateJWT, v1Router);
export default rootRouter;
