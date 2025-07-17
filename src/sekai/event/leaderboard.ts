import { BorderSnapshotModel, RankingSnapshotModel } from "../../models/snapshot/model"
import SekaiMasterDB from "../../providers/sekai-master-db"
import { EventProfileModel } from "../../models/event_profile"
import { BorderSnapshot, RankingEntry, RankingSnapshot } from "../../interface/models/snapshot"
import { SekaiEvent, SekaiEventType } from "../../interface/event"
import CacheStore from "../../webserv/cache"
import { EventRankingBorderPage, EventRankingPage, UserCardDefaultImage, UserCardSpecialTrainingStatus, UserRanking } from "sekai-api"
import ApiClient from "../api"
import { encryptEventSnowflake } from "../../util/cipher"
import { sleep } from "../../util/sleep"
import { LeaderboardDTO } from "../../webserv/dto/leaderboard"
import { getEventDTO } from "../../transformers/event"
import { EventDTO } from "../../webserv/dto/event"

function populateUsersMap(map: Record<string, RankingEntry>, users: RankingEntry[]) {
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
		this.updateFullProfileData()
		
		console.log("[LeaderboardTracker] Started!")
	}

	public static async getPastHourRanking() {
		const now = new Date()
		const currentEvent = SekaiMasterDB.getCurrentEvent()

		const pastHour = new Date(now.getTime() - 3600 * 1000)
		const rankingPastHour = await RankingSnapshotModel.find({eventId: currentEvent.id, createdAt: {$gte: pastHour}}).lean()

		return rankingPastHour
	}

	public static async getPastHourBorders() {
		const now = new Date()
		const currentEvent = SekaiMasterDB.getCurrentEvent()

		const pastHour = new Date(now.getTime() - 3600 * 1000)
		const bordersPastHour = await BorderSnapshotModel.find({eventId: currentEvent.id, createdAt: {$gte: pastHour}}).lean()

		return bordersPastHour
	}

	private static processRankingDifference(event: SekaiEvent, currentRanking: UserRanking[], pastRankings: RankingEntry[][]): LeaderboardDTO["rankings"] {
		return currentRanking.map(user => {
			const hash = encryptEventSnowflake(event.id, user.userId)

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
				card: {
					id: user.userCard.cardId,
					level: user.userCard.level,
					mastery: user.userCard.masterRank,
					trained: user.userCard.specialTrainingStatus === UserCardSpecialTrainingStatus.DONE,
					image: user.userCard.defaultImage === UserCardDefaultImage.SPECIAL_TRAINING ? 1 : 0
				},
				hash,
				delta: user.score - earliest,
				average
			}
		})
	}

	private static processBordersDifference(event: SekaiEvent, currentRanking: UserRanking[], pastRankings: RankingEntry[][]) {
		return currentRanking.map(user => {
			// Doing it this way instead of pastRankings[0] since not all ranks will be immediately there (ex. t300k might take a while to appear)
			let earliest = user.score
			for(const entry of pastRankings) {
				const currentRankSlot = entry.find(x => x.rank === user.rank)
				if(currentRankSlot) {
					earliest = currentRankSlot.score
					break
				}
			}

			return {
				name: user.name,
				team: user.userCheerfulCarnival?.cheerfulCarnivalTeamId,
				score: user.score,
				rank: user.rank,
				card: {
					id: user.userCard.cardId,
					level: user.userCard.level,
					mastery: user.userCard.masterRank,
					trained: user.userCard.specialTrainingStatus === UserCardSpecialTrainingStatus.DONE,
					image: user.userCard.defaultImage === UserCardDefaultImage.SPECIAL_TRAINING ? 1 : 0
				},
				rank_delta: user.score - earliest
			}
		})
	}

	private static async updateUserProfiles(rankingSnapshot: RankingSnapshot, borderSnapshot: BorderSnapshot, onlyNew?: boolean) {
		const usersTop100: Record<string, UserRanking> = {}
		const usersBorders: Record<string, UserRanking> = {}

		populateUsersMap(usersTop100, rankingSnapshot.rankings)
		populateUsersMap(usersBorders, borderSnapshot.borderRankings)
		if(rankingSnapshot.userWorldBloomChapterRankings?.length > 0) {
			rankingSnapshot.userWorldBloomChapterRankings.forEach(x => {
				if(!x.isWorldBloomChapterAggregate) {
					populateUsersMap(usersTop100, x.rankings)
				}
			})
			borderSnapshot.userWorldBloomChapterRankingBorders.forEach(x => {
				if(!x.isWorldBloomChapterAggregate) {
					populateUsersMap(usersBorders, x.borderRankings)
				}
			})
		}

		await EventProfileModel.bulkWrite(Object.values(usersTop100).map(user => {
			const entry = {
				...user,
				wasTop100: true,
			}
			return {
				updateOne: {
					filter: {userId: user.userId, eventId: rankingSnapshot.eventId},
					update: onlyNew ? {
						$setOnInsert: entry
					} : {
						$set: entry
					},
					upsert: true
				}
			}
		}))
		await EventProfileModel.bulkWrite(Object.values(usersBorders).map(user => {
			return {
				updateOne: {
					filter: {userId: user.userId, eventId: rankingSnapshot.eventId},
					update: onlyNew ? {
						$setOnInsert: user
					} : {
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
		if(!ranking || !border || (Date.now() - now.getTime()) >= 45 * 1000) {
			return
		}

		// Edge case: ranking might be aggregate: false, while border might be aggregate: true in one go
		// This is why we check both
		if(ranking.isEventAggregate || border.isEventAggregate) {
			console.warn("[LeaderboardTracker] Event is aggregating")

			CacheStore.get<LeaderboardDTO>("leaderboard").aggregate_until = currentEvent.rankingAnnounceAt
			return
		}

		const rankingSnapshot: RankingSnapshot = {
			...ranking,
			eventId: currentEvent.id,
			createdAt: ranking.responseTime
		}
		const borderSnapshot = {
			...border,
			eventId: currentEvent.id,
			createdAt: ranking.responseTime
		}

		// Fix for worldlink chapters of borders api being unsorted
		if(currentEvent.eventType === SekaiEventType.WORLD_BLOOM) {
			const chapters = SekaiMasterDB.getWorldBloomChapters(currentEvent.id)
			const characters = chapters.map(x => x.gameCharacterId)

			border.userWorldBloomChapterRankingBorders.sort((a,b) => characters.indexOf(a.gameCharacterId) - characters.indexOf(b.gameCharacterId)) 
		}

		const eventInProgress = now < new Date(currentEvent.rankingAnnounceAt.getTime())
		const eventRanksDistributed = now >= new Date(currentEvent.distributionStartAt.getTime())
		if(eventInProgress) {
			// Save ranking snapshot
			await RankingSnapshotModel.create(rankingSnapshot)
			await this.updateUserProfiles(rankingSnapshot, borderSnapshot)

			// Check if borders have changed
			const borderEntry = new BorderSnapshotModel(borderSnapshot)
			const lastBorderEntry = await BorderSnapshotModel.findOne({eventId: currentEvent.id}, null, {sort: {createdAt: -1}})
			if(!lastBorderEntry || lastBorderEntry.getHash() !== borderEntry.getHash()) {
				await borderEntry.save()
			}
		} else if(!eventRanksDistributed) {
			// Save only a single "final" snapshot past event end, and repeat
			// whenever the leaderboard changes (ex. due to account deletions)
			const rankingEntry = new RankingSnapshotModel(rankingSnapshot)
			rankingEntry.final = true
			const finalRankingEntry = await RankingSnapshotModel.findOne({eventId: currentEvent.id, final: true})
			if(!finalRankingEntry || finalRankingEntry.getHash() !== rankingEntry.getHash()) {
				await RankingSnapshotModel.updateMany({eventId: currentEvent.id, final: true}, {$unset: {final: ""}})
				await rankingEntry.save()
			}

			const borderEntry = new BorderSnapshotModel(borderSnapshot)
			borderEntry.final = true
			const finalBorderEntry = await BorderSnapshotModel.findOne({eventId: currentEvent.id, final: true})
			if(!finalBorderEntry || finalBorderEntry.getHash() !== borderEntry.getHash()) {
				await BorderSnapshotModel.updateMany({eventId: currentEvent.id, final: true}, {$unset: {final: ""}})
				await borderEntry.save()
			}

			// Only add unseen-before user profiles. Handles the edge case
			// where someone deletes their account after event end
			await this.updateUserProfiles(rankingSnapshot, borderSnapshot, true)
		}

		// Update data sent to frontend
		const rankingPastHour = await this.getPastHourRanking()
		const bordersPastHour = await this.getPastHourBorders()
		const currentRanking = ranking.rankings
		const currentBorders = border.borderRankings

		const lbCache: LeaderboardDTO = {
			event: getEventDTO(currentEvent),
			rankings: this.processRankingDifference(currentEvent, currentRanking, rankingPastHour.map(x => x.rankings)),
			borders: this.processBordersDifference(currentEvent, currentBorders, bordersPastHour.map(x => x.borderRankings)),
			updated_at: ranking.responseTime
		}
		CacheStore.set("leaderboard", lbCache)

		if(currentEvent.eventType === SekaiEventType.WORLD_BLOOM) {
			const chapters: EventDTO["chapters"] = SekaiMasterDB.getWorldBloomChapters(currentEvent.id)
				.map(x => ({
					title: SekaiMasterDB.getGameCharacter(x.gameCharacterId).givenName,
					num: x.chapterNo,
					character_id: x.gameCharacterId,
					color: SekaiMasterDB.getCharacterColor(x.gameCharacterId),
					starts_at: new Date(x.chapterStartAt),
					ends_at: new Date(x.aggregateAt)
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
				return []
			})
			lbCache.chapter_borders = chapters.map(chapter => {
				if(!ranking.userWorldBloomChapterRankings[chapter.num - 1].isWorldBloomChapterAggregate) {
					return this.processBordersDifference(
						currentEvent,
						border.userWorldBloomChapterRankingBorders.find(y => y.gameCharacterId === chapter.character_id).borderRankings,
						bordersPastHour.map(x => x.userWorldBloomChapterRankingBorders.find(y => y.gameCharacterId === chapter.character_id).borderRankings)
					)
				}
				return []
			})
		}

		if(nextEvent && (nextEvent.startAt.getTime() - Date.now()) <= 86400 * 1000) {
			lbCache.next_event = getEventDTO(nextEvent)
		}

		console.log("[LeaderboardTracker] Leaderboard updated!")
	}

	// Updates full profile data of users in top 100.
	// If a user was briefly in top 100 but hasn't had their data updated at all,
	// their data will be updated once.
	private static async updateFullProfileData() {
		const updateInterval = 10 * 60 * 1000

		while(true) {
			await sleep(20 * 1000)
			const now = new Date()

			const currentEvent = SekaiMasterDB.getCurrentEvent()
			if(!currentEvent) continue

			const eventInProgress = now < new Date(currentEvent.rankingAnnounceAt.getTime())
			if(!eventInProgress) continue

			const lastTop100 = await RankingSnapshotModel.findOne({eventId: currentEvent.id}, undefined, {sort: {createdAt: -1}, lean: true})
			if(!lastTop100) continue

			if(now.getTime() - lastTop100.createdAt.getTime() > 3 * 60 * 1000) {
				console.error("[LeaderboardTracker] Failed to run profile updates, as the last top 100 snapshot is too out of date!")
				continue
			}

			const top100UserIds = new Set<string>()
			lastTop100.rankings.forEach(x => top100UserIds.add(x.userId))
			lastTop100.userWorldBloomChapterRankings?.forEach(x => x.rankings.forEach(y => top100UserIds.add(y.userId)))

			// TODO: try/catch this to prevent the loop from aborting
			const nextProfiles = await EventProfileModel.find({
				eventId: currentEvent.id,
				wasTop100: true,
				$or: [
					{fullProfileFetched: false},
					{
						$and: [
							{userId: {$in: Array.from(top100UserIds)}},
							{fullProfileFetchedAt: {$lte: new Date(now.getTime() - updateInterval)}}
						]
					}
				]
			}, undefined, {sort: {updatedAt: 1}, lean: true})
			if(nextProfiles.length === 0) continue

			for(const nextProfile of nextProfiles) {
				try {
					const profile = await ApiClient.getUserProfile(nextProfile.userId)
					await EventProfileModel.updateOne({eventId: currentEvent.id, userId: nextProfile.userId}, {
						$set: {
							userDeck: profile.userDeck,
							userCards: profile.userCards,
							userCharacters: profile.userCharacters,
							totalPower: profile.totalPower,
							fullProfileFetched: true,
							fullProfileFetchedAt: now
						}
					})

					console.log("[LeaderboardTracker] Updated profile data of", nextProfile.userId)
				} catch(ex) {
					console.error("[LeaderboardTracker] Failed to update profile data of", nextProfile.userId, ex)
				}
			}
		}
	}
}