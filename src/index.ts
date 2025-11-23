import "dotenv/config"
import "express-async-errors"
import ExpressServer from "./webserv/server"
import LeaderboardTracker from "./sekai/event/leaderboard";
import SekaiMasterDB from "./providers/sekai-master-db";
import ApiClient from "./sekai/api"
import { Database } from "./providers/database";
import CheerfulCarnivalTracker from "./sekai/event/cheerful_carnival";
import { execSync } from "child_process";
import MaintenanceTracker from "./sekai/maintenance";

process.on("unhandledRejection", (reason: Error|any) => {
	console.log("Unhandled Rejection at:", reason.stack || reason)
});

async function main() {
	console.log("Starting... env:", process.env.NODE_ENV)

	process.env.VERSION_HASH = execSync("git rev-parse --short HEAD").toString().trim()
	console.log("Version hash:", process.env.VERSION_HASH)

	await Database.init()

	await ApiClient.init()
	await ApiClient.authenticate({
		credential: process.env.SEKAI_AUTH,
		deviceId: process.env.SEKAI_DEVICE_ID,
		installId: process.env.SEKAI_INSTALL_ID
	})

	await SekaiMasterDB.init()

	LeaderboardTracker.init()
	CheerfulCarnivalTracker.init()
	if(process.env.SEKAI_SERVER === "en")
		MaintenanceTracker.init()
	ExpressServer.init()
}
main()