import { SekaiEvent, SekaiEventType, SekaiWorldBloom } from "../interface/event";
import SekaiMasterDB from "../providers/sekai-master-db";
import { EventDTO, WorldlinkChapterDTO } from "../webserv/dto/event";
import { getTimezoneOffsetAtDate } from "../util/time";
import { SekaiUnit } from "../interface/unit";

export function getEventDTO(event: SekaiEvent, options?: {withHonors?: boolean}): EventDTO {
	const dto: EventDTO = {
		id: event.id,
		name: event.name,
		name_key: event.assetbundleName,
		type: event.eventType,
		unit: null,
		starts_at: event.startAt,
		ends_at: event.aggregateAt,
		titles_at: event.distributionStartAt,
		start_tz_offsets: {
			et: getTimezoneOffsetAtDate("America/New_York", event.startAt),
			pt: getTimezoneOffsetAtDate("America/Los_Angeles", event.startAt),
			jst: getTimezoneOffsetAtDate("Asia/Tokyo", event.startAt),
		}
	}

	// Figure out the event's unit focus by checking if its cards
	// are from the same unit (excluding virtual singer)
	const eventCards = SekaiMasterDB.getEventCards(event.id)
	const eventChars = eventCards.map(x => SekaiMasterDB.getCard(x.cardId).characterId)
	const eventUnits = eventChars.map(x => SekaiMasterDB.getGameCharacter(x).unit)
	const uniqueUnits = new Set(eventUnits)
	const uniqueUnitsNonVs = new Set(eventUnits.filter(x => x !== SekaiUnit.VIRTUAL_SINGER))
	if(uniqueUnitsNonVs.size === 1) {
		dto.unit = [...eventUnits.values()][0]
	} else if(uniqueUnitsNonVs.size === 0 && uniqueUnits.size === 1) {
		dto.unit = SekaiUnit.VIRTUAL_SINGER
	}

	// Add worldlink chapters data
	if(event.eventType === SekaiEventType.WORLD_BLOOM) {
		const chapters = SekaiMasterDB.getWorldBloomChapters(event.id)
		dto.chapters = chapters.map(getWorldlinkChapterDTO)

		const currentChapter = SekaiMasterDB.getCurrentWorldBloomChapter()
		if(currentChapter) {
			dto.chapter_num = currentChapter.chapterNo
			dto.chapter_character = currentChapter.gameCharacterId
			dto.ends_at = currentChapter.aggregateAt
		}
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

export function getWorldlinkChapterDTO(chapter: SekaiWorldBloom): WorldlinkChapterDTO {
	const dto: WorldlinkChapterDTO = {
		title: SekaiMasterDB.getGameCharacter(chapter.gameCharacterId).givenName,
		num: chapter.chapterNo,
		character_id: chapter.gameCharacterId,
		color: SekaiMasterDB.getCharacterColor(chapter.gameCharacterId),
		starts_at: new Date(chapter.chapterStartAt),
		ends_at: new Date(chapter.aggregateAt)
	}

	return dto
}