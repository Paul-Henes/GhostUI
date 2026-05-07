# Report Generation Service
# PDF/HTML generation and Supabase Storage upload for compliance reports

import logging
import re
from typing import Optional
from datetime import datetime
from pathlib import Path
from jinja2 import Environment, FileSystemLoader, select_autoescape
from weasyprint import HTML, CSS
from app.database import get_supabase
from app.config import settings

logger = logging.getLogger(__name__)


# ===========================================
# German translations for common issue patterns
# ===========================================
ISSUE_TRANSLATIONS = {
    # Image issues
    r"image.*missing.*alt": "Bild ohne Alternativtext",
    r"img.*alt.*empty": "Bild mit leerem Alt-Attribut",
    r"image.*decorative": "Dekoratives Bild sollte alt=\"\" haben",
    r"alt text.*missing": "Alternativtext fehlt",
    r"images must have.*alt": "Bilder müssen einen Alternativtext haben",
    
    # Link issues
    r"link.*empty": "Link ohne Text oder zugänglichen Namen",
    r"link.*text.*missing": "Linktext fehlt",
    r"link.*discernible": "Link hat keinen erkennbaren Text",
    r"links must have.*text": "Links müssen einen beschreibenden Text haben",
    r"link.*purpose": "Linkzweck ist nicht erkennbar",
    
    # Button issues
    r"button.*empty": "Button ohne Text oder zugänglichen Namen",
    r"button.*accessible name": "Button hat keinen zugänglichen Namen",
    r"buttons must have.*text": "Buttons müssen einen beschreibenden Text haben",
    
    # Form issues
    r"form.*label": "Formularelement ohne Label",
    r"input.*label": "Eingabefeld ohne zugeordnetes Label",
    r"select.*label": "Auswahlfeld ohne Label",
    r"textarea.*label": "Textfeld ohne Label",
    r"form elements must have": "Formularelemente müssen Labels haben",
    
    # Heading issues
    r"heading.*empty": "Leere Überschrift",
    r"heading.*skip": "Überschriftenebene übersprungen",
    r"heading.*order": "Überschriftenreihenfolge ist nicht logisch",
    r"page.*heading": "Seite sollte eine Überschrift haben",
    r"h1.*missing": "H1-Überschrift fehlt",
    
    # Contrast issues
    r"contrast.*insufficient": "Unzureichender Farbkontrast",
    r"color contrast": "Farbkontrast entspricht nicht den Anforderungen",
    r"contrast ratio": "Kontrastverhältnis ist zu niedrig",
    
    # Language issues
    r"lang.*missing": "Sprachattribut fehlt im HTML-Element",
    r"language.*document": "Dokumentsprache ist nicht definiert",
    r"html.*lang": "HTML-Element benötigt lang-Attribut",
    
    # ARIA issues
    r"aria.*invalid": "Ungültiges ARIA-Attribut",
    r"aria.*required": "Erforderliches ARIA-Attribut fehlt",
    r"aria-label.*empty": "aria-label ist leer",
    r"role.*invalid": "Ungültige ARIA-Rolle",
    
    # Focus issues
    r"focus.*visible": "Fokusindikator ist nicht sichtbar",
    r"focus.*order": "Fokusreihenfolge ist nicht logisch",
    r"keyboard.*access": "Element ist nicht per Tastatur erreichbar",
    r"tabindex": "Tabindex-Wert ist problematisch",
    
    # Table issues
    r"table.*header": "Tabelle ohne Kopfzeilen",
    r"table.*caption": "Tabelle ohne Beschriftung",
    r"th.*scope": "Tabellenkopfzellen benötigen scope-Attribut",
    
    # General issues
    r"duplicate.*id": "Doppelte ID im Dokument",
    r"empty.*element": "Leeres Element ohne Inhalt",
    r"skip.*link": "Sprunglink zum Hauptinhalt fehlt",
    r"landmark": "Landmark-Region fehlt oder ist fehlerhaft",
    r"document.*title": "Seitentitel fehlt oder ist leer",
}

