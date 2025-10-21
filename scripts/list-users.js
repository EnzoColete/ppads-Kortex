require("dotenv/config")
const { createClient } = require("@supabase/supabase-js")

async function run() {
  const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { data, error } = await adminClient.auth.admin.listUsers()
  if (error) {
    console.error(error)
  } else {
    console.log(data.users.map((u) => ({ email: u.email, id: u.id })))
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
