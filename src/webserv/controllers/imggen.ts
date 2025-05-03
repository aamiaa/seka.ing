import { NextFunction, Request, Response } from "express";
import SekaiMasterDB from "../../providers/sekai-master-db";
import fs from "fs";
import path from "path";
import { SekaiEventType } from "../../interface/event";
import { EventHonorImage, EventHonorSubImage, LeaderCardImage } from "sekai-images"
import { writePNGSignature } from "../../util/img_signature";
import parseurl from "parseurl"
import { UserCardSpecialTrainingStatus } from "sekai-api";

const RarityMap = {
	"highest": 4,
	"high": 3,
	"middle": 2,
	"low": 1
}

export default class ImageGenController {
	public static async generateHonorFromEventId(req: Request, res: Response, next: NextFunction) {
		const eventId = parseInt(req.params.eventId as string)
		const rank = parseInt(req.params.rank as string)
		const sub = req.query.sub === "true"
		const chapter = req.query.chapter ? parseInt(req.query.chapter as string) : null

		const event = SekaiMasterDB.getEvent(eventId)
		if(!event) {
			return res.status(400).json({error: "Specified event doesn't exist"})
		}
		
		let resourceBoxId: number
		let resourceBoxPurpose: string
		if(chapter && event.eventType === SekaiEventType.WORLD_BLOOM) {
			resourceBoxId = SekaiMasterDB.getWorldBloomChapterRankingRewardRanges(event.id, SekaiMasterDB.getWorldBloomChapter(event.id, chapter).gameCharacterId)?.find(x => x.toRank === rank)?.resourceBoxId
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

		const backgroundImage = await fs.promises.readFile(path.join(process.env.ASSET_PATH, "assets/sekai/assetbundle/resources/startapp/honor", honorGroup.backgroundAssetbundleName, sub ? "degree_sub/degree_sub.png" : "degree_main/degree_main.png"))
		const rankImage = await fs.promises.readFile(path.join(process.env.ASSET_PATH, "assets/sekai/assetbundle/resources/startapp/honor", honor.assetbundleName, sub ? "rank_sub/rank_sub.png" : "rank_main/rank_main.png"))
		let frameImage: Buffer
		if(honorGroup.frameName) {
			const assetName = `frame_degree_${sub ? "s" : "m"}_${RarityMap[honor.honorRarity]}`
			try {
				frameImage = await fs.promises.readFile(path.join(process.env.ASSET_PATH, "assets/sekai/assetbundle/resources/startapp/honor_frame", honorGroup.frameName, `${assetName}/${assetName}.png`))
			} catch(ex) {}
		}

		const image = await new (sub ? EventHonorSubImage : EventHonorImage)({
			backgroundImage,
			rankImage,
			frameImage,
			honorRarity: honor.honorRarity,
			isWorldlinkChapter: chapter && event.eventType === SekaiEventType.WORLD_BLOOM
		}).create()
		const withSig = writePNGSignature(image, "sekaing")
		return res.set("Content-Type", "image/png").send(withSig)
	}

	public static async generateHonorFromEventKey(req: Request, res: Response, next: NextFunction) {
		const eventKey = req.params.eventKey as string
		const rank = parseInt(req.params.rank as string)
		const sub = req.query.sub === "true"
		const chapter = req.query.chapter ? parseInt(req.query.chapter as string) : null

		const eventKeyPart = eventKey.match(/^(event_\w+)_20\d{2}$/)?.[1]
		if(!eventKeyPart) {
			return res.status(400).json({error: "Specified event doesn't exist"})
		}

		const event = SekaiMasterDB.getEventByKey(eventKey)
		if(event) {
			return res.redirect(`/images/honor/event/${event.id}/${rank}.png${parseurl(req).search ?? ""}`)
		}

		const backgroundImagePath = path.join(process.env.ASSET_PATH, "assets/sekai/assetbundle/resources/startapp/honor", `honor_bg_${eventKeyPart}${chapter ? `_cp${chapter}` : ""}`, sub ? "degree_sub/degree_sub.png" : "degree_main/degree_main.png")
		try {
			await fs.promises.stat(backgroundImagePath)
		} catch(ex) {
			return res.status(400).json({error: "Specified event doesn't exist"})
		}

		const assetbundleName = "honor_top_" + "0".repeat(6 - rank.toString().length) + rank + (rank === 10 ? "_v2" : "") + (chapter ? `_${eventKeyPart}_cp${chapter}` : "")
		const rankImagePath = path.join(process.env.ASSET_PATH, "assets/sekai/assetbundle/resources/startapp/honor", assetbundleName, sub ? "rank_sub/rank_sub.png" : "rank_main/rank_main.png")
		try {
			await fs.promises.stat(rankImagePath)
		} catch(ex) {
			return res.status(400).json({error: "Specified rank doesn't exist"})
		}

		const backgroundImage = await fs.promises.readFile(backgroundImagePath)
		const rankImage = await fs.promises.readFile(rankImagePath)
		const rarity =
			(rank >= 1 && rank <= 10) ? "highest" :
			(rank > 10 && rank <= 1000) ? "high" :
			(rank > 1000 && rank <= 10000) ? "middle" : "low"

		let frameImage: Buffer
		if(chapter != null) {
			const assetName = `frame_degree_${sub ? "s" : "m"}_${RarityMap[rarity]}`
			try {
				frameImage = await fs.promises.readFile(path.join(process.env.ASSET_PATH, "assets/sekai/assetbundle/resources/startapp/honor_frame", `${eventKeyPart}_cp${chapter}`, `${assetName}/${assetName}.png`))
			} catch(ex) {}	
		}

		const image = await new (sub ? EventHonorSubImage : EventHonorImage)({
			backgroundImage,
			rankImage,
			frameImage,
			honorRarity: rarity,
			isWorldlinkChapter: chapter != null
		}).create()
		const withSig = writePNGSignature(image, "sekaing")
		return res.set("Content-Type", "image/png").send(withSig)
	}

	public static async generateLeaderCard(req: Request, res: Response, next: NextFunction) {
		const cardId = parseInt(req.params.cardId as string)
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
					return res.status(400).json({error: "Impossible combination"})
				case "rarity_3":
					if(level < 40) {
						return res.status(400).json({error: "Impossible combination"})
					}
					break
				case "rarity_4":
					if(level < 50) {
						return res.status(400).json({error: "Impossible combination"})
					}
					break
			}
		} else if(!trained && imageType === 1) {
			return res.status(400).json({error: "Impossible combination"})
		}

		const assetbundleName = card.assetbundleName + (imageType === 0 ? "_normal" : "_after_training")
		const backgroundImagePath = path.join(process.env.ASSET_PATH, "assets/sekai/assetbundle/resources/startapp/thumbnail/chara", assetbundleName, assetbundleName + ".png")
		try {
			await fs.promises.stat(backgroundImagePath)
		} catch(ex) {
			return res.status(400).json({error: "Specified card doesn't exist"})
		}

		const backgroundImage = await fs.promises.readFile(backgroundImagePath)
		const image = await new LeaderCardImage({
			level,
			masteryRank,
			specialTrainingStatus: trained ? UserCardSpecialTrainingStatus.DONE : UserCardSpecialTrainingStatus.DO_NOTHING,
			cardRarityType: card.cardRarityType,
			attr: card.attr,
			memberImage: backgroundImage
			
		}).create()
		const withSig = writePNGSignature(image, "sekaing")
		return res.set("Content-Type", "image/png").send(withSig)
	}
}