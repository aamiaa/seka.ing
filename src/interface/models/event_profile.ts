import { UserDeck, UserRanking, AnotherTotalPower, AnotherUserCard, AnotherUserCharacter, AnotherUserMusicDifficultyClearCount, AnotherUserMultiLiveTopScoreCount } from "sekai-api";

export default interface PlayerEventProfile extends UserRanking {
	eventId: number,

	userDeck?: UserDeck,
	userCards?: AnotherUserCard[],
	userCharacters?: AnotherUserCharacter[],
	userMusicDifficultyClearCount?: AnotherUserMusicDifficultyClearCount[],
	userMultiLiveTopScoreCount?: AnotherUserMultiLiveTopScoreCount,
	playerRank?: number,
	totalPower?: AnotherTotalPower,

	wasTop100: boolean,
	fullProfileFetched: boolean,
	fullProfileFetchedAt: Date,
}