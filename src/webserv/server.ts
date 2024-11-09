import express, {Request, Response, NextFunction} from "express";
import { Server } from "http";
import EventLeaderboard from "../sekai/event";
import path from "path"
import axios from "axios";
import fs from "fs";

class ExpressServer {
	public express: express.Application;
	public server: Server

	constructor() {
		this.express = express();
	}

	public init() {
		this.server = this.express.listen(6979, "127.0.0.1", () => console.log("[Express] Webserv started!"));

		this.express.disable("x-powered-by")
		this.express.use("/", express.static(path.join(__dirname, "..", "..", "public")))
		this.express.get("/assets/event_:name.png", async (req, res, next) => {
			const eventName = req.params.name
			try {
				const filePath = path.join(__dirname, "..", "..", "public", "assets", `event_${eventName}.png`)
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
		})
		this.express.get("/api/leaderboard", (req, res) => {
			return res.json(EventLeaderboard.leaderboard)
		})

		this.express.all("*", (req, res) => {
			return res.redirect("/")
		})
		this.express.use((err: Error, req: Request, res: Response, next: NextFunction) => {
			console.error("[Express Error]", req.path, err)
			
			return res.status(500).send("Internal Server Error")
		})
	}
}

export default new ExpressServer()