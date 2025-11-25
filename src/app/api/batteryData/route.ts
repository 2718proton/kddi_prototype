// app/api/batteryData/route.ts
import { NextRequest, NextResponse } from "next/server";
import { queryApi, bucket } from "@/lib/influxdbClient";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const battery_id = searchParams.get("battery_id");
    const station_id = searchParams.get("station_id");

    if (!battery_id) {
        return NextResponse.json(
            { error: "battery_id is required" },
            { status: 400 }
        );
    }

    try {
        // Build query with station_id if provided
        let filters = `
            |> filter(fn: (r) => r["_measurement"] == "measurement")
            |> filter(fn: (r) => r["battery_id"] == "${battery_id}")
        `;
        
        if (station_id) {
            filters += `|> filter(fn: (r) => r["station_id"] == "${station_id}")`;
        }

        const fluxQuery = `
            from(bucket: "${bucket}")
                |> range(start: -24h)
                ${filters}
                |> last()
        `;

        console.log('Query:', fluxQuery);

        const latest: Record<string, any> = {};

        // Wrap in promise to ensure we wait for completion
        await new Promise<void>((resolve, reject) => {
            queryApi.queryRows(fluxQuery, {
                next(row: string[], tableMeta: any) {
                    const o = tableMeta.toObject(row);
                    console.log('Found:', o._field, '=', o._value);
                    latest[o._field] = o._value;
                },
                error(error: Error) {
                    console.error('InfluxDB error:', error);
                    reject(error);
                },
                complete() {
                    console.log('Total fields found:', Object.keys(latest).length);
                    resolve();
                },
            });
        });

        return NextResponse.json({ battery_id, data: latest });

    } catch (error: any) {
        console.error('Error:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}