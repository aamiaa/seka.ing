import express, {Request, Response, NextFunction} from "express";
import { Server } from "http";
import apiRouter from "./routes/api";
import mainRouter from "./routes/root";
import imageGenRouter from "./routes/imggen";

class ExpressServer {
	public express: express.Application;
	public server: Server

	constructor() {
		this.express = express();
	}

	public init() {
		this.server = this.express.listen(parseInt(process.env.WEBSERV_PORT), "127.0.0.1", () => console.log("[Express] Webserv started!"));

		this.express.disable("x-powered-by")
		this.express.set("trust proxy", "loopback")

		this.express.use((req, res, next) => {
			req.cfIp = req.get("cf-connecting-ip")
			next()
		})

		this.express.use("/", mainRouter)
		this.express.use("/api", apiRouter)
		this.express.use("/images", imageGenRouter)
		this.express.get("/events/:eventId", (req, res, next) => {
			return res.sendFile("past_event.html", {root: "data/templates"})
		})

		this.express.all("*", (req, res) => {
			return res.status(404).sendFile("404.html", {root: "public"})
		})
		this.express.use((err: Error, req: Request, res: Response, next: NextFunction) => {
			console.error("[Express Error]", req.path, err)
			
			return res.status(500).send("Internal Server Error")
		})
	}
}

export default new ExpressServer()