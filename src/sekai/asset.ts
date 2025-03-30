import {python} from "pythonia"
import ApiClient from "./api"
import path from "path"
import SekaiMasterDB from "../providers/sekai-master-db"
import fs from "fs"

// TODO: improve this so that multiple assets can be saved from one bundle
export async function downloadImageAsset({assetPath, assetName, container, destPath}: {assetPath: string, assetName: string, container?: string, destPath: string}) {
	const UnityPy = await python("UnityPy")
	UnityPy.config.FALLBACK_UNITY_VERSION = "2022.3.52f1"
	const warnings = await python("warnings")
	await warnings.filterwarnings("ignore")
	const builtins = await python("builtins")
	
	const bundleData = await ApiClient.downloadAssetBundle({
		bundleName: assetPath
	})
	const bytes = await builtins.bytes(bundleData.toJSON().data)
	const env = await UnityPy.load(bytes)

	for await(const obj of await env.objects) {
		if(["Texture2D", "Sprite"].includes(await obj.type.name)) {
			const data = await obj.read()
			const containerPath = await obj.container
			if(await data.m_Name === assetName && (!container || path.basename(containerPath, path.extname(containerPath)) === container)) {
				await data.image.save(destPath)
				return
			}
		}
	}

	throw new Error("Failed to download asset")
}

export async function ensureEventAssetsExist() {
	// check banner assets
	for(const event of SekaiMasterDB.getEvents()) {
		const filePath = path.join(__dirname, "..", "..", "public", "assets", `${event.assetbundleName}.png`)
		try {
			await fs.promises.stat(filePath)
		} catch(ex) {
			console.log("[SekaiAsset] Downloading missing event banner:", event.assetbundleName)
			await downloadImageAsset({
				assetPath: `home/banner/${event.assetbundleName}`,
				assetName: event.assetbundleName,
				destPath: filePath
			})
		}
	}

	// check honor assets
	for(const honorGroup of SekaiMasterDB.getHonorGroups()) {
		if(honorGroup.honorType === "event" && honorGroup.backgroundAssetbundleName) {
			const folderPath = path.join(process.env.ASSET_PATH, "assets/sekai/assetbundle/resources/startapp/honor", honorGroup.backgroundAssetbundleName)
			try {
				await fs.promises.stat(folderPath)
			} catch(ex) {
				console.log("[SekaiAsset] Downloading missing event title:", honorGroup.backgroundAssetbundleName)
				await fs.promises.mkdir(path.join(folderPath, "degree_main"), {recursive: true})
				await fs.promises.mkdir(path.join(folderPath, "degree_sub"), {recursive: true})

				await downloadImageAsset({
					assetPath: `honor/${honorGroup.backgroundAssetbundleName}`,
					assetName: "degree_main",
					destPath: path.join(folderPath, "degree_main/degree_main.png")
				})
				await downloadImageAsset({
					assetPath: `honor/${honorGroup.backgroundAssetbundleName}`,
					assetName: "degree_sub",
					destPath: path.join(folderPath, "degree_sub/degree_sub.png")
				})
			}
		}
	}

	// check event team assets
	for(const team of SekaiMasterDB.getCheerfulCarnivalTeams()) {
		const filePath = path.join(__dirname, "..", "..", "public", "assets", `team_${team.id}.png`)
		try {
			await fs.promises.stat(filePath)
		} catch(ex) {
			console.log("[SekaiAsset] Downloading missing team icon:", team.assetbundleName)

			const event = SekaiMasterDB.getEvent(team.eventId)
			await downloadImageAsset({
				assetPath: `event/${event.assetbundleName}/team_image`,
				assetName: team.assetbundleName,
				destPath: filePath
			})
		}
	}

	// check card thumbnail assets
	for(const card of SekaiMasterDB.getCards()) {
		const basePath = path.join(process.env.ASSET_PATH, "assets/sekai/assetbundle/resources/startapp/thumbnail/chara", card.assetbundleName)
		const normalPath = basePath + "_normal"
		const trainedPath = basePath + "_after_training"
		try {
			await fs.promises.stat(normalPath)
		} catch(ex) {
			console.log("[SekaiAsset] Downloading missing card thumbnail:", card.assetbundleName)

			await fs.promises.mkdir(normalPath, {recursive: true})
			await downloadImageAsset({
				assetPath: "thumbnail/chara",
				assetName: card.assetbundleName + "_normal",
				destPath: path.join(normalPath, card.assetbundleName + "_normal.png")
			})

			if(["rarity_3", "rarity_4"].includes(card.cardRarityType)) {
				await fs.promises.mkdir(trainedPath, {recursive: true})
			await downloadImageAsset({
				assetPath: "thumbnail/chara",
				assetName: card.assetbundleName + "_after_training",
				destPath: path.join(trainedPath, card.assetbundleName + "_after_training.png")
			})
			}
		}
	}
}