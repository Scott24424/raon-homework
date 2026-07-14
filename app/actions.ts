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
    
    // Check if record exists instead of upserting (bypasses unique constraint requirement)
    const { data: existing, error: selectError } = await supabase
      .from("homework_records")
      .select("status")
      .eq("week_start_date", week_start_date)
      .eq("subject", subject)
      .eq("day", day);

    if (selectError) {
      console.error("Error selecting record from Supabase:", selectError);
      return { success: false };
    }

    if (existing && existing.length > 0) {
      const { error: updateError } = await supabase
        .from("homework_records")
        .update({ status })
        .eq("week_start_date", week_start_date)
        .eq("subject", subject)
        .eq("day", day);
        
      if (updateError) {
        console.error("Error updating record in Supabase:", updateError);
        return { success: false };
      }
    } else {
      const { error: insertError } = await supabase
        .from("homework_records")
        .insert({ week_start_date, subject, day, status });
        
      if (insertError) {
        console.error("Error inserting record into Supabase:", insertError);
        return { success: false };
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error("Unexpected error updating record:", error);
    return { success: false };
  }
}

// --- Device Management Actions ---

export async function getDevices() {
  try {
    const { data, error } = await supabase
      .from("homework_records")
      .select("*")
      .eq("week_start_date", "devices")
      .order("subject", { ascending: true }); // ordering by id for stable view

    if (error) {
      console.error("Error fetching devices:", error);
      return [];
    }

    return data as HomeworkRecord[];
  } catch (error) {
    console.error("Unexpected error fetching devices:", error);
    return [];
  }
}

export async function updateDeviceStatus(deviceId: string, status: "approved" | "rejected" | "pending") {
  try {
    const { error } = await supabase
      .from("homework_records")
      .update({ status })
      .eq("week_start_date", "devices")
      .eq("subject", deviceId);
      
    if (error) {
      console.error("Error updating device status:", error);
      return { success: false };
    }
    return { success: true };
  } catch (error) {
    console.error("Unexpected error updating device:", error);
    return { success: false };
  }
}

export async function deleteDevice(deviceId: string) {
  try {
    const { error } = await supabase
      .from("homework_records")
      .delete()
      .eq("week_start_date", "devices")
      .eq("subject", deviceId);
      
    if (error) {
      console.error("Error deleting device:", error);
      return { success: false };
    }
    return { success: true };
  } catch (error) {
    console.error("Unexpected error deleting device:", error);
    return { success: false };
  }
}
