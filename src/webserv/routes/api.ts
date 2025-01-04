import { Router } from "express"
import { query } from "express-validator";
import EventController from "../controllers/event"
import ValidationMiddleware from "../middleware/validation";

const apiRouter = Router()

apiRouter.get("/leaderboard", EventController.getLeaderboard)

apiRouter.get("/cc-announcements", EventController.getAnnouncements)

apiRouter.get("/prediction",
	query("rank").isInt({min: 1, max: 100}),
	query("worldlink").optional().isBoolean(),
	ValidationMiddleware.sendErrors,
	EventController.getPrediction
)

apiRouter.get("/matches",
	query("hash").isLength({min: 16}).isHexadecimal(),
	query("worldlink").optional().isBoolean(),
	ValidationMiddleware.sendErrors,
	EventController.getUserMatchesCount
)

export default apiRouter