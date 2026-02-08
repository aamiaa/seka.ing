import mongoose from "mongoose";
import { RankingSnapshot, BorderSnapshot } from "../../interface/models/snapshot";
import { UserRanking } from "sekai-api";
import { BorderSnapshotMethods, RankingSnapshotMethods } from "./methods";
import { SekaiWorldBloom } from "../../interface/event";

export interface IRankingSnapshotModel extends RankingSnapshot, mongoose.Document {
	// Methods and fields which need the model type go here
	getHash(): string
}

export interface IRankingSnapshotModelStatic extends mongoose.Model<IRankingSnapshotModel> {
	// Static methods go here
	getPlayerEventTimeline(eventId: number, userId: string): Promise<{timestamp: Date, score: number}[]>,
	getPlayerWorldlinkChapterTimeline(eventId: number, userId: string, chapter: SekaiWorldBloom): Promise<{timestamp: Date, score: number}[]>
	getCutoffEventTimeline(eventId: number, cutoff: number): Promise<{timestamp: Date, score: number}[]>
	getCutoffWorldlinkChapterTimeline(eventId: number, cutoff: number, chapter: SekaiWorldBloom): Promise<{timestamp: Date, score: number}[]>
}

export interface IBorderSnapshotModel extends BorderSnapshot, mongoose.Document {
	// Methods and fields which need the model type go here
	getHash(): string
}

export interface IBorderSnapshotModelStatic extends mongoose.Model<IBorderSnapshotModel> {
	// Static methods go here
	getCutoffEventTimeline(eventId: number, cutoff: number): Promise<{timestamp: Date, score: number}[]>
	getCutoffWorldlinkChapterTimeline(eventId: number, cutoff: number, chapter: SekaiWorldBloom): Promise<{timestamp: Date, score: number}[]>
}

export const UserCheerfulCarnivalSchema = new mongoose.Schema<UserRanking["userCheerfulCarnival"]>({
	cheerfulCarnivalTeamId: {type: Number},
	teamChangeCount: {type: Number},
	registerAt: {type: Date}
}, {_id: false})

export const UserRankingSchema = new mongoose.Schema<UserRanking>({
	userId: {type: String, required: true},
	score: {type: Number, required: true},
	rank: {type: Number, required: true},
	name: {type: String},
	userCheerfulCarnival: UserCheerfulCarnivalSchema
}, {_id: false})

export const RankingSnapshotSchema = new mongoose.Schema({
	eventId: {type: Number, required: true},
	rankings: [UserRankingSchema],
	isEventAggregate: {type: Boolean},
	userWorldBloomChapterRankings: [{
		gameCharacterId: {type: Number},
		isWorldBloomChapterAggregate: {type: Boolean},
		rankings: [UserRankingSchema]
	}],
	final: {type: Boolean},
	source: {type: String},
	createdAt: {type: Date, required: true}
}, {
	methods: RankingSnapshotMethods,
	statics: {
		async getPlayerEventTimeline(eventId: number, userId: string) {
			return await this.aggregate([
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
						_id: 0,
						score: "$rankings.score",
					}
				},
				{
					$sort: {
						timestamp: 1
					}
				}
			])
		},

		async getPlayerWorldlinkChapterTimeline(eventId: number, userId: string, chapter: SekaiWorldBloom) {
			return await this.aggregate([
				{
					$match: {
						eventId,
						createdAt: {
							$gte: chapter.chapterStartAt,
							$lte: chapter.aggregateAt
						}
					}
				},
				{
					$unwind: {
						path: "$userWorldBloomChapterRankings"
					}
				},
				{
					$match: {
						"userWorldBloomChapterRankings.gameCharacterId": chapter.gameCharacterId
					}
				},
				{
					$unwind: {
						path: "$userWorldBloomChapterRankings.rankings"
					}
				},
				{
					$match: {
						"userWorldBloomChapterRankings.rankings.userId": userId
					}
				},
				{
					$project: {
						timestamp: "$createdAt",
						_id: 0,
						score: "$userWorldBloomChapterRankings.rankings.score"
					}
				},
				{
					$sort: {
						timestamp: 1
					}
				}
			])
		},

		async getCutoffEventTimeline(eventId: number, cutoff: number) {
			return await this.aggregate([
				{
					$match: {
						eventId: eventId
					}
				},
				{
					$unwind: {
						path: "$rankings"
					}
				},
				{
					$match: {
						"rankings.rank": cutoff
					}
				},
				{
					$project: {
						timestamp: "$createdAt",
						score: "$rankings.score",
						_id: 0
					}
				},
				{
					$sort: {
						timestamp: 1
					}
				}
			])
		},

		async getCutoffWorldlinkChapterTimeline(eventId: number, cutoff: number, chapter: SekaiWorldBloom) {
			return await this.aggregate([
				{
					$match: {
						eventId,
						createdAt: {
							$gte: chapter.chapterStartAt,
							$lte: chapter.aggregateAt
						}
					}
				},
				{
					$unwind: {
						path: "$userWorldBloomChapterRankings"
					}
				},
				{
					$match: {
						"userWorldBloomChapterRankings.gameCharacterId": chapter.gameCharacterId
					}
				},
				{
					$unwind: {
						path: "$userWorldBloomChapterRankings.rankings"
					}
				},
				{
					$match: {
						"userWorldBloomChapterRankings.rankings.rank": cutoff
					}
				},
				{
					$project: {
						timestamp: "$createdAt",
						_id: 0,
						score: "$userWorldBloomChapterRankings.rankings.score"
					}
				},
				{
					$sort: {
						timestamp: 1
					}
				}
			])
		}
	}
})

