"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

type BatteryGraphProps = {
	stationId: string;
	batteryId: string;
	batteryName: string;
};

type DataPoint = {
	time: string;
	value: number;
};

export default function BatteryGraph({ stationId, batteryId, batteryName }: BatteryGraphProps) {
	const [field, setField] = useState("temperature");
	const [range, setRange] = useState("1h");
	const [data, setData] = useState<DataPoint[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		async function fetchData() {
			setLoading(true);
			try {
				const res = await fetch(
					`/api/batteryHistory?station_id=${stationId}&battery_id=${batteryId}&field=${field}&range=${range}`
				);
				const json = await res.json();
				setData(json.data || []);
			} catch (error) {
				console.error("Error fetching history:", error);
				setData([]);
			}
			setLoading(false);
		}
		fetchData();
	}, [stationId, batteryId, field, range]);

	// Format time for display based on range
	const formatTime = (timeStr: string) => {
		const date = new Date(timeStr);
		if (range === "1h" || range === "6h") {
			// For short ranges, show time only
			return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
		} else if (range === "24h") {
			// For 24h, show hour and date
			return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
		} else {
			// For longer ranges, show date
			return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit' });
		}
	};

	const formattedData = data.map(d => ({
		...d,
		timeFormatted: formatTime(d.time)
	}));

	return (
		<div className="mt-4 p-4 bg-gray-50 rounded">
			{/* Controls */}
			<div className="flex gap-4 mb-4">
				<div>
					<label className="text-xs text-gray-600 block mb-1">Field</label>
					<select
						value={field}
						onChange={(e) => setField(e.target.value)}
						className="px-3 py-1 border rounded text-sm"
					>
						<option value="temperature">Temperature</option>
						<option value="voltage">Voltage</option>
						<option value="resistance">Resistance</option>
					</select>
				</div>
				<div>
					<label className="text-xs text-gray-600 block mb-1">Time Range</label>
					<select
						value={range}
						onChange={(e) => setRange(e.target.value)}
						className="px-3 py-1 border rounded text-sm"
					>
						<option value="1h">Last Hour</option>
						<option value="6h">Last 6 Hours</option>
						<option value="24h">Last 24 Hours</option>
						<option value="7d">Last 7 Days</option>
					</select>
				</div>
			</div>

			{/* Graph */}
			{loading ? (
				<div className="h-64 flex items-center justify-center">
					<p className="text-gray-500">Loading...</p>
				</div>
			) : data.length > 0 ? (
				<ResponsiveContainer width="100%" height={250}>
					<LineChart data={formattedData} margin={{ right: 30 }}>
						<CartesianGrid strokeDasharray="3 3" />
						<XAxis 
							dataKey="timeFormatted" 
							tick={{ fontSize: 10 }}
							angle={-45}
							textAnchor="end"
							height={60}
						/>
						<YAxis tick={{ fontSize: 12 }} domain={['auto', 'auto']} />
						<Tooltip 
							labelFormatter={(label) => `Time: ${label}`}
							formatter={(value: any) => [typeof value === 'number' ? value.toFixed(2) : value, field]}
						/>
						<Legend />
						<Line 
							type="monotone" 
							dataKey="value" 
							stroke="#2563eb" 
							strokeWidth={2}
							dot={{ r: 3, fill: "#2563eb" }}
							activeDot={{ r: 5 }}
							name={field}
						/>
					</LineChart>
				</ResponsiveContainer>
			) : (
				<div className="h-64 flex items-center justify-center">
					<p className="text-gray-500">No data available</p>
				</div>
			)}
			
			<p className="text-xs text-gray-500 mt-2">
				Showing {data.length} data points
				{data.length > 0 && ` • Latest: ${formatTime(data[data.length - 1].time)}`}
			</p>
		</div>
	);
}