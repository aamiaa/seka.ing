import SekaiApiClient from "sekai-api"
import HttpsProxyAgent from "https-proxy-agent"
import crypto from "crypto"
import fs from "fs"
import path from "path"

const HistoryCacheFile = path.join(__dirname, "..", "..", "history.json")

export default class EventTracker {
	private static client: SekaiApiClient
	public static leaderboard = []
	private static history = []

	public static async init() {
		try {
			await fs.promises.access(HistoryCacheFile, fs.constants.F_OK)

			const history = JSON.parse((await fs.promises.readFile(HistoryCacheFile)).toString())
			history.sort((a,b) => a.date - b.date)
			history.forEach(x => x.date = new Date(x.date).getTime())
			this.history = history.filter(x => Date.now() - x.date < 3600 * 1000)
		} catch(ex) {}

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

		const data = await this.client.getRankingTop100(111)
		const currentLb = data.rankings.map(user => {
			const hash = crypto.createHash("sha256").update(user.userId.toString() + "_event_warmth_2023").digest("hex")

			let earliest = user.score
			for(const entry of this.history) {
				const currentUserSlot = entry.lb.find(x => x.hash === hash)
				if(currentUserSlot) {
					earliest = currentUserSlot.score
					break
				}
			}

			const differentValues = new Set<number>()
			for(const entry of this.history) {
				const currentUserSlot = entry.lb.find(x => x.hash === hash)
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

		this.leaderboard = currentLb
		this.history.push({date: Date.now(), lb: currentLb})
		this.history = this.history.filter(x => Date.now() - x.date < 3600 * 1000)

		await fs.promises.writeFile(HistoryCacheFile, JSON.stringify(this.history))

		console.log("[EventTracker] Updated!")
	}
}