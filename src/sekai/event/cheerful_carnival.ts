import { UserAnnounce } from "sekai-api"
import { SekaiEventType } from "../../interface/event"
import { CheerfulCarnivalAnnouncementModel } from "../../models/cc_announce"
import SekaiMasterDB from "../../providers/sekai-master-db"
import CacheStore from "../../webserv/cache"
import ApiClient from "../api"
import { sleep } from "../../util/sleep"
import { CheerfulCarnivalStatsDTO } from "../../webserv/dto/cc_stats"
import { CheerfulCarnivalMidtermModel } from "../../models/cc_midterm"

function getAnnouncementValue(announcement: UserAnnounce) {
	switch(announcement.cheerfulCarnivalAnnounceType) {
		case "victory_bonus_live":
			return announcement.message.match(/group's .+ has won in the x(\d+) special match!$/)?.[1]
		case "consecutive_wins":
			return announcement.message.match(/group's .+ is on a (\d+) winning streak!$/)?.[1] ?? announcement.message.match(/^The .+'s .+ has broken Team .+'s (\d+) winning streak!$/)?.[1]
		case "stopped_consecutive_wins":
			return announcement.message.match(/^The .+'s .+ has broken Team .+'s (\d+) winning streak!$/)?.[1]
	}
}

function getMidtermSeq(termType: string) {
	switch(termType) {
		case "cheerful_carnival_team_point_1st":
			return 1
		case "cheerful_carnival_team_point_2nd":
			return 2
		case "cheerful_carnival_team_point_final":
			return 3
		default:
			throw new Error("Unknown midterm")
	}
}

export default class CheerfulCarnivalTracker {
	private static lastAnnounceCheckAt: Date

	public static async init() {
		CacheStore.set("cc_announce", {
			announcements: [],
			team_stats: [],
			updated_at: new Date(0)
		} as CheerfulCarnivalStatsDTO)

		this.updateLoop()
		console.log("[CheerfulCarnivalTracker] Started!")
	}


	private static async updateLoop() {
		while(true) {
			try {
				await this.updateAnnouncements()
				await this.updateMidtermResults()
				await this.updateCache()
				await sleep(30000)
			} catch(ex) {
				console.error("[CheerfulCarnivalTracker]", ex)
				await sleep(3000)
			}
		}
	}
	private static async updateAnnouncements() {
		const event = SekaiMasterDB.getCurrentEvent()
		if(!event || event.eventType !== SekaiEventType.CHEERFUL_CARNIVAL) {
			return
		}
		if(Date.now() > event.aggregateAt.getTime()) {
			return
		}

		console.log("[CheerfulCarnivalTracker] Updating announcements...")

		if(!this.lastAnnounceCheckAt) {
			const lastEntry = await CheerfulCarnivalAnnouncementModel.findOne({eventId: event.id}, null, {sort: {from: -1}})
			if(lastEntry) {
				this.lastAnnounceCheckAt = lastEntry.to
			}
		}

		const from = (this.lastAnnounceCheckAt ?? event.startAt).getTime()
		for(let i=from;i+60000<Date.now();i+=60000) {
			console.log("[CheerfulCarnivalTracker] Fetching announcements from", i, "to", i + 60000)

			const res = await ApiClient.getCheerfulCarnivalAnnouncements(event.id, i, i + 60000)
			if(res.announces) {
				console.log("[CheerfulCarnivalTracker] Oh nice a new one!")

				CheerfulCarnivalAnnouncementModel.insertMany(res.announces.map(x => ({
					...x,
					from: new Date(i),
					to: new Date(i + 60000),
					value: getAnnouncementValue(x)
				})))
			}

			this.lastAnnounceCheckAt = new Date(i + 60000)
		}

		console.log("[CheerfulCarnivalTracker] Announcements updated!")
	}

	private static async updateMidtermResults() {
		const event = SekaiMasterDB.getCurrentEvent()
		if(!event || event.eventType !== SekaiEventType.CHEERFUL_CARNIVAL) {
			return
		}

		const summary = SekaiMasterDB.getCheerfulCarnivalSummary(event.id)
		if(Date.now() < summary.midtermAnnounce1At.getTime()) {
			return
		}

		const knownMidterms = (await CheerfulCarnivalMidtermModel.find({eventId: event.id}).lean()).map(x => x.term)
		const shouldFetch = 
			(Date.now() >= event.rankingAnnounceAt.getTime() && !knownMidterms.includes(3)) ||
			(Date.now() >= summary.midtermAnnounce2At.getTime() && !knownMidterms.includes(2)) ||
			(Date.now() >= summary.midtermAnnounce1At.getTime() && !knownMidterms.includes(1))

		if(shouldFetch) {
			console.log("[CheerfulCarnivalTracker] Updating midterms...")

			const {cheerfulCarnivalTeamPoints: midterms} = await ApiClient.getCheerfulCarnivalTeamPoints(event.id)
			await CheerfulCarnivalMidtermModel.bulkWrite(Object.values(midterms).map((midterm: any) => {
				return {
					updateOne: {
						filter: {
							eventId: event.id,
							teamId: midterm.cheerfulCarnivalTeamId,
							term: getMidtermSeq(midterm.cheerfulCarnivalTeamPointTermType)
						},
						update: {
							$set: {
								result: midterm.cheerfulCarnivalResultType,
								points: midterm.point
							}
						},
						upsert: true
					}
				}
			}))

			console.log("[CheerfulCarnivalTracker] Midterms updated!")
		}
	}

	private static async updateCache() {
		const event = SekaiMasterDB.getCurrentEvent()
		if(!event || event.eventType !== SekaiEventType.CHEERFUL_CARNIVAL) {
			return
		}

		const lastAnnouncements = await CheerfulCarnivalAnnouncementModel.find({
			eventId: event.id,
			to: this.lastAnnounceCheckAt,
			cheerfulCarnivalAnnounceType: {$ne: "stopped_consecutive_wins"} // dedupe the two messages
		}, {message: 1})

		const teamStats = await CheerfulCarnivalAnnouncementModel.aggregate([
			{
				$match: {
					eventId: event.id,
					cheerfulCarnivalAnnounceType: "victory_bonus_live"
				}
			},
			{
				$group: {
					_id: "$cheerfulCarnivalTeamId",
					total_bonus: {$sum: "$value"}
				}
			},
			{
				$project: {
					_id: 0,
					team_id: "$_id",
					total_bonus: 1
				}
			},
			{
				$sort: {team_id: 1}
			}
		])

		const midterms = await CheerfulCarnivalMidtermModel.find({eventId: event.id}).sort({term: -1})
		for(const midterm of midterms) {
			const team = teamStats.find(x => x.team_id === midterm.teamId)
			if(team) {
				team.midterm = {
					points: midterm.points,
					seq: midterm.term
				}
			}
		}
	
		CacheStore.set("cc_announce", {
			announcements: lastAnnouncements.map(x => x.message),
			team_stats: teamStats,
			updated_at: this.lastAnnounceCheckAt
		} as CheerfulCarnivalStatsDTO)
	}
}