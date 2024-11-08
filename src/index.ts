import "dotenv/config"
import "express-async-errors"
import ExpressServer from "./webserv/server"
import EventLeaderboard from "./sekai/event";

process.on("unhandledRejection", (reason: Error|any) => {
	console.log("Unhandled Rejection at:", reason.stack || reason)
});

async function main() {
	console.log("Starting...")

	EventLeaderboard.init()
	ExpressServer.init()
}
main()