import HttpsProxyAgent from "https-proxy-agent"
import SekaiApiClient from "sekai-api"

const httpsAgent = HttpsProxyAgent({
	host: process.env.ProxyHost,
	port: parseInt(process.env.ProxyPort) + 2,
	auth: `${process.env.ProxyUsername}:${process.env.ProxyPassword}`,
})

const client = new SekaiApiClient({httpsAgent})
export default client