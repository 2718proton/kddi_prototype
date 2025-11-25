// app/api/testInflux/route.ts
import { NextRequest, NextResponse } from "next/server";
import { queryApi, bucket, org } from "@/lib/influxdbClient";

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	const station_id = searchParams.get("station_id");

	console.log('=== InfluxDB Test Debug ===');
	console.log('Station ID:', station_id);
	console.log('Bucket:', bucket);
	console.log('Org:', org);

	if (!station_id) {
		return NextResponse.json(
			{ error: "station_id is required" },
			{ status: 400 }
		);
	}

	try {
		// Simple query to get ALL data for this station (last 24h)
		const fluxQuery = `
			from(bucket: "${bucket}")
				|> range(start: -24h)
				|> filter(fn: (r) => r["station_id"] == "${station_id}")
		`;

		console.log('Flux Query:', fluxQuery);

		const data: any[] = [];
		let rowCount = 0;

		await queryApi.queryRows(fluxQuery, {
			next(row: string[], tableMeta: any) {
				rowCount++;
				const o = tableMeta.toObject(row);
				console.log(`Row ${rowCount}:`, JSON.stringify(o, null, 2));
				data.push(o);
			},
			error(error: Error) {
				console.error('InfluxDB query error:', error);
				throw error;
			},
			complete() {
				console.log('Query completed. Total rows:', rowCount);
			},
		});

		// Try alternate query without station_id filter to see if there's ANY data
		const alternateQuery = `
			from(bucket: "${bucket}")
				|> range(start: -24h)
				|> limit(n: 10)
		`;

		console.log('\n=== Trying alternate query (first 10 rows) ===');
		const alternateData: any[] = [];

		await queryApi.queryRows(alternateQuery, {
			next(row: string[], tableMeta: any) {
				const o = tableMeta.toObject(row);
				console.log('Sample row:', JSON.stringify(o, null, 2));
				alternateData.push(o);
			},
			error(error: Error) {
				console.error('Alternate query error:', error);
			},
			complete() {
				console.log('Alternate query completed. Rows:', alternateData.length);
			},
		});

		return NextResponse.json({ 
			success: true,
			station_id,
			filtered_data_count: data.length,
			filtered_data: data,
			sample_data_count: alternateData.length,
			sample_data: alternateData,
			bucket,
			org,
			message: "Check server console for detailed logs"
		});

	} catch (error: any) {
		console.error('=== Error ===');
		console.error(error);
		return NextResponse.json(
			{ 
				error: error.message || 'Failed to query InfluxDB',
				details: error.toString()
			},
			{ status: 500 }
		);
	}
}