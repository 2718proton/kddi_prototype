// app/api/requestAllBatteries/route.ts
import { NextRequest, NextResponse } from "next/server";
import { publishMessage } from "@/lib/iotClient";
import { supabase } from "@/lib/supabaseClient";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { station_id } = body;

        if (!station_id) {
            return NextResponse.json(
                { error: "station_id is required" },
                { status: 400 }
            );
        }

        // Get all batteries for this station
        const { data: batteries, error } = await supabase
            .from("battery_units")
            .select("id")
            .eq("station_id", station_id)
            .order("id", { ascending: true });

        if (error) {
            throw new Error(error.message);
        }

        console.log(`[API] Requesting data for ${batteries?.length || 0} batteries`);

        // Send request for each battery
        const requests = (batteries || []).map(battery => 
            publishMessage("battery/request", {
                battery_id: battery.id
            })
        );

        await Promise.all(requests);

        return NextResponse.json({ 
            success: true,
            count: batteries?.length || 0,
            message: `Data request sent for ${batteries?.length || 0} batteries`
        });

    } catch (error: any) {
        console.error('[API] Error requesting all batteries:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to request batteries data' },
            { status: 500 }
        );
    }
}