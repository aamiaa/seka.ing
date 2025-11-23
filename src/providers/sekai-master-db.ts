import axios from "axios";
import { SekaiCheerfulCarnivalSummary, SekaiCheerfulCarnivalTeam, SekaiEvent, SekaiEventCard, SekaiEventDeckBonus, SekaiEventRarityBonusRate, SekaiEventType, SekaiWorldBloom, SekaiWorldBloomChapterRankingRewardRange } from "../interface/event";
import SekaiGameCharacter, { SekaiPenlightColor } from "../interface/character";
import { SekaiResourceBox } from "../interface/resource";
import { SekaiHonor, SekaiHonorGroup } from "../interface/honor";
import SekaiCard from "../interface/card";
import { SystemAppVersion } from "sekai-api";
import ApiClient from "../sekai/api"
import path from "path"
import fs from "fs"
import { ensureEventAssetsExist } from "../sekai/asset";
import { SekaiGameCharacterUnit } from "../interface/unit";

async function ensureFolderExists(path: string) {
	try {
		await fs.promises.stat(path)
	} catch(ex) {
		await fs.promises.mkdir(path)
	}
}

export default class SekaiMasterDB {
	private static readonly requiredModules = ["events", "worldBlooms", "gameCharacters", "penlightColors",
		"resourceBoxes", "honors", "honorGroups", "worldBloomChapterRankingRewardRanges", "cards", "cheerfulCarnivalTeams",
		"cheerfulCarnivalSummaries", "eventCards", "eventDeckBonuses", "eventRarityBonusRates", "gameCharacterUnits"]
	private static events: SekaiEvent[] = []
	private static worldBlooms: SekaiWorldBloom[] = []
	private static gameCharacters: SekaiGameCharacter[] = []
	private static penlightColors: SekaiPenlightColor[] = []
	private static resourceBoxes: SekaiResourceBox[] = []
	private static honors: SekaiHonor[] = []
	private static honorGroups: SekaiHonorGroup[] = []
	private static worldBloomChapterRankingRewardRanges: SekaiWorldBloomChapterRankingRewardRange[] = []
	private static cards: SekaiCard[] = []
	private static cheerfulCarnivalTeams: SekaiCheerfulCarnivalTeam[] = []
	private static cheerfulCarnivalSummaries: SekaiCheerfulCarnivalSummary[] = []
	private static eventCards: SekaiEventCard[] = []
	private static eventDeckBonuses: SekaiEventDeckBonus[] = []
	private static eventRarityBonusRates: SekaiEventRarityBonusRate[] = []
	private static gameCharacterUnits: SekaiGameCharacterUnit[] = []

	public static async init() {
		await this.refreshData()
		setInterval(this.refreshData.bind(this), 4 * 3600 * 1000)
	}

	private static async getDataVersion(server: string) {
		switch(server) {
			case "en": {
				const versionRes = await axios.get<SystemAppVersion>("https://raw.githubusercontent.com/aamiaa/sekai-en-diff/refs/heads/main/api/currentVersion.json")
				return versionRes.data.dataVersion
			}
			case "jp": {
				const versionRes = await axios.get<SystemAppVersion>("https://raw.githubusercontent.com/Sekai-World/sekai-master-db-diff/refs/heads/main/versions.json")
				return versionRes.data.dataVersion
			}
		}
	}

	private static async getModuleFromGitHub(server: string, module: string) {
		switch(server) {
			case "en": {
				return (await axios.get(`https://raw.githubusercontent.com/aamiaa/sekai-en-diff/refs/heads/main/modules/${module}.json`)).data
			}
			case "jp": {
				return (await axios.get(`https://raw.githubusercontent.com/Sekai-World/sekai-master-db-diff/refs/heads/main/${module}.json`)).data
			}
		}
	}

