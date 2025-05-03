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
			const name = await data.m_Name
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
			
			try {
				await downloadImageAssets({
					assetPath: `home/banner/${event.assetbundleName}`,
					nameDestMap: {
						[event.assetbundleName]: filePath
					}
				})
			} catch(ex) {
				console.error("[SekaiAsset] Failed to download", event.assetbundleName, ex.message)
			}
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

				try {
					await downloadImageAssets({
						assetPath: `honor/${honorGroup.backgroundAssetbundleName}`,
						nameDestMap: {
							degree_main: path.join(folderPath, "degree_main/degree_main.png"),
							degree_sub: path.join(folderPath, "degree_sub/degree_sub.png")
						}
					})
				} catch(ex) {
					console.error("[SekaiAsset] Failed to download", honorGroup.backgroundAssetbundleName, ex.message)

					await fs.promises.rm(path.join(folderPath, "degree_main"), {recursive: true, force: true})
					await fs.promises.rm(path.join(folderPath, "degree_sub"), {recursive: true, force: true})
				}
			}

			if(honorGroup.frameName) {
				const folderPath = path.join(process.env.ASSET_PATH, "assets/sekai/assetbundle/resources/startapp/honor_frame", honorGroup.frameName)
				try {
					await fs.promises.stat(folderPath)
				} catch(ex) {
					console.log("[SekaiAsset] Downloading missing event title frame:", honorGroup.frameName)
					await fs.promises.mkdir(path.join(folderPath, "frame_degree_m_3"), {recursive: true})
					await fs.promises.mkdir(path.join(folderPath, "frame_degree_m_4"), {recursive: true})
					await fs.promises.mkdir(path.join(folderPath, "frame_degree_s_3"), {recursive: true})
					await fs.promises.mkdir(path.join(folderPath, "frame_degree_s_4"), {recursive: true})

					try {
						await downloadImageAssets({
							assetPath: `honor_frame/${honorGroup.frameName}`,
							nameDestMap: {
								frame_degree_m_3: path.join(folderPath, "frame_degree_m_3/frame_degree_m_3.png"),
								frame_degree_m_4: path.join(folderPath, "frame_degree_m_4/frame_degree_m_4.png"),
								frame_degree_s_3: path.join(folderPath, "frame_degree_s_3/frame_degree_s_3.png"),
								frame_degree_s_4: path.join(folderPath, "frame_degree_s_4/frame_degree_s_4.png")
							}
						})
					} catch(ex) {
						console.error("[SekaiAsset] Failed to download", honorGroup.frameName, ex.message)

						await fs.promises.rm(path.join(folderPath, "frame_degree_m_3"), {recursive: true, force: true})
						await fs.promises.rm(path.join(folderPath, "frame_degree_m_4"), {recursive: true, force: true})
						await fs.promises.rm(path.join(folderPath, "frame_degree_s_3"), {recursive: true, force: true})
						await fs.promises.rm(path.join(folderPath, "frame_degree_s_4"), {recursive: true, force: true})
					}
				}
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
				console.error("[SekaiAsset] Failed to download", team.assetbundleName, ex.message)
			}
		}
	}

	// check card thumbnail assets
	const nameDestMap: Record<string, string> = {}
	for(const card of SekaiMasterDB.getCards()) {
		const basePath = path.join(process.env.ASSET_PATH, "assets/sekai/assetbundle/resources/startapp/thumbnail/chara", card.assetbundleName)
		const normalPath = basePath + "_normal"
		const trainedPath = basePath + "_after_training"
		try {
			await fs.promises.stat(normalPath)
		} catch(ex) {
			console.log("[SekaiAsset] Downloading missing card thumbnail:", card.assetbundleName)

			nameDestMap[card.assetbundleName + "_normal"] = path.join(normalPath, card.assetbundleName + "_normal.png"),
			await fs.promises.mkdir(normalPath, {recursive: true})

			if(["rarity_3", "rarity_4"].includes(card.cardRarityType)) {
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
			console.error("[SekaiAsset] Failed to download", "thumbnail/chara", ex.message)
		}
	}
}