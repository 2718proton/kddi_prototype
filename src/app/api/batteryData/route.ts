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
        const fluxQuery = `
            import "experimental/iox"
            
            iox.sql(
              bucket: "${bucket}",
              query: "SELECT * FROM measurement WHERE battery_id = '${battery_id}' AND station_id = '${station_id}' AND time >= now() - interval '1 hour' ORDER BY time DESC LIMIT 1"
            )
        `;

        console.log('Query:', fluxQuery);

        const latest: Record<string, any> = {};

        await new Promise<void>((resolve, reject) => {
            queryApi.queryRows(fluxQuery, {
                next(row: string[], tableMeta: any) {
                    const o = tableMeta.toObject(row);
                    console.log('Found:', o);
                    
                    // Only include actual data fields (not metadata)
                    const dataFields = ['temperature', 'voltage', 'resistance', 'current'];
                    dataFields.forEach(field => {
                        if (o[field] !== null && o[field] !== undefined && o[field] !== '') {
                            latest[field] = o[field];
                        }
                    });
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