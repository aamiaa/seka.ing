import { Router } from "express"
import { query, param } from "express-validator";
import ImageGenController from "../controllers/imggen";
import ValidationMiddleware from "../middleware/validation";

const imageGenRouter = Router()

imageGenRouter.get("/honor/:eventId/:rank.png",
	param("eventId").isInt({min: 1}),
	param("rank").isInt(),
	query("sub").optional().isBoolean(),
	query("chapter").optional().isInt({min: 1, max: 4}),
	ValidationMiddleware.sendErrors,
	ImageGenController.generateHonor
)

export default imageGenRouter