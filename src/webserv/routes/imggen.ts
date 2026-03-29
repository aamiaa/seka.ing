import { Router, Request, Response, NextFunction } from "express"
import { query, param } from "express-validator";
import ImageGenController from "../controllers/imggen";
import ValidationMiddleware from "../middleware/validation";

const imageGenRouter = Router()

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