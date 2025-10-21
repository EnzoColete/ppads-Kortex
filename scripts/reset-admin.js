require("dotenv/config")
const { createClient } = require("@supabase/supabase-js")

async function run() {
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const email = process.env.DEFAULT_ADMIN_EMAIL
  const password = process.env.DEFAULT_ADMIN_PASSWORD

  const { data: list, error: listError } = await client.auth.admin.listUsers()
  if (listError) throw listError

  const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  if (existing) {
    console.log("Deleting existing admin user", existing.id)
    const { error: deleteError } = await client.auth.admin.deleteUser(existing.id)
    if (deleteError) throw deleteError
  }

  const { data, error } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error) throw error
  console.log("Created user", data.user?.id)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
