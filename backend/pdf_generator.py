import os
import io
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, HRFlowable, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT, TA_JUSTIFY

def generate_offer_letter_pdf(details, template='corporate', output_path=None):
    """
    Generates a high-quality, professional Offer Letter PDF using ReportLab.
    Returns bytes if output_path is None, or writes to output_path and returns output_path.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer if not output_path else output_path,
        pagesize=A4,
        rightMargin=45,
        leftMargin=45,
        topMargin=40,
        bottomMargin=40
    )

    styles = getSampleStyleSheet()
    
    # Custom Palette
    if template == 'modern':
        primary_color = colors.HexColor('#2563EB') # Blue-600
        dark_color = colors.HexColor('#1E293B')    # Slate-800
        light_bg = colors.HexColor('#EFF6FF')      # Blue-50
        accent_color = colors.HexColor('#3B82F6')
    elif template == 'technical':
        primary_color = colors.HexColor('#0D9488') # Teal-600
        dark_color = colors.HexColor('#111827')    # Gray-900
        light_bg = colors.HexColor('#F0FDFA')      # Teal-50
        accent_color = colors.HexColor('#14B8A6')
    else: # Corporate Standard
        primary_color = colors.HexColor('#1E3A8A') # Navy Blue
        dark_color = colors.HexColor('#1F2937')    # Gray-800
        light_bg = colors.HexColor('#F8FAFC')      # Slate-50
        accent_color = colors.HexColor('#2563EB')

    # Typography styles
    company_style = ParagraphStyle(
        'CompanyHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=primary_color
    )
    
    subtitle_style = ParagraphStyle(
        'CompanySub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#64748B')
    )

    doc_title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        alignment=TA_CENTER,
        textColor=dark_color,
        spaceBefore=10,
        spaceAfter=15
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=15,
        textColor=dark_color,
        alignment=TA_JUSTIFY
    )

    body_bold = ParagraphStyle(
        'BodyBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=15,
        textColor=dark_color
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=primary_color
    )

    table_val_style = ParagraphStyle(
        'TableVal',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=dark_color
    )

    elements = []

    # 1. Header with Company Logo & Name
    logo_path = details.get('logo_path')
    if not logo_path or not os.path.exists(logo_path):
        # Fallback to project root logo.jpg
        possible_logo = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'logo.jpg')
        if os.path.exists(possible_logo):
            logo_path = possible_logo
        else:
            possible_logo = 'logo.jpg'
            if os.path.exists(possible_logo):
                logo_path = possible_logo

    logo_img = None
    if logo_path and os.path.exists(logo_path):
        try:
            logo_img = Image(logo_path, width=50, height=50)
        except Exception:
            logo_img = None

    company_name = details.get('company_name', 'IGYR - India Get Your Result')
    header_text = [
        Paragraph(company_name, company_style),
        Paragraph("Centralized Academic Result Processing & Verification Platform", subtitle_style),
        Paragraph("Email: support@indiagetyourresult.com | Web: www.indiagetyourresult.com", subtitle_style)
    ]

    if logo_img:
        header_table = Table([[logo_img, header_text]], colWidths=[60, 440])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('ALIGN', (0,0), (0,0), 'LEFT'),
            ('LEFTPADDING', (1,0), (1,0), 10),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ]))
        elements.append(header_table)
    else:
        elements.extend(header_text)

    elements.append(HRFlowable(width="100%", thickness=1.5, color=accent_color, spaceBefore=8, spaceAfter=12))

    # 2. Date and Reference Number
    issue_date = details.get('issue_date') or datetime.now().strftime("%B %d, %Y")
    ref_no = f"IGYR/HR/{datetime.now().year}/{abs(hash(details.get('employee_email', 'emp')))%10000:04d}"
    
    meta_table = Table([
        [Paragraph(f"<b>Date:</b> {issue_date}", body_style), Paragraph(f"<b>Ref No:</b> {ref_no}", ParagraphStyle('RAlign', parent=body_style, alignment=TA_RIGHT))]
    ], colWidths=[250, 250])
    meta_table.setStyle(TableStyle([
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    elements.append(meta_table)

    # 3. Addressee Info
    emp_name = details.get('employee_name', 'Candidate Name')
    emp_email = details.get('employee_email', '')
    emp_phone = details.get('employee_phone', '')
    emp_loc = details.get('location', '')

    elements.append(Spacer(1, 8))
    elements.append(Paragraph(f"<b>To,</b>", body_style))
    elements.append(Paragraph(f"<b>{emp_name}</b>", body_bold))
    if emp_email:
        elements.append(Paragraph(f"Email: {emp_email}", body_style))
    if emp_phone:
        elements.append(Paragraph(f"Phone: {emp_phone}", body_style))
    if emp_loc:
        elements.append(Paragraph(f"Location: {emp_loc}", body_style))

    # 4. Document Title
    elements.append(Spacer(1, 10))
    position = details.get('position', 'Executive')
    elements.append(Paragraph(f"OFFER OF EMPLOYMENT – {position.upper()}", doc_title_style))

    # 5. Salutation and Introduction
    elements.append(Paragraph(f"Dear <b>{emp_name}</b>,", body_style))
    elements.append(Spacer(1, 6))
    
    intro_p = (
        f"We are pleased to offer you employment with <b>{company_name}</b> in the capacity of "
        f"<b>{position}</b> in our <b>{details.get('department', 'Operations')}</b> department. "
        "We were very impressed with your background and qualifications and are confident that your expertise "
        "will be a valuable asset to our organization."
    )
    elements.append(Paragraph(intro_p, body_style))
    elements.append(Spacer(1, 10))

    # 6. Structured Offer Details Table
    offer_rows = [
        [Paragraph("<b>Job Position:</b>", table_header_style), Paragraph(position, table_val_style)],
        [Paragraph("<b>Department:</b>", table_header_style), Paragraph(details.get('department', 'General Operations'), table_val_style)],
        [Paragraph("<b>Employment Type:</b>", table_header_style), Paragraph(details.get('employment_type', 'Full-time'), table_val_style)],
        [Paragraph("<b>Job Location:</b>", table_header_style), Paragraph(details.get('location', 'Head Office / Hybrid'), table_val_style)],
        [Paragraph("<b>Date of Joining:</b>", table_header_style), Paragraph(details.get('joining_date', 'To be decided'), table_val_style)],
        [Paragraph("<b>Total Compensation:</b>", table_header_style), Paragraph(f"<b>{details.get('salary', 'As per discussion')}</b>", table_val_style)],
    ]
    if details.get('reporting_manager'):
        offer_rows.append([Paragraph("<b>Reporting Manager:</b>", table_header_style), Paragraph(details.get('reporting_manager'), table_val_style)])
    if details.get('deadline'):
        offer_rows.append([Paragraph("<b>Acceptance Deadline:</b>", table_header_style), Paragraph(f"<font color='#B91C1C'><b>{details.get('deadline')}</b></font>", table_val_style)])

    offer_table = Table(offer_rows, colWidths=[160, 340])
    offer_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), light_bg),
        ('BOX', (0,0), (-1,-1), 1, accent_color),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    elements.append(offer_table)
    elements.append(Spacer(1, 12))

    # 7. Terms & Conditions
    elements.append(Paragraph("<b>Terms & Conditions of Employment:</b>", body_bold))
    elements.append(Spacer(1, 4))
    
    terms_text = details.get('terms', '').strip()
    if not terms_text:
        terms_text = (
            "1. Confidentiality: You will maintain strict confidentiality of all institutional data, student marks, and proprietary systems.\n"
            "2. Verification: This offer is subject to the verification of all submitted academic and professional credentials.\n"
            "3. Code of Conduct: You agree to comply with all organization policies, integrity guidelines, and workplace standards.\n"
            "4. Notice Period: A standard 30-day notice period applies for separation after completion of probation."
        )
    
    for term_line in terms_text.split('\n'):
        if term_line.strip():
            elements.append(Paragraph(term_line.strip(), ParagraphStyle('TermLine', parent=body_style, fontSize=9, leading=13, spaceAfter=3)))

    elements.append(Spacer(1, 10))

    # 8. Acceptance Note
    acceptance_text = (
        f"Please sign and date the duplicate copy of this letter and return it by "
        f"<b>{details.get('deadline', 'the acceptance deadline')}</b> to indicate your formal acceptance of this offer."
    )
    elements.append(Paragraph(acceptance_text, body_style))
    elements.append(Spacer(1, 18))

    # 9. Signatures Block (Signatory & Employee Acceptance)
    signatory_name = details.get('signatory_name', 'Authorized Signatory')
    signatory_desig = details.get('signatory_designation', 'Human Resources & Talent Director')
    
    sig_col1 = [
        Paragraph(f"<b>For {company_name}</b>", body_style),
        Spacer(1, 28),
        Paragraph(f"<b>{signatory_name}</b>", body_bold),
        Paragraph(signatory_desig, subtitle_style),
        Paragraph(company_name, subtitle_style)
    ]

    sig_col2 = [
        Paragraph("<b>Candidate Acceptance:</b>", body_style),
        Spacer(1, 28),
        Paragraph(f"<b>Signature: _______________________</b>", body_style),
        Paragraph(f"Name: {emp_name}", subtitle_style),
        Paragraph("Date: ________________________", subtitle_style)
    ]

    sig_table = Table([[sig_col1, sig_col2]], colWidths=[250, 250])
    sig_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
    ]))
    
    elements.append(KeepTogether(sig_table))

    # Build the PDF
    doc.build(elements)
    
    if output_path:
        return output_path
    else:
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes
