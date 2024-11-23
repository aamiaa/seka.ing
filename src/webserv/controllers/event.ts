import { NextFunction, Request, Response } from "express";
import EventTracker from "../../sekai/event";
import SekaiMasterDB from "../../providers/sekai-master-db";
import { PipelineStage } from "mongoose";
import { SekaiEventType } from "../../interface/event";
import { RankingSnapshotModel } from "../../models/snapshot";
import { predict } from "../../util/math";
import { EventProfileModel } from "../../models/event_profile";
import { sha256 } from "../../util/hash";
import CacheStore from "../cache";

export default class EventController {
	public static async getLeaderboard(req: Request, res: Response, next: NextFunction) {
		res.set("Cache-Control", "no-store")
		return res.json(CacheStore.get("leaderboard"))
	}

	public static async getPrediction(req: Request, res: Response, next: NextFunction) {
		const rank = parseInt(req.query.rank as string)
		const checkWorldlink = req.query.worldlink

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
	}

	public static async getUserMatchesCount(req: Request, res: Response, next: NextFunction) {
		const hash = req.query.hash
		const checkWorldlink = req.query.worldlink

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
		if(result.length === 0) {
			return res.json({matches: 0})
		}
		return res.json(result[0])
	}
}