RECOMMENDATION_TRANSLATIONS = {
    r"add.*alt": "Fügen Sie einen beschreibenden Alternativtext hinzu",
    r"add.*label": "Fügen Sie ein zugeordnetes Label hinzu",
    r"add.*text": "Fügen Sie einen beschreibenden Text hinzu",
    r"add.*aria-label": "Fügen Sie ein aria-label-Attribut hinzu",
    r"increase.*contrast": "Erhöhen Sie den Farbkontrast",
    r"add.*lang": "Fügen Sie das lang-Attribut hinzu",
    r"add.*heading": "Fügen Sie eine passende Überschrift hinzu",
    r"fix.*order": "Korrigieren Sie die Reihenfolge",
    r"remove.*empty": "Entfernen Sie das leere Element oder fügen Sie Inhalt hinzu",
    r"ensure.*visible": "Stellen Sie sicher, dass der Fokusindikator sichtbar ist",
    r"use.*semantic": "Verwenden Sie semantisches HTML",
    r"provide.*name": "Geben Sie einen zugänglichen Namen an",
}


def translate_to_german(text: str, translations: dict) -> str:
    """Translate text using pattern matching."""
    if not text:
        return text
    
    text_lower = text.lower()
    for pattern, german in translations.items():
        if re.search(pattern, text_lower, re.IGNORECASE):
            return german
    
    return text  # Return original if no translation found


def translate_issue(issue: dict) -> dict:
    """Translate issue description and recommendation to German."""
    translated = issue.copy()
    
    # Translate description
    if 'description' in translated:
        translated['description'] = translate_to_german(
            translated['description'], 
            ISSUE_TRANSLATIONS
        )
    
    # Translate recommendation
    for key in ['recommendation', 'suggested_fix', 'suggestedFix']:
        if key in translated and translated[key]:
            translated[key] = translate_to_german(
                translated[key], 
                RECOMMENDATION_TRANSLATIONS
            )
    
    return translated

# Template directory
TEMPLATES_DIR = Path(__file__).parent.parent / "templates"

# Initialize Jinja2 environment
_jinja_env: Optional[Environment] = None


def get_jinja_env() -> Environment:
    """Get or create Jinja2 environment."""
    global _jinja_env
    if _jinja_env is None:
        _jinja_env = Environment(
            loader=FileSystemLoader(TEMPLATES_DIR),
            autoescape=select_autoescape(['html', 'xml'])
        )
    return _jinja_env


def render_audit_html(
    scan: dict,
    issues: list,
    conformance: str,
    generated_at: str
) -> str:
    """
    Render the audit report HTML using Jinja2 template.
    
    Args:
        scan: Scan data dictionary
        issues: List of compliance issues
        conformance: Conformance level ('fully', 'partially', 'not')
        generated_at: ISO timestamp of report generation
        
    Returns:
        Rendered HTML string
    """
    env = get_jinja_env()
    template = env.get_template("audit_report.html")
    
    # Translate issues to German
    translated_issues = [translate_issue(i) for i in issues]
    
    # Group issues by severity
    issues_by_severity = {
        'critical': [i for i in translated_issues if i.get('severity') == 'critical'],
        'serious': [i for i in translated_issues if i.get('severity') == 'serious'],
        'moderate': [i for i in translated_issues if i.get('severity') == 'moderate'],
        'minor': [i for i in translated_issues if i.get('severity') == 'minor'],
    }
    
    # Conformance text mapping
    conformance_text = {
        'fully': 'Vollständig konform',
        'partially': 'Teilweise konform',
        'not': 'Nicht konform'
    }
    
    return template.render(
        scan=scan,
        issues=translated_issues,
        issues_by_severity=issues_by_severity,
        conformance=conformance,
        conformance_text=conformance_text.get(conformance, 'Nicht konform'),
        generated_at=generated_at,
        generated_date=datetime.fromisoformat(generated_at.replace('Z', '+00:00')).strftime('%d.%m.%Y %H:%M'),
        total_issues=len(translated_issues),
        critical_count=len(issues_by_severity['critical']),
        serious_count=len(issues_by_severity['serious']),
        moderate_count=len(issues_by_severity['moderate']),
        minor_count=len(issues_by_severity['minor']),
    )


