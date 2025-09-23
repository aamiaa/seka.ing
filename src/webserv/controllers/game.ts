import { NextFunction, Request, Response } from "express";
import CacheStore from "../cache";

export default class GameController {
	public static async getMaintenance(req: Request, res: Response, next: NextFunction) {
		return res.json(CacheStore.get("game_maintenance"))
	}
}