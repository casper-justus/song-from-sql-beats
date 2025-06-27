// functions/api/sign-r2.ts
import { AwsClient } from 'aws4fetch';
import { createRemoteJWKSet, jwtVerify } from 'jose';

// Define the environment variables expected by the Pages Function
interface Env {
  R2_ACCOUNT_ID: string; // Your Cloudflare Account ID
  R2_ACCESS_KEY_ID: string; // From your R2 API Token (set as secret)
  R2_SECRET_ACCESS_KEY: string; // From your R2 API Token (set as secret)
  R2_BUCKET_NAME: string; // The name of your R2 bucket (set as secret, or defined in wrangler.toml bucket binding)
  SUPABASE_PROJECT_ID: string; // Your Supabase Project ID (e.g., 'xyzabcd123')
}

// Function to verify Supabase JWT
// This JWKS fetching and caching is handled efficiently by jose library.
async function verifySupabaseJWT(token: string, supabaseProjectId: string) {
  if (!supabaseProjectId) {
    throw new Error('Supabase Project ID is not configured.');
  }
  const SUPABASE_JWKS_URL = `https://${supabaseProjectId}.supabase.co/auth/v1/keys`;
  const JWKS = createRemoteJWKSet(new URL(SUPABASE_JWKS_URL));

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      audience: 'authenticated', // Standard Supabase audience
      issuer: `https://${supabaseProjectId}.supabase.co/auth/v1`, // Standard Supabase issuer
    });
    // console.log('JWT Payload:', payload); // For debugging
    return payload; // Contains user ID, email, etc.
  } catch (error) {
    console.error('JWT Verification Error:', error);
    return null;
  }
}

// Handles GET requests to /api/sign-r2
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context; // 'env' contains your configured environment variables and R2 bindings
  const url = new URL(request.url);
  const fileKey = url.searchParams.get('key'); // The path to the file in R2 (e.g., 'songs/track1.mp3')

  if (!fileKey) {
    return Response.json({ error: 'Missing file "key" parameter' }, { status: 400 });
  }

  // --- 1. Authenticate Request (Verify Supabase JWT from Edge Function) ---
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return Response.json({ error: 'Unauthorized: Missing or invalid Authorization header' }, { status: 401 });
  }

  const token = authHeader.substring(7);
  const jwtPayload = await verifySupabaseJWT(token, env.SUPABASE_PROJECT_ID);

  if (!jwtPayload) {
    return Response.json({ error: 'Unauthorized: Invalid or expired JWT' }, { status: 403 });
  }

  // --- Optional: Add further granular authorization based on JWT payload ---
  // Example: Check if the 'user.id' from `jwtPayload.sub` is authorized to access this specific `fileKey`.
  // This might involve a lookup in a database (e.g., D1 binding, or another call to Supabase).
  // For simplicity, this example assumes any authenticated user can access.
  // -------------------------------------------------------------------------

  // --- 2. Generate Signed URL for R2 Object ---
  try {
    // Ensure all necessary R2 credentials are set as secrets in Cloudflare Dashboard
    if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY || !env.R2_BUCKET_NAME) {
      console.error('Missing R2 environment variables');
      return Response.json({ error: 'Server misconfiguration: R2 credentials missing' }, { status: 500 });
    }

    const aws = new AwsClient({
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      service: 's3', // R2 is S3-compatible
    });

    // Construct the full R2 object URL
    const R2_OBJECT_URL = `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${env.R2_BUCKET_NAME}/${fileKey}`;
    const expirationSeconds = 3600; // Signed URL valid for 1 hour (adjust as needed)

    const signedRequest = await aws.sign(
      new Request(R2_OBJECT_URL, { method: 'GET' }), // Request to sign for a GET operation
      {
        aws: { signQuery: true }, // Crucial for R2 pre-signed URLs, they use query string signing
        expiresIn: expirationSeconds,
      }
    );

    const expirationTimestamp = Date.now() + (expirationSeconds * 1000); // Calculate actual expiration time in milliseconds

    // Return the pre-signed URL and its expiration timestamp
    return Response.json({
      signedUrl: signedRequest.url.toString(),
      expirationTimestamp: expirationTimestamp
    }, {
      headers: {
        // Essential for CORS if your Pages Function is called directly by frontend
        // If only called by Supabase Edge Function, it's still good practice
        'Access-Control-Allow-Origin': '*', // Adjust this to your specific frontend domain in production
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (error) {
    console.error('Error generating signed URL:', error);
    return Response.json({ error: 'Failed to generate signed URL' }, { status: 500 });
  }
};

// Handle OPTIONS requests for CORS preflight (important for cross-origin requests)
export const onRequestOptions: PagesFunction = async () => {
    return new Response(null, {
        status: 204, // No Content
        headers: {
            'Access-Control-Allow-Origin': '*', // Adjust this to your specific frontend domain in production
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400', // Cache preflight for 24 hours
        },
    });
};