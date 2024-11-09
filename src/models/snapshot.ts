import mongoose from "mongoose";
import RankingSnapshot from "../interface/models/snapshot";
import PlayerRanking, { PlayerCardDefaultImage, PlayerCardSpecialTrainingStatus } from "../interface/models/ranking";

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
	userCard: {
		cardId: {type: Number, required: true},
		level: {type: Number, required: true},
		masterRank: {type: Number, required: true},
		specialTrainingStatus: {type: String, required: true, enum: PlayerCardSpecialTrainingStatus},
		defaultImage: {type: String, required: true, enum: PlayerCardDefaultImage}
	},
	userProfile: {
		word: {type: String},
		twitterId: {type: String},
		profileImageType: {type: String, required: true}
	},
	userProfileHonors: [{
		seq: {type: Number, required: true},
		profileHonorType: {type: String, required: true},
		honorId: {type: Number, required: true},
		honorLevel: {type: Number, required: true},
		bondsHonorViewType: {type: String, required: true},
		bondsHonorWorldId: {type: Number}
	}],
	userCheerfulCarnival: {
		cheerfulCarnivalTeamId: {type: Number},
		teamChangeCount: {type: Number},
		registerAt: {type: Number}
	},
	userHonorMissions: [{
		honorMissionType: {type: String, required: true},
		progress: {type: Number, required: true}
	}]
})

export const RankingSnapshotSchema = new mongoose.Schema<IRankingSnapshotModel, IRankingSnapshotModelStatic>({
	eventId: {type: Number, required: true},
	chapterId: {type: Number},
	rankings: [PlayerRankingSchema],
	isEventAggregate: {type: Boolean},
	userWorldBloomChapterRankings: {},
	createdAt: {type: Date, required: true}
})

export const RankingSnapshotModel = mongoose.model<IRankingSnapshotModel, IRankingSnapshotModelStatic>("snapshots", RankingSnapshotSchema)