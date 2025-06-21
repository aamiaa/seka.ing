import { NextFunction, Request, Response } from "express";
import SekaiMasterDB from "../../providers/sekai-master-db";
import { PipelineStage } from "mongoose";
import { SekaiEventType } from "../../interface/event";
import { RankingSnapshotModel } from "../../models/snapshot/model";
import { predict } from "../../util/math";
import { EventProfileModel } from "../../models/event_profile";
import { sha256 } from "../../util/hash";
import CacheStore from "../cache";
import { decryptEventSnowflake } from "../../util/cipher";
import { EventProfileDTO } from "../dto/event_profile";
import { UserCardDefaultImage, UserCardSpecialTrainingStatus } from "sekai-api";

export default class EventController {
	public static async getEvents(req: Request, res: Response, next: NextFunction) {
		const events = SekaiMasterDB.getEvents().map(event => {
			let honors = event.eventRankingRewardRanges.filter(x => 
				SekaiMasterDB.getResourceBox(x.eventRankingRewards[0].resourceBoxId, "event_ranking_reward")?.details?.find(x => x.resourceType === "honor")
			).map(range => ({
				rank: range.toRank,
				image: `/images/honor/event/${event.id}/${range.toRank}.png`
			}))
			
			if(event.eventType === SekaiEventType.WORLD_BLOOM) {
				SekaiMasterDB.getWorldBloomChapters(event.id).forEach(chapter => {
					honors = honors.concat(
						SekaiMasterDB.getWorldBloomChapterRankingRewardRanges(event.id, chapter.gameCharacterId).map(range => ({
							rank: range.toRank,
							image: `/images/honor/event/${event.id}/${range.toRank}.png?chapter=${chapter.chapterNo}`
						}))
					)
				})
			}
			return {
				id: event.id,
				name: event.name,
				name_key: event.assetbundleName,
				honors
			}
		})

		return res.json(events)
	}

	public static async getLeaderboard(req: Request, res: Response, next: NextFunction) {
		if(req.query.nocache) {
			res.set("Cache-Control", "no-store")
		}
		return res.json(CacheStore.get("leaderboard"))
	}

