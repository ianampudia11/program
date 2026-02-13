
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
    // Use config from env vars or defaults
    const connectionString = process.env.DATABASE_URL || "postgresql://postgres:root@localhost:5433/iawarrior";
    const targetEmail = process.env.ADMIN_EMAIL || "admin@app.com";
    const targetPassword = process.env.ADMIN_PASSWORD || "Admin@123456";

    console.log(`Connecting to database...`);
    console.log(`Target Admin: ${targetEmail}`);

    const client = new Client({
        connectionString,
        ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        const newHash = await hashPassword(targetPassword);

        // Check if user exists first
        const checkRes = await client.query("SELECT id FROM users WHERE email = $1", [targetEmail]);

        if (checkRes.rows.length === 0) {
            console.log("User not found. Cannot reset password for non-existent user.");
            // Optional: Could insert here if we wanted to be super helpful, 
            // but resetting is safer for now.
        } else {
            const result = await client.query(
                "UPDATE users SET password = $1 WHERE email = $2 RETURNING id, email;",
                [newHash, targetEmail]
            );
            console.log("✅ Password updated successfully for:", result.rows[0]);
        }

    } catch (error) {
        console.error("❌ Error updating password:", error);
    } finally {
        await client.end();
    }
}

main();
