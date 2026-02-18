import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch scan details
    const { data: scan } = await supabase
      .from('scans')
      .select('*, products(name, price, type, url)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!scan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }

    // Fetch all infringements
    const { data: infringements } = await supabase
      .from('infringements')
      .select('*')
      .eq('scan_id', id)
      .order('risk_level', { ascending: false });

    const items = infringements || [];
    const doc = new jsPDF();

    // Colors
    const primaryColor: [number, number, number] = [0, 188, 212]; // cyan
    const darkBg: [number, number, number] = [15, 23, 42]; // slate-900

    // Header bar
    doc.setFillColor(...darkBg);
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(...primaryColor);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('ProductGuard.ai', 14, 18);
    doc.setFontSize(12);
    doc.setTextColor(200, 200, 200);
    doc.text('Piracy Scan Report', 14, 28);

    // Product info
    let y = 45;
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Product: ${scan.products?.name || 'Unknown'}`, 14, y);
    y += 7;
    doc.text(`Product Type: ${scan.products?.type || 'N/A'}`, 14, y);
    y += 7;
    doc.text(`Scan Date: ${new Date(scan.created_at).toLocaleDateString()}`, 14, y);
    y += 7;
    doc.text(`Scan ID: ${id.slice(0, 8)}`, 14, y);
    y += 12;

    // Summary section
    const critical = items.filter((i) => i.risk_level === 'critical').length;
    const high = items.filter((i) => i.risk_level === 'high').length;
    const medium = items.filter((i) => i.risk_level === 'medium').length;
    const low = items.filter((i) => i.risk_level === 'low').length;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('Summary', 14, y);
    y += 8;

    // Summary table
    autoTable(doc, {
      startY: y,
      head: [['Total', 'Critical', 'High', 'Medium', 'Low']],
      body: [[items.length, critical, high, medium, low]],
      theme: 'grid',
      headStyles: {
        fillColor: darkBg,
        textColor: primaryColor,
        fontStyle: 'bold',
      },
      styles: {
        halign: 'center',
        fontSize: 11,
      },
      margin: { left: 14, right: 14 },
    });

    y = (doc as any).lastAutoTable.finalY + 12;

    // Infringements table
    if (items.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...primaryColor);
      doc.text('Detailed Infringements', 14, y);
      y += 8;

      const tableRows = items.map((inf) => [
        inf.source_url?.length > 45 ? inf.source_url.substring(0, 45) + '...' : (inf.source_url || ''),
        inf.platform || 'Unknown',
        (inf.risk_level || 'unknown').toUpperCase(),
        inf.audience_size || 'N/A',
        inf.status || 'unknown',
      ]);

      autoTable(doc, {
        startY: y,
        head: [['URL', 'Platform', 'Risk', 'Audience', 'Status']],
        body: tableRows,
        theme: 'striped',
        headStyles: {
          fillColor: darkBg,
          textColor: primaryColor,
          fontStyle: 'bold',
          fontSize: 9,
        },
        bodyStyles: {
          fontSize: 8,
        },
        columnStyles: {
          0: { cellWidth: 75 },
          1: { cellWidth: 30 },
          2: { cellWidth: 22, halign: 'center' },
          3: { cellWidth: 30, halign: 'center' },
          4: { cellWidth: 25, halign: 'center' },
        },
        margin: { left: 14, right: 14 },
        didParseCell: (data: any) => {
          // Color-code risk levels
          if (data.section === 'body' && data.column.index === 2) {
            const risk = data.cell.raw?.toString().toUpperCase();
            if (risk === 'CRITICAL') data.cell.styles.textColor = [220, 38, 38];
            else if (risk === 'HIGH') data.cell.styles.textColor = [234, 88, 12];
            else if (risk === 'MEDIUM') data.cell.styles.textColor = [202, 138, 4];
            else data.cell.styles.textColor = [100, 100, 100];
          }
        },
      });
    }

    // Footer on each page
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Generated by ProductGuard.ai on ${new Date().toLocaleString()} — Page ${i} of ${pageCount}`,
        105,
        290,
        { align: 'center' }
      );
    }

    // Output as buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="scan_report_${id.slice(0, 8)}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
