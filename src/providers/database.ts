import mongoose from "mongoose";

export class Database {
	public static init(): Promise<void> {
		let dbName = "sekaing"
		if(process.env.SEKAI_SERVER !== "en") {
			dbName += "-" + process.env.SEKAI_SERVER
		}
		if(process.env.NODE_ENV !== "production") {
			dbName += "-stg"
		}

		return new Promise(resolve => {
			mongoose.connect(`mongodb://${process.env.MongoServer}:${process.env.MongoPort}/${dbName}`)

			const database = mongoose.connection

			database.on("error", console.log)
			database.on("open", () => {
				console.log("[Database] Connected to mongodb", dbName)
				resolve()
			})
			mongoose.pluralize(null)
		})
	}
}

export default mongoose;