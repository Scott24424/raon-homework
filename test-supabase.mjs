import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mnvcahpbydgozldtftvi.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1udmNhaHBieWRnb3psZHRmdHZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMzQ5OTEsImV4cCI6MjA5MzkxMDk5MX0.TXg6_Bf8GSJCFyEbkwm1d6Yj2q-5nFhv7AVtcZ0zNm8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log("Testing Supabase connection...");
  
  // Try to insert a dummy record
  const { data: insertData, error: insertError } = await supabase
    .from('homework_records')
    .upsert(
      { week_start_date: '2026-05-10', subject: 'Test', day: 'Mon', status: 'O' },
      { onConflict: 'week_start_date,subject,day' }
    )
    .select();
    
  if (insertError) {
    console.error("Insert Error:", insertError);
  } else {
    console.log("Insert Success:", insertData);
  }
  
  // Try to fetch records
  const { data: selectData, error: selectError } = await supabase
    .from('homework_records')
    .select('*');
    
  if (selectError) {
    console.error("Select Error:", selectError);
  } else {
    console.log("Select Success, rows:", selectData?.length);
  }
}

test();
