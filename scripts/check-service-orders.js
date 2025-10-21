require("dotenv/config")
const { createClient } = require("@supabase/supabase-js")

async function run() {
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { data, error } = await client
    .from("service_orders")
    .select("id, order_number")
    .limit(1)

  console.log({ data, error })
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
