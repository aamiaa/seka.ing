import PlayerRanking from "./ranking";

export default interface RankingSnapshot {
	eventId: number,
	chapterId?: number,
	rankings: PlayerRanking[],
	isEventAggregate?: boolean,
	userWorldBloomChapterRankings: any,

	createdAt: Date
}