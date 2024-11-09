import PlayerRanking from "./ranking";

export interface SekaiRanking {
	rankings: PlayerRanking[],
	isEventAggregate?: boolean,
	userWorldBloomChapterRankings: {gameCharacterId: number, isWorldBloomChapterAggregate: boolean, rankings: PlayerRanking[]}[],
}

export default interface RankingSnapshot extends SekaiRanking {
	eventId: number,
	createdAt: Date
}