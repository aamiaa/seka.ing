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

export default imageGenRouter