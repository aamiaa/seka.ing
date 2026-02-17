// https://github.com/sindresorhus/devtools-detect
const threshold = 170

const devtools = {
	isOpen: false,
	orientation: undefined
}

const emitEvent = (isOpen, orientation) => {
	globalThis.dispatchEvent(new globalThis.CustomEvent('devtoolschange', {
		detail: {
			isOpen,
			orientation,
		},
	}))
}

function check() {
	const widthDiff = window.outerWidth - window.innerWidth
	const heightDiff = window.outerHeight - window.innerHeight

	const widthThreshold = widthDiff > threshold
	const heightThreshold = heightDiff > threshold
	const orientation = widthThreshold ? "vertical" : "horizontal"

	if(!(heightThreshold && widthThreshold) && (widthThreshold || heightThreshold)) {
		if(!devtools.isOpen || devtools.orientation !== orientation) {
			emitEvent(true, orientation)
		}

		devtools.isOpen = true
		devtools.orientation = orientation
	} else {
		if(devtools.isOpen) {
			emitEvent(false, undefined)
		}

		devtools.isOpen = false
		devtools.orientation = undefined
	}
}
setInterval(check, 500)

let debounce = false
window.addEventListener("devtoolschange", function(event) {
	if(event.detail.isOpen && !debounce) {
		debounce = true
		new Function(`console.log(
			"%cHello, lurker!\\n\\nIf you're here to look at the site's api, please ask the owner for permission before using it in your project.\\n\\nThank you!",
			"color: #00ccbb; font-size: 16px;"
		)`)()
	}
})