import {NextFunction, Request, Response} from "express";

export enum ApiRestrictionType {
	REQUIRE_VISIT = "require_visit",
	REQUIRE_BROWSER_UA = "require_browser_ua",
	REQUIRE_BROWSER_HEADERS = "require_browser_headers",
	REQUIRE_REFERER = "require_referer",
	REQUIRE_SEC_FETCH = "require_sec_fetch",
	REQUIRE_ACCEPT = "require_accept",
	REQUIRE_BUNDLED_CONNECTION = "require_bundled_connection",
	REQUIRE_HEADERS_ORDER = "require_headers_order"
}

export interface ApiRestrictionOptions {
	require_visit?: {
		to: string,
		within: number,
		each_time?: boolean
	},
	require_browser_ua?: boolean,
	require_browser_headers?: boolean,
	require_referer?: boolean | {
		path: string | RegExp
	},
	require_sec_fetch?: boolean,
	require_accept?: boolean,
	require_bundled_connection?: boolean,
	require_headers_order?: boolean
}

export interface ApiRestrictionResult {
	type: ApiRestrictionType,
	num: number,
	pass: boolean
}

export default class ApiRestriction {
	public static recentVisits: Map<string, Map<string, number>> = new Map()

	public static protectApi(options: ApiRestrictionOptions, errorMessage?: string) {
		return function apiRestriction(req: Request, res: Response, next: NextFunction) {
			if(!ApiRestriction.checkApiRestrictions(req, options)) {
				console.warn("[AntiBot]", req.cfIp, "failed check for api", req.path)

				if(errorMessage) {
					return res.status(403).json({error: errorMessage})
				} else {
					return res.status(403).send("")
				}
			}
			return next()
		}
	}

	public static recordVisits(req: Request, res: Response, next: NextFunction) {
		let visitsData = ApiRestriction.recentVisits.get(req.cfIp)
		if(!visitsData) {
			visitsData = new Map()
			ApiRestriction.recentVisits.set(req.cfIp, visitsData)
		}

		visitsData.set((req.baseUrl + req.path).replace(/\/$/, ""), Date.now())
		next()
	}

