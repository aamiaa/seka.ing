import crypto from "crypto"

export function encryptEventSnowflake(eventId: number, snowflake: string) {
	const buf = Buffer.alloc(10)
	buf.writeUInt16BE(eventId)
	buf.writeBigUInt64BE(BigInt(snowflake), 2)
	
	const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(process.env.CIPHERKEY), process.env.CIPHERIV)
	let encrypted = cipher.update(buf)
	encrypted = Buffer.concat([encrypted, cipher.final()])
	return encrypted.toString("hex")
}

export function decryptEventSnowflake(hex: string) {
	const encrypted = Buffer.from(hex, "hex")
	const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(process.env.CIPHERKEY), process.env.CIPHERIV)
	let decrypted = decipher.update(encrypted)
	decrypted = Buffer.concat([decrypted, decipher.final()])

	const eventId = decrypted.readUInt16BE()
	const snowflake = decrypted.readBigUInt64BE(2).toString()
	return {eventId, snowflake}
}