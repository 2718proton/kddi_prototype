// app/api/requestBattery/route.ts
import { NextRequest, NextResponse } from "next/server";
import { publishMessage } from "@/lib/iotClient";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { battery_id } = body;

        if (!battery_id) {
            return NextResponse.json(
                { error: "battery_id is required" },
                { status: 400 }
            );
        }

        console.log(`[API] Requesting data for battery ${battery_id}`);

        // Publish to "battery/request" topic with just battery_id
        await publishMessage("battery/request", {
            battery_id: parseInt(battery_id)
        });

        return NextResponse.json({ 
            success: true,
            message: `Data request sent for battery ${battery_id}`
        });

    } catch (error: any) {
        console.error('[API] Error requesting battery data:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to request battery data' },
            { status: 500 }
        );
    }
}