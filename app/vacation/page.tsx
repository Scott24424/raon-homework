import HomeworkTracker from "@/components/HomeworkTracker";

const VACATION_SUBJECTS = [
  "리딩로그(썸머숙제)",
  "아라쌤 영어숙제",
  "엘리카 영어숙제",
  "뿌리깊은국어",
  "원리셈",
  "최상위s",
  "플라토",
  "1031",
];

export default function VacationPage() {
  return (
    <HomeworkTracker 
      title="Raon's Vacation Homework" 
      subjects={VACATION_SUBJECTS} 
      mode="vacation" 
    />
  );
}
