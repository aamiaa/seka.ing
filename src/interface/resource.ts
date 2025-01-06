export interface SekaiResourceBox {
	resourceBoxPurpose: string,
	id: number,
	resourceBoxType: string,
	description: string,
	details: {
		resourceBoxPurpose: string,
		resourceBoxId: number,
		seq: number,
		resourceType: string,
		resourceId: number,
		resourceLevel: number,
		resourceQuantity: number
	}[]
}