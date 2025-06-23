// components/StationMap.tsx
"use client";

import { useEffect, useRef } from "react";
import maplibre from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

type Station = {
	id: string;
	name: string;
	location: { lat: number; lon: number };
};

export default function StationMap({ stations }: { stations: Station[] }) {

	useEffect(() => {
  		console.log('Stations:', stations); // Debug
	}, [stations]);

	const mapContainer = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!mapContainer.current) return;

		const map = new maplibre.Map({
			container: mapContainer.current,
			style: "https://demotiles.maplibre.org/style.json",
			center: [140.87, 38.26], // Sendai
			zoom: 10,
		});

		stations.forEach(async (station) => {
			const res = await fetch(`/api/unitCount?station_id=${station.id}`);
			const { count } = await res.json();
			
			const markerEl = document.createElement("div");
			markerEl.className = "bg-blue-600 w-4 h-4 rounded-full border border-white cursor-pointer";

			new maplibre.Marker({ element: markerEl })
				.setLngLat([station.location.lon, station.location.lat])
				.setPopup(
					new maplibre.Popup({ offset: 25 }).setHTML(`
						<h3 class="font-bold">${station.name}</h3>
						<p>Battery units: ${count}</p>
						<a href="/station/${station.id}" class="text-blue-500 underline">See more</a>
					`)
			)
			.addTo(map);
		});

		return () => map.remove();
	}, [stations]);

	useEffect(() => {
		stations.forEach(async (station) => {
			const res = await fetch(`/api/unitCount?station_id=${station.id}`);
			const { count } = await res.json();
			const el = document.getElementById(`units-${station.id}`);
			if (el) el.innerText = String(count);
		});
	}, [stations]);

	return <div ref={mapContainer} className="w-full h-[80vh] rounded-lg border" />;
}
