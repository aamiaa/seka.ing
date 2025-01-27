import { BorderSnapshotModel, RankingSnapshotModel } from "../../models/snapshot/model"
import SekaiMasterDB from "../../providers/sekai-master-db"
import { EventProfileModel } from "../../models/event_profile"
import { RankingSnapshot } from "../../interface/models/snapshot"
import { sha256 } from "../../util/hash"
import { SekaiEvent, SekaiEventType } from "../../interface/event"
import CacheStore from "../../webserv/cache"
import { EventRankingBorderPage, EventRankingPage, UserRanking } from "sekai-api"
import ApiClient from "../api"

interface PartialUserRanking {
	name: string,
	score: number,
	rank: number,
	hash: string,
	delta?: number,
	count?: number,
	average?: number
}

interface LeaderboardCacheEvent {
	name?: string,
	name_key?: string,
	type?: string,
	starts_at?: Date,
	ends_at?: Date,
	titles_at?: Date,
	chapters?: {
		title: string,
		num: number,
		color: string,
		starts_at: Date
	}[],
	chapter_num?: number,
	chapter_character?: number
}

interface LeaderboardCache {
	event: LeaderboardCacheEvent,
	next_event?: LeaderboardCacheEvent,
	rankings: PartialUserRanking[],
	borders: PartialUserRanking[],
	chapter_rankings?: PartialUserRanking[][],
	chapter_borders?: PartialUserRanking[][],
	updated_at?: Date,
	aggregate_until?: Date
}

function populateUsersMap(map: Record<string, UserRanking>, users: UserRanking[]) {
	for(const user of users) {
		map[user.userId] = user
	}
}

export default class LeaderboardTracker {
	public static async init() {
		CacheStore.set("leaderboard", {
			event: {},
			rankings: [],
			updated_at: null
		})

		await this.updateLeaderboard()
		setInterval(this.updateLeaderboard.bind(this), 60 * 1000)
		
		console.log("[LeaderboardTracker] Started!")
	}

	public static async getPastHourRanking() {
		const now = new Date()
		const currentEvent = SekaiMasterDB.getCurrentEvent()

		const pastHour = new Date(now.getTime() - 3600 * 1000)
		const rankingPastHour = await RankingSnapshotModel.find({eventId: currentEvent.id, createdAt: {$gte: pastHour}}).lean()

		return rankingPastHour
	}

