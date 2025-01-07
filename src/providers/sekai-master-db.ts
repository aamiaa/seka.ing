import axios from "axios";
import { SekaiEvent, SekaiEventType, SekaiWorldBloom, SekaiWorldBloomChapterRankingRewardRange } from "../interface/event";
import SekaiGameCharacter, { SekaiPenlightColor } from "../interface/character";
import { SekaiResourceBox } from "../interface/resource";
import { SekaiHonor, SekaiHonorGroup } from "../interface/honor";

export default class SekaiMasterDB {
	private static events: SekaiEvent[] = []
	private static worldBlooms: SekaiWorldBloom[] = []
	private static gameCharacters: SekaiGameCharacter[] = []
	private static penlightColors: SekaiPenlightColor[] = []
	private static resourceBoxes: SekaiResourceBox[] = []
	private static honors: SekaiHonor[] = []
	private static honorGroups: SekaiHonorGroup[] = []
	private static worldBloomChapterRankingRewardRanges: SekaiWorldBloomChapterRankingRewardRange[] = []

	public static async init() {
		await this.refreshData()
		setInterval(this.refreshData.bind(this), 4 * 3600 * 1000)
	}

	private static async refreshData() {
		const eventsRes = await axios.get<SekaiEvent[]>("https://github.com/Sekai-World/sekai-master-db-en-diff/raw/refs/heads/main/events.json")
		eventsRes.data.forEach(event => 
			["startAt", "aggregateAt", "rankingAnnounceAt", "distributionStartAt", "closedAt", "distributionEndAt"].forEach(field => event[field] = new Date(event[field]))
		)
		this.events = eventsRes.data

		const worldBloomsRes = await axios.get<SekaiWorldBloom[]>("https://github.com/Sekai-World/sekai-master-db-en-diff/raw/refs/heads/main/worldBlooms.json")
		worldBloomsRes.data.forEach(event => 
			["chapterStartAt", "aggregateAt", "chapterEndAt"].forEach(field => event[field] = new Date(event[field]))
		)
		this.worldBlooms = worldBloomsRes.data

		const gameCharactersRes = await axios.get<SekaiGameCharacter[]>("https://github.com/Sekai-World/sekai-master-db-en-diff/raw/refs/heads/main/gameCharacters.json")
		this.gameCharacters = gameCharactersRes.data

		const penlightColorsRes = await axios.get<SekaiPenlightColor[]>("https://github.com/Sekai-World/sekai-master-db-en-diff/raw/refs/heads/main/penlightColors.json")
		this.penlightColors = penlightColorsRes.data
		
		const resourceBoxesRes = await axios.get<SekaiResourceBox[]>("https://github.com/Sekai-World/sekai-master-db-en-diff/raw/refs/heads/main/resourceBoxes.json")
		this.resourceBoxes = resourceBoxesRes.data

		const honorsRes = await axios.get<SekaiHonor[]>("https://github.com/Sekai-World/sekai-master-db-en-diff/raw/refs/heads/main/honors.json")
		this.honors = honorsRes.data

		const honorGroupsRes = await axios.get<SekaiHonorGroup[]>("https://github.com/Sekai-World/sekai-master-db-en-diff/raw/refs/heads/main/honorGroups.json")
		this.honorGroups = honorGroupsRes.data

		const worldBloomChapterRankingRewardRangesRes = await axios.get<SekaiWorldBloomChapterRankingRewardRange[]>("https://github.com/Sekai-World/sekai-master-db-en-diff/raw/refs/heads/main/worldBloomChapterRankingRewardRanges.json")
		this.worldBloomChapterRankingRewardRanges = worldBloomChapterRankingRewardRangesRes.data
	}

	public static getEvents() {
		return this.events
	}

	public static getEvent(id: number) {
		return this.events.find(x => x.id === id)
	}

	public static getCurrentEvent() {
		const now = new Date()
		return this.events.find(x => now <= x.closedAt && now >= x.startAt)
	}

	public static getNextEvent() {
		const now = new Date()
		return this.events.find(x => x.startAt > now)
	}

	public static getWorldBloomChapters(id: number) {
		return this.worldBlooms.filter(x => x.eventId === id)
	}

	public static getWorldBloomChapter(id: number, chapter: number) {
		return this.worldBlooms.find(x => x.eventId === id && x.chapterNo === chapter)
	}

	public static getCurrentWorldBloomChapter() {
		const currentEvent = this.getCurrentEvent()
		if(!currentEvent || currentEvent.eventType !== SekaiEventType.WORLD_BLOOM) {
			return null
		}
		
		const now = new Date()
		return this.worldBlooms.find(x => now <= x.chapterEndAt && now >= x.chapterStartAt)
	}

	public static getWorldBloomChapterRankingRewardRanges(id: number, gameCharacterId: number) {
		return this.worldBloomChapterRankingRewardRanges.filter(x => x.eventId === id && x.gameCharacterId === gameCharacterId)
	}

	public static getGameCharacter(id: number) {
		return this.gameCharacters.find(x => x.id === id)
	}

	public static getCharacterColor(id: number) {
		return this.penlightColors.find(x => x.characterId === id)?.colorCode
	}

	public static getResourceBox(id: number, purpose: string) {
		return this.resourceBoxes.find(x => x.id === id && x.resourceBoxPurpose === purpose)
	}

	public static getHonor(id: number) {
		return this.honors.find(x => x.id === id)
	}

	public static getHonorGroup(id: number) {
		return this.honorGroups.find(x => x.id === id)
	}
}