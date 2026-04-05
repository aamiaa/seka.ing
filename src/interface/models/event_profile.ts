import { UserDeck, UserRanking, AnotherTotalPower, AnotherUserCard, AnotherUserCharacter, AnotherUserMusicDifficultyClearCount, AnotherUserMultiLiveTopScoreCount, UserCheerfulCarnival, UserHonorMission, UserProfile, UserProfileHonor } from "sekai-api";

export default interface PlayerEventProfile {
	userId: string,
	eventId: number,
	name: string,
	userCard: AnotherUserCard,
	userProfile: UserProfile,
	userProfileHonors: UserProfileHonor[],
	userCheerfulCarnival: UserCheerfulCarnival,
	userHonorMissions: UserHonorMission[],
	userDeck?: UserDeck,
	userCards?: AnotherUserCard[],
	userCharacters?: AnotherUserCharacter[],
	userMusicDifficultyClearCount?: AnotherUserMusicDifficultyClearCount[],
	userMultiLiveTopScoreCount?: AnotherUserMultiLiveTopScoreCount,
	playerRank?: number,
	totalPower?: AnotherTotalPower,

	wasTop100: boolean,
	fullProfileFetched: boolean,
	fullProfileFetchedAt?: Date,
	source?: string
}