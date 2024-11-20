export default class CacheStore {
	private static _map = new Map<string, any>()

	public static get<T>(key: string) : T {
		return this._map.get(key)
	}

	public static set(key: string, value: any) {
		this._map.set(key, value)
	}
}