export interface CheerfulCarnivalStatsDTO {
	announcements: string[],
	team_stats: {
		team_id: number,
		total_bonus: number,
		midterm?: {
			points: number,
			seq: number
		}
	}[],
	updated_at: Date
}