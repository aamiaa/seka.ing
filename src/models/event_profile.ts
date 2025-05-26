import mongoose from "mongoose";
import PlayerEventProfile from "../interface/models/event_profile";
import { UserCardDefaultImage, UserCardSpecialTrainingStatus } from "sekai-api";

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
		specialTrainingStatus: {type: String, required: true, enum: UserCardSpecialTrainingStatus},
		defaultImage: {type: String, required: true, enum: UserCardDefaultImage}
	},
	userProfile: {
		word: {type: String},
		twitterId: {type: String},
		profileImageType: {type: String, required: true}
	},
	userProfileHonors: [{
		_id: false,
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
		_id: false,
		honorMissionType: {type: String, required: true},
		progress: {type: Number, required: true}
	}],
	userDeck: {
		deckId: {type: Number, required: true},
		name: {type: String, required: true},
		leader: {type: Number, required: true},
		subLeader: {type: Number, required: true},
		member1: {type: Number, required: true},
		member2: {type: Number, required: true},
		member3: {type: Number, required: true},
		member4: {type: Number, required: true},
		member5: {type: Number, required: true}
	},
	userCards: {
		type: [{
			_id: false,
			cardId: {type: Number, required: true},
			level: {type: Number, required: true},
			masterRank: {type: Number, required: true},
			specialTrainingStatus: {type: String, required: true, enum: UserCardSpecialTrainingStatus},
			defaultImage: {type: String, required: true, enum: UserCardDefaultImage}
		}],
		default: undefined
	},
	userCharacters: {
		type: [{
			_id: false,
			characterId: {type: Number, required: true},
			characterRank: {type: Number, required: true}
		}],
		default: undefined
	},
	totalPower: {
		totalPower: {type: Number, required: true},
		basicCardTotalPower: {type: Number, required: true},
		areaItemBonus: {type: Number, required: true},
		characterRankBonus: {type: Number, required: true},
		honorBonus: {type: Number, required: true},
	},
	wasTop100: {type: Boolean, required: true, default: false},
	fullProfileFetched: {type: Boolean, required: true, default: false},
	fullProfileFetchedAt: {type: Date}
})
EventProfileSchema.index({userId: -1, eventId: -1}, {unique: true})

export const EventProfileModel = mongoose.model<IEventProfileModel, IEventProfileModelStatic>("event_profiles", EventProfileSchema)