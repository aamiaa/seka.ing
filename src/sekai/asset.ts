import {python} from "pythonia"
import ApiClient from "./api"
import path from "path"
import SekaiMasterDB from "../providers/sekai-master-db"
import fs from "fs"
import { SekaiEventType } from "../interface/event"

export async function downloadImageAssets({assetPath, container, nameDestMap}: {assetPath: string, container?: string, nameDestMap: Record<string, string>}) {
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

	const found: string[] = []
	for await(const obj of await env.objects) {
		if(["Texture2D", "Sprite"].includes(await obj.type.name)) {
			const data = await obj.read()
			const name = (await data.m_Name).toLowerCase() // accounts for event_**I**nfinitelygray_2021
			const containerPath = await obj.container
			if(nameDestMap[name] && (!container || path.basename(containerPath, path.extname(containerPath)) === container)) {
				await data.image.save(nameDestMap[name])
				found.push(name)
			}
		}
	}

	const notFound = Object.keys(nameDestMap).filter(x => !found.includes(x))
	if(notFound.length > 0) {
		throw new Error("Failed to download asset")
	}
}

export async function ensureEventAssetsExist() {
	// check banner assets
	for(const event of SekaiMasterDB.getEvents()) {
		const filePath = path.join(__dirname, "..", "..", "public", "assets", `${event.assetbundleName}.png`)
		try {
			await fs.promises.stat(filePath)
		} catch(ex) {
			console.log("[SekaiAsset] Downloading missing event banner:", event.assetbundleName)

			let abName = event.assetbundleName
			if(event.assetbundleName === "event_cuddle_2023") { // sigh
				abName = "event_cuddle_2024"
			}
			
			try {
				await downloadImageAssets({
					assetPath: `home/banner/${abName}`,
					nameDestMap: {
						[abName]: filePath
					}
				})
			} catch(ex) {
				console.error("[SekaiAsset] Failed to download", event.assetbundleName, ex.message ?? ex)
			}
		}
	}

	// check event team assets
	const ccEventIds = SekaiMasterDB.getEvents().filter(x => x.eventType === SekaiEventType.CHEERFUL_CARNIVAL).map(x => x.id)
	const ccTeams = SekaiMasterDB.getCheerfulCarnivalTeams().filter(x => ccEventIds.includes(x.eventId))
	for(const team of ccTeams) {
		const filePath = path.join(__dirname, "..", "..", "public", "assets", `team_${team.id}.png`)
		try {
			await fs.promises.stat(filePath)
		} catch(ex) {
			console.log("[SekaiAsset] Downloading missing team icon:", team.assetbundleName)

			const event = SekaiMasterDB.getEvent(team.eventId)
			try {
				await downloadImageAssets({
					assetPath: `event/${event.assetbundleName}/team_image`,
					nameDestMap: {
						[team.assetbundleName]: filePath	
					}
				})
			} catch(ex) {
				console.error("[SekaiAsset] Failed to download", team.assetbundleName, ex.message ?? ex)
			}
		}
	}

	// check card thumbnail assets
	const nameDestMap: Record<string, string> = {}
	for(const card of SekaiMasterDB.getCards()) {
		const basePath = path.join(process.env.ASSET_PATH, "assets/sekai/assetbundle/resources/startapp/thumbnail/chara", card.assetbundleName)
		const normalPath = basePath + "_normal"
		const trainedPath = basePath + "_after_training"
		const canBeTrained = (["rarity_3", "rarity_4"].includes(card.cardRarityType))
		const isTrainedOnly = card.initialSpecialTrainingStatus === "done"
		try {
			await fs.promises.stat(normalPath)
		} catch(ex) {
			console.log("[SekaiAsset] Downloading missing card thumbnail:", card.assetbundleName)

			if(!isTrainedOnly) {
				nameDestMap[card.assetbundleName + "_normal"] = path.join(normalPath, card.assetbundleName + "_normal.png"),
				await fs.promises.mkdir(normalPath, {recursive: true})
			}

			if(canBeTrained) {
				nameDestMap[card.assetbundleName + "_after_training"] = path.join(trainedPath, card.assetbundleName + "_after_training.png")
				await fs.promises.mkdir(trainedPath, {recursive: true})
			}
		}
	}
	if(Object.keys(nameDestMap).length > 0) {
		try {
			await downloadImageAssets({
				assetPath: "thumbnail/chara",
				nameDestMap
			})
		} catch(ex) {
			console.error("[SekaiAsset] Failed to download", "thumbnail/chara", ex.message ?? ex)
		}
	}

	// check card deck assets
	for(const card of SekaiMasterDB.getCards()) {
		const basePath = path.join(process.env.ASSET_PATH, "assets/sekai/assetbundle/resources/startapp/character/member_cutout", card.assetbundleName)
		const normalPath = path.join(basePath, "normal")
		const trainedPath = path.join(basePath, "after_training")
		const canBeTrained = (["rarity_3", "rarity_4"].includes(card.cardRarityType))
		const isTrainedOnly = card.initialSpecialTrainingStatus === "done"
		try {
			await fs.promises.stat(normalPath)
		} catch(ex) {
			console.log("[SekaiAsset] Downloading missing card deck cutout:", card.assetbundleName)
			if(!isTrainedOnly) {
				await fs.promises.mkdir(normalPath, {recursive: true})
			}
			if(canBeTrained) {
				await fs.promises.mkdir(trainedPath, {recursive: true})
			}

			try {
				if(!isTrainedOnly) {
					await downloadImageAssets({
						assetPath: `character/member_cutout/${card.assetbundleName}`,
						container: "normal",
						nameDestMap: {
							deck: path.join(normalPath, "deck.png")	
						}
					})
				}
				if(canBeTrained) {
					await downloadImageAssets({
						assetPath: `character/member_cutout/${card.assetbundleName}`,
						container: "after_training",
						nameDestMap: {
							deck: path.join(trainedPath, "deck.png")	
						}
					})
				}
			} catch(ex) {
				console.error("[SekaiAsset] Failed to download", card.assetbundleName, ex.message ?? ex)

				await fs.promises.rm(normalPath, {recursive: true, force: true})
				if(canBeTrained) {
					await fs.promises.rm(trainedPath, {recursive: true, force: true})
				}
			}
		}
	}
}