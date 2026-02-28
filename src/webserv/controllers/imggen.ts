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

	public static async generateHonorFromEventId(req: Request, res: Response, next: NextFunction) {
		const eventId = parseInt(req.params.eventId as string)
		const rank = parseInt(req.params.rank as string)
		const format = req.params.format as "png" | "webp"
		const sub = req.query.sub === "true"
		const chapter = req.query.chapter ? parseInt(req.query.chapter as string) : null

		const event = SekaiMasterDB.getEvent(eventId)
		if(!event) {
			return res.status(400).json({error: "Specified event doesn't exist"})
		}

		let resourceBoxId: number
		let resourceBoxPurpose: string
		if(chapter && event.eventType === SekaiEventType.WORLD_BLOOM) {
			const chapterData = SekaiMasterDB.getWorldBloomChapter(event.id, chapter)
			if(!chapterData) {
				return res.status(400).json({error: "Specified chapter doesn't exist"})
			}

			resourceBoxId = SekaiMasterDB.getWorldBloomChapterRankingRewardRanges(event.id, chapterData.gameCharacterId)?.find(x => x.toRank === rank)?.resourceBoxId
			resourceBoxPurpose = "world_bloom_chapter_ranking_reward"
		} else {
			resourceBoxId = event.eventRankingRewardRanges.find(x => x.toRank === rank)?.eventRankingRewards?.[0]?.resourceBoxId
			resourceBoxPurpose = "event_ranking_reward"
		}
		if(!resourceBoxId) {
			return res.status(400).json({error: "Specified rank doesn't exist"})
		}

		const resourceId = SekaiMasterDB.getResourceBox(resourceBoxId, resourceBoxPurpose)?.details?.find(x => x.resourceType === "honor")?.resourceId
		if(!resourceId) {
			return res.status(400).json({error: "Specified rank doesn't exist"})
		}

		const honor = SekaiMasterDB.getHonor(resourceId)
		const honorGroup = SekaiMasterDB.getHonorGroup(honor.groupId)

		const backgroundImage = path.join(process.env.ASSET_PATH, "assets/sekai/assetbundle/resources/startapp/honor", honorGroup.backgroundAssetbundleName, sub ? "degree_sub/degree_sub.png" : "degree_main/degree_main.png")
		const rankImage = path.join(process.env.ASSET_PATH, "assets/sekai/assetbundle/resources/startapp/honor", honor.assetbundleName, sub ? "rank_sub/rank_sub.png" : "rank_main/rank_main.png")
		let frameImage: string
		if(honorGroup.frameName) {
			const assetName = `frame_degree_${sub ? "s" : "m"}_${RarityMap[honor.honorRarity]}`
			frameImage = path.join(process.env.ASSET_PATH, "assets/sekai/assetbundle/resources/startapp/honor_frame", honorGroup.frameName, `${assetName}/${assetName}.png`)
		}

		const image = await this.ThreadPool.createExecutor().setTimeout(this.ThreadTimeout).exec({
			action: sub ? "event-honor-sub" : "event-honor",
			params: {
				backgroundImage,
				rankImage,
				frameImage,
				honorRarity: honor.honorRarity,
				isWorldlinkChapter: chapter && event.eventType === SekaiEventType.WORLD_BLOOM
			},
			format
		})
		return res.set("Content-Type", `image/${format}`).send(Buffer.from(image))
	}

	public static async generateHonorFromEventKey(req: Request, res: Response, next: NextFunction) {
		const eventKey = req.params.eventKey as string
		const rank = parseInt(req.params.rank as string)
		const format = req.params.format as "png" | "webp"
		const sub = req.query.sub === "true"
		const chapter = req.query.chapter ? parseInt(req.query.chapter as string) : null

		const eventKeyPart = eventKey.match(/^(event_\w+)_20\d{2}$/)?.[1]
		if(!eventKeyPart) {
			return res.status(400).json({error: "Invalid event key"})
		}

		const event = SekaiMasterDB.getEventByKey(eventKey)
		if(event) {
			return res.redirect(`/images/honor/event/${event.id}/${rank}.png${parseurl(req).search ?? ""}`)
		}

		const backgroundImage = path.join(process.env.ASSET_PATH, "assets/sekai/assetbundle/resources/startapp/honor", `honor_bg_${eventKeyPart}${chapter ? `_cp${chapter}` : ""}`, sub ? "degree_sub/degree_sub.png" : "degree_main/degree_main.png")
		try {
			await fs.promises.stat(backgroundImage)
		} catch(ex) {
			return res.status(400).json({error: "Background asset doesn't exist"})
		}

		const assetbundleName = "honor_top_" + "0".repeat(6 - rank.toString().length) + rank + (rank === 10 ? "_v2" : "") + (chapter ? `_${eventKeyPart}_cp${chapter}` : "")
		const rankImage = path.join(process.env.ASSET_PATH, "assets/sekai/assetbundle/resources/startapp/honor", assetbundleName, sub ? "rank_sub/rank_sub.png" : "rank_main/rank_main.png")
		try {
			await fs.promises.stat(rankImage)
		} catch(ex) {
			return res.status(400).json({error: "Rank asset doesn't exist"})
		}

		const rarity =
			(rank >= 1 && rank <= 10) ? "highest" :
			(rank > 10 && rank <= 1000) ? "high" :
			(rank > 1000 && rank <= 10000) ? "middle" : "low"

		let frameImage: string
		if(chapter != null) {
			const assetName = `frame_degree_${sub ? "s" : "m"}_${RarityMap[rarity]}`
			frameImage = path.join(process.env.ASSET_PATH, "assets/sekai/assetbundle/resources/startapp/honor_frame", `${eventKeyPart}_cp${chapter}`, `${assetName}/${assetName}.png`)
		}

		const image = await this.ThreadPool.createExecutor().setTimeout(this.ThreadTimeout).exec({
			action: sub ? "event-honor-sub" : "event-honor",
			params: {
				backgroundImage,
				rankImage,
				frameImage,
				honorRarity: rarity,
				isWorldlinkChapter: chapter != null
			},
			format
		})
		return res.set("Content-Type", `image/${format}`).send(Buffer.from(image))
	}

	public static async generateLeaderCard(req: Request, res: Response, next: NextFunction) {
		const cardId = parseInt(req.params.cardId as string)
		const format = req.params.format as "png" | "webp"
		const size = parseInt(req.query.size as string)
		const level = parseInt(req.query.level as string)
		const masteryRank = parseInt(req.query.mastery as string)
		const trained = req.query.trained === "true"
		const imageType = parseInt(req.query.image as string)

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
			action: "leader-card",
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
}