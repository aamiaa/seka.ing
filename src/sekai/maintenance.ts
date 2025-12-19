import proxyRequest from "../util/proxy";
import { dateFromJSTString, dateFromPTString } from "../util/time";
import CacheStore from "../webserv/cache";

export default class MaintenanceTracker {
	public static async init() {
		await this.updateMaintenance()
		setInterval(this.updateMaintenance.bind(this), 30 * 60 * 1000)
		console.log("[MaintenanceTracker] Started!")
	}

	private static async updateMaintenance() {
		try {
			const active = await this.getActiveMaintenance()
			CacheStore.set("active_maintenance", active)

			console.log("[MaintenanceTracker] Updated!")
		} catch(ex) {
			console.error(`[MaintenanceTracker] Failed to update: ${ex.message}`)
		}
	}

	private static async getActiveMaintenance() {
		switch(process.env.SEKAI_SERVER) {
			case "en":
				return await this.getActiveMaintenanceEN()
			case "jp":
				return await this.getActiveMaintenanceJP()
		}
	}

	private static async getActiveMaintenanceEN() {
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

	public static async getActiveMaintenanceJP() {
		const {data: page} = await proxyRequest({
			url: "https://production-web.sekai.colorfulpalette.org/maintenance-body/maintenance.html",
			method: "get"
		}, 2)

		const match = page.match(/■実施期間■<br>\n^\s*(\d+月\d+日\d+時\d+分) ～ (\d+月\d+日\d+時\d+分)<br>/m)
		const startDateStr = match?.[1]
		const endDateStr = match?.[2]
		if(!startDateStr || !endDateStr) {
			console.error("[MaintenanceTracker] Failed to fetch maintenance start/end!")
			return
		}

		const startsAt = dateFromJSTString(startDateStr)
		const endsAt = dateFromJSTString(endDateStr)

		return {
			startsAt,
			endsAt
		}
	}
}