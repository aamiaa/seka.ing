export default interface PlayerRanking {
	userId: string,
	score: number,
	rank: number,
	name: string,
	userCard: PlayerCard,
	userProfile: {
		word?: string,
		twitterId?: string,
		profileImageType: string
	},
	userProfileHonors: PlayerProfileHonor[],
	userCheerfulCarnival: PlayerCheerfulCarnival,
	userHonorMissions: PlayerHonorMission[]
}

export interface PlayerCard {
	cardId: number,
	level: number,
	masterRank: number,
	specialTrainingStatus: PlayerCardSpecialTrainingStatus,
	defaultImage: PlayerCardDefaultImage
}

export enum PlayerCardSpecialTrainingStatus {
	DONE = "done",
	NOT_DOING = "not_doing"
}

export enum PlayerCardDefaultImage {
	ORIGINAL = "original",
	SPECIAL_TRAINING = "special_training"
}

export interface PlayerProfileHonor {
	seq: number,
	profileHonorType: string,
	honorId: number,
	honorLevel: number,
	bondsHonorViewType: string,
	bondsHonorWorldId?: number
}

export interface PlayerCheerfulCarnival {
	cheerfulCarnivalTeamId: number,
	teamChangeCount: number,
	registerAt: Date
}

export interface PlayerHonorMission {
	honorMissionType: string,
	progress: number
}