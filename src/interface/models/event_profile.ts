import { UserDeck, UserRanking, AnotherTotalPower, AnotherUserCard, AnotherUserCharacter } from "sekai-api";

export default interface PlayerEventProfile extends UserRanking {
	eventId: number,

	userDeck?: UserDeck,
	userCards?: AnotherUserCard[],
	userCharacters?: AnotherUserCharacter[],
	totalPower?: AnotherTotalPower,

	wasTop100: boolean,
	fullProfileFetched: boolean,
	fullProfileFetchedAt: Date,
}