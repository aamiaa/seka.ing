import mongoose from "mongoose";
import PlayerEventProfile from "../interface/models/event_profile";
import { PlayerCardSpecialTrainingStatus, PlayerCardDefaultImage } from "../interface/models/ranking";

export interface IEventProfileModel extends PlayerEventProfile, mongoose.Document {
	// Methods and fields which need the model type go here
}

export interface IEventProfileModelStatic extends mongoose.Model<IEventProfileModel> {
	// Static methods go here
}

export const EventProfileSchema = new mongoose.Schema<IEventProfileModel, IEventProfileModelStatic>({
	userId: {type: String, required: true},
	eventId: {type: Number, required: true},
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
		bondsHonorViewType: {type: String},
		bondsHonorWorldId: {type: Number}
	}],
	userCheerfulCarnival: {
		cheerfulCarnivalTeamId: {type: Number},
		teamChangeCount: {type: Number},
		registerAt: {type: Date}
	},
	userHonorMissions: [{
		honorMissionType: {type: String, required: true},
		progress: {type: Number, required: true}
	}]
})
EventProfileSchema.index({userId: -1, eventId: -1}, {unique: true})

export const EventProfileModel = mongoose.model<IEventProfileModel, IEventProfileModelStatic>("event_profiles", EventProfileSchema)