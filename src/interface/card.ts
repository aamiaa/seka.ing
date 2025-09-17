import { SekaiUnit } from "./unit"

export default interface SekaiCard {
	id: number,
	characterId: number,
	cardRarityType: SekaiCardRarityType,
	attr: SekaiCardAttribute,
	prefix: string,
	assetbundleName: string,
	supportUnit: SekaiUnit
}

export type SekaiCardRarityType = "rarity_1" | "rarity_2" | "rarity_3" | "rarity_4" | "rarity_birthday"
export type SekaiCardAttribute = "cool" | "cute" | "happy" | "mysterious" | "pure"