import { CardDTO } from "./card"
import { EventDTO } from "./event"

export interface LeaderboardDTO {
	event: EventDTO,
	next_event?: EventDTO,
	rankings: UserRankingDTO[],
	borders: UserRankingDTO[],
	chapter_rankings?: UserRankingDTO[][],
	chapter_borders?: UserRankingDTO[][],
	updated_at?: Date,
	aggregate_until?: Date,
	update_error?: string
}

export interface UserRankingDTO {
	name: string,
	team?: number,
	score: number,
	rank: number,
	card: CardDTO,
	hash?: string,
	delta?: number,
	rank_delta?: number,
	average?: number
}