import { Router } from "express"
import AssetController from "../controllers/asset"
import express from "express";
import path from "path";

const mainRouter = Router()

mainRouter.use("/", express.static(path.join(__dirname, "..", "..", "..", "public"), {maxAge: 14400 * 1000}))
mainRouter.get("/assets/event_:name.png", AssetController.serveNewEventAsset)

export default mainRouter