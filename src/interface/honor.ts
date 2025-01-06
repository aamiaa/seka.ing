export interface SekaiHonor {
	id: number,
	seq: number,
	groupId: number,
	honorRarity: "highest" | "high" | "middle" | "low",
	name: string,
	assetbundleName: string,
	levels: {
		honorId: number,
		level: number,
		bonus: number,
		description: string
	}[]
}

export interface SekaiHonorGroup {
	id: number,
	name: string,
	honorType: string,
	backgroundAssetbundleName: string,
	frameName?: string
}