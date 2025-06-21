export interface EventStatsDTO {
	recent_games: {
		timestamp: Date,
		delta: number
	}[]
}