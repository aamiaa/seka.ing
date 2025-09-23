import { NextFunction, Request, Response } from "express";
import CacheStore from "../cache";
import { GameMaintenanceModel } from "../../models/maintenance";
import GameMaintenance from "../../interface/models/maintenance";

export default class GameController {
	public static async getMaintenance(req: Request, res: Response, next: NextFunction) {
		const active = CacheStore.get<GameMaintenance>("active_maintenance")
		const planned = await GameMaintenanceModel.find({startsAt: {$gte: new Date()}}).lean()

		return res.json({
			active_maintenance: active && active.startsAt.getTime() < Date.now() && active.endsAt.getTime() > Date.now() ? {
				starts_at: active.startsAt,
				ends_at: active.endsAt
			} : null,
			planned_maintenances: planned.map(x => ({
				starts_at: x.startsAt,
				ends_at: x.endsAt,
				news_id: x.newsId
			}))
		})
	}
}