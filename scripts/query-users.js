require("dotenv/config")
const { Client } = require("pg")

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()
  const res = await client.query("SELECT id, email, role FROM public.users;")
  console.log(res.rows)
  await client.end()
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
