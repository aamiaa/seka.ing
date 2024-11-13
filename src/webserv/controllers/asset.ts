import axios from "axios";
import { NextFunction, Request, Response } from "express";
import fs from "fs";
import path from "path";

export default class AssetController {
	public static async serveNewEventAsset(req: Request, res: Response, next: NextFunction) {
		const eventName = req.params.name
		try {
			const filePath = path.join(__dirname, "..", "..", "..", "public", "assets", `event_${eventName}.png`)
			const writer = fs.createWriteStream(filePath)
			const imgRes = await axios.get(`https://storage.sekai.best/sekai-en-assets/home/banner/event_${eventName}_rip/event_${eventName}.png`, {
				responseType: "stream"
			})
			await new Promise<void>((resolve, reject) => {
				imgRes.data.pipe(writer)
		
				writer.on("close", () => {
					resolve()
				})
				writer.on("error", err => {
					writer.close()
					reject(err)
				})
			})

			return res.sendFile(filePath)
		} catch(ex) {
			return next()
		}
	}
}