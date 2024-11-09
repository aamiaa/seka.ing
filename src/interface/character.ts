import { SekaiUnit } from "./unit";

export default interface SekaiGameCharacter {
	id: number,
	firstName?: string,
	givenName: string,
	gender: string,
	unit: SekaiUnit
} 