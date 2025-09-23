import { GameMaintenanceModel } from "../../models/maintenance";
import proxyRequest from "../../util/proxy";
import { dateFromPTString } from "../../util/time";
import CacheStore from "../../webserv/cache";

export default class MaintenanceTracker {
	public static async init() {
		CacheStore.set("game_maintenance", {
			active_maintenance: null,
			planned_maintenances: []
		})

		await this.updateMaintenance()
		setInterval(this.updateMaintenance.bind(this), 30 * 60 * 1000)
		console.log("[MaintenanceTracker] Started!")
	}

	private static async updateMaintenance() {
		const active = await this.getActiveMaintenance()
		const planned = await this.getPlannedMaintenances()

		CacheStore.set("game_maintenance", {
			active_maintenance: active && active.endTime.getTime() > Date.now() ? {
				starts_at: active.startTime,
				ends_at: active.endTime
			} : null,
			planned_maintenances: planned.map(x => ({
				starts_at: x.startsAt,
				ends_at: x.endsAt,
				news_id: x.newsId
			}))
		})

		console.log("[MaintenanceTracker] Updated!")
	}

	private static async getActiveMaintenance() {
		const {data: page} = await proxyRequest({
			url: "https://n-production-web.sekai-en.com/maintenance-body/maintenance.html",
			method: "get"
		}, 2)

		const match = page.match(/■Maintenance Schedule■<br>\n^(.+?) PT - (.+?) PT<br>/m)
		const startDateStr = match?.[1]
		const endDateStr = match?.[2]
		if(!startDateStr || !endDateStr) {
			console.error("[MaintenanceTracker] Failed to fetch maintenance start/end!")
			return
		}

		const startTime = dateFromPTString(startDateStr)
		const endTime = dateFromPTString(endDateStr)

		return {
			startTime,
			endTime
		}
	}

	private static async getPlannedMaintenances() {
		return await GameMaintenanceModel.find({startsAt: {$gte: new Date()}}).lean()
	}
}