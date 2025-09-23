import mongoose from "mongoose";
import GameMaintenance from "../interface/models/maintenance";

export interface IGameMaintenanceModel extends GameMaintenance, mongoose.Document {
	// Methods and fields which need the model type go here
}

export interface IGameMaintenanceModelStatic extends mongoose.Model<IGameMaintenanceModel> {
	// Static methods go here
}

export const GameMaintenanceSchema = new mongoose.Schema<IGameMaintenanceModel, IGameMaintenanceModelStatic>({
	startsAt: {type: Date, required: true},
	endsAt: {type: Date},
	newsId: {type: String}
})
GameMaintenanceSchema.index({startsAt: -1})

export const GameMaintenanceModel = mongoose.model<IGameMaintenanceModel, IGameMaintenanceModelStatic>("maintenances", GameMaintenanceSchema)