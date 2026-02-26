import axios from "axios"
import {SekaiEvent} from "../src/interface/event"
import dotenv from "dotenv"
import {Database} from "../src/providers/database"
import readline from "readline"
import mongoose from "mongoose"
import fs from "fs"
import { BorderSnapshotModel, BorderSnapshotSchema, IBorderSnapshotModel, IBorderSnapshotModelStatic, IRankingSnapshotModel, IRankingSnapshotModelStatic, RankingSnapshotModel, RankingSnapshotSchema } from "../src/models/snapshot/model"
import { IEventProfileModel, IEventProfileModelStatic, EventProfileSchema, EventProfileModel } from "../src/models/event_profile"

dotenv.config({path: __dirname + "/../.env"})

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
})

async function ask(prompt: string): Promise<string> {
	return await new Promise(resolve => {
		rl.question(prompt, resolve)
	})
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

	const {data: events} = await axios.get<SekaiEvent[]>("https://raw.githubusercontent.com/aamiaa/sekai-en-diff/refs/heads/main/modules/events.json")
	const event = events.find(x => x.id === eventId)
	if(!event) {
		throw new Error("Event not found!")
	}
	event.startAt = new Date(event.startAt)

	console.log("Initiating data import for event", event.name)

	const conn = await mongoose.createConnection("mongodb://localhost:27017/sekaing").asPromise()
	const RDRankingSnapshotModel = conn.model<IRankingSnapshotModel, IRankingSnapshotModelStatic>("snapshots", RankingSnapshotSchema)
	const RDBorderSnapshotModel = conn.model<IBorderSnapshotModel, IBorderSnapshotModelStatic>("border_snapshots", BorderSnapshotSchema)
	const RDEventProfileModel = conn.model<IEventProfileModel, IEventProfileModelStatic>("event_profiles", EventProfileSchema)

	const snapshots = await RDRankingSnapshotModel.find({eventId, createdAt: {$gt: afterDate, $lt: beforeDate}}).lean()
	const borderSnapshots = await RDBorderSnapshotModel.find({eventId, createdAt: {$gt: afterDate, $lt: beforeDate}}).lean()

	const userIds = new Set<string>()
	for(const snapshot of snapshots) {
		snapshot.rankings.forEach(x => userIds.add(x.userId))
		snapshot.userWorldBloomChapterRankings.forEach(x => 
			x.rankings.forEach(y => userIds.add(y.userId))
		)
	}
	for(const snapshot of borderSnapshots) {
		snapshot.borderRankings.forEach(x => userIds.add(x.userId))
		snapshot.userWorldBloomChapterRankingBorders.forEach(x => 
			x.borderRankings.forEach(y => userIds.add(y.userId))
		)
	}

	const userIdsArr = [...userIds.values()]
	const existingIds = (await EventProfileModel.find({eventId, userId: {$in: userIdsArr}}, {userId: 1}).lean()).map(x => x.userId)
	const missingIds = userIdsArr.filter(x => !existingIds.includes(x))

	const profiles = await RDEventProfileModel.find({eventId, userId: {$in: missingIds}}).lean()

	// Mark the snapshots as fetched from the redundancy node
	snapshots.forEach(x => x.source = "rd")
	borderSnapshots.forEach(x => x.source = "rd")
	profiles.forEach(x => x.source = "rd")

	fs.writeFileSync("snapshots.json", JSON.stringify(snapshots, null, 4))
	fs.writeFileSync("borderSnapshots.json", JSON.stringify(borderSnapshots, null, 4))
	fs.writeFileSync("profiles.json", JSON.stringify(profiles, null, 4))

	await ask("Data written to files. Press enter to insert into db...")

	console.log("Inserting into db...")

	await RankingSnapshotModel.insertMany(snapshots)
	await BorderSnapshotModel.insertMany(borderSnapshots)
	await EventProfileModel.insertMany(profiles)

	console.log("Finished!")

	fs.unlinkSync("snapshots.json")
	fs.unlinkSync("borderSnapshots.json")
	fs.unlinkSync("profiles.json")
	process.exit()
}

main()