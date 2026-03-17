import { HydratedDocument } from "mongoose";
import { IRankingSnapshotModel } from "./model";
import crypto from "crypto"

export const RankingSnapshotMethods = {
	getHash(this: HydratedDocument<IRankingSnapshotModel>) {
		let hashStr = ""
		this.rankings.forEach(x => hashStr += `${x.userId}${x.rank}${x.score}`)
		return crypto.createHash("md5").update(hashStr).digest("hex")
	}
}