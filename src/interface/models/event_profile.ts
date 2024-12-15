import { UserRanking } from "sekai-api";

export default interface PlayerEventProfile extends UserRanking {
	eventId: number
}