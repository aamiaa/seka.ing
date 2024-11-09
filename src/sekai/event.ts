import SekaiApiClient from "sekai-api"
import HttpsProxyAgent from "https-proxy-agent"
import crypto from "crypto"
import { RankingSnapshotModel } from "../models/snapshot"
import SekaiMasterDB from "../providers/sekai-master-db"
import { SekaiEventType } from "../interface/event"

export default class EventTracker {
	private static client: SekaiApiClient
	public static leaderboard: any = {}

	public static async init() {
		const httpsAgent = HttpsProxyAgent({
			host: process.env.ProxyHost,
			port: parseInt(process.env.ProxyPort) + 2,
			auth: `${process.env.ProxyUsername}:${process.env.ProxyPassword}`,
		})
		this.client = new SekaiApiClient({httpsAgent})
		await this.client.init()
		await this.client.authenticate(process.env.SEKAI_AUTH)

		await this.updateLeaderboard()
		setInterval(this.updateLeaderboard.bind(this), 60 * 1000)
		
		console.log("[EventTracker] Started!")
	}

	private static async updateLeaderboard() {
		console.log("[EventTracker] Updating leaderboard...")

		const now = new Date()
		const currentEvent = SekaiMasterDB.getCurrentEvent()
		const currentChapter = SekaiMasterDB.getCurrentWorldBloomChapter()
		if(!currentEvent) {
			this.leaderboard = {
				event: {},
				rankings: []
			}
			console.log("[EventTracker] No current event")
			return
		}

		const snapshot = await this.client.getRankingTop100(currentEvent.id)
		snapshot.rankings.forEach(user => user.userId = user.userId.toString())
		snapshot.eventId = currentEvent.id
		snapshot.createdAt = now
		if(currentChapter) {
			snapshot.chapterId = currentChapter.id
		}
		const snapshotDoc = new RankingSnapshotModel(snapshot)
		if(now < new Date(currentEvent.rankingAnnounceAt.getTime() + 3 * 60 * 1000)) {
			await snapshotDoc.save()
		}

		const pastHour = new Date(now.getTime() - 3600 * 1000)
		const rankingPastHour = await RankingSnapshotModel.find({createdAt: {$gte: pastHour}}).lean()

		const currentLb = snapshotDoc.toObject().rankings.map(user => {
			const hash = crypto.createHash("sha256").update(user.userId + "_" + currentEvent.assetbundleName).digest("hex")

			let earliest = user.score
			for(const entry of rankingPastHour) {
				const currentUserSlot = entry.rankings.find(x => x.userId === user.userId)
				if(currentUserSlot) {
					earliest = currentUserSlot.score
					break
				}
			}

			const differentValues = new Set<number>()
			for(const entry of rankingPastHour) {
				const currentUserSlot = entry.rankings.find(x => x.userId === user.userId)
				if(currentUserSlot) {
					differentValues.add(currentUserSlot.score)
				}
			}

			const count = differentValues.size - 1
			const average = (user.score - earliest)/count
			return {
				name: user.name,
				team: user.userCheerfulCarnival.cheerfulCarnivalTeamId,
				score: user.score,
				rank: user.rank,
				hash,
				delta: user.score - earliest,
				average,
				count
			}
		})

		this.leaderboard = {
			event: {
				name: currentEvent.name,
				name_key: currentEvent.assetbundleName
			},
			rankings: currentLb
		}
		if(currentEvent.eventType === SekaiEventType.WORLD_BLOOM && currentChapter != null) {
			this.leaderboard.event.chapter = SekaiMasterDB.getGameCharacter(currentChapter.gameCharacterId).givenName
		}

		console.log("[EventTracker] Updated!")
	}
}