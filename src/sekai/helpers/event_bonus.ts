import { SekaiUnit } from "../../interface/unit";
import SekaiMasterDB from "../../providers/sekai-master-db";

export function calculateEventBonus(eventId: number, cards: {id: number, mastery: number}[]) {
	const event = SekaiMasterDB.getEvent(eventId)
	if(!event) {
		throw new Error(`Event with id ${eventId} doesn't exist!`)
	}
	
	let bonus = 0
	const eventCards = SekaiMasterDB.getEventCards(eventId)
	const deckBonuses = SekaiMasterDB.getEventDeckBonuses(eventId)
	const rarityBonuses = SekaiMasterDB.getEventRarityBonusRates()

	for(const card of cards) {
		const cardData = SekaiMasterDB.getCard(card.id)

		// Event card bonus
		const eventCardData = eventCards.find(x => x.cardId === card.id)
		if(eventCardData) {
			bonus += eventCardData.bonusRate
		}

		// Card unit and attribute bonus
		const deckBonus = deckBonuses.find(x => {
			if(x.gameCharacterUnitId != null) {
				const charUnit = SekaiMasterDB.getGameCharacterUnit(x.gameCharacterUnitId)
				// Virtual singers without a subunit count towards all units' bonuses 
				if(!(charUnit.gameCharacterId === cardData.characterId && (cardData.supportUnit === charUnit.unit || cardData.supportUnit === SekaiUnit.NONE))) {
					return false
				}
			}
			if(x.cardAttr != null) {
				if(x.cardAttr !== cardData.attr) {
					return false
				}
			}
			return true
		})
		if(deckBonus) {
			bonus += deckBonus.bonusRate
		}

		// Mastery rank and rarity bonus
		const rarityBonus = rarityBonuses.find(x => x.cardRarityType === cardData.cardRarityType && x.masterRank === card.mastery)
		if(rarityBonus) {
			bonus += rarityBonus.bonusRate
		}
	}

	return Math.floor(bonus)
}