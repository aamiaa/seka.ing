import mongoose from "mongoose";

export class Database {
	public static init(): Promise<void> {
		return new Promise(resolve => {
			mongoose.connect(`mongodb://${process.env.MongoServer}:${process.env.MongoPort}/${process.env.NODE_ENV === "production" ? "sekaing" : "sekaing-stg"}`)

			const database = mongoose.connection

			database.on("error", console.log)
			database.on("open", () => {
				console.log("[Database] Connected to mongodb!")
				resolve()
			})
			mongoose.pluralize(null)
		})
	}
}

export default mongoose;