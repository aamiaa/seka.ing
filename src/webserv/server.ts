import express, {Request, Response, NextFunction} from "express";
import { Server } from "http";
import apiRouter from "./routes/api";
import mainRouter from "./routes/root";

class ExpressServer {
	public express: express.Application;
	public server: Server

	constructor() {
		this.express = express();
	}

	public init() {
		this.server = this.express.listen(6979, "127.0.0.1", () => console.log("[Express] Webserv started!"));

		this.express.disable("x-powered-by")

		this.express.use("/", mainRouter)
		this.express.use("/api", apiRouter)

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