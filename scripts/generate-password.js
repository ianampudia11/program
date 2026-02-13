
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64));
    return `${buf.toString("hex")}.${salt}`;
}

const password = process.argv[2] || "Admin@123456";
console.log(`Generating hash for password: ${password}`);


import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

hashPassword(password).then(hash => {
    console.log(`HASH LENGTH: ${hash.length}`);
    fs.writeFileSync(path.resolve(__dirname, '../admin_password_hash.txt'), hash.trim());
    console.log('Hash written to admin_password_hash.txt');
});