	public static checkApiRestrictions(req: Request, options: ApiRestrictionOptions): boolean {
		if(process.env.NODE_ENV === "dev") {
			return true
		}

		const checksFailed: ApiRestrictionResult[] = []

		const ip = req.cfIp
		const userAgent = req.get("User-Agent")
		if(!userAgent) {
			checksFailed.push({type: ApiRestrictionType.REQUIRE_BROWSER_UA, num: 0, pass: false})
			return false
		}

		const isFirefox = userAgent.includes("Firefox")
		const isSafari = userAgent.match(/(?:Version|CriOS|GSA)\/\d+(?:\.\d+)+(?: Mobile\/\w+)? Safari\/\d+(?:\.\d+)+/)
		const isOpera = userAgent.includes("OPR/")
		const isEdge = userAgent.includes("Edg/")
		const isChromium = req.get("sec-ch-ua")?.includes("Chromium") || isEdge || isOpera || (!isSafari && userAgent.includes("Chrome/"))
		const isReddit = userAgent.includes("Reddit/Version")

		const isKnownBrowser = isChromium || isFirefox || isSafari || isOpera || isEdge

		if(options.require_browser_ua) {
			let regex = /^Mozilla\/5\.0 \(.+?\).+?Gecko.+?\w\/[\d.]+$/
			if(isEdge) {
				regex = /^Mozilla\/5\.0 \(.+?\).+?Gecko.+?Chrome\/[\d.]+.+?Edg\/[\d.]+$/
			} else if(isOpera) {
				regex = /^Mozilla\/5\.0 \(.+?\).+?Gecko.+?Chrome\/[\d.]+.+?OPR\/[\d.]+(?: \(Edition [\w -]+?\))?$/
			} else if(isReddit) {
				regex = /^Mozilla\/5\.0 \(.+?\).+?Gecko.+? Version\/[\d.]+ Chrome\/[\d.]+ .+?Reddit\/Version [\d.]+\/Build \d+\/Android \d+$/
			}
			if(!userAgent?.match(regex)) {
				checksFailed.push({type: ApiRestrictionType.REQUIRE_BROWSER_UA, num: 1, pass: false})
			}
		}

		if(options.require_accept) {
			if(req.get("Accept") !== "*/*") {
				checksFailed.push({type: ApiRestrictionType.REQUIRE_ACCEPT, num: 1, pass: false})
			}
		}

		if(options.require_browser_headers) {
			const expectedHeaders = ["Referer", "Sec-Fetch-Dest", "Sec-Fetch-Mode", "Sec-Fetch-Site", "Accept", "Accept-Encoding", "Accept-Language"]
			if(!expectedHeaders.every(x => req.get(x) != undefined)) {
				checksFailed.push({type: ApiRestrictionType.REQUIRE_BROWSER_HEADERS, num: 1, pass: false})
			}

			const disallowedHeaders = ["Proxy-Connection", "Postman-Token", "Referrer-Policy"]
			if(disallowedHeaders.find(x => req.get(x) != undefined)) {
				checksFailed.push({type: ApiRestrictionType.REQUIRE_BROWSER_HEADERS, num: 2, pass: false})
			}

			if(userAgent.includes("Chrome") && !req.get("sec-ch-ua")) {
				checksFailed.push({type: ApiRestrictionType.REQUIRE_BROWSER_HEADERS, num: 3, pass: true})
			}

			if((isFirefox || isSafari) && req.get("sec-ch-ua")) {
				checksFailed.push({type: ApiRestrictionType.REQUIRE_BROWSER_HEADERS, num: 4, pass: false})
			}

			const platformHint = req.get("sec-ch-ua-platform")
			if(!platformHint && isChromium) {
				checksFailed.push({type: ApiRestrictionType.REQUIRE_BROWSER_HEADERS, num: 5, pass: false})
			}
			if(platformHint && ![`"Android"`, `"Chrome OS"`, `"Chromium OS"`, `"iOS"`, `"Linux"`, `"macOS"`, `"Windows"`, `"Unknown"`].includes(platformHint)) {
				checksFailed.push({type: ApiRestrictionType.REQUIRE_BROWSER_HEADERS, num: 6, pass: false})
			}

			if(isChromium && !req.get("sec-ch-ua")?.includes("Chromium")) {
				checksFailed.push({type: ApiRestrictionType.REQUIRE_BROWSER_HEADERS, num: 7, pass: false})
			}

			if(req.get("sec-ch-ua")?.includes("Google Chrome")) {
				const majorVersion = userAgent.match(/Chrome\/(\d+)\./)?.[1]
				if(majorVersion) {
					const greasedVersion = this.getGreasedChromeVersion(majorVersion)
					if(req.get("sec-ch-ua") !== greasedVersion) {
						checksFailed.push({type: ApiRestrictionType.REQUIRE_BROWSER_HEADERS, num: 8, pass: false})
					}
				} else {
					checksFailed.push({type: ApiRestrictionType.REQUIRE_BROWSER_HEADERS, num: 9, pass: false})
				}
			}
		}

		if(options.require_referer) {
			const referer = req.get("Referer")
			let refererUrl: URL

			try {
				refererUrl = new URL(referer)
			} catch(ex) {
				checksFailed.push({type: ApiRestrictionType.REQUIRE_REFERER, num: 1, pass: false})
			}

			if(refererUrl?.origin !== `https://${req.get("X-Forwarded-Host")}`) {
				checksFailed.push({type: ApiRestrictionType.REQUIRE_REFERER, num: 2, pass: false})
			}

			if(typeof options.require_referer === "object") {
				if(
					(typeof options.require_referer.path === "string" && refererUrl?.pathname !== options.require_referer.path) ||
					(options.require_referer.path instanceof RegExp && !refererUrl?.pathname?.match(options.require_referer.path))
				) {
					checksFailed.push({type: ApiRestrictionType.REQUIRE_REFERER, num: 3, pass: true})
				}
			}
		}

		if(options.require_sec_fetch) {
			if(req.get("Sec-Fetch-Site") !== "same-origin" || req.get("Sec-Fetch-Dest") !== "empty" || req.get("Sec-Fetch-Mode") !== "cors") {
				checksFailed.push({type: ApiRestrictionType.REQUIRE_SEC_FETCH, num: 1, pass: false})
			}
		}

		if(options.require_visit) {
			const visitsData = this.recentVisits.get(ip)
			if(!visitsData) {
				checksFailed.push({type: ApiRestrictionType.REQUIRE_VISIT, num: 1, pass: false})
			}

			const visitForRoute = visitsData?.get(options.require_visit.to)
			if(!visitForRoute || (Date.now() - visitForRoute) > options.require_visit.within) {
				checksFailed.push({type: ApiRestrictionType.REQUIRE_VISIT, num: 2, pass: false})
			}

			if(options.require_visit.each_time) {
				visitsData?.delete(options.require_visit.to)
			}
		}

		if(checksFailed.length > 0) {
			const pass = !checksFailed.find(x => x.pass === false)
			if(pass) {
				console.warn("[AntiBot]", ip, "Barely passed route", `${req.baseUrl}${req.path}${req._parsedUrl.search || ""}`, "checks", checksFailed.map(x => `${x.type}:${x.num}`).join(", "))
			} else {
				console.warn("[AntiBot]", ip, "Failed route", `${req.baseUrl}${req.path}${req._parsedUrl.search || ""}`, "checks", checksFailed.map(x => `${x.type}:${x.num}`).join(", "))

				return false
			}
		}

		if(!isKnownBrowser) {
			console.warn("[AntiBot] Unknown browser passed checks for", ip, req.path)
		}

		return true
	}

