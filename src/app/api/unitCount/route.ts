// app/api/unitCount/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const station_id = searchParams.get("station_id");

    console.log('station_id:', station_id)

    if (!station_id) {
        return NextResponse.json(
            { error: "station_id is required" },
            { status: 400 }
        );
    }

    const { count, error } = await supabase
        .from("battery_units")
        .select("*", { count: "exact", head: true })
        .eq("station_id", station_id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ count: count || 0 });
}
