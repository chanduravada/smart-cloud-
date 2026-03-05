// Supabase Edge Function: s3-storage
// Handles secure S3 operations (upload presign, download presign, delete)
// using AWS credentials stored as Supabase secrets.
//
// Secrets required (set in Supabase Dashboard → Edge Functions → Secrets):
//   AWS_ACCESS_KEY_ID
//   AWS_SECRET_ACCESS_KEY
//   AWS_REGION         (the region of your S3 bucket, e.g. ap-south-1)
//   AWS_S3_BUCKET      (smart-file-sense-storage)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-version',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ─── AWS Signature v4 helpers (no SDK needed in Deno) ────────────────────────

function toHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

async function hmacSha256(key: ArrayBuffer | string, data: string): Promise<ArrayBuffer> {
    const key材料 = typeof key === 'string'
        ? new TextEncoder().encode(key)
        : new Uint8Array(key);
    const cryptoKey = await crypto.subtle.importKey(
        'raw', key材料, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
}

async function sha256Hex(data: string): Promise<string> {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
    return toHex(buf);
}

async function getSigningKey(secretKey: string, date: string, region: string, service: string): Promise<ArrayBuffer> {
    const kDate = await hmacSha256('AWS4' + secretKey, date);
    const kRegion = await hmacSha256(kDate, region);
    const kService = await hmacSha256(kRegion, service);
    return hmacSha256(kService, 'aws4_request');
}

function formatDate(d: Date): string {
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

// Generate a presigned URL for PUT or GET
async function presignS3Url(
    method: 'PUT' | 'GET',
    bucket: string,
    key: string,
    region: string,
    accessKey: string,
    secretKey: string,
    contentType: string | null = null,
    expiresSeconds = 3600
): Promise<string> {
    const now = new Date();
    const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const amzDateTime = formatDate(now);                                    // YYYYMMDDTHHmmSSZ

    const host = `${bucket}.s3.${region}.amazonaws.com`;
    const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
    const credential = `${accessKey}/${credentialScope}`;

    const signedHeaders = 'host';

    // Build canonical query string
    const queryParams: Record<string, string> = {
        'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
        'X-Amz-Credential': credential,
        'X-Amz-Date': amzDateTime,
        'X-Amz-Expires': String(expiresSeconds),
        'X-Amz-SignedHeaders': signedHeaders,
    };

    if (contentType && method === 'PUT') {
        queryParams['Content-Type'] = contentType;
    }

    const sortedParams = Object.keys(queryParams)
        .sort()
        .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
        .join('&');

    const encodedKey = key.split('/').map(encodeURIComponent).join('/');

    const canonicalRequest = [
        method,
        `/${encodedKey}`,
        sortedParams,
        `host:${host}\n`,
        signedHeaders,
        'UNSIGNED-PAYLOAD',
    ].join('\n');

    const canonicalRequestHash = await sha256Hex(canonicalRequest);

    const stringToSign = [
        'AWS4-HMAC-SHA256',
        amzDateTime,
        credentialScope,
        canonicalRequestHash,
    ].join('\n');

    const signingKey = await getSigningKey(secretKey, dateStamp, region, 's3');
    const signatureBuf = await hmacSha256(signingKey, stringToSign);
    const signature = toHex(signatureBuf);

    return `https://${host}/${encodedKey}?${sortedParams}&X-Amz-Signature=${signature}`;
}

// Delete an object from S3 using AWS Signature v4
async function deleteS3Object(
    bucket: string,
    key: string,
    region: string,
    accessKey: string,
    secretKey: string
): Promise<void> {
    const now = new Date();
    const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '');
    const amzDateTime = formatDate(now);

    const host = `${bucket}.s3.${region}.amazonaws.com`;
    const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';

    const payloadHash = await sha256Hex('');

    const encodedKey = key.split('/').map(encodeURIComponent).join('/');

    const canonicalRequest = [
        'DELETE',
        `/${encodedKey}`,
        '',
        `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDateTime}\n`,
        signedHeaders,
        payloadHash,
    ].join('\n');

    const canonicalRequestHash = await sha256Hex(canonicalRequest);

    const stringToSign = [
        'AWS4-HMAC-SHA256',
        amzDateTime,
        credentialScope,
        canonicalRequestHash,
    ].join('\n');

    const signingKey = await getSigningKey(secretKey, dateStamp, region, 's3');
    const signatureBuf = await hmacSha256(signingKey, stringToSign);
    const signature = toHex(signatureBuf);

    const url = `https://${host}/${encodedKey}`;
    const resp = await fetch(url, {
        method: 'DELETE',
        headers: {
            'Host': host,
            'x-amz-content-sha256': payloadHash,
            'x-amz-date': amzDateTime,
            'Authorization': `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
        },
    });

    if (!resp.ok && resp.status !== 204) {
        const body = await resp.text();
        throw new Error(`S3 delete failed (${resp.status}): ${body}`);
    }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // Parse body first so we can check the action before auth
        const body = await req.json();
        const { action, key, filename, mimeType } = body as {
            action: 'upload' | 'download' | 'delete' | 'share-download';
            key?: string;
            filename?: string;
            mimeType?: string;
        };

        // Load AWS credentials from secrets
        const AWS_ACCESS_KEY_ID = Deno.env.get('AWS_ACCESS_KEY_ID')!;
        const AWS_SECRET_ACCESS_KEY = Deno.env.get('AWS_SECRET_ACCESS_KEY')!;
        const AWS_REGION = Deno.env.get('AWS_REGION')!;
        const AWS_S3_BUCKET = Deno.env.get('AWS_S3_BUCKET') || 'smart-file-sense-storage';

        if (action === 'upload') {
            // ── Auth required for upload/download/delete ──────────────────────
            const authHeader = req.headers.get('Authorization');
            if (!authHeader) {
                return new Response(JSON.stringify({ error: 'Missing authorization' }), {
                    status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }
            const authClient = createClient(
                Deno.env.get('SUPABASE_URL')!,
                Deno.env.get('SUPABASE_ANON_KEY')!,
                { global: { headers: { Authorization: authHeader } } }
            );
            const { data: { user }, error: authError } = await authClient.auth.getUser();
            if (authError || !user) {
                return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                    status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }

            if (!filename || !mimeType) {
                return new Response(JSON.stringify({ error: 'Missing filename or mimeType' }), {
                    status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }

            // Key format: userId/timestamp-filename
            const timestamp = Date.now();
            const s3Key = `${user.id}/${timestamp}-${filename}`;

            const uploadUrl = await presignS3Url(
                'PUT', AWS_S3_BUCKET, s3Key, AWS_REGION,
                AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, mimeType
            );

            return new Response(JSON.stringify({ uploadUrl, s3Key }), {
                status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        if (action === 'download') {
            if (!key) {
                return new Response(JSON.stringify({ error: 'Missing key' }), {
                    status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }

            const downloadUrl = await presignS3Url(
                'GET', AWS_S3_BUCKET, key, AWS_REGION,
                AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
            );

            return new Response(JSON.stringify({ downloadUrl }), {
                status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        if (action === 'delete') {
            if (!key) {
                return new Response(JSON.stringify({ error: 'Missing key' }), {
                    status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }

            await deleteS3Object(AWS_S3_BUCKET, key, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY);

            return new Response(JSON.stringify({ success: true }), {
                status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // ── SHARE-DOWNLOAD (no auth required — validated via token) ─────────────
        if (action === 'share-download') {
            const { token } = body as { token?: string };
            if (!token) {
                return new Response(JSON.stringify({ error: 'Missing token' }), {
                    status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }

            // Use service role to bypass RLS for the lookup
            const serviceSupabase = createClient(
                Deno.env.get('SUPABASE_URL')!,
                Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
            );

            const { data: link, error: linkErr } = await serviceSupabase
                .from('shared_links')
                .select('id, file_id, expires_at, max_downloads, download_count, allow_download, files(storage_path)')
                .eq('token', token)
                .maybeSingle();

            if (linkErr || !link) {
                return new Response(JSON.stringify({ error: 'Invalid or expired share link' }), {
                    status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }

            if (link.expires_at && new Date(link.expires_at) < new Date()) {
                return new Response(JSON.stringify({ error: 'Share link expired' }), {
                    status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }

            if (link.max_downloads !== null && link.download_count >= link.max_downloads) {
                return new Response(JSON.stringify({ error: 'Download limit reached' }), {
                    status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }

            // Increment download count
            await serviceSupabase
                .from('shared_links')
                .update({ download_count: link.download_count + 1 })
                .eq('id', link.id);

            const storagePath = (link.files as unknown as { storage_path: string }).storage_path;
            const downloadUrl = await presignS3Url(
                'GET', AWS_S3_BUCKET, storagePath, AWS_REGION,
                AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
            );

            return new Response(JSON.stringify({ downloadUrl }), {
                status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (err) {
        console.error('s3-storage error:', err);
        return new Response(JSON.stringify({ error: (err as Error).message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
