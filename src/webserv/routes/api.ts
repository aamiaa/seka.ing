import { Router } from "express"
import EventController from "../controllers/event"

const apiRouter = Router()

apiRouter.get("/leaderboard", EventController.getLeaderboard)
apiRouter.get("/prediction", EventController.getPrediction)
apiRouter.get("/matches", EventController.getUserMatchesCount)

export default apiRouter