import { SekaiUnit } from "./unit";

export interface SekaiEvent {
	id: number,
	eventType: SekaiEventType,
	name: string,
	assetbundleName: string,
	startAt: Date,
	aggregateAt: Date,
	rankingAnnounceAt: Date,
	distributionStartAt: Date,
	closedAt: Date,
	distributionEndAt: Date,
	unit: SekaiUnit
}

export enum SekaiEventType {
	MARATHON = "marathon",
	CHEERFUL_CARNIVAL = "cheerful_carnival",
	WORLD_BLOOM = "world_bloom"
}

export interface SekaiWorldBloom {
	id: number,
	eventId: number,
	gameCharacterId: number,
	chapterNo: number,
	chapterStartAt: Date,
	aggregateAt: Date,
	chapterEndAt: Date,
	isSupplemental: boolean
}