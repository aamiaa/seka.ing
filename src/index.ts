import "dotenv/config"
import "express-async-errors"
import ExpressServer from "./webserv/server"
import LeaderboardTracker from "./sekai/event/leaderboard";
import SekaiMasterDB from "./providers/sekai-master-db";
import { Database } from "./providers/database";

process.on("unhandledRejection", (reason: Error|any) => {
	console.log("Unhandled Rejection at:", reason.stack || reason)
});

async function main() {
	console.log("Starting... env:", process.env.NODE_ENV)

	await SekaiMasterDB.init()
	await Database.init()
	LeaderboardTracker.init()
	ExpressServer.init()
}
main()