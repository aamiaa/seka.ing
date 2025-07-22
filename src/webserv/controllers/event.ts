import { NextFunction, Request, Response } from "express";
import SekaiMasterDB from "../../providers/sekai-master-db";
import { PipelineStage } from "mongoose";
import { SekaiEventType } from "../../interface/event";
import { RankingSnapshotModel } from "../../models/snapshot/model";
import { EventProfileModel } from "../../models/event_profile";
import CacheStore from "../cache";
import { decryptEventSnowflake } from "../../util/cipher";
import { EventProfileDTO } from "../dto/event_profile";
import { UserCardDefaultImage, UserCardSpecialTrainingStatus } from "sekai-api";
import { getEventDTO } from "../../transformers/event";

export default class EventController {
	public static async getEvents(req: Request, res: Response, next: NextFunction) {
		const withHonors = req.query.with_honors === "true"

		const events = SekaiMasterDB.getEvents().map(x => getEventDTO(x, {withHonors}))
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
			cards: profile.userCards.filter(x => deckCardIds.includes(x.cardId)).map(x => {
				const card = SekaiMasterDB.getCard(x.cardId)
				const character = SekaiMasterDB.getGameCharacter(card.characterId)

				return {
					id: x.cardId,
					level: x.level,
					mastery: x.masterRank,
					trained: x.specialTrainingStatus === UserCardSpecialTrainingStatus.DONE,
					image: x.defaultImage === UserCardDefaultImage.SPECIAL_TRAINING ? 1 : 0,
					description: card ? (card.prefix + " " + character.givenName + (character.firstName ? ` ${character.firstName}` : "")) : "Unknown"
				}
			}).sort((a,b) => deckCardIds.indexOf(a.id) - deckCardIds.indexOf(b.id)),
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
		const chapter = parseInt(req.query.chapter as string)

		let eventId: number, userId: string
		try {
			const data = decryptEventSnowflake(hash)
			eventId = data.eventId
			userId = data.snowflake
		} catch(ex) {
			return res.status(400).send({error: "Invalid hash"})
		}

		const event = SekaiMasterDB.getEvent(eventId)
		if(!event) {
			return res.status(400).send({error: "Invalid event"})
		}
		if(req.query.chapter && event.eventType !== SekaiEventType.WORLD_BLOOM) {
			return res.status(400).send({error: "Cannot specify chapter for non-worldlink events"})
		}

		if(!req.query.chapter) {
			const timeline = await RankingSnapshotModel.getPlayerEventTimeline(eventId, userId)
			return res.json({timeline})
		} else {
			const eventChapter = SekaiMasterDB.getWorldBloomChapter(eventId, chapter)
			const timeline = await RankingSnapshotModel.getPlayerWorldlinkChapterTimeline(eventId, userId, eventChapter)
			return res.json({timeline})
		}
	}

	public static async getCutoffStats(req: Request, res: Response, next: NextFunction) {
		const cutoff = parseInt(req.params.cutoff as string)
		const chapter = parseInt(req.query.chapter as string)
		const currentEvent = SekaiMasterDB.getCurrentEvent()
		if(!currentEvent) {
			return res.status(400).json({error: "No event in progress"})
		}
		if(req.query.chapter && currentEvent.eventType !== SekaiEventType.WORLD_BLOOM) {
			return res.status(400).send({error: "Cannot specify chapter for non-worldlink events"})
		}

		if(!req.query.chapter) {
			const timeline = await RankingSnapshotModel.getCutoffEventTimeline(currentEvent.id, cutoff)
			return res.json({timeline})
		} else {
			const eventChapter = SekaiMasterDB.getWorldBloomChapter(currentEvent.id, chapter)
			const timeline = await RankingSnapshotModel.getCutoffWorldlinkChapterTimeline(currentEvent.id, cutoff, eventChapter)
			return res.json({timeline})
		}
	}
}