	public static async getAnnouncements(req: Request, res: Response, next: NextFunction) {
		res.set("Cache-Control", "no-store")
		return res.json(CacheStore.get("cc_announce"))
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

	public static async getWorldlinkGraph(req: Request, res: Response, next: NextFunction) {
		let includeAll = req.query.all === "true"

		const currentEvent = SekaiMasterDB.getCurrentEvent()
		if(!includeAll && currentEvent?.eventType !== SekaiEventType.WORLD_BLOOM) {
			includeAll = true
		}

		const chapters = includeAll ? SekaiMasterDB.getAllWorldBloomChapters() : SekaiMasterDB.getWorldBloomChapters(currentEvent.id)
		const currentChapter = SekaiMasterDB.getCurrentWorldBloomChapter()

		const points: Record<string, any[]> = {}
		const colors: Record<string, string> = {}
		const query: PipelineStage.Facet["$facet"] = {}
		chapters.forEach(chapter => {
			const name = SekaiMasterDB.getGameCharacter(chapter.gameCharacterId).givenName
			colors[name] = SekaiMasterDB.getCharacterColor(chapter.gameCharacterId)

			const isPastChapter = currentChapter == null || chapter.eventId !== currentEvent.id || chapter.chapterNo < currentChapter.chapterNo
			const isFutureChapter = currentChapter != null && !isPastChapter && chapter.chapterNo > currentChapter.chapterNo
			const graphCache = CacheStore.get<any>(`wl_graph_${name}`)
			if(isPastChapter && graphCache) {
				points[name] = graphCache
			} else if(!isFutureChapter) {
				query[name] = [
					{
						$match: {
							createdAt: {
								$gte: chapter.chapterStartAt,
								$lte: chapter.aggregateAt
							}
						}
					},
					{
						$project: {
							_id: 0,
							points: {
								$getField: {
									field: "score",
									input: {
										$arrayElemAt: [
											{
												$arrayElemAt: [
													"$userWorldBloomChapterRankings.rankings",
													chapter.chapterNo - 1
												]
											},
											99
										]
									}
								}
							},
							createdAt: 1
						}
					},
					{
						$group: {
							_id: {
								$dateTrunc: {
									date: "$createdAt",
									unit: "minute",
									binSize: isPastChapter ? 5 : 1
								}
							},
							points: {
								$first: "$points"
							}
						}
					},
					{
						$sort: {_id: 1}
					},
					{
						$project: {
							_id: 0,
							y: "$points",
							x: {
								$dateDiff: {
									startDate: chapter.chapterStartAt,
									endDate: "$_id",
									unit: "minute"
								}
							}
						}
					}
				]
			}
		})

		// Length will be 0 if all chapters are cached (i.e. no ongoing chapter)
		// in which case don't query the db
		if(Object.keys(query).length > 0) {
			const results = await RankingSnapshotModel.aggregate([
				{
					$match: {
						eventId: includeAll ? {
							$in: SekaiMasterDB.getEvents().filter(x => x.eventType === SekaiEventType.WORLD_BLOOM).map(x => x.id)
						} : currentEvent.id
					}
				},
				{
					$facet: query
				}
			])

			for(const [name, vals] of Object.entries(results[0])) {
				points[name] = (vals as any)
				CacheStore.set(`wl_graph_${name}`, vals)
			}
		}

		let now: number
		if(currentChapter) {
		    now = Math.floor((Date.now() - currentChapter.chapterStartAt.getTime())/60000)
		    now = Math.round(now/100)*100
		} else {
		    now = 4100
		}
		return res.json({
			points,
			colors,
			now
		})
	}

	public static async getPlayerEventProfile(req: Request, res: Response, next: NextFunction) {
		const hash = req.params.hash as string

		let eventId: number, userId: string
		try {
			const data = decryptEventSnowflake(hash)
			eventId = data.eventId
			userId = data.snowflake
		} catch(ex) {
			return res.status(400).send({error: "Invalid hash"})
		}

		const profile = await EventProfileModel.findOne({eventId, userId}).lean()
		if(!profile || !profile.fullProfileFetched) {
			return res.status(404).send({error: "Profile not found"})
		}

		const deckCardIds = [
			profile.userDeck.leader,
			profile.userDeck.subLeader,
			profile.userDeck.member3,
			profile.userDeck.member4,
			profile.userDeck.member5,
		]
		const response: EventProfileDTO = {
			name: profile.name,
			cards: profile.userCards.filter(x => deckCardIds.includes(x.cardId)).map(x => ({
				id: x.cardId,
				level: x.level,
				mastery: x.masterRank,
				trained: x.specialTrainingStatus === UserCardSpecialTrainingStatus.DONE,
				image: x.defaultImage === UserCardDefaultImage.SPECIAL_TRAINING ? 1 : 0
			})).sort((a,b) => deckCardIds.indexOf(a.id) - deckCardIds.indexOf(b.id)),
			talent: {
				basic_talent: profile.totalPower.basicCardTotalPower,
				area_item_bonus: profile.totalPower.areaItemBonus,
				character_rank_bonus: profile.totalPower.characterRankBonus,
				honor_bonus: profile.totalPower.honorBonus,
				total_talent: profile.totalPower.totalPower
			}
		}
		return res.json(response)
	}

	public static async getPlayerEventStats(req: Request, res: Response, next: NextFunction) {
		const hash = req.params.hash as string

		let eventId: number, userId: string
		try {
			const data = decryptEventSnowflake(hash)
			eventId = data.eventId
			userId = data.snowflake
		} catch(ex) {
			return res.status(400).send({error: "Invalid hash"})
		}

		// const recentGames = await RankingSnapshotModel.aggregate([
		// 	{
		// 		$match: {
		// 			eventId
		// 		}
		// 	},
		// 	{
		// 		$unwind: {
		// 			path: "$rankings"
		// 		}
		// 	},
		// 	{
		// 		$match: {
		// 			"rankings.userId": userId
		// 		}
		// 	},
		// 	{
		// 		$project: {
		// 			timestamp: "$createdAt",
		// 			score: "$rankings.score",
		// 		}
		// 	},
		// 	{
		// 		$setWindowFields: {
		// 			sortBy: {
		// 				timestamp: 1
		// 			},
		// 			output: {
		// 				previousScore: {
		// 					$shift: {
		// 						output: "$score",
		// 						by: -1
		// 					}
		// 				}
		// 			}
		// 		}
		// 	},
		// 	{
		// 		$project: {
		// 			_id: 0,
		// 			delta: {
		// 				$subtract: ["$score", "$previousScore"]
		// 			},
		// 			timestamp: 1
		// 		}
		// 	},
		// 	{
		// 		$match: {
		// 			timestamp: {$gte: new Date(Date.now() - 3600 * 1000)},
		// 			delta: {$gt: 0}
		// 		}
		// 	}
		// ])

		const timeline = await RankingSnapshotModel.aggregate([
			{
				$match: {
					eventId
				}
			},
			{
				$unwind: {
					path: "$rankings"
				}
			},
			{
				$match: {
					"rankings.userId": userId
				}
			},
			{
				$project: {
					timestamp: "$createdAt",
					score: "$rankings.score",
				}
			},
			{
				$group: {
					_id: "$score",
					timestamp: {$first: "$timestamp"}
				}
			},
			{
				$sort: {
					timestamp: 1
				}
			},
			{
				$project: {
					score: "$_id",
					timestamp: 1,
					_id: 0
				}
			}
		])

		return res.json({
			timeline
		})
	}
}