import { Router } from "express"
import { param, query } from "express-validator";
import EventController from "../controllers/event"
import ValidationMiddleware from "../middleware/validation";
import ServerController from "../controllers/server";
import ContactController from "../controllers/contact";
import ApiRestriction from "../middleware/antibot/api_restriction";
import GameController from "../controllers/game";

const apiRouter = Router()

apiRouter.get("/events",
	query("with_honors").optional().isBoolean(),
	ValidationMiddleware.sendErrors,
	EventController.getEvents
)
apiRouter.get("/leaderboard",
	query("nocache").optional().isBoolean(),
	ValidationMiddleware.sendErrors,
	EventController.getLeaderboard
)
apiRouter.get("/cc-announcements", EventController.getAnnouncements)
apiRouter.get("/wl-graph",
	query("all").optional().isBoolean(),
	ValidationMiddleware.sendErrors,
	EventController.getWorldlinkGraph
)
apiRouter.get("/event-profiles/:hash",
	param("hash").isString().isLength({min: 32, max: 32}).isHexadecimal(),
	ValidationMiddleware.sendErrors,
	EventController.getPlayerEventProfile
)
apiRouter.get("/event-stats/:hash",
	param("hash").isString().isLength({min: 32, max: 32}).isHexadecimal(),
	query("chapter").optional().isInt({min: 1, max: 6}),
	ValidationMiddleware.sendErrors,
	EventController.getPlayerEventStats
)
apiRouter.get("/event-cutoff-stats/:cutoff",
	param("cutoff").isInt({min: 1, max: 100}),
	query("chapter").optional().isInt({min: 1, max: 6}),
	ValidationMiddleware.sendErrors,
	EventController.getCutoffStats
)

apiRouter.get("/time", ServerController.getServerTime)
apiRouter.get("/version",
	query("version").optional().isHexadecimal(),
	ValidationMiddleware.sendErrors,
	ServerController.getServerVersion
)

apiRouter.get("/game/maintenance", GameController.getMaintenance)

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