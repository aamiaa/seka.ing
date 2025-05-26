import { Router } from "express"
import { query, param } from "express-validator";
import ImageGenController from "../controllers/imggen";
import ValidationMiddleware from "../middleware/validation";

const imageGenRouter = Router()

imageGenRouter.get("/honor/event/:eventId/:rank.png",
	param("eventId").isInt({min: 1}),
	param("rank").isInt(),
	query("sub").optional().isBoolean(),
	query("chapter").optional().isInt({min: 1, max: 4}),
	ValidationMiddleware.sendErrors,
	ImageGenController.generateHonorFromEventId
)

imageGenRouter.get("/honor/event_key/:eventKey/:rank.png",
	param("eventKey").isString().matches(/^event_\w+_20\d{2}$/),
	param("rank").isInt(),
	query("sub").optional().isBoolean(),
	query("chapter").optional().isInt({min: 1, max: 4}),
	ValidationMiddleware.sendErrors,
	ImageGenController.generateHonorFromEventKey
)

imageGenRouter.get("/card/leader/:cardId.png",
	param("cardId").isInt({min: 1}),
	query("level").isInt({min: 1, max: 60}),
	query("mastery").isInt({min: 0, max: 5}),
	query("trained").isBoolean(),
	query("image").isInt({min: 0, max: 1}),
	ValidationMiddleware.sendErrors,
	ImageGenController.generateLeaderCard
)

imageGenRouter.get("/card/deck/:cardId.png",
	param("cardId").isInt({min: 1}),
	query("level").isInt({min: 1, max: 60}),
	query("mastery").isInt({min: 0, max: 5}),
	query("trained").isBoolean(),
	query("image").isInt({min: 0, max: 1}),
	query("slot").isInt({min: 0, max: 4}),
	ValidationMiddleware.sendErrors,
	ImageGenController.generateDeckCard
)

export default imageGenRouter