	private static processRankingDifference(event: SekaiEvent, currentRanking: UserRanking[], pastRankings: UserRanking[][]) {
		return currentRanking.map(user => {
			const hash = sha256(user.userId + "_" + event.assetbundleName)

			let earliest = user.score
			for(const entry of pastRankings) {
				const currentUserSlot = entry.find(x => x.userId === user.userId)
				if(currentUserSlot) {
					earliest = currentUserSlot.score
					break
				}
			}

			const differentValues = new Set<number>()
			for(const entry of pastRankings) {
				const currentUserSlot = entry.find(x => x.userId === user.userId)
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
	}

	private static async updateUserProfiles(snapshot: RankingSnapshot) {
		const users: Record<string, UserRanking> = {}

		populateUsersMap(users, snapshot.rankings)
		if(snapshot.userWorldBloomChapterRankings?.length > 0) {
			snapshot.userWorldBloomChapterRankings.forEach(x => {
				if(!x.isWorldBloomChapterAggregate) {
					populateUsersMap(users, x.rankings)
				}
			})
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
		console.log("[LeaderboardTracker] Updating leaderboard...")

		const now = new Date()
		const currentEvent = SekaiMasterDB.getCurrentEvent()
		const nextEvent = SekaiMasterDB.getNextEvent()
		if(!currentEvent) {
			CacheStore.set("leaderboard", {
				event: {},
				rankings: [],
				updated_at: now
			})
			console.log("[LeaderboardTracker] No current event")
			return
		}
		const currentChapter = SekaiMasterDB.getCurrentWorldBloomChapter()

		// Save current leaderboard snapshot
		let ranking: EventRankingPage
		let border: EventRankingBorderPage
		for(let i=0;i<3;i++) {
			try {
				if(!ranking)
					ranking = await ApiClient.getRankingTop100(currentEvent.id)
				if(!border)
					border = await ApiClient.getRankingBorder(currentEvent.id)
				break
			} catch(ex) {
				console.error("[LeaderboardTracker] Update failed:", ex)
			}
		}
		if(!ranking || !border) {
			return
		}

		if(ranking.isEventAggregate) {
			console.warn("[LeaderboardTracker] Event is aggregating")

			CacheStore.get<LeaderboardCache>("leaderboard").aggregate_until = currentEvent.rankingAnnounceAt
			return
		}

		const rankingSnapshot: RankingSnapshot = {
			...ranking,
			eventId: currentEvent.id,
			createdAt: now
		}
		const borderSnapshot = {
			...border,
			eventId: currentEvent.id,
			createdAt: now
		}

		const eventInProgress = now < new Date(currentEvent.rankingAnnounceAt.getTime() + 3 * 60 * 1000)
		if(eventInProgress) {
			// Save ranking snapshot
			await RankingSnapshotModel.create(rankingSnapshot)
			await this.updateUserProfiles(rankingSnapshot)

			// Check if borders have changed
			const borderEntry = new BorderSnapshotModel(borderSnapshot)
			const lastBorderEntry = await BorderSnapshotModel.findOne({eventId: currentEvent.id}, null, {sort: {createdAt: -1}})
			if(!lastBorderEntry || lastBorderEntry.getHash() !== borderEntry.getHash()) {
				await borderEntry.save()
			}
		}

		// Update data sent to frontend
		const rankingPastHour = await this.getPastHourRanking()
		const currentRanking = ranking.rankings
		const currentBorder = border.borderRankings

		const currentLb = this.processRankingDifference(currentEvent, currentRanking, rankingPastHour.map(x => x.rankings))
		const lbCache: LeaderboardCache = {
			event: {
				name: currentEvent.name,
				name_key: currentEvent.assetbundleName,
				type: currentEvent.eventType,
				ends_at: currentEvent.aggregateAt,
				titles_at: currentEvent.distributionStartAt
			},
			rankings: currentLb,
			borders: this.processRankingDifference(currentEvent, currentBorder, []),
			updated_at: now
		}
		CacheStore.set("leaderboard", lbCache)

		if(currentEvent.eventType === SekaiEventType.WORLD_BLOOM) {
			const chapters = SekaiMasterDB.getWorldBloomChapters(currentEvent.id)
				.map(x => ({
					title: SekaiMasterDB.getGameCharacter(x.gameCharacterId).givenName,
					num: x.chapterNo,
					color: SekaiMasterDB.getCharacterColor(x.gameCharacterId),
					starts_at: new Date(x.chapterStartAt)
				}))

			lbCache.event.chapters = chapters
			
			if(currentChapter != null) {
				lbCache.event.chapter_num = currentChapter.chapterNo
				lbCache.event.chapter_character = currentChapter.gameCharacterId
				lbCache.event.ends_at = currentChapter.aggregateAt
			}

			lbCache.chapter_rankings = chapters.map(chapter => {
				if(!ranking.userWorldBloomChapterRankings[chapter.num - 1].isWorldBloomChapterAggregate) {
					return this.processRankingDifference(
						currentEvent,
						ranking.userWorldBloomChapterRankings[chapter.num - 1].rankings,
						rankingPastHour.map(x => x.userWorldBloomChapterRankings[chapter.num - 1].rankings)
					)
				}
			}).filter(x => x != null)
			lbCache.chapter_borders = chapters.map(chapter => {
				if(!ranking.userWorldBloomChapterRankings[chapter.num - 1].isWorldBloomChapterAggregate) {
					return this.processRankingDifference(
						currentEvent,
						border.userWorldBloomChapterRankingBorders[chapter.num - 1].borderRankings,
						[]
					)
				}
			}).filter(x => x != null)
		}

		if(nextEvent && (nextEvent.startAt.getTime() - Date.now()) <= 86400 * 1000) {
			lbCache.next_event = {
				name: nextEvent.name,
				name_key: nextEvent.assetbundleName,
				starts_at: nextEvent.startAt
			}
		}

		console.log("[LeaderboardTracker] Updated!")
	}
}