import PlayerRanking from "./ranking";

export default interface RankingSnapshot {
	eventId: number,
	rankings: PlayerRanking[],
	isEventAggregate?: boolean,
	userWorldBloomChapterRankings: {gameCharacterId: number, isWorldBloomChapterAggregate: boolean, rankings: PlayerRanking[]}[],

	createdAt: Date
}