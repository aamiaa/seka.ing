import { Router, Request, Response, NextFunction } from "express"
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
	ImageGenController.generateHonorFromEventId.bind(ImageGenController)
)

imageGenRouter.get("/honor/event_key/:eventKey/:rank.:format",
	param("eventKey").isString().matches(/^event_\w+_20\d{2}$/),
	param("rank").isInt(),
	param("format").isIn(["png", "webp"]),
	query("sub").optional().isBoolean(),
	query("chapter").optional().isInt({min: 1, max: 6}),
	ValidationMiddleware.sendErrors,
	ImageGenController.generateHonorFromEventKey.bind(ImageGenController)
)

imageGenRouter.get("/card/leader/:cardId.:format",
	param("cardId").isInt({min: 1}),
	param("format").isIn(["png", "webp"]),
	query("size").optional().isInt({min: 32, max: 128}),
	query("level").isInt({min: 1, max: 60}),
	query("mastery").isInt({min: 0, max: 5}),
	query("trained").isBoolean(),
	query("image").isInt({min: 0, max: 1}),
	query("old").optional().isBoolean(),
	ValidationMiddleware.sendErrors,
	ImageGenController.generateLeaderCard.bind(ImageGenController)
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
	query("old").optional().isBoolean(),
	ValidationMiddleware.sendErrors,
	ImageGenController.generateDeckCard.bind(ImageGenController)
)

imageGenRouter.get("/asset/:assetName.:format",
	param("assetName").isString().matches(/^[\w_]+$/),
	param("format").isIn(["png", "webp"]),
	query("size").optional().isInt({min: 16, max: 1024}),
	ValidationMiddleware.sendErrors,
	ImageGenController.resizeAsset.bind(ImageGenController)
)

imageGenRouter.all("*", (req, res) => {
	return res.status(404).send("")
})

imageGenRouter.use((err: Error, req: Request, res: Response, next: NextFunction) => {
	console.error("[Express Error]", req.path, err)
	return res.status(500).json({error: "Internal Server Error"})
})

export default imageGenRouter