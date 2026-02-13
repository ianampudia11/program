
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import pkg from "pg";
const { Client } = pkg;

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
}

async function main() {
    const connectionString = "postgresql://postgres:root@localhost:5433/iawarrior";
    console.log(`Connecting to database at ${connectionString}...`);

    const client = new Client({
        connectionString,
    });

    try {
        await client.connect();
        const password = "Admin@123456";
        const newHash = await hashPassword(password);
        console.log(`Generated hash length: ${newHash.length}`);

        // Direct raw query to update password
        const result = await client.query(
            "UPDATE users SET password = $1 WHERE email = 'admin@app.com' RETURNING id, email, length(password);",
            [newHash]
        );

        console.log("Update result:", result.rows[0]);
    } catch (error) {
        console.error("Error updating password:", error);
    } finally {
        await client.end();
    }
}

main();
