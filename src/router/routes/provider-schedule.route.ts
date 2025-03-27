import { Router } from "express";
import {
	handleGetProviderScheduleList,
	handleSaveProviderSchedule,
} from "../../controllers/provider-schedule.controller";

export const providerScheduleRouter = Router();
providerScheduleRouter.get("/list", handleGetProviderScheduleList);
providerScheduleRouter.post("/save", handleSaveProviderSchedule);
