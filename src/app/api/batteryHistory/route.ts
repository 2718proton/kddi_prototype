// app/api/batteryHistory/route.ts
import { NextRequest, NextResponse } from "next/server";
import { queryApi, bucket } from "@/lib/influxdbClient";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const battery_id = searchParams.get("battery_id");
    const station_id = searchParams.get("station_id");
    const range = searchParams.get("range") || "1h";  // default 1 hour
    const field = searchParams.get("field") || "temperature";  // which field to get

    if (!battery_id) {
        return NextResponse.json(
            { error: "battery_id is required" },
            { status: 400 }
        );
    }

    try {
        let filters = `
            |> filter(fn: (r) => r["_measurement"] == "measurement")
            |> filter(fn: (r) => r["battery_id"] == "${battery_id}")
            |> filter(fn: (r) => r["_field"] == "${field}")
        `;
        
        if (station_id) {
            filters += `|> filter(fn: (r) => r["station_id"] == "${station_id}")`;
        }

        // NO |> last() - we want ALL data points for the graph
        const fluxQuery = `
            from(bucket: "${bucket}")
                |> range(start: -${range})
                ${filters}
                |> sort(columns: ["_time"])
        `;

        console.log('History Query:', fluxQuery);

        const dataPoints: Array<{ time: string; value: number }> = [];

        // Wrap in promise to ensure we wait for completion
        await new Promise<void>((resolve, reject) => {
            queryApi.queryRows(fluxQuery, {
                next(row: string[], tableMeta: any) {
                    const o = tableMeta.toObject(row);
                    console.log('Found point:', o._time, '=', o._value);
                    dataPoints.push({
                        time: o._time,
                        value: o._value
                    });
                },
                error(error: Error) {
                    console.error('InfluxDB error:', error);
                    reject(error);
                },
                complete() {
                    console.log('Data points retrieved:', dataPoints.length);
                    resolve();
                },
            });
        });

        return NextResponse.json({ 
            battery_id,
            field,
            range,
            data: dataPoints,
            count: dataPoints.length
        });

    } catch (error: any) {
        console.error('Error:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}