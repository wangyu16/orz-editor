import { createClient } from '@supabase/supabase-js';
import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const r2AccountId = process.env.R2_ACCOUNT_ID;
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const r2BucketName = process.env.R2_BUCKET_NAME;

async function testSupabase() {
    console.log('Testing Supabase...');
    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Supabase credentials missing');
        return false;
    }
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase.from('_test_connection').select('*').limit(1).maybeSingle();

    // Note: _test_connection probably doesn't exist, but we check if we get an auth error or connection error
    if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
        console.error('❌ Supabase error:', error.message);
        return false;
    }
    console.log('✅ Supabase connected (API reached)');
    return true;
}

async function testR2() {
    console.log('Testing Cloudflare R2...');
    if (!r2AccountId || !r2AccessKeyId || !r2SecretAccessKey || !r2BucketName) {
        console.error('❌ R2 credentials missing');
        return false;
    }

    const s3 = new S3Client({
        region: 'auto',
        endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: r2AccessKeyId,
            secretAccessKey: r2SecretAccessKey,
        },
    });

    try {
        await s3.send(new ListBucketsCommand({}));
        console.log('✅ R2 connected (Bucket list retrieved)');
        return true;
    } catch (error: any) {
        console.error('❌ R2 error:', error.message);
        return false;
    }
}

async function run() {
    const supabaseOk = await testSupabase();
    const r2Ok = await testR2();

    if (supabaseOk && r2Ok) {
        console.log('\n🚀 All systems go!');
        process.exit(0);
    } else {
        console.log('\n⚠️ Some connections failed.');
        process.exit(1);
    }
}

run();
