import axios from "axios"
import {parse} from "node-html-parser"
import {BorderSnapshot, RankingSnapshot} from "../src/interface/models/snapshot"
import {SekaiEvent} from "../src/interface/event"
import dotenv from "dotenv"
import {Database} from "../src/providers/database"
import {EventProfileModel} from "../src/models/event_profile"
import {RankingSnapshotModel, BorderSnapshotModel} from "../src/models/snapshot/model"
import readline from "readline"
import fs from "fs"

dotenv.config({path: __dirname + "/../.env"})

import ApiClient from "../src/sekai/api"

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
})

async function ask(prompt: string): Promise<string> {
	return await new Promise(resolve => {
		rl.question(prompt, resolve)
	})
}

async function bruteforceUserId(userId: string) {
	const id = BigInt(userId)
	for(let i=0;i<=100;i++) {
		const currentId = (id + BigInt(i)).toString()
		if(parseInt(currentId) !== parseInt(id.toString())) continue

		try {
			const pr = await ApiClient.getUserProfile(currentId)
			return pr.user.userId
		} catch(ex) {}
	}

	for(let i=1;i<=100;i++) {
		const currentId = (id - BigInt(i)).toString()
		if(parseInt(currentId) !== parseInt(id.toString())) continue

		try {
			const pr = await ApiClient.getUserProfile(currentId)
			return pr.user.userId
		} catch(ex) {}
	}

	throw new Error("Failed to bruteforce user id " + userId)
}

