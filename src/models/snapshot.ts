import mongoose from "mongoose";
import RankingSnapshot from "../interface/models/snapshot";
import PlayerRanking from "../interface/models/ranking";

export interface IRankingSnapshotModel extends RankingSnapshot, mongoose.Document {
	// Methods and fields which need the model type go here
}

export interface IRankingSnapshotModelStatic extends mongoose.Model<IRankingSnapshotModel> {
	// Static methods go here
}

export const PlayerRankingSchema = new mongoose.Schema<PlayerRanking>({
	userId: {type: String, required: true},
	score: {type: Number, required: true},
	rank: {type: Number, required: true},
	name: {type: String, required: true},
	userCheerfulCarnival: {
		cheerfulCarnivalTeamId: {type: Number},
		teamChangeCount: {type: Number},
		registerAt: {type: Number}
	}
}, {_id: false})

export const RankingSnapshotSchema = new mongoose.Schema<IRankingSnapshotModel, IRankingSnapshotModelStatic>({
	eventId: {type: Number, required: true},
	rankings: [PlayerRankingSchema],
	isEventAggregate: {type: Boolean},
	userWorldBloomChapterRankings: [{
		gameCharacterId: {type: Number},
		isWorldBloomChapterAggregate: {type: Boolean},
		rankings: [PlayerRankingSchema]
	}],
	createdAt: {type: Date, required: true}
})

export const RankingSnapshotModel = mongoose.model<IRankingSnapshotModel, IRankingSnapshotModelStatic>("snapshots", RankingSnapshotSchema)