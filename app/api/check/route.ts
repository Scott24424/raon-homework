import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  const maskedUrl = url ? `${url.substring(0, 8)}...` : "EMPTY";
  const maskedKey = key ? `${key.substring(0, 10)}...${key.substring(key.length - 5)}` : "EMPTY";

  try {
    if (!url || !key) {
      return NextResponse.json({
        error: "Environment variables are missing on Vercel!",
        url: maskedUrl,
        key: maskedKey
      });
    }

    const { data, error } = await supabase
      .from("homework_records")
      .select("*");

    if (error) {
      return NextResponse.json({ 
        error: error.message,
        url: maskedUrl,
        key: maskedKey
      }, { status: 500 });
    }

    // Group records by week_start_date
    const groups: Record<string, { count: number; subjects: string[] }> = {};
    data.forEach((r: any) => {
      if (!groups[r.week_start_date]) {
        groups[r.week_start_date] = { count: 0, subjects: [] };
      }
      groups[r.week_start_date].count++;
      if (!groups[r.week_start_date].subjects.includes(r.subject)) {
        groups[r.week_start_date].subjects.push(r.subject);
      }
    });

    return NextResponse.json({
      total: data.length,
      weeks: groups,
      url: maskedUrl,
      key: maskedKey,
      latest_30_records: data.slice(-30),
    });
  } catch (err: any) {
    return NextResponse.json({ 
      error: err.message,
      stack: err.stack,
      url: maskedUrl,
      key: maskedKey
    }, { status: 500 });
  }
}
