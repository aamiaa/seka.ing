declare namespace Express {
	interface Request {
		cfIp: string
		_parsedUrl: URL
	}
}