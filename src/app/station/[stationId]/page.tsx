// app/station/[stationId]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import BatteryGraph from "@/components/BatteryGraph";

type Props = {
	params: Promise<{ stationId: string }>;
};

export default function StationPage({ params }: Props) {
	const [stationId, setStationId] = useState("");
	const [station, setStation] = useState<any>(null);
	const [batteries, setBatteries] = useState<any[]>([]);
	const [batteriesData, setBatteriesData] = useState<any[]>([]);
	const [requestingAll, setRequestingAll] = useState(false);
	const [requestingIds, setRequestingIds] = useState<Set<number>>(new Set());
	const [refreshKeys, setRefreshKeys] = useState<Record<number, number>>({});

	useEffect(() => {
		params.then(p => {
			setStationId(p.stationId);
			loadData(p.stationId);
		});
	}, []);

	async function loadData(stationId: string) {
		// Get station info
		const { data: stationData } = await supabase
			.from("stations")
			.select("*")
			.eq("id", stationId)
			.single();
		setStation(stationData);

		// Get batteries
		const { data: batteriesData } = await supabase
			.from("battery_units")
			.select("*")
			.eq("station_id", stationId)
			.order("id", { ascending: true });
		setBatteries(batteriesData || []);

		// Get battery data
		const data = await Promise.all(
			(batteriesData || []).map(async (b: any) => {
				const res = await fetch(`/api/batteryData?station_id=${stationId}&battery_id=${b.id}`);
				if (res.ok) return await res.json();
				return null;
			})
		);
		setBatteriesData(data);
	}

	async function reloadSingleBattery(batteryId: number, index: number) {
		const res = await fetch(`/api/batteryData?station_id=${stationId}&battery_id=${batteryId}`);
		if (res.ok) {
			const data = await res.json();
			setBatteriesData(prev => {
				const updated = [...prev];
				updated[index] = data;
				return updated;
			});
			// Update refresh key for this battery's graph
			setRefreshKeys(prev => ({
				...prev,
				[batteryId]: (prev[batteryId] || 0) + 1
			}));
		}
	}

	async function requestBattery(batteryId: number, index: number) {
		setRequestingIds(prev => new Set(prev).add(batteryId));
		try {
			await fetch("/api/requestBattery", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ battery_id: batteryId }),
			});
			
			// Wait 3 seconds for device to respond, then reload this battery only
			setTimeout(() => {
				reloadSingleBattery(batteryId, index);
			}, 3000);
		} catch (error) {
			console.error("Request failed:", error);
		}
		setTimeout(() => {
			setRequestingIds(prev => {
				const next = new Set(prev);
				next.delete(batteryId);
				return next;
			});
		}, 2000);
	}

	async function requestAll() {
		setRequestingAll(true);
		try {
			await fetch("/api/requestAllBatteries", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ station_id: stationId }),
			});
			
			// Wait 3 seconds for devices to respond, then reload ALL batteries
			setTimeout(async () => {
				const data = await Promise.all(
					batteries.map(async (b: any) => {
						const res = await fetch(`/api/batteryData?station_id=${stationId}&battery_id=${b.id}`);
						if (res.ok) return await res.json();
						return null;
					})
				);
				setBatteriesData(data);
				
				// Update refresh keys for all graphs
				const newKeys: Record<number, number> = {};
				batteries.forEach(b => {
					newKeys[b.id] = (refreshKeys[b.id] || 0) + 1;
				});
				setRefreshKeys(newKeys);
			}, 3000);
		} catch (error) {
			console.error("Request all failed:", error);
		}
		setTimeout(() => setRequestingAll(false), 2000);
	}

	if (!station) return <div className="p-4">Loading...</div>;

	return (
		<div className="p-4 max-w-7xl mx-auto">
			{/* Header */}
			<div className="mb-6 flex justify-between items-start">
				<div>
					<h1 className="text-3xl font-bold mb-2">{station.name}</h1>
					<p className="text-gray-600">Station ID: {stationId}</p>
					<p className="text-sm text-gray-500">
						Location: {station.lat.toFixed(4)}, {station.lon.toFixed(4)}
					</p>
					<p className="text-sm text-gray-600 mt-2">
						Total Batteries: {batteries.length}
					</p>
				</div>
				<button
					onClick={requestAll}
					disabled={requestingAll}
					className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
				>
					{requestingAll ? "Requesting..." : "Request All"}
				</button>
			</div>

			{/* Batteries Grid */}
			{batteries.length > 0 ? (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{batteries.map((battery, i) => {
						const data = batteriesData[i]?.data || {};
						const isRequesting = requestingIds.has(battery.id);

						return (
							<div key={battery.id} className="bg-white p-4 rounded shadow">
								{/* Header */}
								<div className="flex justify-between items-start mb-2">
									<div>
										<h3 className="font-bold">{battery.name}</h3>
										<p className="text-xs text-gray-500">ID: {battery.id}</p>
									</div>
									<button
										onClick={() => requestBattery(battery.id, i)}
										disabled={isRequesting}
										className="px-3 py-1 text-sm bg-blue-500 text-white rounded font-medium hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
									>
										{isRequesting ? "..." : "Request"}
									</button>
								</div>

								{/* Data - Always show all 3 fields */}
								<div>
									<div className="flex justify-between py-1">
										<span className="text-sm">temperature:</span>
										<span className={`font-semibold ${data.temperature !== undefined && data.temperature !== null ? '' : 'text-gray-400'}`}>
											{data.temperature !== undefined && data.temperature !== null
												? data.temperature.toFixed(2)
												: 'N/A'
											}
										</span>
									</div>
									<div className="flex justify-between py-1">
										<span className="text-sm">voltage:</span>
										<span className={`font-semibold ${data.voltage !== undefined && data.voltage !== null ? '' : 'text-gray-400'}`}>
											{data.voltage !== undefined && data.voltage !== null
												? data.voltage.toFixed(2)
												: 'N/A'
											}
										</span>
									</div>
									<div className="flex justify-between py-1">
										<span className="text-sm">resistance:</span>
										<span className={`font-semibold ${data.resistance !== undefined && data.resistance !== null ? '' : 'text-gray-400'}`}>
											{data.resistance !== undefined && data.resistance !== null
												? data.resistance.toFixed(2)
												: 'N/A'
											}
										</span>
									</div>
								</div>

								{/* Graph */}
								<BatteryGraph
									key={`${battery.id}-${refreshKeys[battery.id] || 0}`}
									stationId={stationId}
									batteryId={String(battery.id)}
									batteryName={battery.name}
								/>
							</div>
						);
					})}
				</div>
			) : (
				<div className="bg-white rounded-lg shadow p-6 text-center">
					<p className="text-gray-500">No batteries found</p>
				</div>
			)}

			{/* Back Button */}
			<div className="mt-6">
				<a href="/" className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition">
					← Back to Map
				</a>
			</div>
		</div>
	);
}