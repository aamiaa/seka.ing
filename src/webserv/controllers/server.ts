import { NextFunction, Request, Response } from "express";

export default class ServerController {
	public static async getServerTime(req: Request, res: Response, next: NextFunction) {
		return res.json({
			server_time: Date.now()
		})
	}

	public static async getServerVersion(req: Request, res: Response, next: NextFunction) {
		const version = req.query.version
		if(version != null && version !== process.env.VERSION_HASH) {
			res.set("Clear-Site-Data", `"cache"`)
			return res.json({
				version: process.env.VERSION_HASH,
				should_update: true
			})
		}

		return res.json({
			version: process.env.VERSION_HASH,
			should_update: false
		})
	}
}