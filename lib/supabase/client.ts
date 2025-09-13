import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

// Create a mock client when environment variables are not available
const createSupabaseClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Supabase environment variables not configured. Using mock client.")

    // Return a mock client that prevents errors with proper method chaining
    const mockQuery = {
      select: (columns?: string) => ({
        ...mockQuery,
        data: [],
        error: null,
      }),
      insert: (values: any) => ({
        ...mockQuery,
        data: null,
        error: { message: "Supabase not configured" },
      }),
      update: (values: any) => ({
        ...mockQuery,
        data: null,
        error: { message: "Supabase not configured" },
      }),
      delete: () => ({
        ...mockQuery,
        error: { message: "Supabase not configured" },
      }),
      eq: (column: string, value: any) => mockQuery,
      single: () => mockQuery,
      order: (column: string, options?: any) => mockQuery,
      data: [],
      error: null,
    }

    return {
      from: () => mockQuery,
      channel: () => ({
        on: () => ({ subscribe: () => {} }),
      }),
      removeChannel: () => {},
    }
  }

  return createClient(supabaseUrl, supabaseAnonKey)
}

export const supabase = createSupabaseClient() as any
