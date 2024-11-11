import SekaiApiClient from "sekai-api"
import HttpsProxyAgent from "https-proxy-agent"
import { RankingSnapshotModel } from "../models/snapshot"
import SekaiMasterDB from "../providers/sekai-master-db"
import PlayerRanking from "../interface/models/ranking"
import { EventProfileModel } from "../models/event_profile"
import RankingSnapshot, { SekaiRanking } from "../interface/models/snapshot"
import { sha256 } from "../util/hash"

function populateUsersMap(map: Record<string, PlayerRanking>, users: PlayerRanking[]) {
	for(const user of users) {
		map[user.userId] = user
	}
}

export default class EventTracker {
	private static client: SekaiApiClient
	public static leaderboard: any = {
		event: {},
		rankings: [],
		updated_at: null
	}

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

	public static async getPastHourRanking() {
		const now = new Date()
		const currentEvent = SekaiMasterDB.getCurrentEvent()
		const currentChapter = SekaiMasterDB.getCurrentWorldBloomChapter()

		const pastHour = new Date(now.getTime() - 3600 * 1000)
		let rankingPastHour: {rankings: PlayerRanking[], userWorldBloomChapterRankings?: RankingSnapshot["userWorldBloomChapterRankings"]}[] = await RankingSnapshotModel.find({eventId: currentEvent.id, createdAt: {$gte: pastHour}}).lean()
		if(currentChapter != null) {
			rankingPastHour = rankingPastHour.map(x => x.userWorldBloomChapterRankings.find(x => x.gameCharacterId === currentChapter.gameCharacterId))
		}

		return rankingPastHour
	}

	private static async updateUserProfiles(snapshot: RankingSnapshot) {
		const users: Record<string, PlayerRanking> = {}

		populateUsersMap(users, snapshot.rankings)
		if(snapshot.userWorldBloomChapterRankings?.length > 0) {
			snapshot.userWorldBloomChapterRankings.forEach(x => populateUsersMap(users, x.rankings))
		}

		await EventProfileModel.bulkWrite(Object.values(users).map(user => {
			return {
				updateOne: {
					filter: {userId: user.userId, eventId: snapshot.eventId},
					update: {
						$set: user
					},
					upsert: true
				}
			}
		}))
	}

	private static async updateLeaderboard() {
		console.log("[EventTracker] Updating leaderboard...")

		const now = new Date()
		const currentEvent = SekaiMasterDB.getCurrentEvent()
		if(!currentEvent) {
			this.leaderboard = {
				event: {},
				rankings: [],
				updated_at: now
			}
			console.log("[EventTracker] No current event")
			return
		}
		const currentChapter = SekaiMasterDB.getCurrentWorldBloomChapter()

		// Save current leaderboard snapshot
		let ranking: SekaiRanking
		try {
			ranking = await this.client.getRankingTop100(currentEvent.id) as SekaiRanking
		} catch(ex) {
			this.leaderboard.update_error = true

			console.error("[EventTracker] Update failed:", ex)
			return
		}

		ranking.rankings.forEach(user => user.userId = user.userId.toString())
		if(ranking.userWorldBloomChapterRankings?.length > 0) {
			ranking.userWorldBloomChapterRankings.forEach(x => x.rankings.forEach(user => user.userId = user.userId.toString()))
		}

		const snapshot: RankingSnapshot = {
			...ranking,
			eventId: currentEvent.id,
			createdAt: now
		}

		const eventInProgress = now < new Date(currentEvent.rankingAnnounceAt.getTime() + 3 * 60 * 1000)
		if(eventInProgress) {
			await RankingSnapshotModel.create(snapshot)
			await this.updateUserProfiles(snapshot)
		}

		// Update data sent to frontend
		const rankingPastHour = await this.getPastHourRanking()
		let currentRanking = ranking.rankings
		if(currentChapter != null) {
			currentRanking = ranking.userWorldBloomChapterRankings.find(x => x.gameCharacterId === currentChapter.gameCharacterId).rankings
		}

		const currentLb = currentRanking.map(user => {
			const hash = sha256(user.userId + "_" + currentEvent.assetbundleName)

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
				team: user.userCheerfulCarnival?.cheerfulCarnivalTeamId,
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
				name_key: currentEvent.assetbundleName,
				ends_at: currentEvent.aggregateAt
			},
			rankings: currentLb,
			updated_at: now
		}
		if(currentChapter != null) {
			this.leaderboard.event.chapter_character = currentChapter.gameCharacterId
			this.leaderboard.event.ends_at = currentChapter.aggregateAt
		}

		console.log("[EventTracker] Updated!")
	}
}