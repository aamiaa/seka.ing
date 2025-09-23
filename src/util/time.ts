export function dateFromPTString(timeStr: string) {
	// The date constructor will create the timestamp in the current machine's timezone
	// so it has to be moved by the machine's timezone + by the PT timezone
	const PTOffset = 7 * 60 - new Date().getTimezoneOffset()
	const time = new Date(timeStr).getTime() + PTOffset * 60 * 1000
	return new Date(time)
}