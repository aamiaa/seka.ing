import proxyRequest from "../util/proxy";
import { dateFromPTString } from "../util/time";
import CacheStore from "../webserv/cache";

export default class MaintenanceTracker {
	public static async init() {
		await this.updateMaintenance()
		setInterval(this.updateMaintenance.bind(this), 30 * 60 * 1000)
		console.log("[MaintenanceTracker] Started!")
	}

	private static async updateMaintenance() {
		const active = await this.getActiveMaintenance()
		CacheStore.set("active_maintenance", active)

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

		const startsAt = dateFromPTString(startDateStr)
		const endsAt = dateFromPTString(endDateStr)

		return {
			startsAt,
			endsAt
		}
	}
}