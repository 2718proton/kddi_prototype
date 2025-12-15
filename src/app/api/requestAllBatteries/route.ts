// app/api/requestAllBatteries/route.ts
import { NextRequest, NextResponse } from "next/server";
import { publishMessage } from "@/lib/iotClient";
import { supabase } from "@/lib/supabaseClient";

// Helper function to wait
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

        console.log(`[API] Requesting data for ${batteries?.length || 0} batteries with 1s delay`);

        // Send requests sequentially with 1 second delay between each
        for (const battery of batteries || []) {
            console.log(`[API] Requesting battery ${battery.id}`);
            await publishMessage("battery/request", {
                battery_id: battery.id
            });
            
            // Wait 1 second before next request (except for the last one)
            if (battery !== batteries[batteries.length - 1]) {
                await wait(1000);
            }
        }

        return NextResponse.json({ 
            success: true,
            count: batteries?.length || 0,
            message: `Data request sent for ${batteries?.length || 0} batteries (1s delay between each)`
        });

    } catch (error: any) {
        console.error('[API] Error requesting all batteries:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to request batteries data' },
            { status: 500 }
        );
    }
}