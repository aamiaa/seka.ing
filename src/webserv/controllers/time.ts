import { NextFunction, Request, Response } from "express";

export default class TimeController {
	public static async getServerTime(req: Request, res: Response, next: NextFunction) {
		return res.json({
			server_time: Date.now()
		})
	}
}