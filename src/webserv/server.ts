import express, {Request, Response, NextFunction} from "express";
import { Server } from "http";
import EventLeaderboard from "../sekai/event";
import path from "path"

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