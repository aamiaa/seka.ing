export interface EventDTO {
    id: number,
	name: string,
	name_key: string,
	type: string,
	starts_at?: Date,
	ends_at?: Date,
	titles_at?: Date,
	chapters?: {
		title: string,
		num: number,
		character_id: number,
		color: string,
		starts_at: Date,
		ends_at: Date
	}[],
	chapter_num?: number,
	chapter_character?: number,
    honors?: {
        rank: number,
        image: string
    }[]
}