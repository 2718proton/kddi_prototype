// lib/influxdbClient.ts
import { InfluxDB } from '@influxdata/influxdb-client';

const influxUrl = process.env.NEXT_PUBLIC_INFLUXDB_URL || process.env.INFLUXDB_URL;
const influxToken = process.env.INFLUXDB_TOKEN;
const influxOrg = process.env.INFLUXDB_ORG;
const influxBucket = process.env.INFLUXDB_BUCKET;

if (!influxUrl || !influxToken || !influxOrg || !influxBucket) {
	throw new Error(
		"Missing InfluxDB environment variables. Please check your .env.local file."
	);
}

export const influxDB = new InfluxDB({ url: influxUrl, token: influxToken });
export const queryApi = influxDB.getQueryApi(influxOrg);
export const org = influxOrg;
export const bucket = influxBucket;