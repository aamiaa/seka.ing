import { parentPort } from "worker_threads";
import { ImageGenTask } from "./types";
import { DeckCardImage, EventHonorImage, EventHonorSubImage, LeaderCardImage, OldLeaderCardImage } from "sekai-images";
import fs from "fs";
import sharp from "sharp";

parentPort.on("message", async (data: ImageGenTask) => {
	switch(data.action) {
		case "leader-card":
		case "old-leader-card": {
			const memberImage = await fs.promises.readFile(data.params.memberImage)
			const old = data.action === "old-leader-card"

			const img = await new (old ? OldLeaderCardImage : LeaderCardImage)({
				level: data.params.level,
				masteryRank: data.params.masteryRank,
				specialTrainingStatus: data.params.specialTrainingStatus,
				cardRarityType: data.params.cardRarityType,
				attr: data.params.attr,
				memberImage
			}).create({
				format: data.format,
				size: data.size
			})

			parentPort.postMessage(img)
			break
		}
		case "deck-card": {
			const memberImage = await fs.promises.readFile(data.params.memberImage)

			const img = await new DeckCardImage({
				level: data.params.level,
				masteryRank: data.params.masteryRank,
				specialTrainingStatus: data.params.specialTrainingStatus,
				cardRarityType: data.params.cardRarityType,
				attr: data.params.attr,
				slot: data.params.slot,
				memberImage
			}).create({
				format: data.format,
				size: data.size
			})

			parentPort.postMessage(img)
			break
		}
		case "resize-asset": {
			let image = sharp(data.params.image)
			if(data.size) {
				image = image.resize(data.size)
			}
			if(data.format === "webp") {
				image = image.webp({nearLossless: true})
			}

			const result = await image.toBuffer()
			parentPort.postMessage(result)
			break
		}
		default:
			throw new Error("Unsupported image gen action")
	}
})