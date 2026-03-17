import { UserCardDefaultImage, UserCardSpecialTrainingStatus } from "sekai-api";
import { SekaiEvent } from "../interface/event";
import PlayerEventProfile from "../interface/models/event_profile";
import { RankingEntry, RankingSnapshot } from "../interface/models/snapshot";
import { encryptEventSnowflake } from "../util/cipher";
import { LeaderboardDTO, UserRankingDTO } from "../webserv/dto/leaderboard";
import { getEventDTO } from "./event";

export function getLeaderboardDTO({event, profiles, snapshot, pastSnapshots}: {
	event: SekaiEvent,
	profiles: PlayerEventProfile[],
	snapshot: RankingSnapshot,
	pastSnapshots?: RankingSnapshot[],
}): LeaderboardDTO {
	const pastRankings = pastSnapshots?.map(x => x.rankings)

	const dto: LeaderboardDTO = {
		event: getEventDTO(event),
		rankings: snapshot.rankings.map(entry => {
			const profile = profiles.find(y => y.userId === entry.userId)
			const pastRankingsForUser = pastRankings?.map(ranking => ranking.find(lEntry => lEntry.userId === entry.userId)).filter(x => x != null)
			return getUserRankingDTOWithDifference(event.id, entry, pastRankingsForUser, profile)
		}),
		updated_at: snapshot.createdAt
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
		} : null
	}

	if(withHash) {
		dto.hash = encryptEventSnowflake(eventId, entry.userId)
	}

	return dto
}

export function getUserRankingDTOWithDifference(eventId: number, entry: RankingEntry, pastRankings: RankingEntry[], profile?: PlayerEventProfile): UserRankingDTO {
	const base = getUserRankingDTO(eventId, entry, profile)

	const earliest = pastRankings?.[0]?.score ?? entry.score
	const differentValues = new Set<number>(pastRankings?.map(x => x.score))
	const count = differentValues.size - 1
	const average = (entry.score - earliest)/count

	return {
		...base,
		delta: entry.score - earliest,
		average
	}
}

export function getUserRankingDTOWithBorderDifference(eventId: number, entry: RankingEntry, pastBorders: RankingEntry[], profile?: PlayerEventProfile): UserRankingDTO {
	const base = getUserRankingDTO(eventId, entry, profile, false)

	const earliest = pastBorders?.[0]?.score ?? entry.score
	return {
		...base,
		rank_delta: entry.score - earliest
	}
}