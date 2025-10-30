import HttpsProxyAgent from "https-proxy-agent"
import SekaiApiClient from "sekai-api"

const httpsAgent = HttpsProxyAgent({
	host: process.env.ProxyHost,
	port: parseInt(process.env.ProxyPort),
	auth: `${process.env.ProxyUsername}-13:${process.env.ProxyPassword}`,
})

const client = new SekaiApiClient({
	httpsAgent,
	deviceModel: process.env.SEKAI_DEVICE_MODEL,
	deviceOS: process.env.SEKAI_DEVICE_OS
})
export default client