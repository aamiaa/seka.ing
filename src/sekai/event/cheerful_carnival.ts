import { UserAnnounce } from "sekai-api"
import { SekaiEventType } from "../../interface/event"
import { CheerfulCarnivalAnnouncementModel } from "../../models/cc_announce"
import SekaiMasterDB from "../../providers/sekai-master-db"
import CacheStore from "../../webserv/cache"
import ApiClient from "../api"
import { sleep } from "../../util/sleep"

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

export default class CheerfulCarnivalTracker {
	private static lastAnnounceCheckAt: Date

	public static async init() {
		CacheStore.set("cc_announce", {
			announcements: [],
			updated_at: new Date(0)
		})

		this.updateLoop()
		console.log("[CheerfulCarnivalTracker] Started!")
	}


	private static async updateLoop() {
		while(true) {
			try {
				await this.updateAnnouncements()
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
		CacheStore.set("cc_announce", {
			announcements: lastAnnouncements.map(x => x.message),
			team_stats: teamStats,
			updated_at: this.lastAnnounceCheckAt
		})
		console.log("[CheerfulCarnivalTracker] Updated!")
	}
}