import { NextFunction, Request, Response } from "express";
import SekaiMasterDB from "../../providers/sekai-master-db";
import fs from "fs";
import path from "path";
import { SekaiEventType } from "../../interface/event";
import parseurl from "parseurl"
import { UserCardSpecialTrainingStatus } from "sekai-api";
import { StaticPool } from "node-worker-threads-pool";
import { ImageGenThreadPoolFn } from "../../workers/types";

const RarityMap = {
	"highest": 4,
	"high": 3,
	"middle": 2,
	"low": 1
}

export default class ImageGenController {
	private static readonly ThreadPool = new StaticPool<ImageGenThreadPoolFn, any>({
		size: 4,
		task: path.join(__dirname, "..", "..", "workers", "imggen-worker")
	})
	private static readonly ThreadTimeout = 10 * 1000

	public static async generateLeaderCard(req: Request, res: Response, next: NextFunction) {
		const cardId = parseInt(req.params.cardId as string)
		const format = req.params.format as "png" | "webp"
		const size = parseInt(req.query.size as string)
		const level = parseInt(req.query.level as string)
		const masteryRank = parseInt(req.query.mastery as string)
		const trained = req.query.trained === "true"
		const imageType = parseInt(req.query.image as string)
		const old = req.query.old === "true"

		const card = SekaiMasterDB.getCard(cardId)
		if(!card) {
			return res.status(400).json({error: "Specified card doesn't exist"})
		}

		if(trained) {
			switch(card.cardRarityType) {
				case "rarity_1":
				case "rarity_2":
				case "rarity_birthday":
					return res.status(400).json({error: "Impossible combination: cards of this rarity cannot be trained"})
				case "rarity_3":
					if(level < 40) {
						return res.status(400).json({error: "Impossible combination: card level too low to be trained"})
					}
					break
				case "rarity_4":
					if(level < 50) {
						return res.status(400).json({error: "Impossible combination: card level too low to be trained"})
					}
					break
			}
		} else if(!trained && imageType === 1) {
			return res.status(400).json({error: "Impossible combination: untrained card cannot use trained image"})
		}

		const assetbundleName = card.assetbundleName + (imageType === 0 ? "_normal" : "_after_training")
		const backgroundImage = path.join(process.env.ASSET_PATH, "assets/sekai/assetbundle/resources/startapp/thumbnail/chara", assetbundleName, assetbundleName + ".png")

		const image = await this.ThreadPool.createExecutor().setTimeout(this.ThreadTimeout).exec({
			action: old ? "old-leader-card" : "leader-card",
			params: {
				level,
				masteryRank,
				specialTrainingStatus: trained ? UserCardSpecialTrainingStatus.DONE : UserCardSpecialTrainingStatus.DO_NOTHING,
				cardRarityType: card.cardRarityType,
				attr: card.attr,
				memberImage: backgroundImage
			},
			format,
			size
		})
		return res.set("Content-Type", `image/${format}`).send(Buffer.from(image))
	}

	public static async generateDeckCard(req: Request, res: Response, next: NextFunction) {
		const cardId = parseInt(req.params.cardId as string)
		const format = req.params.format as "png" | "webp"
		const size = parseInt(req.query.size as string)
		const level = parseInt(req.query.level as string)
		const masteryRank = parseInt(req.query.mastery as string)
		const trained = req.query.trained === "true"
		const imageType = parseInt(req.query.image as string)
		const slot = parseInt(req.query.slot as string)

		const card = SekaiMasterDB.getCard(cardId)
		if(!card) {
			return res.status(400).json({error: "Specified card doesn't exist"})
		}

		if(trained) {
			switch(card.cardRarityType) {
				case "rarity_1":
				case "rarity_2":
				case "rarity_birthday":
					return res.status(400).json({error: "Impossible combination: cards of this rarity cannot be trained"})
				case "rarity_3":
					if(level < 40) {
						return res.status(400).json({error: "Impossible combination: card level too low to be trained"})
					}
					break
				case "rarity_4":
					if(level < 50) {
						return res.status(400).json({error: "Impossible combination: card level too low to be trained"})
					}
					break
			}
		} else if(!trained && imageType === 1) {
			return res.status(400).json({error: "Impossible combination: untrained card cannot use trained image"})
		}

		const backgroundImage = path.join(process.env.ASSET_PATH, "assets/sekai/assetbundle/resources/startapp/character/member_cutout", card.assetbundleName, (imageType === 0 ? "normal" : "after_training"), "deck.png")

		const image = await this.ThreadPool.createExecutor().setTimeout(this.ThreadTimeout).exec({
			action: "deck-card",
			params: {
				level,
				masteryRank,
				specialTrainingStatus: trained ? UserCardSpecialTrainingStatus.DONE : UserCardSpecialTrainingStatus.DO_NOTHING,
				cardRarityType: card.cardRarityType,
				attr: card.attr,
				memberImage: backgroundImage,
				slot
			},
			format,
			size
		})
		return res.set("Content-Type", `image/${format}`).send(Buffer.from(image))
	}

	public static async resizeAsset(req: Request, res: Response, next: NextFunction) {
		const assetName = req.params.assetName as string
		const format = req.params.format as "png" | "webp"
		const size = parseInt(req.query.size as string)

		// Prevent path traversal
		const assetsDir = path.resolve(__dirname, "..", "..", "..", "public", "assets")
		const filePath = path.resolve(assetsDir, assetName + ".png")
		if(path.parse(filePath).dir !== assetsDir) {
			return res.status(400).json({error: "Invalid asset name"})
		}

		const image = await this.ThreadPool.createExecutor().setTimeout(this.ThreadTimeout).exec({
			action: "resize-asset",
			params: {
				image: filePath
			},
			format,
			size
		})
		return res.set("Content-Type", `image/${format}`).send(Buffer.from(image))
	}
}