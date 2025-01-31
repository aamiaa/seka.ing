import mongoose from "mongoose";
import { RankingSnapshot, BorderSnapshot } from "../../interface/models/snapshot";
import { UserRanking } from "sekai-api";
import { BorderSnapshotMethods } from "./methods";

export interface IRankingSnapshotModel extends RankingSnapshot, mongoose.Document {
	// Methods and fields which need the model type go here
}

export interface IRankingSnapshotModelStatic extends mongoose.Model<IRankingSnapshotModel> {
	// Static methods go here
}

export interface IBorderSnapshotModel extends BorderSnapshot, mongoose.Document {
	// Methods and fields which need the model type go here
	getHash(): string
}

export interface IBorderSnapshotModelStatic extends mongoose.Model<IBorderSnapshotModel> {
	// Static methods go here
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
	name: {type: String, required: true},
	userCheerfulCarnival: UserCheerfulCarnivalSchema
}, {_id: false})

export const RankingSnapshotSchema = new mongoose.Schema<IRankingSnapshotModel, IRankingSnapshotModelStatic>({
	eventId: {type: Number, required: true},
	rankings: [UserRankingSchema],
	isEventAggregate: {type: Boolean},
	userWorldBloomChapterRankings: [{
		gameCharacterId: {type: Number},
		isWorldBloomChapterAggregate: {type: Boolean},
		rankings: [UserRankingSchema]
	}],
	createdAt: {type: Date, required: true}
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
	createdAt: {type: Date, required: true}
}, {
	methods: BorderSnapshotMethods
})

export const RankingSnapshotModel = mongoose.model<IRankingSnapshotModel, IRankingSnapshotModelStatic>("snapshots", RankingSnapshotSchema)
export const BorderSnapshotModel = mongoose.model<IBorderSnapshotModel, IBorderSnapshotModelStatic>("border_snapshots", BorderSnapshotSchema)