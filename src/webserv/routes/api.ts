import { Router } from "express"
import { param, query } from "express-validator";
import EventController from "../controllers/event"
import ValidationMiddleware from "../middleware/validation";
import ServerController from "../controllers/server";
import ContactController from "../controllers/contact";
import ApiRestriction from "../middleware/antibot/api_restriction";
import GameController from "../controllers/game";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

function rl({limit, per}: {limit: number, per: number}) {
	return rateLimit({
		windowMs: per * 1000,
		limit,
		message: {
			error: "Too many requests."
		},
		keyGenerator: req => ipKeyGenerator(req.cfIp ?? req.ip)
	})
}

const apiRouter = Router()

apiRouter.get("/events",
	query("with_honors").optional().isBoolean(),
	ValidationMiddleware.sendErrors,
	rl({limit: 10, per: 10}),
	EventController.getEvents
)
apiRouter.get("/leaderboard",
	query("nocache").optional().isBoolean(),
	ValidationMiddleware.sendErrors,
	EventController.getLeaderboard
)
apiRouter.get("/events/:eventId/leaderboard",
	param("eventId").custom(x => x === "now" || /^\d+$/.test(x)),
	query("timestamp").optional().isISO8601(),
	query("nocache").optional().isBoolean(),
	ValidationMiddleware.sendErrors,
	EventController.getEventLeaderboard
)
apiRouter.get("/cc-announcements", EventController.getAnnouncements)
apiRouter.get("/wl-graph",
	query("all").optional().isBoolean(),
	ValidationMiddleware.sendErrors,
	rl({limit: 60, per: 3 * 60}),
	rl({limit: 5, per: 10}),
	EventController.getWorldlinkGraph
)
apiRouter.get("/event-profiles/:hash",
	param("hash").isString().isLength({min: 32, max: 32}).isHexadecimal(),
	ValidationMiddleware.sendErrors,
	rl({limit: 60, per: 3 * 60}),
	rl({limit: 10, per: 10}),
	EventController.getPlayerEventProfile
)
apiRouter.get("/event-stats/:hash",
	param("hash").isString().isLength({min: 32, max: 32}).isHexadecimal(),
	query("chapter").optional().isInt({min: 1, max: 6}),
	ValidationMiddleware.sendErrors,
	rl({limit: 60, per: 3 * 60}),
	rl({limit: 10, per: 10}),
	EventController.getPlayerEventStats
)
apiRouter.get("/events/:eventId/cutoff-stats/:cutoff",
	param("eventId").custom(x => x === "now" || /^\d+$/.test(x)),
	param("cutoff").isInt().custom(x => 
		(x >= 1 && x <= 100) ||
		[200, 300, 400, 500, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 10000, 20000, 30000, 40000, 50000, 100000, 200000, 300000].includes(parseInt(x))
	),
	query("chapter").optional().isInt({min: 1, max: 6}),
	ValidationMiddleware.sendErrors,
	rl({limit: 60, per: 3 * 60}),
	rl({limit: 10, per: 10}),
	EventController.getCutoffStats
)
apiRouter.get("/events/:eventId/snapshots",
	param("eventId").custom(x => x === "now" || /^\d+$/.test(x)),
	ValidationMiddleware.sendErrors,
	rl({limit: 60, per: 3 * 60}),
	rl({limit: 5, per: 10}),
	EventController.getSnapshotsList
)

apiRouter.get("/time", ServerController.getServerTime)
apiRouter.get("/version",
	query("version").optional().isHexadecimal(),
	ValidationMiddleware.sendErrors,
	ServerController.getServerVersion
)

apiRouter.get("/game/maintenance",
	rl({limit: 10, per: 10}),
	GameController.getMaintenance
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