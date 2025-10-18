import { createBrowserClient } from "@supabase/ssr"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

type MockQuery = {
  select: (columns?: string) => MockQuery
  insert: (values: any) => MockQuery
  update: (values: any) => MockQuery
  delete: () => MockQuery
  eq: (column: string, value: any) => MockQuery
  single: () => MockQuery
  order: (column: string, options?: any) => MockQuery
  data: any
  error: any
}

const createMockClient = () => {
  console.warn("Supabase environment variables not configured. Using mock client.")

  const mockQuery: MockQuery = {
    select: () => ({ ...mockQuery, data: [], error: null }),
    insert: () => ({ ...mockQuery, data: null, error: { message: "Supabase not configured" } }),
    update: () => ({ ...mockQuery, data: null, error: { message: "Supabase not configured" } }),
    delete: () => ({ ...mockQuery, error: { message: "Supabase not configured" }, data: null }),
    eq: () => mockQuery,
    single: () => mockQuery,
    order: () => mockQuery,
    data: [],
    error: null,
  }

  return {
    from: () => mockQuery,
    channel: () => ({
      on: () => ({ subscribe: () => {} }),
    }),
    removeChannel: () => {},
  } as const
}

export function createClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return createMockClient()
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

// Export singleton instance for backward compatibility
export const supabase = createClient()
