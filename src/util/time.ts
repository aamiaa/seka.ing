import moment from "moment-timezone"

export function dateFromPTString(timeStr: string) {
	// moment requires a well-formatted time string
	// so we format it ourselves
	const base = new Date(timeStr)

	const year = base.getFullYear()
	const month = (base.getMonth() + 1).toString().padStart(2, "0")
	const day = base.getDate().toString().padStart(2, "0")
	const hour = base.getHours().toString().padStart(2, "0")
	const minute = base.getMinutes().toString().padStart(2, "0")
	const second = base.getSeconds().toString().padStart(2, "0")

	const formatted = `${year}-${month}-${day} ${hour}:${minute}:${second}`
	const m = moment.tz(formatted, "America/Los_Angeles")
	return new Date(m.unix() * 1000)
}

export function getTimezoneOffsetAtDate(timezone: string, date: Date) {
	return moment.tz.zone(timezone).utcOffset(Math.floor(date.getTime()/1000))
}