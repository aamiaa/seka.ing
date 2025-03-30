import "dotenv/config"
import "express-async-errors"
import ExpressServer from "./webserv/server"
import LeaderboardTracker from "./sekai/event/leaderboard";
import SekaiMasterDB from "./providers/sekai-master-db";
import ApiClient from "./sekai/api"
import { Database } from "./providers/database";
import CheerfulCarnivalTracker from "./sekai/event/cheerful_carnival";
import { ensureEventAssetsExist } from "./sekai/asset";

process.on("unhandledRejection", (reason: Error|any) => {
	console.log("Unhandled Rejection at:", reason.stack || reason)
});

async function main() {
	console.log("Starting... env:", process.env.NODE_ENV)

	await Database.init()

	await ApiClient.init()
	await ApiClient.authenticate({
		credential: process.env.SEKAI_AUTH,
		deviceId: process.env.SEKAI_DEVICE_ID,
		installId: process.env.SEKAI_INSTALL_ID
	})

	await SekaiMasterDB.init()
	await ensureEventAssetsExist()

	LeaderboardTracker.init()
	CheerfulCarnivalTracker.init()
	ExpressServer.init()
}
main()