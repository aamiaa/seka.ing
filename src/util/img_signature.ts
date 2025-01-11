import CRC32 from "crc-32"

export function writePNGSignature(fileData: Buffer, signature: string) {
	// We create a private ancillary chunk after IHDR
	// (the first 2 letters of the type must be lowercase
	// to indicate ancillary + private)
	// https://en.wikipedia.org/wiki/PNG#%22Chunks%22_within_the_file
	const IHDRidx = fileData.indexOf("IHDR", 0, "ascii")
	const length = fileData.readInt32BE(IHDRidx - 4)
	const IDHREndIdx = IHDRidx + 4 + length + 4

	const sigBuf = Buffer.from(signature, "ascii")

	const lenBuf = Buffer.alloc(4)
	lenBuf.writeInt32BE(sigBuf.length)

	const typeBuf = Buffer.from("skID", "ascii")

	const CRCbuf = Buffer.alloc(4)
	CRCbuf.writeInt32BE(CRC32.buf(Buffer.concat([typeBuf, sigBuf])))
	
	const concat = Buffer.concat([
		fileData.subarray(0, IDHREndIdx),
		lenBuf,
		typeBuf,
		sigBuf,
		CRCbuf,
		fileData.subarray(IDHREndIdx, fileData.length)
	])

	return concat
}
