import { HydratedDocument } from "mongoose";
import { IBorderSnapshotModel } from "./model";

export const BorderSnapshotMethods = {
	getHash(this: HydratedDocument<IBorderSnapshotModel>) {
		let hashStr = ""
		this.borderRankings.forEach(x => hashStr += `${x.userId}${x.rank}${x.score}`)
		this.userWorldBloomChapterRankingBorders?.forEach(x => x.borderRankings.forEach(y => hashStr += `${y.userId}${y.rank}${y.score}`))
	}
}