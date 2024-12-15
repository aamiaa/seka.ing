import { EventRankingPage } from "sekai-api";

export default interface RankingSnapshot extends EventRankingPage {
	eventId: number,
	createdAt: Date
}