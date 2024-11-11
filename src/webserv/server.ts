import express, {Request, Response, NextFunction} from "express";
import { Server } from "http";
import EventLeaderboard from "../sekai/event";
import path from "path"
import axios from "axios";
import fs from "fs";
import SekaiMasterDB from "../providers/sekai-master-db";
import { SekaiEventType } from "../interface/event";
import { RankingSnapshotModel } from "../models/snapshot";
import { PipelineStage } from "mongoose";
import { predict } from "../util/math";
import { EventProfileModel } from "../models/event_profile";
import { sha256 } from "../util/hash";

class ExpressServer {
	public express: express.Application;
	public server: Server

	constructor() {
		this.express = express();
	}

	public init() {
		this.server = this.express.listen(6979, "127.0.0.1", () => console.log("[Express] Webserv started!"));

		this.express.disable("x-powered-by")
		this.express.use("/", express.static(path.join(__dirname, "..", "..", "public"), {maxAge: 14400}))
		this.express.get("/assets/event_:name.png", async (req, res, next) => {
			const eventName = req.params.name
			try {
				const filePath = path.join(__dirname, "..", "..", "public", "assets", `event_${eventName}.png`)
				const writer = fs.createWriteStream(filePath)
				const imgRes = await axios.get(`https://storage.sekai.best/sekai-en-assets/home/banner/event_${eventName}_rip/event_${eventName}.png`, {
					responseType: "stream"
				})
				await new Promise<void>((resolve, reject) => {
					imgRes.data.pipe(writer)
			
					writer.on("close", () => {
						resolve()
					})
					writer.on("error", err => {
						writer.close()
						reject(err)
					})
				})

				return res.sendFile(filePath)
			} catch(ex) {
				return next()
			}
		})
		this.express.get("/api/leaderboard", (req, res) => {
			return res.json(EventLeaderboard.leaderboard)
		})
		this.express.get("/api/prediction", async (req, res) => {
			const rank = parseInt(req.query.rank as string)
			const checkWorldlink = req.query.worldlink
			if(isNaN(rank) || !(rank >= 1 && rank <= 100)) {
				return res.status(400).json({error: "Invalid rank"})
			}

			const currentEvent = SekaiMasterDB.getCurrentEvent()
			if(!currentEvent || Date.now() > currentEvent.aggregateAt.getTime()) {
				return res.status(400).json({error: "No event in progress"})
			}

			let endDate = currentEvent.aggregateAt
			const pipeline: PipelineStage[] = [
				{
				  $match:
					{
					  eventId: currentEvent.id
					}
				},
				{
				  $unwind:
					{
					  path: "$rankings"
					}
				},
				{
				  $match:
					{
					  "rankings.rank": rank
					}
				},
				{
				  $project:
					{
					  date: "$createdAt",
					  number: "$rankings.score",
					  _id: 0
					}
				}
			]

			if(checkWorldlink === "true" && currentEvent.eventType === SekaiEventType.WORLD_BLOOM) {
				const currentChapter = SekaiMasterDB.getCurrentWorldBloomChapter()
				endDate = currentChapter.aggregateAt
				pipeline.splice(1, 0, {
					$project: {
						rankings: {
							$arrayElemAt: ["$userWorldBloomChapterRankings.rankings", currentChapter.chapterNo - 1],
						},
						createdAt: 1
					}
				})
			}

			const dataPoints = await RankingSnapshotModel.aggregate(pipeline)
			const prediction = predict(dataPoints, endDate)
			return res.json({prediction: Math.floor(prediction)})
		})
		this.express.get("/api/matches", async (req, res) => {
			const hash = req.query.hash
			const checkWorldlink = req.query.worldlink
			if(!hash) {
				return res.status(400).json({error: "Invalid hash"})
			}

			const currentEvent = SekaiMasterDB.getCurrentEvent()
			if(!currentEvent || Date.now() > currentEvent.aggregateAt.getTime()) {
				return res.status(400).json({error: "No event in progress"})
			}

			const userIds = (await EventProfileModel.find({}, {userId: 1})).map(x => x.userId)
			const userId = userIds.find(x => 
				hash === sha256(x + "_" + currentEvent.assetbundleName)
			)
			if(!userId) {
				return res.status(400).json({error: "Unable to find user for the hash"})
			}

			const pipeline: PipelineStage[] = [
				{
				  $match:
					{
					  eventId: currentEvent.id
					}
				},
				{
				  $unwind:
					{
					  path: "$rankings"
					}
				},
				{
				  $match:
					{
					  "rankings.userId": userId
					}
				},
				{
				  $project:
					{
					  score: "$rankings.score"
					}
				},
				{
				  $group:
				    {
					  _id: "$score"
				    }
				},
				{
				  $count: "matches"
				}
			]

			if(checkWorldlink === "true" && currentEvent.eventType === SekaiEventType.WORLD_BLOOM) {
				const currentChapter = SekaiMasterDB.getCurrentWorldBloomChapter()
				pipeline.splice(1, 0, {
					$project: {
						rankings: {
							$arrayElemAt: ["$userWorldBloomChapterRankings.rankings", currentChapter.chapterNo - 1],
						}
					}
				})
			}

			const result = await RankingSnapshotModel.aggregate(pipeline)
			return res.json(result[0])
		})

		this.express.all("*", (req, res) => {
			return res.redirect("/")
		})
		this.express.use((err: Error, req: Request, res: Response, next: NextFunction) => {
			console.error("[Express Error]", req.path, err)
			
			return res.status(500).send("Internal Server Error")
		})
	}
}

export default new ExpressServer()