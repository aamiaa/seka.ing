import { Router } from "express"
import { query } from "express-validator";
import EventController from "../controllers/event"
import ValidationMiddleware from "../middleware/validation";
import TimeController from "../controllers/time";

const apiRouter = Router()

apiRouter.get("/events", EventController.getEvents)
apiRouter.get("/leaderboard", EventController.getLeaderboard)
apiRouter.get("/cc-announcements", EventController.getAnnouncements)
apiRouter.get("/wl-graph", EventController.getWorldlinkGraph)

apiRouter.get("/time", TimeController.getServerTime)

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