export const BorderSnapshotSchema = new mongoose.Schema<IBorderSnapshotModel, IBorderSnapshotModelStatic>({
	eventId: {type: Number, required: true},
	borderRankings: [UserRankingSchema],
	isEventAggregate: {type: Boolean},
	userWorldBloomChapterRankingBorders: [{
		gameCharacterId: {type: Number},
		isWorldBloomChapterAggregate: {type: Boolean},
		borderRankings: [UserRankingSchema]
	}],
	final: {type: Boolean},
	source: {type: String},
	createdAt: {type: Date, required: true}
}, {
	methods: BorderSnapshotMethods,
	statics: {
		async getCutoffEventTimeline(eventId: number, cutoff: number) {
			return await this.aggregate([
				{
					$match: {
						eventId: eventId
					}
				},
				{
					$unwind: {
						path: "$borderRankings"
					}
				},
				{
					$match: {
						"borderRankings.rank": cutoff
					}
				},
				{
					$project: {
						timestamp: "$createdAt",
						score: "$borderRankings.score",
						_id: 0
					}
				},
				{
					$sort: {
						timestamp: 1
					}
				}
			])
		},

		async getCutoffWorldlinkChapterTimeline(eventId: number, cutoff: number, chapter: SekaiWorldBloom) {
			return await this.aggregate([
				{
					$match: {
						eventId,
						createdAt: {
							$gte: chapter.chapterStartAt,
							$lte: chapter.aggregateAt
						}
					}
				},
				{
					$unwind: {
						path: "$userWorldBloomChapterRankings"
					}
				},
				{
					$match: {
						"userWorldBloomChapterRankings.gameCharacterId": chapter.gameCharacterId
					}
				},
				{
					$unwind: {
						path: "$userWorldBloomChapterRankings.borderRankings"
					}
				},
				{
					$match: {
						"userWorldBloomChapterRankings.borderRankings.rank": cutoff
					}
				},
				{
					$project: {
						timestamp: "$createdAt",
						_id: 0,
						score: "$userWorldBloomChapterRankings.borderRankings.score"
					}
				},
				{
					$sort: {
						timestamp: 1
					}
				}
			])
		}
	}
})

RankingSnapshotSchema.index({eventId: 1})
RankingSnapshotSchema.index({createdAt: 1})
RankingSnapshotSchema.index({eventId: 1, createdAt: 1})
RankingSnapshotSchema.index({eventId: 1, final: 1})

BorderSnapshotSchema.index({eventId: 1})
BorderSnapshotSchema.index({createdAt: 1})
BorderSnapshotSchema.index({eventId: 1, createdAt: 1})
BorderSnapshotSchema.index({eventId: 1, final: 1})

export const RankingSnapshotModel = mongoose.model<IRankingSnapshotModel, IRankingSnapshotModelStatic>("snapshots", RankingSnapshotSchema)
export const BorderSnapshotModel = mongoose.model<IBorderSnapshotModel, IBorderSnapshotModelStatic>("border_snapshots", BorderSnapshotSchema)