import { Router } from "express"
import express from "express";
import path from "path";

const mainRouter = Router()

mainRouter.use("/", express.static(
	path.join(__dirname, "..", "..", "..", "public"),
	{
		extensions: ["html"]
	}
))

// Support old urls with trailing slash
const legacyPaths = new Map([
	["/events/", "events.html"]
])
mainRouter.use("/", (req, res, next) => {
	if(legacyPaths.has(req.path)) {
		const targetFile = legacyPaths.get(req.path)
		return res.sendFile(targetFile, {root: "public"})
	}
	next()
})

export default mainRouter