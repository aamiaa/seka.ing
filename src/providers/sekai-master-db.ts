import axios from "axios";
import { SekaiEvent, SekaiWorldBloom } from "../interface/event";
import SekaiGameCharacter from "../interface/character";

export default class SekaiMasterDB {
	private static events: SekaiEvent[] = []
	private static worldBlooms: SekaiWorldBloom[] = []
	private static gameCharacters: SekaiGameCharacter[] = []

	public static async init() {
		await this.refreshData()
		setInterval(this.refreshData.bind(this), 4 * 3600 * 1000)
	}

	private static async refreshData() {
		const eventsRes = await axios.get("https://github.com/Sekai-World/sekai-master-db-en-diff/raw/refs/heads/main/events.json")
		eventsRes.data.forEach(event => 
			["startAt", "aggregateAt", "rankingAnnounceAt", "distributionStartAt", "closedAt", "distributionEndAt"].forEach(field => event[field] = new Date(event[field]))
		)
		this.events = eventsRes.data

		const worldBloomsRes = await axios.get("https://github.com/Sekai-World/sekai-master-db-en-diff/raw/refs/heads/main/worldBlooms.json")
		worldBloomsRes.data.forEach(event => 
			["startAt", "aggregateAt", "chapterEndAt"].forEach(field => event[field] = new Date(event[field]))
		)
		this.worldBlooms = worldBloomsRes.data

		const gameCharactersRes = await axios.get("https://github.com/Sekai-World/sekai-master-db-en-diff/raw/refs/heads/main/gameCharacters.json")
		this.gameCharacters = gameCharactersRes.data
	}

	public static getCurrentEvent() {
		const now = new Date()
		return this.events.find(x => now < x.closedAt && now >= x.startAt)
	}

	public static getCurrentWorldBloomChapter() {
		const now = new Date()
		return this.worldBlooms.find(x => now < x.chapterEndAt && now >= x.chapterStartAt)
	}

	public static getGameCharacter(id: number) {
		return this.gameCharacters.find(x => x.id === id)
	}
}