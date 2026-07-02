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

const VACATION_SUBJECTS = [
  "리딩로그(썸머숙제)",
  "아라쌤 영어숙제",
  "엘리카 영어숙제",
  "뿌리깊은국어",
  "원리셈",
  "딱풀",
  "플라토",
  "필즈",
];

export default function Home() {
  return (
    <HomeworkTracker 
      semesterSubjects={SEMESTER_SUBJECTS} 
      vacationSubjects={VACATION_SUBJECTS} 
    />
  );
}
