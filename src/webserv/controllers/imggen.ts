import { NextFunction, Request, Response } from "express";
import SekaiMasterDB from "../../providers/sekai-master-db";
import fs from "fs";
import path from "path";
import { SekaiEventType } from "../../interface/event";
import { EventHonorImage, EventHonorSubImage } from "sekai-images"

export default class ImageGenController {
	public static async generateHonor(req: Request, res: Response, next: NextFunction) {
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

		const image = await new (sub ? EventHonorSubImage : EventHonorImage)({
			backgroundImage,
			rankImage,
			honorRarity: honor.honorRarity,
			frameName: honorGroup.frameName
		}).create()
		return res.set("Content-Type", "image/png").send(image)
	}
}