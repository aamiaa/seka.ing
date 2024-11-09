import PlayerRanking from "./ranking";

export default interface RankingSnapshot {
	eventId: number,
	rankings: PlayerRanking[],
	isEventAggregate?: boolean,
	userWorldBloomChapterRankings: any,

	createdAt: Date
}