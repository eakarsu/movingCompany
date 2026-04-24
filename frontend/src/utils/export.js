import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Export data as CSV file
 */
export function exportToCSV(data, columns, filename = 'export') {
  if (!data || data.length === 0) return;

  const headers = columns.map((col) => col.label);
  const rows = data.map((item) =>
    columns.map((col) => {
      const value = col.accessor ? col.accessor(item) : item[col.key];
      // Escape CSV values
      const str = String(value ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    })
  );

  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Export data as PDF file
 */
export function exportToPDF(data, columns, filename = 'export', title = 'Report') {
  if (!data || data.length === 0) return;

  const doc = new jsPDF();

  // Title
  doc.setFontSize(16);
  doc.text(title, 14, 20);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

  const headers = columns.map((col) => col.label);
  const rows = data.map((item) =>
    columns.map((col) => {
      const value = col.accessor ? col.accessor(item) : item[col.key];
      return String(value ?? '');
    })
  );

  doc.autoTable({
    head: [headers],
    body: rows,
    startY: 35,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235] },
  });

  doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
}
