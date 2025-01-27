import { EventRankingBorderPage, EventRankingPage } from "sekai-api";

export interface RankingSnapshot extends EventRankingPage {
	eventId: number,
	createdAt: Date
}

export interface BorderSnapshot extends EventRankingBorderPage {
	eventId: number,
	createdAt: Date
}