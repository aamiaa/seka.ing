async function getServerVersion(version) {
	const res = await fetch("/api/version" + (version ? `?version=${version}` : ""))
	if(!res.ok) {
		throw new Error("getServerVersion() failed: " + res.status)
	}

	const json = await res.json()
	return json
}

async function checkForUpdates() {
	const cachedVersion = localStorage.getItem("version")
	const version = await getServerVersion(cachedVersion)
	localStorage.setItem("version", version.version)
	if(version.should_update) {
		return document.location.reload(true)
	}
}

checkForUpdates()
setInterval(checkForUpdates, 20 * 60 * 1000)