async def generate_audit_pdf(html_content: str) -> bytes:
    """
    Generate PDF from HTML content using WeasyPrint.
    
    Args:
        html_content: Rendered HTML string
        
    Returns:
        PDF as bytes
    """
    try:
        # Base CSS for PDF styling
        base_css = CSS(string='''
            @page {
                size: A4;
                margin: 2cm;
                @top-right {
                    content: "Ghost-UI Barrierefreiheits-Prüfbericht";
                    font-size: 10px;
                    color: #666;
                }
                @bottom-center {
                    content: "Seite " counter(page) " von " counter(pages);
                    font-size: 10px;
                    color: #666;
                }
            }
            body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                font-size: 12px;
                line-height: 1.5;
                color: #333;
            }
            h1, h2, h3 {
                color: #1a1a1a;
                page-break-after: avoid;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                page-break-inside: avoid;
            }
            th, td {
                border: 1px solid #ddd;
                padding: 8px;
                text-align: left;
            }
            th {
                background-color: #f5f5f5;
            }
            .issue-card {
                border: 1px solid #ddd;
                border-radius: 4px;
                padding: 12px;
                margin-bottom: 12px;
                page-break-inside: avoid;
            }
            .severity-critical { border-left: 4px solid #dc2626; }
            .severity-serious { border-left: 4px solid #ea580c; }
            .severity-moderate { border-left: 4px solid #ca8a04; }
            .severity-minor { border-left: 4px solid #2563eb; }
            .badge {
                display: inline-block;
                padding: 2px 8px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 600;
            }
            .badge-critical { background: #fef2f2; color: #dc2626; }
            .badge-serious { background: #fff7ed; color: #ea580c; }
            .badge-moderate { background: #fefce8; color: #ca8a04; }
            .badge-minor { background: #eff6ff; color: #2563eb; }
        ''')
        
        html = HTML(string=html_content)
        pdf_bytes = html.write_pdf(stylesheets=[base_css])
        
        logger.info(f"Generated PDF report: {len(pdf_bytes)} bytes")
        return pdf_bytes
        
    except Exception as e:
        logger.error(f"Failed to generate PDF: {e}")
        raise


async def upload_to_storage(
    file_data: bytes,
    file_path: str,
    content_type: str
) -> Optional[str]:
    """
    Upload file to Supabase Storage and return public URL.
    
    Args:
        file_data: File content as bytes
        file_path: Path within the storage bucket (e.g., 'audits/scan-id.pdf')
        content_type: MIME type of the file
        
    Returns:
        Public URL of the uploaded file, or None if upload failed
    """
    try:
        supabase = get_supabase()
        bucket_name = "reports"
        
        # Upload file to Supabase Storage
        result = supabase.storage.from_(bucket_name).upload(
            path=file_path,
            file=file_data,
            file_options={
                "content-type": content_type,
                "upsert": "true"  # Overwrite if exists
            }
        )
        
        # Get public URL
        public_url = supabase.storage.from_(bucket_name).get_public_url(file_path)
        
        logger.info(f"Uploaded file to storage: {file_path}")
        return public_url
        
    except Exception as e:
        logger.error(f"Failed to upload to storage: {e}")
        # Return None instead of raising - allows graceful degradation
        return None


async def generate_and_upload_audit_report(
    scan_id: str,
    scan: dict,
    issues: list,
    conformance: str
) -> tuple[Optional[str], Optional[str]]:
    """
    Generate audit report in HTML and PDF formats and upload to storage.
    
    Args:
        scan_id: ID of the scan
        scan: Scan data dictionary
        issues: List of compliance issues
        conformance: Conformance level
        
    Returns:
        Tuple of (html_url, pdf_url) - either may be None if generation/upload failed
    """
    generated_at = datetime.utcnow().isoformat() + "Z"
    
    try:
        # Render HTML
        html_content = render_audit_html(scan, issues, conformance, generated_at)
        
        # Generate PDF
        pdf_bytes = await generate_audit_pdf(html_content)
        
        # Upload both to storage
        html_url = await upload_to_storage(
            html_content.encode('utf-8'),
            f"audits/{scan_id}.html",
            "text/html"
        )
        
        pdf_url = await upload_to_storage(
            pdf_bytes,
            f"audits/{scan_id}.pdf",
            "application/pdf"
        )
        
        return html_url, pdf_url
        
    except Exception as e:
        logger.error(f"Failed to generate audit report: {e}")
        return None, None