	private static async refreshData() {
		console.log("[SekaiMasterDB] Performing data refresh...")

		const repoDataVersion = await this.getDataVersion(process.env.SEKAI_SERVER)
		const liveDataVersion = ApiClient.clientInfo.dataVersion
		if(!liveDataVersion) {
			throw new Error("[SekaiMasterDB] Data version is null!")
		}
		
		const versionFolderPath = path.join(process.env.MASTER_DATA_PATH, liveDataVersion)
		try {
			await fs.promises.stat(versionFolderPath)
			await this.loadFromFiles(versionFolderPath)

			console.log("[SekaiMasterDB] Data is up to date!")
		} catch(ex) {
			if(repoDataVersion !== liveDataVersion) {
				console.log("[SekaiMasterDB] GitHub repo is outdated, falling back to game api")
				await this.updateFromGameApi(versionFolderPath)
			} else {
				await this.updateFromGitHub(versionFolderPath)
			}

			await this.loadFromFiles(versionFolderPath)
		}
		ensureEventAssetsExist()

		console.log("[SekaiMasterDB] Finished! Current version:", liveDataVersion)
	}

	private static async updateFromGameApi(folderPath: string) {
		const masterData = await ApiClient.downloadMasterData()
		await ensureFolderExists(folderPath)
		for(const module of this.requiredModules) {
			const fileName = path.join(folderPath, `${module}.json`)
			await fs.promises.writeFile(fileName, JSON.stringify(masterData[module]))
		}
	}

	private static async updateFromGitHub(folderPath: string) {
		await ensureFolderExists(folderPath)
		for(const module of this.requiredModules) {
			const res = await this.getModuleFromGitHub(process.env.SEKAI_SERVER, module)
			const fileName = path.join(folderPath, `${module}.json`)
			await fs.promises.writeFile(fileName, JSON.stringify(res))
		}
	}

	private static async loadFromFiles(folderPath: string) {
		for(const module of this.requiredModules) {
			const fileName = path.join(folderPath, `${module}.json`)
			const data = JSON.parse((await fs.promises.readFile(fileName)).toString())

			switch(module) {
				case "events":
					data.forEach(event => 
						["startAt", "aggregateAt", "rankingAnnounceAt", "distributionStartAt", "closedAt", "distributionEndAt"].forEach(field => event[field] = new Date(event[field]))
					)
					this.events = data
					break
				case "worldBlooms":
					data.forEach(event => 
						["chapterStartAt", "aggregateAt", "chapterEndAt"].forEach(field => event[field] = new Date(event[field]))
					)
					this.worldBlooms = data
					break
				case "cheerfulCarnivalSummaries":
					data.forEach(x => {
						x.midtermAnnounce1At = new Date(x.midtermAnnounce1At)
						x.midtermAnnounce2At = new Date(x.midtermAnnounce2At)
					})
					this.cheerfulCarnivalSummaries = data
					break
				default:
					this[module] = data
					break
			}
		}
	}

	public static getEvents() {
		return this.events
	}

	public static getEvent(id: number) {
		return this.events.find(x => x.id === id)
	}

	public static getEventByKey(key: string) {
		return this.events.find(x => x.assetbundleName === key)
	}

	public static getCurrentEvent() {
		const now = new Date()
		return this.events.find(x => now <= x.closedAt && now >= x.startAt)
	}

	public static getNextEvent() {
		const now = new Date()
		return this.events.find(x => x.startAt > now)
	}

	public static getAllWorldBloomChapters() {
		return this.worldBlooms
	}

	public static getWorldBloomChapters(id: number) {
		return this.worldBlooms.filter(x => x.eventId === id).sort((a,b) => a.chapterNo - b.chapterNo)
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
		return this.worldBlooms.find(x => now <= x.aggregateAt && now >= x.chapterStartAt)
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

	public static getHonorGroups() {
		return this.honorGroups
	}

	public static getHonorsForGroup(id: number) {
		return this.honors.filter(x => x.groupId === id)
	}

	public static getCard(id: number) {
		return this.cards.find(x => x.id === id)
	}
	
	public static getCards() {
		return this.cards
	}

	public static getCheerfulCarnivalTeams() {
		return this.cheerfulCarnivalTeams
	}

	public static getCheerfulCarnivalSummary(id: number) {
		return this.cheerfulCarnivalSummaries.find(x => x.eventId === id)
	}

	public static getEventCards(eventId: number) {
		return this.eventCards.filter(x => x.eventId === eventId)
	}

	public static getEventDeckBonuses(eventId: number) {
		return this.eventDeckBonuses.filter(x => x.eventId === eventId)
	}

	public static getEventRarityBonusRates() {
		return this.eventRarityBonusRates
	}

	public static getGameCharacterUnit(id: number) {
		return this.gameCharacterUnits.find(x => x.id === id)
	}
}