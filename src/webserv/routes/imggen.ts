import { Router } from "express"
import { query, param } from "express-validator";
import ImageGenController from "../controllers/imggen";
import ValidationMiddleware from "../middleware/validation";

const imageGenRouter = Router()

imageGenRouter.get("/honor/event/:eventId/:rank.:format",
	param("eventId").isInt({min: 1}),
	param("rank").isInt(),
	param("format").isIn(["png", "webp"]),
	query("sub").optional().isBoolean(),
	query("chapter").optional().isInt({min: 1, max: 6}),
	ValidationMiddleware.sendErrors,
	ImageGenController.generateHonorFromEventId
)

imageGenRouter.get("/honor/event_key/:eventKey/:rank.:format",
	param("eventKey").isString().matches(/^event_\w+_20\d{2}$/),
	param("rank").isInt(),
	param("format").isIn(["png", "webp"]),
	query("sub").optional().isBoolean(),
	query("chapter").optional().isInt({min: 1, max: 6}),
	ValidationMiddleware.sendErrors,
	ImageGenController.generateHonorFromEventKey
)

imageGenRouter.get("/card/leader/:cardId.:format",
	param("cardId").isInt({min: 1}),
	param("format").isIn(["png", "webp"]),
	query("size").optional().isInt({min: 32, max: 128}),
	query("level").isInt({min: 1, max: 60}),
	query("mastery").isInt({min: 0, max: 5}),
	query("trained").isBoolean(),
	query("image").isInt({min: 0, max: 1}),
	ValidationMiddleware.sendErrors,
	ImageGenController.generateLeaderCard
)

imageGenRouter.get("/card/deck/:cardId.:format",
	param("cardId").isInt({min: 1}),
	param("format").isIn(["png", "webp"]),
	query("size").optional().isInt({min: 32, max: 312}),
	query("level").isInt({min: 1, max: 60}),
	query("mastery").isInt({min: 0, max: 5}),
	query("trained").isBoolean(),
	query("image").isInt({min: 0, max: 1}),
	query("slot").isInt({min: 0, max: 4}),
	ValidationMiddleware.sendErrors,
	ImageGenController.generateDeckCard
)

export default imageGenRouter