import { UserCardDefaultImage, UserCardSpecialTrainingStatus } from "sekai-api";
import { SekaiEvent, SekaiEventType } from "../interface/event";
import PlayerEventProfile from "../interface/models/event_profile";
import { BorderSnapshot, RankingEntry, RankingSnapshot } from "../interface/models/snapshot";
import { encryptEventSnowflake } from "../util/cipher";
import { LeaderboardDTO, UserRankingDTO } from "../webserv/dto/leaderboard";
import { getEventDTO } from "./event";

export function getLeaderboardDTO({event, profiles, snapshot, borderSnapshot, pastSnapshots, pastBorderSnapshots}: {
	event: SekaiEvent,
	profiles: PlayerEventProfile[],
	snapshot: RankingSnapshot,
	borderSnapshot?: BorderSnapshot,
	pastSnapshots?: RankingSnapshot[],
	pastBorderSnapshots?: BorderSnapshot[]
}): LeaderboardDTO {
	const pastRankings = pastSnapshots?.map(x => x.rankings)

	const dto: LeaderboardDTO = {
		event: getEventDTO(event),
		rankings: snapshot.rankings.map(entry => {
			const profile = profiles.find(y => y.userId === entry.userId)
			const pastRankingsForUser = pastRankings?.map(ranking => ranking.find(lEntry => lEntry.userId === entry.userId)).filter(x => x != null)
			return getUserRankingDTOWithDifference(event.id, entry, pastRankingsForUser, profile)
		}),
		borders: borderSnapshot?.borderRankings?.map(x => getUserRankingDTO(event.id, x, profiles.find(y => y.userId === x.userId), false)),
		updated_at: snapshot.createdAt
	}

	if(event.eventType === SekaiEventType.WORLD_BLOOM) {
		dto.chapter_rankings = snapshot.userWorldBloomChapterRankings.map(chapter => {
			const pastChapterRankings = pastSnapshots?.map(snapshot =>
				snapshot.userWorldBloomChapterRankings.find(lChapter =>
					lChapter.gameCharacterId === chapter.gameCharacterId
				)?.rankings
			)?.filter(x => x != null)

			return chapter.rankings.map(entry => {
				const profile = profiles.find(y => y.userId === entry.userId)
				const pastRankingsForUser = pastChapterRankings?.map(ranking => ranking.find(lEntry => lEntry.userId === entry.userId)).filter(x => x != null)
				return getUserRankingDTOWithDifference(event.id, entry, pastRankingsForUser, profile)
			})
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

export function getUserRankingDTOWithDifference(eventId: number, entry: RankingEntry, pastRankings: RankingEntry[], profile?: PlayerEventProfile): UserRankingDTO {
	const base = getUserRankingDTO(eventId, entry, profile)

	const earliest = pastRankings[0].score
	const differentValues = new Set<number>(pastRankings.map(x => x.score))
	const count = differentValues.size - 1
	const average = (entry.score - earliest)/count

	return {
		...base,
		delta: entry.score - earliest,
		average
	}
}