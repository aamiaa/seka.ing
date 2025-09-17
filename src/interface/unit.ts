export enum SekaiUnit {
	NONE = "none",
	VIRTUAL_SINGER = "piapro",
	LEO_NEED = "light_sound",
	VIVID_BAD_SQUAD = "street",
	MORE_MORE_JUMP = "idol",
	WONDERLANDS_X_SHOWTIME = "theme_park",
	NIGHTCORD_AT_25 = "school_refusal"
}

export interface SekaiGameCharacterUnit {
	id: number,
	gameCharacterId: number,
	unit: SekaiUnit
}