import { createClient } from '@supabase/supabase-js'
import { useSession } from '@clerk/nextjs' // or '@clerk/clerk-react' depending on your framework

// Your Supabase project URL and public anon key
const supabaseUrl = 'https://dqckopgetuodqhgnhhxw.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxY2tvcGdldHVvZHFoZ25oaHh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExOTM5NzYsImV4cCI6MjA2Njc2OTk3Nn0.0PJ5KWUbjI4dupIxScguEf0CrYKtN-uVpVTRxHNi54w'


function MyComponent() {
  const { session } = useSession()

  // Create a custom Supabase client that injects the Clerk Supabase token
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      fetch: async (url, options = {}) => {
        const clerkToken = await session?.getToken({
          // Pass the name of the JWT template you created in the Clerk Dashboard.
          // For this tutorial, you might have named it 'supabase'
          template: 'supabase', // This is important if you use custom JWT templates in Clerk
        })

        const headers = new Headers(options?.headers)
        if (clerkToken) {
          headers.set('Authorization', `Bearer ${clerkToken}`)
        }

        return fetch(url, {
          ...options,
          headers,
        })
      },
    },
  })

  // Now you can use this `supabase` client for your database operations
  async function createPlaylist(playlistData) {
    // You don't need supabase.auth.getUser() here, as the token is handled by the fetch override
    const { data, error } = await supabase
      .from('playlists')
      .insert([playlistData])

    if (error) {
      console.error('Error creating playlist:', error)
    } else {
      console.log('Playlist created:', data)
    }
  }

  // ... rest of your component logic
}
