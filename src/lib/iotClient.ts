// lib/iotClient.ts
import mqtt from 'mqtt';
import fs from 'fs';
import path from 'path';

let client: mqtt.MqttClient | null = null;
let connectPromise: Promise<mqtt.MqttClient> | null = null;

function findCertFile(dir: string, pattern: string): string | null {
  try {
    const files = fs.readdirSync(dir);
    const found = files.find(f => f.includes(pattern));
    return found ? path.join(dir, found) : null;
  } catch {
    return null;
  }
}

export function getIotClient(): Promise<mqtt.MqttClient> {
  // If already connected, return immediately
  if (client && client.connected) {
    return Promise.resolve(client);
  }

  // If currently connecting, return the same promise
  if (connectPromise) {
    return connectPromise;
  }

  // Start new connection
  connectPromise = new Promise((resolve, reject) => {
    const endpoint = process.env.AWS_IOT_ENDPOINT;
    const certsDir = './certs';
    
    // Auto-detect certificate files
    const certPath = findCertFile(certsDir, 'certificate') || findCertFile(certsDir, '.crt');
    const keyPath = findCertFile(certsDir, 'private') || findCertFile(certsDir, '.key');
    const caPath = findCertFile(certsDir, 'AmazonRootCA');

    if (!endpoint) {
      return reject(new Error('AWS_IOT_ENDPOINT not configured'));
    }
    if (!certPath || !keyPath || !caPath) {
      return reject(new Error(`Certificate files not found in ${certsDir}`));
    }

    console.log('[IoT] Connecting to:', endpoint);
    console.log('[IoT] Using cert:', certPath);
    console.log('[IoT] Using key:', keyPath);
    console.log('[IoT] Using CA:', caPath);

    client = mqtt.connect(`mqtts://${endpoint}:8883`, {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
      ca: fs.readFileSync(caPath),
      clientId: `nextjs-backend-${Math.random().toString(16).slice(2, 8)}`,
      protocol: 'mqtts',
      reconnectPeriod: 1000,
    });

    // Wait for connection
    client.on('connect', () => {
      console.log('[IoT] Connected to AWS IoT!');
      connectPromise = null; // Reset for future reconnections
      resolve(client!);
    });

    client.on('error', (err) => {
      console.error('[IoT] Connection error:', err);
      connectPromise = null;
      reject(err);
    });

    client.on('offline', () => {
      console.log('[IoT] Client offline');
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      if (!client?.connected) {
        connectPromise = null;
        reject(new Error('Connection timeout'));
      }
    }, 10000);
  });

  return connectPromise;
}

export async function publishMessage(topic: string, message: object): Promise<void> {
  const client = await getIotClient(); // Wait for connection
  
  const payload = JSON.stringify(message);
  console.log(`[IoT] Publishing to ${topic}:`, payload);

  return new Promise((resolve, reject) => {
    client.publish(topic, payload, { qos: 1 }, (err) => {
      if (err) {
        console.error('[IoT] Publish error:', err);
        reject(err);
      } else {
        console.log('[IoT] Published successfully');
        resolve();
      }
    });
  });
}

export async function subscribeToTopic(topic: string): Promise<void> {
  const client = await getIotClient(); // Wait for connection
  
  return new Promise((resolve, reject) => {
    client.subscribe(topic, { qos: 1 }, (err) => {
      if (err) {
        console.error('[IoT] Subscribe error:', err);
        reject(err);
      } else {
        console.log('[IoT] Subscribed to:', topic);
        resolve();
      }
    });
  });
}

export async function onMessage(callback: (topic: string, message: any) => void) {
  const client = await getIotClient(); // Wait for connection
  
  client.on('message', (topic, payload) => {
    try {
      const message = JSON.parse(payload.toString());
      console.log(`[IoT] Received from ${topic}:`, message);
      callback(topic, message);
    } catch (err) {
      console.error('[IoT] Failed to parse message:', err);
    }
  });
}