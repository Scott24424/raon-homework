import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("homework_records")
      .select("*");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Group records by week_start_date to see what exists
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
      latest_30_records: data.slice(-30),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
