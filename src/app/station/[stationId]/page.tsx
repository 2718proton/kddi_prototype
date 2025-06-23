// app/station/[stationId]/page.tsx
type Props = { params: { stationId: string } };
export default function StationPage({ params }: Props) {
    return (
        <div className="p-4">
            <h1 className="text-xl font-bold">Station ID: {params.stationId}</h1>
            {/* Fetch station and battery data from InfluxDB here */}
        </div>
    );
}
