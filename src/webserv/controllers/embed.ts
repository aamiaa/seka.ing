import { NextFunction, Request, Response } from "express";
import path from "path";
import sharp from "sharp";
import SekaiMasterDB from "../../providers/sekai-master-db";
import { SekaiEvent } from "../../interface/event";
import { RankingSnapshotModel } from "../../models/snapshot/model";

interface OpenGraphOptions {
	title?: string,
	site_name?: string,
	url?: string,
	image?: string,
	description?: string,
	theme_color?: string
}

function createOpenGraph(options: OpenGraphOptions) {
	const parts = [
		`<!DOCTYPE html>`,
		`<html lang="en">`,
		`<head>`,
		`<meta property="og:type" content="website">`,
		...Object.entries(options).map(([prop, val]) => `<meta property="og:${prop}" content="${val}">`),
		...[options.theme_color != null ? `<meta property="theme-color" content="${options.theme_color}">` : undefined],
		`</head>`,
		`</html>`
	]

	return parts.join("\n")
}

export default class EmbedController {
	public static async getEventEmbed(req: Request, res: Response, next: NextFunction) {
		// Figure out event id from redirect's Referer
		const host = req.get("X-Forwarded-Host") ?? req.get("Host")
		const initialPath = req.query.path as string

		const currentEvent = SekaiMasterDB.getCurrentEvent()
		let event: SekaiEvent
		if(initialPath === "/") {
			event = currentEvent
		} else if(initialPath.startsWith("/events/")) {
			const eventId = parseInt(initialPath.match(/^\/events\/(\d+)$/)?.[1])
			if(isNaN(eventId)) {
				return res.status(400).json({error: "Invalid event id"})
			}
			event = SekaiMasterDB.getEvent(eventId)
		} else {
			return res.status(400).json({error: "Invalid path"})
		}

		if(!event) {
			return res.status(400).json({error: "Invalid event"})
		}

		// In case of a past event, get its cutoffs
		const snapshot = event.id < currentEvent.id && await RankingSnapshotModel.findOne({eventId: event.id, final: true})
		const extraText = snapshot ?
		`T1: ${snapshot.rankings[0].score.toLocaleString()}\n` +
		`T10: ${snapshot.rankings[9].score.toLocaleString()}\n` +
		`T50: ${snapshot.rankings[49].score.toLocaleString()}\n` +
		`T100: ${snapshot.rankings[99].score.toLocaleString()}`
		: ""

		// Get the event logo's dominant color
		const logoPath = path.join(__dirname, "../../../public/assets", event.assetbundleName + ".png")
		const { channels } = await sharp(logoPath).stats()
		const dominant = {
			r: Math.round(channels[0].mean),
			g: Math.round(channels[1].mean),
			b: Math.round(channels[2].mean),
		}
		const dominantHex = "#" + (0xFF0000 * (dominant.r/255) + 0x00FF00 * (dominant.g/255) + 0x0000FF * (dominant.b/255)).toString(16)

		// Construct opengraph tags
		const opengraph = createOpenGraph({
			title: `Event Tracker - ${event.name}`,
			site_name: host,
			url: `https://${host}${initialPath}`,
			image: `https://${host}/assets/${event.assetbundleName}.png`,
			description: `Event leaderboard tracker for Project Sekai.\n\n${extraText}`,
			theme_color: dominantHex
		})

		res.set("Content-Type", "text/html")
		return res.send(opengraph)
	}
}