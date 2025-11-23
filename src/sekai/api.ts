import HttpsProxyAgent from "https-proxy-agent"
import SekaiApiClient from "sekai-api"

const httpsAgent = HttpsProxyAgent({
	host: process.env.ProxyHost,
	port: parseInt(process.env.ProxyPort),
	auth: `${process.env.ProxyUsername}:${process.env.ProxyPassword}`,
})

const client = new SekaiApiClient({
	server: process.env.SEKAI_SERVER as "en" | "jp",
	httpsAgent,
	deviceModel: process.env.SEKAI_DEVICE_MODEL,
	deviceOS: process.env.SEKAI_DEVICE_OS
})
export default client