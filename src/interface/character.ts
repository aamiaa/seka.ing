import { SekaiUnit } from "./unit";

export default interface SekaiGameCharacter {
	id: number,
	firstName?: string,
	givenName: string,
	gender: string,
	unit: SekaiUnit
} 

export interface SekaiPenlightColor {
	id: number,
	seq: number,
	name: string,
	description: string,
	colorCode: string,
	characterId: number,
	unit: SekaiUnit
}