import { NextFunction, Request, Response } from "express";

export default class ContactController {
	public static async getContactInfo(req: Request, res: Response, next: NextFunction) {
		return res.json({
			contact_info: `<p>Legal/operational inquiries: <a href="mailto:neo@seka.ing">neo@seka.ing</a></p>\n<p>Casual & questions: <code>aamia</code> on Discord (uid <code>142007603549962240</code>)</p>`
		})
	}
}