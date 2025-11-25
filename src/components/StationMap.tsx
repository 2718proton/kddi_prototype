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
	const mapContainer = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!mapContainer.current) return;

		const map = new maplibre.Map({
			container: mapContainer.current,
			style: `https://api.maptiler.com/maps/jp-mierune-streets/style.json?key=${process.env.NEXT_PUBLIC_MAPTILER_KEY}`,
			center: [140.87, 38.26],
			zoom: 10,
		});

		stations.forEach(async (station) => {
			const res = await fetch(`/api/unitCount?station_id=${station.id}`);
			const { count } = await res.json();

			// ---- Marker Element using public/pin.jpg ----
			const markerEl = document.createElement("img");
			markerEl.src = "/pin.jpg";
			markerEl.style.width = "28px";
			markerEl.style.height = "28px";
			markerEl.style.objectFit = "contain";
			markerEl.style.cursor = "pointer";

			new maplibre.Marker({ element: markerEl, anchor: "bottom" }) // bottom anchor makes pin point sit at location
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

	return <div ref={mapContainer} className="w-full h-[80vh] rounded-lg border" />;
}