	private static getGreasedChromeVersion(majorVersion: string) {
		const seed = parseInt(majorVersion)
		const greaseyChars = [" ", "(", ":", "-", ".", "/", ")", ";", "=", "?", "_"]
		const greasedVersions = ["8", "99", "24"]

		const greaseyBrand =
			"Not" + greaseyChars[seed % greaseyChars.length] +
			"A" + greaseyChars[(seed + 1) % greaseyChars.length] +
			"Brand"
		const greaseyVersion = greasedVersions[seed % greasedVersions.length]

		const brandVersionList = [
			[greaseyBrand, greaseyVersion],
			["Chromium", majorVersion],
			["Google Chrome", majorVersion]
		]

		let order: number[] = []
		const size = brandVersionList.length
		switch(size) {
			case 2:
				order = [seed % size, (seed + 1) % size]
				break
			case 3: {
				const orders = [
					[0,1,2], [0,2,1], [1,0,2], [1,2,0], [2,0,1], [2,1,0]
				]
				order = orders[seed % orders.length]
				break
			}
			default: {
				const orders = [
					[0, 1, 2, 3], [0, 1, 3, 2], [0, 2, 1, 3], [0, 2, 3, 1], [0, 3, 1, 2],
					[0, 3, 2, 1], [1, 0, 2, 3], [1, 0, 3, 2], [1, 2, 0, 3], [1, 2, 3, 0],
					[1, 3, 0, 2], [1, 3, 2, 0], [2, 0, 1, 3], [2, 0, 3, 1], [2, 1, 0, 3],
					[2, 1, 3, 0], [2, 3, 0, 1], [2, 3, 1, 0], [3, 0, 1, 2], [3, 0, 2, 1],
					[3, 1, 0, 2], [3, 1, 2, 0], [3, 2, 0, 1], [3, 2, 1, 0]
				]
				order = orders[seed % orders.length]
				break
			}
		}

		const shuffled: string[][] = []
		order.forEach((val, idx) => {
			shuffled[val] = brandVersionList[idx]
		})
		
		return shuffled.map(x => `"${x[0]}";v="${x[1]}"`).join(", ")
	}
}