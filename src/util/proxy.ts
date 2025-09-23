import axios, { AxiosRequestConfig } from "axios"
import HttpsProxyAgent from "https-proxy-agent"

export default async function proxyRequest(data: AxiosRequestConfig<any>, proxyIdx: number) {
	if(proxyIdx == null) {
		throw new Error("Missing proxy index")
	}
		
	const httpsAgent = HttpsProxyAgent({
		host: process.env.ProxyHost,
		port: parseInt(process.env.ProxyPort),
		auth: `${process.env.ProxyUsername}-${proxyIdx}:${process.env.ProxyPassword}`,
	})
	const axiosInstance = axios.create({
		httpsAgent
	})

	return await axiosInstance(data)
}