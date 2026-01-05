import { UserCardDefaultImage, UserCardSpecialTrainingStatus } from "sekai-api";
import { SekaiEvent, SekaiEventType } from "../interface/event";
import PlayerEventProfile from "../interface/models/event_profile";
import { BorderSnapshot, RankingEntry, RankingSnapshot } from "../interface/models/snapshot";
import { encryptEventSnowflake } from "../util/cipher";
import { LeaderboardDTO, UserRankingDTO } from "../webserv/dto/leaderboard";
import { getEventDTO } from "./event";

export function getLeaderboardDTO(event: SekaiEvent, profiles: PlayerEventProfile[], snapshot: RankingSnapshot, borderSnapshot?: BorderSnapshot): LeaderboardDTO {
	const dto: LeaderboardDTO = {
		event: getEventDTO(event),
		rankings: snapshot.rankings.map(x => getUserRankingDTO(event.id, x, profiles.find(y => y.userId === x.userId))),
		borders: borderSnapshot?.borderRankings?.map(x => getUserRankingDTO(event.id, x, profiles.find(y => y.userId === x.userId), false)),
		updated_at: snapshot.createdAt
	}

	if(event.eventType === SekaiEventType.WORLD_BLOOM) {
		dto.chapter_rankings = snapshot.userWorldBloomChapterRankings.map(chapter => {
			return chapter.rankings.map(x => getUserRankingDTO(event.id, x, profiles.find(y => y.userId === x.userId)))
		})
		dto.chapter_borders = borderSnapshot?.userWorldBloomChapterRankingBorders?.map(chapter => {
			return chapter.borderRankings.map(x => getUserRankingDTO(event.id, x, profiles.find(y => y.userId === x.userId), false))
		})
	}

	return dto
}

export function getUserRankingDTO(eventId: number, entry: RankingEntry, profile?: PlayerEventProfile, withHash = true): UserRankingDTO {
	const dto: UserRankingDTO = {
		name: entry.name,
		team: entry.userCheerfulCarnival?.cheerfulCarnivalTeamId,
		score: entry.score,
		rank: entry.rank,
		card: profile ? {
			id: profile.userCard.cardId,
			level: profile.userCard.level,
			mastery: profile.userCard.masterRank,
			trained: profile.userCard.specialTrainingStatus === UserCardSpecialTrainingStatus.DONE,
			image: profile.userCard.defaultImage === UserCardDefaultImage.SPECIAL_TRAINING ? 1 : 0
		} : {
			id: 1,
			level: 0,
			mastery: 0,
			trained: false,
			image: 0
		}
	}

	if(withHash) {
		dto.hash = encryptEventSnowflake(eventId, entry.userId)
	}

	return dto
}