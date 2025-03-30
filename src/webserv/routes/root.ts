import { Router } from "express"
import express from "express";
import path from "path";

const mainRouter = Router()

mainRouter.use("/", express.static(path.join(__dirname, "..", "..", "..", "public"), {maxAge: 14400 * 1000}))

export default mainRouter