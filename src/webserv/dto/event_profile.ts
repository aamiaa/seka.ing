import { CardDTO } from "./card";

export interface EventProfileDTO {
	name: string,
	cards: CardDTO[],
	talent: {
		basic_talent: number,
		area_item_bonus: number,
		character_rank_bonus: number,
		honor_bonus: number,
		mysekai_gate_bonus?: number,
		mysekai_furniture_bonus?: number,
		total_talent: number
	},
	event_bonus?: number
}