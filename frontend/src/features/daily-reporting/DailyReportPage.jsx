import ReportForm from './ReportForm';

export default function DailyReportPage() {
  const handleSubmit = (data) => {
    console.log('Form Submitted:', data);
    // TODO: Send to API
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-lg space-y-6">
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Time Watch</h1>
          <p className="text-gray-600">שלום, הזן את שעות העבודה שלך</p>
        </header>
        
        <ReportForm onSubmit={handleSubmit} />
        
      </div>
    </div>
  );
}
