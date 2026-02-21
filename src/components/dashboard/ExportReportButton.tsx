'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

interface ExportReportButtonProps {
  scanId: string;
  productName: string;
}

export function ExportReportButton({ scanId, productName }: ExportReportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch(`/api/scans/${scanId}/export`);

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get the report blob
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${productName.replace(/[^a-z0-9]/gi, '_')}_scan_report_${scanId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      alert('Couldn\'t export the report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button variant="secondary" onClick={handleExport} disabled={isExporting}>
      {isExporting ? '⏳ Exporting...' : '📥 Export Report'}
    </Button>
  );
}
