import mongoose from "mongoose";
import CheerfulCarnivalMidterm from "../interface/models/cc_midterm";

export interface ICheerfulCarnivalMidtermModel extends CheerfulCarnivalMidterm, mongoose.Document {
	// Methods and fields which need the model type go here
}

export interface ICheerfulCarnivalMidtermModelStatic extends mongoose.Model<ICheerfulCarnivalMidtermModel> {
	// Static methods go here
}

export const CheerfulCarnivalMidtermSchema = new mongoose.Schema<ICheerfulCarnivalMidtermModel, ICheerfulCarnivalMidtermModelStatic>({
	eventId: {type: Number, required: true},
	teamId: {type: Number, required: true},
	term: {type: Number, required: true},
	result: {type: String, required: true},
	points: {type: Number, required: true}
})

CheerfulCarnivalMidtermSchema.index({eventId: 1})

export const CheerfulCarnivalMidtermModel = mongoose.model<ICheerfulCarnivalMidtermModel, ICheerfulCarnivalMidtermModelStatic>("cc_midterms", CheerfulCarnivalMidtermSchema)