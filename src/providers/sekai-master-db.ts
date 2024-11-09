import axios from "axios";
import { SekaiEvent } from "../interface/event";

export default class SekaiMasterDB {
	private static events: SekaiEvent[] = []

	public static async init() {
		await this.refreshData()
		setInterval(this.refreshData.bind(this), 4 * 3600 * 1000)
	}

	private static async refreshData() {
		const res = await axios.get("https://github.com/Sekai-World/sekai-master-db-en-diff/raw/refs/heads/main/events.json")
		res.data.forEach(event => 
			["startAt", "aggregateAt", "rankingAnnounceAt", "distributionStartAt", "closedAt", "distributionEndAt"].forEach(field => event[field] = new Date(event[field]))
		)
		this.events = res.data
	}

	public static getCurrentEvent() {
		const now = new Date()
		return this.events.find(x => now < x.closedAt && now > x.startAt)
	}
}