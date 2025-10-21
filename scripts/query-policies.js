require("dotenv/config")
const { Client } = require("pg")

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()
  const res = await client.query("SELECT policyname, permissive, roles, cmd FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users';")
  console.log(res.rows)
  await client.end()
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
