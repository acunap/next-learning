import { promisify } from 'util';
import {
    CustomerField,
    Invoice,
    InvoicesTable, LatestInvoice,
    Revenue,
} from './definitions';
import {formatCurrency} from './utils';
import sqlite3 from "sqlite3"

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

const dbAll = promisify(db.all).bind(db);
const dbGet = promisify(db.get).bind(db);

export const fetchRevenue = async () =>
    await dbAll(`
        select * from revenue
    `) as Revenue[];

export const fetchLatestInvoices = async () =>
    await dbAll(`
        select invoices.amount, customers.name, customers.image_url, customers.email, invoices.id
          from invoices
          join customers on invoices.customer_id = customers.id
          order by invoices.date desc
          limit 5
    `) as LatestInvoice[]

export const fetchCardData = async () => {
    const invoiceCount = await dbGet(`SELECT COUNT(*) as count FROM invoices`) as { count: number };
    const customerCount = await dbGet(`SELECT COUNT(*) as count FROM customers`) as { count: number };
    const totalPaid = await dbGet(`SELECT SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as sum FROM invoices`) as { sum: number };
    const totalPending = await dbGet(`SELECT SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as sum FROM invoices`) as { sum: number };

    return {
        numberOfInvoices: invoiceCount.count,
        numberOfCustomers: customerCount.count,
        totalPaidInvoices: formatCurrency(totalPaid.sum),
        totalPendingInvoices: formatCurrency(totalPending.sum),
    };
}

const ITEMS_PER_PAGE = 6;

export async function fetchFilteredInvoices(
    query: string,
    currentPage: number,
) {
    const offset = (currentPage - 1) * ITEMS_PER_PAGE;

    return await dbAll(`
        SELECT
            invoices.id,
            invoices.amount,
            invoices.date,
            invoices.status,
            customers.name,
            customers.email,
            customers.image_url
          FROM invoices
          JOIN customers ON invoices.customer_id = customers.id
          WHERE
            customers.name LIKE '%${query}%' OR
            customers.email LIKE '%${query}%' OR
            invoices.amount LIKE '%${query}%' OR
            invoices.date LIKE '%${query}%' OR
            invoices.status LIKE '%${query}%'
          ORDER BY invoices.date DESC
          LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
    `) as InvoicesTable[]
}

export const fetchInvoicesPages = async (query: string) => {
    const totalInvoices = await dbAll(`
        SELECT COUNT(*) as count
        FROM invoices
        JOIN customers ON invoices.customer_id = customers.id
        WHERE
          customers.name LIKE '%${query}' OR
          customers.email LIKE '%${query}%' OR
          invoices.amount LIKE '%${query}%' OR
          invoices.date LIKE '%${query}%' OR
          invoices.status LIKE '%${query}%'
    `) as { count: number }

    return Math.ceil(totalInvoices.count / ITEMS_PER_PAGE);
}

export const fetchInvoiceById = async (id: string) => {
    const invoice = await dbGet(`
        select
            invoices.id,
            invoices.customer_id,
            invoices.amount,
            invoices.status
          from invoices
          where invoices.id = '${id}';
    `) as Invoice

    return {
        ...invoice,
        amount: invoice.amount / 100,
    };
}

export const fetchCustomers = async () =>
    await dbAll(`
        select *
        from customers
    `) as CustomerField[]

// export async function fetchFilteredCustomers(query: string) {
//   try {
//     const data = await sql<CustomersTableType>`
// 		SELECT
// 		  customers.id,
// 		  customers.name,
// 		  customers.email,
// 		  customers.image_url,
// 		  COUNT(invoices.id) AS total_invoices,
// 		  SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
// 		  SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
// 		FROM customers
// 		LEFT JOIN invoices ON customers.id = invoices.customer_id
// 		WHERE
// 		  customers.name ILIKE ${`%${query}%`} OR
//         customers.email ILIKE ${`%${query}%`}
// 		GROUP BY customers.id, customers.name, customers.email, customers.image_url
// 		ORDER BY customers.name ASC
// 	  `;
//
//     const customers = data.rows.map((customer) => ({
//       ...customer,
//       total_pending: formatCurrency(customer.total_pending),
//       total_paid: formatCurrency(customer.total_paid),
//     }));
//
//     return customers;
//   } catch (err) {
//     console.error('Database Error:', err);
//     throw new Error('Failed to fetch customer table.');
//   }
// }
