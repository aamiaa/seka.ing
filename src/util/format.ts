import SekaiMasterDB from "../providers/sekai-master-db"

export function getEventFromIdStr(eventId: string) {
	if(eventId === "now") {
		return SekaiMasterDB.getCurrentEvent()
	}

	return SekaiMasterDB.getEvent(parseInt(eventId))
}