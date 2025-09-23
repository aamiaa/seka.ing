import { dateFromPTString } from "../src/util/time"

const input = process.argv[2]
const parsed = dateFromPTString(input)
console.log(parsed.toISOString(), parsed.getTime())