def render_statement_html(
    scan: dict,
    conformance: str,
    non_accessible: list,
    justifications: list,
    contact_email: str,
    contact_phone: Optional[str],
    organization_name: str,
    website_url: str,
    schlichtungsstelle: str,
    markt_behoerde: str,
    generated_at: str
) -> str:
    """
    Render the accessibility statement HTML using Jinja2 template.
    """
    env = get_jinja_env()
    
    # Check if template exists, otherwise use inline template
    try:
        template = env.get_template("statement.html")
    except Exception:
        # Fallback: return basic HTML if template doesn't exist
        conformance_text = {
            'fully': 'vollständig konform',
            'partially': 'teilweise konform',
            'not': 'nicht konform'
        }
        
        return f'''<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <title>Erklärung zur Barrierefreiheit - {organization_name}</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; }}
        h1 {{ color: #1a1a1a; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }}
        h2 {{ color: #374151; margin-top: 30px; }}
        ul {{ padding-left: 20px; }}
        a {{ color: #3b82f6; }}
        .meta {{ color: #6b7280; font-size: 14px; margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 20px; }}
    </style>
</head>
<body>
    <h1>Erklärung zur Barrierefreiheit</h1>
    
    <p>{organization_name} ist bemüht, die Website <a href="{website_url}">{website_url}</a> 
    im Einklang mit den gesetzlichen Vorgaben barrierefrei zugänglich zu machen.</p>
    
    <h2>Stand der Vereinbarkeit mit den Anforderungen</h2>
    <p>Diese Website ist mit den Anforderungen des Barrierefreiheitsstärkungsgesetzes (BFSG) 
    <strong>{conformance_text.get(conformance, "nicht konform")}</strong>.</p>
    
    {"<h2>Nicht barrierefreie Inhalte</h2><ul>" + "".join(f"<li>{item}</li>" for item in non_accessible) + "</ul>" if non_accessible else ""}
    
    {"<h2>Begründungen</h2><ul>" + "".join(f"<li>{j}</li>" for j in justifications) + "</ul>" if justifications else ""}
    
    <h2>Feedback und Kontaktangaben</h2>
    <p>Wenn Ihnen Mängel in Bezug auf die barrierefreie Gestaltung auffallen, können Sie uns kontaktieren:</p>
    <ul>
        <li>E-Mail: <a href="mailto:{contact_email}">{contact_email}</a></li>
        {f"<li>Telefon: {contact_phone}</li>" if contact_phone else ""}
    </ul>
    
    <h2>Schlichtungsverfahren</h2>
    <p>Bei Streitigkeiten können Sie sich an die zuständige Schlichtungsstelle wenden:</p>
    <p><a href="{schlichtungsstelle}">{schlichtungsstelle}</a></p>
    
    <h2>Marktüberwachungsbehörde</h2>
    <p><a href="{markt_behoerde}">{markt_behoerde}</a></p>
    
    <p class="meta"><em>Diese Erklärung wurde am {datetime.fromisoformat(generated_at.replace("Z", "+00:00")).strftime("%d.%m.%Y")} erstellt.</em></p>
</body>
</html>'''
    
    return template.render(
        scan=scan,
        conformance=conformance,
        non_accessible=non_accessible,
        justifications=justifications,
        contact_email=contact_email,
        contact_phone=contact_phone,
        organization_name=organization_name,
        website_url=website_url,
        schlichtungsstelle=schlichtungsstelle,
        markt_behoerde=markt_behoerde,
        generated_at=generated_at,
    )
