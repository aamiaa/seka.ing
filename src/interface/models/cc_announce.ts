import { UserAnnounce } from "sekai-api";

export default interface CheerfulCarnivalAnnouncement extends UserAnnounce {
	from: Date,
	to: Date,
	value?: number
}