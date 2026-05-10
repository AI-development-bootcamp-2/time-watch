import TimerWidget from './TimerWidget';

export default function DailyReportPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh]">
      <div className="w-full">
        <TimerWidget />
      </div>
    </div>
  );
}
