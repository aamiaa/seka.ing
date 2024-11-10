function dateToMinutes(date: Date, start: Date) {
	return (date.getTime() - start.getTime()) / (1000 * 60)
}

function linearRegression(points: {time: number, number: number}[]) {
	const n = points.length
	const sumX = points.reduce((acc, p) => acc + p.time, 0)
	const sumY = points.reduce((acc, p) => acc + p.number, 0)
	const sumXY = points.reduce((acc, p) => acc + p.time * p.number, 0)
	const sumX2 = points.reduce((acc, p) => acc + p.time * p.time, 0)
	
	const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
	const intercept = (sumY - slope * sumX) / n
	
	return { slope, intercept }
}

function predictFutureNumber(startDate: Date, targetDate: Date, regressionModel: {slope: number, intercept: number}) {
	const targetTime = dateToMinutes(targetDate, startDate)
	return regressionModel.slope * targetTime + regressionModel.intercept
}

export function predict(points: {date: Date, number: number}[], futureDate: Date) {
	const startDate = points[0].date
	const timeSeries = points.map(d => ({
		time: dateToMinutes(d.date, startDate),
		number: d.number
	}))
	const regressionModel = linearRegression(timeSeries)
	const predictedValue = predictFutureNumber(startDate, futureDate, regressionModel)
	return predictedValue
}