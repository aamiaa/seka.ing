import { Router } from "express"
import { query } from "express-validator";
import EventController from "../controllers/event"
import ValidationMiddleware from "../middleware/validation";
import TimeController from "../controllers/time";
import ContactController from "../controllers/contact";
import ApiRestriction from "../middleware/antibot/api_restriction";

const apiRouter = Router()

apiRouter.get("/events", EventController.getEvents)
apiRouter.get("/leaderboard",
	query("nocache").optional().isBoolean(),
	EventController.getLeaderboard
)
apiRouter.get("/cc-announcements", EventController.getAnnouncements)
apiRouter.get("/wl-graph",
	query("all").optional().isBoolean(),
	EventController.getWorldlinkGraph
)

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

apiRouter.get("/contact",
	ApiRestriction.protectApi({
		require_browser_ua: true,
		require_browser_headers: true,
		require_referer: true,
		require_sec_fetch: true,
		require_accept: true
	}),
	ContactController.getContactInfo.bind(ContactController)
)

export default apiRouter