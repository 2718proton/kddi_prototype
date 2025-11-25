// app/station/[stationId]/page.tsx
import { supabase } from "@/lib/supabaseClient";
import BatteryGraph from "@/components/BatteryGraph";

type Props = {
	params: Promise<{ stationId: string }>;
};

async function getStationInfo(stationId: string) {
	const { data, error } = await supabase
		.from("stations")
		.select("*")
		.eq("id", stationId)
		.single();

	if (error) throw new Error(error.message);
	return data;
}

async function getBatteryUnits(stationId: string) {
	const { data, error } = await supabase
		.from("battery_units")
		.select("*")
		.eq("station_id", stationId)
		.order("id", { ascending: true });

	if (error) throw new Error(error.message);
	return data || [];
}

async function getBatteryData(stationId: string, batteryId: string) {
	try {
		const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
		const res = await fetch(
			`${baseUrl}/api/batteryData?station_id=${stationId}&battery_id=${batteryId}`,
			{ cache: 'no-store' }
		);
		if (!res.ok) {
			console.error('Battery data fetch failed:', res.status);
			return null;
		}
		const json = await res.json();
		console.log(`Battery ${batteryId} data:`, json);
		return json;
	} catch (error) {
		console.error('Error fetching battery data:', error);
		return null;
	}
}

export default async function StationPage({ params }: Props) {
	const { stationId } = await params;
	
	const station = await getStationInfo(stationId);
	const batteries = await getBatteryUnits(stationId);
	
	// Loop through batteries and get their data (using id as battery_id)
	const batteriesData = await Promise.all(
		batteries.map(b => getBatteryData(stationId, String(b.id)))
	);

	console.log('Batteries:', batteries);
	console.log('Batteries data:', batteriesData);

	return (
		<div className="p-4">
			<h1 className="text-2xl font-bold mb-4">{station.name}</h1>
			<p className="mb-6">Total Batteries: {batteries.length}</p>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				{batteries.map((battery, i) => {
					const data = batteriesData[i]?.data || {};
					
					console.log(`Rendering battery ${battery.id}, data:`, data);
					
					return (
						<div key={battery.id} className="bg-white p-4 rounded shadow">
							<h3 className="font-bold mb-2">{battery.name}</h3>
							<p className="text-xs text-gray-500 mb-2">ID: {battery.id}</p>
							{Object.keys(data).length > 0 ? (
								<div>
									{Object.entries(data).map(([field, value]) => (
										<div key={field} className="flex justify-between py-1">
											<span className="text-sm">{field}:</span>
											<span className="font-semibold">
												{typeof value === 'number' ? value.toFixed(2) : String(value)}
											</span>
										</div>
									))}
								</div>
							) : (
								<div>
									<div className="flex justify-between py-1">
										<span className="text-sm">temperature:</span>
										<span className="font-semibold text-gray-400">NaN</span>
									</div>
									<div className="flex justify-between py-1">
										<span className="text-sm">voltage:</span>
										<span className="font-semibold text-gray-400">NaN</span>
									</div>
									<div className="flex justify-between py-1">
										<span className="text-sm">resistance:</span>
										<span className="font-semibold text-gray-400">NaN</span>
									</div>
								</div>
							)}
							
							{/* Add Graph */}
							<BatteryGraph 
								stationId={stationId}
								batteryId={String(battery.id)}
								batteryName={battery.name}
							/>
						</div>
					);
				})}
			</div>

			<a href="/" className="mt-6 inline-block px-4 py-2 bg-gray-200 rounded">← Back</a>
		</div>
	);
}