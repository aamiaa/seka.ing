import { EventRankingBorderPage, EventRankingPage } from "sekai-api";

export interface RankingSnapshot extends EventRankingPage {
	eventId: number,
	final?: boolean,
	createdAt: Date
}

export interface BorderSnapshot extends EventRankingBorderPage {
	eventId: number,
	final?: boolean,
	createdAt: Date
}