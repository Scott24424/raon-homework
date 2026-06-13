import HomeworkTracker from "@/components/HomeworkTracker";

const SEMESTER_SUBJECTS = [
  "Math",
  "Social Studies",
  "Know it, Show it",
  "Chinese",
  "Spelling",
  "Reading Log",
  "Tutoring",
  "디딤돌(2장)",
  "1031 or 최상위S",
  "국어 독해력",
  "원리셈",
  "Etc.",
];

export default function SemesterPage() {
  return (
    <HomeworkTracker 
      title="Raon Kwon's Homework" 
      subjects={SEMESTER_SUBJECTS} 
      mode="semester" 
    />
  );
}
