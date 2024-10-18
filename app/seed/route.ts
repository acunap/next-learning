import bcrypt from 'bcrypt';
import sqlite3 from "sqlite3";
import {invoices, customers, revenue, users} from '../lib/placeholder-data';

const db = new sqlite3.Database(
    "./collection.db",
    sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
    (err) => {
        if (err) {
            return console.error(err.message);
        }
        console.log("Connected to the SQlite database.");
    }
);

async function seedUsers() {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL
            );
    `)

    users.map(async (user) => {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        return db.run(`
            INSERT OR IGNORE INTO users (id, name, email, password)
            VALUES ('${user.id}', '${user.name}', '${user.email}', '${hashedPassword}');
        `);
    })
}

async function seedInvoices() {
    db.run(`
        CREATE TABLE IF NOT EXISTS invoices (
            id TEXT PRIMARY KEY,
            customer_id TEXT NOT NULL,
            amount INTEGER NOT NULL,
            status TEXT NOT NULL,
            date TEXT NOT NULL
            );
    `)

    invoices.map(
        (invoice) => db.run(`
            INSERT OR IGNORE INTO invoices (id, customer_id, amount, status, date)
            VALUES ('${invoice.amount + invoice.date + invoice.customer_id}','${invoice.customer_id}', '${invoice.amount}', '${invoice.status}', '${invoice.date}');
        `)
    );
}

async function seedCustomers() {
    db.run(`
        CREATE TABLE IF NOT EXISTS customers(
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            image_url TEXT NOT NULL
            );
    `);

    customers.map(
        (customer) => db.run(`
            INSERT OR IGNORE INTO customers (id, name, email, image_url)
            VALUES ('${customer.id}', '${customer.name}', '${customer.email}', '${customer.image_url}');
        `)
    )
}

async function seedRevenue() {
    db.run(`
        CREATE TABLE IF NOT EXISTS revenue (
            month TEXT NOT NULL UNIQUE,
            revenue INTEGER NOT NULL
            );
    `);

    revenue.map(
        (rev) => db.run(`
            INSERT OR IGNORE INTO revenue (month, revenue)
            VALUES ('${rev.month}', '${rev.revenue}');
        `),
    )
}

export async function GET() {
    await seedUsers();
    await seedCustomers();
    await seedInvoices();
    await seedRevenue();

    return Response.json({message: 'Database seeded successfully'});
}
