'use client';

export default function ReportButton({ missionId, className = '' }) {
  const downloadReport = async () => {
    const res = await fetch(`/api/missions/${missionId}/report`);
    if (!res.ok) {
      alert('Failed to build report');
      return;
    }
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `mission-${missionId}-report.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button className={className} onClick={downloadReport}>
      Create Report
    </button>
  );
}
