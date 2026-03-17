import { UserCardSpecialTrainingStatus } from "sekai-api"
import { SekaiCardAttribute, SekaiCardRarityType } from "../interface/card"

export type ImageGenThreadPoolFn = (param: ImageGenTask) => Promise<Uint8Array>

export type ImageGenTask = ImageGenLeaderCardTask | ImageGenDeckCardTask | ImageGenResizeAssetTask

export interface ImageGenBaseTask {
	action: string,
	params: Record<string, any>,
	format: "png" | "webp",
	size?: number,
}

export interface ImageGenLeaderCardTask extends ImageGenBaseTask {
	action: "leader-card" | "old-leader-card",
	params: {
		level: number,
		masteryRank: number,
		specialTrainingStatus: UserCardSpecialTrainingStatus,
		cardRarityType: SekaiCardRarityType,
		attr: SekaiCardAttribute,
		memberImage: string
	}
}

export interface ImageGenDeckCardTask extends ImageGenBaseTask {
	action: "deck-card",
	params: {
		level: number,
		masteryRank: number,
		specialTrainingStatus: UserCardSpecialTrainingStatus,
		cardRarityType: SekaiCardRarityType,
		attr: SekaiCardAttribute,
		memberImage: string,
		slot: number
	}
}

export interface ImageGenResizeAssetTask extends ImageGenBaseTask {
	action: "resize-asset",
	params: {
		image: string
	}
}