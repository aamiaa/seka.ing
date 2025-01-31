import { HydratedDocument } from "mongoose";
import { IBorderSnapshotModel } from "./model";
import crypto from "crypto"

export const BorderSnapshotMethods = {
	getHash(this: HydratedDocument<IBorderSnapshotModel>) {
		let hashStr = ""
		this.borderRankings.forEach(x => hashStr += `${x.userId}${x.rank}${x.score}`)
		this.userWorldBloomChapterRankingBorders?.forEach(x => x.borderRankings.forEach(y => hashStr += `${y.userId}${y.rank}${y.score}`))
		return crypto.createHash("md5").update(hashStr).digest("hex")
	}
}