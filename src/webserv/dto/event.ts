import { SekaiUnit } from "../../interface/unit"

export interface EventDTO {
    id: number,
	name: string,
	name_key: string,
	type: string,
	unit: SekaiUnit | null, // null for mixed
	starts_at?: Date,
	ends_at?: Date,
	start_tz_offsets?: Record<string, number>,
	titles_at?: Date,
    honors?: {
        rank: number,
        image: string
    }[],
	has_snapshot?: boolean
}