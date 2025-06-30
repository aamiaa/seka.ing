export default interface SekaiCard {
	id: number,
	characterId: number,
	cardRarityType: "rarity_1" | "rarity_2" | "rarity_3" | "rarity_4" | "rarity_birthday",
	attr: "cool" | "cute" | "happy" | "mysterious" | "pure",
	prefix: string,
	assetbundleName: string
}