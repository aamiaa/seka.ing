import { NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator";

const validate = validationResult.withDefaults({
	formatter: error => {
		switch(error.type) {
			case "field":
				return `${error.msg} at "${error.path}"`
			default:
				return error.msg
		}
	}
})

export default class ValidationMiddleware {
	public static sendErrors(req: Request, res: Response, next: NextFunction) {
		const result = validate(req)
		if(result.isEmpty()) {
			return next()
		}

		return res.status(400).send({error: result.array()[0]})
	}
}