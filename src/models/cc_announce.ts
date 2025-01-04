import mongoose from "mongoose";
import CheerfulCarnivalAnnouncement from "../interface/models/cc_announce";

export interface ICheerfulCarnivalAnnouncementModel extends CheerfulCarnivalAnnouncement, mongoose.Document {
	// Methods and fields which need the model type go here
}

export interface ICheerfulCarnivalAnnouncementModelStatic extends mongoose.Model<ICheerfulCarnivalAnnouncementModel> {
	// Static methods go here
}

export const CheerfulCarnivalAnnouncementSchema = new mongoose.Schema<ICheerfulCarnivalAnnouncementModel, ICheerfulCarnivalAnnouncementModelStatic>({
	eventId: {type: Number, required: true},
	cheerfulCarnivalTeamId: {type: Number, required: true},
	cheerfulCarnivalAnnounceType: {type: String, required: true},
	message: {type: String, required: true},
	from: {type: Date, required: true},
	to: {type: Date, required: true},
	value: {type: Number}
})

CheerfulCarnivalAnnouncementSchema.index({eventId: 1})
CheerfulCarnivalAnnouncementSchema.index({eventId: 1, to: 1, cheerfulCarnivalAnnounceType: 1})

export const CheerfulCarnivalAnnouncementModel = mongoose.model<ICheerfulCarnivalAnnouncementModel, ICheerfulCarnivalAnnouncementModelStatic>("cc_announces", CheerfulCarnivalAnnouncementSchema)