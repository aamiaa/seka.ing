import crypto from "crypto"

export function encryptEventSnowflake(eventId: number, snowflake: string) {
	const eventIdBuf = Buffer.alloc(2)
	eventIdBuf.writeUInt16BE(eventId)

	let snowflakeHex = BigInt(snowflake).toString(16)
	if(snowflakeHex.length % 2 !== 0) {
		snowflakeHex = "0" + snowflakeHex
	}
	const snowflakeBuf = Buffer.from(snowflakeHex, "hex")
	const resultBuf = Buffer.concat([eventIdBuf, snowflakeBuf])
	
	const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(process.env.CIPHERKEY), process.env.CIPHERIV)
	let encrypted = cipher.update(resultBuf)
	encrypted = Buffer.concat([encrypted, cipher.final()])
	return encrypted.toString("hex")
}

export function decryptEventSnowflake(hex: string) {
	const encrypted = Buffer.from(hex, "hex")
	const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(process.env.CIPHERKEY), process.env.CIPHERIV)
	let decrypted = decipher.update(encrypted)
	decrypted = Buffer.concat([decrypted, decipher.final()])

	const eventId = decrypted.readUInt16BE()
	const snowflake = BigInt("0x" + decrypted.subarray(2).toString("hex")).toString()
	return {eventId, snowflake}
}