async function main() {
	const eventId = parseInt(await ask("Enter the event id: "))
	const afterDate = new Date(await ask("Enter the starting date: "))
	const beforeDate = new Date(await ask("Enter the ending date: "))

	if(isNaN(eventId)) {
		throw new Error("Invalid event id!")
	}
	if(isNaN(afterDate.getTime())) {
		throw new Error("Invalid starting date!")
	}
	if(isNaN(beforeDate.getTime())) {
		throw new Error("Invalid ending date!")
	}
	if(beforeDate.getTime() < afterDate.getTime()) {
		throw new Error("Invalid date range!")
	}

	process.env.NODE_ENV = "production"
	await Database.init()

	await ApiClient.init()
	await ApiClient.authenticate({
		credential: process.env.SEKAI_AUTH,
		deviceId: process.env.SEKAI_DEVICE_ID,
		installId: process.env.SEKAI_INSTALL_ID
	})

	const {data: events} = await axios.get<SekaiEvent[]>("https://raw.githubusercontent.com/aamiaa/sekai-en-diff/refs/heads/main/modules/events.json")
	const event = events.find(x => x.id === eventId)
	if(!event) {
		throw new Error("Event not found!")
	}
	event.startAt = new Date(event.startAt)

	console.log("Initiating data import for event", event.name)

	const eventRes = await axios.get(`http://${process.env.AI0_HOST}/Event${eventId}/`)
	const files = parse(eventRes.data).querySelectorAll("a[href]")
		.map(x => x.getAttribute("href")
		?.substring(2))
		.filter(x => x?.match(/^\d+\.csv$/))
		.filter(x => x != null)
		.sort((a,b) => parseInt(a.substring(2, a.length - 4)) - parseInt(b.substring(2, a.length - 4)))

	const users = (await EventProfileModel.find({eventId}, {userId: 1, name: 1}).lean()) as {userId: string, name?: string}[]
	const snapshots: RankingSnapshot[] = []
	const borderSnapshots: BorderSnapshot[] = []

	let resolveUserId = function(id: string) {
		for(const user of users) {
			if(parseInt(id) === parseInt(user.userId)) {
				return user.userId
			}
		}

		return null
	}

	for(const [fileIdx, file] of files.entries()) {
		const rank = parseInt(file.split(".")[0])
		const isT100 = rank <= 100

		console.log("Downloading file", file)
		const {data: fileData} = await axios.get<string>(`http://${process.env.AI0_HOST}/Event${eventId}/${file}`)
		const lines = fileData.split("\n").slice(1)
		for(const line of lines) {
			if(!line) continue
			const [time, score, fakeUserId] = line.split(",")

			const timestamp = new Date(event.startAt.getTime() + parseInt(time))
			if(timestamp.getTime() < afterDate.getTime() || timestamp.getTime() > beforeDate.getTime()) continue

			const scoreNum = parseInt(score)
			let actualUserId = resolveUserId(fakeUserId)
			if(!actualUserId) {
				const possibleUser = await EventProfileModel.findOne({userId: {$regex: new RegExp(`^${fakeUserId.substring(0, fakeUserId.length-3)}`)}}).lean()
				if(possibleUser && parseInt(fakeUserId) === parseInt(possibleUser.userId)) {
					actualUserId = possibleUser.userId
					users.push({name: null, userId: possibleUser.userId})
					console.log("Guessed the user id", actualUserId, "from", fakeUserId)
				} else {
					console.log("Attempting to bruteforce user id", fakeUserId)
					actualUserId = await bruteforceUserId(fakeUserId)
					console.log("Success!", actualUserId)
					users.push({name: null, userId: actualUserId})
				}
			}
			while(!actualUserId) {
				console.log("Unable to resolve user id", fakeUserId, "found in file", file)
				const input = await ask("Please enter the manually resolved user id: ")
				if(parseInt(input) === parseInt(fakeUserId)) {
					actualUserId = input
					users.push({name: null, userId: actualUserId})
				}
			}

			if(isT100) {
				let entry = snapshots.find(x => x.createdAt.getTime() === timestamp.getTime())
				if(!entry) {
					entry = {
						eventId,
						rankings: [],
						source: "ai0",
						isEventAggregate: false,
						createdAt: timestamp
					}
					snapshots.push(entry)
				}
				entry.rankings.push({
					userId: actualUserId,
					score: scoreNum,
					rank,
					name: users.find(x => x.userId === actualUserId)?.name
				})
				entry.rankings.sort((a,b) => a.rank - b.rank)
			} else {
				let entry = borderSnapshots.find(x => x.createdAt.getTime() === timestamp.getTime())
				if(!entry) {
					entry = {
						eventId,
						borderRankings: [],
						source: "ai0",
						isEventAggregate: false,
						createdAt: timestamp
					}
					borderSnapshots.push(entry)
				}
				entry.borderRankings.push({
					userId: actualUserId,
					score: scoreNum,
					rank,
					name: users.find(x => x.userId === actualUserId)?.name
				})
				entry.borderRankings.sort((a,b) => a.rank - b.rank)
			}
		}
	}

	// dedupe border rankings
	const dedupedBordersnapshots: BorderSnapshot[] = []
	for(const [entryIdx, entry] of borderSnapshots.entries()) {
		const currentHash = new BorderSnapshotModel(entry).getHash()
		const lastHash = new BorderSnapshotModel(dedupedBordersnapshots.at(-1)).getHash()

		if(dedupedBordersnapshots.length === 0 || currentHash !== lastHash) {
			dedupedBordersnapshots.push(entry)
		}
	}

	// backfill t100 for border rankings
	for(const [entryIdx, entry] of dedupedBordersnapshots.entries()) {
		const t100 = snapshots.findLast(x => x.createdAt.getTime() <= entry.createdAt.getTime())
		if(!t100) {
			throw new Error("Couldn't backfill t100 for border entry " + entryIdx)
		}
		entry.borderRankings.splice(0, 0, t100.rankings[99])
	}

	console.log("Verifying integrity...")
	for(const [entryIdx, entry] of snapshots.entries()) {
		for(const [rankingIdx, ranking] of entry.rankings.entries()) {
			if(rankingIdx !== ranking.rank - 1) {
				console.error("[Error] Found ranking index mismatch at entry idx", entryIdx, "ranking idx", rankingIdx, ranking)
			}
		}
	}

	// TODO: verify border rankings integrity

	fs.writeFileSync("snapshots.json", JSON.stringify(snapshots, null, 4))
	fs.writeFileSync("borderSnapshots.json", JSON.stringify(dedupedBordersnapshots, null, 4))

	await ask("Data written to files. Press enter to insert into db...")

	console.log("Inserting into db...")

	await RankingSnapshotModel.insertMany(snapshots)
	await BorderSnapshotModel.insertMany(dedupedBordersnapshots)

	console.log("Finished!")

	fs.unlinkSync("snapshots.json")
	fs.unlinkSync("borderSnapshots.json")
	process.exit()
}
main()