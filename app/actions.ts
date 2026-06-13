"use server"

import { supabase } from "@/lib/supabase";

export type HomeworkRecord = {
  week_start_date: string;
  subject: string;
  day: string;
  status: string;
};

export async function getWeekRecords(weekStartDate: string): Promise<HomeworkRecord[]> {
  try {
    const { data, error } = await supabase
      .from("homework_records")
      .select("*")
      .eq("week_start_date", weekStartDate);

    if (error) {
      console.error("Error fetching records from Supabase:", error);
      return [];
    }

    return data as HomeworkRecord[];
  } catch (error) {
    console.error("Unexpected error fetching records:", error);
    return [];
  }
}

export async function updateRecord(record: HomeworkRecord): Promise<{ success: boolean }> {
  try {
    const { week_start_date, subject, day, status } = record;
    
    // UPSERT
    const { error } = await supabase
      .from("homework_records")
      .upsert(
        { week_start_date, subject, day, status },
        { onConflict: 'week_start_date,subject,day' }
      );
      
    if (error) {
      console.error("Error updating record in Supabase:", error);
      return { success: false };
    }
    
    return { success: true };
  } catch (error) {
    console.error("Unexpected error updating record:", error);
    return { success: false };
  }
}
