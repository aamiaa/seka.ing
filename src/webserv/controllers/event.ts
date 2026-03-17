import { NextFunction, Request, Response } from "express";
import SekaiMasterDB from "../../providers/sekai-master-db";
import { RankingSnapshotModel } from "../../models/snapshot/model";
import { EventProfileModel } from "../../models/event_profile";
import CacheStore from "../cache";
import { decryptEventSnowflake } from "../../util/cipher";
import { EventProfileDTO } from "../dto/event_profile";
import { UserCardDefaultImage, UserCardSpecialTrainingStatus } from "sekai-api";
import { getEventDTO } from "../../transformers/event";
import { calculateEventBonus } from "../../sekai/helpers/event_bonus";
import { getLeaderboardDTO } from "../../transformers/leaderboard";
import { getEventFromIdStr } from "../../util/format";

export default class EventController {
	public static async getEvents(req: Request, res: Response, next: NextFunction) {
		const withHonors = req.query.with_honors === "true"

		const events = SekaiMasterDB.getEvents().map(x => getEventDTO(x, {withHonors}))
		const snapshots = (await RankingSnapshotModel.aggregate([
			{$group: {_id: "$eventId"}}
		])).map(x => x._id)
		events.forEach(event => event.has_snapshot = snapshots.includes(event.id))
		return res.json(events)
	}

	public static async getLeaderboard(req: Request, res: Response, next: NextFunction) {
		const data = CacheStore.get("leaderboard")
		if(!data) {
			return res.status(503).json({error: "Leaderboard Tracker not started"})
		}

		if(req.query.nocache) {
			res.set("Cache-Control", "no-store")
		}
		return res.json(data)
	}

	public static async getEventLeaderboard(req: Request, res: Response, next: NextFunction) {
		const eventIdStr = req.params.eventId as string
		const timestampStr = req.query.timestamp as string

		const event = getEventFromIdStr(eventIdStr)
		if(!event) {
			return res.status(404).json({error: "Specified event doesn't exist"})
		}

		// For current event, return the cache unless timestamp is provided
		const currentEvent = SekaiMasterDB.getCurrentEvent()
		if(!timestampStr && event.id === currentEvent?.id) {
			if(req.query.nocache) {
				res.set("Cache-Control", "no-store")
			}
			return res.json(CacheStore.get("leaderboard"))
		}

		// For a past event without timestamp, return the final snapshot
		if(!timestampStr) {
			const snapshot = await RankingSnapshotModel.findOne({eventId: event.id, final: true})
			if(!snapshot) {
				return res.status(404).json({error: "Specified event was not recorded"})
			}

			const userIds = snapshot.rankings.map(x => x.userId)
			const profiles = await EventProfileModel.find({eventId: event.id, userId: {$in: userIds}}).lean()

			return res.json(getLeaderboardDTO({event, profiles, snapshot}))
		}

		// For current and past events with timestamp,
		// compute the change per hour fields
		const timestamp = new Date(timestampStr)
		const snapshot = await RankingSnapshotModel.findOne({eventId: event.id, createdAt: timestamp}).lean()
		if(!snapshot) {
			return res.status(404).json({error: "No snapshot found at specified timestamp"})
		}

		const userIds = snapshot.rankings.map(x => x.userId)
		const profiles = await EventProfileModel.find({eventId: event.id, userId: {$in: userIds}}).lean()

		const pastHour = new Date(timestamp.getTime() - 3600 * 1000)
		const rankingsPastHour = await RankingSnapshotModel.find({eventId: event.id, createdAt: {$gte: pastHour, $lt: timestamp}}).lean()

		return res.json(getLeaderboardDTO({
			event,
			profiles,
			snapshot,
			pastSnapshots: rankingsPastHour
		}))
	}

	public static async getAnnouncements(req: Request, res: Response, next: NextFunction) {
		const data = CacheStore.get("cc_announce")
		if(!data) {
			return res.status(503).json({error: "Cheerful Carnival Tracker not started"})
		}

		res.set("Cache-Control", "no-store")
		return res.json(data)
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

		const event = SekaiMasterDB.getEvent(eventId)
		if(!event) {
			return res.status(400).send({error: "Invalid event"})
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
		const cards = profile.userCards.filter(x => deckCardIds.includes(x.cardId)).map(x => {
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
		}).sort((a,b) => deckCardIds.indexOf(a.id) - deckCardIds.indexOf(b.id))

		const response: EventProfileDTO = {
			name: profile.name,
			cards: cards,
			talent: {
				basic_talent: profile.totalPower.basicCardTotalPower,
				area_item_bonus: profile.totalPower.areaItemBonus,
				character_rank_bonus: profile.totalPower.characterRankBonus,
				honor_bonus: profile.totalPower.honorBonus,
				mysekai_gate_bonus: profile.totalPower.mysekaiGateLevelBonus,
				mysekai_furniture_bonus: profile.totalPower.mysekaiFixtureGameCharacterPerformanceBonus,
				total_talent: profile.totalPower.totalPower
			},
			event_bonus: calculateEventBonus(eventId, cards)
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

		const event = SekaiMasterDB.getEvent(eventId)
		if(!event) {
			return res.status(400).send({error: "Invalid event"})
		}

			const timeline = await RankingSnapshotModel.getPlayerEventTimeline(eventId, userId)
			return res.json({timeline})
	}

	public static async getCutoffStats(req: Request, res: Response, next: NextFunction) {
		const eventIdStr = req.params.eventId as string || "now" // To be removed after users' cache expires
		const cutoff = parseInt(req.params.cutoff as string)

		const event = getEventFromIdStr(eventIdStr)
		if(!event) {
			return res.status(404).json({error: "Specified event doesn't exist"})
		}

		const timeline = await RankingSnapshotModel.getCutoffEventTimeline(event.id, cutoff)
			return res.json({timeline})
	}

	public static async getSnapshotsList(req: Request, res: Response, next: NextFunction) {
		const eventIdStr = req.params.eventId as string
		const event = getEventFromIdStr(eventIdStr)
		if(!event) {
			return res.status(404).json({error: "Specified event doesn't exist"})
		}

		const snapshots = await RankingSnapshotModel.find({eventId: event.id}, {_id: 0, timestamp: "$createdAt"}, {sort: {createdAt: 1}})
		return res.json({
			timeline: snapshots
		})
	}
}