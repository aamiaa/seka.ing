export interface EventDTO {
    id: number,
	name: string,
	name_key: string,
	type: string,
	starts_at?: Date,
	ends_at?: Date,
	start_tz_offsets?: Record<string, number>,
	titles_at?: Date,
	chapters?: WorldlinkChapterDTO[],
	chapter_num?: number,
	chapter_character?: number,
    honors?: {
        rank: number,
        image: string
    }[],
	has_snapshot?: boolean
}

export interface WorldlinkChapterDTO {
	title: string,
	num: number,
	character_id: number,
	color: string,
	starts_at: Date,
	ends_at: Date
}