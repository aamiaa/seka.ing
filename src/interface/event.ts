import { SekaiCardAttribute, SekaiCardRarityType } from "./card";
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
	unit: SekaiUnit,
	eventRankingRewardRanges: SekaiEventRankingRewardsRange[]
}

export enum SekaiEventType {
	MARATHON = "marathon",
	CHEERFUL_CARNIVAL = "cheerful_carnival",
	WORLD_BLOOM = "world_bloom"
}

export interface SekaiEventRankingRewardsRange {
	id: number,
	eventId: number,
	fromRank: number,
	toRank: number,
	eventRankingRewards: SekaiEventRankingReward[]
}

export interface SekaiEventRankingReward {
	id: number,
	eventRankingRewardRangeId: number,
	resourceBoxId: number
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

export interface SekaiWorldBloomChapterRankingRewardRange {
	id: number,
	eventId: number,
	gameCharacterId: number,
	fromRank: number,
	toRank: number,
	resourceBoxId: number
}

export interface SekaiCheerfulCarnivalTeam {
	id: number,
	eventId: number,
	seq: number,
	teamName: string,
	assetbundleName: string
}

export interface SekaiCheerfulCarnivalSummary {
	id: number,
	eventId: number,
	theme: string,
	midtermAnnounce1At: Date,
	midtermAnnounce2At: Date,
	assetbundleName: string
}

export interface SekaiEventCard {
	id: number,
	cardId: number,
	eventId: number,
	bonusRate: number
}

export interface SekaiEventDeckBonus {
	id: number,
	eventId: number,
	gameCharacterUnitId?: number,
	cardAttr?: SekaiCardAttribute,
	bonusRate: number
}

export interface SekaiEventRarityBonusRate {
	id: number,
	cardRarityType: SekaiCardRarityType,
	masterRank: number,
	bonusRate: number
}