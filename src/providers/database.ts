import mongoose from "mongoose";

export class Database {
	public static init(): Promise<void> {
		return new Promise(resolve => {
			mongoose.connect(`mongodb://${process.env.MongoServer}:${process.env.MongoPort}/sekaing`)

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