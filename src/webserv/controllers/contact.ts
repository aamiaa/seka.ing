import { NextFunction, Request, Response } from "express";
import fs from "fs";

export default class ContactController {
	public static readonly ContactFilePath = "data/contact_info.html"

	public static async getContactInfo(req: Request, res: Response, next: NextFunction) {
		return res.json({
			contact_info: (await fs.promises.readFile(this.ContactFilePath)).toString()
		})
	}
}