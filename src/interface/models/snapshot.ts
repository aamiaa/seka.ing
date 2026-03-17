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
	isEventAggregate?: boolean
}