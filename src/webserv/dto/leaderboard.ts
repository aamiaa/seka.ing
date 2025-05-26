import { CardDTO } from "./card"

export interface LeaderboardDTO {
	event: EventDTO,
	next_event?: EventDTO,
	rankings: UserRankingDTO[],
	borders: UserRankingDTO[],
	chapter_rankings?: UserRankingDTO[][],
	chapter_borders?: UserRankingDTO[][],
	updated_at?: Date,
	aggregate_until?: Date
}

interface EventDTO {
	name?: string,
	name_key?: string,
	type?: string,
	starts_at?: Date,
	ends_at?: Date,
	titles_at?: Date,
	chapters?: {
		title: string,
		num: number,
		character_id: number,
		color: string,
		starts_at: Date
	}[],
	chapter_num?: number,
	chapter_character?: number
}

interface UserRankingDTO {
	name: string,
	score: number,
	rank: number,
	card: CardDTO,
	hash?: string,
	delta?: number,
	rank_delta?: number,
	count?: number,
	average?: number
}