// app/station/[stationId]/page.tsx

type Props = {
    params: Promise<{ stationId: string }>;
};

export default async function StationPage({ params }: Props) {
    const { stationId } = await params;

    return (
        <div className="p-4">
            <h1 className="text-xl font-bold">Station ID: {stationId}</h1>
        </div>
    );
}
