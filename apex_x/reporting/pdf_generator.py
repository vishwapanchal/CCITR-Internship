import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

class PDFGenerator:
    """
    Generates 12-section PDF reports using ReportLab.
    """
    
    def __init__(self, output_dir: str):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
        self.styles = getSampleStyleSheet()
        
        # Add custom forensic styles
        self.styles.add(ParagraphStyle(
            name='ForensicTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#0a2540'),
            spaceAfter=20
        ))
        
    def generate_report(self, case_id: str, report_data: dict, language: str = "en") -> str:
        """
        Generates the PDF report and returns the file path.
        """
        filename = f"Report_{case_id}_{language}.pdf"
        filepath = os.path.join(self.output_dir, filename)
        
        doc = SimpleDocTemplate(filepath, pagesize=letter)
        elements = []
        
        # 1. Cover Page
        elements.append(Paragraph(f"APEX-X Forensic Investigation Report", self.styles['ForensicTitle']))
        elements.append(Spacer(1, 20))
        elements.append(Paragraph(f"Case Number: {report_data['metadata']['case_number']}", self.styles['Normal']))
        elements.append(Paragraph(f"Date: {report_data['metadata']['generated_at']}", self.styles['Normal']))
        elements.append(Paragraph(f"Classification: {report_data['metadata']['classification']}", self.styles['Normal']))
        elements.append(Spacer(1, 40))
        
        # 2. Executive Summary
        elements.append(Paragraph("Executive Summary", self.styles['Heading2']))
        elements.append(Paragraph(f"Threat Score: {report_data['executive_summary']['threat_score']}/100", self.styles['Normal']))
        elements.append(Paragraph(f"Verdict: {report_data['executive_summary']['verdict']}", self.styles['Normal']))
        
        elements.append(Spacer(1, 10))
        elements.append(Paragraph("Key Findings:", self.styles['Normal']))
        for finding in report_data['executive_summary']['key_findings']:
            elements.append(Paragraph(f"• {finding}", self.styles['Normal']))
            
        # 3. APK Profile
        elements.append(Spacer(1, 20))
        elements.append(Paragraph("APK Profile", self.styles['Heading2']))
        
        data = [
            ["Property", "Value"],
            ["File Name", report_data['apk_profile']['file_name']],
            ["Package", report_data['apk_profile']['package_name']],
            ["SHA-256", report_data['apk_profile']['sha256']],
        ]
        
        t = Table(data, colWidths=[120, 340])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0a2540')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0,0), (-1,0), 12),
            ('BACKGROUND', (0,1), (-1,-1), colors.HexColor('#f4f4f5')),
            ('GRID', (0,0), (-1,-1), 1, colors.HexColor('#e4e4e7'))
        ]))
        elements.append(t)
        
        # Build the PDF
        doc.build(elements)
        return filepath
