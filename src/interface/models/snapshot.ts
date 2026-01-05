import { UserWorldBloomChapterRankingBorder, UserWorldBloomRanking } from "sekai-api";

export interface RankingEntry {
	userId: string,
	score: number,
	rank: number,
	name?: string,
	userCheerfulCarnival?: {
		cheerfulCarnivalTeamId: number,
		teamChangeCount: number,
		registerAt: Date
	}
}

export interface RankingSnapshot {
	eventId: number,
	final?: boolean,
	source?: string,
	createdAt: Date,

	rankings: RankingEntry[],
	isEventAggregate?: boolean,
	userWorldBloomChapterRankings?: UserWorldBloomRanking[]
}

export interface BorderSnapshot {
	eventId: number,
	final?: boolean,
	source?: string,
	createdAt: Date,

	borderRankings: RankingEntry[],
	isEventAggregate?: boolean,
	userWorldBloomChapterRankingBorders?: UserWorldBloomChapterRankingBorder[]
}