import { SekaiEvent, SekaiEventType } from "../interface/event";
import SekaiMasterDB from "../providers/sekai-master-db";
import { EventDTO } from "../webserv/dto/event";

export function getEventDTO(event: SekaiEvent, options?: {withHonors?: boolean}): EventDTO {
	const dto: EventDTO = {
		id: event.id,
		name: event.name,
		name_key: event.assetbundleName,
		type: event.eventType,
		starts_at: event.startAt,
		ends_at: event.aggregateAt,
		titles_at: event.distributionStartAt
	}

	if(options?.withHonors) {
		let honors = event.eventRankingRewardRanges.filter(x => 
			SekaiMasterDB.getResourceBox(x.eventRankingRewards[0].resourceBoxId, "event_ranking_reward")?.details?.find(x => x.resourceType === "honor")
		).map(range => ({
			rank: range.toRank,
			image: `/images/honor/event/${event.id}/${range.toRank}.png`
		}))

		if(event.eventType === SekaiEventType.WORLD_BLOOM) {
			SekaiMasterDB.getWorldBloomChapters(event.id).forEach(chapter => {
				honors = honors.concat(
					SekaiMasterDB.getWorldBloomChapterRankingRewardRanges(event.id, chapter.gameCharacterId).map(range => ({
						rank: range.toRank,
						image: `/images/honor/event/${event.id}/${range.toRank}.png?chapter=${chapter.chapterNo}`
					}))
				)
			})
		}

		dto.honors = honors
	}

	return dto
}