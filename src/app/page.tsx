import { supabase } from "@/lib/supabaseClient";
import StationMap from "@/components/StationMap";

export default async function HomePage() {
	const { data: stations, error } = await supabase.from("stations").select("*");
	console.log('Stations:', stations);
	if (error) throw new Error(error.message);

	const formatted = stations!.map((s) => ({
		id: s.id,
		name: s.name,
		location: { lat: s.lat, lon: s.lon },
	}));

	return (
		<main className="p-4">
			<h1 className="text-2xl font-bold mb-4">Station Overview</h1>
			<StationMap stations={formatted} />
		</main>
	);
}