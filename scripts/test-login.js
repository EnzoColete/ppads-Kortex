require("dotenv/config")
const { createClient } = require("@supabase/supabase-js")

console.log("email env:", process.env.DEFAULT_ADMIN_EMAIL)
console.log("password env:", process.env.DEFAULT_ADMIN_PASSWORD)

async function run() {
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const { data, error } = await client.auth.signInWithPassword({
    email: process.env.DEFAULT_ADMIN_EMAIL,
    password: process.env.DEFAULT_ADMIN_PASSWORD,
  })
  console.log({ data, error })
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
